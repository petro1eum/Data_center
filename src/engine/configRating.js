import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { getEstimatedTokensPerSec } from '../utils/calculationUtils';
import { calcUserLoadMetrics } from '../utils/hardwareRequirements';

const safeDivide = (numerator, denominator) => {
  if (denominator === 0 || !denominator || Number.isNaN(denominator)
    || numerator === null || numerator === undefined || Number.isNaN(numerator)) {
    return 0;
  }
  return numerator / denominator;
};

const formatCurrency = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num));
};

const findCheaperGpus = (currentCost, modelId, precision, limit = 2) => Object.entries(GPU_PRESETS)
  .filter(([gpuKey, gpu]) => {
    const perf = getEstimatedTokensPerSec(modelId, gpuKey, precision);
    return gpu.cost < currentCost && perf?.tps > 0;
  })
  .sort(([, a], [, b]) => a.cost - b.cost)
  .slice(0, limit)
  .map(([, gpu]) => `${gpu.name} (${formatCurrency(gpu.cost)})`)
  .join(' или ');

const findMoreEfficientGpus = (currentPower, modelId, precision, limit = 2) => Object.entries(GPU_PRESETS)
  .filter(([gpuKey, gpu]) => {
    const perf = getEstimatedTokensPerSec(modelId, gpuKey, precision);
    return gpu.power < currentPower && perf?.tps > 0;
  })
  .sort(([, a], [, b]) => a.power - b.power)
  .slice(0, limit)
  .map(([, gpu]) => `${gpu.name} (${gpu.power}кВт)`)
  .join(' или ');

const findGpusWithMoreVram = (currentVram, limit = 2) => Object.entries(GPU_PRESETS)
  .filter(([, gpu]) => gpu.vram > currentVram)
  .sort(([, a], [, b]) => a.vram - b.vram)
  .slice(0, limit)
  .map(([, gpu]) => `${gpu.name} (${gpu.vram}GB)`)
  .join(' или ');

const findServersWithFewerSlots = (currentSlots) => {
  const options = Object.entries(SERVER_PRESETS)
    .filter(([, server]) => server.gpuCount < currentSlots && server.gpuCount > 0)
    .map(([, server]) => `${server.gpuCount} слотов`);
  return [...new Set(options)].join(' или ');
};

/**
 * Рейтинг конфигурации 0–100 с issues[] для UI.
 */
