"use client";

import Link from "next/link";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";

type Row = Record<string, string>;
type Snapshot = { copiedAt: string; population: { WR: number; TE: number }; rows: Row[] };
type PositionFilter = "ALL" | "WR" | "TE";

const MIN_RECEIVER_ROUTES_PER_GAME = 10;

const efficiency = [
  ["YPRR", "Yards / Route Run"],
  ["YAC/Rec", "YAC / Reception"],
  ["RecYds/G", "Receiving Yards / Game"],
  ["YPR", "Yards / Catch"],
  ["YPT", "Yards / Target"],
] as const;
const opportunity = [
  ["Routes/G", "Routes Run / Game"],
  ["Target Share", "Target Share"],
  ["Targets/Route Run", "Targets / Route Run"],
  ["i20/G", "Inside-20 Targets / Game"],
  ["i10/G", "Inside-10 Targets / Game"],
  ["Team Rec Yards %", "Team Receiving Yards"],
  ["Rec TD", "Receiving Touchdowns"],
] as const;
const tableColumns = [
  ["Name", "Player"], ["POS", "Pos"], ["Team", "Team"], ["G", "G"], ["Efficiency Grade", "Efficiency"], ["Opportunity Grade", "Opportunity"], ["Targets", "Tgt"],
  ["FP/G", "PPR FP/G"],
  ["Target Share", "Tgt Share"], ["Rec", "Rec"], ["Rec Yards", "Rec Yds"], ["RecYds/G", "Yds/G"],
  ["YPR", "Yds/Catch"], ["YPT", "Yds/Tgt"], ["YPRR", "YPRR"], ["YAC/Rec", "YAC/Rec"],
  ["Routes/G", "Routes/G"], ["Targets/Route Run", "Tgt/Route"], ["i20/G", "i20/G"], ["i10/G", "i10/G"],
  ["Team Rec Yards %", "Tm Yds %"], ["Rec TD", "TD"],
] as const;

const colors: Record<string, [string, string]> = {
  ARI:["#97233F","#000"],ATL:["#A71930","#000"],BAL:["#241773","#000"],BUF:["#00338D","#C60C30"],CAR:["#0085CA","#101820"],CHI:["#0B162A","#C83803"],CIN:["#FB4F14","#000"],CLE:["#311D00","#FF3C00"],DAL:["#003594","#869397"],DEN:["#FB4F14","#002244"],DET:["#0076B6","#B0B7BC"],GB:["#203731","#FFB612"],HOU:["#03202F","#A71930"],IND:["#002C5F","#A2AAAD"],JAX:["#006778","#D7A22A"],KC:["#E31837","#FFB81C"],LV:["#000","#A5ACAF"],LAC:["#0080C6","#FFC20E"],LAR:["#003594","#FFA300"],MIA:["#008E97","#FC4C02"],MIN:["#4F2683","#FFC62F"],NE:["#002244","#C60C30"],NO:["#D3BC8D","#101820"],NYG:["#0B2265","#A71930"],NYJ:["#125740","#000"],PHI:["#004C54","#A5ACAF"],PIT:["#FFB612","#101820"],SEA:["#002244","#69BE28"],SF:["#AA0000","#B3995D"],TB:["#D50A0A","#34302B"],TEN:["#0C2340","#4B92DB"],WAS:["#5A1414","#FFB612"],
};
const number = (value: string | undefined) => { const parsed = Number(String(value ?? "").replace(/[,%$]/g, "")); return Number.isFinite(parsed) ? parsed : null; };
const logo = (team: string) => `https://a.espncdn.com/i/teamlogos/nfl/500/${({ WAS:"wsh", JAX:"jax" } as Record<string,string>)[team] || team.toLowerCase()}.png`;
const gradeStyle = (score: number) => score >= 90 ? "bg-red-600 text-white border-red-700" : score >= 75 ? "bg-red-400 text-white border-red-500" : score >= 60 ? "bg-red-100 text-red-950 border-red-200" : score >= 40 ? "bg-white text-slate-900 border-slate-200" : score >= 25 ? "bg-blue-100 text-blue-950 border-blue-200" : score >= 10 ? "bg-blue-400 text-white border-blue-500" : "bg-blue-700 text-white border-blue-800";
const gradeLabel = (score: number) => score >= 90 ? "Elite" : score >= 75 ? "Excellent" : score >= 60 ? "Above Average" : score >= 40 ? "Average" : score >= 25 ? "Below Average" : score >= 10 ? "Poor" : "Very Poor";
const percentile = (value: number, population: number[]) => {
  const sorted = [...population].sort((a,b) => a-b); if (sorted.length < 2) return 50;
  const below = sorted.filter((entry) => entry < value).length;
  const equal = sorted.filter((entry) => entry === value).length;
  return Math.round((below + Math.max(0, equal - 1) / 2) / (sorted.length - 1) * 100);
};
const receiverQualified = (row: Row) => (number(row["Routes/G"]) ?? 0) >= MIN_RECEIVER_ROUTES_PER_GAME;
const display = (key: string, value: string | undefined) => {
  if (value == null || value === "") return "—";
  if (["Target Share","Team Rec Yards %","Targets/Route Run"].includes(key)) {
    const parsed = number(value); return parsed == null ? value : `${(parsed <= 1 ? parsed * 100 : parsed).toFixed(1)}%`;
  }
  const parsed = number(value); return parsed == null ? value : Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};

