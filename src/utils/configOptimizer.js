import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { NETWORK_PRESETS } from '../data/networkPresets';
import { STORAGE_PRESETS } from '../data/storagePresets';
import { RAM_PRESETS } from '../data/ramPresets';
import { SOFTWARE_PRESETS } from '../data/softwarePresets';
import { getEstimatedTokensPerSec } from './calculationUtils';
import { checkModelFitsGpu } from './validationUtils';

export const CRITICAL_LABELS = ['Ошибка VRAM', 'Нерабочая', 'Нереалистично'];
export const MIN_ACCEPTABLE_SCORE = 40;

/**
 * Многокритериальная оптимизация (MCDM): weighted sum scalarization.
 * Три критерия: минимизировать TCO, максимизировать tok/s, максимизировать рейтинг.
 * Веса ω суммируются в 1; для каждой цели — свой профиль приоритетов.
 * @see findParetoFrontier — множество Пareto-оптимальных решений
 */
export const GOAL_WEIGHTS = {
  price: { cost: 0.80, throughput: 0.10, quality: 0.10 },
  speed: { cost: 0.10, throughput: 0.80, quality: 0.10 },
  quality: { cost: 0.10, throughput: 0.05, quality: 0.85 },
};

/** Цель оптимизации: цена / скорость / качество (рейтинг) */
export const OPTIMIZATION_GOALS = {
  price: {
    id: 'price',
    label: 'Цена',
    description: 'Приоритет минимальной TCO (MCDM: ωTCO 80%, tok/s 10%, рейтинг 10%)',
  },
  speed: {
    id: 'speed',
    label: 'Скорость',
    description: 'Приоритет tok/s (MCDM: ω tok/s 80%, TCO 10%, рейтинг 10%)',
  },
  quality: {
    id: 'quality',
    label: 'Качество',
    description: 'Приоритет рейтинга (MCDM: ω рейтинг 85%, TCO 10%, tok/s 5%)',
  },
};

export const filterWorkableResults = (allResults) =>
  allResults.filter((r) => !CRITICAL_LABELS.includes(r.ratingLabel));

export const filterAcceptableResults = (allResults) =>
  filterWorkableResults(allResults).filter((r) => r.ratingScore >= MIN_ACCEPTABLE_SCORE);

/** Min–max нормализация в [0, 1]; invert=true для критериев «чем меньше, тем лучше» */
export const normalizeMinMax = (values, invert = false) => {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => {
    const normalized = (v - min) / (max - min);
    return invert ? 1 - normalized : normalized;
  });
};

/**
 * Скalarization: S = ω_cost·n(TCO) + ω_tps·n(tok/s) + ω_quality·n(рейтинг).
 * n(·) — min–max по текущему пулу кандидатов.
 */
export const computeScalarScores = (pool, weights) => {
  const costs = pool.map((r) => r.fiveYearTco);
  const throughputs = pool.map((r) => r.totalEffectiveTokensPerSec ?? 0);
  const ratings = pool.map((r) => r.ratingScore);
  const nCost = normalizeMinMax(costs, true);
  const nThroughput = normalizeMinMax(throughputs, false);
  const nQuality = normalizeMinMax(ratings, false);

  return pool.map((r, i) => ({
    candidate: r,
    scalarScore:
      weights.cost * nCost[i]
      + weights.throughput * nThroughput[i]
      + weights.quality * nQuality[i],
  }));
};

/** a доминирует b по (min TCO, max tok/s, max рейтинг) в смысле Пareto */
export const dominates = (a, b) => {
  const aTps = a.totalEffectiveTokensPerSec ?? 0;
  const bTps = b.totalEffectiveTokensPerSec ?? 0;
  const noWorse =
    a.fiveYearTco <= b.fiveYearTco
    && aTps >= bTps
    && a.ratingScore >= b.ratingScore;
  const strictlyBetter =
    a.fiveYearTco < b.fiveYearTco
    || aTps > bTps
    || a.ratingScore > b.ratingScore;
  return noWorse && strictlyBetter;
};

/** Фронт Пareto — конфигурации, которые никто не доминирует по всем трём критериям */
export const findParetoFrontier = (candidates) =>
  candidates.filter(
    (a) => !candidates.some((b) => b !== a && dominates(b, a)),
  );

const compareByGoal = (a, b, goal) => {
  if (goal === 'price') {
    if (a.fiveYearTco !== b.fiveYearTco) return a.fiveYearTco - b.fiveYearTco;
    if (b.ratingScore !== a.ratingScore) return b.ratingScore - a.ratingScore;
    return (b.totalEffectiveTokensPerSec ?? 0) - (a.totalEffectiveTokensPerSec ?? 0);
  }
  if (goal === 'speed') {
    const tpsDiff = (b.totalEffectiveTokensPerSec ?? 0) - (a.totalEffectiveTokensPerSec ?? 0);
    if (tpsDiff !== 0) return tpsDiff;
    if (b.ratingScore !== a.ratingScore) return b.ratingScore - a.ratingScore;
    return a.fiveYearTco - b.fiveYearTco;
  }
  // quality (default)
  if (b.ratingScore !== a.ratingScore) return b.ratingScore - a.ratingScore;
  if (a.fiveYearTco !== b.fiveYearTco) return a.fiveYearTco - b.fiveYearTco;
  return (b.totalEffectiveTokensPerSec ?? 0) - (a.totalEffectiveTokensPerSec ?? 0);
};

