import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { billions, cn } from '@/lib/format'

interface CapitalFlowData {
  key: string
  label: string
  color: string
  pretax: number
  capex: number
  netFlow: number
}

interface CapitalMapProps {
  data: CapitalFlowData[]
  height?: number
  compact?: boolean
}

export function CapitalMap({ data, height = 280, compact }: CapitalMapProps) {
  const sorted = [...data].sort((a, b) => b.netFlow - a.netFlow)
  const maxAbsFlow = Math.max(...data.map((d) => Math.abs(d.netFlow)))
  const domainPadding = maxAbsFlow * 0.15

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-signal" />
            <span>Generators</span>
          </span>
          <span className="flex items-center gap-2">
            <span>Absorbers</span>
            <span className="h-2.5 w-2.5 rounded-full bg-loss" />
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: compact ? 0 : 4 }}
        >
          <XAxis
            type="number"
            domain={[-maxAbsFlow - domainPadding, maxAbsFlow + domainPadding]}
            tick={{ fill: '#6b7a68', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2a3128' }}
            tickFormatter={(v: number) => `${(v / 1e9).toFixed(0)}B`}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#e8ede6', fontSize: compact ? 11 : 13 }}
            tickLine={false}
            axisLine={false}
            width={compact ? 80 : 100}
          />
          <ReferenceLine x={0} stroke="#6b7a68" strokeDasharray="3 3" />
          <Tooltip
            cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload as CapitalFlowData
              return (
                <div className="rounded-lg border border-rule bg-elevated px-4 py-3 text-sm shadow-xl">
                  <div className="mb-2.5 font-medium text-bright">{d.label}</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-6">
                      <span className="text-muted">Pretax earnings</span>
                      <span className="nums text-bright">${billions(d.pretax)}B</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-muted">Capex</span>
                      <span className="nums text-bright">${billions(d.capex)}B</span>
                    </div>
                    <div className="flex justify-between gap-6 border-t border-rule pt-1.5 font-medium">
                      <span className="text-muted">Net flow</span>
                      <span
                        className={cn(
                          'nums',
                          d.netFlow >= 0 ? 'text-signal' : 'text-loss',
                        )}
                      >
                        {d.netFlow >= 0 ? '+' : ''}${billions(d.netFlow)}B
                      </span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="netFlow" radius={[3, 3, 3, 3]} maxBarSize={compact ? 20 : 26}>
            {sorted.map((entry) => (
              <Cell
                key={entry.key}
                fill={entry.netFlow >= 0 ? '#10b981' : '#ef4444'}
                fillOpacity={0.9}
                className="transition-opacity hover:opacity-100"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {!compact && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sorted.slice(0, 4).map((d, i) => (
            <div
              key={d.key}
              className={cn(
                'hover-lift cursor-default rounded-lg border border-rule bg-elevated p-3',
                'reveal',
              )}
              style={{ animationDelay: `${0.4 + i * 0.1}s` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="truncate text-sm text-muted">{d.label}</span>
              </div>
              <div className="big-num mt-1.5 text-xl">
                <span className={d.netFlow >= 0 ? 'text-signal' : 'text-loss'}>
                  {d.netFlow >= 0 ? '+' : ''}${billions(d.netFlow, 1)}B
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
