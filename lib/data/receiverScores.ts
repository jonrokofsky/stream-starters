export type ReceiverScoreRow = Record<string, string | number | null | undefined>;

type Metric = readonly [string, number];

export const RECEIVER_EFFICIENCY_METRICS: readonly Metric[] = [
  ["YPRR", 0.3],
  ["YAC/Rec", 0.15],
  ["RecYds/G", 0.18333],
  ["YPR", 0.18333],
  ["YPT", 0.18333],
];

export const RECEIVER_OPPORTUNITY_METRICS: readonly Metric[] = [
  ["Routes/G", 0.15],
  ["Target Share", 0.2],
  ["Targets/Route Run", 0.15],
  ["i20/G", 0.1],
  ["i10/G", 0.1],
  ["Team Rec Yards %", 0.15],
  ["Rec TD", 0.15],
];

export function receiverNumber(value: ReceiverScoreRow[string]): number | null {
  if (value == null || String(value).trim() === "" || value === "-") return null;
  const text = String(value).trim().replace(/,/g, "");
  const parsed = Number(text.replace(/%$/, ""));
  if (!Number.isFinite(parsed)) return null;
  return text.endsWith("%") ? parsed / 100 : parsed;
}

export function calculateReceiverScores(rows: readonly ReceiverScoreRow[]) {
  const pools = new Map<string, number[]>();

  function percentile(row: ReceiverScoreRow, key: string) {
    let pool = pools.get(key);
    if (!pool) {
      pool = rows
        .map((item) => receiverNumber(item[key]))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
      pools.set(key, pool);
    }
    const value = receiverNumber(row[key]);
    if (value === null || pool.length < 2) return null;
    return pool.indexOf(value) / (pool.length - 1) * 100;
  }

  function weighted(row: ReceiverScoreRow, metrics: readonly Metric[]) {
    const available = metrics
      .map(([key, weight]) => ({ percentile: percentile(row, key), weight }))
      .filter((item): item is { percentile: number; weight: number } => item.percentile !== null);
    if (available.length < 3) return null;
    const weightTotal = available.reduce((sum, item) => sum + item.weight, 0);
    return Math.round(available.reduce((sum, item) => sum + item.percentile * item.weight, 0) / weightTotal);
  }

  return rows.map((row) => ({
    efficiency: weighted(row, RECEIVER_EFFICIENCY_METRICS),
    opportunity: weighted(row, RECEIVER_OPPORTUNITY_METRICS),
  }));
}
