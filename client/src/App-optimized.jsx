import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import BottomNavigation from './components/BottomNavigation';
import LoadingSkeleton from './components/LoadingSkeleton';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Orders = lazy(() => import('./pages/Orders'));
const Profile = lazy(() => import('./pages/Profile'));
const RestaurantDetails = lazy(() => import('./pages/RestaurantDetails'));

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="pb-20">
          <Suspense fallback={
            <div className="min-h-screen pt-6 px-4">
              <LoadingSkeleton />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/restaurant/:id" element={<RestaurantDetails />} />
            </Routes>
          </Suspense>
          <BottomNavigation />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
