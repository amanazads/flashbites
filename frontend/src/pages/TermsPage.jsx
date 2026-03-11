import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const sections = [
  {
    title: '1. Introduction',
    text: 'Welcome to FlashBites. By accessing or using our mobile application and website, you agree to be bound by these Terms of Service. Please read them carefully before using our services.',
  },
  {
    title: '2. Definitions',
    text: '"Service" refers to the FlashBites platform, including our website and mobile application. "User" refers to any individual or entity that uses our Service. "Merchant" refers to the restaurant or food provider using our platform.',
  },
  {
    title: '3. Account Registration and Use',
    text: 'To use most features of FlashBites, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
  },
  {
    title: '4. Orders and Payments',
    text: 'All orders placed are subject to availability and acceptance by the merchant. Prices include applicable taxes but may exclude delivery fees, which are calculated at checkout.',
  },
  {
    title: '5. Cancellations and Refunds',
    text: 'Once an order is prepared by the merchant, cancellations may not be eligible for a refund. Refund requests are handled on a case-by-case basis in accordance with our refund policy.',
  },
  {
    title: '6. Delivery',
    text: 'Delivery times provided are estimates only. FlashBites and its delivery partners aim to deliver orders within the estimated timeframe but do not guarantee delivery at a specific time.',
  },
  {
    title: '7. User Conduct',
    text: 'You agree not to use FlashBites for any unlawful purpose. Prohibited activities include but are not limited to: fraudulent transactions, harassing delivery partners, or attempting to gain unauthorized access to our systems.',
  },
  {
    title: '8. Intellectual Property Rights',
    text: 'All content on the FlashBites platform, including text, graphics, logos, and software, is the property of FlashBites or its content suppliers and is protected by applicable laws.',
  },
  {
    title: '9. Disclaimers and Limitations of Liability',
    text: 'FlashBites is a marketplace that connects users with independent merchants. We are not responsible for the quality of food prepared by merchants or the conduct of delivery personnel beyond reasonable control.',
  },
  {
    title: '10. Indemnification',
    text: 'You agree to indemnify and hold FlashBites harmless from any claims, losses, or damages resulting from your use of the Service or your violation of these Terms.',
  },
  {
    title: '11. Dispute Resolution',
    text: 'Any disputes arising from these Terms will be resolved through binding arbitration in accordance with the laws of the operating jurisdiction.',
  },
  {
    title: '12. Changes to Terms',
    text: 'We may update these Terms periodically. We will notify you of any significant changes by posting the new Terms on our platform.',
  },
  {
    title: '13. Termination',
    text: 'FlashBites reserves the right to terminate or suspend your account at any time for any reason, including violation of these Terms.',
  },
  {
    title: '14. Contact Information',
    text: 'If you have questions about these Terms, please contact us at legal@flashbites.com.',
  },
  {
    title: '15. Miscellaneous',
    text: 'These Terms constitute the entire agreement between you and FlashBites. If any provision is found to be unenforceable, the remaining provisions will remain in effect.',
  },
  {
    title: '16. Additional Terms for Restaurant Partners',
    text: 'Restaurant partners are subject to additional terms regarding commission rates, service levels, and menu management as outlined in the Merchant Agreement.',
  },
  {
    title: '17. Additional Terms for Delivery Partners',
    text: 'Delivery partners are subject to additional terms regarding safety standards, insurance requirements, and payment schedules as outlined in the Courier Agreement.',
  },
];

