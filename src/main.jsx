// First, and deliberately so. Tailwind emits its `@layer theme, base,
// components, utilities` order statement into this file, and a layer's position
// is fixed by the first statement that names it. Imported after App, every
// component stylesheet would have declared `components` before Tailwind could
// order it, leaving base rules winning over component rules.
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { registerServiceWorker } from './utils/serviceWorker'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
