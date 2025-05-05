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