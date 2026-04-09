import React from 'react';
import logo from '../../assets/logo.png';

const SPLASH_FOOD_PANELS = [
  {
    className: 'fb-splash-food fb-splash-food--top',
    image: 'https://images.unsplash.com/photo-1563379091339-03246963d29d?w=960&q=80',
  },
  {
    className: 'fb-splash-food fb-splash-food--left',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=960&q=80',
  },
  {
    className: 'fb-splash-food fb-splash-food--bottom',
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=960&q=80',
  },
];

export const Loader = () => {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="fb-mini-loader">
        <img src={logo} alt="FlashBites loading" className="fb-mini-loader-logo" />
        <p className="fb-mini-loader-text">Loading...</p>
      </div>
    </div>
  );
};

export const FullPageLoader = () => {
  return (
    <div className="fb-splash-screen" role="status" aria-live="polite" aria-busy="true">
      {SPLASH_FOOD_PANELS.map((panel) => (
        <div
          key={panel.className}
          className={panel.className}
          style={{ backgroundImage: `url(${panel.image})` }}
          aria-hidden="true"
        />
      ))}

      <div className="fb-splash-center">
        <div className="fb-splash-logo-card">
          <img src={logo} alt="FlashBites" className="fb-splash-logo" />
        </div>

        <p className="fb-splash-tagline">CULINARY SPEED • CURATED TASTE</p>

        <div className="fb-splash-progress-track" aria-hidden="true">
          <span className="fb-splash-progress-fill" />
        </div>

        <p className="fb-splash-status">PREPARING YOUR MENU</p>
        <p className="fb-splash-powered"> </p>
      </div>
    </div>
  );
};