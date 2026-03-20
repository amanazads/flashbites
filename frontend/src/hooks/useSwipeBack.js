import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Custom hook for swipe-right gesture to navigate back
 * Swipe right by 50px+ on non-home pages triggers back navigation
 */
export const useSwipeBack = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Disable custom swipe handler on native apps to avoid conflicting with OS gestures.
    // Android/iOS already provide system back gestures/buttons.
    if (Capacitor.getPlatform() !== 'web') {
      return;
    }

    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const { x: startX, y: startY } = touchStartRef.current;
      if (!startX && !startY) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      const isEdgeSwipe = startX <= 28;
      const isRightSwipe = deltaX > 70;
      const isMostlyHorizontal = Math.abs(deltaY) < 45;

      if (isEdgeSwipe && isRightSwipe && isMostlyHorizontal && location.pathname !== '/') {
        const canGoBack = window.history.length > 1;

        if (canGoBack) {
          navigate(-1);
        } else {
          // Prevent app/webview close when history stack is empty.
          navigate('/', { replace: true });
        }
      }

      touchStartRef.current = { x: 0, y: 0 };
    };

    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);
};
