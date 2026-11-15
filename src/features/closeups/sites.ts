import sitesJson from '../../data/sites.json'
import type { Mode } from '../../types'

export type BodyKey = 'moon' | 'mars'

export interface Site {
  id: string
  name: string
  place: string
  lat: number
  lon: number
  date: string
  agency: string
  kind: string
  objectId?: string
  text: Record<Mode, string>
}

export const BODY_KEYS: BodyKey[] = ['moon', 'mars']

export const BODY_INFO: Record<BodyKey, { label: string; radius: number }> = {
  moon: { label: 'The Moon', radius: 0.25 },
  mars: { label: 'Mars', radius: 0.6 },
}

export const SITES = sitesJson as unknown as Record<BodyKey, { label: string; sites: Site[] }>

export const getSite = (body: BodyKey, id: string | null) => SITES[body].sites.find((s) => s.id === id)

/**
 * Surface point for an equirectangular map centred on longitude 0, matching three.js SphereGeometry UVs:
 * longitude 0 faces +x and east longitude runs towards -z.
 */
export function latLonToVector(latDeg: number, lonDeg: number, radius: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon)]
}

export const formatCoord = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`
