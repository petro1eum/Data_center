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
  calcRamRequirements,
  getEstimatedTokensPerSec
} from '../utils/calculationUtils';
import { checkModelFitsGpu, checkConfigurationWarnings } from '../utils/validationUtils';

// Вспомогательная функция для безопасного деления
const safeDivide = (numerator, denominator) => {
    if (denominator === 0 || !denominator || isNaN(denominator) || numerator === null || numerator === undefined || isNaN(numerator)) return 0;
    return numerator / denominator;
};

// Вспомогательная функция форматирования валюты (вынесена наружу для инициализации)
const formatCurrency = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    const formatter = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        maximumFractionDigits: 0,
        minimumFractionDigits: 0, 
    });
    return formatter.format(Math.round(num)); 
};

// --- Вспомогательные функции для поиска альтернатив ---
const findCheaperGpus = (currentCost, modelId, precision, limit = 2) => {
    return Object.entries(GPU_PRESETS)
        .filter(([gpuKey, gpu]) => {
            const perf = getEstimatedTokensPerSec(modelId, gpuKey, precision);
            return gpu.cost < currentCost && perf && perf > 0;
        })
        .sort(([, a], [, b]) => a.cost - b.cost)
        .slice(0, limit)
        .map(([key, gpu]) => `${gpu.name} (${formatCurrency(gpu.cost)})`)
        .join(' или ');
};

const findMoreEfficientGpus = (currentPower, modelId, precision, limit = 2) => {
    return Object.entries(GPU_PRESETS)
        .filter(([gpuKey, gpu]) => {
            const perf = getEstimatedTokensPerSec(modelId, gpuKey, precision);
            return gpu.power < currentPower && perf && perf > 0;
        })
        .sort(([, a], [, b]) => a.power - b.power)
        .slice(0, limit)
        .map(([key, gpu]) => `${gpu.name} (${gpu.power}кВт)`)
        .join(' или ');
};

const findGpusWithMoreVram = (currentVram, modelId, precision, limit = 2) => {
    return Object.entries(GPU_PRESETS)
        .filter(([gpuKey, gpu]) => {
            return gpu.vram > currentVram;
        })
        .sort(([, a], [, b]) => a.vram - b.vram)
        .slice(0, limit)
        .map(([key, gpu]) => `${gpu.name} (${gpu.vram}GB)`)
        .join(' или ');
};

const findServersWithFewerSlots = (currentSlots) => {
     const options = Object.entries(SERVER_PRESETS)
        .filter(([_, server]) => server.gpuCount < currentSlots && server.gpuCount > 0)
        .map(([key, server]) => `${server.gpuCount} слотов`);
    return [...new Set(options)].join(' или '); // Уникальные значения
};

