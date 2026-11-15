/**
 * Feature flags for the optional modules. Set a flag to `false` to disable a module:
 * its UI, its 3D parts and its menu entry are all skipped, and its code is never loaded.
 * The core demo (scene, cards, modes, stories, quiz, passport) does not depend on any of these.
 */
export const FEATURES = {
  /** Satellite catalog built from satcat.csv, with category filters. */
  catalog: true,
  /** Time slider (1977 to today) driving positions.json. */
  timeline: true,
  /** Moon and Mars close-up views with landing-site pins. */
  closeUps: true,
  /** Decision-based Mission Control mini game. */
  missionControl: true,
  /** Three-level Treasure Hunt. */
  treasureHunt: true,
} as const

export type FeatureId = keyof typeof FEATURES
