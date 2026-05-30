import { PERFORMANCE_MATRIX, GPU_RELATIVE_PERFORMANCE } from '../data/performanceData';
import { getCloudApiThroughput } from '../data/openRouterBenchmarks';

/**
 * Расчет требуемого количества GPU
 * @param {Object} calcInputData - Данные формы (с эффективными токенами)
 * @returns {number} - Количество GPU
 */
export const calcRequiredGpu = (calcInputData) => {
    // Используем userLoadTokensPerRequest из calcInputData, который уже учитывает работу агентов
    const { userLoadConcurrentUsers, userLoadTokensPerRequest, userLoadResponseTimeSec, modelParamsTokensPerSecPerGpu } = calcInputData;
    
    // Общая требуемая производительность в токенах/сек
    const totalTokensPerSec = safeDivide(userLoadConcurrentUsers * userLoadTokensPerRequest, userLoadResponseTimeSec);
    // Требуемое количество GPU
    const numGpu = safeDivide(totalTokensPerSec, modelParamsTokensPerSecPerGpu);
    
    return Math.ceil(numGpu);
  };
  
  /**
   * CapEx: barebone (GPU×N + chassis×M) | turnkey (node×M) | rack (rack×M, GPU включены)
   */
  export const calcCapex = (numGpu, formData) => {
    const {
      gpuConfigCostUsd,
      serverConfigNumGpuPerServer,
      serverConfigCostUsd,
      serverPricingMode = 'barebone',
    } = formData;

    const slots = serverConfigNumGpuPerServer || 1;

    if (serverPricingMode === 'rack') {
      const numRacks = Math.max(1, Math.ceil(numGpu / slots));
      const totalServerCost = numRacks * (serverConfigCostUsd ?? 0);
      return {
        totalCost: totalServerCost,
        numServers: numRacks,
        totalGpuCost: 0,
        totalServerCost,
        pricingMode: 'rack',
      };
    }

    if (serverPricingMode === 'turnkey') {
      const numNodes = Math.ceil(numGpu / slots);
      const totalServerCost = numNodes * (serverConfigCostUsd ?? 0);
      return {
        totalCost: totalServerCost,
        numServers: numNodes,
        totalGpuCost: 0,
        totalServerCost,
        pricingMode: 'turnkey',
      };
    }

    const numServers = Math.ceil(numGpu / slots);
    const totalGpuCost = (numGpu ?? 0) * (gpuConfigCostUsd ?? 0);
    const totalServerCost = (numServers ?? 0) * (serverConfigCostUsd ?? 0);

    return {
      totalCost: totalGpuCost + totalServerCost,
      numServers: numServers ?? 0,
      totalGpuCost,
      totalServerCost,
      pricingMode: 'barebone',
    };
  };
  
  /**
   * Расчет операционных затрат (OpEx)
   * Включает энергию, обслуживание, внешние инструменты и ПО
   */
  export const calcOpex = (numGpu, numServers, calcInputData, annualExternalToolCost, fullCapexForMaintenance) => {
    const { 
      gpuConfigPowerKw, 
      serverConfigPowerOverheadKw, 
      serverPricingMode = 'barebone',
      serverTotalPowerKw,
      dcCostsElectricityCostUsdPerKwh, 
      dcCostsPue, 
      dcCostsAnnualMaintenanceRate,
      annualSoftwareCostPerServer,
      annualSoftwareCostPerGpu,
    } = calcInputData;

    let totalPowerKw;
    if (serverPricingMode === 'turnkey' || serverPricingMode === 'rack') {
      const unitPower = serverTotalPowerKw ?? serverConfigPowerOverheadKw ?? 0;
      totalPowerKw = (numServers ?? 0) * unitPower;
    } else {
      totalPowerKw = (numGpu ?? 0) * (gpuConfigPowerKw ?? 0) + (numServers ?? 0) * (serverConfigPowerOverheadKw ?? 0);
    }
    const annualEnergyKwh = totalPowerKw * 24 * 365 * (dcCostsPue ?? 1);
    const energyCost = annualEnergyKwh * (dcCostsElectricityCostUsdPerKwh ?? 0);
    
    const baseCapexForMaintenance = fullCapexForMaintenance ?? calcCapex(numGpu, calcInputData).totalCost;
    const maintenanceCost = baseCapexForMaintenance * (dcCostsAnnualMaintenanceRate ?? 0);
    
    const annualSoftwareCost =
      (numServers ?? 0) * (annualSoftwareCostPerServer ?? 0) +
      (numGpu ?? 0) * (annualSoftwareCostPerGpu ?? 0);

    return { 
      totalOpex: energyCost + maintenanceCost + (annualExternalToolCost ?? 0) + annualSoftwareCost,
      totalPowerKw, 
      annualEnergyKwh, 
      energyCost, 
      maintenanceCost, 
      annualExternalToolCost: annualExternalToolCost ?? 0,
      annualSoftwareCost
    };
  };
  
  /**
   * Расчет требований к хранилищу
   * Использует storageCostPerGB из formData
   */
  export const calcStorageRequirements = (formData, serversRequired) => {
    const { modelParamsNumBillion, modelParamsBitsPrecision, storageCostPerGB, checkpointSizeGb, deployVramGb } = formData;
    const modelSizeGB = checkpointSizeGb
      ?? (deployVramGb && deployVramGb > 0 ? deployVramGb * 1.05 : null)
      ?? safeDivide((modelParamsNumBillion ?? 0) * (modelParamsBitsPrecision ?? 0), 8);
    const recommendedStoragePerModel = modelSizeGB * 3;
    const minStoragePerServer = 2000; 
    const totalStorageGB = recommendedStoragePerModel + ((serversRequired ?? 0) * minStoragePerServer);
    // Используем стоимость из formData
    const storageCostUsd = totalStorageGB * (storageCostPerGB ?? 0.17);
    return {
      modelSizeGB,
      recommendedStoragePerModel,
      totalStorageGB,
      storageCostUsd
    };
  };
  
  /**
   * Расчет требований к сетевой инфраструктуре
   * Использует networkCostPerPort из formData
   */
  export const calcNetworkRequirements = (serversRequired, requiredGpu, formData) => { // Принимаем formData
    const { networkCostPerPort, networkType } = formData; // Получаем стоимость порта и тип сети
    
    // Логика определения типа сети остается в хуке, здесь только считаем стоимость
    // const numPorts = (serversRequired ?? 0) * 2;
    // Используем более сложную логику - по 2 порта на сервер + порты на свитчах для связи серверов?
    // Упрощенно: считаем стоимость портов только на серверах
    const numPorts = (serversRequired ?? 0) * 2; 
    const networkEquipmentCost = numPorts * (networkCostPerPort ?? 2100);
    
    return {
      // networkType теперь берется из formData в хуке
      numPorts,
      networkEquipmentCost
    };
  };
  
  /**
   * Расчет требований к оперативной памяти
   * Использует ramCostPerGB из formData
   */
  export const calcRamRequirements = (formData, serversRequired) => {
    const { gpuConfigVramGb, serverConfigNumGpuPerServer, ramCostPerGB } = formData;
    // Если VRAM = 0 (например, Groq LPU с SRAM-архитектурой), используем fallback 64GB на слот акселератора
    const vramForCalc = (gpuConfigVramGb ?? 0) > 0 ? gpuConfigVramGb : 64;
    const recommendedRamPerServer = vramForCalc * (serverConfigNumGpuPerServer ?? 0) * 2.5;
    const minRamPerServer = vramForCalc * (serverConfigNumGpuPerServer ?? 0);
    // Используем стоимость из formData
    const ramCostPerServer = recommendedRamPerServer * (ramCostPerGB ?? 9);
    return {
      minRamPerServer,
      recommendedRamPerServer,
      ramCostPerServer,
      totalRamCost: ramCostPerServer * (serversRequired ?? 0)
    };
  };

  // Вспомогательная функция для безопасного деления
  const safeDivide = (numerator, denominator) => {
    if (denominator === 0 || !denominator || isNaN(denominator)) return 0;
    return numerator / denominator;
  };

  /**
   * Оценка производительности (tokens/sec).
   * @param {string} modelId
   * @param {string} gpuId
   * @param {number} precision - 16, 8 или 4
   * @param {{ performanceMode?: 'onprem_peak'|'cloud_api' }} options
   */
  export const getEstimatedTokensPerSec = (modelId, gpuId, precision, options = {}) => {
    const { performanceMode = 'onprem_peak' } = options;

    if (performanceMode === 'cloud_api') {
      const cloud = getCloudApiThroughput(modelId);
      if (cloud?.median) {
        return {
          tps: cloud.median,
          estimated: !!cloud.estimated,
          source: 'cloud_api',
          cloudBest: cloud.best,
          cloudProvider: cloud.provider,
        };
      }
    }

    const modelData = PERFORMANCE_MATRIX[modelId];
    if (!modelData) {
        // console.warn(`Model not found in performance matrix: ${modelId}`);
        return { tps: null, estimated: false }; // Модель не найдена
    }

    const gpuData = modelData[gpuId];

    // 1. Прямой поиск
    if (gpuData && gpuData[precision] !== undefined && gpuData[precision] !== null) {
        // Обрабатываем новый и старый форматы данных
        const perfData = gpuData[precision];
        if (typeof perfData === 'object' && perfData !== null && perfData.tps !== undefined) {
            // Новый формат: { tps: value, estimated: bool_flag_maybe? }
            return { tps: perfData.tps, estimated: !!perfData.estimated, source: 'onprem_peak' };
        } else if (typeof perfData === 'number') {
            return { tps: perfData, estimated: !!gpuData.estimated, source: 'onprem_peak' };
        }
    }

    // 1b. MoE-модели часто деплоятся только в FP8/INT — fallback на меньшую точность
    if (precision === 16 && gpuData) {
        for (const fallbackPrec of [8, 4]) {
            const fallback = gpuData[fallbackPrec];
            if (fallback === undefined || fallback === null) continue;
            const tps = typeof fallback === 'object' ? fallback.tps : fallback;
            if (typeof tps === 'number' && tps > 0) {
                return { tps, estimated: true, source: 'onprem_peak' };
            }
        }
    }

    // 2. Попытка оценки на основе относительной производительности
    const targetGpuFactor = GPU_RELATIVE_PERFORMANCE[gpuId] ?? GPU_RELATIVE_PERFORMANCE['default'];
    const baseGpusToTry = ['b200-hbm3e', 'h100-80gb', 'l40s-48gb', 'a100-80gb'];

    for (const baseGpuId of baseGpusToTry) {
        const baseGpuData = modelData[baseGpuId];
        if (baseGpuData && baseGpuData[precision] !== undefined && baseGpuData[precision] !== null) {
            const basePerfData = baseGpuData[precision];
            let baseTps = null;

            if (typeof basePerfData === 'object' && basePerfData !== null && basePerfData.tps !== undefined) {
                baseTps = basePerfData.tps;
            } else if (typeof basePerfData === 'number') {
                baseTps = basePerfData;
            }

            if (baseTps !== null && typeof baseTps === 'number' && baseTps > 0) {
                const baseGpuFactor = GPU_RELATIVE_PERFORMANCE[baseGpuId] ?? GPU_RELATIVE_PERFORMANCE['default'];
                if (baseGpuFactor > 0) {
                    const estimatedTps = Math.round(baseTps * (targetGpuFactor / baseGpuFactor));
                    // console.log(`Estimating ${modelId}/${gpuId}/${precision} based on ${baseGpuId}: ${baseTps} * (${targetGpuFactor}/${baseGpuFactor}) = ${estimatedTps}`);
                    return { tps: estimatedTps, estimated: true, source: 'onprem_peak' };
                }
            }
        }
    }

    // 3. Не удалось найти или оценить
    // console.warn(`Could not find or estimate performance for: ${modelId}, gpu: ${gpuId}, precision: ${precision}`);
    return { tps: null, estimated: false, source: null };
  };

