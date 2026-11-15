import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import positionsJson from '../data/positions.json'
import { objects, getObject } from '../data'
import { planets } from '../data/bodies'
import sitesJson from '../data/sites.json'
import { CATEGORIES, maskOf } from './catalog/categories'
import { TWO_PI, eccentricToPosition, hash01, positionAt } from './catalog/kepler'
import { buildLayout, FEATURED, aliveAt, kindOf } from './catalog/layout'
import type { CatalogData } from './catalog/layout'
import { OBJECT_MODELS } from '../models/registry'
import { END_YEAR, START_YEAR, provider, timeline } from './timeline/model'
import { SITES, formatCoord, latLonToVector } from './closeups/sites'
import { PASS_SCORE, endingFor, mission, playThrough, scoreOf } from './missionControl/scenario'
import { allDone, levelDone, levels, unlockedIndex } from './treasureHunt/levels'

describe('positions.json (time slider)', () => {
  it('has a keyframe per year for every planet, with strictly increasing unwrapped angles', () => {
    for (const p of planets) {
      const arr = (positionsJson.planets as Record<string, number[]>)[p.id]
      expect(arr, p.id).toHaveLength(positionsJson.keyYears.length)
      for (let i = 1; i < arr.length; i++) expect(arr[i]).toBeGreaterThan(arr[i - 1])
    }
  })

  it('ends each probe at the position stored in objects.json so live mode and "today" agree', () => {
    for (const [id, o] of Object.entries(positionsJson.objects)) {
      const last = o.keys[o.keys.length - 1]
      const obj = getObject(id)!
      expect(last[0]).toBeCloseTo(END_YEAR, 1)
      expect(last[1]).toBeCloseTo(obj.position[0], 2)
      expect(last[2]).toBeCloseTo(obj.position[1], 2)
      expect(last[3]).toBeCloseTo(obj.position[2], 2)
    }
  })

  it('interpolates and hides objects before they exist', () => {
    timeline.active = true
    const out = new Vector3()
    timeline.year = 1977.0
    expect(provider.visible('voyager-1')).toBe(false)
    expect(provider.visible('curiosity')).toBe(false)
    expect(provider.visible('pioneer-10')).toBe(true)
    timeline.year = 2020
    expect(provider.visible('curiosity')).toBe(true)
    expect(provider.visible('perseverance')).toBe(false)
    expect(provider.free('voyager-1', out)).toBe(true)
    expect(provider.free('curiosity', out)).toBe(false)
    // At Jupiter's encounter Voyager 1 is next to Jupiter's position at that time.
    timeline.year = 1979.18
    provider.free('voyager-1', out)
    const a = provider.angle('jupiter')
    expect(Math.hypot(out.x - Math.cos(a) * 25, out.z - Math.sin(a) * 25)).toBeLessThan(0.5)
    timeline.active = false
    timeline.year = END_YEAR
  })

  it('spans 1977 to today', () => {
    expect(START_YEAR).toBe(1977)
    expect(positionsJson.keyYears[0]).toBe(1977)
  })
})

describe('Moon and Mars sites', () => {
  it('has valid coordinates and links', () => {
    for (const body of ['moon', 'mars'] as const) {
      expect(SITES[body].sites.length).toBeGreaterThanOrEqual(8)
      for (const s of SITES[body].sites) {
        expect(Math.abs(s.lat)).toBeLessThanOrEqual(90)
        expect(Math.abs(s.lon)).toBeLessThanOrEqual(180)
        expect(s.text.student.length).toBeGreaterThan(10)
        expect(s.text.explorer.length).toBeGreaterThan(10)
        if (s.objectId) expect(getObject(s.objectId), s.id).toBeDefined()
      }
    }
    expect(Object.keys(sitesJson)).toEqual(['moon', 'mars'])
  })

  it('maps lat/lon onto the sphere the way three.js UVs do', () => {
    const [x, y, z] = latLonToVector(0, 0, 2)
    expect([x, y, z].map((n) => +n.toFixed(6))).toEqual([2, 0, 0])
    const east = latLonToVector(0, 90, 1)
    expect(east[2]).toBeCloseTo(-1, 6)
    const pole = latLonToVector(90, 0, 3)
    expect(pole[1]).toBeCloseTo(3, 6)
    expect(Math.hypot(...latLonToVector(37, -120, 1.5))).toBeCloseTo(1.5, 6)
    expect(formatCoord(-4.59, 137.44)).toBe('4.59°S, 137.44°E')
  })
})

