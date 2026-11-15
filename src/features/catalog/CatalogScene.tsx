import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  Float32BufferAttribute,
  FloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Quaternion,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import type { Group, Sprite } from 'three'
import { positions } from '../../components/Scene/positions'
import { onCanvasMiss } from '../../lib/pointerMiss'
import { simYear } from '../../lib/simTime'
import { buildModel, disposeModel } from '../../models/spacecraft'
import type { ModelHandle } from '../../models/spacecraft'
import { kindGeometry } from '../../models/catalogGeometry'
import type { Kind } from '../../models/catalogGeometry'
import { maskOf } from './categories'
import { focusRow } from './actions'
import {
  COMPUTE_FRAGMENT,
  FULLSCREEN_VERTEX,
  MODEL_FRAGMENT,
  MODEL_VERTEX,
  POINTS_FRAGMENT,
  POINTS_VERTEX,
} from './gpu'
import { catalogClock, eccentricToPosition, positionAt } from './kepler'
import { HERO_MODEL, aliveAt } from './layout'
import type { CloudLayout, FeaturedEntry } from './layout'
import { useCatalogStore } from './store'
import { cloudCenter, cloudTilt } from './worldPos'

const scratch = { local: [0, 0, 0], next: [0, 0, 0], v: new Vector3(), center: new Vector3(), w: new Vector3() }

/** Shared by every instanced material: a sphere (xyz, radius w) in which no models are drawn. */
const clearZone = { value: new Vector4(0, 0, 0, 0) }

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Whether the GPU can render positions into a float texture (needed for instanced 3D models). */
function useFloatTargets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => gl.capabilities.isWebGL2 && gl.extensions.has('EXT_color_buffer_float'), [gl])
}

function ClockTick() {
  useFrame((s) => {
    catalogClock.t = s.clock.elapsedTime
  })
  return null
}

/**
 * Orients a model like the instanced satellites: Y away from the planet, Z along the direction of travel.
 */
const basis = new Matrix4()
const quat = new Quaternion()
function orientNadir(target: { quaternion: Quaternion }, cloud: CloudLayout, slot: number, t: number, here: number[]) {
  positionAt(cloud.a[slot], cloud.e[slot], cloud.inc[slot], cloud.raan[slot], cloud.argp[slot], cloud.m0[slot], cloud.n[slot], t + 0.03, scratch.next)
  const up = new Vector3(here[0], here[1], here[2]).normalize()
  const vel = new Vector3(scratch.next[0] - here[0], scratch.next[1] - here[1], scratch.next[2] - here[2])
  const fwd = vel.sub(up.clone().multiplyScalar(vel.dot(up))).normalize()
  const side = new Vector3().crossVectors(fwd, up)
  basis.makeBasis(side, up, fwd)
  target.quaternion.copy(quat.setFromRotationMatrix(basis))
}

