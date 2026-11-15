import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { BufferGeometry, Material, Object3D } from 'three'
import { getMaterials } from './materials'

/**
 * Procedural spacecraft. Every model is about 1 unit across, faces +Z (dish / front) with +Y up,
 * and returns an `update` callback for its animation (solar arrays, rotors, mast pan, spin...).
 */
export interface ModelHandle {
  object: Group
  update?: (t: number, dt: number) => void
}

type V3 = [number, number, number]

const mesh = (geo: BufferGeometry, mat: Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) => {
  const m = new Mesh(geo, mat)
  m.position.set(...pos)
  m.rotation.set(...rot)
  return m
}
const box = (w: number, h: number, d: number, mat: Material, pos?: V3, rot?: V3) => mesh(new BoxGeometry(w, h, d), mat, pos, rot)
const cyl = (rt: number, rb: number, h: number, seg: number, mat: Material, pos?: V3, rot?: V3) =>
  mesh(new CylinderGeometry(rt, rb, h, seg), mat, pos, rot)
const ball = (r: number, mat: Material, pos?: V3, seg = 16) => mesh(new SphereGeometry(r, seg, seg), mat, pos)

/** Cylinder between two points (struts, booms, legs). */
function strut(a: V3, b: V3, r: number, mat: Material, seg = 6) {
  const from = new Vector3(...a)
  const to = new Vector3(...b)
  const dir = to.clone().sub(from)
  const m = new Mesh(new CylinderGeometry(r, r, dir.length(), seg), mat)
  m.position.copy(from.clone().add(to).multiplyScalar(0.5))
  m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()))
  return m
}

/** Parabolic dish opening towards +Z. */
function dish(radius: number, depth: number, mat: Material, pos: V3 = [0, 0, 0]) {
  const pts: Vector2[] = []
  for (let i = 0; i <= 14; i++) {
    const r = (radius * i) / 14
    pts.push(new Vector2(r, depth * (r / radius) ** 2))
  }
  const geo = new LatheGeometry(pts, 36)
  geo.rotateX(Math.PI / 2)
  return mesh(geo, mat, pos)
}

/** Feed horn on three struts above a dish. */
function feed(radius: number, depth: number, height: number, g: Group, z0: number) {
  const m = getMaterials()
  const tip: V3 = [0, 0, z0 + depth + height]
  g.add(cyl(0.012, 0.016, 0.05, 10, m.silver, [tip[0], tip[1], tip[2]], [Math.PI / 2, 0, 0]))
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5
    g.add(strut([Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92, z0 + depth], [0, 0, tip[2]], 0.004, m.silver, 4))
  }
}

const rtgStack = (g: Group, x0: number, dx: number, n: number, y = 0, z = 0) => {
  const m = getMaterials()
  for (let i = 0; i < n; i++) {
    const x = x0 + dx * i
    g.add(cyl(0.028, 0.028, 0.1, 12, m.rtg, [x, y, z], [0, 0, Math.PI / 2]))
    for (const o of [-0.03, 0, 0.03]) g.add(cyl(0.034, 0.034, 0.008, 12, m.silver, [x + o, y, z], [0, 0, Math.PI / 2]))
  }
}

function wrap(root: Group) {
  const spin = new Group()
  root.add(spin)
  return spin
}

export function voyager(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(cyl(0.13, 0.13, 0.1, 10, m.silver, [0, 0, 0], [Math.PI / 2, 0, 0]))
  g.add(dish(0.32, 0.09, m.dish, [0, 0, 0.05]))
  feed(0.32, 0.09, 0.05, g, 0.05)
  g.add(box(0.4, 0.02, 0.02, m.dark, [-0.33, 0, 0]))
  rtgStack(g, -0.3, -0.11, 3)
  g.add(box(0.3, 0.02, 0.02, m.dark, [0.28, -0.03, -0.02]))
  const platform = new Group()
  platform.position.set(0.46, -0.03, -0.02)
  platform.add(box(0.1, 0.06, 0.06, m.silver))
  platform.add(cyl(0.018, 0.018, 0.1, 10, m.black, [0.02, 0, 0.07], [Math.PI / 2, 0, 0]))
  platform.add(cyl(0.012, 0.012, 0.08, 10, m.black, [-0.02, 0.02, 0.06], [Math.PI / 2, 0, 0]))
  g.add(platform)
  g.add(cyl(0.006, 0.006, 0.9, 6, m.silver, [0, 0.02, -0.5], [Math.PI / 2, 0, 0]))
  g.add(ball(0.014, m.dark, [0, 0.02, -0.95]))
  g.add(strut([0.1, 0.04, -0.05], [0.5, 0.36, -0.2], 0.004, m.silver, 4))
  g.add(strut([0.1, 0.04, -0.05], [0.5, -0.3, -0.2], 0.004, m.silver, 4))
  g.add(cyl(0.04, 0.04, 0.008, 18, m.foil, [0.14, 0.02, 0.0], [0, 0, Math.PI / 2]))
  return { object: root, update: (t) => { platform.rotation.x = Math.sin(t * 0.6) * 0.5 } }
}

