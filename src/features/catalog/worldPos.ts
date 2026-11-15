import { Vector3 } from 'three'
import { planets } from '../../data/bodies'
import { positions } from '../../components/Scene/positions'
import { L_POINT_OFFSET } from './layout'
import type { CloudCfg, CloudLayout } from './layout'
import { positionAt } from './kepler'

export const EARTH_TILT = planets.find((p) => p.id === 'earth')!.tilt

/** World position of a cloud's centre this frame (matches what the cloud group uses). */
export function cloudCenter(cfg: CloudCfg, out: Vector3) {
  const c = positions.get(cfg.center)
  if (!c) return out.set(0, 0, 0)
  out.copy(c)
  if (cfg.id === 'l1' || cfg.id === 'l2') {
    const len = out.length() || 1
    out.multiplyScalar(1 + ((cfg.id === 'l2' ? 1 : -1) * L_POINT_OFFSET) / len)
  }
  return out
}

export const cloudTilt = (cfg: CloudCfg) => (cfg.id === 'earth' ? EARTH_TILT : 0)

const scratch = [0, 0, 0]
const centre = new Vector3()

/** World position of one catalog object at time `t` (seconds on the scene clock). */
export function rowWorld(cloud: CloudLayout, slot: number, t: number, out: Vector3) {
  positionAt(cloud.a[slot], cloud.e[slot], cloud.inc[slot], cloud.raan[slot], cloud.argp[slot], cloud.m0[slot], cloud.n[slot], t, scratch)
  const tilt = cloudTilt(cloud.cfg)
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  cloudCenter(cloud.cfg, centre)
  return out.set(
    centre.x + scratch[0] * ct - scratch[1] * st,
    centre.y + scratch[0] * st + scratch[1] * ct,
    centre.z + scratch[2],
  )
}
