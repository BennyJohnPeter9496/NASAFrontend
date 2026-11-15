import type { BodyDef } from '../types'
import positionsJson from './positions.json'

const tex = (name: string) => `${import.meta.env.BASE_URL}textures/${name}`

export const TEXTURES = {
  sun: tex('2k_sun.jpg'),
  moon: tex('moon_1024.jpg'),
  earth: {
    map: tex('earth_atmos_2048.jpg'),
    normalMap: tex('earth_normal_2048.jpg'),
    specularMap: tex('earth_specular_2048.jpg'),
    emissiveMap: tex('earth_lights_2048.png'),
    clouds: tex('earth_clouds_1024.png'),
  },
  saturnRing: tex('2k_saturn_ring_alpha.png'),
} as const

interface PlanetOpts {
  texture: string
  tiltDeg: number
  /** Radians per second; negative = retrograde. Stylised, not to scale. */
  spin: number
  atmosphere?: BodyDef['atmosphere']
  rings?: BodyDef['rings']
}

const TWO_PI = Math.PI * 2

/** Where each planet really is "today" (end of the timeline), so live mode starts from the true configuration. */
const todayAngle = (id: string) => {
  const keys = positionsJson.planets[id as keyof typeof positionsJson.planets]
  return ((keys[keys.length - 1] % TWO_PI) + TWO_PI) % TWO_PI
}

// Stylised, not to scale. speed = 2 / r^1.5 gives Kepler-like relative periods.
const planet = (
  id: string,
  name: string,
  radius: number,
  orbitRadius: number,
  color: string,
  o: PlanetOpts,
): BodyDef => ({
  id,
  name,
  radius,
  orbitRadius,
  phase: todayAngle(id),
  color,
  texture: o.texture,
  tilt: (o.tiltDeg * Math.PI) / 180,
  spin: o.spin,
  atmosphere: o.atmosphere,
  rings: o.rings,
  speed: 2 / Math.pow(orbitRadius, 1.5),
})

export const SUN_RADIUS = 3.5

export const planets: BodyDef[] = [
  planet('mercury', 'Mercury', 0.4, 6, '#a8a29e', { texture: tex('2k_mercury.jpg'), tiltDeg: 0.03, spin: 0.05 }),
  planet('venus', 'Venus', 0.8, 9, '#e3b878', {
    texture: tex('2k_venus_atmosphere.jpg'),
    tiltDeg: 177,
    spin: 0.03,
    atmosphere: { color: '#ffd9a0', intensity: 0.9 },
  }),
  planet('earth', 'Earth', 0.9, 12.5, '#3b82f6', {
    texture: TEXTURES.earth.map,
    tiltDeg: 23.4,
    spin: 0.35,
    atmosphere: { color: '#5aa7ff', intensity: 1.4 },
  }),
  planet('mars', 'Mars', 0.6, 17, '#c2512f', {
    texture: tex('2k_mars.jpg'),
    tiltDeg: 25.2,
    spin: 0.33,
    atmosphere: { color: '#e8a37a', intensity: 0.45 },
  }),
  planet('jupiter', 'Jupiter', 2.4, 25, '#d9a066', { texture: tex('2k_jupiter.jpg'), tiltDeg: 3.1, spin: 0.8 }),
  planet('saturn', 'Saturn', 1.8, 32, '#e6cf9a', {
    texture: tex('2k_saturn.jpg'),
    tiltDeg: 26.7,
    spin: 0.75,
    rings: { inner: 2.4, outer: 4.4 },
  }),
  planet('uranus', 'Uranus', 1.3, 38, '#7fd1d9', {
    texture: tex('2k_uranus.jpg'),
    tiltDeg: 97.8,
    spin: -0.5,
    atmosphere: { color: '#9fe6ee', intensity: 0.7 },
  }),
  planet('neptune', 'Neptune', 1.3, 44, '#4f6df0', {
    texture: tex('2k_neptune.jpg'),
    tiltDeg: 28.3,
    spin: 0.55,
    atmosphere: { color: '#5b7dff', intensity: 0.9 },
  }),
]

export const MOON = { id: 'moon', name: 'Moon', radius: 0.25, orbitRadius: 4.8, speed: 0.2 }
