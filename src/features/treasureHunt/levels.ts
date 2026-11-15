import huntJson from '../../data/hunt.json'

export interface Clue {
  id: string
  riddle: string
  answer: string
  hint: string
  found: string
}

export interface Level {
  id: string
  title: string
  intro: string
  clues: Clue[]
  reward: string
}

export const levels = huntJson.levels as Level[]

/** Whether every clue in a level has been solved. */
export const levelDone = (level: Level, solved: Record<string, true>) => level.clues.every((c) => solved[c.id])

/** Highest level index the player may play: each completed level unlocks the next. */
export function unlockedIndex(solved: Record<string, true>) {
  let i = 0
  while (i < levels.length - 1 && levelDone(levels[i], solved)) i++
  return i
}

export const allDone = (solved: Record<string, true>) => levels.every((l) => levelDone(l, solved))
