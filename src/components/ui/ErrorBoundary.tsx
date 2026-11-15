import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Sky Archive crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex h-dvh w-screen items-center justify-center bg-space-950 p-6 text-slate-100">
        <div className="glass max-w-md rounded-2xl p-8 text-center">
          <div className="mb-3 text-5xl" aria-hidden>
            🛰️
          </div>
          <h1 className="mb-2 text-xl font-semibold">Signal lost</h1>
          <p className="mb-6 text-sm text-slate-300">
            Something went wrong while loading Sky Archive. This can happen if your browser has WebGL turned off.
          </p>
          <pre className="mb-6 max-h-24 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-rose-300">
            {this.state.error.message}
          </pre>
          <div className="flex justify-center gap-3">
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button className="btn-ghost" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
