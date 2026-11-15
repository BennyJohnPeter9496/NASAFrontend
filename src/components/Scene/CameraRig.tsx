import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { HOME_DISTANCE, useAppStore } from '../../store/useAppStore'
import { MOON, planets } from '../../data/bodies'
import type { CameraGoal } from '../../store/useAppStore'
import { ORIGIN, positions } from './positions'

interface Flight {
  t: number
  duration: number
  startPos: Vector3
  startTarget: Vector3
  dir: Vector3
  distance: number
  id: string | null
}

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
const DESKTOP_PANEL_PX = 380
const LEFT_PANEL_PX = 368
const MOBILE_SHEET_RATIO = 0.55

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const LIT_BODIES = new Set<string>([MOON.id, ...planets.map((p) => p.id)])

/**
 * For planets and the Moon, story azimuths are measured from the Sun-facing side so
 * close-ups always show the lit hemisphere. Other targets use plain world azimuth.
 */
const litSideAzimuth = (target: string | null, at: Vector3) =>
  target && LIT_BODIES.has(target) ? Math.atan2(-at.x, -at.z) : 0

/**
 * Flies the camera to whatever `store.camera` asks for, then keeps following the
 * (possibly moving) target. Also nudges the projection so the focused object is
 * centred in the visible area beside the info panel. Runs entirely outside React.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const size = useThree((s) => s.size)

  const flight = useRef<Flight | null>(null)
  const lockId = useRef<string | null>(null)
  const lastLock = useRef(new Vector3())
  const panelOpen = useRef(false)
  const leftOpen = useRef(false)
  const viewOffset = useRef({ x: 0, y: 0 })
  const sizeRef = useRef(size)
  sizeRef.current = size
  const tmp = useRef({ end: new Vector3(), delta: new Vector3() }).current

  useEffect(() => {
    if (!controls) return

    const apply = (goal: CameraGoal) => {
      const endTarget = goal.target ? positions.get(goal.target) ?? ORIGIN : ORIGIN
      const startPos = camera.position.clone()
      const startTarget = controls.target.clone()

      const dir = new Vector3()
      const current = startPos.clone().sub(endTarget)
      const facingPos = goal.facing ? positions.get(goal.facing) : undefined
      if (facingPos && dir.copy(endTarget).sub(facingPos).lengthSq() > 1e-8) {
        dir.normalize()
        if (goal.elevation !== undefined) {
          // View from `elevation` degrees above the local horizon of the body being faced, turned by `azimuth` around the normal.
          const el = MathUtils.degToRad(goal.elevation)
          const az = MathUtils.degToRad(goal.azimuth ?? 0)
          const t1 = new Vector3().crossVectors(dir, new Vector3(0, 1, 0))
          if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0)
          t1.normalize()
          const t2 = new Vector3().crossVectors(dir, t1)
          const tangent = t1.multiplyScalar(Math.cos(az)).add(t2.multiplyScalar(Math.sin(az)))
          dir.multiplyScalar(Math.sin(el)).add(tangent.multiplyScalar(Math.cos(el))).normalize()
        }
      } else if (goal.azimuth !== undefined || goal.elevation !== undefined) {
        const curEl = Math.asin(MathUtils.clamp(current.y / (current.length() || 1), -1, 1))
        const curAz = Math.atan2(current.x, current.z)
        const az = goal.azimuth !== undefined ? MathUtils.degToRad(goal.azimuth) + litSideAzimuth(goal.target, endTarget) : curAz
        const el = goal.elevation !== undefined ? MathUtils.degToRad(goal.elevation) : curEl
        dir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
      } else {
        dir.copy(current)
        if (dir.lengthSq() < 1e-6) dir.set(0, 0.5, 1)
        dir.normalize()
      }

      let distance = goal.distance
      if (!goal.target) {
        const aspect = sizeRef.current.width / sizeRef.current.height
        distance = HOME_DISTANCE * MathUtils.clamp(1.3 / aspect, 1, 1.8)
      }

      const endPos = dir.clone().multiplyScalar(distance).add(endTarget)
      const travel = startPos.distanceTo(endPos)
      flight.current = {
        t: 0,
        duration: reducedMotion() ? 0.01 : MathUtils.clamp(0.9 + travel * 0.012, 1.2, 2.6),
        startPos,
        startTarget,
        dir,
        distance,
        id: goal.target,
      }
      lockId.current = null
      controls.enabled = false
    }

    const unsub = useAppStore.subscribe((s, prev) => {
      panelOpen.current = !!s.selectedId || s.externalPanel
      leftOpen.current = s.externalLeft
      if (s.camera !== prev.camera) apply(s.camera)
    })
    return unsub
  }, [camera, controls])

  useFrame((_, rawDt) => {
    if (!controls) return
    const dt = Math.min(rawDt, 0.05)
    const f = flight.current

    if (f) {
      f.t += dt
      const k = Math.min(1, f.t / f.duration)
      const e = easeInOutCubic(k)
      const endTarget = f.id ? positions.get(f.id) ?? ORIGIN : ORIGIN
      tmp.end.copy(f.dir).multiplyScalar(f.distance).add(endTarget)
      camera.position.lerpVectors(f.startPos, tmp.end, e)
      controls.target.lerpVectors(f.startTarget, endTarget, e)
      if (k >= 1) {
        flight.current = null
        controls.enabled = true
        lockId.current = f.id
        lastLock.current.copy(endTarget)
      }
      controls.update()
    } else if (lockId.current) {
      const cur = positions.get(lockId.current)
      if (cur) {
        tmp.delta.copy(cur).sub(lastLock.current)
        camera.position.add(tmp.delta)
        controls.target.add(tmp.delta)
        lastLock.current.copy(cur)
      }
    }

    const { width, height } = sizeRef.current
    const desktop = width >= 768
    const wantX = desktop ? (panelOpen.current ? DESKTOP_PANEL_PX / 2 : 0) - (leftOpen.current ? LEFT_PANEL_PX / 2 : 0) : 0
    const wantY = panelOpen.current && !desktop ? height * (MOBILE_SHEET_RATIO / 2) : 0
    const vo = viewOffset.current
    const a = 1 - Math.exp(-dt * 7)
    vo.x += (wantX - vo.x) * a
    vo.y += (wantY - vo.y) * a
    if (Math.abs(vo.x - wantX) < 0.3 && Math.abs(vo.y - wantY) < 0.3) {
      vo.x = wantX
      vo.y = wantY
    }
    if (vo.x === 0 && vo.y === 0) {
      if (camera.view?.enabled) camera.clearViewOffset()
    } else {
      camera.setViewOffset(width, height, vo.x, vo.y, width, height)
    }
  })

  return null
}
