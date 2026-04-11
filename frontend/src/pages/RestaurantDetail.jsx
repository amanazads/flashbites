import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantById } from '../redux/slices/restaurantSlice';
import { getRestaurantMenuItems } from '../api/restaurantApi';
import { openCart } from '../redux/slices/uiSlice';
import { addToCart, clearCart, updateQuantity } from '../redux/slices/cartSlice';
import { StarIcon, ClockIcon, MapPinIcon, PlusIcon, ArrowRightIcon, MinusIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon, MapPinIcon as MapPinOutlineIcon, AdjustmentsHorizontalIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Loader } from '../components/common/Loader';
import { isRestaurantOpen } from '../utils/helpers';
import SEO from '../components/common/SEO';
import logo from '../assets/logo.png';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useLanguage } from '../contexts/LanguageContext';

const CATEGORY_PRIORITY = [
  'Fast Food', 'Pizza', 'Burger', 'Burgers', 'Desserts', 'Chinese', 'Italian', 'South Indian',
  'North Indian', 'Mexican', 'Thai', 'Japanese', 'Beverages', 'Coffee', 'Salads', 'Healthy Food',
  'Street Food', 'Bakery', 'Seafood', 'Sandwiches', 'Wraps', 'Fries', 'Pasta', 'Noodles'
];

const getId = (value) => {
  if (!value) return null;
  return value._id || value.id || null;
};

