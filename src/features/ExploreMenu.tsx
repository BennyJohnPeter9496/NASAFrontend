import { useEffect, useRef, useState } from 'react'
import { FEATURES } from '../config/features'
import { useCatalogStore } from './catalog/store'
import { useCloseUpStore } from './closeups/store'
import { useHuntStore } from './treasureHunt/store'
import { useMissionStore } from './missionControl/store'

interface Item {
  id: string
  icon: string
  label: string
  hint: string
  run: () => void
}

/** Menu entries for every enabled module. */
function useItems(): Item[] {
  const items: Item[] = []
  if (FEATURES.catalog) {
    items.push({
      id: 'catalog',
      icon: '🛰️',
      label: 'Satellite catalog',
      hint: '35,000 tracked objects with filters',
      run: () => useCatalogStore.getState().setPanelOpen(true),
    })
  }
  if (FEATURES.closeUps) {
    items.push(
      {
        id: 'moon',
        icon: '🌙',
        label: 'Moon close-up',
        hint: 'Apollo, Luna, Chang\'e and Chandrayaan sites',
        run: () => useCloseUpStore.getState().open('moon'),
      },
      {
        id: 'mars',
        icon: '🔴',
        label: 'Mars close-up',
        hint: 'Viking to Perseverance landing sites',
        run: () => useCloseUpStore.getState().open('mars'),
      },
    )
  }
  if (FEATURES.treasureHunt) {
    items.push({
      id: 'hunt',
      icon: '🗺️',
      label: 'Treasure Hunt',
      hint: 'Solve riddles by finding the right object',
      run: () => useHuntStore.getState().setOpen(true),
    })
  }
  if (FEATURES.missionControl) {
    items.push({
      id: 'mission',
      icon: '🎛️',
      label: 'Mission Control',
      hint: 'Make the calls on Voyager 2\'s Neptune flyby',
      run: () => useMissionStore.getState().open(),
    })
  }
  return items
}

export function ExploreMenu() {
  const items = useItems()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  if (items.length === 0) return null
  return (
    <div ref={root} className="relative">
      <button
        className="glass flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-white hover:bg-white/10 sm:px-3.5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden>✦</span> Explore
      </button>
      {open && (
        <ul role="menu" className="glass absolute left-0 top-full z-40 mt-2 w-64 rounded-2xl p-1.5 animate-fadeIn">
          {items.map((it) => (
            <li key={it.id} role="none">
              <button
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/10"
                onClick={() => {
                  setOpen(false)
                  it.run()
                }}
              >
                <span className="text-lg" aria-hidden>
                  {it.icon}
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{it.label}</span>
                  <span className="block text-xs text-slate-400">{it.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
