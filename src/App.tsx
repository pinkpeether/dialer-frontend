import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout         from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Dialer         from './pages/Dialer'
import Agents         from './pages/Agents'
import Campaigns      from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Contacts       from './pages/Contacts'
import AgentDashboard from './pages/AgentDashboard'
import Reports        from './pages/Reports'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard"       element={<Dashboard />}      />
          <Route path="/dialer"          element={<Dialer />}         />
          <Route path="/agent/dashboard" element={<AgentDashboard />} />
          <Route path="/campaigns"       element={<Campaigns />}      />
          <Route path="/campaigns/:id"   element={<CampaignDetail />} />
          <Route path="/contacts"        element={<Contacts />}       />
          <Route path="/agents"          element={<Agents />}         />
          <Route path="/reports"         element={<Reports />}        />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
