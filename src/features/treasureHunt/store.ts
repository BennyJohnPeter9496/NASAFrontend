import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getObject } from '../../data'
import { useAppStore } from '../../store/useAppStore'
import { levelDone, levels, unlockedIndex } from './levels'

export type Feedback =
  | { kind: 'found'; clueId: string; text: string; levelComplete: boolean }
  | { kind: 'miss'; text: string }
  | null

interface HuntState {
  open: boolean
  /** Index of the level being played. */
  level: number
  solved: Record<string, true>
  feedback: Feedback
  hintsShown: Record<string, true>

  setOpen: (open: boolean) => void
  setLevel: (index: number) => void
  showHint: (clueId: string) => void
  dismissFeedback: () => void
  reset: () => void
  /** Called when the player opens an object card. */
  guess: (objectId: string) => void
}

export const useHuntStore = create<HuntState>()(
  persist(
    (set, get) => ({
      open: false,
      level: 0,
      solved: {},
      feedback: null,
      hintsShown: {},

      setOpen: (open) => set({ open, feedback: null }),

      setLevel: (index) => {
        if (index > unlockedIndex(get().solved)) return
        set({ level: index, feedback: null })
      },

      showHint: (clueId) => set((s) => ({ hintsShown: { ...s.hintsShown, [clueId]: true } })),
      dismissFeedback: () => set({ feedback: null }),
      reset: () => set({ solved: {}, level: 0, feedback: null, hintsShown: {} }),

      guess: (objectId) => {
        const s = get()
        if (!s.open) return
        const level = levels[s.level]
        if (levelDone(level, s.solved)) return
        const clue = level.clues.find((c) => c.answer === objectId && !s.solved[c.id])
        if (clue) {
          const solved = { ...s.solved, [clue.id]: true as const }
          const levelComplete = levelDone(level, solved)
          set({ solved, feedback: { kind: 'found', clueId: clue.id, text: clue.found, levelComplete } })
          return
        }
        const name = getObject(objectId)?.name ?? 'That one'
        const already = level.clues.some((c) => c.answer === objectId && s.solved[c.id])
        set({
          feedback: {
            kind: 'miss',
            text: already ? `${name} is already found. Try another clue.` : `${name} is not an answer to any clue in this level. Keep exploring!`,
          },
        })
      },
    }),
    {
      name: 'sky-archive:treasure-hunt',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ solved: s.solved, level: s.level, hintsShown: s.hintsShown }),
    },
  ),
)

// Opening any object card counts as a guess while the hunt is open.
useAppStore.subscribe((s, prev) => {
  if (s.selectedId && s.selectedId !== prev.selectedId) useHuntStore.getState().guess(s.selectedId)
})
