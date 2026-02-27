import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiTag,
  FiCopy,
  FiCheckCircle,
  FiHelpCircle,
  FiCreditCard,
  FiBriefcase,
  FiInfo,
  FiSearch,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getAvailableCoupons, validateCoupon } from '../api/couponApi';

const Promos = () => {
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [appliedCode, setAppliedCode] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeSlide, setActiveSlide] = useState(0);
  const offerSliderRef = useRef(null);

  const orderValue = 500;

  const fetchCoupons = async () => {
    try {
      const res = await getAvailableCoupons(orderValue);
      setCoupons(res?.data?.coupons || []);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const applyCoupon = async (code) => {
    const coupon = (code || couponCode).trim();
    if (!coupon) {
      toast.error('Enter coupon code');
      return;
    }
    setApplying(true);
    try {
      const res = await validateCoupon(coupon, orderValue);
      const discount = res?.data?.discount || 0;
      setAppliedCode(coupon.toUpperCase());
      toast.success(`Coupon applied! You save ₹${discount}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Invalid coupon');
    } finally {
      setApplying(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy code');
    }
  };

  const filteredCoupons = coupons.filter((coupon, index) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'bank') return index % 2 === 0;
    return index % 2 !== 0;
  });

  const offerSlides = [
    {
      id: 'icici',
      badge: 'ICICI BANK',
      title: '20% Instant Discount',
      subtitle: 'On orders above ₹499',
      cta: 'APPLY NOW',
      icon: <FiCreditCard className="w-5 h-5" />,
      bg: 'bg-[linear-gradient(135deg,#0f1d44,#101629_70%,#302c3f)]',
      ctaClass: 'bg-orange-500 text-white',
    },
    {
      id: 'wallet',
      badge: 'WALLET',
      title: 'Up to ₹150',
      subtitle: 'Using wallet payment',
      cta: 'CLAIM',
      icon: <FiBriefcase className="w-5 h-5" />,
      bg: 'bg-[linear-gradient(135deg,#0ea5e9,#0369a1)]',
      ctaClass: 'bg-white text-sky-700',
    },
    {
      id: 'hdfc',
      badge: 'HDFC BANK',
      title: '15% Cashback',
      subtitle: 'On weekend orders',
      cta: 'ACTIVATE',
      icon: <FiCreditCard className="w-5 h-5" />,
      bg: 'bg-[linear-gradient(135deg,#0f766e,#134e4a)]',
      ctaClass: 'bg-white text-teal-700',
    },
    {
      id: 'upi',
      badge: 'UPI OFFER',
      title: 'Flat ₹100 Off',
      subtitle: 'On first UPI payment',
      cta: 'USE NOW',
      icon: <FiTag className="w-5 h-5" />,
      bg: 'bg-[linear-gradient(135deg,#7c3aed,#4338ca)]',
      ctaClass: 'bg-white text-indigo-700',
    },
  ];

  const handleOfferScroll = () => {
    if (!offerSliderRef.current) return;
    const el = offerSliderRef.current;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveSlide(index);
  };

  return (
    <div className="bg-[#f3f4f6] min-h-screen">
      <div className="max-w-md mx-auto px-4 pt-5 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[20px] font-semibold text-slate-900">Offers & Coupons</h1>
          <button
            onClick={() => navigate('/help')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700"
          >
            <FiHelpCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 rounded-full bg-white border border-slate-200 px-4 h-12 flex items-center gap-3">
          <FiSearch className="w-5 h-5 text-slate-400" />
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Search for offers, banks or restaurants"
            className="flex-1 bg-transparent text-[15px] text-slate-600 placeholder:text-slate-400 outline-none"
          />
        </div>

        <div className="mt-3 rounded-2xl bg-white border border-slate-200 p-3">
          <p className="text-[12px] text-slate-500 mb-2">Have a coupon code?</p>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-[14px] text-slate-700"
            />
            <button
              onClick={() => applyCoupon()}
              disabled={applying}
              className="h-10 px-4 rounded-xl bg-orange-500 text-white text-[13px] font-semibold disabled:opacity-60"
            >
              {applying ? 'Applying' : 'Apply'}
            </button>
          </div>
          {appliedCode && (
            <div className="mt-2 flex items-center gap-1.5 text-green-600 text-[12px]">
              <FiCheckCircle className="w-3.5 h-3.5" />
              <span>{appliedCode} applied</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`h-9 px-5 rounded-full text-[14px] font-medium whitespace-nowrap ${activeTab === 'all' ? 'bg-orange-500 text-white' : 'bg-[#eef2f6] text-slate-700 border border-slate-200'}`}
          >
            All Offers
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`h-9 px-5 rounded-full text-[14px] font-medium whitespace-nowrap ${activeTab === 'bank' ? 'bg-orange-500 text-white' : 'bg-[#eef2f6] text-slate-700 border border-slate-200'}`}
          >
            Bank Offers
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className={`h-9 px-5 rounded-full text-[14px] font-medium whitespace-nowrap ${activeTab === 'food' ? 'bg-orange-500 text-white' : 'bg-[#eef2f6] text-slate-700 border border-slate-200'}`}
          >
            Food Coupons
          </button>
        </div>

        <section className="mt-6">
          <h3 className="text-[26px] font-semibold text-slate-900 flex items-center gap-2">
            <FiCreditCard className="w-5 h-5 text-orange-500" />
            Bank & Wallet Offers
          </h3>
          <div
            ref={offerSliderRef}
            onScroll={handleOfferScroll}
            className="mt-3 flex overflow-x-auto snap-x snap-mandatory pb-1 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {offerSlides.map((slide) => (
              <div key={slide.id} className="w-full min-w-full snap-center pr-2">
                <div className={`rounded-3xl p-4 text-white shadow-md ${slide.bg}`}>
                  <div className="flex items-center justify-between">
                    {slide.icon}
                    <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-semibold">{slide.badge}</span>
                  </div>
                  <h4 className="mt-5 text-[24px] font-semibold leading-tight">{slide.title}</h4>
                  <p className="text-white/80 text-[13px] mt-1">{slide.subtitle}</p>
                  <button className={`mt-3 h-9 px-4 rounded-full text-[12px] font-semibold ${slide.ctaClass}`}>
                    {slide.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {offerSlides.map((slide, idx) => (
              <span
                key={slide.id}
                className={`h-1.5 rounded-full transition-all ${idx === activeSlide ? 'w-5 bg-orange-500' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[26px] font-semibold text-slate-900">Available Coupons</h3>
            <button className="text-orange-500 text-[15px] font-medium">View History</button>
          </div>

          {loading && (
            <div className="rounded-3xl bg-white border border-slate-200 px-4 py-8 text-center text-slate-500">
              Loading coupons...
            </div>
          )}

          {!loading && filteredCoupons.length === 0 && (
            <div className="rounded-3xl bg-white border border-slate-200 px-4 py-8 text-center text-slate-500">
              No coupons available right now
            </div>
          )}

          <div className="space-y-3">
            {filteredCoupons.map((coupon, index) => {
              const isApplied = appliedCode === coupon.code;
              const discountText = coupon.discountType === 'percentage'
                ? `${coupon.discountValue}% OFF`
                : `₹${coupon.discountValue} OFF`;
              const minOrder = coupon.minOrderValue || 149;
              return (
                <div key={coupon._id || coupon.code} className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#fff1ea] border border-orange-100 text-orange-500 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[20px] font-semibold leading-none">
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                        </span>
                        <span className="text-[9px] font-semibold mt-0.5">OFF</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[22px] font-semibold text-slate-900">
                          {coupon.description?.split(' ').slice(0, 2).join(' ') || (index % 2 === 0 ? 'Welcome Offer' : 'Weekend Feast')}
                        </p>
                        <p className="text-[14px] text-slate-500 mt-0.5">{coupon.description || `Get ${discountText} on your order.`}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <button className="h-10 px-4 rounded-full border border-dashed border-slate-300 bg-[#f8fafc] text-slate-800 text-[15px] tracking-[0.15em] font-semibold">
                            {coupon.code}
                          </button>
                          <button
                            onClick={() => copyCode(coupon.code)}
                            className="text-orange-500 text-[14px] font-semibold inline-flex items-center gap-1"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                            COPY
                          </button>
                          <button className="text-slate-400 text-[14px]">T&C Apply</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 h-9 bg-[#fff6f2] border-t border-orange-100 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1 text-[13px] text-slate-600">
                      <FiInfo className="w-3.5 h-3.5 text-orange-500" />
                      Valid on orders above ₹{minOrder}
                    </div>
                    <button
                      onClick={() => applyCoupon(coupon.code)}
                      className={`text-[13px] font-semibold ${isApplied ? 'text-green-600' : 'text-orange-500'}`}
                    >
                      {isApplied ? 'Applied' : 'Apply'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-3xl bg-orange-500 p-4 text-white relative overflow-hidden">
            <h3 className="text-[24px] leading-tight font-semibold">Invite Friends, Get ₹150</h3>
            <p className="mt-2 text-white/90 text-[14px] max-w-[220px]">
              Share your referral code and earn for every new friend.
            </p>
            <button className="mt-3 h-9 px-6 rounded-full bg-white text-orange-500 text-[15px] font-semibold">
              Refer Now
            </button>
            <div className="absolute right-5 bottom-1 text-white/20 text-7xl font-bold">%</div>
          </div>
        </section>
      </div>

    </div>
  );
};

export default Promos;
