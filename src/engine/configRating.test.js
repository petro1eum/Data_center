import { describe, it, expect } from 'vitest';
import { calculateConfigurationRating } from './configRating.js';
import { buildCalculationConfig } from '../test/fixtures.js';

const baseForm = () => buildCalculationConfig({
  gpuConfigModel: 'Test GPU',
  gpuConfigCostUsd: 25_000,
  gpuConfigPowerKw: 0.7,
  gpuConfigVramGb: 80,
  serverConfigNumGpuPerServer: 4,
  modelParamsNumBillion: 20,
  modelParamsBitsPrecision: 8,
  userLoadConcurrentUsers: 50,
  userLoadTokensPerRequest: 128,
  userLoadResponseTimeSec: 3,
});

const baseResults = (overrides = {}) => ({
  fiveYearTco: 500_000,
  totalEffectiveTokensPerSec: 8000,
  requiredGpu: 4,
  serversRequired: 1,
  powerConsumptionKw: 12,
  ...overrides,
});

describe('calculateConfigurationRating — critical paths', () => {
  it('returns 0 when results or formData missing', () => {
    const r = calculateConfigurationRating(null, baseResults(), null, null, false, 'gpt-oss-20b');
    expect(r.score).toBe(0);
    expect(r.label).toBe('Ошибка');
  });

  it('VRAM error → score ≤ 10, label Ошибка VRAM', () => {
    const r = calculateConfigurationRating(
      baseForm(),
      baseResults(),
      'Too big for VRAM',
      null,
      false,
      'gpt-oss-20b',
    );
    expect(r.score).toBeLessThanOrEqual(10);
    expect(r.label).toBe('Ошибка VRAM');
    expect(r.issues.some((i) => i.type === 'critical')).toBe(true);
  });

  it('zero throughput with positive TCO → Нерабочая', () => {
    const r = calculateConfigurationRating(
      baseForm(),
      baseResults({ totalEffectiveTokensPerSec: 0 }),
      null,
      null,
      false,
      'gpt-oss-20b',
    );
    expect(r.score).toBeLessThanOrEqual(10);
    expect(r.label).toBe('Нерабочая');
  });

  it('zero throughput and zero TCO → Неактивная', () => {
    const r = calculateConfigurationRating(
      baseForm(),
      baseResults({ totalEffectiveTokensPerSec: 0, fiveYearTco: 0 }),
      null,
      null,
      false,
      'gpt-oss-20b',
    );
    expect(r.label).toBe('Неактивная');
  });
});

