import { Vector3 } from 'three'
import data from '../../data/positions.json'
import { setTimeProvider } from '../../components/Scene/positions'
import type { TimeProvider } from '../../components/Scene/positions'
import { sim } from '../../lib/simTime'

export const START_YEAR = data.startYear
export const END_YEAR = data.endYear

/**
 * Mutable timeline state read by the render loop (no React involved).
 * The zustand store mirrors `year` for the UI at a lower rate.
 */
export const timeline = sim

const keyYears = data.keyYears as number[]
const planetAngles = data.planets as Record<string, number[]>
const objectKeys = data.objects as Record<string, { from: number; keys: number[][] }>
const anchoredFrom = data.anchoredFrom as Record<string, number>

/** Returns the keyframe index and blend factor for time `t` in a sorted array of years. */
function locate(years: ArrayLike<number>, t: number): [number, number] {
  const last = years.length - 1
  if (t <= years[0]) return [0, 0]
  if (t >= years[last]) return [last - 1, 1]
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (years[mid] <= t) lo = mid
    else hi = mid
  }
  return [lo, (t - years[lo]) / (years[hi] - years[lo])]
}

export const provider: TimeProvider = {
  active: () => timeline.active,

  angle(id) {
    const arr = planetAngles[id]
    const [i, f] = locate(keyYears, timeline.year)
    return arr[i] + (arr[i + 1] - arr[i]) * f
  },

  visible(id) {
    const o = objectKeys[id]
    if (o) return timeline.year >= o.from
    const a = anchoredFrom[id]
    return a === undefined ? true : timeline.year >= a
  },

  free(id, out: Vector3) {
    const o = objectKeys[id]
    if (!o) return false
    const ys = o.keys.map((k) => k[0])
    const [i, f] = locate(ys, timeline.year)
    const a = o.keys[i]
    const b = o.keys[i + 1]
    out.set(a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f)
    return true
  },
}

setTimeProvider(provider)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatYear(y: number) {
  const whole = Math.floor(y)
  return `${MONTHS[Math.min(11, Math.floor((y - whole) * 12))]} ${whole}`
}