export function pioneer(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(dish(0.4, 0.1, m.dish, [0, 0, 0.05]))
  feed(0.4, 0.1, 0.07, g, 0.05)
  g.add(cyl(0.11, 0.11, 0.12, 6, m.silver, [0, 0, -0.02], [Math.PI / 2, 0, 0]))
  for (const s of [-1, 1]) {
    g.add(strut([s * 0.1, 0, -0.02], [s * 0.5, 0, -0.08], 0.006, m.dark))
    g.add(cyl(0.03, 0.03, 0.14, 12, m.rtg, [s * 0.4, 0, -0.07], [0, 0, Math.PI / 2]))
    g.add(cyl(0.03, 0.03, 0.14, 12, m.rtg, [s * 0.56, 0, -0.09], [0, 0, Math.PI / 2]))
  }
  g.add(strut([0, 0.1, -0.05], [0, 0.45, -0.1], 0.006, m.dark))
  g.add(box(0.05, 0.05, 0.04, m.silver, [0, 0.47, -0.1]))
  g.add(box(0.07, 0.045, 0.004, m.foil, [0.16, 0.12, 0.08]))
  return { object: root, update: (t) => { g.rotation.z = t * 0.9 } }
}

export function newHorizons(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(cyl(0.17, 0.17, 0.22, 3, m.foil, [0, 0, 0], [Math.PI / 2, Math.PI / 2, 0]))
  g.add(dish(0.27, 0.075, m.dish, [0, 0, 0.11]))
  feed(0.27, 0.075, 0.06, g, 0.11)
  g.add(cyl(0.036, 0.036, 0.34, 14, m.rtg, [0, -0.3, -0.08], [Math.PI / 2, 0, 0]))
  for (let i = 0; i < 5; i++) g.add(cyl(0.044, 0.044, 0.01, 14, m.silver, [0, -0.3, -0.2 + i * 0.07], [Math.PI / 2, 0, 0]))
  g.add(strut([0, -0.13, -0.05], [0, -0.28, -0.08], 0.01, m.dark))
  g.add(cyl(0.03, 0.03, 0.14, 12, m.black, [0.1, -0.1, 0.0], [Math.PI / 2, 0, 0]))
  g.add(box(0.06, 0.06, 0.06, m.silver, [-0.1, -0.1, 0.0]))
  return { object: root, update: (t) => { g.rotation.z = t * 0.55 } }
}

export function cassini(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(cyl(0.13, 0.13, 0.45, 20, m.silver, [0, 0, 0], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.136, 0.136, 0.12, 20, m.foil, [0, 0, -0.12], [Math.PI / 2, 0, 0]))
  g.add(dish(0.38, 0.12, m.dish, [0, 0, 0.225]))
  feed(0.38, 0.12, 0.06, g, 0.225)
  g.add(cyl(0.012, 0.012, 0.5, 8, m.silver, [0, 0.12, 0.5], [Math.PI / 2, 0, 0]))
  const huygens = cyl(0.12, 0.05, 0.07, 22, m.orange, [0.2, 0, -0.05], [0, 0, Math.PI / 2])
  g.add(huygens)
  g.add(strut([0, 0.13, 0.0], [0, 0.9, -0.05], 0.007, m.silver))
  g.add(box(0.05, 0.05, 0.04, m.dark, [0, 0.92, -0.05]))
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3
    g.add(cyl(0.032, 0.032, 0.2, 12, m.rtg, [Math.cos(a) * 0.16, Math.sin(a) * 0.16, -0.32], [Math.PI / 2, 0, 0]))
    g.add(strut([Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.26], [Math.cos(a + Math.PI) * 0.6, Math.sin(a + Math.PI) * 0.6, -0.4], 0.005, m.silver, 4))
  }
  g.add(cyl(0.015, 0.055, 0.12, 14, m.dark, [0, 0, -0.45], [Math.PI / 2, 0, 0]))
  return { object: root, update: (t) => { g.rotation.z = t * 0.12 } }
}

