import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' }
  }

  componentDidCatch(error, info) {
    console.error('FinPilot crashed while rendering.', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-navy px-4">
        <div className="card w-full max-w-md p-6 text-left">
          <p className="eyebrow text-coral">System notice</p>
          <h1 className="display mt-2 text-[24px] text-ink">Something went wrong</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            FinPilot hit an unexpected error while rendering. Your saved data has not been changed.
          </p>
          <p className="mt-3 border border-ink/15 bg-cream px-3 py-2 text-left font-mono text-[11px] text-muted">
            {this.state.message}
          </p>
          <button type="button" onClick={this.handleReload} className="btn btn-primary mt-5 w-full">
            Reload FinPilot
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
