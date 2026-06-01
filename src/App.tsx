import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary          from './components/ErrorBoundary'
import Layout                 from './components/Layout'
import ProtectedRoute         from './components/ProtectedRoute'
import RoleRoute              from './components/RoleRoute'
import Login                  from './pages/Login'
import Dashboard              from './pages/Dashboard'
import Dialer                 from './pages/Dialer'
import Agents                 from './pages/Agents'
import Campaigns              from './pages/Campaigns'
import CampaignDetail         from './pages/CampaignDetail'
import Contacts               from './pages/Contacts'
import ContactDetail          from './pages/ContactDetail'
import AgentWorkspace         from './pages/AgentWorkspace'
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
import CallIntelligence       from './pages/CallIntelligence'
import OpsCenter              from './pages/OpsCenter'
import ProductionMonitoring   from './pages/ProductionMonitoring'
import SupportDiagnostics     from './pages/SupportDiagnostics'
import ProductionReview       from './pages/ProductionReview'
import Unauthorized           from './pages/Unauthorized'
import NotFound               from './pages/NotFound'
import IncomingCallModal       from './components/IncomingCallModal'
import ToastProvider           from './components/ToastProvider'
import DialerActivityBeacon    from './components/DialerActivityBeacon'
import { useAuthStore, type UserRole } from './store/auth.store'
import { defaultRouteForRole } from './utils/roleRoutes'
import SpoofingManagement from './pages/SpoofingManagement'

const adminConsoleRoles: UserRole[] = ['ADMIN', 'MANAGER', 'SUPERVISOR']
const adminManagerRoles: UserRole[] = ['ADMIN', 'MANAGER']
const adminSupervisorRoles: UserRole[] = ['ADMIN', 'SUPERVISOR']

function RoleHomeRedirect() {
  const isAuth = useAuthStore(s => s.isAuth)
  const role = useAuthStore(s => s.user?.role)

  return <Navigate to={isAuth ? defaultRouteForRole(role) : '/login'} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleHomeRedirect />} />

          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard"          element={<RoleRoute roles={adminConsoleRoles}><Dashboard /></RoleRoute>}      />
            <Route path="/agent/workspace"    element={<RoleRoute roles={['AGENT']}><AgentWorkspace /></RoleRoute>} />
            <Route path="/dialer"             element={<RoleRoute><Dialer /></RoleRoute>}         />
            <Route path="/agent/dashboard"    element={<RoleRoute roles={adminConsoleRoles}><AgentDashboard /></RoleRoute>} />
            <Route path="/campaigns"          element={<RoleRoute roles={adminManagerRoles}><Campaigns /></RoleRoute>}      />
            <Route path="/campaigns/:id"      element={<RoleRoute roles={adminManagerRoles}><CampaignDetail /></RoleRoute>} />
            <Route path="/contacts"           element={<RoleRoute><Contacts /></RoleRoute>}       />
            <Route path="/contacts/:id"       element={<RoleRoute><ContactDetail /></RoleRoute>}  />
            <Route path="/agents"             element={<RoleRoute roles={adminManagerRoles}><Agents /></RoleRoute>}         />
            <Route path="/calls"              element={<RoleRoute><Calls /></RoleRoute>}          />
            <Route path="/callbacks"          element={<RoleRoute><Callbacks /></RoleRoute>}      />
            <Route path="/supervisor"         element={<RoleRoute roles={adminConsoleRoles}><Supervisor /></RoleRoute>}     />
            <Route path="/reports"            element={<RoleRoute roles={adminSupervisorRoles}><Reports /></RoleRoute>}        />
            <Route path="/sip-settings"       element={<RoleRoute><SipSettings /></RoleRoute>}    />
            <Route path="/dnc"                element={<RoleRoute roles={adminSupervisorRoles}><DncManager /></RoleRoute>}     />
            <Route path="/settings"           element={<RoleRoute><Settings /></RoleRoute>}       />
            <Route path="/audit-logs"         element={<RoleRoute roles={['ADMIN']}><AuditLogs /></RoleRoute>}      />
            <Route path="/settings/system"    element={<RoleRoute roles={['ADMIN']}><SystemSettings /></RoleRoute>} />
            <Route path="/recordings"         element={<RoleRoute roles={adminSupervisorRoles}><Recordings /></RoleRoute>}     />
            <Route path="/call-intelligence"  element={<RoleRoute roles={adminSupervisorRoles}><CallIntelligence /></RoleRoute>} />
            <Route path="/ops"                element={<RoleRoute roles={adminSupervisorRoles}><OpsCenter /></RoleRoute>}      />
            <Route path="/monitoring"         element={<RoleRoute roles={adminSupervisorRoles}><ProductionMonitoring /></RoleRoute>} />
            <Route path="/support/diagnostics" element={<RoleRoute roles={adminSupervisorRoles}><SupportDiagnostics /></RoleRoute>} />
            <Route path="/production/review"   element={<RoleRoute roles={['ADMIN']}><ProductionReview /></RoleRoute>} />
            <Route path="/admin/spoofing" element={<RoleRoute roles={['ADMIN']}><SpoofingManagement /></RoleRoute>} />
            <Route path="/unauthorized"       element={<Unauthorized />} />
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