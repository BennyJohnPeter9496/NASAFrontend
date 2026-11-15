import { useEffect, useState } from 'react'

export function LoadingScreen({ ready }: { ready: boolean }) {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setGone(true), 700)
    return () => clearTimeout(t)
  }, [ready])

  if (gone) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-space-950 transition-opacity duration-700 ${
        ready ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative mb-8 h-24 w-24" aria-hidden>
        <div className="absolute inset-0 rounded-full border border-sky-300/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-sky-300" style={{ animationDuration: '1.6s' }} />
        <div className="absolute inset-[34px] rounded-full bg-amber-300 shadow-[0_0_30px_8px_rgba(251,191,36,0.55)]" />
      </div>
      <p className="text-2xl font-semibold tracking-[0.3em] text-white">SKY ARCHIVE</p>
      <p className="mt-3 text-sm text-slate-400">{ready ? 'Ready' : 'Calibrating telescopes…'}</p>
    </div>
  )
}
