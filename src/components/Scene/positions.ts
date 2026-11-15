import { Vector3 } from 'three'
import { MOON, planets } from '../../data/bodies'
import { objects } from '../../data'

/**
 * Live world positions for every body and object, keyed by id.
 * Mutated once per frame by `updatePositions` (called from SolarClock) so that
 * meshes and the camera rig can read them without any React state.
 */
export const positions = new Map<string, Vector3>()
positions.set('sun', new Vector3())
positions.set(MOON.id, new Vector3())
for (const p of planets) positions.set(p.id, new Vector3())
for (const o of objects) positions.set(o.id, new Vector3())

export const ORIGIN = positions.get('sun')!

/**
 * Optional hook for the time-slider module. While `active()` is true, planet angles and
 * free-flying object positions come from keyframes instead of the live animation clock.
 */
export interface TimeProvider {
  active(): boolean
  /** Unwrapped heliocentric angle (radians) of a planet. */
  angle(id: string): number
  /** Whether the object exists at the current slider date. */
  visible(id: string): boolean
  /** Writes the position of a free-flying object. Returns false for anchored objects. */
  free(id: string, out: Vector3): boolean
}

let timeProvider: TimeProvider | null = null
export const setTimeProvider = (p: TimeProvider | null) => {
  timeProvider = p
}

/** Ids of objects that should currently not be drawn (e.g. not yet launched). */
export const hidden = new Set<string>()

export function updatePositions(t: number) {
  const tl = timeProvider?.active() ? timeProvider : null

  for (const p of planets) {
    const a = tl ? tl.angle(p.id) : p.phase + p.speed * t
    positions.get(p.id)!.set(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitRadius)
  }

  const earth = positions.get('earth')!
  const ma = MOON.speed * t
  positions
    .get(MOON.id)!
    .set(
      earth.x + Math.cos(ma) * MOON.orbitRadius,
      earth.y + Math.sin(ma * 0.7) * 0.25,
      earth.z + Math.sin(ma) * MOON.orbitRadius,
    )

  for (const o of objects) {
    const out = positions.get(o.id)!
    if (tl) {
      if (tl.visible(o.id)) hidden.delete(o.id)
      else hidden.add(o.id)
      if (tl.free(o.id, out)) continue
    } else if (hidden.size) {
      hidden.delete(o.id)
    }
    out.set(o.position[0], o.position[1], o.position[2])
    if (o.anchor) out.add(positions.get(o.anchor)!)
  }
}

updatePositions(0)
