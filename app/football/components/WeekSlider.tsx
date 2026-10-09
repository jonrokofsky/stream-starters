"use client";

import { useRef } from "react";

type WeekSliderProps = {
  id: string;
  weeks: number[];
  startWeek: number | null;
  endWeek: number;
  onChange: (startWeek: number | null, endWeek: number) => void;
  label?: string;
};

type Handle = "start" | "end";

function nearestWeek(requested: number, candidates: number[]) {
  return candidates.reduce((best, week) =>
    Math.abs(week - requested) < Math.abs(best - requested) ? week : best
  );
}

export default function WeekSlider({ id, weeks, startWeek, endWeek, onChange, label = "Profile timeline" }: WeekSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeHandle = useRef<Handle | null>(null);
  if (!weeks.length) return null;

  const maximumWeek = Math.max(...weeks);
  const timelineWeeks = Array.from({ length: maximumWeek }, (_, index) => index + 1);
  const actualStartWeek = startWeek ?? 1;
  const maximum = Math.max(maximumWeek - 1, 1);
  const validStartWeeks = [1, ...weeks.filter((week) => weeks.includes(week - 1))];
  const rangeLabel = actualStartWeek === endWeek ? `Week ${actualStartWeek}` : `Weeks ${actualStartWeek}–${endWeek}`;
  const startPercent = (actualStartWeek - 1) / maximum * 100;
  const endPercent = (endWeek - 1) / maximum * 100;

  function update(handle: Handle, requestedWeek: number) {
    if (handle === "start") {
      const candidates = validStartWeeks.filter((week) => week <= endWeek);
      const next = nearestWeek(requestedWeek, candidates);
      onChange(next === 1 ? null : next, endWeek);
      return;
    }
    const candidates = weeks.filter((week) => week >= actualStartWeek);
    const next = nearestWeek(requestedWeek, candidates);
    onChange(startWeek, next);
  }

  function weekFromPointer(clientX: number) {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return actualStartWeek;
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    return Math.round(ratio * (maximumWeek - 1)) + 1;
  }

  function beginDrag(handle: Handle, clientX: number, pointerId: number) {
    activeHandle.current = handle;
    trackRef.current?.setPointerCapture(pointerId);
    update(handle, weekFromPointer(clientX));
  }

  function handleTrackPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const requestedWeek = weekFromPointer(event.clientX);
    const startDistance = Math.abs(requestedWeek - actualStartWeek);
    const endDistance = Math.abs(requestedWeek - endWeek);
    beginDrag(startDistance < endDistance ? "start" : "end", event.clientX, event.pointerId);
  }

  function handleKeyDown(handle: Handle, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const candidates = handle === "start"
      ? validStartWeeks.filter((week) => week <= endWeek)
      : weeks.filter((week) => week >= actualStartWeek);
    const current = handle === "start" ? actualStartWeek : endWeek;
    const index = Math.max(0, candidates.indexOf(current));
    const next = event.key === "Home"
      ? candidates[0]
      : event.key === "End"
        ? candidates.at(-1)!
        : candidates[Math.min(candidates.length - 1, Math.max(0, index + (["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1)))];
    update(handle, next);
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{label}</div>
        <output className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white" htmlFor={`${id}-start ${id}-end`}>{rangeLabel}</output>
      </div>

      <div
        ref={trackRef}
        className="relative mt-4 h-9 touch-none select-none cursor-pointer"
        onPointerDown={handleTrackPointerDown}
        onPointerMove={(event) => activeHandle.current && update(activeHandle.current, weekFromPointer(event.clientX))}
        onPointerUp={() => { activeHandle.current = null; }}
        onPointerCancel={() => { activeHandle.current = null; }}
      >
        <div className="absolute left-0 right-0 top-4 h-1.5 rounded-full bg-slate-200" />
        <div className="absolute top-4 h-1.5 rounded-full bg-sky-500" style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }} />
        {timelineWeeks.map((week) => (
          <span
            key={week}
            className={`absolute top-[13px] h-3 w-3 -translate-x-1/2 rounded-full border-2 ${week >= actualStartWeek && week <= endWeek ? "border-sky-500 bg-white" : "border-slate-300 bg-slate-100"}`}
            style={{ left: `${(week - 1) / maximum * 100}%` }}
          />
        ))}
        <button
          id={`${id}-start`}
          type="button"
          aria-label={`${label} start week`}
          aria-valuemin={1}
          aria-valuemax={endWeek}
          aria-valuenow={actualStartWeek}
          aria-valuetext={`Week ${actualStartWeek}`}
          onPointerDown={(event) => { event.stopPropagation(); beginDrag("start", event.clientX, event.pointerId); }}
          onKeyDown={(event) => handleKeyDown("start", event)}
          className="absolute top-1.5 z-20 h-6 w-6 -translate-x-1/2 rounded-full border-4 border-white bg-sky-600 shadow-md outline-none ring-sky-300 focus-visible:ring-4"
          style={{ left: `${startPercent}%` }}
        />
        <button
          id={`${id}-end`}
          type="button"
          aria-label={`${label} end week`}
          aria-valuemin={actualStartWeek}
          aria-valuemax={maximumWeek}
          aria-valuenow={endWeek}
          aria-valuetext={`Week ${endWeek}`}
          onPointerDown={(event) => { event.stopPropagation(); beginDrag("end", event.clientX, event.pointerId); }}
          onKeyDown={(event) => handleKeyDown("end", event)}
          className="absolute top-1.5 z-10 h-6 w-6 -translate-x-1/2 rounded-full border-4 border-white bg-cyan-500 shadow-md outline-none ring-cyan-300 focus-visible:ring-4"
          style={{ left: `${endPercent}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] font-black text-slate-500">
        {timelineWeeks.map((week) => <span key={week}>W{week}</span>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-sky-200 bg-white px-3 py-2"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Start</div><div className="text-sm font-black text-slate-900">Week {actualStartWeek}</div></div>
        <div className="rounded-xl border border-cyan-200 bg-white px-3 py-2"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">End</div><div className="text-sm font-black text-slate-900">Week {endWeek}</div></div>
      </div>
    </div>
  );
}
