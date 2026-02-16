import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { getCurrentUser } from './redux/slices/authSlice';
import { useNotifications } from './hooks/useNotifications';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/cart/CartDrawer';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ScrollToTop from './components/common/ScrollToTop';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import RestaurantPage from './pages/RestaurantPage';
import RestaurantDetail from './pages/RestaurantDetail';
import RestaurantDashboard from './pages/RestaurantDashboard';
import DeliveryPartnerDashboard from './pages/DeliveryPartnerDashboard';
import AdminPanel from './pages/AdminPanel';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import About from './pages/About';
import Partner from './pages/Partner';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFound from './pages/NotFound';

// Google OAuth Success Handler
const GoogleAuthSuccess = () => {
  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const refreshToken = params.get('refresh');

      if (token && refreshToken) {
        // Use Preferences instead of localStorage
        const { Preferences } = await import('@capacitor/preferences');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
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
          await StatusBar.setBackgroundColor({ color: '#e11d48' }); // Your primary color (rose-600)
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
    if (isAuthenticated) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated]);

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <Navbar />
          
          <main className="flex-1 pb-[calc(86px+var(--safe-area-inset-bottom))] md:pb-0">
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
          </main>

          <Footer />
          <CartDrawer />
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="top-center"
          containerStyle={{ top: 16 }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
              maxWidth: '90vw',
              fontSize: '14px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Router>
    </ErrorBoundary>
  );
}

export default App;