import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SessionDetail from './pages/SessionDetail';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Baselines from './pages/Baselines';
import Login from './pages/Login';
import Landing from './pages/Landing';
import PaymentCapture from './pages/PaymentCapture';
import { isAuthenticated } from './lib/auth';

function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0A0B' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: '220px' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="session/:id" element={<SessionDetail />} />
          <Route path="alerts"      element={<Alerts />} />
          <Route path="analytics"   element={<Analytics />} />
          <Route path="baselines"        element={<Baselines />} />
          <Route path="payment-capture" element={<PaymentCapture />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
