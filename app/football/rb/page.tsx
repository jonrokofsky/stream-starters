"use client";

import Link from "next/link";
import { toPng } from "html-to-image";
import { calculateRbScores } from "../../../lib/data/rbScores";
import { mergeRbYac, type YacSnapshot } from "../../../lib/data/rbYac";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import WeekSlider from "../components/WeekSlider";


type DataRow = Record<string, string>;

type StatConfig = {
  label: string;
  keys: string[];
  format?: "number" | "decimal" | "decimal2" | "percent";
};

type WeeklySnapshot = {
  week: number;
  copiedAt: string;
  rows: DataRow[];
};

type SortDirection = "asc" | "desc";
type WeeklyTableMode = "through" | "since";

type PlayerTableColumn = {
  key: string;
  label: string;
  format?: "number" | "decimal" | "decimal2";
};

const PLAYER_TABLE_COLUMNS: PlayerTableColumn[] = [
  { key: "Name", label: "Player" },
  { key: "Team", label: "Team" },
  { key: "G", label: "G", format: "number" },
  { key: "Rush Score", label: "Rush", format: "number" },
  { key: "Rec Score", label: "Receiving", format: "number" },
  { key: "Opportunity Score", label: "Opportunity", format: "number" },
  { key: "FP/G", label: "PPR FP/G", format: "decimal2" },
  { key: "ATT", label: "Att", format: "number" },
  { key: "RuYds", label: "Rush Yds", format: "number" },
  { key: "RuYds/Rush", label: "YPC", format: "decimal2" },
  { key: "RuTD", label: "Rush TD", format: "number" },
  { key: "Targets", label: "Tgt", format: "number" },
  { key: "Rec", label: "Rec", format: "number" },
  { key: "Rec Yards", label: "Rec Yds", format: "number" },
  { key: "Rec. TD", label: "Rec TD", format: "number" },
  { key: "YAC/Att", label: "YAC/Att", format: "decimal" },
];

const TEAM_CODES: Record<string, string> = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS",
};

const TEAM_COLORS: Record<string, [string, string]> = {
  ARI: ["#97233F", "#000000"],
  ATL: ["#A71930", "#000000"],
  BAL: ["#241773", "#000000"],
  BUF: ["#00338D", "#C60C30"],
  CAR: ["#0085CA", "#101820"],
  CHI: ["#0B162A", "#C83803"],
  CIN: ["#FB4F14", "#000000"],
  CLE: ["#311D00", "#FF3C00"],
  DAL: ["#003594", "#869397"],
  DEN: ["#FB4F14", "#002244"],
  DET: ["#0076B6", "#B0B7BC"],
  GB: ["#203731", "#FFB612"],
  HOU: ["#03202F", "#A71930"],
  IND: ["#002C5F", "#A2AAAD"],
  JAX: ["#006778", "#D7A22A"],
  KC: ["#E31837", "#FFB81C"],
  LV: ["#000000", "#A5ACAF"],
  LAC: ["#0080C6", "#FFC20E"],
  LAR: ["#003594", "#FFA300"],
  MIA: ["#008E97", "#FC4C02"],
  MIN: ["#4F2683", "#FFC62F"],
  NE: ["#002244", "#C60C30"],
  NO: ["#D3BC8D", "#101820"],
  NYG: ["#0B2265", "#A71930"],
  NYJ: ["#125740", "#000000"],
  PHI: ["#004C54", "#A5ACAF"],
  PIT: ["#FFB612", "#101820"],
  SEA: ["#002244", "#69BE28"],
  SF: ["#AA0000", "#B3995D"],
  TB: ["#D50A0A", "#34302B"],
  TEN: ["#0C2340", "#4B92DB"],
  WAS: ["#5A1414", "#FFB612"],
};

const RUSHING_STATS: StatConfig[] = [
  {
    label: "Rush Gain Profile",
    keys: ["Rush Gain Profile"],
    format: "number",
  },
  {
    label: "Rush Yds/G",
    keys: ["RuYds/G"],
    format: "decimal",
  },
  {
    label: "Yds/Rush",
    keys: ["RuYds/Rush"],
    format: "decimal",
  },
  {
    label: "1+ Rush %",
    keys: ["1+ RuYd%"],
    format: "percent",
  },
  {
    label: "3+ Rush %",
    keys: ["3+ RuYd%"],
    format: "percent",
  },
  {
    label: "5+ Rush %",
    keys: ["5+ RuYd%"],
    format: "percent",
  },
  {
    label: "10+ Rush %",
    keys: ["10+ RuYd%"],
    format: "percent",
  },
  {
    label: "20+ Rush %",
    keys: ["20+ RuYd%"],
    format: "percent",
  },
  { label: "YAC/Att", keys: ["YAC/Att"], format: "decimal" },
];

const RECEIVING_STATS: StatConfig[] = [
  {
    label: "Targets/Game",
    keys: ["Targets/Game", "Targets/G", "Tgt/G"],
    format: "decimal2",
  },
  {
    label: "Target Share",
    keys: ["Target Share"],
    format: "percent",
  },
  {
    label: "Rec Yds/G",
    keys: ["RecYds/G", "Rec Yds/G"],
    format: "decimal",
  },
  {
    label: "Rec Yds/Tgt",
    keys: ["RecYds/Tgt", "Rec Yds/Tgt"],
    format: "decimal",
  },
  {
    label: "Team Rec Yds %",
    keys: [
      "Team Rec Yards %",
      "Team Rec Yds %",
      "Team Rec Yards%",
    ],
    format: "percent",
  },
];

const OPPORTUNITY_STATS: StatConfig[] = [
  {
    label: "PPR Fantasy PPG",
    keys: ["FP/G", "Fantasy PPG"],
    format: "decimal",
  },
  {
    label: "Weighted Opp/G",
    keys: [
      "Weighted Opp./G",
      "Weighted Opp/G",
      "Weighted Opp. /G",
    ],
    format: "decimal",
  },
  {
    label: "Target Share",
    keys: ["Target Share"],
    format: "percent",
  },
  {
    label: "Inside 10 Carry %",
    keys: ["Inside 10 Carry%"],
    format: "percent",
  },
  {
    label: "Inside 5 Carry %",
    keys: ["Inside 5 Carry%"],
    format: "percent",
  },
  {
    label: "Inside 10 Rec/Game",
    keys: ["Inside 10 Rec/Game"],
    format: "decimal2",
  },
  {
    label: "Total TD",
    keys: ["Total TD"],
    format: "number",
  },
];

function toNumber(value: string | undefined) {
  if (!value) return null;

  const cleaned = value
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned || cleaned === "-") {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}

