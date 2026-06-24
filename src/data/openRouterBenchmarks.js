/**
 * OpenRouter + cloud API benchmarks (май 2026).
 * Throughput: Artificial Analysis P50 @ 10K input, провайдеры с OR endpoints.
 * Pricing: OpenRouter /api/v1/models/{id}/endpoints (cheapest provider, blend 7:2:1).
 */

/** preset id → OpenRouter model id */
export const OPENROUTER_MODEL_MAP = {
  'glm-5.2': 'z-ai/glm-5.2',
  'minimax-m3': 'minimax/minimax-m3',
  'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
  'deepseek-v4-flash': 'deepseek/deepseek-v4-flash',
  'deepseek-v4-pro': 'deepseek/deepseek-v4-pro',
  'llama4-scout': 'meta-llama/llama-4-scout',
  'llama4-maverick': 'meta-llama/llama-4-maverick',
  'gpt-oss-120b': 'openai/gpt-oss-120b',
  'gpt-oss-20b': 'openai/gpt-oss-20b',
  'kimi-k2.5': 'moonshotai/kimi-k2.5',
  'kimi-k2.6': 'moonshotai/kimi-k2.6',
  'gemma-4-31b': 'google/gemma-4-31b-it',
  'qwen3-vl-8b': 'qwen/qwen3-vl-8b-instruct',
  'qwen3.5-397b-a17b': 'qwen/qwen3.5-397b-a17b',
  'qwen3.6-35b-a3b': 'qwen/qwen3-235b-a22b',
  'qwen3-vl-30b-a3b': 'qwen/qwen3-vl-30b-a3b',
  'qwen3.6-27b': 'qwen/qwen3-235b-a22b',
};

/**
 * Cloud API output speed (tok/s) — median P50 streaming @ 10K ctx.
 * best = fastest OR-routed provider (often Groq/Cerebras).
 */
export const CLOUD_API_THROUGHPUT = {
  'glm-5.2': { median: 150, best: 200, provider: 'Z.ai / SiliconFlow', note: 'AA median ~144.8–150.4 tok/s' },
  'minimax-m3': { median: 94, best: 91, provider: 'MiniMax / Makora', note: 'AA: MiniMax 94.3, Makora 91.2 t/s' },
  'kimi-k2.7-code': { median: 54, best: 78, provider: 'Moonshot / DeepInfra', note: 'AA 53.7 tok/s (always-thinking)' },
  'deepseek-v4-flash': { median: 106, best: 112, provider: 'Novita/SiliconFlow', note: 'Reasoning max workload' },
  'deepseek-v4-pro': { median: 97, best: 110, provider: 'DeepSeek', note: 'AA 96.6 tok/s' },
  'llama4-scout': { median: 142, best: 448, provider: 'Google Vertex / Groq' },
  'llama4-maverick': { median: 95, best: 130, provider: 'DeepInfra', estimated: true },
  'gpt-oss-120b': { median: 663, best: 1705, provider: 'Fireworks / Cerebras' },
  'gpt-oss-20b': { median: 295, best: 880, provider: 'CoreWeave / Groq' },
  'kimi-k2.5': { median: 55, best: 72, provider: 'DeepInfra', estimated: true },
  'kimi-k2.6': { median: 60, best: 78, provider: 'DeepInfra', estimated: true },
  'gemma-4-31b': { median: 72, best: 95, provider: 'Novita / DeepInfra' },
  'gemma-4-e4b': { median: 140, best: 200, provider: 'Together', estimated: true },
  'qwen3-vl-8b': { median: 120, best: 180, provider: 'Novita / Alibaba' },
  'qwen3.5-397b-a17b': { median: 90, best: 120, provider: 'Alibaba', estimated: true },
  'qwen3.6-35b-a3b': { median: 180, best: 250, provider: 'Alibaba', estimated: true },
  'qwen3.6-27b': { median: 160, best: 220, provider: 'Alibaba', estimated: true },
  'qwen3-vl-30b-a3b': { median: 110, best: 150, provider: 'Novita', estimated: true },
  'mistral-large-3-675b': { median: 35, best: 48, provider: 'Mistral', estimated: true },
};

/** $/1M tokens blended 7:2:1 (cache:input:output) — OpenRouter cheapest endpoint, май 2026 */
export const OPENROUTER_PRICING = {
  'glm-5.2': { blendedPerM: 0.82, provider: 'Z.ai' },
  'minimax-m3': { blendedPerM: 0.20, provider: 'MiniMax' },
  'kimi-k2.7-code': { blendedPerM: 0.55, provider: 'Moonshot' },
  'deepseek-v4-flash': { blendedPerM: 0.046, provider: 'Baidu' },
  'deepseek-v4-pro': { blendedPerM: 0.204, provider: 'DeepSeek' },
  'llama4-scout': { blendedPerM: 0.052, provider: 'DeepInfra' },
  'llama4-maverick': { blendedPerM: 0.100, provider: 'DeepInfra' },
  'gpt-oss-120b': { blendedPerM: 0.029, provider: 'DekaLLM' },
  'gpt-oss-20b': { blendedPerM: 0.022, provider: 'DekaLLM' },
  'kimi-k2.5': { blendedPerM: 0.298, provider: 'ModelRun' },
  'kimi-k2.6': { blendedPerM: 0.310, provider: 'ModelRun', estimated: true },
  'gemma-4-31b': { blendedPerM: 0.069, provider: 'DeepInfra' },
  'qwen3-vl-8b': { blendedPerM: 0.072, provider: 'AtlasCloud' },
  'qwen3.5-397b-a17b': { blendedPerM: 0.18, provider: 'Alibaba', estimated: true },
  'qwen3.6-35b-a3b': { blendedPerM: 0.305, provider: 'Alibaba' },
  'qwen3.6-27b': { blendedPerM: 0.280, provider: 'Alibaba', estimated: true },
};

export const getOpenRouterModelId = (presetId) => OPENROUTER_MODEL_MAP[presetId] ?? null;

export const getCloudApiThroughput = (presetId) => CLOUD_API_THROUGHPUT[presetId] ?? null;

export const getOpenRouterPricing = (presetId) => OPENROUTER_PRICING[presetId] ?? null;

/** Годовой token volume из нагрузки (toks/s × секунд в году) */
export const estimateAnnualTokens = ({
  totalTokensPerSecRequired = 0,
}) => {
  if (!totalTokensPerSecRequired || totalTokensPerSecRequired <= 0) return 0;
  return totalTokensPerSecRequired * 3600 * 24 * 365;
};
