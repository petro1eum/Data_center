// src/data/networkPresets.js
export const NETWORK_PRESETS = {
    "eth-100g": { 
      name: "Ethernet 100GbE", 
      costPerPort: 500, // Примерная стоимость порта коммутатора
      type: "Ethernet 100G", 
      description: "Стандартная высокоскоростная сеть Ethernet, подходит для большинства задач.",
      recommended: true 
    },
    "ib-hdr-200g": { 
      name: "InfiniBand HDR 200Gb/s", 
      costPerPort: 2000,
      type: "InfiniBand HDR 200G", 
      description: "Высокопроизводительная сеть с низкой задержкой, идеальна для кластеров > 8 GPU.",
      recommended: false 
    },
     "ib-ndr-400g": { 
      name: "InfiniBand NDR 400Gb/s", 
      costPerPort: 4000,
      type: "InfiniBand NDR 400G", 
      description: "Сеть последнего поколения для максимальной производительности крупных AI-кластеров (> 32 GPU).",
      recommended: false 
    },
     "eth-400g": { 
      name: "Ethernet 400GbE", 
      costPerPort: 3500,
      type: "Ethernet 400G", 
      description: "Очень высокая пропускная способность Ethernet для требовательных задач.",
      recommended: false 
    },
}; 