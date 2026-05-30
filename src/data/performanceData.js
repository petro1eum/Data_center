// Матрица производительности (tokens/sec/GPU) — май 2026
// onprem_peak: vLLM continuous batch, dedicated GPU
// Источники: vLLM benchmarks, vendor refs, сверка с AA/OpenRouter (×1.5–3 vs cloud median)

export const GPU_RELATIVE_PERFORMANCE = {
  "a100-80gb": 1.0,
  "h100-80gb": 2.5,
  "h200-141gb": 3.5,
  "b200-hbm3e": 6.0,
  "b300-hbm3e": 7.5,
  "gb200-grace-blackwell": 6.5,
  "l40s-48gb": 0.7,
  "a800-80gb": 0.9,
  "h20-china": 1.8,
  "amd-mi300x": 3.3,
  "amd-mi325x": 4.0,
  "amd-mi350x": 5.0,
  "intel-gaudi3": 2.0,
  "google-tpu-v5p": 2.25,
  "ibm-spyre-accelerator": 0.85,
  default: 0.3,
};

const GPUS = [
  "a100-80gb", "h100-80gb", "h200-141gb", "b200-hbm3e", "b300-hbm3e",
  "l40s-48gb", "a800-80gb", "h20-china",
  "amd-mi300x", "amd-mi325x", "amd-mi350x",
  "intel-gaudi3", "google-tpu-v5p",
];

const PREC_MULT = { 16: 1.0, 8: 1.85, 4: 2.4 };

/** baseH100 задан при basePrecision; target precision масштабируется относительно base */
function scaleFromH100(h100Tps, gpuId, targetPrecision, basePrecision = 16) {
  const factor = GPU_RELATIVE_PERFORMANCE[gpuId] ?? GPU_RELATIVE_PERFORMANCE.default;
  const h100Factor = GPU_RELATIVE_PERFORMANCE["h100-80gb"];
  const baseMult = PREC_MULT[basePrecision] ?? 1.0;
  const targetMult = PREC_MULT[targetPrecision] ?? 1.0;
  const precMult = targetMult / baseMult;
  return Math.round(h100Tps * (factor / h100Factor) * precMult);
}

function buildFromH100(baseH100, { moe8bitOnly = false, estimated = true, basePrecision = 16 } = {}) {
  const entry = {};
  const bp = moe8bitOnly ? 8 : basePrecision;
  for (const gpu of GPUS) {
    if (moe8bitOnly) {
      const tps8 = scaleFromH100(baseH100, gpu, 8, bp);
      entry[gpu] = {
        16: null,
        8: tps8,
        4: scaleFromH100(baseH100, gpu, 4, bp),
        estimated,
      };
    } else {
      entry[gpu] = {
        16: scaleFromH100(baseH100, gpu, 16, bp),
        8: scaleFromH100(baseH100, gpu, 8, bp),
        4: scaleFromH100(baseH100, gpu, 4, bp),
        estimated,
      };
    }
  }
  return entry;
}

export const PERFORMANCE_MATRIX = {
  // ── Qwen 3.6 ──
  "qwen3.6-27b": buildFromH100(420),
  "qwen3.6-35b-a3b": buildFromH100(520),

  // ── Multimodal OSS ──
  "qwen3-vl-8b": buildFromH100(280, { estimated: true }),
  "qwen3-vl-30b-a3b": buildFromH100(680, { estimated: true }),
  "gemma-4-e4b": buildFromH100(2200, { estimated: true }),
  "gemma-4-31b": buildFromH100(850, { estimated: true }),

  // ── Llama 4 (17B active) — сверка: Groq OR ~448, on-prem H100 batch ~550–700 ──
  "llama4-scout": buildFromH100(480),
  "llama4-maverick": buildFromH100(420),

  // ── DeepSeek V4 — base @ FP8; Fireworks ~167 cluster, vLLM batch ~280/GPU ──
  "deepseek-v4-flash": buildFromH100(280, { moe8bitOnly: true, basePrecision: 8 }),
  "deepseek-v4-pro": buildFromH100(120, { moe8bitOnly: true, basePrecision: 8 }),

  // ── Kimi K2.5 / K2.6 ──
  "kimi-k2.5": buildFromH100(700, { moe8bitOnly: true, basePrecision: 8 }),
  "kimi-k2.6": buildFromH100(740, { moe8bitOnly: true, basePrecision: 8 }),

  // ── Mistral / OpenAI / GLM / Nemotron ──
  "mistral-large-3-675b": buildFromH100(520, { moe8bitOnly: true, basePrecision: 8 }),
  "gpt-oss-20b": buildFromH100(1200),
  "gpt-oss-120b": buildFromH100(2800),
  "glm-5.1": buildFromH100(480, { moe8bitOnly: true, basePrecision: 8 }),
  "nemotron-3-nano": buildFromH100(8500),
  "nemotron-3-super": buildFromH100(2800, { moe8bitOnly: true, basePrecision: 8 }),
};
