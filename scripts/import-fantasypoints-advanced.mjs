import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SEASON = 2026;
const archiveRoot = resolve(process.argv[2] ?? `data-source-archive/fantasypoints/${SEASON}/advanced`);
const routeTarget = resolve(`public/data/receiver-routes-weekly-${SEASON}.json`);
let capturedAt = new Date().toISOString();
try {
  const manifest = JSON.parse(await readFile(resolve(archiveRoot, "manifest.json"), "utf8"));
  if (manifest.capturedAt) capturedAt = manifest.capturedAt;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value); rows.push(row); row = []; value = ""; }
    else if (char !== "\r") value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows.filter((values) => values.some((entry) => entry !== ""));
}

function parseFantasyPointsCsv(text) {
  const rows = parseCsvRows(text);
  const headerIndex = rows.findIndex((row) => row.includes("Name") && row.includes("RTE"));
  if (headerIndex < 0) throw new Error("Fantasy Points CSV header was not found");
  const headers = rows[headerIndex];
  return rows.slice(headerIndex + 1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const identity = (row) => row.player_id || `${row.POS}:${normalize(row.Name)}`;

const cumulative = new Map();
const weeks = [];

for (let week = 1; week <= 18; week += 1) {
  const path = resolve(archiveRoot, "receiving", `week-${week}.csv`);
  let text;
  try { text = await readFile(path, "utf8"); }
  catch (error) {
    if (error.code === "ENOENT") break;
    throw error;
  }

  const rows = parseFantasyPointsCsv(text).filter((row) => ["WR", "TE"].includes(row.POS) && row.Name && row.Name !== "League Avg");
  if (rows.length < 100) throw new Error(`Week ${week} receiving export has only ${rows.length} WR/TE rows`);
  for (const row of rows) {
    const id = identity(row);
    const previous = cumulative.get(id) ?? { Name: row.Name, POS: row.POS, Team: row.Team, G: 0, routes: 0 };
    previous.Name = row.Name;
    previous.POS = row.POS;
    previous.Team = row.Team;
    previous.G += number(row.G);
    previous.routes += number(row.RTE);
    cumulative.set(id, previous);
  }

  weeks.push({
    week,
    copiedAt: capturedAt,
    rows: [...cumulative.values()]
      .map((row) => ({ Name: row.Name, POS: row.POS, Team: row.Team, G: String(row.G), "Routes Run": String(row.routes) }))
      .sort((a, b) => a.POS.localeCompare(b.POS) || a.Name.localeCompare(b.Name)),
  });
}

if (weeks.length < 2) throw new Error(`Expected at least two weekly receiving exports in ${archiveRoot}`);

const payload = {
  season: SEASON,
  source: "https://fantasypointsdata.com/receiving/advanced",
  method: "exact Fantasy Points weekly route totals accumulated through each completed week",
  weeks,
};
const temporary = `${routeTarget}.tmp`;
await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`);
await rename(temporary, routeTarget);
console.log(`Imported Fantasy Points routes through Week ${weeks.at(-1).week}: ${weeks.map((entry) => `W${entry.week}=${entry.rows.length}`).join(", ")}`);
