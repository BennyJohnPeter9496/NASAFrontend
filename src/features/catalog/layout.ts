import featuredJson from '../../data/featured.json'
import { END_YEAR } from '../../lib/simTime'
import type { ModelName } from '../../models/spacecraft'
import { TYPE_COLOR } from './categories'
import { TWO_PI, hash01 } from './kepler'

export interface CatalogData {
  source: string
  totalInFile: number
  counts: Record<string, number>
  stored: number
  earthOrbitWithoutElements: number
  cols: {
    id: number[]
    name: string[]
    type: number[]
    ops: string[]
    owner: string[]
    launch: string[]
    decay: string[]
    center: string[]
    otype: string[]
    period: number[]
    inc: number[]
    apo: number[]
    peri: number[]
    launchY: number[]
    decayY: number[]
    mask: number[]
  }
}

export type CloudId = 'earth' | 'moon' | 'mars' | 'venus' | 'jupiter' | 'sun' | 'l1' | 'l2'

export interface CloudCfg {
  id: CloudId
  /** Position id in the scene's `positions` map that the cloud orbits. */
  center: string
  /** ORBIT_CENTER codes from SATCAT that belong to this cloud. */
  centers: string[]
  radiusKm: number
  /** Scene radius of the central body. */
  radiusScene: number
  /** True when SATCAT has no orbital elements and positions are illustrative. */
  schematic: boolean
  /** Camera distance range (scene units) over which the dots fade out. */
  fade: [number, number]
  label: string
  /** 3D models replace dots closer than `near` to the camera. Omitted for clouds that stay dots. */
  models?: { near: number; scale: number }
}

export const CLOUDS: CloudCfg[] = [
  { id: 'earth', center: 'earth', centers: ['EA', '25544', '48274'], radiusKm: 6371, radiusScene: 0.9, schematic: false, fade: [35, 80], label: 'Earth orbit', models: { near: 2.0, scale: 0.026 } },
  { id: 'moon', center: 'moon', centers: ['MO'], radiusKm: 1737, radiusScene: 0.25, schematic: true, fade: [10, 30], label: 'Lunar orbit', models: { near: 1.2, scale: 0.022 } },
  { id: 'mars', center: 'mars', centers: ['MA'], radiusKm: 3390, radiusScene: 0.6, schematic: true, fade: [14, 40], label: 'Mars orbit', models: { near: 1.6, scale: 0.03 } },
  { id: 'venus', center: 'venus', centers: ['VE'], radiusKm: 6052, radiusScene: 0.8, schematic: true, fade: [14, 40], label: 'Venus orbit', models: { near: 1.6, scale: 0.03 } },
  { id: 'jupiter', center: 'jupiter', centers: ['JU'], radiusKm: 69911, radiusScene: 2.4, schematic: true, fade: [30, 80], label: 'Jupiter orbit', models: { near: 3, scale: 0.06 } },
  { id: 'sun', center: 'sun', centers: ['SU'], radiusKm: 695700, radiusScene: 3.5, schematic: true, fade: [400, 800], label: 'Solar orbit' },
  { id: 'l1', center: 'earth', centers: ['EL1'], radiusKm: 6371, radiusScene: 0.9, schematic: true, fade: [35, 80], label: 'Sun-Earth L1', models: { near: 2.4, scale: 0.05 } },
  { id: 'l2', center: 'earth', centers: ['EL2'], radiusKm: 6371, radiusScene: 0.9, schematic: true, fade: [35, 80], label: 'Sun-Earth L2', models: { near: 2.4, scale: 0.05 } },
]

export const L_POINT_OFFSET = 2.6

export interface FeaturedDef {
  noradId: number
  label: string
  model: ModelName
  size: number
}

export const FEATURED = featuredJson as unknown as FeaturedDef[]

/** Instanced model kind: 0 satellite, 1 Starlink-style flat panel, 2 rocket body, 3 debris. */
export function kindOf(type: number, name: string): 0 | 1 | 2 | 3 {
  if (type === 1) return 2
  if (type === 2 || type === 3) return 3
  return name.startsWith('STARLINK') ? 1 : 0
}

export const HERO_MODEL: ModelName[] = ['generic', 'starlink', 'rocketBody', 'debris']

export interface CloudLayout {
  cfg: CloudCfg
  /** Row index in the catalog columns for each point. */
  rows: Int32Array
  a: Float32Array
  e: Float32Array
  inc: Float32Array
  raan: Float32Array
  argp: Float32Array
  m0: Float32Array
  n: Float32Array
  mask: Float32Array
  color: Float32Array
  /** Launch year as seen by the GPU. Featured objects get a far-future value so they are not drawn as dots/instances. */
  launchGpu: Float32Array
  launchY: Float32Array
  decayY: Float32Array
  kind: Uint8Array
  phase: Float32Array
}

export interface FeaturedEntry {
  def: FeaturedDef
  row: number
  cloud: number
  slot: number
}

export interface Layout {
  clouds: CloudLayout[]
  /** For each catalog row: index into `clouds`, or -1 when not drawn. */
  rowCloud: Int8Array
  rowSlot: Int32Array
  /** Number of objects in orbit today, per category bit. */
  drawnByBit: number[]
  featured: FeaturedEntry[]
}

const EARTH_TIME_SCALE = 600
const SCHEMATIC_OMEGA = 0.7
const NEVER = 1e9

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)