const TermsPage = () => {
  const navigate = useNavigate();
  const heading = 'text-[21px] font-semibold leading-tight text-orange-500';
  const paragraph = 'mt-1.5 text-[15px] leading-6 text-slate-500';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: January 9, 2026</p>

        <div className="space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="mb-3">
              Welcome to FlashBites! These Terms and Conditions ("Terms") govern your use of our food delivery platform, 
              including our website, mobile applications, and services (collectively, the "Platform"). By accessing or 
              using FlashBites, you agree to be bound by these Terms.
            </p>
            <p>
              FlashBites is an intermediary platform that connects users with restaurant partners for food ordering and 
              delivery services. We facilitate the connection between customers, restaurants, and delivery partners but 
              do not directly provide food preparation or delivery services.
            </p>
          </section>

          {/* Definitions */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>"User"</strong> means any person who accesses or uses the Platform</li>
              <li><strong>"Customer"</strong> means a User who places an order through the Platform</li>
              <li><strong>"Restaurant Partner"</strong> means food service establishments listed on the Platform</li>
              <li><strong>"Delivery Partner"</strong> means independent contractors who deliver orders</li>
              <li><strong>"Order"</strong> means a request for food items placed through the Platform</li>
              <li><strong>"Services"</strong> means all services provided through the FlashBites Platform</li>
            </ul>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Registration and Use</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">3.1 Account Creation</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 18 years old to create an account</li>
                <li>You must provide accurate, current, and complete information during registration</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">3.2 Account Restrictions</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>One person cannot maintain multiple accounts</li>
                <li>Accounts are non-transferable</li>
                <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
              </ul>
            </div>
          </section>

          {/* Orders and Payments */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Orders and Payments</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">4.1 Placing Orders</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>All orders are subject to acceptance by the Restaurant Partner</li>
                <li>Prices displayed on the Platform are set by Restaurant Partners and may change without notice</li>
                <li>Delivery fees, packaging charges, and taxes are additional to the item prices</li>
                <li>Minimum order values may apply for certain restaurants or delivery areas</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">4.2 Payment</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment must be made at the time of placing the order unless Cash on Delivery is selected</li>
                <li>We accept credit cards, debit cards, UPI, net banking, and digital wallets</li>
                <li>All payments are processed securely through our payment gateway partners</li>
                <li>You authorize us to charge the total amount shown at checkout</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">4.3 Order Confirmation</h3>
              <p>
                Once you place an order, you will receive a confirmation. This confirmation does not signify our 
                acceptance of your order. Your order is accepted only when the Restaurant Partner confirms it. 
                We reserve the right to refuse or cancel orders at any time.
              </p>
            </div>
          </section>

          {/* Cancellations and Refunds */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Cancellations and Refunds</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">5.1 Customer Cancellations</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Orders can be cancelled before restaurant confirmation without charges</li>
                <li>After confirmation, cancellation may attract charges as per our cancellation policy</li>
                <li>Multiple cancellations may result in account restrictions</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">5.2 Restaurant/Platform Cancellations</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Restaurant Partners may cancel orders due to unavailability or operational issues</li>
                <li>We may cancel orders due to payment failures or suspicious activity</li>
                <li>Full refunds will be processed for orders cancelled by restaurants or us</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">5.3 Refund Process</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Refunds are processed to the original payment method within 5-7 business days</li>
                <li>For Cash on Delivery orders, refunds are credited to your FlashBites wallet</li>
                <li>Partial refunds may be issued for missing items or quality issues</li>
              </ul>
            </div>
          </section>

          {/* Delivery */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Delivery</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Estimated delivery times are approximate and not guaranteed</li>
              <li>Delivery may be delayed due to weather, traffic, or other unforeseen circumstances</li>
              <li>You must provide accurate delivery address and contact information</li>
              <li>Someone must be available to receive the order at the delivery address</li>
              <li>Delivery partners are independent contractors, not FlashBites employees</li>
              <li>We are not liable for delays or failures in delivery beyond our control</li>
            </ul>
          </section>

          {/* User Conduct */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. User Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Platform for any unlawful purpose</li>
              <li>Post false, inaccurate, or misleading information</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, or harm restaurant staff or delivery partners</li>
              <li>Interfere with or disrupt the Platform or servers</li>
              <li>Attempt to gain unauthorized access to any part of the Platform</li>
              <li>Use automated systems or software to extract data from the Platform</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property Rights</h2>
            <p className="mb-3">
              All content on the Platform, including but not limited to text, graphics, logos, images, software, 
              and data compilations, is the property of FlashBites or its content suppliers and is protected by 
              copyright, trademark, and other intellectual property laws.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may not reproduce, distribute, or create derivative works without our written permission</li>
              <li>Restaurant Partner trademarks and logos remain their property</li>
              <li>User-generated content (reviews, ratings) grants us a license to use, modify, and display</li>
            </ul>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers and Limitations of Liability</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">9.1 Service Disclaimer</h3>
              <p className="mb-3">
                THE PLATFORM AND SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. 
                WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">9.2 Food Quality and Safety</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>We are not responsible for the quality, safety, or preparation of food items</li>
                <li>Restaurant Partners are solely responsible for food quality and hygiene</li>
                <li>We do not inspect or verify the quality of food prepared by restaurants</li>
                <li>Any food allergies or dietary restrictions should be communicated directly to the restaurant</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">9.3 Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLASHBITES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION. 
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SPECIFIC ORDER GIVING RISE TO THE CLAIM.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless FlashBites, its affiliates, officers, directors, 
              employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including 
              reasonable attorneys' fees) arising out of or related to your use of the Platform, violation of these 
              Terms, or violation of any rights of another party.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Dispute Resolution</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">11.1 Customer Support</h3>
              <p>
                For any issues or disputes, please contact our customer support team first. We are committed to 
                resolving disputes amicably and promptly.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">11.2 Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India, without regard 
                to its conflict of law provisions.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">11.3 Arbitration</h3>
              <p>
                Any disputes arising out of or relating to these Terms shall be resolved through binding arbitration 
                in accordance with the Arbitration and Conciliation Act, 1996.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes via 
              email or through the Platform. Your continued use of the Platform after changes are posted constitutes 
              acceptance of the modified Terms.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
            <p className="mb-3">
              We may terminate or suspend your account and access to the Platform immediately, without prior notice, 
              for any reason, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Breach of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Repeated order cancellations</li>
              <li>Abusive behavior towards staff or delivery partners</li>
              <li>Request by law enforcement or government agencies</li>
            </ul>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
            <p className="mb-2">For questions about these Terms, please contact us:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-1"><strong>FlashBites</strong></p>
              <p className="mb-1">Email: info.flashbites@gmail.com</p>
              <p className="mb-1">Customer Support: info.flashbites@gmail.com</p>
              <p>Phone: +91 7068247779</p>
            </div>
          </section>

          {/* Miscellaneous */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Miscellaneous</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, 
              the remaining provisions will remain in full effect</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right or provision shall not constitute 
              a waiver of such right or provision</li>
              <li><strong>Assignment:</strong> You may not assign or transfer these Terms without our written consent. 
              We may assign our rights without restriction</li>
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and 
              FlashBites regarding the use of the Platform</li>
            </ul>
          </section>

          {/* Restaurant Partners */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Additional Terms for Restaurant Partners</h2>
            <p className="mb-3">Restaurant Partners must also comply with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All applicable food safety and hygiene regulations</li>
              <li>Accurate menu pricing and item descriptions</li>
              <li>Timely order preparation and fulfillment</li>
              <li>Proper packaging to ensure food quality during delivery</li>
              <li>Valid FSSAI license and other required certifications</li>
            </ul>
          </section>

          {/* Delivery Partners */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Additional Terms for Delivery Partners</h2>
            <p className="mb-3">Delivery Partners must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain valid driving licenses and vehicle documents</li>
              <li>Handle food items with care and maintain hygiene standards</li>
              <li>Comply with all traffic laws and safety regulations</li>
              <li>Provide professional and courteous service</li>
              <li>Maintain the confidentiality of customer information</li>
            </ul>
          </section>
        </div>

        <div className="px-4 pt-5 pb-8">
          <div className="space-y-4">
            {sections.map((section) => (
              <section key={section.title}>
                <h3 className={heading}>{section.title}</h3>
                <p className={paragraph}>{section.text}</p>
              </section>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-[#f8f3ef] border border-[#f0e5dd] p-3">
            <p className="text-[12px] leading-5 text-slate-500 text-center">
              By using FlashBites, you acknowledge that you have read and understood these Terms of Service and agree to be bound by them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
