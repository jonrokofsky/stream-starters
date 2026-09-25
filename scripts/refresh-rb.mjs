import { chromium } from 'playwright';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { transformReport } from './rb-transform.mjs';
const target = new URL('../public/data/rb-2026.json', import.meta.url);
const yacTarget = new URL('../public/data/rb-yac-2026.json', import.meta.url);
const source = 'https://data.fantasypoints.com/nfl/tools/player/rushing-basic';
const yacSource = 'https://www.pro-football-reference.com/years/2026/rushing_advanced.htm';
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

  // Capture and validate Fantasy Points first. PFR is optional enrichment and
  // must never prevent the current basic rushing snapshot from being written.
  const fantasyPage = await browser.newPage();
  await fantasyPage.goto(source, {waitUntil:'domcontentloaded',timeout:45000});
  await fantasyPage.getByRole('gridcell').first().waitFor({timeout:45000});
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
  if(JSON.stringify(first)!==JSON.stringify(second))throw Error('Table changed while reading; retry later');
  await fantasyPage.close();
  const rawReport={...second,season:2026,seasonType:'Regular',scoring:'PPR',source,copiedAt:new Date().toISOString()};
  const basicResult=transformReport(rawReport, previousYac);
  validateResult(basicResult);
  let rbChanged=await writeRbIfChanged(basicResult);

  const yacPage = await browser.newPage();
  const captureYac = async () => yacPage.getByRole('table').evaluate(table => {
    const headers = Array.from(table.querySelectorAll('thead tr:last-child th')).map(cell => cell.textContent.trim());
    const playerIndex = headers.indexOf('Player');
    const teamIndex = headers.indexOf('Team');
    const positionIndex = headers.indexOf('Pos');
    const yacIndex = headers.indexOf('YAC/Att');
    if ([playerIndex,teamIndex,positionIndex,yacIndex].some(index => index < 0)) throw Error('PFR header mismatch');
    return Array.from(table.querySelectorAll('tbody tr'))
      .map(row => Array.from(row.querySelectorAll('th,td')).map(cell => cell.textContent.trim()))
      .filter(cells => cells[positionIndex] === 'RB')
      .map(cells => ({
        Name:cells[playerIndex],
        Team:({KAN:'KC',LVR:'LV',NWE:'NE',SFO:'SF',GNB:'GB',TAM:'TB',NOR:'NO'}[cells[teamIndex]] || cells[teamIndex]),
        'YAC/Att':cells[yacIndex]
      }));
  });
  let yacSnapshot=previousYac;
  try {
    await yacPage.goto(yacSource, {waitUntil:'domcontentloaded',timeout:20000});
    await yacPage.getByRole('table').waitFor({timeout:20000});
    const yacFirst = await captureYac();
    await yacPage.waitForTimeout(1500);
    const yacSecond = await captureYac();
    if(JSON.stringify(yacFirst)!==JSON.stringify(yacSecond))throw Error('PFR table changed while reading; retry later');
    // PFR's qualifying carry threshold changes by week, so the early-season
    // table can be much smaller than the full player pool.
    if(yacSecond.length<35 || new Set(yacSecond.map(row=>row.Name+':'+row.Team)).size!==yacSecond.length)throw Error('Unexpected PFR population');
    if(yacSecond.some(row=>!row.Name || !row.Team || !/^\d+(\.\d+)?$/.test(row['YAC/Att'])))throw Error('Invalid PFR YAC data');
    const coverageText = await yacPage.locator('#all_adv_rushing').locator('text=/updated through week/i').first().textContent().catch(()=>null);
    const coverageMatch = coverageText?.match(/updated through week\s+\d+[^.]*\./i);
    yacSnapshot={season:2026,source:yacSource,capturedAt:new Date().toISOString(),coverageNote:coverageMatch?`PFR advanced stats are ${coverageMatch[0].toLowerCase()}`:'PFR advanced-stat coverage was not stated.',rows:yacSecond};
  } catch (error) {
    console.warn(`PFR refresh unavailable; preserving ${previousYac.capturedAt}: ${error.message}`);
  } finally {
    await yacPage.close();
  }
  const yacChanged=JSON.stringify(previousYac.rows)!==JSON.stringify(yacSnapshot.rows) || previousYac.coverageNote!==yacSnapshot.coverageNote;
  let result=basicResult;
  if(yacChanged){
    result=transformReport(rawReport,yacSnapshot);validateResult(result);rbChanged=(await writeRbIfChanged(result))||rbChanged;
    const temp=new URL('../public/data/rb-yac-2026.json.tmp',import.meta.url);await writeFile(temp,JSON.stringify(yacSnapshot,null,2)+'\n');await rename(temp,yacTarget);
  }
  console.log(`Fantasy Points RB data ${rbChanged?'updated':'unchanged'}; PFR YAC ${yacChanged?'updated':'unchanged'}; ${result.rows.length} RBs; ${games(result.rows)} player games.`);
} finally {await browser.close();}
