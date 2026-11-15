export interface CategoryDef {
  id: string
  label: string
  /** The rule from the filter table, shown to the user. */
  rule: string
  /** Bit used in each row's `mask`. */
  bit: number
}

// Order and bits must match scripts/build-satcat.mjs.
export const CATEGORIES: CategoryDef[] = [
  { id: 'deadSat', label: 'Dead satellite', rule: 'OBJECT_TYPE = PAY and non-operational status', bit: 0 },
  { id: 'rocketBody', label: 'Rocket body', rule: 'OBJECT_TYPE = R/B', bit: 1 },
  { id: 'debris', label: 'Fragment / debris', rule: 'OBJECT_TYPE = DEB', bit: 2 },
  { id: 'unknown', label: 'Unknown', rule: 'OBJECT_TYPE = UNK', bit: 3 },
  { id: 'inSpace', label: 'Still in space', rule: 'DECAY_DATE blank and ORBIT_TYPE = ORB', bit: 4 },
  { id: 'landed', label: 'Landed hardware', rule: 'ORBIT_TYPE = LAN', bit: 5 },
  { id: 'impacted', label: 'Impacted hardware', rule: 'ORBIT_TYPE = IMP', bit: 6 },
  { id: 'moon', label: 'Moon resource', rule: 'ORBIT_CENTER = MO', bit: 7 },
  { id: 'mars', label: 'Mars resource', rule: 'ORBIT_CENTER = MA', bit: 8 },
  { id: 'solar', label: 'Solar-orbit resource', rule: 'ORBIT_CENTER = SU', bit: 9 },
  { id: 'escaped', label: 'Escaped spacecraft', rule: 'ORBIT_CENTER = SS', bit: 10 },
]

export const DEFAULT_ENABLED: Record<string, boolean> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === 'inSpace']))

export const maskOf = (enabled: Record<string, boolean>) =>
  CATEGORIES.reduce((m, c) => (enabled[c.id] ? m | (1 << c.bit) : m), 0)

export const TYPE_LABEL = ['Payload (satellite)', 'Rocket body', 'Debris fragment', 'Unknown object'] as const
export const TYPE_COLOR = {
  alive: '#5eead4',
  dead: '#fb7185',
  rocket: '#fbbf24',
  debris: '#94a3b8',
  unknown: '#c084fc',
} as const

export const OPS_LABEL: Record<string, string> = {
  '+': 'Operational',
  '-': 'Non-operational',
  P: 'Partially operational',
  B: 'Backup / standby',
  S: 'Spare',
  X: 'Extended mission',
  D: 'Decayed',
  '': 'Unknown',
}

export const OWNER_LABEL: Record<string, string> = {
  US: 'the United States',
  CIS: 'the former Soviet Union / Russia',
  PRC: 'China',
  JPN: 'Japan',
  IND: 'India',
  ESA: 'the European Space Agency',
  FR: 'France',
  UK: 'the United Kingdom',
  GER: 'Germany',
  CA: 'Canada',
  ISS: 'the International Space Station partners',
  SKOR: 'South Korea',
  ITSO: 'Intelsat',
  GLOB: 'Globalstar',
  ORB: 'Orbcomm',
  SES: 'SES',
  AB: 'Arabsat',
  ISRA: 'Israel',
  IT: 'Italy',
  AUS: 'Australia',
  BRAZ: 'Brazil',
  TURK: 'Turkey',
  UAE: 'the United Arab Emirates',
  NICO: 'New ICO',
  O3B: 'O3b Networks',
  EUME: 'EUMETSAT',
  EUTE: 'Eutelsat',
  SPN: 'Spain',
  TBD: 'an unknown owner',
}

/** Catalog rows that match a curated object, so we can offer its full card. */
export const CURATED_MATCH: Record<string, string> = {
  'VOYAGER 1': 'voyager-1',
  'VOYAGER 2': 'voyager-2',
  'PIONEER 10': 'pioneer-10',
  'NEW HORIZONS': 'new-horizons',
}
