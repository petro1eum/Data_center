import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { NETWORK_PRESETS } from '../data/networkPresets';
import { STORAGE_PRESETS } from '../data/storagePresets';
import { RAM_PRESETS } from '../data/ramPresets';
import { SOFTWARE_PRESETS } from '../data/softwarePresets';
import { getEstimatedTokensPerSec } from './calculationUtils';
import { checkModelFitsGpu } from './validationUtils';

const CRITICAL_LABELS = ['Ошибка VRAM', 'Нерабочая', 'Нереалистично'];
const MIN_ACCEPTABLE_SCORE = 40;

/**
 * Перебор GPU × precision × server для текущей модели и нагрузки.
 */
export const searchAllHardwareConfigs = (currentConfig, performFullCalculation) => {
  const allResults = [];
  const precisionsToTry = [16, 8, 4];

  for (const gpuKey of Object.keys(GPU_PRESETS)) {
    const gpuPreset = GPU_PRESETS[gpuKey];
    for (const precision of precisionsToTry) {
      const vramCheck = checkModelFitsGpu({
        modelParamsNumBillion: currentConfig.modelParamsNumBillion,
        modelActiveParamsBillion: currentConfig.modelActiveParamsBillion,
        deployVramGb: currentConfig.deployVramGb,
        modelParamsBitsPrecision: precision,
        gpuConfigVramGb: gpuPreset.vram,
      });
      if (vramCheck.hasError) continue;

      const perfCheck = getEstimatedTokensPerSec(currentConfig.modelId, gpuKey, precision, {
        performanceMode: currentConfig.performanceMode ?? 'onprem_peak',
      });
      if (perfCheck.tps == null) continue;

      for (const serverKey of Object.keys(SERVER_PRESETS)) {
        const serverPreset = SERVER_PRESETS[serverKey];
        const tempConfigData = {
          ...currentConfig,
          gpuId: gpuKey,
          serverId: serverKey,
          modelParamsBitsPrecision: precision,
          gpuConfigModel: gpuPreset.name,
          gpuConfigCostUsd: gpuPreset.cost,
          gpuConfigPowerKw: gpuPreset.power,
          gpuConfigVramGb: gpuPreset.vram,
          serverConfigNumGpuPerServer: serverPreset.gpuCount,
          serverConfigCostUsd: serverPreset.cost,
          serverConfigPowerOverheadKw: serverPreset.power,
          serverPricingMode: serverPreset.pricingMode ?? currentConfig.serverPricingMode,
          serverTotalPowerKw: serverPreset.totalPowerKw ?? null,
          serverTotalGpuVramGb: serverPreset.totalGpuVramGb ?? null,
          networkCostPerPort: NETWORK_PRESETS[currentConfig.networkId]?.costPerPort,
          storageCostPerGB: STORAGE_PRESETS[currentConfig.storageId]?.costPerGB,
          ramCostPerGB: RAM_PRESETS[currentConfig.ramId]?.costPerGB,
          annualSoftwareCostPerServer: SOFTWARE_PRESETS[currentConfig.softwareId]?.annualCostPerServer,
          annualSoftwareCostPerGpu: SOFTWARE_PRESETS[currentConfig.softwareId]?.annualCostPerGpu,
        };

        const calculationResult = performFullCalculation(tempConfigData);
        if (!calculationResult || !(calculationResult.fiveYearTco > 0)) continue;

        allResults.push({
          gpuKey,
          serverKey,
          precision,
          gpuName: gpuPreset.name,
          serverName: serverPreset.name,
          fiveYearTco: calculationResult.fiveYearTco,
          requiredGpu: calculationResult.requiredGpu,
          serversRequired: calculationResult.serversRequired,
          totalEffectiveTokensPerSec: calculationResult.totalEffectiveTokensPerSec,
          ratingLabel: calculationResult.configRating?.label ?? 'N/A',
          ratingScore: calculationResult.configRating?.score ?? 0,
        });
      }
    }
  }

  return allResults;
};

/** Лучший баланс рейтинг + TCO — только конфигурации с рейтингом ≥ 40 */
export const pickOptimalConfig = (allResults) => {
  const workable = allResults.filter((r) => !CRITICAL_LABELS.includes(r.ratingLabel));
  if (!workable.length) return null;

  const acceptable = workable.filter((r) => r.ratingScore >= MIN_ACCEPTABLE_SCORE);
  if (!acceptable.length) return null;

  return [...acceptable].sort((a, b) => {
    if (b.ratingScore !== a.ratingScore) return b.ratingScore - a.ratingScore;
    return a.fiveYearTco - b.fiveYearTco;
  })[0];
};

/** Топ-N самых дешёвых рабочих */
export const pickCheapestConfigs = (allResults, limit = 3) => {
  const workable = allResults.filter((r) => !CRITICAL_LABELS.includes(r.ratingLabel));
  workable.sort((a, b) => a.fiveYearTco - b.fiveYearTco);
  return workable.slice(0, limit);
};

export const isSameHardwareConfig = (current, rec) =>
  current?.gpuKey === rec?.gpuKey
  && current?.serverKey === rec?.serverKey
  && parseInt(current?.precision, 10) === parseInt(rec?.precision, 10);
