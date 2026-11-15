import { useEffect, useRef } from 'react'
import { getObject } from '../../data'
import { PANEL_CLASS } from '../../components/ObjectCard/ObjectCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import { CURATED_MATCH } from './categories'
import { describe, rowInfo } from './describe'
import { useCatalogStore } from './store'

const MODE_LABEL = { student: 'Student', explorer: 'Explorer' } as const

export function CatalogCard() {
  const row = useCatalogStore((s) => s.selected)
  const data = useCatalogStore((s) => s.data)
  const layout = useCatalogStore((s) => s.layout)
  const clear = useCatalogStore((s) => s.clearSelected)
  const hold = useCatalogStore((s) => s.hold)
  const setHold = useCatalogStore((s) => s.setHold)
  const mode = useAppStore((s) => s.mode)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [row])

  if (row === null || !data || !layout) return null
  const r = rowInfo(data, row)
  const cloud = layout.rowCloud[row] >= 0 ? layout.clouds[layout.rowCloud[row]] : null
  const curated = getObject(CURATED_MATCH[r.name])
  const status = r.ops === '+' || r.ops === 'X' || r.ops === 'P' ? 'talking' : r.ops === '-' || r.ops === '' ? 'silent' : 'complete'

  return (
    <aside className={`${PANEL_CLASS} md:bottom-4 md:max-h-none`} aria-label={`${r.name} catalog entry`}>
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 pb-3">
        <div className="min-w-0">
          <h2 ref={heading} tabIndex={-1} className="truncate text-xl font-semibold text-white outline-none">
            {r.name}
          </h2>
          <p className="text-sm text-slate-400">{r.typeLabel} · NORAD {r.id}</p>
        </div>
        <button className="btn-icon shrink-0" onClick={clear} aria-label="Close catalog entry">
          ✕
        </button>
      </header>

      <div className="space-y-4 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-slate-400">{r.opsLabel}</span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Launched</dt>
            <dd className="mt-0.5 font-medium text-white">{r.launch ? formatDate(r.launch) : 'Unknown'}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Owner</dt>
            <dd className="mt-0.5 font-medium text-white">{r.owner || 'Unknown'}</dd>
          </div>
          {r.hasElements && (
            <>
              <div className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-400">Altitude</dt>
                <dd className="mt-0.5 font-medium text-white">
                  {r.peri.toLocaleString('en-US')} – {r.apo.toLocaleString('en-US')} km
                </dd>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-400">Period · tilt</dt>
                <dd className="mt-0.5 font-medium text-white">
                  {Math.round(r.period).toLocaleString('en-US')} min · {r.inc.toFixed(1)}°
                </dd>
              </div>
            </>
          )}
        </dl>

        <section aria-live="polite">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-300">{MODE_LABEL[mode]} mode</h3>
          <p className="text-[15px] leading-relaxed text-slate-200">{describe(r, mode)}</p>
        </section>

        <div className="flex flex-wrap gap-1.5" aria-label="Matching categories">
          {r.categories.map((c) => (
            <span key={c} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
              {c}
            </span>
          ))}
        </div>

        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-400">
          {!cloud
            ? 'Listed only: SATCAT has no coordinates for this entry, so it is not drawn in the scene.'
            : cloud.cfg.schematic
              ? `SATCAT has no orbital data for objects around ${r.centerLabel}, so this position is illustrative.`
              : 'Orbit size, shape and tilt come from SATCAT. Orientation and position along the orbit are illustrative.'}
        </p>

        {cloud && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
            <input type="checkbox" checked={hold} onChange={(e) => setHold(e.target.checked)} className="h-4 w-4 accent-sky-400" />
            <span>
              Hold still to inspect
              <span className="block text-xs text-slate-400">Untick to watch it fly along its orbit.</span>
            </span>
          </label>
        )}
      </div>

      {curated && (
        <footer className="border-t border-white/10 p-4">
          <button className="btn-primary w-full" onClick={() => useAppStore.getState().selectObject(curated.id)}>
            Open the full {curated.name} card
          </button>
        </footer>
      )}
    </aside>
  )
}
