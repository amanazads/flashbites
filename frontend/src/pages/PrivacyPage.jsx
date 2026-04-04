import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: March 25, 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="mb-3">
              FlashBites (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;platform&rdquo;) respects your privacy.
            </p>
            <p className="mb-3">
              This Privacy Policy explains how we collect, use, store, and protect your personal data when you use
              our services.
            </p>
            <p>
              By using FlashBites, you agree to this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Platform Role (Important)</h2>
            <p className="mb-3">FlashBites is a technology platform connecting:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Customers</li>
              <li>Restaurant partners</li>
              <li>Delivery partners</li>
            </ul>
            <p className="mt-3">We do not prepare food and only process data required to provide services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 mb-5">
              <li>Name, phone number, email</li>
              <li>Delivery addresses</li>
              <li>Order details</li>
              <li>Payment details (processed via secure gateways)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Automatically Collected Data</h3>
            <ul className="list-disc pl-6 space-y-2 mb-5">
              <li>Device info</li>
              <li>IP address</li>
              <li>App usage</li>
              <li>Location (only when enabled)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Location Data (Important)</h3>
            <p className="mb-2">We collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Real-time location for delivery tracking</li>
            </ul>
            <p className="mt-3 mb-2">Only when:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You enable location</li>
              <li>During active order</li>
            </ul>
            <p className="mt-3">Deleted after delivery completion.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Use Data</h2>
            <p className="mb-2">We use your data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process orders</li>
              <li>Enable delivery</li>
              <li>Provide customer support</li>
              <li>Improve platform</li>
              <li>Prevent fraud</li>
            </ul>
            <p className="mt-3">We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Sharing</h2>
            <p className="mb-3">We only share necessary data:</p>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">With Restaurants</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Order details</li>
              <li>Name</li>
              <li>Delivery address</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-5 mb-2">With Delivery Partners</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Delivery address</li>
              <li>Contact number</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-5 mb-2">With Service Providers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payment gateways</li>
              <li>Hosting providers</li>
              <li>Communication services</li>
            </ul>
            <p className="mt-3">All partners must follow data protection standards.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
            <p className="mb-2">We use:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption</li>
              <li>Secure servers</li>
              <li>Access controls</li>
            </ul>
            <p className="mt-3">However, no system is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="mb-2">We retain data only as needed:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Orders: up to 7 years (legal and tax)</li>
              <li>Account data: until deletion</li>
              <li>Location data: deleted after delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. User Rights</h2>
            <p className="mb-2">You can:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your data</li>
              <li>Update your data</li>
              <li>Request deletion</li>
            </ul>
            <p className="mt-3 font-semibold">Account Deletion:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Processed within 2-4 weeks</li>
              <li>Some data retained for legal compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies</h2>
            <p className="mb-2">We use cookies for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Login sessions</li>
              <li>Preferences</li>
              <li>Analytics</li>
            </ul>
            <p className="mt-3">You can disable cookies via browser settings.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children Policy</h2>
            <p>FlashBites is not for users under 18.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Services</h2>
            <p className="mb-2">We are not responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>External websites</li>
              <li>Third-party platforms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Data Breach Handling</h2>
            <p className="mb-2">In case of data breach:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We will investigate immediately</li>
              <li>Notify affected users if required</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Limitation of Liability</h2>
            <p className="mb-2">FlashBites is not liable for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Indirect damages</li>
              <li>Unauthorized access beyond reasonable control</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Policy</h2>
            <p className="mb-2">We may update this policy.</p>
            <p>Continued use means acceptance.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact</h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2">
              <p><strong className="text-gray-900">FlashBites</strong></p>
              <p><strong>Email:</strong> info.flashbites@gmail.com</p>
            </div>
          </section>
        </div>

        {/* Navigation Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link 
            to="/terms" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View Terms &amp; Conditions →
          </Link>
          <Link 
            to="/" 
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
