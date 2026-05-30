import {
  calcKvCacheGb,
  calcModelWeightGb,
  calcMemoryGpuRequirements,
  calcUserLoadMetrics,
} from './hardwareRequirements.js';

/**
 * Проверка, помещается ли модель в доступную память GPU
 * @param {Object} formData - Данные формы
 * @returns {Object} - Результат проверки (ошибка если есть)
 */
export const checkModelFitsGpu = (formData) => {
    const { modelParamsNumBillion, modelActiveParamsBillion, modelParamsBitsPrecision, gpuConfigVramGb, deployVramGb } = formData;

    if (!gpuConfigVramGb || gpuConfigVramGb <= 0) {
      return { hasError: false, errorMessage: "", requiredGbPerGpu: 0, gpusPerReplica: 1 };
    }

    const loadMetrics = calcUserLoadMetrics(formData);
    const kvCacheGb = calcKvCacheGb(formData, loadMetrics.avgContextTokensPerSession);
    const memoryReq = calcMemoryGpuRequirements(formData, kvCacheGb);
    const weightGb = calcModelWeightGb(formData);
    const effectiveParamsBillion = modelActiveParamsBillion ?? modelParamsNumBillion;
    const isMoE = modelActiveParamsBillion && modelActiveParamsBillion < modelParamsNumBillion * 0.9;

    const { gpusPerReplica, vramPerGpuRequired, minGpusForMemory } = memoryReq;
    const requiredGbPerGpu = vramPerGpuRequired;

    if (gpusPerReplica > 1 && !deployVramGb) {
      const vramNote = isMoE
        ? `${modelParamsNumBillion}B всего (${effectiveParamsBillion}B active) @ ${modelParamsBitsPrecision}-bit`
        : `${modelParamsNumBillion}B @ ${modelParamsBitsPrecision}-bit`;
      return {
        hasError: false,
        errorMessage: "",
        requiredGbPerGpu,
        gpusPerReplica,
        minGpusForMemory,
        weightGb,
        kvCacheGb,
        warningMessage: `Модель (${vramNote}, ~${weightGb.toFixed(0)} GB весов) требует tensor-parallel ≥${gpusPerReplica} GPU × ${gpuConfigVramGb}GB (мин. ${minGpusForMemory} GPU с учётом KV-cache ${kvCacheGb.toFixed(0)} GB).`,
      };
    }

    if (requiredGbPerGpu > gpuConfigVramGb) {
      const vramNote = deployVramGb
        ? `(квантизированный deploy ~${deployVramGb}GB)`
        : isMoE
          ? `(${modelParamsNumBillion}B всего / ${effectiveParamsBillion}B active @ ${modelParamsBitsPrecision}-bit, KV ~${kvCacheGb.toFixed(0)}GB)`
          : `(${modelParamsNumBillion}B @ ${modelParamsBitsPrecision}-bit, KV ~${kvCacheGb.toFixed(0)}GB)`;
      return {
        hasError: true,
        errorMessage: `Внимание: модель ${vramNote} требует ~${requiredGbPerGpu.toFixed(1)} ГБ VRAM на GPU (мин. ${minGpusForMemory} GPU), но выбранный GPU имеет только ${gpuConfigVramGb} ГБ. Нужен tensor-parallel, другой GPU или более агрессивная квантизация.`,
        requiredGbPerGpu,
        gpusPerReplica,
        minGpusForMemory,
        weightGb,
        kvCacheGb,
      };
    }

    return {
      hasError: false,
      errorMessage: "",
      requiredGbPerGpu,
      gpusPerReplica,
      minGpusForMemory,
      weightGb,
      kvCacheGb,
    };
  };

/**
 * Проверка конфигурации на возможные неоптимальности или несовместимости.
 * @param {Object} formData - Текущие данные формы.
 * @param {Object} results - Текущие результаты расчетов.
 * @returns {Array<string>} - Массив строк с предупреждениями.
 */
export const checkConfigurationWarnings = (formData, results) => {
    const warnings = [];
    const {
        requiredGpu,
        gpuCountForMemory,
        gpuCountForThroughput,
        modelWeightGb,
        kvCacheGb,
        gpusPerReplica,
        totalTokensPerSecRequired,
        productionGpu,
        minimumDeployGpu,
        gpuCountMode,
    } = results;
    const { networkType, ramType } = formData;

    // Проверка сети
    const highSpeedNetworks = ['InfiniBand NDR 400G', 'InfiniBand XDR 800G', 'Ethernet 800G'];
    if (requiredGpu > 8 && networkType === 'Ethernet 100G') {
        warnings.push("Сеть Ethernet 100G может быть узким местом для кластера > 8 GPU. Рекомендуется InfiniBand XDR 800G или Spectrum-X 800G.");
    }
    if (requiredGpu > 16 && networkType === 'Ethernet 400G') {
        warnings.push("Ethernet 400G может быть недостаточен для кластера > 16 GPU при распределённом инференсе. Рассмотрите InfiniBand XDR 800G.");
    }
    if (requiredGpu > 32 && !highSpeedNetworks.includes(networkType)) {
        warnings.push("Для кластера > 32 GPU рекомендуется InfiniBand XDR 800G или Ethernet 800G (Spectrum-X).");
    }

    if (gpuCountMode === 'minimum' && productionGpu > minimumDeployGpu) {
        warnings.push(`Режим Min deploy: ${minimumDeployGpu ?? requiredGpu} GPU. Для production-нагрузки потребуется ~${productionGpu} GPU.`);
    }

    if (gpuCountForMemory > gpuCountForThroughput && requiredGpu > 0) {
        warnings.push(`Количество GPU (${requiredGpu}) ограничено памятью (веса ~${modelWeightGb?.toFixed(0) ?? '?'} GB + KV-cache ~${kvCacheGb?.toFixed(0) ?? '?'} GB), а не throughput. Tensor-parallel: ${gpusPerReplica ?? '?'} GPU/реплика.`);
    }

    if (formData.isMultimodal) {
        warnings.push(
            "Мультимодальная модель: deploy VRAM включает типичный сценарий (картинка/видео). Длинное видео или batch изображений могут потребовать +20–50% VRAM (см. официальные таблицы Qwen Omni / VL). KV-cache не учитывает все vision-токены."
        );
    }

    if (formData.isAgentModeEnabled && (formData.agentRequestPercentage ?? 0) > 0 && requiredGpu > 0) {
        const simpleGpuEstimate = Math.ceil(requiredGpu / (1 + (formData.agentRequestPercentage / 100) * 10));
        if (requiredGpu > simpleGpuEstimate * 2) {
            warnings.push(`Мультиагентный режим (${formData.agentRequestPercentage}% запросов) существенно увеличивает нагрузку (~${totalTokensPerSecRequired?.toFixed(0) ?? '?'} tok/s). Проверьте параметры агентов.`);
        }
    }

    // Проверка RAM
    // Можно добавить проверку типа RAM vs тип CPU/платформы, но это сложно без данных о сервере.
    // Пример: если выбран очень старый тип RAM
    if (ramType === 'DDR4' && requiredGpu > 16) { // Условный пример
        warnings.push("Память DDR4 может ограничивать производительность современных GPU в больших кластерах. Рекомендуется DDR5.");
    }

    // Можно добавить другие проверки по мере необходимости:
    // - Соотношение мощности БП сервера к суммарной мощности компонентов
    // - Совместимость GPU и сервера (хотя пресеты серверов часто указывают GPU)

    return warnings;
};