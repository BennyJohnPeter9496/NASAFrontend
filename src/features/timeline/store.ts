import { create } from 'zustand'
import { END_YEAR, START_YEAR, timeline } from './model'

interface TimelineState {
  mode: 'live' | 'timeline'
  /** UI mirror of `timeline.year`. */
  year: number
  playing: boolean
  setYear: (year: number) => void
  /** Used by the playback clock; same as setYear but does not leave play mode. */
  tick: (year: number) => void
  togglePlay: () => void
  goLive: () => void
}

const clamp = (y: number) => Math.min(END_YEAR, Math.max(START_YEAR, y))

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  mode: 'live',
  year: END_YEAR,
  playing: false,

  setYear: (y) => {
    const year = clamp(y)
    timeline.active = true
    timeline.year = year
    set({ mode: 'timeline', year })
  },

  tick: (y) => set({ year: clamp(y) }),

  togglePlay: () => {
    const s = get()
    if (s.playing) return set({ playing: false })
    // Restart from the beginning when pressing play at the end.
    const year = s.mode === 'live' || s.year >= END_YEAR - 0.01 ? START_YEAR : s.year
    timeline.active = true
    timeline.year = year
    set({ mode: 'timeline', year, playing: true })
  },

  goLive: () => {
    timeline.active = false
    timeline.year = END_YEAR
    set({ mode: 'live', year: END_YEAR, playing: false })
  },
}))
