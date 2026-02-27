import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import {
  IoArrowBack,
  IoStar,
  IoTimeOutline,
  IoHeartOutline,
  IoHeart,
  IoShareSocialOutline,
  IoCartOutline,
  IoAdd,
  IoRemove,
  IoClose,
} from 'react-icons/io5';
import { useAppContext } from '../context/AppContext';
import { mockRestaurants } from '../data/mockData';


// Mock menu data with add-ons
const menuData = {
  mostPopular: [
    {
      id: 1,
      name: 'Classic Cheeseburger',
      description: '100% beef patty, cheddar cheese, pickles, and our special sauce',
      price: 12.50,
      image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=800',
      addOns: [
        { id: 'extra-cheese', name: 'Extra Cheese', price: 1.50 },
        { id: 'bacon', name: 'Bacon', price: 2.00 },
        { id: 'avocado', name: 'Avocado', price: 2.50 },
        { id: 'extra-patty', name: 'Extra Patty', price: 3.50 },
      ],
    },
    {
      id: 2,
      name: 'Bacon Deluxe',
      description: 'Crispy bacon, smashed beef patty, caramelized onions, and special sauce',
      price: 14.90,
      image: 'https://images.pexels.com/photos/3738730/pexels-photo-3738730.jpeg?auto=compress&cs=tinysrgb&w=800',
      addOns: [
        { id: 'extra-cheese', name: 'Extra Cheese', price: 1.50 },
        { id: 'extra-bacon', name: 'Extra Bacon', price: 2.50 },
        { id: 'onion-rings', name: 'Onion Rings', price: 2.00 },
        { id: 'jalapeños', name: 'Jalapeños', price: 1.00 },
      ],
    },
  ],
  combos: [
    {
      id: 3,
      name: 'The Hangover Deal',
      description: 'Double Cheeseburger + Cajun Fries + Soda of choice',
      price: 18.00,
      image: 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=800',
      addOns: [
        { id: 'upsize-drink', name: 'Upsize Drink', price: 1.50 },
        { id: 'extra-fries', name: 'Extra Fries', price: 3.00 },
        { id: 'dessert', name: 'Add Dessert', price: 4.00 },
      ],
    },
  ],
  sides: [
    {
      id: 4,
      name: 'Cajun Fries',
      description: 'Hand-cut fries tossed in our secret spice blend',
      price: 5.50,
      image: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=800',
      addOns: [
        { id: 'cheese-sauce', name: 'Cheese Sauce', price: 1.50 },
        { id: 'bacon-bits', name: 'Bacon Bits', price: 2.00 },
        { id: 'ranch', name: 'Ranch Dip', price: 0.50 },
      ],
    },
  ],
};

const RestaurantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wishlist, toggleWishlist } = useAppContext();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState('mostPopular');
  const [cart, setCart] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [itemQuantity, setItemQuantity] = useState(1);

  const isWishlisted = wishlist.includes(id);

  const categoryIcons = {
    Pizza: '🍕',
    Burger: '🍔',
    Sushi: '🍣',
    Tacos: '🌮',
    Noodles: '🍜',
  };

  const tabs = [
    { id: 'mostPopular', label: 'Most Popular' },
    { id: 'combos', label: 'Combos' },
    { id: 'sides', label: 'Sides' },
  ];

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const response = await axios.get(`/api/restaurants/${id}`);
        if (response.data.success) {
          setRestaurant(response.data.data);
        }
      } catch (error) {
        console.log('Using mock data for restaurant details');
        const mockRestaurant = mockRestaurants.find(r => r._id === id);
        if (mockRestaurant) {
          setRestaurant(mockRestaurant);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    setQuantities({ ...quantities, [item.id]: (quantities[item.id] || 0) + 1 });
  };

  const removeFromCart = (itemId) => {
    const existingItem = cart.find(cartItem => cartItem.id === itemId);
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(cartItem => 
        cartItem.id === itemId 
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      ));
      setQuantities({ ...quantities, [itemId]: quantities[itemId] - 1 });
    } else {
      setCart(cart.filter(cartItem => cartItem.id !== itemId));
      const newQuantities = { ...quantities };
      delete newQuantities[itemId];
      setQuantities(newQuantities);
    }
  };

  const openItemModal = (item) => {
    setSelectedItem(item);
    setSelectedAddOns([]);
    setItemQuantity(1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setSelectedAddOns([]);
    setItemQuantity(1);
  };

  const toggleAddOn = (addOn) => {
    if (selectedAddOns.find(a => a.id === addOn.id)) {
      setSelectedAddOns(selectedAddOns.filter(a => a.id !== addOn.id));
    } else {
      setSelectedAddOns([...selectedAddOns, addOn]);
    }
  };

  const calculateItemTotal = () => {
    if (!selectedItem) return 0;
    const basePrice = selectedItem.price;
    const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
    return ((basePrice + addOnsTotal) * itemQuantity).toFixed(2);
  };

  const addToCartWithAddOns = () => {
    const itemWithAddOns = {
      ...selectedItem,
      addOns: selectedAddOns,
      quantity: itemQuantity,
      totalPrice: calculateItemTotal(),
    };
    
    const existingItem = cart.find(cartItem => 
      cartItem.id === selectedItem.id && 
      JSON.stringify(cartItem.addOns) === JSON.stringify(selectedAddOns)
    );
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === selectedItem.id && 
        JSON.stringify(cartItem.addOns) === JSON.stringify(selectedAddOns)
          ? { ...cartItem, quantity: cartItem.quantity + itemQuantity }
          : cartItem
      ));
    } else {
      setCart([...cart, itemWithAddOns]);
    }
    
    setQuantities({ 
      ...quantities, 
      [selectedItem.id]: (quantities[selectedItem.id] || 0) + itemQuantity 
    });
    
    closeModal();
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Restaurant not found</h3>
          <p className="text-gray-500 mb-6">The restaurant you're looking for doesn't exist</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-white">
      {/* Header Image */}
      <div className="relative h-72">
        {!imageError ? (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <span className="text-8xl">{categoryIcons[restaurant.category] || '🍽️'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

        {/* Top Buttons */}
        <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="bg-white/95 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <IoArrowBack className="text-xl text-gray-800" />
          </button>
          <div className="flex items-center gap-2">
            <button
              className="bg-white/95 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <IoShareSocialOutline className="text-xl text-gray-800" />
            </button>
            <button
              onClick={() => toggleWishlist(id)}
              className="bg-white/95 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-white transition-colors"
            >
              {isWishlisted ? (
                <IoHeart className="text-xl text-red-500" />
              ) : (
                <IoHeartOutline className="text-xl text-gray-800" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Restaurant Info Card */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {restaurant.name}
              </h1>
              <p className="text-sm text-gray-600">{restaurant.cuisine}</p>
            </div>
            <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1.5 rounded-lg">
              <IoStar className="text-orange-500 text-base" />
              <span className="text-sm font-bold text-gray-900">{restaurant.rating}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <IoTimeOutline className="text-orange-500 text-base" />
              <span>{restaurant.deliveryTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-orange-500">📍</span>
              <span>1.2 km</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-orange-500">💰</span>
              <span>{restaurant.priceRange}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {tabs.find(t => t.id === activeTab)?.label}
        </h2>
        
        <div className="space-y-4">
          {menuData[activeTab]?.map((item) => (
            <div 
              key={item.id} 
              onClick={() => openItemModal(item)}
              className="flex gap-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors rounded-2xl p-2"
            >
              <div className="w-24 h-24 flex-shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-orange-500 font-bold text-lg">
                    ${item.price.toFixed(2)}
                  </span>
                  {quantities[item.id] && (
                    <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-semibold">
                      {quantities[item.id]} in cart
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="max-w-md mx-auto bg-orange-500 rounded-2xl shadow-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span className="text-white font-bold text-sm">
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="text-white">
                <p className="text-xs font-medium opacity-90">Total</p>
                <p className="text-lg font-bold">${getTotalPrice()}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="bg-white text-orange-500 px-6 py-3 rounded-full font-bold text-sm hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <IoCartOutline className="text-lg" />
              View Cart
            </button>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {isModalOpen && selectedItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fadeIn"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl animate-slideUp sm:animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-full h-40 sm:h-48 object-cover rounded-t-3xl sm:rounded-t-3xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 rounded-t-3xl sm:rounded-t-3xl"></div>
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-full shadow-lg hover:bg-white active:scale-95 transition-all duration-200"
                >
                  <IoClose className="text-lg sm:text-xl text-gray-800" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto modal-scroll px-5 sm:px-6 py-5 sm:py-6">
              {/* Item Info */}
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                  {selectedItem.name}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-3">
                  {selectedItem.description}
                </p>
                <div className="inline-flex items-center gap-2 bg-orange-50 px-3.5 py-2 rounded-full">
                  <span className="text-orange-500 font-bold text-base sm:text-lg">
                    ${selectedItem.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 text-xs sm:text-sm">base price</span>
                </div>
              </div>

              {/* Add-ons Section */}
              {selectedItem.addOns && selectedItem.addOns.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      Customize Your Order
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                      {selectedAddOns.length > 0 ? `${selectedAddOns.length} selected` : 'Optional'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {selectedItem.addOns.map((addOn) => {
                      const isSelected = selectedAddOns.find(a => a.id === addOn.id) !== undefined;
                      return (
                        <label
                          key={addOn.id}
                          className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 shadow-md scale-[1.02]'
                              : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 active:scale-[0.98]'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAddOn(addOn)}
                                className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer transition-all"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className={`font-semibold text-sm sm:text-base truncate ${
                              isSelected ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {addOn.name}
                            </span>
                          </div>
                          <span className={`font-bold text-sm sm:text-base whitespace-nowrap ml-3 flex-shrink-0 ${
                            isSelected ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            +${addOn.price.toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-5">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3.5">
                  Quantity
                </h3>
                <div className="flex items-center justify-center gap-5 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <button
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    disabled={itemQuantity <= 1}
                    className={`flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 ${
                      itemQuantity <= 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 active:scale-95 shadow-md border border-gray-200'
                    }`}
                  >
                    <IoRemove className="text-2xl" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900 min-w-[70px] text-center">
                      {itemQuantity}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">items</span>
                  </div>
                  <button
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                    className="flex items-center justify-center w-14 h-14 rounded-xl bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 active:scale-95 transition-all duration-200 shadow-md border border-gray-200"
                  >
                    <IoAdd className="text-2xl" />
                  </button>
                </div>
              </div>

              {/* Price Breakdown (if add-ons selected) */}
              {selectedAddOns.length > 0 && (
                <div className="mb-5 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl border border-orange-200 space-y-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                    <h4 className="font-bold text-gray-900 text-sm">Price Breakdown</h4>
                  </div>
                  <div className="flex justify-between text-gray-700 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Base price × {itemQuantity}
                    </span>
                    <span className="font-semibold">${(selectedItem.price * itemQuantity).toFixed(2)}</span>
                  </div>
                  {selectedAddOns.map((addOn) => (
                    <div key={addOn.id} className="flex justify-between text-gray-700 text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                        {addOn.name} × {itemQuantity}
                      </span>
                      <span className="font-semibold">${(addOn.price * itemQuantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t-2 border-orange-300 pt-2.5 mt-2.5 flex justify-between font-bold text-base">
                    <span className="text-gray-900">Total Amount</span>
                    <span className="text-orange-600 text-lg">${calculateItemTotal()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Bottom Button */}
            <div className="flex-shrink-0 p-5 sm:p-6 pt-3 sm:pt-4 bg-white border-t border-gray-100 sticky bottom-0">
              <button
                onClick={addToCartWithAddOns}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 sm:py-4.5 rounded-2xl font-bold text-base sm:text-lg transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-between px-6"
              >
                <span className="flex items-center gap-2">
                  <IoCartOutline className="text-xl sm:text-2xl" />
                  Add to Cart
                </span>
                <span className="text-lg sm:text-xl font-bold">${calculateItemTotal()}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

RestaurantDetails.propTypes = {
  id: PropTypes.string,
};

export default RestaurantDetails;