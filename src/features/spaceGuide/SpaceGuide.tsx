import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAppStore } from '../../store/useAppStore'
import {
  safeExternalUrl, SCENE_TO_API_COMPONENT, spaceTraceApi,
  type AskResponse, type ExploreResponse, type SpaceComponent,
} from '../../lib/spaceTraceApi'
import './spaceGuide.css'

type Destination = 'All' | 'Moon' | 'Mars'
type DetailTab = 'story' | 'ask'
type ChatEntry = { question: string; response: AskResponse }

const DESTINATIONS: Destination[] = ['All', 'Moon', 'Mars']
const PLANET_ICON: Record<string, string> = { Moon: '🌙', Mars: '🪐' }
const PROMPTS = [
  { icon: '✨', label: 'What makes it special?', make: (c: SpaceComponent) => `What makes ${c.name} special?` },
  { icon: '🔎', label: 'Why was it left there?', make: (c: SpaceComponent) => `Why was ${c.name} left behind?` },
  { icon: '🚀', label: 'What happened next?', make: (c: SpaceComponent) => `What happened to ${c.name}?` },
]

function getFriendlyError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function SourceLink({ url, title, children }: { url: string; title: string; children?: ReactNode }) {
  const href = safeExternalUrl(url)
  if (!href) return null
  return (
    <a className="sg-source-link" href={href} target="_blank" rel="noopener noreferrer" title={title}>
      <span className="sg-source-spark" aria-hidden>✧</span>
      <span>{children ?? title}</span>
      <span aria-hidden>↗</span>
    </a>
  )
}

export function SpaceGuide({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const [catalog, setCatalog] = useState<SpaceComponent[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [retryCatalog, setRetryCatalog] = useState(0)
  const [destination, setDestination] = useState<Destination>('All')
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('story')
  const [story, setStory] = useState<ExploreResponse | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  const [storyError, setStoryError] = useState<string | null>(null)
  const [retryStory, setRetryStory] = useState(0)
  const [health, setHealth] = useState<{ aiConfigured: boolean } | null>(null)
  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState<ChatEntry[]>([])
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const askController = useRef<AbortController | null>(null)
  const selectedSceneId = useAppStore((s) => s.selectedId)
  const dismissSelection = useAppStore((s) => s.dismissSelection)
  const flyTo = useAppStore((s) => s.flyTo)
  const mode = useAppStore((s) => s.mode)
  const audience = mode === 'student' ? 'children ages 8 to 12' : 'students ages 13 to 17'
  const detailScroll = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setCatalogLoading(true)
    setCatalogError(null)
    spaceTraceApi.listComponents(controller.signal)
      .then((data) => setCatalog(data))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCatalogError(getFriendlyError(error))
      })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    spaceTraceApi.health(controller.signal)
      .then((data) => setHealth(data))
      .catch(() => { if (!controller.signal.aborted) setHealth(null) })
    return () => controller.abort()
  }, [retryCatalog])

  // Clicking an existing Three.js marker opens the matching NASA artifact, when available.
  useEffect(() => {
    if (!selectedSceneId) return
    const mappedId = SCENE_TO_API_COMPONENT[selectedSceneId]
    if (!mappedId) return
    askController.current?.abort()
    setAsking(false)
    setChat([])
    setQuestion('')
    setAskError(null)
    setActiveId(mappedId)
    setDetailTab('story')
    onOpen()
  }, [selectedSceneId, onOpen])

  useEffect(() => {
    if (!activeId || !open) return
    const controller = new AbortController()
    setStory(null)
    setStoryError(null)
    setStoryLoading(true)
    spaceTraceApi.explore(activeId, audience, controller.signal)
      .then(setStory)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setStoryError(getFriendlyError(error))
      })
      .finally(() => { if (!controller.signal.aborted) setStoryLoading(false) })
    return () => controller.abort()
  }, [activeId, audience, retryStory, open])

  const active = useMemo(
    () => catalog.find((c) => c.id === activeId) ?? (story?.component.id === activeId ? story.component : null),
    [catalog, activeId, story],
  )
  const filtered = catalog.filter((c) => destination === 'All' || c.location === destination)
  const visible = expanded ? filtered : filtered.slice(0, 4)

  const choose = useCallback((component: SpaceComponent) => {
    askController.current?.abort()
    dismissSelection()
    setActiveId(component.id)
    setDetailTab('story')
    setChat([])
    setQuestion('')
    setAskError(null)
    setAsking(false)
    // Keep the solar-system canvas interactive and show the right planet behind the card.
    const planet = component.location.toLowerCase()
    if (planet === 'moon' || planet === 'mars') {
      flyTo({ target: planet, distance: planet === 'moon' ? 4 : 7, elevation: 25, azimuth: 22 })
    }
    onOpen()
  }, [dismissSelection, flyTo, onOpen])

  const askQuestion = useCallback(async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim()
    if (!activeId || !trimmed || trimmed.length > 600 || asking) return
    const controller = new AbortController()
    askController.current?.abort()
    askController.current = controller
    setAsking(true)
    setAskError(null)
    setQuestion('')
    setDetailTab('ask')
    try {
      const response = await spaceTraceApi.ask(activeId, trimmed, audience, controller.signal)
      if (!controller.signal.aborted) setChat((previous) => [...previous, { question: trimmed, response }])
    } catch (error) {
      if (!controller.signal.aborted) {
        setAskError(getFriendlyError(error))
        setQuestion(trimmed)
      }
    } finally {
      if (!controller.signal.aborted) setAsking(false)
    }
  }, [activeId, asking, audience])

  useEffect(() => {
    // Cancel any in-flight answer when navigating to a different artifact.
    return () => askController.current?.abort()
  }, [activeId])

  useEffect(() => {
    if (detailTab === 'ask') detailScroll.current?.scrollTo({ top: detailScroll.current.scrollHeight, behavior: 'smooth' })
  }, [chat, detailTab, asking])

  if (!open) return null

  return (
    <div className={`sg-workspace pointer-events-none ${activeId ? 'sg-workspace--detail' : ''}`}>
      <aside className={`sg-discover pointer-events-auto ${activeId ? 'sg-discover--compact' : ''}`} aria-label="NASA mission explorer">
        <div className="sg-discover-top">
          <div className="sg-eyebrow"><span className="sg-spark">✦</span> YOUR ADVENTURE BEGINS HERE</div>
          <button className="sg-small-close" onClick={onClose} aria-label="Hide explorer">✕</button>
        </div>

        <div className="sg-intro">
          <div className="sg-sticker" aria-hidden>🚀<span className="sg-sticker-star">✳</span></div>
          <div className="sg-intro-eyebrow">HEY, SPACE EXPLORER! <span aria-hidden>👋</span></div>
          <h2>Big questions.<br /><span>Cosmic answers.</span></h2>
          <p>Pick a real mission, uncover its story, and ask anything you're curious about!</p>
          <div className="sg-intro-metrics"><span>✺ Real NASA missions</span><span>✦ AI space buddy</span></div>
        </div>

        <div className="sg-mission-heading">
          <div>
            <div className="sg-section-kicker">CHOOSE YOUR DESTINATION</div>
            <h3>Pick a space adventure <span aria-hidden>↗</span></h3>
          </div>
          <span className={`sg-api-light ${catalogError ? 'sg-api-light--offline' : catalogLoading ? 'sg-api-light--loading' : ''}`}
            title={catalogError || (catalogLoading ? 'Connecting to the backend' : 'Connected to the backend')}>
            <i /> {catalogError ? 'Offline' : catalogLoading ? 'Connecting' : 'Live API'}
          </span>
        </div>

        <div className="sg-filters" aria-label="Filter missions by location">
          {DESTINATIONS.map((place) => (
            <button key={place} className={`sg-filter ${destination === place ? 'sg-filter--selected' : ''}`}
              onClick={() => { setDestination(place); setExpanded(false) }}
              aria-pressed={destination === place}>
              {place === 'All' ? '✦' : PLANET_ICON[place]} {place === 'All' ? 'All missions' : place}
            </button>
          ))}
        </div>

        {catalogLoading && (
          <div className="sg-mission-placeholder" role="status"><span className="sg-loading-star">✦</span> Finding NASA missions…</div>
        )}
        {catalogError && (
          <div className="sg-alert" role="alert">
            <strong>Houston, we have a connection problem!</strong>
            <p>{catalogError}</p>
            <button onClick={() => setRetryCatalog((n) => n + 1)}>↻ Try connecting again</button>
          </div>
        )}
        {!catalogLoading && !catalogError && (
          <div className="sg-missions">
            {visible.map((component, index) => (
              <button key={component.id} className={`sg-mission-card ${activeId === component.id ? 'sg-mission-card--active' : ''}`}
                onClick={() => choose(component)} aria-pressed={activeId === component.id}>
                <span className={`sg-mission-thumbnail sg-mission-thumbnail--${component.location.toLowerCase()}`} aria-hidden>
                  <span>{component.location === 'Moon' ? ['🌕', '🚙', '🔬', '🛰️'][index % 4] : ['🚁', '🤖', '🛸', '🔭'][index % 4]}</span>
                </span>
                <span className="sg-mission-copy">
                  <span className="sg-mission-place">{component.location.toUpperCase()} · {component.missionYear ?? 'NASA'}</span>
                  <span className="sg-mission-title">{component.name}</span>
                  <span className="sg-mission-description">{component.shortDescription}</span>
                </span>
                <span className="sg-mission-arrow" aria-hidden>↗</span>
              </button>
            ))}
            {!filtered.length && <p className="sg-empty">No missions found for this destination.</p>}
            {filtered.length > 4 && (
              <button className="sg-show-more" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Show fewer missions ↑' : `See all ${filtered.length} adventures ↓`}
              </button>
            )}
          </div>
        )}
        <div className="sg-discover-footer"><span>✦</span> Small explorers. Infinite possibilities.</div>
      </aside>

      {activeId && (
        <section className="sg-detail pointer-events-auto" aria-label="NASA mission details and Ask Astro">
          <header className="sg-detail-header">
            <div className="sg-bot-icon" aria-hidden><span>✦</span><b>🤖</b></div>
            <div className="sg-detail-heading">
              <div className="sg-bot-eyebrow">YOUR PERSONAL SPACE BUDDY <span className="sg-bot-online">● READY TO EXPLORE</span></div>
              <h2>Meet Astro <span aria-hidden>✦</span></h2>
            </div>
            <button className="sg-detail-close" onClick={() => { askController.current?.abort(); setActiveId(null); setChat([]); setAsking(false) }}
              aria-label="Close mission and return to the list">✕</button>
          </header>

          <div className="sg-detail-tabs" role="tablist" aria-label="Space mission views">
            <button role="tab" aria-selected={detailTab === 'story'} className={detailTab === 'story' ? 'sg-tab--active' : ''}
              onClick={() => setDetailTab('story')}>📖 Mission story</button>
            <button role="tab" aria-selected={detailTab === 'ask'} className={detailTab === 'ask' ? 'sg-tab--active' : ''}
              onClick={() => setDetailTab('ask')}>💬 Ask Astro {chat.length > 0 && <span className="sg-tab-count">{chat.length}</span>}</button>
          </div>

          <div className="sg-detail-scroll" ref={detailScroll}>
            {detailTab === 'story' ? (
              <>
                <div className="sg-planet-banner">
                  {story?.images?.[0]?.previewImageUrl && safeExternalUrl(story.images[0].previewImageUrl) ? (
                    <img src={safeExternalUrl(story.images[0].previewImageUrl)} alt={story.images[0].title} loading="lazy" />
                  ) : <span className="sg-planet-banner-icon" aria-hidden>{active?.location === 'Moon' ? '🌕' : '🪐'}</span>}
                  <div className="sg-planet-banner-label">{active?.location ?? 'SPACE'} EXPLORATION • NASA ARCHIVES</div>
                </div>
                <div className="sg-story-intro">
                  <div className="sg-story-badge">🚀 MISSION DISCOVERY</div>
                  <h3>{active?.name ?? 'Loading your mission…'}</h3>
                  <p>{active?.shortDescription}</p>
                </div>

                {storyLoading && <div className="sg-story-loading" role="status"><span className="sg-loading-star">✦</span><strong>Astro is exploring the NASA archives…</strong><p>Getting your story and mission pictures.</p></div>}
                {storyError && <div className="sg-alert" role="alert"><strong>Couldn't load this story</strong><p>{storyError}</p><button onClick={() => setRetryStory((n) => n + 1)}>↻ Retry mission story</button></div>}
                {story && !storyLoading && (
                  <>
                    <div className="sg-summary"><span aria-hidden>✨</span><p>{story.summary}</p></div>
                    <h4 className="sg-content-title">The story so far <span aria-hidden>✦</span></h4>
                    <div className="sg-story-sections">
                      {story.story.map((section, index) => (
                        <article key={`${section.heading}-${index}`} className="sg-story-section">
                          <span className="sg-story-number">0{index + 1}</span>
                          <div><h5>{section.heading}</h5><p>{section.body}</p></div>
                        </article>
                      ))}
                    </div>
                    {story.images.length > 1 && (
                      <div className="sg-gallery">
                        {story.images.slice(1, 3).map((img) => safeExternalUrl(img.previewImageUrl) && (
                          <a key={img.nasaId} href={safeExternalUrl(img.nasaItemUrl)} target="_blank" rel="noopener noreferrer" title={`View ${img.title} at NASA`}>
                            <img src={safeExternalUrl(img.previewImageUrl)} alt={img.title} loading="lazy" /><span>NASA photo ↗</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {story.sources.length > 0 && (
                      <div className="sg-sources"><h4>🔭 Explore NASA sources</h4>
                        {story.sources.map((source) => <SourceLink key={source.url} url={source.url} title={source.title} />)}
                      </div>
                    )}
                    <p className="sg-source-note">AI stories are drafts based on reference material. Use the linked NASA records to verify facts. Images are illustrative, not live views.</p>
                  </>
                )}
              </>
            ) : (
              <div className="sg-chat">
                <div className="sg-chat-intro"><div className="sg-astro-face" aria-hidden>🤖</div><strong>Hi, curious astronaut! 👋</strong>
                  <p>I'm Astro! Ask me about <b>{active?.name ?? 'this mission'}</b>. I'll search the mission facts and show where my answer comes from.</p>
                </div>
                {chat.map((entry, index) => (
                  <div className="sg-chat-exchange" key={index}>
                    <div className="sg-chat-question"><span>You asked</span><p>{entry.question}</p></div>
                    <div className="sg-chat-answer"><span>✦ ASTRO SAYS</span><p>{entry.response.answer}</p>
                      {entry.response.sources.length > 0 && (
                        <div className="sg-chat-sources">NASA references: {entry.response.sources.map((source) => (
                          <SourceLink key={source.url} url={source.url} title={source.title} />
                        ))}</div>
                      )}
                      {entry.response.sources.length === 0 && <small>No matching source was found for this answer.</small>}
                    </div>
                  </div>
                ))}
                {asking && <div className="sg-chat-answer sg-chat-wait" role="status"><span>✦ ASTRO IS THINKING</span><p>Searching mission facts <span className="sg-ellipsis">...</span></p></div>}
                {health && !health.aiConfigured && <div className="sg-demo-note">✧ Azure AI is not configured on the backend yet. Answers use the available mission evidence and demo fallback.</div>}
              </div>
            )}
          </div>

          <div className="sg-ask-dock">
            {active && (
              <div className="sg-question-suggestions">
                {PROMPTS.map((prompt) => (
                  <button key={prompt.label} disabled={asking} onClick={() => void askQuestion(prompt.make(active))}>
                    <span aria-hidden>{prompt.icon}</span>{prompt.label}
                  </button>
                ))}
              </div>
            )}
            {askError && <p className="sg-ask-error" role="alert">⚠ {askError}</p>}
            <form className="sg-ask-form" onSubmit={(event) => { event.preventDefault(); void askQuestion(question) }}>
              <label className="sr-only" htmlFor="sg-question">Ask Astro a question</label>
              <input id="sg-question" maxLength={600} value={question} disabled={asking} onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything about this mission..." autoComplete="off" />
              <button type="submit" disabled={!question.trim() || asking} aria-label="Send question to Ask API">{asking ? '⋯' : '➤'}</button>
            </form>
            <div className="sg-powered-by">✦ Powered by SpaceTrace API <span>•</span> NASA reference links included</div>
          </div>
        </section>
      )}

      {!activeId && (
        <div className="sg-floating-tip pointer-events-auto"><span className="sg-floating-rocket" aria-hidden>👩‍🚀</span><div><strong>Hi, I'm Astro!</strong><span>Choose a mission and ask me anything.</span></div><span aria-hidden>✦</span></div>
      )}
    </div>
  )
}
