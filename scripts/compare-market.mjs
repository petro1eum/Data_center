/**
 * Сравнение расчётов калькулятора с рыночными конфигурациями (май 2026).
 */
import { MODEL_PRESETS } from '../src/data/modelPresets.js';
import { GPU_PRESETS } from '../src/data/gpuPresets.js';
import { SERVER_PRESETS } from '../src/data/serverPresets.js';
import { NETWORK_PRESETS } from '../src/data/networkPresets.js';
import { STORAGE_PRESETS } from '../src/data/storagePresets.js';
import { RAM_PRESETS } from '../src/data/ramPresets.js';
import { PERFORMANCE_MATRIX } from '../src/data/performanceData.js';
import { calcUserLoadMetrics, calcKvCacheGb, calcMemoryGpuRequirements, calcFinalGpuCount } from '../src/utils/hardwareRequirements.js';

const calcCapex = (numGpu, formData) => {
  const { gpuConfigCostUsd, serverConfigNumGpuPerServer, serverConfigCostUsd } = formData;
  const numServers = Math.ceil(numGpu / serverConfigNumGpuPerServer);
  return {
    totalCost: numGpu * gpuConfigCostUsd + numServers * serverConfigCostUsd,
    numServers,
    totalGpuCost: numGpu * gpuConfigCostUsd,
    totalServerCost: numServers * serverConfigCostUsd,
  };
};

const calcOpex = (numGpu, numServers, fd, extCost, fullCapex) => {
  const power = numGpu * fd.gpuConfigPowerKw + numServers * fd.serverConfigPowerOverheadKw;
  const kwh = power * 24 * 365 * fd.dcCostsPue;
  const energy = kwh * fd.dcCostsElectricityCostUsdPerKwh;
  const maint = fullCapex * fd.dcCostsAnnualMaintenanceRate;
  const sw = numServers * (fd.annualSoftwareCostPerServer ?? 0) + numGpu * (fd.annualSoftwareCostPerGpu ?? 0);
  return { totalOpex: energy + maint + extCost + sw };
};

const calcStorage = (fd, servers) => {
  const modelGb = (fd.modelParamsNumBillion * fd.modelParamsBitsPrecision) / 8;
  const totalGb = modelGb * 3 + servers * 2000;
  return totalGb * fd.storageCostPerGB;
};

const calcNetwork = (servers, fd) => servers * 2 * fd.networkCostPerPort;

const calcRam = (fd, servers) => {
  const vram = fd.gpuConfigVramGb || 64;
  const perServer = vram * fd.serverConfigNumGpuPerServer * 2.5;
  return perServer * fd.ramCostPerGB * servers;
};

const getTps = (modelId, gpuId, precision) => {
  let e = PERFORMANCE_MATRIX[modelId]?.[gpuId]?.[precision];
  if (e == null && precision === 16) {
    e = PERFORMANCE_MATRIX[modelId]?.[gpuId]?.[8] ?? PERFORMANCE_MATRIX[modelId]?.[gpuId]?.[4];
  }
  return typeof e === 'number' ? e : e?.tps ?? 0;
};

