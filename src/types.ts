export type Mode = 'student' | 'explorer'
export type Status = 'talking' | 'complete' | 'silent'
export type Vec3 = [number, number, number]

export interface SpaceObject {
  id: string
  name: string
  type: string
  status: Status
  launchDate: string
  distanceFromEarthAU: number
  /** World position, or an offset from `anchor` when `anchor` is set. */
  position: Vec3
  anchor?: string
  color: string
  discovery: string
  isSpotlight: boolean
  text: Record<Mode, string>
}

export interface CameraSpec {
  /** Object id or body id (sun, earth, mars...) */
  target: string
  distance: number
  /** Degrees. Omit to keep the current viewing direction. */
  azimuth?: number
  elevation?: number
  /** View `target` from the outside of this body (e.g. a surface pin seen from above its planet). */
  facing?: string
}

export interface StoryStep {
  id: string
  title: string
  text: Record<Mode, string>
  camera: CameraSpec
}

export interface Story {
  badge: { name: string; emoji: string }
  steps: StoryStep[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface BodyDef {
  id: string
  name: string
  radius: number
  orbitRadius: number
  /** Radians per second */
  speed: number
  phase: number
  color: string
  texture: string
  /** Axial tilt in radians. */
  tilt: number
  /** Self-rotation in radians per second. */
  spin: number
  atmosphere?: { color: string; intensity: number }
  rings?: { inner: number; outer: number }
}
