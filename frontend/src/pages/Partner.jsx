import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCoffee,
  FiCheckCircle,
  FiBarChart2,
  FiTrendingUp,
  FiTruck,
  FiClock,
  FiCreditCard,
  FiShield,
  FiUsers,
} from 'react-icons/fi';

const Partner = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-md mx-auto min-h-screen bg-[#f3f4f6] pb-8">

        <div className="h-[300px] border-x border-slate-300 mx-[2px] rounded-b-[28px] bg-[#e3e5ea] overflow-hidden relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-white/85 text-slate-800 flex items-center justify-center shadow-sm"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <img
            src="/partner.jpg"
            alt="Partner illustration"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/30" />
          <div className="absolute left-4 bottom-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-orange-500 drop-shadow-[0_2px_6px_rgba(255,255,255,0.25)]">Ecosystem</p>
            <h2 className="mt-2 text-[52px] leading-[0.92] font-semibold text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
              Elevate Your <span className="text-orange-600">Business</span>
            </h2>
          </div>
        </div>

        <div className="px-4 pt-5">
          <section className="rounded-3xl bg-white border border-slate-200 shadow-[0_8px_22px_rgba(15,23,42,0.08)] p-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#fff0ea] text-orange-500 flex items-center justify-center">
                <FiCoffee className="w-6 h-6" />
              </div>
              <h3 className="text-[24px] leading-tight font-semibold text-slate-900">Restaurant Partner</h3>
            </div>
            <p className="mt-4 text-[16px] leading-7 text-slate-500">
              Scale your kitchen operations with our industry-leading technology suite.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-[15px] text-slate-900">
                <FiCheckCircle className="w-4 h-4 text-orange-500" />
                Zero commission for 30 days
              </div>
              <div className="flex items-center gap-2 text-[15px] text-slate-900">
                <FiBarChart2 className="w-4 h-4 text-orange-500" />
                Direct real-time analytics
              </div>
              <div className="flex items-center gap-2 text-[15px] text-slate-900">
                <FiTrendingUp className="w-4 h-4 text-orange-500" />
                AI-powered growth tools
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full h-14 rounded-2xl bg-orange-500 text-white text-[15px] font-semibold"
            >
              Join as Restaurant
            </button>
          </section>

          <section className="mt-6 rounded-3xl bg-white border border-slate-200 shadow-[0_8px_22px_rgba(15,23,42,0.08)] p-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#fff0ea] text-orange-500 flex items-center justify-center">
                <FiTruck className="w-6 h-6" />
              </div>
              <h3 className="text-[24px] leading-tight font-semibold text-slate-900">Delivery Partner</h3>
            </div>

            <p className="mt-4 text-[16px] leading-7 text-slate-500">
              Be your own boss. Earn on your terms with our global logistics network.
            </p>

            <div className="mt-4 space-y-3">
              <div className="h-14 rounded-2xl bg-[#f4f6f8] px-4 flex items-center justify-between text-[15px] text-slate-900">
                <span>Flexible hours</span>
                <FiClock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="h-14 rounded-2xl bg-[#f4f6f8] px-4 flex items-center justify-between text-[15px] text-slate-900">
                <span>Weekly payouts</span>
                <FiCreditCard className="w-4 h-4 text-orange-500" />
              </div>
              <div className="h-14 rounded-2xl bg-[#f4f6f8] px-4 flex items-center justify-between text-[15px] text-slate-900">
                <span>Insurance coverage</span>
                <FiShield className="w-4 h-4 text-orange-500" />
              </div>
            </div>

            <button
              onClick={() => navigate('/delivery-dashboard')}
              className="mt-6 w-full h-14 rounded-2xl bg-orange-500 text-white text-[15px] font-semibold"
            >
              Become a Courier
            </button>
          </section>

          <section className="mt-6 rounded-3xl bg-white border border-slate-200 shadow-[0_8px_22px_rgba(15,23,42,0.08)] p-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#fff0ea] text-orange-500 flex items-center justify-center">
                <FiUsers className="w-6 h-6" />
              </div>
              <h3 className="text-[24px] leading-tight font-semibold text-slate-900">Career Opportunities</h3>
            </div>

            <p className="mt-4 text-[16px] leading-7 text-slate-500">
              Join our mission to redefine urban logistics and food accessibility.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {['Global Team', 'Equity Options', 'Impactful Work'].map((pill) => (
                <span key={pill} className="h-8 px-3 rounded-full bg-[#eef1f4] text-[12px] text-slate-800 flex items-center">
                  {pill}
                </span>
              ))}
            </div>

            <button
              onClick={() => navigate('/about')}
              className="mt-6 w-full h-14 rounded-2xl bg-orange-500 text-white text-[15px] font-semibold"
            >
              View Open Roles
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Partner;
