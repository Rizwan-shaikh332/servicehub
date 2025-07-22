import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import UserLogin from './pages/UserLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import LLRStatusCheck from './pages/LLRStatusCheck';
import DLPdfGenerator from './pages/DLPdfGenerator';
// In your router setup (likely App.tsx or routes.tsx)
import PoliciesPage from './pages/PoliciesPage';
import ContactPage from './pages/ContactPage';

// Add these to your routes:

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/user-login" element={<UserLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/llr-status" element={<LLRStatusCheck />} />
          <Route path="/dl-pdf" element={<DLPdfGenerator />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/contact" element={<ContactPage />} />

        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;