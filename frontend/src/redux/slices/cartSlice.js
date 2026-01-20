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
        
        // Generate unique cart ID based on item ID and selected variant
        const cartId = item.selectedVariant 
          ? `${item._id}_${item.selectedVariant}` 
          : item._id;
        
        const existingItem = state.items.find(i => {
          const existingCartId = i.selectedVariant 
            ? `${i._id}_${i.selectedVariant}` 
            : i._id;
          return existingCartId === cartId;
        });
        
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.items.push({ ...item, quantity: 1, cartId });
        }
      } else {
        // Different restaurant - clear cart and add new item
        const cartId = item.selectedVariant 
          ? `${item._id}_${item.selectedVariant}` 
          : item._id;
        state.items = [{ ...item, quantity: 1, cartId }];
        state.restaurant = restaurant;
      }
      
      localStorage.setItem('cart', JSON.stringify(state));
    },
    
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => {
        const itemCartId = item.selectedVariant 
          ? `${item._id}_${item.selectedVariant}` 
          : item._id;
        return itemCartId !== action.payload;
      });
      
      if (state.items.length === 0) {
        state.restaurant = null;
      }
      
      localStorage.setItem('cart', JSON.stringify(state));
    },
    
    updateQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(i => {
        const cartId = i.selectedVariant 
          ? `${i._id}_${i.selectedVariant}` 
          : i._id;
        return cartId === itemId;
      });
      
      if (item) {
        if (quantity > 0) {
          item.quantity = quantity;
        } else {
          state.items = state.items.filter(i => {
            const cartId = i.selectedVariant 
              ? `${i._id}_${i.selectedVariant}` 
              : i._id;
            return cartId !== itemId;
          });
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