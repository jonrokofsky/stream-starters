import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const SEASON = 2026;
const OUTPUT = path.resolve("public/data/nfl-defense-vs-position-2026.json");
const POSITIONS = ["QB", "RB", "WR", "TE"];
const SOURCE_URL = (position) =>
  `https://www.pro-football-reference.com/years/${SEASON}/fantasy-points-against-${position}.htm`;

const TEAM_CODES = {
  "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
  "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
  "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
  "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
};

const number = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const perGame = (value, games) => games ? String(Math.round((number(value) / games) * 10) / 10) : "0";

export function transformPosition(position, rawRows) {
  return rawRows.map((raw) => {
    const team = raw.team || raw.Tm;
    const games = number(raw.g || raw.G);
    if (!TEAM_CODES[team] || games < 1) throw new Error(`Invalid ${position} row: ${team || "missing team"}`);
    const prefix = `${position} `;
    const row = { Team: team, Acronym: TEAM_CODES[team] };
    if (position === "QB") {
      Object.assign(row, {
        [prefix + "Cmp"]: perGame(raw.pass_cmp, games),
        [prefix + "Pass Att"]: perGame(raw.pass_att, games),
        [prefix + "Pass Yds"]: perGame(raw.pass_yds, games),
        [prefix + "Pass TD"]: perGame(raw.pass_td, games),
        [prefix + "Int"]: perGame(raw.pass_int, games),
        [prefix + "Sk"]: perGame(raw.pass_sacked, games),
        [prefix + "Rush Att"]: perGame(raw.rush_att, games),
        [prefix + "Rush Yds"]: perGame(raw.rush_yds, games),
        [prefix + "Rush TD"]: perGame(raw.rush_td, games),
      });
    } else {
      Object.assign(row, {
        [prefix + "Rush Att"]: perGame(raw.rush_att, games),
        [prefix + "Rush Yds"]: perGame(raw.rush_yds, games),
        [prefix + "Tgt"]: perGame(raw.targets, games),
        [prefix + "Rec"]: perGame(raw.receptions, games),
        [prefix + "Rec Yds"]: perGame(raw.rec_yds, games),
        [prefix + "TD"]: perGame(number(raw.rush_td) + number(raw.rec_td), games),
      });
    }
    row[prefix + "Fantasy PPG"] = String(number(raw.fantasy_points_per_game || raw.fantasy_points) / (raw.fantasy_points_per_game ? 1 : games));
    return row;
  });
}

export function mergePositions(byPosition) {
  const merged = new Map();
  for (const position of POSITIONS) {
    const rows = byPosition[position];
    if (!rows || rows.length !== 32) throw new Error(`${position} returned ${rows?.length ?? 0} teams; expected 32`);
    for (const row of rows) merged.set(row.Acronym, { ...(merged.get(row.Acronym) || {}), ...row });
  }
  if (merged.size !== 32) throw new Error(`Merged data contains ${merged.size} teams; expected 32`);
  return [...merged.values()].sort((a, b) => a.Team.localeCompare(b.Team));
}

async function capture(page, position) {
  await page.goto(SOURCE_URL(position), { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator("#fantasy_def").waitFor({ state: "visible", timeout: 20_000 });
  const rawRows = await page.locator("#fantasy_def tbody tr:not(.thead)").evaluateAll((rows) =>
    rows.map((row) => Object.fromEntries([...row.querySelectorAll("th[data-stat],td[data-stat]")]
      .map((cell) => [cell.getAttribute("data-stat"), cell.textContent?.trim() || ""])))
  );
  return transformPosition(position, rawRows.filter((row) => row.team));
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: process.env.PFR_VISIBLE !== "1" });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
    });
    const page = await context.newPage();
    const byPosition = {};
    for (const position of POSITIONS) byPosition[position] = await capture(page, position);
    const rows = mergePositions(byPosition);
    await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
    await fs.writeFile(OUTPUT, JSON.stringify({
      season: SEASON,
      capturedAt: new Date().toISOString(),
      source: Object.fromEntries(POSITIONS.map((position) => [position, SOURCE_URL(position)])),
      rows,
    }, null, 2) + "\n");
    console.log(`Defense-vs-position data updated; ${rows.length} teams.`);
  } catch (error) {
    try {
      const prior = JSON.parse(await fs.readFile(OUTPUT, "utf8"));
      if (prior.season !== SEASON || prior.rows?.length !== 32) throw new Error("invalid prior snapshot");
      console.warn(`::warning::PFR refresh unavailable; preserving ${prior.capturedAt}: ${error.message}`);
    } catch {
      throw error;
    }
  } finally {
    await browser?.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"))) {
  await main();
}