function runScenario(cfg) {
  const model = MODEL_PRESETS[cfg.modelId];
  const gpu = GPU_PRESETS[cfg.gpuId];
  const server = SERVER_PRESETS[cfg.serverId];
  const precision = cfg.precision ?? 16;

  const formData = {
    modelParamsNumBillion: model.params,
    modelActiveParamsBillion: model.activeParams ?? model.params,
    deployVramGb: model.deployVramGb ?? null,
    modelParamsBitsPrecision: precision,
    gpuConfigCostUsd: gpu.cost,
    gpuConfigPowerKw: gpu.power,
    gpuConfigVramGb: gpu.vram,
    serverConfigNumGpuPerServer: server.gpuCount,
    serverConfigCostUsd: server.cost,
    serverConfigPowerOverheadKw: server.power,
    networkCostPerPort: NETWORK_PRESETS[cfg.networkId]?.costPerPort ?? 2100,
    networkType: NETWORK_PRESETS[cfg.networkId]?.type ?? '',
    storageCostPerGB: STORAGE_PRESETS['nvme-gen5-standard'].costPerGB,
    ramCostPerGB: RAM_PRESETS['ddr5-6400'].costPerGB,
    dcCostsElectricityCostUsdPerKwh: 0.08,
    dcCostsPue: 1.3,
    dcCostsAnnualMaintenanceRate: 0.05,
    annualSoftwareCostPerServer: 0,
    annualSoftwareCostPerGpu: cfg.nvaie ? 4500 : 0,
    batchingOptimizationFactor: 1.0,
    ...cfg.load,
  };

  const tps = getTps(cfg.modelId, cfg.gpuId, precision);
  const load = calcUserLoadMetrics(formData);
  const kv = calcKvCacheGb(formData, load.avgContextTokensPerSession);
  const mem = calcMemoryGpuRequirements(formData, kv);
  const gpuCount = calcFinalGpuCount({
    totalTokensPerSecRequired: load.totalTokensPerSecRequired,
    effectiveTokensPerSecPerGpu: tps,
    gpusPerReplica: mem.gpusPerReplica,
    minGpusForMemory: mem.minGpusForMemory,
  });

  const numGpu = gpuCount.numGpu;
  const capexBase = calcCapex(numGpu, formData);
  const storage = calcStorage(formData, capexBase.numServers);
  const network = calcNetwork(capexBase.numServers, formData);
  const ram = calcRam(formData, capexBase.numServers);
  const totalCapex = capexBase.totalCost + network + storage + ram;
  const opex = calcOpex(numGpu, capexBase.numServers, formData, load.annualExternalToolCost, totalCapex);
  const fiveYearTco = totalCapex + opex.totalOpex * 5;

  const nodeCost8gpu = (gpu.cost * 8) + server.cost;
  const marketNode = cfg.marketNodePrice;
  const marketGpuHr = cfg.marketGpuHr;
  const cloud5yr = marketGpuHr ? marketGpuHr * numGpu * 8760 * 5 : null;

  return {
    name: cfg.name,
    model: model.name,
    gpu: gpu.name,
    server: server.name,
    numGpu,
    servers: capexBase.numServers,
    tp: mem.gpusPerReplica,
    weightGb: mem.weightGb.toFixed(0),
    kvGb: kv.toFixed(1),
    tokPerSec: load.totalTokensPerSecRequired.toFixed(0),
    tpsPerGpu: tps,
    capexUsd: Math.round(totalCapex),
    opexAnnual: Math.round(opex.totalOpex),
    fiveYearTco: Math.round(fiveYearTco),
    nodeCost8gpu: Math.round(nodeCost8gpu),
    marketNode,
    marketGpuHr,
    cloud5yr: cloud5yr ? Math.round(cloud5yr) : null,
    marketNote: cfg.marketNote,
    marketGpus: cfg.marketGpus,
  };
}