function Cloud({ cloud, index }: { cloud: CloudLayout; index: number }) {
  const group = useRef<Group>(null)
  const dpr = useThree((s) => s.viewport.dpr)
  const floatOk = useFloatTargets()
  const modelsOn = !!cloud.cfg.models && floatOk
  const selectedSlot = useCatalogStore((s) => {
    const row = s.selected
    return row !== null && s.layout && s.layout.rowCloud[row] === index ? s.layout.rowSlot[row] : -1
  })
  const featured = useCatalogStore((s) => s.layout?.featured)

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const m = cloud.rows.length
    g.setAttribute('position', new BufferAttribute(new Float32Array(m * 3), 3))
    g.setAttribute('aA', new BufferAttribute(cloud.a, 1))
    g.setAttribute('aE', new BufferAttribute(cloud.e, 1))
    g.setAttribute('aInc', new BufferAttribute(cloud.inc, 1))
    g.setAttribute('aRaan', new BufferAttribute(cloud.raan, 1))
    g.setAttribute('aArgp', new BufferAttribute(cloud.argp, 1))
    g.setAttribute('aM0', new BufferAttribute(cloud.m0, 1))
    g.setAttribute('aN', new BufferAttribute(cloud.n, 1))
    g.setAttribute('aMask', new BufferAttribute(cloud.mask, 1))
    g.setAttribute('aLaunch', new BufferAttribute(cloud.launchGpu, 1))
    g.setAttribute('aDecay', new BufferAttribute(cloud.decayY, 1))
    g.setAttribute('aColor', new BufferAttribute(cloud.color, 3))
    return g
  }, [cloud])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMask: { value: maskOf(useCatalogStore.getState().enabled) },
      uSize: { value: 2.2 * dpr },
      uFade: { value: 1 },
      uYear: { value: simYear() },
      uNear: { value: modelsOn ? cloud.cfg.models!.near : 0 },
    }),
    [dpr, modelsOn, cloud.cfg.models],
  )

  useEffect(() => {
    uniforms.uMask.value = maskOf(useCatalogStore.getState().enabled)
    return useCatalogStore.subscribe((s, prev) => {
      if (s.enabled !== prev.enabled) uniforms.uMask.value = maskOf(s.enabled)
    })
  }, [uniforms])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    cloudCenter(cloud.cfg, g.position)
    g.rotation.z = cloudTilt(cloud.cfg)
    const dist = state.camera.position.distanceTo(g.position)
    const fade = 1 - smooth(cloud.cfg.fade[0], cloud.cfg.fade[1], dist)
    g.visible = fade > 0.01
    uniforms.uFade.value = fade
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uYear.value = simYear()
  })

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false} renderOrder={5} raycast={() => null}>
        <shaderMaterial vertexShader={POINTS_VERTEX} fragmentShader={POINTS_FRAGMENT} uniforms={uniforms} transparent depthWrite={false} />
      </points>
      {modelsOn && <InstancedModels cloud={cloud} />}
      {featured?.filter((f) => f.cloud === index).map((f) => <FeaturedModel key={f.row} entry={f} cloud={cloud} />)}
      {selectedSlot >= 0 && <SelectedObject cloud={cloud} slot={selectedSlot} />}
    </group>
  )
}

const TEX_WIDTH = 512

/**
 * Every object of a cloud as an instanced 3D model. Positions are solved on the GPU into a float texture
 * once per frame, so the CPU does no per-object work.
 */
