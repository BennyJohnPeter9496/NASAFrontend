import { Suspense, lazy } from 'react'
import { FEATURES } from '../config/features'

const named = <T extends Record<string, unknown>>(load: () => Promise<T>, key: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[key] as React.ComponentType })))

// Each module is code-split and only referenced when its flag is on.
const CatalogScene = FEATURES.catalog ? lazy(() => import('./catalog/CatalogScene')) : null
const CatalogPanel = FEATURES.catalog ? named(() => import('./catalog/CatalogPanel'), 'CatalogPanel') : null
const CatalogCard = FEATURES.catalog ? named(() => import('./catalog/CatalogCard'), 'CatalogCard') : null
const TimelineClock = FEATURES.timeline ? lazy(() => import('./timeline/TimelineClock')) : null
const TimelineSlider = FEATURES.timeline ? named(() => import('./timeline/TimelineSlider'), 'TimelineSlider') : null
const CloseUpScene = FEATURES.closeUps ? lazy(() => import('./closeups/CloseUpScene')) : null
const CloseUpPanel = FEATURES.closeUps ? named(() => import('./closeups/CloseUpPanel'), 'CloseUpPanel') : null
const MissionControl = FEATURES.missionControl ? named(() => import('./missionControl/MissionControl'), 'MissionControl') : null
const TreasureHunt = FEATURES.treasureHunt ? named(() => import('./treasureHunt/TreasureHunt'), 'TreasureHunt') : null

/** Rendered inside the R3F canvas. */
export function FeatureScene() {
  return (
    <Suspense fallback={null}>
      {CatalogScene && <CatalogScene />}
      {TimelineClock && <TimelineClock />}
      {CloseUpScene && <CloseUpScene />}
    </Suspense>
  )
}

/** Rendered in the DOM above the canvas. */
export function FeatureOverlays() {
  return (
    <Suspense fallback={null}>
      {CatalogPanel && <CatalogPanel />}
      {CatalogCard && <CatalogCard />}
      {TimelineSlider && <TimelineSlider />}
      {CloseUpPanel && <CloseUpPanel />}
      {TreasureHunt && <TreasureHunt />}
      {MissionControl && <MissionControl />}
    </Suspense>
  )
}
