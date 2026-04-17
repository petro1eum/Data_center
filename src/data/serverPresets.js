// Пресеты для серверов (Стоимость baremetal платформы БЕЗ учета GPU)
export const SERVER_PRESETS = {
    "nvidia-gb200-nvl72": { 
      name: "NVIDIA GB200 NVL72 Rack",
      cost: 2500000,
      power: 120.0,
      gpuCount: 72, 
      description: "Стойка NVL72 (36 Grace CPUs, 72 Blackwell GPUs). Монолитный сервер гигантского масштаба с жидкостным охлаждением для терабайтных моделей.", 
      recommended: true 
    },
    "dell-xe9680-b200": { 
      name: "Dell PowerEdge XE9680 (8x B200 HGX)",
      cost: 45000,
      power: 1.8,
      gpuCount: 8, 
      description: "Сервер 6U для 8xNVIDIA HGX B200 или MI300X. Необходима инфраструктура воздушного+жидкостного охлаждения.", 
      recommended: true 
    },
    "hpe-proliant-xd685": { 
      name: "HPE ProLiant XD685 (8x MI325X)",
      cost: 48000,
      power: 1.6,
      gpuCount: 8, 
      description: "Оптимизирован 5U шасси для AMD MI300X/MI325X с жидкостным охлаждением.", 
      recommended: true 
    },
    "supermicro-sys-821ge": { 
      name: "Supermicro 8U AI System (8x H200/B200)",
      cost: 42000,
      power: 1.5,
      gpuCount: 8, 
      description: "Система 8U с максимальным воздушным обдувом для 8 GPU.", 
      recommended: false 
    },
    "smc-quad-h20": { 
      name: "Standard 4U (4x PCIe GPU)", 
      cost: 15000, 
      power: 0.6, 
      gpuCount: 4, 
      description: "Базовый 4U сервер для PCIe-карт (L40S, H20, A100). Подходит для небольших инференс-кластеров.",
      recommended: false 
    },
    "lenovo-sr675-v3": { 
      name: "Lenovo ThinkSystem SR675 V3", 
      cost: 18000, 
      power: 0.8, 
      gpuCount: 4, 
      description: "Универсальный сервер для 4x двухслотовых GPU. Отлично подходит для корпоративных приватных моделей.", 
      recommended: false 
    },
    "standard-8gpu": {
      name: "Generic 8x GPU OCP Chassis", 
      cost: 35000,
      power: 1.2, 
      gpuCount: 8, 
      description: "Сборка OCP-стандарта от ODM-производителей (Wistron, Foxconn, Quanta). Экономичный выбор для дата-центров.", 
      recommended: false 
    },
    "ibm-linuxone-4-express": {
      name: "IBM LinuxONE 4 Express", 
      cost: 135000,
      power: 2.5, 
      gpuCount: 8, 
      description: "Энтерпрайз-класс Linux сервер (на базе мэйнфрейма zSystems). Идеален для консолидации и запуска ИИ (Spyre) внутри безопасного периметра без выноса данных (Zero Trust). Базовая цена без учёта ускорителей.", 
      recommended: false 
    },
  };