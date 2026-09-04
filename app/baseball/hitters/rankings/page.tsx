"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMoQ6GKabXGL5IlKEQDJQOu3YwvnHkVl_SlSA2E3zBKUmA7hsX-a8yQW8wPmkuU5g0R3CZv9x4aGvj/pub?gid=842366536&single=true&output=csv";

const STARTING_ELO = 1500;
const MIN_PA = 50;

const EARLY_ACCESS_KEY =
  "stream-starters-hitter-rankings-access";

const POSITION_TABS = [
  "Overall",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "OF",
  "DH",
] as const;

const MATCHUP_POOLS = [
  "All",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "OF",
  "DH",
  "2B/SS",
  "1B/3B",
] as const;

type PositionTab = (typeof POSITION_TABS)[number];
type MatchupPool = (typeof MATCHUP_POOLS)[number];

type Player = {
  Name: string;
  Team: string;
  Pos: string;
  "$ Value": string;
  PA: string;
  "BB%": string;
  "K%": string;
  "Z-Contact%": string;
  "SqUpSw%": string;
  HR: string;
  "HR%": string;
  EV90: string;
  "Z-Swing%": string;
  "O-Swing%": string;
  "Z-O": string;
  wOBA: string;
  xwOBA: string;
  SB: string;
  [key: string]: string;
};

type PlayerRating = {
  elo: number;
  wins: number;
  losses: number;
  comparisons: number;
};

type RatingsMap = Record<string, PlayerRating>;

type ApiRating = {
  playerName: string;
  elo: number;
  wins: number;
  losses: number;
  comparisons: number;
};

type HistoryItem = {
  id: number;
  winner: string;
  loser: string;
  winnerBefore: number;
  loserBefore: number;
  winnerAfter: number;
  loserAfter: number;
  createdAt: string;
};

type StatConfig = {
  key: string;
  label: string;
  higherIsBetter: boolean;
  format?: "percent" | "decimal" | "money" | "number";
};

type StatGroup = {
  title: string;
  subtitle: string;
  stats: StatConfig[];
};

type TeamTheme = {
  primary: string;
  secondary: string;
  text: string;
};

const TEAM_THEMES: Record<string, TeamTheme> = {
  ARI: { primary: "#A71930", secondary: "#E3D4AD", text: "#FFFFFF" },
  ATL: { primary: "#CE1141", secondary: "#13274F", text: "#FFFFFF" },
  BAL: { primary: "#DF4601", secondary: "#000000", text: "#FFFFFF" },
  BOS: { primary: "#BD3039", secondary: "#0C2340", text: "#FFFFFF" },
  CHC: { primary: "#0E3386", secondary: "#CC3433", text: "#FFFFFF" },
  CHW: { primary: "#27251F", secondary: "#C4CED4", text: "#FFFFFF" },
  CWS: { primary: "#27251F", secondary: "#C4CED4", text: "#FFFFFF" },
  CIN: { primary: "#C6011F", secondary: "#000000", text: "#FFFFFF" },
  CLE: { primary: "#00385D", secondary: "#E50022", text: "#FFFFFF" },
  COL: { primary: "#33006F", secondary: "#C4CED4", text: "#FFFFFF" },
  DET: { primary: "#0C2340", secondary: "#FA4616", text: "#FFFFFF" },
  HOU: { primary: "#002D62", secondary: "#EB6E1F", text: "#FFFFFF" },
  KCR: { primary: "#004687", secondary: "#BD9B60", text: "#FFFFFF" },
  KC: { primary: "#004687", secondary: "#BD9B60", text: "#FFFFFF" },
  LAA: { primary: "#BA0021", secondary: "#003263", text: "#FFFFFF" },
  LAD: { primary: "#005A9C", secondary: "#EF3E42", text: "#FFFFFF" },
  MIA: { primary: "#00A3E0", secondary: "#EF3340", text: "#FFFFFF" },
  MIL: { primary: "#12284B", secondary: "#FFC52F", text: "#FFFFFF" },
  MIN: { primary: "#002B5C", secondary: "#D31145", text: "#FFFFFF" },
  NYM: { primary: "#002D72", secondary: "#FF5910", text: "#FFFFFF" },
  NYY: { primary: "#0C2340", secondary: "#C4CED4", text: "#FFFFFF" },
  ATH: { primary: "#003831", secondary: "#EFB21E", text: "#FFFFFF" },
  OAK: { primary: "#003831", secondary: "#EFB21E", text: "#FFFFFF" },
  PHI: { primary: "#E81828", secondary: "#002D72", text: "#FFFFFF" },
  PIT: { primary: "#27251F", secondary: "#FDB827", text: "#FFFFFF" },
  SDP: { primary: "#2F241D", secondary: "#FFC425", text: "#FFFFFF" },
  SD: { primary: "#2F241D", secondary: "#FFC425", text: "#FFFFFF" },
  SFG: { primary: "#27251F", secondary: "#FD5A1E", text: "#FFFFFF" },
  SF: { primary: "#27251F", secondary: "#FD5A1E", text: "#FFFFFF" },
  SEA: { primary: "#0C2C56", secondary: "#005C5C", text: "#FFFFFF" },
  STL: { primary: "#C41E3A", secondary: "#0C2340", text: "#FFFFFF" },
  TBR: { primary: "#092C5C", secondary: "#8FBCE6", text: "#FFFFFF" },
  TB: { primary: "#092C5C", secondary: "#8FBCE6", text: "#FFFFFF" },
  TEX: { primary: "#003278", secondary: "#C0111F", text: "#FFFFFF" },
  TOR: { primary: "#134A8E", secondary: "#E8291C", text: "#FFFFFF" },
  WSN: { primary: "#AB0003", secondary: "#14225A", text: "#FFFFFF" },
  WSH: { primary: "#AB0003", secondary: "#14225A", text: "#FFFFFF" },
};

