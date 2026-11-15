import { CATEGORIES, OPS_LABEL, OWNER_LABEL, TYPE_LABEL } from './categories'
import type { CatalogData } from './layout'
import type { Mode } from '../../types'

const R_EARTH = 6371
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

export const CENTER_LABEL: Record<string, string> = {
  EA: 'Earth', '25544': 'Earth', '48274': 'Earth', MO: 'the Moon', MA: 'Mars', VE: 'Venus', JU: 'Jupiter',
  SU: 'the Sun', EM: 'the Earth-Moon system', EL1: 'the Sun-Earth L1 point', EL2: 'the Sun-Earth L2 point',
  SS: 'interstellar space', SA: 'Saturn', ME: 'Mercury', AS: 'an asteroid',
}

export interface RowInfo {
  id: number
  name: string
  type: number
  typeLabel: string
  ops: string
  opsLabel: string
  owner: string
  who: string
  launch: string
  year: string
  center: string
  centerLabel: string
  otype: string
  period: number
  inc: number
  apo: number
  peri: number
  categories: string[]
  hasElements: boolean
  decay: string
  decayed: boolean
}

export function rowInfo(d: CatalogData, i: number): RowInfo {
  const c = d.cols
  const mask = c.mask[i]
  return {
    decay: c.decay[i],
    decayed: !!c.decay[i],
    id: c.id[i],
    name: c.name[i],
    type: c.type[i],
    typeLabel: TYPE_LABEL[c.type[i]],
    ops: c.ops[i],
    opsLabel: OPS_LABEL[c.ops[i]] ?? 'Unknown',
    owner: c.owner[i],
    who: OWNER_LABEL[c.owner[i]] ?? c.owner[i],
    launch: c.launch[i],
    year: c.launch[i].slice(0, 4),
    center: c.center[i],
    centerLabel: CENTER_LABEL[c.center[i]] ?? c.center[i],
    otype: c.otype[i],
    period: c.period[i],
    inc: c.inc[i],
    apo: c.apo[i],
    peri: c.peri[i],
    categories: CATEGORIES.filter((k) => mask & (1 << k.bit)).map((k) => k.label),
    hasElements: c.period[i] > 0 && c.apo[i] >= 0 && c.peri[i] >= 0,
  }
}

function orbitClass(r: RowInfo) {
  const ra = R_EARTH + r.apo
  const rp = R_EARTH + r.peri
  const e = (ra - rp) / (ra + rp)
  if (e > 0.25) return `highly elliptical orbit (eccentricity ${e.toFixed(2)})`
  if (r.apo < 2000) return 'low Earth orbit'
  if (r.peri > 35000 && r.apo < 36600) return 'geostationary-type orbit'
  if (r.apo > 36600) return 'high Earth orbit'
  return 'medium Earth orbit'
}

const TYPE_SHORT = ['payload', 'rocket body', 'debris fragment', 'unknown object']

export function describe(r: RowInfo, mode: Mode): string {
  const where = r.centerLabel
  const band = r.hasElements && fmt(r.peri) === fmt(r.apo) ? `at about ${fmt(r.apo)} km` : `between ${fmt(r.peri)} and ${fmt(r.apo)} km`
  const orbit = r.hasElements
    ? `${r.decayed ? 'In its last known orbit it went' : 'It goes'} around ${where} once every ${Math.round(r.period).toLocaleString('en-US')} minutes, ${band} above the surface, tilted ${r.inc.toFixed(1)} degrees from the equator.`
    : ''
  const year = r.year || 'an unknown year'
  const fate = r.decay ? ` It decayed out of orbit on ${r.decay}.` : ''

  if (mode === 'student') {
    return `${r.name} (${TYPE_SHORT[r.type]}) was launched in ${year} by ${r.who}. Status: ${r.opsLabel.toLowerCase()}. ${orbit}${fate}`.trim()
  }

  const extra = r.hasElements
    ? ` Orbit class: ${orbitClass(r)}.`
    : ` SATCAT lists ${where} as its orbit centre but gives no orbital elements.`
  return `${r.name}, NORAD catalog number ${r.id}. ${r.typeLabel} launched ${r.launch || 'on an unknown date'} by ${r.owner || 'unknown'}. Ops status code "${r.ops || '?'}" (${r.opsLabel.toLowerCase()}); orbit type ${r.otype}, centre ${r.center}. ${orbit}${extra}${fate}`.replace(/\s+/g, ' ').trim()
}
