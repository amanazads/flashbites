import { createSlice } from '@reduxjs/toolkit';

const getId = (value) => {
  if (!value) return null;
  return value._id || value.id || null;
};

const loadCartFromStorage = () => {
  try {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : { items: [], restaurant: null };
  } catch {
    return { items: [], restaurant: null };
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: loadCartFromStorage(),
  reducers: {
    addToCart: (state, action) => {
      const { item, restaurant } = action.payload;
      const nextRestaurantId = getId(restaurant);
      const nextItemId = getId(item);
      
      // If cart is empty or same restaurant, add item
      if (!state.restaurant || getId(state.restaurant) === nextRestaurantId) {
        state.restaurant = restaurant;
        const existingItem = state.items.find((i) => getId(i) === nextItemId);
        
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.items.push({ ...item, quantity: 1 });
        }
      }
      
      localStorage.setItem('cart', JSON.stringify(state));
    },
    
    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => getId(item) !== action.payload);
      
      if (state.items.length === 0) {
        state.restaurant = null;
      }
      
      localStorage.setItem('cart', JSON.stringify(state));
    },
    
    updateQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find((i) => getId(i) === itemId);
      
      if (item) {
        if (quantity > 0) {
          item.quantity = quantity;
        } else {
          state.items = state.items.filter((i) => getId(i) !== itemId);
        }
      }
      
      if (state.items.length === 0) {
        state.restaurant = null;
      }
      
      localStorage.setItem('cart', JSON.stringify(state));
    },
    
    clearCart: (state) => {
      state.items = [];
      state.restaurant = null;
      localStorage.removeItem('cart');
    },
  },
  extraReducers: (builder) => {
    const resetCartState = (state) => {
      state.items = [];
      state.restaurant = null;
      localStorage.removeItem('cart');
    };

    builder
      .addCase('auth/logout', resetCartState)
      // Freshly authenticated sessions should not inherit stale local cart from previous users.
      .addCase('auth/login/fulfilled', resetCartState)
      .addCase('auth/register/fulfilled', resetCartState)
      .addCase('auth/setAuthUser', resetCartState);
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;