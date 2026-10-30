import { gunzipSync } from "node:zlib";
import { readFile, rename, writeFile } from "node:fs/promises";
import { calculateRbScores } from "../lib/data/rbScores.ts";
import { calculateReceiverScores } from "../lib/data/receiverScores.ts";

const SEASON = 2026;
const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const URLS = {
  players: `${BASE}/stats_player/stats_player_week_${SEASON}.csv`,
  rushing: `${BASE}/pfr_advstats/advstats_week_rush_${SEASON}.csv`,
  pbp: `${BASE}/pbp/play_by_play_${SEASON}.csv.gz`,
};
const targets = {
  rb: new URL(`../public/data/rb-weekly-${SEASON}.json`, import.meta.url),
  rbLatest: new URL(`../public/data/rb-${SEASON}.json`, import.meta.url),
  receivers: new URL(`../public/data/receivers-weekly-${SEASON}.json`, import.meta.url),
  receiversLatest: new URL(`../public/data/receivers-${SEASON}.json`, import.meta.url),
  yac: new URL(`../public/data/rb-yac-${SEASON}.json`, import.meta.url),
  defense: new URL(`../public/data/nfl-defense-vs-position-${SEASON}.json`, import.meta.url),
};

const TEAM_NAMES = {
  ARI:"Arizona Cardinals",ATL:"Atlanta Falcons",BAL:"Baltimore Ravens",BUF:"Buffalo Bills",CAR:"Carolina Panthers",CHI:"Chicago Bears",CIN:"Cincinnati Bengals",CLE:"Cleveland Browns",DAL:"Dallas Cowboys",DEN:"Denver Broncos",DET:"Detroit Lions",GB:"Green Bay Packers",HOU:"Houston Texans",IND:"Indianapolis Colts",JAX:"Jacksonville Jaguars",KC:"Kansas City Chiefs",LV:"Las Vegas Raiders",LAC:"Los Angeles Chargers",LAR:"Los Angeles Rams",MIA:"Miami Dolphins",MIN:"Minnesota Vikings",NE:"New England Patriots",NO:"New Orleans Saints",NYG:"New York Giants",NYJ:"New York Jets",PHI:"Philadelphia Eagles",PIT:"Pittsburgh Steelers",SF:"San Francisco 49ers",SEA:"Seattle Seahawks",TB:"Tampa Bay Buccaneers",TEN:"Tennessee Titans",WAS:"Washington Commanders",
};

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value); rows.push(row); row = []; value = ""; }
    else if (char !== "\r") value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift() ?? [];
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

const num = (value) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
const maybe = (value) => { const parsed = Number(value); return value !== "" && Number.isFinite(parsed) ? parsed : null; };
const format = (value, digits = 2) => Number.isInteger(value) ? String(value) : value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
const percent = (part, total) => total > 0 ? `${format(part / total * 100, 2)}%` : "-";
const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeRouteName = (value) => normalize(value).replace(/(?:jr|sr|iii|ii|iv)$/, "");
const key = (...parts) => parts.join(":");

