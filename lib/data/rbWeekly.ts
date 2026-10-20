import { calculateRbScores } from "./rbScores.ts";

export type RbWeeklyRow = Record<string, string>;
export type RbWeeklySnapshot = { week: number; copiedAt: string; rows: RbWeeklyRow[] };

const countFields = [
  "G", "ATT", "RuYds", "RuTD", "Rush FUM", "Targets", "Rec", "Rec Yards",
  "Rec. TD", "Rec FUM", "Weighted Opp.", "FP", "Total TD", "Ins. 5 Carries",
  "Ins. 10 Carries", "Ins. 10 Rec.",
] as const;
const gainRateFields = ["1+ RuYd%", "3+ RuYd%", "5+ RuYd%", "10+ RuYd%", "15+ RuYd%", "20+ RuYd%", "30+ RuYd%"] as const;

const value = (row: RbWeeklyRow | undefined, key: string) => {
  if (!row || row[key] == null || row[key] === "" || row[key] === "-") return null;
  const parsed = Number(String(row[key]).replace(/[%,$]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const difference = (latest: RbWeeklyRow, baseline: RbWeeklyRow, key: string) => {
  const current = value(latest, key);
  const prior = value(baseline, key);
  return current === null || prior === null ? null : Math.max(0, current - prior);
};

function rateFromCount(latest: RbWeeklyRow, baseline: RbWeeklyRow, countKey: string, rateKey: string) {
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

export function buildRbPeriodSnapshot(latest: RbWeeklySnapshot, baseline: RbWeeklySnapshot, startWeek: number): RbWeeklySnapshot {
  const baselineByName = new Map(baseline.rows.map((row) => [row.Name, row]));
  const rows = latest.rows.map((latestRow) => {
    const baselineRow = baselineByName.get(latestRow.Name);
    if (!baselineRow) return null;
    const row: RbWeeklyRow = { ...latestRow };
    for (const key of countFields) {
      const periodValue = difference(latestRow, baselineRow, key);
      row[key] = periodValue === null ? "" : String(periodValue);
    }

    const games = value(row, "G") ?? 0;
    const attempts = value(row, "ATT") ?? 0;
    const rushYards = value(row, "RuYds") ?? 0;
    const targets = value(row, "Targets") ?? 0;
    const receptions = value(row, "Rec") ?? 0;
    const receivingYards = value(row, "Rec Yards") ?? 0;
    const fantasyPoints = value(row, "FP") ?? 0;
    const weightedOpportunity = value(row, "Weighted Opp.") ?? 0;

    row["RuYds/G"] = games ? String(rushYards / games) : "-";
    row["RuYds/Rush"] = attempts ? String(rushYards / attempts) : "-";
    row["RecYds/G"] = games ? String(receivingYards / games) : "-";
    row["RecYds/Rec"] = receptions ? String(receivingYards / receptions) : "-";
    row["RecYds/Tgt"] = targets ? String(receivingYards / targets) : "-";
    row["Catch%"] = targets ? `${receptions / targets * 100}%` : "-";
    row["Weighted Opp./G"] = games ? String(weightedOpportunity / games) : "-";
    row["FP/G"] = games ? String(fantasyPoints / games) : "-";

    for (const key of gainRateFields) {
      const latestRate = value(latestRow, key);
      const baselineRate = value(baselineRow, key);
      const latestAttempts = value(latestRow, "ATT");
      const baselineAttempts = value(baselineRow, "ATT");
      if (!attempts || latestRate === null || baselineRate === null || latestAttempts === null || baselineAttempts === null) {
        row[key] = "-";
        continue;
      }
      row[key] = `${Math.max(0, latestRate / 100 * latestAttempts - baselineRate / 100 * baselineAttempts) / attempts * 100}%`;
    }

    for (const [countKey, rateKey] of [["Targets", "Target Share"], ["Rec Yards", "Team Rec Yards %"], ["Ins. 5 Carries", "Inside 5 Carry%"], ["Ins. 10 Carries", "Inside 10 Carry%"]] as const) {
      const rate = rateFromCount(latestRow, baselineRow, countKey, rateKey);
      row[rateKey] = rate === null ? "" : `${rate}%`;
    }

    const latestYac = value(latestRow, "YAC/Att");
    const baselineYac = value(baselineRow, "YAC/Att");
    const latestAttempts = value(latestRow, "ATT");
    const baselineAttempts = value(baselineRow, "ATT");
    row["YAC/Att"] = attempts && latestYac !== null && baselineYac !== null && latestAttempts !== null && baselineAttempts !== null
      ? String((latestYac * latestAttempts - baselineYac * baselineAttempts) / attempts)
      : "";
    return row;
  }).filter((row): row is RbWeeklyRow => row !== null && (value(row, "G") ?? 0) > 0);

  const scores = calculateRbScores({ season: 2026, ageColumn: "unused", rows });
  const scoredRows = rows.map((row, index) => ({
    ...row,
    "Rush Gain Profile": scores[index].rushGain === null ? "" : String(scores[index].rushGain),
    "Rush Score": scores[index].rush === null ? "" : String(scores[index].rush),
    "Rec Score": scores[index].receiving === null ? "" : String(scores[index].receiving),
    "Opportunity Score": scores[index].opportunity === null ? "" : String(scores[index].opportunity),
    Period: `Since Week ${startWeek}`,
  }));
  return { week: latest.week, copiedAt: latest.copiedAt, rows: scoredRows };
}
