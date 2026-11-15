import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'
import type { Group, Mesh, Object3D } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useAppStore } from '../../store/useAppStore'
import { STATUS_META } from '../../data'
import type { SpaceObject } from '../../types'
import { positions, hidden } from '../Scene/positions'
import { useBodyObjects } from '../Scene/bodyObjects'
import { OBJECT_MODELS } from '../../models/registry'
import { buildModel, disposeModel } from '../../models/spacecraft'
import type { ModelHandle } from '../../models/spacecraft'
import { latLonToVector } from '../../features/closeups/sites'

const BODY_RADIUS = { mars: 0.6, moon: 0.25 } as const
const UP = new Vector3(0, 1, 0)

/**
 * A curated object as a detailed animated 3D model. Far away it grows with distance so it stays findable;
 * up close it settles at its real (stylised) size. Surface objects ride on their world's rotating surface.
 */
function MarkerImpl({ object }: { object: SpaceObject }) {
  const spec = OBJECT_MODELS[object.id]
  const surface = spec.surface
  const surfaceParent = useBodyObjects((s) => (surface ? s.objects[surface.body] : undefined))

  const group = useRef<Group>(null)
  const scaler = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const selected = useAppStore((s) => s.selectedId === object.id)
  const select = useAppStore((s) => s.selectObject)
  const emphasis = useRef(1)
  emphasis.current = hovered || selected ? 1.25 : 1

  const handle = useMemo<ModelHandle>(() => buildModel(spec.model), [spec.model])
  useEffect(() => () => disposeModel(handle.object), [handle])

  const local = useMemo(() => {
    if (!surface) return null
    const r = BODY_RADIUS[surface.body]
    const p = new Vector3(...latLonToVector(surface.lat, surface.lon, r))
    const up = p.clone().normalize()
    p.addScaledVector(up, surface.hover ?? 0)
    return { p, up }
  }, [surface])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  // Runs just after SolarClock so surface objects can overwrite the fallback position it wrote.
  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const hide = hidden.has(object.id)
    g.visible = !hide
    if (hide) return
    const world = positions.get(object.id)!
    if (surface) {
      if (!surfaceParent) return
      g.updateWorldMatrix(true, false)
      g.getWorldPosition(world)
    } else {
      g.position.copy(world)
    }
    const d = state.camera.position.distanceTo(world)
    const s = Math.max(spec.size, d * 0.034) * emphasis.current
    scaler.current?.scale.setScalar(s)
    handle.update?.(state.clock.elapsedTime, dt)
    if (ring.current) {
      // The ring is a findability aid; it fades once the model itself is big enough to see.
      ring.current.quaternion.copy(state.camera.quaternion)
      const far = MathUtils.smoothstep(d, spec.size * 14, spec.size * 40)
      ring.current.visible = far > 0.02
      ring.current.scale.setScalar(Math.max(0.0001, d * 0.02) * (1 + 0.12 * Math.sin(state.clock.elapsedTime * 3)))
      const m = ring.current.material as { opacity: number }
      m.opacity = (selected ? 1 : 0.65) * far
    }
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
  }

  const body = (
    <group
      ref={group}
      position={local ? local.p : positions.get(object.id)!.toArray()}
      onUpdate={(g: Object3D) => {
        if (local) g.quaternion.setFromUnitVectors(UP, local.up)
      }}
    >
      <group ref={scaler}>
        <primitive object={handle.object} />
        <mesh onPointerOver={over} onPointerOut={() => setHovered(false)} onClick={(e) => { e.stopPropagation(); select(object.id) }}>
          <sphereGeometry args={[0.65, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={ring} renderOrder={9} raycast={() => null}>
        <ringGeometry args={[0.9, 1.1, 40]} />
        <meshBasicMaterial color={object.color} toneMapped={false} depthTest={false} transparent />
      </mesh>
      {(hovered || selected) && (
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }} position={[0, spec.size * 1.1, 0]}>
          <div className="-translate-y-4 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/80 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${STATUS_META[object.status].dot}`} />
            {object.name}
          </div>
        </Html>
      )}
    </group>
  )

  if (surface) return surfaceParent ? createPortal(body, surfaceParent) : null
  return body
}

export const Marker = memo(MarkerImpl)
