import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { runEscapeHandlers } from '../lib/escape'

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/** Global shortcuts: Esc closes the top-most layer; arrows step through a story. */
export function useGlobalKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useAppStore.getState()
      if (e.key === 'Escape') {
        if (s.quizObjectId) s.closeQuiz()
        else if (s.view === 'passport') s.setView('space')
        else if (runEscapeHandlers()) return
        else if (s.listOpen) s.setListOpen(false)
        else if (s.story) s.exitStory()
        else if (s.selectedId) s.clearSelection()
        return
      }
      if (!s.story || s.quizObjectId || s.view !== 'space' || isTyping(e.target)) return
      if (e.key === 'ArrowRight') s.nextStep()
      else if (e.key === 'ArrowLeft') s.prevStep()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
