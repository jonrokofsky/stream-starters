"use client";

type WeekSliderProps = {
  id: string;
  weeks: number[];
  value: number;
  onChange: (week: number) => void;
  label?: string;
};

export default function WeekSlider({ id, weeks, value, onChange, label = "Profile week" }: WeekSliderProps) {
  if (!weeks.length) return null;
  const selectedIndex = Math.max(0, weeks.indexOf(value));

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
          {label}
        </label>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
          Through Week {value}
        </div>
      </div>
      {weeks.length > 1 ? (
        <>
          <input
            id={id}
            type="range"
            min="0"
            max={String(weeks.length - 1)}
            step="1"
            value={selectedIndex}
            onChange={(event) => onChange(weeks[Number(event.target.value)])}
            className="mt-3 w-full cursor-pointer accent-sky-600"
            aria-valuetext={`Through Week ${value}`}
          />
          <div className="mt-1 flex justify-between text-[10px] font-black text-slate-500">
            {weeks.map((week) => <span key={week}>W{week}</span>)}
          </div>
        </>
      ) : (
        <div className="mt-2 text-xs font-bold text-slate-500">More weeks will appear automatically after each refresh.</div>
      )}
    </div>
  );
}
