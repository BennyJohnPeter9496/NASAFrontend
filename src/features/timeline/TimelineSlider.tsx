import { objects } from '../../data'
import { useAppStore } from '../../store/useAppStore'
import { END_YEAR, START_YEAR, formatYear } from './model'
import { useTimelineStore } from './store'

const yearOf = (iso: string) => Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12

const MARKS = objects
  .filter((o) => !o.anchor || o.anchor !== 'moon')
  .map((o) => ({ id: o.id, name: o.name, year: yearOf(o.launchDate) }))
  .filter((m) => m.year >= START_YEAR)
  .sort((a, b) => a.year - b.year)

const pct = (y: number) => ((y - START_YEAR) / (END_YEAR - START_YEAR)) * 100

export function TimelineSlider() {
  const mode = useTimelineStore((s) => s.mode)
  const year = useTimelineStore((s) => s.year)
  const playing = useTimelineStore((s) => s.playing)
  const setYear = useTimelineStore((s) => s.setYear)
  const togglePlay = useTimelineStore((s) => s.togglePlay)
  const goLive = useTimelineStore((s) => s.goLive)
  const panelOpen = useAppStore((s) => !!s.selectedId || s.externalPanel)

  return (
    <section
      aria-label="Time travel"
      className={`glass pointer-events-auto absolute left-1/2 z-20 w-[min(680px,94vw)] -translate-x-1/2 rounded-2xl px-4 pb-2 pt-3 animate-fadeIn md:bottom-14 ${
        panelOpen ? 'hidden md:block md:max-w-[calc(100vw-30rem)]' : ''
      } bottom-3`}
    >
      <div className="flex items-center gap-3">
        <button
          className="btn-icon shrink-0 text-base"
          onClick={togglePlay}
          aria-label={playing ? 'Pause time travel' : 'Play time travel from 1977'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-white">{mode === 'live' ? 'Today' : formatYear(year)}</span>
            <span className="truncate text-[11px] text-slate-400">
              {mode === 'live' ? 'Live view · drag to travel back to 1977' : 'Stylised positions for this date'}
            </span>
          </div>
          <input
            type="range"
            min={START_YEAR}
            max={END_YEAR}
            step={0.01}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Year"
            aria-valuetext={formatYear(year)}
            className="mt-1 h-2 w-full cursor-pointer accent-sky-400"
          />
          <div className="relative mt-0.5 h-4" aria-label="Mission launches">
            {MARKS.map((m) => (
              <button
                key={m.id}
                onClick={() => setYear(m.year + 0.3)}
                title={`${m.name} · ${Math.floor(m.year)}`}
                aria-label={`Jump to ${m.name}, ${Math.floor(m.year)}`}
                className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-amber-300/70 ring-1 ring-black/40 hover:bg-amber-200 hover:ring-white/60"
                style={{ left: `${pct(Math.min(m.year + 0.3, END_YEAR))}%` }}
              />
            ))}
          </div>
        </div>
        <button
          className={`btn-ghost shrink-0 px-3 py-1.5 text-xs ${mode === 'timeline' ? '' : 'invisible'}`}
          onClick={goLive}
          disabled={mode !== 'timeline'}
          aria-hidden={mode !== 'timeline'}
          tabIndex={mode === 'timeline' ? 0 : -1}
        >
          ● Live
        </button>
      </div>
    </section>
  )
}
