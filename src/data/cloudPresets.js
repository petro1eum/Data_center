// Cloud GPU rates — USD/GPU/hour, on-demand, май 2026
// Источники: CoreWeave pricing, Lambda API, ComputePrices, DeployBase
export const CLOUD_PROVIDERS = {
  lambda: {
    name: "Lambda Labs",
    description: "On-demand без минимума. H100 SXM ~$3.29/GPU-hr.",
    recommended: true,
  },
  coreweave: {
    name: "CoreWeave",
    description: "Enterprise K8s. 8×H100 node $49.24/hr (~$6.16/GPU).",
    recommended: false,
  },
  runpod: {
    name: "RunPod Secure",
    description: "Community cloud. H100 ~$2.69–3.50/GPU-hr.",
    recommended: false,
  },
  openrouter: {
    name: "OpenRouter API",
    description: "Managed API ($/M tokens). Throughput — cloud median (AA @ 10K ctx).",
    recommended: false,
    isApiPricing: true,
  },
};

/** $/GPU/hour по типу GPU и провайдеру */
export const CLOUD_GPU_RATES = {
  "a100-80gb": { lambda: 2.49, coreweave: 2.21, runpod: 1.64 },
  "h100-80gb": { lambda: 3.29, coreweave: 6.16, runpod: 2.69 },
  "h200-141gb": { lambda: 3.99, coreweave: 6.31, runpod: 3.59 },
  "b200-hbm3e": { lambda: 5.29, coreweave: 8.60, runpod: 5.98 },
  "b300-hbm3e": { lambda: 6.50, coreweave: 10.00, runpod: 7.50 },
  "gb200-grace-blackwell": { lambda: 50.0, coreweave: 68.80, runpod: 47.84 },
  "l40s-48gb": { lambda: 1.99, coreweave: 2.25, runpod: 0.86 },
  "amd-mi300x": { lambda: 2.50, coreweave: 3.50, runpod: 2.40 },
  "amd-mi325x": { lambda: 3.20, coreweave: 4.00, runpod: 3.00 },
};

export const getCloudRateForGpu = (gpuId, providerId) =>
  CLOUD_GPU_RATES[gpuId]?.[providerId] ?? null;
