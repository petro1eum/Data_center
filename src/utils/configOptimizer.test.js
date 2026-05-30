import { describe, it, expect } from 'vitest';
import {
  pickOptimalConfig,
  pickCheapestConfigs,
  isSameHardwareConfig,
  filterAcceptableResults,
  filterWorkableResults,
  OPTIMIZATION_GOALS,
  GOAL_WEIGHTS,
  normalizeMinMax,
  computeScalarScores,
  dominates,
  findParetoFrontier,
} from './configOptimizer.js';
import { MOCK_CONFIG_RESULTS } from '../test/fixtures.js';

describe('pickOptimalConfig by goal', () => {
  it('quality: highest rating, then lowest TCO', () => {
    const picked = pickOptimalConfig(MOCK_CONFIG_RESULTS, 'quality');
    expect(picked.gpuKey).toBe('balanced-gpu');
    expect(picked.ratingScore).toBe(55);
  });

  it('price: lowest TCO among acceptable (≥40)', () => {
    const picked = pickOptimalConfig(MOCK_CONFIG_RESULTS, 'price');
    expect(picked.gpuKey).toBe('cheap-gpu');
    expect(picked.fiveYearTco).toBe(60_000);
    expect(picked.ratingScore).toBeGreaterThanOrEqual(40);
  });

  it('speed: highest throughput among acceptable', () => {
    const picked = pickOptimalConfig(MOCK_CONFIG_RESULTS, 'speed');
    expect(picked.gpuKey).toBe('fast-gpu');
    expect(picked.totalEffectiveTokensPerSec).toBe(8000);
  });

  it('falls back to best workable when no acceptable configs', () => {
    const onlyBad = [
      { ...MOCK_CONFIG_RESULTS[3], ratingScore: 25 },
      { ...MOCK_CONFIG_RESULTS[2], ratingScore: 35, ratingLabel: 'Неэффективная' },
    ];
    const picked = pickOptimalConfig(onlyBad, 'quality');
    expect(picked).not.toBeNull();
    expect(picked.gpuKey).toBe('cheap-gpu');
    expect(picked.ratingScore).toBe(35);
  });

  it('defaults to quality for unknown goal', () => {
    const picked = pickOptimalConfig(MOCK_CONFIG_RESULTS, 'unknown');
    expect(picked.gpuKey).toBe('balanced-gpu');
  });
});

describe('pickCheapestConfigs', () => {
  it('returns cheapest workable including low-rated', () => {
    const top = pickCheapestConfigs(MOCK_CONFIG_RESULTS, 2);
    expect(top).toHaveLength(2);
    expect(top[0].gpuKey).toBe('bad-gpu');
    expect(top[1].gpuKey).toBe('cheap-gpu');
  });
});

describe('isSameHardwareConfig', () => {
  it('normalizes precision comparison', () => {
    expect(isSameHardwareConfig(
      { gpuKey: 'a', serverKey: 'b', precision: '8' },
      { gpuKey: 'a', serverKey: 'b', precision: 8 },
    )).toBe(true);
    expect(isSameHardwareConfig(
      { gpuKey: 'a', serverKey: 'b', precision: 8 },
      { gpuKey: 'a', serverKey: 'c', precision: 8 },
    )).toBe(false);
  });
});

describe('filterAcceptableResults', () => {
  it('excludes critical labels and score < 40', () => {
    const withCritical = [
      ...MOCK_CONFIG_RESULTS,
      { ratingLabel: 'Ошибка VRAM', ratingScore: 0, fiveYearTco: 1 },
    ];
    const acceptable = filterAcceptableResults(withCritical);
    expect(acceptable.every((r) => r.ratingScore >= 40)).toBe(true);
    expect(acceptable.some((r) => r.gpuKey === 'bad-gpu')).toBe(false);
  });
});

describe('OPTIMIZATION_GOALS', () => {
  it('defines price, speed, quality', () => {
    expect(Object.keys(OPTIMIZATION_GOALS).sort()).toEqual(['price', 'quality', 'speed']);
  });

  it('GOAL_WEIGHTS sum to 1 for each goal', () => {
    for (const goal of Object.keys(GOAL_WEIGHTS)) {
      const w = GOAL_WEIGHTS[goal];
      expect(w.cost + w.throughput + w.quality).toBeCloseTo(1, 5);
    }
  });
});

