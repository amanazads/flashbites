import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

const HelpPage = () => {
  const faqs = [
    {
      q: 'How long does delivery take?',
      a: 'Delivery usually takes 30-45 minutes depending on your location and order volume.',
    },
    {
      q: 'How do I cancel my order?',
      a: 'If your order hasn\'t been accepted by the restaurant yet, you can cancel it from the My Orders page.',
    },
    {
      q: 'Do you offer contactless delivery?',
      a: 'Yes! All deliveries are contactless by default. Our driver will leave your order at your door.',
    },
    {
      q: 'What if my food is missing or incorrect?',
      a: 'Please reach out to our support team immediately with your Order ID, and we will issue a refund or replacement.',
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 container-px">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Help Center & Support</h1>
          <p className="mt-3 text-lg text-gray-500">How can we help you today?</p>
        </div>

        {/* Contact Options */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Email Support</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Get help via email 24/7</p>
            <a href="mailto:support@flashbites.com" className="text-primary-600 font-semibold hover:text-primary-700">support@flashbites.com</a>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <PhoneIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Call Us</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Available 9am to 10pm</p>
            <a href="tel:18001234567" className="text-primary-600 font-semibold hover:text-primary-700">1-800-123-4567</a>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <details key={index} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer">
                  <h3 className="text-base font-semibold text-gray-900 pr-4">{faq.q}</h3>
                  <span className="ml-1.5 flex-shrink-0 bg-gray-50 rounded-full p-1.5 text-gray-400 group-open:bg-primary-50 group-open:text-primary-600 transition-colors">
                    <ChevronDownIcon className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-4 text-sm text-gray-600 leading-relaxed">
                  <p>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="text-center pt-4">
          <Link to="/" className="text-primary-600 font-medium hover:text-primary-700">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
