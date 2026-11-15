import { create } from 'zustand'
import type { Object3D } from 'three'

/**
 * The rotating surface group of each body, registered by the core scene so optional modules
 * can attach things to a planet's surface (they rotate with it).
 */
interface BodyObjects {
  objects: Record<string, Object3D | undefined>
  set: (id: string, obj: Object3D | null) => void
}

export const useBodyObjects = create<BodyObjects>()((set) => ({
  objects: {},
  set: (id, obj) => set((s) => ({ objects: { ...s.objects, [id]: obj ?? undefined } })),
}))

/** Per-body multiplier for self-rotation speed (0 freezes a planet for a close-up). */
export const spinScale = new Map<string, number>()
