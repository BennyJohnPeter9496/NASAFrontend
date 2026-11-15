import { useEffect, useRef, useState } from 'react'
import { PASS_SCORE, getObject, quizzes, stories } from '../../data'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useAppStore } from '../../store/useAppStore'

export function Quiz() {
  const objectId = useAppStore((s) => s.quizObjectId)
  const obj = getObject(objectId)
  if (!obj || !objectId || !quizzes[objectId]) return null
  // Remount per object so state always starts fresh.
  return <QuizDialog key={objectId} objectId={objectId} name={obj.name} />
}

function QuizDialog({ objectId, name }: { objectId: string; name: string }) {
  const questions = quizzes[objectId]
  const badge = stories[objectId].badge
  const close = useAppStore((s) => s.closeQuiz)
  const record = useAppStore((s) => s.recordQuizResult)
  const setView = useAppStore((s) => s.setView)
  const alreadyHad = useRef(!!useAppStore.getState().badges[objectId])

  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)

  const q = questions[index]
  const answered = picked !== null
  const passed = score >= PASS_SCORE

  const choose = (i: number) => {
    if (answered) return
    setPicked(i)
    if (i === q.correctIndex) setScore((s) => s + 1)
  }

  const advance = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1)
      setPicked(null)
    } else {
      record(objectId, score)
      setDone(true)
    }
  }

  const retry = () => {
    setIndex(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || answered) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length) choose(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-fadeIn md:items-center md:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        tabIndex={-1}
        className="glass flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl outline-none animate-slideUp md:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Explorer quiz · {name}</p>
            <h2 id="quiz-title" className="mt-1 text-lg font-semibold text-white">
              {done ? 'Results' : `Question ${index + 1} of ${questions.length}`}
            </h2>
          </div>
          <button className="btn-icon" onClick={close} aria-label="Close quiz">
            ✕
          </button>
        </header>

        {done ? (
          <div className="space-y-5 overflow-y-auto p-6 text-center">
            <div className="text-6xl" aria-hidden>
              {passed ? badge.emoji : '🔭'}
            </div>
            <p className="text-3xl font-bold text-white">
              {score} / {questions.length}
            </p>
            {passed ? (
              <p className="text-emerald-300">
                {alreadyHad.current ? 'Nice! You already own the' : 'You earned the'} <strong>{badge.name}</strong> badge!
              </p>
            ) : (
              <p className="text-slate-300">
                You need {PASS_SCORE} correct answers to earn the <strong>{badge.name}</strong> badge. Replay the story and try
                again!
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {passed ? (
                <button
                  className="btn-primary"
                  onClick={() => {
                    close()
                    setView('passport')
                  }}
                >
                  Open Passport
                </button>
              ) : (
                <button className="btn-primary" onClick={retry}>
                  Try again
                </button>
              )}
              <button className="btn-ghost" onClick={close}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="h-1 bg-white/10" aria-hidden>
              <div
                className="h-full bg-sky-400 transition-[width] duration-300"
                style={{ width: `${(index / questions.length) * 100}%` }}
              />
            </div>
            <div className="space-y-4 overflow-y-auto p-5">
              <p className="text-base font-medium text-white">{q.question}</p>
              <ul className="space-y-2">
                {q.options.map((opt, i) => {
                  const isCorrect = i === q.correctIndex
                  const isPicked = i === picked
                  const tone = !answered
                    ? 'border-white/10 bg-white/5 hover:border-sky-300/60 hover:bg-white/10'
                    : isCorrect
                      ? 'border-emerald-400/70 bg-emerald-400/15'
                      : isPicked
                        ? 'border-rose-400/70 bg-rose-400/15'
                        : 'border-white/5 bg-white/[0.03] opacity-60'
                  return (
                    <li key={opt}>
                      <button
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm text-slate-100 transition-colors ${tone}`}
                        onClick={() => choose(i)}
                        disabled={answered}
                        aria-label={`${i + 1}. ${opt}${answered ? (isCorrect ? ' (correct)' : isPicked ? ' (your answer, incorrect)' : '') : ''}`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                          {answered && isCorrect ? '✓' : answered && isPicked ? '✕' : i + 1}
                        </span>
                        {opt}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div aria-live="polite" className="min-h-[3.5rem]">
                {answered && (
                  <p
                    className={`rounded-xl p-3 text-sm ${
                      picked === q.correctIndex ? 'bg-emerald-400/10 text-emerald-100' : 'bg-rose-400/10 text-rose-100'
                    }`}
                  >
                    <strong>{picked === q.correctIndex ? 'Correct! ' : 'Not quite. '}</strong>
                    {q.explanation}
                  </p>
                )}
              </div>
            </div>
            <footer className="flex items-center justify-between border-t border-white/10 p-4">
              <span className="text-sm text-slate-400">Score: {score}</span>
              <button className="btn-primary" onClick={advance} disabled={!answered}>
                {index === questions.length - 1 ? 'See results' : 'Next →'}
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  )
}
