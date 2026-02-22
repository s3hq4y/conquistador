import type { StateEffect } from './types';

export class StateCalculator {
  calculate(
    baseValue: number,
    effect: StateEffect,
    currentPercent: number
  ): number {
    switch (effect.type) {
      case 'linear':
        return Math.round(baseValue * (currentPercent / 100));
      case 'threshold':
        const threshold = effect.value ?? 50;
        if (currentPercent < threshold) {
          const minPct = effect.minPercent ?? 50;
          return Math.round(baseValue * Math.max(minPct / 100, currentPercent / 100));
        }
        return baseValue;
      case 'percentage':
        const penalty = (effect.value ?? 100) / 100;
        return Math.round(baseValue * (1 - (1 - currentPercent / 100) * penalty));
      default:
        return baseValue;
    }
  }

  applyStateEffects(
    baseStats: Record<string, number>,
    stateEffects: StateEffect[],
    stateValues: Map<string, number>
  ): Record<string, number> {
    const result = { ...baseStats };

    for (const statKey of Object.keys(result)) {
      const statEffects = stateEffects.filter(e => e.stat === statKey);
      for (const effect of statEffects) {
        const currentPercent = stateValues.get(effect.state) ?? 100;
        result[statKey] = this.calculate(result[statKey], effect, currentPercent);
      }
    }

    return result;
  }
}
