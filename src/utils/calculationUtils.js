import { PERFORMANCE_MATRIX, GPU_RELATIVE_PERFORMANCE } from '../data/performanceData';

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
   * Расчет капитальных затрат (CapEx) - Базовая часть (GPU + Серверы)
   * @param {number} numGpu - Количество GPU
   * @param {Object} formData - Данные формы
   * @returns {Object} - Результат расчета базового CapEx
   */
  export const calcCapex = (numGpu, formData) => {
    const { gpuConfigCostUsd, serverConfigNumGpuPerServer, serverConfigCostUsd } = formData;
    
    const numServers = Math.ceil(numGpu / serverConfigNumGpuPerServer);
    const totalGpuCost = (numGpu ?? 0) * (gpuConfigCostUsd ?? 0);
    const totalServerCost = (numServers ?? 0) * (serverConfigCostUsd ?? 0);
    
    // Стоимость сети, хранилища и RAM теперь считается отдельно в хуке
    return { 
      totalCost: totalGpuCost + totalServerCost, // Базовый CapEx
      numServers: numServers ?? 0,
      totalGpuCost,
      totalServerCost
    };
  };
  
  /**
   * Расчет операционных затрат (OpEx)
   * Включает энергию, обслуживание, внешние инструменты и ПО
   */
  export const calcOpex = (numGpu, numServers, calcInputData, annualExternalToolCost) => {
    const { 
      gpuConfigPowerKw, 
      serverConfigPowerOverheadKw, 
      dcCostsElectricityCostUsdPerKwh, 
      dcCostsPue, 
      dcCostsAnnualMaintenanceRate,
      annualSoftwareCostPerServer // Получаем стоимость ПО из formData
    } = calcInputData;
    
    const totalPowerKw = (numGpu ?? 0) * (gpuConfigPowerKw ?? 0) + (numServers ?? 0) * (serverConfigPowerOverheadKw ?? 0);
    const annualEnergyKwh = totalPowerKw * 24 * 365 * (dcCostsPue ?? 1);
    const energyCost = annualEnergyKwh * (dcCostsElectricityCostUsdPerKwh ?? 0);
    
    const baseCapexForMaintenance = calcCapex(numGpu, calcInputData).totalCost;
    const maintenanceCost = baseCapexForMaintenance * (dcCostsAnnualMaintenanceRate ?? 0);
    
    // Рассчитываем годовую стоимость ПО
    const annualSoftwareCost = (numServers ?? 0) * (annualSoftwareCostPerServer ?? 0);

    return { 
      totalOpex: energyCost + maintenanceCost + (annualExternalToolCost ?? 0) + annualSoftwareCost, // Добавляем стоимость ПО
      totalPowerKw, 
      annualEnergyKwh, 
      energyCost, 
      maintenanceCost, 
      annualExternalToolCost: annualExternalToolCost ?? 0,
      annualSoftwareCost // Возвращаем стоимость ПО для отображения
    };
  };
  
  /**
   * Расчет требований к хранилищу
   * Использует storageCostPerGB из formData
   */
  export const calcStorageRequirements = (formData, serversRequired) => {
    const { modelParamsNumBillion, modelParamsBitsPrecision, storageCostPerGB } = formData;
    const modelSizeGB = safeDivide((modelParamsNumBillion ?? 0) * (modelParamsBitsPrecision ?? 0), 8);
    const recommendedStoragePerModel = modelSizeGB * 3;
    const minStoragePerServer = 2000; 
    const totalStorageGB = recommendedStoragePerModel + ((serversRequired ?? 0) * minStoragePerServer);
    // Используем стоимость из formData
    const storageCostUsd = totalStorageGB * (storageCostPerGB ?? 0.15); // 0.15 как fallback
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
    const networkEquipmentCost = numPorts * (networkCostPerPort ?? 500); // 500 как fallback
    
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
    const recommendedRamPerServer = (gpuConfigVramGb ?? 0) * (serverConfigNumGpuPerServer ?? 0) * 2.5;
    const minRamPerServer = (gpuConfigVramGb ?? 0) * (serverConfigNumGpuPerServer ?? 0);
    // Используем стоимость из formData
    const ramCostPerServer = recommendedRamPerServer * (ramCostPerGB ?? 10); // 10 как fallback
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
   * Оценка производительности (tokens/sec/GPU) на основе модели, GPU и точности.
   * @param {string} modelId - ID модели (например, 'llama3-8b')
   * @param {string} gpuId - ID GPU (например, 'h100-80gb')
   * @param {number} precision - Точность (16, 8 или 4)
   * @returns {Object} - Результат оценки tokens/sec/GPU
   */
  export const getEstimatedTokensPerSec = (modelId, gpuId, precision) => {
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
            return { tps: perfData.tps, estimated: !!perfData.estimated };
        } else if (typeof perfData === 'number') {
            // Старый формат или новый без флага estimate: число
            return { tps: perfData, estimated: false }; // Предполагаем, что это прямое измерение
        }
    }

    // 2. Попытка оценки на основе относительной производительности
    const targetGpuFactor = GPU_RELATIVE_PERFORMANCE[gpuId] ?? GPU_RELATIVE_PERFORMANCE['default'];
    const baseGpusToTry = ['l40s', 'h100-pcie', 'a100-80gb']; // Порядок предпочтения базовых GPU

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
                    return { tps: estimatedTps, estimated: true };
                }
            }
        }
    }

    // 3. Не удалось найти или оценить
    // console.warn(`Could not find or estimate performance for: ${modelId}, gpu: ${gpuId}, precision: ${precision}`);
    return { tps: null, estimated: false };
  };