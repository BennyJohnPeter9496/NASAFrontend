/**
 * Converts CelesTrak's satcat.csv into public/data/satcat.json.
 *
 *   node scripts/build-satcat.mjs [path/to/satcat.csv]
 *
 * Keeps every Earth-orbit object that has orbital elements and was in orbit at some point on or after
 * 1977 (the start of the time slider), including objects that have since decayed, so the sky at any past
 * date contains what was really up there. Also keeps every object whose ORBIT_CENTER is not Earth
 * (Moon, Mars, Venus, Sun, ...). Objects that decayed before 1977 are only counted.
 * Category counts cover the whole file.
 */
import fs from 'node:fs'
import path from 'node:path'

const input = process.argv[2] ?? 'satcat.csv'
const output = path.resolve('public/data/satcat.json')

// Order defines the bit position used in each row's `mask`. Keep in sync with src/features/catalog/categories.ts.
const CATEGORIES = [
  ['deadSat', (r) => r.OBJECT_TYPE === 'PAY' && r.OPS_STATUS_CODE === '-'],
  ['rocketBody', (r) => r.OBJECT_TYPE === 'R/B'],
  ['debris', (r) => r.OBJECT_TYPE === 'DEB'],
  ['unknown', (r) => r.OBJECT_TYPE === 'UNK'],
  ['inSpace', (r) => !r.DECAY_DATE && r.ORBIT_TYPE === 'ORB'],
  ['landed', (r) => r.ORBIT_TYPE === 'LAN'],
  ['impacted', (r) => r.ORBIT_TYPE === 'IMP'],
  ['moon', (r) => r.ORBIT_CENTER === 'MO'],
  ['mars', (r) => r.ORBIT_CENTER === 'MA'],
  ['solar', (r) => r.ORBIT_CENTER === 'SU'],
  ['escaped', (r) => r.ORBIT_CENTER === 'SS'],
]

const TYPES = { PAY: 0, 'R/B': 1, DEB: 2, UNK: 3 }
const EARTH_CENTERS = new Set(['EA', '25544', '48274'])

const text = fs.readFileSync(input, 'utf8')
const [head, ...lines] = text.split(/\r?\n/).filter(Boolean)
const cols = head.split(',')

// SATCAT names never contain commas or quotes in this export, but handle quotes defensively.
function parse(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return Object.fromEntries(cols.map((c, i) => [c, out[i] ?? '']))
}

const num = (v, digits) => (v === '' || Number.isNaN(Number(v)) ? -1 : Number(Number(v).toFixed(digits)))

/** Fractional year for a YYYY-MM-DD date, or `fallback` when blank. */
const toYear = (s, fallback) => {
  if (!s) return fallback
  const [y, m, d] = s.split('-').map(Number)
  const start = Date.UTC(y, 0, 1)
  return Number((y + (Date.UTC(y, (m || 1) - 1, d || 1) - start) / (365.25 * 86400000)).toFixed(3))
}
const SLIDER_START = 1977

const counts = Object.fromEntries(CATEGORIES.map(([id]) => [id, 0]))
const col = {
  id: [], name: [], type: [], ops: [], owner: [], launch: [], decay: [], center: [], otype: [],
  period: [], inc: [], apo: [], peri: [], launchY: [], decayY: [], mask: [],
}

let total = 0
let skippedNoElements = 0
let skippedBeforeSlider = 0
for (const line of lines) {
  const r = parse(line)
  total++
  let mask = 0
  CATEGORIES.forEach(([id, test], bit) => {
    if (test(r)) {
      counts[id]++
      mask |= 1 << bit
    }
  })

  const earth = EARTH_CENTERS.has(r.ORBIT_CENTER)
  const hasElements = r.PERIOD !== '' && r.INCLINATION !== '' && r.APOGEE !== '' && r.PERIGEE !== ''
  const decayY = toYear(r.DECAY_DATE, 9999)
  let keep = true
  if (earth) {
    if (!hasElements) {
      if (!r.DECAY_DATE && r.ORBIT_TYPE === 'ORB') skippedNoElements++
      keep = false
    } else if (decayY < SLIDER_START) {
      skippedBeforeSlider++
      keep = false
    }
  }
  if (!keep) continue

  col.id.push(Number(r.NORAD_CAT_ID))
  col.name.push(r.OBJECT_NAME)
  col.type.push(TYPES[r.OBJECT_TYPE] ?? 3)
  col.ops.push(r.OPS_STATUS_CODE)
  col.owner.push(r.OWNER)
  col.launch.push(r.LAUNCH_DATE)
  col.decay.push(r.DECAY_DATE)
  col.center.push(r.ORBIT_CENTER)
  col.otype.push(r.ORBIT_TYPE)
  col.period.push(num(r.PERIOD, 2))
  col.inc.push(num(r.INCLINATION, 1))
  col.apo.push(num(r.APOGEE, 0))
  col.peri.push(num(r.PERIGEE, 0))
  col.launchY.push(toYear(r.LAUNCH_DATE, 1900))
  col.decayY.push(decayY)
  col.mask.push(mask)
}

const result = {
  source: 'CelesTrak SATCAT (satcat.csv)',
  categories: CATEGORIES.map(([id]) => id),
  totalInFile: total,
  counts,
  stored: col.id.length,
  earthOrbitWithoutElements: skippedNoElements,
  decayedBeforeSliderStart: skippedBeforeSlider,
  cols: col,
}

fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, JSON.stringify(result))
console.log(`Read ${total} rows, stored ${col.id.length} -> ${output} (${(fs.statSync(output).size / 1e6).toFixed(2)} MB)`)
console.log('Category counts (whole file):', counts)
console.log('Earth-orbit objects without orbital elements (not drawn):', skippedNoElements)
console.log(`Decayed before ${SLIDER_START} (counted only):`, skippedBeforeSlider)
