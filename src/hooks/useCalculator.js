import { useState, useEffect } from 'react';
import { MODEL_PRESETS } from '../data/modelPresets';
import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { NETWORK_PRESETS } from '../data/networkPresets';
import { STORAGE_PRESETS } from '../data/storagePresets';
import { RAM_PRESETS } from '../data/ramPresets';
import { SOFTWARE_PRESETS } from '../data/softwarePresets';
import { 
  calcCapex, 
  calcOpex,
  calcStorageRequirements,
  calcNetworkRequirements,
  calcRamRequirements
} from '../utils/calculationUtils';
import { checkModelFitsGpu, checkConfigurationWarnings } from '../utils/validationUtils';

// Вспомогательная функция для безопасного деления
const safeDivide = (numerator, denominator) => {
    if (denominator === 0 || !denominator || isNaN(denominator)) return 0;
    return numerator / denominator;
};

// --- Определяем рекомендуемые ключи ВНЕ хука --- 
const recKeys = {
    model: Object.keys(MODEL_PRESETS).find(key => MODEL_PRESETS[key].recommended) || Object.keys(MODEL_PRESETS)[0],
    gpu: Object.keys(GPU_PRESETS).find(key => GPU_PRESETS[key].recommended) || Object.keys(GPU_PRESETS)[0],
    server: Object.keys(SERVER_PRESETS).find(key => SERVER_PRESETS[key].recommended) || Object.keys(SERVER_PRESETS)[0],
    network: Object.keys(NETWORK_PRESETS).find(key => NETWORK_PRESETS[key].recommended) || Object.keys(NETWORK_PRESETS)[0],
    storage: Object.keys(STORAGE_PRESETS).find(key => STORAGE_PRESETS[key].recommended) || Object.keys(STORAGE_PRESETS)[0],
    ram: Object.keys(RAM_PRESETS).find(key => RAM_PRESETS[key].recommended) || Object.keys(RAM_PRESETS)[0],
    software: Object.keys(SOFTWARE_PRESETS).find(key => SOFTWARE_PRESETS[key].recommended) || Object.keys(SOFTWARE_PRESETS)[0],
};

// --- Функция для получения начального formData --- 
const getInitialFormData = () => {
    const modelPreset = MODEL_PRESETS[recKeys.model];
    const gpuPreset = GPU_PRESETS[recKeys.gpu];
    const serverPreset = SERVER_PRESETS[recKeys.server];
    const networkPreset = NETWORK_PRESETS[recKeys.network];
    const storagePreset = STORAGE_PRESETS[recKeys.storage];
    const ramPreset = RAM_PRESETS[recKeys.ram];
    const softwarePreset = SOFTWARE_PRESETS[recKeys.software];

    return {
        modelParamsNumBillion: modelPreset?.params ?? 0,
        modelParamsBitsPrecision: 16,
        modelParamsTokensPerSecPerGpu: modelPreset?.tokensPerSec ?? 0,
        userLoadConcurrentUsers: 100,
        userLoadTokensPerRequest: 100,
        userLoadResponseTimeSec: 2.0,
        gpuConfigModel: gpuPreset?.name ?? "",
        gpuConfigCostUsd: gpuPreset?.cost ?? 0,
        gpuConfigPowerKw: gpuPreset?.power ?? 0,
        gpuConfigVramGb: gpuPreset?.vram ?? 0,
        serverConfigNumGpuPerServer: serverPreset?.gpuCount ?? 8,
        serverConfigCostUsd: serverPreset?.cost ?? 0,
        serverConfigPowerOverheadKw: serverPreset?.power ?? 0,
        networkType: networkPreset?.type ?? "",
        networkCostPerPort: networkPreset?.costPerPort ?? 0,
        storageType: storagePreset?.type ?? "",
        storageCostPerGB: storagePreset?.costPerGB ?? 0,
        ramType: ramPreset?.type ?? "",
        ramCostPerGB: ramPreset?.costPerGB ?? 0,
        annualSoftwareCostPerServer: softwarePreset?.annualCostPerServer ?? 0,
        dcCostsElectricityCostUsdPerKwh: 0.08,
        dcCostsPue: 1.3,
        dcCostsAnnualMaintenanceRate: 0.05,
        batchingOptimizationFactor: 1.0,
        isAgentModeEnabled: false,
        avgAgentsPerTask: 3,
        avgLlmCallsPerAgent: 5,
        avgToolCallsPerAgent: 2,
        avgAgentLlmTokens: 1500,
        avgExternalToolCost: 0.002,
        agentRequestPercentage: 5
    };
};

