import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { BRAND } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="relative overflow-hidden border-t border-gray-200 bg-[#F8FAFC] text-gray-600">
      <div className="pointer-events-none absolute -top-16 -left-20 h-64 w-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,82,59,0.05), transparent 68%)' }} />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,82,59,0.04), transparent 72%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Company Info */}
          <div>
            <div className="inline-flex items-center justify-start mb-4 rounded-xl border border-gray-200 bg-white px-3 py-2 backdrop-blur-sm">
              <img
                src={logo}
                alt="FlashBites"
                className="h-10 w-10 object-contain"
                style={{ filter: 'brightness(1.08) contrast(1.05)' }}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {t('footer.description', 'Your favorite food delivered fast. Order from the best restaurants in town.')}
            </p>
            <div className="flex gap-4">
              <a 
                href="https://www.linkedin.com/company/flash-bites/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[var(--brand)] transition"
                aria-label="LinkedIn"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/flashbites.in/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[var(--brand)] transition"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: BRAND }}>{t('footer.quickLinks', 'Quick Links')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/restaurants" className="hover:text-[var(--brand)] transition">
                  {t('nav.restaurants', 'Restaurants')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[var(--brand)] transition">
                  {t('footer.aboutUs', 'About Us')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[var(--brand)] transition">
                  {t('footer.contact', 'Contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* For Partners */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: BRAND }}>{t('footer.forPartners', 'For Partners')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/partner" className="hover:text-[var(--brand)] transition">
                  {t('footer.partnerWithUs', 'Partner with us')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[var(--brand)] transition">
                  {t('footer.restaurantLogin', 'Restaurant Login')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: BRAND }}>{t('footer.legal', 'Legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="hover:text-[var(--brand)] transition">
                  {t('footer.terms', 'Terms & Conditions')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[var(--brand)] transition">
                  {t('footer.privacy', 'Privacy Policy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} FlashBites. {t('footer.rightsReserved', 'All rights reserved.')} | <a href="https://flashbites.in" className="hover:text-[var(--brand)] transition">flashbites.in</a></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;