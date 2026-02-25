import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handlers — use addEventListener so we never clobber other listeners
window.addEventListener('error', (event) => {
  console.error('[Renderer] WINDOW ERROR:', event.message, event.filename, event.lineno, event.colno, event.error)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Renderer] UNHANDLED REJECTION:', event.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