function getTargetsPerGame(
  row: DataRow | undefined
) {
  if (!row) {
    return "";
  }

  const directKeys = [
    "Targets/Game",
    "Targets/G",
    "Tgt/G",
  ];

  for (const key of directKeys) {
    const direct =
      row[key];

    if (
      direct !== undefined &&
      direct !== ""
    ) {
      return direct;
    }
  }

  const targets =
    toNumber(
      row["Targets"]
    );

  if (
    targets === null
  ) {
    return "";
  }

  /*
    First fallback:
    Use the new G column if Google's published CSV includes it.
  */
  const directGames =
    toNumber(
      row["G"]
    );

  if (
    directGames !== null &&
    directGames > 0
  ) {
    return (
      targets /
      directGames
    ).toString();
  }

  /*
    Second fallback:
    Infer games from Receiving Yards / Receiving Yards Per Game.

    Example:
    291 receiving yards / 17.1 RecYds/G ≈ 17 games.
  */
  const receivingYards =
    toNumber(
      row["Rec Yards"]
    ) ??
    toNumber(
      row["RecYards"]
    );

  const receivingYardsPerGame =
    toNumber(
      row["RecYds/G"]
    ) ??
    toNumber(
      row["Rec Yds/G"]
    );

  if (
    receivingYards !== null &&
    receivingYardsPerGame !== null &&
    receivingYardsPerGame > 0
  ) {
    const inferredGames =
      Math.round(
        receivingYards /
          receivingYardsPerGame
      );

    if (
      inferredGames > 0
    ) {
      return (
        targets /
        inferredGames
      ).toString();
    }
  }

  /*
    Third fallback:
    Infer games from Weighted Opportunity / Weighted Opportunity Per Game.
  */
  const weightedOpp =
    toNumber(
      row["Weighted Opp."]
    ) ??
    toNumber(
      row["Weighted Opp"]
    );

  const weightedOppPerGame =
    toNumber(
      row["Weighted Opp./G"]
    ) ??
    toNumber(
      row["Weighted Opp/G"]
    ) ??
    toNumber(
      row["Weighted Opp. /G"]
    );

  if (
    weightedOpp !== null &&
    weightedOppPerGame !== null &&
    weightedOppPerGame > 0
  ) {
    const inferredGames =
      Math.round(
        weightedOpp /
          weightedOppPerGame
      );

    if (
      inferredGames > 0
    ) {
      return (
        targets /
        inferredGames
      ).toString();
    }
  }

  return "";
}

function getValue(
  row: DataRow | undefined,
  keys: string[]
) {
  if (!row) return "";

  if (keys.includes("Inside 10 Rec/Game")) {
    const receptions = toNumber(row["Ins. 10 Rec."]);
    const games = toNumber(row["G"]);
    return receptions !== null && games !== null && games > 0
      ? String(receptions / games)
      : "";
  }

  if (
    keys.includes("Targets/Game") ||
    keys.includes("Targets/G") ||
    keys.includes("Tgt/G")
  ) {
    return getTargetsPerGame(
      row
    );
  }

  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== ""
    ) {
      return row[key];
    }
  }

  return "";
}

