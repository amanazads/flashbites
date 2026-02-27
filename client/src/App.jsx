import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import RestaurantDetails from './pages/RestaurantDetails';
import BottomNavigation from './components/BottomNavigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/restaurant/:id" element={<RestaurantDetails />} />
        </Routes>
        <BottomNavigation />
      </div>
    </Router>
  );
}

export default App;
