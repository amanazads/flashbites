import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Custom hook for swipe-right gesture to navigate back
 * Swipe right by 50px+ on non-home pages triggers back navigation
 */
export const useSwipeBack = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    const handleTouchStart = (e) => {
      setTouchStart(e.touches[0].clientX);
    };

    const handleTouchEnd = (e) => {
      if (!touchStart) return;
      
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchEnd - touchStart;
      
      // Swipe right by > 50px and not on home page → go back
      if (diff > 50 && location.pathname !== '/') {
        navigate(-1);
      }
      
      setTouchStart(0);
    };

    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, location.pathname, navigate]);
};