type RoverKind = 'curiosity' | 'perseverance' | 'opportunity'

/** Six-wheeled rover on a rocker-bogie suspension. Front is +Z. */
export function rover(kind: RoverKind): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  const body = kind === 'perseverance' ? m.white : m.rover
  g.add(box(0.38, 0.14, 0.52, body, [0, 0.2, 0]))
  if (kind === 'opportunity') {
    g.add(box(0.46, 0.012, 0.56, m.panel, [0, 0.285, 0]))
  } else {
    g.add(box(0.42, 0.016, 0.58, m.silver, [0, 0.285, 0]))
    g.add(cyl(0.04, 0.04, 0.22, 12, m.rtg, [0, 0.33, -0.36], [Math.PI / 2 - 0.45, 0, 0]))
    for (let i = 0; i < 4; i++) g.add(cyl(0.048, 0.048, 0.01, 12, m.silver, [0, 0.33 - i * 0.012, -0.3 - i * 0.045], [Math.PI / 2 - 0.45, 0, 0]))
  }
  for (const s of [-1, 1]) {
    g.add(box(0.02, 0.02, 0.56, m.dark, [s * 0.25, 0.15, 0]))
    g.add(strut([s * 0.25, 0.15, 0.22], [s * 0.27, 0.07, 0.3], 0.01, m.dark, 5))
    g.add(strut([s * 0.25, 0.15, -0.22], [s * 0.27, 0.07, -0.3], 0.01, m.dark, 5))
    for (const z of [-0.3, 0, 0.3]) {
      const w = cyl(0.085, 0.085, 0.07, 18, m.wheel, [s * 0.29, 0.085, z], [0, 0, Math.PI / 2])
      g.add(w)
      g.add(cyl(0.03, 0.03, 0.075, 8, m.silver, [s * 0.29, 0.085, z], [0, 0, Math.PI / 2]))
    }
  }
  g.add(box(0.03, 0.3, 0.03, m.silver, [-0.12, 0.44, 0.17]))
  const head = new Group()
  head.position.set(-0.12, 0.6, 0.17)
  head.add(box(0.16, 0.07, 0.07, kind === 'perseverance' ? m.white : m.silver))
  head.add(cyl(0.02, 0.02, 0.06, 10, m.black, [-0.05, 0, 0.06], [Math.PI / 2, 0, 0]))
  head.add(cyl(0.02, 0.02, 0.06, 10, m.black, [0.05, 0, 0.06], [Math.PI / 2, 0, 0]))
  g.add(head)
  const arm = new Group()
  arm.position.set(0.1, 0.22, 0.27)
  if (kind !== 'opportunity') {
    arm.add(box(0.03, 0.03, 0.2, m.dark, [0, 0, 0.1]))
    arm.add(box(0.03, 0.03, 0.14, m.dark, [0, -0.04, 0.24], [0.5, 0, 0]))
    arm.add(cyl(0.06, 0.06, 0.06, 14, m.black, [0, -0.1, 0.3], [Math.PI / 2, 0, 0]))
  } else {
    arm.add(box(0.025, 0.025, 0.14, m.dark, [0, -0.02, 0.07]))
    arm.add(cyl(0.03, 0.03, 0.04, 10, m.black, [0, -0.05, 0.15], [Math.PI / 2, 0, 0]))
  }
  g.add(arm)
  g.add(strut([0.2, 0.3, 0.1], [0.28, 0.5, 0.0], 0.006, m.silver, 4))
  return {
    object: root,
    update: (t) => {
      head.rotation.y = Math.sin(t * 0.7) * 0.9
      arm.rotation.x = Math.sin(t * 0.5) * 0.12
    },
  }
}

