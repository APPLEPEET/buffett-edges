import { useState } from 'react'
import type { Period } from '@/lib/data'
import { billions, pct, signedPct, cn } from '@/lib/format'

interface Row {
  key: string
  label: string
  color: string
  revenue?: number
  pretax?: number
  margin?: number
  capex?: number
  dna?: number
  revenueYoY?: number
  marginDelta?: number
}

type SortKey = 'revenue' | 'pretax' | 'margin' | 'capex' | 'revenueYoY'

interface SegmentTableProps {
  rows: Row[]
  period: Period
  prior?: Period
}

const COLUMNS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'revenue', label: 'Revenue', hint: '$B for the quarter' },
  { key: 'pretax', label: 'Earnings', hint: 'Pre-tax, $B' },
  { key: 'margin', label: 'Margin', hint: 'Pre-tax earnings / revenue' },
  { key: 'capex', label: 'Capex', hint: 'Additions to long-lived assets, $B' },
  { key: 'revenueYoY', label: 'Rev YoY', hint: 'vs the same quarter last year' },
]

export function SegmentTable({ rows, period, prior }: SegmentTableProps) {
  const [sort, setSort] = useState<SortKey>('pretax')

  const sorted = [...rows].sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity))
  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + (r.revenue ?? 0),
      pretax: acc.pretax + (r.pretax ?? 0),
      capex: acc.capex + (r.capex ?? 0),
    }),
    { revenue: 0, pretax: 0, capex: 0 },
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="py-2 pr-3 font-medium">Segment</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="py-2 pl-3 text-right font-medium">
                <button
                  type="button"
                  title={c.hint}
                  onClick={() => setSort(c.key)}
                  className={cn(
                    'cursor-pointer transition-colors hover:text-bright',
                    sort === c.key && 'text-bright',
                  )}
                >
                  {c.label}
                  <span
                    className={cn(
                      'ml-1 inline-block',
                      sort === c.key ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    ↓
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="nums">
          {sorted.map((r) => (
            <tr
              key={r.key}
              className="border-b border-line/60 transition-colors hover:bg-white/[0.02]"
            >
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2.5 font-sans">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="text-bright">{r.label}</span>
                </span>
              </td>
              <td className="py-2.5 pl-3 text-right">{billions(r.revenue)}</td>
              <td className="py-2.5 pl-3 text-right">{billions(r.pretax)}</td>
              <td className="py-2.5 pl-3 text-right">
                <span className={cn((r.margin ?? 0) >= 0.2 && 'text-emerald-400')}>
                  {pct(r.margin)}
                </span>
              </td>
              <td className="py-2.5 pl-3 text-right text-muted">{billions(r.capex)}</td>
              <td className="py-2.5 pl-3 text-right">
                <Delta v={r.revenueYoY} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="nums border-t border-line text-bright">
            <td className="py-2.5 pr-3 font-sans font-semibold">
              Operating segments
            </td>
            <td className="py-2.5 pl-3 text-right font-semibold">
              {billions(totals.revenue)}
            </td>
            <td className="py-2.5 pl-3 text-right font-semibold">
              {billions(totals.pretax)}
            </td>
            <td className="py-2.5 pl-3 text-right font-semibold">
              {pct(totals.revenue ? totals.pretax / totals.revenue : undefined)}
            </td>
            <td className="py-2.5 pl-3 text-right text-muted">
              {billions(totals.capex)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {period.derived ? (
          <>
            Fourth quarter is not filed on its own — Berkshire reports the full
            year in the 10-K. These figures are the {period.end.slice(0, 4)} annual
            totals less the nine-month year-to-date, and they reconcile exactly.
          </>
        ) : (
          <>
            From the {period.source?.form} filed{' '}
            {period.source?.filed}
            {prior && ', with the year-ago quarter for comparison'}.
          </>
        )}{' '}
        Amounts in billions of dollars.
      </p>
    </div>
  )
}

function Delta({ v }: { v?: number }) {
  if (typeof v !== 'number') return <span className="text-muted">—</span>
  return (
    <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
      {signedPct(v)}
    </span>
  )
}
