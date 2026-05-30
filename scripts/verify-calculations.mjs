/**
 * Sanity-check расчётов: VRAM, нагрузка, GPU count.
 * Запуск: node scripts/verify-calculations.mjs
 */
import { MODEL_PRESETS } from '../src/data/modelPresets.js';
import { GPU_PRESETS } from '../src/data/gpuPresets.js';
import { PERFORMANCE_MATRIX } from '../src/data/performanceData.js';
import { checkModelFitsGpu } from '../src/utils/validationUtils.js';
import {
  calcUserLoadMetrics,
  calcKvCacheGb,
  calcMemoryGpuRequirements,
  calcFinalGpuCount,
} from '../src/utils/hardwareRequirements.js';

const getTps = (modelId, gpuId, precision = 16) => {
  const entry = PERFORMANCE_MATRIX[modelId]?.[gpuId]?.[precision];
  if (typeof entry === 'number') return entry;
  if (entry?.tps) return entry.tps;
  return null;
};

const scenarios = [
  {
    name: 'Qwen3.6-35B-A3B MoE / H100 / 100 users',
    modelId: 'qwen3.6-35b-a3b',
    gpuId: 'h100-80gb',
    load: { userLoadConcurrentUsers: 100, userLoadTokensPerRequest: 100, userLoadResponseTimeSec: 3, isAgentModeEnabled: false },
  },
  {
    name: 'Qwen3.6-35B-A3B MoE / L40S (должен требовать TP≥2)',
    modelId: 'qwen3.6-35b-a3b',
    gpuId: 'l40s-48gb',
    load: { userLoadConcurrentUsers: 10, userLoadTokensPerRequest: 100, userLoadResponseTimeSec: 3, isAgentModeEnabled: false },
  },
  {
    name: 'DeepSeek-V4-Pro / H100 / 50 users',
    modelId: 'deepseek-v4-pro',
    gpuId: 'h100-80gb',
    load: { userLoadConcurrentUsers: 50, userLoadTokensPerRequest: 200, userLoadResponseTimeSec: 5, isAgentModeEnabled: false },
  },
  {
    name: 'GPT-OSS 120B / H100 / agents 5%',
    modelId: 'gpt-oss-120b',
    gpuId: 'h100-80gb',
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
  },
  {
    name: 'Llama 3.3 70B dense / H100 / 100 users agents 10%',
    modelId: 'llama3_3-70b',
    gpuId: 'h100-80gb',
    load: {
      userLoadConcurrentUsers: 100,
      userLoadTokensPerRequest: 100,
      userLoadResponseTimeSec: 3,
      isAgentModeEnabled: true,
      agentRequestPercentage: 10,
      avgAgentsPerTask: 3,
      avgLlmCallsPerAgent: 5,
      avgToolCallsPerAgent: 2,
      avgAgentLlmTokens: 1500,
    },
  },
];

console.log('=== Verification: hardware requirements ===\n');

for (const s of scenarios) {
  const model = MODEL_PRESETS[s.modelId];
  const gpu = GPU_PRESETS[s.gpuId];
  const precision = 16;

  const formData = {
    modelParamsNumBillion: model.params,
    modelActiveParamsBillion: model.activeParams ?? model.params,
    deployVramGb: model.deployVramGb ?? null,
    modelParamsBitsPrecision: precision,
    gpuConfigVramGb: gpu.vram,
    ...s.load,
  };

  const perf = { tps: getTps(s.modelId, s.gpuId, precision) };
  const load = calcUserLoadMetrics(formData);
  const kv = calcKvCacheGb(formData, load.avgContextTokensPerSession);
  const mem = calcMemoryGpuRequirements(formData, kv);
  const fit = checkModelFitsGpu(formData);
  const gpuCount = calcFinalGpuCount({
    totalTokensPerSecRequired: load.totalTokensPerSecRequired,
    effectiveTokensPerSecPerGpu: perf.tps ?? 0,
    gpusPerReplica: mem.gpusPerReplica,
    minGpusForMemory: mem.minGpusForMemory,
  });

  console.log(`▸ ${s.name}`);
  console.log(`  Model: ${model.name} (${model.params}B total${model.activeParams ? `, ${model.activeParams}B active` : ''})`);
  console.log(`  GPU: ${gpu.name} (${gpu.vram}GB), TPS/GPU: ${perf.tps ?? 'N/A'}`);
  console.log(`  Load: ${load.totalTokensPerSecRequired.toFixed(0)} tok/s | LLM calls/s: ${load.totalLlmCallsPerSecond.toFixed(1)}`);
  console.log(`  Memory: weights ${mem.weightGb.toFixed(0)} GB + KV ${kv.toFixed(1)} GB → TP=${mem.gpusPerReplica}, min GPU (mem)=${mem.minGpusForMemory}`);
  console.log(`  GPU total: ${gpuCount.numGpu} (throughput=${gpuCount.gpuCountForThroughput}, memory=${mem.minGpusForMemory})`);
  console.log(`  VRAM check: ${fit.hasError ? 'ERROR' : fit.warningMessage ? 'WARN' : 'OK'}${fit.errorMessage ? ' — ' + fit.errorMessage.slice(0, 80) + '…' : ''}${fit.warningMessage ? ' — ' + fit.warningMessage.slice(0, 90) + '…' : ''}`);
  console.log('');
}

// Agent vs simple load ratio check
const agentForm = {
  userLoadConcurrentUsers: 100,
  userLoadTokensPerRequest: 100,
  userLoadResponseTimeSec: 3,
  isAgentModeEnabled: true,
  agentRequestPercentage: 5,
  avgAgentsPerTask: 3,
  avgLlmCallsPerAgent: 5,
  avgToolCallsPerAgent: 2,
  avgAgentLlmTokens: 1500,
};
const simpleForm = { ...agentForm, isAgentModeEnabled: false };
const agentLoad = calcUserLoadMetrics(agentForm);
const simpleLoad = calcUserLoadMetrics(simpleForm);
const ratio = agentLoad.totalTokensPerSecRequired / simpleLoad.totalTokensPerSecRequired;
console.log('▸ Agent load multiplier (5% agent requests):');
console.log(`  Simple: ${simpleLoad.totalTokensPerSecRequired.toFixed(0)} tok/s`);
console.log(`  Mixed:  ${agentLoad.totalTokensPerSecRequired.toFixed(0)} tok/s (${ratio.toFixed(1)}×)`);
console.log(`  Expected agent tokens/user: 3×5×1500+100 = 22600 vs simple 100 → ~${(0.05 * 22600 + 0.95 * 100) / 100}× effective per user mix`);