export function ingenuity(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(box(0.11, 0.11, 0.11, m.white, [0, 0.3, 0]))
  g.add(box(0.2, 0.012, 0.2, m.panel, [0, 0.4, 0]))
  g.add(cyl(0.008, 0.008, 0.14, 8, m.silver, [0, 0.47, 0]))
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
    g.add(strut([sx * 0.05, 0.26, sz * 0.05], [sx * 0.17, 0.03, sz * 0.17], 0.006, m.silver, 5))
    g.add(cyl(0.025, 0.025, 0.008, 10, m.dark, [sx * 0.17, 0.02, sz * 0.17]))
  }
  const upper = new Group()
  upper.position.y = 0.55
  upper.add(box(0.62, 0.004, 0.04, m.blade))
  const lower = new Group()
  lower.position.y = 0.5
  lower.add(box(0.62, 0.004, 0.04, m.blade))
  g.add(upper, lower)
  g.add(cyl(0.02, 0.02, 0.05, 10, m.silver, [0, 0.52, 0]))
  return {
    object: root,
    update: (t) => {
      upper.rotation.y = t * 40
      lower.rotation.y = -t * 40 + 0.8
      g.position.y = 0.1 + Math.sin(t * 2.2) * 0.04
      g.rotation.z = Math.sin(t * 1.3) * 0.04
    },
  }
}

/** Apollo lunar module with a flag. */
export function lander(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(cyl(0.17, 0.17, 0.1, 8, m.foil, [0, 0.19, 0]))
  g.add(cyl(0.02, 0.06, 0.08, 14, m.dark, [0, 0.1, 0]))
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const cx = Math.cos(a)
    const cz = Math.sin(a)
    g.add(strut([cx * 0.12, 0.2, cz * 0.12], [cx * 0.34, 0.02, cz * 0.34], 0.012, m.silver, 6))
    g.add(strut([cx * 0.2, 0.19, cz * 0.2], [cx * 0.31, 0.07, cz * 0.31], 0.006, m.silver, 5))
    g.add(cyl(0.045, 0.045, 0.012, 16, m.foil, [cx * 0.34, 0.012, cz * 0.34]))
  }
  g.add(cyl(0.13, 0.13, 0.15, 6, m.silver, [0, 0.33, 0], [0, Math.PI / 6, 0]))
  g.add(cyl(0.132, 0.132, 0.03, 6, m.foil, [0, 0.265, 0], [0, Math.PI / 6, 0]))
  g.add(box(0.04, 0.05, 0.02, m.black, [-0.05, 0.35, 0.125], [0.2, 0, 0]))
  g.add(box(0.04, 0.05, 0.02, m.black, [0.05, 0.35, 0.125], [0.2, 0, 0]))
  g.add(box(0.07, 0.09, 0.02, m.dark, [0, 0.31, 0.135]))
  g.add(dish(0.045, 0.012, m.dish, [0.06, 0.42, 0.0]))
  g.add(cyl(0.004, 0.004, 0.1, 6, m.silver, [-0.06, 0.45, 0.02]))
  g.add(box(0.03, 0.2, 0.005, m.silver, [0, 0.12, 0.32], [0.55, 0, 0]))
  for (const [x, z] of [[0.16, 0.0], [-0.16, 0.0], [0, 0.16], [0, -0.16]] as const) g.add(cyl(0.012, 0.016, 0.04, 8, m.dark, [x, 0.4, z]))
  // Flag on a horizontal rod, planted a short way from the lander.
  g.add(cyl(0.004, 0.004, 0.42, 6, m.silver, [0.6, 0.21, 0.25]))
  g.add(cyl(0.003, 0.003, 0.26, 6, m.silver, [0.73, 0.4, 0.25], [0, 0, Math.PI / 2]))
  g.add(mesh(new PlaneGeometry(0.24, 0.16), m.flag, [0.73, 0.31, 0.25]))
  return { object: root }
}

