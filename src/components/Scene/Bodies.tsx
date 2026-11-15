import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  RingGeometry,
  SRGBColorSpace,
} from 'three'
import type { Group, Mesh, Texture } from 'three'
import { MOON, SUN_RADIUS, TEXTURES, planets } from '../../data/bodies'
import type { BodyDef } from '../../types'
import { positions, updatePositions } from './positions'
import { spinScale, useBodyObjects } from './bodyObjects'

/** Advances every body once per frame, before anything that reads positions. */
export function SolarClock() {
  useFrame((state) => updatePositions(state.clock.elapsedTime), -2)
  return null
}

const asColor = (t: Texture | Texture[]) => {
  for (const tex of Array.isArray(t) ? t : [t]) {
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 8
  }
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,220,140,1)')
  grad.addColorStop(0.25, 'rgba(255,170,70,0.55)')
  grad.addColorStop(1, 'rgba(255,120,30,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

export function Sun() {
  const glow = useMemo(glowTexture, [])
  const map = useTexture(TEXTURES.sun, asColor)
  const mesh = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * 0.03
  })
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
        <meshBasicMaterial map={map} color="#ffd9a0" toneMapped={false} />
      </mesh>
      <sprite scale={[SUN_RADIUS * 6, SUN_RADIUS * 6, 1]}>
        <spriteMaterial map={glow} blending={AdditiveBlending} depthWrite={false} transparent />
      </sprite>
      <pointLight intensity={3.2} decay={0} color="#fff1d6" />
    </group>
  )
}

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

// Rim glow that is strongest on the sun-facing limb. The Sun sits at the world origin.
const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - abs(dot(n, v)), 2.6);
    float lit = clamp(dot(n, normalize(-vWorldPos)) * 0.85 + 0.3, 0.0, 1.0);
    gl_FragColor = vec4(uColor * rim * lit * uIntensity, rim * lit);
  }