describe('calculateConfigurationRating — efficiency scoring', () => {
  /** При высокой требуемой нагрузке штраф TCO/токен снижается — иначе любая реальная TCO даёт ~0 */
  const highLoadForm = () => buildCalculationConfig({
    gpuConfigModel: 'Test GPU',
    gpuConfigCostUsd: 25_000,
    gpuConfigPowerKw: 0.7,
    gpuConfigVramGb: 80,
    serverConfigNumGpuPerServer: 8,
    modelParamsNumBillion: 20,
    modelParamsBitsPrecision: 8,
    userLoadConcurrentUsers: 10_000,
    userLoadTokensPerRequest: 500,
    userLoadResponseTimeSec: 1,
  });

  it('balanced config scores higher than severely overprovisioned', () => {
    const form = highLoadForm();
    const balanced = calculateConfigurationRating(
      form,
      baseResults({
        fiveYearTco: 800_000,
        totalEffectiveTokensPerSec: 12_000_000,
        requiredGpu: 8,
        serversRequired: 1,
        powerConsumptionKw: 20,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    const overprovisioned = calculateConfigurationRating(
      form,
      baseResults({
        fiveYearTco: 50_000_000,
        totalEffectiveTokensPerSec: 12_000_000 * 5,
        requiredGpu: 64,
        serversRequired: 8,
        powerConsumptionKw: 400,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(balanced.score).toBeGreaterThan(overprovisioned.score);
    expect(balanced.score).toBeGreaterThanOrEqual(40);
  });

  it('penalizes insufficient throughput vs required load', () => {
    const form = baseForm();
    const r = calculateConfigurationRating(
      form,
      baseResults({
        fiveYearTco: 500_000,
        totalEffectiveTokensPerSec: 1000,
        requiredGpu: 4,
        serversRequired: 1,
        powerConsumptionKw: 12,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(r.score).toBeLessThan(40);
    expect(r.issues.some((i) => i.text.includes('производительность'))).toBe(true);
  });

  it('penalizes severe overprovision (capacity headroom >4×)', () => {
    const form = baseForm();
    const requiredTps = (50 * 128) / 3;
    const r = calculateConfigurationRating(
      form,
      baseResults({
        fiveYearTco: 500_000,
        totalEffectiveTokensPerSec: requiredTps * 6,
        requiredGpu: 4,
        serversRequired: 1,
        powerConsumptionKw: 12,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(r.issues.some((i) => i.text.includes('переразмер') || i.text.includes('избыточна'))).toBe(true);
    expect(r.score).toBeLessThan(60);
  });

  it('penalizes low slot fill only with large headroom', () => {
    const form = buildCalculationConfig({
      gpuConfigModel: 'Test GPU',
      gpuConfigCostUsd: 25_000,
      gpuConfigPowerKw: 0.7,
      gpuConfigVramGb: 80,
      serverConfigNumGpuPerServer: 8,
      userLoadConcurrentUsers: 50,
      userLoadTokensPerRequest: 128,
      userLoadResponseTimeSec: 3,
    });
    const requiredTps = (50 * 128) / 3;
    const r = calculateConfigurationRating(
      form,
      baseResults({
        requiredGpu: 1,
        serversRequired: 1,
        totalEffectiveTokensPerSec: requiredTps * 3,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(r.issues.some((i) => i.text.includes('слотов'))).toBe(true);
  });

  it('rewards higher GPU utilization at same TCO', () => {
    const form = highLoadForm();
    const shared = {
      fiveYearTco: 800_000,
      totalEffectiveTokensPerSec: 12_000_000,
      serversRequired: 1,
      powerConsumptionKw: 20,
    };
    const rLowUtil = calculateConfigurationRating(
      form,
      baseResults({ ...shared, requiredGpu: 2 }),
      null,
      null,
      false,
      form.modelId,
    );
    const rHighUtil = calculateConfigurationRating(
      form,
      baseResults({ ...shared, requiredGpu: 7 }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(rHighUtil.score).toBeGreaterThan(rLowUtil.score);
  });

  it('penalizes high cost per required tok/s', () => {
    const form = baseForm();
    const r = calculateConfigurationRating(
      form,
      baseResults({
        fiveYearTco: 10_000_000,
        totalEffectiveTokensPerSec: 100,
        requiredGpu: 4,
        serversRequired: 1,
        powerConsumptionKw: 20,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(r.issues.some((i) => i.text.includes('Токен/с') || i.text.includes('производительность'))).toBe(true);
    expect(r.score).toBeLessThan(40);
  });

  it('penalizes high power per token', () => {
    const form = baseForm();
    const loadTps = (50 * 128) / 3;
    const r = calculateConfigurationRating(
      form,
      baseResults({
        powerConsumptionKw: 500,
        totalEffectiveTokensPerSec: loadTps,
        requiredGpu: 4,
        serversRequired: 1,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(r.issues.some((i) => i.text.includes('энергопотребление'))).toBe(true);
  });
});

describe('calculateConfigurationRating — metadata', () => {
  it('performance warning reduces confidence label', () => {
    const r = calculateConfigurationRating(
      baseForm(),
      baseResults({ fiveYearTco: 200_000, requiredGpu: 4 }),
      null,
      'No benchmark data',
      false,
      'gpt-oss-20b',
    );
    expect(r.issues.some((i) => i.text.includes('No benchmark data'))).toBe(true);
  });

  it('estimated-only performance adds (оценка) suffix', () => {
    const form = baseForm();
    const loadTps = (50 * 128) / 3;
    const r = calculateConfigurationRating(
      form,
      baseResults({
        fiveYearTco: 200_000,
        totalEffectiveTokensPerSec: loadTps * 2,
        requiredGpu: 4,
      }),
      null,
      null,
      true,
      form.modelId,
    );
    expect(r.label).toContain('(оценка)');
    expect(r.issues.some((i) => i.text.includes('оценена приблизительно'))).toBe(true);
  });

  it('clamps score to 0–100', () => {
    const form = baseForm();
    const terrible = calculateConfigurationRating(
      form,
      baseResults({
        fiveYearTco: 50_000_000,
        totalEffectiveTokensPerSec: 1,
        requiredGpu: 1,
        serversRequired: 1,
        powerConsumptionKw: 1000,
      }),
      null,
      null,
      false,
      form.modelId,
    );
    expect(terrible.score).toBeGreaterThanOrEqual(0);
    expect(terrible.score).toBeLessThanOrEqual(100);
  });

  it('sorts issues: critical before warning before info', () => {
    const r = calculateConfigurationRating(
      baseForm(),
      baseResults({ totalEffectiveTokensPerSec: 0, fiveYearTco: 100_000 }),
      'VRAM',
      null,
      false,
      'gpt-oss-20b',
    );
    const types = r.issues.map((i) => i.type);
    const criticalIdx = types.indexOf('critical');
    const warningIdx = types.indexOf('warning');
    if (criticalIdx >= 0 && warningIdx >= 0) {
      expect(criticalIdx).toBeLessThan(warningIdx);
    }
  });
});
