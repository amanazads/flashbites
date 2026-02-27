import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BoltIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const About = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'about-hide-layout';
    styleEl.textContent = `
      body nav,
      body footer,
      body .cart-drawer,
      [class*="Navbar"],
      [class*="Footer"],
      [class*="CartDrawer"] {
        display: none !important;
      }
      body main {
        padding-bottom: 0 !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      const el = document.getElementById('about-hide-layout');
      if (el) el.remove();
    };
  }, []);

  const valueCards = [
    {
      title: 'Community First',
      text: 'We prioritize the needs of rural communities, ensuring our platform serves those who need it most',
      icon: UserGroupIcon,
    },
    {
      title: 'Trust & Quality',
      text: 'We maintain the highest standards of food quality and delivery service, building lasting trust',
      icon: ShieldCheckIcon,
    },
    {
      title: 'Inclusive Growth',
      text: 'We believe in growing together, creating opportunities for local businesses and delivery partners',
      icon: SparklesIcon,
    },
  ];

  const whyChoose = [
    'Specifically designed for rural and semi-urban areas, addressing unique challenges and opportunities',
    'Empowering local restaurants and businesses to reach more customers and grow their revenue',
    'Quick and reliable delivery service, bringing fresh food to your doorstep in record time',
    'Contactless delivery, secure payments, and quality assurance for every order you place',
  ];

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#F4F5F7] pb-24">
        <header className="sticky top-0 z-20 bg-[#F4F5F7]/95 backdrop-blur-sm border-b border-slate-200 px-4 py-4">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-0 w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-bold text-slate-900">About Us</h1>
          </div>
        </header>

        <main className="px-4 py-5 space-y-6">
          <section className="rounded-3xl bg-white border border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.06)] p-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500 font-semibold mb-2">Our Mission</p>
            <p className="text-[20px] font-semibold text-slate-900 italic leading-tight">
              "To democratize food delivery for every Indian, regardless of location."
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-orange-500" />
              <h3 className="text-[28px] font-bold text-slate-900">Our Story</h3>
            </div>
            <div className="space-y-3 text-[16px] leading-relaxed text-slate-600">
              <p>
                Founded in <span className="font-semibold text-orange-500">2026</span> in{' '}
                <span className="font-semibold text-orange-500">Sitapur, Uttar Pradesh</span>, FlashBites was born from a simple observation: while urban India enjoyed the convenience of food delivery apps, millions in rural and semi-urban areas were left behind.
              </p>
              <p>
                We recognized the untapped potential of local restaurants in smaller towns and villages, and the growing desire among rural communities to access diverse culinary options. FlashBites bridges this gap, connecting local eateries with customers who crave convenience and variety.
              </p>
              <p>
                Today, we're proud to serve communities that have been overlooked by traditional food delivery platforms, empowering local businesses and bringing smiles to countless homes across rural India.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Founded</p>
              <p className="text-sm font-bold text-slate-900 mt-1">2026</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Origin</p>
              <p className="text-sm font-bold text-slate-900 mt-1">Sitapur</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Focus</p>
              <p className="text-sm font-bold text-slate-900 mt-1">Rural India</p>
            </div>
          </section>

          <section>
            <h3 className="text-[28px] font-bold text-slate-900 mb-3">Our Values</h3>
            <div className="space-y-3">
              {valueCards.map(({ title, text, icon: Icon }) => (
                <article key={title} className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-[0_6px_14px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="text-[22px] font-bold text-slate-900">{title}</h4>
                      <p className="text-[15px] text-slate-600 leading-relaxed mt-1">{text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[28px] font-bold text-slate-900 mb-3">Why Choose FlashBites?</h3>
            <ul className="space-y-2.5">
              {whyChoose.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] text-slate-700 leading-relaxed">
                  <CheckCircleIcon className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-gradient-to-br from-[#fff6f1] to-white border border-orange-100 p-5 shadow-sm">
            <h3 className="text-[24px] font-bold text-slate-900 mb-2">Join the FlashBites Revolution</h3>
            <p className="text-[15px] text-slate-600 leading-relaxed mb-4">
              Whether you're a customer, restaurant owner, or potential delivery partner, we'd love to have you on board.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/restaurants"
                className="inline-flex items-center justify-center rounded-2xl bg-orange-500 text-white font-semibold py-3 text-sm shadow-[0_8px_18px_rgba(249,115,22,0.28)]"
              >
                Explore Menu
              </Link>
              <Link
                to="/partner"
                className="inline-flex items-center justify-center rounded-2xl border border-orange-300 text-orange-600 font-semibold py-3 text-sm bg-white"
              >
                Partner With Us
              </Link>
            </div>
          </section>
        </main>

      </div>
    </div>
  );
};

export default About;
