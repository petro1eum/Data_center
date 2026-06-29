import { MODEL_PRESETS } from '../data/modelPresets';
import { GPU_PRESETS } from '../data/gpuPresets';
import { getEstimatedTokensPerSec } from './calculationUtils';
import { checkModelFitsGpu } from './validationUtils';

/**
 * Метрики throughput для одной пары модель+GPU.
 */
export const buildSingleConfigMetrics = ({
  modelId,
  gpuId,
  precision,
  batchingFactor = 1,
  formData = {},
}) => {
  const model = MODEL_PRESETS[modelId];
  const gpu = GPU_PRESETS[gpuId];
  if (!model || !gpu) return null;

  const perf = getEstimatedTokensPerSec(modelId, gpuId, precision, {
    performanceMode: formData.performanceMode ?? 'onprem_peak',
  });
  if (perf.tps == null || perf.tps <= 0) return null;

  const fitInput = {
    modelParamsNumBillion: model.params,
    modelActiveParamsBillion: model.activeParams ?? model.params,
    deployVramGb: model.deployVramGb ?? null,
    deployPrecision: model.deployPrecision ?? null,
    deployVramByPrecision: model.deployVramByPrecision ?? null,
    deployGpuCount: model.deployGpuCount ?? null,
    deployGpuCountByPrecision: model.deployGpuCountByPrecision ?? null,
    modelParamsBitsPrecision: precision,
    gpuConfigVramGb: gpu.vram,
    userLoadConcurrentUsers: formData.userLoadConcurrentUsers ?? 1,
    userLoadTokensPerRequest: formData.userLoadTokensPerRequest ?? 100,
    userLoadResponseTimeSec: formData.userLoadResponseTimeSec ?? 3,
    isAgentModeEnabled: false,
  };
  const fit = checkModelFitsGpu(fitInput);

  const tpsPerGpu = perf.tps;
  const tpsEffective = tpsPerGpu * batchingFactor;
  const gpusPerReplica = fit.gpusPerReplica ?? 1;
  const tpsPerReplica = tpsEffective;
  const msPerToken = 1000 / tpsEffective;
  const tokensPerMinute = tpsEffective * 60;

  return {
    modelId,
    modelName: model.name,
    gpuId,
    gpuName: gpu.name,
    precision,
    tpsPerGpu,
    tpsEffective,
    tpsPerReplica,
    gpusPerReplica,
    msPerToken,
    tokensPerMinute,
    estimated: perf.estimated,
    fitsVram: !fit.hasError,
    vramWarning: fit.warningMessage ?? null,
    gpuVramGb: gpu.vram,
  };
};

/**
 * Сравнение всех GPU для выбранной модели.
 */
export const buildGpuBenchmarkForModel = ({
  modelId,
  precision,
  batchingFactor = 1,
  formData = {},
  currentGpuId = null,
}) => {
  const rows = [];

  for (const [gpuId, gpu] of Object.entries(GPU_PRESETS)) {
    if (!gpu.vram || gpu.vram <= 0) continue;

    const metrics = buildSingleConfigMetrics({
      modelId,
      gpuId,
      precision,
      batchingFactor,
      formData,
    });
    if (!metrics) continue;

    rows.push({
      ...metrics,
      isCurrent: gpuId === currentGpuId,
      relativeToBest: null,
    });
  }

  rows.sort((a, b) => b.tpsEffective - a.tpsEffective);

  const best = rows[0]?.tpsEffective ?? 1;
  for (const row of rows) {
    row.relativeToBest = Math.round((row.tpsEffective / best) * 100);
  }

  return rows;
};

/**
 * Сравнение моделей на одном GPU.
 */
export const buildModelBenchmarkForGpu = ({
  gpuId,
  precision,
  batchingFactor = 1,
  currentModelId = null,
  limit = 15,
}) => {
  const rows = [];

  for (const [modelId] of Object.entries(MODEL_PRESETS)) {
    const metrics = buildSingleConfigMetrics({
      modelId,
      gpuId,
      precision,
      batchingFactor,
      formData: { userLoadConcurrentUsers: 1 },
    });
    if (!metrics) continue;
    rows.push({ ...metrics, isCurrent: modelId === currentModelId });
  }

  rows.sort((a, b) => b.tpsEffective - a.tpsEffective);
  return rows.slice(0, limit);
};

/**
 * Кластерные метрики для текущего расчёта.
 */
export const buildClusterThroughputMetrics = ({
  tpsPerGpu,
  batchingFactor,
  requiredGpu,
  totalEffectiveTokensPerSec,
  userLoadConcurrentUsers,
  userLoadTokensPerRequest,
  userLoadResponseTimeSec,
  gpusPerReplica = 1,
}) => {
  const tpsEffective = (tpsPerGpu ?? 0) * (batchingFactor ?? 1);
  const clusterTps = totalEffectiveTokensPerSec ?? tpsEffective * (requiredGpu ?? 0);
  const replicas = gpusPerReplica > 0 ? Math.floor((requiredGpu ?? 0) / gpusPerReplica) : 0;

  const tokensPerUserPerSec =
    userLoadResponseTimeSec > 0
      ? (userLoadTokensPerRequest ?? 0) / userLoadResponseTimeSec
      : 0;
  const maxConcurrentAtSla =
    tokensPerUserPerSec > 0 ? Math.floor(clusterTps / tokensPerUserPerSec) : null;

  return {
    tpsPerGpu,
    tpsEffectivePerGpu: tpsEffective,
    clusterTps,
    replicas,
    tpsPerReplica: tpsEffective,
    msPerTokenSingleStream: tpsEffective > 0 ? 1000 / tpsEffective : null,
    tokensPerMinutePerGpu: tpsEffective * 60,
    tokensPerMinuteCluster: clusterTps * 60,
    maxConcurrentUsersAtSla: maxConcurrentAtSla,
    utilizationVsLoad:
      userLoadConcurrentUsers > 0 && maxConcurrentAtSla
        ? Math.round((userLoadConcurrentUsers / maxConcurrentAtSla) * 100)
        : null,
  };
};
