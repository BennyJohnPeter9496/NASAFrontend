import { useAppStore } from '../store/useAppStore'

/**
 * Right-hand panels from different modules must not overlap. A module calls `claimPanel(owner)`
 * when it opens one; every other registered owner is asked to close theirs.
 */
const evictors = new Map<string, () => void>()

export const registerPanel = (owner: string, evict: () => void) => {
  evictors.set(owner, evict)
}

export function claimPanel(owner: string) {
  evictors.forEach((evict, o) => {
    if (o !== owner) evict()
  })
  useAppStore.getState().dismissSelection()
  useAppStore.getState().setListOpen(false)
}
