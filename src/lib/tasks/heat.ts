export const HEAT_INTERVAL_FACTORS = {
  hot: 0.6,
  warm: 0.8,
  neutral: 1,
  cool: 1.3,
} as const;

export function getWateringIntervalFactor(temperature: number): number {
  if (temperature >= 30) return HEAT_INTERVAL_FACTORS.hot;
  if (temperature >= 25) return HEAT_INTERVAL_FACTORS.warm;
  if (temperature >= 10) return HEAT_INTERVAL_FACTORS.neutral;
  return HEAT_INTERVAL_FACTORS.cool;
}

export function getEffectiveWateringInterval(intervalDays: number, temperature: number): number {
  return Math.max(1, Math.round(intervalDays * getWateringIntervalFactor(temperature)));
}
