import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { getCurrentUser } from './redux/slices/authSlice';
import { useNotifications } from './hooks/useNotifications';

// Layout Components (not lazy loaded for critical rendering)
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/cart/CartDrawer';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ScrollToTop from './components/common/ScrollToTop';
import PageTransition from './components/common/PageTransition';
import { PageLoader } from './components/common/LoadingSkeleton';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const RestaurantPage = lazy(() => import('./pages/RestaurantPage'));
const RestaurantDetail = lazy(() => import('./pages/RestaurantDetail'));
const RestaurantDashboard = lazy(() => import('./pages/RestaurantDashboard'));
const DeliveryPartnerDashboard = lazy(() => import('./pages/DeliveryPartnerDashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const Profile = lazy(() => import('./pages/Profile'));
const About = lazy(() => import('./pages/About'));
const Partner = lazy(() => import('./pages/Partner'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Google OAuth Success Handler
const GoogleAuthSuccess = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refresh');

    if (token && refreshToken) {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      window.location.href = '/';
    } else {
      window.location.href = '/login?error=Authentication failed';
    }
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
          
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <PageTransition>
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
                <Route path="/track/:id" element={<TrackOrder />} />

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
            </PageTransition>
            </Suspense>
          </main>

          <Footer />
          <CartDrawer />
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
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