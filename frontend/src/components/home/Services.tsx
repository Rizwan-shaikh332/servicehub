import React from 'react';

const Services = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">Available Services</h3>
          <p className="text-xl text-gray-600">Access a wide range of digital solutions tailored for your business</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'App Development',
              icon: '📱',
              description: [
                'Android & iOS native or hybrid apps',
                'User-friendly UI/UX design',
                'Integration with APIs and databases',
                'Push notifications & analytics',
                'Play Store & App Store deployment'
              ]
            },
            {
              title: 'Website Development',
              icon: '💻',
              description: [
                'Responsive and mobile-first design',
                'Static & dynamic website creation',
                'SEO-friendly architecture',
                'E-commerce & blog setups',
                'Domain and hosting setup'
              ]
            },
            {
              title: 'Software Development',
              icon: '🖥️',
              description: [
                'Custom desktop & web-based tools',
                'Database-driven applications',
                'Automation of repetitive tasks',
                'User role & permission systems',
                'Scalable and secure coding'
              ]
            },
            {
              title: 'Technical Support',
              icon: '🛠️',
              description: [
                '24/7 bug fixing and updates',
                'Performance monitoring',
                'Security patching',
                'Backup & recovery setup',
                'Consultation and training'
              ]
            }
          ].map((service, index) => (
            <div
              key={index}
              className="bg-white/70 backdrop-blur-lg rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="text-4xl mb-4 text-center">{service.icon}</div>
              <h4 className="text-lg font-bold text-gray-800 mb-2 text-center">{service.title}</h4>
              <ul className="text-gray-600 text-sm list-disc list-inside space-y-1">
                {service.description.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