describe('time-accurate catalog', () => {
  const bit = (id: string) => 1 << CATEGORIES.find((c) => c.id === id)!.bit
  const base = (launchY: number[], decayY: number[]): CatalogData => ({
    source: 'test',
    totalInFile: launchY.length,
    counts: {},
    stored: launchY.length,
    earthOrbitWithoutElements: 0,
    cols: {
      id: launchY.map((_, i) => i + 1),
      name: launchY.map((_, i) => `S${i}`),
      type: launchY.map(() => 0),
      ops: launchY.map(() => '+'),
      owner: launchY.map(() => 'US'),
      launch: launchY.map(() => ''),
      decay: decayY.map((d) => (d < 9000 ? '2000-01-01' : '')),
      center: launchY.map(() => 'EA'),
      otype: launchY.map((_, i) => (decayY[i] < 9000 ? 'IMP' : 'ORB')),
      period: launchY.map(() => 92),
      inc: launchY.map(() => 50),
      apo: launchY.map(() => 500),
      peri: launchY.map(() => 480),
      launchY,
      decayY,
      mask: launchY.map(() => bit('inSpace')),
    },
  })

  it('keeps decayed objects and reports when each one existed', () => {
    const layout = buildLayout(base([1985, 2005, 1990], [1995, 9999, 2001]))
    const earth = layout.clouds.find((c) => c.cfg.id === 'earth')!
    expect(earth.rows.length).toBe(3)
    const aliveIn = (y: number) => [0, 1, 2].filter((s) => aliveAt(earth, s, y)).length
    expect(aliveIn(1980)).toBe(0)
    expect(aliveIn(1992)).toBe(2)
    expect(aliveIn(1996)).toBe(1)
    expect(aliveIn(2003)).toBe(0)
    expect(aliveIn(2006)).toBe(1)
    expect(aliveIn(2026.87)).toBe(1)
  })

  it('gives every featured object a far-future GPU launch so it is not also drawn as a generic instance', () => {
    const d = base([1990], [9999])
    d.cols.id = [FEATURED[0].noradId]
    const layout = buildLayout(d)
    const earth = layout.clouds.find((c) => c.cfg.id === 'earth')!
    expect(earth.launchGpu[0]).toBeGreaterThan(1e6)
    expect(earth.launchY[0]).toBe(1990)
    expect(layout.featured).toHaveLength(1)
  })

  it('assigns model kinds', () => {
    expect(kindOf(1, 'FALCON 9 R/B')).toBe(2)
    expect(kindOf(2, 'COSMOS 1408 DEB')).toBe(3)
    expect(kindOf(0, 'STARLINK-1008')).toBe(1)
    expect(kindOf(0, 'HST')).toBe(0)
  })
})

describe('models and Kid mode removal', () => {
  it('has a 3D model for every curated object, and surface objects have valid sites', () => {
    for (const o of objects) {
      const spec = OBJECT_MODELS[o.id]
      expect(spec, o.id).toBeDefined()
      expect(spec.size).toBeGreaterThan(0)
      if (spec.surface) expect(o.anchor).toBe(spec.surface.body)
    }
  })

  it('has a model for every featured catalog object', () => {
    for (const f of FEATURED) expect(f.model.length).toBeGreaterThan(0)
  })

  it('no longer carries any kid text in the data', () => {
    for (const o of objects) expect(Object.keys(o.text)).toEqual(['student', 'explorer'])
    for (const body of ['moon', 'mars'] as const) for (const s of SITES[body].sites) expect(Object.keys(s.text)).toEqual(['student', 'explorer'])
  })
})

describe('Mission Control', () => {
  it('has 3 choices per step', () => {
    for (const s of mission.steps) expect(s.choices).toHaveLength(3)
  })

  it('rewards good decisions and punishes bad ones', () => {
    const best = playThrough(['rotate', 'compress', 'pole', 'gentle', 'prioritise'])
    const safe = playThrough(['skip', 'wait', 'far', 'freeze', 'cameras-off'])
    const worst = playThrough(['long', 'raw', 'equator', 'fast', 'all'])
    expect(best.score).toBeGreaterThanOrEqual(130)
    expect(endingFor(best.score).title).toBe('Triumph at Neptune')
    expect(safe.score).toBeLessThan(PASS_SCORE)
    expect(worst.score).toBeLessThan(80)
    expect(endingFor(worst.score).title).toBe('A hard lesson')
  })

  it('clamps meters to 0..100', () => {
    expect(scoreOf(150, -20)).toBe(100)
  })
})

describe('Treasure Hunt', () => {
  it('has 3 levels of 3 clues whose answers are real objects', () => {
    expect(levels).toHaveLength(3)
    const ids = new Set<string>()
    for (const l of levels) {
      expect(l.clues).toHaveLength(3)
      for (const c of l.clues) {
        expect(getObject(c.answer), c.id).toBeDefined()
        expect(ids.has(c.id)).toBe(false)
        ids.add(c.id)
      }
    }
    expect(objects.length).toBeGreaterThan(0)
  })

  it('unlocks each level only after the previous is complete', () => {
    const solved: Record<string, true> = {}
    expect(unlockedIndex(solved)).toBe(0)
    levels[0].clues.slice(0, 2).forEach((c) => (solved[c.id] = true))
    expect(unlockedIndex(solved)).toBe(0)
    solved[levels[0].clues[2].id] = true
    expect(levelDone(levels[0], solved)).toBe(true)
    expect(unlockedIndex(solved)).toBe(1)
    levels[1].clues.forEach((c) => (solved[c.id] = true))
    expect(unlockedIndex(solved)).toBe(2)
    expect(allDone(solved)).toBe(false)
    levels[2].clues.forEach((c) => (solved[c.id] = true))
    expect(allDone(solved)).toBe(true)
  })
})

