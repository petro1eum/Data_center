/**
 * Требования к железу: веса модели, KV-cache, tensor-parallel, нагрузка (в т.ч. мультиагенты).
 */

const safeDivide = (numerator, denominator) => {
  if (!denominator || denominator === 0 || Number.isNaN(denominator)) return 0;
  return numerator / denominator;
};

const GPU_VRAM_USABLE_RATIO = 0.82;
const WEIGHT_OVERHEAD = 1.15;
export const DEPLOY_FOOTPRINT_TOLERANCE_GB_PER_GPU = 2;

/**
 * Расчёт нагрузки: токены/с, LLM- и tool-вызовы, OpEx на внешние инструменты.
 */
export const calcUserLoadMetrics = (formData) => {
  const {
    userLoadConcurrentUsers = 0,
    userLoadTokensPerRequest = 0,
    userLoadResponseTimeSec = 1,
    isAgentModeEnabled = false,
    agentRequestPercentage = 0,
    avgAgentsPerTask = 0,
    avgLlmCallsPerAgent = 0,
    avgToolCallsPerAgent = 0,
    avgAgentLlmTokens = 0,
    avgExternalToolCost = 0,
  } = formData;

  const U = userLoadConcurrentUsers;
  const R = userLoadResponseTimeSec <= 0 ? 1 : userLoadResponseTimeSec;
  const P_agent = isAgentModeEnabled ? (agentRequestPercentage || 0) / 100 : 0;
  const T_simple = userLoadTokensPerRequest;

  let totalTokensPerSecRequired = 0;
  let totalLlmCallsPerSecond = 0;
  let totalToolCallsPerSecond = 0;
  let annualExternalToolCost = 0;
  let avgContextTokensPerSession = T_simple / 2;

  if (isAgentModeEnabled && P_agent > 0) {
    const T_agent_internal = avgAgentsPerTask * avgLlmCallsPerAgent * avgAgentLlmTokens;
    const T_agent_final = T_simple;
    const T_agent_effective = T_agent_internal + T_agent_final;
    const Calls_LLM_agent = avgAgentsPerTask * avgLlmCallsPerAgent + 1;
    const Calls_Tool_agent = avgAgentsPerTask * avgToolCallsPerAgent;

    const tokensAgentUsers = safeDivide(U * P_agent * T_agent_effective, R);
    const llmCallsAgentUsers = safeDivide(U * P_agent * Calls_LLM_agent, R);
    const toolCallsAgentUsers = safeDivide(U * P_agent * Calls_Tool_agent, R);

    totalToolCallsPerSecond += toolCallsAgentUsers;
    annualExternalToolCost += toolCallsAgentUsers * avgExternalToolCost * 3600 * 24 * 365;
    totalTokensPerSecRequired += tokensAgentUsers;
    totalLlmCallsPerSecond += llmCallsAgentUsers;

    const simpleContext = T_simple / 2;
    const agentContext = T_agent_effective / 2;
    avgContextTokensPerSession = (1 - P_agent) * simpleContext + P_agent * agentContext;
  }

  const tokensSimpleUsers = safeDivide(U * (1 - P_agent) * T_simple, R);
  const llmCallsSimpleUsers = safeDivide(U * (1 - P_agent), R);
  totalTokensPerSecRequired += tokensSimpleUsers;
  totalLlmCallsPerSecond += llmCallsSimpleUsers;

  if (!isAgentModeEnabled || P_agent === 0) {
    avgContextTokensPerSession = T_simple / 2;
  }

  return {
    totalTokensPerSecRequired,
    totalLlmCallsPerSecond,
    totalToolCallsPerSecond,
    annualExternalToolCost,
    avgContextTokensPerSession,
  };
};

/**
 * Оценка KV-cache для concurrent sessions.
 * Масштаб: ~35 MB / 1K tokens @ 7B active (GQA baseline); линейно по active params.
 * kvCacheFactor — множитель архитектуры внимания: MLA/MSA/DSA/Mamba/linear сжимают KV
 * в разы (DeepSeek V4 ~10%, MiniMax MSA ~1/20, GLM DSA, Qwen Gated DeltaNet, Nemotron Mamba).
 * 1.0 = обычный GQA. См. поле kvCacheFactor в MODEL_PRESETS.
 */
export const calcKvCacheGb = (formData, avgContextTokensPerSession) => {
  const {
    userLoadConcurrentUsers = 0,
    modelParamsNumBillion = 0,
    modelActiveParamsBillion,
    isMultimodal = false,
    multimodalContextOverheadTokens = 2048,
    kvCacheFactor = 1,
  } = formData;

  const effectiveParams = modelActiveParamsBillion ?? modelParamsNumBillion;
  let contextTokens = Math.max(512, avgContextTokensPerSession ?? 512);
  if (isMultimodal && multimodalContextOverheadTokens > 0) {
    contextTokens += multimodalContextOverheadTokens;
  }
  const attnFactor = (kvCacheFactor > 0 && kvCacheFactor <= 1) ? kvCacheFactor : 1;
  const kvGbPerUserPer1K = (effectiveParams / 7) * 0.035 * attnFactor;

  return userLoadConcurrentUsers * (contextTokens / 1000) * kvGbPerUserPer1K;
};

