import { describe, it, expect } from 'vitest';
import {
  calcUserLoadMetrics,
  calcKvCacheGb,
  calcMemoryGpuRequirements,
  calcFinalGpuCount,
} from './hardwareRequirements.js';
import { buildCalculationConfig } from '../test/fixtures.js';

describe('calcUserLoadMetrics', () => {
  it('computes simple load tok/s', () => {
    const m = calcUserLoadMetrics({
      userLoadConcurrentUsers: 100,
      userLoadTokensPerRequest: 100,
      userLoadResponseTimeSec: 3,
      isAgentModeEnabled: false,
    });
    expect(m.totalTokensPerSecRequired).toBeCloseTo(3333.33, 0);
    expect(m.totalLlmCallsPerSecond).toBeCloseTo(33.33, 1);
  });

  it('agent mode increases load vs simple', () => {
    const base = {
      userLoadConcurrentUsers: 100,
      userLoadTokensPerRequest: 100,
      userLoadResponseTimeSec: 3,
      isAgentModeEnabled: true,
      agentRequestPercentage: 5,
      avgAgentsPerTask: 3,
      avgLlmCallsPerAgent: 5,
      avgToolCallsPerAgent: 2,
      avgAgentLlmTokens: 1500,
      avgExternalToolCost: 0.002,
    };
    const agent = calcUserLoadMetrics(base);
    const simple = calcUserLoadMetrics({ ...base, isAgentModeEnabled: false });
    expect(agent.totalTokensPerSecRequired).toBeGreaterThan(simple.totalTokensPerSecRequired * 5);
    expect(agent.totalToolCallsPerSecond).toBeGreaterThan(0);
    expect(agent.annualExternalToolCost).toBeGreaterThan(0);
  });

  it('returns zero load for zero users', () => {
    const m = calcUserLoadMetrics({
      userLoadConcurrentUsers: 0,
      userLoadTokensPerRequest: 100,
      userLoadResponseTimeSec: 3,
    });
    expect(m.totalTokensPerSecRequired).toBe(0);
  });
});

describe('calcKvCacheGb attention factor', () => {
  const baseLoad = {
    userLoadConcurrentUsers: 100,
    modelParamsNumBillion: 70,
    modelActiveParamsBillion: 70,
  };

  it('defaults to full KV (factor 1) when unset', () => {
    const full = calcKvCacheGb(baseLoad, 4000);
    const explicit = calcKvCacheGb({ ...baseLoad, kvCacheFactor: 1 }, 4000);
    expect(full).toBeGreaterThan(0);
    expect(explicit).toBeCloseTo(full, 6);
  });

  it('scales KV linearly with kvCacheFactor (MLA/MSA compression)', () => {
    const full = calcKvCacheGb(baseLoad, 4000);
    const mla = calcKvCacheGb({ ...baseLoad, kvCacheFactor: 0.1 }, 4000);
    expect(mla).toBeCloseTo(full * 0.1, 5);
  });

  it('ignores out-of-range factors (>1 or ≤0) → falls back to 1', () => {
    const full = calcKvCacheGb(baseLoad, 4000);
    expect(calcKvCacheGb({ ...baseLoad, kvCacheFactor: 2 }, 4000)).toBeCloseTo(full, 6);
    expect(calcKvCacheGb({ ...baseLoad, kvCacheFactor: 0 }, 4000)).toBeCloseTo(full, 6);
  });

  it('compressed-attention preset (deepseek-v4-flash) carries its factor through fixtures', () => {
    const cfg = buildCalculationConfig({
      modelId: 'deepseek-v4-flash',
      userLoadConcurrentUsers: 200,
      userLoadTokensPerRequest: 2000,
    });
    expect(cfg.kvCacheFactor).toBe(0.1);
    const load = calcUserLoadMetrics(cfg);
    const compressed = calcKvCacheGb(cfg, load.avgContextTokensPerSession);
    const asGqa = calcKvCacheGb({ ...cfg, kvCacheFactor: 1 }, load.avgContextTokensPerSession);
    expect(compressed).toBeCloseTo(asGqa * 0.1, 4);
  });
});

