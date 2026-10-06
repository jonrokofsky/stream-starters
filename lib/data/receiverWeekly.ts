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
  const parsed = Number(String(row?.[key] ?? "").replace(/[%,$]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const difference = (latest: ReceiverWeeklyRow, baseline: ReceiverWeeklyRow | undefined, key: string) =>
  Math.max(0, value(latest, key) - value(baseline, key));

function rateFromCount(latest: ReceiverWeeklyRow, baseline: ReceiverWeeklyRow | undefined, countKey: string, rateKey: string) {
  const latestCount = value(latest, countKey);
  const baselineCount = value(baseline, countKey);
  const latestRate = value(latest, rateKey);
  const baselineRate = value(baseline, rateKey);
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
    const row: ReceiverWeeklyRow = { ...latest };
    for (const key of countFields) row[key] = String(difference(latest, prior, key));

    const games = value(row, "G");
    const targets = value(row, "Targets");
    const receptions = value(row, "Rec");
    const yards = value(row, "Rec Yards");
    const routes = value(row, "Routes Run");
    const yac = value(row, "YAC");
    const fantasyPoints = value(row, "FP");

    row["Targets/G"] = games ? (targets / games).toFixed(2) : "";
    row["Routes/G"] = games && routes ? (routes / games).toFixed(2) : "";
    row["i10/G"] = games ? (value(row, "i10") / games).toFixed(2) : "";
    row["i20/G"] = games ? (value(row, "i20 Targets") / games).toFixed(2) : "";
    row["RecYds/G"] = games ? (yards / games).toFixed(1) : "";
    row.YPR = receptions ? (yards / receptions).toFixed(2) : "";
    row.YPT = targets ? (yards / targets).toFixed(2) : "";
    row["Catch %"] = targets ? `${(receptions / targets * 100).toFixed(2)}%` : "";
    row["FP/G"] = games ? (fantasyPoints / games).toFixed(1) : "";
    row["Targets/Route Run"] = routes ? (targets / routes).toFixed(2) : "";
    row.YPRR = routes ? (yards / routes).toFixed(2) : "";
    row["YAC/Rec"] = receptions ? (yac / receptions).toFixed(2) : "";
    row["Target Share"] = `${rateFromCount(latest, prior, "Targets", "Target Share").toFixed(2)}%`;
    row["Team Rec Yards %"] = `${rateFromCount(latest, prior, "Rec Yards", "Team Rec Yards %").toFixed(2)}%`;
    row["Team TD %"] = `${rateFromCount(latest, prior, "Rec TD", "Team TD %").toFixed(2)}%`;
    return row;
  }).filter((row) => value(row, "G") > 0);

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
