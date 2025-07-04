import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-gray-800 mb-6">
          Your Gateway to 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"> Digital Services</span>
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Access government services, document processing, and more through our secure, user-friendly platform. 
          Fast, reliable, and available 24/7.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/login" 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;