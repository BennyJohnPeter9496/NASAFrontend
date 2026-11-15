import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { claimPanel } from '../../lib/panels'
import { clampMeter, mission, scoreOf } from './scenario'

type Phase = 'closed' | 'intro' | 'step' | 'consequence' | 'summary'

interface MissionState {
  phase: Phase
  stepIndex: number
  picks: string[]
  health: number
  science: number
  /** Meter change from the last decision, for the consequence screen. */
  lastDelta: { health: number; science: number } | null
  best: number | null
  plays: number

  open: () => void
  start: () => void
  choose: (choiceId: string) => void
  next: () => void
  replay: () => void
  close: () => void
}

const fresh = () => ({
  stepIndex: 0,
  picks: [] as string[],
  health: mission.start.health,
  science: mission.start.science,
  lastDelta: null,
})

export const useMissionStore = create<MissionState>()(
  persist(
    (set, get) => ({
      phase: 'closed',
      ...fresh(),
      best: null,
      plays: 0,

      open: () => {
        claimPanel('mission')
        set({ phase: 'intro', ...fresh() })
      },

      start: () => set({ phase: 'step', ...fresh() }),

      choose: (choiceId) => {
        const s = get()
        if (s.phase !== 'step') return
        const choice = mission.steps[s.stepIndex].choices.find((c) => c.id === choiceId)
        if (!choice) return
        const health = clampMeter(s.health + choice.effects.health)
        const science = clampMeter(s.science + choice.effects.science)
        set({
          phase: 'consequence',
          picks: [...s.picks, choiceId],
          health,
          science,
          lastDelta: { health: health - s.health, science: science - s.science },
        })
      },

      next: () => {
        const s = get()
        if (s.phase !== 'consequence') return
        if (s.stepIndex < mission.steps.length - 1) return set({ phase: 'step', stepIndex: s.stepIndex + 1 })
        const score = scoreOf(s.health, s.science)
        set({ phase: 'summary', best: s.best === null ? score : Math.max(s.best, score), plays: s.plays + 1 })
      },

      replay: () => set({ phase: 'step', ...fresh() }),
      close: () => set({ phase: 'closed' }),
    }),
    {
      name: 'sky-archive:mission-control',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ best: s.best, plays: s.plays }),
    },
  ),
)
