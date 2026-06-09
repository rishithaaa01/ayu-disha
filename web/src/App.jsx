import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import ClinicianApp from './pages/clinician/ClinicianApp';
import AdminDashboard from './pages/admin/Dashboard';
import PHODashboard from './pages/pho/Dashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import HealthRecords from './pages/patient/HealthRecords';
import Medicines from './pages/patient/Medicines';
import LabTests from './pages/patient/LabTests';
import Consents from './pages/patient/Consents';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
