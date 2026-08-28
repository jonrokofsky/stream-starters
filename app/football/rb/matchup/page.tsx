"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const RB_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRoMlTzy9AR2vn-fy2hv-JJUf83oCAyw5nqg7EmRNyxm8PXaE_lsa4jXJu41qJjK6BubYlHMtpo1elk/pub?gid=684746044&single=true&output=csv";

const FOOTBALL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRms3Mg29z1wsJMAFbzpP8Bpvh3MOMB4c_qa5Dtnrvtl2I-pIDtcCDihGTlWy5mJ3Zeja3ywNng5fyO/pub?gid=1795193849&single=true&output=csv";

type DataRow = Record<string, string>;
type Direction = "higher" | "lower" | "neutral";

type StatConfig = {
  label: string;
  keys: string[];
  direction: Direction;
  decimals?: number;
};

const RB_DEFENSE_STATS: StatConfig[] = [
  {
    label: "Rush Attempts",
    keys: ["RB Rush Att"],
    direction: "higher",
    decimals: 1,
  },
  {
    label: "Rush Yards",
    keys: ["RB Rush Yds", "RB Rush Yards"],
    direction: "higher",
    decimals: 1,
  },
  {
    label: "Targets",
    keys: ["RB Tgt", "RB Targets"],
    direction: "higher",
    decimals: 1,
  },
  {
    label: "Receptions",
    keys: ["RB Rec", "RB Receptions"],
    direction: "higher",
    decimals: 1,
  },
  {
    label: "Receiving Yards",
    keys: ["RB Rec.Yds", "RB Rec Yds", "RB Receiving Yards"],
    direction: "higher",
    decimals: 1,
  },
  {
    label: "TD",
    keys: ["RB TD"],
    direction: "higher",
    decimals: 2,
  },
  {
    label: "Fantasy PPG",
    keys: ["RB Fantasy PPG", "RB FPTS/G", "RB Fantasy Points"],
    direction: "higher",
    decimals: 1,
  },
];

const TEAM_NAMES: Record<string, string> = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LV: "Las Vegas Raiders",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

const TEAM_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_NAMES).map(([code, name]) => [name, code])
);

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

function normalizeTeam(value: string) {
  const team = value.trim().toUpperCase();

  if (team === "JAC") return "JAX";
  if (team === "WSH") return "WAS";
  if (team === "TBR") return "TB";

  return team;
}

function espnLogo(team: string) {
  const map: Record<string, string> = {
    JAX: "jax",
    WAS: "wsh",
    TB: "tb",
  };

  const normalized = normalizeTeam(team);

  return `https://a.espncdn.com/i/teamlogos/nfl/500/${
    map[normalized] || normalized.toLowerCase()
  }.png`;
}

function parseCSV(text: string): DataRow[] {
  const rows: string[][] = [];

  let row: string[] = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(value);

      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((cells) => {
    const result: DataRow = {};

    headers.forEach((header, index) => {
      result[header] = (cells[index] || "").trim();
    });

    return result;
  });
}

function toNumber(value: string | undefined) {
  if (!value) return null;

  const cleaned = value
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!cleaned) return null;

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function getValue(row: DataRow | undefined, keys: string[]) {
  if (!row) return "";

  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") {
      return row[key];
    }
  }

  return "";
}

function percentile(
  value: number,
  population: number[],
  direction: Direction
) {
  if (!population.length || direction === "neutral") return 50;
  if (population.length === 1) return 50;

  const sorted = [...population].sort((a, b) => a - b);

  let below = 0;
  let equal = 0;

  for (const item of sorted) {
    if (item < value) below++;
    else if (item === value) equal++;
  }

  const raw =
    ((below + Math.max(equal - 1, 0) / 2) / (sorted.length - 1)) * 100;

  const pct = direction === "lower" ? 100 - raw : raw;

  return Math.max(0, Math.min(100, pct));
}

function clampPercentile(value: number) {
  return Math.max(0, Math.min(100, value));
}

