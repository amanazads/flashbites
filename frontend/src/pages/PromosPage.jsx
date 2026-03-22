import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TagIcon,
  ShoppingBagIcon,
  TruckIcon,
  StarIcon,
  GiftIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const BRAND = '#E23744';

/* ── Static coupons list ── */
const COUPONS = [
  {
    id: 1,
    code: 'WELCOME50',
    title: '50% Off – First 3 Orders',
    description: 'Get 50% off on your first 3 orders. Maximum discount ₹100 per order.',
    discount: '50% OFF',
    minOrder: 0,
    maxDiscount: 100,
    type: 'percent',
    tag: 'NEW USER',
    tagColor: '#1BA672',
    tagBg: '#ECFDF5',
    icon: GiftIcon,
    iconColor: '#1BA672',
    iconBg: '#ECFDF5',
    validTill: 'No expiry',
    gradient: 'linear-gradient(135deg, #1BA672 0%, #059669 100%)',
  },
  {
    id: 2,
    code: 'FREEDEL',
    title: 'Free Delivery – Any Order',
    description: 'Zero delivery charges on your order. No location restriction.',
    discount: 'FREE DELIVERY',
    minOrder: 0,
    maxDiscount: 80,
    type: 'delivery',
    tag: 'POPULAR',
    tagColor: '#3B82F6',
    tagBg: '#EFF6FF',
    icon: TruckIcon,
    iconColor: '#3B82F6',
    iconBg: '#EFF6FF',
    validTill: 'No expiry',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  },
  {
    id: 3,
    code: 'FLASH30',
    title: '₹30 Off on Orders ₹299+',
    description: 'Flat ₹30 discount when you order above ₹299. Valid for all users.',
    discount: '₹30 OFF',
    minOrder: 299,
    maxDiscount: 30,
    type: 'flat',
    tag: 'ALL USERS',
    tagColor: BRAND,
    tagBg: '#FEF2F3',
    icon: TagIcon,
    iconColor: BRAND,
    iconBg: '#FEF2F3',
    validTill: 'No expiry',
    gradient: `linear-gradient(135deg, ${BRAND} 0%, #C92535 100%)`,
  },
  {
    id: 4,
    code: 'WEEKENDTREAT',
    title: '20% Off – Weekends Only',
    description: 'Enjoy 20% off every Saturday & Sunday. Max discount ₹80.',
    discount: '20% OFF',
    minOrder: 249,
    maxDiscount: 80,
    type: 'percent',
    tag: 'WEEKEND',
    tagColor: '#8B5CF6',
    tagBg: '#F5F3FF',
    icon: SparklesIcon,
    iconColor: '#8B5CF6',
    iconBg: '#F5F3FF',
    validTill: 'Every weekend',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  },
  {
    id: 5,
    code: 'LUNCHTIME',
    title: '15% Off – Lunch Hours',
    description: '15% off on all orders placed between 12 PM – 3 PM. Max discount ₹60.',
    discount: '15% OFF',
    minOrder: 0,
    maxDiscount: 60,
    type: 'percent',
    tag: '12–3 PM',
    tagColor: '#F59E0B',
    tagBg: '#FFFBEB',
    icon: ClockIcon,
    iconColor: '#F59E0B',
    iconBg: '#FFFBEB',
    validTill: 'Daily 12 PM – 3 PM',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  },
  {
    id: 6,
    code: 'BIGBITE',
    title: '₹50 Off on Orders ₹499+',
    description: 'Flat ₹50 off when you order ₹499 or above. Stack up your cart!',
    discount: '₹50 OFF',
    minOrder: 499,
    maxDiscount: 50,
    type: 'flat',
    tag: 'BIG ORDER',
    tagColor: '#0EA5E9',
    tagBg: '#F0F9FF',
    icon: ShoppingBagIcon,
    iconColor: '#0EA5E9',
    iconBg: '#F0F9FF',
    validTill: 'No expiry',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
  },
];

