import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary          from './components/ErrorBoundary'
import Layout                 from './components/Layout'
import ProtectedRoute         from './components/ProtectedRoute'
import RoleRoute              from './components/RoleRoute'
import Login                  from './pages/Login'
import Dashboard              from './pages/Dashboard'
import Dialer                 from './pages/Dialer'
import TeamUsers              from './pages/TeamUsers'
import AgentManagementPro     from './pages/AgentManagementPro'
import Campaigns              from './pages/Campaigns'
import CampaignDetail         from './pages/CampaignDetail'
import Contacts               from './pages/Contacts'
import ContactDetail          from './pages/ContactDetail'
import ContactManagementPro   from './pages/ContactManagementPro'
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
import RecordingStoragePro    from './pages/RecordingStoragePro'
import CallIntelligence       from './pages/CallIntelligence'
import OpsCenter              from './pages/OpsCenter'
import ProductionMonitoring   from './pages/ProductionMonitoring'
import LiveMonitoringAdvanced from './pages/LiveMonitoringAdvanced'
import AdvancedDialingAnalytics from './pages/AdvancedDialingAnalytics'
import SecurityAdminPro       from './pages/SecurityAdminPro'
import CallControls           from './pages/CallControls'
import LiveAiConsole          from './pages/LiveAiConsole'
import CampaignManagementPro  from './pages/CampaignManagementPro'
import NotificationsAlertsPro from './pages/NotificationsAlertsPro'
import UiUxPro                from './pages/UiUxPro'
import DeploymentPlatformPro  from './pages/DeploymentPlatformPro'
import SupportDiagnostics     from './pages/SupportDiagnostics'
import ProductionReview       from './pages/ProductionReview'
import ReportsAnalyticsPro    from './pages/ReportsAnalyticsPro'
import SmsConsole             from './pages/SmsConsole'
import CommercialControl     from './pages/CommercialControl'
import PlatformAdministration from './pages/PlatformAdministration'
import CustomerBillingPortal  from './pages/CustomerBillingPortal'
import Unauthorized           from './pages/Unauthorized'
import NotFound               from './pages/NotFound'
import IncomingCallModal       from './components/IncomingCallModal'
import ToastProvider           from './components/ToastProvider'
import DialerActivityBeacon    from './components/DialerActivityBeacon'
import { useAuthStore, type UserRole } from './store/auth.store'
import { defaultRouteForRole } from './utils/roleRoutes'
import SpoofingManagement from './pages/SpoofingManagement'

const platformAdminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN']
const adminConsoleRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'MANAGER', 'SUPERVISOR']
const adminManagerRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'MANAGER']
const adminSupervisorRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR']
const billingRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'MANAGER', 'SUPERVISOR']

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
            <Route path="/sms"                element={<RoleRoute><SmsConsole /></RoleRoute>} />
            <Route path="/agent/dashboard"    element={<RoleRoute roles={adminConsoleRoles}><AgentDashboard /></RoleRoute>} />
            <Route path="/campaigns"          element={<RoleRoute roles={adminManagerRoles}><Campaigns /></RoleRoute>}      />
            <Route path="/campaigns/:id"      element={<RoleRoute roles={adminManagerRoles}><CampaignDetail /></RoleRoute>} />
            <Route path="/contacts"           element={<RoleRoute><Contacts /></RoleRoute>}       />
            <Route path="/contacts/:id"       element={<RoleRoute><ContactDetail /></RoleRoute>}  />
            <Route path="/contact-management-pro" element={<RoleRoute roles={adminSupervisorRoles}><ContactManagementPro /></RoleRoute>} />
            <Route path="/agents"             element={<RoleRoute roles={adminManagerRoles}><TeamUsers /></RoleRoute>}         />
            <Route path="/agent-management-pro" element={<RoleRoute roles={adminSupervisorRoles}><AgentManagementPro /></RoleRoute>} />
            <Route path="/calls"              element={<RoleRoute><Calls /></RoleRoute>}          />
            <Route path="/callbacks"          element={<RoleRoute><Callbacks /></RoleRoute>}      />
            <Route path="/supervisor"         element={<RoleRoute roles={adminConsoleRoles}><Supervisor /></RoleRoute>}     />
            <Route path="/reports"            element={<RoleRoute roles={adminSupervisorRoles}><Reports /></RoleRoute>}        />
            <Route path="/sip-settings"       element={<RoleRoute><SipSettings /></RoleRoute>}    />
            <Route path="/dnc"                element={<RoleRoute roles={adminSupervisorRoles}><DncManager /></RoleRoute>}     />
            <Route path="/settings"           element={<RoleRoute><Settings /></RoleRoute>}       />
            <Route path="/audit-logs"         element={<RoleRoute roles={platformAdminRoles}><AuditLogs /></RoleRoute>}      />
            <Route path="/settings/system"    element={<RoleRoute roles={platformAdminRoles}><SystemSettings /></RoleRoute>} />
            <Route path="/recordings"         element={<RoleRoute roles={adminSupervisorRoles}><Recordings /></RoleRoute>}     />
            <Route path="/recording-storage-pro" element={<RoleRoute roles={adminSupervisorRoles}><RecordingStoragePro /></RoleRoute>} />
            <Route path="/call-intelligence"  element={<RoleRoute roles={adminSupervisorRoles}><CallIntelligence /></RoleRoute>} />
            <Route path="/ops"                element={<RoleRoute roles={adminSupervisorRoles}><OpsCenter /></RoleRoute>}      />
            <Route path="/monitoring"         element={<RoleRoute roles={adminSupervisorRoles}><ProductionMonitoring /></RoleRoute>} />
            <Route path="/live-monitoring-advanced" element={<RoleRoute roles={adminSupervisorRoles}><LiveMonitoringAdvanced /></RoleRoute>} />
            <Route path="/advanced-dialing"   element={<RoleRoute roles={adminSupervisorRoles}><AdvancedDialingAnalytics /></RoleRoute>} />
            <Route path="/reports-analytics-pro" element={<RoleRoute roles={adminSupervisorRoles}><ReportsAnalyticsPro /></RoleRoute>} />
            <Route path="/call-controls"      element={<RoleRoute roles={adminSupervisorRoles}><CallControls /></RoleRoute>} />
            <Route path="/live-ai"            element={<RoleRoute><LiveAiConsole /></RoleRoute>} />
            <Route path="/campaign-management-pro" element={<RoleRoute roles={adminSupervisorRoles}><CampaignManagementPro /></RoleRoute>} />
            <Route path="/notifications-alerts-pro" element={<RoleRoute><NotificationsAlertsPro /></RoleRoute>} />
            <Route path="/ui-ux-pro"          element={<RoleRoute roles={adminSupervisorRoles}><UiUxPro /></RoleRoute>} />
            <Route path="/security-admin-pro" element={<RoleRoute roles={platformAdminRoles}><SecurityAdminPro /></RoleRoute>} />
            <Route path="/deployment-platform-pro" element={<RoleRoute roles={adminSupervisorRoles}><DeploymentPlatformPro /></RoleRoute>} />
            <Route path="/support/diagnostics" element={<RoleRoute roles={adminSupervisorRoles}><SupportDiagnostics /></RoleRoute>} />
            <Route path="/production/review"   element={<RoleRoute roles={platformAdminRoles}><ProductionReview /></RoleRoute>} />
            <Route path="/admin/spoofing" element={<RoleRoute roles={platformAdminRoles}><SpoofingManagement /></RoleRoute>} />
            <Route path="/commercial-control" element={<RoleRoute roles={platformAdminRoles}><CommercialControl /></RoleRoute>} />
            <Route path="/platform/administration" element={<RoleRoute roles={platformAdminRoles}><PlatformAdministration /></RoleRoute>} />
            <Route path="/billing" element={<RoleRoute roles={billingRoles}><CustomerBillingPortal /></RoleRoute>} />
            <Route path="/unauthorized"       element={<Unauthorized />} />
            <Route path="*"                  element={<NotFound />}       />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <IncomingCallModal />
        <DialerActivityBeacon />
        <ToastProvider />
      </HashRouter>
    </ErrorBoundary>
  )
}
