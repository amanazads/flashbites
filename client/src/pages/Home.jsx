import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import DiscountBanner from '../components/DiscountBanner';
import RestaurantCard from '../components/RestaurantCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useAppContext } from '../context/AppContext';

const Home = () => {
  const { filteredRestaurants, loading, error } = useAppContext();

  return (
    <div className="min-h-screen pb-24 bg-white">
      <Navbar />
      <SearchBar />
      <CategoryFilter />
      
      <DiscountBanner />

      {/* Restaurants Section */}
      <div className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-orange-500">🍽️</span>
                Nearby Restaurants
              </h2>
              <p className="text-gray-500 text-sm">Delicious food, delivered fast</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-orange-500">
                {filteredRestaurants.length}
              </span>
              <p className="text-xs text-gray-500 font-medium">restaurants</p>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500 text-lg">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No restaurants found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant._id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
