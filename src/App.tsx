import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import SessionDetail from './pages/SessionDetail';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Baselines from './pages/Baselines';
import Login from './pages/Login';
import Landing from './pages/Landing';
import PaymentCapture from './pages/PaymentCapture';
import CapturedSessions from './pages/CapturedSessions';
import Docs from './pages/Docs';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import ApiKeys from './pages/ApiKeys';
import Persona from './pages/Persona';
import BehaviorProfile from './pages/BehaviorProfile';
import MLModels from './pages/MLModels';
import { isAuthenticated } from './lib/auth';
import { ThemeProvider } from './lib/ThemeContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div style={{ background: 'var(--bg)', height: '100vh', overflow: 'hidden' }}>
      <TopBar />
      <Sidebar />
      <main style={{ marginLeft: '200px', marginTop: '32px', height: 'calc(100vh - 32px)', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="session/:id" element={<SessionDetail />} />
          <Route path="alerts"      element={<Alerts />} />
          <Route path="analytics"   element={<Analytics />} />
          <Route path="baselines"        element={<Baselines />} />
          <Route path="payment-capture"   element={<PaymentCapture />} />
          <Route path="captured-sessions" element={<CapturedSessions />} />
          <Route path="api-keys"          element={<ApiKeys />} />
          <Route path="persona"            element={<Persona />} />
          <Route path="behavior-profile"  element={<BehaviorProfile />} />
          <Route path="ml-models"         element={<MLModels />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
