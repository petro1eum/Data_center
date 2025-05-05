import { useState, useEffect } from 'react';
import { MODEL_PRESETS } from '../data/modelPresets';
import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { 
  calcRequiredGpu, 
  calcCapex, 
  calcOpex,
  calcStorageRequirements,
  calcNetworkRequirements,
  calcRamRequirements
} from '../utils/calculationUtils';
import { checkModelFitsGpu } from '../utils/validationUtils';

/**
 * Хук для логики калькулятора
 * @returns {Object} - Состояние и методы калькулятора
 */
export const useCalculator = () => {
  // Состояние формы
  const [formData, setFormData] = useState({
    // Параметры модели
    modelParamsNumBillion: 13,
    modelParamsBitsPrecision: 16,
    modelParamsTokensPerSecPerGpu: 60,
    
    // Нагрузка пользователей
    userLoadConcurrentUsers: 500,
    userLoadTokensPerRequest: 100,
    userLoadResponseTimeSec: 2.0,
    
    // GPU конфигурация
    gpuConfigModel: "NVIDIA A100 80GB",
    gpuConfigCostUsd: 15000,
    gpuConfigPowerKw: 0.4,
    gpuConfigVramGb: 80,

        // Конфигурация сервера
        serverConfigNumGpuPerServer: 8,
        serverConfigCostUsd: 65000,
        serverConfigPowerOverheadKw: 1.2,
        
        // Стоимость ЦОД
        dcCostsElectricityCostUsdPerKwh: 0.08,
        dcCostsPue: 1.3,
        dcCostsAnnualMaintenanceRate: 0.05,
        
        // Коэффициент оптимизации батчинга
        batchingOptimizationFactor: 1.0,
      });
    
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
      });
    
      // Состояние выбранных пресетов
      const [selectedModelPreset, setSelectedModelPreset] = useState("");
      const [selectedGpuPreset, setSelectedGpuPreset] = useState("");
      const [selectedServerPreset, setSelectedServerPreset] = useState("");
      
      // Состояние валидации
      const [modelSizeError, setModelSizeError] = useState("");
      
      // Состояние UI
      const [activeTab, setActiveTab] = useState("overview");
      const [showModelInfo, setShowModelInfo] = useState(false);
    
      // Применение пресета модели
      const applyModelPreset = (presetKey) => {
        if (presetKey) {
          const preset = MODEL_PRESETS[presetKey];
          setFormData(prev => ({
            ...prev,
            modelParamsNumBillion: preset.params,
            modelParamsTokensPerSecPerGpu: preset.tokensPerSec,
          }));
          setSelectedModelPreset(presetKey);
          setShowModelInfo(true);
        }
      };
    
      // Применение пресета GPU
      const applyGpuPreset = (presetKey) => {
        if (presetKey) {
          const preset = GPU_PRESETS[presetKey];
          setFormData(prev => ({
            ...prev,
            gpuConfigModel: preset.name,
            gpuConfigCostUsd: preset.cost,
            gpuConfigPowerKw: preset.power,
            gpuConfigVramGb: preset.vram,
          }));
          setSelectedGpuPreset(presetKey);
        }
      };
    
      // Применение пресета сервера
      const applyServerPreset = (presetKey) => {
        if (presetKey) {
          const preset = SERVER_PRESETS[presetKey];
          setFormData(prev => ({
            ...prev,
            serverConfigNumGpuPerServer: preset.gpuCount,
            serverConfigCostUsd: preset.cost,
            serverConfigPowerOverheadKw: preset.power,
          }));
          setSelectedServerPreset(presetKey);
        }
      };
    
      // Обработка изменений формы
      const handleFormChange = (e) => {
        const { name, value } = e.target;
        const numValue = name === 'modelParamsBitsPrecision' ? parseInt(value) : parseFloat(value);
        
        setFormData(prev => ({
          ...prev,
          [name]: numValue
        }));
      };
    
      // Установка коэффициента оптимизации батчинга
      const setBatchingOptimizationFactor = (factor) => {
        setFormData(prev => ({
          ...prev,
          batchingOptimizationFactor: parseFloat(factor)
        }));
      };
    
      // Выполнить расчеты
      const calculateResults = () => {
        // Учитываем коэффициент оптимизации батчинга
        const effectiveFormData = {
          ...formData,
          modelParamsTokensPerSecPerGpu: formData.modelParamsTokensPerSecPerGpu * formData.batchingOptimizationFactor
        };
        
        const numGpu = calcRequiredGpu(effectiveFormData);
        const capexResult = calcCapex(numGpu, effectiveFormData);
        const opexResult = calcOpex(numGpu, capexResult.numServers, effectiveFormData);
        
        // Дополнительные расчеты
        const storageResult = calcStorageRequirements(effectiveFormData, capexResult.numServers);
        const networkResult = calcNetworkRequirements(capexResult.numServers, numGpu);
        const ramResult = calcRamRequirements(effectiveFormData, capexResult.numServers);
        
        // Обновление капитальных затрат с учетом новых компонентов
        const totalCapex = capexResult.totalCost + 
                          networkResult.networkEquipmentCost + 
                          storageResult.storageCostUsd + 
                          ramResult.totalRamCost;
        
        setResults({
          requiredGpu: numGpu,
          serversRequired: capexResult.numServers,
          capexUsd: totalCapex,
          annualOpexUsd: opexResult.totalOpex,
          powerConsumptionKw: opexResult.totalPowerKw,
          annualEnergyKwh: opexResult.annualEnergyKwh,
          energyCostAnnual: opexResult.energyCost,
          maintenanceCostAnnual: opexResult.maintenanceCost,
          fiveYearTco: totalCapex + (opexResult.totalOpex * 5),
          
          // Дополнительные результаты
          totalGpuCost: capexResult.totalGpuCost,
          totalServerCost: capexResult.totalServerCost,
          storageRequirementsGB: storageResult.totalStorageGB,
          storageCostUsd: storageResult.storageCostUsd,
          networkType: networkResult.networkType,
          networkCost: networkResult.networkEquipmentCost,
          ramRequirementPerServerGB: ramResult.recommendedRamPerServer,
          totalRamCost: ramResult.totalRamCost
        });
      };
    
      // Проверка ошибок
      const validateForm = () => {
        const modelFitResult = checkModelFitsGpu(formData);
        
        if (modelFitResult.hasError) {
          setModelSizeError(modelFitResult.errorMessage);
        } else {
          setModelSizeError("");
        }
      };
    
      // Запускаем расчеты и валидацию при изменении формы
      useEffect(() => {
        validateForm();
        calculateResults();
      }, [formData]);
    
      return {
        formData,
        results,
        selectedModelPreset,
        selectedGpuPreset,
        selectedServerPreset,
        modelSizeError,
        activeTab,
        showModelInfo,
        handleFormChange,
        applyModelPreset,
        applyGpuPreset,
        applyServerPreset,
        setBatchingOptimizationFactor,
        setActiveTab,
        setShowModelInfo
      };
    };