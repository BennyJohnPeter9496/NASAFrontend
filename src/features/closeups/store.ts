import { create } from 'zustand'
import { spinScale } from '../../components/Scene/bodyObjects'
import { registerEscape } from '../../lib/escape'
import { claimPanel, registerPanel } from '../../lib/panels'
import { useAppStore } from '../../store/useAppStore'
import { BODY_INFO } from './sites'
import type { BodyKey } from './sites'

interface CloseUpState {
  body: BodyKey | null
  siteId: string | null
  open: (body: BodyKey) => void
  selectSite: (id: string | null) => void
  close: () => void
  /** Closes without moving the camera (another panel took over). */
  dismiss: () => void
}

/** Portrait screens have less room beside the bottom sheet, so the camera stands further back. */
const fit = () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 1.7 : 1)

export const useCloseUpStore = create<CloseUpState>()((set, get) => ({
  body: null,
  siteId: null,

  open: (body) => {
    const prev = get().body
    if (prev && prev !== body) spinScale.delete(prev)
    claimPanel('closeup')
    spinScale.set(body, 0)
    set({ body, siteId: null })
    const app = useAppStore.getState()
    app.setExternalPanel('closeup', true)
    app.flyTo({ target: body, distance: BODY_INFO[body].radius * 4.6 * fit(), azimuth: 25, elevation: 18 })
  },

  selectSite: (id) => {
    const { body } = get()
    if (!body) return
    set({ siteId: id })
    const app = useAppStore.getState()
    if (id) {
      app.flyTo({ target: `site:${id}`, distance: BODY_INFO[body].radius * 2.4 * fit(), facing: body })
    } else {
      app.flyTo({ target: body, distance: BODY_INFO[body].radius * 4.6 * fit(), azimuth: 25, elevation: 18 })
    }
  },

  close: () => {
    get().dismiss()
    useAppStore.getState().flyTo(null)
  },

  dismiss: () => {
    const { body } = get()
    if (body) spinScale.delete(body)
    set({ body: null, siteId: null })
    useAppStore.getState().setExternalPanel('closeup', false)
  },
}))

registerPanel('closeup', () => useCloseUpStore.getState().body && useCloseUpStore.getState().dismiss())

registerEscape(() => {
  const s = useCloseUpStore.getState()
  if (s.siteId) {
    s.selectSite(null)
    return true
  }
  if (s.body) {
    s.close()
    return true
  }
  return false
})

useAppStore.subscribe((s, prev) => {
  if (s.selectedId && s.selectedId !== prev.selectedId && useCloseUpStore.getState().body) useCloseUpStore.getState().dismiss()
})
