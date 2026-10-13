import { chromium } from 'playwright';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { transformReport } from './rb-transform.mjs';
import { upsertWeeklySnapshot } from './rb-weekly.mjs';
const target = new URL('../public/data/rb-2026.json', import.meta.url);
const yacTarget = new URL('../public/data/rb-yac-2026.json', import.meta.url);
const weeklyTarget = new URL('../public/data/rb-weekly-2026.json', import.meta.url);
const source = 'https://fpds.fantasypoints.com/nfl/tools/player/rushing-basic';
const browser = await chromium.launch({ headless: true, ...(process.env.RB_BROWSER_CHANNEL ? {channel: process.env.RB_BROWSER_CHANNEL} : {}) });
try {
  const previous=JSON.parse(await readFile(target,'utf8'));
  const previousYac=JSON.parse(await readFile(yacTarget,'utf8'));
  const games=rows=>rows.reduce((n,r)=>n+Number(r.G),0);
  const validateResult = result => {
    if(result.rows.length<previous.rows.length*.9)throw Error('Unexpected player count decrease; keeping previous data');
    if(games(result.rows)<games(previous.rows))throw Error('Games total regressed; keeping previous data');
  };
  const writeRbIfChanged = async result => {
    const changed=JSON.stringify(previous.rows)!==JSON.stringify(result.rows);
    if(changed){const temp=new URL('../public/data/rb-2026.json.tmp',import.meta.url);await writeFile(temp,JSON.stringify(result,null,2)+'\n');await rename(temp,target);}
    return changed;
  };
  const archiveWeeklyResult = async result => {
    let archive={season:2026,source,weeks:[]};
    try{archive=JSON.parse(await readFile(weeklyTarget,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    const update=upsertWeeklySnapshot(archive,result,source);
    if(!update.changed)return false;
    const temp=new URL('../public/data/rb-weekly-2026.json.tmp',import.meta.url);await writeFile(temp,JSON.stringify(update.archive,null,2)+'\n');await rename(temp,weeklyTarget);
    return true;
  };

  // Fantasy Points occasionally serves the grid slowly to GitHub runners.
  // Retry with a fresh page so one transient response does not lose the update.
  const captureFantasy = async () => {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const fantasyPage = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
      try {
        console.log(`Loading Fantasy Points RB data (attempt ${attempt}/3)...`);
        await fantasyPage.goto(source, {waitUntil:'domcontentloaded',timeout:60000});
        await fantasyPage.getByRole('gridcell').first().waitFor({timeout:60000});
        for (const label of ['2026','Regular','PPR']) {
          if(await fantasyPage.getByRole('button',{name:label,exact:true}).count()!==1) throw Error('Required filter not selected: '+label);
        }
        const grid = fantasyPage.getByRole('grid').filter({has:fantasyPage.getByRole('gridcell')});
        const pages = [];
        for (let pageNumber = 1; pageNumber <= 5; pageNumber += 1) {
          await fantasyPage.waitForTimeout(500);
          const snapshot = await grid.evaluate(element => {
            const rows = {};
            for (const rowElement of element.querySelectorAll('[role="row"][row-id]')) {
              const id = rowElement.getAttribute('row-id');
              const row = rows[id] ?? {};
              rows[id] = row;
              for (const cell of rowElement.querySelectorAll('[role="gridcell"]')) {
                row[cell.getAttribute('col-id')] = cell.innerText.trim();
              }
            }
            const headers = Array.from(element.querySelectorAll('[role="columnheader"][col-id]')).map(cell => ({
              id: cell.getAttribute('col-id'),
              label: cell.innerText.trim(),
            }));
            if (!Object.keys(rows).length) throw Error('Fantasy Points page contains no rows');
            return { headers, rows: Object.values(rows) };
          });
          pages.push(snapshot);
          const next = fantasyPage.getByRole('button', { name: /Next Page/i });
          if (!(await next.count()) || await next.isDisabled()) break;
          await next.click();
        }
        const headers = pages[0].headers;
        if (pages.some(entry => JSON.stringify(entry.headers) !== JSON.stringify(headers))) {
          throw Error('Fantasy Points headers changed between pages');
        }
        const rows = pages.flatMap(entry => entry.rows);
        console.log(`Captured ${rows.length} Fantasy Points rows across ${pages.length} pages.`);
        return { headers, rows };
      } catch (error) {
        lastError = error;
        console.warn(`Fantasy Points attempt ${attempt} failed: ${error.message}`);
      } finally {
        await fantasyPage.close();
      }
    }
    throw lastError;
  };
  const second=await captureFantasy();
  const rawReport={...second,season:2026,seasonType:'Regular',scoring:'PPR',source,copiedAt:new Date().toISOString()};
  const basicResult=transformReport(rawReport, previousYac);
  validateResult(basicResult);
  let rbChanged=await writeRbIfChanged(basicResult);

  const weeklyChanged=await archiveWeeklyResult(basicResult);
  console.log(`Fantasy Points RB data ${rbChanged?'updated':'unchanged'}; manual YAC snapshot preserved from ${previousYac.capturedAt}; weekly archive ${weeklyChanged?'updated':'unchanged'}; ${basicResult.rows.length} RBs; ${games(basicResult.rows)} player games.`);
} finally {await browser.close();}
