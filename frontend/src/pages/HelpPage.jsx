import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  BuildingOffice2Icon,
  ShoppingBagIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { BRAND } from '../constants/theme';
import logo from '../assets/logo.png';
import { useLanguage } from '../contexts/LanguageContext';
import { getDeliveryAddressLabel } from '../utils/deliveryAddress';

const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Delivery usually takes 30–45 minutes depending on your location and order volume. We strive to deliver every order within 30 minutes.',
  },
  {
    q: 'How do I cancel my order?',
    a: "You can cancel eligible orders directly from the My Orders page. If cancellation is not available, please contact FlashBites support for assistance.",
  },
  {
    q: 'Do you offer contactless delivery?',
    a: 'Yes! All our deliveries are contactless by default. Our delivery partner will leave your order safely at your door.',
  },
  {
    q: 'What if my food is missing or incorrect?',
    a: 'Please contact us immediately at info.flashbites@gmail.com or call +91 7068247779 with your Order ID. We will issue a refund or replacement promptly.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept UPI (PhonePe, Google Pay, Paytm), Credit/Debit Cards, Net Banking, and Cash on Delivery.',
  },
  {
    q: 'How do I apply a coupon?',
    a: 'Go to the Checkout page and enter your coupon code in the "Have a coupon?" field. Valid offers are listed on our Offers & Coupons page.',
  },
  {
    q: 'Can I track my order in real time?',
    a: 'Yes. After placing an order, visit My Orders and tap on your order to see its live status — from confirmed to out-for-delivery.',
  },
  {
    q: 'How do I become a restaurant partner?',
    a: 'Visit our Partner page or email info.flashbites@gmail.com. Our team will get in touch within 24–48 hours.',
  },
  {
    q: 'How can I delete my FlashBites account?',
    a: 'You can submit an account deletion request from your Profile page. Requests are reviewed by our admin team and are generally completed within 2–4 weeks. Direct instant self-deletion is not available.',
  },
];

const FaqItem = ({ faq, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: '#F5F5F5' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <p className="text-[14px] font-semibold text-gray-800 flex-1">{faq.q}</p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={open ? { background: '#FFF7ED' } : { background: '#F5F7FA' }}
        >
          <ChevronDownIcon
            className="w-4 h-4 transition-transform duration-200"
            style={{
              color: open ? BRAND : '#9CA3AF',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-[13px] text-gray-500 leading-relaxed">{faq.a}</p>
        </div>
      )}
    </div>
  );
};

const HelpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const selectedDeliveryAddress = useSelector((s) => s.ui.selectedDeliveryAddress);
  const deliveryAddressLabel = getDeliveryAddressLabel(selectedDeliveryAddress, t('common.currentArea', 'Current Area'));

  const isActiveRoute = (key) => {
    if (key === 'home') return location.pathname === '/';
    if (key === 'search') return location.pathname === '/restaurants' || location.pathname.startsWith('/restaurant/');
    if (key === 'orders') return location.pathname.startsWith('/orders');
    if (key === 'profile') return location.pathname.startsWith('/profile');
    return false;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-0 pb-24">

        <div className="px-4 pt-[max(env(safe-area-inset-top),10px)] -mx-6 max-[388px]:-mx-4 mb-4" style={{ backgroundColor: 'rgb(245, 243, 241)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-[0_8px_18px_rgba(234,88,12,0.32)]"
                aria-label="Go back"
                style={{ background: 'linear-gradient(rgb(255, 122, 69) 0%, rgb(234, 88, 12) 100%)' }}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              <button type="button" className="flex items-center gap-2 text-left">
                <MapPinIcon className="h-4 w-4" style={{ color: 'rgb(234, 88, 12)' }} />
                <div>
                  <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">{t('common.deliverTo', 'Deliver to')}</p>
                  <p className="text-[12px] leading-none font-semibold text-gray-900 truncate">{deliveryAddressLabel}</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
                <img src={logo} alt="Profile" className="h-full w-full object-cover" />
              </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: '#FFF7ED' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" className="w-8 h-8">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-[26px] font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
            {t('help.title', 'Help & Support')}
          </h1>
          <p className="text-[14px] text-gray-400 mt-1">{t('help.subtitle', "We're here to help. Reach us anytime.")}</p>
        </div>

        {/* ── Contact cards ── */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {/* Phone */}
          <a
            href="tel:+917068247779"
            className="bg-white rounded-2xl p-4 flex items-start gap-3 transition-all hover:shadow-md"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF5' }}>
              <PhoneIcon className="w-5 h-5" style={{ color: '#1BA672' }} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">{t('help.callUs', 'Call Us')}</p>
              <p className="text-[13px] font-semibold mt-0.5" style={{ color: BRAND }}>+91 7068247779</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                <ClockIcon className="w-3.5 h-3.5" />
                Mon–Sat, 9 AM – 6 PM
              </div>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:info.flashbites@gmail.com"
            className="bg-white rounded-2xl p-4 flex items-start gap-3 transition-all hover:shadow-md"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7ED' }}>
              <EnvelopeIcon className="w-5 h-5" style={{ color: BRAND }} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">{t('help.emailSupport', 'Email Support')}</p>
              <p className="text-[13px] font-semibold mt-0.5 break-all" style={{ color: BRAND }}>
                info.flashbites@gmail.com
              </p>
              <p className="text-[11px] text-gray-400 mt-1">{t('help.generalCareersPartnership', 'General, Careers, Partnerships')}</p>
            </div>
          </a>
        </div>

        {/* ── Contact types ── */}
        <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{t('help.contactByTopic', 'Contact by Topic')}</p>
          </div>
          {[
            { label: t('help.restaurantPartnership', 'Restaurant Partnership'), email: 'info.flashbites@gmail.com' },
            { label: t('help.deliveryPartnership', 'Delivery Partnership'), email: 'info.flashbites@gmail.com' },
            { label: t('help.careers', 'Careers'), email: 'info.flashbites@gmail.com' },
            { label: t('help.generalEnquiries', 'General Enquiries'), email: 'info.flashbites@gmail.com' },
          ].map((row, i, arr) => (
            <a
              key={row.label}
              href={`mailto:${row.email}`}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid #F5F5F5' : 'none' }}
            >
              <p className="text-[14px] font-semibold text-gray-800">{row.label}</p>
              <p className="text-[12px]" style={{ color: BRAND }}>{row.email}</p>
            </a>
          ))}
        </div>

        {/* ── Office ── */}
        <div className="bg-white rounded-2xl p-4 mb-6 flex items-start gap-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
            <BuildingOffice2Icon className="w-5 h-5" style={{ color: '#3B82F6' }} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-900">{t('help.headquarters', 'FlashBites Headquarters')}</p>
            <p className="text-[13px] text-gray-500 mt-0.5">NH24, Ataria, Sitapur, 261303, Uttar Pradesh, India</p>
          </div>
        </div>

        {/* ── FAQs ── */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
            {t('help.faq', 'Frequently Asked Questions')}
          </p>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            {faqs.map((faq, i) => (
              <FaqItem key={i} faq={faq} index={i} />
            ))}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-[13px] font-semibold" style={{ color: BRAND }}>
            ← {t('help.backToHome', 'Back to Home')}
          </Link>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#E6E2DE] bg-[#F5F3F1]" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto px-6 pt-2 flex items-center justify-between text-[#B0ACA8]">
          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/"
            style={isActiveRoute('home') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <HomeIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('common.home', 'Home')}</span>
          </Link>

          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/restaurants"
            style={isActiveRoute('search') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('common.search', 'Search')}</span>
          </Link>

          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/orders"
            style={isActiveRoute('orders') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <ShoppingBagIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('nav.orders', 'Orders')}</span>
          </Link>

          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/profile"
            style={isActiveRoute('profile') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <UserIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('common.profile', 'Profile')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
