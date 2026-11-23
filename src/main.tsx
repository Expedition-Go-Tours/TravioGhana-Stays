import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import './index.css'
import App from './app/App'
import { setupGlobalErrorHandlers } from './lib/errorHandler'
import { assertSafeDataSource, installMockSession } from './lib/mockSession'
import { initTheme } from './stores/themeStore'

const root = document.getElementById('root')!

/** Shown instead of the app when its configuration is unsafe to run. */
function renderConfigError(message: string) {
  const box = document.createElement('div')
  box.setAttribute('role', 'alert')
  box.style.cssText =
    'max-width:560px;margin:15vh auto;padding:24px;font:15px/1.5 system-ui,sans-serif;color:#1f1b16;border:1px solid #e7e2da;border-radius:16px;background:#fff'
  const title = document.createElement('strong')
  title.textContent = 'This app is misconfigured and did not start.'
  const body = document.createElement('p')
  body.textContent = message
  box.append(title, body)
  root.replaceChildren(box)
}

setupGlobalErrorHandlers()
initTheme()

try {
  assertSafeDataSource()
  installMockSession()
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  renderConfigError(message)
  console.error('[config]', message)
}
