import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Shield, ArrowRight, CheckCircle, Star, Award, Zap } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">ServiceHub</h1>
                <p className="text-gray-600">Digital Service Platform</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Link 
                to="/login" 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                User Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
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

      {/* Features Section */}
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

      {/* Services Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-800 mb-4">Available Services</h3>
            <p className="text-xl text-gray-600">Access a wide range of digital services</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'LLR Exam Booking', icon: '🚗', description: 'Book your Learner\'s License exam online' },
              { title: 'Document Verification', icon: '📄', description: 'Verify your important documents' },
              { title: 'Certificate Services', icon: '🏆', description: 'Apply for various certificates' },
              { title: 'Government Forms', icon: '📝', description: 'Fill and submit government forms' }
            ].map((service, index) => (
              <div key={index} className="bg-white/70 backdrop-blur-lg rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">{service.title}</h4>
                <p className="text-gray-600 text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Happy Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Services Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-blue-100">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold">ServiceHub</h3>
          </div>
          <p className="text-gray-400 mb-6">Making digital services accessible for everyone</p>
          <div className="flex justify-center space-x-6 mb-6">
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors">User Login</Link>
            <Link to="/admin-login" className="text-gray-400 hover:text-white transition-colors">Admin Portal</Link>
          </div>
          <p className="text-gray-500 text-sm">© 2024 ServiceHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;