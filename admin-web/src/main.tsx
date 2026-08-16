import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.tsx'
import './index.css'
import { AppConvexProvider } from './lib/convex.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppConvexProvider>
        <App />
      </AppConvexProvider>
    </BrowserRouter>
  </StrictMode>,
)
