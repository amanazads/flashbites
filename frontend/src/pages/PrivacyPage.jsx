import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPolicy = () => {
  const { t } = useLanguage();

  return (
    <div className="legal-doc-page min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="legal-doc-card max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('legal.privacyPolicy', 'Privacy Policy')}</h1>
        <p className="text-sm text-gray-600 mb-8">{t('legal.lastUpdated', 'Last Updated')}: March 25, 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="mb-3">
              FlashBites ("we", "our", "us", or the "Platform") values and respects the privacy of every user who
              accesses and uses our website, mobile application, and related services.
            </p>
            <p className="mb-3">
              This Privacy Policy explains how we collect, use, store, process, share, and protect your personal
              information when you use FlashBites.
            </p>
            <p className="mb-3">
              By registering on, accessing, browsing, or using FlashBites in any manner, you agree to the collection and
              use of information in accordance with this Privacy Policy.
            </p>
            <p>
              If you do not agree with any part of this Privacy Policy, you should discontinue use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Nature and Role of the Platform</h2>
            <p className="mb-3">
              FlashBites is a technology platform that facilitates food ordering and delivery services by connecting
              customers, restaurant partners, and delivery partners.
            </p>
            <p className="mb-3">
              FlashBites does not prepare, cook, package, manufacture, or sell food items.
            </p>
            <p>
              The Platform processes only such personal information as is necessary for providing services such as order
              placement, delivery coordination, customer support, payment processing, fraud prevention, and service
              improvement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Information You Provide Directly</h3>
            <p className="mb-3">
              When you create an account, place an order, contact support, or use certain features, we may collect
              information directly provided by you, including:
            </p>
            <p className="mb-3">
              your full name, mobile number, email address, delivery addresses, saved locations, order preferences,
              restaurant reviews, feedback, payment-related details, and customer support communications.
            </p>
            <p>
              Where applicable, we may also collect profile details, referral information, and account preferences.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.2 Automatically Collected Information</h3>
            <p className="mb-3">
              When you access or use the Platform, certain technical and usage-related information may be collected
              automatically.
            </p>
            <p>
              This may include your device type, operating system, browser type, app version, IP address, device
              identifiers, network information, app activity, session timestamps, clickstream data, and interaction
              behavior.
            </p>
            <p className="mt-3">
              This information helps us improve performance, troubleshoot issues, enhance security, and understand user
              behavior.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.3 Location Data</h3>
            <p className="mb-3">FlashBites may collect location information to provide delivery-related services.</p>
            <p className="mb-3">
              This may include real-time GPS location, approximate location derived from device settings, and saved
              delivery addresses.
            </p>
            <p className="mb-3">
              Location data is collected only when location access is enabled by you and only when necessary for services
              such as order delivery, restaurant discovery, live tracking, and address validation.
            </p>
            <p className="mb-3">For active orders, real-time location may be used for delivery tracking and ETA calculation.</p>
            <p>
              Such location data may be removed or anonymized after order completion unless retention is required for
              operational or legal reasons.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Use Your Information</h2>
            <p className="mb-3">
              The information collected by FlashBites is used solely for legitimate business and service-related purposes.
            </p>
            <p className="mb-3">
              This includes processing and managing food orders, enabling delivery services, connecting you with
              restaurants and delivery partners, processing payments, providing customer support, resolving disputes,
              improving product features, personalizing user experience, preventing fraud, monitoring suspicious activity,
              and complying with legal obligations.
            </p>
            <p className="mb-3">
              We may also use data for analytics, internal reporting, service optimization, operational planning, and
              marketing communications where permitted by law.
            </p>
            <p>FlashBites does not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Sharing of Information</h2>
            <p className="mb-4">We share only the minimum necessary information required to provide services.</p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 With Restaurant Partners</h3>
            <p className="mb-3">
              When you place an order, relevant information may be shared with the selected restaurant partner.
            </p>
            <p className="mb-3">
              This includes your name, order details, delivery address, contact number, and any instructions necessary
              for order preparation and fulfillment.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.2 With Delivery Partners</h3>
            <p className="mb-3">
              For order delivery, we may share your name, delivery address, contact number, order details, and live
              location information where required for successful delivery.
            </p>
            <p className="mb-3">
              Delivery partners are expected to use this information only for completing the assigned delivery.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.3 With Service Providers</h3>
            <p className="mb-3">
              We may share information with trusted third-party service providers such as payment gateways, cloud hosting
              providers, communication service providers, analytics vendors, and technical infrastructure partners.
            </p>
            <p className="mb-3">
              Such providers are required to follow appropriate confidentiality, security, and data protection obligations.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.4 Legal and Regulatory Requirements</h3>
            <p>
              We may disclose information where required by law, court order, regulatory authority, law enforcement
              agency, or to protect the rights, safety, and security of FlashBites, its users, restaurants, delivery
              partners, and the public.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
            <p className="mb-3">FlashBites uses reasonable administrative, technical, and physical safeguards to protect personal information.</p>
            <p className="mb-3">
              These measures may include secure servers, encrypted communications, restricted access controls, role-based
              permissions, secure payment integrations, and regular security reviews.
            </p>
            <p className="mb-3">
              However, while we strive to use commercially acceptable means to protect your information, no digital
              system can be guaranteed to be completely secure.
            </p>
            <p>Users are advised to protect their own login credentials and device security.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="mb-3">
              We retain information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy
              or as required by applicable law.
            </p>
            <p className="mb-3">
              Order and transaction records may be retained for up to seven years for tax, accounting, legal, and
              dispute-resolution purposes.
            </p>
            <p className="mb-3">Account information may be retained until account deletion or inactivity-based closure.</p>
            <p className="mb-3">
              Location data used for delivery tracking is generally deleted, anonymized, or archived after order
              completion unless operationally required.
            </p>
            <p>
              Certain information may be retained beyond deletion requests where required by law, regulatory obligations,
              fraud prevention, or dispute handling.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. User Rights and Account Controls</h2>
            <p className="mb-3">
              Users have the right to access, review, and update their personal information through the Platform wherever
              available.
            </p>
            <p className="mb-3">
              You may request correction of inaccurate information, request deletion of your account, or contact us
              regarding data-related concerns.
            </p>
            <p className="mb-3">Account deletion requests are generally processed within two to four weeks.</p>
            <p>
              Please note that some information may still be retained for legal compliance, tax requirements, fraud
              prevention, and order history purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies and Similar Technologies</h2>
            <p className="mb-3">
              FlashBites may use cookies, session storage, local storage, and similar technologies to improve user
              experience and platform functionality.
            </p>
            <p className="mb-3">
              These may be used for login sessions, user preferences, analytics, remembering saved settings, and
              improving navigation performance.
            </p>
            <p>
              Users may disable cookies through browser settings; however, certain features of the Platform may not
              function properly as a result.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="mb-3">FlashBites is not intended for individuals below the age of 18 years.</p>
            <p>
              We do not knowingly collect personal information from minors. If we become aware that personal information
              of a minor has been collected without appropriate consent, such information may be removed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Services and External Links</h2>
            <p className="mb-3">
              The Platform may contain links to third-party services, websites, payment processors, and partner applications.
            </p>
            <p className="mb-3">
              FlashBites is not responsible for the privacy practices, content, or security policies of such third-party
              platforms.
            </p>
            <p>Users are encouraged to review their privacy policies separately.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Data Breach and Incident Handling</h2>
            <p className="mb-3">
              In the event of a suspected or confirmed data breach, FlashBites will take prompt and reasonable steps to
              investigate, contain, and mitigate the issue.
            </p>
            <p>
              Where required by law or where risk to users is significant, affected users may be notified through email,
              SMS, app notification, or other reasonable means.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, FlashBites shall not be liable for any indirect, incidental,
              special, consequential, or unauthorized access incidents beyond reasonable control. This includes
              third-party hacking attempts, force majeure events, service provider failures, and events outside our
              reasonable operational control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to This Privacy Policy</h2>
            <p className="mb-3">
              FlashBites reserves the right to update, modify, or revise this Privacy Policy from time to time.
            </p>
            <p className="mb-3">Any changes will be effective upon posting the updated version on the Platform.</p>
            <p>
              Continued use of the Platform after such changes shall constitute acceptance of the revised Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
            <p className="mb-3">For privacy-related concerns, requests, or questions, please contact:</p>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2">
              <p><strong className="text-gray-900">FlashBites</strong></p>
              <p>
                Email:{' '}
                <a href="mailto:info.flashbites@gmail.com" className="text-primary-600 hover:text-primary-700">
                  info.flashbites@gmail.com
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Navigation Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link 
            to="/terms" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('legal.viewTerms', 'View Terms & Conditions')} →
          </Link>
          <Link 
            to="/" 
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            {t('legal.backToHome', 'Back to Home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
