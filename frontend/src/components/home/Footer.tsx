// src/components/home/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Mail, Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ... (keep your existing header content) ... */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* ... other footer sections ... */}
          
          <div className="text-center">
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <div className="space-y-2">
              <Link 
                to="/policies" 
                className="text-gray-400 hover:text-white transition-colors flex items-center justify-center"
              >
                <Shield className="w-4 h-4 mr-2" />
                Policies
              </Link>
            </div>
          </div>

          <div className="text-center md:text-right">
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-2">
              <Link 
                to="/contact" 
                className="text-gray-400 hover:text-white transition-colors flex items-center justify-center md:justify-end"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        <p className="text-gray-500 text-sm text-center">© 2024 ServiceHub. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;