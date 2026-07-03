interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  accent?: string;
  hint?: string;
}

export function Slider({ label, value, min, max, step, onChange, formatValue, accent = '#fbbf24', hint }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
        <span className="rounded-md bg-[var(--surface-3)] px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--slider-pct' as string]: `${pct}%`, ['--slider-fill' as string]: accent }}
        aria-label={label}
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
