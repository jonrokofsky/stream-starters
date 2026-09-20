import assert from "node:assert/strict";
import test from "node:test";
import { calculateRbScores } from "../lib/data/rbScores.ts";
import { mergeRbYac } from "../lib/data/rbYac.ts";
test("2026 rush weights YAC at 20%, preserving endpoints and missing values", () => {
 const fields=["RuYds/G","RuYds/Rush","1+ RuYd%","3+ RuYd%","5+ RuYd%","10+ RuYd%","20+ RuYd%"];
 const low=Object.fromEntries(fields.map(k=>[k,0])),high=Object.fromEntries(fields.map(k=>[k,10]));
 const score=(rows: Record<string,string|number>[])=>calculateRbScores({season:2026,ageColumn:"unused",rows});
 assert.deepEqual(score([{...low,"YAC/Att":10},{...high,"YAC/Att":0}]).map(s=>s.rush),[20,80]);
 assert.deepEqual(score([{...low,"YAC/Att":0},{...high,"YAC/Att":10}]).map(s=>s.rush),[0,100]);
 assert.equal(score([low,{...high,"YAC/Att":10}])[0].rush,null);
});
test("YAC joins aliases and team, preserves zero, rejects duplicates", () => {
 const snapshot={season:2026,source:"https://www.pro-football-reference.com/years/2026/rushing_advanced.htm",capturedAt:"2026-09-19T18:00:00Z",coverageNote:"Week 1",rows:[{Name:"Kenneth Gainwell",Team:"TB","YAC/Att":"0.0"}]};
 const result=mergeRbYac([{Name:"Kenny Gainwell",Team:"TB"},{Name:"Kenny Gainwell",Team:"PHI"}],snapshot);
 assert.equal(result[0]["YAC/Att"],"0.0");assert.equal(result[1]["YAC/Att"],"");
 assert.throws(()=>mergeRbYac([], {...snapshot,rows:[...snapshot.rows,...snapshot.rows]}),/Ambiguous/);
});
