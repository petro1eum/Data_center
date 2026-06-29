import { describe, it, expect } from 'vitest';
import { checkModelFitsGpu } from './validationUtils.js';
import { buildCalculationConfig } from '../test/fixtures.js';

describe('checkModelFitsGpu', () => {
  it('passes when deploy VRAM fits single GPU', () => {
    const cfg = buildCalculationConfig({
      modelId: 'gpt-oss-20b',
      gpuId: 'h100-80gb',
      modelParamsBitsPrecision: 16,
    });
    const r = checkModelFitsGpu(cfg);
    expect(r.hasError).toBe(false);
  });

  it('fails when single-GPU VRAM insufficient (no deploy floor)', () => {
    const cfg = buildCalculationConfig({
      modelId: 'gemma-4-31b',
      gpuId: 'l40s-48gb',
      deployVramGb: null,
      modelParamsBitsPrecision: 16,
    });
    const r = checkModelFitsGpu(cfg);
    expect(r.hasError || r.warningMessage).toBeTruthy();
  });

  it('MoE uses active params for KV estimate', () => {
    const cfg = buildCalculationConfig({
      modelId: 'qwen3.6-35b-a3b',
      gpuId: 'h100-80gb',
      userLoadConcurrentUsers: 50,
    });
    const r = checkModelFitsGpu(cfg);
    expect(r.hasError).toBe(false);
  });

  it('allows small KV overhead for empirical deploy footprints', () => {
    const cfg = buildCalculationConfig({
      modelId: 'gpt-oss-120b',
      gpuId: 'h100-80gb',
      userLoadConcurrentUsers: 100,
      isAgentModeEnabled: true,
      agentRequestPercentage: 5,
    });
    const r = checkModelFitsGpu(cfg);
    expect(r.requiredGbPerGpu).toBeGreaterThan(cfg.gpuConfigVramGb);
    expect(r.hasError).toBe(false);
  });
});
