export interface SegmentFacts {
  revenue?: number
  costs?: number
  pretax?: number
  tax?: number
  dna?: number
  capex?: number
  interest?: number
  goodwill?: number
  assets_ex_goodwill?: number
  margin?: number
  pretax_basis?: 'pretax_income' | 'operating_income'
}

export interface Period {
  start: string
  end: string
  kind: 'Q' | 'FY' | 'YTD' | 'instant'
  basis: 'pretax_income' | 'operating_income' | 'mixed' | null
  derived?: string
  segments: Record<string, SegmentFacts>
  source: { form: string; accn: string; filed: string } | null
}

export interface Dataset {
  entity: string
  cik: number
  generated: string
  segments: { key: string; label: string }[]
  periods: Period[]
}

/** Quarterly periods only, oldest first. */
export function quarters(data: Dataset): Period[] {
  return data.periods.filter((p) => p.kind === 'Q')
}

export function quarterLabel(p: Period): string {
  const q = Math.floor(Number(p.end.slice(5, 7)) / 3.1) + 1
  return `Q${q} ${p.end.slice(0, 4)}`
}

/** Trailing twelve months for one segment and field, ending at index `i`. */
export function ttm(
  rows: Period[],
  i: number,
  segment: string,
  field: keyof SegmentFacts,
): number | null {
  if (i < 3) return null
  let total = 0
  for (let k = i - 3; k <= i; k++) {
    const v = rows[k].segments[segment]?.[field]
    if (typeof v !== 'number') return null
    total += v
  }
  return total
}

export function loadSegments(): Promise<Dataset> {
  return fetch('/data/segments.json').then((r) => {
    if (!r.ok) throw new Error(`segments.json: HTTP ${r.status}`)
    return r.json()
  })
}
