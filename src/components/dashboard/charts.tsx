// Small, dependency-free charts for the Analytics page. One series each, so one
// colour (ink); values are labelled selectively, hover/focus shows the rest, and
// every chart has a table view underneath.

export type Point = { label: string; value: number; detail?: string };

function niceMax(max: number): number {
  if (max <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * step >= max) return m * step;
  }
  return 10 * step;
}

function TableView({ caption, head, rows }: { caption: string; head: [string, string]; rows: Point[] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-steel hover:text-ink">Show as table</summary>
      <table className="mt-2 w-full max-w-md text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="py-1 pr-4 font-semibold">{head[0]}</th>
            <th className="py-1 text-right font-semibold">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line tabular-nums">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-1 pr-4">{r.detail ?? r.label}</td>
              <td className="py-1 text-right">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Columns over time with a hairline grid. Labels the peak and the latest column. */
export function ColumnChart({ title, points, unit }: { title: string; points: Point[]; unit: string }) {
  const max = Math.max(0, ...points.map((p) => p.value));
  const top = niceMax(max);
  const ticks = [0, top / 2, top];
  const peak = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="grid grid-cols-[2rem_1fr] gap-x-2">
        <div className="relative h-44 text-right text-xs tabular-nums text-steel" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative h-44">
          {ticks.map((t) => (
            <span key={t} aria-hidden className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <ol className="absolute inset-0 flex items-end justify-around gap-[2px]">
            {points.map((p, i) => {
              const h = top ? (p.value / top) * 100 : 0;
              const labelled = (i === peak || i === points.length - 1) && p.value > 0;
              return (
                <li key={p.label} className="group relative flex h-full flex-1 items-end justify-center">
                  <button
                    type="button"
                    className="relative flex h-full w-full max-w-[3rem] cursor-default items-end justify-center rounded-sm outline-offset-2 hover:bg-surface focus-visible:bg-surface"
                    aria-label={`${p.detail ?? p.label}: ${p.value} ${unit}`}
                  >
                    <span
                      className="block w-full max-w-6 rounded-t-[4px] bg-ink transition-opacity group-hover:opacity-80"
                      style={{ height: `${h}%`, minHeight: p.value > 0 ? 2 : 0 }}
                    />
                    {labelled && (
                      <span className="absolute text-xs font-semibold tabular-nums" style={{ bottom: `calc(${h}% + 0.25rem)` }}>
                        {p.value}
                      </span>
                    )}
                  </button>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs text-paper shadow-lg group-focus-within:block group-hover:block"
                  >
                    <strong className="text-sm">{p.value}</strong> {unit}
                    <span className="block opacity-80">{p.detail ?? p.label}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <span />
        <ol className="mt-1.5 flex justify-around gap-[2px] text-center text-[0.7rem] text-steel" aria-hidden>
          {points.map((p, i) => (
            <li key={p.label} className="flex-1 truncate">
              {points.length > 8 && i % 2 === 1 ? "" : p.label}
            </li>
          ))}
        </ol>
      </div>
      <TableView caption={title} head={["Period", unit[0].toUpperCase() + unit.slice(1)]} rows={points} />
    </figure>
  );
}

/** Ranked horizontal bars, largest first, value and share at each bar's tip. */
export function RankedBars({ title, rows, unit, empty }: { title: string; rows: Point[]; unit: string; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-steel">{empty}</p>;
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((r) => r.value));
  const total = sorted.reduce((s, r) => s + r.value, 0) || 1;
  const shown = sorted.slice(0, 7);
  const rest = sorted.slice(7).reduce((s, r) => s + r.value, 0);
  const list = rest > 0 ? [...shown, { label: "Other", value: rest }] : shown;
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <ul className="grid gap-2.5">
        {list.map((r) => (
          <li key={r.label} className="group grid grid-cols-[minmax(6rem,38%)_1fr] items-center gap-3 rounded-md text-sm">
            <span className="truncate" title={r.label}>
              {r.label}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="block h-3.5 rounded-r-[4px] bg-ink transition-opacity group-hover:opacity-80"
                style={{ width: `${Math.max(2, (r.value / max) * 82)}%` }}
                aria-hidden
              />
              <span className="shrink-0 tabular-nums">
                <strong>{r.value}</strong> <span className="text-steel">{Math.round((r.value / total) * 100)}%</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <TableView caption={title} head={["", unit[0].toUpperCase() + unit.slice(1)]} rows={list} />
    </figure>
  );
}
