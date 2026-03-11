import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const PrivacyPage = () => {
  const navigate = useNavigate();
  const heading = 'text-[21px] font-semibold leading-tight text-orange-500';
  const subheading = 'mt-2 text-[16px] font-semibold text-slate-800';
  const paragraph = 'mt-1.5 text-[15px] leading-6 text-slate-500';
  const list = 'mt-1.5 list-disc pl-5 space-y-1 text-[14px] leading-6 text-slate-500';

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="w-full max-w-md mx-auto min-h-screen">
        <div className="sticky top-0 z-10 bg-[#f3f4f6] border-b border-slate-200 px-4 py-4">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-0 w-9 h-9 rounded-full bg-[#e8edf2] text-slate-700 flex items-center justify-center transition-colors active:bg-slate-200"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[20px] font-semibold text-slate-900">Privacy Policy</h1>
          </div>
          <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">FlashBites Legal</p>
          <p className="mt-1 text-center text-[12px] text-slate-400">Last Updated: January 9, 2026</p>
        </div>

        <div className="px-4 pt-5 pb-8">
          <div className="space-y-4">

            <section>
              <h2 className={heading}>1. Introduction</h2>
              <p className={paragraph}>Welcome to FlashBites. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our food delivery platform.</p>
              <p className={paragraph}>By using our services, you consent to the data practices described in this policy.</p>
            </section>

            <section>
              <h2 className={heading}>2. Information We Collect</h2>
              <h3 className={subheading}>2.1 Information You Provide</h3>
              <ul className={list}>
                <li>Name, email address, phone number, password</li>
                <li>Delivery addresses and location details</li>
                <li>Payment information (processed securely by payment gateways)</li>
                <li>Order history, food preferences, reviews and ratings</li>
              </ul>
              <h3 className={subheading}>2.2 Information Collected Automatically</h3>
              <ul className={list}>
                <li>Device type, model, OS and unique device identifiers</li>
                <li>Precise location data (when location services are enabled)</li>
                <li>Pages visited, search queries, and usage patterns</li>
                <li>Cookies and tracking technologies</li>
              </ul>
              <h3 className={subheading}>2.3 Information from Third Parties</h3>
              <ul className={list}>
                <li>Social media profiles (if you sign in using social login)</li>
                <li>Payment gateway transaction data</li>
                <li>Marketing partners and analytics providers</li>
              </ul>
            </section>

            <section>
              <h2 className={heading}>3. How We Use Your Information</h2>
              <h3 className={subheading}>3.1 To Provide Services</h3>
              <ul className={list}>
                <li>Process and fulfill your food orders</li>
                <li>Track order status and delivery progress</li>
                <li>Provide customer support</li>
                <li>Improve and optimize platform performance</li>
              </ul>
              <h3 className={subheading}>3.2 For Personalization</h3>
              <ul className={list}>
                <li>Recommend restaurants based on your preferences</li>
                <li>Provide personalized offers and discounts</li>
                <li>Remember your favorite orders and addresses</li>
              </ul>
              <h3 className={subheading}>3.3 For Communication</h3>
              <ul className={list}>
                <li>Send order confirmations and status updates</li>
                <li>Notify you about promotional offers and new features</li>
                <li>Send administrative messages and policy updates</li>
              </ul>
              <h3 className={subheading}>3.4 For Safety and Legal Compliance</h3>
              <ul className={list}>
                <li>Verify identity and prevent fraud</li>
                <li>Comply with legal obligations and regulations</li>
                <li>Respond to legal requests and court orders</li>
              </ul>
            </section>

            <section>
              <h2 className={heading}>4. How We Share Your Information</h2>
              <h3 className={subheading}>4.1 With Restaurant Partners</h3>
              <ul className={list}>
                <li>Order details, delivery address, contact number, customer name</li>
              </ul>
              <h3 className={subheading}>4.2 With Delivery Partners</h3>
              <ul className={list}>
                <li>Delivery address, contact number, customer name, order value (for COD)</li>
              </ul>
              <h3 className={subheading}>4.3 With Service Providers</h3>
              <ul className={list}>
                <li>Payment processors (Razorpay, Stripe)</li>
                <li>Cloud hosting, analytics, email/SMS, and marketing partners</li>
              </ul>
              <h3 className={subheading}>4.4 For Legal Reasons</h3>
              <ul className={list}>
                <li>Valid legal requests, court orders, or to protect our rights and safety</li>
              </ul>
            </section>

            <section>
              <h2 className={heading}>5. Data Security</h2>
              <p className={paragraph}>We implement encryption, SSL, access controls, regular audits, and PCI-DSS compliant payment processing to protect your data. However, no method of transmission is 100% secure.</p>
            </section>

            <section>
              <h2 className={heading}>6. Data Retention</h2>
              <ul className={list}>
                <li><strong>Account Info:</strong> Until account deletion</li>
                <li><strong>Order History:</strong> 7 years (legal compliance)</li>
                <li><strong>Communications:</strong> 2 years</li>
                <li><strong>Location Data:</strong> Deleted after delivery completion</li>
              </ul>
            </section>

            <section>
              <h2 className={heading}>7. Your Rights and Choices</h2>
              <ul className={list}>
                <li>Access, update, or download your personal data</li>
                <li>Request deletion of your account</li>
                <li>Opt-out of marketing communications</li>
                <li>Enable or disable location services via device settings</li>
                <li>Manage cookie preferences via browser settings</li>
              </ul>
            </section>

            <section>
              <h2 className={heading}>8. Children's Privacy</h2>
              <p className={paragraph}>FlashBites is not intended for children under 18. We do not knowingly collect personal information from children. Contact us if you believe we have done so.</p>
            </section>

            <section>
              <h2 className={heading}>9. Third-Party Links</h2>
              <p className={paragraph}>Our platform may link to third-party websites. We are not responsible for their privacy practices. Review their policies independently.</p>
            </section>

            <section>
              <h2 className={heading}>10. International Data Transfers</h2>
              <p className={paragraph}>Your information may be transferred to and processed in other countries. We ensure appropriate safeguards are in place.</p>
            </section>

            <section>
              <h2 className={heading}>11. Changes to This Policy</h2>
              <p className={paragraph}>We may update this policy periodically. We will notify you of material changes via email or platform notice. Continued use constitutes acceptance.</p>
            </section>

            <section>
              <h2 className={heading}>12. California Privacy Rights (CCPA)</h2>
              <ul className={list}>
                <li>Right to know, opt-out of sale, and request deletion of personal information</li>
                <li>Right to non-discrimination for exercising CCPA rights</li>
              </ul>
            </section>

            <section>
              <h2 className={heading}>13. European Privacy Rights (GDPR)</h2>
              <ul className={list}>
                <li>Right to access, rectification, erasure, portability, and objection</li>
                <li>Right to withdraw consent and lodge a complaint with a supervisory authority</li>
              </ul>
            </section>

            <section>
              <h2 className={heading}>14. Contact Us</h2>
              <ul className={list}>
                <li><strong>Email:</strong> info.flashbites@gmail.com</li>
                <li><strong>Phone:</strong> +91 7068247779</li>
                <li><strong>Address:</strong> NH24, Ataria, Sitapur, 261303, Uttar Pradesh, India</li>
              </ul>
            </section>

          </div>

          <div className="mt-5 rounded-2xl bg-[#f8f3ef] border border-[#f0e5dd] p-3">
            <p className="text-[13px] font-semibold text-slate-800">Your Consent</p>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              By using FlashBites, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;