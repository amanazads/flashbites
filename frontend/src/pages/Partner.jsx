import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  TruckIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
  CameraIcon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { submitPartnerApplication } from '../api/partnerApi';

const Partner = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview'); // overview, delivery, restaurant, career, contact
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    vehicleType: 'bike',
    vehicleNumber: '',
    vehicleModel: '',
    licenseNumber: '',
    aadharNumber: '',
    bankAccount: {
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
  });

  const [documents, setDocuments] = useState({
    photo: null,
    drivingLicense: null,
    aadharCard: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should not exceed 5MB');
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only JPG, PNG, and PDF files are allowed');
        return;
      }

      setDocuments(prev => ({
        ...prev,
        [type]: file,
      }));

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (type === 'photo') setPhotoPreview(reader.result);
          if (type === 'drivingLicense') setLicensePreview(reader.result);
          if (type === 'aadharCard') setAadharPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!documents.photo || !documents.drivingLicense || !documents.aadharCard) {
      toast.error('Please upload all required documents');
      return;
    }

    if (formData.phone.length !== 10 || formData.alternatePhone.length !== 10) {
      toast.error('Phone numbers must be 10 digits');
      return;
    }

    if (formData.aadharNumber.length !== 12) {
      toast.error('Aadhar number must be 12 digits');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Append all text fields
      submitData.append('fullName', formData.fullName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('alternatePhone', formData.alternatePhone);
      submitData.append('dateOfBirth', formData.dateOfBirth);
      submitData.append('address', JSON.stringify(formData.address));
      submitData.append('vehicleType', formData.vehicleType);
      submitData.append('vehicleNumber', formData.vehicleNumber);
      submitData.append('vehicleModel', formData.vehicleModel);
      submitData.append('licenseNumber', formData.licenseNumber);
      submitData.append('aadharNumber', formData.aadharNumber);
      submitData.append('bankAccount', JSON.stringify(formData.bankAccount));
      submitData.append('emergencyContact', JSON.stringify(formData.emergencyContact));
      
      // Append files
      submitData.append('photo', documents.photo);
      submitData.append('drivingLicense', documents.drivingLicense);
      submitData.append('aadharCard', documents.aadharCard);

      await submitPartnerApplication(submitData);
      
      toast.success('Application submitted successfully! We will review and contact you soon.');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Partner With FlashBites</h1>
          <p className="text-xl text-orange-100 max-w-3xl mx-auto mb-8">
            Join us in revolutionizing food delivery in rural and semi-urban India. 
            Whether you're a restaurant owner, delivery partner, or looking for a career, we have opportunities for you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setActiveSection('restaurant')}
              className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
            >
              Restaurant Partner
            </button>
            <button
              onClick={() => setActiveSection('delivery')}
              className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
            >
              Delivery Partner
            </button>
            <button
              onClick={() => setActiveSection('career')}
              className="bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-800 transition-colors"
            >
              Careers
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-12">
            {/* Why Partner With Us */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Partner With Us?</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                FlashBites is committed to empowering local businesses and creating opportunities 
                in underserved markets across India.
              </p>
            </div>

            {/* Partnership Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Restaurant Partner */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <BuildingStorefrontIcon className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Restaurant Partner</h3>
                <p className="text-gray-600 mb-6 text-center">
                  Expand your reach and grow your business by partnering with FlashBites.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Zero commission for first 3 months</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Free onboarding & marketing support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Access to thousands of customers</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Real-time analytics dashboard</span>
                  </li>
                </ul>
                <button
                  onClick={() => setActiveSection('restaurant')}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                  Learn More
                </button>
              </div>

              {/* Delivery Partner */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <TruckIcon className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Delivery Partner</h3>
                <p className="text-gray-600 mb-6 text-center">
                  Earn flexible income by delivering food to customers in your area.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Earn ₹15,000 - ₹30,000/month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Flexible working hours</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Weekly payments</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Fuel & maintenance support</span>
                  </li>
                </ul>
                <button
                  onClick={() => setActiveSection('delivery')}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                  Apply Now
                </button>
              </div>

              {/* Career */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <BriefcaseIcon className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Career Opportunities</h3>
                <p className="text-gray-600 mb-6 text-center">
                  Join our team and help build the future of food delivery in India.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Competitive salary & benefits</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Growth & learning opportunities</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Work-life balance</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Dynamic startup culture</span>
                  </li>
                </ul>
                <button
                  onClick={() => setActiveSection('career')}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                  Explore Jobs
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-4xl font-bold mb-2">500+</div>
                  <div className="text-orange-100">Restaurant Partners</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">50+</div>
                  <div className="text-orange-100">Delivery Partners</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">10,000+</div>
                  <div className="text-orange-100">Happy Customers</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">15+</div>
                  <div className="text-orange-100">Cities</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Partner Section */}
        {activeSection === 'restaurant' && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex items-center mb-6">
                <BuildingStorefrontIcon className="h-12 w-12 text-orange-600 mr-4" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Partner Your Restaurant</h2>
                  <p className="text-gray-600">Grow your business with FlashBites</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Benefits</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Zero Initial Costs</h4>
                        <p className="text-sm text-gray-600">No registration or setup fees. Get started for free.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Marketing Support</h4>
                        <p className="text-sm text-gray-600">Professional food photography and promotional campaigns.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Real-time Dashboard</h4>
                        <p className="text-sm text-gray-600">Track orders, revenue, and analytics in real-time.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Dedicated Support</h4>
                        <p className="text-sm text-gray-600">24/7 customer support for your business needs.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">1</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Register Your Restaurant</h4>
                        <p className="text-sm text-gray-600">Create an account and provide basic details about your restaurant.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">2</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Menu Upload</h4>
                        <p className="text-sm text-gray-600">Upload your menu with photos, descriptions, and prices.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">3</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Admin Approval</h4>
                        <p className="text-sm text-gray-600">Our team reviews and approves your restaurant within 24-48 hours.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">4</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Start Receiving Orders</h4>
                        <p className="text-sm text-gray-600">Your restaurant goes live and you start receiving orders!</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready to Partner?</h3>
                  <p className="text-gray-600 mb-4">
                    Already have an account? Login and create your restaurant profile from the dashboard.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => navigate('/register')}
                      className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                    >
                      Register as Restaurant Owner
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="bg-white text-orange-600 border-2 border-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors font-semibold"
                    >
                      Login to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Partner Section */}
        {activeSection === 'delivery' && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <TruckIcon className="h-8 w-8 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Become a Delivery Partner
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Join FlashBites as a delivery partner and earn flexible income. Fill out the form below to get started.
              </p>
            </div>

            {/* Benefits Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Why Join Us?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-orange-600 font-bold text-2xl mb-1">₹15,000 - ₹30,000</div>
                  <div className="text-sm text-gray-600">Monthly Earnings</div>
                </div>
                <div className="text-center">
                  <div className="text-orange-600 font-bold text-2xl mb-1">Flexible</div>
                  <div className="text-sm text-gray-600">Working Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-orange-600 font-bold text-2xl mb-1">Weekly</div>
                  <div className="text-sm text-gray-600">Payment Cycle</div>
                </div>
              </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-orange-600" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="10-digit mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Alternate contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhar Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{12}"
                  maxLength="12"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="12-digit Aadhar number"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2 text-orange-600" />
              Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="House/Flat number, Street name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{6}"
                  maxLength="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="6-digit PIN code"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TruckIcon className="h-5 w-5 mr-2 text-orange-600" />
              Vehicle Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="bike">Bike/Scooter</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., UP12AB1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Honda Activa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driving License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="DL number"
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-orange-600" />
              Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.accountHolderName"
                  value={formData.bankAccount.accountHolderName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="As per bank records"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.accountNumber"
                  value={formData.bankAccount.accountNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Bank account number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.ifscCode"
                  value={formData.bankAccount.ifscCode}
                  onChange={handleChange}
                  required
                  pattern="[A-Z]{4}0[A-Z0-9]{6}"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., SBIN0001234"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PhoneIcon className="h-5 w-5 mr-2 text-orange-600" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="emergencyContact.name"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="emergencyContact.phone"
                  value={formData.emergencyContact.phone}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="10-digit number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="emergencyContact.relation"
                  value={formData.emergencyContact.relation}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Father, Mother"
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CameraIcon className="h-5 w-5 mr-2 text-orange-600" />
              Upload Documents
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please upload clear images or PDF files (max 5MB each)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Photo <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => {
                          setDocuments(prev => ({ ...prev, photo: null }));
                          setPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <CameraIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <label className="cursor-pointer text-orange-600 hover:text-orange-700">
                        Click to upload
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => handleFileChange(e, 'photo')}
                          className="hidden"
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Driving License */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driving License <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                  {licensePreview ? (
                    <div className="relative">
                      <img src={licensePreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => {
                          setDocuments(prev => ({ ...prev, drivingLicense: null }));
                          setLicensePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <label className="cursor-pointer text-orange-600 hover:text-orange-700">
                        Click to upload
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={(e) => handleFileChange(e, 'drivingLicense')}
                          className="hidden"
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Aadhar Card */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhar Card <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                  {aadharPreview ? (
                    <div className="relative">
                      <img src={aadharPreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => {
                          setDocuments(prev => ({ ...prev, aadharCard: null }));
                          setAadharPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <label className="cursor-pointer text-orange-600 hover:text-orange-700">
                        Click to upload
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={(e) => handleFileChange(e, 'aadharCard')}
                          className="hidden"
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Submit */}
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                By submitting this application, you agree to our terms and conditions. 
                We will verify your documents and contact you within 3-5 business days.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
          </div>
        )}

        {/* Career & Contact Sections */}
        {activeSection === 'career' && (
          <div className="max-w-4xl mx-auto mt-8">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <BriefcaseIcon className="h-12 w-12 text-orange-600 mr-4" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Career Opportunities</h2>
                  <p className="text-gray-600">Join our team and make an impact</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Why Work With Us?</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Impact at Scale</h4>
                        <p className="text-sm text-gray-600">Help transform food delivery in rural and semi-urban India.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Competitive Benefits</h4>
                        <p className="text-sm text-gray-600">Market-leading salary, health insurance, and perks.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Learning & Growth</h4>
                        <p className="text-sm text-gray-600">Continuous learning opportunities and career progression.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Startup Culture</h4>
                        <p className="text-sm text-gray-600">Fast-paced, innovative environment with ownership mindset.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Open Positions</h3>
                  <div className="space-y-4">
                    {/* Position 1 */}
                    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Senior Software Engineer</h4>
                          <p className="text-sm text-gray-600">Engineering • Full-time • Sitapur, UP</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">Open</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Build scalable backend systems and APIs. Work with Node.js, MongoDB, and cloud technologies.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Node.js</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">MongoDB</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">AWS</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">3+ years exp</span>
                      </div>
                      <button
                        onClick={() => setActiveSection('contact')}
                        className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                      >
                        Apply Now →
                      </button>
                    </div>

                    {/* Position 2 */}
                    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Operations Manager</h4>
                          <p className="text-sm text-gray-600">Operations • Full-time • Sitapur, UP</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">Open</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Manage restaurant partnerships, delivery operations, and ensure excellent customer experience.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Operations</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Team Management</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">2+ years exp</span>
                      </div>
                      <button
                        onClick={() => setActiveSection('contact')}
                        className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                      >
                        Apply Now →
                      </button>
                    </div>

                    {/* Position 3 */}
                    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Marketing Manager</h4>
                          <p className="text-sm text-gray-600">Marketing • Full-time • Remote</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">Open</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Lead marketing campaigns, brand building, and customer acquisition strategies.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Digital Marketing</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Brand Strategy</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">2+ years exp</span>
                      </div>
                      <button
                        onClick={() => setActiveSection('contact')}
                        className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                      >
                        Apply Now →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Don't See Your Role?</h3>
                  <p className="text-gray-600 mb-4">
                    We're always looking for talented individuals. Send us your resume and we'll keep you in mind for future opportunities.
                  </p>
                  <button
                    onClick={() => setActiveSection('contact')}
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                  >
                    Send Resume
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Section */}
        {activeSection === 'contact' && (
          <div className="max-w-2xl mx-auto mt-8">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <EnvelopeIcon className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h2>
                <p className="text-gray-600">We'd love to hear from you. Reach out for any partnership inquiries or career opportunities.</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start">
                  <PhoneIcon className="h-6 w-6 text-orange-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <a href="tel:+917068247779" className="text-orange-600 hover:text-orange-700">
                      +91 70682 47779
                    </a>
                    <p className="text-sm text-gray-500 mt-1">Mon-Sat, 9 AM - 6 PM</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <EnvelopeIcon className="h-6 w-6 text-orange-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <div className="space-y-1">
                      <div>
                        <span className="text-sm text-gray-600">Restaurant Partnership: </span>
                        <a href="mailto:restaurants@flashbites.com" className="text-orange-600 hover:text-orange-700">
                          restaurants@flashbites.com
                        </a>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Delivery Partnership: </span>
                        <a href="mailto:delivery@flashbites.com" className="text-orange-600 hover:text-orange-700">
                          delivery@flashbites.com
                        </a>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Careers: </span>
                        <a href="mailto:careers@flashbites.com" className="text-orange-600 hover:text-orange-700">
                          careers@flashbites.com
                        </a>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">General: </span>
                        <a href="mailto:flashbites@gmail.com" className="text-orange-600 hover:text-orange-700">
                          flashbites@gmail.com
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPinIcon className="h-6 w-6 text-orange-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Office</h3>
                    <p className="text-gray-600">
                      FlashBites Headquarters<br />
                      Sitapur, Uttar Pradesh, India<br />
                      PIN: 261001
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveSection('restaurant')}
                    className="flex items-center justify-center px-4 py-3 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-semibold"
                  >
                    <BuildingStorefrontIcon className="h-5 w-5 mr-2" />
                    Restaurant Partner
                  </button>
                  <button
                    onClick={() => setActiveSection('delivery')}
                    className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                  >
                    <TruckIcon className="h-5 w-5 mr-2" />
                    Delivery Partner
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Partner;
