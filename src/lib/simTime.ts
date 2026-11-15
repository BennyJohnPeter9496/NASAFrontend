import positionsJson from '../data/positions.json'

/** "Today" for the demo: the end of the time slider. */
export const END_YEAR: number = positionsJson.endYear

/**
 * The simulated date. While the time slider is active every module that shows time-dependent things
 * (planets, probes, catalog objects, landing-site pins) reads the year from here.
 */
export const sim = { active: false, year: END_YEAR }

export const simYear = () => (sim.active ? sim.year : END_YEAR)
