import { useDeferredValue, useMemo } from 'react'
import { END_YEAR } from '../../lib/simTime'
import { formatYear } from '../timeline/model'
import { useTimelineStore } from '../timeline/store'
import { CATEGORIES, TYPE_COLOR, maskOf } from './categories'
import { rowInfo } from './describe'
import { flyToEarthShell, focusRow } from './actions'
import { useCatalogStore } from './store'

const QUICK = ['STARLINK', 'IRIDIUM', 'FALCON 9', 'COSMOS', 'NOAA']
const swatch = (type: number, ops: string) =>
  type === 1 ? TYPE_COLOR.rocket : type === 2 ? TYPE_COLOR.debris : type === 3 ? TYPE_COLOR.unknown : ops === '-' ? TYPE_COLOR.dead : TYPE_COLOR.alive

export function CatalogPanel() {
  const open = useCatalogStore((s) => s.panelOpen)
  const status = useCatalogStore((s) => s.status)
  const error = useCatalogStore((s) => s.error)
  const data = useCatalogStore((s) => s.data)
  const layout = useCatalogStore((s) => s.layout)
  const enabled = useCatalogStore((s) => s.enabled)
  const query = useCatalogStore((s) => s.query)
  const selected = useCatalogStore((s) => s.selected)
  const toggle = useCatalogStore((s) => s.toggle)
  const setAll = useCatalogStore((s) => s.setAll)
  const reset = useCatalogStore((s) => s.reset)
  const setQuery = useCatalogStore((s) => s.setQuery)
  const setOpen = useCatalogStore((s) => s.setPanelOpen)
  const deferred = useDeferredValue(query)
  const timeMode = useTimelineStore((s) => s.mode)
  const timelineYear = useTimelineStore((s) => s.year)
  // Rounded so the count is not recomputed on every frame of playback.
  const year = timeMode === 'live' ? END_YEAR : Math.round(timelineYear * 10) / 10

  const inOrbit = useMemo(() => {
    if (!layout) return null
    const mask = maskOf(enabled)
    let all = 0
    let shown = 0
    for (const c of layout.clouds) {
      for (let s = 0; s < c.rows.length; s++) {
        const alive = year >= c.launchY[s] && year < c.decayY[s]
        if (!alive) continue
        all++
        if ((c.mask[s] | 16) & mask) shown++
      }
    }
    return { all, shown }
  }, [layout, enabled, year])

  const famous = useMemo(
    () => (layout ? layout.featured.map((f) => ({ f, here: year >= layout.clouds[f.cloud].launchY[f.slot] && year < layout.clouds[f.cloud].decayY[f.slot] })) : []),
    [layout, year],
  )

  const results = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    if (!data || q.length < 2) return []
    const mask = maskOf(enabled)
    const out: number[] = []
    const { name, mask: masks } = data.cols
    for (let i = 0; i < name.length && out.length < 40; i++) {
      if (masks[i] & mask && name[i].toLowerCase().includes(q)) out.push(i)
    }
    return out
  }, [data, deferred, enabled])

  if (!open) return null
  const anyOn = Object.values(enabled).some(Boolean)

  return (
    <nav
      aria-label="Satellite catalog"
      className="glass pointer-events-auto absolute left-3 right-3 top-[7.25rem] z-30 flex max-h-[62dvh] flex-col rounded-2xl animate-fadeIn md:left-4 md:right-auto md:top-[4.5rem] md:max-h-[calc(100dvh-6rem)] md:w-[22rem]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 pb-3">
        <div>
          <h2 className="text-base font-semibold text-white">Satellite catalog</h2>
          <p className="text-xs text-slate-400">
            {data ? `${data.totalInFile.toLocaleString('en-US')} objects in CelesTrak SATCAT` : 'CelesTrak SATCAT'}
          </p>
        </div>
        <button className="btn-icon shrink-0" onClick={() => setOpen(false)} aria-label="Close catalog">
          ✕
        </button>
      </header>

      <div className="space-y-3 overflow-y-auto p-4">
        {status === 'loading' && <p className="text-sm text-slate-300">Loading catalog…</p>}
        {status === 'error' && (
          <p role="alert" className="rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200">
            Could not load the catalog ({error}). Run <code>node scripts/build-satcat.mjs</code> to generate it.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={flyToEarthShell}>
            🌍 Frame Earth orbits
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setAll(true)}>
            All
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setAll(false)}>
            None
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={reset}>
            Reset
          </button>
        </div>

        {inOrbit && (
          <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-200" aria-live="polite">
            <span className="text-slate-400">In orbit {timeMode === 'live' ? 'today' : `in ${formatYear(year)}`}: </span>
            <strong className="text-white">{inOrbit.all.toLocaleString('en-US')}</strong> objects
            {inOrbit.shown !== inOrbit.all && (
              <span className="text-slate-400"> · {inOrbit.shown.toLocaleString('en-US')} match your filters</span>
            )}
          </p>
        )}

        {famous.length > 0 && (
          <section aria-label="Famous objects">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-sky-300">Famous objects</h3>
            <ul className="flex flex-wrap gap-1.5">
              {famous.map(({ f, here }) => (
                <li key={f.row}>
                  <button
                    onClick={() => focusRow(f.row)}
                    disabled={!here}
                    title={here ? f.def.label : `${f.def.label} (not launched yet, or already gone, at this date)`}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {f.def.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">Categories to show</legend>
          <ul className="space-y-1">
            {CATEGORIES.map((c) => {
              const inFile = data?.counts[c.id] ?? 0
              const drawn = layout?.drawnByBit[c.bit] ?? 0
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={!!enabled[c.id]}
                      onChange={() => toggle(c.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-sky-400"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-white">{c.label}</span>
                      <span className="block text-[11px] leading-snug text-slate-400">
                        <code className="text-slate-500">{c.rule}</code>
                      </span>
                      {data && (
                        <span className="block text-[11px] text-slate-400">
                          {inFile.toLocaleString('en-US')} in file ·{' '}
                          <span className={drawn ? 'text-sky-300' : ''}>{drawn.toLocaleString('en-US')} in orbit today</span>
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>

        <section aria-label="Search the catalog" className="space-y-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name (e.g. ISS, HUBBLE)"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            aria-label="Search catalog by name"
          />
          {!query && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button key={q} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10" onClick={() => setQuery(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
          {data && deferred.trim().length >= 2 && (
            <ul className="max-h-56 space-y-0.5 overflow-y-auto" aria-label="Search results">
              {results.length === 0 && (
                <li className="px-2 py-1 text-xs text-slate-400">
                  {anyOn ? 'No match in the selected categories.' : 'Turn on at least one category to search.'}
                </li>
              )}
              {results.map((i) => {
                const drawn = layout ? layout.rowCloud[i] >= 0 : false
                return (
                  <li key={i}>
                    <button
                      onClick={() => focusRow(i)}
                      aria-current={selected === i ? 'true' : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10 ${selected === i ? 'bg-white/10' : ''}`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: swatch(data.cols.type[i], data.cols.ops[i]) }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-white">{data.cols.name[i]}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{drawn ? rowInfo(data, i).year : 'listed'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <p className="text-[11px] leading-relaxed text-slate-500">
          Earth-orbit objects use real period, inclination, apogee and perigee from SATCAT; each object's orbit orientation and
          phase are illustrative because SATCAT has no ascending node or epoch. Objects that have decayed appear on the dates
          they were up there (using their last known orbit). Objects at the Moon, Mars, Venus, the Sun and the Lagrange points
          have no orbital data, so their positions are schematic. Zoom toward Earth and the dots become 3D models: satellites
          with turning solar panels, tumbling rocket bodies and debris. Click one to inspect it.
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400" aria-label="Colour key">
          {[
            ['Working satellite', TYPE_COLOR.alive],
            ['Dead satellite', TYPE_COLOR.dead],
            ['Rocket body', TYPE_COLOR.rocket],
            ['Debris', TYPE_COLOR.debris],
            ['Unknown', TYPE_COLOR.unknown],
          ].map(([label, color]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
