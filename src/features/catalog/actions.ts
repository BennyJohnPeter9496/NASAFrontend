import { Vector3 } from 'three'
import { positions } from '../../components/Scene/positions'
import { useAppStore } from '../../store/useAppStore'
import { useCatalogStore } from './store'
import { registerEscape } from '../../lib/escape'
import { rowWorld } from './worldPos'

registerEscape(() => {
  const s = useCatalogStore.getState()
  if (s.selected !== null) {
    s.clearSelected()
    return true
  }
  if (s.panelOpen) {
    s.setPanelOpen(false)
    return true
  }
  return false
})

/**
 * Selects a catalog row and flies the camera in to its 3D model. The object is held still by default
 * so you can look at it closely; the camera views it from above its orbit.
 */
export function focusRow(row: number) {
  const { layout, select } = useCatalogStore.getState()
  select(row)
  if (!layout) return
  const ci = layout.rowCloud[row]
  if (ci < 0) return
  const cloud = layout.clouds[ci]
  const slot = layout.rowSlot[row]
  const featured = layout.featured.find((f) => f.row === row)
  const size = featured?.def.size ?? 0.16

  let target = positions.get('catalog-selected')
  if (!target) {
    target = new Vector3()
    positions.set('catalog-selected', target)
  }
  rowWorld(cloud, slot, useCatalogStore.getState().heldT, target)

  useAppStore.getState().flyTo({
    target: 'catalog-selected',
    distance: size * 3.4,
    facing: cloud.cfg.center,
    elevation: 28,
    azimuth: 35,
  })
}

/** Frames Earth's whole satellite shell. */
export function flyToEarthShell() {
  useAppStore.getState().flyTo({ target: 'earth', distance: 7, elevation: 25, azimuth: 40 })
}
