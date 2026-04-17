// src/data/ramPresets.js
export const RAM_PRESETS = {
    "ddr5-6400": { 
      name: "DDR5 6400MT/s (Стандарт)", 
      costPerGB: 4.5,
      type: "DDR5", 
      description: "Текущий серверный стандарт для современных платформ (AMD Turin, Intel Granite Rapids).",
      recommended: true 
    },
    "mrdimm-8800": { 
      name: "MRDIMM 8800MT/s (Высокоскоростная)", 
      costPerGB: 9.0,
      type: "MRDIMM", 
      description: "Мультиплексированная память нового поколения, кратно увеличивающая пропускную способность для CPU-инференса.",
      recommended: true 
    },
    "ddr6-10600": { 
      name: "DDR6 10600MT/s (Next-Gen)", 
      costPerGB: 15.0,
      type: "DDR6", 
      description: "Новейший стандарт памяти, доступен в премиальных дата-центровых сборках.",
      recommended: false 
    },
    "ddr4-3200": { 
      name: "DDR4 3200MT/s (Legacy)", 
      costPerGB: 3.5,
      type: "DDR4", 
      description: "Устаревшая память, сильно ограничивает производительность системы.",
      recommended: false 
    },
};