/**
 * VRAM под веса модели. MoE: все эксперты в памяти → total params, не active.
 * deployVramGb — известный footprint деплоя (квантизация уже учтена).
 */
export const getEffectiveDeployVramGb = (formData) => {
  const {
    modelParamsBitsPrecision = 16,
    deployVramGb,
    deployPrecision,
    deployVramByPrecision,
  } = formData;

  const precisionKey = String(modelParamsBitsPrecision);
  if (deployVramByPrecision?.[precisionKey] > 0) {
    return deployVramByPrecision[precisionKey];
  }

  if (deployVramGb && deployVramGb > 0) {
    const basePrecision = deployPrecision ?? modelParamsBitsPrecision;
    if (basePrecision > 0 && modelParamsBitsPrecision > 0) {
      return deployVramGb * (modelParamsBitsPrecision / basePrecision);
    }
    return deployVramGb;
  }

  return null;
};

export const getEffectiveDeployGpuCount = (formData) => {
  const {
    deployGpuCount,
    deployGpuCountByPrecision,
    deployPrecision,
    modelParamsBitsPrecision = 16,
  } = formData;

  const precisionKey = String(modelParamsBitsPrecision);
  if (deployGpuCountByPrecision?.[precisionKey] > 0) {
    return deployGpuCountByPrecision[precisionKey];
  }

  if (!deployGpuCount || deployGpuCount <= 0) return null;

  const basePrecision = deployPrecision ?? modelParamsBitsPrecision;
  if (basePrecision > 0 && modelParamsBitsPrecision > 0) {
    return Math.max(1, Math.ceil(deployGpuCount * (modelParamsBitsPrecision / basePrecision)));
  }

  return deployGpuCount;
};

export const calcModelWeightGb = (formData) => {
  const {
    modelParamsNumBillion = 0,
    modelParamsBitsPrecision = 16,
  } = formData;

  const effectiveDeployVramGb = getEffectiveDeployVramGb(formData);
  if (effectiveDeployVramGb && effectiveDeployVramGb > 0) {
    return effectiveDeployVramGb;
  }

  const bytesPerParam = modelParamsBitsPrecision / 8;
  return modelParamsNumBillion * bytesPerParam * WEIGHT_OVERHEAD;
};

/**
 * GPU на одну реплику (tensor parallel) и минимум GPU под память.
 */
export const calcMemoryGpuRequirements = (formData, kvCacheGb = 0) => {
  const { gpuConfigVramGb = 0 } = formData;
  const effectiveDeployVramGb = getEffectiveDeployVramGb(formData);
  const effectiveDeployGpuCount = getEffectiveDeployGpuCount(formData);

  if (!gpuConfigVramGb || gpuConfigVramGb <= 0) {
    return {
      weightGb: 0,
      kvCacheGb,
      totalVramGb: kvCacheGb,
      gpusPerReplica: 1,
      minGpusForMemory: 1,
      vramPerGpuRequired: 0,
      usesDeployVram: false,
    };
  }

  const weightGb = calcModelWeightGb(formData);
  const { isMultimodal, multimodalOverheadGb = 0, deployVramGb: deployFootprint } = formData;
  const encoderOverhead = isMultimodal && !deployFootprint ? (multimodalOverheadGb || 4) : (multimodalOverheadGb || 0);
  const usableVram = gpuConfigVramGb * GPU_VRAM_USABLE_RATIO;
  const deployVramPerGpu = effectiveDeployVramGb && effectiveDeployVramGb > 0 ? gpuConfigVramGb : usableVram;
  const deployReplicaFloor = effectiveDeployGpuCount && effectiveDeployGpuCount > 0 ? effectiveDeployGpuCount : 1;

  let gpusPerReplica;
  if (effectiveDeployVramGb && effectiveDeployVramGb > 0) {
    gpusPerReplica = Math.max(deployReplicaFloor, Math.ceil(effectiveDeployVramGb / deployVramPerGpu));
  } else {
    gpusPerReplica = Math.max(1, Math.ceil(weightGb / usableVram));
  }

  const totalVramGb = weightGb + kvCacheGb + encoderOverhead;
  const memoryVramPerGpu = effectiveDeployVramGb && effectiveDeployVramGb > 0 ? gpuConfigVramGb : usableVram;
  const deployToleranceGb = effectiveDeployVramGb && effectiveDeployVramGb > 0
    ? DEPLOY_FOOTPRINT_TOLERANCE_GB_PER_GPU
    : 0;
  const fitsKnownDeployFootprint = (gpuCount) =>
    totalVramGb <= (gpuCount * memoryVramPerGpu) + (gpuCount * deployToleranceGb);
  let minGpusForMemory = gpusPerReplica;
  if (!fitsKnownDeployFootprint(minGpusForMemory)) {
    minGpusForMemory = Math.max(gpusPerReplica, Math.ceil(totalVramGb / memoryVramPerGpu));
  }
  minGpusForMemory = Math.ceil(minGpusForMemory / gpusPerReplica) * gpusPerReplica;

  const vramPerGpuRequired = minGpusForMemory > 0
    ? (totalVramGb / minGpusForMemory) * (effectiveDeployVramGb && effectiveDeployVramGb > 0 ? 1.0 : 1.05)
    : 0;

  return {
    weightGb,
    kvCacheGb,
    encoderOverhead,
    totalVramGb,
    gpusPerReplica,
    minGpusForMemory,
    vramPerGpuRequired,
    usesDeployVram: !!(effectiveDeployVramGb && effectiveDeployVramGb > 0),
  };
};

