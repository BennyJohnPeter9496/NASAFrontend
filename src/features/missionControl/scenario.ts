import missionJson from '../../data/mission-control.json'

export type Quality = 'good' | 'ok' | 'bad'

export interface Choice {
  id: string
  text: string
  quality: Quality
  effects: { health: number; science: number }
  consequence: string
  realLife?: string
}

export interface Step {
  id: string
  title: string
  situation: string
  choices: Choice[]
}

export interface Ending {
  min: number
  title: string
  text: string
}

export interface Mission {
  id: string
  title: string
  intro: string
  start: { health: number; science: number }
  steps: Step[]
  endings: Ending[]
}

export const mission = missionJson as unknown as Mission

export const clampMeter = (n: number) => Math.min(100, Math.max(0, n))

export const scoreOf = (health: number, science: number) => clampMeter(health) + clampMeter(science)

export const endingFor = (score: number): Ending =>
  [...mission.endings].sort((a, b) => b.min - a.min).find((e) => score >= e.min) ?? mission.endings[mission.endings.length - 1]

/** Score reached by picking the choice with the given id for every step (used by tests and for the best score). */
export function playThrough(pickIds: string[]) {
  let health = mission.start.health
  let science = mission.start.science
  mission.steps.forEach((step, i) => {
    const c = step.choices.find((x) => x.id === pickIds[i])
    if (!c) return
    health = clampMeter(health + c.effects.health)
    science = clampMeter(science + c.effects.science)
  })
  return { health, science, score: scoreOf(health, science) }
}

export const PASS_SCORE = 110