/**
 * Хук для логики калькулятора
 * @returns {Object} - Состояние и методы калькулятора
 */
export const useCalculator = () => {
  // Инициализируем formData с помощью функции
  const [formData, setFormData] = useState(getInitialFormData);
    
  // Инициализируем selected presets ключами по умолчанию
  const [selectedModelPreset, setSelectedModelPreset] = useState(recKeys.model);
  const [selectedGpuPreset, setSelectedGpuPreset] = useState(recKeys.gpu);
  const [selectedServerPreset, setSelectedServerPreset] = useState(recKeys.server);
  const [selectedNetworkPreset, setSelectedNetworkPreset] = useState(recKeys.network);
  const [selectedStoragePreset, setSelectedStoragePreset] = useState(recKeys.storage);
  const [selectedRamPreset, setSelectedRamPreset] = useState(recKeys.ram);
  const [selectedSoftwarePreset, setSelectedSoftwarePreset] = useState(recKeys.software);
  
  // Состояние результатов
  const [results, setResults] = useState({
    requiredGpu: 0,
    capexUsd: 0,
    annualOpexUsd: 0,
    serversRequired: 0,
    powerConsumptionKw: 0,
    annualEnergyKwh: 0,
    energyCostAnnual: 0,
    maintenanceCostAnnual: 0,
    fiveYearTco: 0,
    
    // Дополнительные параметры
    storageRequirementsGB: 0,
    storageCostUsd: 0,
    networkType: "",
    networkCost: 0,
    ramRequirementPerServerGB: 0,
    totalRamCost: 0,

    // --- Новые результаты для мультиагентных систем ---
    annualExternalToolCost: 0, // Годовая стоимость вызовов инструментов
    totalLlmCallsPerSecond: 0, // Общее кол-во вызовов LLM в секунду (агенты + ответ)
    totalToolCallsPerSecond: 0, // Общее кол-во вызовов инструментов в секунду
    annualSoftwareCost: 0, // Добавляем стоимость ПО в результаты OpEx
  });
  
  // Состояние валидации
  const [modelSizeError, setModelSizeError] = useState("");
  const [configWarnings, setConfigWarnings] = useState([]); // Новый state для предупреждений
  
  // Состояние UI
  const [activeTab, setActiveTab] = useState("overview");
  const [showModelInfo, setShowModelInfo] = useState(true); // Показываем инфо для дефолтной модели

  // Применение пресета модели
  const applyModelPreset = (presetKey) => {
    if (presetKey && MODEL_PRESETS[presetKey]) {
      const preset = MODEL_PRESETS[presetKey];
      // Обновляем ТОЛЬКО связанные с моделью параметры + selected ключ
      setFormData(prev => ({
        ...prev,
        modelParamsNumBillion: preset.params,
        modelParamsTokensPerSecPerGpu: preset.tokensPerSec,
        isAgentModeEnabled: preset.supports_tool_calls ? prev.isAgentModeEnabled : false 
      }));
      setSelectedModelPreset(presetKey);
      setShowModelInfo(true);
    } else {
        setSelectedModelPreset("");
        setShowModelInfo(false);
        setFormData(prev => ({ ...prev, modelParamsNumBillion: 0, modelParamsTokensPerSecPerGpu: 0 }));
    }
  };
  
  // Применение пресета GPU
  const applyGpuPreset = (presetKey) => {
    if (presetKey && GPU_PRESETS[presetKey]) {
      const preset = GPU_PRESETS[presetKey];
      // Обновляем ТОЛЬКО GPU параметры + selected ключ
      setFormData(prev => ({
        ...prev,
        gpuConfigModel: preset.name,
        gpuConfigCostUsd: preset.cost,
        gpuConfigPowerKw: preset.power,
        gpuConfigVramGb: preset.vram,
      }));
      setSelectedGpuPreset(presetKey);
    } else {
        setSelectedGpuPreset("");
        setFormData(prev => ({ ...prev, gpuConfigModel: "", gpuConfigCostUsd: 0, gpuConfigPowerKw: 0, gpuConfigVramGb: 0 }));
    }
  };
  
  // Применение пресета сервера
  const applyServerPreset = (presetKey) => {
    if (presetKey && SERVER_PRESETS[presetKey]) {
      const preset = SERVER_PRESETS[presetKey];
      // Обновляем ТОЛЬКО Server параметры + selected ключ
      setFormData(prev => ({
        ...prev,
        serverConfigNumGpuPerServer: preset.gpuCount,
        serverConfigCostUsd: preset.cost,
        serverConfigPowerOverheadKw: preset.power,
      }));
      setSelectedServerPreset(presetKey);
    } else {
        setSelectedServerPreset("");
        setFormData(prev => ({ ...prev, serverConfigNumGpuPerServer: 0, serverConfigCostUsd: 0, serverConfigPowerOverheadKw: 0 }));
    }
  };

  // Применение пресета сети
  const applyNetworkPreset = (presetKey) => {
      if (presetKey && NETWORK_PRESETS[presetKey]) {
          const preset = NETWORK_PRESETS[presetKey];
          // Обновляем ТОЛЬКО Network параметры + selected ключ
          setFormData(prev => ({
              ...prev,
              networkType: preset.type,
              networkCostPerPort: preset.costPerPort,
          }));
          setSelectedNetworkPreset(presetKey);
      } else {
          setSelectedNetworkPreset("");
          setFormData(prev => ({ ...prev, networkType: "", networkCostPerPort: 0 }));
      }
  };

  // Применение пресета хранилища
  const applyStoragePreset = (presetKey) => {
      if (presetKey && STORAGE_PRESETS[presetKey]) {
          const preset = STORAGE_PRESETS[presetKey];
          // Обновляем ТОЛЬКО Storage параметры + selected ключ
          setFormData(prev => ({
              ...prev,
              storageType: preset.type,
              storageCostPerGB: preset.costPerGB,
          }));
          setSelectedStoragePreset(presetKey);
      } else {
          setSelectedStoragePreset("");
          setFormData(prev => ({ ...prev, storageType: "", storageCostPerGB: 0 }));
      }
  };

  // Применение пресета RAM
  const applyRamPreset = (presetKey) => {
      if (presetKey && RAM_PRESETS[presetKey]) {
          const preset = RAM_PRESETS[presetKey];
          // Обновляем ТОЛЬКО RAM параметры + selected ключ
          setFormData(prev => ({
              ...prev,
              ramType: preset.type,
              ramCostPerGB: preset.costPerGB,
          }));
          setSelectedRamPreset(presetKey);
      } else {
          setSelectedRamPreset("");
          setFormData(prev => ({ ...prev, ramType: "", ramCostPerGB: 0 }));
      }
  };

  // Применение пресета ПО
  const applySoftwarePreset = (presetKey) => {
      if (presetKey && SOFTWARE_PRESETS[presetKey]) {
          const preset = SOFTWARE_PRESETS[presetKey];
           // Обновляем ТОЛЬКО Software параметр + selected ключ
          setFormData(prev => ({
              ...prev,
              annualSoftwareCostPerServer: preset.annualCostPerServer,
          }));
          setSelectedSoftwarePreset(presetKey);
      } else {
          setSelectedSoftwarePreset("");
          setFormData(prev => ({ ...prev, annualSoftwareCostPerServer: 0 }));
      }
  };

  // Обновленный обработчик изменений формы
  const handleFormChange = (eOrName, valueOrNil) => {
    let name, value;
    if (typeof eOrName === 'string') {
      name = eOrName;
      value = valueOrNil;
    } else {
      name = eOrName.target.name;
      value = eOrName.target.type === 'checkbox' ? eOrName.target.checked : eOrName.target.value;
    }
    let processedValue = value;
    // Преобразуем в число, если надо
    if (name !== 'gpuConfigModel' && name !== 'networkType' && name !== 'storageType' && name !== 'ramType' && name !== 'isAgentModeEnabled') {
        processedValue = parseFloat(value) || 0; 
        // Дополнительно для целочисленных полей (если важно)
        const intFields = ['modelParamsBitsPrecision', 'avgAgentsPerTask', 'avgLlmCallsPerAgent', 'avgToolCallsPerAgent', 'avgAgentLlmTokens', 'agentRequestPercentage'];
        if (intFields.includes(name)) {
             processedValue = parseInt(value) || 0;
        }
    } 
    // Обработка boolean
    if (name === 'isAgentModeEnabled') {
        processedValue = Boolean(value);
        // Проверка поддержки tool calls при ВКЛЮЧЕНИИ
        if (processedValue === true) {
            const modelSupports = selectedModelPreset && MODEL_PRESETS[selectedModelPreset]?.supports_tool_calls;
            if (!modelSupports) {
                console.warn("Attempted to enable agent mode for a model that does not support tool calls.");
                return; // Не меняем состояние
            }
        }
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  // Установка коэффициента оптимизации батчинга
  const setBatchingOptimizationFactor = (factor) => {
    setFormData(prev => ({
      ...prev,
      batchingOptimizationFactor: parseFloat(factor)
    }));
  };

  // Обновленная функция расчетов
  const calculateResults = () => {
    const currentFormData = { ...formData };

    const U = currentFormData.userLoadConcurrentUsers;
    const R = currentFormData.userLoadResponseTimeSec;
    const P_agent = currentFormData.isAgentModeEnabled ? (currentFormData.agentRequestPercentage || 0) / 100 : 0;
    const T_simple = currentFormData.userLoadTokensPerRequest;

    let totalTokensPerSecRequired = 0;
    let totalLlmCallsPerSecond = 0;
    let totalToolCallsPerSecond = 0;
    let annualExternalToolCost = 0;

    // Расчет нагрузки для агентского режима (если включен и % > 0)
    if (P_agent > 0) {
        const T_agent_internal = currentFormData.avgAgentsPerTask * currentFormData.avgLlmCallsPerAgent * currentFormData.avgAgentLlmTokens;
        const T_agent_final = T_simple;
        const T_agent_effective = T_agent_internal + T_agent_final;
        const Calls_LLM_agent = currentFormData.avgAgentsPerTask * currentFormData.avgLlmCallsPerAgent + 1;
        const Calls_Tool_agent = currentFormData.avgAgentsPerTask * currentFormData.avgToolCallsPerAgent;

        // Нагрузка от агентских пользователей
        const tokensAgentUsers = U * P_agent * T_agent_effective / R;
        const llmCallsAgentUsers = U * P_agent * Calls_LLM_agent / R;
        totalToolCallsPerSecond = U * P_agent * Calls_Tool_agent / R;
        annualExternalToolCost = totalToolCallsPerSecond * currentFormData.avgExternalToolCost * 3600 * 24 * 365;
        
        totalTokensPerSecRequired += tokensAgentUsers;
        totalLlmCallsPerSecond += llmCallsAgentUsers;
    }

    // Расчет нагрузки для пользователей с простыми запросами
    const tokensSimpleUsers = U * (1 - P_agent) * T_simple / R;
    const llmCallsSimpleUsers = U * (1 - P_agent) / R; // 1 вызов LLM на простой запрос
    totalTokensPerSecRequired += tokensSimpleUsers;
    totalLlmCallsPerSecond += llmCallsSimpleUsers;

    // Расчет GPU
    const effectiveTokensPerSecPerGpu = currentFormData.modelParamsTokensPerSecPerGpu * currentFormData.batchingOptimizationFactor;
    const numGpu = Math.ceil(safeDivide(totalTokensPerSecRequired, effectiveTokensPerSecPerGpu));

    // Расчет остального (CapEx, OpEx, etc.)
    const capexResult = calcCapex(numGpu, currentFormData);
    const opexResult = calcOpex(numGpu, capexResult.numServers, currentFormData, annualExternalToolCost);
    const storageResult = calcStorageRequirements(currentFormData, capexResult.numServers);
    const networkResult = calcNetworkRequirements(capexResult.numServers, numGpu, currentFormData);
    const ramResult = calcRamRequirements(currentFormData, capexResult.numServers);
    
    const totalCapex = (capexResult.totalCost ?? 0) + 
                      (networkResult.networkEquipmentCost ?? 0) + 
                      (storageResult.storageCostUsd ?? 0) + 
                      (ramResult.totalRamCost ?? 0);
    
    const fiveYearTcoCalc = totalCapex + ((opexResult.totalOpex ?? 0) * 5);
    
    // Формируем НОВЫЙ объект результатов
    const newResults = {
      requiredGpu: numGpu ?? 0,
      serversRequired: capexResult.numServers ?? 0,
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
      networkType: currentFormData.networkType || "",
      networkCost: networkResult.networkEquipmentCost ?? 0,
      ramRequirementPerServerGB: ramResult.recommendedRamPerServer ?? 0,
      totalRamCost: ramResult.totalRamCost ?? 0,
      annualExternalToolCost: annualExternalToolCost ?? 0,
      totalLlmCallsPerSecond: totalLlmCallsPerSecond ?? 0,
      totalToolCallsPerSecond: totalToolCallsPerSecond ?? 0,
      annualSoftwareCost: opexResult.annualSoftwareCost ?? 0,
    };

    // Обновляем состояние
    setResults(newResults); 
    
    // Возвращаем НОВЫЙ объект результатов
    return newResults; 
  };

  // Проверка ошибок
  const validateForm = () => {
    const currentFormData = { ...formData };
    const modelFitResult = checkModelFitsGpu(currentFormData);
    
    if (modelFitResult.hasError) {
      setModelSizeError(modelFitResult.errorMessage);
    } else {
      setModelSizeError("");
    }
  };

  // Запускаем расчеты и валидацию при изменении формы
  useEffect(() => {
    const currentResults = calculateResults(); 
    validateFormBasedOnData(formData, currentResults); 
  }, [formData]);

  const calculateResultsBasedOnData = (dataToCalc) => {
      const U = dataToCalc.userLoadConcurrentUsers;
      const R = dataToCalc.userLoadResponseTimeSec;
      const P_agent = dataToCalc.isAgentModeEnabled ? (dataToCalc.agentRequestPercentage || 0) / 100 : 0;
      const T_simple = dataToCalc.userLoadTokensPerRequest;
      let totalTokensPerSecRequired = 0;
      let totalLlmCallsPerSecond = 0;
      let totalToolCallsPerSecond = 0;
      let annualExternalToolCost = 0;

      if (P_agent > 0) {
          const T_agent_internal = dataToCalc.avgAgentsPerTask * dataToCalc.avgLlmCallsPerAgent * dataToCalc.avgAgentLlmTokens;
          const T_agent_final = T_simple;
          const T_agent_effective = T_agent_internal + T_agent_final;
          const Calls_LLM_agent = dataToCalc.avgAgentsPerTask * dataToCalc.avgLlmCallsPerAgent + 1;
          const Calls_Tool_agent = dataToCalc.avgAgentsPerTask * dataToCalc.avgToolCallsPerAgent;
          const tokensAgentUsers = U * P_agent * T_agent_effective / R;
          const llmCallsAgentUsers = U * P_agent * Calls_LLM_agent / R;
          totalToolCallsPerSecond = U * P_agent * Calls_Tool_agent / R;
          annualExternalToolCost = totalToolCallsPerSecond * dataToCalc.avgExternalToolCost * 3600 * 24 * 365;
          totalTokensPerSecRequired += tokensAgentUsers;
          totalLlmCallsPerSecond += llmCallsAgentUsers;
      }
      const tokensSimpleUsers = U * (1 - P_agent) * T_simple / R;
      const llmCallsSimpleUsers = U * (1 - P_agent) / R;
      totalTokensPerSecRequired += tokensSimpleUsers;
      totalLlmCallsPerSecond += llmCallsSimpleUsers;

      const effectiveTokensPerSecPerGpu = dataToCalc.modelParamsTokensPerSecPerGpu * dataToCalc.batchingOptimizationFactor;
      const numGpu = Math.ceil(safeDivide(totalTokensPerSecRequired, effectiveTokensPerSecPerGpu));

      const capexResult = calcCapex(numGpu, dataToCalc);
      const opexResult = calcOpex(numGpu, capexResult.numServers, dataToCalc, annualExternalToolCost);
      const storageResult = calcStorageRequirements(dataToCalc, capexResult.numServers);
      const networkResult = calcNetworkRequirements(capexResult.numServers, numGpu, dataToCalc);
      const ramResult = calcRamRequirements(dataToCalc, capexResult.numServers);
      const totalCapex = (capexResult.totalCost ?? 0) + (networkResult.networkEquipmentCost ?? 0) + (storageResult.storageCostUsd ?? 0) + (ramResult.totalRamCost ?? 0);
      const fiveYearTcoCalc = totalCapex + ((opexResult.totalOpex ?? 0) * 5);
      const calculatedResults = {
        requiredGpu: numGpu ?? 0,
        serversRequired: capexResult.numServers ?? 0,
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
        networkType: dataToCalc.networkType || "",
        networkCost: networkResult.networkEquipmentCost ?? 0,
        ramRequirementPerServerGB: ramResult.recommendedRamPerServer ?? 0,
        totalRamCost: ramResult.totalRamCost ?? 0,
        annualExternalToolCost: annualExternalToolCost ?? 0,
        totalLlmCallsPerSecond: totalLlmCallsPerSecond ?? 0,
        totalToolCallsPerSecond: totalToolCallsPerSecond ?? 0,
        annualSoftwareCost: opexResult.annualSoftwareCost ?? 0,
      };
      setResults(calculatedResults);
      return calculatedResults;
  };

  const validateFormBasedOnData = (dataToValidate, currentResults) => {
      const modelFitResult = checkModelFitsGpu(dataToValidate);
       if (modelFitResult.hasError) {
           setModelSizeError(modelFitResult.errorMessage);
       } else {
           setModelSizeError("");
       }
       setConfigWarnings(checkConfigurationWarnings(dataToValidate, currentResults));
  };

  return {
    formData,
    results,
    selectedModelPreset,
    selectedGpuPreset,
    selectedServerPreset,
    selectedNetworkPreset,
    selectedStoragePreset,
    selectedRamPreset,
    selectedSoftwarePreset,
    modelSizeError,
    activeTab,
    showModelInfo,
    handleFormChange,
    applyModelPreset,
    applyGpuPreset,
    applyServerPreset,
    applyNetworkPreset,
    applyStoragePreset,
    applyRamPreset,
    applySoftwarePreset,
    setBatchingOptimizationFactor,
    setActiveTab,
    setShowModelInfo,
    configWarnings
  };
};