import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture, Vector3 } from 'three'
import type { Group, Sprite } from 'three'
import { useBodyObjects } from '../../components/Scene/bodyObjects'
import { positions } from '../../components/Scene/positions'
import { simYear } from '../../lib/simTime'
import { BODY_INFO, SITES, latLonToVector } from './sites'
import type { BodyKey, Site } from './sites'
import { useCloseUpStore } from './store'

function ringTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.strokeStyle = '#fff'
  g.lineWidth = 6
  g.beginPath()
  g.arc(32, 32, 24, 0, Math.PI * 2)
  g.stroke()
  return new CanvasTexture(c)
}

function Pin({ site, radius, ring }: { site: Site; radius: number; ring: CanvasTexture }) {
  const group = useRef<Group>(null)
  const sprite = useRef<Sprite>(null)
  const [hovered, setHovered] = useState(false)
  const selected = useCloseUpStore((s) => s.siteId === site.id)
  const select = useCloseUpStore((s) => s.selectSite)
  const pos = useMemo(() => latLonToVector(site.lat, site.lon, radius * 1.004), [site, radius])
  const world = useRef(new Vector3()).current
  const id = `site:${site.id}`
  const siteYear = useMemo(() => Number(site.date.slice(0, 4)) + (Number(site.date.slice(5, 7)) - 1) / 12, [site.date])

  useEffect(() => {
    positions.set(id, new Vector3())
    return () => {
      positions.delete(id)
    }
  }, [id])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    // A site only exists once its mission has landed.
    g.visible = simYear() >= siteYear
    if (!g.visible) return
    g.getWorldPosition(world)
    positions.get(id)?.copy(world)
    if (sprite.current) {
      const s = Math.max(0.02, state.camera.position.distanceTo(world) * (selected || hovered ? 0.07 : 0.05))
      sprite.current.scale.setScalar(s)
    }
  })

  return (
    <group ref={group} position={pos}>
      <mesh>
        <sphereGeometry args={[radius * (selected ? 0.034 : 0.026), 16, 16]} />
        <meshBasicMaterial color={selected ? '#ffffff' : '#fbbf24'} toneMapped={false} />
      </mesh>
      <sprite ref={sprite} renderOrder={8}>
        <spriteMaterial map={ring} color={selected ? '#ffffff' : '#fbbf24'} transparent depthTest={false} blending={AdditiveBlending} />
      </sprite>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          select(site.id)
        }}
      >
        <sphereGeometry args={[radius * 0.07, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(hovered || selected) && (
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="-translate-y-8 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/85 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
            {site.name}
            <span className="ml-1.5 text-slate-400">{site.date.slice(0, 4)}</span>
          </div>
        </Html>
      )}
    </group>
  )
}

function Pins({ body }: { body: BodyKey }) {
  const ring = useMemo(ringTexture, [])
  const radius = BODY_INFO[body].radius
  return (
    <>
      {SITES[body].sites.map((s) => (
        <Pin key={s.id} site={s} radius={radius} ring={ring} />
      ))}
    </>
  )
}

/** Pins are children of the body's rotating surface group, so they stay glued to the terrain. */
export default function CloseUpScene() {
  const body = useCloseUpStore((s) => s.body)
  const surface = useBodyObjects((s) => (body ? s.objects[body] : undefined))
  if (!body || !surface) return null
  return createPortal(<Pins body={body} />, surface)
}
