import React from 'react';
import { Link } from 'react-router-dom';

const TermsAndConditions = () => {
  return (
    <div className="legal-doc-page min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="legal-doc-card max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: March 25, 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="mb-3">Welcome to FlashBites.</p>
            <p className="mb-3">
              These Terms and Conditions ("Terms") govern your access to and use of the FlashBites website, mobile
              application, and related services (collectively, the "Platform"). By accessing, browsing, registering on,
              or using FlashBites in any manner, you agree to be legally bound by these Terms.
            </p>
            <p className="mb-3">
              FlashBites is a technology-based platform that facilitates online food ordering and delivery by connecting
              customers with independent restaurant partners and delivery partners. Please read these Terms carefully
              before using the Platform.
            </p>
            <p>If you do not agree with any part of these Terms, you should discontinue use of the Platform immediately.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Nature and Role of the Platform</h2>
            <p className="mb-3">
              FlashBites acts solely as an intermediary technology platform that enables users to discover restaurants,
              browse menus, place orders, make payments, and track deliveries.
            </p>
            <p className="mb-3">
              FlashBites does not prepare, manufacture, cook, package, sell, or own any food items listed on the Platform.
              All food products, menu descriptions, ingredients, pricing, availability, and food preparation are solely
              managed and controlled by the respective restaurant partners.
            </p>
            <p className="mb-3">
              The contract of sale for any food order placed through the Platform exists directly between the customer and
              the restaurant partner. FlashBites only facilitates communication, order placement, payment collection, and
              delivery support.
            </p>
            <p>
              Delivery services, where applicable, may be provided through independent delivery partners engaged as
              contractors and not employees of FlashBites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Eligibility</h2>
            <p className="mb-3">
              To use FlashBites, you must be at least 18 years of age or have the consent and supervision of a legal guardian.
            </p>
            <p className="mb-3">
              By registering or placing an order through the Platform, you confirm that all information provided by you,
              including your name, phone number, address, payment details, and other account-related information, is
              accurate, complete, and up to date.
            </p>
            <p>
              You are solely responsible for maintaining the confidentiality and security of your account credentials,
              including OTP-based login access and any linked payment methods.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Account Registration and Security</h2>
            <p className="mb-3">Users may be required to create an account in order to access certain features of the Platform.</p>
            <p className="mb-3">Each user is permitted to maintain only one active account unless otherwise approved by FlashBites.</p>
            <p className="mb-3">You must not share your account credentials, OTP, login details, or access rights with any third party.</p>
            <p className="mb-3">
              You agree to notify FlashBites immediately in the event of any unauthorized use of your account, suspicious
              login activity, or security breach.
            </p>
            <p>
              FlashBites reserves the right to suspend, restrict, or terminate accounts found to be involved in fraud,
              misuse, abuse, multiple fake registrations, or activities that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Order Placement and Acceptance</h2>
            <p className="mb-3">
              All orders placed through FlashBites are subject to acceptance and confirmation by the respective restaurant
              partner.
            </p>
            <p className="mb-3">An order shall be deemed confirmed only after the restaurant partner accepts the order through the Platform.</p>
            <p className="mb-3">
              Restaurant partners are solely responsible for menu availability, pricing accuracy, item descriptions,
              ingredients, portion sizes, and preparation timelines.
            </p>
            <p className="mb-3">
              FlashBites may charge additional fees including, but not limited to, delivery charges, platform fees,
              convenience fees, packaging fees, surge fees, and applicable taxes.
            </p>
            <p>
              In case of item unavailability, restaurant closure, operational issues, or technical failure, orders may be
              cancelled by the restaurant or the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payment Terms</h2>
            <p className="mb-3">
              Payments may be made through online payment gateways, digital wallets, UPI, cards, net banking, or Cash on
              Delivery (COD), where available.
            </p>
            <p className="mb-3">
              By proceeding with payment, you authorize FlashBites and its authorized payment service providers to process
              the transaction on your behalf.
            </p>
            <p className="mb-3">
              FlashBites does not store complete payment card information and uses secure third-party payment processors for
              transaction handling.
            </p>
            <p className="mb-3">Cash on Delivery services may only be available in selected locations and are subject to operational feasibility.</p>
            <p>In the event of payment failure, order processing may be delayed, suspended, or cancelled.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cancellation and Refund Policy</h2>
            <p className="mb-3">Orders may be cancelled before restaurant acceptance without any penalty.</p>
            <p className="mb-3">
              Once an order has been accepted by the restaurant and preparation has begun, cancellation may not be permitted
              unless specifically allowed by the Platform or the restaurant.
            </p>
            <p className="mb-3">Refund eligibility depends on the nature of the issue.</p>
            <p className="mb-3">
              Food quality issues, stale food, hygiene concerns, incorrect or missing items, and preparation-related
              complaints shall be the responsibility of the restaurant partner.
            </p>
            <p className="mb-3">
              Delivery-related delays, rider issues, technical failures, and payment processing errors shall be the
              responsibility of FlashBites where applicable.
            </p>
            <p className="mb-3">Refunds are generally processed within 5 to 7 working days from approval.</p>
            <p className="mb-3">
              For Cash on Delivery orders, approved refunds may be credited to the user's wallet, bank account, UPI, or
              any other supported method.
            </p>
            <p className="mb-3">
              Refund requests arising due to customer errors, such as incorrect address, wrong item selection, duplicate
              order placement, or inability to receive the order, may not be eligible for refund.
            </p>
            <p>FlashBites reserves the right to investigate all refund claims before approval.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Delivery Terms</h2>
            <p className="mb-3">Delivery times shown on the Platform are estimated and are provided for convenience only.</p>
            <p className="mb-3">
              Actual delivery times may vary due to restaurant preparation delays, traffic conditions, weather conditions,
              rider availability, location accessibility, technical issues, or unforeseen operational circumstances.
            </p>
            <p className="mb-3">
              Where FlashBites manages delivery through its partner network, reasonable efforts will be made to ensure
              timely delivery.
            </p>
            <p>
              However, FlashBites shall not be liable for delays caused by circumstances beyond reasonable control,
              including force majeure events.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. User Conduct and Responsibilities</h2>
            <p className="mb-3">Users agree not to misuse the Platform in any manner.</p>
            <p className="mb-3">
              This includes, but is not limited to, placing fake orders, repeatedly cancelling confirmed orders, abusing
              the refund system, using bots or automated scripts, scraping data, harassing restaurant staff or delivery
              partners, or engaging in fraudulent payment activity.
            </p>
            <p className="mb-3">Users are expected to provide accurate delivery addresses and remain reachable during delivery.</p>
            <p>
              Any abusive, threatening, offensive, or unlawful behavior may result in suspension or permanent termination
              of the account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Fraud Prevention and Misuse</h2>
            <p className="mb-3">
              FlashBites actively monitors suspicious activity to protect users, restaurants, and delivery partners.
            </p>
            <p>
              The Platform reserves the right to block accounts, deny services, cancel orders, withhold refunds, and
              report activities to relevant authorities in cases involving suspected fraud, fake orders, payment abuse,
              repeated suspicious cancellations, identity misuse, or any conduct deemed harmful to the ecosystem.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Food Safety Disclaimer</h2>
            <p className="mb-3">All food items listed on FlashBites are prepared, packaged, and sold by independent restaurant partners.</p>
            <p className="mb-3">
              Restaurants are solely responsible for food quality, hygiene standards, ingredient disclosure, allergen
              information, freshness, portion sizes, and compliance with applicable food safety laws, including FSSAI
              regulations.
            </p>
            <p className="mb-3">
              FlashBites does not independently verify or guarantee the quality, nutritional content, or safety of food items.
            </p>
            <p>
              Users with allergies, dietary restrictions, or health concerns should directly verify ingredients with the
              restaurant before placing an order.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
            <p className="mb-3">
              To the maximum extent permitted by applicable law, FlashBites shall not be liable for any indirect,
              incidental, consequential, special, punitive, or business-related damages arising out of the use of the
              Platform.
            </p>
            <p className="mb-3">
              This includes loss of profits, health reactions, allergic responses, delays, order issues, or technical disruptions.
            </p>
            <p>In all circumstances, FlashBites' maximum liability shall be limited to the total value of the order in question.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Data Protection and Privacy</h2>
            <p className="mb-3">
              User data shall be collected, processed, and stored solely for the purpose of providing services, including
              order processing, customer support, communication, fraud prevention, and operational improvement.
            </p>
            <p className="mb-3">FlashBites does not sell personal data to third parties.</p>
            <p>Data handling practices are further governed by the Privacy Policy, which forms an integral part of these Terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Intellectual Property</h2>
            <p className="mb-3">
              All content on the Platform, including logos, branding, text, images, interface design, code, software
              architecture, and other materials, is the intellectual property of FlashBites unless otherwise stated.
            </p>
            <p>
              Users may not copy, reproduce, modify, distribute, or commercially exploit any content without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Suspension and Termination</h2>
            <p className="mb-3">
              FlashBites reserves the right to suspend, restrict, or permanently terminate access to the Platform in cases
              involving fraud, abuse, violation of these Terms, legal compliance issues, or behavior harmful to the
              Platform ecosystem.
            </p>
            <p>Termination may occur with or without prior notice depending on the severity of the violation.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Dispute Resolution</h2>
            <p className="mb-3">In the event of any dispute, users are encouraged to first contact FlashBites customer support for amicable resolution.</p>
            <p>
              If unresolved, disputes shall be referred to arbitration in accordance with the laws of India. The seat of
              arbitration shall be Lucknow, India, and proceedings shall be conducted in English.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Force Majeure</h2>
            <p>
              FlashBites shall not be liable for failure or delay in performance caused by events beyond reasonable control,
              including natural disasters, strikes, internet outages, government restrictions, riots, pandemics,
              transportation disruptions, or similar events.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Modifications to Terms</h2>
            <p className="mb-3">FlashBites reserves the right to update, revise, or modify these Terms at any time.</p>
            <p>Continued use of the Platform after such modifications shall constitute acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">19. Contact Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-1"><strong>FlashBites</strong></p>
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
