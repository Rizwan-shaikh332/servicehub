import React from 'react';

const Services = () => {
  return (
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
  );
};

export default Services;