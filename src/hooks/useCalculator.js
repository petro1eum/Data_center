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

    // --- Новые параметры для мультиагентных систем ---
    isAgentModeEnabled: false, // Флаг включения режима
    avgAgentsPerTask: 3,       // Среднее кол-во агентов на задачу
    avgLlmCallsPerAgent: 5,    // Среднее кол-во вызовов LLM на агента
    avgToolCallsPerAgent: 2,   // Среднее кол-во вызовов инструментов на агента
    avgAgentLlmTokens: 1500,   // Среднее кол-во токенов на внутренний вызов LLM агента
    avgExternalToolCost: 0.002 // Средняя стоимость вызова внешнего инструмента (USD)
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

        // --- Новые результаты для мультиагентных систем ---
        annualExternalToolCost: 0, // Годовая стоимость вызовов инструментов
        totalLlmCallsPerSecond: 0, // Общее кол-во вызовов LLM в секунду (агенты + ответ)
        totalToolCallsPerSecond: 0 // Общее кол-во вызовов инструментов в секунду
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
    
      // Обновленный обработчик изменений формы
      const handleFormChange = (eOrName, valueOrNil) => {
        let name, value;
        // Обработка событий от Input/Select или прямого вызова с name/value
        if (typeof eOrName === 'string') {
          name = eOrName;
          value = valueOrNil;
        } else {
          name = eOrName.target.name;
          value = eOrName.target.type === 'checkbox' ? eOrName.target.checked : eOrName.target.value;
        }

        // Преобразование в число, если нужно
        let numValue = value;
        if (typeof value === 'string' && !isNaN(parseFloat(value)) && name !== 'gpuConfigModel' && name !== 'networkType') {
            if (name === 'modelParamsBitsPrecision' || name === 'avgAgentsPerTask' || name === 'avgLlmCallsPerAgent' || name === 'avgToolCallsPerAgent' || name === 'avgAgentLlmTokens') {
                 numValue = parseInt(value) || 0; // Целые числа
            } else if (name !== 'isAgentModeEnabled') { // Не парсить boolean
                 numValue = parseFloat(value) || 0; // Числа с плавающей точкой
            }
        }
        
        // Для boolean (isAgentModeEnabled)
        if (name === 'isAgentModeEnabled') {
            numValue = Boolean(value);
        }

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
    
      // Обновленная функция расчетов
      const calculateResults = () => {
        const effectiveTokensPerSecPerGpu = formData.modelParamsTokensPerSecPerGpu * formData.batchingOptimizationFactor;

        let effectiveTokensPerRequest = formData.userLoadTokensPerRequest;
        let totalAgentLlmCallsPerTask = 0;
        let totalToolCallsPerTask = 0;
        let annualExternalToolCost = 0;
        let totalLlmCallsPerSecond = 0;
        let totalToolCallsPerSecond = 0;

        // Расчеты для мультиагентного режима
        if (formData.isAgentModeEnabled) {
          totalAgentLlmCallsPerTask = formData.avgAgentsPerTask * formData.avgLlmCallsPerAgent;
          totalToolCallsPerTask = formData.avgAgentsPerTask * formData.avgToolCallsPerAgent;
          
          // Увеличиваем "эффективные" токены за счет работы агентов
          effectiveTokensPerRequest = (totalAgentLlmCallsPerTask * formData.avgAgentLlmTokens) + formData.userLoadTokensPerRequest;

          // Общее количество вызовов LLM и инструментов в секунду по всей системе
          totalLlmCallsPerSecond = (formData.userLoadConcurrentUsers * (totalAgentLlmCallsPerTask + 1)) / formData.userLoadResponseTimeSec; // +1 за финальный ответ
          totalToolCallsPerSecond = (formData.userLoadConcurrentUsers * totalToolCallsPerTask) / formData.userLoadResponseTimeSec;

          // Годовая стоимость инструментов
          annualExternalToolCost = totalToolCallsPerSecond * formData.avgExternalToolCost * 3600 * 24 * 365;
        } else {
            // Базовый расчет вызовов LLM для простого чата
            totalLlmCallsPerSecond = formData.userLoadConcurrentUsers / formData.userLoadResponseTimeSec;
        }

        // Создаем данные для передачи в утилиты
        const calcInputData = {
          ...formData,
          modelParamsTokensPerSecPerGpu: effectiveTokensPerSecPerGpu, // Передаем эффективную производительность GPU
          userLoadTokensPerRequest: effectiveTokensPerRequest // Передаем эффективное кол-во токенов на запрос
        };

        const numGpu = calcRequiredGpu(calcInputData); // Используем calcInputData
        const capexResult = calcCapex(numGpu, calcInputData); // Используем calcInputData
        
        // Передаем стоимость инструментов в расчет OpEx
        const opexResult = calcOpex(numGpu, capexResult.numServers, calcInputData, annualExternalToolCost); 
        
        const storageResult = calcStorageRequirements(calcInputData, capexResult.numServers);
        const networkResult = calcNetworkRequirements(capexResult.numServers, numGpu);
        const ramResult = calcRamRequirements(calcInputData, capexResult.numServers);
        
        const totalCapex = capexResult.totalCost + 
                          networkResult.networkEquipmentCost + 
                          storageResult.storageCostUsd + 
                          ramResult.totalRamCost;
        
        // TCO теперь включает стоимость инструментов
        const fiveYearTcoCalc = totalCapex + (opexResult.totalOpex * 5);

        setResults({
          requiredGpu: numGpu,
          serversRequired: capexResult.numServers,
          capexUsd: totalCapex,
          annualOpexUsd: opexResult.totalOpex, // Включает стоимость инструментов
          powerConsumptionKw: opexResult.totalPowerKw,
          annualEnergyKwh: opexResult.annualEnergyKwh,
          energyCostAnnual: opexResult.energyCost,
          maintenanceCostAnnual: opexResult.maintenanceCost,
          fiveYearTco: fiveYearTcoCalc, // Обновленный TCO
          totalGpuCost: capexResult.totalGpuCost,
          totalServerCost: capexResult.totalServerCost,
          storageRequirementsGB: storageResult.totalStorageGB,
          storageCostUsd: storageResult.storageCostUsd,
          networkType: networkResult.networkType,
          networkCost: networkResult.networkCost,
          ramRequirementPerServerGB: ramResult.recommendedRamPerServer,
          totalRamCost: ramResult.totalRamCost,
          
          // Новые результаты
          annualExternalToolCost: annualExternalToolCost,
          totalLlmCallsPerSecond: totalLlmCallsPerSecond,
          totalToolCallsPerSecond: totalToolCallsPerSecond
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