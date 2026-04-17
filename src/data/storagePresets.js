// src/data/storagePresets.js
export const STORAGE_PRESETS = {
    "nvme-gen5-standard": { 
      name: "NVMe Gen5 SSD (Стандарт)", 
      costPerGB: 0.10, 
      type: "NVMe Gen5", 
      description: "Базовый индустриальный стандарт для HDFS и локального кеширования чекпоинтов.",
      recommended: true 
    },
    "nvme-gen5-high": { 
      name: "NVMe Gen5 SSD (Высокопроизв. U.3/E3.S)", 
      costPerGB: 0.18, 
      type: "NVMe Gen5 Datacenter", 
      description: "Накопители с высокой выносливостью (DWPD) для интенсивного чтения датасетов при обучении (GPUDirect Storage).",
      recommended: true 
    },
    "nvme-gen6-high": { 
      name: "NVMe Gen6 SSD (Next-Gen)", 
      costPerGB: 0.35, 
      type: "NVMe Gen6", 
      description: "Сверхбыстрые накопители следующего поколения (до 28 ГБ/с на диск) для элитных сборок.",
      recommended: false 
    },
    "hdd-archive": {
      name: "Nearline HDD 20TB+ (Архив)",
      costPerGB: 0.015,
      type: "SATA HDD",
      description: "Дешёвое хранилище для бэкапов, сырых исходников данных и старых чекпоинтов.",
      recommended: false
    }
};