/** International Space Station. Solar wings rotate about the truss axis. */
export function iss(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(box(1.0, 0.03, 0.03, m.silver))
  const wings: Group[] = []
  for (const x of [-0.46, -0.3, 0.3, 0.46]) {
    const w = new Group()
    w.position.x = x
    w.add(box(0.1, 0.34, 0.004, m.panel, [0, 0.2, 0]))
    w.add(box(0.1, 0.34, 0.004, m.panel, [0, -0.2, 0]))
    w.add(box(0.012, 0.06, 0.012, m.silver))
    g.add(w)
    wings.push(w)
  }
  g.add(cyl(0.045, 0.045, 0.1, 18, m.white, [0, 0, 0.0], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.04, 0.04, 0.22, 18, m.white, [0, 0, 0.16], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.045, 0.045, 0.09, 18, m.white, [0, 0, 0.3], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.035, 0.035, 0.16, 16, m.white, [0.1, 0, 0.3], [0, 0, Math.PI / 2]))
  g.add(cyl(0.035, 0.035, 0.16, 16, m.white, [-0.1, 0, 0.3], [0, 0, Math.PI / 2]))
  g.add(cyl(0.05, 0.05, 0.2, 18, m.foil, [0, 0, -0.16], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.05, 0.05, 0.24, 18, m.white, [0, 0, -0.38], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.012, 0.03, 0.05, 12, m.dark, [0, 0, -0.52], [Math.PI / 2, 0, 0]))
  for (const s of [-1, 1]) g.add(box(0.12, 0.004, 0.06, m.panel, [s * 0.09, 0, -0.4]))
  for (const s of [-1, 1]) g.add(box(0.004, 0.17, 0.12, m.radiator, [s * 0.14, 0.0, 0.03]))
  g.add(cyl(0.025, 0.04, 0.08, 14, m.white, [0, 0.07, 0.17]))
  g.add(strut([0.04, 0.04, 0.05], [0.12, 0.17, 0.15], 0.006, m.silver))
  return {
    object: root,
    update: (t) => {
      for (const w of wings) w.rotation.x = t * 0.28
    },
  }
}

export function hubble(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(cyl(0.1, 0.1, 0.42, 28, m.silver, [0, 0, 0.04], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.106, 0.106, 0.08, 28, m.dark, [0, 0, 0.29], [Math.PI / 2, 0, 0]))
  g.add(box(0.21, 0.008, 0.13, m.silver, [0, 0.14, 0.36], [-0.95, 0, 0]))
  g.add(cyl(0.125, 0.125, 0.2, 6, m.foil, [0, 0, -0.2], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.1, 0.1, 0.03, 20, m.black, [0, 0, -0.32], [Math.PI / 2, 0, 0]))
  const wings: Group[] = []
  for (const s of [-1, 1]) {
    const w = new Group()
    w.position.set(s * 0.13, 0, -0.1)
    w.add(box(0.34, 0.004, 0.1, m.panel, [s * 0.17, 0, 0.055]))
    w.add(box(0.34, 0.004, 0.1, m.panel, [s * 0.17, 0, -0.055]))
    w.add(cyl(0.006, 0.006, 0.34, 6, m.silver, [s * 0.17, 0, 0], [0, 0, Math.PI / 2]))
    g.add(w)
    wings.push(w)
    g.add(strut([s * 0.08, 0.08, -0.25], [s * 0.2, 0.22, -0.32], 0.004, m.silver, 4))
    g.add(dish(0.04, 0.012, m.dish, [s * 0.2, 0.22, -0.32]))
  }
  return { object: root, update: (t) => { for (const w of wings) w.rotation.x = Math.sin(t * 0.3) * 0.6 } }
}

export function tiangong(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(cyl(0.06, 0.06, 0.5, 22, m.white, [0, 0, -0.05], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.03, 0.06, 0.1, 22, m.silver, [0, 0, -0.35], [Math.PI / 2, 0, 0]))
  g.add(ball(0.07, m.foil, [0, 0, 0.23]))
  const wings: Group[] = []
  for (const s of [-1, 1]) {
    g.add(cyl(0.055, 0.055, 0.4, 22, m.white, [s * 0.27, 0, 0.23], [0, 0, Math.PI / 2]))
    const w = new Group()
    w.position.set(s * 0.42, 0, 0.23)
    w.add(box(0.12, 0.52, 0.004, m.panel, [0, 0.31, 0]))
    w.add(box(0.12, 0.52, 0.004, m.panel, [0, -0.31, 0]))
    g.add(w)
    wings.push(w)
  }
  const core = new Group()
  core.position.set(0, 0, -0.18)
  core.add(box(0.1, 0.34, 0.004, m.panel, [0.13, 0, 0]))
  core.add(box(0.1, 0.34, 0.004, m.panel, [-0.13, 0, 0]))
  g.add(core)
  g.add(cyl(0.04, 0.05, 0.1, 18, m.silver, [0, 0.0, 0.34], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.02, 0.04, 0.08, 18, m.foil, [0, 0, 0.42], [Math.PI / 2, 0, 0]))
  return { object: root, update: (t) => { for (const w of wings) w.rotation.x = t * 0.25 } }
}

