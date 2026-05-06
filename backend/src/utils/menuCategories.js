const DEFAULT_MENU_CATEGORIES = [
  'Starters',
  'Main Course',
  'Desserts',
  'Beverages',
  'Soups',
  'Breads',
  'Rice',
  'Snacks',
  'Fast Food',
  'Pizza',
  'Burger',
  'South Indian',
  'North Indian',
  'Chinese',
  'Paneer',
  'Cake',
  'Biryani',
  'Veg Meal',
  'Noodles',
  'Sandwich',
  'Dosa',
  'Italian',
  'Momos',
  'Chaap',
  'Fries',
  'Shakes',
  'Coffee'
];

const normalizeMenuCategories = (menuCategories) => {
  const source = Array.isArray(menuCategories) ? menuCategories : DEFAULT_MENU_CATEGORIES;
  const deduped = [];

  source.forEach((raw) => {
    const value = String(raw || '').trim();
    if (!value) return;

    const exists = deduped.some((item) => item.toLowerCase() === value.toLowerCase());
    if (!exists) {
      deduped.push(value);
    }
  });

  return deduped.length > 0 ? deduped : [...DEFAULT_MENU_CATEGORIES];
};

module.exports = {
  DEFAULT_MENU_CATEGORIES,
  normalizeMenuCategories,
};