function InstancedModels({ cloud }: { cloud: CloudLayout }) {
  const gl = useThree((s) => s.gl)
  const models = cloud.cfg.models!
  const N = cloud.rows.length
  const H = Math.max(1, Math.ceil(N / TEX_WIDTH))

  const gpu = useMemo(() => {
    const size = TEX_WIDTH * H * 4
    const A = new Float32Array(size)
    const B = new Float32Array(size)
    const C = new Float32Array(size)
    for (let i = 0; i < TEX_WIDTH * H; i++) C[i * 4 + 2] = -1
    for (let s = 0; s < N; s++) {
      const o = s * 4
      A[o] = cloud.a[s]; A[o + 1] = cloud.e[s]; A[o + 2] = cloud.inc[s]; A[o + 3] = cloud.raan[s]
      B[o] = cloud.argp[s]; B[o + 1] = cloud.m0[s]; B[o + 2] = cloud.n[s]; B[o + 3] = cloud.launchGpu[s]
      C[o] = cloud.decayY[s]; C[o + 1] = cloud.mask[s]; C[o + 2] = cloud.kind[s]; C[o + 3] = 0
    }
    const tex = (arr: Float32Array<ArrayBuffer>) => {
      const t = new DataTexture(arr, TEX_WIDTH, H, RGBAFormat, FloatType)
      t.minFilter = t.magFilter = NearestFilter
      t.needsUpdate = true
      return t
    }
    const target = new WebGLRenderTarget(TEX_WIDTH * 2, H, {
      type: FloatType,
      format: RGBAFormat,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: false,
      generateMipmaps: false,
    })
    const uniforms = {
      uA: { value: tex(A) },
      uB: { value: tex(B) },
      uC: { value: tex(C) },
      uTime: { value: 0 },
      uYear: { value: simYear() },
      uMask: { value: maskOf(useCatalogStore.getState().enabled) },
    }
    const material = new ShaderMaterial({ vertexShader: FULLSCREEN_VERTEX, fragmentShader: COMPUTE_FRAGMENT, uniforms, depthTest: false, depthWrite: false })
    const quad = new Mesh(new PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    const scene = new Scene()
    scene.add(quad)
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    let reach = 0
    for (let s = 0; s < N; s++) reach = Math.max(reach, cloud.a[s] * (1 + cloud.e[s]))
    return { target, uniforms, scene, camera, reach, textures: [uniforms.uA.value, uniforms.uB.value, uniforms.uC.value], quad, material }
  }, [cloud, H, N])

  useEffect(
    () => () => {
      gpu.target.dispose()
      gpu.textures.forEach((t) => t.dispose())
      gpu.quad.geometry.dispose()
      gpu.material.dispose()
    },
    [gpu],
  )

  const meshes = useMemo(() => {
    const shared = { uPos: { value: gpu.target.texture }, uW: { value: TEX_WIDTH }, uTime: gpu.uniforms.uTime, uClear: clearZone }
    return ([0, 1, 2, 3] as Kind[]).map((kind) => {
      const slots: number[] = []
      for (let s = 0; s < N; s++) if (cloud.kind[s] === kind) slots.push(s)
      if (!slots.length) return null
      const g = new InstancedBufferGeometry()
      g.copy(kindGeometry(kind) as unknown as InstancedBufferGeometry)
      g.setAttribute('aIndex', new InstancedBufferAttribute(Float32Array.from(slots), 1))
      g.setAttribute('aPhase', new InstancedBufferAttribute(Float32Array.from(slots, (s) => cloud.phase[s]), 1))
      g.instanceCount = slots.length
      const material = new ShaderMaterial({
        vertexShader: MODEL_VERTEX,
        fragmentShader: MODEL_FRAGMENT,
        uniforms: { ...shared, uScale: { value: models.scale }, uKind: { value: kind }, uNear: { value: models.near } },
      })
      const m = new Mesh(g, material)
      m.frustumCulled = false
      m.renderOrder = 4
      m.raycast = () => null
      return m
    })
  }, [cloud, gpu, N, models])

  useEffect(
    () => () => {
      meshes.forEach((m) => {
        m?.geometry.dispose()
        ;(m?.material as ShaderMaterial | undefined)?.dispose()
      })
    },
    [meshes],
  )

  useEffect(() => {
    gpu.uniforms.uMask.value = maskOf(useCatalogStore.getState().enabled)
    return useCatalogStore.subscribe((s, prev) => {
      if (s.enabled !== prev.enabled) gpu.uniforms.uMask.value = maskOf(s.enabled)
    })
  }, [gpu])

  // Runs before the main render so the textures are fresh when the instanced meshes sample them.
  useFrame((state) => {
    cloudCenter(cloud.cfg, scratch.center)
    const active = state.camera.position.distanceTo(scratch.center) < gpu.reach + models.near
    for (const m of meshes) if (m) m.visible = active
    if (!active) return
    gpu.uniforms.uTime.value = state.clock.elapsedTime
    gpu.uniforms.uYear.value = simYear()
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(gpu.target)
    gl.render(gpu.scene, gpu.camera)
    gl.setRenderTarget(previous)
  }, -1)

  return (
    <>
      {meshes.map((m, i) => (m ? <primitive key={i} object={m} /> : null))}
    </>
  )
}

function ringTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.strokeStyle = '#ffffff'
  g.lineWidth = 5
  g.beginPath()
  g.arc(32, 32, 24, 0, Math.PI * 2)
  g.stroke()
  return new CanvasTexture(c)
}

