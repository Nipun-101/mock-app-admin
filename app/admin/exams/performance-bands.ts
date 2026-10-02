export const DEFAULT_PERFORMANCE_BANDS = [
  { key: "needs_improvement" as const, minPercent: 0 },
  { key: "good" as const, minPercent: 40 },
  { key: "very_good" as const, minPercent: 70 },
  { key: "excellent" as const, minPercent: 85 },
];

export interface ResultCutoffFields {
  resultGood: number;
  resultVeryGood: number;
  resultExcellent: number;
}

export function buildPerformanceBands(cutoffs: ResultCutoffFields) {
  return [
    { key: "needs_improvement" as const, minPercent: 0 },
    { key: "good" as const, minPercent: cutoffs.resultGood },
    { key: "very_good" as const, minPercent: cutoffs.resultVeryGood },
    { key: "excellent" as const, minPercent: cutoffs.resultExcellent },
  ];
}

export function cutoffsFromBands(
  bands?: { key: string; minPercent: number }[] | null
): ResultCutoffFields {
  const byKey = new Map((bands ?? []).map((band) => [band.key, band.minPercent]));
  return {
    resultGood: byKey.get("good") ?? DEFAULT_PERFORMANCE_BANDS[1].minPercent,
    resultVeryGood: byKey.get("very_good") ?? DEFAULT_PERFORMANCE_BANDS[2].minPercent,
    resultExcellent: byKey.get("excellent") ?? DEFAULT_PERFORMANCE_BANDS[3].minPercent,
  };
}
