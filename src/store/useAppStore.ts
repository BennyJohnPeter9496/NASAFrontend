import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { PASS_SCORE, getObject, spotlightObjects, stories } from '../data'
import { OBJECT_MODELS, viewDistance } from '../models/registry'
import type { CameraSpec, Mode } from '../types'

export interface CameraGoal {
  /** null = solar-system overview */
  target: string | null
  distance: number
  azimuth?: number
  elevation?: number
  facing?: string
  nonce: number
}

export interface Badge {
  earnedAt: string
  score: number
}

export type View = 'space' | 'passport'

interface StoryState {
  objectId: string
  step: number
}

interface AppState {
  mode: Mode
  selectedId: string | null
  story: StoryState | null
  quizObjectId: string | null
  view: View
  listOpen: boolean
  camera: CameraGoal
  badges: Record<string, Badge>
  bestScores: Record<string, number>
  storiesCompleted: Record<string, true>

  /** True while an optional module shows its own side panel, so the camera keeps targets clear of it. */
  externalPanel: boolean
  externalPanelOwners: Record<string, boolean>
  /** Same, for panels on the left edge of the screen. */
  externalLeft: boolean
  externalLeftOwners: Record<string, boolean>
  setExternalPanel: (owner: string, open: boolean, side?: 'left' | 'right') => void
  setMode: (mode: Mode) => void
  selectObject: (id: string) => void
  clearSelection: () => void
  /** Clears the selection and story without moving the camera (used when another panel takes over). */
  dismissSelection: () => void
  startStory: (objectId: string) => void
  nextStep: () => void
  prevStep: () => void
  exitStory: () => void
  finishStory: () => void
  openQuiz: (objectId: string) => void
  closeQuiz: () => void
  recordQuizResult: (objectId: string, score: number) => void
  setView: (view: View) => void
  setListOpen: (open: boolean) => void
  resetProgress: () => void
  flyTo: (spec: CameraSpec | null) => void
}

export const HOME_DISTANCE = 125
/** Matches the opening camera angle (degrees above the orbital plane). */
export const HOME_ELEVATION = 38

let nonce = 0
const goal = (spec: CameraSpec | null): CameraGoal =>
  spec
    ? {
        target: spec.target,
        distance: spec.distance,
        azimuth: spec.azimuth,
        elevation: spec.elevation,
        facing: spec.facing,
        nonce: ++nonce,
      }
    : { target: null, distance: HOME_DISTANCE, elevation: HOME_ELEVATION, nonce: ++nonce }

const objectGoal = (id: string): CameraGoal => {
  const surface = OBJECT_MODELS[id]?.surface
  return goal({
    target: id,
    distance: viewDistance(id),
    ...(surface ? { facing: surface.body, elevation: 32, azimuth: 30 } : {}),
  })
}

const initial = {
  mode: 'student' as Mode,
  badges: {} as Record<string, Badge>,
  bestScores: {} as Record<string, number>,
  storiesCompleted: {} as Record<string, true>,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,
      selectedId: null,
      story: null,
      quizObjectId: null,
      view: 'space',
      listOpen: false,
      externalPanel: false,
      externalPanelOwners: {},
      externalLeft: false,
      externalLeftOwners: {},
      setExternalPanel: (owner, open, side = 'right') =>
        set((s) => {
          if (side === 'left') {
            const owners = { ...s.externalLeftOwners, [owner]: open }
            return { externalLeftOwners: owners, externalLeft: Object.values(owners).some(Boolean) }
          }
          const owners = { ...s.externalPanelOwners, [owner]: open }
          return { externalPanelOwners: owners, externalPanel: Object.values(owners).some(Boolean) }
        }),
      camera: { target: null, distance: HOME_DISTANCE, nonce: 0 },

      setMode: (mode) => set({ mode }),

      selectObject: (id) => {
        if (!getObject(id)) return
        set({ selectedId: id, story: null, view: 'space', listOpen: false, camera: objectGoal(id) })
      },

      clearSelection: () => set({ selectedId: null, story: null, camera: goal(null) }),

      dismissSelection: () => set({ selectedId: null, story: null }),

      startStory: (objectId) => {
        const story = stories[objectId]
        if (!story) return
        set({
          selectedId: objectId,
          story: { objectId, step: 0 },
          quizObjectId: null,
          camera: goal(story.steps[0].camera),
        })
      },

      nextStep: () => {
        const s = get().story
        if (!s) return
        const steps = stories[s.objectId].steps
        const step = Math.min(s.step + 1, steps.length - 1)
        if (step === s.step) return
        set({ story: { ...s, step }, camera: goal(steps[step].camera) })
      },

      prevStep: () => {
        const s = get().story
        if (!s || s.step === 0) return
        const step = s.step - 1
        set({ story: { ...s, step }, camera: goal(stories[s.objectId].steps[step].camera) })
      },

      exitStory: () => {
        const s = get().story
        if (!s) return
        set({ story: null, camera: objectGoal(s.objectId) })
      },

      finishStory: () => {
        const s = get().story
        if (!s) return
        set((st) => ({
          story: null,
          quizObjectId: s.objectId,
          storiesCompleted: { ...st.storiesCompleted, [s.objectId]: true },
          camera: objectGoal(s.objectId),
        }))
      },

      openQuiz: (objectId) => set({ quizObjectId: objectId }),
      closeQuiz: () => set({ quizObjectId: null }),

      recordQuizResult: (objectId, score) =>
        set((st) => {
          const best = Math.max(st.bestScores[objectId] ?? 0, score)
          const earned = score >= PASS_SCORE && !st.badges[objectId]
          return {
            bestScores: { ...st.bestScores, [objectId]: best },
            badges: earned
              ? { ...st.badges, [objectId]: { earnedAt: new Date().toISOString(), score } }
              : st.badges,
          }
        }),

      setView: (view) => set({ view }),
      setListOpen: (listOpen) => set({ listOpen }),

      resetProgress: () => set({ badges: {}, bestScores: {}, storiesCompleted: {} }),

      flyTo: (spec) => set({ camera: goal(spec) }),
    }),
    {
      name: 'sky-archive:v1',
      version: 2,
      // Kid mode was removed: anyone who had it saved falls back to Student.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Record<string, unknown>
        return { ...p, mode: p.mode === 'explorer' ? 'explorer' : 'student' } as never
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        mode: s.mode,
        badges: s.badges,
        bestScores: s.bestScores,
        storiesCompleted: s.storiesCompleted,
      }),
    },
  ),
)

export const GRAND_BADGE_ID = 'grand-explorer'

export const hasGrandBadge = (badges: Record<string, Badge>) =>
  spotlightObjects.every((o) => badges[o.id])
