import { readFile, rename, writeFile } from "node:fs/promises";
import { calculateRbScores } from "../lib/data/rbScores.ts";
import { mergeRbYac } from "../lib/data/rbYac.ts";

const input = process.argv[2];
if (!input) throw new Error("Usage: node --experimental-transform-types scripts/import-rb-yac-tsv.mjs <file.tsv>");

const yacTarget = new URL("../public/data/rb-yac-2026.json", import.meta.url);
const rbTarget = new URL("../public/data/rb-2026.json", import.meta.url);
const weeklyTarget = new URL("../public/data/rb-weekly-2026.json", import.meta.url);
const source = "https://www.pro-football-reference.com/years/2026/rushing_advanced.htm";
const aliases = { KAN: "KC", LVR: "LV", NWE: "NE", SFO: "SF", GNB: "GB", TAM: "TB", NOR: "NO" };

const lines = (await readFile(input, "utf8")).replace(/^\uFEFF/, "").trim().split(/\r?\n/);
const headers = lines.shift().split("\t").map((value) => value.trim());
const index = (name) => {
  const value = headers.indexOf(name);
  if (value < 0) throw new Error(`Missing ${name} column`);
  return value;
};
const playerIndex = index("Player");
const teamIndex = index("Team");
const positionIndex = index("Pos");
const gamesIndex = index("G");
const yacIndex = index("YAC/Att");

const parsed = lines.map((line) => line.split("\t").map((value) => value.trim()));
const rbLines = parsed.filter((cells) => cells[positionIndex] === "RB");
const rows = rbLines.map((cells) => ({
  Name: cells[playerIndex],
  Team: aliases[cells[teamIndex]] || cells[teamIndex],
  "YAC/Att": cells[yacIndex],
}));
const identities = rows.map((row) => `${row.Name}:${row.Team}`);
if (rows.length < 35 || new Set(identities).size !== rows.length) throw new Error(`Unexpected RB population: ${rows.length}`);
if (rows.some((row) => !row.Name || !row.Team || !/^\d+(\.\d+)?$/.test(row["YAC/Att"]))) throw new Error("Invalid YAC row");
const maxGames = Math.max(...rbLines.map((cells) => Number(cells[gamesIndex]) || 0));
const snapshot = {
  season: 2026,
  source,
  capturedAt: new Date().toISOString(),
  coverageNote: `User-provided PFR advanced rushing data through Week ${maxGames}; ${rows.length} running backs shown.`,
  rows,
};

function applySnapshot(dataRows) {
  const merged = mergeRbYac(dataRows, snapshot);
  const scores = calculateRbScores({ season: 2026, ageColumn: "unused", rows: merged });
  return merged.map((row, position) => ({
    ...row,
    "Rush Gain Profile": scores[position].rushGain === null ? "" : String(scores[position].rushGain),
    "Rush Score": scores[position].rush === null ? "" : String(scores[position].rush),
    "Rec Score": scores[position].receiving === null ? "" : String(scores[position].receiving),
    "Opportunity Score": scores[position].opportunity === null ? "" : String(scores[position].opportunity),
  }));
}

async function atomicJson(target, value) {
  const temporary = new URL(`${target.href}.tmp`);
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, target);
}

const rb = JSON.parse(await readFile(rbTarget, "utf8"));
rb.rows = applySnapshot(rb.rows);
const weekly = JSON.parse(await readFile(weeklyTarget, "utf8"));
if (!weekly.weeks?.length) throw new Error("RB weekly archive is empty");
weekly.weeks.at(-1).rows = applySnapshot(weekly.weeks.at(-1).rows);

await atomicJson(yacTarget, snapshot);
await atomicJson(rbTarget, rb);
await atomicJson(weeklyTarget, weekly);
console.log(`Imported ${rows.length} RB YAC/Att rows through Week ${maxGames}; updated RB profile, matchup, and latest weekly table.`);
