// src/pages/PoliciesPage.tsx
import React from 'react';
import { Header, Footer } from '../components/home';

const PoliciesPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-green-800 mb-8">Our Policies</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-green-700 mb-6">Terms and Conditions</h2>
          
          <p className="mb-4">
            Welcome to servicehub.site Please read these Terms and Conditions carefully before using our website or any of our services.
          </p>
          
          <p className="mb-6">
            By accessing or using our Service, you agree to be bound by these Terms. If you do not agree with any part of the Terms, then you may not access the Service.
          </p>

          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-semibold text-green-700 mb-2">1. Use of the Service</h3>
              <p className="mb-2">You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:</p>
              <ul className="list-disc pl-6 space-y-1 mb-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Attempt to interfere with the operation of the Service</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-green-700 mb-2">2. Intellectual Property</h3>
              <p>
                All content included in the Service, such as text, graphics, logos, images, and software, is the property of OMC Organic Tea or its licensors and is protected by intellectual property laws. You may not reproduce, modify, or distribute any content without our prior written permission.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-green-700 mb-2">3. User Accounts</h3>
              <p>
                To access certain features, Login Credentials.the User id and password is given by an admin and You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-green-700 mb-2">4. Termination</h3>
              <p>
                We reserve the right to Block or terminate your access to the Service at our sole discretion, without notice or liability, for conduct that we believe violates these Terms or is harmful to other users or us.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-green-700 mb-2">5. Disclaimer</h3>
              <p>
                The Service is provided on an "as is" and "as available" basis. We do not warrant that the Service will be uninterrupted, error-free, or secure.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-green-700 mb-2">6. Changes to These Terms</h3>
              <p>
                We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page with an updated effective date. Your continued use of the Service after changes are posted constitutes your acceptance of the new Terms.
              </p>
            </section>

            {/* <section>
              <h3 className="text-xl font-semibold text-green-700 mb-2">8. Governing Law</h3>
              <p>
                These Terms shall be governed and construed in accordance with the laws of India.
              </p>
            </section> */}


            <section className="pt-4 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-green-700 mb-2">Return and Refund Policy</h3>
              <p>
                Refund will be provide when service get failed.
              </p>
            </section>
          </div>

          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-semibold text-green-700 mb-4">Privacy Policy</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-1">1. Information Collection</h3>
                <p>
                  We collect only necessary information required to provide our services.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-1">2. Data Usage</h3>
                <p>
                  Your information is used solely for processing your service requests and communicating with you about your applications. We never sell your data to third parties.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-1">3. Data Protection</h3>
                <p>
                  We implement security measures including encryption and access controls to protect your personal information from unauthorized access or disclosure.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-1">4. Information Sharing</h3>
                <p>
                  We can not share data or information to any one.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-1">5. Your Rights</h3>
                <p>
                  You may request access to, correction of, or deletion of your personal data by contacting us at support@servicehub.site.
                </p>
              </div>
            </div>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PoliciesPage;