/** James Webb: 18 hexagonal mirror segments above a five-layer sunshield. */
export function jwst(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  const size = 0.066
  const gap = 0.006
  const axial: [number, number][] = []
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
    const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r))
    if (d >= 1 && d <= 2) axial.push([q, r])
  }
  const step = size + gap
  for (const [q, r] of axial) {
    const x = step * Math.sqrt(3) * (q + r / 2)
    const y = step * 1.5 * r
    g.add(cyl(size, size, 0.008, 6, m.mirror, [x, y + 0.22, 0.2], [Math.PI / 2, 0, 0]))
  }
  const top: V3 = [0, 0.22, 0.75]
  for (const a of [Math.PI / 2, Math.PI / 2 + (Math.PI * 2) / 3, Math.PI / 2 + (Math.PI * 4) / 3]) {
    g.add(strut([Math.cos(a) * 0.28, Math.sin(a) * 0.28 + 0.22, 0.2], top, 0.005, m.dark, 5))
  }
  g.add(cyl(0.04, 0.04, 0.03, 16, m.dark, [top[0], top[1], top[2]], [Math.PI / 2, 0, 0]))
  g.add(box(0.5, 0.08, 0.2, m.dark, [0, 0.22, 0.12]))
  const kite = new Shape()
  kite.moveTo(-0.55, 0)
  kite.lineTo(0, 0.3)
  kite.lineTo(0.55, 0)
  kite.lineTo(0, -0.3)
  kite.closePath()
  for (let i = 0; i < 5; i++) {
    const geo = new ShapeGeometry(kite)
    geo.rotateX(-Math.PI / 2)
    const layer = mesh(geo, m.mylar, [0, -0.02 - i * 0.035, 0.05 - i * 0.015])
    const k = 1 - i * 0.03
    layer.scale.set(k, 1, k)
    g.add(layer)
  }
  g.add(box(0.32, 0.1, 0.3, m.silver, [0, -0.3, 0.0]))
  g.add(box(0.3, 0.004, 0.16, m.panel, [0, -0.23, -0.12]))
  g.add(cyl(0.025, 0.025, 0.06, 12, m.dark, [0.12, -0.22, 0.12]))
  return { object: root }
}

export type SatelliteVariant = 'generic' | 'earthObserver' | 'chandra' | 'gaia' | 'orbiter' | 'starlink'

/** Generic satellites with nadir antenna and panels that turn about the X axis. */
export function satellite(variant: SatelliteVariant = 'generic'): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  const panels = new Group()
  g.add(panels)

  switch (variant) {
    case 'earthObserver': {
      g.add(box(0.26, 0.26, 0.55, m.foil))
      g.add(box(0.28, 0.06, 0.4, m.silver, [0, 0.16, 0]))
      g.add(strut([0.13, 0, 0], [0.3, 0, 0], 0.012, m.dark))
      panels.position.x = 0.3
      panels.add(box(0.8, 0.005, 0.3, m.panel, [0.4, 0, 0]))
      g.add(dish(0.08, 0.025, m.dish, [-0.06, 0.18, 0.1]))
      break
    }
    case 'chandra': {
      g.add(cyl(0.07, 0.07, 0.7, 18, m.white, [0, 0, 0], [Math.PI / 2, 0, 0]))
      g.add(cyl(0.09, 0.09, 0.14, 8, m.foil, [0, 0, -0.3], [Math.PI / 2, 0, 0]))
      g.add(cyl(0.012, 0.012, 0.5, 8, m.silver, [0, 0.07, 0.1], [Math.PI / 2, 0, 0]))
      for (const s of [-1, 1]) {
        const p = new Group()
        p.position.set(s * 0.12, 0, -0.28)
        p.add(box(0.3, 0.005, 0.14, m.panel, [s * 0.15, 0, 0]))
        panels.add(p)
      }
      break
    }
    case 'gaia': {
      g.add(cyl(0.46, 0.46, 0.025, 36, m.mylar, [0, -0.05, 0]))
      g.add(cyl(0.15, 0.15, 0.2, 6, m.silver, [0, 0.07, 0]))
      g.add(cyl(0.06, 0.06, 0.02, 16, m.dish, [0, 0.19, 0]))
      break
    }
    case 'starlink': {
      g.add(box(0.3, 0.035, 0.45, m.white))
      panels.position.x = 0.15
      panels.add(box(0.95, 0.006, 0.45, m.panel, [0.48, 0, 0]))
      break
    }
    case 'orbiter': {
      g.add(box(0.22, 0.22, 0.3, m.foil))
      g.add(dish(0.14, 0.04, m.dish, [0, 0.2, 0.0]))
      g.add(strut([0, 0.11, 0], [0, 0.2, 0], 0.01, m.silver))
      g.add(cyl(0.03, 0.03, 0.2, 10, m.dark, [0, -0.12, 0.05]))
      for (const s of [-1, 1]) {
        const p = new Group()
        p.position.set(s * 0.11, 0, 0)
        p.add(box(0.36, 0.005, 0.2, m.panel, [s * 0.2, 0, 0]))
        panels.add(p)
      }
      break
    }
    default: {
      g.add(box(0.24, 0.24, 0.3, m.foil))
      g.add(box(0.26, 0.04, 0.2, m.silver, [0, 0.14, 0]))
      g.add(dish(0.07, 0.02, m.dish, [0, -0.15, 0], ))
      g.add(cyl(0.008, 0.008, 0.18, 6, m.silver, [0.06, 0.2, 0.05]))
      for (const s of [-1, 1]) {
        const p = new Group()
        p.position.set(s * 0.12, 0, 0)
        p.add(box(0.4, 0.005, 0.24, m.panel, [s * 0.22, 0, 0]))
        panels.add(p)
      }
    }
  }
  return { object: root, update: (t) => { panels.rotation.x = t * 0.4 } }
}