const STAT_GROUPS: StatGroup[] = [
  {
    title: "Plate Discipline",
    subtitle:
      "Swing decisions, zone aggression and strikeout control",
    stats: [
      {
        key: "BB%",
        label: "BB%",
        higherIsBetter: true,
        format: "percent",
      },
      {
        key: "K%",
        label: "K%",
        higherIsBetter: false,
        format: "percent",
      },
      {
        key: "Z-Swing%",
        label: "Z-Swing%",
        higherIsBetter: true,
        format: "percent",
      },
      {
        key: "O-Swing%",
        label: "O-Swing%",
        higherIsBetter: false,
        format: "percent",
      },
      {
        key: "Z-O",
        label: "Z-O",
        higherIsBetter: true,
        format: "percent",
      },
    ],
  },
  {
    title: "Contact Quality",
    subtitle:
      "How often the hitter squares up hittable pitches",
    stats: [
      {
        key: "SqUpSw%",
        label: "SqUpSw%",
        higherIsBetter: true,
        format: "percent",
      },
      {
        key: "Z-Contact%",
        label: "Z-Con%",
        higherIsBetter: true,
        format: "percent",
      },
    ],
  },
  {
    title: "Power",
    subtitle:
      "Home-run production and high-end exit velocity",
    stats: [
      {
        key: "HR",
        label: "HR",
        higherIsBetter: true,
        format: "number",
      },
      {
        key: "HR%",
        label: "HR%",
        higherIsBetter: true,
        format: "percent",
      },
      {
        key: "EV90",
        label: "EV90",
        higherIsBetter: true,
        format: "number",
      },
    ],
  },
  {
    title: "Production",
    subtitle:
      "Overall offensive value and speed",
    stats: [
      {
        key: "xwOBA",
        label: "xwOBA",
        higherIsBetter: true,
        format: "decimal",
      },
      {
        key: "wOBA",
        label: "wOBA",
        higherIsBetter: true,
        format: "decimal",
      },
      {
        key: "SB",
        label: "SB",
        higherIsBetter: true,
        format: "number",
      },
    ],
  },
];

const ALL_STATS = STAT_GROUPS.flatMap(
  (group) => group.stats
);

function normalizeTeam(team: string) {
  return team.trim().toUpperCase();
}

function getTeamTheme(team: string) {
  const code = normalizeTeam(team);

  return (
    TEAM_THEMES[code] ?? {
      primary: "#0B1F3A",
      secondary: "#0EA5E9",
      text: "#FFFFFF",
    }
  );
}

