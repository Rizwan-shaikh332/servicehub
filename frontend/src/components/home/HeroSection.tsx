import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-gray-800 mb-6">
          Your Gateway to 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"> Digital Services</span>
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Access Digital services and more through our secure, user-friendly platform. 
          Fast, reliable, and available 24/7.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link 
            to="/login" 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Pricing Badge with improved styling */}
        <div className="inline-block bg-white border border-gray-200 rounded-full px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl font-bold text-gray-800">
              Our Prices Start From
            </span>
            <span className="text-2xl font-bold text-blue-600">
              ₹6K
            </span>
            <span className="text-gray-500">to</span>
            <span className="text-2xl font-bold text-blue-600">
              ₹10K
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;