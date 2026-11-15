import { FEATURES } from '../config/features'
import { allDone } from './treasureHunt/levels'
import { useHuntStore } from './treasureHunt/store'
import { PASS_SCORE } from './missionControl/scenario'
import { useMissionStore } from './missionControl/store'

/** Clears progress stored by optional modules (used by "Reset passport"). */
export function resetFeatureProgress() {
  useHuntStore.getState().reset()
  useMissionStore.setState({ best: null, plays: 0 })
}

export interface ExtraBadge {
  id: string
  name: string
  emoji: string
  hint: string
  earned: boolean
}

/** Passport badges contributed by optional modules. Disabled modules contribute nothing. */
export function useExtraBadges(): ExtraBadge[] {
  const solved = useHuntStore((s) => s.solved)
  const best = useMissionStore((s) => s.best)
  const badges: ExtraBadge[] = []
  if (FEATURES.treasureHunt) {
    badges.push({
      id: 'treasure-hunter',
      name: 'Treasure Hunter',
      emoji: '🗺️',
      hint: 'Solve all three Treasure Hunt levels.',
      earned: allDone(solved),
    })
  }
  if (FEATURES.missionControl) {
    badges.push({
      id: 'flight-director',
      name: 'Flight Director',
      emoji: '🎖️',
      hint: `Score ${PASS_SCORE}+ in Mission Control.`,
      earned: best !== null && best >= PASS_SCORE,
    })
  }
  return badges
}
