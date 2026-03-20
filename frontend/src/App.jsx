import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';
import { getCurrentUser } from './redux/slices/authSlice';
import { useNotifications } from './hooks/useNotifications';

// Firebase initialization (analytics)
import './firebase';

// Layout Components (always needed — keep eagerly loaded)
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/cart/CartDrawer';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ScrollToTop from './components/common/ScrollToTop';

// Pages — lazy loaded for code splitting (reduces initial bundle ~80%)
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const RestaurantPage = React.lazy(() => import('./pages/RestaurantPage'));
const RestaurantDetail = React.lazy(() => import('./pages/RestaurantDetail'));
const RestaurantDashboard = React.lazy(() => import('./pages/RestaurantDashboard'));
const DeliveryPartnerDashboard = React.lazy(() => import('./pages/DeliveryPartnerDashboard'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const Orders = React.lazy(() => import('./pages/Orders'));
const OrderDetail = React.lazy(() => import('./pages/OrderDetail'));
const Profile = React.lazy(() => import('./pages/Profile'));
const About = React.lazy(() => import('./pages/About'));
const Partner = React.lazy(() => import('./pages/Partner'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const AccountDeletePage = React.lazy(() => import('./pages/AccountDeletePage'));
const HelpPage = React.lazy(() => import('./pages/HelpPage'));
const PromosPage = React.lazy(() => import('./pages/PromosPage'));
const Contact = React.lazy(() => import('./pages/Contact'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Page loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin w-10 h-10" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#E23744" strokeWidth="4" />
        <path className="opacity-80" fill="#E23744" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <p className="text-sm text-gray-400 font-medium">Loading…</p>
    </div>
  </div>
);

// Google OAuth Success Handler
const GoogleAuthSuccess = () => {
  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const refreshToken = params.get('refresh');

      if (token && refreshToken) {
        // Use Preferences instead of localStorage
        await Preferences.set({ key: 'accessToken', value: token });
        await Preferences.set({ key: 'refreshToken', value: refreshToken });
        window.location.href = '/';
      } else {
        window.location.href = '/login?error=Authentication failed';
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

// Global Route Guard for Business Roles
const RoleRedirector = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const path = location.pathname;
      
      // Allow them to visit these exact auxiliary pages, otherwise trap them in dashboard
      const allowedCommonPaths = ['/profile', '/help', '/terms', '/privacy', '/contact', '/notifications'];
      const isAllowedCommonPath = allowedCommonPaths.some(p => path.startsWith(p));

      if (user.role === 'restaurant_owner') {
        if (!path.startsWith('/dashboard') && !isAllowedCommonPath) {
          navigate('/dashboard', { replace: true });
        }
      } else if (user.role === 'delivery_partner') {
        if (!path.startsWith('/delivery-dashboard') && !isAllowedCommonPath) {
          navigate('/delivery-dashboard', { replace: true });
        }
      } else if (user.role === 'admin') {
        if (!path.startsWith('/admin') && !isAllowedCommonPath) {
          navigate('/admin', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  return null;
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // Initialize notification system
  useNotifications();

  // Check platform
  const isNative = Capacitor.getPlatform() !== 'web';

  // Initialize status bar for native platforms
  useEffect(() => {
    const initializeStatusBar = async () => {
      try {
        if (isNative && Capacitor.isPluginAvailable('StatusBar')) {
          // Set status bar to transparent or match app color
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#FF523B' }); // Brand orange
          console.log('Status bar initialized successfully');
        }
      } catch (error) {
        console.warn('Error setting status bar (non-critical):', error);
        // Don't throw - this is non-critical
      }
    };

    // Add delay to ensure app is fully loaded
    const timer = setTimeout(() => {
      initializeStatusBar();
    }, 500);

    return () => clearTimeout(timer);
  }, [isNative]);

  useEffect(() => {
    // Restore session on app restart / page refresh.
    // Skip if Redux already has a user (right after login/register).
    if (!isAuthenticated) {
      const restoreSession = async () => {
        let token = localStorage.getItem('token') || localStorage.getItem('accessToken');

        // On Capacitor, also check Preferences (the native persistent store)
        if (!token && window.Capacitor) {
          try {
            const { value } = await Preferences.get({ key: 'token' });
            token = value;
            if (!token) {
              const { value: v2 } = await Preferences.get({ key: 'accessToken' });
              token = v2;
            }
          } catch (e) {
            // Preferences unavailable — fall through
          }
        }

        if (token) {
          dispatch(getCurrentUser());
        }
      };
      restoreSession();
    }
  }, [dispatch, isAuthenticated]);



  return (
    <ErrorBoundary>
      {/* Global default title – overridden per-page by <SEO> components */}
      <Helmet defaultTitle="FlashBites" titleTemplate="%s | FlashBites" />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleRedirector />
        <ScrollToTop />
        <div className="flex flex-col min-h-screen bg-white lg:bg-[var(--bg-app)]">
          <Navbar />
          
          <main className="flex-1 w-full relative z-0 bg-white lg:bg-[var(--bg-app)]">
            <React.Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
              <Route path="/restaurants" element={<RestaurantPage />} />
              <Route path="/restaurant/:id" element={<RestaurantDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/partner" element={<Partner />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/promos" element={<PromosPage />} />
              <Route path="/contact" element={<Contact />} />

              {/* Protected Routes */}
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account-delete"
                element={
                  <ProtectedRoute>
                    <AccountDeletePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RestaurantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delivery-dashboard"
                element={
                  <ProtectedRoute>
                    <DeliveryPartnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </React.Suspense>
          </main>

          {/* Footer: desktop only — mobile users see footer links in Profile */}
          <footer className="hidden lg:block">
            <Footer />
          </footer>
          <CartDrawer />
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="top-center"
          containerStyle={{ top: 20 }}
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1C1C1E',
              color: '#F5F5F7',
              maxWidth: '92vw',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '14px',
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#34D399',
                secondary: '#1C1C1E',
              },
              style: {
                background: '#0D1F18',
                color: '#D1FAE5',
                border: '1px solid #065F46',
              },
            },
            error: {
              duration: 4500,
              iconTheme: {
                primary: '#F87171',
                secondary: '#1C1C1E',
              },
              style: {
                background: '#1F0D0D',
                color: '#FEE2E2',
                border: '1px solid #7F1D1D',
              },
            },
            loading: {
              iconTheme: {
                primary: '#FF6B35',
                secondary: '#1C1C1E',
              },
            },
          }}
        />
      </Router>
    </ErrorBoundary>
  );
}

export default App;