/**
 * Перебор GPU × precision × server для текущей модели и нагрузки.
 */
export const searchAllHardwareConfigs = (currentConfig, performFullCalculation) => {
  const allResults = [];
  const precisionsToTry = [16, 8, 4];

  for (const gpuKey of Object.keys(GPU_PRESETS)) {
    const gpuPreset = GPU_PRESETS[gpuKey];
    for (const precision of precisionsToTry) {
      const vramCheck = checkModelFitsGpu({
        modelParamsNumBillion: currentConfig.modelParamsNumBillion,
        modelActiveParamsBillion: currentConfig.modelActiveParamsBillion,
        deployVramGb: currentConfig.deployVramGb,
        modelParamsBitsPrecision: precision,
        gpuConfigVramGb: gpuPreset.vram,
      });
      if (vramCheck.hasError) continue;

      const perfCheck = getEstimatedTokensPerSec(currentConfig.modelId, gpuKey, precision, {
        performanceMode: currentConfig.performanceMode ?? 'onprem_peak',
      });
      if (perfCheck.tps == null) continue;

      for (const serverKey of Object.keys(SERVER_PRESETS)) {
        const serverPreset = SERVER_PRESETS[serverKey];
        const tempConfigData = {
          ...currentConfig,
          gpuId: gpuKey,
          serverId: serverKey,
          modelParamsBitsPrecision: precision,
          gpuConfigModel: gpuPreset.name,
          gpuConfigCostUsd: gpuPreset.cost,
          gpuConfigPowerKw: gpuPreset.power,
          gpuConfigVramGb: gpuPreset.vram,
          serverConfigNumGpuPerServer: serverPreset.gpuCount,
          serverConfigCostUsd: serverPreset.cost,
          serverConfigPowerOverheadKw: serverPreset.power,
          serverPricingMode: serverPreset.pricingMode ?? currentConfig.serverPricingMode,
          serverTotalPowerKw: serverPreset.totalPowerKw ?? null,
          serverTotalGpuVramGb: serverPreset.totalGpuVramGb ?? null,
          networkCostPerPort: NETWORK_PRESETS[currentConfig.networkId]?.costPerPort,
          storageCostPerGB: STORAGE_PRESETS[currentConfig.storageId]?.costPerGB,
          ramCostPerGB: RAM_PRESETS[currentConfig.ramId]?.costPerGB,
          annualSoftwareCostPerServer: SOFTWARE_PRESETS[currentConfig.softwareId]?.annualCostPerServer,
          annualSoftwareCostPerGpu: SOFTWARE_PRESETS[currentConfig.softwareId]?.annualCostPerGpu,
        };

        const calculationResult = performFullCalculation(tempConfigData);
        if (!calculationResult || !(calculationResult.fiveYearTco > 0)) continue;

        allResults.push({
          gpuKey,
          serverKey,
          precision,
          gpuName: gpuPreset.name,
          serverName: serverPreset.name,
          fiveYearTco: calculationResult.fiveYearTco,
          requiredGpu: calculationResult.requiredGpu,
          serversRequired: calculationResult.serversRequired,
          totalEffectiveTokensPerSec: calculationResult.totalEffectiveTokensPerSec,
          ratingLabel: calculationResult.configRating?.label ?? 'N/A',
          ratingScore: calculationResult.configRating?.score ?? 0,
        });
      }
    }
  }

  return allResults;
};

/**
 * Лучший вариант по цели: hard constraint (рейтинг ≥ 40 или fallback),
 * затем weighted sum scalarization (MCDM), при равенстве — лексикографический tie-break.
 * @param {'price'|'speed'|'quality'} goal
 */
export const pickOptimalConfig = (allResults, goal = 'quality') => {
  const acceptable = filterAcceptableResults(allResults);
  const pool = acceptable.length ? acceptable : filterWorkableResults(allResults);
  if (!pool.length) return null;

  const normalizedGoal = OPTIMIZATION_GOALS[goal] ? goal : 'quality';
  const weights = GOAL_WEIGHTS[normalizedGoal];
  const scored = computeScalarScores(pool, weights);

  scored.sort((a, b) => {
    const scoreDiff = b.scalarScore - a.scalarScore;
    if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
    return compareByGoal(a.candidate, b.candidate, normalizedGoal);
  });

  return scored[0].candidate;
};

/** Топ-N самых дешёвых рабочих */
export const pickCheapestConfigs = (allResults, limit = 3) => {
  const workable = filterWorkableResults(allResults);
  workable.sort((a, b) => a.fiveYearTco - b.fiveYearTco);
  return workable.slice(0, limit);
};

export const isSameHardwareConfig = (current, rec) =>
  current?.gpuKey === rec?.gpuKey
  && current?.serverKey === rec?.serverKey
  && parseInt(current?.precision, 10) === parseInt(rec?.precision, 10);
