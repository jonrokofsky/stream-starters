"use client";

import Link from "next/link";
import { toPng } from "html-to-image";
import { calculateRbScores } from "../../../../lib/data/rbScores";
import { mergeRbYac, type YacSnapshot } from "../../../../lib/data/rbYac";
import { useEffect, useMemo, useRef, useState } from "react";

const RB_DATA_URL = "/data/rb-2026.json";
const RB_YAC_DATA_URL = "/data/rb-yac-2026.json";
const RECEIVER_DATA_URL = "/data/receivers-2026.json";
const FOOTBALL_DATA_URL = "/data/nfl-defense-vs-position-2026.json";

type DataRow = Record<string, string>;
type Position = "RB" | "WR" | "TE";
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

const RECEIVER_DEFENSE_STATS: Record<"WR" | "TE", StatConfig[]> = {
  WR: [
    { label: "Targets", keys: ["WR Tgt", "WR Targets"], direction: "higher", decimals: 1 },
    { label: "Receptions", keys: ["WR Rec", "WR Receptions"], direction: "higher", decimals: 1 },
    { label: "Receiving Yards", keys: ["WR Yds", "WR Rec Yds", "WR Rec.Yds"], direction: "higher", decimals: 1 },
    { label: "TD", keys: ["WR TD"], direction: "higher", decimals: 2 },
    { label: "Fantasy PPG", keys: ["WR Fantasy PPG", "WR FPTS/G", "WR Fantasy Points"], direction: "higher", decimals: 1 },
  ],
  TE: [
    { label: "Targets", keys: ["TE Tgt", "TE Targets"], direction: "higher", decimals: 1 },
    { label: "Receptions", keys: ["TE Rec", "TE Receptions"], direction: "higher", decimals: 1 },
    { label: "Receiving Yards", keys: ["TE Rec.Yds", "TE Rec Yds", "TE Yds"], direction: "higher", decimals: 1 },
    { label: "TD", keys: ["TE TD"], direction: "higher", decimals: 2 },
    { label: "Fantasy PPG", keys: ["TE Fantasy PPG", "TE FPTS/G", "TE Fantasy Points"], direction: "higher", decimals: 1 },
  ],
};

const POSITION_LABELS: Record<Position, string> = {
  RB: "Running Back",
  WR: "Wide Receiver",
  TE: "Tight End",
};

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

