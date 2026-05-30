import { useState, useEffect } from 'react';
import { MODEL_PRESETS } from '../data/modelPresets';
import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { NETWORK_PRESETS } from '../data/networkPresets';
import { STORAGE_PRESETS } from '../data/storagePresets';
import { RAM_PRESETS } from '../data/ramPresets';
import { SOFTWARE_PRESETS } from '../data/softwarePresets';
import { checkConfigurationWarnings } from '../utils/validationUtils';
import {
  searchAllHardwareConfigs,
  pickOptimalConfig,
  pickCheapestConfigs,
  isSameHardwareConfig,
  filterWorkableResults,
  filterAcceptableResults,
  findParetoFrontier,
  OPTIMIZATION_GOALS,
} from '../utils/configOptimizer';
import { performFullCalculation } from '../engine/fullCalculation';

// --- Определяем рекомендуемые ключи ВНЕ хука ---
const recKeys = {
    model: 'deepseek-v4-flash',
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
        modelActiveParamsBillion: modelPreset?.activeParams ?? modelPreset?.params ?? 0,
        deployVramGb: modelPreset?.deployVramGb ?? null,
        deployGpuCount: modelPreset?.deployGpuCount ?? null,
        checkpointSizeGb: modelPreset?.checkpointSizeGb ?? null,
        modelParamsBitsPrecision: modelPreset?.deployPrecision ?? 16,
        userLoadConcurrentUsers: 100,
        userLoadTokensPerRequest: 100,
        userLoadResponseTimeSec: 3.0,
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
        annualSoftwareCostPerGpu: softwarePreset?.annualCostPerGpu ?? 0,
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
        agentRequestPercentage: 5,
        gpuCountMode: 'production',
        performanceMode: 'onprem_peak',
        cloudProviderId: 'lambda',
        optimizationGoal: 'quality',
        serverPricingMode: serverPreset?.pricingMode ?? 'barebone',
        serverTotalPowerKw: serverPreset?.totalPowerKw ?? null,
        serverTotalGpuVramGb: serverPreset?.totalGpuVramGb ?? null,
        deployGpuCount: modelPreset?.deployGpuCount ?? null,
    };
};


// --- Функция для расчета НАЧАЛЬНЫХ результатов на основе formData ---
// Теперь использует performFullCalculation
 const calculateInitialResults = (initialFormData) => {
     const modelId = recKeys.model;
     const gpuId = recKeys.gpu;
     const serverId = recKeys.server;
     const networkId = recKeys.network;
     const storageId = recKeys.storage;
     const ramId = recKeys.ram;
     const softwareId = recKeys.software;
 
     const configData = {
         ...initialFormData,
         modelId, gpuId, serverId, networkId, storageId, ramId, softwareId,
         // Явно передаем параметры из пресетов, чтобы функция была чистой
         gpuConfigCostUsd: GPU_PRESETS[gpuId]?.cost,
         gpuConfigPowerKw: GPU_PRESETS[gpuId]?.power,
         gpuConfigVramGb: GPU_PRESETS[gpuId]?.vram,
         serverConfigNumGpuPerServer: SERVER_PRESETS[serverId]?.gpuCount,
         serverConfigCostUsd: SERVER_PRESETS[serverId]?.cost,
         serverConfigPowerOverheadKw: SERVER_PRESETS[serverId]?.power,
         serverPricingMode: SERVER_PRESETS[serverId]?.pricingMode ?? 'barebone',
         serverTotalPowerKw: SERVER_PRESETS[serverId]?.totalPowerKw ?? null,
         serverTotalGpuVramGb: SERVER_PRESETS[serverId]?.totalGpuVramGb ?? null,
         deployGpuCount: MODEL_PRESETS[modelId]?.deployGpuCount ?? null,
         checkpointSizeGb: MODEL_PRESETS[modelId]?.checkpointSizeGb ?? null,
         networkCostPerPort: NETWORK_PRESETS[networkId]?.costPerPort,
         storageCostPerGB: STORAGE_PRESETS[storageId]?.costPerGB,
         ramCostPerGB: RAM_PRESETS[ramId]?.costPerGB,
         annualSoftwareCostPerServer: SOFTWARE_PRESETS[softwareId]?.annualCostPerServer,
         annualSoftwareCostPerGpu: SOFTWARE_PRESETS[softwareId]?.annualCostPerGpu,
     };

     return performFullCalculation(configData);
};

