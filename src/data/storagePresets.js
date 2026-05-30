// Хранилище — май 2026
// Источники: NAND Research (Q2 +70–75% QoQ), DatacenterDisk, Samsung PM1743 pricing
// AI-сервер: ~2.3 TB SSD vs ~960 GB legacy (NAND Research)
export const STORAGE_PRESETS = {
  "nvme-gen5-standard": {
    name: "NVMe Gen5 SSD (Enterprise)",
    costPerGB: 0.17,
    type: "NVMe Gen5",
    description: "Enterprise PCIe Gen5 (Micron 7500 class). +53–58% QoQ Q1 2026. ~$170/TB. Чекпоинты, datasets, GPUDirect.",
    recommended: true,
  },
  "nvme-gen5-high": {
    name: "NVMe Gen5 U.3/E3.S (High-DWPD)",
    costPerGB: 0.28,
    type: "NVMe Gen5 Datacenter",
    description: "Samsung PM1743 / Kioxia CM7 class ~$0.48–0.62/GB list; volume ~$0.28/GB. 3+ DWPD, AI inference I/O.",
    recommended: true,
  },
  "nvme-gen6-high": {
    name: "NVMe Gen6 SSD (Premium)",
    costPerGB: 0.42,
    type: "NVMe Gen6",
    description: "Next-gen PCIe Gen6 datacenter drives. Premium tier, дефицит supply 2026. До 28 GB/s на накопитель.",
    recommended: false,
  },
  "hdd-archive": {
    name: "Nearline HDD 20–30TB (Архив)",
    costPerGB: 0.022,
    type: "SATA HDD",
    description: "Nearline HDD ~$9–15/TB enterprise (+35–46% 2026). Бэкапы, cold storage, старые чекпоинты. Tier-2/3.",
    recommended: false,
  },
};
