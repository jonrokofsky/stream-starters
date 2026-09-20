import { chromium } from "playwright";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const OUT = new URL("../public/data/hitter-rankings-2026.json", import.meta.url);
const FG_API = "https://www.fangraphs.com/api/leaders/major-league/data";
const RATER = "https://www.fangraphs.com/fantasy-tools/player-rater";
const MIN_PA = 50;

const pct = (v) => `${(Number(v || 0) * 100).toFixed(2)}%`;
const dec = (v, places = 3) => Number(v || 0).toFixed(places);
const money = (v) => `${Number(v || 0) < 0 ? "-$" : "$"}${Math.abs(Number(v || 0)).toFixed(2)}`;

async function leaderRows(params) {
  const url = new URL(FG_API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { "user-agent": "Stream Starters data refresh" } });
  if (!response.ok) throw new Error(`FanGraphs leaders returned ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.data)) throw new Error("FanGraphs leaders payload has no rows");
  return payload.data;
}

async function playerRaterRows() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/132 Safari/537.36" });
    await page.goto(RATER, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector("#__NEXT_DATA__", { state: "attached", timeout: 60_000 });
    const payload = JSON.parse(await page.locator("#__NEXT_DATA__").textContent());
    const queries = payload?.props?.pageProps?.dehydratedState?.queries ?? [];
    const candidates = queries.flatMap((query) => query?.state?.data?.data ?? []);
    const rows = candidates.filter((row) => row?.playerName && row?.auction?.PA != null);
    if (rows.length < 300) throw new Error(`Player Rater returned only ${rows.length} hitters`);
    return rows;
  } finally {
    await browser.close();
  }
}

function mergeRows(raterRows, battingRows, teamRows) {
  const batting = new Map(battingRows.map((row) => [String(row.playerid), row]));
  const teams = new Map(teamRows.map((row) => [row.TeamNameAbb, Number(row.R || 0) / Number(row.TG || 1)]));
  const rows = [];
  for (const rater of raterRows) {
    const auction = rater.auction ?? {};
    const pa = Number(auction.PA || 0);
    if (pa < MIN_PA) continue;
    const stats = batting.get(String(rater.playerId));
    if (!stats) continue;
    const team = auction.AbbName || stats.TeamNameAbb || "FA";
    rows.push({
      Name: rater.playerName,
      Team: team,
      Pos: String(auction.Position || stats.positionDB || "DH").replace(/\/$/, ""),
      "$ Value": money(auction.Dollars),
      PA: String(pa),
      "BB%": pct(stats["BB%"]), "K%": pct(stats["K%"]), xBA: dec(stats.xAVG),
      "Z-Contact%": pct(stats["Z-Contact%"]), "SqUpSw%": pct(stats["SquaredUpSwing%"]),
      HR: String(stats.HR ?? 0), "HR%": pct(Number(stats.HR || 0) / Number(stats.PA || 1)),
      EV90: Number(stats.EV90 || 0).toFixed(1), "Z-Swing%": pct(stats["Z-Swing%"]),
      "O-Swing%": pct(stats["O-Swing%"]), "Z-O": pct(Number(stats["Z-Swing%"] || 0) - Number(stats["O-Swing%"] || 0)),
      wOBA: dec(stats.wOBA), xwOBA: dec(stats.xwOBA), SB: String(stats.SB ?? 0),
      "Team R/G": (teams.get(team) ?? 0).toFixed(2),
    });
  }
  if (rows.length < 300) throw new Error(`Only ${rows.length} eligible hitters joined; refusing incomplete snapshot`);
  return rows;
}

async function main() {
  const [rater, batting, teams] = await Promise.all([
    playerRaterRows(),
    leaderRows({ pos: "all", stats: "bat", lg: "all", qual: String(MIN_PA), type: "c,6,34,35,102,103,315,349,106,11,345,50,317,21", season: "2026", month: "0", season1: "2026", ind: "0", pageitems: "2000" }),
    leaderRows({ pos: "all", stats: "bat", lg: "all", qual: "0", type: "8", season: "2026", month: "0", season1: "2026", ind: "0", team: "0,ts", pageitems: "100" }),
  ]);
  const rows = mergeRows(rater, batting, teams);
  const snapshot = { season: 2026, generatedAt: new Date().toISOString(), minimumPA: MIN_PA, sources: [RATER, FG_API], rowCount: rows.length, rows };
  await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
  const tmp = new URL("../public/data/hitter-rankings-2026.json.tmp", import.meta.url);
  await writeFile(tmp, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(tmp, OUT);
  console.log(`Wrote ${rows.length} validated hitters to ${OUT.pathname}`);
}

main().catch(async (error) => {
  try {
    const previous = JSON.parse(await readFile(OUT, "utf8"));
    if (Array.isArray(previous.rows) && previous.rows.length >= 300) {
      console.warn(`Refresh failed; preserving the last valid ${previous.rows.length}-row snapshot: ${error.message}`);
      process.exit(0);
    }
  } catch {}
  console.error(error);
  process.exit(1);
});
