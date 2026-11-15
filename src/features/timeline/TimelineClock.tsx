import { useFrame } from '@react-three/fiber'
import { END_YEAR, timeline } from './model'
import { useTimelineStore } from './store'

const YEARS_PER_SECOND = 1.2

/** Advances the timeline while playing. Mutates plain state; React only hears about it ~10 times a second. */
export default function TimelineClock() {
  useFrame((_, dt) => {
    const s = useTimelineStore.getState()
    if (!s.playing) return
    timeline.year = Math.min(END_YEAR, timeline.year + Math.min(dt, 0.1) * YEARS_PER_SECOND)
    if (timeline.year >= END_YEAR) useTimelineStore.setState({ playing: false, year: END_YEAR })
    else if (Math.abs(timeline.year - s.year) > 0.08) s.tick(timeline.year)
  })
  return null
}
