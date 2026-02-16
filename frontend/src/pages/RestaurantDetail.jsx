import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantById } from '../redux/slices/restaurantSlice';
import { getRestaurantMenuItems } from '../api/restaurantApi';
import { StarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/solid';
import MenuCard from '../components/restaurant/MenuCard';
import ReviewsList from '../components/restaurant/ReviewsList';
import { Loader } from '../components/common/Loader';
import { formatCurrency } from '../utils/formatters';
import { FOOD_CATEGORIES } from '../utils/constants';
import toast from 'react-hot-toast';

const RestaurantDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentRestaurant: restaurant, loading } = useSelector((state) => state.restaurant);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    dispatch(fetchRestaurantById(id));
    fetchMenuItems();
  }, [dispatch, id]);

  const fetchMenuItems = async () => {
    try {
      setLoadingMenu(true);
      console.log('Fetching menu items for restaurant:', id);
      const response = await getRestaurantMenuItems(id);
      console.log('Menu items response:', response);
      const items = response.data?.items || response.items || [];
      console.log('Menu items:', items);
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoadingMenu(false);
    }
  };

  if (loading) return <Loader />;
  if (!restaurant) return <div>Restaurant not found</div>;

  const categories = ['All', ...FOOD_CATEGORIES];
  const filteredMenu = selectedCategory === 'All'
    ? menuItems
    : menuItems?.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Restaurant Header */}
      <div className="relative h-64 sm:h-72 lg:h-80 bg-gray-900">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 break-words">{restaurant.name}</h1>
                <p className="text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none">{restaurant.description}</p>
                <p className="text-sm mb-4">{restaurant.cuisines.join(' • ')}</p>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                  <div className="flex items-center">
                    <StarIcon className="h-5 w-5 text-yellow-400 mr-1" />
                    <span className="font-semibold">{restaurant.rating}</span>
                    <span className="ml-1">({restaurant.reviewCount} ratings)</span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 mr-1" />
                    <span>{restaurant.deliveryTime} mins</span>
                  </div>
                  <div>
                    Delivery: {restaurant.deliveryFee === 0 ? 'FREE' : formatCurrency(restaurant.deliveryFee)}
                  </div>
                </div>
              </div>
              
              {/* Open/Closed Status Badge */}
              <div className="flex flex-col items-start sm:items-end">
                {restaurant.acceptingOrders ? (
                  <span className="px-4 sm:px-6 py-2 bg-green-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    OPEN NOW
                  </span>
                ) : (
                  <span className="px-4 sm:px-6 py-2 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg mb-2">
                    CLOSED
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closed Restaurant Alert */}
      {!restaurant.acceptingOrders && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold text-center">
              ⚠️ This restaurant is currently closed and not accepting orders. Please check back later.
            </p>
          </div>
        </div>
      )}

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Restaurant Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{menuItems?.length || 0}</div>
            <div className="text-sm text-gray-600">Menu Items</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{restaurant.rating}</div>
            <div className="text-sm text-gray-600">Rating</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{restaurant.deliveryTime}m</div>
            <div className="text-sm text-gray-600">Delivery Time</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{restaurant.deliveryFee === 0 ? 'Free' : `₹${restaurant.deliveryFee}`}</div>
            <div className="text-sm text-gray-600">Delivery Fee</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Our Menu</h2>
            <p className="text-gray-600 text-sm mt-1">
              {filteredMenu?.length || 0} items available {selectedCategory !== 'All' && `in ${selectedCategory}`}
            </p>
          </div>
          
          {!restaurant.acceptingOrders && (
            <span className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-xs sm:text-sm font-medium">Currently Not Accepting Orders</span>
          )}
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3">Browse by Category</h3>
          <div className="overflow-x-auto">
            <div className="flex space-x-2 pb-2 min-w-max">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all shadow-sm ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white shadow-md scale-105'
                      : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  {category}
                  {category !== 'All' && (
                    <span className="ml-2 text-xs opacity-75">
                      ({menuItems?.filter(item => item.category === category).length || 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMenu && filteredMenu.length > 0 ? (
            filteredMenu.map((item) => (
              <MenuCard key={item._id} item={item} restaurant={restaurant} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">No items found in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold mb-8">Restaurant Information</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Address */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <MapPinIcon className="h-6 w-6 text-orange-600 mr-2" />
                <h4 className="font-semibold text-lg">Location</h4>
              </div>
              <p className="text-gray-600">
                {restaurant.address.street}<br />
                {restaurant.address.city}, {restaurant.address.state}<br />
                {restaurant.address.zipCode}
              </p>
            </div>

            {/* Cuisines & Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-4">About</h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Cuisines</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {restaurant.cuisines.map((cuisine, index) => (
                      <span key={index} className="bg-white px-3 py-1 rounded-full text-sm text-gray-700">
                        {cuisine}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Min Order</span>
                  <p className="font-medium">{formatCurrency(restaurant.minOrderAmount || 0)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Accepts</span>
                  <p className="font-medium">Cash, UPI, Cards</p>
                </div>
              </div>
            </div>

            {/* Timings */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <ClockIcon className="h-6 w-6 text-orange-600 mr-2" />
                <h4 className="font-semibold text-lg">Operating Hours</h4>
              </div>
              <div className="text-sm space-y-2">
                {restaurant.timing?.open && restaurant.timing?.close ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-gray-700">Daily</span>
                      <span className="text-green-600 font-medium">
                        {restaurant.timing.open} - {restaurant.timing.close}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Open all days of the week
                    </p>
                  </>
                ) : (
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-gray-700">Daily</span>
                    <span className="text-green-600 font-medium">
                      9:00 AM - 10:00 PM
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3">🍽️ Menu Highlights</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• {menuItems?.length || 0} delicious items to choose from</li>
                <li>• Fresh ingredients sourced daily</li>
                <li>• Vegetarian and Non-vegetarian options available</li>
                <li>• {menuItems?.filter(item => item.isVeg).length || 0} Vegetarian items</li>
                <li>• {menuItems?.filter(item => !item.isVeg).length || 0} Non-vegetarian items</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3">⭐ Customer Satisfaction</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• Rating: {restaurant.rating}/5 ({restaurant.reviewCount} reviews)</li>
                <li>• Average delivery time: {restaurant.deliveryTime} minutes</li>
                <li>• {restaurant.deliveryFee === 0 ? 'FREE delivery' : `Delivery fee: ${formatCurrency(restaurant.deliveryFee)}`}</li>
                <li>• Quality checked and hygienic</li>
                <li>• Safe packaging and contactless delivery</li>
              </ul>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-8">
            <ReviewsList restaurantId={id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail;