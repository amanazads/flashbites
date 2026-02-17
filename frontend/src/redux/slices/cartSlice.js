import { createSlice } from '@reduxjs/toolkit';

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
      
      // If cart is empty or same restaurant, add item
      if (!state.restaurant || state.restaurant._id === restaurant._id) {
        state.restaurant = restaurant;
        const existingItem = state.items.find(i => i._id === item._id);
        
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.items.push({ ...item, quantity: 1 });
        }
      } else {
        // Different restaurant - clear cart and add new item
        state.items = [{ ...item, quantity: 1 }];
        state.restaurant = restaurant;
      }
      
      localStorage.setItem('cart', JSON.stringify(state));
    },
    
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item._id !== action.payload);
      
      if (state.items.length === 0) {
        state.restaurant = null;
      }
      
      localStorage.setItem('cart', JSON.stringify(state));
    },
    
    updateQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(i => i._id === itemId);
      
      if (item) {
        if (quantity > 0) {
          item.quantity = quantity;
        } else {
          state.items = state.items.filter(i => i._id !== itemId);
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
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;