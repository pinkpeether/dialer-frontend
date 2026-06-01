import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'

const savedPerformanceMode = window.localStorage.getItem('ptdt-performance-mode')
document.documentElement.dataset.performanceMode = savedPerformanceMode === 'on' ? 'on' : 'off'

const app = (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
const strictModeEnabled = import.meta.env.VITE_REACT_STRICT_MODE !== 'false'

createRoot(document.getElementById('root')!).render(
  strictModeEnabled ? <StrictMode>{app}</StrictMode> : app,
)
