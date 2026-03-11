import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import axios from '../api/axios';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await axios.post('/contact', formData);
      toast.success("Thanks for reaching out! We'll get back to you soon.");
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Have a question, feedback, or need support? We're here to help! Fill out the form below and our team will get back to you within 24 hours.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden shadow-soft">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            
            {/* Contact Information Sidebar */}
            <div className="bg-brand-gradient text-white px-8 py-10 sm:px-10 lg:py-16">
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              <p className="text-red-100 mb-10 leading-relaxed">
                Fill up the form and our Team will get back to you within 24 hours.
              </p>
              
              <div className="space-y-8">
                <div className="flex items-start">
                  <PhoneIcon className="h-6 w-6 text-red-200 mt-1" />
                  <div className="ml-4">
                    <p className="text-base font-medium">Phone Support</p>
                    <p className="text-red-100">+91 7068247779</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <EnvelopeIcon className="h-6 w-6 text-red-200 mt-1" />
                  <div className="ml-4">
                    <p className="text-base font-medium">Email Us</p>
                    <p className="text-red-100">info.flashbites@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPinIcon className="h-6 w-6 text-red-200 mt-1" />
                  <div className="ml-4">
                    <p className="text-base font-medium">Headquarters</p>
                    <p className="text-red-100 leading-relaxed">
                      NH24, Ataria<br/>
                      Sitapur, 261303<br/>
                      Uttar Pradesh, India
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="col-span-2 px-8 py-10 sm:px-10 lg:py-16">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                      placeholder="+91 7068247779"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      name="subject"
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select a subject</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Order Support">Order Support</option>
                      <option value="Restaurant Partnership">Restaurant Partnership</option>
                      <option value="Delivery Partnership">Delivery Partnership</option>
                      <option value="Bug Report">App Bug or Issue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    id="message"
                    rows="5"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none"
                    placeholder="How can we help you today?"
                  ></textarea>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full md:w-auto px-8 py-3.5 text-base shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </div>
              </form>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
