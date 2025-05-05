// Пресеты для серверов
export const SERVER_PRESETS = {
    "dell-poweredge-xe9680": { 
      name: "Dell PowerEdge XE9680 (8xH100)",
      cost: 85000,
      power: 1.5,
      gpuCount: 8, 
      description: "Сервер 6U для 8xNVIDIA HGX H100 SXM. Идеален для обучения/развертывания LLM. Цена сильно зависит от контракта и региона (в Китае может быть иначе).", 
      recommended: true 
    },
    "dell-poweredge-xe8545": { 
      name: "Dell PowerEdge XE8545", 
      cost: 45000, 
      power: 0.9, 
      gpuCount: 4, 
      description: "2U сервер с поддержкой 4 GPU NVIDIA A100. Сбалансированное решение для средних AI-проектов и смешанных рабочих нагрузок с хорошим соотношением производительности и стоимости.",
      recommended: false 
    },
    "hpe-proliant-xd685": { 
      name: "HPE ProLiant XD685 (8xGPU)",
      cost: 90000,
      power: 1.6,
      gpuCount: 8, 
      description: "Модульный сервер 5U для 8 GPU. Поддержка жидкостного охлаждения. Оптимизирован для NLP/LLM. Цена сильно зависит от контракта и региона.", 
      recommended: true 
    },
    "hpe-apollo-6500": { 
      name: "HPE Apollo 6500", 
      cost: 65000, 
      power: 1.2, 
      gpuCount: 8, 
      description: "Высокопроизводительная платформа, спроектированная для GPU-вычислений. Обеспечивает плотное размещение ускорителей для глубокого обучения и научных вычислений с оптимизированным охлаждением.", 
      recommended: false 
    },
    "supermicro-sys-421ge": { 
      name: "Supermicro SYS-421GE (8xGPU)",
      cost: 70000,
      power: 1.3,
      gpuCount: 8, 
      description: "Система 4U с поддержкой 8 GPU (вкл. HGX B200). Универсальное решение для AI. Цена сильно зависит от конфигурации и региона.", 
      recommended: true 
    },
    "lenovo-thinksystem-sr670": { 
      name: "Lenovo ThinkSystem SR670", 
      cost: 55000, 
      power: 1.0, 
      gpuCount: 4, 
      description: "2U сервер для ускоренных вычислений с гибкой архитектурой, поддерживающий до 8 GPU. Обеспечивает высокую производительность для глубокого обучения и аналитики данных с продуманной системой охлаждения.", 
      recommended: false 
    },
    "standard-4gpu": { 
      name: "Стандартный 4 GPU", 
      cost: 30000,
      power: 0.7, 
      gpuCount: 4, 
      description: "Базовая серверная конфигурация (4 GPU). Подходит для старта AI-проектов. Цена сильно варьируется, в Китае возможны более дешевые варианты.", 
      recommended: false 
    },
    "standard-8gpu": {
      name: "Стандартный 8 GPU", 
      cost: 65000,
      power: 1.2, 
      gpuCount: 8, 
      description: "Стандартная конфигурация (8 GPU) для интенсивных нагрузок. Цена сильно варьируется, в Китае возможны более дешевые варианты.", 
      recommended: false 
    },
  };