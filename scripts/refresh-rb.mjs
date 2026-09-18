import { chromium } from 'playwright';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { transformReport } from './rb-transform.mjs';
const target = new URL('../public/data/rb-2026.json', import.meta.url);
const source = 'https://data.fantasypoints.com/nfl/tools/player/rushing-basic';
const browser = await chromium.launch({ headless: true, ...(process.env.RB_BROWSER_CHANNEL ? {channel: process.env.RB_BROWSER_CHANNEL} : {}) });
try {
  const page = await browser.newPage();
  await page.goto(source, {waitUntil:'domcontentloaded',timeout:45000});
  await page.getByRole('gridcell').first().waitFor({timeout:45000});
  for (const label of ['2026','Regular','PPR']) {
    if(await page.getByRole('button',{name:label,exact:true}).count()!==1) throw Error('Required filter not selected: '+label);
  }
  const capture = async () => page.getByRole('grid').filter({has:page.getByRole('gridcell')}).evaluate(grid => {
    const rows = {};
    for (const e of grid.querySelectorAll('[role="row"][row-id]')) {
      const id=e.getAttribute('row-id');const row=rows[id]??={};
      for(const c of e.querySelectorAll('[role="gridcell"]'))row[c.getAttribute('col-id')]=c.innerText.trim();
    }
    const headers=Array.from(grid.querySelectorAll('[role="columnheader"][col-id]')).map(e=>({id:e.getAttribute('col-id'),label:e.innerText.trim()}));
    if(Number(grid.getAttribute("aria-rowcount")) !== Object.keys(rows).length + 2) throw Error("Incomplete rendered table"); return {headers,rows:Object.values(rows)};
  });
  const first=await capture();
  await page.waitForTimeout(1500);
  const second=await capture();
  if(JSON.stringify(first)!==JSON.stringify(second))throw Error('Table changed while reading; retry later');
  const result=transformReport({...second,season:2026,seasonType:'Regular',scoring:'PPR',source,copiedAt:new Date().toISOString()});
  const previous=JSON.parse(await readFile(target,'utf8'));
  if(result.rows.length<previous.rows.length*.9)throw Error('Unexpected player count decrease; keeping previous data');
  const games=rows=>rows.reduce((n,r)=>n+Number(r.G),0);
  if(games(result.rows)<games(previous.rows))throw Error('Games total regressed; keeping previous data');
  if(JSON.stringify(previous.rows)===JSON.stringify(result.rows)){console.log('RB data unchanged.');}
  else {const temp=new URL('../public/data/rb-2026.json.tmp',import.meta.url);await writeFile(temp,JSON.stringify(result,null,2)+'\n');await rename(temp,target);console.log('Updated '+result.rows.length+' RBs; '+games(result.rows)+' player games.');}
} finally {await browser.close();}
