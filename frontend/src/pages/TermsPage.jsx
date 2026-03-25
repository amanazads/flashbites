import React from 'react';
import { Link } from 'react-router-dom';

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: March 25, 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="mb-3">
              Welcome to FlashBites.
            </p>
            <p>
              FlashBites is a technology platform that connects users with independent restaurant partners and delivery
              partners for food ordering and delivery services. By using the Platform, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Platform Role (Very Important)</h2>
            <p className="mb-3">FlashBites acts solely as an intermediary platform:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>FlashBites does not prepare, sell, or own food</li>
              <li>Restaurants are solely responsible for food</li>
              <li>Delivery partners are independent contractors</li>
            </ul>
            <p className="mt-3 font-semibold">Contract of sale = Customer and Restaurant.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Eligibility</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Must be 18+</li>
              <li>Must provide accurate details</li>
              <li>Responsible for account security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Account and Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>One account per user</li>
              <li>No sharing accounts</li>
              <li>Platform may suspend misuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Order Process</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Orders are confirmed only after restaurant acceptance</li>
              <li>Prices are set by restaurant</li>
              <li>Platform may charge delivery fee, platform fee, and taxes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payments processed via secure gateways</li>
              <li>You authorize payment at checkout</li>
              <li>COD allowed in selected areas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cancellation and Refund Policy</h2>
            <p className="mb-3 font-semibold">Before acceptance: Full cancellation allowed.</p>
            <p className="mb-4 font-semibold">After acceptance: Cancellation may not be allowed.</p>
            <p className="mb-3">Refund rules:</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-800">Issue</th>
                    <th className="px-4 py-3 font-semibold text-gray-800">Responsibility</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200"><td className="px-4 py-3">Food quality</td><td className="px-4 py-3">Restaurant</td></tr>
                  <tr className="border-t border-gray-200"><td className="px-4 py-3">Missing item</td><td className="px-4 py-3">Restaurant</td></tr>
                  <tr className="border-t border-gray-200"><td className="px-4 py-3">Delivery delay</td><td className="px-4 py-3">Platform</td></tr>
                  <tr className="border-t border-gray-200"><td className="px-4 py-3">Payment issue</td><td className="px-4 py-3">Platform</td></tr>
                  <tr className="border-t border-gray-200"><td className="px-4 py-3">Customer mistake</td><td className="px-4 py-3">No refund</td></tr>
                </tbody>
              </table>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li>Refund timeline: 5-7 working days</li>
              <li>COD refunds: wallet credit</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Delivery Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Delivery time is estimated only</li>
              <li>Delays may occur</li>
              <li>Food issues: Restaurant</li>
              <li>Delivery issues: FlashBites</li>
              <li>External factors: No liability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. User Responsibilities</h2>
            <p className="mb-3">Users must not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Place fake orders</li>
              <li>Abuse refund system</li>
              <li>Misbehave with riders or restaurants</li>
              <li>Use bots or scraping</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Fraud and Misuse</h2>
            <p className="mb-3">FlashBites may block accounts, cancel orders, or deny refunds in cases of:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fake orders</li>
              <li>Repeated cancellations</li>
              <li>Suspicious activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Food Safety Disclaimer</h2>
            <p className="mb-3">Restaurants are solely responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Food quality</li>
              <li>Hygiene</li>
              <li>Ingredients</li>
            </ul>
            <p className="mt-3">FlashBites does not guarantee food quality.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, FlashBites is not liable for indirect damages, business losses,
              or health reactions. Maximum liability is limited to the order value.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Data Protection</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data used only for service</li>
              <li>Not sold to third parties</li>
              <li>Stored as per legal requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Intellectual Property</h2>
            <p>
              All platform content belongs to FlashBites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Termination</h2>
            <p className="mb-3">
              We may suspend accounts for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fraud</li>
              <li>Abuse</li>
              <li>Violations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Dispute Resolution</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>First: customer support</li>
              <li>Then: arbitration</li>
              <li>Law: India</li>
              <li>Seat: Delhi / Chandigarh</li>
              <li>Language: English</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Force Majeure</h2>
            <p className="mb-3">No liability for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Natural disasters</li>
              <li>Strikes</li>
              <li>Government restrictions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Modifications</h2>
            <p>We may update terms anytime.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">19. Contact</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-1"><strong>FlashBites</strong></p>
              <p>Email: info.flashbites@gmail.com</p>
            </div>
          </section>
        </div>

        {/* Navigation Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link 
            to="/privacy" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View Privacy Policy →
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

export default TermsAndConditions;