/**
 * KV для minimum deploy — 1 concurrent session (floor config).
 */
export const calcKvCacheGbMinimum = (formData) => {
  const minimumFormData = {
    ...formData,
    userLoadConcurrentUsers: 1,
    isAgentModeEnabled: false,
  };
  const loadOne = calcUserLoadMetrics(minimumFormData);
  return calcKvCacheGb(minimumFormData, loadOne.avgContextTokensPerSession);
};

/**
 * Итоговое количество GPU: production | minimum_deploy
 */
export const calcFinalGpuCount = ({
  totalTokensPerSecRequired,
  effectiveTokensPerSecPerGpu,
  gpusPerReplica,
  minGpusForMemory,
  minimumGpusPerReplica,
  minimumGpusForMemory,
  gpuCountMode = 'production',
  deployGpuCount,
  serverPricingMode = 'barebone',
  serverGpuCount = 8,
  totalGpuVramGb,
  weightGb = 0,
  kvCacheGb = 0,
}) => {
  // Матрица даёт tokens/sec/GPU: деплой из N GPU (одна tensor-parallel реплика
  // из N GPU ИЛИ N реплик по 1) отдаёт ~N×tps. Поэтому считаем нужное число GPU
  // напрямую и округляем ВВЕРХ до целых реплик. Старый код умножал число реплик
  // на размер реплики и завышал throughput-ветку в gpusPerReplica раз.
  const tpsPerGpu = effectiveTokensPerSecPerGpu;
  const gpuCountForLoad = Math.ceil(
    safeDivide(totalTokensPerSecRequired, tpsPerGpu),
  );
  const gpuCountForThroughput = gpusPerReplica > 1
    ? Math.max(gpusPerReplica, Math.ceil(gpuCountForLoad / gpusPerReplica) * gpusPerReplica)
    : gpuCountForLoad;
  const replicasForThroughput = gpusPerReplica > 0
    ? gpuCountForThroughput / gpusPerReplica
    : gpuCountForThroughput;
  const tpsPerReplica = tpsPerGpu * gpusPerReplica;

  let productionGpu = Math.max(minGpusForMemory, gpuCountForThroughput);
  if (gpusPerReplica > 1) {
    productionGpu = Math.ceil(productionGpu / gpusPerReplica) * gpusPerReplica;
  }

  const minimumMemoryFloor = minimumGpusForMemory ?? minGpusForMemory;
  const minimumReplicaFloor = minimumGpusPerReplica ?? gpusPerReplica;
  let minimumGpu = Math.max(deployGpuCount ?? minimumReplicaFloor, minimumReplicaFloor, minimumMemoryFloor);

  if (serverPricingMode === 'rack') {
    const rackVram = totalGpuVramGb ?? serverGpuCount * 80;
    const vramNeeded = weightGb + kvCacheGb;
    const racksForVram = Math.max(1, Math.ceil(vramNeeded / rackVram));
    const roundToRack = (n) => Math.max(serverGpuCount, Math.ceil(n / serverGpuCount) * serverGpuCount);

    productionGpu = roundToRack(productionGpu);
    minimumGpu = racksForVram * serverGpuCount;
  }

  const numGpu = gpuCountMode === 'minimum' ? minimumGpu : productionGpu;

  return {
    numGpu,
    productionGpu,
    minimumDeployGpu: minimumGpu,
    gpuCountForLoad,
    gpuCountForThroughput,
    replicasForThroughput,
    tpsPerReplica,
    gpuCountMode,
  };
};
