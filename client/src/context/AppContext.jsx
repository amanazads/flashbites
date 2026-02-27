import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { mockRestaurants } from '../data/mockData';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  // Fetch all restaurants
  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/restaurants');
      if (response.data.success) {
        setRestaurants(response.data.data);
        setFilteredRestaurants(response.data.data);
      }
    } catch (err) {
      // Use mock data if API fails
      console.log('Using mock data - Backend not available');
      setRestaurants(mockRestaurants);
      setFilteredRestaurants(mockRestaurants);
      setError(null); // Don't show error, just use mock data
    } finally {
      setLoading(false);
    }
  };

  // Fetch restaurants by category
  const fetchByCategory = async (category) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedCategory(category);
      const response = await axios.get(`/api/restaurants/category/${category}`);
      if (response.data.success) {
        setFilteredRestaurants(response.data.data);
      }
    } catch (err) {
      // Use mock data filtering if API fails
      console.log('Using mock data filtering');
      const filtered = category === 'All' 
        ? mockRestaurants 
        : mockRestaurants.filter(r => r.category === category);
      setFilteredRestaurants(filtered);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Search restaurants
  const searchRestaurants = async (query) => {
    try {
      setSearchQuery(query);
      if (!query.trim()) {
        setFilteredRestaurants(restaurants.length > 0 ? restaurants : mockRestaurants);
        return;
      }
      
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/restaurants/search?q=${query}`);
      if (response.data.success) {
        setFilteredRestaurants(response.data.data);
      }
    } catch (err) {
      // Use mock data search if API fails
      console.log('Using mock data search');
      const searchLower = query.toLowerCase();
      const filtered = mockRestaurants.filter(r => 
        r.name.toLowerCase().includes(searchLower) ||
        r.cuisine.toLowerCase().includes(searchLower) ||
        r.category.toLowerCase().includes(searchLower)
      );
      setFilteredRestaurants(filtered);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Toggle wishlist (simplified without auth)
  const toggleWishlist = (restaurantId) => {
    setWishlist((prev) => {
      if (prev.includes(restaurantId)) {
        return prev.filter((id) => id !== restaurantId);
      } else {
        return [...prev, restaurantId];
      }
    });
  };

  // Load wishlist from localStorage
  useEffect(() => {
    const savedWishlist = localStorage.getItem('flashbites_wishlist');
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist));
    }
  }, []);

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('flashbites_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Fetch restaurants on mount
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const value = {
    restaurants,
    filteredRestaurants,
    selectedCategory,
    searchQuery,
    loading,
    error,
    wishlist,
    fetchRestaurants,
    fetchByCategory,
    searchRestaurants,
    toggleWishlist,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
