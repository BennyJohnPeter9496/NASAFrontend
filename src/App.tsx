import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useGlobalKeys } from './hooks/useGlobalKeys'
import { useAppStore } from './store/useAppStore'
import { ObjectCard } from './components/ObjectCard/ObjectCard'
import { StoryPlayer } from './components/StoryPlayer/StoryPlayer'
import { Quiz } from './components/Quiz/Quiz'
import { Passport } from './components/Passport/Passport'
import { TopBar } from './components/ui/TopBar'
import { ObjectList } from './components/ui/ObjectList'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { FeatureOverlays } from './features'
import { SpaceGuide } from './features/spaceGuide/SpaceGuide'
import { SCENE_TO_API_COMPONENT } from './lib/spaceTraceApi'

const Scene = lazy(() => import('./components/Scene/Scene'))

export default function App() {
  const [ready, setReady] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)
  const openGuide = useCallback(() => setGuideOpen(true), [])
  const closeGuide = useCallback(() => setGuideOpen(false), [])
  const onReady = useCallback(() => setReady(true), [])
  const inStory = useAppStore((s) => !!s.story)
  const selectedId = useAppStore((s) => s.selectedId)
  const hasSelection = !!selectedId
  useEffect(() => {
    if (selectedId) setGuideOpen(!!SCENE_TO_API_COMPONENT[selectedId])
  }, [selectedId])
  useGlobalKeys()

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-space-950 text-slate-100">
      <Suspense fallback={null}>
        <Scene onReady={onReady} />
      </Suspense>

      <div className="pointer-events-none absolute inset-0">
        <TopBar onOpenGuide={openGuide} onCloseGuide={closeGuide} />
        <ObjectList />
        {!guideOpen && (inStory ? <StoryPlayer /> : <ObjectCard />)}
        <SpaceGuide open={guideOpen} onOpen={openGuide} onClose={closeGuide} />
        <FeatureOverlays />
        {!guideOpen && !hasSelection && ready && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/30 px-4 py-2 text-xs text-slate-300 backdrop-blur md:block animate-fadeIn">
            Drag to orbit · scroll to zoom · click a glowing marker to explore
          </p>
        )}
        <p className="pointer-events-auto absolute bottom-2 left-3 hidden text-[10px] text-slate-500 md:block">
          Textures:{' '}
          <a className="underline hover:text-slate-300" href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
            Solar System Scope
          </a>{' '}
          (CC BY 4.0) · three.js (MIT)
        </p>
      </div>

      <Quiz />
      <Passport />
      <LoadingScreen ready={ready} />
    </div>
  )
}
