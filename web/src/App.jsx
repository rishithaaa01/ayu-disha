import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import ClinicianApp from './pages/clinician/ClinicianApp';
import AdminDashboard from './pages/admin/Dashboard';
import PHODashboard from './pages/pho/Dashboard';
import AshaDashboard from './pages/asha/Dashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import HealthRecords from './pages/patient/HealthRecords';
import Medicines from './pages/patient/Medicines';
import LabTests from './pages/patient/LabTests';
import Consents from './pages/patient/Consents';
import LabDashboard from './pages/lab/Dashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  const normalizedUserRole = user?.role ? String(user.role).toLowerCase() : null;
  const normalizedAllowedRoles = allowedRoles ? allowedRoles.map(r => String(r).toLowerCase()) : null;
  
  console.log('🔐 [RUNTIME DEBUG] ProtectedRoute check:', {
    isAuthenticated,
    userRole: user?.role,
    normalizedUserRole,
    allowedRoles,
    normalizedAllowedRoles,
    userName: user?.name,
    locationHash: window.location.hash,
    locationPathname: window.location.pathname
  });
  
  if (!isAuthenticated) {
    console.warn('❌ [RUNTIME DEBUG] ProtectedRoute: NOT authenticated! Redirecting to /login from hash:', window.location.hash);
    return <Navigate to="/login" replace />;
  }
  
  if (normalizedAllowedRoles && (!normalizedUserRole || !normalizedAllowedRoles.includes(normalizedUserRole))) {
    console.warn('❌ [RUNTIME DEBUG] ProtectedRoute: Role mismatch! user.role:', user?.role, 'allowedRoles:', allowedRoles, 'Redirecting to /login from hash:', window.location.hash);
    return <Navigate to="/login" replace />;
  }
  
  console.log('✅ [RUNTIME DEBUG] ProtectedRoute Access granted, rendering protected content for role:', user?.role);
  return children;
}

function App() {
  console.log('🚀 App component rendering');
  
  try {
    return (
      <ErrorBoundary>
        <div className="w-full min-h-screen max-w-full overflow-x-hidden pb-safe flex flex-col bg-[#F7F3EE]">
          <HashRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />

              {/* Clinician / Doctor routes */}
              <Route
                path="/clinician/*"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <ClinicianApp />
                  </ProtectedRoute>
                }
              />

              {/* Patient routes */}
              <Route
                path="/patient"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/records"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <HealthRecords />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/medicines"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <Medicines />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/tests"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <LabTests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/consents"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <Consents />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* PHO routes */}
              <Route
                path="/pho/*"
                element={
                  <ProtectedRoute allowedRoles={['pho']}>
                    <PHODashboard />
                  </ProtectedRoute>
                }
              />

              {/* ASHA routes */}
              <Route
                path="/asha/*"
                element={
                  <ProtectedRoute allowedRoles={['asha']}>
                    <AshaDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Lab Tech routes */}
              <Route
                path="/lab"
                element={
                  <ProtectedRoute allowedRoles={['lab']}>
                    <LabDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab/*"
                element={
                  <ProtectedRoute allowedRoles={['lab']}>
                    <LabDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </HashRouter>
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ Critical error in App:', error);
    return (
      <div style={{ padding: '20px', background: '#fee', color: '#c00' }}>
        <h1>Critical Error</h1>
        <pre>{error.toString()}</pre>
      </div>
    );
  }
}

export default App;
