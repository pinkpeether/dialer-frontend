import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary          from './components/ErrorBoundary'
import Layout                 from './components/Layout'
import ProtectedRoute         from './components/ProtectedRoute'
import Login                  from './pages/Login'
import Dashboard              from './pages/Dashboard'
import Dialer                 from './pages/Dialer'
import Agents                 from './pages/Agents'
import Campaigns              from './pages/Campaigns'
import CampaignDetail         from './pages/CampaignDetail'
import Contacts               from './pages/Contacts'
import ContactDetail          from './pages/ContactDetail'
import AgentDashboard         from './pages/AgentDashboard'
import Reports                from './pages/Reports'
import SipSettings            from './pages/SipSettings'
import Calls                  from './pages/Calls'
import Callbacks              from './pages/Callbacks'
import Supervisor             from './pages/Supervisor'
import DncManager             from './pages/DncManager'
import Settings               from './pages/Settings'
import AuditLogs              from './pages/AuditLogs'
import SystemSettings         from './pages/SystemSettings'
import Recordings             from './pages/Recordings'
import OpsCenter              from './pages/OpsCenter'
import NotFound               from './pages/NotFound'
import IncomingCallModal       from './components/IncomingCallModal'
import ToastProvider           from './components/ToastProvider'
import DialerActivityBeacon    from './components/DialerActivityBeacon'

export default function App() {
  return (
    <ErrorBoundary>
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
            <Route path="/dnc"               element={<DncManager />}     />
            <Route path="/settings"          element={<Settings />}       />
            <Route path="/audit-logs"        element={<AuditLogs />}      />
            <Route path="/settings/system"   element={<SystemSettings />} />
            <Route path="/recordings"        element={<Recordings />}     />
            <Route path="/ops"               element={<OpsCenter />}      />
            <Route path="*"                  element={<NotFound />}       />
          </Route>

          {/* Public 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <IncomingCallModal />
        <DialerActivityBeacon />
        <ToastProvider />
      </HashRouter>
    </ErrorBoundary>
  )
}
