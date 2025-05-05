/**
 * Расчет требуемого количества GPU
 * @param {Object} formData - Данные формы
 * @returns {number} - Количество GPU
 */
export const calcRequiredGpu = (formData) => {
    const { userLoadConcurrentUsers, userLoadTokensPerRequest, userLoadResponseTimeSec, modelParamsTokensPerSecPerGpu } = formData;
    
    const totalTokensPerSec = (userLoadConcurrentUsers * userLoadTokensPerRequest) / userLoadResponseTimeSec;
    const numGpu = totalTokensPerSec / modelParamsTokensPerSecPerGpu;
    
    return Math.ceil(numGpu);
  };
  
  /**
   * Расчет капитальных затрат (CapEx)
   * @param {number} numGpu - Количество GPU
   * @param {Object} formData - Данные формы
   * @returns {Object} - Результат расчета CapEx
   */
  export const calcCapex = (numGpu, formData) => {
    const { gpuConfigCostUsd, serverConfigNumGpuPerServer, serverConfigCostUsd } = formData;
    
    const numServers = Math.ceil(numGpu / serverConfigNumGpuPerServer);
    const totalGpuCost = numGpu * gpuConfigCostUsd;
    const totalServerCost = numServers * serverConfigCostUsd;
    
    return { 
      totalCost: totalGpuCost + totalServerCost, 
      numServers,
      totalGpuCost,
      totalServerCost
    };
  };
  
  /**
   * Расчет операционных затрат (OpEx)
   * @param {number} numGpu - Количество GPU
   * @param {number} numServers - Количество серверов
   * @param {Object} formData - Данные формы
   * @returns {Object} - Результат расчета OpEx
   */
  export const calcOpex = (numGpu, numServers, formData) => {
    const { 
      gpuConfigPowerKw, 
      serverConfigPowerOverheadKw, 
      dcCostsElectricityCostUsdPerKwh, 
      dcCostsPue, 
      dcCostsAnnualMaintenanceRate 
    } = formData;
    
    const totalPowerKw = numGpu * gpuConfigPowerKw + numServers * serverConfigPowerOverheadKw;
    const annualEnergyKwh = totalPowerKw * 24 * 365 * dcCostsPue;
    const energyCost = annualEnergyKwh * dcCostsElectricityCostUsdPerKwh;
    
    const capexResult = calcCapex(numGpu, formData);
    const maintenanceCost = capexResult.totalCost * dcCostsAnnualMaintenanceRate;
    
    return { 
      totalOpex: energyCost + maintenanceCost, 
      totalPowerKw, 
      annualEnergyKwh, 
      energyCost, 
      maintenanceCost 
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
    const modelSizeGB = (modelParamsNumBillion * modelParamsBitsPrecision / 8);
    
    // С учетом оптимизаций, кэширования, нескольких версий, дополнительных данных
    const recommendedStoragePerModel = modelSizeGB * 3;
    
    // Минимальный размер хранилища на сервер (для датасетов, логов и т.д.)
    const minStoragePerServer = 2000; // 2 ТБ
    
    // Расчет общего требуемого хранилища
    const totalStorageGB = recommendedStoragePerModel + (serversRequired * minStoragePerServer);
    
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
    
    if (requiredGpu > 8) {
      networkType = "InfiniBand HDR 200G";
      costPerPort = 2000;
    }
    
    if (requiredGpu > 32) {
      networkType = "InfiniBand NDR 400G";
      costPerPort = 4000;
    }
    
    // Расчет количества портов (2 на сервер для избыточности)
    const numPorts = serversRequired * 2;
    
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
    const recommendedRamPerServer = gpuConfigVramGb * serverConfigNumGpuPerServer * 2.5;
    
    // Минимальный объем RAM на сервер
    const minRamPerServer = gpuConfigVramGb * serverConfigNumGpuPerServer;
    
    // Стоимость RAM (приблизительно $10 за ГБ)
    const ramCostPerServer = recommendedRamPerServer * 10;
    
    return {
      minRamPerServer,
      recommendedRamPerServer,
      ramCostPerServer,
      totalRamCost: ramCostPerServer * serversRequired
    };
  };