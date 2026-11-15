import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { getObject, stories } from '../../data'
import { STORY_PANEL_CLASS } from '../ObjectCard/ObjectCard'

const MODE_LABEL = { student: 'Student', explorer: 'Explorer' } as const

export function StoryPlayer() {
  const story = useAppStore((s) => s.story)
  const mode = useAppStore((s) => s.mode)
  const next = useAppStore((s) => s.nextStep)
  const prev = useAppStore((s) => s.prevStep)
  const exit = useAppStore((s) => s.exitStory)
  const finish = useAppStore((s) => s.finishStory)
  const heading = useRef<HTMLHeadingElement>(null)
  const objectId = story?.objectId

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [objectId])

  if (!story) return null
  const obj = getObject(story.objectId)
  const data = stories[story.objectId]
  if (!obj || !data) return null

  const total = data.steps.length
  const current = data.steps[story.step]
  const isLast = story.step === total - 1
  const pct = ((story.step + 1) / total) * 100

  return (
    <aside className={STORY_PANEL_CLASS} aria-label={`${obj.name} story`}>
      <header className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">
            {data.badge.emoji} {obj.name} · Story
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Step {story.step + 1} of {total}
          </p>
        </div>
        <button className="btn-icon shrink-0" onClick={exit} aria-label="Exit story">
          ✕
        </button>
      </header>

      <div
        className="mx-4 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Story progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={story.step + 1}
        aria-valuetext={`Step ${story.step + 1} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="overflow-y-auto p-4" aria-live="polite">
        <h2 ref={heading} tabIndex={-1} className="mb-2 text-lg font-semibold text-white outline-none">
          {current.title}
        </h2>
        <p key={`${story.step}-${mode}`} className="animate-fadeIn text-[15px] leading-relaxed text-slate-200">
          {current.text[mode]}
        </p>
        <p className="mt-3 text-xs text-slate-500">{MODE_LABEL[mode]} mode · use ← → keys to move</p>
      </div>

      <footer className="flex gap-2 border-t border-white/10 p-4">
        <button className="btn-ghost" onClick={prev} disabled={story.step === 0}>
          ← Back
        </button>
        {isLast ? (
          <button className="btn-primary flex-1" onClick={finish}>
            Finish &amp; take quiz 🏅
          </button>
        ) : (
          <button className="btn-primary flex-1" onClick={next}>
            Next →
          </button>
        )}
      </footer>
    </aside>
  )
}
