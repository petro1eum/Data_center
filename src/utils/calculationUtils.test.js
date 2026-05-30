import { describe, it, expect } from 'vitest';
import {
  calcCapex,
  calcOpex,
  getEstimatedTokensPerSec,
  calcCloudBenchmark,
} from './calculationUtils.js';

describe('calcCapex', () => {
  const barebone = {
    gpuConfigCostUsd: 30_000,
    serverConfigNumGpuPerServer: 8,
    serverConfigCostUsd: 25_000,
    serverPricingMode: 'barebone',
  };

  it('barebone: GPU cost + server cost', () => {
    const r = calcCapex(16, barebone);
    expect(r.numServers).toBe(2);
    expect(r.totalGpuCost).toBe(16 * 30_000);
    expect(r.totalServerCost).toBe(2 * 25_000);
    expect(r.totalCost).toBe(r.totalGpuCost + r.totalServerCost);
  });

  it('turnkey: node price only, no separate GPU line', () => {
    const r = calcCapex(8, {
      ...barebone,
      serverPricingMode: 'turnkey',
      serverConfigCostUsd: 280_000,
    });
    expect(r.totalGpuCost).toBe(0);
    expect(r.totalCost).toBe(280_000);
    expect(r.numServers).toBe(1);
  });

  it('rack: full rack price, GPUs included', () => {
    const r = calcCapex(16, {
      ...barebone,
      serverPricingMode: 'rack',
      serverConfigCostUsd: 500_000,
    });
    expect(r.totalGpuCost).toBe(0);
    expect(r.numServers).toBe(2);
    expect(r.totalCost).toBe(1_000_000);
  });
});

describe('calcOpex', () => {
  it('grows with GPU count and includes maintenance', () => {
    const form = {
      gpuConfigPowerKw: 0.7,
      serverConfigPowerOverheadKw: 2,
      serverPricingMode: 'barebone',
      dcCostsElectricityCostUsdPerKwh: 0.1,
      dcCostsPue: 1.3,
      dcCostsAnnualMaintenanceRate: 0.05,
      annualSoftwareCostPerServer: 0,
      annualSoftwareCostPerGpu: 0,
      gpuConfigCostUsd: 30_000,
      serverConfigNumGpuPerServer: 8,
      serverConfigCostUsd: 25_000,
    };
    const small = calcOpex(4, 1, form, 0, 200_000);
    const large = calcOpex(32, 4, form, 0, 1_500_000);
    expect(large.totalOpex).toBeGreaterThan(small.totalOpex);
    expect(large.totalPowerKw).toBeGreaterThan(small.totalPowerKw);
    expect(large.maintenanceCost).toBeGreaterThan(small.maintenanceCost);
  });
});

describe('getEstimatedTokensPerSec', () => {
  it('returns on-prem peak for gpt-oss-20b on H100', () => {
    const r = getEstimatedTokensPerSec('gpt-oss-20b', 'h100-80gb', 16, { performanceMode: 'onprem_peak' });
    expect(r.tps).toBeGreaterThan(1000);
    expect(r.source).toBe('onprem_peak');
  });

  it('returns cloud_api throughput when mode is cloud_api', () => {
    const r = getEstimatedTokensPerSec('gpt-oss-120b', 'h100-80gb', 16, { performanceMode: 'cloud_api' });
    expect(r.tps).toBeGreaterThan(100);
    expect(r.source).toBe('cloud_api');
  });

  it('returns null for unknown model/gpu combo', () => {
    const r = getEstimatedTokensPerSec('nonexistent-model', 'h100-80gb', 16);
    expect(r.tps).toBeNull();
  });
});

describe('calcCloudBenchmark', () => {
  it('computes breakeven when cloud is cheaper initially', () => {
    const r = calcCloudBenchmark(8, 3.5, 500_000, 100_000);
    expect(r.cloudFiveYearTco).toBeGreaterThan(0);
    expect(r.cloudAnnualUsd).toBeGreaterThan(0);
  });
});
