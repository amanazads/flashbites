import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantById } from '../redux/slices/restaurantSlice';
import { getRestaurantMenuItems } from '../api/restaurantApi';
import { StarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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
  const [menuSearch, setMenuSearch] = useState('');
  const [dietFilter, setDietFilter] = useState('all');
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

  const baseCategories = [
    'All',
    'Pizza',
    'Desserts',
    'Burgers',
    'Fast Food',
    'Chinese',
    'Beverages',
    'Breads',
    'Snacks',
    'Main Course',
  ];
  const menuCategories = (menuItems || []).map((item) => item.category).filter(Boolean);
  const categories = Array.from(new Set([...baseCategories, ...menuCategories]));
  const normalizedSearch = menuSearch.trim().toLowerCase();
  const normalizedCategory = selectedCategory.toLowerCase();
  const categoryKeywords = {
    pizza: ['pizza', 'pizzas'],
    burgers: ['burger', 'burgers'],
    burger: ['burger', 'burgers'],
    desserts: ['dessert', 'desserts', 'sweet', 'cake', 'ice cream'],
    chinese: ['chinese', 'noodle', 'noodles', 'manchurian', 'hakka'],
    'fast food': ['fast food', 'fries', 'wrap', 'roll', 'sandwich'],
    beverages: ['beverage', 'beverages', 'drink', 'drinks', 'shake', 'coffee', 'tea'],
    breads: ['bread', 'breads', 'garlic bread', 'bun', 'toast'],
    snacks: ['snack', 'snacks', 'starter', 'stater', 'maggie', 'maggi'],
    'main course': ['main course', 'main', 'course', 'curry', 'gravy'],
  };
  const categoryTerms = categoryKeywords[normalizedCategory] || [normalizedCategory];
  const filteredMenu = (menuItems || []).filter((item) => {
    const itemText = `${item.name || ''} ${item.description || ''}`.toLowerCase();
    const isVeg = item?.isVeg === true || item?.isVegetarian === true || item?.veg === true;
    const isNonVeg = item?.isVeg === false || item?.isVegetarian === false || item?.veg === false;
    const categoryMatch = selectedCategory === 'All'
      || item.category === selectedCategory
      || categoryTerms.some((term) => itemText.includes(term));
    const searchMatch = !normalizedSearch || itemText.includes(normalizedSearch);
    const dietMatch = dietFilter === 'all'
      || (dietFilter === 'veg' && isVeg)
      || (dietFilter === 'nonveg' && isNonVeg);
    return categoryMatch && searchMatch && dietMatch;
  });

  return (
    <div style={{ background: '#F8F6F5' }}>
      <SEO
        title={`${restaurant.name} – Order Online | FlashBites`}
        description={seoDesc}
        image={restaurant.image}
        url={`/restaurant/${id}`}
        keywords={`${restaurant.name}, ${cuisineStr}, food delivery, order online FlashBites`}
      />
      {/* Restaurant Header */}
      <div className="relative h-64 sm:h-72 lg:h-80 max-[388px]:h-56 bg-gray-900">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 max-[388px]:p-3 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl max-[388px]:text-xl font-bold mb-2 break-words text-white drop-shadow-lg">{restaurant.name}</h1>
                <p className="text-sm sm:text-base lg:text-lg max-[388px]:text-xs mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none text-white/90 drop-shadow-md">{restaurant.description}</p>
                <p className="text-sm max-[388px]:text-xs mb-4 max-[388px]:mb-3 text-white/80 drop-shadow">{restaurant.cuisines.join(' • ')}</p>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 max-[388px]:gap-x-3 max-[388px]:gap-y-1.5 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 max-[388px]:px-2.5 max-[388px]:py-1 rounded-xl">
                    <StarIcon className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold text-white">{restaurant.rating}/5</span>
                    <span className="text-white/80">({restaurant.reviewCount} ratings)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 max-[388px]:px-2.5 max-[388px]:py-1 rounded-xl text-white">
                    <ClockIcon className="h-4 w-4" />
                    <span>{restaurant.deliveryTime} mins</span>
                  </div>
                </div>
              </div>
              
              {/* Open/Closed Status Badge */}
              <div className="flex flex-col items-start sm:items-end">
                {isOpen ? (
                  <span className="px-4 sm:px-6 py-2 max-[388px]:px-3 max-[388px]:py-1.5 bg-green-500 text-white text-xs sm:text-sm max-[388px]:text-[11px] font-bold rounded-full shadow-lg mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    OPEN NOW · Closes at {closesAt}
                  </span>
                ) : (
                  <span className="px-4 sm:px-6 py-2 max-[388px]:px-3 max-[388px]:py-1.5 bg-gray-700 text-white text-xs sm:text-sm max-[388px]:text-[11px] font-bold rounded-full shadow-lg mb-2">
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
        <div className="max-w-7xl mx-auto container-px mt-4 mb-2 max-[388px]:mt-3 max-[388px]:mb-1">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 max-[388px]:p-3 flex items-center gap-3">
            <span className="text-2xl max-[388px]:text-xl">⏰</span>
            <div>
              <p className="text-amber-900 font-semibold max-[388px]:text-sm">
                This restaurant is currently closed.
              </p>
              {opensAt && (
                <p className="text-amber-700 text-sm max-[388px]:text-xs">Opens at {opensAt}. You can browse the menu but cannot place orders right now.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto container-px py-8 max-[388px]:py-6">
        {/* Restaurant Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-[388px]:gap-2 mb-8 max-[388px]:mb-6">
          <div className="bg-white rounded-xl p-4 max-[388px]:p-3 text-center shadow-sm">
            <div className="text-2xl max-[388px]:text-xl font-bold" style={{ color: BRAND }}>{menuItems?.length || 0}</div>
            <div className="text-sm max-[388px]:text-xs text-gray-600">Menu Items</div>
          </div>
          <div className="bg-white rounded-xl p-4 max-[388px]:p-3 text-center shadow-sm">
            <div className="text-2xl max-[388px]:text-xl font-bold text-green-600">{restaurant.rating}/5</div>
            <div className="text-sm max-[388px]:text-xs text-gray-600">Rating</div>
          </div>
          <div className="bg-white rounded-xl p-4 max-[388px]:p-3 text-center shadow-sm">
            <div className="text-2xl max-[388px]:text-xl font-bold" style={{ color: BRAND }}>{restaurant.deliveryTime}m</div>
            <div className="text-sm max-[388px]:text-xs text-gray-600">Delivery Time</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 max-[388px]:mb-4">
          <div>
            <h2 className="text-2xl max-[388px]:text-xl font-bold">Our Menu</h2>
            <p className="text-gray-500 text-sm max-[388px]:text-xs mt-1">
              {filteredMenu?.length || 0} items available {selectedCategory !== 'All' && `in ${selectedCategory}`}
            </p>
          </div>
          
          {!isOrderable && (
            <span className="bg-amber-100 text-amber-800 px-4 py-2 max-[388px]:px-3 max-[388px]:py-1.5 rounded-full text-xs sm:text-sm max-[388px]:text-[11px] font-medium">⏰ Currently Not Accepting Orders</span>
          )}
        </div>

        <div className="flex flex-col">
          <div
            className="sticky z-40 mb-6 max-[388px]:mb-4"
            style={{ top: 'var(--nav-height-mob)' }}
          >
            <div className="bg-white rounded-2xl p-3 sm:p-4 max-[388px]:p-2 shadow-md space-y-3">
              <div className="search-bar">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder={`Search in ${restaurant.name} menu...`}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDietFilter('veg')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    dietFilter === 'veg'
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                  style={dietFilter === 'veg' ? { background: '#16A34A' } : {}}
                >
                  Veg
                </button>
                <button
                  type="button"
                  onClick={() => setDietFilter('nonveg')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    dietFilter === 'nonveg'
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                  style={dietFilter === 'nonveg' ? { background: '#DC2626' } : {}}
                >
                  Non-Veg
                </button>
                <button
                  type="button"
                  onClick={() => setDietFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    dietFilter === 'all'
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                  style={dietFilter === 'all' ? { background: BRAND } : {}}
                >
                  All
                </button>
              </div>
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 min-w-max">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 max-[388px]:px-2.5 max-[388px]:py-1 rounded-full text-sm max-[388px]:text-[12px] font-medium border transition-colors ${
                        selectedCategory === category
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                      style={selectedCategory === category ? { background: BRAND } : {}}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items Grouped by Category */}
          <div
            className="space-y-8 max-[388px]:space-y-6 overflow-y-auto pr-1 max-[388px]:pr-0.5"
            style={{ maxHeight: 'calc(100vh - var(--nav-height-mob) - 220px)' }}
          >
            {categories.filter((category) => category !== 'All').map((category) => {
              const catItems = filteredMenu?.filter((item) => item.category === category);
              if (!catItems || catItems.length === 0) return null;
              
              return (
                <div key={category} className="bg-white rounded-2xl shadow-sm overflow-hidden p-6 pb-2 max-[388px]:p-4">
                  <h3 className="text-xl max-[388px]:text-lg font-bold mb-4 pb-2 border-b flex justify-between items-center text-gray-900 border-gray-100">
                    {category}
                    <span className="text-sm max-[388px]:text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 max-[388px]:px-2 max-[388px]:py-0.5 rounded-full">
                      {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-[388px]:gap-3 pb-4">
                    {catItems.map((item) => (
                      <MenuCard key={item._id} item={item} restaurant={restaurant} disabled={!isOrderable} />
                    ))}
                  </div>
                </div>
              );
            })}
            
            {filteredMenu.length === 0 && (
              <div className="text-center py-12 max-[388px]:py-10 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-500 max-[388px]:text-sm">No menu items match your search in this restaurant.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border-t py-12 max-[388px]:py-8">
        <div className="max-w-7xl mx-auto container-px">
          <h3 className="text-2xl max-[388px]:text-xl font-bold mb-8 max-[388px]:mb-6">Restaurant Information</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Address */}
            <div className="rounded-xl p-6 max-[388px]:p-4" style={{ background: '#F8F6F5' }}>
              <div className="flex items-center mb-4">
                <MapPinIcon className="h-6 w-6 mr-2" style={{ color: BRAND }} />
                <h4 className="font-semibold text-lg max-[388px]:text-base">Location</h4>
              </div>
              <p className="text-gray-600 max-[388px]:text-sm">
                {restaurant.address.street}<br />
                {restaurant.address.city}, {restaurant.address.state}<br />
                {restaurant.address.zipCode}
              </p>
            </div>

            {/* Cuisines & Info */}
            <div className="rounded-xl p-6 max-[388px]:p-4" style={{ background: '#F8F6F5' }}>
              <h4 className="font-semibold text-lg max-[388px]:text-base mb-4">About</h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm max-[388px]:text-xs text-gray-500">Cuisines</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {restaurant.cuisines.map((cuisine, index) => (
                      <span key={index} className="bg-white px-3 py-1 max-[388px]:px-2 max-[388px]:py-0.5 rounded-full text-sm max-[388px]:text-xs text-gray-700 shadow-sm">
                        {cuisine}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm max-[388px]:text-xs text-gray-500">Accepts</span>
                  <div className="flex gap-2 mt-1">
                    <span className="bg-white px-3 py-1 max-[388px]:px-2 max-[388px]:py-0.5 rounded-full text-sm max-[388px]:text-xs font-medium text-gray-700 shadow-sm border border-gray-100">Cash</span>
                    <span className="bg-white px-3 py-1 max-[388px]:px-2 max-[388px]:py-0.5 rounded-full text-sm max-[388px]:text-xs font-medium text-gray-700 shadow-sm border border-gray-100">UPI</span>
                    <span className="bg-white px-3 py-1 max-[388px]:px-2 max-[388px]:py-0.5 rounded-full text-sm max-[388px]:text-xs font-medium text-gray-700 shadow-sm border border-gray-100">Cards</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timings */}
            <div className="rounded-xl p-6 max-[388px]:p-4" style={{ background: '#F8F6F5' }}>
              <div className="flex items-center mb-4">
                <ClockIcon className="h-6 w-6 mr-2" style={{ color: BRAND }} />
                <h4 className="font-semibold text-lg max-[388px]:text-base">Operating Hours</h4>
              </div>
              <div className="text-sm max-[388px]:text-xs space-y-2">
                {restaurant.timing?.open && restaurant.timing?.close ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-gray-700">Daily</span>
                      <span className="text-green-600 font-medium">
                        {restaurant.timing.open} - {restaurant.timing.close}
                      </span>
                    </div>
                    <p className="text-xs max-[388px]:text-[11px] text-gray-500 mt-3">
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
          <div className="mt-8 max-[388px]:mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl p-6 max-[388px]:p-4" style={{ background: '#FFF0ED' }}>
              <h4 className="font-semibold text-lg max-[388px]:text-base mb-3">🍽️ Menu Highlights</h4>
              <ul className="space-y-2 text-gray-700 max-[388px]:text-sm">
                <li>• {menuItems?.length || 0} delicious items to choose from</li>
                <li>• Fresh ingredients sourced daily</li>
                <li>• Vegetarian and Non-vegetarian options available</li>
                <li>• {menuItems?.filter(item => item.isVeg).length || 0} Vegetarian items</li>
                <li>• {menuItems?.filter(item => !item.isVeg).length || 0} Non-vegetarian items</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-xl p-6 max-[388px]:p-4">
              <h4 className="font-semibold text-lg max-[388px]:text-base mb-3">⭐ Customer Satisfaction</h4>
              <ul className="space-y-2 text-gray-700 max-[388px]:text-sm">
                <li>• Rating: {restaurant.rating}/5 ({restaurant.reviewCount} reviews)</li>
                <li>• Average delivery time: {restaurant.deliveryTime} minutes</li>
                <li>• Quality checked and hygienic</li>
                <li>• Safe packaging and contactless delivery</li>
              </ul>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-8 max-[388px]:mt-6">
            <ReviewsList restaurantId={id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail;