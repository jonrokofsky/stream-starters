import { mergeRbYac } from '../lib/data/rbYac.ts';
import { calculateRbScores } from '../lib/data/rbScores.ts';
export function transformReport(raw, yacSnapshot) {
if(raw.season!==2026 || raw.seasonType!=='Regular' || raw.scoring!=='PPR' || !Array.isArray(raw.rows) || !raw.rows.length) throw Error('Unexpected season, filters, or empty table');
const headers=[...new Map(raw.headers.map(h=>[h.id,h])).values()].filter(h=>Object.hasOwn(raw.rows[0],h.id));
const expected=['','Rank','Name','Team','POS','G','ATT','YDS','RuYDS/G','YPC','TD','FUM','SCRM','YDS','TD','1+ %','3+ %','5+ %','10+ %','15+ %','20+ %','30+ %','i5','i5 %','i10','i10 %','i20 %','TGT','TGT %','REC','YDS','TM YDS %','YPR','YPT','RecYDS/G','CR %','TD','TM TD %','i10','FUM','WO','WO/G','FP/G','FP'];
if(JSON.stringify(headers.map(h=>h.label))!==JSON.stringify(expected))throw Error('Header mismatch');
const mapped=['_selection','Rank','Name','Team','POS','G','ATT','RuYds','RuYds/G','RuYds/Rush','RuTD','Rush FUM','Scrimmage','Scrimmage Yards','Scrimmage TD','1+ RuYd%','3+ RuYd%','5+ RuYd%','10+ RuYd%','15+ RuYd%','20+ RuYd%','30+ RuYd%','Ins. 5 Carries','Inside 5 Carry%','Ins. 10 Carries','Inside 10 Carry%','Inside 20 Carry%','Targets','Target Share','Rec','Rec Yards','Team Rec Yards %','RecYds/Rec','RecYds/Tgt','RecYds/G','Catch%','Rec. TD','Tm TD%','Ins. 10 Rec.','Rec FUM','Weighted Opp.','Weighted Opp./G','FP/G','FP'];
const teamAliases={ARZ:'ARI',BLT:'BAL',CLV:'CLE',HST:'HOU',LA:'LAR'};
let rows=raw.rows.map(r=>Object.fromEntries(headers.map((h,i)=>{if(!Object.hasOwn(r,h.id))throw Error('Missing cell');return [mapped[i],r[h.id]];}))).filter(r=>r.POS==='RB');
if(rows.length<60||rows.length>300||new Set(rows.map(r=>r.Name)).size!==rows.length)throw Error('Population mismatch');
for(const r of rows){delete r._selection;r.Team=teamAliases[r.Team]??r.Team;r['Total TD']=String(Number(r.RuTD)+Number(r['Rec. TD']));}
rows=mergeRbYac(rows,yacSnapshot);
const scores=calculateRbScores({season:2026,ageColumn:'unused',rows});
const keys={rushGain:'Rush Gain Profile',rush:'Rush Score',receiving:'Rec Score',opportunity:'Opportunity Score'};
rows.forEach((r,i)=>{for(const [key,col] of Object.entries(keys))r[col]=scores[i][key]===null?'':String(scores[i][key]);});

for(const r of rows){for(const k of ['G','ATT','RuTD','Rec. TD','Targets','Rec']){if(!/^\d+$/.test(r[k]))throw Error('Invalid count: '+k);} if(Number(r.G)<1)throw Error('Invalid games');}
return {season:2026,source:raw.source,copiedAt:raw.copiedAt,updateMode:'browser import',seasonType:'Regular',scoring:'PPR',population:'RB only; all '+rows.length+' rows in source report',rows:rows.sort((a,b)=>a.Name.localeCompare(b.Name))};
}
