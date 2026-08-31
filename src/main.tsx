import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerPwa } from './pwa.ts'
import { ScrollToTopButton } from './ScrollToTopButton.tsx'

registerPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ScrollToTopButton />
  </StrictMode>,
)