/**
 * OpenRouter API TCO: $/M tokens × годовой объём vs on-prem 5yr.
 */
export const calcOpenRouterApiBenchmark = ({
  annualTokens = 0,
  blendedUsdPerM = 0,
  onPremCapex = 0,
  onPremAnnualOpex = 0,
}) => {
  if (!blendedUsdPerM || blendedUsdPerM <= 0) {
    return {
      openRouterBlendedPerM: null,
      openRouterAnnualUsd: null,
      openRouterFiveYearTco: null,
      onPremFiveYearTco: null,
      breakevenMonths: null,
      cloudSavingsPercent: null,
    };
  }

  const tokensM = annualTokens / 1e6;
  const openRouterAnnualUsd = tokensM * blendedUsdPerM;
  const openRouterFiveYearTco = openRouterAnnualUsd * 5;
  const onPremFiveYearTco = (onPremCapex ?? 0) + (onPremAnnualOpex ?? 0) * 5;
  const monthlyOr = openRouterAnnualUsd / 12;
  const breakevenMonths = monthlyOr > 0 ? onPremCapex / monthlyOr : null;
  const cloudSavingsPercent = onPremFiveYearTco > 0
    ? ((onPremFiveYearTco - openRouterFiveYearTco) / onPremFiveYearTco) * 100
    : null;

  return {
    openRouterBlendedPerM: blendedUsdPerM,
    openRouterAnnualUsd,
    openRouterFiveYearTco,
    onPremFiveYearTco,
    breakevenMonths: Number.isFinite(breakevenMonths) ? breakevenMonths : null,
    cloudSavingsPercent,
  };
};

