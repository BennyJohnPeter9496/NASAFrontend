import { describe, expect, it } from 'vitest'
import { DEFAULT_API_URL, safeExternalUrl, SCENE_TO_API_COMPONENT } from './spaceTraceApi'

describe('SpaceTrace integration', () => {
  it('uses the deployed Azure App Service as its default API', () => {
    expect(DEFAULT_API_URL).toBe('https://nasaapi-anf6fpgacwb3ddgd.westus3-01.azurewebsites.net')
  })
  it('maps existing interactive 3D objects to actual backend ids', () => {
    expect(SCENE_TO_API_COMPONENT['apollo-11']).toBe('apollo-11-descent-stage')
    expect(SCENE_TO_API_COMPONENT.ingenuity).toBe('ingenuity-helicopter')
    expect(SCENE_TO_API_COMPONENT.opportunity).toBe('spirit-opportunity')
    expect(SCENE_TO_API_COMPONENT['voyager-1']).toBeUndefined()
  })
  it('allows NASA urls but rejects script or malformed URLs', () => {
    expect(safeExternalUrl('https://science.nasa.gov/mission/insight/')).toBe('https://science.nasa.gov/mission/insight/')
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeExternalUrl('not a URL')).toBeUndefined()
  })
})
