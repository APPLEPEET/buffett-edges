import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { SegmentTable } from '@/components/SegmentTable'
import { TrendChart, type Series } from '@/components/TrendChart'
import {
  loadSegments,
  quarterLabel,
  quarters,
  ttm,
  type Dataset,
} from '@/lib/data'
import { billions, pct, usd } from '@/lib/format'

const COLORS: Record<string, string> = {
  bnsf: '#e8813a',
  bhe: '#4a9d7f',
  insurance: '#5b8dd6',
  manufacturing: '#b06fd0',
  service_retail: '#d4a03c',
  mclane: '#6f7a8c',
  pilot: '#c95f6b',
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSegments().then(setData, (e: Error) => setError(e.message))
  }, [])

  if (error) return <Fallback>Could not load the dataset — {error}</Fallback>
  if (!data) return <Fallback>Loading Berkshire filings…</Fallback>
  return <Dashboard data={data} />
}

function Dashboard({ data }: { data: Dataset }) {
  const qs = useMemo(() => quarters(data), [data])
  const latest = qs[qs.length - 1]
  const prior = qs[qs.length - 5] // same quarter, a year earlier

  const series: Series[] = data.segments.map((s) => ({
    key: s.key,
    label: s.label,
    color: COLORS[s.key] ?? '#7d8798',
  }))

  const rows = data.segments
    .map((s) => {
      const now = latest.segments[s.key]
      const then = prior?.segments[s.key]
      if (!now) return null
      return {
        key: s.key,
        label: s.label,
        color: COLORS[s.key] ?? '#7d8798',
        ...now,
        revenueYoY:
          now.revenue && then?.revenue ? now.revenue / then.revenue - 1 : undefined,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  // Charts run on trailing-twelve-month figures. Berkshire's quarters swing hard
  // on seasonality — utilities peak in winter, retail in Q4 — and TTM strips
  // that out so the underlying trend is actually readable.
  const trend = qs.map((p, i) => {
    const row: Record<string, string | number | null> = { label: quarterLabel(p) }
    for (const s of data.segments) {
      row[s.key] = ttm(qs, i, s.key, 'revenue')
    }
    return row
  })

  const marginTrend = qs.map((p, i) => {
    const row: Record<string, string | number | null> = { label: quarterLabel(p) }
    for (const s of data.segments) {
      const rev = ttm(qs, i, s.key, 'revenue')
      const pre = ttm(qs, i, s.key, 'pretax')
      row[s.key] = rev && pre !== null ? pre / rev : null
    }
    return row
  })

  const capexRows = qs.filter((p) =>
    Object.values(p.segments).some((s) => typeof s.capex === 'number'),
  )
  const capexTrend = capexRows.map((p) => {
    const row: Record<string, string | number | null> = { label: quarterLabel(p) }
    for (const s of data.segments) row[s.key] = p.segments[s.key]?.capex ?? null
    return row
  })

  const totalRev = rows.reduce((a, r) => a + (r.revenue ?? 0), 0)
  const totalPretax = rows.reduce((a, r) => a + (r.pretax ?? 0), 0)
  const best = [...rows].sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0))[0]
  const worst = [...rows].sort((a, b) => (a.margin ?? 1) - (b.margin ?? 1))[0]

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <header className="mb-9">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Buffett's Edge
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-bright sm:text-[38px]">
          The other three quarters of Berkshire
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Everyone tracks the $260B stock portfolio, because it arrives in one
          tidy 13F download. The operating businesses — the railroad, the
          utilities, the insurers, the manufacturers — are most of the company
          and almost nobody charts them. This does, straight from the filings.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={`Revenue · ${quarterLabel(latest)}`} value={usd(totalRev)} />
        <Stat label="Pre-tax earnings" value={usd(totalPretax)} />
        <Stat
          label={`Widest margin · ${best?.label ?? ''}`}
          value={pct(best?.margin)}
          accent={best?.color}
        />
        <Stat
          label={`Thinnest · ${worst?.label ?? ''}`}
          value={pct(worst?.margin)}
          accent={worst?.color}
        />
      </div>

      <div className="space-y-6">
        <Panel
          title={`Segment results — ${quarterLabel(latest)}`}
          description="Sort by any column. Every figure is tagged XBRL from the filing itself, not a vendor's re-keying."
        >
          <SegmentTable rows={rows} period={latest} prior={prior} />
        </Panel>

        <Panel
          title="Revenue mix"
          description="Trailing twelve months, stacked. Pilot Travel Centers appears in 2023, when Berkshire took majority control and began consolidating it."
        >
          <TrendChart
            data={trend}
            series={series}
            xKey="label"
            variant="stacked-area"
            height={320}
            formatValue={(v) => `$${billions(v, 1)}B`}
            formatAxis={(v) => `${(v / 1e9).toFixed(0)}B`}
          />
        </Panel>

        <Panel
          title="Margin, by business"
          description={
            <>
              Pre-tax margin on trailing twelve months. The spread is the whole
              point: a railroad and a grocery distributor are not the same
              business, and consolidated results hide that completely.
            </>
          }
        >
          <TrendChart
            data={marginTrend}
            series={series}
            xKey="label"
            variant="line"
            height={320}
            formatValue={(v) => pct(v)}
            formatAxis={(v) => `${(v * 100).toFixed(0)}%`}
            yDomain={[0, 'auto']}
          />
        </Panel>

        <Panel
          title="Where the capital goes"
          description="Quarterly additions to long-lived assets. Berkshire Hathaway Energy absorbs more capex than every other segment combined — the utilities are the capital sink, and the railroad is next."
        >
          <TrendChart
            data={capexTrend}
            series={series}
            xKey="label"
            variant="stacked-bar"
            height={300}
            formatValue={(v) => `$${billions(v, 2)}B`}
            formatAxis={(v) => `${(v / 1e9).toFixed(1)}B`}
          />
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            Capex, costs and D&amp;A are only disclosed per segment from 2024,
            when the expanded segment-reporting standard (ASU 2023-07) took
            effect. Earlier quarters carry revenue and earnings only.
          </p>
        </Panel>

        <Panel title="How this is built">
          <div className="grid gap-5 text-[13px] leading-relaxed text-muted sm:grid-cols-2">
            <div>
              <h3 className="mb-1.5 font-medium text-bright">Source</h3>
              <p>
                SEC EDGAR, parsed from the XBRL instance document of every 10-Q
                and 10-K back to {qs[0].end.slice(0, 4)}. No vendor data and no
                API key — the <code className="text-bright">companyfacts</code>{' '}
                endpoint strips XBRL dimensions, so the per-segment numbers only
                exist inside the filings themselves.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-bright">Two caveats</h3>
              <p>
                Berkshire tags its segment note twice — once as a revenue
                disaggregation that folds insurance in with corporate, once as a
                true operating-segment P&amp;L. Only the second is used here;
                mixing them double-counts insurance. And earnings switched from
                operating income to pre-tax income in 2024, so the basis is
                labelled per period rather than spliced.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <footer className="mt-10 border-t border-line pt-5 text-[12px] leading-relaxed text-muted">
        <p>
          Data generated {data.generated.slice(0, 10)} from{' '}
          {data.entity} (CIK {data.cik}) filings. {qs.length} quarters,{' '}
          {qs[0].end.slice(0, 7)} to {latest.end.slice(0, 7)}.
        </p>
        <p className="mt-2">
          For information only. Not investment advice, not affiliated with
          Berkshire Hathaway Inc.
        </p>
      </footer>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-line bg-panel/60 px-4 py-3">
      <p className="truncate text-[11px] uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className="nums mt-1.5 text-[22px] font-semibold text-bright"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

function Fallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-[14px] text-muted">
      {children}
    </div>
  )
}
