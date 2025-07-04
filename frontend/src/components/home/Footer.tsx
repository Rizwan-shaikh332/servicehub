import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

const Footer = () => {
  return (
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
        </div>
        <p className="text-gray-500 text-sm">© 2024 ServiceHub. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;