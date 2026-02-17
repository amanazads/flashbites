import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: January 9, 2026</p>

        <div className="space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="mb-3">
              Welcome to FlashBites. We respect your privacy and are committed to protecting your personal data. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
              use our food delivery platform.
            </p>
            <p className="mb-3">
              This Privacy Policy applies to all users of FlashBites, including customers, restaurant partners, 
              and delivery partners. By using our services, you consent to the data practices described in this policy.
            </p>
            <p>
              Please read this Privacy Policy carefully. If you do not agree with our policies and practices, 
              please do not use our platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">2.1 Information You Provide to Us</h3>
              
              <h4 className="text-lg font-semibold text-gray-800 mt-3">Account Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, phone number</li>
                <li>Password and security credentials</li>
                <li>Date of birth (for age verification)</li>
                <li>Profile picture (optional)</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 mt-3">Delivery Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Delivery addresses (home, work, other)</li>
                <li>Detailed location information (floor, building, landmarks)</li>
                <li>Contact numbers for delivery</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 mt-3">Payment Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Credit/debit card information (processed securely by payment gateways)</li>
                <li>UPI IDs and digital wallet information</li>
                <li>Billing address</li>
                <li>Transaction history</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 mt-3">Order Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Food preferences and dietary restrictions</li>
                <li>Order history and favorites</li>
                <li>Special instructions and delivery notes</li>
                <li>Reviews and ratings</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6">2.2 Information Collected Automatically</h3>
              
              <h4 className="text-lg font-semibold text-gray-800 mt-3">Device Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Device type, model, and operating system</li>
                <li>Unique device identifiers</li>
                <li>Mobile network information</li>
                <li>IP address</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 mt-3">Location Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Precise location data (when you enable location services)</li>
                <li>GPS coordinates for delivery tracking</li>
                <li>Wi-Fi and cell tower information</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 mt-3">Usage Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pages visited and features used</li>
                <li>Search queries and browsing history</li>
                <li>Time spent on the platform</li>
                <li>Click patterns and interactions</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 mt-3">Cookies and Tracking Technologies</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Session cookies for authentication</li>
                <li>Preference cookies to remember your settings</li>
                <li>Analytics cookies to understand user behavior</li>
                <li>Marketing cookies for personalized advertising</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6">2.3 Information from Third Parties</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Social media profiles (if you sign in using social login)</li>
                <li>Payment gateway transaction data</li>
                <li>Marketing partners and analytics providers</li>
                <li>Public databases and identity verification services</li>
              </ul>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 To Provide and Improve Our Services</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process and fulfill your food orders</li>
              <li>Facilitate communication between customers, restaurants, and delivery partners</li>
              <li>Track order status and delivery progress</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve and optimize platform performance</li>
              <li>Develop new features and services</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.2 For Personalization</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Recommend restaurants and dishes based on your preferences</li>
              <li>Customize search results and display relevant content</li>
              <li>Remember your favorite orders and delivery addresses</li>
              <li>Provide personalized offers and discounts</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.3 For Communication</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send order confirmations and status updates</li>
              <li>Notify you about promotional offers and new features</li>
              <li>Request feedback and reviews</li>
              <li>Send administrative messages and policy updates</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.4 For Safety and Security</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Verify identity and prevent fraud</li>
              <li>Detect and prevent unauthorized access</li>
              <li>Monitor for suspicious activity</li>
              <li>Enforce our Terms and Conditions</li>
              <li>Protect the rights and safety of users</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.5 For Analytics and Research</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analyze user behavior and trends</li>
              <li>Measure marketing campaign effectiveness</li>
              <li>Conduct market research</li>
              <li>Generate statistical and analytical reports</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.6 For Legal Compliance</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Comply with legal obligations and regulations</li>
              <li>Respond to legal requests and court orders</li>
              <li>Maintain records for tax and accounting purposes</li>
              <li>Cooperate with law enforcement</li>
            </ul>
          </section>

          {/* How We Share Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Share Your Information</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 With Restaurant Partners</h3>
            <p className="mb-2">We share necessary information with restaurants to fulfill your orders:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Order details (items, quantities, special instructions)</li>
              <li>Delivery address and contact number</li>
              <li>Customer name</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.2 With Delivery Partners</h3>
            <p className="mb-2">We share information needed for successful delivery:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Delivery address and location</li>
              <li>Contact number</li>
              <li>Customer name</li>
              <li>Order value (for cash on delivery)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.3 With Service Providers</h3>
            <p className="mb-2">We work with third-party service providers who perform services on our behalf:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payment processors (Razorpay, Stripe, etc.)</li>
              <li>Cloud hosting providers (AWS, Google Cloud)</li>
              <li>Analytics services (Google Analytics)</li>
              <li>Email and SMS service providers</li>
              <li>Customer support platforms</li>
              <li>Marketing and advertising partners</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.4 For Business Transfers</h3>
            <p>
              If FlashBites is involved in a merger, acquisition, or sale of assets, your information may be 
              transferred as part of that transaction. We will notify you of any such change.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.5 For Legal Reasons</h3>
            <p className="mb-2">We may disclose your information if required to do so by law or in response to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Valid legal requests from government authorities</li>
              <li>Court orders or subpoenas</li>
              <li>Legal proceedings or investigations</li>
              <li>Protection of our rights, property, or safety</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.6 With Your Consent</h3>
            <p>
              We may share your information with other third parties when we have your explicit consent to do so.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="mb-3">
              We implement appropriate technical and organizational measures to protect your personal data against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Security Measures Include:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Secure socket layer (SSL) technology for data transmission</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection practices</li>
              <li>Secure payment processing through PCI-DSS compliant gateways</li>
            </ul>

            <p className="mt-4">
              However, no method of transmission over the internet or electronic storage is 100% secure. While we 
              strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="mb-3">
              We retain your personal data only for as long as necessary to fulfill the purposes outlined in this 
              Privacy Policy, unless a longer retention period is required by law.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Retained until account deletion</li>
              <li><strong>Order History:</strong> Retained for 7 years for tax and legal compliance</li>
              <li><strong>Payment Information:</strong> Card details are tokenized; transaction records kept for 7 years</li>
              <li><strong>Communications:</strong> Retained for customer service purposes for 2 years</li>
              <li><strong>Location Data:</strong> Real-time location data deleted after delivery completion</li>
            </ul>
          </section>

          {/* Your Rights and Choices */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Choices</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Access and Update</h3>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data through your account settings</li>
              <li>Update or correct inaccurate information</li>
              <li>Download a copy of your data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.2 Delete Your Account</h3>
            <p>
              You can request deletion of your account by contacting customer support. We will delete or anonymize 
              your personal data, subject to legal retention requirements.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.3 Opt-Out of Marketing</h3>
            <p className="mb-2">You can opt-out of marketing communications by:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Clicking the "unsubscribe" link in promotional emails</li>
              <li>Adjusting notification settings in your account</li>
              <li>Contacting customer support</li>
            </ul>
            <p className="mt-2 text-sm italic">
              Note: You cannot opt-out of transactional messages related to your orders.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.4 Location Services</h3>
            <p>
              You can enable or disable location services through your device settings. Disabling location services 
              may limit certain features like accurate delivery tracking.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.5 Cookie Preferences</h3>
            <p>
              You can manage cookie preferences through your browser settings. You can delete existing cookies and 
              set your browser to reject new cookies, though this may affect platform functionality.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p>
              FlashBites is not intended for children under 18 years of age. We do not knowingly collect personal 
              information from children. If you believe we have collected information from a child, please contact 
              us immediately, and we will take steps to delete such information.
            </p>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Links and Services</h2>
            <p className="mb-3">
              Our platform may contain links to third-party websites or integrate with third-party services. We are 
              not responsible for the privacy practices of these third parties. We encourage you to review their 
              privacy policies.
            </p>
            <p>
              When you use social login features (Google, Facebook), you are granting those services permission to 
              share certain information with us as per their privacy policies.
            </p>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. 
              These countries may have different data protection laws. We ensure appropriate safeguards are in place 
              to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="mb-3">
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, 
              regulatory, or operational reasons. We will notify you of material changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Posting the updated policy on our platform</li>
              <li>Sending an email notification to registered users</li>
              <li>Displaying a notice on our homepage</li>
            </ul>
            <p className="mt-3">
              Your continued use of FlashBites after the changes take effect constitutes acceptance of the updated 
              Privacy Policy.
            </p>
          </section>

          {/* California Privacy Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. California Privacy Rights (CCPA)</h2>
            <p className="mb-3">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to know whether personal information is sold or disclosed</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to request deletion of personal information</li>
              <li>Right to non-discrimination for exercising CCPA rights</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          {/* GDPR Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. European Privacy Rights (GDPR)</h2>
            <p className="mb-3">
              If you are in the European Economic Area (EEA), you have rights under the General Data Protection 
              Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
            <p className="mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg space-y-3">
              <p><strong className="text-gray-900">FlashBites Privacy Team</strong></p>
              <p><strong>Email:</strong> privacy@flashbites.com</p>
              <p><strong>Customer Support:</strong> support@flashbites.com</p>
              <p><strong>Phone:</strong> +91-XXXX-XXXXXX</p>
              <p><strong>Data Protection Officer:</strong> dpo@flashbites.com</p>
              <p className="pt-2 border-t border-gray-200">
                <strong>Address:</strong><br />
                FlashBites Pvt. Ltd.<br />
                [Company Address]<br />
                India
              </p>
            </div>
          </section>

          {/* Consent */}
          <section className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Consent</h2>
            <p>
              By using FlashBites, you acknowledge that you have read and understood this Privacy Policy and agree 
              to the collection, use, and disclosure of your information as described herein. If you do not agree 
              with this Privacy Policy, please do not use our services.
            </p>
          </section>
        </div>

        {/* Navigation Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link 
            to="/terms" 
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            View Terms &amp; Conditions →
          </Link>
          <Link 
            to="/" 
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
