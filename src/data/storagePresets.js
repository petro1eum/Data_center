// src/data/storagePresets.js
export const STORAGE_PRESETS = {
    "nvme-gen4-standard": { 
      name: "NVMe Gen4 SSD (Стандарт)", 
      costPerGB: 0.15, // Примерная стоимость за ГБ
      type: "NVMe Gen4", 
      description: "Стандартные NVMe SSD 4-го поколения. Хороший баланс скорости и цены.",
      recommended: true 
    },
    "nvme-gen5-high": { 
      name: "NVMe Gen5 SSD (Высокопроизв.)", 
      costPerGB: 0.25, 
      type: "NVMe Gen5", 
      description: "Новейшие NVMe SSD 5-го поколения для максимальной скорости чтения/записи.",
      recommended: false 
    },
    "nvme-gen4-mixed": { 
      name: "NVMe Gen4 SSD (Mixed-Use)", 
      costPerGB: 0.20, 
      type: "NVMe Gen4 Mixed-Use",
      description: "Накопители с повышенной выносливостью для смешанных нагрузок чтения/записи.",
      recommended: false 
    },
}; 