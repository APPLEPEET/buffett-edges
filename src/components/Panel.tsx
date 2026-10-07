import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

interface PanelProps {
  className?: string
  children: ReactNode
}

export function Panel({ className, children }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-rule bg-surface p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}
