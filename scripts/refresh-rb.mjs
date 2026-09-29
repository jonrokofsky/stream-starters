import { chromium } from 'playwright';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { transformReport } from './rb-transform.mjs';
import { upsertWeeklySnapshot } from './rb-weekly.mjs';
const target = new URL('../public/data/rb-2026.json', import.meta.url);
const yacTarget = new URL('../public/data/rb-yac-2026.json', import.meta.url);
const weeklyTarget = new URL('../public/data/rb-weekly-2026.json', import.meta.url);
const source = 'https://data.fantasypoints.com/nfl/tools/player/rushing-basic';
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
      const fantasyPage = await browser.newPage();
      try {
        console.log(`Loading Fantasy Points RB data (attempt ${attempt}/3)...`);
        await fantasyPage.goto(source, {waitUntil:'domcontentloaded',timeout:60000});
        await fantasyPage.getByRole('gridcell').first().waitFor({timeout:60000});
        for (const label of ['2026','Regular','PPR']) {
          if(await fantasyPage.getByRole('button',{name:label,exact:true}).count()!==1) throw Error('Required filter not selected: '+label);
        }
        const capture = async () => fantasyPage.getByRole('grid').filter({has:fantasyPage.getByRole('gridcell')}).evaluate(grid => {
          const rows = {};
          for (const e of grid.querySelectorAll('[role="row"][row-id]')) {
            const id=e.getAttribute('row-id');const row=rows[id]??={};
            for(const c of e.querySelectorAll('[role="gridcell"]'))row[c.getAttribute('col-id')]=c.innerText.trim();
          }
          const headers=Array.from(grid.querySelectorAll('[role="columnheader"][col-id]')).map(e=>({id:e.getAttribute('col-id'),label:e.innerText.trim()}));
          if(Number(grid.getAttribute("aria-rowcount")) !== Object.keys(rows).length + 2) throw Error("Incomplete rendered table"); return {headers,rows:Object.values(rows)};
        });
        const first=await capture();
        await fantasyPage.waitForTimeout(1500);
        const second=await capture();
        if(JSON.stringify(first)!==JSON.stringify(second))throw Error('Table changed while reading');
        return second;
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
