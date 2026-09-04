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

/**
 * Generalised from the MacroDashboard `IndicatorChart`: same parameterised
 * title / formatter / axis-bound shape, but it renders data passed in rather
 * than fetching its own endpoint. The whole dataset is one static JSON file
 * loaded once at the top of the app, so per-chart fetching would only refetch
 * what we already have.
 */

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
  referenceZero?: boolean
}

const AXIS = { stroke: '#7d8798', fontSize: 11 }

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
        className="flex items-center justify-center rounded border border-dashed border-line text-[13px] text-muted"
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
      contentStyle={{
        background: '#141821',
        border: '1px solid #232935',
        borderRadius: 6,
        fontSize: 12,
      }}
      labelStyle={{ color: '#e8ecf3', marginBottom: 4, fontWeight: 600 }}
      itemStyle={{ padding: '1px 0' }}
      formatter={(v) => (typeof v === 'number' ? formatValue(v) : '—')}
    />
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="#232935" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: '#232935' }}
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
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
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
              radius={stacked ? 0 : [2, 2, 0, 0]}
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
              activeDot={{ r: 3.5 }}
              connectNulls
            />
          ) : (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={stacked ? 1 : 2}
              fill={s.color}
              fillOpacity={stacked ? 0.85 : 0.14}
              stackId={stacked ? 'a' : undefined}
              connectNulls
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  )
}