function teamCode(team: string) {
  const value = team.trim();
  const aliases: Record<string, string> = { ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU", LA: "LAR", JAC: "JAX", WSH: "WAS" };
  const code = aliases[value.toUpperCase()] || value.toUpperCase();
  return TEAM_CODES[value] || (TEAM_COLORS[code] ? code : "");
}

function teamName(team: string) {
  const code = teamCode(team);
  return Object.entries(TEAM_CODES).find(([, value]) => value === code)?.[0] || team || "Team unavailable";
}

function themeText(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

function espnLogo(code: string) {
  const overrides: Record<string, string> = {
    JAX: "jax",
    WAS: "wsh",
    TB: "tb",
  };

  if (!code) return "";

  return `https://a.espncdn.com/i/teamlogos/nfl/500/${
    overrides[code] || code.toLowerCase()
  }.png`;
}

function percentile(
  value: number,
  population: number[]
) {
  if (!population.length) {
    return 50;
  }

  const sorted = [...population].sort(
    (a, b) => a - b
  );

  const below = sorted.filter(
    (item) => item < value
  ).length;

  const equal = sorted.filter(
    (item) => item === value
  ).length;

  const rank =
    below + Math.max(equal - 1, 0) / 2;

  if (sorted.length === 1) {
    return 50;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (rank / (sorted.length - 1)) * 100
    )
  );
}

function percentileStyle(
  percentileValue: number
) {
  if (percentileValue >= 90) {
    return "bg-red-600 text-white border-red-700";
  }

  if (percentileValue >= 75) {
    return "bg-red-400 text-white border-red-500";
  }

  if (percentileValue >= 60) {
    return "bg-red-100 text-red-950 border-red-200";
  }

  if (percentileValue >= 40) {
    return "bg-white text-slate-900 border-slate-200";
  }

  if (percentileValue >= 25) {
    return "bg-blue-100 text-blue-950 border-blue-200";
  }

  if (percentileValue >= 10) {
    return "bg-blue-400 text-white border-blue-500";
  }

  return "bg-blue-700 text-white border-blue-800";
}

function scoreStyle(score: number) {
  return percentileStyle(score);
}

function scoreLabel(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Above Average";
  if (score >= 40) return "Average";
  if (score >= 25) return "Below Average";
  if (score >= 10) return "Poor";
  return "Very Poor";
}

function formatStatValue(
  raw: string,
  format: StatConfig["format"]
) {
  if (!raw || raw === "-") {
    if (format === "percent") {
      return "0.0%";
    }

    if (format === "decimal2") {
      return "0.00";
    }

    return "0";
  }

  const number = toNumber(raw);

  if (number === null) {
    return raw;
  }

  if (format === "percent") {
    return `${number.toFixed(1)}%`;
  }

  if (format === "decimal") {
    return number.toFixed(1);
  }

  if (format === "decimal2") {
    return number.toFixed(2);
  }

  return Math.round(number).toString();
}

function formatTableValue(raw: string, format: PlayerTableColumn["format"]) {
  if (!raw || raw === "-") return "—";
  const value = toNumber(raw);
  if (value === null || !format) return raw;
  if (format === "decimal2") return value.toFixed(2);
  if (format === "decimal") return value.toFixed(1);
  return Math.round(value).toString();
}

function inferSnapshotWeek(rows: DataRow[]) {
  return Math.max(1, ...rows.map((row) => toNumber(row["G"]) ?? 0));
}

const PERIOD_COUNT_FIELDS = [
  "G", "ATT", "RuYds", "RuTD", "Rush FUM", "Targets", "Rec", "Rec Yards",
  "Rec. TD", "Rec FUM", "Weighted Opp.", "FP", "Total TD", "Ins. 5 Carries",
  "Ins. 10 Carries", "Ins. 10 Rec.",
] as const;

const GAIN_RATE_FIELDS = ["1+ RuYd%", "3+ RuYd%", "5+ RuYd%", "10+ RuYd%", "15+ RuYd%", "20+ RuYd%", "30+ RuYd%"] as const;

function periodNumber(latest: DataRow, baseline: DataRow | undefined, key: string) {
  return Math.max(0, (toNumber(latest[key]) ?? 0) - (toNumber(baseline?.[key]) ?? 0));
}

function periodRateFromCount(
  latest: DataRow,
  baseline: DataRow | undefined,
  countKey: string,
  rateKey: string,
) {
  const latestCount = toNumber(latest[countKey]) ?? 0;
  const baselineCount = toNumber(baseline?.[countKey]) ?? 0;
  const latestRate = toNumber(latest[rateKey]) ?? 0;
  const baselineRate = toNumber(baseline?.[rateKey]) ?? 0;
  const latestPool = latestRate > 0 ? latestCount / (latestRate / 100) : 0;
  const baselinePool = baselineRate > 0 ? baselineCount / (baselineRate / 100) : 0;
  const periodPool = latestPool - baselinePool;
  const periodCount = latestCount - baselineCount;
  return periodPool > 0 && periodCount >= 0 ? periodCount / periodPool * 100 : 0;
}

function buildSinceSnapshot(latest: WeeklySnapshot, baseline: WeeklySnapshot, startWeek: number): WeeklySnapshot {
  const baselineByName = new Map(baseline.rows.map((row) => [row.Name, row]));
  const rows = latest.rows.map((latestRow) => {
    const baselineRow = baselineByName.get(latestRow.Name);
    const row: DataRow = { ...latestRow };
    for (const key of PERIOD_COUNT_FIELDS) row[key] = String(periodNumber(latestRow, baselineRow, key));

    const games = toNumber(row.G) ?? 0;
    const attempts = toNumber(row.ATT) ?? 0;
    const rushYards = toNumber(row.RuYds) ?? 0;
    const targets = toNumber(row.Targets) ?? 0;
    const receptions = toNumber(row.Rec) ?? 0;
    const receivingYards = toNumber(row["Rec Yards"]) ?? 0;
    const fantasyPoints = toNumber(row.FP) ?? 0;
    const weightedOpportunity = toNumber(row["Weighted Opp."]) ?? 0;

    row["RuYds/G"] = games ? String(rushYards / games) : "-";
    row["RuYds/Rush"] = attempts ? String(rushYards / attempts) : "-";
    row["RecYds/G"] = games ? String(receivingYards / games) : "-";
    row["RecYds/Rec"] = receptions ? String(receivingYards / receptions) : "-";
    row["RecYds/Tgt"] = targets ? String(receivingYards / targets) : "-";
    row["Catch%"] = targets ? `${receptions / targets * 100}%` : "-";
    row["Weighted Opp./G"] = games ? String(weightedOpportunity / games) : "-";
    row["FP/G"] = games ? String(fantasyPoints / games) : "-";

    for (const key of GAIN_RATE_FIELDS) {
      const latestEvents = (toNumber(latestRow[key]) ?? 0) / 100 * (toNumber(latestRow.ATT) ?? 0);
      const baselineEvents = (toNumber(baselineRow?.[key]) ?? 0) / 100 * (toNumber(baselineRow?.ATT) ?? 0);
      row[key] = attempts ? `${Math.max(0, latestEvents - baselineEvents) / attempts * 100}%` : "-";
    }

    row["Target Share"] = `${periodRateFromCount(latestRow, baselineRow, "Targets", "Target Share")}%`;
    row["Team Rec Yards %"] = `${periodRateFromCount(latestRow, baselineRow, "Rec Yards", "Team Rec Yards %")}%`;
    row["Inside 5 Carry%"] = `${periodRateFromCount(latestRow, baselineRow, "Ins. 5 Carries", "Inside 5 Carry%")}%`;
    row["Inside 10 Carry%"] = `${periodRateFromCount(latestRow, baselineRow, "Ins. 10 Carries", "Inside 10 Carry%")}%`;

    const latestYac = toNumber(latestRow["YAC/Att"]);
    const baselineYac = toNumber(baselineRow?.["YAC/Att"]);
    const latestAttempts = toNumber(latestRow.ATT) ?? 0;
    const baselineAttempts = toNumber(baselineRow?.ATT) ?? 0;
    const periodYac = latestYac === null
      ? null
      : (latestYac * latestAttempts - (baselineYac ?? 0) * baselineAttempts);
    row["YAC/Att"] = attempts && periodYac !== null ? String(periodYac / attempts) : "";
    return row;
  }).filter((row) => (toNumber(row.G) ?? 0) > 0);

  const scores = calculateRbScores({ season: 2026, ageColumn: "unused", rows });
  const scoredRows = rows.map((row, index) => ({
    ...row,
    "Rush Gain Profile": scores[index].rushGain === null ? "" : String(scores[index].rushGain),
    "Rush Score": scores[index].rush === null ? "" : String(scores[index].rush),
    "Rec Score": scores[index].receiving === null ? "" : String(scores[index].receiving),
    "Opportunity Score": scores[index].opportunity === null ? "" : String(scores[index].opportunity),
  }));

  return { week: latest.week, copiedAt: latest.copiedAt, rows: scoredRows.map((row) => ({ ...row, Period: `Since Week ${startWeek}` })) };
}

function ScoreCard({
  title,
  score,
  subtitle,
}: {
  title: string;
  score: number | null;
  subtitle: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border shadow-lg ${score === null ? "border-slate-200 bg-slate-50 text-slate-600" : scoreStyle(score)}`}
    >
      <div className="p-3 sm:p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70 sm:text-xs sm:tracking-[0.18em]">
          {title}
        </div>

        <div className="mt-2 flex items-end justify-between gap-3 sm:mt-4 sm:gap-4">
          <div className="text-4xl font-black leading-none sm:text-6xl">
            {score === null ? "—" : Math.round(score)}
          </div>

          <div className="text-right">
            <div className="text-xs font-black sm:text-sm">
              {score === null ? "Unavailable" : scoreLabel(score)}
            </div>

            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
              0–100 Score
            </div>
          </div>
        </div>

        <div className="mt-2 border-t border-black/10 pt-2 text-xs font-bold opacity-75 sm:mt-5 sm:pt-4 sm:text-sm">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function ComponentSection({
  title,
  description,
  stats,
  selectedPlayer,
  percentilePool,
  positionPool,
  qualified,
}: {
  title: string;
  description: string;
  stats: StatConfig[];
  selectedPlayer: DataRow;
  percentilePool: DataRow[];
  positionPool?: DataRow[];
  qualified: boolean;
}) {
  return (
    <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b-4 px-5 py-4 sm:px-6" style={{ backgroundColor: "var(--team-primary)", color: "var(--team-ink)", borderColor: "var(--team-secondary)" }}>
        <div className="text-lg font-black">
          {title}
        </div>

        <div className="mt-1 text-xs font-bold opacity-90">
          {description}
        </div>
      </div>

      {!qualified && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700">
          Selected RB is below the current rushing-attempt qualification minimum.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-5 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const usesPositionPool = stat.label === "PPR Fantasy PPG";
          const rawValue =
            getValue(
              selectedPlayer,
              stat.keys
            );

          const numericValue =
            toNumber(rawValue) ?? 0;
          const missingYac = stat.keys.includes("YAC/Att") && toNumber(rawValue) === null;

          const population =
            (usesPositionPool ? positionPool ?? percentilePool : percentilePool)
              .map((player) =>
                toNumber(
                  getValue(
                    player,
                    stat.keys
                  )
                )
              )
              .filter(
                (
                  value
                ): value is number =>
                  value !== null
              );

          const pct =
            percentile(
              numericValue,
              population
            );

          const showPercentile = usesPositionPool || qualified;

          return (
            <div
              key={stat.label}
              className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${
                showPercentile && !missingYac
                  ? percentileStyle(pct)
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[9px] font-black uppercase tracking-[0.08em] opacity-70 sm:text-[11px] sm:tracking-[0.1em]">
                  {stat.label}
                </div>

                {showPercentile && !missingYac && (
                  <div className="shrink-0 rounded-full bg-black/10 px-2 py-1 text-[10px] font-black">
                    P{Math.round(pct)}
                  </div>
                )}
              </div>

              <div className="mt-2 text-2xl font-black sm:mt-3 sm:text-3xl">
                {missingYac ? "—" : formatStatValue(
                  rawValue,
                  stat.format
                )}
              </div>

              <div className="mt-1 text-[10px] font-bold opacity-70 sm:mt-2 sm:text-xs">
                {missingYac ? "Not available from PFR" : showPercentile
                  ? scoreLabel(pct)
                  : "Below qualification"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MobileComponentGrid({
  title,
  stats,
  selectedPlayer,
  percentilePool,
  positionPool,
  qualified,
}: {
  title: string;
  stats: StatConfig[];
  selectedPlayer: DataRow;
  percentilePool: DataRow[];
  positionPool: DataRow[];
  qualified: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-950 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white">{title}</div>
      <div className="grid grid-cols-3 gap-px bg-slate-200">
        {stats.map((stat, index) => {
          const usesPositionPool = stat.label === "PPR Fantasy PPG";
          const rawValue = getValue(selectedPlayer, stat.keys);
          const numericValue = toNumber(rawValue) ?? 0;
          const missingYac = stat.keys.includes("YAC/Att") && toNumber(rawValue) === null;
          const population = (usesPositionPool ? positionPool : percentilePool)
            .map((player) => toNumber(getValue(player, stat.keys)))
            .filter((value): value is number => value !== null);
          const pct = percentile(numericValue, population);
          const showColor = (usesPositionPool || qualified) && !missingYac;
          return (
            <div key={stat.label} className={`min-h-12 p-1.5 text-center ${(stats.length % 3 === 1 && index === stats.length - 1) ? "col-span-3" : (stats.length % 3 === 2 && index === stats.length - 1) ? "col-span-2" : ""} ${showColor ? percentileStyle(pct) : "bg-white text-slate-900"}`}>
              <div className="truncate text-[7.5px] font-medium uppercase leading-tight tracking-normal opacity-70">{stat.label}</div>
              <div className="mt-1 flex items-end justify-center gap-1.5">
                <span className="truncate text-sm font-bold leading-none">{missingYac ? "—" : formatStatValue(rawValue, stat.format)}</span>
                {showColor && <span className="text-[7px] font-semibold opacity-60">P{Math.round(pct)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function RBPage() {
  const graphicRef = useRef<HTMLDivElement>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [yacNote, setYacNote] = useState("");
  const [players, setPlayers] =
    useState<DataRow[]>([]);
  const [weeklySnapshots, setWeeklySnapshots] = useState<WeeklySnapshot[]>([]);
  const [profileWeek, setProfileWeek] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [weeklyTableMode, setWeeklyTableMode] = useState<WeeklyTableMode>("through");
  const [sinceWeek, setSinceWeek] = useState(0);
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState("Opportunity Score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [exporting, setExporting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const [
    selectedName,
    setSelectedName,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    showSuggestions,
    setShowSuggestions,
  ] = useState(false);

  const [
    minRushAttempts,
    setMinRushAttempts,
  ] = useState(5);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/data/rb-2026.json",
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Could not load RB data."
          );
        }

        const snapshot = await response.json();
        if (snapshot.season !== 2026 || !Array.isArray(snapshot.rows) || snapshot.rows.length === 0 ||
            !snapshot.rows.every((row: unknown) => row !== null && typeof row === "object" &&
              Object.values(row).every(value => typeof value === "string") && "Name" in row)) {
          throw new Error("Invalid 2026 RB snapshot.");
        }
        let merged: DataRow[];
        try {
          const yacResponse = await fetch("/data/rb-yac-2026.json", { cache: "no-store", signal: controller.signal });
          if (!yacResponse.ok) throw Error("PFR unavailable");
          const yacSnapshot: YacSnapshot = await yacResponse.json();
          merged = mergeRbYac(snapshot.rows, yacSnapshot);
          setYacNote(`YAC/Att: Pro Football Reference · Captured ${new Date(yacSnapshot.capturedAt).toLocaleDateString("en-US", { timeZone: "America/New_York" })}. ${yacSnapshot.coverageNote}`);
        } catch {
          merged = snapshot.rows.map((row: DataRow) => ({ ...row, "YAC/Att": "" }));
          setYacNote("PFR YAC/Att is unavailable. Rushing Scores use the reweighted production, efficiency, and gain-profile formula.");
        }
        const scores = calculateRbScores({ season: 2026, ageColumn: "unused", rows: merged });
        merged = merged.map((row, i) => ({ ...row, "Rush Score": scores[i].rush === null ? "" : String(scores[i].rush) }));
        const rows = merged
          .filter(
            (row) => row["Name"]
          )
          .sort((a, b) =>
            (
              a["Name"] || ""
            ).localeCompare(
              b["Name"] || ""
            )
          );

        if (controller.signal.aborted) return;
        setPlayers(rows);
        setUpdatedAt(snapshot.copiedAt);

        const currentWeek = inferSnapshotWeek(rows);
        let archivedWeeks: WeeklySnapshot[] = [];
        try {
          const weeklyResponse = await fetch("/data/rb-weekly-2026.json", {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!weeklyResponse.ok) throw new Error("Weekly RB snapshots are unavailable.");
          const weeklyData = await weeklyResponse.json();
          if (weeklyData.season !== 2026 || !Array.isArray(weeklyData.weeks)) {
            throw new Error("Invalid weekly RB snapshots.");
          }
          archivedWeeks = weeklyData.weeks.filter((item: unknown): item is WeeklySnapshot => {
            if (!item || typeof item !== "object") return false;
            const candidate = item as WeeklySnapshot;
            return Number.isInteger(candidate.week) && candidate.week > 0 &&
              typeof candidate.copiedAt === "string" && Array.isArray(candidate.rows) &&
              candidate.rows.length > 0 && candidate.rows.every((row) => row && typeof row === "object" && "Name" in row);
          });
        } catch (weeklyError) {
          if (controller.signal.aborted) return;
          console.warn(weeklyError);
        }
        const byWeek = new Map(archivedWeeks.map((item) => [item.week, item]));
        byWeek.set(currentWeek, { week: currentWeek, copiedAt: snapshot.copiedAt, rows });
        const availableWeeks = [...byWeek.values()].sort((a, b) => a.week - b.week);
        setWeeklySnapshots(availableWeeks);
        setProfileWeek(availableWeeks.at(-1)?.week ?? currentWeek);
        setSelectedWeek(availableWeeks.at(-1)?.week ?? currentWeek);
        setSinceWeek(availableWeeks.find((item) => byWeek.has(item.week - 1))?.week ?? currentWeek);

        if (rows.length) {
          setSelectedName(
            rows[0]["Name"]
          );

          setSearch(
            rows[0]["Name"]
          );
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);

        setError(
          "Could not load the 2026 RB data. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, []);

  const availableProfileWeeks = useMemo(
    () => weeklySnapshots.map((snapshot) => snapshot.week),
    [weeklySnapshots]
  );

  const profileSnapshot = useMemo(
    () => weeklySnapshots.find((snapshot) => snapshot.week === profileWeek) ?? weeklySnapshots.at(-1),
    [profileWeek, weeklySnapshots]
  );

  const profilePlayers = profileSnapshot?.rows ?? players;

  const filteredPlayers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return profilePlayers.slice(0, 10);
      }

      return profilePlayers
        .filter((player) =>
          (
            player["Name"] || ""
          )
            .toLowerCase()
            .includes(query)
        )
        .slice(0, 10);
    }, [profilePlayers, search]);

  const selectedPlayer =
    useMemo(
      () =>
        profilePlayers.find(
          (player) =>
            player["Name"] ===
            selectedName
        ) ?? profilePlayers[0],
      [profilePlayers, selectedName]
    );

  const percentilePool =
    useMemo(() => {
      return profilePlayers.filter((player) => {
        const attempts =
          toNumber(
            getValue(
              player,
              ["ATT", "Rush Att"]
            )
          ) ?? 0;

        return attempts >= minRushAttempts;
      });
    }, [profilePlayers, minRushAttempts]);

  const availableSinceWeeks = useMemo(
    () => weeklySnapshots.filter((item) => weeklySnapshots.some((baseline) => baseline.week === item.week - 1)),
    [weeklySnapshots]
  );

  const selectedWeekSnapshot = useMemo(() => {
    if (weeklyTableMode === "through") {
      return weeklySnapshots.find((item) => item.week === selectedWeek) ?? weeklySnapshots.at(-1);
    }
    const latest = weeklySnapshots.at(-1);
    const baseline = weeklySnapshots.find((item) => item.week === sinceWeek - 1);
    return latest && baseline ? buildSinceSnapshot(latest, baseline, sinceWeek) : latest;
  }, [selectedWeek, sinceWeek, weeklySnapshots, weeklyTableMode]);

  const sortedTablePlayers = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    const rows = (selectedWeekSnapshot?.rows ?? []).filter((player) =>
      !query || `${player["Name"] ?? ""} ${player["Team"] ?? ""}`.toLowerCase().includes(query)
    );
    return [...rows].sort((a, b) => {
      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      const leftNumber = toNumber(left);
      const rightNumber = toNumber(right);
      let comparison: number;
      if (leftNumber !== null || rightNumber !== null) {
        if (leftNumber === null) return 1;
        if (rightNumber === null) return -1;
        comparison = leftNumber - rightNumber;
      } else {
        comparison = left.localeCompare(right);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [selectedWeekSnapshot, sortDirection, sortKey, tableSearch]);

  const tableFantasyPpgPopulation = useMemo(
    () => (selectedWeekSnapshot?.rows ?? [])
      .filter((player) => {
        const attempts = toNumber(getValue(player, ["ATT", "Rush Att"])) ?? 0;
        const games = toNumber(getValue(player, ["G", "Games"])) ?? 0;
        return games > 0 && attempts / games >= 5;
      })
      .map((player) => toNumber(player["FP/G"]))
      .filter((value): value is number => value !== null),
    [selectedWeekSnapshot]
  );

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection(key === "Name" || key === "Team" ? "asc" : "desc");
  }

  function selectPlayer(
    name: string
  ) {
    setSelectedName(name);
    setSearch(name);
    setShowSuggestions(false);
  }

  const rushAttempts =
    toNumber(
      getValue(
        selectedPlayer,
        ["ATT", "Rush Att"]
      )
    ) ?? 0;

  const qualified =
    rushAttempts >= minRushAttempts;

  const rawRushScore =
    toNumber(
      getValue(
        selectedPlayer,
        ["Rush Score"]
      )
    ) ?? null;

  const recScore =
    toNumber(
      getValue(
        selectedPlayer,
        [
          "Rec Score",
          "Receiving Score",
        ]
      )
    ) ?? null;

  const opportunityScore =
    toNumber(
      getValue(
        selectedPlayer,
        ["Opportunity Score"]
      )
    ) ?? null;

  const fantasyPpg =
    toNumber(getValue(selectedPlayer, ["FP/G", "Fantasy PPG"]));

  const fantasyPpgPopulation = useMemo(
    () => profilePlayers
      .filter((player) => {
        const attempts = toNumber(getValue(player, ["ATT", "Rush Att"])) ?? 0;
        const games = toNumber(getValue(player, ["G", "Games"])) ?? 0;
        return games > 0 && attempts / games >= 5;
      })
      .map((player) => toNumber(getValue(player, ["FP/G", "Fantasy PPG"])))
      .filter((value): value is number => value !== null),
    [profilePlayers]
  );

  const fantasyPpgQualified = (() => {
    const games = toNumber(getValue(selectedPlayer, ["G", "Games"])) ?? 0;
    return games > 0 && rushAttempts / games >= 5;
  })();

  const fantasyPpgPercentile = fantasyPpg === null || !fantasyPpgQualified
    ? null
    : percentile(fantasyPpg, fantasyPpgPopulation);

  const team =
    getValue(
      selectedPlayer,
      ["Team"]
    );

  const code =
    teamCode(team);

  const colors =
    TEAM_COLORS[code] || [
      "#0F172A",
      "#2563EB",
    ];

  async function copyGraphicToClipboard() {
    const node = graphicRef.current;
    if (!node) return;
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      alert("Image clipboard copying is not supported in this browser. Try Chrome or Edge on desktop.");
      return;
    }

    const previousStyle = {
      width: node.style.width,
      maxWidth: node.style.maxWidth,
      minWidth: node.style.minWidth,
      borderRadius: node.style.borderRadius,
    };

    try {
      setExporting(true);
      setCopyStatus("idle");
      node.style.width = "1200px";
      node.style.maxWidth = "1200px";
      node.style.minWidth = "1200px";
      node.style.borderRadius = "0";
      await waitForImages(node);
      if (document.fonts) await document.fonts.ready;
      const dataUrl = await toPng(node, {
        pixelRatio: 1.5,
        backgroundColor: "#ffffff",
        width: 1200,
        height: node.scrollHeight,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const pngBlob = blob.type === "image/png"
        ? blob
        : new Blob([await blob.arrayBuffer()], { type: "image/png" });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch (copyError) {
      console.error("RB profile clipboard copy failed:", copyError);
      setCopyStatus("error");
      alert("The graphic could not be copied. Try Chrome or Edge and allow clipboard access.");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    } finally {
      node.style.width = previousStyle.width;
      node.style.maxWidth = previousStyle.maxWidth;
      node.style.minWidth = previousStyle.minWidth;
      node.style.borderRadius = previousStyle.borderRadius;
      setExporting(false);
    }
  }

  return (
    <main
      className="min-h-screen text-slate-950"
      style={{
        "--team-primary": colors[0],
        "--team-secondary": colors[1],
        "--team-ink": themeText(colors[0]),
        background: `linear-gradient(180deg, ${colors[0]}18, #f8fafc 55%, #ffffff)`,
      } as CSSProperties}
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
              Stream Starters
            </div>

            <div className="mt-1 text-xl font-black">
              Fantasy Football
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/football/matchup"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              ← Position Matchup
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Running Back Analysis
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            RB Profile Tool
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Evaluate running backs across rushing, receiving, and fantasy opportunity.
          </p>
          <p className="mt-3 text-sm text-slate-600">2026 regular season · PPR · Fantasy Points · {updatedAt ? `Updated ${new Date(updatedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern` : "Loading update time…"}.</p>
          <p className="mt-2 text-sm text-slate-600">{yacNote}</p>
          <p className="mt-2 text-sm text-slate-600">Profile scores compare all {profilePlayers.length || "—"} RBs through Week {profileSnapshot?.week ?? "—"}, including rookies. The attempts filter below applies only to component percentile grades.</p>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-600 shadow-sm">
            Loading RB data...
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          profilePlayers.length > 0 &&
          selectedPlayer && (
            <>
              <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                      Running Back
                    </label>

                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => {
                            setSearch(
                              e.target.value
                            );

                            setShowSuggestions(
                              true
                            );
                          }}
                          onFocus={(e) => {
                            e.target.select();

                            setShowSuggestions(
                              true
                            );
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              filteredPlayers.length
                            ) {
                              e.preventDefault();

                              selectPlayer(
                                filteredPlayers[0]["Name"]
                              );
                            }

                            if (
                              e.key === "Escape"
                            ) {
                              setShowSuggestions(
                                false
                              );
                            }
                          }}
                          placeholder="Search RB..."
                          autoComplete="off"
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-10 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />

                        {search && (
                          <button
                            type="button"
                            onMouseDown={(e) =>
                              e.preventDefault()
                            }
                            onClick={() => {
                              setSearch("");

                              setShowSuggestions(
                                true
                              );
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {showSuggestions && (
                        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                          {filteredPlayers.length > 0 ? (
                            filteredPlayers.map(
                              (player) => (
                                <button
                                  type="button"
                                  key={
                                    player[
                                      "Name"
                                    ]
                                  }
                                  onMouseDown={(
                                    e
                                  ) =>
                                    e.preventDefault()
                                  }
                                  onClick={() =>
                                    selectPlayer(
                                      player[
                                        "Name"
                                      ]
                                    )
                                  }
                                  className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-b-0"
                                >
                                  <div className="font-black">
                                    {
                                      player[
                                        "Name"
                                      ]
                                    }
                                  </div>

                                  <div className="mt-1 text-xs font-bold text-slate-500">
                                    {
                                      player[
                                        "Team"
                                      ]
                                    }{" "}
                                    •{" "}
                                    {getValue(
                                      player,
                                      ["ATT"]
                                    ) || "0"}{" "}
                                    ATT
                                  </div>
                                </button>
                              )
                            )
                          ) : (
                            <div className="px-4 py-3 text-sm font-bold text-slate-500">
                              No running backs found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-black text-slate-900">
                          Minimum Rush Attempts
                        </div>

                        <div className="text-xs text-slate-500">
                          Qualification and percentile pool
                        </div>
                      </div>

                      <div className="rounded-lg bg-sky-600 px-3 py-1 text-lg font-black text-white">
                        {minRushAttempts}+
                      </div>
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      value={minRushAttempts}
                      onChange={(e) =>
                        setMinRushAttempts(
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="w-full cursor-pointer accent-sky-500"
                    />

                    <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
                      <span>5 ATT</span>
                      <span>300 ATT</span>
                    </div>

                    <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      Percentiles compared against{" "}
                      <span className="font-black text-slate-900">
                        {percentilePool.length} RBs
                      </span>{" "}
                      with at least{" "}
                      <span className="font-black text-slate-900">
                        {minRushAttempts} rushing attempts
                      </span>
                      .
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <WeekSlider
                      id="rb-profile-week"
                      weeks={availableProfileWeeks}
                      value={profileSnapshot?.week ?? profileWeek}
                      onChange={setProfileWeek}
                      label="RB profile snapshot"
                    />
                  </div>
                </div>
              </section>

              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={copyGraphicToClipboard}
                  disabled={exporting}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-md transition hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {exporting
                    ? "Copying Graphic..."
                    : copyStatus === "copied"
                      ? "Copied!"
                      : copyStatus === "error"
                        ? "Copy Failed"
                        : "Copy Graphic"}
                </button>
              </div>

              <section ref={graphicRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:rounded-[30px] sm:shadow-xl">
                <div className="p-2 font-sans sm:hidden" style={{ background: `linear-gradient(145deg, ${colors[0]}12, white 34%)` }}>
                  <div className="flex items-center gap-2.5 rounded-xl p-2.5 text-white" style={{ background: colors[0], color: themeText(colors[0]) }}>
                    {code && <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1"><img src={espnLogo(code)} alt={`${teamName(team)} logo`} className="h-full w-full object-contain" /></div>}
                    <div className="min-w-0 flex-1"><div className="truncate text-lg font-bold leading-tight">{selectedPlayer.Name}</div><div className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-[0.04em] opacity-80">{teamName(team)} · W{profileSnapshot?.week} · {Math.round(rushAttempts)} ATT</div></div>
                    <div className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-center ${fantasyPpgPercentile === null ? "border-slate-200 bg-white text-slate-900" : percentileStyle(fantasyPpgPercentile)}`}><div className="text-[7px] font-semibold uppercase tracking-[0.04em] opacity-65">PPR FP/G</div><div className="text-2xl font-bold leading-none">{fantasyPpg === null ? "—" : fantasyPpg.toFixed(1)}</div><div className="mt-0.5 text-[7px] font-semibold">{fantasyPpgPercentile === null ? "N/A" : `P${Math.round(fantasyPpgPercentile)}`}</div></div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {[["Rush", rawRushScore], ["Receiving", recScore], ["Opportunity", opportunityScore]].map(([label, value]) => { const score=typeof value === "number" ? value : null; return <div key={String(label)} className={`rounded-xl border p-2 text-center ${score === null ? "border-slate-200 bg-white text-slate-600" : scoreStyle(score)}`}><div className="text-[7px] font-semibold uppercase tracking-[0.04em] opacity-65">{label} Score</div><div className="mt-0.5 text-2xl font-bold leading-none">{score === null ? "—" : Math.round(score)}</div></div>;})}
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    <MobileComponentGrid title="Rushing Components" stats={RUSHING_STATS} selectedPlayer={selectedPlayer} percentilePool={percentilePool} positionPool={profilePlayers} qualified={qualified} />
                    <MobileComponentGrid title="Receiving Components" stats={RECEIVING_STATS} selectedPlayer={selectedPlayer} percentilePool={percentilePool} positionPool={profilePlayers} qualified={qualified} />
                    <MobileComponentGrid title="Opportunity Components" stats={OPPORTUNITY_STATS.filter((stat) => stat.label !== "PPR Fantasy PPG")} selectedPlayer={selectedPlayer} percentilePool={percentilePool} positionPool={profilePlayers} qualified={qualified} />
                  </div>
                </div>

                <div className="hidden sm:block">
                <div
                  className="relative overflow-hidden border-b-8 px-6 py-7 sm:px-8 sm:py-9"
                  style={{
                    background: colors[0],
                    color: themeText(colors[0]),
                    borderColor: colors[1],
                  }}
                >
                  <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative flex flex-wrap items-center gap-5">
                    {code && (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl sm:h-28 sm:w-28">
                        <img
                          src={espnLogo(
                            code
                          )}
                          alt={`${teamName(team)} logo`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] opacity-90">
                        RB Profile · Through Week {profileSnapshot?.week}
                      </div>

                      <h2 className="mt-1 text-3xl font-black sm:text-4xl">
                        {
                          selectedPlayer[
                            "Name"
                          ]
                        }
                      </h2>

                      <div className="mt-2 text-sm font-bold">
                        {teamName(team)} •{" "}
                        <span>
                          {Math.round(
                            rushAttempts
                          )}{" "}
                          ATT
                        </span>
                      </div>
                    </div>

                    <div className={`w-full rounded-2xl border p-4 shadow-xl sm:ml-auto sm:w-48 ${fantasyPpgPercentile === null ? "border-slate-200 bg-white text-slate-900" : percentileStyle(fantasyPpgPercentile)}`}>
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
                        PPR Fantasy PPG
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <div className="text-4xl font-black leading-none">
                          {fantasyPpg === null ? "—" : fantasyPpg.toFixed(1)}
                        </div>
                        <div className="text-right text-xs font-black">
                          {fantasyPpgPercentile === null ? "Unavailable" : `P${Math.round(fantasyPpgPercentile)}`}
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-black opacity-75">
                        {fantasyPpg === null ? "No fantasy data" : !fantasyPpgQualified ? "Below 5 ATT/game minimum" : `${scoreLabel(fantasyPpgPercentile ?? 0)} among qualified RBs`}
                      </div>
                    </div>
                  </div>
                </div>

                {!qualified && (
                  <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-700">
                    This RB has {Math.round(
                      rushAttempts
                    )} rushing attempts and is below the current {minRushAttempts} ATT minimum. Raw values are shown, but percentile grades are disabled.
                  </div>
                )}

                <div className="p-3 sm:p-8">
                  <div className="grid gap-3 sm:gap-5 lg:grid-cols-3">
                    <ScoreCard
                      title="Rushing Score"
                      score={
                        rawRushScore
                      }
                      subtitle={toNumber(getValue(selectedPlayer, ["YAC/Att"])) === null
                        ? "35% rush yards/game · 25% yards/rush · 40% gain profile · YAC/Att unavailable"
                        : "28% rush yards/game · 20% yards/rush · 32% gain profile · 20% YAC/Att"}
                    />

                    <ScoreCard
                      title="Receiving Score"
                      score={recScore}
                      subtitle="Receiving volume, involvement, and efficiency"
                    />

                    <ScoreCard
                      title="Opportunity Score"
                      score={
                        opportunityScore
                      }
                      subtitle="Weighted opportunity, target share, TD production, and scoring-area usage"
                    />
                  </div>

                  <ComponentSection
                    title="Rushing Components"
                    description={`Rush Gain Profile plus production, efficiency, consistency, and explosive rushing gains. Percentiles use ${minRushAttempts}+ ATT RBs.`}
                    stats={
                      RUSHING_STATS
                    }
                    selectedPlayer={
                      selectedPlayer
                    }
                    percentilePool={
                      percentilePool
                    }
                    positionPool={profilePlayers}
                    qualified={
                      qualified
                    }
                  />

                  <ComponentSection
                    title="Receiving Components"
                    description={`Receiving volume, involvement, and efficiency. Percentiles use ${minRushAttempts}+ ATT RBs.`}
                    stats={
                      RECEIVING_STATS
                    }
                    selectedPlayer={
                      selectedPlayer
                    }
                    percentilePool={
                      percentilePool
                    }
                    positionPool={profilePlayers}
                    qualified={
                      qualified
                    }
                  />

                  <ComponentSection
                    title="Opportunity Components"
                    description={`Overall workload, passing involvement, touchdown production, and high-value scoring opportunities. Percentiles use ${minRushAttempts}+ ATT RBs.`}
                    stats={
                      OPPORTUNITY_STATS
                    }
                    selectedPlayer={
                      selectedPlayer
                    }
                    percentilePool={
                      percentilePool
                    }
                    positionPool={profilePlayers}
                    qualified={
                      qualified
                    }
                  />

                  <div className="mt-8">
                    <div className="mx-auto max-w-sm">
                      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Percentile Key
                      </div>

                      <div
                        className="h-4 rounded-full border border-slate-300"
                        style={{
                          background:
                            "linear-gradient(90deg, rgb(58,116,192), white 50%, rgb(220,45,45))",
                        }}
                      />

                      <div className="mt-1 flex justify-between text-xs font-bold text-slate-500">
                        <span>Worse</span>
                        <span>Average</span>
                        <span>Better</span>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </section>

              <section className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl">
                <div className="bg-slate-950 px-5 py-5 text-white sm:px-7">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                        Weekly snapshot sheet
                      </div>
                      <h2 className="mt-1 text-2xl font-black">All Running Backs</h2>
                      <p className="mt-1 text-xs font-bold text-slate-300">
                        {weeklyTableMode === "through" ? "Cumulative stats through the selected week." : "Stats from the selected week through the latest snapshot."} Click any column to sort.
                      </p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                      {sortedTablePlayers.length} players
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Stat window
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="flex rounded-xl bg-slate-200 p-1">
                          {(["through", "since"] as WeeklyTableMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setWeeklyTableMode(mode)}
                              disabled={mode === "since" && !availableSinceWeeks.length}
                              className={`rounded-lg px-4 py-2 text-sm font-black capitalize transition ${weeklyTableMode === mode ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:text-slate-950 disabled:opacity-40"}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                        <label className="sr-only" htmlFor="rb-week-window">Week</label>
                        <select
                          id="rb-week-window"
                          value={weeklyTableMode === "through" ? selectedWeek : sinceWeek}
                          onChange={(event) => weeklyTableMode === "through" ? setSelectedWeek(Number(event.target.value)) : setSinceWeek(Number(event.target.value))}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        >
                          {(weeklyTableMode === "through" ? weeklySnapshots : availableSinceWeeks).map((snapshot) => (
                            <option key={snapshot.week} value={snapshot.week}>Week {snapshot.week}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="w-full lg:max-w-sm">
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Find player or team
                      </label>
                      <input
                        type="search"
                        value={tableSearch}
                        onChange={(event) => setTableSearch(event.target.value)}
                        placeholder="Search all RBs..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                  </div>

                  {selectedWeekSnapshot && (
                    <div className="mt-4 text-xs font-bold text-slate-500">
                      {weeklyTableMode === "through" ? `Through Week ${selectedWeekSnapshot.week}` : `Since Week ${sinceWeek} through Week ${selectedWeekSnapshot.week}`} · Snapshot captured {new Date(selectedWeekSnapshot.copiedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern.
                    </div>
                  )}
                </div>

                <div className="border-b border-slate-200 bg-white p-4 lg:hidden">
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor="rb-mobile-sort" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Sort players</label>
                      <select
                        id="rb-mobile-sort"
                        value={sortKey}
                        onChange={(event) => {
                          const key = event.target.value;
                          setSortKey(key);
                          setSortDirection(key === "Name" || key === "Team" ? "asc" : "desc");
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black text-slate-800"
                      >
                        {PLAYER_TABLE_COLUMNS.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                      aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                    >
                      {sortDirection === "asc" ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 p-4 lg:hidden">
                  {sortedTablePlayers.map((player) => {
                    const fantasyPpgValue = toNumber(player["FP/G"]);
                    const games = toNumber(player.G) ?? 0;
                    const attempts = toNumber(player.ATT) ?? 0;
                    const fantasyPpgGrade = fantasyPpgValue === null || !games || attempts / games < 5
                      ? null
                      : percentile(fantasyPpgValue, tableFantasyPpgPopulation);
                    return (
                      <article key={`mobile-${weeklyTableMode}-${sinceWeek}-${selectedWeekSnapshot?.week}-${player.Name}-${player.Team}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => profilePlayers.some((item) => item.Name === player.Name) && selectPlayer(player.Name)}
                              className="truncate text-left text-lg font-black text-slate-950 hover:text-sky-700"
                            >
                              {player.Name}
                            </button>
                            <div className="mt-1 text-xs font-bold text-slate-500">{player.Team} · {games} {games === 1 ? "game" : "games"}</div>
                          </div>
                          <div className={`shrink-0 rounded-xl border px-3 py-2 text-center ${fantasyPpgGrade === null ? "border-slate-200 bg-slate-50 text-slate-900" : scoreStyle(fantasyPpgGrade)}`}>
                            <div className="text-[9px] font-black uppercase tracking-wider opacity-70">PPR FP/G</div>
                            <div className="mt-0.5 text-xl font-black">{fantasyPpgValue === null ? "—" : fantasyPpgValue.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3">
                          {[["Rush", "Rush Score"], ["Receiving", "Rec Score"], ["Opportunity", "Opportunity Score"]].map(([label, key]) => {
                            const score = toNumber(player[key]);
                            return <div key={key} className={`rounded-xl border p-2 text-center ${score === null ? "border-slate-200 bg-white text-slate-600" : scoreStyle(score)}`}><div className="text-[9px] font-black uppercase tracking-wide opacity-70">{label}</div><div className="mt-1 text-xl font-black">{score === null ? "—" : Math.round(score)}</div></div>;
                          })}
                        </div>
                        <dl className="grid grid-cols-4 gap-x-2 gap-y-4 p-4 text-center">
                          {[["Att", "ATT", "number"], ["Rush Yds", "RuYds", "number"], ["YPC", "RuYds/Rush", "decimal2"], ["Rush TD", "RuTD", "number"], ["Targets", "Targets", "number"], ["Rec", "Rec", "number"], ["Rec Yds", "Rec Yards", "number"], ["YAC/Att", "YAC/Att", "decimal"]].map(([label, key, format]) => (
                            <div key={key}><dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-black text-slate-800">{formatTableValue(player[key] ?? "", format as PlayerTableColumn["format"])}</dd></div>
                          ))}
                        </dl>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1580px]">
                    <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        {PLAYER_TABLE_COLUMNS.map((column) => (
                          <th
                            key={column.key}
                            className={`${column.key === "Name" ? "sticky left-0 z-10 bg-slate-100" : ""} px-3 py-3 text-left`}
                            aria-sort={sortKey === column.key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort(column.key)}
                              className="inline-flex items-center gap-1 whitespace-nowrap font-black hover:text-sky-700"
                            >
                              {column.label}
                              <span className={sortKey === column.key ? "text-sky-600" : "text-slate-300"}>
                                {sortKey === column.key ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                              </span>
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTablePlayers.map((player, index) => (
                        <tr key={`${selectedWeekSnapshot?.week}-${player["Name"]}-${player["Team"]}`} className={index % 2 ? "bg-slate-50/70" : "bg-white"}>
                          {PLAYER_TABLE_COLUMNS.map((column) => {
                            const raw = player[column.key] ?? "";
                            const scoreColumn = ["Rush Score", "Rec Score", "Opportunity Score"].includes(column.key);
                            const score = scoreColumn ? toNumber(raw) : null;
                            const fantasyPpgValue = column.key === "FP/G" ? toNumber(raw) : null;
                            const fantasyPpgAttempts = toNumber(getValue(player, ["ATT", "Rush Att"])) ?? 0;
                            const fantasyPpgGames = toNumber(getValue(player, ["G", "Games"])) ?? 0;
                            const fantasyPpgQualified = fantasyPpgGames > 0 && fantasyPpgAttempts / fantasyPpgGames >= 5;
                            const fantasyPpgGrade = fantasyPpgValue === null || !fantasyPpgQualified ? null : percentile(fantasyPpgValue, tableFantasyPpgPopulation);
                            if (column.key === "Name") {
                              return (
                                <td key={column.key} className={`sticky left-0 z-[5] whitespace-nowrap px-3 py-3 ${index % 2 ? "bg-slate-50" : "bg-white"}`}>
                                  <button
                                    type="button"
                                    onClick={() => profilePlayers.some((item) => item["Name"] === player["Name"]) && selectPlayer(player["Name"])}
                                    className="font-black text-slate-900 hover:text-sky-700"
                                  >
                                    {player["Name"]}
                                  </button>
                                </td>
                              );
                            }
                            return (
                              <td key={column.key} className="whitespace-nowrap px-3 py-3 text-sm font-bold text-slate-700">
                                {fantasyPpgValue !== null && fantasyPpgGrade !== null ? (
                                  <span className={`inline-flex min-w-16 items-center justify-center rounded-lg border px-2 py-1 text-xs font-black ${scoreStyle(fantasyPpgGrade)}`}>
                                    {fantasyPpgValue.toFixed(2)}
                                  </span>
                                ) : score !== null ? (
                                  <span className={`inline-flex min-w-10 justify-center rounded-lg border px-2 py-1 text-xs font-black ${scoreStyle(score)}`}>
                                    {Math.round(score)}
                                  </span>
                                ) : formatTableValue(raw, column.format)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!sortedTablePlayers.length && (
                  <div className="p-8 text-center font-bold text-slate-500">
                    No running backs match this search.
                  </div>
                )}
              </section>
            </>
          )}
      </section>
    </main>
  );
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
}
