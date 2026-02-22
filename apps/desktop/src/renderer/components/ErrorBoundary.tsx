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
        <div className="flex flex-col items-center justify-center p-6 text-center min-h-[200px]">
          <p className="text-sm text-status-error mb-3">
            {this.state.error?.message ?? 'Something went wrong'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-default"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
