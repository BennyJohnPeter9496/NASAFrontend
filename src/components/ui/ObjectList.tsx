import { useEffect, useRef } from 'react'
import { objects, STATUS_META } from '../../data'
import { useAppStore } from '../../store/useAppStore'

/** Keyboard-friendly alternative to clicking markers in the 3D scene. */
export function ObjectList() {
  const open = useAppStore((s) => s.listOpen)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.selectObject)
  const first = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) first.current?.focus()
  }, [open])

  if (!open) return null
  return (
    <nav
      id="missions-menu"
      aria-label="Missions"
      className="glass pointer-events-auto absolute left-3 right-3 top-[7.25rem] z-30 max-h-[60dvh] overflow-y-auto rounded-2xl p-2 animate-fadeIn md:left-4 md:right-auto md:top-[4.5rem] md:w-72"
    >
      <ul>
        {objects.map((o, i) => (
          <li key={o.id}>
            <button
              ref={i === 0 ? first : undefined}
              onClick={() => select(o.id)}
              aria-current={selectedId === o.id ? 'true' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 ${
                selectedId === o.id ? 'bg-white/10' : ''
              }`}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: o.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-white">{o.name}</span>
                <span className="block truncate text-xs text-slate-400">{o.type}</span>
              </span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[o.status].dot}`}
                title={STATUS_META[o.status].label}
                aria-label={STATUS_META[o.status].label}
              />
              {o.isSpotlight && (
                <span className="text-xs text-amber-300" title="Has a story" aria-label="Has a story">
                  ★
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