// --- Определяем рекомендуемые ключи ВНЕ хука --- 
const recKeys = {
    model: 'qwen3-8b',
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
 * Расчет рейтинга конфигурации (v1.5 - Ребалансировка весов и конкретные рекомендации)
 * @param {string} modelId - ID текущей модели (для поиска альтернатив)
 * @returns {Object} - Рейтинг { score: number, label: string, description: string }
 */
const calculateConfigurationRating = (
    formData,
    results,
    modelSizeError,
    performanceWarning,
    performanceIsEstimated,
    modelId
) => {
    let score = 50; // Стартовый балл
    let issues = []; // Список проблем и рекомендаций
    let finalLabel = "Удовлетворительная"; // Метка по умолчанию
    let finalDescription = "";
    let hasCriticalIssue = false;
    let performanceUncertain = !!performanceWarning;
    let isEstimatedOnly = !performanceWarning && performanceIsEstimated;

    // Целевые показатели (примерные)
    const TARGET_TCO_PER_TOKEN = 5e-9; // 5 н$/токен
    const HIGH_TCO_PER_TOKEN = 5e-8;   // 50 н$/токен
    const TARGET_POWER_PER_TOKEN = 0.5; // 0.5 Вт / (Токен/с)
    const HIGH_POWER_PER_TOKEN = 1.0;  // 1.0 Вт / (Токен/с)
    const TARGET_GPU_UTILIZATION = 0.7; // 70%
    const LOW_GPU_UTILIZATION = 0.4;    // 40%
    const EXCESSIVE_TCO_FACTOR = 5;     // TCO считается чрезмерной, если в EXCESSIVE_TCO_FACTOR раз выше "разумной" оценки

    if (!results || !formData) {
        return { score: 0, label: 'Ошибка', description: 'Ошибка расчета рейтинга (нет данных).' };
    }

    // Деструктуризация
    const { 
        fiveYearTco = 0, 
        totalEffectiveTokensPerSec = 0,
        requiredGpu = 0,
        serversRequired = 0,
        powerConsumptionKw = 0
    } = results;
    const { 
        gpuConfigModel = "", 
        gpuConfigCostUsd = 0,
        gpuConfigPowerKw = 0,
        gpuConfigVramGb = 0, 
        serverConfigNumGpuPerServer = 0,
        modelParamsNumBillion = 0,
        modelParamsBitsPrecision = 0,
        userLoadConcurrentUsers = 0,
        userLoadResponseTimeSec = 1,
        isAgentModeEnabled = false,
        agentRequestPercentage = 0,
        userLoadTokensPerRequest = 0,
        avgAgentsPerTask = 0,
        avgLlmCallsPerAgent = 0,
        avgAgentLlmTokens = 0
     } = formData;
     const precision = modelParamsBitsPrecision;

    // Расчет требуемой производительности (для оценки масштаба TCO)
    const U = userLoadConcurrentUsers;
    const R = userLoadResponseTimeSec <= 0 ? 1 : userLoadResponseTimeSec;
    const P_agent = isAgentModeEnabled ? (agentRequestPercentage || 0) / 100 : 0;
    const T_simple = userLoadTokensPerRequest;
    let totalTokensPerSecRequired = 0;
    let totalLlmCallsPerSecond = 0;
    let totalToolCallsPerSecond = 0;
    let annualExternalToolCost = 0;
    if (isAgentModeEnabled && P_agent > 0) {
        const T_agent_internal = avgAgentsPerTask * avgLlmCallsPerAgent * avgAgentLlmTokens;
        const T_agent_final = T_simple;
        const T_agent_effective = T_agent_internal + T_agent_final;
        const Calls_LLM_agent = avgAgentsPerTask * avgLlmCallsPerAgent + 1;
        const Calls_Tool_agent = avgAgentsPerTask * avgToolCallsPerAgent;
        const tokensAgentUsers = safeDivide(U * P_agent * T_agent_effective, R);
        const llmCallsAgentUsers = safeDivide(U * P_agent * Calls_LLM_agent, R);
        const toolCallsAgentUsers = safeDivide(U * P_agent * Calls_Tool_agent, R);
        totalToolCallsPerSecond += toolCallsAgentUsers;
        annualExternalToolCost += toolCallsAgentUsers * avgExternalToolCost * 3600 * 24 * 365;
        totalTokensPerSecRequired += tokensAgentUsers;
        totalLlmCallsPerSecond += llmCallsAgentUsers;
    }
    const tokensSimpleUsers = safeDivide(U * (1 - P_agent) * T_simple, R);
    const llmCallsSimpleUsers = safeDivide(U * (1 - P_agent), R);
    totalTokensPerSecRequired += tokensSimpleUsers;
    totalLlmCallsPerSecond += llmCallsSimpleUsers;
    
    const numGpu = Math.ceil(safeDivide(totalTokensPerSecRequired, totalEffectiveTokensPerSec));

    // --- 1. Проверка КРИТИЧЕСКИХ проблем --- 
    if (modelSizeError) {
        score = 5;
        let recommendation = `РЕКОМЕНДАЦИЯ: Выберите GPU с большим VRAM`;
        const betterGpus = findGpusWithMoreVram(gpuConfigVramGb, modelId, precision);
        if (betterGpus) {
            recommendation += ` (например, ${betterGpus})`;
        }
        recommendation += ` или используйте модель/точность с меньшими требованиями. Текущая (${modelParamsNumBillion}B @ ${modelParamsBitsPrecision}bit) требует > ${gpuConfigVramGb}GB.`;
        issues.push({ type: 'critical', text: `**Критично: Модель не помещается в VRAM** GPU (${gpuConfigModel} ${gpuConfigVramGb}GB). ${recommendation}` });
        finalLabel = "Ошибка VRAM";
        hasCriticalIssue = true;
    } else if (totalEffectiveTokensPerSec <= 0 && fiveYearTco > 0 && !performanceUncertain) {
        score = 10; 
        issues.push({ type: 'warning', text: `Нулевая расчетная производительность при ненулевой TCO (${formatCurrency(fiveYearTco)}). РЕКОМЕНДАЦИЯ: Проверьте параметры нагрузки, модель и GPU.` });
        finalLabel = "Нерабочая";
        hasCriticalIssue = true;
    } else if (totalEffectiveTokensPerSec <= 0 && fiveYearTco <= 0 && !performanceUncertain) {
        score = 20; 
        issues.push({ type: 'info', text: "Нулевая производительность и нулевая TCO. Конфигурация не используется или нагрузка равна нулю." });
        finalLabel = "Неактивная";
        hasCriticalIssue = true;
    }

    // --- 2. Оценка НЕКРИТИЧЕСКИХ аспектов (если нет критических проблем) --- 
    if (!hasCriticalIssue) {
        // 2.0 Проверка на чрезмерную абсолютную TCO
        // Оценим "разумную" TCO: $100k на каждые 10k требуемых токен/с (очень грубо)
        const reasonableTcoEstimate = Math.max(10000, (totalTokensPerSecRequired / 10000) * 100000);
        if (totalTokensPerSecRequired > 0 && fiveYearTco > reasonableTcoEstimate * EXCESSIVE_TCO_FACTOR) {
            score -= 35;
            const cheaperGpus = findCheaperGpus(gpuConfigCostUsd, modelId, precision);
            let recommendation = `РЕКОМЕНДАЦИЯ: Рассмотрите значительно менее дорогую конфигурацию.`;
            if (cheaperGpus) {
                recommendation += ` Например, GPU ${cheaperGpus} (но проверьте производительность и VRAM).`;
            }
            issues.push({ type: 'warning', text: `**Несоразмерно высокая TCO** (${formatCurrency(fiveYearTco)}) для требуемой производительности (~${totalTokensPerSecRequired.toFixed(0)} Токен/с). Ожидаемый порядок TCO ~${formatCurrency(reasonableTcoEstimate)}. ${recommendation}` });
        } else if (totalTokensPerSecRequired > 0 && fiveYearTco > reasonableTcoEstimate * (EXCESSIVE_TCO_FACTOR / 2)) {
            score -= 15;
            issues.push({ type: 'warning', text: `Высокая абсолютная TCO (${formatCurrency(fiveYearTco)}) для требуемой производительности (~${totalTokensPerSecRequired.toFixed(0)} Токен/с). Возможно, есть более дешевые варианты GPU/серверов.` });
        }

        // 2.1 Эффективность TCO (Только если производительность ИЗВЕСТНА)
        if (!performanceUncertain && fiveYearTco > 0 && totalEffectiveTokensPerSec > 0) {
            const secondsIn5Years = 5 * 365 * 24 * 3600;
            const totalTokensIn5Years = totalEffectiveTokensPerSec * secondsIn5Years;
            const tcoPerToken = safeDivide(fiveYearTco, totalTokensIn5Years);
            if (tcoPerToken > 0) {
                const tcoPerTokenNano = tcoPerToken * 1e9;
                if (tcoPerToken < TARGET_TCO_PER_TOKEN / 2) score += 15; // Отлично
                else if (tcoPerToken < TARGET_TCO_PER_TOKEN) score += 7;  // Хорошо
                else if (tcoPerToken > HIGH_TCO_PER_TOKEN) {
                    score -= 25;
                    const cheaperGpus = findCheaperGpus(gpuConfigCostUsd, modelId, precision);
                    let recommendation = `РЕКОМЕНДАЦИЯ: Рассмотрите более экономичные GPU/модели (цель < ${TARGET_TCO_PER_TOKEN * 1e9} н$/токен).`;
                    if (cheaperGpus) {
                        recommendation += ` Например, ${cheaperGpus} (оцените производительность).`;
                    }
                    issues.push({ type: 'warning', text: `**Очень высокая стоимость TCO/токен** (${tcoPerTokenNano.toFixed(2)} н$/токен). ${recommendation}` });
                } else if (tcoPerToken > TARGET_TCO_PER_TOKEN * 2) {
                    score -= 12;
                    const cheaperGpus = findCheaperGpus(gpuConfigCostUsd, modelId, precision);
                    let recommendation = `(цель < ${TARGET_TCO_PER_TOKEN * 1e9} н$/токен).`;
                    if (cheaperGpus) {
                        recommendation += ` Возможно, подойдут ${cheaperGpus}?`;
                    }
                    issues.push({ type: 'recommendation', text: `Повышенная стоимость TCO/токен (${tcoPerTokenNano.toFixed(2)} н$/токен). ${recommendation}` });
                }
            } else {
                issues.push({ type: 'info', text: "Не удалось рассчитать TCO на токен." });
            }
        } else if (fiveYearTco <= 0 && totalEffectiveTokensPerSec > 0 && !performanceUncertain) {
            // Если производительность есть, а TCO нет - это супер!
            score += 30;
            issues.push({ type: 'info', text: "Нулевая TCO при наличии производительности. Очень экономично." });
        }

        // 2.2 Низкая утилизация GPU
        if (serversRequired > 0 && serverConfigNumGpuPerServer > 0 && requiredGpu > 0) {
            const avgGpuPerServer = safeDivide(requiredGpu, serversRequired);
            const utilization = safeDivide(avgGpuPerServer, serverConfigNumGpuPerServer);
            if (utilization < LOW_GPU_UTILIZATION) { 
                score -= 15; 
                const fewerSlotsServers = findServersWithFewerSlots(serverConfigNumGpuPerServer);
                let recommendation = `РЕКОМЕНДАЦИЯ: Увеличьте нагрузку или используйте серверы с меньшим числом GPU (цель > ${TARGET_GPU_UTILIZATION*100}%).`;
                if (fewerSlotsServers) {
                    recommendation += ` Доступны конфигурации на ${fewerSlotsServers} (проверьте общую производительность).`;
                }
                issues.push({ type: 'warning', text: `**Очень низкая утилизация GPU** (${Math.round(utilization * 100)}%). ${recommendation}` });
            } else if (utilization < TARGET_GPU_UTILIZATION) {
                score -= 7;
                issues.push({ type: 'warning', text: `Неоптимальная утилизация GPU (${Math.round(utilization * 100)}%). Цель > ${TARGET_GPU_UTILIZATION*100}%.` });
            } else {
                score += 5; // Небольшой бонус за хорошую утилизацию
            }
        }

        // 2.3 Энергоэффективность (Только если производительность ИЗВЕСТНА)
        if (!performanceUncertain && powerConsumptionKw > 0 && totalEffectiveTokensPerSec > 0) {
            const wattPerTokenPerSec = safeDivide(powerConsumptionKw * 1000, totalEffectiveTokensPerSec);
            if (wattPerTokenPerSec > HIGH_POWER_PER_TOKEN) {
                 score -= 15; 
                 const efficientGpus = findMoreEfficientGpus(gpuConfigPowerKw, modelId, precision);
                 let recommendation = `РЕКОМЕНДАЦИЯ: Рассмотрите более энергоэффективные GPU (цель < ${TARGET_POWER_PER_TOKEN} Вт/(Токен/с)).`;
                 if (efficientGpus) {
                     recommendation += ` Например, ${efficientGpus} (оцените их стоимость и производительность).`;
                 }
                 issues.push({ type: 'warning', text: `**Очень высокое энергопотребление/производительность** (${wattPerTokenPerSec.toFixed(2)} Вт/(Токен/с)). ${recommendation}` });
            } else if (wattPerTokenPerSec > TARGET_POWER_PER_TOKEN) {
                 score -= 7; 
                 issues.push({ type: 'warning', text: `Повышенное энергопотребление/производительность (${wattPerTokenPerSec.toFixed(2)} Вт/(Токен/с)). Цель < ${TARGET_POWER_PER_TOKEN} Вт/(Токен/с).` });
            } else {
                score += 5; // Небольшой бонус за энергоэффективность
            }
        } else if (powerConsumptionKw > 0 && totalEffectiveTokensPerSec <= 0 && !performanceUncertain) { 
            // Потребление есть, производительности нет
            score -= 15;
            issues.push({ type: 'warning', text: "Энергопотребление без подтвержденной производительности." });
        }
    }

    // --- 3. Обработка НЕОПРЕДЕЛЕННОСТИ производительности --- 
    if (performanceUncertain) {
        // Уменьшаем влияние неопределенности на оценку, но указываем на нее
        // Не будем сильно снижать балл, если других проблем нет
        if (!hasCriticalIssue && score >= 60) {
             finalLabel = "Требует уточнения"; // Меняем метку, если оценка была хорошей
        }
        issues.push({ type: 'warning', text: `(${performanceWarning}) Оценка TCO и энергоэффективности может быть неточной.` });
        // Можно добавить небольшой штраф, если были и другие проблемы
        if (issues.length > 1) { 
            score -= 5;
        }
    } else if (isEstimatedOnly) {
        finalLabel += " (оценка)";
        issues.push({ type: 'info', text: "(Производительность GPU оценена приблизительно, реальные значения могут отличаться.)" });
        score -= 2;
    }

    // --- 4. Финальная корректировка и определение метки/описания --- 
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Переопределяем метку на основе итогового балла, ЕСЛИ она не была установлена в критическую ошибку
    if (!hasCriticalIssue) { 
        if (score >= 85) finalLabel = "Отличная";        // Повышены пороги
        else if (score >= 65) finalLabel = "Хорошая";         // Повышены пороги
        else if (score >= 40) finalLabel = "Компромиссная";   // Раньше было Удовлетворительная
        else finalLabel = "Неэффективная"; // Сюда попадут низкие баллы, включая 0
    }

    // Добавляем флаг оценки к ЛЮБОЙ метке, если применимо
    if (isEstimatedOnly && !hasCriticalIssue) { // Не добавляем к критическим ошибкам
        finalLabel += " (оценка)";
    }

    // Формируем описание
    if (issues.length > 0) {
        // Сортируем проблемы: критические -> неэффективность -> остальные
        const typeOrder = { critical: 0, warning: 1, info: 2, recommendation: 3 };
        issues.sort((a, b) => {
            // Убедимся, что у нас есть text свойство
            const typeA = a && typeof a === 'object' ? a.type : 'unknown'; 
            const typeB = b && typeof b === 'object' ? b.type : 'unknown'; 
            return (typeOrder[typeA] ?? 99) - (typeOrder[typeB] ?? 99);
        });
        finalDescription = issues
            .map(issue => (issue && typeof issue === 'object' && issue.text) ? `- ${issue.text}` : '- (Некорректная запись об ошибке)')
            .join('\n');
    } else {
        // Описания по умолчанию для хороших оценок
        if (score >= 85) finalDescription = "Отличная конфигурация: высокая производительность и хорошая эффективность затрат.";
        else if (score >= 65) finalDescription = "Хороший баланс производительности, стоимости и эффективности.";
        else finalDescription = "Конфигурация рабочая, но есть возможности для оптимизации.";
    }

    const finalScore = isNaN(score) ? 0 : score;

    return { 
        score: finalScore,
        label: finalLabel, 
        description: finalDescription 
    };
};

// --- Основная ЧИСТАЯ функция расчета --- 
// Принимает все необходимые данные и возвращает полный объект результатов
const performFullCalculation = (configData) => {
    const {
        modelId,
        gpuId,
        serverId,
        networkId,
        storageId,
        ramId,
        softwareId,
        modelParamsNumBillion,
        modelParamsBitsPrecision,
        userLoadConcurrentUsers,
        userLoadTokensPerRequest,
        userLoadResponseTimeSec,
        gpuConfigCostUsd,
        gpuConfigPowerKw,
        gpuConfigVramGb,
        serverConfigNumGpuPerServer,
        serverConfigCostUsd,
        serverConfigPowerOverheadKw,
        networkCostPerPort,
        storageCostPerGB,
        ramCostPerGB,
        annualSoftwareCostPerServer,
        dcCostsElectricityCostUsdPerKwh,
        dcCostsPue,
        dcCostsAnnualMaintenanceRate,
        batchingOptimizationFactor,
        isAgentModeEnabled,
        avgAgentsPerTask,
        avgLlmCallsPerAgent,
        avgToolCallsPerAgent,
        avgAgentLlmTokens,
        avgExternalToolCost,
        agentRequestPercentage
    } = configData;

    const MAX_REASONABLE_GPU = 1_000_000; // Максимальное разумное количество GPU
    const precision = parseInt(modelParamsBitsPrecision, 10);

    const perfResult = getEstimatedTokensPerSec(modelId, gpuId, precision);
    const estimatedTokensPerSecPerGpuBase = perfResult.tps;
    let performanceIsEstimated = perfResult.estimated;
    let performanceWarning = null;

    if (estimatedTokensPerSecPerGpuBase === null) {
        performanceWarning = `Не удалось оценить производительность для ${MODEL_PRESETS[modelId]?.name} на ${GPU_PRESETS[gpuId]?.name} @ ${precision}-бит.`;
        // Возвращаем ранний результат с ошибкой, чтобы поиск мог это отфильтровать
        return {
             requiredGpu: Infinity, // Индикатор проблемы
             serversRequired: 0,
             capexUsd: 0,
             annualOpexUsd: 0,
             powerConsumptionKw: 0,
             annualEnergyKwh: 0,
             energyCostAnnual: 0,
             maintenanceCostAnnual: 0,
             fiveYearTco: 0,
             totalGpuCost: 0,
             totalServerCost: 0,
             storageRequirementsGB: 0,
             storageCostUsd: 0,
             networkType: NETWORK_PRESETS[networkId]?.type || "",
             networkCost: 0,
             ramRequirementPerServerGB: 0,
             totalRamCost: 0,
             annualExternalToolCost: 0,
             totalLlmCallsPerSecond: 0,
             totalToolCallsPerSecond: 0,
             annualSoftwareCost: 0,
             estimatedTokensPerSecPerGpu: null,
             totalEffectiveTokensPerSec: 0,
             configRating: calculateConfigurationRating(configData, null, null, performanceWarning, performanceIsEstimated, modelId),
             modelSizeError: null,
             performanceWarning: performanceWarning,
             performanceIsEstimated: performanceIsEstimated
        };
    }

    const effectiveTokensPerSecPerGpu = estimatedTokensPerSecPerGpuBase * batchingOptimizationFactor;
    const U = userLoadConcurrentUsers;
    const R = userLoadResponseTimeSec;
    const P_agent = isAgentModeEnabled ? (agentRequestPercentage || 0) / 100 : 0;
    const T_simple = userLoadTokensPerRequest;
    let totalTokensPerSecRequired = 0;
    let totalLlmCallsPerSecond = 0;
    let totalToolCallsPerSecond = 0;
    let annualExternalToolCost = 0;
    if (isAgentModeEnabled && P_agent > 0) {
        const T_agent_internal = avgAgentsPerTask * avgLlmCallsPerAgent * avgAgentLlmTokens;
        const T_agent_final = T_simple;
        const T_agent_effective = T_agent_internal + T_agent_final;
        const Calls_LLM_agent = avgAgentsPerTask * avgLlmCallsPerAgent + 1;
        const Calls_Tool_agent = avgAgentsPerTask * avgToolCallsPerAgent;
        const tokensAgentUsers = safeDivide(U * P_agent * T_agent_effective, R);
        const llmCallsAgentUsers = safeDivide(U * P_agent * Calls_LLM_agent, R);
        const toolCallsAgentUsers = safeDivide(U * P_agent * Calls_Tool_agent, R);
        totalToolCallsPerSecond += toolCallsAgentUsers;
        annualExternalToolCost += toolCallsAgentUsers * avgExternalToolCost * 3600 * 24 * 365;
        totalTokensPerSecRequired += tokensAgentUsers;
        totalLlmCallsPerSecond += llmCallsAgentUsers;
    }
    const tokensSimpleUsers = safeDivide(U * (1 - P_agent) * T_simple, R);
    const llmCallsSimpleUsers = safeDivide(U * (1 - P_agent), R);
    totalTokensPerSecRequired += tokensSimpleUsers;
    totalLlmCallsPerSecond += llmCallsSimpleUsers;
    
    const numGpu = Math.ceil(safeDivide(totalTokensPerSecRequired, effectiveTokensPerSecPerGpu));

    // --- Проверка на нереалистичное количество GPU --- 
    if (!Number.isFinite(numGpu) || numGpu > MAX_REASONABLE_GPU) {
        const unrealisticGpuValue = Number.isFinite(numGpu) ? `> ${MAX_REASONABLE_GPU}` : 'неопределенно';
        const realisticWarning = `Требуемое количество GPU (${unrealisticGpuValue}) нереалистично.`;
         return {
             requiredGpu: Number.isFinite(numGpu) ? numGpu : Infinity,
             serversRequired: 0,
             capexUsd: 0,
             annualOpexUsd: 0,
             powerConsumptionKw: 0,
             annualEnergyKwh: 0,
             energyCostAnnual: 0,
             maintenanceCostAnnual: 0,
             fiveYearTco: 0,
             totalGpuCost: 0,
             totalServerCost: 0,
             storageRequirementsGB: 0,
             storageCostUsd: 0,
             networkType: NETWORK_PRESETS[networkId]?.type || "",
             networkCost: 0,
             ramRequirementPerServerGB: 0,
             totalRamCost: 0,
             annualExternalToolCost: annualExternalToolCost,
             totalLlmCallsPerSecond: totalLlmCallsPerSecond,
             totalToolCallsPerSecond: totalToolCallsPerSecond,
             annualSoftwareCost: 0,
             estimatedTokensPerSecPerGpu: estimatedTokensPerSecPerGpuBase,
             totalEffectiveTokensPerSec: 0,
             configRating: calculateConfigurationRating(configData, null, null, realisticWarning, performanceIsEstimated, modelId),
             modelSizeError: null,
             performanceWarning: realisticWarning,
             performanceIsEstimated: performanceIsEstimated
        };
    }
    // ---------------------------------------------------- 

    // Используем явные значения из configData для расчетов
    const tempFormDataForCalc = {
        gpuConfigCostUsd, 
        serverConfigNumGpuPerServer, 
        serverConfigCostUsd,
        gpuConfigPowerKw,
        serverConfigPowerOverheadKw,
        dcCostsElectricityCostUsdPerKwh,
        dcCostsPue,
        dcCostsAnnualMaintenanceRate,
        annualSoftwareCostPerServer,
        modelParamsNumBillion,
        modelParamsBitsPrecision,
        storageCostPerGB,
        networkCostPerPort,
        networkType: NETWORK_PRESETS[networkId]?.type || "",
        gpuConfigVramGb,
        ramCostPerGB,
    };

    const capexResult = calcCapex(numGpu, tempFormDataForCalc);
    const serversRequired = capexResult.numServers;
    const opexResult = calcOpex(numGpu, serversRequired, tempFormDataForCalc, annualExternalToolCost);
    const storageResult = calcStorageRequirements(tempFormDataForCalc, serversRequired);
    const networkResult = calcNetworkRequirements(serversRequired, numGpu, tempFormDataForCalc);
    const ramResult = calcRamRequirements(tempFormDataForCalc, serversRequired);
    const totalCapex = (capexResult.totalCost ?? 0) + (networkResult.networkEquipmentCost ?? 0) + (storageResult.storageCostUsd ?? 0) + (ramResult.totalRamCost ?? 0);
    const fiveYearTcoCalc = totalCapex + ((opexResult.totalOpex ?? 0) * 5);
    
    const intermediateResults = {
      requiredGpu: numGpu ?? 0,
      serversRequired: serversRequired ?? 0,
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
      networkType: tempFormDataForCalc.networkType,
      networkCost: networkResult.networkEquipmentCost ?? 0,
      ramRequirementPerServerGB: ramResult.recommendedRamPerServer ?? 0,
      totalRamCost: ramResult.totalRamCost ?? 0,
      annualExternalToolCost: annualExternalToolCost ?? 0,
      totalLlmCallsPerSecond: totalLlmCallsPerSecond ?? 0,
      totalToolCallsPerSecond: totalToolCallsPerSecond ?? 0,
      annualSoftwareCost: opexResult.annualSoftwareCost ?? 0,
      estimatedTokensPerSecPerGpu: estimatedTokensPerSecPerGpuBase, 
      totalEffectiveTokensPerSec: numGpu > 0 ? (effectiveTokensPerSecPerGpu * numGpu) : 0,
    };

    // Проверка VRAM с использованием явных данных
    const modelFitResult = checkModelFitsGpu({ 
        modelParamsNumBillion, 
        modelParamsBitsPrecision, 
        gpuConfigVramGb 
    });
    const currentModelSizeError = modelFitResult.hasError ? modelFitResult.errorMessage : "";

    const rating = calculateConfigurationRating(
        configData, // Передаем полный configData для доступа ко всем полям в рейтинге
        intermediateResults, 
        currentModelSizeError, 
        performanceWarning,
        performanceIsEstimated,
        modelId
    );

    return {
        ...intermediateResults,
        configRating: rating,
        modelSizeError: currentModelSizeError,
        performanceWarning: performanceWarning,
        performanceIsEstimated: performanceIsEstimated
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
         // Остальные пресеты берем из currentConfig
         networkCostPerPort: NETWORK_PRESETS[networkId]?.costPerPort,
         storageCostPerGB: STORAGE_PRESETS[storageId]?.costPerGB,
         ramCostPerGB: RAM_PRESETS[ramId]?.costPerGB,
         annualSoftwareCostPerServer: SOFTWARE_PRESETS[softwareId]?.annualCostPerServer,
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
  const [isFindingConfig, setIsFindingConfig] = useState(false);
  const [cheapestConfigs, setCheapestConfigs] = useState([]); // Может содержать и неоптимальные
  const [findError, setFindError] = useState(null);
  const [findWarning, setFindWarning] = useState(null); // Новое состояние для предупреждения
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
        isAgentModeEnabled: preset.supports_tool_calls ? prev.isAgentModeEnabled : false 
      }));
      setSelectedModelPreset(presetKey);
      setShowModelInfo(true);
    } else {
        setSelectedModelPreset("");
        setShowModelInfo(false);
        setFormData(prev => ({ ...prev, modelParamsNumBillion: 0, isAgentModeEnabled: false }));
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
      }));
      setSelectedServerPreset(presetKey);
    } else {
        setSelectedServerPreset("");
        setFormData(prev => ({ ...prev, serverConfigNumGpuPerServer: 0, serverConfigCostUsd: 0, serverConfigPowerOverheadKw: 0 }));
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
              annualSoftwareCostPerServer: preset.annualCostPerServer,
          }));
          setSelectedSoftwarePreset(presetKey);
      } else {
          setSelectedSoftwarePreset("");
          setFormData(prev => ({ ...prev, annualSoftwareCostPerServer: 0 }));
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
    const stringFields = ['gpuConfigModel', 'networkType', 'storageType', 'ramType'];
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
  const validateForm = () => {
      setConfigWarnings(checkConfigurationWarnings(formData, results));
  };

  // --- useEffect для запуска расчетов ---
  useEffect(() => {
    calculateResults();
    validateForm();    
  }, [formData]);

  // --- Функция поиска самой дешевой конфигурации ---
  const findCheapestHardwareConfig = async () => {
    setIsFindingConfig(true);
    setCheapestConfigs([]);
    let checkedConfigsCount = 0; // Счетчик проверенных комбинаций
    setFindError(null);
    setFindWarning(null); // Сбрасываем предупреждение
    console.log("Starting hardware search (incl. precisions)...");

    const currentConfig = {
        ...formData,
        modelId: selectedModelPreset,
        // Используем текущие выбранные ID для остальных пресетов как базу
        networkId: selectedNetworkPreset,
        storageId: selectedStoragePreset,
        ramId: selectedRamPreset,
        softwareId: selectedSoftwarePreset,
    };
    const allResults = [];

    try {
        const precisionsToTry = [16, 8, 4]; // Пробуем разные точности

        for (const gpuKey in GPU_PRESETS) {
            const gpuPreset = GPU_PRESETS[gpuKey];
            for (const precision of precisionsToTry) {
                console.log(`Checking GPU: ${gpuKey} (${gpuPreset.name}) @ ${precision}-bit`);

                // 1. Проверка VRAM для текущей точности
                const vramCheck = checkModelFitsGpu({
                    modelParamsNumBillion: currentConfig.modelParamsNumBillion,
                    modelParamsBitsPrecision: precision,
                    gpuConfigVramGb: gpuPreset.vram
                });
                if (vramCheck.hasError) {
                    console.log(`--> Skipping GPU ${gpuKey} @ ${precision}-bit: VRAM error`);
                    continue; // Пропускаем эту точность для данного GPU
                }

                // 2. Проверка производительности для текущей точности
                const perfCheck = getEstimatedTokensPerSec(currentConfig.modelId, gpuKey, precision);
                if (perfCheck.tps === null) {
                    console.log(`--> Skipping GPU ${gpuKey} @ ${precision}-bit: No performance data`);
                    continue; // Пропускаем эту точность для данного GPU
                }

                // Если VRAM и Perf OK, перебираем серверы
                for (const serverKey in SERVER_PRESETS) {
                    const serverPreset = SERVER_PRESETS[serverKey];
                    checkedConfigsCount++;

                    const tempConfigData = {
                        ...currentConfig,
                        gpuId: gpuKey,
                        serverId: serverKey,
                        modelParamsBitsPrecision: precision, // Используем текущую точность
                        // Передаем явные значения для выбранной тройки GPU+Server+Precision
                        gpuConfigModel: gpuPreset.name,
                        gpuConfigCostUsd: gpuPreset.cost,
                        gpuConfigPowerKw: gpuPreset.power,
                        gpuConfigVramGb: gpuPreset.vram,
                        serverConfigNumGpuPerServer: serverPreset.gpuCount,
                        serverConfigCostUsd: serverPreset.cost,
                        serverConfigPowerOverheadKw: serverPreset.power,
                        // Остальные пресеты берем из currentConfig
                        networkCostPerPort: NETWORK_PRESETS[currentConfig.networkId]?.costPerPort,
                        storageCostPerGB: STORAGE_PRESETS[currentConfig.storageId]?.costPerGB,
                        ramCostPerGB: RAM_PRESETS[currentConfig.ramId]?.costPerGB,
                        annualSoftwareCostPerServer: SOFTWARE_PRESETS[currentConfig.softwareId]?.annualCostPerServer,
                    };

                    const calculationResult = performFullCalculation(tempConfigData);

                    // Сохраняем результат, если расчет успешен
                    if (calculationResult && calculationResult.fiveYearTco > 0 && !isNaN(calculationResult.fiveYearTco)) {
                        allResults.push({
                            gpuKey,
                            serverKey,
                            precision: precision, // Сохраняем точность
                            gpuName: gpuPreset.name,
                            serverName: serverPreset.name,
                            fiveYearTco: calculationResult.fiveYearTco,
                            requiredGpu: calculationResult.requiredGpu,
                            serversRequired: calculationResult.serversRequired,
                            totalEffectiveTokensPerSec: calculationResult.totalEffectiveTokensPerSec,
                            ratingLabel: calculationResult.configRating?.label || 'N/A',
                            ratingScore: calculationResult.configRating?.score || 0,
                        });
                    }
                    
                    // Периодически выводим прогресс
                    if(checkedConfigsCount % 20 === 0) { // Реже выводим лог
                       console.log(`...checked ${checkedConfigsCount} total configs... found ${allResults.length} potential results...`);
                    }

                    // Небольшая задержка для отзывчивости UI
                    await new Promise(resolve => setTimeout(resolve, 0)); 
                } // end server loop
            } // end precision loop
            console.log(`Finished checks for GPU ${gpuKey}. Total potential results: ${allResults.length}`);
        } // end gpu loop

        console.log(`Checked ${checkedConfigsCount} total configurations.`);
        console.log(`Filtering ${allResults.length} potential results...`);

        // Фильтрация плохих рейтингов (критические ошибки)
        const criticalLabels = ["Ошибка VRAM", "Нерабочая", "Нереалистично"];
        const potentiallyValidResults = allResults.filter(r => !criticalLabels.includes(r.ratingLabel));

        // Проверяем, есть ли конфигурации с приемлемым рейтингом
        const MIN_ACCEPTABLE_SCORE = 40; // Порог для "Компромиссная"
        const acceptableResults = potentiallyValidResults.filter(r => r.ratingScore >= MIN_ACCEPTABLE_SCORE);

        console.log(`Found ${potentiallyValidResults.length} configurations without critical errors (Rating >= 0).`);
        console.log(`Found ${acceptableResults.length} configurations with acceptable score (>= ${MIN_ACCEPTABLE_SCORE}).`);

        if (potentiallyValidResults.length === 0) {
            // Ни одной рабочей конфигурации не найдено
            let errorMsg = "Не найдено ни одной конфигурации с приемлемым рейтингом (>= 40/100). ";
            setFindError("Не найдено ни одной рабочей конфигурации для заданных параметров. Попробуйте изменить модель, точность или параметры нагрузки.");
            setCheapestConfigs([]); // Убедимся, что список пуст
        } else {
             // Есть рабочие конфигурации, сортируем их по TCO
             potentiallyValidResults.sort((a, b) => a.fiveYearTco - b.fiveYearTco);

             // Показываем топ-3 из рабочих, даже если они неэффективные
             setCheapestConfigs(potentiallyValidResults.slice(0, 3));

             // Если среди них нет приемлемых, устанавливаем предупреждение
             if (acceptableResults.length === 0) {
                 setFindWarning(`Не найдено конфигураций с рейтингом >= ${MIN_ACCEPTABLE_SCORE}/100. Показаны 3 самые дешевые из найденных рабочих, но неэффективных вариантов.`);
       } else {
                 setFindWarning(null); // Убираем предупреждение, если есть хорошие варианты
             }

             setFindError(null); // Убираем ошибку, если нашли рабочие варианты
        }

    } catch (error) {
        console.error("Error finding cheapest config:", error);
        setFindError(`Произошла ошибка при поиске: ${error.message}`);
    } finally {
        setIsFindingConfig(false);
        console.log("Hardware search finished.");
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
    findCheapestHardwareConfig,
    isFindingConfig,
    cheapestConfigs,
    findError,
    findWarning
  };
};