export function rocketBody(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(cyl(0.13, 0.13, 0.7, 20, m.white, [0, 0, 0], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.134, 0.134, 0.08, 20, m.dark, [0, 0, 0.2], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.134, 0.134, 0.04, 20, m.orange, [0, 0, -0.12], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.03, 0.09, 0.14, 16, m.dark, [0, 0, -0.42], [Math.PI / 2, 0, 0]))
  g.add(cyl(0.13, 0.05, 0.06, 20, m.silver, [0, 0, 0.38], [Math.PI / 2, 0, 0]))
  g.add(mesh(new TorusGeometry(0.13, 0.008, 6, 20), m.silver, [0, 0, 0.1]))
  return { object: root, update: (t) => { g.rotation.set(t * 0.4, t * 0.25, t * 0.15) } }
}

export function debris(): ModelHandle {
  const m = getMaterials()
  const root = new Group()
  const g = wrap(root)
  g.add(box(0.5, 0.04, 0.3, m.dark, [0, 0, 0], [0.2, 0.4, 0.1]))
  g.add(box(0.3, 0.03, 0.22, m.silver, [0.2, 0.06, 0.1], [0.5, -0.3, 0.7]))
  g.add(mesh(new CylinderGeometry(0.03, 0.05, 0.3, 5), m.foil, [-0.2, -0.05, -0.05], [0.9, 0.2, 0.4]))
  return { object: root, update: (t) => { g.rotation.set(t * 0.7, t * 0.45, t * 0.3) } }
}

export type ModelName =
  | 'voyager' | 'pioneer' | 'newHorizons' | 'cassini'
  | 'curiosity' | 'perseverance' | 'opportunity' | 'ingenuity' | 'lander'
  | 'iss' | 'hubble' | 'tiangong' | 'jwst'
  | SatelliteVariant | 'rocketBody' | 'debris'

export function buildModel(name: ModelName): ModelHandle {
  switch (name) {
    case 'voyager': return voyager()
    case 'pioneer': return pioneer()
    case 'newHorizons': return newHorizons()
    case 'cassini': return cassini()
    case 'curiosity': return rover('curiosity')
    case 'perseverance': return rover('perseverance')
    case 'opportunity': return rover('opportunity')
    case 'ingenuity': return ingenuity()
    case 'lander': return lander()
    case 'iss': return iss()
    case 'hubble': return hubble()
    case 'tiangong': return tiangong()
    case 'jwst': return jwst()
    case 'rocketBody': return rocketBody()
    case 'debris': return debris()
    default: return satellite(name)
  }
}

/** Frees GPU geometry owned by a model (materials are shared and kept). */
export function disposeModel(o: Object3D) {
  o.traverse((c) => {
    const mesh = c as Mesh
    if (mesh.geometry) mesh.geometry.dispose()
  })
}