function percentileStyle(percentileValue: number) {
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

function matchupLabel(percentileValue: number) {
  if (percentileValue >= 85) return "Elite Matchup";
  if (percentileValue >= 70) return "Favorable";
  if (percentileValue >= 55) return "Slightly Favorable";
  if (percentileValue >= 45) return "Neutral";
  if (percentileValue >= 30) return "Slightly Tough";
  if (percentileValue >= 15) return "Tough";
  return "Very Tough";
}

function playerScoreLabel(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Above Average";
  if (score >= 40) return "Average";
  if (score >= 25) return "Below Average";
  if (score >= 10) return "Poor";
  return "Very Poor";
}

function adjustmentText(adjustment: number) {
  if (adjustment === 2) {
    return "Major Defensive Improvement In Offseason + Draft";
  }

  if (adjustment === 1) {
    return "Defensive Improvement In Offseason + Draft";
  }

  if (adjustment === -1) {
    return "Defensive Decline In Offseason + Draft";
  }

  if (adjustment === -2) {
    return "Major Defensive Decline In Offseason + Draft";
  }

  return "No Major Defensive Change In Offseason + Draft";
}

function PlayerScoreCard({
  title,
  score,
}: {
  title: string;
  score: number;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${percentileStyle(score)}`}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">
        {title}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-5xl font-black leading-none">
          {Math.round(score)}
        </div>

        <div className="text-right text-xs font-black opacity-75">
          {playerScoreLabel(score)}
        </div>
      </div>
    </div>
  );
}

export default function RBMatchupPage() {
  const [rbRows, setRbRows] = useState<DataRow[]>([]);
  const [defenseRows, setDefenseRows] = useState<DataRow[]>([]);

  const [selectedName, setSelectedName] = useState("");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [rbResponse, defenseResponse] = await Promise.all([
          fetch(RB_CSV_URL, { cache: "no-store" }),
          fetch(FOOTBALL_CSV_URL, { cache: "no-store" }),
        ]);

        if (!rbResponse.ok || !defenseResponse.ok) {
          throw new Error("Could not load matchup data.");
        }

        const [rbText, defenseText] = await Promise.all([
          rbResponse.text(),
          defenseResponse.text(),
        ]);

        const parsedRB = parseCSV(rbText)
          .filter((row) => row["Name"])
          .sort((a, b) =>
            (a["Name"] || "").localeCompare(b["Name"] || "")
          );

        const parsedDefense = parseCSV(defenseText).filter((row) => {
          const team =
            row["Acronym"] ||
            row["Team Acronym"] ||
            row["Abbreviation"] ||
            row["Team"];

          return Boolean(team?.trim());
        });

        setRbRows(parsedRB);
        setDefenseRows(parsedDefense);

        if (parsedRB.length) {
          setSelectedName(parsedRB[0]["Name"]);
          setSearch(parsedRB[0]["Name"]);
        }

        if (parsedDefense.length) {
          const firstTeam =
            parsedDefense[0]["Acronym"] ||
            parsedDefense[0]["Team Acronym"] ||
            parsedDefense[0]["Abbreviation"] ||
            parsedDefense[0]["Team"];

          setSelectedTeam(normalizeTeam(firstTeam));
        }
      } catch (err) {
        console.error(err);
        setError("Could not load RB matchup data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedPlayer = useMemo(
    () =>
      rbRows.find(
        (row) => row["Name"] === selectedName
      ),
    [rbRows, selectedName]
  );

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return rbRows.slice(0, 10);
    }

    return rbRows
      .filter((row) =>
        (row["Name"] || "").toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [rbRows, search]);

  const playerTeamName = getValue(
    selectedPlayer,
    ["Team"]
  );

  const playerTeamCode =
    TEAM_CODES[playerTeamName] || "";

  const teamOptions = useMemo(() => {
    return defenseRows
      .map((row) => {
        const rawAcronym =
          row["Acronym"] ||
          row["Team Acronym"] ||
          row["Abbreviation"] ||
          row["Team"];

        const acronym = normalizeTeam(rawAcronym);

        const name =
          row["Team"] &&
          row["Team"].trim().length > 3
            ? row["Team"]
            : TEAM_NAMES[acronym] || acronym;

        return {
          acronym,
          name,
        };
      })
      .filter(
        (team, index, array) =>
          team.acronym !== playerTeamCode &&
          array.findIndex(
            (other) => other.acronym === team.acronym
          ) === index
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [defenseRows, playerTeamCode]);

  useEffect(() => {
    if (!teamOptions.length) return;

    const currentIsValid = teamOptions.some(
      (team) => team.acronym === selectedTeam
    );

    if (!currentIsValid) {
      setSelectedTeam(teamOptions[0].acronym);
    }
  }, [teamOptions, selectedTeam]);

  const selectedDefenseRow = useMemo(() => {
    return defenseRows.find((row) => {
      const raw =
        row["Acronym"] ||
        row["Team Acronym"] ||
        row["Abbreviation"] ||
        row["Team"];

      return normalizeTeam(raw) === selectedTeam;
    });
  }, [defenseRows, selectedTeam]);

  function selectPlayer(name: string) {
    setSelectedName(name);
    setSearch(name);
    setShowSuggestions(false);
  }

  const age =
    toNumber(
      getValue(selectedPlayer, ["2026 Age", "Age"])
    ) ?? 0;

  const rawRushScore =
    toNumber(
      getValue(selectedPlayer, ["Rush Score"])
    ) ?? 0;

  const rushingScore =
    toNumber(
      getValue(selectedPlayer, ["Age Adjusted Rush Score"])
    ) ?? rawRushScore;

  const receivingScore =
    toNumber(
      getValue(selectedPlayer, ["Rec Score", "Receiving Score"])
    ) ?? 0;

  const opportunityScore =
    toNumber(
      getValue(selectedPlayer, ["Opportunity Score"])
    ) ?? 0;

  const rushGainProfile =
    toNumber(
      getValue(selectedPlayer, ["Rush Gain Profile"])
    ) ?? 0;

  const defenseStatResults = useMemo(() => {
    if (!selectedDefenseRow) return [];

    return RB_DEFENSE_STATS.map((stat) => {
      const rawValue = getValue(
        selectedDefenseRow,
        stat.keys
      );

      const numericValue = toNumber(rawValue);

      const population = defenseRows
        .map((row) =>
          toNumber(
            getValue(row, stat.keys)
          )
        )
        .filter(
          (value): value is number =>
            value !== null
        );

      const pct =
        numericValue === null
          ? 50
          : percentile(
              numericValue,
              population,
              stat.direction
            );

      return {
        ...stat,
        rawValue,
        numericValue,
        percentile: pct,
      };
    });
  }, [defenseRows, selectedDefenseRow]);

  const rawOverallPercentile = useMemo(() => {
    const usable = defenseStatResults.filter(
      (stat) =>
        stat.numericValue !== null &&
        stat.direction !== "neutral"
    );

    if (!usable.length) {
      return 50;
    }

    return (
      usable.reduce(
        (sum, stat) =>
          sum + stat.percentile,
        0
      ) / usable.length
    );
  }, [defenseStatResults]);

  const offseasonAdjustment = useMemo(() => {
    if (!selectedDefenseRow) return 0;

    const raw =
      selectedDefenseRow["ADJUSTMENT"] ||
      selectedDefenseRow["Adjustment"] ||
      selectedDefenseRow["adjustment"];

    const value = toNumber(raw);

    if (value === null) return 0;

    return Math.max(
      -2,
      Math.min(2, value)
    );
  }, [selectedDefenseRow]);

  const percentileAdjustment =
    offseasonAdjustment * -7.5;

  const adjustedOverallPercentile =
    clampPercentile(
      rawOverallPercentile +
        percentileAdjustment
    );

  const defenseTeamName =
    selectedDefenseRow?.["Team"] &&
    selectedDefenseRow["Team"].trim().length > 3
      ? selectedDefenseRow["Team"]
      : TEAM_NAMES[selectedTeam] || selectedTeam;

  const playerColors =
    TEAM_COLORS[playerTeamCode] || [
      "#0F172A",
      "#2563EB",
    ];

  const defenseColors =
    TEAM_COLORS[selectedTeam] || [
      "#0F172A",
      "#2563EB",
    ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-100 to-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
              Stream Starters
            </div>

            <div className="mt-1 text-xl font-black">
              RB Matchup Tool
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/football/rb"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              ← RB Profile
            </Link>

            <Link
              href="/football"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              Position Tool
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

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Player + Matchup
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            RB Matchup Tool
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Compare an RB&apos;s profile with the opposing defense&apos;s
            2025 and 2026-adjusted RB matchup grades.
          </p>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="font-black">
              Loading RB matchup data...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          selectedPlayer && (
            <>
              <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Running Back
                    </label>

                    <div className="relative">
                      <div className="relative">
                        <input
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

                            if (e.key === "Escape") {
                              setShowSuggestions(
                                false
                              );
                            }
                          }}
                          className="h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
                          {filteredPlayers.map(
                            (player) => (
                              <button
                                key={player["Name"]}
                                type="button"
                                onMouseDown={(e) =>
                                  e.preventDefault()
                                }
                                onClick={() =>
                                  selectPlayer(
                                    player["Name"]
                                  )
                                }
                                className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50"
                              >
                                <div className="font-black">
                                  {player["Name"]}
                                </div>

                                <div className="mt-1 text-xs font-bold text-slate-500">
                                  {player["Team"]}
                                </div>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Opposing Defense
                    </label>

                    <select
                      value={selectedTeam}
                      onChange={(e) =>
                        setSelectedTeam(
                          e.target.value
                        )
                      }
                      className="h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      {teamOptions.map((team) => (
                        <option
                          key={team.acronym}
                          value={team.acronym}
                        >
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
                <div className="grid md:grid-cols-2">
                  <div
                    className="relative overflow-hidden px-5 py-7 text-white sm:px-8 sm:py-9"
                    style={{
                      background: `linear-gradient(135deg, ${playerColors[0]} 0%, ${playerColors[0]} 60%, ${playerColors[1]} 140%)`,
                    }}
                  >
                    <div className="relative flex items-center gap-5">
                      {playerTeamCode && (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl sm:h-24 sm:w-24">
                          <img
                            src={espnLogo(
                              playerTeamCode
                            )}
                            alt={`${playerTeamName} logo`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                          Running Back
                        </div>

                        <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                          {selectedPlayer["Name"]}
                        </h2>

                        <div className="mt-2 text-xs font-bold text-white/80 sm:text-sm">
                          {playerTeamName} • 2026 Age {age || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="relative overflow-hidden px-5 py-7 text-white sm:px-8 sm:py-9"
                    style={{
                      background: `linear-gradient(135deg, ${defenseColors[0]} 0%, ${defenseColors[0]} 60%, ${defenseColors[1]} 140%)`,
                    }}
                  >
                    <div className="relative flex items-center gap-5 md:flex-row-reverse md:text-right">
                      {selectedTeam && (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl sm:h-24 sm:w-24">
                          <img
                            src={espnLogo(
                              selectedTeam
                            )}
                            alt={`${defenseTeamName} logo`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                          RB Matchup vs.
                        </div>

                        <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                          {defenseTeamName}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                            {selectedTeam}
                          </span>

                          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                            RB Defense
                          </span>

                          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                            Adj{" "}
                            {offseasonAdjustment > 0
                              ? "+"
                              : ""}
                            {offseasonAdjustment}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 p-5 sm:p-8">
                  <div className="mb-4">
                    <div className="text-lg font-black">
                      RB Profile
                    </div>

                    <div className="text-xs text-slate-500">
                      Player grades from the RB Profile Tool
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <PlayerScoreCard
                      title="Rushing Score"
                      score={rushingScore}
                    />

                    <PlayerScoreCard
                      title="Receiving Score"
                      score={receivingScore}
                    />

                    <PlayerScoreCard
                      title="Opportunity Score"
                      score={opportunityScore}
                    />

                    <PlayerScoreCard
                      title="Rush Gain Profile"
                      score={rushGainProfile}
                    />
                  </div>
                </div>

                <div className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:px-8">
                  <div className="mb-5">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      2026 Overall RB Matchup Grade
                    </div>

                    <div className="mt-1 text-2xl font-black">
                      {matchupLabel(
                        adjustedOverallPercentile
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        2025 Raw
                      </div>

                      <div className="mt-2 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-4xl font-black">
                            {Math.round(
                              rawOverallPercentile
                            )}
                          </div>

                          <div className="mt-1 text-xs font-bold text-slate-400">
                            {matchupLabel(
                              rawOverallPercentile
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          Percentile
                        </div>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 ${percentileStyle(
                        adjustedOverallPercentile
                      )}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
                        2026 Adjusted
                      </div>

                      <div className="mt-2 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-4xl font-black">
                            {Math.round(
                              adjustedOverallPercentile
                            )}
                          </div>

                          <div className="mt-1 text-xs font-bold opacity-75">
                            {matchupLabel(
                              adjustedOverallPercentile
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                          Percentile
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs font-bold text-slate-300">
                        {adjustmentText(
                          offseasonAdjustment
                        )}
                      </div>

                      <div className="text-xs font-black text-white">
                        Matchup adjustment:{" "}
                        {percentileAdjustment > 0
                          ? "+"
                          : ""}
                        {percentileAdjustment.toFixed(
                          1
                        )}{" "}
                        pts
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-8">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-black">
                        2025 RB Matchup Stats
                      </div>

                      <div className="text-xs text-slate-500">
                        Raw 2025 performance compared with all NFL defenses
                      </div>
                    </div>

                    <div className="hidden items-center gap-2 text-[10px] font-black uppercase sm:flex">
                      <span className="rounded-md bg-blue-600 px-2 py-1 text-white">
                        Tough
                      </span>

                      <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">
                        Neutral
                      </span>

                      <span className="rounded-md bg-red-600 px-2 py-1 text-white">
                        Favorable
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {defenseStatResults.map(
                      (stat) => (
                        <div
                          key={stat.label}
                          className={`rounded-2xl border p-4 shadow-sm ${percentileStyle(
                            stat.percentile
                          )}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
                              {stat.label}
                            </div>

                            <div className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-black">
                              P
                              {Math.round(
                                stat.percentile
                              )}
                            </div>
                          </div>

                          <div className="mt-3 text-3xl font-black tracking-tight">
                            {stat.numericValue ===
                            null
                              ? "—"
                              : stat.numericValue.toFixed(
                                  stat.decimals ??
                                    1
                                )}
                          </div>

                          <div className="mt-2 text-xs font-bold opacity-70">
                            {matchupLabel(
                              stat.percentile
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
      </section>
    </main>
  );
}