/** Famous objects (ISS, Hubble, JWST...) as detailed animated models that are always drawn while they exist. */
function FeaturedModel({ entry, cloud }: { entry: FeaturedEntry; cloud: CloudLayout }) {
  const slot = entry.slot
  const root = useRef<Group>(null)
  const handle = useMemo<ModelHandle>(() => buildModel(entry.def.model), [entry.def.model])
  useEffect(() => () => disposeModel(handle.object), [handle])
  const [hovered, setHovered] = useState(false)
  const selected = useCatalogStore((s) => s.selected === entry.row)

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  useFrame((state, dt) => {
    const g = root.current
    if (!g) return
    const year = simYear()
    const alive = year >= cloud.launchY[slot] && year < cloud.decayY[slot]
    g.visible = alive && !selected
    if (!g.visible) return
    const t = state.clock.elapsedTime
    const here = scratch.local
    positionAt(cloud.a[slot], cloud.e[slot], cloud.inc[slot], cloud.raan[slot], cloud.argp[slot], cloud.m0[slot], cloud.n[slot], t, here)
    g.position.set(here[0], here[1], here[2])
    orientNadir(g, cloud, slot, t, here)
    g.getWorldPosition(scratch.w)
    const d = state.camera.position.distanceTo(scratch.w)
    g.scale.setScalar(Math.min(entry.def.size * 4, Math.max(entry.def.size, d * 0.012)))
    handle.update?.(t, dt)
  })

  return (
    <group
      ref={root}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        focusRow(entry.row)
      }}
    >
      <primitive object={handle.object} />
      {hovered && (
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="-translate-y-10 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/85 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
            {entry.def.label}
          </div>
        </Html>
      )}
    </group>
  )
}

/** The selected object as a large detailed model, with its orbit and a highlight ring. Optionally held still. */
function SelectedObject({ cloud, slot }: { cloud: CloudLayout; slot: number }) {
  const root = useRef<Group>(null)
  const sprite = useRef<Sprite>(null)
  const row = cloud.rows[slot]
  const featured = useCatalogStore((s) => s.layout?.featured.find((f) => f.row === row))
  const name = useCatalogStore((s) => s.data?.cols.name[row] ?? '')
  const modelName = featured?.def.model ?? HERO_MODEL[cloud.kind[slot]]
  const size = featured?.def.size ?? 0.16
  const handle = useMemo<ModelHandle>(() => buildModel(modelName), [modelName])
  useEffect(() => () => disposeModel(handle.object), [handle])
  const ring = useMemo(ringTexture, [])
  const world = useMemo(() => new Vector3(), [])
  useEffect(
    () => () => {
      clearZone.value.set(0, 0, 0, 0)
    },
    [],
  )

  const orbit = useMemo(() => {
    const pts: number[] = []
    const out = [0, 0, 0]
    const steps = 256
    for (let i = 0; i <= steps; i++) {
      eccentricToPosition(cloud.a[slot], cloud.e[slot], cloud.inc[slot], cloud.raan[slot], cloud.argp[slot], (i / steps) * Math.PI * 2, out)
      pts.push(out[0], out[1], out[2])
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pts, 3))
    return g
  }, [cloud, slot])
  useEffect(() => () => orbit.dispose(), [orbit])

  const line = useMemo(() => {
    const l = new Line(orbit, new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }))
    l.frustumCulled = false
    l.renderOrder = 6
    return l
  }, [orbit])
  useEffect(() => () => (line.material as LineBasicMaterial).dispose(), [line])

  useEffect(() => {
    // Registered once and kept: the camera flight reads it by id, possibly before this component has mounted.
    if (!positions.has('catalog-selected')) positions.set('catalog-selected', new Vector3())
  }, [])

  useFrame((state, dt) => {
    const g = root.current
    if (!g) return
    const { hold, heldT } = useCatalogStore.getState()
    const t = hold ? heldT : state.clock.elapsedTime
    const here = scratch.local
    positionAt(cloud.a[slot], cloud.e[slot], cloud.inc[slot], cloud.raan[slot], cloud.argp[slot], cloud.m0[slot], cloud.n[slot], t, here)
    g.position.set(here[0], here[1], here[2])
    if (cloud.kind[slot] <= 1 || featured) orientNadir(g, cloud, slot, t, here)
    g.scale.setScalar(size)
    handle.update?.(state.clock.elapsedTime, dt)
    g.getWorldPosition(world)
    positions.get('catalog-selected')?.copy(world)
    clearZone.value.set(world.x, world.y, world.z, size * 2.6)
    if (sprite.current) {
      sprite.current.position.copy(g.position)
      sprite.current.scale.setScalar(Math.max(0.05, state.camera.position.distanceTo(world) * 0.07))
    }
  })

  return (
    <>
      <primitive object={line} />
      <group ref={root}>
        <primitive object={handle.object} />
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="-translate-y-14 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/85 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
            {featured?.def.label ?? name}
          </div>
        </Html>
      </group>
      <sprite ref={sprite} renderOrder={7}>
        <spriteMaterial map={ring} color="#fde68a" transparent depthTest={false} blending={AdditiveBlending} opacity={0.7} />
      </sprite>
    </>
  )
}