const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentRestaurant: restaurant, loading } = useSelector((state) => state.restaurant);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuSearch, setMenuSearch] = useState('');
  const [dietFilter, setDietFilter] = useState('All');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const { t, language } = useLanguage();
  const [menuItems, setMenuItems] = useState([]);
  const { items: cartItems, restaurant: cartRestaurant } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchRestaurantById(id));
    fetchMenuItems();
  }, [dispatch, id]);

  const fetchMenuItems = async () => {
    try {
      const response = await getRestaurantMenuItems(id);
      const items = response.data?.items || response.items || [];
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
      toast.error(t('checkout.failedLoad', 'Failed to load checkout details'));
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/restaurants');
  };

  const safeRestaurant = {
    ...(restaurant || {}),
    name: typeof restaurant?.name === 'string' ? restaurant.name : 'Restaurant',
    rating: Number.isFinite(Number(restaurant?.rating)) ? Number(restaurant.rating) : 4.5,
    reviewCount: Number.isFinite(Number(restaurant?.reviewCount)) ? Number(restaurant.reviewCount) : 2000,
    deliveryTime: Number.isFinite(Number(restaurant?.deliveryTime)) ? Number(restaurant.deliveryTime) : 30,
    cuisines: Array.isArray(restaurant?.cuisines) ? restaurant.cuisines.filter((c) => typeof c === 'string') : [],
  };

  const { isOpen } = isRestaurantOpen(safeRestaurant.timing, safeRestaurant.acceptingOrders !== false);
  // Only hard-disable cart actions when backend explicitly marks restaurant as not accepting orders.
  // Some restaurants have incomplete timing data, which can make isOpen unreliable on client.
  const isOrderable = safeRestaurant.acceptingOrders !== false;

  const cuisineStr = safeRestaurant.cuisines.length > 0
    ? safeRestaurant.cuisines.join(' • ')
    : (typeof safeRestaurant.cuisine === 'string' ? safeRestaurant.cuisine : 'Multi-cuisine');
  const seoDesc = `Order from ${safeRestaurant.name} on FlashBites. ${cuisineStr} cuisine. Rating: ${safeRestaurant.rating}★. Delivery in ${safeRestaurant.deliveryTime} mins.`;

  const menuCategories = useMemo(() => {
    const discovered = (menuItems || []).flatMap((item) => {
      if (Array.isArray(item?.categories) && item.categories.length > 0) {
        return item.categories.filter((cat) => typeof cat === 'string').map((cat) => cat.trim());
      }
      return typeof item?.category === 'string' ? [item.category.trim()] : [];
    }).filter(Boolean);

    const unique = Array.from(new Set(discovered));
    const lowerUnique = new Set(unique.map((cat) => cat.toLowerCase()));

    const priorityMatches = CATEGORY_PRIORITY.filter((cat) => lowerUnique.has(cat.toLowerCase()));
    const leftovers = unique.filter((cat) => !priorityMatches.some((p) => p.toLowerCase() === cat.toLowerCase()));

    return [...priorityMatches, ...leftovers];
  }, [menuItems]);

  const categories = useMemo(() => ['All', ...menuCategories], [menuCategories]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [categories, selectedCategory]);
  
  const normalizedCategory = (typeof selectedCategory === 'string' ? selectedCategory : 'All').toLowerCase();
  const categoryKeywords = {
    pizza: ['pizza', 'pizzas'],
    burgers: ['burger', 'burgers'],
    burger: ['burger', 'burgers'],
    desserts: ['dessert', 'desserts', 'sweet', 'cake'],
    chinese: ['chinese', 'noodle', 'noodles', 'manchurian'],
    'fast food': ['fast food', 'fries', 'wrap', 'sandwich'],
    beverages: ['beverage', 'beverages', 'drink', 'coffee', 'tea'],
    breads: ['bread', 'breads', 'garlic bread', 'bun'],
    snacks: ['snack', 'snacks', 'starter'],
    'main course': ['main course', 'main', 'course', 'curry'],
  };
  const categoryTerms = categoryKeywords[normalizedCategory] || [normalizedCategory];

  const getLocalizedItemName = (item) => {
    const english = typeof item?.name === 'string' ? item.name : '';
    const hindi = typeof item?.nameHi === 'string' ? item.nameHi.trim() : '';
    return language === 'hi' && hindi ? hindi : english;
  };

  const getLocalizedItemDescription = (item) => {
    const english = typeof item?.description === 'string' ? item.description : '';
    const hindi = typeof item?.descriptionHi === 'string' ? item.descriptionHi.trim() : '';
    return language === 'hi' && hindi ? hindi : english;
  };
  
  const itemBelongsToCategory = (item, category) => {
    if (category === 'All') return true;
    const itemName = getLocalizedItemName(item);
    const itemDescription = getLocalizedItemDescription(item);
    const itemText = `${itemName} ${itemDescription}`.toLowerCase();
    const itemCategories = Array.isArray(item?.categories) && item.categories.length > 0
      ? item.categories.filter((cat) => typeof cat === 'string')
      : (typeof item?.category === 'string' ? [item.category] : []);

    return itemCategories.includes(category) || categoryTerms.some((term) => itemText.includes(term));
  };

  const filteredMenu = useMemo(() => (menuItems || []).filter((item) => {
    const itemName = getLocalizedItemName(item);
    const itemDescription = getLocalizedItemDescription(item);
    const itemText = `${itemName} ${itemDescription}`.toLowerCase();
    const searchMatch = menuSearch.trim().length === 0 || itemText.includes(menuSearch.trim().toLowerCase());

    const vegMatch = dietFilter === 'All'
      || (dietFilter === 'Veg' && item?.isVeg === true)
      || (dietFilter === 'Non-Veg' && item?.isVeg === false);

    return itemBelongsToCategory(item, selectedCategory) && searchMatch && vegMatch;
  }), [menuItems, selectedCategory, categoryTerms, menuSearch, dietFilter, language]);

  const safeRestaurantId = getId(safeRestaurant);
  const isCurrentRestaurantCart = getId(cartRestaurant) === safeRestaurantId;
  const cartItemCount = isCurrentRestaurantCart ? cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
  const cartTotal = isCurrentRestaurantCart ? cartItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (item.quantity || 0)), 0) : 0;

  const handleAddToCart = (e, item) => {
    e.stopPropagation();
    if (cartRestaurant && getId(cartRestaurant) !== safeRestaurantId) {
      Swal.fire({
        title: t('restaurant.replaceCart', 'Replace cart?'),
        text: t('restaurant.replaceCartText', 'Your cart contains items from another restaurant. Do you want to clear it and add this item?'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#FF5A25',
        cancelButtonColor: '#6B7280',
        confirmButtonText: t('restaurant.yesClear', 'Yes, clear it!')
      }).then((result) => {
        if (result.isConfirmed) {
          dispatch(clearCart());
          dispatch(addToCart({ item, restaurant: safeRestaurant }));
          toast.success(t('home.addedToCart', 'Added to cart!'));
        }
      });
      return;
    }
    dispatch(addToCart({ item, restaurant: safeRestaurant }));
    toast.success(t('home.addedToCart', 'Added to cart!'));
  };

  const handleQuantityChange = (e, itemId, nextQuantity) => {
    e.stopPropagation();
    if (!itemId) return;
    dispatch(updateQuantity({ itemId, quantity: nextQuantity }));
  };

  const displayCategories = categories.filter((c) => c !== 'All');
  const groupedByCategory = displayCategories.map((cat) => {
    const items = filteredMenu.filter((item) => itemBelongsToCategory(item, cat));
    return { name: cat, items };
  }).filter((group) => group.items.length > 0);

  const sectionsToRender = selectedCategory === 'All'
    ? (groupedByCategory.length > 0 ? groupedByCategory : [{ name: 'Popular Choices', items: filteredMenu }])
    : groupedByCategory.filter((g) => g.name === selectedCategory);

  const deliveryText = safeRestaurant.deliveryTime ? `${safeRestaurant.deliveryTime} min` : '25-35 min';
  const distanceKm = Number.isFinite(Number(safeRestaurant.distanceKm))
    ? Number(safeRestaurant.distanceKm)
    : (Number.isFinite(Number(safeRestaurant.distance)) ? Number(safeRestaurant.distance) * 1.60934 : 1.9);
  const distanceText = `${distanceKm.toFixed(1)} km`;
  const reviewText = safeRestaurant.reviewCount ? `(${safeRestaurant.reviewCount}+)` : '(2k+)';
  const floatingButtonBottom = cartItemCount > 0
    ? 'calc(env(safe-area-inset-bottom) + 92px)'
    : 'calc(env(safe-area-inset-bottom) + 68px)';
  const floatingPanelBottom = cartItemCount > 0
    ? 'calc(env(safe-area-inset-bottom) + 150px)'
    : 'calc(env(safe-area-inset-bottom) + 126px)';
  const activeFilterCount = (selectedCategory !== 'All' ? 1 : 0) + (dietFilter !== 'All' ? 1 : 0);
  const categoryCountMap = useMemo(() => {
    const map = { All: (menuItems || []).length };
    categories.forEach((category) => {
      if (category === 'All') return;
      map[category] = (menuItems || []).filter((item) => {
        const itemCategories = Array.isArray(item?.categories) && item.categories.length > 0
          ? item.categories.filter((cat) => typeof cat === 'string')
          : (typeof item?.category === 'string' ? [item.category] : []);
        return itemCategories.includes(category);
      }).length;
    });
    return map;
  }, [categories, menuItems]);

  if (loading) return <Loader />;
  if (!restaurant) return <div>{t('restaurant.notFound', 'Restaurant not found')}</div>;

  return (
    <div className="min-h-screen font-sans text-[13px] pb-28" style={{ backgroundColor: '#F5F3F1' }}>
      <SEO title={`${safeRestaurant.name} | FlashBites`} description={seoDesc} />

      <div className="max-w-md mx-auto">
        <div className="px-4 pt-[max(env(safe-area-inset-top),10px)]" style={{ backgroundColor: '#F5F3F1' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoBack}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-[0_8px_18px_rgba(234,88,12,0.32)]"
                style={{ background: 'linear-gradient(180deg, #FF7A45 0%, #EA580C 100%)' }}
                aria-label="Go back"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <button type="button" className="flex items-center gap-2 text-left">
                <MapPinOutlineIcon className="h-4 w-4" style={{ color: 'rgb(234, 88, 12)' }} />
                <div>
                  <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">{t('common.deliverTo', 'Deliver to')}</p>
                  <p className="text-[12px] leading-none font-semibold text-gray-900">{t('common.currentArea', 'Current Area')}</p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/restaurants')}>
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-700" />
              </button>
              <button type="button" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
                <img src={logo} alt="Profile" className="h-full w-full object-cover" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative h-[242px] w-full overflow-hidden">
        <img
          src={safeRestaurant.image}
          alt={safeRestaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F3F1] via-transparent to-transparent" />
        </div>

        <div className="relative -mt-8 px-4 z-20">
          <div className="bg-white rounded-[22px] p-4 shadow-[0_5px_20px_rgba(0,0,0,0.06)] border border-[#E8E3DF]">
          <div className="flex items-center gap-2 mb-2.5">
              <span className="bg-[#FF5A25] text-white text-[10px] leading-none font-bold px-3 py-2 rounded-full uppercase tracking-wide">
              {t('restaurant.topRated', 'Top Rated')}
            </span>
            <span className="text-[#3F3934] text-[13px] leading-[1.2] font-medium truncate max-w-[140px]">
              {cuisineStr}
            </span>
            <div className="ml-auto flex items-center gap-1 bg-[#F2EFEA] px-2.5 py-1 rounded-full">
              <StarIcon className="w-3 h-3 text-[#A78200]" />
              <span className="text-[12px] leading-none font-semibold text-[#1E1A17]">{safeRestaurant.rating} <span className="text-[#77706A] font-normal">{reviewText}</span></span>
            </div>
          </div>
          
          <h1 className="text-[25px] leading-[1.05] tracking-[-0.01em] font-extrabold text-[#13100F] mb-3">
            {safeRestaurant.name}
          </h1>

          <div className="h-[1px] bg-[#E8E3DF] w-full mb-4" />

          <div className="grid grid-cols-2 gap-4 px-4">
            <div className="flex flex-col items-center gap-1">
              <ClockIcon className="w-4 h-4 text-[#FF5A25]" />
              <span className="text-[12px] leading-none font-bold text-[#1E1916]">{deliveryText}</span>
              <span className="text-[10px] leading-none text-[#7D7772] font-medium uppercase tracking-wide">{t('restaurant.delivery', 'Delivery')}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <MapPinIcon className="w-4 h-4 text-[#FF5A25]" />
              <span className="text-[12px] leading-none font-bold text-[#1E1916]">{distanceText}</span>
              <span className="text-[10px] leading-none text-[#7D7772] font-medium uppercase tracking-wide">{t('restaurant.distance', 'Distance')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 max-[388px]:px-1 mb-6">
        <div className="px-2 py-3 rounded-3xl border border-[#E8E3DF] bg-[#FFF9F6] shadow-[0_8px_24px_rgba(17,24,39,0.06)]">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder={t('restaurant.searchInRestaurant', 'Search in this restaurant')}
              className="w-full bg-white border border-[#E7DFD9] rounded-full pl-9 pr-3 py-2 text-[12px] text-[#292524] placeholder:text-[#A8A29E] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/10"
            />
          </div>
        </div>

        {/* Menu Items Render */}
        <div className="mt-6 space-y-6">
          {sectionsToRender.map((section) => (
            <div key={section.name}>
              <div className="flex items-center mb-4">
                <h2 className="text-[25px] leading-[1.05] font-extrabold text-[#111] whitespace-nowrap">{section.name}</h2>
                <div className="h-[1px] bg-[#DDD7D3] flex-1 ml-4" />
              </div>
              
              <div className="flex flex-col gap-3">
                {section.items.map((item, idx) => (
                  <div key={item._id || idx} className="bg-white rounded-[22px] pl-4 py-3 pr-0 flex gap-3 shadow-sm border border-[#E8E3DF] overflow-hidden">
                    <div className="flex-1 py-1 flex flex-col justify-between min-w-0">
                      <div>
                        {item.isVeg && (
                          <div className="flex items-center gap-1.5 text-[#FF5A25] text-[10px] leading-none font-bold mb-1.5 uppercase tracking-tight">
                            <span className="text-sm">🍃</span> {t('restaurant.veganFavorite', 'VEGAN FAVORITE')}
                          </div>
                        )}
                        {(!item.isVeg && item.isVeg !== undefined) && (
                          <div className="flex items-center gap-1.5 text-[#DC2626] text-[10px] leading-none font-bold mb-1.5 uppercase tracking-tight">
                            <span className="text-sm">🍖</span> {t('restaurant.nonVeg', 'NON-VEG')}
                          </div>
                        )}
                        <h3 className="font-extrabold text-[#111] text-[17px] leading-[1.15] mb-1 line-clamp-2">{getLocalizedItemName(item)}</h3>
                        <p className="text-[12px] leading-[1.36] text-[rgba(46,42,37,0.72)] line-clamp-2">{getLocalizedItemDescription(item)}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[#FF5A25] font-extrabold text-[20px] leading-none">₹{Number(item.price).toFixed(2)}</span>
                        {(() => {
                          const cartItem = isCurrentRestaurantCart
                            ? cartItems.find((ci) => getId(ci) === getId(item))
                            : null;
                          const quantity = cartItem?.quantity || 0;

                          if (quantity <= 0) {
                            return (
                              <button
                                className="bg-[#221A17] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black transition-colors mr-4 disabled:opacity-50"
                                onClick={(e) => handleAddToCart(e, item)}
                                type="button"
                                disabled={!isOrderable}
                              >
                                <PlusIcon className="w-4 h-4" />
                              </button>
                            );
                          }

                          return (
                            <div className="mr-4 flex items-center gap-2 rounded-full border border-[#E9DED8] bg-[#FFF8F4] px-1.5 py-1">
                              <button
                                type="button"
                                className="h-7 w-7 rounded-full bg-[#EFE7E2] text-[#221A17] flex items-center justify-center disabled:opacity-50"
                                onClick={(e) => handleQuantityChange(e, getId(item), quantity - 1)}
                                disabled={!isOrderable}
                                aria-label="Decrease quantity"
                              >
                                <MinusIcon className="w-3.5 h-3.5" />
                              </button>
                              <span className="min-w-[18px] text-center text-[13px] font-extrabold text-[#221A17]">{quantity}</span>
                              <button
                                type="button"
                                className="h-7 w-7 rounded-full bg-[#221A17] text-white flex items-center justify-center disabled:opacity-50"
                                onClick={(e) => handleQuantityChange(e, getId(item), quantity + 1)}
                                disabled={!isOrderable}
                                aria-label="Increase quantity"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="w-[92px] h-[112px] flex-shrink-0 rounded-l-[18px] overflow-hidden">
                      <img 
                        src={item.image || 'https://via.placeholder.com/150'} 
                        alt={getLocalizedItemName(item)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Empty state protection */}
        {sectionsToRender.length === 0 && (
           <div className="text-center py-10">
                <p className="text-gray-500 font-medium">{t('restaurant.noItemsSection', 'No items found in this section.')}</p>
           </div>
        )}
      </div>
      </div>

      <button
        type="button"
        onClick={() => setShowFilterPanel(false)}
        className={`fixed inset-0 z-[55] bg-[#2A1E18]/28 backdrop-blur-[1px] transition-opacity duration-200 ${showFilterPanel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-label="Close filter panel overlay"
      />

      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[60] w-[min(84vw,300px)] rounded-[22px] border border-[#E7DED7] bg-gradient-to-b from-[#FFFAF7] to-[#FFF4EE] p-2.5 shadow-[0_20px_44px_rgba(24,24,27,0.22)] transition-all duration-200 ease-out ${showFilterPanel ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-[0.98] pointer-events-none'}`}
        style={{ bottom: floatingPanelBottom }}
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-[#E7D7CD]" />

        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[12px] font-extrabold text-[#2A2522]">{t('restaurant.menuFilters', 'Menu Filters')}</p>
            <p className="text-[9px] text-[#84746B]">{t('restaurant.refineItems', 'Refine items in this restaurant')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowFilterPanel(false)}
            className="h-6.5 w-6.5 rounded-full bg-white border border-[#E7DFD9] flex items-center justify-center text-[#6B645E] shadow-sm"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="p-1 rounded-xl border border-[#E8DED7] bg-white/90 mb-2 flex items-center gap-1">
          {['All', 'Veg', 'Non-Veg'].map((option) => {
            const active = dietFilter === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setDietFilter(option)}
                className="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-colors"
                style={active
                  ? { background: 'linear-gradient(180deg, #FF7043 0%, #EA580C 100%)', color: '#fff' }
                  : { background: 'transparent', color: '#6B625D' }}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="max-h-[30vh] overflow-y-auto pr-1">
          <div className="space-y-0.5">
            {categories.map((category) => {
              const active = selectedCategory === category;
              const count = categoryCountMap[category] || 0;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className="w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-left transition-colors"
                  style={active
                    ? { background: '#1F1A17', color: '#FFF7F2', borderColor: '#1F1A17' }
                    : { background: 'rgba(255,255,255,0.75)', color: '#3F3A37', borderColor: '#ECE3DD' }}
                >
                  <span className="text-[11px] font-semibold leading-none">{category}</span>
                  <span className="text-[10px] font-bold leading-none opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowFilterPanel((prev) => !prev)}
        className="fixed right-4 z-[61] h-9 w-9 rounded-full text-white shadow-[0_10px_24px_rgba(31,24,20,0.34)] flex items-center justify-center"
        style={{ bottom: floatingButtonBottom, background: 'linear-gradient(180deg, #2F2622 0%, #181210 100%)' }}
        aria-label="Open menu filters"
      >
        <AdjustmentsHorizontalIcon className="h-4 w-4" />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] px-1 rounded-full bg-[#FF5A25] text-white text-[8px] font-extrabold flex items-center justify-center border border-[#F5F3F1]">
            {activeFilterCount}
          </span>
        )}
      </button>

      {cartItemCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => dispatch(openCart())}
              className="w-full rounded-full h-[58px] px-2 flex items-center justify-between text-white shadow-[0_12px_30px_rgba(255,90,37,0.28)]"
              style={{ background: 'linear-gradient(90deg, #FF5A25 0%, #F4BFAF 100%)' }}
              type="button"
            >
              <div className="w-[34px] h-[34px] bg-white/25 rounded-full flex items-center justify-center ml-3">
                <span className="font-bold text-sm">{cartItemCount}</span>
              </div>
              
              <div className="flex items-center text-[16px] leading-none">
                <span className="font-extrabold mr-1">{t('restaurant.viewCart', 'View Cart')}</span>
                <span className="font-semibold text-white/85 mr-1">{t('restaurant.total', 'Total')}:</span>
                <span className="font-extrabold">₹{cartTotal.toFixed(2)}</span>
              </div>
              
              <div className="w-[40px] h-[40px] flex items-center justify-center mr-2">
                <ArrowRightIcon className="w-5 h-5 text-white/90" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetail;
