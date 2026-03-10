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
import { isRestaurantOpen } from '../utils/helpers';
import SEO from '../components/common/SEO';
import toast from 'react-hot-toast';

const BRAND = '#FF523B';

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

  const { isOpen, opensAt, closesAt } = isRestaurantOpen(restaurant.timing, restaurant.acceptingOrders !== false);
  const isOrderable = isOpen;

  const cuisineStr = Array.isArray(restaurant.cuisines) ? restaurant.cuisines.join(', ') : restaurant.cuisine || '';
  const seoDesc = `Order from ${restaurant.name} on FlashBites. ${cuisineStr} cuisine. Rating: ${restaurant.rating}★. Delivery in ${restaurant.deliveryTime} mins. ${isOpen ? 'Open now!' : ''}`;

  const categories = ['All', ...FOOD_CATEGORIES];
  const filteredMenu = selectedCategory === 'All'
    ? menuItems
    : menuItems?.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen" style={{ background: '#F8F6F5' }}>
      <SEO
        title={`${restaurant.name} – Order Online | FlashBites`}
        description={seoDesc}
        image={restaurant.image}
        url={`/restaurant/${id}`}
        keywords={`${restaurant.name}, ${cuisineStr}, food delivery, order online FlashBites`}
      />
      {/* Restaurant Header */}
      <div className="relative h-64 sm:h-72 lg:h-80 bg-gray-900">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 break-words">{restaurant.name}</h1>
                <p className="text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none text-white/80">{restaurant.description}</p>
                <p className="text-sm mb-4 text-white/70">{restaurant.cuisines.join(' • ')}</p>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                    <StarIcon className="h-4 w-4 text-yellow-400" />
                    <span className="font-semibold">{restaurant.rating}</span>
                    <span className="text-white/70">({restaurant.reviewCount} ratings)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                    <ClockIcon className="h-4 w-4" />
                    <span>{restaurant.deliveryTime} mins</span>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                    Delivery: {(Number(restaurant.deliveryFee) || 0) === 0 ? 'FREE' : formatCurrency(Number(restaurant.deliveryFee))}
                  </div>
                </div>
              </div>
              
              {/* Open/Closed Status Badge */}
              <div className="flex flex-col items-start sm:items-end">
                {isOpen ? (
                  <span className="px-4 sm:px-6 py-2 bg-green-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    OPEN NOW · Closes at {closesAt}
                  </span>
                ) : (
                  <span className="px-4 sm:px-6 py-2 bg-gray-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg mb-2">
                    CLOSED · Opens at {opensAt}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closed Restaurant Alert */}
      {!isOrderable && (
        <div className="max-w-7xl mx-auto container-px mt-4 mb-2">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-amber-900 font-semibold">
                This restaurant is currently closed.
              </p>
              {opensAt && (
                <p className="text-amber-700 text-sm">Opens at {opensAt}. You can browse the menu but cannot place orders right now.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto container-px py-8">
        {/* Restaurant Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold" style={{ color: BRAND }}>{menuItems?.length || 0}</div>
            <div className="text-sm text-gray-600">Menu Items</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{restaurant.rating}</div>
            <div className="text-sm text-gray-600">Rating</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold" style={{ color: BRAND }}>{restaurant.deliveryTime}m</div>
            <div className="text-sm text-gray-600">Delivery Time</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{(Number(restaurant.deliveryFee) || 0) === 0 ? 'Free' : formatCurrency(Number(restaurant.deliveryFee))}</div>
            <div className="text-sm text-gray-600">Delivery Fee</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Our Menu</h2>
            <p className="text-gray-500 text-sm mt-1">
              {filteredMenu?.length || 0} items available {selectedCategory !== 'All' && `in ${selectedCategory}`}
            </p>
          </div>
          
          {!isOrderable && (
            <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-xs sm:text-sm font-medium">⏰ Currently Not Accepting Orders</span>
          )}
        </div>

        {/* Category Filter — Figma pill tabs */}
        <div className="mb-8">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex space-x-2 pb-2 min-w-max">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="px-5 sm:px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200"
                  style={
                    selectedCategory === category
                      ? { background: BRAND, color: 'white', boxShadow: '0 4px 12px rgba(255,82,59,0.25)' }
                      : { background: 'white', color: '#4B5563', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
                  }
                  onMouseEnter={e => {
                    if (selectedCategory !== category) {
                      e.currentTarget.style.background = '#FFF0ED';
                      e.currentTarget.style.color = BRAND;
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedCategory !== category) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#4B5563';
                    }
                  }}
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
              <MenuCard key={item._id} item={item} restaurant={restaurant} disabled={!isOrderable} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No items found in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto container-px">
          <h3 className="text-2xl font-bold mb-8">Restaurant Information</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Address */}
            <div className="rounded-xl p-6" style={{ background: '#F8F6F5' }}>
              <div className="flex items-center mb-4">
                <MapPinIcon className="h-6 w-6 mr-2" style={{ color: BRAND }} />
                <h4 className="font-semibold text-lg">Location</h4>
              </div>
              <p className="text-gray-600">
                {restaurant.address.street}<br />
                {restaurant.address.city}, {restaurant.address.state}<br />
                {restaurant.address.zipCode}
              </p>
            </div>

            {/* Cuisines & Info */}
            <div className="rounded-xl p-6" style={{ background: '#F8F6F5' }}>
              <h4 className="font-semibold text-lg mb-4">About</h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Cuisines</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {restaurant.cuisines.map((cuisine, index) => (
                      <span key={index} className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 shadow-sm">
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
            <div className="rounded-xl p-6" style={{ background: '#F8F6F5' }}>
              <div className="flex items-center mb-4">
                <ClockIcon className="h-6 w-6 mr-2" style={{ color: BRAND }} />
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
            <div className="rounded-xl p-6" style={{ background: '#FFF0ED' }}>
              <h4 className="font-semibold text-lg mb-3">🍽️ Menu Highlights</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• {menuItems?.length || 0} delicious items to choose from</li>
                <li>• Fresh ingredients sourced daily</li>
                <li>• Vegetarian and Non-vegetarian options available</li>
                <li>• {menuItems?.filter(item => item.isVeg).length || 0} Vegetarian items</li>
                <li>• {menuItems?.filter(item => !item.isVeg).length || 0} Non-vegetarian items</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-xl p-6">
              <h4 className="font-semibold text-lg mb-3">⭐ Customer Satisfaction</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• Rating: {restaurant.rating}/5 ({restaurant.reviewCount} reviews)</li>
                <li>• Average delivery time: {restaurant.deliveryTime} minutes</li>
                <li>• {(Number(restaurant.deliveryFee) || 0) === 0 ? 'FREE delivery' : `Delivery fee: ${formatCurrency(Number(restaurant.deliveryFee))}`}</li>
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