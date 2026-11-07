import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddAttendance from './pages/AddAttendance';
import History from './pages/History';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Punch from './pages/Punch';
import AdminDashboard from './pages/AdminDashboard';
import { useTarget } from './hooks/useTarget';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  return user ? children : <Navigate to="/login" replace />;
}
function AdminOnly({ children }) { const { user } = useAuth(); return user.role === 'admin' ? children : <Navigate to="/" replace />; }
// Admin sees the admin dashboard at "/"; the staff dashboard only when opened for a specific staff (?userId=).
function Home() { const { user } = useAuth(); const { userId } = useTarget(); return user.role === 'admin' && !userId ? <AdminDashboard /> : <Dashboard />; }
// Staff punch in/out here; admin adds entries manually, only through a staff member.
function AddEntry() { const { user } = useAuth(); return user.role === 'admin' ? <NeedsTarget><AddAttendance /></NeedsTarget> : <Punch />; }
// Attendance pages are staff-owned; admin reaches them through a staff member.
function NeedsTarget({ children }) { const { user } = useAuth(); const { userId } = useTarget(); return user.role === 'admin' && !userId ? <Navigate to="/admin" replace /> : children; }
function Guest({ children }) { const { user } = useAuth(); return user ? <Navigate to="/" replace /> : children; }

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route path="/forgot-password" element={<Guest><ForgotPassword /></Guest>} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Home />} />
        <Route path="add" element={<AddEntry />} />
        <Route path="edit/:id" element={<AdminOnly><AddAttendance /></AdminOnly>} />
        <Route path="history" element={<NeedsTarget><History /></NeedsTarget>} />
        <Route path="reports" element={<NeedsTarget><Reports /></NeedsTarget>} />
        <Route path="settings" element={<AdminOnly><Settings /></AdminOnly>} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<AdminOnly><Admin /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
