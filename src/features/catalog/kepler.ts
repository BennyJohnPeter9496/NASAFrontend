export const TWO_PI = Math.PI * 2

/** Scene-clock seconds, updated every frame by the catalog scene, readable outside React. */
export const catalogClock = { t: 0 }

/** Orbit rotation + Kepler solve, kept identical to the GLSL in CatalogCloud so GPU and CPU agree. */
export function eccentricToPosition(
  a: number,
  e: number,
  inc: number,
  raan: number,
  argp: number,
  E: number,
  out: number[],
) {
  const xo = a * (Math.cos(E) - e)
  const yo = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const cw = Math.cos(argp)
  const sw = Math.sin(argp)
  const x1 = xo * cw - yo * sw
  const y1 = xo * sw + yo * cw
  const ci = Math.cos(inc)
  const si = Math.sin(inc)
  const y2 = y1 * ci
  const z2 = y1 * si
  const cO = Math.cos(raan)
  const sO = Math.sin(raan)
  // Orbital normal maps to scene +Y so the equatorial plane is XZ, like the planets' orbits.
  out[0] = x1 * cO - y2 * sO
  out[1] = z2
  out[2] = x1 * sO + y2 * cO
}

export const KEPLER_ITERATIONS = 7

export function positionAt(
  a: number,
  e: number,
  inc: number,
  raan: number,
  argp: number,
  m0: number,
  n: number,
  t: number,
  out: number[],
) {
  const M = (m0 + n * t) % TWO_PI
  let E = M + e * Math.sin(M)
  for (let i = 0; i < KEPLER_ITERATIONS; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  eccentricToPosition(a, e, inc, raan, argp, E, out)
}

/** Deterministic pseudo-random number in [0, 1) for an id and a stream index. */
export function hash01(id: number, k: number) {
  let h = Math.imul(id ^ Math.imul(k + 1, 0x9e3779b9), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
