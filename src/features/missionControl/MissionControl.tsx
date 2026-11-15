import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { PASS_SCORE, endingFor, mission, scoreOf } from './scenario'
import type { Quality } from './scenario'
import { useMissionStore } from './store'

const QUALITY_STYLE: Record<Quality, string> = {
  good: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/40',
  ok: 'bg-amber-300/15 text-amber-200 ring-amber-300/40',
  bad: 'bg-rose-400/15 text-rose-300 ring-rose-400/40',
}
const QUALITY_LABEL: Record<Quality, string> = { good: 'Strong call', ok: 'Playable', bad: 'Risky' }

function Meter({ label, value, delta, tone }: { label: string; value: number; delta?: number; tone: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">
          {value}
          {delta ? (
            <span className={`ml-1 ${delta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {delta > 0 ? '+' : ''}
              {delta}
            </span>
          ) : null}
        </span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className={`h-full rounded-full transition-[width] duration-700 ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function MissionControl() {
  const phase = useMissionStore((s) => s.phase)
  if (phase === 'closed') return null
  return <Dialog />
}

function Dialog() {
  const s = useMissionStore()
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Capture so Escape closes only this dialog, not whatever is behind it.
      if (e.key === 'Escape') {
        e.stopPropagation()
        useMissionStore.getState().close()
        return
      }
      const st = useMissionStore.getState()
      if (st.phase === 'step') {
        const n = Number(e.key)
        const c = mission.steps[st.stepIndex].choices[n - 1]
        if (c) st.choose(c.id)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const step = mission.steps[s.stepIndex]
  const choice = s.phase === 'consequence' ? step.choices.find((c) => c.id === s.picks[s.stepIndex]) : undefined
  const score = scoreOf(s.health, s.science)
  const ending = endingFor(score)
  const earned = score >= PASS_SCORE

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/65 backdrop-blur-sm animate-fadeIn md:items-center md:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-title"
        tabIndex={-1}
        className="glass flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl outline-none animate-slideUp md:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Mission Control</p>
            <h2 id="mc-title" className="mt-1 text-lg font-semibold text-white">
              {mission.title}
            </h2>
          </div>
          <button className="btn-icon" onClick={s.close} aria-label="Close Mission Control">
            ✕
          </button>
        </header>

        {s.phase !== 'intro' && (
          <div className="flex gap-4 border-b border-white/10 px-5 py-3">
            <Meter label="Spacecraft health" value={s.health} delta={s.phase === 'consequence' ? s.lastDelta?.health : undefined} tone="bg-emerald-400" />
            <Meter label="Science return" value={s.science} delta={s.phase === 'consequence' ? s.lastDelta?.science : undefined} tone="bg-sky-400" />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {s.phase === 'intro' && (
            <div className="space-y-4">
              <p className="text-[15px] leading-relaxed text-slate-200">{mission.intro}</p>
              <p className="text-sm text-slate-400">
                You will make {mission.steps.length} decisions. Each has three options and real consequences.
                {s.best !== null && <> Your best score so far: <strong className="text-white">{s.best}</strong>.</>}
              </p>
              <button className="btn-primary" onClick={s.start}>
                Take the flight director&apos;s seat
              </button>
            </div>
          )}

          {s.phase === 'step' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">
                  Decision {s.stepIndex + 1} of {mission.steps.length}
                </p>
                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
              </div>
              <p className="text-[15px] leading-relaxed text-slate-200">{step.situation}</p>
              <ul className="space-y-2">
                {step.choices.map((c, i) => (
                  <li key={c.id}>
                    <button
                      onClick={() => s.choose(c.id)}
                      className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-sky-300/60 hover:bg-white/10"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                        {i + 1}
                      </span>
                      {c.text}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">Tip: press 1, 2 or 3 to choose.</p>
            </div>
          )}

          {s.phase === 'consequence' && choice && (
            <div className="space-y-4" aria-live="polite">
              <p className="text-xs text-slate-400">You chose</p>
              <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">{choice.text}</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${QUALITY_STYLE[choice.quality]}`}>
                {QUALITY_LABEL[choice.quality]}
              </span>
              <p className="text-[15px] leading-relaxed text-slate-200">{choice.consequence}</p>
              {choice.realLife && (
                <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
                  <strong>In real life:</strong> {choice.realLife}
                </p>
              )}
            </div>
          )}

          {s.phase === 'summary' && (
            <div className="space-y-4 text-center">
              <div className="text-5xl" aria-hidden>
                {earned ? '🎖️' : '📡'}
              </div>
              <h3 className="text-2xl font-bold text-white">{ending.title}</h3>
              <p className="text-3xl font-bold text-sky-300">
                {score} <span className="text-base font-medium text-slate-400">points</span>
              </p>
              <p className="text-[15px] leading-relaxed text-slate-200">{ending.text}</p>
              {earned ? (
                <p className="text-sm text-emerald-300">You earned the Flight Director badge. See it in your Passport.</p>
              ) : (
                <p className="text-sm text-slate-400">Score {PASS_SCORE}+ to earn the Flight Director badge.</p>
              )}
              <ul className="flex flex-wrap justify-center gap-2" aria-label="Your decisions">
                {mission.steps.map((st, i) => {
                  const c = st.choices.find((x) => x.id === s.picks[i])
                  return (
                    c && (
                      <li key={st.id} className={`rounded-full px-3 py-1 text-xs ring-1 ring-inset ${QUALITY_STYLE[c.quality]}`}>
                        {st.title}: {QUALITY_LABEL[c.quality]}
                      </li>
                    )
                  )
                })}
              </ul>
              {s.best !== null && <p className="text-xs text-slate-500">Best score: {s.best}</p>}
            </div>
          )}
        </div>

        {(s.phase === 'consequence' || s.phase === 'summary') && (
          <footer className="flex justify-end gap-2 border-t border-white/10 p-4">
            {s.phase === 'consequence' ? (
              <button className="btn-primary" onClick={s.next} autoFocus>
                {s.stepIndex === mission.steps.length - 1 ? 'See the result' : 'Next decision →'}
              </button>
            ) : (
              <>
                <button className="btn-ghost" onClick={s.close}>
                  Close
                </button>
                <button className="btn-primary" onClick={s.replay}>
                  Fly it again
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  )
}
