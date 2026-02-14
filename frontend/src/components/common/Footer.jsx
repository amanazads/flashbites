import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-100 via-gray-50 to-orange-100 text-gray-700 border-t-2 border-gray-300 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-gray-900 text-xl md:text-2xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 bg-clip-text text-transparent">
              FlashBites
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your favorite food delivered fast. Order from the best restaurants in town with lightning speed! 🍕⚡
            </p>
            <div className="flex gap-4">
              <a 
                href="https://www.linkedin.com/company/flash-bites/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary-600 transition-all duration-300 transform hover:scale-110 bg-white hover:bg-primary-50 p-2 rounded-lg border-2 border-gray-200 hover:border-primary-400 shadow-sm"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/flashbites.shop/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary-600 transition-all duration-300 transform hover:scale-110 bg-white hover:bg-primary-50 p-2 rounded-lg border-2 border-gray-200 hover:border-primary-400 shadow-sm"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-gray-900 font-bold text-lg">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/restaurants" 
                  className="text-gray-600 hover:text-primary-600 transition-all duration-300 flex items-center group"
                >
                  <span className="mr-2 text-primary-600 group-hover:translate-x-1 transition-transform">→</span>
                  Restaurants
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className="text-gray-600 hover:text-primary-600 transition-all duration-300 flex items-center group"
                >
                  <span className="mr-2 text-primary-600 group-hover:translate-x-1 transition-transform">→</span>
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="text-gray-600 hover:text-primary-600 transition-all duration-300 flex items-center group"
                >
                  <span className="mr-2 text-primary-600 group-hover:translate-x-1 transition-transform">→</span>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* For Partners */}
          <div className="space-y-4">
            <h4 className="text-gray-900 font-bold text-lg">For Partners</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/partner" 
                  className="text-gray-600 hover:text-primary-600 transition-all duration-300 flex items-center group"
                >
                  <span className="mr-2 text-primary-600 group-hover:translate-x-1 transition-transform">→</span>
                  Partner with us
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-primary-600 transition-all duration-300 flex items-center group"
                >
                  <span className="mr-2 text-primary-600 group-hover:translate-x-1 transition-transform">→</span>
                  Restaurant Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-gray-900 font-bold text-lg">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/terms" 
                  className="text-gray-600 hover:text-primary-600 transition-all duration-300 flex items-center group"
                >
                  <span className="mr-2 text-primary-600 group-hover:translate-x-1 transition-transform">→</span>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-gray-600 hover:text-primary-600 transition-all duration-300 flex items-center group"
                >
                  <span className="mr-2 text-primary-600 group-hover:translate-x-1 transition-transform">→</span>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t-2 border-gray-200">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} FlashBites. All rights reserved.
            </p>
            {/* <p className="text-xs text-gray-500">
              Made with <span className="text-accent-500 animate-pulse">❤️</span> for food lovers
            </p> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;