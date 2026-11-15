import { create } from 'zustand'
import { useAppStore } from '../../store/useAppStore'
import { claimPanel, registerPanel } from '../../lib/panels'
import { CATEGORIES, DEFAULT_ENABLED } from './categories'
import { buildLayout } from './layout'
import { catalogClock } from './kepler'
import type { CatalogData, Layout } from './layout'

interface CatalogState {
  panelOpen: boolean
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  data: CatalogData | null
  layout: Layout | null
  enabled: Record<string, boolean>
  query: string
  /** Row index of the selected catalog object. */
  selected: number | null
  /** Hold the selected object still (so its model can be inspected) instead of letting it orbit. */
  hold: boolean
  /** Scene-clock time at which the selected object is held. */
  heldT: number

  setPanelOpen: (open: boolean) => void
  load: () => Promise<void>
  toggle: (id: string) => void
  setAll: (on: boolean) => void
  reset: () => void
  setQuery: (q: string) => void
  select: (row: number) => void
  clearSelected: () => void
  setHold: (hold: boolean) => void
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  panelOpen: false,
  status: 'idle',
  error: null,
  data: null,
  layout: null,
  enabled: { ...DEFAULT_ENABLED },
  query: '',
  selected: null,
  hold: true,
  heldT: 0,

  setPanelOpen: (open) => {
    if (open) {
      useAppStore.getState().setListOpen(false)
      void get().load()
    }
    set({ panelOpen: open })
    useAppStore.getState().setExternalPanel('catalog-filters', open, 'left')
  },

  load: async () => {
    if (get().status === 'loading' || get().status === 'ready') return
    set({ status: 'loading', error: null })
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/satcat.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as CatalogData
      set({ data, layout: buildLayout(data), status: 'ready' })
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  },

  toggle: (id) => set((s) => ({ enabled: { ...s.enabled, [id]: !s.enabled[id] } })),
  setAll: (on) => set({ enabled: Object.fromEntries(CATEGORIES.map((c) => [c.id, on])) }),
  reset: () => set({ enabled: { ...DEFAULT_ENABLED } }),
  setQuery: (query) => set({ query }),

  select: (row) => {
    claimPanel('catalog')
    useAppStore.getState().setExternalPanel('catalog', true)
    set({ selected: row, heldT: catalogClock.t })
  },

  setHold: (hold) => set({ hold }),

  clearSelected: () => {
    set({ selected: null })
    useAppStore.getState().setExternalPanel('catalog', false)
  },
}))

// Core selections and the Missions list take over the side panel from the catalog.
registerPanel('catalog', () => {
  if (useCatalogStore.getState().selected !== null) useCatalogStore.getState().clearSelected()
})

useAppStore.subscribe((s, prev) => {
  const cat = useCatalogStore.getState()
  if (s.selectedId && s.selectedId !== prev.selectedId && cat.selected !== null) cat.clearSelected()
  if (s.listOpen && !prev.listOpen && cat.panelOpen) cat.setPanelOpen(false)
})
