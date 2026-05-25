import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const savedPerformanceMode = window.localStorage.getItem('ptdt-performance-mode')
document.documentElement.dataset.performanceMode = savedPerformanceMode === 'on' ? 'on' : 'off'

const app = <App />
const strictModeEnabled = import.meta.env.VITE_REACT_STRICT_MODE !== 'false'

createRoot(document.getElementById('root')!).render(
  strictModeEnabled ? <StrictMode>{app}</StrictMode> : app,
)