describe('calcMemoryGpuRequirements', () => {
  it('Qwen3.6-35B on L40S requires TP≥2 for 84GB weights', () => {
    const cfg = buildCalculationConfig({
      modelId: 'qwen3.6-35b-a3b',
      gpuId: 'l40s-48gb',
      userLoadConcurrentUsers: 10,
    });
    const load = calcUserLoadMetrics(cfg);
    const kv = calcKvCacheGb(cfg, load.avgContextTokensPerSession);
    const mem = calcMemoryGpuRequirements(cfg, kv);
    expect(mem.gpusPerReplica).toBeGreaterThanOrEqual(2);
    expect(mem.weightGb).toBeGreaterThan(80);
  });

  it('uses deployVramGb floor when set on model', () => {
    const cfg = buildCalculationConfig({ modelId: 'deepseek-v4-flash' });
    const mem = calcMemoryGpuRequirements(cfg, 1);
    expect(mem.weightGb).toBeGreaterThanOrEqual(cfg.deployVramGb);
  });
});

describe('calcFinalGpuCount', () => {
  it('scales by throughput for production mode', () => {
    const cfg = buildCalculationConfig({ modelId: 'gpt-oss-20b' });
    const load = calcUserLoadMetrics(cfg);
    const count = calcFinalGpuCount({
      totalTokensPerSecRequired: load.totalTokensPerSecRequired,
      effectiveTokensPerSecPerGpu: 1200,
      gpusPerReplica: 1,
      minGpusForMemory: 1,
      gpuCountMode: 'production',
    });
    expect(count.numGpu).toBeGreaterThanOrEqual(3);
    expect(count.gpuCountForThroughput).toBeGreaterThanOrEqual(count.numGpu);
  });

  it('throughput sizing uses per-GPU tps, NOT per-replica (no gpusPerReplica inflation)', () => {
    // 4000 tok/s required, 500 tok/s/GPU → 8 GPUs total.
    // With tensor-parallel replicas of 4, that's 2 replicas = 8 GPUs.
    const tp = calcFinalGpuCount({
      totalTokensPerSecRequired: 4000,
      effectiveTokensPerSecPerGpu: 500,
      gpusPerReplica: 4,
      minGpusForMemory: 4,
      gpuCountMode: 'production',
    });
    expect(tp.gpuCountForThroughput).toBe(8);   // ceil(4000/500)=8, rounded to replicas of 4
    expect(tp.numGpu).toBe(8);
    // Old buggy behavior produced ceil(4000/500)*4 = 32 — guard against regression.
    expect(tp.numGpu).toBeLessThan(32);
  });

  it('rounds throughput GPUs up to whole tensor-parallel replicas', () => {
    // 1100 tok/s / 500 = ceil 3 GPUs, but replica size 4 → must round up to 4.
    const tp = calcFinalGpuCount({
      totalTokensPerSecRequired: 1100,
      effectiveTokensPerSecPerGpu: 500,
      gpusPerReplica: 4,
      minGpusForMemory: 4,
      gpuCountMode: 'production',
    });
    expect(tp.gpuCountForThroughput).toBe(4);
    expect(tp.numGpu).toBe(4);
  });

  it('single-GPU replica throughput sizing is unchanged', () => {
    const c = calcFinalGpuCount({
      totalTokensPerSecRequired: 3500,
      effectiveTokensPerSecPerGpu: 1000,
      gpusPerReplica: 1,
      minGpusForMemory: 1,
      gpuCountMode: 'production',
    });
    expect(c.gpuCountForThroughput).toBe(4); // ceil(3500/1000)
    expect(c.numGpu).toBe(4);
  });

  it('minimum mode uses deploy floor when set', () => {
    const count = calcFinalGpuCount({
      totalTokensPerSecRequired: 100,
      effectiveTokensPerSecPerGpu: 5000,
      gpusPerReplica: 2,
      minGpusForMemory: 2,
      gpuCountMode: 'minimum',
      deployGpuCount: 8,
    });
    expect(count.minimumDeployGpu).toBe(8);
    expect(count.numGpu).toBe(8);
  });
});
