import { describe, expect, it } from 'vitest'
import { objects, quizzes, stories } from './index'
import { planets } from './bodies'

const bodyIds = new Set(['sun', 'moon', ...planets.map((p) => p.id)])
const objectIds = new Set(objects.map((o) => o.id))

describe('data integrity', () => {
  it('has 10 objects with unique ids and all three text depths', () => {
    expect(objects).toHaveLength(10)
    expect(objectIds.size).toBe(10)
    for (const o of objects) {
      expect(o.text.student.length).toBeGreaterThan(20)
      expect(o.text.explorer.length).toBeGreaterThan(20)
      expect(['talking', 'complete', 'silent']).toContain(o.status)
      expect(o.position).toHaveLength(3)
      if (o.anchor) expect(bodyIds.has(o.anchor)).toBe(true)
    }
  })

  it('flags exactly the three spotlight objects', () => {
    const ids = objects.filter((o) => o.isSpotlight).map((o) => o.id).sort()
    expect(ids).toEqual(['cassini', 'curiosity', 'voyager-1'])
  })

  it('has 4-5 story steps and 5 quiz questions per spotlight object', () => {
    for (const o of objects.filter((x) => x.isSpotlight)) {
      const s = stories[o.id]
      expect(s.steps.length).toBeGreaterThanOrEqual(4)
      expect(s.steps.length).toBeLessThanOrEqual(5)
      for (const step of s.steps) {
        expect(bodyIds.has(step.camera.target) || objectIds.has(step.camera.target)).toBe(true)
      }
      const q = quizzes[o.id]
      expect(q).toHaveLength(5)
      for (const item of q) {
        expect(item.options.length).toBe(4)
        expect(item.correctIndex).toBeGreaterThanOrEqual(0)
        expect(item.correctIndex).toBeLessThan(item.options.length)
        expect(item.explanation.length).toBeGreaterThan(5)
      }
    }
  })
})
