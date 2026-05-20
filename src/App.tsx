import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout            from './components/Layout'
import ProtectedRoute    from './components/ProtectedRoute'
import Login             from './pages/Login'
import Dashboard         from './pages/Dashboard'
import Dialer            from './pages/Dialer'
import Agents            from './pages/Agents'
import Campaigns         from './pages/Campaigns'
import CampaignDetail    from './pages/CampaignDetail'
import Contacts          from './pages/Contacts'
import ContactDetail     from './pages/ContactDetail'
import AgentDashboard    from './pages/AgentDashboard'
import Reports           from './pages/Reports'
import SipSettings       from './pages/SipSettings'
import Calls             from './pages/Calls'
import Callbacks         from './pages/Callbacks'
import Supervisor        from './pages/Supervisor'
import IncomingCallModal    from './components/IncomingCallModal'
import SipActiveCallOverlay from './components/SipActiveCallOverlay'
import ToastProvider        from './components/ToastProvider'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard"          element={<Dashboard />}      />
          <Route path="/dialer"             element={<Dialer />}         />
          <Route path="/agent/dashboard"    element={<AgentDashboard />} />
          <Route path="/campaigns"          element={<Campaigns />}      />
          <Route path="/campaigns/:id"      element={<CampaignDetail />} />
          <Route path="/contacts"           element={<Contacts />}       />
          <Route path="/contacts/:id"       element={<ContactDetail />}  />
          <Route path="/agents"             element={<Agents />}         />
          <Route path="/calls"              element={<Calls />}          />
          <Route path="/callbacks"          element={<Callbacks />}      />
          <Route path="/supervisor"         element={<Supervisor />}     />
          <Route path="/reports"            element={<Reports />}        />
          <Route path="/sip-settings"       element={<SipSettings />}    />
        </Route>
      </Routes>
      <IncomingCallModal />
      <SipActiveCallOverlay />
      <ToastProvider />
    </HashRouter>
  )
}