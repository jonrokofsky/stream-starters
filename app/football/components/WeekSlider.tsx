"use client";

type WeekSliderProps = {
  id: string;
  weeks: number[];
  startWeek: number | null;
  endWeek: number;
  onChange: (startWeek: number | null, endWeek: number) => void;
  label?: string;
};

export default function WeekSlider({ id, weeks, startWeek, endWeek, onChange, label = "Profile timeline" }: WeekSliderProps) {
  if (!weeks.length) return null;
  const points: Array<number | null> = [null, ...weeks];
  const startIndex = startWeek === null ? 0 : Math.max(0, points.indexOf(startWeek));
  const endIndex = Math.max(1, points.indexOf(endWeek));
  const maximum = points.length - 1;
  const validStartIndices = [0, ...weeks.flatMap((week, index) => weeks.includes(week - 1) ? [index + 1] : [])];
  const rangeLabel = startWeek === null
    ? `Season Start – Week ${endWeek}`
    : startWeek === endWeek
      ? `Week ${startWeek}`
      : `Weeks ${startWeek}–${endWeek}`;
  const startPercent = maximum ? startIndex / maximum * 100 : 0;
  const endPercent = maximum ? endIndex / maximum * 100 : 100;
  const thumbClass = "week-timeline-range absolute inset-0 h-6 w-full";

  function changeStart(requestedIndex: number) {
    const candidates = validStartIndices.filter((index) => index <= endIndex);
    const nextIndex = candidates.reduce((best, index) => Math.abs(index - requestedIndex) < Math.abs(best - requestedIndex) ? index : best, candidates[0]);
    onChange(points[nextIndex] ?? null, endWeek);
  }

  function changeEnd(requestedIndex: number) {
    const nextIndex = Math.max(startIndex || 1, requestedIndex);
    onChange(startWeek, weeks[nextIndex - 1] ?? endWeek);
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{label}</div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{rangeLabel}</div>
      </div>
      <div className="relative mt-3 h-6">
        <div className="absolute left-0 right-0 top-2.5 h-1 rounded-full bg-slate-200" />
        <div className="absolute top-2.5 h-1 rounded-full bg-sky-500" style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }} />
        <input id={`${id}-start`} aria-label={`${label} start`} type="range" min="0" max={String(maximum)} step="1" value={startIndex} onChange={(event) => changeStart(Number(event.target.value))} className={`${thumbClass} z-20`} aria-valuetext={startWeek === null ? "Season Start" : `Week ${startWeek}`} />
        <input id={`${id}-end`} aria-label={`${label} end`} type="range" min="1" max={String(maximum)} step="1" value={endIndex} onChange={(event) => changeEnd(Number(event.target.value))} className={`${thumbClass} z-10`} aria-valuetext={`Week ${endWeek}`} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-black text-slate-500">
        <span>Start</span>
        {weeks.map((week) => <span key={week}>W{week}</span>)}
      </div>
      <div className="mt-2 text-[11px] font-bold text-slate-500">Drag either end of the timeline to choose the exact window.</div>
    </div>
  );
}
