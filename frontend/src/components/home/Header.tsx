import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

const Header = () => {
  return (
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
  );
};

export default Header;