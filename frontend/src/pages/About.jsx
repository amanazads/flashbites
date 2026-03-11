import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import {
  BoltIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const About = () => {
  const valueCards = [
    { title: 'Community First', text: 'We prioritize the needs of rural communities, ensuring our platform serves those who need it most', icon: UserGroupIcon },
    { title: 'Trust & Quality', text: 'We maintain the highest standards of food quality and delivery service, building lasting trust', icon: ShieldCheckIcon },
    { title: 'Inclusive Growth', text: 'We believe in growing together, creating opportunities for local businesses and delivery partners', icon: SparklesIcon },
  ];

  const whyChoose = [
    'Specifically designed for rural and semi-urban areas, addressing unique challenges and opportunities',
    'Empowering local restaurants and businesses to reach more customers and grow their revenue',
    'Quick and reliable delivery service, bringing fresh food to your doorstep in record time',
    'Contactless delivery, secure payments, and quality assurance for every order you place',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="About Us – FlashBites Food Delivery"
        description="Learn about FlashBites – India's fastest growing food delivery app. Founded in Sitapur, UP, we connect rural and semi-urban India with their favourite local restaurants."
        url="/about"
        keywords="about FlashBites, food delivery India, rural food delivery, Sitapur food delivery, FlashBites story"
      />

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto container-px text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">About FlashBites</h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-primary-100 max-w-3xl mx-auto px-2 sm:px-0">
            Bringing the joy of online food delivery to rural and semi-urban India
          </p>
        </div>
      </div>

      {/* Our Story */}
      <div className="max-w-4xl mx-auto container-px py-12 sm:py-16">
        <div className="flex items-center gap-2 mb-4">
          <BoltIcon className="w-5 h-5 text-primary-600" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Our Story</h2>
        </div>
        <div className="space-y-4 text-gray-600 text-base leading-relaxed">
          <p>
            Founded in <span className="font-semibold text-primary-600">2026</span> in{' '}
            <span className="font-semibold text-primary-600">Sitapur, Uttar Pradesh</span>, FlashBites was born from a simple observation: while urban India enjoyed the convenience of food delivery apps, millions in rural and semi-urban areas were left behind.
          </p>
          <p>
            We recognized the untapped potential of local restaurants in smaller towns and villages, and the growing desire among rural communities to access diverse culinary options. FlashBites bridges this gap, connecting local eateries with customers who crave convenience and variety.
          </p>
          <p>
            Today, we're proud to serve communities that have been overlooked by traditional food delivery platforms, empowering local businesses and bringing smiles to countless homes across rural India.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[{ label: 'Founded', value: '2026' }, { label: 'Origin', value: 'Sitapur' }, { label: 'Focus', value: 'Rural India' }].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto container-px">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Our Core Values</h2>
            <p className="text-xl text-gray-500">The principles that guide everything we do</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {valueCards.map(({ title, text, icon: Icon }) => (
              <div key={title} className="bg-gray-50 rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose */}
      <div className="max-w-4xl mx-auto container-px py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">Why Choose FlashBites?</h2>
        <ul className="space-y-3">
          {whyChoose.map((item) => (
            <li key={item} className="flex items-start gap-3 text-gray-600 text-base">
              <CheckCircleIcon className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="bg-gray-100 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto container-px text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Join the FlashBites Revolution</h2>
          <p className="text-xl text-gray-600 mb-8">Whether you're a customer, restaurant owner, or potential delivery partner, we'd love to have you on board</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold text-lg transition-colors">Order Now</Link>
            <Link to="/partner" className="px-8 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 font-semibold text-lg transition-colors">Partner With Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;