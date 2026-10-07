import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface Series {
  key: string
  label: string
  color: string
}

interface TrendChartProps {
  data: Record<string, string | number | null>[]
  series: Series[]
  xKey: string
  variant?: 'line' | 'area' | 'stacked-area' | 'bar' | 'stacked-bar'
  height?: number
  formatValue?: (v: number) => string
  formatAxis?: (v: number) => string
  yDomain?: [number | 'auto' | 'dataMin', number | 'auto' | 'dataMax']
}

const AXIS = { fill: '#6b7a68', fontSize: 11 }

export function TrendChart({
  data,
  series,
  xKey,
  variant = 'line',
  height = 280,
  formatValue = (v) => v.toLocaleString(),
  formatAxis,
  yDomain,
}: TrendChartProps) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-rule text-muted"
        style={{ height }}
      >
        No data for this view
      </div>
    )
  }

  const stacked = variant.startsWith('stacked')
  const Chart =
    variant === 'bar' || variant === 'stacked-bar'
      ? BarChart
      : variant === 'line'
        ? LineChart
        : AreaChart

  const tooltip = (
    <Tooltip
      cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
      contentStyle={{
        background: '#1c211a',
        border: '1px solid #2a3128',
        borderRadius: 8,
        fontSize: 13,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
      labelStyle={{ color: '#e8ede6', marginBottom: 6, fontWeight: 500 }}
      itemStyle={{ padding: '2px 0' }}
      formatter={(v) => (typeof v === 'number' ? formatValue(v) : '-')}
    />
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="#2a3128" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: '#2a3128' }}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={52}
          domain={yDomain}
          tickFormatter={formatAxis ?? ((v: number) => formatValue(v))}
        />
        {tooltip}
        {series.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
        )}
        {series.map((s) =>
          Chart === BarChart ? (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? 'a' : undefined}
              radius={stacked ? 0 : [3, 3, 0, 0]}
            />
          ) : Chart === LineChart ? (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: '#141916' }}
              connectNulls
            />
          ) : (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={stacked ? 0 : 2}
              fill={s.color}
              fillOpacity={stacked ? 0.85 : 0.15}
              stackId={stacked ? 'a' : undefined}
              connectNulls
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  )
}
