import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error logging
window.onerror = (msg, src, line, col, err) => {
  console.error('[Renderer] WINDOW ERROR:', msg, src, line, col, err)
}
window.onunhandledrejection = (event) => {
  console.error('[Renderer] UNHANDLED REJECTION:', event.reason)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