describe('MCDM: normalizeMinMax', () => {
  it('maps min→0 max→1 for maximize criterion', () => {
    expect(normalizeMinMax([10, 20, 30])).toEqual([0, 0.5, 1]);
  });

  it('inverts for minimize criterion', () => {
    expect(normalizeMinMax([100, 200], true)).toEqual([1, 0]);
  });

  it('returns 1 for equal values', () => {
    expect(normalizeMinMax([5, 5, 5])).toEqual([1, 1, 1]);
  });
});

describe('MCDM: Pareto frontier', () => {
  it('dominates detects strict improvement on one axis', () => {
    const cheap = { fiveYearTco: 50_000, totalEffectiveTokensPerSec: 3000, ratingScore: 50 };
    const fast = { fiveYearTco: 100_000, totalEffectiveTokensPerSec: 8000, ratingScore: 50 };
    expect(dominates(cheap, fast)).toBe(false);
    expect(dominates(fast, cheap)).toBe(false);
  });

  it('findParetoFrontier excludes dominated points', () => {
    const a = { gpuKey: 'a', fiveYearTco: 60_000, totalEffectiveTokensPerSec: 3000, ratingScore: 45 };
    const b = { gpuKey: 'b', fiveYearTco: 80_000, totalEffectiveTokensPerSec: 8000, ratingScore: 45 };
    const c = { gpuKey: 'c', fiveYearTco: 100_000, totalEffectiveTokensPerSec: 2000, ratingScore: 45 };
    const frontier = findParetoFrontier([a, b, c]);
    expect(frontier.map((x) => x.gpuKey).sort()).toEqual(['a', 'b']);
  });
});

describe('MCDM: computeScalarScores', () => {
  it('price goal favors lower TCO when ratings equal', () => {
    const pool = [
      { fiveYearTco: 100_000, totalEffectiveTokensPerSec: 5000, ratingScore: 50 },
      { fiveYearTco: 60_000, totalEffectiveTokensPerSec: 5000, ratingScore: 50 },
    ];
    const scored = computeScalarScores(pool, GOAL_WEIGHTS.price);
    expect(scored[1].scalarScore).toBeGreaterThan(scored[0].scalarScore);
  });

  it('speed goal favors higher throughput when costs equal', () => {
    const pool = [
      { fiveYearTco: 80_000, totalEffectiveTokensPerSec: 3000, ratingScore: 50 },
      { fiveYearTco: 80_000, totalEffectiveTokensPerSec: 9000, ratingScore: 50 },
    ];
    const scored = computeScalarScores(pool, GOAL_WEIGHTS.speed);
    expect(scored[1].scalarScore).toBeGreaterThan(scored[0].scalarScore);
  });
});

describe('compareByGoal tie-breakers', () => {
  const tieTco = [
    { gpuKey: 'a', fiveYearTco: 100_000, ratingScore: 50, totalEffectiveTokensPerSec: 5000 },
    { gpuKey: 'b', fiveYearTco: 100_000, ratingScore: 55, totalEffectiveTokensPerSec: 4000 },
  ];

  it('price: same TCO → higher rating wins', () => {
    expect(pickOptimalConfig(tieTco, 'price').gpuKey).toBe('b');
  });

  const tieSpeed = [
    { gpuKey: 'fast', fiveYearTco: 200_000, ratingScore: 45, totalEffectiveTokensPerSec: 9000 },
    { gpuKey: 'fast2', fiveYearTco: 150_000, ratingScore: 50, totalEffectiveTokensPerSec: 9000 },
  ];

  it('speed: same tok/s → higher rating, then lower TCO', () => {
    expect(pickOptimalConfig(tieSpeed, 'speed').gpuKey).toBe('fast2');
  });

  const tieQuality = [
    { gpuKey: 'q1', fiveYearTco: 120_000, ratingScore: 60, totalEffectiveTokensPerSec: 3000 },
    { gpuKey: 'q2', fiveYearTco: 90_000, ratingScore: 60, totalEffectiveTokensPerSec: 2500 },
  ];

  it('quality: same rating → lower TCO wins', () => {
    expect(pickOptimalConfig(tieQuality, 'quality').gpuKey).toBe('q2');
  });
});

describe('filterWorkableResults', () => {
  it('excludes critical labels but keeps low scores', () => {
    const mixed = [
      { ratingLabel: 'Компромиссная', ratingScore: 25 },
      { ratingLabel: 'Ошибка VRAM', ratingScore: 0 },
      { ratingLabel: 'Нерабочая', ratingScore: 5 },
    ];
    const workable = filterWorkableResults(mixed);
    expect(workable).toHaveLength(1);
    expect(workable[0].ratingScore).toBe(25);
  });
});
