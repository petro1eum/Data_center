/**
 * Сверка deploy VRAM мультимодальных моделей с официальными таблицами.
 * Запуск: node scripts/verify-multimodal.mjs
 */
import { MODEL_PRESETS } from '../src/data/modelPresets.js';
import { GPU_PRESETS } from '../src/data/gpuPresets.js';
import { calcMemoryGpuRequirements, calcFinalGpuCount } from '../src/utils/hardwareRequirements.js';

const USABLE_RATIO = 0.82;

/** Официальные / рыночные эталоны (май 2026) */
const OFFICIAL = [
  {
    modelId: 'qwen3-vl-8b',
    label: 'Qwen3-VL-8B FP8',
    source: 'Qwen3-VL docs / vLLM recipes',
    officialMinGb: 16,
    officialGpuHint: '1× H100',
    gpuId: 'h100-80gb',
    expectMinGpus: 1,
  },
  {
    modelId: 'qwen3-vl-30b-a3b',
    label: 'Qwen3-VL-30B-A3B Q4',
    source: 'llmhardware / community Q4 ~20GB',
    officialMinGb: 20,
    officialGpuHint: '1× RTX 4090 / 5090',
    gpuId: 'h100-80gb',
    expectMinGpus: 1,
  },
  {
    modelId: 'gemma-4-e4b',
    label: 'Gemma 4 E4B Q4',
    source: 'Unsloth / Google Gemma 4 card',
    officialMinGb: 6,
    officialGpuHint: '1× RTX 3060 12GB',
    gpuId: 'l40s-48gb',
    expectMinGpus: 1,
  },
  {
    modelId: 'gemma-4-31b',
    label: 'Gemma 4 31B BF16',
    source: 'Unsloth GGUF table',
    officialMinGb: 62,
    officialGpuHint: '1× H100 80GB',
    gpuId: 'h100-80gb',
    expectMinGpus: 1,
  },
  {
    modelId: 'llama4-scout',
    label: 'Llama 4 Scout Int4/FP8 on 1×H100',
    source: 'Meta Llama 4 blog',
    officialMinGb: 80,
    officialGpuHint: '1× H100 80GB',
    gpuId: 'h100-80gb',
    expectMinGpus: 1,
  },
];

const load = {
  userLoadConcurrentUsers: 1,
  userLoadTokensPerRequest: 512,
  userLoadResponseTimeSec: 3,
  isAgentModeEnabled: false,
};

console.log('=== Multimodal VRAM verification vs official specs ===\n');

let passed = 0;
let failed = 0;

for (const ref of OFFICIAL) {
  const model = MODEL_PRESETS[ref.modelId];
  const gpu = GPU_PRESETS[ref.gpuId];
  if (!model || !gpu) {
    console.log(`✗ SKIP ${ref.label} — missing preset`);
    failed++;
    continue;
  }

  const deployVramGb = ref.overrideDeploy ?? model.deployVramGb;
  const precision = ref.overridePrecision ?? model.deployPrecision ?? 16;

  const formData = {
    modelParamsNumBillion: model.params,
    modelActiveParamsBillion: model.activeParams ?? model.params,
    deployVramGb,
    deployGpuCount: model.deployGpuCount,
    modelParamsBitsPrecision: precision,
    gpuConfigVramGb: gpu.vram,
    isMultimodal: model.isMultimodal ?? false,
    multimodalOverheadGb: model.multimodalOverheadGb ?? 0,
    ...load,
  };

  const mem = calcMemoryGpuRequirements(formData, 0.5);
  const gpuCount = calcFinalGpuCount({
    totalTokensPerSecRequired: 100,
    effectiveTokensPerSecPerGpu: 1000,
    gpusPerReplica: mem.gpusPerReplica,
    minGpusForMemory: mem.minGpusForMemory,
    gpuCountMode: 'minimum',
    deployGpuCount: model.deployGpuCount,
  });

  const ourDeploy = deployVramGb ?? mem.weightGb;
  const deltaPct = ((ourDeploy - ref.officialMinGb) / ref.officialMinGb) * 100;
  const deployOk = Math.abs(deltaPct) <= 15 || ourDeploy >= ref.officialMinGb * 0.9;
  const gpuOk = gpuCount.minimumDeployGpu === ref.expectMinGpus
    || mem.minGpusForMemory === ref.expectMinGpus
    || mem.gpusPerReplica === ref.expectMinGpus;

  const status = deployOk && gpuOk ? '✓' : '✗';
  if (deployOk && gpuOk) passed++;
  else failed++;

  console.log(`${status} ${ref.label}`);
  console.log(`  Source: ${ref.source}`);
  console.log(`  Official min: ${ref.officialMinGb} GB → hint: ${ref.officialGpuHint}`);
  console.log(`  Our deployVramGb: ${ourDeploy} GB (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`);
  console.log(`  GPU ${gpu.name}: TP=${mem.gpusPerReplica}, min mem GPU=${mem.minGpusForMemory}, min deploy=${gpuCount.minimumDeployGpu}`);
  if (!deployOk) console.log(`  ⚠ deploy delta >15% vs official`);
  if (!gpuOk) console.log(`  ⚠ expected ${ref.expectMinGpus} GPU, got deploy=${gpuCount.minimumDeployGpu} mem=${mem.minGpusForMemory}`);
  console.log('');
}

// Cross-check: Gemma 4 E4B BF16 ~16GB → 1× L40S sufficient
{
  const gpu = GPU_PRESETS['l40s-48gb'];
  const usable = gpu.vram * USABLE_RATIO;
  const needBf16 = 16 * 1.2;
  const gpus = Math.ceil(needBf16 / usable);
  console.log(`▸ Sanity: Gemma 4 E4B BF16 (${needBf16.toFixed(1)} GB with 1.2× overhead)`);
  console.log(`  L40S usable ${usable.toFixed(1)} GB → need ${gpus} GPU(s) ${gpus === 1 ? '✓' : '?'}`);
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
