import { calculateReceiverScores } from "./receiverScores.ts";

export type ReceiverWeeklyRow = Record<string, string>;

export type ReceiverWeeklySnapshot = {
  week: number;
  copiedAt: string;
  population: { WR: number; TE: number };
  rows: ReceiverWeeklyRow[];
};

const countFields = [
  "G", "Targets", "Rec", "Rec Yards", "Rec TD", "i10", "i20 Targets", "FUM", "FP",
  "Routes Run", "Receptions", "Rec. Yards", "Touchdowns", "YAC", "Total EPA", "Impact Plays",
] as const;

const value = (row: ReceiverWeeklyRow | undefined, key: string) => {
  if (!row || row[key] == null || row[key] === "" || row[key] === "-") return null;
  const parsed = Number(String(row?.[key] ?? "").replace(/[%,$]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const difference = (latest: ReceiverWeeklyRow, baseline: ReceiverWeeklyRow | undefined, key: string) => {
  const current = value(latest, key);
  const prior = value(baseline, key);
  return current === null || prior === null ? null : Math.max(0, current - prior);
};

function rateFromCount(latest: ReceiverWeeklyRow, baseline: ReceiverWeeklyRow | undefined, countKey: string, rateKey: string) {
  const latestCount = value(latest, countKey);
  const baselineCount = value(baseline, countKey);
  const latestRate = value(latest, rateKey);
  const baselineRate = value(baseline, rateKey);
  if (latestCount === null || baselineCount === null || latestRate === null || baselineRate === null) return null;
  const latestPool = latestRate > 0 ? latestCount / (latestRate / 100) : 0;
  const baselinePool = baselineRate > 0 ? baselineCount / (baselineRate / 100) : 0;
  const periodPool = latestPool - baselinePool;
  const periodCount = latestCount - baselineCount;
  return periodPool > 0 && periodCount >= 0 ? periodCount / periodPool * 100 : 0;
}

export function buildReceiverPeriodSnapshot(
  end: ReceiverWeeklySnapshot,
  baseline: ReceiverWeeklySnapshot,
): ReceiverWeeklySnapshot {
  const baselineRows = new Map(baseline.rows.map((row) => [`${row.POS}:${row.Name}`, row]));
  const rows = end.rows.map((latest) => {
    const prior = baselineRows.get(`${latest.POS}:${latest.Name}`);
    if (!prior) return null;
    const row: ReceiverWeeklyRow = { ...latest };
    for (const key of countFields) {
      const periodValue = difference(latest, prior, key);
      row[key] = periodValue === null ? "" : String(periodValue);
    }

    const games = value(row, "G") ?? 0;
    const targets = value(row, "Targets") ?? 0;
    const receptions = value(row, "Rec") ?? 0;
    const yards = value(row, "Rec Yards") ?? 0;
    const routes = value(row, "Routes Run");
    const yac = value(row, "YAC");
    const fantasyPoints = value(row, "FP") ?? 0;

    row["Targets/G"] = games ? (targets / games).toFixed(2) : "";
    row["Routes/G"] = games && routes !== null ? (routes / games).toFixed(2) : "";
    row["i10/G"] = games ? ((value(row, "i10") ?? 0) / games).toFixed(2) : "";
    row["i20/G"] = games ? ((value(row, "i20 Targets") ?? 0) / games).toFixed(2) : "";
    row["RecYds/G"] = games ? (yards / games).toFixed(1) : "";
    row.YPR = receptions ? (yards / receptions).toFixed(2) : "";
    row.YPT = targets ? (yards / targets).toFixed(2) : "";
    row["Catch %"] = targets ? `${(receptions / targets * 100).toFixed(2)}%` : "";
    row["FP/G"] = games ? (fantasyPoints / games).toFixed(1) : "";
    row["Targets/Route Run"] = routes ? (targets / routes).toFixed(2) : "";
    row.YPRR = routes ? (yards / routes).toFixed(2) : "";
    row["YAC/Rec"] = receptions && yac !== null ? (yac / receptions).toFixed(2) : "";
    for (const [countKey, rateKey] of [["Targets", "Target Share"], ["Rec Yards", "Team Rec Yards %"], ["Rec TD", "Team TD %"]] as const) {
      const rate = rateFromCount(latest, prior, countKey, rateKey);
      row[rateKey] = rate === null ? "" : `${rate.toFixed(2)}%`;
    }
    return row;
  }).filter((row): row is ReceiverWeeklyRow => row !== null && (value(row, "G") ?? 0) > 0);

  for (const position of ["WR", "TE"]) {
    const group = rows.filter((row) => row.POS === position);
    const scores = calculateReceiverScores(group);
    group.forEach((row, index) => {
      row["Efficiency Grade"] = scores[index].efficiency === null ? "" : String(scores[index].efficiency);
      row["Opportunity Grade"] = scores[index].opportunity === null ? "" : String(scores[index].opportunity);
    });
  }

  return {
    week: end.week,
    copiedAt: end.copiedAt,
    population: {
      WR: rows.filter((row) => row.POS === "WR").length,
      TE: rows.filter((row) => row.POS === "TE").length,
    },
    rows,
  };
}
