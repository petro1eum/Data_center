/**
 * Сравнение on-prem оценок vs OpenRouter (цены + cloud throughput).
 * Запуск: node scripts/compare-openrouter.mjs
 */
import { MODEL_PRESETS } from '../src/data/modelPresets.js';
import { PERFORMANCE_MATRIX } from '../src/data/performanceData.js';
import {
  OPENROUTER_MODEL_MAP,
  CLOUD_API_THROUGHPUT,
  OPENROUTER_PRICING,
} from '../src/data/openRouterBenchmarks.js';

const GPU_ID = 'h100-80gb';

function getOnPremTps(modelId, precision) {
  const row = PERFORMANCE_MATRIX[modelId]?.[GPU_ID];
  if (!row) return null;
  let v = row[precision];
  if (v == null && precision === 16) v = row[8] ?? row[4];
  return typeof v === 'number' ? v : null;
}

console.log('=== Калькулятор vs OpenRouter (май 2026) ===\n');

const presetIds = Object.keys(OPENROUTER_MODEL_MAP);

for (const presetId of presetIds) {
  const preset = MODEL_PRESETS[presetId];
  if (!preset) continue;

  const precision = preset.deployPrecision ?? 16;
  const cloudRef = CLOUD_API_THROUGHPUT[presetId];
  const pricing = OPENROUTER_PRICING[presetId];
  const onPremTps = getOnPremTps(presetId, precision);
  const cloudTps = cloudRef?.median ?? null;

  console.log(`▸ ${preset.name}`);
  console.log(`  OR: ${OPENROUTER_MODEL_MAP[presetId]}`);
  if (pricing) console.log(`  OR price: $${pricing.blendedPerM.toFixed(3)}/M (${pricing.provider})`);
  if (onPremTps) console.log(`  On-prem H100: ${onPremTps} tok/s`);
  if (cloudTps) {
    const ratio = onPremTps ? (onPremTps / cloudTps).toFixed(1) : '?';
    const ok = onPremTps && onPremTps / cloudTps <= 8;
    console.log(`  Cloud API median: ${cloudTps} t/s (${cloudRef?.provider ?? '?'}) — ratio ×${ratio} ${ok ? '✓' : '⚠'}`);
  }
  console.log('');
}

console.log('=== Sanity: FP8 MoE без double-scaling ===');
const flash = PERFORMANCE_MATRIX['deepseek-v4-flash']['h100-80gb'][8];
console.log(`deepseek-v4-flash H100 FP8: ${flash} (expect ~280, was 7215)`);