describe('orbit maths', () => {
  it('keeps a circular orbit at constant radius and an ellipse between perigee and apogee', () => {
    const out = [0, 0, 0]
    for (let t = 0; t < 50; t += 7) {
      positionAt(2, 0, 0.5, 1.2, 0.3, 0.7, 0.4, t, out)
      expect(Math.hypot(...out)).toBeCloseTo(2, 5)
    }
    for (let t = 0; t < 100; t += 3) {
      positionAt(3, 0.5, 1, 2, 3, 1, 0.9, t, out)
      const r = Math.hypot(...out)
      expect(r).toBeGreaterThanOrEqual(3 * 0.5 - 1e-6)
      expect(r).toBeLessThanOrEqual(3 * 1.5 + 1e-6)
    }
  })

  it('puts an equatorial orbit in the XZ plane and an inclined one out of it', () => {
    const out = [0, 0, 0]
    eccentricToPosition(1, 0, 0, 0.4, 0.9, 1.3, out)
    expect(out[1]).toBeCloseTo(0, 9)
    eccentricToPosition(1, 0, Math.PI / 2, 0, 0, Math.PI / 2, out)
    expect(Math.abs(out[1])).toBeCloseTo(1, 6)
  })

  it('hashes deterministically into [0, 1)', () => {
    expect(hash01(25544, 1)).toBe(hash01(25544, 1))
    for (let i = 0; i < 200; i++) {
      const v = hash01(i * 97, i % 5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    expect(TWO_PI).toBeCloseTo(6.28318, 4)
  })
})

describe('catalog layout', () => {
  const bit = (id: string) => 1 << CATEGORIES.find((c) => c.id === id)!.bit
  const data: CatalogData = {
    source: 'test',
    totalInFile: 5,
    counts: {},
    stored: 5,
    earthOrbitWithoutElements: 0,
    cols: {
      id: [1, 2, 3, 4, 5],
      name: ['A', 'B', 'C', 'D', 'E'],
      type: [0, 1, 2, 0, 0],
      ops: ['+', '', '', '-', ''],
      owner: ['US', 'US', 'US', 'US', 'US'],
      launch: ['2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01'],
      decay: ['', '', '', '', '2005-01-01'],
      launchY: [2000, 2000, 2000, 2000, 2000],
      decayY: [9999, 9999, 9999, 9999, 2005],
      center: ['EA', 'EA', 'EA', 'MO', 'MO'],
      otype: ['ORB', 'ORB', 'ORB', 'ORB', 'IMP'],
      period: [92, 100, 600, -1, -1],
      inc: [51, 98, 10, -1, -1],
      apo: [420, 800, 36000, -1, -1],
      peri: [410, 700, 400, -1, -1],
      mask: [bit('inSpace'), bit('inSpace') | bit('rocketBody'), bit('inSpace') | bit('debris'), bit('inSpace') | bit('moon') | bit('deadSat'), bit('impacted') | bit('moon')],
    },
  }

  it('draws only in-space objects, in the right cloud, with finite elements', () => {
    const layout = buildLayout(data)
    const earth = layout.clouds.find((c) => c.cfg.id === 'earth')!
    const moon = layout.clouds.find((c) => c.cfg.id === 'moon')!
    expect(earth.rows.length).toBe(3)
    expect(moon.rows.length).toBe(1)
    expect(layout.rowCloud[4]).toBe(-1)
    for (const c of layout.clouds) {
      for (let i = 0; i < c.rows.length; i++) {
        for (const arr of [c.a, c.e, c.inc, c.raan, c.argp, c.m0, c.n]) expect(Number.isFinite(arr[i])).toBe(true)
        expect(c.e[i]).toBeLessThan(1)
        expect(c.a[i]).toBeGreaterThan(0)
      }
    }
    // Real elements: higher apogee means a larger and more eccentric orbit.
    expect(earth.a[2]).toBeGreaterThan(earth.a[0])
    expect(earth.e[2]).toBeGreaterThan(earth.e[0])
    expect(layout.drawnByBit[CATEGORIES.find((c) => c.id === 'inSpace')!.bit]).toBe(4)
  })

  it('combines enabled categories into a mask', () => {
    expect(maskOf({ inSpace: true })).toBe(bit('inSpace'))
    expect(maskOf({ debris: true, rocketBody: true })).toBe(bit('debris') | bit('rocketBody'))
    expect(maskOf({})).toBe(0)
  })

  it('matches the generated satcat.json category list when it has been built', () => {
    const file = path.resolve('public/data/satcat.json')
    if (!fs.existsSync(file)) return
    const json = JSON.parse(fs.readFileSync(file, 'utf8')) as { categories: string[]; cols: { id: number[]; mask: number[] } }
    expect(json.categories).toEqual(CATEGORIES.map((c) => c.id))
    expect(json.cols.id.length).toBe(json.cols.mask.length)
  })
})
