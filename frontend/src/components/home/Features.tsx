import React from 'react';
import { Zap, Shield, Award } from 'lucide-react';

const Features = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">Why Choose ServiceHub?</h3>
          <p className="text-xl text-gray-600">Experience the future of digital service delivery</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-4">Lightning Fast</h4>
            <p className="text-gray-600">Process your requests in minutes, not hours. Our optimized system ensures quick turnaround times.</p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-4">Secure & Reliable</h4>
            <p className="text-gray-600">Your data is protected with enterprise-grade security. Trusted by thousands of users.</p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-4">Expert Support</h4>
            <p className="text-gray-600">Get help when you need it. Our support team is available to assist you every step of the way.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;