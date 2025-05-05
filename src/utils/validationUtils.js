/**
 * Проверка, помещается ли модель в доступную память GPU
 * @param {Object} formData - Данные формы
 * @returns {Object} - Результат проверки (ошибка если есть)
 */
export const checkModelFitsGpu = (formData) => {
    const { modelParamsNumBillion, modelParamsBitsPrecision, gpuConfigVramGb } = formData;
    
    // Формула: (параметры * байт_на_параметр) * коэффициент_накладных_расходов
    const bytesPerParam = modelParamsBitsPrecision / 8;
    const requiredGbPerGpu = (modelParamsNumBillion * bytesPerParam * 1.2) / 1;  // 1.2 - коэффициент накладных расходов
    
    if (requiredGbPerGpu > gpuConfigVramGb) {
      return {
        hasError: true,
        errorMessage: `Внимание: модель ${modelParamsNumBillion}B с ${modelParamsBitsPrecision}-битной точностью требует ~${requiredGbPerGpu.toFixed(1)} ГБ VRAM, но выбранный GPU имеет только ${gpuConfigVramGb} ГБ. Требуется распределение на несколько GPU или понижение точности.`,
        requiredGbPerGpu: requiredGbPerGpu
      };
    }
    
    return { hasError: false, errorMessage: "", requiredGbPerGpu: requiredGbPerGpu };
  };

/**
 * Проверка конфигурации на возможные неоптимальности или несовместимости.
 * @param {Object} formData - Текущие данные формы.
 * @param {Object} results - Текущие результаты расчетов.
 * @returns {Array<string>} - Массив строк с предупреждениями.
 */
export const checkConfigurationWarnings = (formData, results) => {
    const warnings = [];
    const { requiredGpu } = results;
    const { networkType, ramType, gpuConfigVramGb, serverConfigNumGpuPerServer } = formData;
    const { recommendedRamPerServer } = calcRamRequirements(formData, results.serversRequired); // Пересчитываем рек. RAM

    // Проверка сети
    if (requiredGpu > 8 && networkType === 'Ethernet 100G') {
        warnings.push("Сеть Ethernet 100G может быть узким местом для кластера > 8 GPU. Рекомендуется InfiniBand.");
    }
    if (requiredGpu > 32 && networkType !== 'InfiniBand NDR 400G') {
        warnings.push("Для кластера > 32 GPU рекомендуется сеть InfiniBand NDR 400G для оптимальной производительности.");
    }

    // Проверка RAM (если посчиталось меньше рекомендуемого - хотя расчет сейчас всегда считает рекомендуемый)
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

// Пере импортируем утилиты, чтобы checkConfigurationWarnings могла их использовать
import { calcRamRequirements } from './calculationUtils';
// Убедимся, что safeDivide тоже экспортируется или доступна
// (Она уже должна быть в calculationUtils, но для чистоты можно вынести)