/**
 * Cloud TCO benchmark vs on-prem CapEx + OpEx
 */
export const calcCloudBenchmark = (numGpu, gpuRatePerHour, onPremCapex, onPremAnnualOpex) => {
  if (!gpuRatePerHour || !numGpu || numGpu <= 0) {
    return {
      cloudGpuRatePerHour: null,
      cloudAnnualUsd: null,
      cloudFiveYearTco: null,
      onPremFiveYearTco: null,
      breakevenMonths: null,
      cloudSavingsPercent: null,
    };
  }

  const cloudAnnualUsd = numGpu * gpuRatePerHour * 8760;
  const cloudFiveYearTco = cloudAnnualUsd * 5;
  const onPremFiveYearTco = (onPremCapex ?? 0) + (onPremAnnualOpex ?? 0) * 5;
  const breakevenMonths = onPremAnnualOpex > 0
    ? onPremCapex / (cloudAnnualUsd / 12)
    : onPremCapex / (cloudAnnualUsd / 12);
  const cloudSavingsPercent = onPremFiveYearTco > 0
    ? ((onPremFiveYearTco - cloudFiveYearTco) / onPremFiveYearTco) * 100
    : null;

  return {
    cloudGpuRatePerHour: gpuRatePerHour,
    cloudAnnualUsd,
    cloudFiveYearTco,
    onPremFiveYearTco,
    breakevenMonths: Number.isFinite(breakevenMonths) ? breakevenMonths : null,
    cloudSavingsPercent,
  };
};