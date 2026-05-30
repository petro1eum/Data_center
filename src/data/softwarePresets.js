// ПО — май 2026
// NVIDIA AI Enterprise: $4,500/GPU/год (официальный MSRP, docs.nvidia.com)
export const SOFTWARE_PRESETS = {
  "base-os": {
    name: "Linux + Open Source Stack",
    annualCostPerServer: 0,
    annualCostPerGpu: 0,
    description: "Ubuntu/RHEL + Kubernetes (OSS) + Prometheus/Grafana. Без коммерческих лицензий.",
    recommended: true,
  },
  "nvidia-ai-enterprise": {
    name: "NVIDIA AI Enterprise",
    annualCostPerServer: 0,
    annualCostPerGpu: 4500,
    description: "NVIDIA NVAIE: $4,500/GPU/год (1-yr sub, Business Standard support). 3-yr: $13,500/GPU. Per-GPU licensing.",
    recommended: false,
  },
  "red-hat-openshift-ai": {
    name: "Red Hat OpenShift AI",
    annualCostPerServer: 3500,
    annualCostPerGpu: 0,
    description: "OpenShift AI subscription ~$3,000–4,000/узел/год (2-socket). MLOps, notebooks, model serving.",
    recommended: false,
  },
  "vmware-vsphere-ai": {
    name: "VMware vSphere + AI Add-ons",
    annualCostPerServer: 2800,
    annualCostPerGpu: 0,
    description: "vSphere Enterprise Plus + Tanzu ~$2,500–3,500/CPU-socket/год. Виртуализация GPU (vGPU/MIG).",
    recommended: false,
  },
  "custom-enterprise": {
    name: "Custom Enterprise Stack",
    annualCostPerServer: 4000,
    annualCostPerGpu: 0,
    description: "Splunk/Datadog + commercial K8s + security (CrowdStrike etc.) ~$3,500–5,000/сервер/год.",
    recommended: false,
  },
};
