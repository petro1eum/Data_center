// Пресеты для GPU
export const GPU_PRESETS = {
    "a100-80gb": { 
      name: "NVIDIA A100 80GB", 
      cost: 15000, // Цена может быть ниже при закупках в Китае
      power: 0.4, 
      vram: 80, 
      description: "Высокопроизводительный GPU для ЦОД, оптимизированный для AI/HPC. 80GB HBM2e, тензорные ядра 3-го поколения, MIG.", 
      recommended: true 
    },
    "a100-40gb": { 
      name: "NVIDIA A100 40GB", 
      cost: 10000, 
      power: 0.4, 
      vram: 40, 
      description: "Версия A100 с меньшим объемом памяти, но с теми же возможностями производительности. Более доступное решение для задач, не требующих больших объемов видеопамяти.", 
      recommended: false 
    },
    "h100-80gb": { 
      name: "NVIDIA H100 80GB", 
      cost: 35000, // Рыночная цена обычно выше, но в Китае возможны варианты
      power: 0.7, 
      vram: 80, 
      description: "Флагманский GPU (Hopper) для AI. Тензорные ядра 4-го поколения, Transformer Engine FP8. До 4x пр-ти A100.", 
      recommended: true 
    },
    "h200-141gb": { 
      name: "NVIDIA H200", 
      cost: 45000, // Рыночная цена обычно выше, но в Китае возможны варианты
      power: 0.7, // TDP может достигать 1 кВт
      vram: 141, 
      description: "Обновленный H100 с 141GB HBM3e. Непревзойденная производительность для LLM и HPC.", 
      recommended: true 
    },
    "b200-hbm3e": { 
      name: "NVIDIA B200", 
      cost: 45000, 
      power: 0.8, 
      vram: 141, 
      description: "Новейший ускоритель на архитектуре Blackwell, преемник H200, обеспечивающий значительный прирост энергоэффективности и производительности для генеративного AI.", 
      recommended: false 
    },
    "l40s-48gb": { // Обновил ключ и добавил S
      name: "NVIDIA L40S 48GB", 
      cost: 12000, // Хорошее соотношение цена/производительность
      power: 0.35, // Уточнил мощность
      vram: 48, 
      description: "Универсальный GPU (Ada Lovelace) для AI-инференса, обучения и графики. Эффективнее L40.", 
      recommended: true // Сделаем рекомендуемым
    },
    "a800-80gb": { 
      name: "NVIDIA A800 80GB (China)", 
      cost: 15000, 
      power: 0.4, 
      vram: 80, 
      description: "Модификация A100 для китайского рынка с ограниченной пропускной способностью межсоединений, соответствующая экспортным ограничениям.", 
      recommended: false 
    },
    "h20-china": { 
      name: "NVIDIA H20 (China)", 
      cost: 25000, 
      power: 0.65, 
      vram: 96, 
      description: "Версия GPU серии Hopper для китайского рынка, с уменьшенным количеством ядер CUDA и тензорных ядер, но с увеличенным объемом памяти.", 
      recommended: false 
    },
    "huawei-ascend910b": { 
      name: "Huawei Ascend 910B", 
      cost: 14000, 
      power: 0.35, 
      vram: 64, 
      description: "Высокопроизводительный AI-ускоритель от Huawei, специально разработанный для обучения и инференса глубоких нейронных сетей.", 
      recommended: false 
    },
    "huawei-ascend910c": { 
      name: "Huawei Ascend 910C", 
      cost: 18000, 
      power: 0.45, 
      vram: 96, 
      description: "Улучшенная версия Ascend 910B с увеличенным объемом памяти и вычислительной мощностью для более сложных AI-моделей.", 
      recommended: false 
    },
    "biren-br100": { 
      name: "Biren BR100", 
      cost: 11000, 
      power: 0.4, 
      vram: 64, 
      description: "Китайский GPU высокого класса для центров обработки данных, сопоставимый по характеристикам с NVIDIA A100.", 
      recommended: false 
    },
    "via-big-island": { 
      name: "Via/Zhaoxin Big Island", 
      cost: 9000, 
      power: 0.3, 
      vram: 32, 
      description: "GPU для центров обработки данных от китайского производителя Via/Zhaoxin, ориентированный на независимость от западных технологий.", 
      recommended: false 
    },
    "amd-mi300x": { 
      name: "AMD Instinct MI300X", 
      cost: 16000, // Конкурентная цена
      power: 0.75, // Уточнил мощность 
      vram: 192, 
      description: "Мощный ускоритель AMD с 192GB HBM3 для AI/HPC. Альтернатива NVIDIA для крупных моделей.", 
      recommended: true 
    },
    "amd-mi325x": { 
      name: "AMD Instinct MI325X", 
      cost: 18000, 
      power: 0.55, 
      vram: 256, 
      description: "Новейший ускоритель AMD с беспрецедентным объемом памяти HBM3E, идеален для крупнейших языковых моделей и HPC-приложений.", 
      recommended: false 
    },
    "intel-gaudi3": { 
      name: "Intel Gaudi 3", 
      cost: 15625, 
      power: 0.5, 
      vram: 96, 
      description: "AI-ускоритель от Intel, специально оптимизированный для обучения и инференса нейронных сетей с отличным соотношением производительность/стоимость.", 
      recommended: false 
    },
    "groq-lpu": { 
      name: "Groq LPU", 
      cost: 20000, 
      power: 0.25, 
      vram: 0, 
      description: "Уникальный акселератор с особой архитектурой, обеспечивающий сверхнизкую латентность для инференса генеративных моделей и экстремальную энергоэффективность.", 
      recommended: false 
    },
    "google-tpu-v5p": { 
      name: "Google TPU v5p", 
      cost: 22000, 
      power: 0.65, 
      vram: 96, 
      description: "Специализированный AI-ускоритель от Google, оптимизированный для TensorFlow и JAX. Обеспечивает высокую эффективность в задачах машинного обучения.", 
      recommended: false 
    },
  };