`

function Atmosphere({ radius, color, intensity }: { radius: number; color: string; intensity: number }) {
  const uniforms = useMemo(() => ({ uColor: { value: new Color(color) }, uIntensity: { value: intensity } }), [color, intensity])
  return (
    <mesh scale={1.1} raycast={() => null}>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX}
        fragmentShader={ATMOSPHERE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

// drei passes object inputs to onLoad as an array, in key order: map, normalMap, specularMap, emissiveMap, clouds.
const onEarthLoad = (loaded: unknown) => {
  const [map, normalMap, specularMap, emissiveMap, clouds] = loaded as Texture[]
  asColor([map, emissiveMap, clouds])
  normalMap.anisotropy = specularMap.anisotropy = 8
}

function EarthSurface({ radius }: { radius: number }) {
  const t = useTexture(
    {
      map: TEXTURES.earth.map,
      normalMap: TEXTURES.earth.normalMap,
      specularMap: TEXTURES.earth.specularMap,
      emissiveMap: TEXTURES.earth.emissiveMap,
      clouds: TEXTURES.earth.clouds,
    },
    onEarthLoad,
  )
  const clouds = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (clouds.current) clouds.current.rotation.y += dt * 0.04
  })
  return (
    <>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshPhongMaterial
          map={t.map}
          normalMap={t.normalMap}
          specularMap={t.specularMap}
          specular="#3a4a66"
          shininess={14}
          emissiveMap={t.emissiveMap}
          emissive="#ffc27a"
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh ref={clouds} scale={1.012}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshPhongMaterial map={t.clouds} transparent depthWrite={false} opacity={0.9} />
      </mesh>
    </>
  )
}

function GenericSurface({ body }: { body: BodyDef }) {
  const map = useTexture(body.texture, asColor)
  return (
    <mesh>
      <sphereGeometry args={[body.radius, 64, 64]} />
      <meshStandardMaterial map={map} roughness={0.9} metalness={0} />
    </mesh>
  )
}

/** Ring texture is a 1-D radial strip, so remap UVs from planar to radius-based. */
function SaturnRings({ inner, outer }: { inner: number; outer: number }) {
  const map = useTexture(TEXTURES.saturnRing, asColor)
  const geometry = useMemo(() => {
    const g = new RingGeometry(inner, outer, 128, 1)
    const pos = g.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i))
      uv[i * 2] = (r - inner) / (outer - inner)
      uv[i * 2 + 1] = 0.5
    }
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    return g
  }, [inner, outer])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial
        map={map}
        emissiveMap={map}
        emissive="#ffffff"
        emissiveIntensity={0.7}
        side={DoubleSide}
        transparent
        depthWrite={false}
        roughness={1}
      />
    </mesh>
  )
}

function Planet({ body }: { body: BodyDef }) {
  const group = useRef<Group>(null)
  const spinner = useRef<Group>(null)
  const registerBody = useBodyObjects((s) => s.set)

  useEffect(() => {
    registerBody(body.id, spinner.current)
    return () => registerBody(body.id, null)
  }, [body.id, registerBody])

  useFrame((_, dt) => {
    group.current?.position.copy(positions.get(body.id)!)
    if (spinner.current) spinner.current.rotation.y += dt * body.spin * (spinScale.get(body.id) ?? 1)
  })

  return (
    <group ref={group} position={positions.get(body.id)!.toArray()}>
      <group rotation={[0, 0, body.tilt]}>
        <group ref={spinner}>
          {body.id === 'earth' ? <EarthSurface radius={body.radius} /> : <GenericSurface body={body} />}
        </group>
        {body.rings && <SaturnRings inner={body.rings.inner} outer={body.rings.outer} />}
      </group>
      {body.atmosphere && <Atmosphere radius={body.radius} color={body.atmosphere.color} intensity={body.atmosphere.intensity} />}
    </group>
  )
}

function Moon() {
  const ref = useRef<Group>(null)
  const map = useTexture(TEXTURES.moon, asColor)
  const registerBody = useBodyObjects((s) => s.set)

  useEffect(() => {
    registerBody(MOON.id, ref.current)
    return () => registerBody(MOON.id, null)
  }, [registerBody])

  const frozenAngle = useRef<number | null>(null)

  useFrame((state) => {
    const g = ref.current
    if (!g) return
    g.position.copy(positions.get(MOON.id)!)
    // Tidally locked: the 0 degree meridian (+x) always faces Earth. A close-up freezes the surface in place.
    if (spinScale.get(MOON.id) === 0) {
      frozenAngle.current ??= g.rotation.y
      g.rotation.y = frozenAngle.current
    } else {
      frozenAngle.current = null
      g.rotation.y = Math.PI - MOON.speed * state.clock.elapsedTime
    }
  })

  return (
    <group ref={ref} position={positions.get(MOON.id)!.toArray()}>
      <mesh>
        <sphereGeometry args={[MOON.radius, 48, 48]} />
        <meshStandardMaterial map={map} roughness={1} />
      </mesh>
    </group>
  )
}

export function Planets() {
  return (
    <>
      {planets.map((p) => (
        <Planet key={p.id} body={p} />
      ))}
      <Moon />
    </>
  )
}

/** Everything that needs textures. Mounted inside one Suspense so "ready" means "all loaded". */
export function TexturedBodies({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

export function OrbitLines() {
  const material = useMemo(
    () => new LineBasicMaterial({ color: '#8ea2d6', transparent: true, opacity: 0.22, depthWrite: false }),
    [],
  )
  const geometries = useMemo(
    () =>
      planets.map((p) => {
        const pts: number[] = []
        const n = 160
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2
          pts.push(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitRadius)
        }
        const g = new BufferGeometry()
        g.setAttribute('position', new Float32BufferAttribute(pts, 3))
        return g
      }),
    [],
  )
  return (
    <>
      {geometries.map((g, i) => (
        <lineLoop key={planets[i].id} geometry={g} material={material} />
      ))}
    </>
  )
}
