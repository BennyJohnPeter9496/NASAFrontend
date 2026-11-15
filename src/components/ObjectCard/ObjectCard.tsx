import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { getObject } from '../../data'
import { formatAU, formatDate, formatKm, formatLightTime } from '../../lib/format'
import { StatusBadge } from '../ui/StatusBadge'

const MODE_LABEL = { student: 'Student', explorer: 'Explorer' } as const

export const PANEL_CLASS =
  'glass pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex max-h-[55dvh] flex-col rounded-t-2xl animate-slideUp ' +
  'md:inset-x-auto md:right-4 md:top-24 md:w-[380px] md:rounded-2xl md:animate-slideIn'
const CARD_CLASS = `${PANEL_CLASS} md:bottom-4 md:max-h-none`
export const STORY_PANEL_CLASS = `${PANEL_CLASS} md:bottom-auto md:max-h-[calc(100dvh-7rem)]`

export function ObjectCard() {
  const selectedId = useAppStore((s) => s.selectedId)
  const mode = useAppStore((s) => s.mode)
  const hasStoryDone = useAppStore((s) => (selectedId ? !!s.storiesCompleted[selectedId] : false))
  const badge = useAppStore((s) => (selectedId ? s.badges[selectedId] : undefined))
  const clear = useAppStore((s) => s.clearSelection)
  const startStory = useAppStore((s) => s.startStory)
  const openQuiz = useAppStore((s) => s.openQuiz)
  const obj = getObject(selectedId)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [selectedId])

  if (!obj) return null

  return (
    <aside className={CARD_CLASS} aria-label={`${obj.name} details`}>
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 pb-3">
        <div className="min-w-0">
          <h2 ref={heading} tabIndex={-1} className="truncate text-xl font-semibold text-white outline-none">
            {obj.name}
          </h2>
          <p className="text-sm text-slate-400">{obj.type}</p>
        </div>
        <button className="btn-icon shrink-0" onClick={clear} aria-label="Close and return to overview">
          ✕
        </button>
      </header>

      <div className="space-y-4 overflow-y-auto p-4">
        <StatusBadge status={obj.status} />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Launched</dt>
            <dd className="mt-0.5 font-medium text-white">{formatDate(obj.launchDate)}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">From Earth</dt>
            <dd className="mt-0.5 font-medium text-white">≈ {formatAU(obj.distanceFromEarthAU)}</dd>
            <dd className="text-xs text-slate-400">
              ≈ {formatKm(obj.distanceFromEarthAU)} · {formatLightTime(obj.distanceFromEarthAU)} by light
            </dd>
          </div>
        </dl>

        <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
          <span className="mr-1" aria-hidden>
            ✨
          </span>
          {obj.discovery}
        </p>

        <section aria-live="polite">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-300">
            {MODE_LABEL[mode]} mode
          </h3>
          <p className="text-[15px] leading-relaxed text-slate-200">{obj.text[mode]}</p>
        </section>

        {badge && (
          <p className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">
            🏅 Badge earned with a score of {badge.score}/5
          </p>
        )}
      </div>

      {obj.isSpotlight && (
        <footer className="flex flex-wrap gap-2 border-t border-white/10 p-4">
          <button className="btn-primary flex-1" onClick={() => startStory(obj.id)}>
            ▶ {hasStoryDone ? 'Replay story' : 'Start story'}
          </button>
          {hasStoryDone && (
            <button className="btn-ghost" onClick={() => openQuiz(obj.id)}>
              Take quiz
            </button>
          )}
        </footer>
      )}
    </aside>
  )
}
