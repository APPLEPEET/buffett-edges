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
}

export function CapitalMap({ data, height = 280 }: CapitalMapProps) {
  const sorted = [...data].sort((a, b) => b.netFlow - a.netFlow)

  const maxAbsFlow = Math.max(...data.map((d) => Math.abs(d.netFlow)))
  const domainPadding = maxAbsFlow * 0.1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Cash generators
        </span>
        <span className="flex items-center gap-1.5">
          Capital sinks
          <span className="h-2 w-2 rounded-full bg-amber-500" />
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
        >
          <XAxis
            type="number"
            domain={[-maxAbsFlow - domainPadding, maxAbsFlow + domainPadding]}
            tick={{ stroke: '#7d8798', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#232935' }}
            tickFormatter={(v: number) => `${(v / 1e9).toFixed(0)}B`}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#e8ecf3', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <ReferenceLine x={0} stroke="#4b5563" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              background: '#141821',
              border: '1px solid #232935',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#e8ecf3', marginBottom: 4, fontWeight: 600 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload as CapitalFlowData
              return (
                <div className="rounded-md border border-line bg-[#141821] px-3 py-2 text-[12px]">
                  <div className="mb-2 font-semibold text-bright">{d.label}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted">Pretax earnings</span>
                      <span className="nums text-bright">${billions(d.pretax)}B</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted">Capex</span>
                      <span className="nums text-bright">−${billions(d.capex)}B</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-line pt-1 font-medium">
                      <span className="text-muted">Net capital flow</span>
                      <span className={cn('nums', d.netFlow >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
                        {d.netFlow >= 0 ? '+' : ''}${billions(d.netFlow)}B
                      </span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="netFlow" radius={[4, 4, 4, 4]} maxBarSize={28}>
            {sorted.map((entry) => (
              <Cell
                key={entry.key}
                fill={entry.netFlow >= 0 ? '#10b981' : '#f59e0b'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
        {sorted.slice(0, 4).map((d) => (
          <div key={d.key} className="rounded border border-line/60 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
              <span className="truncate text-muted">{d.label}</span>
            </div>
            <div className="nums mt-1 text-[15px] font-medium">
              <span className={d.netFlow >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {d.netFlow >= 0 ? '+' : ''}${billions(d.netFlow, 1)}B
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
