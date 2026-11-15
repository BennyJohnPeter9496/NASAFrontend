import { OrbitControls, Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import { objects } from '../../data'
import { Marker } from '../Marker/Marker'
import { OrbitLines, Planets, SolarClock, Sun, TexturedBodies } from './Bodies'
import { CameraRig } from './CameraRig'
import { FeatureScene } from '../../features'
import { emitCanvasMiss } from '../../lib/pointerMiss'

/** Mounts only after every texture in the surrounding Suspense has loaded. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady))
    return () => cancelAnimationFrame(id)
  }, [onReady])
  return null
}

export default function Scene({ onReady }: { onReady: () => void }) {
  return (
    <div className="absolute inset-0" role="application" aria-label="Interactive 3D solar system. Use the Missions menu to choose an object with the keyboard.">
      <Canvas
        camera={{ position: [34, 77, 93], fov: 50, near: 0.05, far: 2500 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={emitCanvasMiss}
      >
        <color attach="background" args={['#04060f']} />
        <ambientLight intensity={0.35} />
        <SolarClock />
        <TexturedBodies>
          <Sun />
          <Planets />
          <ReadySignal onReady={onReady} />
        </TexturedBodies>
        <OrbitLines />
        <Stars radius={700} depth={150} count={5000} factor={7} saturation={0} fade speed={0.5} />
        {objects.map((o) => (
          <Marker key={o.id} object={o} />
        ))}
        <FeatureScene />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.05}
          maxDistance={280}
          rotateSpeed={0.7}
        />
        <CameraRig />
      </Canvas>
    </div>
  )
}