function parsePositions(pos: string) {
  if (!pos) return [];

  return pos
    .toUpperCase()
    .split(/[\/,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function playerHasPosition(
  player: Player,
  position: PositionTab
) {
  if (position === "Overall") return true;

  return parsePositions(player.Pos).includes(position);
}

function getPoolPositions(
  pool: MatchupPool
): string[] {
  if (pool === "All") return [];

  if (pool === "2B/SS") return ["2B", "SS"];
  if (pool === "1B/3B") return ["1B", "3B"];

  return [pool];
}

function playerInMatchupPool(
  player: Player,
  pool: MatchupPool
) {
  if (pool === "All") return true;

  const playerPositions = parsePositions(player.Pos);
  const poolPositions = getPoolPositions(pool);

  return poolPositions.some((position) =>
    playerPositions.includes(position)
  );
}

function parseCSV(text: string): Player[] {
  const rows: string[][] = [];

  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !inQuotes
    ) {
      if (
        char === "\r" &&
        text[i + 1] === "\n"
      ) {
        i++;
      }

      row.push(cell);
      rows.push(row);

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) =>
    header.trim()
  );

  return rows
    .slice(1)
    .map((r) => {
      const obj: Record<string, string> = {};

      headers.forEach((header, index) => {
        obj[header] = (r[index] ?? "").trim();
      });

      return obj as Player;
    })
    .filter((player) => player.Name);
}

function numericValue(
  value: string | undefined
): number | null {
  if (!value) return null;

  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned) return null;

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}

function percentile(
  playerValue: string | undefined,
  values: number[],
  higherIsBetter: boolean
) {
  const value = numericValue(playerValue);

  if (
    value === null ||
    values.length < 2
  ) {
    return 50;
  }

  const sorted = [...values].sort(
    (a, b) => a - b
  );

  let below = 0;
  let equal = 0;

  for (const v of sorted) {
    if (v < value) below++;
    if (v === value) equal++;
  }

  const raw =
    ((below +
      Math.max(equal - 1, 0) / 2) /
      (sorted.length - 1)) *
    100;

  const adjusted = higherIsBetter
    ? raw
    : 100 - raw;

  return Math.max(
    0,
    Math.min(100, adjusted)
  );
}

function percentileStyle(pct: number) {
  if (pct >= 90) {
    return {
      background: "rgb(185, 28, 28)",
      color: "white",
    };
  }

  if (pct >= 80) {
    return {
      background: "rgb(220, 38, 38)",
      color: "white",
    };
  }

  if (pct >= 70) {
    return {
      background: "rgb(248, 113, 113)",
      color: "#111827",
    };
  }

  if (pct >= 60) {
    return {
      background: "rgb(254, 202, 202)",
      color: "#111827",
    };
  }

  if (pct >= 40) {
    return {
      background: "white",
      color: "#111827",
    };
  }

  if (pct >= 30) {
    return {
      background: "rgb(191, 219, 254)",
      color: "#111827",
    };
  }

  if (pct >= 20) {
    return {
      background: "rgb(96, 165, 250)",
      color: "#111827",
    };
  }

  if (pct >= 10) {
    return {
      background: "rgb(37, 99, 235)",
      color: "white",
    };
  }

  return {
    background: "rgb(30, 64, 175)",
    color: "white",
  };
}

function formatStat(
  value: string | undefined,
  stat: StatConfig
) {
  if (!value) return "—";

  const number = numericValue(value);

  if (number === null) return value;

  if (stat.format === "percent") {
    return `${number.toFixed(1)}%`;
  }

  if (stat.format === "decimal") {
    return number.toFixed(3);
  }

  if (stat.format === "money") {
    return `$${number.toFixed(2)}`;
  }

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(1);
}

function formatContextValue(
  value: string | undefined,
  type: "money" | "number"
) {
  if (!value) return "—";

  const number = numericValue(value);

  if (number === null) return value;

  if (type === "money") {
    return `$${number.toFixed(2)}`;
  }

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(1);
}

function randomItem<T>(items: T[]) {
  return items[
    Math.floor(Math.random() * items.length)
  ];
}

function ratingKey(name: string) {
  return name.trim();
}

function defaultPlayerRating(): PlayerRating {
  return {
    elo: STARTING_ELO,
    wins: 0,
    losses: 0,
    comparisons: 0,
  };
}