export default function PositionMatchupPage() {
  const graphicRef = useRef<HTMLDivElement>(null);
  const [rbRows, setRbRows] = useState<DataRow[]>([]);
  const [receiverRows, setReceiverRows] = useState<DataRow[]>([]);
  const [defenseRows, setDefenseRows] = useState<DataRow[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position>("RB");

  const [selectedName, setSelectedName] = useState("");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [rbResponse, yacResponse, receiverResponse, defenseResponse] = await Promise.all([
          fetch(RB_DATA_URL, { cache: "no-store" }),
          fetch(RB_YAC_DATA_URL, { cache: "no-store" }),
          fetch(RECEIVER_DATA_URL, { cache: "no-store" }),
          fetch(FOOTBALL_DATA_URL, { cache: "no-store" }),
        ]);

        if (!rbResponse.ok || !yacResponse.ok || !receiverResponse.ok || !defenseResponse.ok) {
          throw new Error("Could not load matchup data.");
        }

        const [rbPayload, yacPayload, receiverPayload, defensePayload] = await Promise.all([
          rbResponse.json(),
          yacResponse.json() as Promise<YacSnapshot>,
          receiverResponse.json(),
          defenseResponse.json(),
        ]);

        const mergedRB = mergeRbYac(rbPayload.rows || [], yacPayload);
        const scores = calculateRbScores({ season: 2026, ageColumn: "unused", rows: mergedRB });
        const parsedRB: DataRow[] = mergedRB
          .map((row, index) => ({
            ...row,
            "Rush Gain Profile": scores[index].rushGain === null ? "" : String(scores[index].rushGain),
            "Rush Score": scores[index].rush === null ? "" : String(scores[index].rush),
            "Rec Score": scores[index].receiving === null ? "" : String(scores[index].receiving),
            "Opportunity Score": scores[index].opportunity === null ? "" : String(scores[index].opportunity),
          }))
          .filter((row: DataRow) => row["Name"])
          .sort((a: DataRow, b: DataRow) =>
            (a["Name"] || "").localeCompare(b["Name"] || "")
          );

        const parsedDefense: DataRow[] = (defensePayload.rows || []).filter((row: DataRow) => {
          const team =
            row["Acronym"] ||
            row["Team Acronym"] ||
            row["Abbreviation"] ||
            row["Team"];

          return Boolean(team?.trim());
        });

        const parsedReceivers: DataRow[] = (receiverPayload.rows || [])
          .filter((row: DataRow) => row["Name"] && (row["POS"] === "WR" || row["POS"] === "TE"))
          .sort((a: DataRow, b: DataRow) =>
            (a["Name"] || "").localeCompare(b["Name"] || "")
          );

        setRbRows(parsedRB);
        setReceiverRows(parsedReceivers);
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
        setError("Could not load position matchup data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const availablePlayers = useMemo(
    () => selectedPosition === "RB"
      ? rbRows
      : receiverRows.filter((row) => row["POS"] === selectedPosition),
    [rbRows, receiverRows, selectedPosition]
  );

  const selectedPlayer = useMemo(
    () => availablePlayers.find((row) => row["Name"] === selectedName),
    [availablePlayers, selectedName]
  );

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return availablePlayers.slice(0, 10);
    }

    return availablePlayers
      .filter((row) =>
        (row["Name"] || "").toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [availablePlayers, search]);

  const playerTeamName = getValue(
    selectedPlayer,
    ["Team"]
  );

  const playerTeamCode =
    TEAM_CODES[playerTeamName] || normalizeTeam(playerTeamName);

  const playerTeamDisplayName =
    TEAM_NAMES[playerTeamCode] || playerTeamName;

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

  const activeSelectedTeam = teamOptions.some(
    (team) => team.acronym === selectedTeam
  )
    ? selectedTeam
    : teamOptions[0]?.acronym || "";

  const selectedDefenseRow = useMemo(() => {
    return defenseRows.find((row) => {
      const raw =
        row["Acronym"] ||
        row["Team Acronym"] ||
        row["Abbreviation"] ||
        row["Team"];

      return normalizeTeam(raw) === activeSelectedTeam;
    });
  }, [activeSelectedTeam, defenseRows]);

  function selectPlayer(name: string) {
    setSelectedName(name);
    setSearch(name);
    setShowSuggestions(false);
  }

  const rawRushScore =
    toNumber(
      getValue(selectedPlayer, ["Rush Score"])
    ) ?? 0;

  const rushingScore = rawRushScore;

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

  const yacPerAttempt =
    toNumber(getValue(selectedPlayer, ["YAC/Att"]));

  const playerQualifies = (row: DataRow) => selectedPosition === "RB"
    ? (toNumber(getValue(row, ["ATT", "Rush Att"])) ?? 0) >= 5
    : (toNumber(getValue(row, ["Routes Run"])) ?? 0) >= 10;

  function playerMetricPercentile(keys: string[]) {
    const value = toNumber(getValue(selectedPlayer, keys));
    if (value === null) return null;

    if (!selectedPlayer || !playerQualifies(selectedPlayer)) return null;

    const population = availablePlayers
      .filter(playerQualifies)
      .map((row) => toNumber(getValue(row, keys)))
      .filter((entry): entry is number => entry !== null);

    return percentile(value, population, "higher");
  }

  const yacPerAttemptPercentile = playerMetricPercentile(["YAC/Att"]);

  const fantasyPpg =
    toNumber(getValue(selectedPlayer, ["FP/G", "Fantasy PPG"]));

  const fantasyPpgPercentile = playerMetricPercentile(["FP/G", "Fantasy PPG"]);

  const efficiencyScore =
    toNumber(getValue(selectedPlayer, ["Efficiency Grade"])) ?? 0;

  const receiverOpportunityScore =
    toNumber(getValue(selectedPlayer, ["Opportunity Grade"])) ?? 0;

  const playerProfileScore = clampPercentile(
    selectedPosition === "RB"
      ? rushingScore * 0.4 + receivingScore * 0.25 + opportunityScore * 0.35
      : efficiencyScore * 0.6 + receiverOpportunityScore * 0.4
  );

  const defenseStats = selectedPosition === "RB"
    ? RB_DEFENSE_STATS
    : RECEIVER_DEFENSE_STATS[selectedPosition];

  const defenseStatResults = useMemo(() => {
    if (!selectedDefenseRow) return [];

    return defenseStats.map((stat) => {
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
  }, [defenseRows, defenseStats, selectedDefenseRow]);

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

  const adjustedOverallPercentile = clampPercentile(rawOverallPercentile);

  const combinedMatchupScore = clampPercentile(
    playerProfileScore * 0.6 + adjustedOverallPercentile * 0.4
  );

  const defenseTeamName =
    selectedDefenseRow?.["Team"] &&
    selectedDefenseRow["Team"].trim().length > 3
      ? selectedDefenseRow["Team"]
      : TEAM_NAMES[activeSelectedTeam] || activeSelectedTeam;

  const playerColors =
    TEAM_COLORS[playerTeamCode] || [
      "#0F172A",
      "#2563EB",
    ];

  const defenseColors =
    TEAM_COLORS[activeSelectedTeam] || [
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

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch (err) {
      console.error("Position matchup clipboard copy failed:", err);
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
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-100 to-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
              Stream Starters
            </div>

            <div className="mt-1 text-xl font-black">
              Position Matchup Tool
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/football/rb"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              RB Profile
            </Link>

            <Link
              href="/football/receivers"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              Receiver Profile
            </Link>

            <Link
              href="/football"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              Defense vs Position
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
            Position Matchup Tool
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Combine current RB, WR, and TE profile grades with the same 2026
            defense data used by Defense vs Position.
          </p>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="font-black">
              Loading position matchup data...
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
                <div className="mb-5 flex flex-wrap gap-2">
                  {(["RB", "WR", "TE"] as Position[]).map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() => {
                        setSelectedPosition(position);
                        setShowSuggestions(false);
                        const players = position === "RB"
                          ? rbRows
                          : receiverRows.filter((row) => row["POS"] === position);
                        if (players.length) {
                          setSelectedName(players[0]["Name"]);
                          setSearch(players[0]["Name"]);
                        }
                      }}
                      className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${
                        selectedPosition === position
                          ? "bg-slate-950 text-white shadow-md"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {position}
                    </button>
                  ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      {POSITION_LABELS[selectedPosition]}
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
                      value={activeSelectedTeam}
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

              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={copyGraphicToClipboard}
                  disabled={exporting}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-md transition hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div ref={graphicRef} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
                <div className="grid md:grid-cols-2">
                  <div
                    className="relative overflow-hidden px-5 py-7 text-white sm:px-8 sm:py-9"
                    style={{
                      background: `linear-gradient(135deg, ${playerColors[0]} 0%, ${playerColors[0]} 60%, ${playerColors[1]} 140%)`,
                    }}
                  >
                    <div className="relative flex flex-wrap items-center gap-5">
                      {playerTeamCode && (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl sm:h-24 sm:w-24">
                          <img
                            src={espnLogo(
                              playerTeamCode
                            )}
                            alt={`${playerTeamDisplayName} logo`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                          {POSITION_LABELS[selectedPosition]}
                        </div>

                        <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                          {selectedPlayer["Name"]}
                        </h2>

                        <div className="mt-2 text-xs font-bold text-white/80 sm:text-sm">
                          {playerTeamDisplayName} • 2026 season
                        </div>
                      </div>

                      <div className={`ml-auto w-full rounded-2xl border p-4 shadow-xl sm:w-44 ${fantasyPpgPercentile === null ? "border-slate-200 bg-white text-slate-900" : percentileStyle(fantasyPpgPercentile)}`}>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">PPR Fantasy PPG</div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <div className="text-3xl font-black leading-none">{fantasyPpg === null ? "—" : fantasyPpg.toFixed(1)}</div>
                          <div className="text-xs font-black">{fantasyPpgPercentile === null ? "" : `P${Math.round(fantasyPpgPercentile)}`}</div>
                        </div>
                        <div className="mt-2 text-[11px] font-black opacity-75">{fantasyPpg === null ? "Unavailable" : fantasyPpgPercentile === null ? `Below ${selectedPosition === "RB" ? "5 ATT" : "10 routes"} minimum` : `${playerScoreLabel(fantasyPpgPercentile)} among qualified ${selectedPosition}s`}</div>
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
                      {activeSelectedTeam && (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl sm:h-24 sm:w-24">
                          <img
                            src={espnLogo(
                              activeSelectedTeam
                            )}
                            alt={`${defenseTeamName} logo`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                          {selectedPosition} Matchup vs.
                        </div>

                        <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                          {defenseTeamName}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                            {activeSelectedTeam}
                          </span>

                          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                            {selectedPosition} Defense
                          </span>

                          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                            2026 Live
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:px-8">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div
                      className={`rounded-2xl border p-4 ${percentileStyle(
                        rawOverallPercentile
                      )}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
                        Matchup Grade
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-4xl font-black">
                            {Math.round(rawOverallPercentile)}
                          </div>
                          <div className="mt-1 text-xs font-bold opacity-75">
                            {matchupLabel(rawOverallPercentile)}
                          </div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                          Opponent
                        </div>
                      </div>

                    </div>
                    <div
                      className={`rounded-2xl border p-4 ${percentileStyle(
                        combinedMatchupScore
                      )}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
                        Combined Start Score
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-4xl font-black">{Math.round(combinedMatchupScore)}</div>
                          <div className="mt-1 text-xs font-bold opacity-75">{matchupLabel(combinedMatchupScore)}</div>
                        </div>
                        <div className="text-right text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                          60% player · 40% matchup
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 p-5 sm:p-8">
                  <div className="mb-4">
                    <div className="text-lg font-black">Player Stats</div>
                    <div className="text-xs text-slate-500">
                      {selectedPosition === "RB"
                        ? "Current RB profile grades and rushing efficiency"
                        : `Current ${selectedPosition} efficiency and opportunity profile`}
                    </div>
                  </div>
                  {selectedPosition === "RB" ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <PlayerScoreCard title="Rushing Score" score={rushingScore} />
                      <PlayerScoreCard title="Receiving Score" score={receivingScore} />
                      <PlayerScoreCard title="Opportunity Score" score={opportunityScore} />
                      <PlayerScoreCard title="Rush Gain Profile" score={rushGainProfile} />
                      <div className={`rounded-2xl border p-5 shadow-sm ${
                        yacPerAttemptPercentile === null
                          ? "border-slate-200 bg-white text-slate-950"
                          : percentileStyle(yacPerAttemptPercentile)
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">YAC / Attempt</div>
                          {yacPerAttemptPercentile !== null && (
                            <div className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-black">
                              P{Math.round(yacPerAttemptPercentile)}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 text-5xl font-black leading-none">{yacPerAttempt === null ? "—" : yacPerAttempt.toFixed(1)}</div>
                        <div className="mt-2 text-xs font-black opacity-70">{yacPerAttempt === null ? "Not available · excluded from Rush Score" : playerScoreLabel(yacPerAttemptPercentile ?? 50)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <PlayerScoreCard title="Efficiency Grade" score={efficiencyScore} />
                      <PlayerScoreCard title="Opportunity Grade" score={receiverOpportunityScore} />
                      {[
                        ["Yards / Route Run", "YPRR"],
                        ["YAC / Reception", "YAC/Rec"],
                        ["Routes / Game", "Routes/G"],
                      ].map(([label, key]) => {
                        const value = toNumber(getValue(selectedPlayer, [key]));
                        const metricPercentile = playerMetricPercentile([key]);
                        return (
                          <div
                            key={key}
                            className={`rounded-2xl border p-5 shadow-sm ${
                              metricPercentile === null
                                ? "border-slate-200 bg-white text-slate-950"
                                : percentileStyle(metricPercentile)
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">{label}</div>
                              {metricPercentile !== null && (
                                <div className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-black">
                                  P{Math.round(metricPercentile)}
                                </div>
                              )}
                            </div>
                            <div className="mt-4 text-5xl font-black leading-none">
                              {value === null ? "—" : value.toFixed(2)}
                            </div>
                            <div className="mt-2 text-xs font-black opacity-70">
                              {metricPercentile === null ? "Not available" : playerScoreLabel(metricPercentile)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-8">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-black">
                        Defense Stats
                      </div>

                      <div className="text-xs text-slate-500">
                        Per-game 2026 performance compared with all NFL defenses
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

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    })
  );
}
