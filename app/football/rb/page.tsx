"use client";

import Link from "next/link";
import { calculateRbScores } from "../../../lib/data/rbScores";
import { mergeRbYac, type YacSnapshot } from "../../../lib/data/rbYac";
import { type CSSProperties, useEffect, useMemo, useState } from "react";


type DataRow = Record<string, string>;

type StatConfig = {
  label: string;
  keys: string[];
  format?: "number" | "decimal" | "decimal2" | "percent";
};

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
      <div className="p-6">
        <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
          {title}
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="text-6xl font-black leading-none">
            {score === null ? "—" : Math.round(score)}
          </div>

          <div className="text-right">
            <div className="text-sm font-black">
              {score === null ? "Unavailable" : scoreLabel(score)}
            </div>

            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
              0–100 Score
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-black/10 pt-4 text-sm font-bold opacity-75">
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
  qualified,
}: {
  title: string;
  description: string;
  stats: StatConfig[];
  selectedPlayer: DataRow;
  percentilePool: DataRow[];
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

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const rawValue =
            getValue(
              selectedPlayer,
              stat.keys
            );

          const numericValue =
            toNumber(rawValue) ?? 0;
          const missingYac = stat.keys.includes("YAC/Att") && toNumber(rawValue) === null;

          const population =
            percentilePool
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

          return (
            <div
              key={stat.label}
              className={`rounded-2xl border p-4 shadow-sm ${
                qualified && !missingYac
                  ? percentileStyle(pct)
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.1em] opacity-70">
                  {stat.label}
                </div>

                {qualified && !missingYac && (
                  <div className="shrink-0 rounded-full bg-black/10 px-2 py-1 text-[10px] font-black">
                    P{Math.round(pct)}
                  </div>
                )}
              </div>

              <div className="mt-3 text-3xl font-black">
                {missingYac ? "—" : formatStatValue(
                  rawValue,
                  stat.format
                )}
              </div>

              <div className="mt-2 text-xs font-bold opacity-70">
                {missingYac ? "Not available from PFR" : qualified
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

export default function RBPage() {
  const [updatedAt, setUpdatedAt] = useState("");
  const [yacNote, setYacNote] = useState("");
  const [players, setPlayers] =
    useState<DataRow[]>([]);

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
          setYacNote("PFR YAC/Att is unavailable. Rushing Scores require this data.");
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

  const filteredPlayers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return players.slice(0, 10);
      }

      return players
        .filter((player) =>
          (
            player["Name"] || ""
          )
            .toLowerCase()
            .includes(query)
        )
        .slice(0, 10);
    }, [players, search]);

  const selectedPlayer =
    useMemo(
      () =>
        players.find(
          (player) =>
            player["Name"] ===
            selectedName
        ),
      [players, selectedName]
    );

  const percentilePool =
    useMemo(() => {
      return players.filter((player) => {
        const attempts =
          toNumber(
            getValue(
              player,
              ["ATT", "Rush Att"]
            )
          ) ?? 0;

        return attempts >= minRushAttempts;
      });
    }, [players, minRushAttempts]);

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
              href="/football"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              ← Matchup Tool
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
          <p className="mt-2 text-sm text-slate-600">Profile scores compare all {players.length || "—"} RBs in this snapshot, including rookies. The attempts filter below applies only to component percentile grades.</p>
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
          players.length > 0 &&
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
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl">
                <div
                  className="relative overflow-hidden border-b-8 px-6 py-7 sm:px-8 sm:py-9"
                  style={{
                    background: colors[0],
                    color: themeText(colors[0]),
                    borderColor: colors[1],
                  }}
                >
                  <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative flex items-center gap-5">
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
                        RB Profile · 2026 stats
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
                  </div>
                </div>

                {!qualified && (
                  <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-700">
                    This RB has {Math.round(
                      rushAttempts
                    )} rushing attempts and is below the current {minRushAttempts} ATT minimum. Raw values are shown, but percentile grades are disabled.
                  </div>
                )}

                <div className="p-5 sm:p-8">
                  <div className="grid gap-5 lg:grid-cols-3">
                    <ScoreCard
                      title="Rushing Score"
                      score={
                        rawRushScore
                      }
                      subtitle="28% rush yards/game · 20% yards/rush · 32% gain profile · 20% YAC/Att"
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
              </section>
            </>
          )}
      </section>
    </main>
  );
}
