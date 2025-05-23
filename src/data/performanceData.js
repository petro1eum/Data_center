// Матрица экстраполированной производительности (tokens/sec) на основе предоставленных данных
// Источник: Исследование пользователя
export const PERFORMANCE_MATRIX = {
  // LLaMA2
  "llama2-7b": {
    "a100-80gb": { 16: 92, 8: null, 4: 180 },
    "a100-40gb": { 16: 88, 8: null, 4: 171 },
    "h100-80gb": { 16: 230, 8: 400, 4: 450 },
    "h200-141gb": { 16: 322, 8: 550, 4: 630 },
    "b200-208gb": { 16: 552, 8: 700, 4: 1440 }, // Предполагаем B200 из пресетов GPU
    "l40s-48gb": { 16: 64, 8: null, 4: 126 },
    "a800-80gb": { 16: 83, 8: null, 4: 162 },
    "h20-96gb": { 16: 166, 8: 350, 4: 324 }, // Предполагаем H20 из пресетов GPU
    "amd-mi300x": { 16: 304, 8: 520, 4: 594 },
    "amd-mi325x": { 16: 368, 8: 600, 4: 720 },
    "intel-gaudi3": { 16: 180, 8: 300, 4: 400 }, // Оценка Gaudi3
    "google-tpu-v5p": { 16: 200, 8: 380, 4: 420 }, // Оценка TPUv5p
  },
  "llama2-13b": {
    "a100-80gb": { 16: 52.6, 8: null, 4: 110 },
    "a100-40gb": { 16: 50, 8: null, 4: 105 },
    "h100-80gb": { 16: 132, 8: 240, 4: 275 },
    "h200-141gb": { 16: 184, 8: 330, 4: 385 },
    "b200-208gb": { 16: 316, 8: 420, 4: 880 },
    "l40s-48gb": { 16: 37, 8: null, 4: 77 },
    "a800-80gb": { 16: 47, 8: null, 4: 99 },
    "h20-96gb": { 16: 95, 8: 210, 4: 198 },
    "amd-mi300x": { 16: 174, 8: 310, 4: 363 },
    "amd-mi325x": { 16: 210, 8: 350, 4: 440 },
    "intel-gaudi3": { 16: 100, 8: 180, 4: 240 }, // Оценка
    "google-tpu-v5p": { 16: 115, 8: 220, 4: 260 }, // Оценка
  },
  "llama2-70b": {
    "a100-80gb": { 16: null, 8: null, 4: 9 },
    "a100-40gb": { 16: null, 8: null, 4: 9 }, // Нужен тензорный парал. для FP16
    "h100-80gb": { 16: 22, 8: 45, 4: 23 }, // FP16 требует >=2 GPU
    "h200-141gb": { 16: 31, 8: 60, 4: 32 },
    "b200-208gb": { 16: 53, 8: 80, 4: 72 },
    "l40s-48gb": { 16: null, 8: null, 4: null }, // Не хватает памяти
    "a800-80gb": { 16: null, 8: null, 4: 8 },
    "h20-96gb": { 16: null, 8: null, 4: 16 },
    "amd-mi300x": { 16: 29, 8: 55, 4: 30 },
    "amd-mi325x": { 16: 35, 8: 65, 4: 36 },
    "intel-gaudi3": { 16: null, 8: 35, 4: 18 }, // Оценка, FP16 может не влезть
    "google-tpu-v5p": { 16: null, 8: 40, 4: 20 }, // Оценка
  },
  // LLaMA3
  "llama3-8b": {
    "a100-80gb": { 16: 2000, 8: 3800, 4: 5000 }, // FP16 взято из LMSYS H100, масштабировано к A100, FP8/INT4 оценены
    "a100-40gb": { 16: 1900, 8: 3610, 4: 4750 },
    "h100-80gb": { 16: 5000, 8: 9000, 4: 11000 },
    "h200-141gb": { 16: 7000, 8: 12000, 4: 14000 },
    "b200-208gb": { 16: 12000, 8: 15000, 4: 40000 },
    "l40s-48gb": { 16: 1400, 8: 2660, 4: 3500 },
    "a800-80gb": { 16: 1800, 8: 3420, 4: 4500 },
    "h20-96gb": { 16: 3600, 8: 7500, 4: 9000 },
    "amd-mi300x": { 16: 6600, 8: 11000, 4: 13200 },
    "amd-mi325x": { 16: 8000, 8: 13000, 4: 16000 },
    "intel-gaudi3": { 16: 4000, 8: 7000, 4: 9500 }, // Оценка
    "google-tpu-v5p": { 16: 4500, 8: 8500, 4: 10500 }, // Оценка
  },
  "llama3-70b": {
    "a100-80gb": { 16: null, 8: null, 4: 700 }, // FP16/FP8 требует >1 GPU
    "a100-40gb": { 16: null, 8: null, 4: null }, // Не хватает памяти
    "h100-80gb": { 16: 675, 8: 1300, 4: 1700 }, // FP16 на 4xGPU, масштабировано к 1 GPU
    "h200-141gb": { 16: 945, 8: 1800, 4: 2400 },
    "b200-208gb": { 16: 1620, 8: 2200, 4: 5600 },
    "l40s-48gb": { 16: null, 8: null, 4: null }, // Не хватает памяти
    "a800-80gb": { 16: null, 8: null, 4: 630 },
    "h20-96gb": { 16: null, 8: 900, 4: 1260 },
    "amd-mi300x": { 16: 890, 8: 1600, 4: 2240 },
    "amd-mi325x": { 16: 1080, 8: 1900, 4: 2720 },
    "intel-gaudi3": { 16: 500, 8: 1000, 4: 1400 }, // Оценка
    "google-tpu-v5p": { 16: 600, 8: 1200, 4: 1600 }, // Оценка
  },
  // Mixtral
  "mixtral-8x7b": {
    "a100-80gb": { 16: 5800, 8: 10000, 4: 12000 }, // FP16/FP8/INT4 оценки, основаны на FP8 H100 MLPerf
    "a100-40gb": { 16: 5510, 8: 9500, 4: 11400 }, // Требует >=2 GPU
    "h100-80gb": { 16: 14500, 8: 21000, 4: 30000 }, // FP8 из MLPerf, FP16/INT4 оценки
    "h200-141gb": { 16: 20300, 8: 29000, 4: 42000 },
    "b200-208gb": { 16: 34800, 8: 42000, 4: 96000 },
    "l40s-48gb": { 16: null, 8: null, 4: null }, // Требует 2 GPU, > 48GB VRAM
    "a800-80gb": { 16: 5220, 8: 9000, 4: 10800 },
    "h20-96gb": { 16: 10440, 8: 18000, 4: 21600 },
    "amd-mi300x": { 16: 19140, 8: 27000, 4: 39600 },
    "amd-mi325x": { 16: 23200, 8: 31000, 4: 48000 },
    "intel-gaudi3": { 16: 11000, 8: 18000, 4: 25000 }, // Оценка
    "google-tpu-v5p": { 16: 13000, 8: 20000, 4: 28000 }, // Оценка
  },
  // Qwen
  "qwen-72b": {
    "a100-80gb": { 16: 35, 8: 65, 4: 90 }, // Оценка
    "a100-40gb": { 16: null, 8: null, 4: null }, // Не хватает памяти
    "h100-80gb": { 16: 88, 8: 150, 4: 225 },
    "h200-141gb": { 16: 123, 8: 210, 4: 315 },
    "b200-208gb": { 16: 210, 8: 300, 4: 720 },
    "l40s-48gb": { 16: null, 8: null, 4: null },
    "a800-80gb": { 16: 32, 8: 59, 4: 81 },
    "h20-96gb": { 16: 63, 8: 130, 4: 162 },
    "amd-mi300x": { 16: 116, 8: 200, 4: 297 },
    "amd-mi325x": { 16: 140, 8: 240, 4: 360 },
    "intel-gaudi3": { 16: 70, 8: 120, 4: 180 }, // Оценка
    "google-tpu-v5p": { 16: 80, 8: 140, 4: 210 }, // Оценка
  },
  "qwen2-72b": {
    "a100-80gb": { 16: 31, 8: 55, 4: 78 }, // FP16 из AA, остальное оценка
    "a100-40gb": { 16: null, 8: null, 4: null },
    "h100-80gb": { 16: 78, 8: 140, 4: 195 },
    "h200-141gb": { 16: 109, 8: 190, 4: 273 },
    "b200-208gb": { 16: 186, 8: 260, 4: 624 },
    "l40s-48gb": { 16: null, 8: null, 4: null },
    "a800-80gb": { 16: 28, 8: 50, 4: 70 },
    "h20-96gb": { 16: 56, 8: 120, 4: 140 },
    "amd-mi300x": { 16: 102, 8: 180, 4: 257 },
    "amd-mi325x": { 16: 124, 8: 210, 4: 312 },
    "intel-gaudi3": { 16: 60, 8: 110, 4: 160 }, // Оценка
    "google-tpu-v5p": { 16: 70, 8: 130, 4: 185 }, // Оценка
  },
  "qwen2.5-72b": {
    "a100-80gb": { 16: 63, 8: 110, 4: 158 }, // FP16 из AA, остальное оценка
    "a100-40gb": { 16: null, 8: null, 4: null },
    "h100-80gb": { 16: 158, 8: 280, 4: 395 },
    "h200-141gb": { 16: 221, 8: 380, 4: 553 },
    "b200-208gb": { 16: 378, 8: 520, 4: 1264 },
    "l40s-48gb": { 16: null, 8: null, 4: null },
    "a800-80gb": { 16: 57, 8: 99, 4: 142 },
    "h20-96gb": { 16: 113, 8: 240, 4: 284 },
    "amd-mi300x": { 16: 208, 8: 360, 4: 521 },
    "amd-mi325x": { 16: 252, 8: 420, 4: 632 },
    "intel-gaudi3": { 16: 120, 8: 220, 4: 320 }, // Оценка
    "google-tpu-v5p": { 16: 140, 8: 260, 4: 370 }, // Оценка
  },
  "qwen3-235b-a22b": {
    "a100-80gb": { 16: null, 8: null, 4: null }, // Требует >80GB для всех экспертов
    "a100-40gb": { 16: null, 8: null, 4: null },
    "h100-80gb": { 16: null, 8: 650, 4: null }, // Оценка на 8 GPU
    "h200-141gb": { 16: null, 8: 910, 4: null },
    "b200-208gb": { 16: null, 8: 1200, 4: null },
    "l40s-48gb": { 16: null, 8: null, 4: null },
    "a800-80gb": { 16: null, 8: null, 4: null },
    "h20-96gb": { 16: null, 8: 450, 4: null },
    "amd-mi300x": { 16: null, 8: 850, 4: null },
    "amd-mi325x": { 16: null, 8: 1050, 4: null },
    "intel-gaudi3": { 16: null, 8: 500, 4: null }, // Оценка
    "google-tpu-v5p": { 16: null, 8: 600, 4: null }, // Оценка
  },
  // DeepSeek
  "deepseek-67b": {
    "a100-80gb": { 16: 12.5, 8: 23, 4: 31 }, // Оценка на 2хGPU, масштабировано к 1 GPU
    "a100-40gb": { 16: null, 8: null, 4: null }, // Не хватает памяти
    "h100-80gb": { 16: 31, 8: 60, 4: 78 },
    "h200-141gb": { 16: 44, 8: 80, 4: 109 },
    "b200-208gb": { 16: 75, 8: 105, 4: 248 },
    "l40s-48gb": { 16: null, 8: null, 4: null },
    "a800-80gb": { 16: 11, 8: 21, 4: 28 },
    "h20-96gb": { 16: 22, 8: 50, 4: 56 },
    "amd-mi300x": { 16: 41, 8: 75, 4: 102 },
    "amd-mi325x": { 16: 50, 8: 90, 4: 124 },
    "intel-gaudi3": { 16: 25, 8: 50, 4: 65 }, // Оценка
    "google-tpu-v5p": { 16: 28, 8: 55, 4: 70 }, // Оценка
  },
  "deepseek-v3-671b": {
    "a100-80gb": { 16: null, 8: null, 4: null }, // Требует >80GB
    "a100-40gb": { 16: null, 8: null, 4: null },
    "h100-80gb": { 16: null, 8: 60, 4: null }, // Single-stream из MarkTechPost
    "h200-141gb": { 16: null, 8: 85, 4: null },
    "b200-208gb": { 16: null, 8: 150, 4: null },
    "l40s-48gb": { 16: null, 8: null, 4: null },
    "a800-80gb": { 16: null, 8: null, 4: null },
    "h20-96gb": { 16: null, 8: 45, 4: null },
    "amd-mi300x": { 16: null, 8: 75, 4: null },
    "amd-mi325x": { 16: null, 8: 95, 4: null },
    "intel-gaudi3": { 16: null, 8: 50, 4: null }, // Оценка
    "google-tpu-v5p": { 16: null, 8: 55, 4: null }, // Оценка
  },
  // Yi
  "yi-34b": {
    "a100-80gb": { 16: 21.26, 8: 40, 4: 53 }, // FP16 из MLOps, остальное оценка
    "a100-40gb": { 16: 20, 8: 38, 4: 50 },
    "h100-80gb": { 16: 53, 8: 95, 4: 133 },
    "h200-141gb": { 16: 74, 8: 130, 4: 186 },
    "b200-208gb": { 16: 128, 8: 175, 4: 424 },
    "l40s-48gb": { 16: 15, 8: 28, 4: 37 },
    "a800-80gb": { 16: 19, 8: 36, 4: 48 },
    "h20-96gb": { 16: 38, 8: 80, 4: 95 },
    "amd-mi300x": { 16: 70, 8: 125, 4: 175 },
    "amd-mi325x": { 16: 85, 8: 150, 4: 212 },
    "intel-gaudi3": { 16: 42, 8: 80, 4: 110 }, // Оценка
    "google-tpu-v5p": { 16: 48, 8: 90, 4: 125 }, // Оценка
  },
  // QwQ
  "qwq-32b": {
    "a100-80gb": { 16: 12.3, 8: 23, 4: 31 }, // Из vLLM concurrency test (615 tok/s / 50 users)
    "a100-40gb": { 16: 11.7, 8: 22, 4: 29 },
    "h100-80gb": { 16: 31, 8: 55, 4: 78 },
    "h200-141gb": { 16: 43, 8: 75, 4: 109 },
    "b200-208gb": { 16: 74, 8: 100, 4: 248 },
    "l40s-48gb": { 16: 8.6, 8: 16, 4: 22 },
    "a800-80gb": { 16: 11, 8: 21, 4: 28 },
    "h20-96gb": { 16: 22, 8: 45, 4: 56 },
    "amd-mi300x": { 16: 41, 8: 70, 4: 102 },
    "amd-mi325x": { 16: 49, 8: 85, 4: 124 },
    "intel-gaudi3": { 16: 25, 8: 45, 4: 65 }, // Оценка
    "google-tpu-v5p": { 16: 28, 8: 50, 4: 75 }, // Оценка
  },
  // Добавьте сюда больше данных по мере необходимости
  // ...

  // --- Плейсхолдеры и ОЦЕНОЧНЫЕ данные для добавленных моделей ---
  // !!! ВНИМАНИЕ: Большинство этих значений являются грубыми оценками !!!
  'gemma2-9b': {
    // Оценка: Чуть быстрее Llama 3 8B
    'l40s': { 16: 280, 8: 450, estimated: true }, // Оценка
    'h100-pcie': { 16: 400, 8: 650, estimated: true }, // Оценка
    'rtx4090': { 16: 250, 8: 400, estimated: true }, // Оценка
  },
  'qwen3-8b': {
    // Оценка: Схоже с Llama 3 8B
    'l40s': { 16: 260, 8: 420, estimated: true }, // Оценка
    'h100-pcie': { 16: 380, 8: 620, estimated: true }, // Оценка
  },
  'qwen3-32b': {
    // Оценка: Между Llama 2 13B и Mixtral, ближе к Mixtral?
    'l40s': { 16: 100, 8: 160, estimated: true }, // Оценка
    'h100-pcie': { 16: 150, 8: 240, estimated: true }, // Оценка
  },
  'deepseek-r1-7b': {
    // Оценка: Очень неопределенно, предположим схоже с Llama 2 7B
    'l40s': { 16: 200, 8: 320, estimated: true }, // Оценка
  },
  'deepseek-r1-32b': {
    // Оценка: Очень неопределенно, предположим схоже с Llama 2 13B
    'l40s': { 16: 90, 8: 150, estimated: true }, // Оценка
  },
  'llama3_3-70b': {
    // Оценка: Схоже или чуть лучше Llama 3.1 70B
    'l40s': { 16: 75, 8: 120 }, // Используем данные Llama 3.1 70B как базу
    'h100-pcie': { 16: 110, 8: 180 }, // Используем данные Llama 3.1 70B как базу
  },
  'phi4-14b': {
    // Оценка: Эффективнее Llama 2 13B, возможно как Mixtral?
    'l40s': { 16: 180, 8: 290, estimated: true }, // Оценка
    'rtx4090': { 16: 160, 8: 260, estimated: true }, // Оценка
  },
  'llama3_2-3b': {
    // Оценка: Значительно быстрее Llama 3 8B
    'l40s': { 16: 450, 8: 700, estimated: true }, // Оценка
    'rtx4090': { 16: 400, 8: 650, estimated: true }, // Оценка
  },
  'llama3_1-405b': {
    // Данные из веб-поиска + оценка
    'h100-sxm': { 16: 18, 8: 30, estimated: true }, // Примерные цифры для H100
    'h100-pcie': { 16: 15, 8: 25, estimated: true }, // Оценка ниже SXM
    'l40s': { 16: 8, 8: 13, estimated: true }, // Оценка очень низкая
    // Эта модель очень требовательна
  },
  'qwen2_5-7b': {
    // Оценка: Схоже с Qwen3 8B / Llama 3 8B
    'l40s': { 16: 250, 8: 400, estimated: true }, // Оценка
  },
  'qwen2_5-32b': {
    // Оценка: Схоже с Qwen3 32B
    'l40s': { 16: 100, 8: 160, estimated: true }, // Оценка
  },
  'qwen2_5-coder-7b': {
    // Оценка: Как qwen2.5-7b
    'l40s': { 16: 250, 8: 400, estimated: true }, // Оценка
  },
  // --- Конец добавленных моделей ---
};

// Относительная производительность GPU (база L40S = 1.0)
export const GPU_RELATIVE_PERFORMANCE = {
  'l40s': 1.0,
  'h100-sxm': 2.2, // Оценка
  'h100-pcie': 1.8, // Оценка
  'a100-80gb': 1.2, // Оценка
  'a100-40gb': 1.0, // Оценка (схоже с L40S?)
  'rtx4090': 0.9, // Оценка (немного медленнее L40S в проде?)
  'mi300x': 2.5, // Оценка (очень высокая)
  'b200-hbm3e': 4.0, // Оценка (очень высокая)
  'h20-china': 0.5, // Оценка (значительно ниже H100)
  'via-zhaoxin-big-island': 0.1, // Очень грубая оценка (низкая производительность)
  'default': 0.1 // Для неизвестных GPU
}; 