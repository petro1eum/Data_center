import { describe, it, expect } from 'vitest';
import { calculateConfigurationRating } from './configRating.js';
import { buildCalculationConfig } from '../test/fixtures.js';
import { performFullCalculation } from './fullCalculation.js';
import {
  searchAllHardwareConfigs,
  pickOptimalConfig,
} from '../utils/configOptimizer.js';
import { GPU_PRESETS } from '../data/gpuPresets.js';
import { SERVER_PRESETS } from '../data/serverPresets.js';

describe('calculateConfigurationRating', () => {
  it('returns critical score for VRAM error', () => {
    const form = buildCalculationConfig({ modelId: 'deepseek-v4-pro', gpuId: 'l40s-48gb' });
    const r = calculateConfigurationRating(
      form,
      { fiveYearTco: 1_000_000, totalEffectiveTokensPerSec: 1000, requiredGpu: 8, serversRequired: 1, powerConsumptionKw: 50 },
      'Model too big',
      null,
      false,
      form.modelId,
    );
    expect(r.score).toBeLessThanOrEqual(10);
    expect(r.label).toMatch(/VRAM/);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('scores lower when capacity cannot serve required load', () => {
    const form = buildCalculationConfig();
    const r = calculateConfigurationRating(
      form,
      {
        fiveYearTco: 2_000_000,
        totalEffectiveTokensPerSec: 500,
        requiredGpu: 64,
        serversRequired: 8,
        powerConsumptionKw: 200,
      },
      null,
      null,
      false,
      form.modelId,
    );
    expect(r.score).toBeLessThan(40);
    expect(r.issues.some((i) => i.text.includes('производительность'))).toBe(true);
  });
});

describe('performFullCalculation integration', () => {
  it('gpt-oss-20b on H100: positive TCO, throughput, rating ≥ 40', () => {
    const cfg = buildCalculationConfig({ modelId: 'gpt-oss-20b', gpuId: 'h100-80gb' });
    const r = performFullCalculation(cfg);
    expect(r.fiveYearTco).toBeGreaterThan(0);
    expect(r.totalEffectiveTokensPerSec).toBeGreaterThan(r.totalTokensPerSecRequired);
    expect(r.configRating.score).toBeGreaterThanOrEqual(40);
    expect(r.modelSizeError).toBeFalsy();
  });

  it('agent load increases GPU count vs simple load', () => {
    const simple = buildCalculationConfig({
      modelId: 'llama4-scout',
      gpuId: 'h100-80gb',
      isAgentModeEnabled: false,
    });
    const agent = buildCalculationConfig({
      modelId: 'llama4-scout',
      gpuId: 'h100-80gb',
      isAgentModeEnabled: true,
      agentRequestPercentage: 10,
    });
    const rSimple = performFullCalculation(simple);
    const rAgent = performFullCalculation(agent);
    expect(rAgent.requiredGpu).toBeGreaterThanOrEqual(rSimple.requiredGpu);
    expect(rAgent.totalTokensPerSecRequired).toBeGreaterThan(rSimple.totalTokensPerSecRequired * 5);
  });

  it('rating is stable when re-calculated with same hardware', () => {
    const cfg = buildCalculationConfig({ modelId: 'qwen3.6-35b-a3b', gpuId: 'h100-80gb' });
    const first = performFullCalculation(cfg);
    const second = performFullCalculation({
      ...cfg,
      gpuConfigCostUsd: cfg.gpuConfigCostUsd,
    });
    expect(second.configRating.score).toBe(first.configRating.score);
    expect(second.fiveYearTco).toBe(first.fiveYearTco);
  });
});

describe('optimizer + full calculation', () => {
  /** Stub с контролируемым рейтингом — реальные пресеты редко дают ≥40 из-за штрафов TCO/токен и утилизации */
  const stubPerformFullCalculation = (cfg) => {
    const prec = cfg.modelParamsBitsPrecision;
    const gpuCost = cfg.gpuConfigCostUsd ?? 20_000;
    const scoreByKey = {
      'h100-80gb': prec === 16 ? 72 : prec === 8 ? 58 : 45,
      'l40s-48gb': prec === 4 ? 52 : 35,
      'b200-192gb': 68,
    };
    const tpsByKey = {
      'h100-80gb': 6000,
      'l40s-48gb': 2500,
      'b200-192gb': 15000,
    };
    const score = scoreByKey[cfg.gpuId] ?? 30;
    const tps = tpsByKey[cfg.gpuId] ?? 1000;
    const tco = gpuCost * (cfg.serverConfigNumGpuPerServer ?? 8) * 80;
    return {
      fiveYearTco: tco,
      requiredGpu: cfg.serverConfigNumGpuPerServer ?? 4,
      serversRequired: 1,
      totalEffectiveTokensPerSec: tps,
      configRating: {
        score,
        label: score >= 65 ? 'Хорошая' : score >= 40 ? 'Компромиссная' : 'Неэффективная',
      },
    };
  };

  it('searchAllHardwareConfigs propagates ratingScore from performFullCalculation', () => {
    const cfg = buildCalculationConfig({ modelId: 'gpt-oss-20b' });
    const all = searchAllHardwareConfigs(cfg, stubPerformFullCalculation);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((r) => typeof r.ratingScore === 'number')).toBe(true);
    expect(all.every((r) => r.fiveYearTco > 0)).toBe(true);
  });

  it('pickOptimalConfig result matches rating when applied via stub', () => {
    const cfg = buildCalculationConfig({ modelId: 'gpt-oss-20b' });
    const all = searchAllHardwareConfigs(cfg, stubPerformFullCalculation);
    const optimal = pickOptimalConfig(all, 'quality');
    expect(optimal).not.toBeNull();

    const gpu = GPU_PRESETS[optimal.gpuKey];
    const srv = SERVER_PRESETS[optimal.serverKey];
    const applied = stubPerformFullCalculation({
      ...cfg,
      gpuId: optimal.gpuKey,
      serverId: optimal.serverKey,
      modelParamsBitsPrecision: optimal.precision,
      gpuConfigCostUsd: gpu.cost,
      serverConfigNumGpuPerServer: srv.gpuCount,
    });
    expect(applied.configRating.score).toBe(optimal.ratingScore);
    expect(applied.fiveYearTco).toBe(optimal.fiveYearTco);
  });

  it('price vs speed vs quality pick different configs on stub data', () => {
    const cfg = buildCalculationConfig({ modelId: 'gpt-oss-20b' });
    const all = searchAllHardwareConfigs(cfg, stubPerformFullCalculation);
    const byPrice = pickOptimalConfig(all, 'price');
    const bySpeed = pickOptimalConfig(all, 'speed');
    const byQuality = pickOptimalConfig(all, 'quality');
    expect(byPrice).not.toBeNull();
    expect(bySpeed).not.toBeNull();
    expect(byQuality).not.toBeNull();
    expect(bySpeed.totalEffectiveTokensPerSec).toBeGreaterThanOrEqual(byPrice.totalEffectiveTokensPerSec);
    expect(byQuality.ratingScore).toBeGreaterThanOrEqual(byPrice.ratingScore);
    // speed goal must pick max tok/s among acceptable
    const maxTps = Math.max(
      ...all.filter((r) => r.ratingScore >= 40).map((r) => r.totalEffectiveTokensPerSec),
    );
    expect(bySpeed.totalEffectiveTokensPerSec).toBe(maxTps);
  });

  it('real presets yield acceptable configs and optimizer picks by goal', () => {
    const cfg = buildCalculationConfig({
      modelId: 'gpt-oss-20b',
      userLoadConcurrentUsers: 100,
      userLoadTokensPerRequest: 100,
    });
    const all = searchAllHardwareConfigs(cfg, performFullCalculation);
    const maxScore = Math.max(...all.map((r) => r.ratingScore), 0);
    expect(all.length).toBeGreaterThan(0);
    expect(maxScore).toBeGreaterThanOrEqual(40);

    const byQuality = pickOptimalConfig(all, 'quality');
    const byPrice = pickOptimalConfig(all, 'price');
    const bySpeed = pickOptimalConfig(all, 'speed');
    expect(byQuality).not.toBeNull();
    expect(byPrice).not.toBeNull();
    expect(bySpeed).not.toBeNull();
    expect(byPrice.fiveYearTco).toBeLessThanOrEqual(byQuality.fiveYearTco);
    expect(bySpeed.totalEffectiveTokensPerSec).toBeGreaterThanOrEqual(byQuality.totalEffectiveTokensPerSec);
  });

  it('pickOptimalConfig on real data matches rating when applied', () => {
    const cfg = buildCalculationConfig({
      modelId: 'gpt-oss-20b',
      userLoadConcurrentUsers: 100,
      userLoadTokensPerRequest: 100,
    });
    const all = searchAllHardwareConfigs(cfg, performFullCalculation);
    const optimal = pickOptimalConfig(all, 'quality');
    expect(optimal).not.toBeNull();

    const gpu = GPU_PRESETS[optimal.gpuKey];
    const srv = SERVER_PRESETS[optimal.serverKey];
    const applied = performFullCalculation({
      ...cfg,
      gpuId: optimal.gpuKey,
      serverId: optimal.serverKey,
      modelParamsBitsPrecision: optimal.precision,
      gpuConfigModel: gpu.name,
      gpuConfigCostUsd: gpu.cost,
      gpuConfigPowerKw: gpu.power,
      gpuConfigVramGb: gpu.vram,
      serverConfigNumGpuPerServer: srv.gpuCount,
      serverConfigCostUsd: srv.cost,
      serverConfigPowerOverheadKw: srv.power,
      serverPricingMode: srv.pricingMode ?? 'barebone',
      serverTotalPowerKw: srv.totalPowerKw ?? null,
      serverTotalGpuVramGb: srv.totalGpuVramGb ?? null,
    });
    expect(applied.configRating.score).toBe(optimal.ratingScore);
    expect(applied.fiveYearTco).toBe(optimal.fiveYearTco);
  });
});
