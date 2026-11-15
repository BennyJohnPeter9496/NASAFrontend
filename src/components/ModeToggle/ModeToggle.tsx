import { useAppStore } from '../../store/useAppStore'
import type { Mode } from '../../types'

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'student', label: 'Junior', hint: 'Easy-to-read stories for young explorers' },
  { value: 'explorer', label: 'Explorer', hint: 'Technical detail' },
]

/** Native radio inputs give correct arrow-key behaviour and screen-reader semantics for free. */
export function ModeToggle() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">Reading level</legend>
      <div className="glass flex rounded-full p-1">
        {MODES.map((m) => (
          <label
            key={m.value}
            title={m.hint}
            className="relative cursor-pointer select-none"
          >
            <input
              type="radio"
              name="reading-mode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="peer sr-only"
            />
            <span className="block rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white peer-checked:bg-sky-400 peer-checked:text-slate-950 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-200">
              {m.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
