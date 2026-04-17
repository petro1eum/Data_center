// src/data/networkPresets.js
export const NETWORK_PRESETS = {
    "eth-400g": { 
      name: "Ethernet 400GbE", 
      costPerPort: 1200,
      type: "Ethernet 400G", 
      description: "Базовая сеть для средних AI-кластеров. Подходит для инференса и дата-препроцессинга.",
      recommended: false 
    },
    "eth-800g-spectrum": { 
      name: "Spectrum-X Ethernet 800GbE", 
      costPerPort: 2500,
      type: "Ethernet 800G", 
      description: "Оптимизированный AI-Ethernet (NVIDIA Spectrum-X) со сверхвысокой пропускной способностью 800G.",
      recommended: true 
    },
    "ib-ndr-400g": { 
      name: "InfiniBand NDR 400Gb/s", 
      costPerPort: 1800,
      type: "InfiniBand NDR 400G", 
      description: "Надёжная сеть предыдущего поколения (Quantum-2) для GPU-кластеров.",
      recommended: false 
    },
     "ib-xdr-800g": { 
      name: "InfiniBand XDR 800Gb/s (Quantum-3)", 
      costPerPort: 3200,
      type: "InfiniBand XDR 800G", 
      description: "Ультра-скоростная сеть последнего поколения (Quantum-3) для распределённого обучения масштаба ЦОД.",
      recommended: true 
    },
    "eth-100g": { 
      name: "Ethernet 100GbE (Устаревшее)", 
      costPerPort: 300,
      type: "Ethernet 100G", 
      description: "Устаревшая инфраструктура, может стать ciddi узким местом для кластеров.",
      recommended: false 
    },
}; 