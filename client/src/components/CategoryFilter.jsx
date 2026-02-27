import { useAppContext } from '../context/AppContext';

const categories = [
  { name: 'All', icon: '🍽️' },
  { name: 'Pizza', icon: '🍕' },
  { name: 'Burger', icon: '🍔' },
  { name: 'Sushi', icon: '🍣' },
  { name: 'Tacos', icon: '🌮' },
  { name: 'Noodles', icon: '🍜' },
];

const CategoryFilter = () => {
  const { selectedCategory, fetchByCategory } = useAppContext();

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1 uppercase tracking-wide">Categories</h3>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => fetchByCategory(category.name)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm ${
                selectedCategory === category.name
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-base">{category.icon}</span>
              <span className="font-medium">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter;
