import { MODEL_PRESETS } from '../data/modelPresets';
import { GPU_PRESETS } from '../data/gpuPresets';
import { SERVER_PRESETS } from '../data/serverPresets';
import { NETWORK_PRESETS } from '../data/networkPresets';
import { STORAGE_PRESETS } from '../data/storagePresets';
import { RAM_PRESETS } from '../data/ramPresets';
import { SOFTWARE_PRESETS } from '../data/softwarePresets';

const DEFAULT_IDS = {
  modelId: 'gpt-oss-20b',
  gpuId: 'h100-80gb',
  serverId: 'dell-xe9680-b200',
  networkId: 'ib-ndr-400g',
  storageId: 'nvme-gen5-standard',
  ramId: 'ddr5-6400',
  softwareId: 'base-os',
};

/** Сборка полного configData для performFullCalculation */
export function buildCalculationConfig(overrides = {}) {
  const ids = { ...DEFAULT_IDS, ...overrides };
  const model = MODEL_PRESETS[ids.modelId];
  const gpu = GPU_PRESETS[ids.gpuId];
  const server = SERVER_PRESETS[ids.serverId];
  const network = NETWORK_PRESETS[ids.networkId];
  const storage = STORAGE_PRESETS[ids.storageId];
  const ram = RAM_PRESETS[ids.ramId];
  const software = SOFTWARE_PRESETS[ids.softwareId];

  if (!model || !gpu || !server) {
    throw new Error(`Invalid fixture ids: ${JSON.stringify(ids)}`);
  }

  return {
    modelId: ids.modelId,
    gpuId: ids.gpuId,
    serverId: ids.serverId,
    networkId: ids.networkId,
    storageId: ids.storageId,
    ramId: ids.ramId,
    softwareId: ids.softwareId,
    modelParamsNumBillion: model.params,
    modelActiveParamsBillion: model.activeParams ?? model.params,
    deployVramGb: model.deployVramGb ?? null,
    deployGpuCount: model.deployGpuCount ?? null,
    checkpointSizeGb: model.checkpointSizeGb ?? null,
    isMultimodal: model.isMultimodal ?? false,
    multimodalOverheadGb: model.multimodalOverheadGb ?? 0,
    modelParamsBitsPrecision: overrides.modelParamsBitsPrecision ?? model.deployPrecision ?? 16,
    userLoadConcurrentUsers: 100,
    userLoadTokensPerRequest: 100,
    userLoadResponseTimeSec: 3,
    gpuConfigModel: gpu.name,
    gpuConfigCostUsd: gpu.cost,
    gpuConfigPowerKw: gpu.power,
    gpuConfigVramGb: gpu.vram,
    serverConfigNumGpuPerServer: server.gpuCount,
    serverConfigCostUsd: server.cost,
    serverConfigPowerOverheadKw: server.power,
    serverPricingMode: server.pricingMode ?? 'barebone',
    serverTotalPowerKw: server.totalPowerKw ?? null,
    serverTotalGpuVramGb: server.totalGpuVramGb ?? null,
    networkCostPerPort: network?.costPerPort ?? 0,
    storageCostPerGB: storage?.costPerGB ?? 0,
    ramCostPerGB: ram?.costPerGB ?? 0,
    annualSoftwareCostPerServer: software?.annualCostPerServer ?? 0,
    annualSoftwareCostPerGpu: software?.annualCostPerGpu ?? 0,
    dcCostsElectricityCostUsdPerKwh: 0.08,
    dcCostsPue: 1.3,
    dcCostsAnnualMaintenanceRate: 0.05,
    batchingOptimizationFactor: 1.0,
    isAgentModeEnabled: false,
    agentRequestPercentage: 5,
    avgAgentsPerTask: 3,
    avgLlmCallsPerAgent: 5,
    avgToolCallsPerAgent: 2,
    avgAgentLlmTokens: 1500,
    avgExternalToolCost: 0.002,
    gpuCountMode: 'production',
    performanceMode: 'onprem_peak',
    cloudProviderId: 'lambda',
    optimizationGoal: 'quality',
    ...overrides,
  };
}

export const MOCK_CONFIG_RESULTS = [
  {
    gpuKey: 'fast-gpu',
    serverKey: 'srv-a',
    precision: 16,
    gpuName: 'Fast GPU',
    serverName: 'Server A',
    fiveYearTco: 100_000,
    requiredGpu: 4,
    serversRequired: 1,
    totalEffectiveTokensPerSec: 8000,
    ratingLabel: 'Компромиссная',
    ratingScore: 50,
  },
  {
    gpuKey: 'balanced-gpu',
    serverKey: 'srv-b',
    precision: 8,
    gpuName: 'Balanced GPU',
    serverName: 'Server B',
    fiveYearTco: 80_000,
    requiredGpu: 4,
    serversRequired: 1,
    totalEffectiveTokensPerSec: 5000,
    ratingLabel: 'Хорошая',
    ratingScore: 55,
  },
  {
    gpuKey: 'cheap-gpu',
    serverKey: 'srv-c',
    precision: 4,
    gpuName: 'Cheap GPU',
    serverName: 'Server C',
    fiveYearTco: 60_000,
    requiredGpu: 6,
    serversRequired: 2,
    totalEffectiveTokensPerSec: 3000,
    ratingLabel: 'Компромиссная',
    ratingScore: 45,
  },
  {
    gpuKey: 'bad-gpu',
    serverKey: 'srv-d',
    precision: 16,
    gpuName: 'Bad GPU',
    serverName: 'Server D',
    fiveYearTco: 50_000,
    requiredGpu: 2,
    serversRequired: 1,
    totalEffectiveTokensPerSec: 1000,
    ratingLabel: 'Неэффективная',
    ratingScore: 25,
  },
];
