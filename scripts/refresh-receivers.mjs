import { chromium } from "playwright";
import { readFile, rename, writeFile } from "node:fs/promises";
import { transformReceiverReport } from "./receiver-transform.mjs";

const target = new URL("../public/data/receivers-2026.json", import.meta.url);
const fantasySource = "https://fpds.fantasypoints.com/nfl/tools/player/receiving-basic";
const sumerSources = {
  WR: "https://sumersports.com/players/wide-receiver/",
  TE: "https://sumersports.com/players/tight-end/",
};

async function captureFantasy(page) {
  console.log("Loading Fantasy Points receiving data...");
  await page.goto(fantasySource, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByRole("gridcell").first().waitFor({ timeout: 60000 });
  for (const label of ["2026", "Regular", "PPR"]) {
    if (await page.getByRole("button", { name: label, exact: true }).count() !== 1) {
      throw Error(`Required Fantasy Points filter not selected: ${label}`);
    }
  }
  if (await page.getByRole("button", { name: /2 Selected/i }).count() !== 1) {
    throw Error("Fantasy Points must include WR and TE");
  }

  const grid = page.getByRole("grid").filter({ has: page.getByRole("gridcell") });
  const pages = [];
  for (let pageNumber = 1; pageNumber <= 5; pageNumber += 1) {
    await page.waitForTimeout(500);
    const snapshot = await grid.evaluate((element) => {
      const rows = {};
      for (const rowElement of element.querySelectorAll('[role="row"][row-id]')) {
        const row = rows[rowElement.getAttribute("row-id")] ?? {};
        rows[rowElement.getAttribute("row-id")] = row;
        for (const cell of rowElement.querySelectorAll('[role="gridcell"]')) {
          row[cell.getAttribute("col-id")] = cell.innerText.trim();
        }
      }
      const headers = Array.from(element.querySelectorAll('[role="columnheader"][col-id]')).map((cell) => ({
        id: cell.getAttribute("col-id"),
        label: cell.innerText.trim(),
      }));
      if (!Object.keys(rows).length) throw Error("Fantasy Points page contains no rows");
      return { headers, rows: Object.values(rows) };
    });
    pages.push(snapshot);
    const next = page.getByRole("button", { name: /Next Page/i });
    if (!(await next.count()) || await next.isDisabled()) break;
    await next.click();
  }
  const headers = pages[0].headers;
  if (pages.some((entry) => JSON.stringify(entry.headers) !== JSON.stringify(headers))) {
    throw Error("Fantasy Points headers changed between pages");
  }
  const rows = pages.flatMap((entry) => entry.rows);
  console.log(`Captured ${rows.length} Fantasy Points rows across ${pages.length} pages.`);
  return { headers, rows };
}

async function captureSumer(page, position, source) {
  console.log(`Loading SumerSports ${position} data...`);
  await page.goto(source, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("table tbody tr").first().waitFor({ timeout: 60000 });
  const showMore = page.getByRole("button", { name: /Show More/i });
  const tableRows = page.locator("table").first().locator("tbody tr");
  for (let clicks = 0; clicks < 20 && await showMore.count() && await showMore.isVisible(); clicks += 1) {
    await showMore.waitFor({ state: "visible" });
    try {
      await page.waitForFunction(() => {
        const button = [...document.querySelectorAll("button")].find((element) => element.textContent?.includes("Show More"));
        return !button || !button.disabled;
      }, undefined, { timeout: 15000 });
    } catch {
      break;
    }
    if (!(await showMore.count())) break;
    const before = await tableRows.count();
    await showMore.click();
    try {
      await page.waitForFunction((previousCount) => (
        (document.querySelector("table")?.querySelectorAll("tbody tr").length ?? 0) > previousCount
      ), before, { timeout: 15000 });
    } catch {
      if (await tableRows.count() <= before) break;
    }
    await page.waitForTimeout(500);
    console.log(`Loaded ${await tableRows.count()} SumerSports ${position} rows...`);
  }
  const rows = await page.locator("table").first().evaluate((table, pos) => {
    const clean = (value) => String(value ?? "").trim();
    const compact = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
    const playerName = (link) => {
      const text = clean(link?.innerText).split(/\r?\n/).at(-1).replace(/^\d+\.\s*/, "");
      for (const match of text.matchAll(/[A-Z]\.\s*/g)) {
        const full = text.slice(0, match.index).trim();
        const abbreviatedSurname = text.slice(match.index + match[0].length).trim();
        if (full && abbreviatedSurname && compact(full).endsWith(compact(abbreviatedSurname))) return full;
      }
      return text;
    };
    return Array.from(table.querySelectorAll("tbody tr")).map((row) => {
      const cells = Array.from(row.querySelectorAll("th,td"));
      const name = playerName(cells[0]?.querySelector("a"));
      const values = cells.map((cell) => clean(cell.textContent));
      const base = values.length === 14 ? 1 : 3;
      return {
        Name: name,
        POS: pos,
        "Routes Run": values[base],
        Receptions: values[base + 1],
        "Rec. Yards": values[base + 2],
        "Target Share": values[base + 3],
        Touchdowns: values[base + 4],
        YAC: values[base + 5],
        ADoT: values[base + 6],
        "Catch %": values[base + 7],
        "Total EPA": values[base + 8],
        "Targets/Route Run": values[base + 9],
        YPRR: values[base + 10],
        "Impact Plays": values[base + 11],
        "Cont. Catch %": values[base + 12],
      };
    }).filter((row) => row.Name);
  }, position);
  const minimumRows = position === "WR" ? 100 : 40;
  if (rows.length < minimumRows) throw Error(`SumerSports ${position} returned only ${rows.length} rows`);
  console.log(`Captured ${rows.length} SumerSports ${position} rows.`);
  return rows;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const fantasy = await captureFantasy(page);
  const sumerRows = [];
  for (const [position, source] of Object.entries(sumerSources)) {
    sumerRows.push(...await captureSumer(page, position, source));
  }
  await page.close();

  const raw = {
    ...fantasy,
    season: 2026,
    seasonType: "Regular",
    scoring: "PPR",
    source: fantasySource,
    enrichmentSources: Object.values(sumerSources),
    copiedAt: new Date().toISOString(),
  };
  const result = transformReceiverReport(raw, sumerRows);
  let previous = null;
  try { previous = JSON.parse(await readFile(target, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (previous) {
    for (const position of ["WR", "TE"]) {
      if (result.population[position] < previous.population[position] * 0.9) throw Error(`${position} population regressed`);
    }
    const previousGames = previous.rows.reduce((sum, row) => sum + Number(row.G || 0), 0);
    const nextGames = result.rows.reduce((sum, row) => sum + Number(row.G || 0), 0);
    if (nextGames < previousGames) throw Error("Receiver game totals regressed");
  }
  const changed = !previous || JSON.stringify(previous.rows) !== JSON.stringify(result.rows);
  if (changed) {
    const temporary = new URL("../public/data/receivers-2026.json.tmp", import.meta.url);
    await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`);
    await rename(temporary, target);
  }
  console.log(`Receiver data ${changed ? "updated" : "unchanged"}: ${result.population.WR} WR, ${result.population.TE} TE.`);
} finally {
  await browser.close();
}
