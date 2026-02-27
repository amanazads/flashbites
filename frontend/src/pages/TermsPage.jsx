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
            <h1 className="text-[20px] font-semibold text-slate-900">Terms of Service</h1>
          </div>
          <div className="mt-2 text-center text-[11px]">
            <span className="font-semibold uppercase tracking-[0.12em] text-orange-500">FlashBites Legal</span>
          </div>
          <p className="mt-1 text-center text-[12px] text-slate-400">Last Updated: January 9, 2026</p>
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