export default function HitterRankingsPage() {
  const router = useRouter();

  const [accessChecked, setAccessChecked] =
    useState(false);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [ratings, setRatings] =
    useState<RatingsMap>({});

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [playerA, setPlayerA] =
    useState<Player | null>(null);

  const [playerB, setPlayerB] =
    useState<Player | null>(null);

  const [tab, setTab] = useState<
    "compare" | "rankings" | "history"
  >("compare");

  const [
    rankingPosition,
    setRankingPosition,
  ] =
    useState<PositionTab>("Overall");

  const [matchupPool, setMatchupPool] =
    useState<MatchupPool>("All");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const granted =
      localStorage.getItem(
        EARLY_ACCESS_KEY
      ) === "granted";

    if (!granted) {
      router.replace("/");
      return;
    }

    setAccessChecked(true);
  }, [router]);

  useEffect(() => {
    if (!accessChecked) return;

    async function loadData() {
      try {
        setLoading(true);
        setMessage("");

        const [csvResponse, rankingResponse] =
          await Promise.all([
            fetch(CSV_URL, {
              cache: "no-store",
            }),

            fetch("/api/hitter-rankings", {
              cache: "no-store",
            }),
          ]);

        if (!csvResponse.ok) {
          throw new Error(
            "Unable to load hitter sheet."
          );
        }

        if (!rankingResponse.ok) {
          throw new Error(
            "Unable to load cloud rankings."
          );
        }

        const csvText =
          await csvResponse.text();

        const cloudData =
          await rankingResponse.json();

        const allPlayers =
          parseCSV(csvText);

        const eligiblePlayers =
          allPlayers.filter((player) => {
            const pa = numericValue(
              player.PA
            );

            return (
              pa !== null &&
              pa >= MIN_PA
            );
          });

        const initialRatings: RatingsMap =
          {};

        eligiblePlayers.forEach(
          (player) => {
            initialRatings[
              ratingKey(player.Name)
            ] = defaultPlayerRating();
          }
        );

        const cloudRatings: ApiRating[] =
          Array.isArray(
            cloudData?.ratings
          )
            ? cloudData.ratings
            : [];

        cloudRatings.forEach(
          (rating) => {
            if (
              initialRatings[
                ratingKey(
                  rating.playerName
                )
              ]
            ) {
              initialRatings[
                ratingKey(
                  rating.playerName
                )
              ] = {
                elo: rating.elo,
                wins: rating.wins,
                losses:
                  rating.losses,
                comparisons:
                  rating.comparisons,
              };
            }
          }
        );

        const cloudHistory: HistoryItem[] =
          Array.isArray(
            cloudData?.history
          )
            ? cloudData.history
            : [];

        setPlayers(
          eligiblePlayers
        );

        setRatings(
          initialRatings
        );

        setHistory(
          cloudHistory
        );

        setLoading(false);

        setTimeout(() => {
          createNextMatchup(
            eligiblePlayers,
            initialRatings,
            "All",
            cloudHistory
          );
        }, 0);
      } catch (error) {
        console.error(error);

        setMessage(
          "Could not load hitter rankings."
        );

        setLoading(false);
      }
    }

    loadData();
  }, [accessChecked]);

  function createNextMatchup(
    sourcePlayers = players,
    sourceRatings = ratings,
    pool: MatchupPool = matchupPool,
    sourceHistory = history
  ) {
    const eligiblePlayers =
      sourcePlayers.filter(
        (player) =>
          playerInMatchupPool(
            player,
            pool
          )
      );

    if (
      eligiblePlayers.length < 2
    ) {
      setMessage(
        `Not enough eligible hitters are available for the ${pool} matchup pool.`
      );

      return;
    }

    const leastCompared = [
      ...eligiblePlayers,
    ].sort((a, b) => {
      const aRating =
        sourceRatings[
          ratingKey(a.Name)
        ];

      const bRating =
        sourceRatings[
          ratingKey(b.Name)
        ];

      return (
        (aRating?.comparisons ??
          0) -
        (bRating?.comparisons ??
          0)
      );
    });

    const desiredPoolSize =
      Math.ceil(
        eligiblePlayers.length *
          0.35
      );

    const poolSize =
      Math.min(
        eligiblePlayers.length,
        Math.max(
          2,
          Math.min(
            30,
            desiredPoolSize
          )
        )
      );

    const candidatePool =
      leastCompared.slice(
        0,
        poolSize
      );

    const first =
      randomItem(candidatePool);

    const firstRating =
      sourceRatings[
        ratingKey(first.Name)
      ]?.elo ??
      STARTING_ELO;

    const possibleOpponents =
      eligiblePlayers
        .filter(
          (player) =>
            player.Name !==
            first.Name
        )
        .map((player) => {
          const rating =
            sourceRatings[
              ratingKey(
                player.Name
              )
            ]?.elo ??
            STARTING_ELO;

          const comparisons =
            sourceRatings[
              ratingKey(
                player.Name
              )
            ]?.comparisons ??
            0;

          const eloDistance =
            Math.abs(
              firstRating -
                rating
            );

          const recentPenalty =
            sourceHistory
              .slice(-10)
              .some(
                (item) =>
                  (item.winner ===
                    first.Name &&
                    item.loser ===
                      player.Name) ||
                  (item.winner ===
                    player.Name &&
                    item.loser ===
                      first.Name)
              )
              ? 200
              : 0;

          const score =
            eloDistance +
            comparisons * 5 +
            recentPenalty +
            Math.random() *
              50;

          return {
            player,
            score,
          };
        })
        .sort(
          (a, b) =>
            a.score - b.score
        );

    if (
      !possibleOpponents.length
    ) {
      setMessage(
        `No eligible matchup could be created for the ${pool} pool.`
      );

      return;
    }

    setMessage("");

    const opponentPool =
      possibleOpponents.slice(
        0,
        Math.min(
          10,
          possibleOpponents.length
        )
      );

    const second =
      randomItem(
        opponentPool
      ).player;

    if (Math.random() > 0.5) {
      setPlayerA(first);
      setPlayerB(second);
    } else {
      setPlayerA(second);
      setPlayerB(first);
    }
  }

  function changeMatchupPool(
    pool: MatchupPool
  ) {
    setMatchupPool(pool);

    createNextMatchup(
      players,
      ratings,
      pool,
      history
    );
  }

  async function chooseWinner(
    winner: Player,
    loser: Player
  ) {
    if (saving) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/hitter-rankings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "pick",
            winner: winner.Name,
            loser: loser.Name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to save selection."
        );
      }

      const result =
        await response.json();

      const updatedRatings: RatingsMap =
        {
          ...ratings,
        };

      updatedRatings[
        ratingKey(
          result.winner.playerName
        )
      ] = {
        elo: result.winner.elo,
        wins: result.winner.wins,
        losses:
          result.winner.losses,
        comparisons:
          result.winner
            .comparisons,
      };

      updatedRatings[
        ratingKey(
          result.loser.playerName
        )
      ] = {
        elo: result.loser.elo,
        wins: result.loser.wins,
        losses:
          result.loser.losses,
        comparisons:
          result.loser
            .comparisons,
      };

      const nextHistory = [
        ...history,
        result.history,
      ];

      setRatings(
        updatedRatings
      );

      setHistory(
        nextHistory
      );

      createNextMatchup(
        players,
        updatedRatings,
        matchupPool,
        nextHistory
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Could not save that pick."
      );
    } finally {
      setSaving(false);
    }
  }

  async function undoLastPick() {
    if (
      saving ||
      !history.length
    ) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/hitter-rankings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "undo",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to undo."
        );
      }

      const result =
        await response.json();

      if (result.empty) {
        setHistory([]);
        return;
      }

      const updatedRatings: RatingsMap =
        {
          ...ratings,
        };

      updatedRatings[
        ratingKey(
          result.winner.playerName
        )
      ] = {
        elo: result.winner.elo,
        wins: result.winner.wins,
        losses:
          result.winner.losses,
        comparisons:
          result.winner
            .comparisons,
      };

      updatedRatings[
        ratingKey(
          result.loser.playerName
        )
      ] = {
        elo: result.loser.elo,
        wins: result.loser.wins,
        losses:
          result.loser.losses,
        comparisons:
          result.loser
            .comparisons,
      };

      setRatings(
        updatedRatings
      );

      setHistory((previous) =>
        previous.filter(
          (item) =>
            item.id !==
            result.undoneHistoryId
        )
      );

      const winnerPlayer =
        players.find(
          (player) =>
            player.Name ===
            result.matchup
              .winner
        );

      const loserPlayer =
        players.find(
          (player) =>
            player.Name ===
            result.matchup.loser
        );

      if (
        winnerPlayer &&
        loserPlayer
      ) {
        setPlayerA(
          winnerPlayer
        );

        setPlayerB(
          loserPlayer
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        "Could not undo the last pick."
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetRankings() {
    if (saving) return;

    const confirmed =
      window.confirm(
        "Reset all hitter Elo rankings and matchup history on every device?"
      );

    if (!confirmed) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/hitter-rankings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "reset",
            playerNames:
              players.map(
                (player) =>
                  player.Name
              ),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to reset."
        );
      }

      const resetRatings: RatingsMap =
        {};

      players.forEach(
        (player) => {
          resetRatings[
            ratingKey(
              player.Name
            )
          ] =
            defaultPlayerRating();
        }
      );

      setRatings(
        resetRatings
      );

      setHistory([]);

      createNextMatchup(
        players,
        resetRatings,
        matchupPool,
        []
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Could not reset rankings."
      );
    } finally {
      setSaving(false);
    }
  }

  const statPopulations =
    useMemo(() => {
      const map: Record<
        string,
        number[]
      > = {};

      ALL_STATS.forEach(
        (stat) => {
          map[stat.key] =
            players
              .map((player) =>
                numericValue(
                  player[
                    stat.key
                  ]
                )
              )
              .filter(
                (
                  value
                ): value is number =>
                  value !== null
              );
        }
      );

      return map;
    }, [players]);

  const leaderboard =
    useMemo(() => {
      return [...players]
        .filter((player) =>
          playerHasPosition(
            player,
            rankingPosition
          )
        )
        .map((player) => {
          const rating =
            ratings[
              ratingKey(
                player.Name
              )
            ] ??
            defaultPlayerRating();

          return {
            player,
            ...rating,
          };
        })
        .sort((a, b) => {
          if (
            b.elo !== a.elo
          ) {
            return (
              b.elo - a.elo
            );
          }

          return (
            b.comparisons -
            a.comparisons
          );
        });
    }, [
      players,
      ratings,
      rankingPosition,
    ]);

  function StatCell({
    player,
    stat,
    side,
  }: {
    player: Player;
    stat: StatConfig;
    side: "left" | "right";
  }) {
    const pct = percentile(
      player[stat.key],
      statPopulations[
        stat.key
      ] ?? [],
      stat.higherIsBetter
    );

    return (
      <div
        key={`${side}-${stat.key}`}
        className="rounded-xl border border-black/10 px-2 py-3 text-center"
        style={
          percentileStyle(pct)
        }
      >
        <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
          {stat.label}
        </div>

        <div className="mt-1 text-lg font-black leading-none">
          {formatStat(
            player[stat.key],
            stat
          )}
        </div>

        <div className="mt-1 text-[10px] font-black opacity-65">
          P{Math.round(pct)}
        </div>
      </div>
    );
  }

  function PlayerCard({
    player,
    side,
  }: {
    player: Player;
    side: "left" | "right";
  }) {
    const rating =
      ratings[
        ratingKey(
          player.Name
        )
      ] ??
      defaultPlayerRating();

    const theme =
      getTeamTheme(
        player.Team
      );

    return (
      <div
        className="overflow-hidden rounded-3xl border-2 bg-white shadow-sm"
        style={{
          borderColor:
            theme.primary,
        }}
      >
        <div
          className="px-5 py-5"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            color: theme.text,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] opacity-85">
                {player.Team} •{" "}
                {player.Pos}
              </div>

              <div className="mt-1 text-2xl font-black leading-tight md:text-3xl">
                {player.Name}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 px-4 py-2 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider opacity-75">
                Elo
              </div>

              <div className="text-2xl font-black">
                {rating.elo}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-wider opacity-75">
                $ Value
              </div>

              <div className="mt-0.5 text-base font-black">
                {formatContextValue(
                  player[
                    "$ Value"
                  ],
                  "money"
                )}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-wider opacity-75">
                PA
              </div>

              <div className="mt-0.5 text-base font-black">
                {formatContextValue(
                  player.PA,
                  "number"
                )}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-wider opacity-75">
                Record
              </div>

              <div className="mt-0.5 text-base font-black">
                {rating.wins}-
                {rating.losses}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-wider opacity-75">
                Comparisons
              </div>

              <div className="mt-0.5 text-base font-black">
                {
                  rating.comparisons
                }
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {STAT_GROUPS.map(
            (group) => (
              <section
                key={
                  group.title
                }
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <div
                  className="border-b border-slate-200 px-4 py-3"
                  style={{
                    borderLeft: `5px solid ${theme.primary}`,
                  }}
                >
                  <div className="text-sm font-black uppercase tracking-wide text-slate-800">
                    {
                      group.title
                    }
                  </div>

                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    {
                      group.subtitle
                    }
                  </div>
                </div>

                <div
                  className={`grid gap-2 p-3 ${
                    group.stats
                      .length === 5
                      ? "grid-cols-2 sm:grid-cols-5"
                      : group.stats
                            .length ===
                          3
                        ? "grid-cols-3"
                        : "grid-cols-2"
                  }`}
                >
                  {group.stats.map(
                    (stat) => (
                      <StatCell
                        key={`${side}-${group.title}-${stat.key}`}
                        player={
                          player
                        }
                        stat={stat}
                        side={side}
                      />
                    )
                  )}
                </div>
              </section>
            )
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (
              !playerA ||
              !playerB
            ) {
              return;
            }

            const loser =
              player.Name ===
              playerA.Name
                ? playerB
                : playerA;

            chooseWinner(
              player,
              loser
            );
          }}
          className="w-full border-t px-5 py-6 text-lg font-black transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 md:text-xl"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            color: theme.text,
            borderColor:
              theme.primary,
          }}
        >
          {saving
            ? "Saving..."
            : `Choose ${player.Name}`}
        </button>
      </div>
    );
  }

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl text-center font-bold text-slate-500">
          Checking access...
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 font-bold">
            Loading cloud
            rankings...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 rounded-3xl border border-sky-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                Stream Starters •
                Fantasy Baseball
              </div>

              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Hitter 1v1
                Rankings
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Cloud-synced Elo
                rankings • Minimum{" "}
                {MIN_PA} PA
              </p>
            </div>

            <Link
              href="/"
              className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-blue-700"
            >
              ← Home
            </Link>
          </div>
        </header>

        {message && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {message}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setTab("compare")
              }
              className={`rounded-full px-4 py-2 text-sm font-black ${
                tab ===
                "compare"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Compare
            </button>

            <button
              onClick={() =>
                setTab(
                  "rankings"
                )
              }
              className={`rounded-full px-4 py-2 text-sm font-black ${
                tab ===
                "rankings"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Rankings
            </button>

            <button
              onClick={() =>
                setTab("history")
              }
              className={`rounded-full px-4 py-2 text-sm font-black ${
                tab ===
                "history"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              History
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={
                undoLastPick
              }
              disabled={
                !history.length ||
                saving
              }
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-40"
            >
              Undo Last Pick
            </button>

            <button
              onClick={
                resetRankings
              }
              disabled={saving}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>

        {tab === "compare" && (
          <>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Matchup Pool
              </div>

              <div className="flex flex-wrap gap-2">
                {MATCHUP_POOLS.map(
                  (pool) => (
                    <button
                      key={pool}
                      onClick={() =>
                        changeMatchupPool(
                          pool
                        )
                      }
                      className={`rounded-full px-4 py-2 text-sm font-black ${
                        matchupPool ===
                        pool
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {pool}
                    </button>
                  )
                )}
              </div>

              <div className="mt-3 text-xs font-semibold text-slate-500">
                Minimum{" "}
                {MIN_PA} PA.{" "}
                {matchupPool ===
                "All"
                  ? "Matchups can include any eligible hitter."
                  : matchupPool ===
                      "2B/SS"
                    ? "Only hitters eligible at 2B or SS are included."
                    : matchupPool ===
                        "1B/3B"
                      ? "Only hitters eligible at 1B or 3B are included."
                      : `Only hitters eligible at ${matchupPool} are included.`}
              </div>
            </div>

            <div className="mb-4 text-center">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                Who would you
                rather have?
              </div>
            </div>

            {playerA &&
            playerB ? (
              <div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-start">
                <PlayerCard
                  player={
                    playerA
                  }
                  side="left"
                />

                <div className="flex items-center justify-center xl:sticky xl:top-6 xl:pt-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-black text-white">
                    VS
                  </div>
                </div>

                <PlayerCard
                  player={
                    playerB
                  }
                  side="right"
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-6 text-center font-bold text-slate-500">
                Preparing
                matchup...
              </div>
            )}

            <div className="mt-5 flex justify-center">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-xs font-bold text-slate-500">
                Percentile
                colors:{" "}
                <span className="font-black text-blue-700">
                  Blue = Worse
                </span>
                {" • "}
                <span className="font-black text-slate-700">
                  White =
                  Average
                </span>
                {" • "}
                <span className="font-black text-red-700">
                  Red = Better
                </span>
              </div>
            </div>
          </>
        )}

        {tab ===
          "rankings" && (
          <>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Position
                Rankings
              </div>

              <div className="flex flex-wrap gap-2">
                {POSITION_TABS.map(
                  (position) => (
                    <button
                      key={
                        position
                      }
                      onClick={() =>
                        setRankingPosition(
                          position
                        )
                      }
                      className={`rounded-full px-4 py-2 text-sm font-black ${
                        rankingPosition ===
                        position
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {position}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="bg-[#0b1f3a] px-5 py-4 text-white">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="text-xl font-black">
                      {rankingPosition ===
                      "Overall"
                        ? "Overall Hitter Rankings"
                        : `${rankingPosition} Rankings`}
                    </div>

                    <div className="mt-1 text-xs font-bold text-slate-300">
                      Minimum{" "}
                      {MIN_PA} PA •
                      Multi-position
                      hitters appear
                      everywhere
                      they are
                      eligible.
                    </div>
                  </div>

                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                    {
                      leaderboard.length
                    }{" "}
                    hitters
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left">
                        Team
                      </th>
                      <th className="px-4 py-3 text-left">
                        Pos
                      </th>
                      <th className="px-4 py-3 text-right">
                        Elo
                      </th>
                      <th className="px-4 py-3 text-right">
                        W
                      </th>
                      <th className="px-4 py-3 text-right">
                        L
                      </th>
                      <th className="px-4 py-3 text-right">
                        Comparisons
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {leaderboard.map(
                      (
                        item,
                        index
                      ) => {
                        const theme =
                          getTeamTheme(
                            item
                              .player
                              .Team
                          );

                        return (
                          <tr
                            key={
                              item
                                .player
                                .Name
                            }
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 font-black text-slate-500">
                              #
                              {index +
                                1}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-8 w-2 rounded-full"
                                  style={{
                                    background:
                                      theme.primary,
                                  }}
                                />

                                <div className="font-black text-slate-900">
                                  {
                                    item
                                      .player
                                      .Name
                                  }
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-500">
                              {
                                item
                                  .player
                                  .Team
                              }
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-500">
                              {
                                item
                                  .player
                                  .Pos
                              }
                            </td>

                            <td className="px-4 py-3 text-right text-lg font-black">
                              {
                                item.elo
                              }
                            </td>

                            <td className="px-4 py-3 text-right font-bold">
                              {
                                item.wins
                              }
                            </td>

                            <td className="px-4 py-3 text-right font-bold">
                              {
                                item.losses
                              }
                            </td>

                            <td className="px-4 py-3 text-right font-bold">
                              {
                                item.comparisons
                              }
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab ===
          "history" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="bg-[#0b1f3a] px-5 py-4 text-white">
              <div className="text-xl font-black">
                Recent Picks
              </div>

              <div className="mt-1 text-xs font-bold text-slate-300">
                Synced across
                devices
              </div>
            </div>

            {!history.length ? (
              <div className="p-8 text-center font-bold text-slate-500">
                No comparisons
                yet.
              </div>
            ) : (
              <div>
                {[...history]
                  .reverse()
                  .slice(0, 50)
                  .map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4"
                      >
                        <div>
                          <span className="font-black text-slate-900">
                            {
                              item.winner
                            }
                          </span>

                          <span className="mx-2 text-slate-400">
                            over
                          </span>

                          <span className="font-bold text-slate-600">
                            {
                              item.loser
                            }
                          </span>
                        </div>

                        <div className="text-sm font-bold text-slate-500">
                          {
                            item.winnerBefore
                          }{" "}
                          →{" "}
                          <span className="text-green-600">
                            {
                              item.winnerAfter
                            }
                          </span>
                          {" | "}
                          {
                            item.loserBefore
                          }{" "}
                          →{" "}
                          <span className="text-red-600">
                            {
                              item.loserAfter
                            }
                          </span>
                        </div>
                      </div>
                    )
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}