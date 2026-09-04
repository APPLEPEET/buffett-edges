export function billions(v: number | undefined, digits = 2): string {
  if (typeof v !== 'number') return '—'
  return `${(v / 1e9).toFixed(digits)}`
}

export function usd(v: number | undefined, digits = 1): string {
  if (typeof v !== 'number') return '—'
  const abs = Math.abs(v)
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(digits)}B`
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

export function pct(v: number | undefined, digits = 1): string {
  if (typeof v !== 'number') return '—'
  return `${(v * 100).toFixed(digits)}%`
}

export function signedPct(v: number | undefined, digits = 1): string {
  if (typeof v !== 'number') return '—'
  const s = (v * 100).toFixed(digits)
  return `${v >= 0 ? '+' : ''}${s}%`
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