/**
 * Хук для логики калькулятора
 */
export const useCalculator = () => {
  const [formData, setFormData] = useState(getInitialFormData);
  const [selectedModelPreset, setSelectedModelPreset] = useState(recKeys.model);
  const [selectedGpuPreset, setSelectedGpuPreset] = useState(recKeys.gpu);
  const [selectedServerPreset, setSelectedServerPreset] = useState(recKeys.server);
  const [selectedNetworkPreset, setSelectedNetworkPreset] = useState(recKeys.network);
  const [selectedStoragePreset, setSelectedStoragePreset] = useState(recKeys.storage);
  const [selectedRamPreset, setSelectedRamPreset] = useState(recKeys.ram);
  const [selectedSoftwarePreset, setSelectedSoftwarePreset] = useState(recKeys.software);
  // --- Инициализация results с помощью calculateInitialResults ---
  const [results, setResults] = useState(() => calculateInitialResults(getInitialFormData()));
  const [recommendedConfig, setRecommendedConfig] = useState(null);
  const [recommendedAlternatives, setRecommendedAlternatives] = useState([]);
  const [isSearchingOptimal, setIsSearchingOptimal] = useState(false);
  const [recommendedError, setRecommendedError] = useState(null);
  const [optimalSearchNote, setOptimalSearchNote] = useState(null);
  // -------------------------------------------------------------
  const [modelSizeError, setModelSizeError] = useState("");
  const [configWarnings, setConfigWarnings] = useState([]); 
  // Инициализируем performanceWarning из начальных результатов
  const [performanceWarning, setPerformanceWarning] = useState(() => calculateInitialResults(getInitialFormData()).performanceWarning || ""); 
  const [activeTab, setActiveTab] = useState("overview");
  const [showModelInfo, setShowModelInfo] = useState(true);

  // --- Применение пресетов ---
  const applyModelPreset = (presetKey) => {
    if (presetKey && MODEL_PRESETS[presetKey]) {
      const preset = MODEL_PRESETS[presetKey];
      setFormData(prev => ({
        ...prev,
        modelParamsNumBillion: preset.params,
        modelActiveParamsBillion: preset.activeParams ?? preset.params,
        deployVramGb: preset.deployVramGb ?? null,
        deployGpuCount: preset.deployGpuCount ?? null,
        checkpointSizeGb: preset.checkpointSizeGb ?? null,
        modelParamsBitsPrecision: preset.deployPrecision ?? prev.modelParamsBitsPrecision,
        isMultimodal: preset.isMultimodal ?? false,
        multimodalOverheadGb: preset.multimodalOverheadGb ?? 0,
        isAgentModeEnabled: preset.supports_tool_calls ? prev.isAgentModeEnabled : false 
      }));
      setSelectedModelPreset(presetKey);
      setShowModelInfo(true);
    } else {
        setSelectedModelPreset("");
        setShowModelInfo(false);
        setFormData(prev => ({ ...prev, modelParamsNumBillion: 0, modelActiveParamsBillion: 0, deployVramGb: null, deployGpuCount: null, checkpointSizeGb: null, isMultimodal: false, multimodalOverheadGb: 0, isAgentModeEnabled: false }));
    }
  };
  const applyGpuPreset = (presetKey) => {
    if (presetKey && GPU_PRESETS[presetKey]) {
      const preset = GPU_PRESETS[presetKey];
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
  const applyServerPreset = (presetKey) => {
    if (presetKey && SERVER_PRESETS[presetKey]) {
      const preset = SERVER_PRESETS[presetKey];
      setFormData(prev => ({
        ...prev,
        serverConfigNumGpuPerServer: preset.gpuCount,
        serverConfigCostUsd: preset.cost,
        serverConfigPowerOverheadKw: preset.power,
        serverPricingMode: preset.pricingMode ?? 'barebone',
        serverTotalPowerKw: preset.totalPowerKw ?? null,
        serverTotalGpuVramGb: preset.totalGpuVramGb ?? null,
      }));
      setSelectedServerPreset(presetKey);
    } else {
        setSelectedServerPreset("");
        setFormData(prev => ({ ...prev, serverConfigNumGpuPerServer: 0, serverConfigCostUsd: 0, serverConfigPowerOverheadKw: 0, serverPricingMode: 'barebone', serverTotalPowerKw: null, serverTotalGpuVramGb: null }));
    }
  };
  const applyNetworkPreset = (presetKey) => {
      if (presetKey && NETWORK_PRESETS[presetKey]) {
          const preset = NETWORK_PRESETS[presetKey];
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
  const applyStoragePreset = (presetKey) => {
      if (presetKey && STORAGE_PRESETS[presetKey]) {
          const preset = STORAGE_PRESETS[presetKey];
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
  const applyRamPreset = (presetKey) => {
      if (presetKey && RAM_PRESETS[presetKey]) {
          const preset = RAM_PRESETS[presetKey];
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
  const applySoftwarePreset = (presetKey) => {
      if (presetKey && SOFTWARE_PRESETS[presetKey]) {
          const preset = SOFTWARE_PRESETS[presetKey];
      setFormData(prev => ({
          ...prev,
          annualSoftwareCostPerServer: preset.annualCostPerServer ?? 0,
          annualSoftwareCostPerGpu: preset.annualCostPerGpu ?? 0,
      }));
          setSelectedSoftwarePreset(presetKey);
      } else {
          setSelectedSoftwarePreset("");
          setFormData(prev => ({ ...prev, annualSoftwareCostPerServer: 0, annualSoftwareCostPerGpu: 0 }));
      }
  };

  // --- Обработчики формы ---
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
    const stringFields = ['gpuConfigModel', 'networkType', 'storageType', 'ramType', 'gpuCountMode', 'cloudProviderId', 'performanceMode'];
    const booleanFields = ['isAgentModeEnabled'];
    const intFields = ['modelParamsBitsPrecision', 'avgAgentsPerTask', 'avgLlmCallsPerAgent', 'avgToolCallsPerAgent', 'avgAgentLlmTokens', 'agentRequestPercentage', 'userLoadConcurrentUsers', 'userLoadTokensPerRequest', 'serverConfigNumGpuPerServer', 'gpuConfigVramGb'];

    if (booleanFields.includes(name)) {
      processedValue = Boolean(value);
      if (name === 'isAgentModeEnabled' && processedValue === true) {
        const modelSupports = selectedModelPreset && MODEL_PRESETS[selectedModelPreset]?.supports_tool_calls;
        if (!modelSupports) {
          console.warn("Attempted to enable agent mode for a model that does not support tool calls.");
          return; 
        }
      }
    } else if (!stringFields.includes(name)) {
      const numValue = Number(value);
      if (!isNaN(numValue)) { 
        if (intFields.includes(name)) {
          processedValue = parseInt(value, 10); 
        } else {
          processedValue = parseFloat(value); 
        }
        if (isNaN(processedValue)) {
            processedValue = 0; 
        }
      } else {
        processedValue = 0; 
      }
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };
  const setBatchingOptimizationFactor = (factor) => {
    setFormData(prev => ({
      ...prev,
      batchingOptimizationFactor: parseFloat(factor) || 1.0
    }));
  };


  // --- Основная функция расчетов --- 
  // Теперь использует performFullCalculation 
  const calculateResults = () => {
    const currentFormData = { ...formData };
    const modelId = selectedModelPreset;
    const gpuId = selectedGpuPreset;
    const serverId = selectedServerPreset;
    const networkId = selectedNetworkPreset;
    const storageId = selectedStoragePreset;
    const ramId = selectedRamPreset;
    const softwareId = selectedSoftwarePreset;

    // Собираем все данные для передачи в чистую функцию
    const calculationInput = {
        ...currentFormData,
        modelId, gpuId, serverId, networkId, storageId, ramId, softwareId
    };
    
    const newResults = performFullCalculation(calculationInput);

    setResults(newResults); 
    // Обновляем отдельные состояния ошибок для отображения
    setModelSizeError(newResults.modelSizeError || "");
    setPerformanceWarning(newResults.performanceWarning || "");
    
    return newResults; 
  };

  // --- Валидация --- 
  const validateForm = (resultSnapshot = results) => {
      const warnings = checkConfigurationWarnings(formData, resultSnapshot);
      if (resultSnapshot.vramWarning) {
          warnings.unshift(resultSnapshot.vramWarning);
      }
      setConfigWarnings(warnings);
  };

  // --- useEffect для запуска расчетов ---
  useEffect(() => {
    const newResults = calculateResults();
    validateForm(newResults);
  }, [
    formData,
    selectedModelPreset,
    selectedGpuPreset,
    selectedServerPreset,
    selectedNetworkPreset,
    selectedStoragePreset,
    selectedRamPreset,
    selectedSoftwarePreset,
  ]);

  const buildCurrentSearchConfig = () => ({
    ...formData,
    modelId: selectedModelPreset,
    networkId: selectedNetworkPreset,
    storageId: selectedStoragePreset,
    ramId: selectedRamPreset,
    softwareId: selectedSoftwarePreset,
  });

  const runConfigSearch = () => searchAllHardwareConfigs(buildCurrentSearchConfig(), performFullCalculation);

  const performOptimalConfigSearch = () => {
    const allResults = runConfigSearch();
    const goal = formData.optimizationGoal ?? 'quality';
    const optimal = pickOptimalConfig(allResults, goal);
    const current = {
      gpuKey: selectedGpuPreset,
      serverKey: selectedServerPreset,
      precision: parseInt(formData.modelParamsBitsPrecision, 10),
    };
    const currentCalc = performFullCalculation({
      ...buildCurrentSearchConfig(),
      gpuId: selectedGpuPreset,
      serverId: selectedServerPreset,
    });

    const acceptable = filterAcceptableResults(allResults);
    const paretoPool = acceptable.length ? acceptable : filterWorkableResults(allResults);
    const pareto = findParetoFrontier(paretoPool);
    const alternatives = pareto
      .filter((p) => !optimal || !isSameHardwareConfig(p, optimal))
      .slice(0, 3);

    if (optimal && isSameHardwareConfig(current, optimal)) {
      return {
        config: {
          ...optimal,
          isCurrentOptimal: true,
          savingsVsCurrent: 0,
          currentScore: currentCalc?.configRating?.score ?? optimal.ratingScore,
        },
        alternatives,
        note: 'already_optimal',
        appliedRating: optimal.ratingScore,
      };
    }

    if (optimal) {
      return {
        config: {
          ...optimal,
          savingsVsCurrent: Math.max(0, (currentCalc?.fiveYearTco ?? 0) - optimal.fiveYearTco),
          currentScore: currentCalc?.configRating?.score ?? 0,
        },
        alternatives,
        note: null,
      };
    }

    const workable = filterWorkableResults(allResults);
    if (!workable.length) {
      return { config: null, alternatives: [], note: 'no_workable' };
    }
    return { config: null, alternatives: pickCheapestConfigs(workable, 3), note: 'no_acceptable' };
  };

  const findOptimalHardwareConfig = async () => {
    if (!selectedModelPreset) {
      setRecommendedError('Сначала выберите модель.');
      return;
    }
    setIsSearchingOptimal(true);
    setRecommendedError(null);
    setOptimalSearchNote(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const { config, alternatives, note, appliedRating } = performOptimalConfigSearch();
      setRecommendedConfig(config);
      setRecommendedAlternatives(alternatives ?? []);
      if (note === 'already_optimal') {
        setOptimalSearchNote(
          `Текущая конфигурация уже оптимальна (рейтинг ${appliedRating ?? '?'}/100).`,
        );
      } else if (note === 'no_workable') {
        setOptimalSearchNote(
          'Не найдено рабочей конфигурации. Измените модель, точность или нагрузку.',
        );
      } else if (note === 'no_acceptable') {
        setOptimalSearchNote(
          'Не найдено конфигураций с рейтингом ≥ 40/100. Показаны лучшие из рабочих — проверьте нагрузку и модель.',
        );
      }
    } catch (err) {
      setRecommendedError(err.message);
      setRecommendedConfig(null);
      setRecommendedAlternatives([]);
      setOptimalSearchNote(null);
    } finally {
      setIsSearchingOptimal(false);
    }
  };

  const applyRecommendedConfig = (rec) => {
    if (!rec?.gpuKey || !rec?.serverKey) return;
    const gpuPreset = GPU_PRESETS[rec.gpuKey];
    const serverPreset = SERVER_PRESETS[rec.serverKey];
    const precision = parseInt(rec.precision, 10) || 16;
    if (!gpuPreset || !serverPreset) return;

    setSelectedGpuPreset(rec.gpuKey);
    setSelectedServerPreset(rec.serverKey);
    setFormData((prev) => ({
      ...prev,
      modelParamsBitsPrecision: precision,
      gpuConfigModel: gpuPreset.name,
      gpuConfigCostUsd: gpuPreset.cost,
      gpuConfigPowerKw: gpuPreset.power,
      gpuConfigVramGb: gpuPreset.vram,
      serverConfigNumGpuPerServer: serverPreset.gpuCount,
      serverConfigCostUsd: serverPreset.cost,
      serverConfigPowerOverheadKw: serverPreset.power,
      serverPricingMode: serverPreset.pricingMode ?? 'barebone',
      serverTotalPowerKw: serverPreset.totalPowerKw ?? null,
      serverTotalGpuVramGb: serverPreset.totalGpuVramGb ?? null,
    }));
    setOptimalSearchNote(null);
    // Пересчёт подберёт конфигурацию заново через useEffect
  };

  // Автоподбор при изменении модели/нагрузки (фоновый)
  useEffect(() => {
    if (!selectedModelPreset) {
      setRecommendedConfig(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingOptimal(true);
      setRecommendedError(null);
      try {
        const { config, alternatives, note, appliedRating } = performOptimalConfigSearch();
        setRecommendedConfig(config);
        setRecommendedAlternatives(alternatives ?? []);
        if (note === 'already_optimal') {
          setOptimalSearchNote(
            `Текущая конфигурация уже оптимальна для приоритета «${OPTIMIZATION_GOALS[formData.optimizationGoal ?? 'quality']?.label}» (рейтинг ${appliedRating ?? '?'}/100).`,
          );
        } else {
          setOptimalSearchNote(null);
        }
      } catch (err) {
        setRecommendedError(err.message);
        setRecommendedConfig(null);
      } finally {
        setIsSearchingOptimal(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [
    formData.userLoadConcurrentUsers,
    formData.userLoadTokensPerRequest,
    formData.userLoadResponseTimeSec,
    formData.isAgentModeEnabled,
    formData.agentRequestPercentage,
    formData.gpuCountMode,
    formData.performanceMode,
    formData.modelParamsBitsPrecision,
    formData.optimizationGoal,
    selectedModelPreset,
    selectedGpuPreset,
    selectedServerPreset,
    selectedNetworkPreset,
    selectedStoragePreset,
    selectedRamPreset,
    selectedSoftwarePreset,
  ]);

  const setOptimizationGoal = (goal) => {
    if (OPTIMIZATION_GOALS[goal]) {
      setFormData((prev) => ({ ...prev, optimizationGoal: goal }));
    }
  };

  // --- Возвращаемые значения хука ---
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
    configWarnings, 
    performanceWarning, 
    recommendedConfig,
    recommendedAlternatives,
    isSearchingOptimal,
    recommendedError,
    optimalSearchNote,
    findOptimalHardwareConfig,
    setOptimizationGoal,
    applyRecommendedConfig,
    OPTIMIZATION_GOALS,
  };
};