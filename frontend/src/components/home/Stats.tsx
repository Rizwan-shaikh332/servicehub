import React from 'react';

const Stats = () => {
  return (
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
  );
};

export default Stats;