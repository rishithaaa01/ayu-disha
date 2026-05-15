import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ClinicianApp from './pages/clinician/ClinicianApp';
import AdminDashboard from './pages/admin/Dashboard';
import PHODashboard from './pages/pho/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/clinician/*" element={<ClinicianApp />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/pho/*" element={<PHODashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
