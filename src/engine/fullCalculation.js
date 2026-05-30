import { MODEL_PRESETS } from '../data/modelPresets';
import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { NETWORK_PRESETS } from '../data/networkPresets';
import {
  calcCapex,
  calcOpex,
  calcStorageRequirements,
  calcNetworkRequirements,
  calcRamRequirements,
  getEstimatedTokensPerSec,
  calcCloudBenchmark,
  calcOpenRouterApiBenchmark,
} from '../utils/calculationUtils';
import { getCloudRateForGpu } from '../data/cloudPresets';
import {
  getCloudApiThroughput,
  getOpenRouterPricing,
  estimateAnnualTokens,
} from '../data/openRouterBenchmarks';
import {
  calcUserLoadMetrics,
  calcKvCacheGb,
  calcKvCacheGbMinimum,
  calcMemoryGpuRequirements,
  calcFinalGpuCount,
} from '../utils/hardwareRequirements';
import { checkModelFitsGpu } from '../utils/validationUtils';
import { calculateConfigurationRating } from './configRating';

const MAX_REASONABLE_GPU = 1_000_000;

/** Полный расчёт CapEx/OpEx/TCO, GPU count, рейтинг. */
export const performFullCalculation = (configData) => {
  const {
    modelId,
    gpuId,
    serverId,
    networkId,
    modelParamsBitsPrecision,
    gpuConfigCostUsd,
    gpuConfigPowerKw,
    gpuConfigVramGb,
    serverConfigNumGpuPerServer,
    serverConfigCostUsd,
    serverConfigPowerOverheadKw,
    networkCostPerPort,
    storageCostPerGB,
    ramCostPerGB,
    annualSoftwareCostPerServer,
    annualSoftwareCostPerGpu,
    dcCostsElectricityCostUsdPerKwh,
    dcCostsPue,
    dcCostsAnnualMaintenanceRate,
    batchingOptimizationFactor,
  } = configData;

  const precision = parseInt(modelParamsBitsPrecision, 10);

  const perfResult = getEstimatedTokensPerSec(modelId, gpuId, precision, {
    performanceMode: configData.performanceMode ?? 'onprem_peak',
  });
  const estimatedTokensPerSecPerGpuBase = perfResult.tps;
  let performanceIsEstimated = perfResult.estimated;
  let performanceWarning = null;
  const cloudApiMeta = getCloudApiThroughput(modelId);
  const onPremPerf = configData.performanceMode === 'cloud_api'
    ? getEstimatedTokensPerSec(modelId, gpuId, precision, { performanceMode: 'onprem_peak' })
    : null;

  if (estimatedTokensPerSecPerGpuBase === null) {
    performanceWarning = `Не удалось оценить производительность для ${MODEL_PRESETS[modelId]?.name} на ${GPU_PRESETS[gpuId]?.name} @ ${precision}-бит.`;
    return {
      requiredGpu: Infinity,
      serversRequired: 0,
      capexUsd: 0,
      annualOpexUsd: 0,
      powerConsumptionKw: 0,
      fiveYearTco: 0,
      totalEffectiveTokensPerSec: 0,
      configRating: calculateConfigurationRating(configData, null, null, performanceWarning, performanceIsEstimated, modelId),
      modelSizeError: null,
      performanceWarning,
      performanceIsEstimated,
    };
  }

  const effectiveTokensPerSecPerGpu = estimatedTokensPerSecPerGpuBase * batchingOptimizationFactor;
  const tpsForGpuSizing = (configData.performanceMode === 'cloud_api' && onPremPerf?.tps)
    ? onPremPerf.tps * batchingOptimizationFactor
    : effectiveTokensPerSecPerGpu;

  const loadMetrics = calcUserLoadMetrics(configData);
  const {
    totalTokensPerSecRequired,
    totalLlmCallsPerSecond,
    totalToolCallsPerSecond,
    annualExternalToolCost,
  } = loadMetrics;

  const kvCacheGb = calcKvCacheGb(configData, loadMetrics.avgContextTokensPerSession);
  const kvCacheGbMinimum = calcKvCacheGbMinimum(configData);
  const gpuCountMode = configData.gpuCountMode ?? 'production';
  const memoryReq = calcMemoryGpuRequirements(
    configData,
    gpuCountMode === 'minimum' ? kvCacheGbMinimum : kvCacheGb,
  );
  const serverPreset = SERVER_PRESETS[serverId] ?? {};
  const gpuCountResult = calcFinalGpuCount({
    totalTokensPerSecRequired,
    effectiveTokensPerSecPerGpu: tpsForGpuSizing,
    gpusPerReplica: memoryReq.gpusPerReplica,
    minGpusForMemory: memoryReq.minGpusForMemory,
    gpuCountMode,
    deployGpuCount: configData.deployGpuCount,
    serverPricingMode: configData.serverPricingMode ?? serverPreset.pricingMode ?? 'barebone',
    serverGpuCount: configData.serverConfigNumGpuPerServer ?? serverPreset.gpuCount ?? 8,
    totalGpuVramGb: configData.serverTotalGpuVramGb ?? serverPreset.totalGpuVramGb,
    weightGb: memoryReq.weightGb,
    kvCacheGb: gpuCountMode === 'minimum' ? kvCacheGbMinimum : kvCacheGb,
  });
  const numGpu = gpuCountResult.numGpu;

  if (!Number.isFinite(numGpu) || numGpu > MAX_REASONABLE_GPU) {
    const unrealisticGpuValue = Number.isFinite(numGpu) ? `> ${MAX_REASONABLE_GPU}` : 'неопределенно';
    const realisticWarning = `Требуемое количество GPU (${unrealisticGpuValue}) нереалистично.`;
    return {
      requiredGpu: Number.isFinite(numGpu) ? numGpu : Infinity,
      serversRequired: 0,
      fiveYearTco: 0,
      totalEffectiveTokensPerSec: 0,
      annualExternalToolCost,
      totalLlmCallsPerSecond,
      totalToolCallsPerSecond,
      estimatedTokensPerSecPerGpu: estimatedTokensPerSecPerGpuBase,
      configRating: calculateConfigurationRating(configData, null, null, realisticWarning, performanceIsEstimated, modelId),
      modelSizeError: null,
      performanceWarning: realisticWarning,
      performanceIsEstimated,
    };
  }

  const tempFormDataForCalc = {
    gpuConfigCostUsd,
    serverConfigNumGpuPerServer,
    serverConfigCostUsd,
    serverPricingMode: configData.serverPricingMode,
    serverTotalPowerKw: configData.serverTotalPowerKw,
    gpuConfigPowerKw,
    serverConfigPowerOverheadKw,
    dcCostsElectricityCostUsdPerKwh,
    dcCostsPue,
    dcCostsAnnualMaintenanceRate,
    annualSoftwareCostPerServer,
    annualSoftwareCostPerGpu,
    modelParamsNumBillion: configData.modelParamsNumBillion,
    modelParamsBitsPrecision,
    storageCostPerGB,
    networkCostPerPort,
    networkType: NETWORK_PRESETS[networkId]?.type || '',
    gpuConfigVramGb,
    ramCostPerGB,
  };

  const capexResult = calcCapex(numGpu, tempFormDataForCalc);
  const serversRequired = capexResult.numServers;
  const storageResult = calcStorageRequirements(tempFormDataForCalc, serversRequired);
  const networkResult = calcNetworkRequirements(serversRequired, numGpu, tempFormDataForCalc);
  const ramResult = calcRamRequirements(tempFormDataForCalc, serversRequired);
  const totalCapex = (capexResult.totalCost ?? 0) + (networkResult.networkEquipmentCost ?? 0)
    + (storageResult.storageCostUsd ?? 0) + (ramResult.totalRamCost ?? 0);
  const opexResult = calcOpex(numGpu, serversRequired, tempFormDataForCalc, annualExternalToolCost, totalCapex);
  const fiveYearTcoCalc = totalCapex + ((opexResult.totalOpex ?? 0) * 5);

  const cloudProviderId = configData.cloudProviderId ?? 'lambda';
  let cloudBenchmark;

  if (cloudProviderId === 'openrouter') {
    const orPricing = getOpenRouterPricing(modelId);
    const annualTokens = estimateAnnualTokens({ totalTokensPerSecRequired: loadMetrics.totalTokensPerSecRequired });
    cloudBenchmark = calcOpenRouterApiBenchmark({
      annualTokens,
      blendedUsdPerM: orPricing?.blendedPerM ?? 0,
      onPremCapex: totalCapex,
      onPremAnnualOpex: opexResult.totalOpex,
    });
    cloudBenchmark = {
      ...cloudBenchmark,
      cloudGpuRatePerHour: null,
      cloudAnnualUsd: cloudBenchmark.openRouterAnnualUsd,
      cloudFiveYearTco: cloudBenchmark.openRouterFiveYearTco,
      openRouterProvider: orPricing?.provider ?? null,
      isOpenRouterApi: true,
    };
  } else {
    const cloudRate = getCloudRateForGpu(gpuId, cloudProviderId);
    cloudBenchmark = {
      ...calcCloudBenchmark(numGpu, cloudRate, totalCapex, opexResult.totalOpex),
      isOpenRouterApi: false,
    };
  }

  if (configData.performanceMode === 'cloud_api' && perfResult.source === 'cloud_api') {
    performanceWarning = `Cloud API режим: ${perfResult.tps} tok/s (median, ${perfResult.cloudProvider ?? 'OR'}). On-prem peak: ${onPremPerf?.tps ?? '?'} tok/s/GPU. CapEx считается по on-prem.`;
  }

  const intermediateResults = {
    requiredGpu: numGpu ?? 0,
    productionGpu: gpuCountResult.productionGpu ?? numGpu,
    minimumDeployGpu: gpuCountResult.minimumDeployGpu ?? memoryReq.gpusPerReplica,
    gpuCountMode,
    serversRequired: serversRequired ?? 0,
    capexUsd: totalCapex ?? 0,
    annualOpexUsd: opexResult.totalOpex ?? 0,
    powerConsumptionKw: opexResult.totalPowerKw ?? 0,
    annualEnergyKwh: opexResult.annualEnergyKwh ?? 0,
    energyCostAnnual: opexResult.energyCost ?? 0,
    maintenanceCostAnnual: opexResult.maintenanceCost ?? 0,
    fiveYearTco: fiveYearTcoCalc ?? 0,
    totalGpuCost: capexResult.totalGpuCost ?? 0,
    totalServerCost: capexResult.totalServerCost ?? 0,
    storageRequirementsGB: storageResult.totalStorageGB ?? 0,
    storageCostUsd: storageResult.storageCostUsd ?? 0,
    networkType: tempFormDataForCalc.networkType,
    networkCost: networkResult.networkEquipmentCost ?? 0,
    ramRequirementPerServerGB: ramResult.recommendedRamPerServer ?? 0,
    totalRamCost: ramResult.totalRamCost ?? 0,
    annualExternalToolCost: annualExternalToolCost ?? 0,
    totalLlmCallsPerSecond: totalLlmCallsPerSecond ?? 0,
    totalToolCallsPerSecond: totalToolCallsPerSecond ?? 0,
    annualSoftwareCost: opexResult.annualSoftwareCost ?? 0,
    estimatedTokensPerSecPerGpu: estimatedTokensPerSecPerGpuBase,
    onPremTokensPerSecPerGpu: onPremPerf?.tps ?? estimatedTokensPerSecPerGpuBase,
    totalEffectiveTokensPerSec: numGpu > 0 ? (tpsForGpuSizing * numGpu) : 0,
    cloudApiTps: cloudApiMeta?.median ?? perfResult.cloudBest ?? null,
    cloudApiBestTps: cloudApiMeta?.best ?? null,
    cloudApiProvider: cloudApiMeta?.provider ?? perfResult.cloudProvider ?? null,
    performanceMode: configData.performanceMode ?? 'onprem_peak',
    performanceSource: perfResult.source ?? 'onprem_peak',
    apiStreamsForThroughput: (configData.performanceMode === 'cloud_api' && perfResult.tps > 0)
      ? Math.ceil(totalTokensPerSecRequired / perfResult.tps)
      : null,
    cloudProviderId,
    totalTokensPerSecRequired,
    gpusPerReplica: memoryReq.gpusPerReplica,
    gpuCountForThroughput: gpuCountResult.gpuCountForThroughput,
    gpuCountForMemory: memoryReq.minGpusForMemory,
    modelWeightGb: memoryReq.weightGb,
    kvCacheGb: gpuCountMode === 'minimum' ? kvCacheGbMinimum : kvCacheGb,
    kvCacheGbMinimum,
    ...cloudBenchmark,
  };

  const modelFitResult = checkModelFitsGpu({
    ...configData,
    modelParamsBitsPrecision,
    gpuConfigVramGb,
  });
  const currentModelSizeError = modelFitResult.hasError ? modelFitResult.errorMessage : '';
  const vramWarning = modelFitResult.warningMessage ?? '';

  const rating = calculateConfigurationRating(
    configData,
    intermediateResults,
    currentModelSizeError,
    performanceWarning,
    performanceIsEstimated,
    modelId,
  );

  return {
    ...intermediateResults,
    configRating: rating,
    modelSizeError: currentModelSizeError,
    vramWarning,
    performanceWarning,
    performanceIsEstimated,
  };
};
