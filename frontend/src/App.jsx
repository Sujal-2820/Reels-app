import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Home from './pages/Home/Home';
import Upload from './pages/Upload/Upload';
import Profile from './pages/Profile/Profile';
import Login from './pages/Login/Login';
import Plans from './pages/Plans/Plans';
import ReelView from './pages/ReelView/ReelView';
import EditReel from './pages/EditReel/EditReel';
import Settings from './pages/Settings/Settings';
import ManageProfile from './pages/Settings/SubScreens/ManageProfile';
import Security from './pages/Settings/SubScreens/Security';
import About from './pages/Settings/SubScreens/About';
import Help from './pages/Settings/SubScreens/Help';
import Notifications from './pages/Settings/SubScreens/Notifications';
import Language from './pages/Settings/SubScreens/Language';
import AppGate from './pages/AppGate/AppGate';
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard';
import AdminUsers from './pages/Admin/Users/AdminUsers';
import AdminReferrals from './pages/Admin/Users/AdminReferrals';
import AdminUserDetail from './pages/Admin/Users/AdminUserDetail';
import AdminReels from './pages/Admin/Reels/AdminReels';
import AdminPlans from './pages/Admin/Plans/AdminPlans';
import AdminSettings from './pages/Admin/Settings/AdminSettings';
import AdminComments from './pages/Admin/Comments/AdminComments';
import AdminTransactions from './pages/Admin/Subscriptions/AdminTransactions';
import AdminSubscribers from './pages/Admin/Subscriptions/AdminSubscribers';
import AdminViral from './pages/Admin/Viral/AdminViral';
import AdminSupport from './pages/Admin/Support/AdminSupport';
import AdminTicketDetail from './pages/Admin/Support/AdminTicketDetail';
import Support from './pages/Support/Support';
import TicketDetail from './pages/Support/TicketDetail';
import CompleteProfile from './pages/CompleteProfile/CompleteProfile';
import PrivateReelSuccess from './pages/Upload/PrivateReelSuccess';
import './App.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-large"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// App Layout with Header and BottomNav
const AppLayout = ({ children, showNav = true }) => {
  return (
    <>
      <Header />
      <main className="main-content">
        {children}
      </main>
      {showNav && <BottomNav />}
    </>
  );
};

// Main App Component
function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <AppLayout>
            <Home />
          </AppLayout>
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/plans"
        element={
          <AppLayout>
            <Plans />
          </AppLayout>
        }
      />

      <Route
        path="/reel/:id"
        element={
          <AppLayout>
            <ReelView />
          </AppLayout>
        }
      />

      <Route
        path="/reel/private/:token"
        element={
          <AppLayout>
            <ReelView isPrivate={true} />
          </AppLayout>
        }
      />

      {/* Referral Gate (for non-app users) */}
      <Route
        path="/r/:code"
        element={<AppGate />}
      />

      {/* Protected Routes */}
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Upload />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/upload/success"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PrivateReelSuccess />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile/:userId"
        element={
          <AppLayout>
            <Profile />
          </AppLayout>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ManageProfile />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Security />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/about"
        element={
          <ProtectedRoute>
            <AppLayout>
              <About />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/help"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Help />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* New Settings Sub-screen Routes */}
      <Route
        path="/settings/notifications"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Notifications />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/language"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Language />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reels/edit/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EditReel />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Support />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/support/:ticketId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TicketDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute>
            <CompleteProfile />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="users/referrals" element={<AdminReferrals />} />
        <Route path="reels" element={<AdminReels />} />
        <Route path="reels/viral" element={<AdminViral />} />
        <Route path="comments" element={<AdminComments />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="support/:ticketId" element={<AdminTicketDetail />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
