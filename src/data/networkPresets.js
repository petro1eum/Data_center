// Сеть — май 2026
// costPerPort = стоимость одного NIC-порта на сервере (HCA/ConnectX, без коммутатора)
// Источники: Colfax Direct, NADDOD, ITCreations, Hedgehog SN5600 TCO analysis
export const NETWORK_PRESETS = {
  "eth-100g": {
    name: "Ethernet 100GbE (Legacy)",
    costPerPort: 450,
    type: "Ethernet 100G",
    description: "ConnectX-5/6 QSFP56 ~$800–900 за dual-port ($400–450/порт). Устарело для AI-кластеров >8 GPU.",
    recommended: false,
  },
  "eth-400g": {
    name: "Ethernet 400GbE (RoCEv2)",
    costPerPort: 1950,
    type: "Ethernet 400G",
    description: "ConnectX-7 400GbE single-port OSFP ~$1,745–2,200 (Colfax/NADDOD). Базовый RoCE для средних кластеров.",
    recommended: false,
  },
  "eth-800g-spectrum": {
    name: "Spectrum-X Ethernet 800GbE",
    costPerPort: 2400,
    type: "Ethernet 800G",
    description: "ConnectX-8 SuperNIC 800G ~$1,779–2,795/порт. SN5600 switch ~$1,500/порт (amort.). NVIDIA-validated AI fabric.",
    recommended: true,
  },
  "ib-ndr-400g": {
    name: "InfiniBand NDR 400Gb/s",
    costPerPort: 2100,
    type: "InfiniBand NDR 400G",
    description: "ConnectX-7 NDR 400G IB/Ethernet ~$1,599–2,241/порт. Quantum-2, проверенная fabric для GPU-кластеров.",
    recommended: false,
  },
  "ib-xdr-800g": {
    name: "InfiniBand XDR 800Gb/s (Quantum-3)",
    costPerPort: 2650,
    type: "InfiniBand XDR 800G",
    description: "ConnectX-8 XDR 800G ~$2,300–2,800/порт. Quantum-X800 Q3400 switch. Для trillion-param training/inference.",
    recommended: true,
  },
};
