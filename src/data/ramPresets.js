// RAM — май 2026
// Источники: NAND Research, SoftwareSeni, TrendForce — server DRAM +88–93% Q1 2026
// 64GB RDIMM projected 2× vs early 2025 by end of 2026
export const RAM_PRESETS = {
  "ddr5-6400": {
    name: "DDR5-6400 RDIMM (Стандарт)",
    costPerGB: 9.0,
    type: "DDR5",
    description: "Server RDIMM PC5-6400. ~$9/GB (май 2026, +90% vs 2024). 64GB модуль ~$576. Turin/Granite Rapids.",
    recommended: true,
  },
  "mrdimm-8800": {
    name: "MRDIMM 8800MT/s",
    costPerGB: 16.0,
    type: "MRDIMM",
    description: "Multiplexed Rank DIMM для Granite Rapids / Xeon 6. ~$16/GB. 2× bandwidth vs DDR5 RDIMM.",
    recommended: true,
  },
  "mrdimm-12800": {
    name: "MRDIMM 12800MT/s (Turin)",
    costPerGB: 22.0,
    type: "MRDIMM",
    description: "AMD Turin MRDIMM 12-channel. Premium tier для memory-bound CPU inference и KV offload.",
    recommended: false,
  },
  "ddr4-3200": {
    name: "DDR4-3200 RDIMM (Legacy/EOL)",
    costPerGB: 7.0,
    type: "DDR4",
    description: "Legacy DDR4 — дефицит, цены выше DDR5 в spot (NAND Research). Только для старых платформ.",
    recommended: false,
  },
};
