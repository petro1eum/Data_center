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
   * @param {number} numGpu - Количество GPU
   * @param {number} numServers - Количество серверов
   * @param {Object} calcInputData - Данные формы
   * @param {number} annualExternalToolCost - Годовая стоимость внешних инструментов
   * @returns {Object} - Результат расчета OpEx
   */
  export const calcOpex = (numGpu, numServers, calcInputData, annualExternalToolCost) => {
    const { 
      gpuConfigPowerKw, 
      serverConfigPowerOverheadKw, 
      dcCostsElectricityCostUsdPerKwh, 
      dcCostsPue, 
      dcCostsAnnualMaintenanceRate 
    } = calcInputData;
    
    const totalPowerKw = (numGpu ?? 0) * (gpuConfigPowerKw ?? 0) + (numServers ?? 0) * (serverConfigPowerOverheadKw ?? 0);
    const annualEnergyKwh = totalPowerKw * 24 * 365 * (dcCostsPue ?? 1);
    const energyCost = annualEnergyKwh * (dcCostsElectricityCostUsdPerKwh ?? 0);
    
    // Пересчитываем базовый CapEx для расчета обслуживания 
    // (или можно передавать totalCapex из хука, но так надежнее, если calcCapex изменится)
    const baseCapexForMaintenance = calcCapex(numGpu, calcInputData).totalCost;
    const maintenanceCost = baseCapexForMaintenance * (dcCostsAnnualMaintenanceRate ?? 0);
    
    return { 
      totalOpex: energyCost + maintenanceCost + (annualExternalToolCost ?? 0), // Добавили стоимость инструментов
      totalPowerKw, 
      annualEnergyKwh, 
      energyCost, 
      maintenanceCost, 
      annualExternalToolCost: annualExternalToolCost ?? 0 // Возвращаем для информации
    };
  };
  
  /**
   * Расчет требований к хранилищу
   * @param {Object} formData - Данные формы
   * @param {number} serversRequired - Количество требуемых серверов
   * @returns {Object} - Результаты расчета хранилища
   */
  export const calcStorageRequirements = (formData, serversRequired) => {
    const { modelParamsNumBillion, modelParamsBitsPrecision } = formData;
    
    // Базовый размер модели в ГБ (параметры * биты / 8 / 1024^3)
    const modelSizeGB = safeDivide((modelParamsNumBillion ?? 0) * (modelParamsBitsPrecision ?? 0), 8);
    
    // С учетом оптимизаций, кэширования, нескольких версий, дополнительных данных
    const recommendedStoragePerModel = modelSizeGB * 3;
    
    // Минимальный размер хранилища на сервер (для датасетов, логов и т.д.)
    const minStoragePerServer = 2000; // 2 ТБ
    
    // Расчет общего требуемого хранилища
    const totalStorageGB = recommendedStoragePerModel + (serversRequired ?? 0) * minStoragePerServer;
    
    // Примерная стоимость хранилища ($0.15 за ГБ для высокопроизводительных NVMe SSD)
    const storageCostUsd = totalStorageGB * 0.15;
    
    return {
      modelSizeGB,
      recommendedStoragePerModel,
      totalStorageGB,
      storageCostUsd
    };
  };
  
  /**
   * Расчет требований к сетевой инфраструктуре
   * @param {number} serversRequired - Количество требуемых серверов
   * @param {number} requiredGpu - Количество GPU
   * @returns {Object} - Результаты расчета сетевой инфраструктуры
   */
  export const calcNetworkRequirements = (serversRequired, requiredGpu) => {
    // Определение типа сети на основе количества GPU
    let networkType = "Ethernet 100G";
    let costPerPort = 500;
    
    if ((requiredGpu ?? 0) > 8) {
      networkType = "InfiniBand HDR 200G";
      costPerPort = 2000;
    }
    
    if ((requiredGpu ?? 0) > 32) {
      networkType = "InfiniBand NDR 400G";
      costPerPort = 4000;
    }
    
    // Расчет количества портов (2 на сервер для избыточности)
    const numPorts = (serversRequired ?? 0) * 2;
    
    // Стоимость сетевого оборудования
    const networkEquipmentCost = numPorts * costPerPort;
    
    return {
      networkType,
      numPorts,
      networkEquipmentCost
    };
  };
  
  /**
   * Расчет требований к оперативной памяти
   * @param {Object} formData - Данные формы
   * @param {number} serversRequired - Количество требуемых серверов
   * @returns {Object} - Результаты расчета RAM
   */
  export const calcRamRequirements = (formData, serversRequired) => {
    const { gpuConfigVramGb, serverConfigNumGpuPerServer } = formData;
    
    // Рекомендуемый объем RAM на сервер (в 2-3 раза больше суммарного VRAM)
    const recommendedRamPerServer = (gpuConfigVramGb ?? 0) * (serverConfigNumGpuPerServer ?? 0) * 2.5;
    
    // Минимальный объем RAM на сервер
    const minRamPerServer = (gpuConfigVramGb ?? 0) * (serverConfigNumGpuPerServer ?? 0);
    
    // Стоимость RAM (приблизительно $10 за ГБ)
    const ramCostPerServer = recommendedRamPerServer * 10;
    
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