export default function ReceiverProfilePage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PositionFilter>("ALL");
  const [sortKey, setSortKey] = useState("Efficiency Grade");
  const [ascending, setAscending] = useState(false);
  const [copyState, setCopyState] = useState<"idle"|"copying"|"copied"|"error">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch("/data/receivers-2026.json").then((response) => { if (!response.ok) throw Error("Receiver data is unavailable"); return response.json(); }).then((snapshot: Snapshot) => { setData(snapshot); const first = snapshot.rows.sort((a,b) => (number(b["Efficiency Grade"]) ?? 0) - (number(a["Efficiency Grade"]) ?? 0))[0]; if (first) setSelectedName(`${first.POS}:${first.Name}`); }).catch(console.error); }, []);
  const selected = data?.rows.find((row) => `${row.POS}:${row.Name}` === selectedName);
  const matches = useMemo(() => !data || !query.trim() ? [] : data.rows.filter((row) => `${row.Name} ${row.Team} ${row.POS}`.toLowerCase().includes(query.toLowerCase())).slice(0,8), [data,query]);
  const sortedRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((row) => filter === "ALL" || row.POS === filter).sort((a,b) => {
      const av = number(a[sortKey]), bv = number(b[sortKey]);
      const comparison = av !== null && bv !== null ? av-bv : String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      return ascending ? comparison : -comparison;
    });
  }, [data,filter,sortKey,ascending]);
  const rowPercentile = (row: Row, key: string) => {
    if (!data) return 50; const value = number(row[key]); if (value == null) return 50;
    return percentile(value, data.rows.filter((item) => item.POS === row.POS).map((item) => number(item[key])).filter((entry): entry is number => entry !== null));
  };
  const fantasyPpgPercentile = (row: Row) => {
    if (!data || !receiverQualified(row)) return null;
    const value = number(row["FP/G"]);
    if (value === null) return null;
    const population = data.rows
      .filter((item) => item.POS === row.POS && receiverQualified(item))
      .map((item) => number(item["FP/G"]))
      .filter((entry): entry is number => entry !== null);
    return percentile(value, population);
  };
  const componentGrade = (key: string) => selected ? rowPercentile(selected, key) : 50;
  const sort = (key: string) => { if (sortKey === key) setAscending((value) => !value); else { setSortKey(key); setAscending(key === "Name" || key === "POS" || key === "Team"); } };
  async function copyGraphic() {
    if (!cardRef.current) return; setCopyState("copying");
    try { const url = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#f8fafc" }); const blob = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); setCopyState("copied"); }
    catch (error) { console.error(error); setCopyState("error"); }
    window.setTimeout(() => setCopyState("idle"), 1800);
  }
  const team = selected?.Team || "NFL"; const theme = colors[team] || ["#0f172a","#0284c7"];

  return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-100 to-white text-slate-950">
    <header className="border-b border-slate-200 bg-white/95"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Link href="/" className="text-xl font-black tracking-tight">STREAM <span className="text-sky-600">STARTERS</span></Link><div className="flex gap-2"><Link href="/football/matchup" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Position Matchup</Link><Link href="/football/rb" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">RB Profiles</Link><Link href="/football" className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white">Defense vs Position</Link></div></div></header>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-3 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-[.18em] text-sky-700">WR + TE Analysis</div><h1 className="text-3xl font-black sm:text-5xl">Receiver Profile Tool</h1><p className="mt-3 max-w-3xl text-slate-600">Efficiency and opportunity grades for every wide receiver and tight end. WRs are graded against WRs; TEs are graded against TEs.</p></div><button onClick={copyGraphic} disabled={!selected || copyState === "copying"} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-40">{copyState === "copying" ? "Copying..." : copyState === "copied" ? "Copied!" : copyState === "error" ? "Try Again" : "Copy Graphic"}</button></div>
      <div className="relative mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Find a receiver</label><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search WR or TE..." className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold outline-none focus:border-sky-500" />{matches.length > 0 && <div className="absolute left-4 right-4 top-[92px] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">{matches.map((row) => <button key={`${row.POS}:${row.Name}`} onClick={() => { setSelectedName(`${row.POS}:${row.Name}`); setQuery(""); }} className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left hover:bg-sky-50"><span className="font-black">{row.Name}</span><span className="text-sm font-bold text-slate-500">{row.POS} · {row.Team}</span></button>)}</div>}</div>
      {!data && <div className="rounded-3xl bg-white p-10 text-center font-black shadow-sm">Loading receiver data...</div>}
      {data && selected && <div ref={cardRef} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-wrap items-center gap-5 p-6 text-white sm:p-8" style={{background:`linear-gradient(115deg, ${theme[0]}, ${theme[1]})`}}><div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg"><img src={logo(team)} alt={`${team} logo`} className="h-full w-full object-contain" /></div><div className="min-w-0 flex-1"><div className="text-xs font-black uppercase tracking-[.2em] opacity-80">{selected.POS} · Receiver Profile</div><h2 className="mt-1 text-3xl font-black sm:text-4xl">{selected.Name}</h2><div className="mt-1 text-sm font-bold opacity-80">{team} · 2026 season · {selected.G} games</div></div>{(() => { const value=number(selected["FP/G"]); const grade=fantasyPpgPercentile(selected); return <div className={`w-full rounded-2xl border p-4 shadow-xl sm:ml-auto sm:w-48 ${grade === null ? "border-slate-200 bg-white text-slate-900" : gradeStyle(grade)}`}><div className="text-[11px] font-black uppercase tracking-[.16em] opacity-70">PPR Fantasy PPG</div><div className="mt-2 flex items-end justify-between gap-2"><div className="text-4xl font-black leading-none">{value === null ? "—" : value.toFixed(1)}</div><div className="text-xs font-black">{grade === null ? "" : `P${grade}`}</div></div><div className="mt-2 text-xs font-black opacity-75">{value === null ? "Unavailable" : grade === null ? `Below ${MIN_RECEIVER_ROUTES_PER_GAME} routes/game minimum` : `${gradeLabel(grade)} among qualified ${selected.POS}s`}</div></div>; })()}</div>
        <div className="grid gap-4 bg-slate-950 p-6 sm:grid-cols-2 sm:p-8">{[["Efficiency Grade",selected["Efficiency Grade"]],["Opportunity Grade",selected["Opportunity Grade"]]].map(([label,value]) => { const score = number(value) ?? 0; return <div key={label} className={`rounded-2xl border p-5 ${gradeStyle(score)}`}><div className="text-xs font-black uppercase tracking-[.16em] opacity-70">{label}</div><div className="mt-2 text-5xl font-black">{score}</div><div className="mt-1 text-sm font-bold">{gradeLabel(score)} · vs {selected.POS}s</div></div>;})}</div>
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2"><MetricSection title="Efficiency" subtitle="How much the receiver produces with routes and targets" items={efficiency} row={selected} componentGrade={componentGrade} /><MetricSection title="Opportunity" subtitle="Routes, target earning, team share, and scoring usage" items={opportunity} row={selected} componentGrade={componentGrade} /></div>
        <div className="border-t border-slate-200 px-6 py-4 text-xs font-bold text-slate-500">Updated {new Date(data.copiedAt).toLocaleString()} · Fantasy Points Data Suite + SumerSports</div>
      </div>}
      {data && <section className="mt-10 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-black">All Receivers</h2><p className="text-sm text-slate-500">Click a column to sort. PPR FP/G colors require {MIN_RECEIVER_ROUTES_PER_GAME}+ routes per game and remain position-specific.</p></div><div className="flex rounded-xl bg-slate-100 p-1">{(["ALL","WR","TE"] as PositionFilter[]).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 text-sm font-black ${filter === value ? "bg-slate-950 text-white shadow" : "text-slate-600"}`}>{value === "ALL" ? "All" : value}</button>)}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[1500px] border-collapse text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50">{tableColumns.map(([key,label]) => <th key={key} className="whitespace-nowrap px-3 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500"><button onClick={() => sort(key)}>{label}{sortKey === key ? (ascending ? " ↑" : " ↓") : ""}</button></th>)}</tr></thead><tbody>{sortedRows.map((row) => <tr key={`${row.POS}:${row.Name}`} onClick={() => { setSelectedName(`${row.POS}:${row.Name}`); window.scrollTo({top:0,behavior:"smooth"}); }} className="cursor-pointer border-b border-slate-100 hover:bg-sky-50">{tableColumns.map(([key]) => { const value = number(row[key]); const score = (key === "Efficiency Grade" || key === "Opportunity Grade") ? value : key === "FP/G" && value !== null ? fantasyPpgPercentile(row) : null; return <td key={key} className={`whitespace-nowrap px-3 py-3 font-semibold ${key === "Name" ? "font-black" : ""}`}><span className={score === null ? "" : `inline-flex min-w-10 justify-center rounded-lg border px-2 py-1 font-black ${gradeStyle(score)}`}>{display(key,row[key])}</span></td>;})}</tr>)}</tbody></table></div></section>}
    </section>
  </main>;
}

function MetricSection({title,subtitle,items,row,componentGrade}:{title:string;subtitle:string;items:readonly (readonly [string,string])[];row:Row;componentGrade:(key:string)=>number}) {
  return <section><h3 className="text-xl font-black">{title}</h3><p className="mb-4 text-sm text-slate-500">{subtitle}</p><div className="grid gap-3 sm:grid-cols-2">{items.map(([key,label]) => { const grade = componentGrade(key); return <div key={key} className={`rounded-2xl border p-4 ${gradeStyle(grade)}`}><div className="flex justify-between gap-3"><div className="text-xs font-black uppercase tracking-wide opacity-70">{label}</div><div className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-black">P{grade}</div></div><div className="mt-3 text-3xl font-black">{display(key,row[key])}</div></div>;})}</div></section>;
}
