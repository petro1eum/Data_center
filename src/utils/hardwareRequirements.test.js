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
