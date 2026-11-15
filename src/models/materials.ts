import { CanvasTexture, DoubleSide, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'
import type { MeshStandardMaterialParameters } from 'three'

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(repeat[0], repeat[1])
  }
  return t
}

/** Solar-cell grid: deep blue cells separated by thin silver bus lines. */
function panelTexture() {
  return canvasTexture(128, 128, (g) => {
    g.fillStyle = '#0f2a66'
    g.fillRect(0, 0, 128, 128)
    const grad = g.createLinearGradient(0, 0, 128, 128)
    grad.addColorStop(0, 'rgba(120,160,255,0.35)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    g.strokeStyle = '#9fb4d9'
    g.lineWidth = 2
    for (let i = 0; i <= 128; i += 32) {
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i, 128)
      g.moveTo(0, i)
      g.lineTo(128, i)
      g.stroke()
    }
    g.strokeStyle = 'rgba(190,210,255,0.5)'
    g.lineWidth = 1
    for (let i = 16; i < 128; i += 32) {
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i, 128)
      g.stroke()
    }
  })
}

function flagTexture() {
  return canvasTexture(190, 100, (g) => {
    for (let i = 0; i < 13; i++) {
      g.fillStyle = i % 2 ? '#f5f5f5' : '#b22234'
      g.fillRect(0, (i * 100) / 13, 190, 100 / 13 + 1)
    }
    g.fillStyle = '#3c3b6e'
    g.fillRect(0, 0, 76, 54)
    g.fillStyle = '#fff'
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.fillRect(6 + c * 12, 6 + r * 9, 3, 3)
  })
}

export interface Materials {
  foil: MeshStandardMaterial
  silver: MeshStandardMaterial
  white: MeshStandardMaterial
  dish: MeshStandardMaterial
  dark: MeshStandardMaterial
  black: MeshStandardMaterial
  rtg: MeshStandardMaterial
  panel: MeshStandardMaterial
  radiator: MeshStandardMaterial
  mylar: MeshStandardMaterial
  mirror: MeshStandardMaterial
  rover: MeshStandardMaterial
  wheel: MeshStandardMaterial
  blade: MeshStandardMaterial
  flag: MeshStandardMaterial
  orange: MeshStandardMaterial
}

let cache: Materials | null = null

/** Shared materials. Created lazily because they need a DOM canvas. */
export function getMaterials(): Materials {
  if (cache) return cache
  const std = (color: string, metalness: number, roughness: number, extra: MeshStandardMaterialParameters = {}) =>
    new MeshStandardMaterial({ color, metalness, roughness, ...extra })

  cache = {
    foil: std('#c9a24c', 0.45, 0.4, { emissive: '#2b1d05' }),
    silver: std('#b9bec8', 0.5, 0.45, { emissive: '#101216' }),
    white: std('#e9ebf0', 0.15, 0.55, { emissive: '#14151a' }),
    dish: std('#f3f4f7', 0.1, 0.5, { side: DoubleSide, emissive: '#16171b' }),
    dark: std('#2a2d37', 0.4, 0.55),
    black: std('#0e0f13', 0.3, 0.6),
    rtg: std('#4a4d57', 0.5, 0.5),
    panel: std('#ffffff', 0.35, 0.35, { map: panelTexture(), side: DoubleSide, emissive: '#06122c' }),
    radiator: std('#dfe3ea', 0.1, 0.6, { side: DoubleSide, emissive: '#101114' }),
    mylar: std('#c8b8d8', 0.6, 0.3, { side: DoubleSide, transparent: true, opacity: 0.92, emissive: '#1b1522' }),
    mirror: std('#e4b94c', 0.7, 0.25, { emissive: '#3a2a06' }),
    rover: std('#b9b2a6', 0.3, 0.6, { emissive: '#14120e' }),
    wheel: std('#3a3c42', 0.2, 0.8),
    blade: std('#1c1d22', 0.2, 0.6, { side: DoubleSide }),
    flag: std('#ffffff', 0.0, 0.9, { map: flagTexture(), side: DoubleSide, emissive: '#101010' }),
    orange: std('#e8622a', 0.2, 0.55),
  }
  return cache
}
