import { useEffect, useRef } from 'react'
import { getObject } from '../../data'
import { PANEL_CLASS } from '../../components/ObjectCard/ObjectCard'
import { formatDate } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import { BODY_INFO, BODY_KEYS, SITES, formatCoord, getSite } from './sites'
import { useCloseUpStore } from './store'

const MODE_LABEL = { student: 'Student', explorer: 'Explorer' } as const

export function CloseUpPanel() {
  const body = useCloseUpStore((s) => s.body)
  const siteId = useCloseUpStore((s) => s.siteId)
  const open = useCloseUpStore((s) => s.open)
  const select = useCloseUpStore((s) => s.selectSite)
  const close = useCloseUpStore((s) => s.close)
  const mode = useAppStore((s) => s.mode)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [body])

  if (!body) return null
  const site = getSite(body, siteId)
  const linked = getObject(site?.objectId)

  return (
    <aside className={`${PANEL_CLASS} md:bottom-4 md:max-h-none`} aria-label={`${BODY_INFO[body].label} close-up`}>
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 pb-3">
        <div>
          <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold text-white outline-none">
            {BODY_INFO[body].label} close-up
          </h2>
          <p className="text-sm text-slate-400">{SITES[body].sites.length} landing sites · pick a pin or a site</p>
        </div>
        <button className="btn-icon shrink-0" onClick={close} aria-label="Close close-up and return to overview">
          ✕
        </button>
      </header>

      <div className="flex gap-2 px-4 pt-3" role="group" aria-label="Choose a world">
        {BODY_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => open(k)}
            aria-pressed={body === k}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              body === k ? 'bg-sky-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            {BODY_INFO[k].label}
          </button>
        ))}
      </div>

      <div className="min-h-0 space-y-3 overflow-y-auto p-4">
        <ul className="space-y-0.5" aria-label="Landing sites">
          {SITES[body].sites.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => select(s.id === siteId ? null : s.id)}
                aria-current={s.id === siteId ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10 ${
                  s.id === siteId ? 'bg-white/10 ring-1 ring-amber-300/50' : ''
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">{s.name}</span>
                  <span className="block truncate text-xs text-slate-400">{s.place}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{s.date.slice(0, 4)}</span>
              </button>
            </li>
          ))}
        </ul>

        {site ? (
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-live="polite">
            <div>
              <h3 className="font-semibold text-white">{site.name}</h3>
              <p className="text-xs text-slate-400">
                {site.kind} · {site.agency} · {formatDate(site.date)}
              </p>
              <p className="text-xs text-slate-500">≈ {formatCoord(site.lat, site.lon)}</p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-300">{MODE_LABEL[mode]} mode</h4>
              <p className="text-[15px] leading-relaxed text-slate-200">{site.text[mode]}</p>
            </div>
            {linked && (
              <button className="btn-primary w-full" onClick={() => useAppStore.getState().selectObject(linked.id)}>
                Open the {linked.name} card
              </button>
            )}
          </section>
        ) : (
          <p className="text-xs leading-relaxed text-slate-500">
            Pins sit at each site&apos;s approximate latitude and longitude. The globe is frozen while you explore it.
          </p>
        )}
      </div>
    </aside>
  )
}