function segmentHitsSphere(from: Vector3, to: Vector3, center: Vector3, r: number) {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z
  const fx = from.x - center.x, fy = from.y - center.y, fz = from.z - center.z
  const a = dx * dx + dy * dy + dz * dz
  const b = 2 * (fx * dx + fy * dy + fz * dz)
  const c = fx * fx + fy * fy + fz * fz - r * r
  const disc = b * b - 4 * a * c
  if (disc < 0) return false
  const s = Math.sqrt(disc)
  const t1 = (-b - s) / (2 * a)
  return t1 > 0 && t1 < 1
}

/** Click-to-select: projects every visible object on the CPU once per click and picks the nearest to the cursor. */
function Picker() {
  const get = useThree((s) => s.get)

  useEffect(
    () =>
      onCanvasMiss((ev) => {
        const { camera, gl, clock } = get()
        const store = useCatalogStore.getState()
        const layout = store.layout
        if (!layout) return
        const rect = gl.domElement.getBoundingClientRect()
        const px = ev.clientX - rect.left
        const py = ev.clientY - rect.top
        const mask = maskOf(store.enabled)
        const year = simYear()
        const { local, v, center } = scratch
        const world = new Vector3()
        const maxPx = 16
        let best = maxPx * maxPx
        let bestRow = -1

        layout.clouds.forEach((cloud) => {
          if (!cloud.rows.length) return
          cloudCenter(cloud.cfg, center)
          const dist = camera.position.distanceTo(center)
          if (1 - smooth(cloud.cfg.fade[0], cloud.cfg.fade[1], dist) < 0.15) return
          const body = cloud.cfg.center === 'sun' ? undefined : center
          const tilt = cloudTilt(cloud.cfg)
          const ct = Math.cos(tilt), st = Math.sin(tilt)
          for (let s = 0; s < cloud.rows.length; s++) {
            if (!aliveAt(cloud, s, year) || !((cloud.mask[s] | 16) & mask)) continue
            positionAt(cloud.a[s], cloud.e[s], cloud.inc[s], cloud.raan[s], cloud.argp[s], cloud.m0[s], cloud.n[s], clock.elapsedTime, local)
            world.set(center.x + local[0] * ct - local[1] * st, center.y + local[0] * st + local[1] * ct, center.z + local[2])
            v.copy(world).project(camera)
            if (v.z > 1 || v.z < -1) continue
            const dx = (v.x * 0.5 + 0.5) * rect.width - px
            const dy = (-v.y * 0.5 + 0.5) * rect.height - py
            const d2 = dx * dx + dy * dy
            if (d2 >= best) continue
            if (body && segmentHitsSphere(camera.position, world, body, cloud.cfg.radiusScene * 0.98)) continue
            best = d2
            bestRow = cloud.rows[s]
          }
        })
        if (bestRow >= 0) focusRow(bestRow)
      }),
    [get],
  )
  return null
}

export default function CatalogScene() {
  const layout = useCatalogStore((s) => s.layout)
  if (!layout) return null
  return (
    <>
      <ClockTick />
      {layout.clouds.map((c, i) => (c.rows.length ? <Cloud key={c.cfg.id} cloud={c} index={i} /> : null))}
      <Picker />
    </>
  )
}
