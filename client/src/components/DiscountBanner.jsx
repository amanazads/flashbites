import { IoGiftOutline } from 'react-icons/io5';

const DiscountBanner = () => {
  return (
    <div className="px-4 py-3">
      <div className="max-w-7xl mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl overflow-hidden shadow-xl relative">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, white 3px, transparent 0)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="flex items-stretch relative z-10 min-h-[140px] sm:min-h-[180px]">
          {/* Left Content Section */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="bg-white/95 backdrop-blur-sm p-1.5 sm:p-2.5 rounded-xl shadow-lg">
                <IoGiftOutline className="text-xl sm:text-2xl md:text-3xl text-orange-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white drop-shadow-lg">
                50% OFF
              </h2>
            </div>
            
            <p className="text-white text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1">
              On your first 3 orders
            </p>
            
            <p className="text-orange-50 text-xs sm:text-sm mb-3 sm:mb-5 flex items-center gap-2">
              Use code: 
              <span className="bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg font-bold text-white border border-white/30 text-xs sm:text-sm">
                FLASH50
              </span>
            </p>
            
            <button className="bg-white text-orange-600 px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3.5 rounded-xl text-xs sm:text-sm md:text-base font-bold hover:bg-orange-50 hover:shadow-xl transition-all duration-200 flex items-center gap-2 w-fit group">
              Claim Now
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
          
          {/* Right Image Section - Desktop Only */}
          <div className="hidden md:flex relative w-80 lg:w-96">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-orange-500/20"></div>
            <img 
              src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Delicious food offer"
              className="w-full h-full object-cover"
            />
            
            {/* Limited Time Badge */}
            <div className="absolute top-4 right-4 bg-yellow-400 text-orange-900 px-4 py-2 rounded-full shadow-lg animate-pulse">
              <p className="text-sm font-black flex items-center gap-1">
                ⚡ Limited Time!
              </p>
            </div>
          </div>

          {/* Mobile/Tablet Image - Compact */}
          <div className="md:hidden relative w-24 sm:w-32">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-orange-500/20"></div>
            <img 
              src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Delicious food offer"
              className="w-full h-full object-cover"
            />
            {/* Small Limited Badge for Mobile */}
            <div className="absolute top-2 right-2 bg-yellow-400 text-orange-900 px-2 py-1 rounded-full shadow-md">
              <p className="text-[10px] font-bold">
                ⚡
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountBanner;
