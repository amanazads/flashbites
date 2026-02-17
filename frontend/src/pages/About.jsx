import React from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingStorefrontIcon,
  TruckIcon,
  UserGroupIcon,
  HeartIcon,
  MapPinIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              About FlashBites
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-orange-100 max-w-3xl mx-auto px-2 sm:px-0">
              Bringing the joy of online food delivery to rural and semi-urban India
            </p>
          </div>
        </div>
      </div>

      {/* Our Story Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-12">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Our Story
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Founded in <span className="font-semibold text-orange-600">2026</span> in 
                  <span className="font-semibold text-orange-600"> Sitapur, Uttar Pradesh</span>, 
                  FlashBites was born from a simple observation: while urban India enjoyed the 
                  convenience of food delivery apps, millions in rural and semi-urban areas 
                  were left behind.
                </p>
                <p>
                  We recognized the untapped potential of local restaurants in smaller towns 
                  and villages, and the growing desire among rural communities to access diverse 
                  culinary options. FlashBites bridges this gap, connecting local eateries with 
                  customers who crave convenience and variety.
                </p>
                <p>
                  Today, we're proud to serve communities that have been overlooked by traditional 
                  food delivery platforms, empowering local businesses and bringing smiles to 
                  countless homes across rural India.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8 sm:p-10">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPinIcon className="h-8 w-8 text-orange-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Born in Sitapur</h3>
                    <p className="text-gray-600 text-sm">Started from the heart of Uttar Pradesh</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <SparklesIcon className="h-8 w-8 text-orange-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Established 2026</h3>
                    <p className="text-gray-600 text-sm">A new era of rural food delivery</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <HeartIcon className="h-8 w-8 text-orange-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Community First</h3>
                    <p className="text-gray-600 text-sm">Serving rural & semi-urban India</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-2xl p-6 sm:p-8">
              <div className="bg-orange-600 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <SparklesIcon className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Our Mission
              </h2>
              <p className="text-gray-600 leading-relaxed">
                To democratize food delivery by making it accessible, affordable, and reliable 
                for every Indian, regardless of their location. We're committed to empowering 
                local restaurants in rural areas and providing employment opportunities for 
                delivery partners in underserved communities.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-2xl p-6 sm:p-8">
              <div className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <HeartIcon className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Our Vision
              </h2>
              <p className="text-gray-600 leading-relaxed">
                To become India's leading food delivery platform for rural and semi-urban areas, 
                creating a thriving ecosystem where local businesses flourish, communities prosper, 
                and everyone can enjoy the convenience of having their favorite meals delivered 
                to their doorstep.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why FlashBites */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Choose FlashBites?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're more than just a food delivery platform—we're a movement to transform 
            rural India's food ecosystem
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPinIcon className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Rural Focus
            </h3>
            <p className="text-gray-600">
              Specifically designed for rural and semi-urban areas, addressing unique challenges 
              and opportunities
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BuildingStorefrontIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Local Support
            </h3>
            <p className="text-gray-600">
              Empowering local restaurants and businesses to reach more customers and grow 
              their revenue
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TruckIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Fast Delivery
            </h3>
            <p className="text-gray-600">
              Quick and reliable delivery service, bringing fresh food to your doorstep in 
              record time
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Secure & Safe
            </h3>
            <p className="text-gray-600">
              Contactless delivery, secure payments, and quality assurance for every order 
              you place
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Our Core Values
          </h2>
          <p className="text-xl text-gray-600">
            The principles that guide everything we do
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeartIcon className="h-10 w-10 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Community First
            </h3>
            <p className="text-gray-600">
              We prioritize the needs of rural communities, ensuring our platform serves 
              those who need it most
            </p>
          </div>

          <div className="text-center">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Trust & Quality
            </h3>
            <p className="text-gray-600">
              We maintain the highest standards of food quality and delivery service, 
              building lasting trust
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserGroupIcon className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Inclusive Growth
            </h3>
            <p className="text-gray-600">
              We believe in growing together, creating opportunities for local businesses 
              and delivery partners
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Join the FlashBites Revolution
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Whether you're a customer, restaurant owner, or potential delivery partner, 
            we'd love to have you on board
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold text-lg transition-colors"
            >
              Order Now
            </Link>
            <Link
              to="/restaurant/dashboard"
              className="px-8 py-3 bg-white text-orange-600 border-2 border-orange-600 rounded-lg hover:bg-orange-50 font-semibold text-lg transition-colors"
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
