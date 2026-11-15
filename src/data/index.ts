import objectsJson from './objects.json'
import storiesJson from './stories.json'
import quizzesJson from './quizzes.json'
import type { QuizQuestion, SpaceObject, Story } from '../types'

export const objects = objectsJson as unknown as SpaceObject[]
export const stories = storiesJson as unknown as Record<string, Story>
export const quizzes = quizzesJson as unknown as Record<string, QuizQuestion[]>

const byId = new Map(objects.map((o) => [o.id, o]))

export const getObject = (id: string | null | undefined): SpaceObject | undefined =>
  id ? byId.get(id) : undefined

export const spotlightObjects = objects.filter((o) => o.isSpotlight)

export const PASS_SCORE = 4

export const STATUS_META = {
  talking: { label: 'Still talking', dot: 'bg-emerald-400', chip: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/40' },
  complete: { label: 'Mission complete', dot: 'bg-sky-400', chip: 'bg-sky-400/15 text-sky-300 ring-sky-400/40' },
  silent: { label: 'Silent', dot: 'bg-slate-400', chip: 'bg-slate-400/15 text-slate-300 ring-slate-400/40' },
} as const