export const calculateConfigurationRating = (
  formData,
  results,
  modelSizeError,
  performanceWarning,
  performanceIsEstimated,
  modelId,
) => {
  let score = 50;
  const issues = [];
  let finalLabel = 'Удовлетворительная';
  let finalDescription = '';
  let hasCriticalIssue = false;
  const performanceUncertain = !!performanceWarning;
  const isEstimatedOnly = !performanceWarning && performanceIsEstimated;

  const TARGET_GPU_UTILIZATION = 0.7;
  const LOW_GPU_UTILIZATION = 0.25;

  if (!results || !formData) {
    return { score: 0, label: 'Ошибка', description: 'Ошибка расчета рейтинга (нет данных).', issues: [] };
  }

  const {
    fiveYearTco = 0,
    totalEffectiveTokensPerSec = 0,
    requiredGpu = 0,
    serversRequired = 0,
    powerConsumptionKw = 0,
  } = results;
  const {
    gpuConfigModel = '',
    gpuConfigCostUsd = 0,
    gpuConfigPowerKw = 0,
    gpuConfigVramGb = 0,
    serverConfigNumGpuPerServer = 0,
    modelParamsNumBillion = 0,
    modelParamsBitsPrecision = 0,
  } = formData;
  const precision = modelParamsBitsPrecision;

  const { totalTokensPerSecRequired } = calcUserLoadMetrics(formData);

  if (modelSizeError) {
    score = 5;
    let recommendation = 'РЕКОМЕНДАЦИЯ: Выберите GPU с большим VRAM';
    const betterGpus = findGpusWithMoreVram(gpuConfigVramGb);
    if (betterGpus) recommendation += ` (например, ${betterGpus})`;
    recommendation += ` или используйте модель/точность с меньшими требованиями. Текущая (${modelParamsNumBillion}B @ ${modelParamsBitsPrecision}bit) требует > ${gpuConfigVramGb}GB.`;
    issues.push({ type: 'critical', text: `**Критично: Модель не помещается в VRAM** GPU (${gpuConfigModel} ${gpuConfigVramGb}GB). ${recommendation}` });
    finalLabel = 'Ошибка VRAM';
    hasCriticalIssue = true;
  } else if (totalEffectiveTokensPerSec <= 0 && fiveYearTco > 0 && !performanceUncertain) {
    score = 10;
    issues.push({ type: 'warning', text: `Нулевая расчетная производительность при ненулевой TCO (${formatCurrency(fiveYearTco)}). РЕКОМЕНДАЦИЯ: Проверьте параметры нагрузки, модель и GPU.` });
    finalLabel = 'Нерабочая';
    hasCriticalIssue = true;
  } else if (totalEffectiveTokensPerSec <= 0 && fiveYearTco <= 0 && !performanceUncertain) {
    score = 20;
    issues.push({ type: 'info', text: 'Нулевая производительность и нулевая TCO. Конфигурация не используется или нагрузка равна нулю.' });
    finalLabel = 'Неактивная';
    hasCriticalIssue = true;
  }

  if (!hasCriticalIssue) {
    const requiredTps = totalTokensPerSecRequired;
    const effectiveTps = totalEffectiveTokensPerSec;
    const workloadTps = requiredTps > 0 ? requiredTps : effectiveTps;

    if (requiredTps > 0) {
      const capacityRatio = safeDivide(effectiveTps, requiredTps);
      if (capacityRatio < 0.9) {
        score -= 35;
        issues.push({
          type: 'warning',
          text: `**Недостаточная производительность** (${Math.round(effectiveTps)} vs ${Math.round(requiredTps)} Токен/с). РЕКОМЕНДАЦИЯ: Добавьте GPU или выберите более быстрый.`,
        });
      } else if (capacityRatio < 1.0) {
        score -= 12;
        issues.push({
          type: 'warning',
          text: `Производительность на грани (${Math.round(effectiveTps)} vs ${Math.round(requiredTps)} Токен/с). Рекомендуется небольшой запас.`,
        });
      } else if (capacityRatio <= 1.25) {
        score += 15;
      } else if (capacityRatio <= 2.0) {
        score += 8;
      } else if (capacityRatio <= 4.0) {
        issues.push({
          type: 'recommendation',
          text: `Запас производительности ${capacityRatio.toFixed(1)}× — конфигурация избыточна для текущей нагрузки.`,
        });
      } else {
        score -= 12;
        issues.push({
          type: 'warning',
          text: `**Сильный переразмер** (${capacityRatio.toFixed(1)}× запас). РЕКОМЕНДАЦИЯ: Уменьшите число GPU или выберите более дешёвое железо.`,
        });
      }
    }

    if (!performanceUncertain && fiveYearTco > 0 && workloadTps > 0) {
      const tcoPerTps = fiveYearTco / workloadTps;
      const tcoPerTpsK = Math.round(tcoPerTps / 1000);
      if (tcoPerTps < 35_000) {
        score += 12;
      } else if (tcoPerTps < 55_000) {
        score += 6;
      } else if (tcoPerTps < 85_000) {
        // типичный on-prem диапазон
      } else if (tcoPerTps < 120_000) {
        score -= 8;
        const cheaperGpus = findCheaperGpus(gpuConfigCostUsd, modelId, precision);
        let recommendation = 'Рассмотрите более экономичные GPU/серверы.';
        if (cheaperGpus) recommendation += ` Например: ${cheaperGpus}.`;
        issues.push({
          type: 'recommendation',
          text: `Повышенная стоимость на Токен/с (~$${tcoPerTpsK}k за 5 лет на 1 Токен/с). ${recommendation}`,
        });
      } else {
        score -= 18;
        const cheaperGpus = findCheaperGpus(gpuConfigCostUsd, modelId, precision);
        let recommendation = 'РЕКОМЕНДАЦИЯ: Значительно более дешёвая конфигурация возможна.';
        if (cheaperGpus) recommendation += ` Например, GPU ${cheaperGpus}.`;
        issues.push({
          type: 'warning',
          text: `**Высокая стоимость на Токен/с** (~$${tcoPerTpsK}k / Токен/с за 5 лет). ${recommendation}`,
        });
      }
    } else if (fiveYearTco <= 0 && effectiveTps > 0 && !performanceUncertain) {
      score += 15;
      issues.push({ type: 'info', text: 'Нулевая TCO при наличии производительности.' });
    }

    if (serversRequired > 0 && serverConfigNumGpuPerServer > 0 && requiredGpu > 0) {
      const provisionedGpu = serversRequired * serverConfigNumGpuPerServer;
      const slotFill = safeDivide(requiredGpu, provisionedGpu);
      const capacityRatio = requiredTps > 0 ? safeDivide(effectiveTps, requiredTps) : 1;
      const fewerSlots = findServersWithFewerSlots(serverConfigNumGpuPerServer);

      if (slotFill < LOW_GPU_UTILIZATION && capacityRatio > 2.5) {
        score -= 10;
        let recommendation = 'Рассмотрите сервер с меньшим числом слотов.';
        if (fewerSlots) recommendation += ` Доступно: ${fewerSlots}.`;
        issues.push({
          type: 'warning',
          text: `**Низкая утилизация слотов GPU** (${Math.round(slotFill * 100)}% при ${capacityRatio.toFixed(1)}× запасе). ${recommendation}`,
        });
      } else if (slotFill < TARGET_GPU_UTILIZATION && capacityRatio > 4) {
        score -= 5;
        issues.push({
          type: 'recommendation',
          text: `Неоптимальное заполнение сервера (${Math.round(slotFill * 100)}% слотов). Цель > ${TARGET_GPU_UTILIZATION * 100}%.`,
        });
      } else if (slotFill >= TARGET_GPU_UTILIZATION) {
        score += 4;
      }
    }

    if (!performanceUncertain && powerConsumptionKw > 0 && workloadTps > 0) {
      const wattsPerTps = safeDivide(powerConsumptionKw * 1000, workloadTps);
      const moreEfficient = findMoreEfficientGpus(gpuConfigPowerKw, modelId, precision);
      if (wattsPerTps > 5.0) {
        score -= 12;
        let recommendation = 'Рассмотрите более энергоэффективные GPU.';
        if (moreEfficient) recommendation += ` Например: ${moreEfficient}.`;
        issues.push({
          type: 'warning',
          text: `**Высокое энергопотребление** (${wattsPerTps.toFixed(2)} Вт/(Токен/с)). ${recommendation}`,
        });
      } else if (wattsPerTps > 3.0) {
        score -= 5;
        issues.push({
          type: 'recommendation',
          text: `Повышенное энергопотребление (${wattsPerTps.toFixed(2)} Вт/(Токен/с)).`,
        });
      } else if (wattsPerTps <= 1.5) {
        score += 6;
      } else if (wattsPerTps <= 2.0) {
        score += 3;
      }
    } else if (powerConsumptionKw > 0 && effectiveTps <= 0 && !performanceUncertain) {
      score -= 15;
      issues.push({ type: 'warning', text: 'Энергопотребление без подтвержденной производительности.' });
    }
  }

  if (performanceUncertain) {
    if (!hasCriticalIssue && score >= 60) finalLabel = 'Требует уточнения';
    issues.push({ type: 'warning', text: `(${performanceWarning}) Оценка TCO и энергоэффективности может быть неточной.` });
    if (issues.length > 1) score -= 5;
  } else if (isEstimatedOnly) {
    finalLabel += ' (оценка)';
    issues.push({ type: 'info', text: '(Производительность GPU оценена приблизительно, реальные значения могут отличаться.)' });
    score -= 1;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (!hasCriticalIssue) {
    if (score >= 85) finalLabel = 'Отличная';
    else if (score >= 65) finalLabel = 'Хорошая';
    else if (score >= 40) finalLabel = 'Компромиссная';
    else finalLabel = 'Неэффективная';
  }

  if (isEstimatedOnly && !hasCriticalIssue) finalLabel += ' (оценка)';

  if (issues.length > 0) {
    const typeOrder = { critical: 0, warning: 1, info: 2, recommendation: 3 };
    issues.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));
    finalDescription = issues.map((i) => `- ${i.text}`).join('\n');
  } else if (score >= 85) {
    finalDescription = 'Отличная конфигурация: высокая производительность и хорошая эффективность затрат.';
  } else if (score >= 65) {
    finalDescription = 'Хороший баланс производительности, стоимости и эффективности.';
  } else {
    finalDescription = 'Конфигурация рабочая, но есть возможности для оптимизации.';
  }

  return {
    score: Number.isNaN(score) ? 0 : score,
    label: finalLabel,
    description: finalDescription,
    issues,
  };
};