function rowColor(type: number, ops: string): number[] {
  if (type === 1) return hex(TYPE_COLOR.rocket)
  if (type === 2) return hex(TYPE_COLOR.debris)
  if (type === 3) return hex(TYPE_COLOR.unknown)
  return hex(ops === '-' ? TYPE_COLOR.dead : TYPE_COLOR.alive)
}

/** Stylised altitude compression: LEO hugs the planet, GEO and beyond fan out, all within a few scene units. */
const mapRadius = (rKm: number, cfg: CloudCfg) => cfg.radiusScene * (1.1 + Math.log(Math.min(Math.max(rKm / cfg.radiusKm, 1), 3000)))

/** Whether a drawn object exists at `year`: launched, and not yet decayed. */
export const aliveAt = (c: CloudLayout, slot: number, year: number) => year >= c.launchGpu[slot] && year < c.decayY[slot]

export function buildLayout(data: CatalogData): Layout {
  const c = data.cols
  const n = c.id.length
  const rowCloud = new Int8Array(n).fill(-1)
  const rowSlot = new Int32Array(n).fill(-1)
  const perCloud: number[][] = CLOUDS.map(() => [])
  const featuredIds = new Map(FEATURED.map((f) => [f.noradId, f]))

  for (let i = 0; i < n; i++) {
    const ci = CLOUDS.findIndex((cfg) => cfg.centers.includes(c.center[i]))
    if (ci < 0) continue
    const cfg = CLOUDS[ci]
    // Earth rows were stored with their elements (decayed ones too); everything else needs to be in orbit.
    if (cfg.id === 'earth' ? c.otype[i] !== 'ORB' && c.otype[i] !== 'IMP' : c.otype[i] !== 'ORB' || c.decay[i]) continue
    perCloud[ci].push(i)
  }

  const drawnByBit = new Array(11).fill(0)
  const featured: FeaturedEntry[] = []

  const clouds: CloudLayout[] = CLOUDS.map((cfg, ci) => {
    const rows = Int32Array.from(perCloud[ci])
    const m = rows.length
    const L: CloudLayout = {
      cfg,
      rows,
      a: new Float32Array(m),
      e: new Float32Array(m),
      inc: new Float32Array(m),
      raan: new Float32Array(m),
      argp: new Float32Array(m),
      m0: new Float32Array(m),
      n: new Float32Array(m),
      mask: new Float32Array(m),
      color: new Float32Array(m * 3),
      launchGpu: new Float32Array(m),
      launchY: new Float32Array(m),
      decayY: new Float32Array(m),
      kind: new Uint8Array(m),
      phase: new Float32Array(m),
    }
    for (let s = 0; s < m; s++) {
      const i = rows[s]
      const id = c.id[i]
      rowCloud[i] = ci
      rowSlot[i] = s
      L.raan[s] = hash01(id, 1) * TWO_PI
      L.argp[s] = hash01(id, 2) * TWO_PI
      L.m0[s] = hash01(id, 3) * TWO_PI
      L.phase[s] = hash01(id, 7) * TWO_PI
      L.mask[s] = c.mask[i]
      L.color.set(rowColor(c.type[i], c.ops[i]), s * 3)
      L.launchY[s] = c.launchY[i]
      L.decayY[s] = c.decayY[i]
      L.kind[s] = kindOf(c.type[i], c.name[i])

      const def = featuredIds.get(id)
      if (def) featured.push({ def, row: i, cloud: ci, slot: s })
      L.launchGpu[s] = def ? NEVER : c.launchY[i]

      if (END_YEAR >= c.launchY[i] && END_YEAR < c.decayY[i]) {
        for (let b = 0; b < 11; b++) if (c.mask[i] & (1 << b)) drawnByBit[b]++
      }

      if (!cfg.schematic) {
        const rp = mapRadius(cfg.radiusKm + Math.max(0, c.peri[i]), cfg)
        const ra = mapRadius(cfg.radiusKm + Math.max(c.apo[i], c.peri[i], 0), cfg)
        L.a[s] = (rp + ra) / 2
        L.e[s] = Math.min((ra - rp) / (ra + rp), 0.92)
        L.inc[s] = (c.inc[i] * Math.PI) / 180
        L.n[s] = (TWO_PI / (Math.max(c.period[i], 1) * 60)) * EARTH_TIME_SCALE
      } else if (cfg.id === 'sun') {
        // Illustrative: leftover hardware near Earth's orbit, which is where most solar-orbit stages end up.
        const au = 0.75 + hash01(id, 4) * 0.85
        L.a[s] = 12.5 * Math.pow(au, 0.37)
        L.e[s] = 0.02 + hash01(id, 5) * 0.1
        L.inc[s] = ((hash01(id, 6) - 0.5) * 12 * Math.PI) / 180
        L.n[s] = 2 / Math.pow(L.a[s], 1.5)
      } else {
        const isL = cfg.id === 'l1' || cfg.id === 'l2'
        L.a[s] = isL ? 0.25 + hash01(id, 4) * 0.35 : cfg.radiusScene * (1.5 + hash01(id, 4) * 2.4)
        L.e[s] = 0.03 + hash01(id, 5) * 0.25
        L.inc[s] = Math.acos(1 - 2 * hash01(id, 6))
        L.n[s] = SCHEMATIC_OMEGA * Math.pow(cfg.radiusScene / L.a[s], 1.5)
      }
    }
    return L
  })

  return { clouds, rowCloud, rowSlot, drawnByBit, featured }
}
