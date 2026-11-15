import { BoxGeometry, BufferAttribute, BufferGeometry, CylinderGeometry, TetrahedronGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Instanced catalog model kinds. Index order is used by the shaders. */
export const KINDS = ['satellite', 'starlink', 'rocket', 'debris'] as const
export type Kind = 0 | 1 | 2 | 3

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

/** Non-indexed, uv-less copy with a flat vertex colour and a part id (0 = body, 1 = rotating panel). */
function part(geo: BufferGeometry, color: string, partId: number, at: [number, number, number] = [0, 0, 0]) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  g.deleteAttribute('uv')
  g.translate(...at)
  const n = g.attributes.position.count
  const [r, gr, b] = rgb(color)
  const col = new Float32Array(n * 3)
  const p = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    col[i * 3] = r
    col[i * 3 + 1] = gr
    col[i * 3 + 2] = b
    p[i] = partId
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.setAttribute('aPart', new BufferAttribute(p, 1))
  return g
}

const along = (g: CylinderGeometry) => g.rotateX(Math.PI / 2)

const cache: Partial<Record<Kind, BufferGeometry>> = {}

/** Low-poly shared geometry for each instanced kind. Roughly one unit across. */
export function kindGeometry(kind: Kind): BufferGeometry {
  const hit = cache[kind]
  if (hit) return hit
  let geo: BufferGeometry
  switch (kind) {
    case 0:
      geo = mergeGeometries([
        part(new BoxGeometry(0.26, 0.26, 0.3), '#c9a24c', 0),
        part(new BoxGeometry(0.28, 0.04, 0.2), '#aeb4c0', 0, [0, 0.15, 0]),
        part(along(new CylinderGeometry(0.0, 0.07, 0.07, 6)).rotateX(Math.PI), '#e8eaf0', 0, [0, -0.17, 0]),
        part(new BoxGeometry(0.42, 0.012, 0.26), '#1d3f8f', 1, [0.35, 0, 0]),
        part(new BoxGeometry(0.42, 0.012, 0.26), '#1d3f8f', 1, [-0.35, 0, 0]),
      ])!
      break
    case 1:
      geo = mergeGeometries([
        part(new BoxGeometry(0.3, 0.035, 0.45), '#e6e8ee', 0),
        part(new BoxGeometry(0.95, 0.008, 0.45), '#1a3680', 1, [0.58, 0, 0]),
      ])!
      break
    case 2:
      geo = mergeGeometries([
        part(along(new CylinderGeometry(0.1, 0.1, 0.62, 8)), '#eceef2', 0),
        part(along(new CylinderGeometry(0.104, 0.104, 0.07, 8)), '#e8622a', 0, [0, 0, -0.12]),
        part(along(new CylinderGeometry(0.03, 0.08, 0.13, 8)), '#2a2d37', 0, [0, 0, -0.36]),
        part(along(new CylinderGeometry(0.0, 0.1, 0.08, 8)).rotateX(Math.PI), '#b9bec8', 0, [0, 0, 0.35]),
      ])!
      break
    default:
      geo = mergeGeometries([
        part(new TetrahedronGeometry(0.32).scale(1.3, 0.4, 0.9), '#6d7280', 0),
        part(new TetrahedronGeometry(0.18).scale(0.8, 0.5, 1.2), '#a9afbb', 0, [0.12, 0.05, 0.1]),
      ])!
  }
  geo.computeBoundingSphere()
  cache[kind] = geo
  return geo
}
