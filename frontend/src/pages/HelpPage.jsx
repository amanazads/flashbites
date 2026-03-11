import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDownIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

const BRAND = '#E23744';

const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Delivery usually takes 30–45 minutes depending on your location and order volume. We strive to deliver every order within 30 minutes.',
  },
  {
    q: 'How do I cancel my order?',
    a: "If your order hasn't been accepted by the restaurant yet, you can cancel it directly from the My Orders page. Once the restaurant starts preparing, cancellation may not be possible.",
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
          style={open ? { background: '#FEF2F3' } : { background: '#F5F7FA' }}
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
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: '#FEF2F3' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" className="w-8 h-8">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-[26px] font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
            Help &amp; Support
          </h1>
          <p className="text-[14px] text-gray-400 mt-1">We're here to help. Reach us anytime.</p>
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
              <p className="text-[13px] font-bold text-gray-900">Call Us</p>
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
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF2F3' }}>
              <EnvelopeIcon className="w-5 h-5" style={{ color: BRAND }} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">Email Support</p>
              <p className="text-[13px] font-semibold mt-0.5 break-all" style={{ color: BRAND }}>
                info.flashbites@gmail.com
              </p>
              <p className="text-[11px] text-gray-400 mt-1">General, Careers, Partnerships</p>
            </div>
          </a>
        </div>

        {/* ── Contact types ── */}
        <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Contact by Topic</p>
          </div>
          {[
            { label: 'Restaurant Partnership', email: 'info.flashbites@gmail.com' },
            { label: 'Delivery Partnership', email: 'info.flashbites@gmail.com' },
            { label: 'Careers', email: 'info.flashbites@gmail.com' },
            { label: 'General Enquiries', email: 'info.flashbites@gmail.com' },
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
            <p className="text-[13px] font-bold text-gray-900">FlashBites Headquarters</p>
            <p className="text-[13px] text-gray-500 mt-0.5">NH24, Ataria, Sitapur, 261303, Uttar Pradesh, India</p>
          </div>
        </div>

        {/* ── FAQs ── */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
            Frequently Asked Questions
          </p>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            {faqs.map((faq, i) => (
              <FaqItem key={i} faq={faq} index={i} />
            ))}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-[13px] font-semibold" style={{ color: BRAND }}>
            ← Back to Home
          </Link>
        </div>
      </div>

    </div>
  );
};

export default HelpPage;
