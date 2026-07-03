import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './form-control-polish.css'
import './sprint15-ui-polish.css'
import App from './App.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'

window.localStorage.setItem('ptdt-performance-mode', 'on')
document.documentElement.dataset.performanceMode = 'on'

const app = (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
const strictModeEnabled = import.meta.env.VITE_REACT_STRICT_MODE !== 'false'

createRoot(document.getElementById('root')!).render(
  strictModeEnabled ? <StrictMode>{app}</StrictMode> : app,
)
