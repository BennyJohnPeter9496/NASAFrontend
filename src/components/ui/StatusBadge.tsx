import { STATUS_META } from '../../data'
import type { Status } from '../../types'

export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${m.chip}`}
    >
      <span className={`h-2 w-2 rounded-full ${m.dot} ${status === 'talking' ? 'animate-pulse' : ''}`} aria-hidden />
      {m.label}
    </span>
  )
}
