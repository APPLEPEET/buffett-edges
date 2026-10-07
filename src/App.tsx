import { useEffect, useMemo, useState } from 'react'
import { CapitalMap } from '@/components/CapitalMap'
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
  bnsf: '#ea580c',
  bhe: '#16a34a',
  insurance: '#3b82f6',
  manufacturing: '#a855f7',
  service_retail: '#eab308',
  mclane: '#78716c',
  pilot: '#f43f5e',
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSegments().then(setData, (e: Error) => setError(e.message))
  }, [])

  if (error) return <Fallback>Could not load the dataset: {error}</Fallback>
  if (!data) return <Fallback>Loading Berkshire filings</Fallback>
  return <Dashboard data={data} />
}

function Dashboard({ data }: { data: Dataset }) {
  const qs = useMemo(() => quarters(data), [data])
  const latest = qs[qs.length - 1]
  const prior = qs[qs.length - 5]

  const series: Series[] = data.segments.map((s) => ({
    key: s.key,
    label: s.label,
    color: COLORS[s.key] ?? '#78716c',
  }))

  const rows = data.segments
    .map((s) => {
      const now = latest.segments[s.key]
      const then = prior?.segments[s.key]
      if (!now) return null
      return {
        key: s.key,
        label: s.label,
        color: COLORS[s.key] ?? '#78716c',
        ...now,
        revenueYoY:
          now.revenue && then?.revenue ? now.revenue / then.revenue - 1 : undefined,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

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

  const hasCapexData = capexRows.length >= 4
  const capitalMapData = useMemo(() => {
    if (!hasCapexData) return []
    const lastCapexIdx = qs.findIndex((p) => p === capexRows[capexRows.length - 1])
    return data.segments
      .map((s) => {
        const pretax = ttm(qs, lastCapexIdx, s.key, 'pretax')
        const capex = ttm(qs, lastCapexIdx, s.key, 'capex')
        if (pretax === null || capex === null) return null
        return {
          key: s.key,
          label: s.label,
          color: COLORS[s.key] ?? '#78716c',
          pretax,
          capex,
          netFlow: pretax - capex,
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
  }, [data.segments, qs, capexRows, hasCapexData])

  const totalRev = rows.reduce((a, r) => a + (r.revenue ?? 0), 0)
  const totalPretax = rows.reduce((a, r) => a + (r.pretax ?? 0), 0)
  const totalCapex = rows.reduce((a, r) => a + (r.capex ?? 0), 0)

  return (
    <div className="min-h-screen">
      {/* Hero: Poster headline + Capital Map as signature visual */}
      <header className="relative overflow-hidden border-b border-rule px-4 pb-12 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          {/* Eyebrow with live data */}
          <div className="reveal mb-6 flex items-center gap-3 text-sm text-muted">
            <span className="inline-flex h-2 w-2 rounded-full bg-signal animate-pulse" />
            <span>{data.entity}</span>
            <span className="text-rule">|</span>
            <span>{qs.length} quarters of XBRL data</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr,400px] lg:gap-12 xl:grid-cols-[1fr,480px]">
            {/* Left: Poster headline */}
            <div className="reveal reveal-delay-1">
              <h1 className="display text-[clamp(2.5rem,8vw,5.5rem)] text-bright">
                The other{' '}
                <span className="text-signal">three quarters</span>{' '}
                of Berkshire
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-secondary">
                Everyone tracks the $260B stock portfolio. The operating 
                businesses are most of the company and almost nobody charts them.
              </p>

              {/* Big KPI numbers */}
              <div className="mt-10 flex flex-wrap gap-8">
                <KPI 
                  label={`Revenue ${quarterLabel(latest)}`} 
                  value={usd(totalRev)} 
                />
                <KPI 
                  label="Pre-tax earnings" 
                  value={usd(totalPretax)} 
                  accent 
                />
                <KPI 
                  label="Capex deployed" 
                  value={usd(totalCapex)} 
                />
              </div>
            </div>

            {/* Right: Capital Map as signature hero visual */}
            {hasCapexData && capitalMapData.length > 0 && (
              <div className="reveal reveal-delay-2 rounded-lg border border-rule bg-surface p-4 lg:p-5">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-bright">Capital allocation</span>
                  <span className="text-muted">TTM net flow</span>
                </div>
                <CapitalMap data={capitalMapData} height={260} compact />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content with asymmetric layout */}
      <main className="px-4 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-16">
          
          {/* Segment Table: Full width, dense data */}
          <section className="reveal">
            <SectionHead 
              title={`Segment results, ${quarterLabel(latest)}`}
              subtitle="Sortable. Every figure tagged XBRL from the SEC filing."
            />
            <div className="mt-5">
              <SegmentTable rows={rows} period={latest} prior={prior} />
            </div>
          </section>

          {/* Capital Map expanded + explanation - asymmetric 2/3 + 1/3 */}
          {hasCapexData && capitalMapData.length > 0 && (
            <section className="reveal grid gap-8 lg:grid-cols-[2fr,1fr]">
              <div>
                <SectionHead 
                  title="Generators vs absorbers"
                  subtitle="Where does the capital flow? TTM pretax earnings minus capex."
                />
                <Panel className="mt-5">
                  <CapitalMap data={capitalMapData} height={320} />
                </Panel>
              </div>
              <div className="space-y-6 text-[15px] leading-relaxed text-secondary lg:pt-12">
                <div>
                  <h3 className="mb-2 font-medium text-signal">The engines</h3>
                  <p>
                    Insurance generates billions with almost no physical plant.
                    Manufacturing earns well on modest reinvestment. These
                    businesses fund everything else.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-loss">The sinks</h3>
                  <p>
                    Utilities and the railroad absorb capital. BHE pours more into
                    power plants than it earns pre-tax. BNSF keeps the locomotives
                    running with continuous reinvestment.
                  </p>
                </div>
                <p className="text-sm text-muted">
                  Capex disclosed per segment from 2024 (ASU 2023-07).
                </p>
              </div>
            </section>
          )}

          {/* Revenue mix: Dominant chart */}
          <section className="reveal">
            <SectionHead 
              title="Revenue mix over time"
              subtitle="Trailing twelve months, stacked. Pilot Travel Centers consolidated 2023."
            />
            <Panel className="mt-5">
              <TrendChart
                data={trend}
                series={series}
                xKey="label"
                variant="stacked-area"
                height={360}
                formatValue={(v) => `$${billions(v, 1)}B`}
                formatAxis={(v) => `${(v / 1e9).toFixed(0)}B`}
              />
            </Panel>
          </section>

          {/* Two charts side by side - asymmetric */}
          <section className="reveal grid gap-8 lg:grid-cols-[1.2fr,1fr]">
            <div>
              <SectionHead 
                title="Margin by segment"
                subtitle="Pre-tax margin, TTM. The spread shows these aren't the same business."
              />
              <Panel className="mt-5">
                <TrendChart
                  data={marginTrend}
                  series={series}
                  xKey="label"
                  variant="line"
                  height={300}
                  formatValue={(v) => pct(v)}
                  formatAxis={(v) => `${(v * 100).toFixed(0)}%`}
                  yDomain={[0, 'auto']}
                />
              </Panel>
            </div>
            <div>
              <SectionHead 
                title="Quarterly capex"
                subtitle="Additions to long-lived assets. BHE dominates."
              />
              <Panel className="mt-5">
                <TrendChart
                  data={capexTrend}
                  series={series}
                  xKey="label"
                  variant="stacked-bar"
                  height={300}
                  formatValue={(v) => `$${billions(v, 2)}B`}
                  formatAxis={(v) => `${(v / 1e9).toFixed(1)}B`}
                />
              </Panel>
              <p className="mt-3 text-sm text-muted">
                Capex disclosed from 2024 under ASU 2023-07.
              </p>
            </div>
          </section>

          {/* Source info - compact */}
          <section className="reveal border-t border-rule pt-10">
            <div className="grid gap-8 text-[14px] leading-relaxed text-secondary sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-bright">Source</h3>
                <p>
                  SEC EDGAR XBRL instance documents from every 10-Q and 10-K since{' '}
                  {qs[0].end.slice(0, 4)}. No vendor data, no API key. The{' '}
                  <code className="rounded bg-elevated px-1.5 py-0.5 text-signal">companyfacts</code>{' '}
                  endpoint strips XBRL dimensions, so per-segment figures require
                  parsing the filings directly.
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-bright">Caveats</h3>
                <p>
                  Berkshire tags its segment note twice: revenue disaggregation
                  (folds insurance with corporate) and operating-segment P&L. Only
                  the second is used here. Earnings switched from operating income
                  to pre-tax in 2024; basis is labeled per period.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-rule px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Data generated {data.generated.slice(0, 10)} from {data.entity} (CIK{' '}
            {data.cik}). {qs.length} quarters, {qs[0].end.slice(0, 7)} to{' '}
            {latest.end.slice(0, 7)}.
          </p>
          <p>
            For information only. Not investment advice.
          </p>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-medium text-bright sm:text-2xl">{title}</h2>
      {subtitle && (
        <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
      )}
    </div>
  )
}

function KPI({ 
  label, 
  value, 
  accent 
}: { 
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className={`big-num mt-1 text-3xl sm:text-4xl ${accent ? 'text-signal' : 'text-bright'}`}>
        {value}
      </p>
    </div>
  )
}

function Fallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-secondary">
      {children}
    </div>
  )
}
