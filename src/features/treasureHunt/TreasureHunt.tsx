import { getObject } from '../../data'
import { allDone, levelDone, levels, unlockedIndex } from './levels'
import { useHuntStore } from './store'

export function TreasureHunt() {
  const open = useHuntStore((s) => s.open)
  const levelIndex = useHuntStore((s) => s.level)
  const solved = useHuntStore((s) => s.solved)
  const feedback = useHuntStore((s) => s.feedback)
  const hints = useHuntStore((s) => s.hintsShown)
  const setOpen = useHuntStore((s) => s.setOpen)
  const setLevel = useHuntStore((s) => s.setLevel)
  const showHint = useHuntStore((s) => s.showHint)
  const reset = useHuntStore((s) => s.reset)

  if (!open) return null
  const unlocked = unlockedIndex(solved)
  const index = Math.min(levelIndex, unlocked)
  const level = levels[index]
  const done = levelDone(level, solved)
  const finished = allDone(solved)
  const hasNext = index < levels.length - 1
  const found = level.clues.filter((c) => solved[c.id]).length

  return (
    <section
      aria-label="Treasure Hunt"
      className="glass pointer-events-auto absolute left-1/2 top-[7.25rem] z-30 flex max-h-[46dvh] w-[min(540px,94vw)] -translate-x-1/2 flex-col rounded-2xl animate-fadeIn md:top-[4.5rem] md:max-h-[60dvh]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 p-3 pl-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">🗺️ Treasure Hunt · {level.title}</h2>
          <p className="text-xs text-slate-400">
            {found} of {level.clues.length} found
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {levels.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setLevel(i)}
              disabled={i > unlocked}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`Level ${i + 1}${i > unlocked ? ' (locked)' : levelDone(l, solved) ? ' (complete)' : ''}`}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                i === index ? 'bg-sky-400 text-slate-950' : levelDone(l, solved) ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/5 text-slate-300 disabled:opacity-40'
              }`}
            >
              {i > unlocked ? '🔒' : levelDone(l, solved) ? '✓' : i + 1}
            </button>
          ))}
          <button className="btn-icon ml-1 h-7 w-7 text-sm" onClick={() => setOpen(false)} aria-label="Close Treasure Hunt">
            ✕
          </button>
        </div>
      </header>

      <div className="min-h-0 space-y-3 overflow-y-auto p-4">
        <p className="text-xs text-slate-400">{level.intro} Open the object you think each clue describes.</p>

        <ul className="space-y-2">
          {level.clues.map((c, i) => {
            const isSolved = !!solved[c.id]
            const answer = getObject(c.answer)
            return (
              <li key={c.id} className={`rounded-xl border p-3 text-sm ${isSolved ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/10 bg-white/5'}`}>
                <p className="text-slate-100">
                  <span className="mr-1.5 font-semibold text-sky-300">{i + 1}.</span>
                  {c.riddle}
                </p>
                {isSolved ? (
                  <p className="mt-1.5 text-xs text-emerald-200">
                    ✓ <strong>{answer?.name}</strong>. {c.found}
                  </p>
                ) : hints[c.id] ? (
                  <p className="mt-1.5 text-xs text-amber-200">💡 {c.hint}</p>
                ) : (
                  <button className="mt-1.5 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200" onClick={() => showHint(c.id)}>
                    Need a hint?
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <div aria-live="polite" className="min-h-[1.5rem]">
          {feedback?.kind === 'miss' && <p className="rounded-lg bg-white/5 p-2.5 text-sm text-slate-300">{feedback.text}</p>}
          {feedback?.kind === 'found' && !feedback.levelComplete && (
            <p className="rounded-lg bg-emerald-400/10 p-2.5 text-sm text-emerald-200">🎉 Found it! {feedback.text}</p>
          )}
        </div>

        {done && (
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">{finished && !hasNext ? '🏆 Treasure found!' : '✨ Level complete!'}</p>
            <p className="mt-1">{level.reward}</p>
            <div className="mt-2 flex gap-2">
              {hasNext && (
                <button className="btn-primary px-4 py-1.5 text-xs" onClick={() => setLevel(index + 1)}>
                  Next level →
                </button>
              )}
              {finished && (
                <button className="btn-ghost px-4 py-1.5 text-xs" onClick={reset}>
                  Play again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
