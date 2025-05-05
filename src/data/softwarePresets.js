// src/data/softwarePresets.js
export const SOFTWARE_PRESETS = {
    "base-os": { 
      name: "Базовая ОС + Open Source", 
      annualCostPerServer: 0, // Условно бесплатно (Linux + OSS)
      description: "Стандартная конфигурация с Linux и открытым ПО для кластеризации/мониторинга.",
      recommended: true 
    },
    "nvidia-ai-enterprise": { 
      name: "NVIDIA AI Enterprise", 
      annualCostPerServer: 5000, // Примерная годовая стоимость лицензии на сервер 
      description: "Платформа NVIDIA для разработки и развертывания AI с поддержкой и оптимизациями (стоимость сильно варьируется).",
      recommended: false 
    },
    "managed-kubernetes": { 
      name: "Управляемый Kubernetes + Доп. ПО", 
      annualCostPerServer: 2000,
      description: "Использование управляемого Kubernetes (может быть бесплатно, но часто с доп. платными сервисами) и другого коммерческого ПО.",
      recommended: false 
    },
     "custom-enterprise": { 
      name: "Custom Enterprise Stack", 
      annualCostPerServer: 3000,
      description: "Стек ПО, включающий коммерческие ОС, системы управления кластером, мониторинг и безопасность.",
      recommended: false 
    },
}; 