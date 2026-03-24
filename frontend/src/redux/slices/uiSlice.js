import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    cartOpen: false,
    mobileMenuOpen: false,
    modalOpen: false,
    selectedDeliveryAddress: null,
  },
  reducers: {
    toggleCart: (state) => {
      state.cartOpen = !state.cartOpen;
    },
    openCart: (state) => {
      state.cartOpen = true;
    },
    closeCart: (state) => {
      state.cartOpen = false;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    openModal: (state) => {
      state.modalOpen = true;
    },
    closeModal: (state) => {
      state.modalOpen = false;
    },
    setSelectedDeliveryAddress: (state, action) => {
      state.selectedDeliveryAddress = action.payload || null;
    },
    clearSelectedDeliveryAddress: (state) => {
      state.selectedDeliveryAddress = null;
    },
  },
});

export const {
  toggleCart,
  openCart,
  closeCart,
  toggleMobileMenu,
  openModal,
  closeModal,
  setSelectedDeliveryAddress,
  clearSelectedDeliveryAddress,
} = uiSlice.actions;
export default uiSlice.reducer;