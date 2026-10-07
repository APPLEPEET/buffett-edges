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
  { key: 'revenue', label: 'Revenue', hint: 'Quarterly revenue, $B' },
  { key: 'pretax', label: 'Earnings', hint: 'Pre-tax earnings, $B' },
  { key: 'margin', label: 'Margin', hint: 'Pre-tax earnings / revenue' },
  { key: 'capex', label: 'Capex', hint: 'Additions to long-lived assets, $B' },
  { key: 'revenueYoY', label: 'YoY', hint: 'Revenue vs same quarter last year' },
]

export function SegmentTable({ rows, period, prior }: SegmentTableProps) {
  const [sort, setSort] = useState<SortKey>('pretax')

  const sorted = [...rows].sort(
    (a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity),
  )
  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + (r.revenue ?? 0),
      pretax: acc.pretax + (r.pretax ?? 0),
      capex: acc.capex + (r.capex ?? 0),
    }),
    { revenue: 0, pretax: 0, capex: 0 },
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
      <table className="w-full min-w-[640px] text-[14px]">
        <thead>
          <tr className="border-b border-rule text-left text-[12px] text-muted">
            <th className="px-4 py-3 font-medium">Segment</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-4 py-3 text-right font-medium">
                <button
                  type="button"
                  title={c.hint}
                  onClick={() => setSort(c.key)}
                  className={cn(
                    'cursor-pointer transition-colors hover:text-bright',
                    sort === c.key && 'text-signal',
                  )}
                >
                  {c.label}
                  {sort === c.key && <span className="ml-1">↓</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="nums">
          {sorted.map((r, i) => (
            <tr
              key={r.key}
              className={cn(
                'border-b border-rule/50 transition-colors hover:bg-elevated/50',
                'reveal',
              )}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <td className="px-4 py-3">
                <span className="flex items-center gap-2.5 font-sans">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="font-medium text-bright">{r.label}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-right text-secondary">
                {billions(r.revenue)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-bright">{billions(r.pretax)}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className={cn((r.margin ?? 0) >= 0.2 && 'text-signal')}>
                  {pct(r.margin)}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-muted">
                {billions(r.capex)}
              </td>
              <td className="px-4 py-3 text-right">
                <Delta v={r.revenueYoY} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="nums border-t border-rule bg-elevated/30 font-medium text-bright">
            <td className="px-4 py-3 font-sans">Total</td>
            <td className="px-4 py-3 text-right">{billions(totals.revenue)}</td>
            <td className="px-4 py-3 text-right">{billions(totals.pretax)}</td>
            <td className="px-4 py-3 text-right">
              {pct(totals.revenue ? totals.pretax / totals.revenue : undefined)}
            </td>
            <td className="px-4 py-3 text-right text-muted">
              {billions(totals.capex)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <p className="border-t border-rule/50 px-4 py-3 text-[13px] text-muted">
        {period.derived ? (
          <>
            Q4 derived from {period.end.slice(0, 4)} 10-K annual totals less
            nine-month YTD.
          </>
        ) : (
          <>
            From {period.source?.form} filed {period.source?.filed}
            {prior && ', with year-ago quarter for comparison'}.
          </>
        )}{' '}
        Amounts in billions.
      </p>
    </div>
  )
}

function Delta({ v }: { v?: number }) {
  if (typeof v !== 'number') return <span className="text-muted/50">-</span>
  return (
    <span className={v >= 0 ? 'text-signal' : 'text-loss'}>
      {signedPct(v)}
    </span>
  )
}