const scenarios = [
  {
    name: 'Рынок: 8×H100 inference node (типовой)',
    modelId: 'qwen3.6-35b-a3b',
    gpuId: 'h100-80gb',
    serverId: 'dell-xe9680-b200',
    networkId: 'ib-ndr-400g',
    precision: 16,
    load: { userLoadConcurrentUsers: 50, userLoadTokensPerRequest: 512, userLoadResponseTimeSec: 2 },
    marketNodePrice: 280000,
    marketGpuHr: 3.29,
    marketGpus: 2,
    marketNote: 'Supermicro/Dell 8×H100 $250–320K (Mercatus, router-switch). Lambda $3.29/GPU-hr.',
  },
  {
    name: 'Рынок: DeepSeek-V3/R1 production (8×H200 FP8)',
    modelId: 'deepseek-v3-671b',
    gpuId: 'h200-141gb',
    serverId: 'dell-xe9680-b200',
    networkId: 'ib-xdr-800g',
    precision: 8,
    load: { userLoadConcurrentUsers: 32, userLoadTokensPerRequest: 2048, userLoadResponseTimeSec: 5 },
    marketNodePrice: 315000,
    marketGpuHr: 6.16,
    marketGpus: 8,
    marketNote: 'GMCloud/SGLang: min 8×H200 FP8 ~700GB weights. CoreWeave H200 ~$6.31/GPU-hr.',
  },
  {
    name: 'Рынок: GPT-OSS 120B на 1×80GB (OpenAI deploy)',
    modelId: 'gpt-oss-120b',
    gpuId: 'h100-80gb',
    serverId: 'dell-xe9680-b200',
    networkId: 'eth-400g',
    precision: 16,
    load: { userLoadConcurrentUsers: 20, userLoadTokensPerRequest: 256, userLoadResponseTimeSec: 3 },
    marketNodePrice: 280000,
    marketGpuHr: 3.29,
    marketGpus: 1,
    marketNote: 'OpenAI model card: MXFP4 fits 1×80GB. Рынок продаёт 8-GPU nodes, но модель — 1 GPU.',
  },
  {
    name: 'Рынок: GB200 NVL72 frontier training',
    modelId: 'deepseek-v4-pro',
    gpuId: 'gb200-grace-blackwell',
    serverId: 'nvidia-gb200-nvl72',
    networkId: 'ib-xdr-800g',
    precision: 8,
    load: { userLoadConcurrentUsers: 10, userLoadTokensPerRequest: 4096, userLoadResponseTimeSec: 10 },
    marketNodePrice: 3000000,
    marketGpuHr: 50,
    marketGpus: 72,
    marketNote: 'NVL72 list ~$3–3.5M/rack, 72 GPU, 13.5TB HBM (NVIDIA, RunLocalAI).',
  },
  {
    name: 'Рынок: CoreWeave 8×H100 batch cluster / 100 users agents',
    modelId: 'qwen3.6-35b-a3b',
    gpuId: 'h100-80gb',
    serverId: 'dell-xe9680-b200',
    networkId: 'ib-ndr-400g',
    precision: 16,
    load: {
      userLoadConcurrentUsers: 100,
      userLoadTokensPerRequest: 100,
      userLoadResponseTimeSec: 3,
      isAgentModeEnabled: true,
      agentRequestPercentage: 5,
      avgAgentsPerTask: 3,
      avgLlmCallsPerAgent: 5,
      avgToolCallsPerAgent: 2,
      avgAgentLlmTokens: 1500,
    },
    marketNodePrice: 280000,
    marketGpuHr: 6.16,
    marketGpus: null,
    marketNote: 'CoreWeave 8×H100 = $49.24/hr node ($6.16/GPU). Agent SaaS — высокий tok/s.',
  },
  {
    name: 'Рынок: Mistral Large 3 (8×H200 FP8 vendor claim)',
    modelId: 'mistral-large-3-675b',
    gpuId: 'h200-141gb',
    serverId: 'dell-xe9680-b200',
    networkId: 'ib-xdr-800g',
    precision: 8,
    load: { userLoadConcurrentUsers: 64, userLoadTokensPerRequest: 1024, userLoadResponseTimeSec: 4 },
    marketNodePrice: 315000,
    marketGpuHr: 6.31,
    marketGpus: 8,
    marketNote: 'Mistral model card: FP8 on 8×H200. Weights ~675B MoE.',
  },
];

console.log('=== Калькулятор vs Рынок (май 2026) ===\n');

for (const s of scenarios) {
  const r = runScenario(s);
  console.log(`▸ ${r.name}`);
  console.log(`  Конфиг: ${r.model} | ${r.gpu} | ${r.server}`);
  console.log(`  Наш расчёт: ${r.numGpu} GPU (TP=${r.tp}), ${r.servers} серверов | ${r.weightGb}GB weights + ${r.kvGb}GB KV | ${r.tokPerSec} tok/s`);
  console.log(`  CapEx: $${r.capexUsd.toLocaleString()} | OpEx/год: $${r.opexAnnual.toLocaleString()} | 5yr TCO: $${r.fiveYearTco.toLocaleString()}`);
  console.log(`  Наш 8-GPU node (GPU+chassis): $${r.nodeCost8gpu.toLocaleString()} vs рынок ~$${s.marketNodePrice?.toLocaleString()}`);
  if (r.cloud5yr) {
    const diff = ((r.fiveYearTco / r.cloud5yr - 1) * 100).toFixed(0);
    console.log(`  Cloud 5yr (${r.marketGpuHr}$/GPU/hr × ${r.numGpu} GPU): $${r.cloud5yr.toLocaleString()} → on-prem TCO ${diff > 0 ? '+' : ''}${diff}% vs cloud`);
  }
  if (s.marketGpus != null) {
    const gpuDiff = r.numGpu - s.marketGpus;
    console.log(`  GPU count: наш ${r.numGpu} vs рынок ${s.marketGpus} (${gpuDiff === 0 ? '✓ совпадает' : gpuDiff > 0 ? `+${gpuDiff} (мы выше — нагрузка/KV)` : `${gpuDiff} (мы ниже — проверить VRAM модель)`})`);
  }
  console.log(`  Источник: ${r.marketNote}`);
  console.log('');
}
