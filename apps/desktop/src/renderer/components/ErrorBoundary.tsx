import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** When this key changes, the error state is automatically cleared */
  resetKey?: string | number
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  componentDidUpdate(prevProps: Props): void {
    // Auto-reset when resetKey changes (e.g. navigation, panel toggle)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center min-h-[200px] animate-fade-in">
          <span className="text-2xl mb-2">⚠️</span>
          <p className="text-sm text-text-secondary mb-1">Something went wrong</p>
          <p className="text-xs text-text-tertiary mb-4 max-w-xs">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-default"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-default"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