/* ── Coupon Card ── */
const CouponCard = ({ coupon }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    toast.success(`Copied! Use ${coupon.code} at checkout`);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
    >
      {/* Top strip */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: coupon.gradient }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <coupon.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight">{coupon.title}</p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block"
              style={{ background: 'rgba(255,255,255,0.22)', color: 'white' }}
            >
              {coupon.tag}
            </span>
          </div>
        </div>
        <p className="text-white font-black text-[18px] text-right leading-tight flex-shrink-0 ml-2">
          {coupon.discount}
        </p>
      </div>

      {/* Dashed divider with circles */}
      <div className="relative flex items-center">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-gray-50" style={{ boxShadow: 'inset -2px 0 0 #E5E7EB' }} />
        <div className="flex-1 border-t border-dashed border-gray-200 mx-3" />
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-gray-50" style={{ boxShadow: 'inset 2px 0 0 #E5E7EB' }} />
      </div>

      {/* Bottom details */}
      <div className="px-4 pb-4 pt-3">
        <p className="text-[13px] text-gray-500 mb-3 leading-relaxed">{coupon.description}</p>

        <div className="flex items-center gap-2 text-[12px] text-gray-400 mb-3">
          <span className="font-medium">Min order:</span>
          <span className="font-semibold text-gray-600">₹{coupon.minOrder}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="font-medium">Valid:</span>
          <span className="font-semibold text-gray-600">{coupon.validTill}</span>
        </div>

        {/* Code + Copy button */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{
              background: '#F5F7FA',
              border: `1.5px dashed ${coupon.iconColor}`,
            }}
          >
            <TagIcon className="w-4 h-4 flex-shrink-0" style={{ color: coupon.iconColor }} />
            <span className="font-bold text-[14px] tracking-wider" style={{ color: coupon.iconColor }}>
              {coupon.code}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-95"
            style={{
              background: copied ? '#1BA672' : coupon.gradient,
              boxShadow: `0 4px 12px ${coupon.iconColor}40`,
              minWidth: '90px',
            }}
          >
            {copied ? (
              <><CheckIcon className="w-4 h-4" /> Copied</>
            ) : (
              <><ClipboardDocumentIcon className="w-4 h-4" /> Copy</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const PromosPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s) => s.auth);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <SEO
        title="Offers & Coupons – FlashBites"
        description="Exclusive coupons and discount offers on FlashBites. Save on every order with our latest promo codes."
        url="/promos"
      />

      <div className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto min-h-screen">
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-20 px-4 pt-5 pb-4 bg-white"
          style={{ borderBottom: '1px solid #F0F2F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-[20px] font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                Offers &amp; Coupons
              </h1>
              <p className="text-[12px] text-gray-400">{COUPONS.length} active offers</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#FEF2F3' }}
            >
              <StarIcon className="w-5 h-5" style={{ color: BRAND }} />
            </div>
          </div>
        </div>

        {/* ── Hero banner ── */}
        <div className="px-4 pt-4">
          <div
            className="rounded-2xl p-5 text-white mb-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #3D1A1A 100%)' }}
          >
            {/* bg circle */}
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
              style={{ background: BRAND, transform: 'translate(40%, -40%)' }}
            />
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1">FlashBites Exclusive</p>
            <p className="text-white text-[22px] font-black leading-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
              Save More,<br />Order More
            </p>
            <p className="text-white/50 text-[13px]">Copy any coupon code below and apply at checkout</p>
          </div>
        </div>

        {/* ── Coupon list ── */}
        <div className="px-4 pb-28 space-y-3">
          {!isAuthenticated && (
            <div
              className="p-4 rounded-2xl flex items-center gap-3"
              style={{ background: '#FEF2F3', border: `1.5px solid ${BRAND}22` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: BRAND }}
              >
                <GiftIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900">Log in to apply coupons</p>
                <p className="text-[12px] text-gray-500">Sign in to use these offers at checkout</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto text-[12px] font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                style={{ background: BRAND }}
              >
                Login
              </button>
            </div>
          )}

          {COUPONS.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}

          {/* Footer note */}
          <div className="pt-2 pb-4 text-center">
            <p className="text-[12px] text-gray-400">
              Offers are subject to availability and may change without notice.
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Need help?{' '}
              <a href="mailto:info.flashbites@gmail.com" className="font-semibold" style={{ color: BRAND }}>
                info.flashbites@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromosPage;
