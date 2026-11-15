import type { ModelName } from './spacecraft'

export interface ObjectModel {
  model: ModelName
  /** Model size in scene units once the camera is close (the planets themselves are stylised, not to scale). */
  size: number
  /** Camera distance as a multiple of `size`; smaller means a tighter shot. Defaults to 3.6. */
  zoom?: number
  /** Where the object sits on a world's surface, rotating with it. */
  surface?: { body: 'mars' | 'moon'; lat: number; lon: number; hover?: number }
}

/** 3D model, size and surface placement for every curated object. */
export const OBJECT_MODELS: Record<string, ObjectModel> = {
  'voyager-1': { model: 'voyager', size: 0.7 },
  'voyager-2': { model: 'voyager', size: 0.7 },
  'pioneer-10': { model: 'pioneer', size: 0.7 },
  'new-horizons': { model: 'newHorizons', size: 0.6 },
  cassini: { model: 'cassini', size: 0.5 },
  curiosity: { model: 'curiosity', size: 0.07, surface: { body: 'mars', lat: -4.59, lon: 137.44 } },
  perseverance: { model: 'perseverance', size: 0.07, surface: { body: 'mars', lat: 18.44, lon: 77.45 } },
  opportunity: { model: 'opportunity', size: 0.06, surface: { body: 'mars', lat: -1.95, lon: -5.53 } },
  ingenuity: { model: 'ingenuity', size: 0.07, zoom: 1.7, surface: { body: 'mars', lat: 20.4, lon: 72.2, hover: 0.07 } },
  'apollo-11': { model: 'lander', size: 0.045, surface: { body: 'moon', lat: 0.67, lon: 23.47 } },
}

/** Camera distance at which an object's model fills a good part of the view. */
export const viewDistance = (id: string) => (OBJECT_MODELS[id]?.size ?? 0.3) * (OBJECT_MODELS[id]?.zoom ?? 3.6)
