/**
 * Precomputes src/data/positions.json for the time slider.
 *
 *   node scripts/build-positions.mjs
 *
 * - Planets: heliocentric mean longitude (JPL J2000 mean elements), stored UNWRAPPED at yearly keyframes, so
 *   linear interpolation between keyframes reproduces constant-rate motion exactly.
 * - Probes: waypoints at launch, planetary flybys and a final resting position (taken from objects.json),
 *   interpolated linearly. Planet positions use the same stylised orbit radii as the 3D scene.
 */
import fs from 'node:fs'
import path from 'node:path'

const START = 1977
const END = 2026.87 // "today" for the demo: 14 Nov 2026

// Keep in sync with src/data/bodies.ts (checked by src/data/data.test.ts).
const BODIES = {
  mercury: { orbit: 6, radius: 0.4, L0: 252.25084, rate: 149472.67411175 },
  venus: { orbit: 9, radius: 0.8, L0: 181.97973, rate: 58517.81538729 },
  earth: { orbit: 12.5, radius: 0.9, L0: 100.46435, rate: 35999.37306329 },
  mars: { orbit: 17, radius: 0.6, L0: 355.44657, rate: 19140.29934243 },
  jupiter: { orbit: 25, radius: 2.4, L0: 34.39644, rate: 3034.74612775 },
  saturn: { orbit: 32, radius: 1.8, L0: 49.95424, rate: 1222.49362201 },
  uranus: { orbit: 38, radius: 1.3, L0: 313.23810, rate: 428.48202785 },
  neptune: { orbit: 44, radius: 1.3, L0: 304.87997, rate: 218.45945325 },
}

const angle = (id, year) => {
  const b = BODIES[id]
  const centuries = (year - 2000) / 100
  return ((b.L0 + b.rate * centuries) * Math.PI) / 180
}

const planetPos = (id, year) => {
  const a = angle(id, year)
  const b = BODIES[id]
  // Lift the probe above the planet so it doesn't sit inside the sphere.
  return [Math.cos(a) * b.orbit, b.radius * 1.8, Math.sin(a) * b.orbit]
}

const keyYears = []
for (let y = START; y < END; y++) keyYears.push(y)
keyYears.push(END)

const planets = Object.fromEntries(
  Object.keys(BODIES).map((id) => [id, keyYears.map((y) => Number(angle(id, y).toFixed(4)))]),
)

const objectsJson = JSON.parse(fs.readFileSync(path.resolve('src/data/objects.json'), 'utf8'))
const final = (id) => objectsJson.find((o) => o.id === id).position

const r = (v) => v.map((n) => Number(n.toFixed(3)))
const key = (year, pos) => [Number(year.toFixed(2)), ...r(pos)]

const free = {
  'voyager-1': [
    [1977.68, planetPos('earth', 1977.68)],
    [1979.18, planetPos('jupiter', 1979.18)],
    [1980.87, planetPos('saturn', 1980.87)],
    [END, final('voyager-1')],
  ],
  'voyager-2': [
    [1977.64, planetPos('earth', 1977.64)],
    [1979.52, planetPos('jupiter', 1979.52)],
    [1981.65, planetPos('saturn', 1981.65)],
    [1986.07, planetPos('uranus', 1986.07)],
    [1989.65, planetPos('neptune', 1989.65)],
    [END, final('voyager-2')],
  ],
  'pioneer-10': [
    [1972.17, planetPos('earth', 1972.17)],
    [1973.92, planetPos('jupiter', 1973.92)],
    [END, final('pioneer-10')],
  ],
  'new-horizons': [
    [2006.05, planetPos('earth', 2006.05)],
    [2007.16, planetPos('jupiter', 2007.16)],
    [END, final('new-horizons')],
  ],
}

const objects = Object.fromEntries(
  Object.entries(free).map(([id, pts]) => [id, { from: pts[0][0], keys: pts.map(([y, p]) => key(y, p)) }]),
)

// Objects that live at a planet/moon appear on arrival (orbit insertion or landing).
const anchoredFrom = {
  cassini: 2004.5,
  opportunity: 2004.07,
  curiosity: 2012.6,
  perseverance: 2021.14,
  ingenuity: 2021.25,
}

const out = { startYear: START, endYear: END, keyYears, planets, objects, anchoredFrom }
const file = path.resolve('src/data/positions.json')
fs.writeFileSync(file, JSON.stringify(out))
console.log(`Wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(1)} KB), ${keyYears.length} keyframes`)
