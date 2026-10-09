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
  const maximumWeek = Math.max(...weeks);
  const timelineWeeks = Array.from({ length: maximumWeek }, (_, index) => index + 1);
  const startIndex = (startWeek ?? 1) - 1;
  const endIndex = endWeek - 1;
  const maximum = maximumWeek - 1;
  const validStartWeeks = [1, ...weeks.filter((week) => weeks.includes(week - 1))];
  const rangeLabel = startWeek === null
    ? (endWeek === 1 ? "Week 1" : `Weeks 1–${endWeek}`)
    : startWeek === endWeek
      ? `Week ${startWeek}`
      : `Weeks ${startWeek}–${endWeek}`;
  const startPercent = maximum ? startIndex / maximum * 100 : 0;
  const endPercent = maximum ? endIndex / maximum * 100 : 100;
  const thumbClass = "week-timeline-range absolute inset-0 h-6 w-full";

  function changeStart(requestedIndex: number) {
    const requestedWeek = requestedIndex + 1;
    const candidates = validStartWeeks.filter((week) => week <= endWeek);
    const nextWeek = candidates.reduce((best, week) => Math.abs(week - requestedWeek) < Math.abs(best - requestedWeek) ? week : best, candidates[0]);
    onChange(nextWeek === 1 ? null : nextWeek, endWeek);
  }

  function changeEnd(requestedIndex: number) {
    const requestedWeek = requestedIndex + 1;
    const minimumWeek = startWeek ?? 1;
    const candidates = weeks.filter((week) => week >= minimumWeek);
    const nextWeek = candidates.reduce((best, week) => Math.abs(week - requestedWeek) < Math.abs(best - requestedWeek) ? week : best, candidates[0]);
    onChange(startWeek, nextWeek);
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
        <input id={`${id}-start`} aria-label={`${label} start`} type="range" min="0" max={String(maximum)} step="1" value={startIndex} onChange={(event) => changeStart(Number(event.target.value))} className={`${thumbClass} z-20`} aria-valuetext={`Week ${startWeek ?? 1}`} />
        <input id={`${id}-end`} aria-label={`${label} end`} type="range" min="0" max={String(maximum)} step="1" value={endIndex} onChange={(event) => changeEnd(Number(event.target.value))} className={`${thumbClass} z-10`} aria-valuetext={`Week ${endWeek}`} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-black text-slate-500">
        {timelineWeeks.map((week) => <span key={week}>W{week}</span>)}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-500"><span>Start week</span><span>End week</span></div>
    </div>
  );
}
