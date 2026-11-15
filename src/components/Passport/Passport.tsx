import { useRef, useState } from 'react'
import { spotlightObjects, stories } from '../../data'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { GRAND_BADGE_ID, hasGrandBadge, useAppStore } from '../../store/useAppStore'
import { formatDate } from '../../lib/format'
import { resetFeatureProgress, useExtraBadges } from '../../features/badges'

interface BadgeView {
  id: string
  name: string
  emoji: string
  hint: string
  earnedAt?: string
  score?: number
  /** True for badges earned through a story and quiz (they get a "Start this story" shortcut). */
  story?: boolean
}

export function Passport() {
  const view = useAppStore((s) => s.view)
  if (view !== 'passport') return null
  return <PassportPage />
}

function PassportPage() {
  const badges = useAppStore((s) => s.badges)
  const setView = useAppStore((s) => s.setView)
  const reset = useAppStore((s) => s.resetProgress)
  const startStory = useAppStore((s) => s.startStory)
  const extraBadges = useExtraBadges()
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)

  const list: BadgeView[] = spotlightObjects.map((o) => ({
    id: o.id,
    name: stories[o.id].badge.name,
    emoji: stories[o.id].badge.emoji,
    hint: `Play the ${o.name} story, then score 4/5 or more on the quiz.`,
    earnedAt: badges[o.id]?.earnedAt,
    score: badges[o.id]?.score,
    story: true,
  }))
  const grand = hasGrandBadge(badges)
  list.push({
    id: GRAND_BADGE_ID,
    name: 'Grand Explorer',
    emoji: '🌌',
    hint: 'Earn all three mission badges.',
    earnedAt: grand ? 'earned' : undefined,
  })
  for (const b of extraBadges) list.push({ id: b.id, name: b.name, emoji: b.emoji, hint: b.hint, earnedAt: b.earned ? 'earned' : undefined })
  const earned = list.filter((b) => b.earnedAt).length

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-space-950/90 backdrop-blur-md animate-fadeIn">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="passport-title"
        tabIndex={-1}
        className="mx-auto flex min-h-full max-w-3xl flex-col p-4 outline-none md:p-8"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300">Sky Archive</p>
            <h2 id="passport-title" className="mt-1 text-3xl font-bold text-white">
              Explorer Passport
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {earned} of {list.length} badges earned
            </p>
          </div>
          <button className="btn-ghost" onClick={() => setView('space')}>
            ← Back to space
          </button>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((b) => {
            const has = !!b.earnedAt
            return (
              <li
                key={b.id}
                className={`glass rounded-2xl p-5 text-center transition ${has ? 'ring-1 ring-amber-300/50' : ''}`}
              >
                <div
                  className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
                    has
                      ? 'bg-gradient-to-br from-amber-300/30 to-violet-400/30 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
                      : 'bg-white/5 grayscale'
                  }`}
                  aria-hidden
                >
                  {has ? b.emoji : '🔒'}
                </div>
                <h3 className={`font-semibold ${has ? 'text-white' : 'text-slate-400'}`}>{b.name}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  <span className="sr-only">{has ? 'Earned. ' : 'Locked. '}</span>
                  {has
                    ? b.score !== undefined
                      ? `Earned ${formatDate(b.earnedAt!.slice(0, 10))} · ${b.score}/5`
                      : 'Unlocked!'
                    : b.hint}
                </p>
                {!has && b.story && (
                  <button
                    className="btn-ghost mt-3 text-xs"
                    onClick={() => {
                      setView('space')
                      startStory(b.id)
                    }}
                  >
                    Start this story
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-8 text-center">
          {confirming ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-300">
              Erase all badges?
              <button
                className="btn-ghost text-rose-300"
                onClick={() => {
                  reset()
                  resetFeatureProgress()
                  setConfirming(false)
                }}
              >
                Yes, reset
              </button>
              <button className="btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline" onClick={() => setConfirming(true)}>
              Reset passport
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
