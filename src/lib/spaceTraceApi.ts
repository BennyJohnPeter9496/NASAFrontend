/** API client for the SpaceTrace ASP.NET Core backend.
 * Set the base URL in public/app-config.json. This points to the deployed Azure App Service.
 * Values here never contain API keys; Azure OpenAI credentials stay server-side.
 */
export const DEFAULT_API_URL = 'https://nasaapi-anf6fpgacwb3ddgd.westus3-01.azurewebsites.net'

export interface NasaSource {
  title: string
  url: string
  provider?: string
  isChallengeResource?: boolean
  note?: string
}

export interface SpaceComponent {
  id: string
  name: string
  category: string
  location: string
  mission: string
  missionYear: number | null
  shortDescription: string
  purpose: string
  whyLeftBehind: string
  lastKnownStatus: string
  searchTerms: string
  sources: NasaSource[]
}

export interface NasaImage {
  nasaId: string
  title: string
  description?: string | null
  dateCreated?: string | null
  previewImageUrl?: string | null
  nasaItemUrl: string
  provider: string
}

export interface StorySection {
  heading: string
  body: string
}

export interface ExploreResponse {
  component: SpaceComponent
  summary: string
  story: StorySection[]
  images: NasaImage[]
  sources: NasaSource[]
  sourceExcerpts: { title: string; url: string; excerpt: string; retrieved: boolean }[]
  generationMode: string
  verificationStatus: string
  generatedAtUtc: string
}

export interface AskResponse {
  answer: string
  sources: { title: string; url: string }[]
}

export interface HealthResponse {
  status: string
  aiConfigured: boolean
}

export class SpaceTraceApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message)
    this.name = 'SpaceTraceApiError'
  }
}

/** Only trusted http(s) links should be opened from backend-provided NASA sources. */
export function safeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}

let configPromise: Promise<string> | undefined
export function getApiBaseUrl(): Promise<string> {
  if (!configPromise) {
    configPromise = fetch(`${import.meta.env.BASE_URL}app-config.json`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No runtime API config')
        const config = (await response.json()) as { apiBaseUrl?: unknown }
        return typeof config.apiBaseUrl === 'string' && /^https?:\/\//i.test(config.apiBaseUrl)
          ? config.apiBaseUrl.replace(/\/+$/, '')
          : (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL).replace(/\/+$/, '')
      })
      .catch(() => (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL).replace(/\/+$/, ''))
  }
  return configPromise
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = await getApiBaseUrl()
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new SpaceTraceApiError(`Can't reach the space lab at ${base}. Start the backend or check its URL and CORS settings.`)
  }
  if (!response.ok) {
    let detail = `The space lab returned HTTP ${response.status}.`
    try {
      const body = (await response.json()) as { error?: string; title?: string }
      detail = body.error || body.title || detail
    } catch { /* Response was not JSON. */ }
    throw new SpaceTraceApiError(detail, response.status)
  }
  return (await response.json()) as T
}

export const spaceTraceApi = {
  listComponents: (signal?: AbortSignal) => request<SpaceComponent[]>('/api/components', { signal }),
  health: (signal?: AbortSignal) => request<HealthResponse>('/api/health', { signal }),
  explore: (componentId: string, audience: string, signal?: AbortSignal) =>
    request<ExploreResponse>('/api/agent/explore', {
      method: 'POST',
      body: JSON.stringify({ componentId, audience, includeImages: true }),
      signal,
    }),
  ask: (componentId: string, question: string, audience: string, signal?: AbortSignal) =>
    request<AskResponse>('/api/agent/ask', {
      method: 'POST',
      body: JSON.stringify({ componentId, question, audience }),
      signal,
    }),
}

/** Existing 3D models use different ids from the authoritative API catalog. */
export const SCENE_TO_API_COMPONENT: Readonly<Record<string, string>> = {
  'apollo-11': 'apollo-11-descent-stage',
  ingenuity: 'ingenuity-helicopter',
  opportunity: 'spirit-opportunity',
}
