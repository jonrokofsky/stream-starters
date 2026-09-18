/** User's sheet formulas. Pass the complete population for ONE statistical season. */
export type RbScoreRow = Record<string, string | number | null | undefined>;
type Weight = readonly [string, number];
const gain: Weight[] = [["1+ RuYd%", .1], ["3+ RuYd%", .17], ["5+ RuYd%", .23], ["10+ RuYd%", .22], ["15+ RuYd%", .15], ["20+ RuYd%", .1], ["30+ RuYd%", .03]];
const receiving: Weight[] = [["Targets", .2], ["Target Share", .25], ["RecYds/G", .25], ["RecYds/Tgt", .2], ["Team Rec Yards %", .1]];
const opportunity: Weight[] = [["Weighted Opp./G", .35], ["Target Share", .2], ["Inside 10 Carry%", .15], ["Ins. 5 Carries", .1], ["Ins. 10 Rec.", .1], ["Total TD", .1]];
const ageFactors: Record<number, number> = {21: 1.135, 22: .999, 23: 1.094, 24: 1.169, 25: 1.185, 26: 1.2, 27: 1.155, 28: 1.047, 29: .73, 30: .711, 31: .475, 32: .525, 33: .54, 34: .46, 35: .506};

function number(value: RbScoreRow[string], dashZero = false): number | null {
  if (value === "-" && dashZero) return 0;
  if (value == null || String(value).trim() === "" || value === "-") return null;
  const text = String(value).trim();
  const parsed = Number(text.replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed / (text.endsWith("%") ? 100 : 1) : null;
}

export function ageAdjustedRushScore(rush: number | null, age: number | null): number | null {
  if (rush === null || age === null || !Number.isFinite(rush) || !Number.isInteger(age) || age <= 0) return null;
  return Math.round(Math.min(100, rush * (ageFactors[age] ?? (age < 21 ? 1.135 : .506))));
}

export function calculateRbScores(input: { season: 2025 | 2026; ageColumn: string; rows: readonly RbScoreRow[] }) {
  const { rows } = input;
  const pools = new Map<string, number[]>();
  function rank(row: RbScoreRow, column: string, dashZero: boolean): number | null {
    const key = `${column}:${dashZero}`;
    let pool = pools.get(key);
    if (!pool) {
      pool = rows.map(r => number(r[column], dashZero)).filter((v): v is number => v !== null).sort((a, b) => a - b);
      pools.set(key, pool);
    }
    const value = number(row[column], dashZero);
    if (value === null || pool.length < 2) return null;
    // Lowest rank for ties, rounded to three decimals: verified against all 97 sheet rows.
    return Math.round(pool.indexOf(value) / (pool.length - 1) * 1000) / 10;
  }
  function weighted(row: RbScoreRow, weights: Weight[], dashZero = false): number | null {
    let sum = 0;
    for (const [column, weight] of weights) {
      const percentile = rank(row, column, dashZero);
      if (percentile === null) return null;
      sum += percentile * weight;
    }
    return Math.round(sum);
  }
  return rows.map(row => {
    const rushGain = weighted(row, gain, true);
    const yards = rank(row, "RuYds/G", false);
    const efficiency = rank(row, "RuYds/Rush", false);
    const rush = rushGain === null || yards === null || efficiency === null ? null : Math.round(yards * .35 + efficiency * .25 + rushGain * .4);
    return {
      season: input.season,
      rushGain,
      rush,
      ageAdjustedRush: ageAdjustedRushScore(rush, number(row[input.ageColumn])),
      receiving: weighted(row, receiving),
      opportunity: weighted(row, opportunity),
    };
  });
}