async function download(url, binary = false) {
  const response = await fetch(url, { headers: { "user-agent": "Stream-Starters/1.0" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return binary ? Buffer.from(await response.arrayBuffer()) : response.text();
}

function easternWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(date);
}

export function completedWeek(maxWeek, date = new Date()) {
  const override = Number(process.env.NFL_COMPLETED_WEEK);
  if (Number.isInteger(override) && override >= 1 && override <= maxWeek) return override;
  return ["Tue", "Wed", "Thu"].includes(easternWeekday(date)) ? maxWeek : Math.max(1, maxWeek - 1);
}

function buildPbpMetrics(rows) {
  const players = new Map();
  const teamRedZone = new Map();
  const player = (id, week) => {
    const idKey = key(id, week);
    if (!players.has(idKey)) players.set(idKey, { rush1:0,rush3:0,rush5:0,rush10:0,rush20:0,i5Carries:0,i10Carries:0,i10Rec:0,i10Targets:0,i20Targets:0 });
    return players.get(idKey);
  };
  for (const row of rows) {
    const week = num(row.week);
    const yardline = maybe(row.yardline_100);
    if (!week || yardline === null) continue;
    if (row.rush_attempt === "1" && row.rusher_player_id) {
      const metric = player(row.rusher_player_id, week);
      const yards = num(row.rushing_yards || row.yards_gained);
      if (yards >= 1) metric.rush1 += 1;
      if (yards >= 3) metric.rush3 += 1;
      if (yards >= 5) metric.rush5 += 1;
      if (yards >= 10) metric.rush10 += 1;
      if (yards >= 20) metric.rush20 += 1;
      if (yardline <= 5) metric.i5Carries += 1;
      if (yardline <= 10) metric.i10Carries += 1;
      const teamKey = key(row.posteam, week);
      const totals = teamRedZone.get(teamKey) ?? { i5: 0, i10: 0 };
      if (yardline <= 5) totals.i5 += 1;
      if (yardline <= 10) totals.i10 += 1;
      teamRedZone.set(teamKey, totals);
    }
    if (row.pass_attempt === "1" && row.receiver_player_id) {
      const metric = player(row.receiver_player_id, week);
      if (yardline <= 20) metric.i20Targets += 1;
      if (yardline <= 10) metric.i10Targets += 1;
      if (yardline <= 10 && row.complete_pass === "1") metric.i10Rec += 1;
    }
  }
  return { players, teamRedZone };
}

function normalizeWeekly(stats, advanced, pbp) {
  const advancedByName = new Map(advanced.map((row) => [key(row.week, row.team, normalize(row.pfr_player_name)), row]));
  const weeklyTeam = new Map();
  for (const row of stats) {
    const teamKey = key(row.week, row.team);
    const total = weeklyTeam.get(teamKey) ?? { targets: 0, recYards: 0, recTds: 0 };
    total.targets += num(row.targets); total.recYards += num(row.receiving_yards); total.recTds += num(row.receiving_tds);
    weeklyTeam.set(teamKey, total);
  }
  return stats.filter((row) => row.season_type === "REG" && row.player_id && row.team).map((row) => {
    const week = num(row.week);
    const play = pbp.players.get(key(row.player_id, week)) ?? {};
    const team = weeklyTeam.get(key(row.week, row.team)) ?? {};
    const redZone = pbp.teamRedZone.get(key(row.team, week)) ?? {};
    const adv = advancedByName.get(key(row.week, row.team, normalize(row.player_display_name)));
    return {
      playerId: row.player_id, name: row.player_display_name, position: row.position, team: row.team,
      opponent: row.opponent_team, week, gameId: row.game_id,
      completions:num(row.completions), passAttempts:num(row.attempts), passYards:num(row.passing_yards), passTds:num(row.passing_tds), interceptions:num(row.passing_interceptions), sacks:num(row.sacks_suffered),
      carries:num(row.carries), rushYards:num(row.rushing_yards), rushTds:num(row.rushing_tds), rushFumbles:num(row.rushing_fumbles_lost),
      targets:num(row.targets), receptions:num(row.receptions), recYards:num(row.receiving_yards), recTds:num(row.receiving_tds), recFumbles:num(row.receiving_fumbles_lost), recYac:num(row.receiving_yards_after_catch),
      fantasyPoints:num(row.fantasy_points), fantasyPointsPpr:num(row.fantasy_points_ppr), targetShare:maybe(row.target_share), airYardsShare:maybe(row.air_yards_share), wopr:maybe(row.wopr), racr:maybe(row.racr),
      rush1:play.rush1 ?? 0, rush3:play.rush3 ?? 0, rush5:play.rush5 ?? 0, rush10:play.rush10 ?? num(row.rushing_10), rush20:play.rush20 ?? num(row.rushing_20),
      i5Carries:play.i5Carries ?? 0, i10Carries:play.i10Carries ?? 0, i10Rec:play.i10Rec ?? 0, i10Targets:play.i10Targets ?? 0, i20Targets:play.i20Targets ?? 0,
      teamI5Carries:redZone.i5 ?? 0, teamI10Carries:redZone.i10 ?? 0, teamTargets:team.targets ?? 0, teamRecYards:team.recYards ?? 0, teamRecTds:team.recTds ?? 0,
      yacAfterContact:adv ? num(adv.rushing_yards_after_contact) : null, yacCarries:adv ? num(adv.carries) : null,
    };
  });
}

const sum = (rows, field) => rows.reduce((total, row) => total + num(row[field]), 0);
function cumulativeGroups(rows, endWeek, positions) {
  const grouped = new Map();
  for (const row of rows) {
    if (row.week > endWeek || !positions.includes(row.position)) continue;
    const list = grouped.get(row.playerId) ?? [];
    list.push(row); grouped.set(row.playerId, list);
  }
  return grouped;
}

function buildRbRows(rows, endWeek) {
  const result = [];
  for (const group of cumulativeGroups(rows, endWeek, ["RB"]).values()) {
    group.sort((a,b) => a.week - b.week);
    const latest = group.at(-1); const games = new Set(group.map((row) => row.gameId)).size;
    const carries = sum(group,"carries"), rushYards = sum(group,"rushYards"), targets = sum(group,"targets"), receptions = sum(group,"receptions"), recYards = sum(group,"recYards"), fp = sum(group,"fantasyPointsPpr");
    const i5 = sum(group,"i5Carries"), i10 = sum(group,"i10Carries"), i10Rec = sum(group,"i10Rec");
    const teamTargets = sum(group,"teamTargets"), teamRecYards = sum(group,"teamRecYards"), teamI5 = sum(group,"teamI5Carries"), teamI10 = sum(group,"teamI10Carries");
    const yacRows = group.filter((row) => row.yacAfterContact !== null && row.yacCarries > 0);
    const yacCarries = sum(yacRows,"yacCarries"), yac = sum(yacRows,"yacAfterContact");
    const completeYacCoverage = carries > 0 && yacCarries === carries;
    // Stable opportunity proxy from public usage data. It is used only for relative percentile scoring.
    const weightedOpportunity = carries * .6 + targets * 1.5 + i5 * 1.5 + i10Rec * 1.5;
    result.push({
      Name:latest.name,Team:latest.team,POS:"RB",G:String(games),ATT:String(carries),RuYds:String(rushYards),"RuYds/G":games?format(rushYards/games):"-","RuYds/Rush":carries?format(rushYards/carries):"-",RuTD:String(sum(group,"rushTds")),"Rush FUM":String(sum(group,"rushFumbles")),
      "1+ RuYd%":percent(sum(group,"rush1"),carries),"3+ RuYd%":percent(sum(group,"rush3"),carries),"5+ RuYd%":percent(sum(group,"rush5"),carries),"10+ RuYd%":percent(sum(group,"rush10"),carries),"15+ RuYd%":"-","20+ RuYd%":percent(sum(group,"rush20"),carries),"30+ RuYd%":"-",
      "Ins. 5 Carries":String(i5),"Inside 5 Carry%":percent(i5,teamI5),"Ins. 10 Carries":String(i10),"Inside 10 Carry%":percent(i10,teamI10),
      Targets:String(targets),"Target Share":percent(targets,teamTargets),Rec:String(receptions),"Rec Yards":String(recYards),"Team Rec Yards %":percent(recYards,teamRecYards),"RecYds/Rec":receptions?format(recYards/receptions):"-","RecYds/Tgt":targets?format(recYards/targets):"-","RecYds/G":games?format(recYards/games):"-","Catch%":percent(receptions,targets),"Rec. TD":String(sum(group,"recTds")),"Ins. 10 Rec.":String(i10Rec),"Rec FUM":String(sum(group,"recFumbles")),
      "Weighted Opp.":format(weightedOpportunity),"Weighted Opp./G":games?format(weightedOpportunity/games):"-","FP/G":games?format(fp/games):"-",FP:format(fp),"Total TD":String(sum(group,"rushTds")+sum(group,"recTds")),"YAC/Att":completeYacCoverage?format(yac/yacCarries):"",
      "_Team Targets":String(teamTargets),"_Team Rec Yards":String(teamRecYards),"_Team I5 Carries":String(teamI5),"_Team I10 Carries":String(teamI10),"_YAC Carries":completeYacCoverage?String(yacCarries):"","_YAC Total":completeYacCoverage?String(yac):"",
    });
  }
  const scores = calculateRbScores({ season: SEASON, ageColumn: "unused", rows: result });
  result.forEach((row,index) => Object.assign(row,{"Rush Gain Profile":scores[index].rushGain==null?"":String(scores[index].rushGain),"Rush Score":scores[index].rush==null?"":String(scores[index].rush),"Rec Score":scores[index].receiving==null?"":String(scores[index].receiving),"Opportunity Score":scores[index].opportunity==null?"":String(scores[index].opportunity)}));
  return result.sort((a,b)=>a.Name.localeCompare(b.Name));
}

function buildReceiverRows(rows, endWeek, routeSnapshot) {
  const result = [];
  const current = new Map((routeSnapshot?.rows ?? []).map((row) => [key(row.POS,normalizeRouteName(row.Name)),row]));
  for (const group of cumulativeGroups(rows, endWeek, ["WR","TE"]).values()) {
    group.sort((a,b)=>a.week-b.week);
    const latest=group.at(-1), games=new Set(group.map((row)=>row.gameId)).size, targets=sum(group,"targets"), receptions=sum(group,"receptions"), yards=sum(group,"recYards"), fp=sum(group,"fantasyPointsPpr");
    const teamTargets=sum(group,"teamTargets"), teamYards=sum(group,"teamRecYards"), teamTds=sum(group,"teamRecTds"), recTds=sum(group,"recTds"), yac=sum(group,"recYac");
    const prior=current.get(key(latest.position,normalizeRouteName(latest.name))) ?? {};
    // The snapshot is keyed to this completed NFL week. Route totals remain
    // valid even when a provider counts games played differently for zero-use weeks.
    const routes = prior["Routes Run"] ?? "";
    const routeRateQualified = routes !== "" && games > 0 && num(routes) / games >= 10;
    result.push({Name:latest.name,Team:latest.team,POS:latest.position,G:String(games),Targets:String(targets),"Targets/G":games?format(targets/games):"","Target Share":percent(targets,teamTargets),Rec:String(receptions),"Rec Yards":String(yards),"Team Rec Yards %":percent(yards,teamYards),YPR:receptions?format(yards/receptions):"",YPT:targets?format(yards/targets):"","RecYds/G":games?format(yards/games):"","Catch %":percent(receptions,targets),"Rec TD":String(recTds),"Team TD %":percent(recTds,teamTds),i10:String(sum(group,"i10Targets")),"i10/G":games?format(sum(group,"i10Targets")/games):"","i20 Targets":String(sum(group,"i20Targets")),"i20/G":games?format(sum(group,"i20Targets")/games):"",FUM:String(sum(group,"recFumbles")),"FP/G":games?format(fp/games):"",FP:format(fp),"Routes Run":routes,"Routes/G":routes&&games?format(num(routes)/games):"","Targets/Route Run":routeRateQualified?format(targets/num(routes)):"",YAC:String(yac),"YAC/Rec":receptions?format(yac/receptions):"",YPRR:routeRateQualified?format(yards/num(routes)):"",RACR:format(group.reduce((v,r)=>v+(r.racr??0),0)/Math.max(1,group.filter(r=>r.racr!==null).length)),WOPR:format(group.reduce((v,r)=>v+(r.wopr??0),0)/Math.max(1,group.filter(r=>r.wopr!==null).length)),"_Team Targets":String(teamTargets),"_Team Rec Yards":String(teamYards),"_Team Rec TD":String(teamTds)});
  }
  for(const position of ["WR","TE"]){const group=result.filter(row=>row.POS===position);const scores=calculateReceiverScores(group);group.forEach((row,index)=>Object.assign(row,{"Efficiency Grade":scores[index].efficiency==null?"":String(scores[index].efficiency),"Opportunity Grade":scores[index].opportunity==null?"":String(scores[index].opportunity)}));}
  return result.sort((a,b)=>a.POS.localeCompare(b.POS)||a.Name.localeCompare(b.Name));
}

function buildDefenseRows(rows, endWeek) {
  const groups = new Map(Object.keys(TEAM_NAMES).map((team)=>[team,[]]));
  for(const row of rows) if(row.week<=endWeek && groups.has(row.opponent)) groups.get(row.opponent).push(row);
  const pg=(value,games)=>games?format(value/games,1):"0";
  return [...groups.entries()].map(([team,all])=>{
    const games=new Set(all.map(row=>row.gameId)).size; const result={Team:TEAM_NAMES[team],Acronym:team};
    for(const position of ["QB","RB","WR","TE"]){const group=all.filter(row=>row.position===position);const prefix=`${position} `;
      if(position==="QB") Object.assign(result,{[prefix+"Cmp"]:pg(sum(group,"completions"),games),[prefix+"Pass Att"]:pg(sum(group,"passAttempts"),games),[prefix+"Pass Yds"]:pg(sum(group,"passYards"),games),[prefix+"Pass TD"]:pg(sum(group,"passTds"),games),[prefix+"Int"]:pg(sum(group,"interceptions"),games),[prefix+"Sk"]:pg(sum(group,"sacks"),games),[prefix+"Rush Att"]:pg(sum(group,"carries"),games),[prefix+"Rush Yds"]:pg(sum(group,"rushYards"),games),[prefix+"Rush TD"]:pg(sum(group,"rushTds"),games)});
      else Object.assign(result,{[prefix+"Rush Att"]:pg(sum(group,"carries"),games),[prefix+"Rush Yds"]:pg(sum(group,"rushYards"),games),[prefix+"Tgt"]:pg(sum(group,"targets"),games),[prefix+"Rec"]:pg(sum(group,"receptions"),games),[prefix+"Rec Yds"]:pg(sum(group,"recYards"),games),[prefix+"TD"]:pg(sum(group,"rushTds")+sum(group,"recTds"),games)});
      result[prefix+"Fantasy PPG"]=pg(sum(group,"fantasyPoints"),games);
    }
    return result;
  }).sort((a,b)=>a.Team.localeCompare(b.Team));
}

async function previousJson(url) { try { return JSON.parse(await readFile(url,"utf8")); } catch { return null; } }
async function atomicJson(url, payload) { const temp=new URL(`${url.pathname}.tmp`,url); await writeFile(temp,`${JSON.stringify(payload,null,2)}\n`); await rename(temp,url); }

async function main() {
  const [statsText, advancedText, pbpGzip, routeArchive] = await Promise.all([download(URLS.players),download(URLS.rushing),download(URLS.pbp,true),previousJson(new URL(`../public/data/receiver-routes-weekly-${SEASON}.json`,import.meta.url))]);
  const stats=parseCsv(statsText), advanced=parseCsv(advancedText), pbp=parseCsv(gunzipSync(pbpGzip).toString("utf8"));
  const weekly=normalizeWeekly(stats,advanced,buildPbpMetrics(pbp));
  const maxWeek=Math.max(...weekly.map(row=>row.week)); const complete=completedWeek(maxWeek); const capturedAt=new Date().toISOString();
  if(stats.length<5000||weekly.length<5000||advanced.length<300||pbp.length<10000) throw new Error("nflverse source population failed validation");
  const rbWeeks=[], receiverWeeks=[];
  for(let week=1;week<=complete;week+=1){const rbRows=buildRbRows(weekly,week);const routeSnapshot=routeArchive?.weeks?.find((entry)=>entry.week===week);const receiverRows=buildReceiverRows(weekly,week,routeSnapshot);rbWeeks.push({week,copiedAt:capturedAt,rows:rbRows});receiverWeeks.push({week,copiedAt:capturedAt,population:{WR:receiverRows.filter(row=>row.POS==="WR").length,TE:receiverRows.filter(row=>row.POS==="TE").length},rows:receiverRows});}
  const latestReceivers=receiverWeeks.at(-1).rows;
  if(rbWeeks.at(-1).rows.length<70||latestReceivers.filter(row=>row.POS==="WR").length<100||latestReceivers.filter(row=>row.POS==="TE").length<40) throw new Error("generated profile population failed validation");
  const latestRb=rbWeeks.at(-1).rows;
  await Promise.all([
    atomicJson(targets.rb,{season:SEASON,source:URLS,method:"exact weekly rows accumulated through each completed week",completedThroughWeek:complete,weeks:rbWeeks}),
    atomicJson(targets.rbLatest,{season:SEASON,source:URLS,copiedAt:capturedAt,updateMode:"automatic nflverse weekly refresh",seasonType:"Regular",scoring:"PPR",population:`RB only; all ${latestRb.length} qualifying rows`,rows:latestRb}),
    atomicJson(targets.receivers,{season:SEASON,source:URLS,method:"exact weekly rows accumulated through each completed week",completedThroughWeek:complete,weeks:receiverWeeks}),
    atomicJson(targets.receiversLatest,{season:SEASON,source:URLS,enrichmentSources:[routeArchive?.source].filter(Boolean),copiedAt:capturedAt,updateMode:"automatic nflverse weekly refresh",seasonType:"Regular",scoring:"PPR",population:{WR:latestReceivers.filter(row=>row.POS==="WR").length,TE:latestReceivers.filter(row=>row.POS==="TE").length},rows:latestReceivers}),
    atomicJson(targets.yac,{season:SEASON,capturedAt,coverageNote:`nflverse PFR advanced rushing through Week ${complete}.`,source:"https://www.pro-football-reference.com/years/2026/rushing_advanced.htm",upstream:URLS.rushing,rows:latestRb.filter(row=>row["YAC/Att"]!=="").map(row=>({Name:row.Name,Team:row.Team,"YAC/Att":row["YAC/Att"]}))}),
    atomicJson(targets.defense,{season:SEASON,capturedAt,coverageNote:`nflverse weekly player results through games played in live Week ${maxWeek}.`,source:{weekly:URLS.players},rows:buildDefenseRows(weekly,maxWeek)}),
  ]);
  console.log(`nflverse football data updated: ${weekly.length} player-week rows; completed Week ${complete}; live source Week ${maxWeek}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g,"/")}`).href) await main();
