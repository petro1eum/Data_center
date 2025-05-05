// src/data/ramPresets.js
export const RAM_PRESETS = {
    "ddr4-3200": { 
      name: "DDR4 3200MHz", 
      costPerGB: 8, // Примерная стоимость за ГБ
      type: "DDR4", 
      description: "Стандартная серверная память DDR4.",
      recommended: false 
    },
    "ddr5-4800": { 
      name: "DDR5 4800MHz", 
      costPerGB: 10,
      type: "DDR5", 
      description: "Более быстрая память DDR5, стандарт для новых платформ.",
      recommended: true 
    },
    "ddr5-5600+": { 
      name: "DDR5 5600MHz+", 
      costPerGB: 12,
      type: "DDR5 High-Speed", 
      description: "Высокоскоростная память DDR5 для максимальной производительности.",
      recommended: false 
    },
}; 