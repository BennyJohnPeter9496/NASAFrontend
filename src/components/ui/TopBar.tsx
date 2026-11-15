import { useAppStore } from '../../store/useAppStore'
import { ModeToggle } from '../ModeToggle/ModeToggle'
import { ExploreMenu } from '../../features/ExploreMenu'

export function TopBar({ onOpenGuide, onCloseGuide }: { onOpenGuide: () => void; onCloseGuide: () => void }) {
  const listOpen = useAppStore((s) => s.listOpen)
  const setListOpen = useAppStore((s) => s.setListOpen)
  const setView = useAppStore((s) => s.setView)
  const clear = useAppStore((s) => s.clearSelection)
  const badgeCount = useAppStore((s) => Object.keys(s.badges).length)

  return (
    <header className="sg-main-header pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-wrap items-center justify-between gap-2 px-3 py-3 md:px-6 md:py-4">
      <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
        <button className="sg-brand" onClick={onOpenGuide} title="Open SpaceTrace Junior Explorer">
          <span className="sg-brand-mark" aria-hidden>✦</span>
          <span className="sg-brand-text"><strong>space<span>trace</span><span className="sg-brand-star">✳</span></strong><small>THE JUNIOR EXPLORER LAB</small></span>
        </button>
        <div className="hidden h-8 w-px bg-white/15 xl:block" />
        <nav className="sg-top-links hidden items-center gap-2 xl:flex" aria-label="Space exploration navigation">
          <button onClick={() => { clear(); onCloseGuide() }}>⌂ <span>3D Universe</span></button>
          <button onClick={onOpenGuide}>✦ <span>NASA Missions</span></button>
          <ExploreMenu />
        </nav>
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 md:gap-2">
        <div className="hidden md:block"><ModeToggle /></div>
        <button className="sg-top-action hidden sm:flex" onClick={() => setListOpen(!listOpen)} aria-expanded={listOpen} aria-controls="missions-menu">☰ <span>3D objects</span></button>
        <button className="sg-top-action sg-passport" onClick={() => setView('passport')} title="Open your explorer passport">
          🏅 <span className="hidden sm:inline">Passport</span><span className="sg-badge-count">{badgeCount}</span>
        </button>
        <button className="sg-top-ask" onClick={onOpenGuide}>✦ <span>Ask Astro</span> <span aria-hidden>↗</span></button>
      </div>

      <div className="pointer-events-auto flex w-full justify-between gap-2 md:hidden">
        <div className="flex items-center gap-2">
          <button className="sg-top-action" onClick={() => setListOpen(!listOpen)} aria-expanded={listOpen} aria-controls="missions-menu">☰ 3D objects</button>
          <button className="sg-top-action" onClick={() => { clear(); onCloseGuide() }}>⌂ Orbit</button>
        </div>
        <ModeToggle />
      </div>
    </header>
  )
}
