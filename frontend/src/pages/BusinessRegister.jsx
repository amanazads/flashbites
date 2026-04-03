import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerRestaurant, registerDeliveryPartner } from '../api/authApi';
import MapPicker from '../components/location/MapPicker';

const roleConfig = {
  restaurant_owner: {
    title: 'Restaurant Registration',
    subtitle: 'Create your restaurant partner account',
    loginTo: '/accounts/restaurant/login',
    supportLabel: 'Restaurant Onboarding Support',
  },
  delivery_partner: {
    title: 'Delivery Partner Registration',
    subtitle: 'Create your delivery partner account',
    loginTo: '/accounts/delivery/login',
    supportLabel: 'Delivery Partner Onboarding Support',
  },
};

const ONBOARDING_SUPPORT_EMAIL = 'info.flashbites@gmail.com';
const ONBOARDING_SUPPORT_PHONE = '+91 7068247779';
const ONBOARDING_SUPPORT_WA = '917068247779';

const BusinessRegister = ({ role }) => {
  const navigate = useNavigate();
  const config = roleConfig[role] || roleConfig.restaurant_owner;
  const onboardingHelpMessage = encodeURIComponent(
    role === 'restaurant_owner'
      ? 'Hi FlashBites team, I need help with restaurant onboarding and registration.'
      : 'Hi FlashBites team, I need help with delivery partner onboarding and registration.'
  );

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    restaurantName: '',
    phone: '',
    email: '',
    password: '',
    city: '',
    address: '',
    fssaiLicense: '',
    panNumber: '',
    gstNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankAccountName: '',
    bankName: '',
    menuDetailsText: '',
    acceptedPartnerContract: false,
    contractSignerName: '',
    lat: 31.53,
    lng: 75.91,
    vehicleType: 'bike',
  });
  const [restaurantFiles, setRestaurantFiles] = useState({
    panCard: null,
    fssaiDocument: null,
    menuDocument: null,
    menuImage: null,
    profileFoodImage: null,
  });

  const requiredRestaurantFiles = ['panCard', 'fssaiDocument', 'menuImage', 'profileFoodImage'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRestaurantFileChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP, or PDF files are allowed.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File size must be under 8MB.');
      return;
    }

    setRestaurantFiles((prev) => ({
      ...prev,
      [name]: file,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === 'restaurant_owner') {
        if (!formData.acceptedPartnerContract) {
          toast.error('You must accept the partner contract terms to continue.');
          setLoading(false);
          return;
        }

        if (!formData.contractSignerName.trim()) {
          toast.error('Please provide signer full name for partner contract.');
          setLoading(false);
          return;
        }

        const missingFiles = requiredRestaurantFiles.filter((key) => !restaurantFiles[key]);
        if (missingFiles.length > 0) {
          toast.error(`Please upload required files: ${missingFiles.join(', ')}`);
          setLoading(false);
          return;
        }

        const payload = new FormData();
        payload.append('ownerName', formData.ownerName);
        payload.append('restaurantName', formData.restaurantName);
        payload.append('phone', formData.phone);
        payload.append('email', formData.email);
        payload.append('password', formData.password);
        payload.append('city', formData.city);
        payload.append('address', formData.address);
        payload.append('fssaiLicense', formData.fssaiLicense.toUpperCase());
        payload.append('panNumber', formData.panNumber.toUpperCase());
        payload.append('gstNumber', formData.gstNumber.toUpperCase());
        payload.append('bankAccountNumber', formData.bankAccountNumber);
        payload.append('bankIfsc', formData.bankIfsc.toUpperCase());
        payload.append('bankAccountName', formData.bankAccountName);
        payload.append('bankName', formData.bankName);
        payload.append('menuDetailsText', formData.menuDetailsText);
        payload.append('acceptedPartnerContract', String(formData.acceptedPartnerContract));
        payload.append('contractSignerName', formData.contractSignerName.trim());
        payload.append('lat', String(formData.lat));
        payload.append('lng', String(formData.lng));

        Object.entries(restaurantFiles).forEach(([field, file]) => {
          if (file) payload.append(field, file);
        });

        await registerRestaurant(payload);
      } else {
        await registerDeliveryPartner({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          city: formData.city,
          vehicleType: formData.vehicleType,
        });
      }

      toast.custom(() => (
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
            padding: '16px'
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>Registration submitted</p>
          <p style={{ margin: '6px 0 12px', fontSize: '13px', lineHeight: '1.5', color: '#4b5563' }}>
            Wait for admin approval before login. If verification is delayed, contact our onboarding team directly.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <a
              href={`tel:${ONBOARDING_SUPPORT_PHONE.replace(/\s+/g, '')}`}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                background: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fdba74',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Call: {ONBOARDING_SUPPORT_PHONE}
            </a>
            <a
              href={`mailto:${ONBOARDING_SUPPORT_EMAIL}?subject=${encodeURIComponent(config.supportLabel)}`}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Email support
            </a>
            <a
              href={`https://wa.me/${ONBOARDING_SUPPORT_WA}?text=${onboardingHelpMessage}`}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              WhatsApp onboarding support
            </a>
          </div>
        </div>
      ));
      setTimeout(() => navigate(config.loginTo), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        <p className="text-sm text-gray-600 mt-1">{config.subtitle}</p>

        {role === 'restaurant_owner' && (
          <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900">
            <p className="font-semibold">Register Your Restaurant</p>
            <p className="mt-1">
              Fill in restaurant name, owner details, address, FSSAI details, bank information, and menu details.
              Our onboarding team can assist you during registration.
            </p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">{config.supportLabel}</p>
          <p className="text-xs text-gray-600 mt-1">
            Need help while filling the registration form? Our support and onboarding team can guide you step-by-step.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`tel:${ONBOARDING_SUPPORT_PHONE.replace(/\s+/g, '')}`}
              className="text-xs px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200"
            >
              Call: {ONBOARDING_SUPPORT_PHONE}
            </a>
            <a
              href={`mailto:${ONBOARDING_SUPPORT_EMAIL}?subject=${encodeURIComponent(config.supportLabel)}`}
              className="text-xs px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200"
            >
              Email: {ONBOARDING_SUPPORT_EMAIL}
            </a>
            <a
              href={`https://wa.me/${ONBOARDING_SUPPORT_WA}?text=${onboardingHelpMessage}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200"
            >
              WhatsApp Onboarding Support
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4">
          {role === 'restaurant_owner' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input name="ownerName" value={formData.ownerName} onChange={handleChange} required placeholder="Owner Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                <input name="restaurantName" value={formData.restaurantName} onChange={handleChange} required placeholder="Restaurant Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                <input name="city" value={formData.city} onChange={handleChange} required placeholder="City" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                <input name="address" value={formData.address} onChange={handleChange} required placeholder="Full Address" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                <input name="fssaiLicense" value={formData.fssaiLicense} onChange={handleChange} required placeholder="FSSAI License Number" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                <input name="panNumber" value={formData.panNumber} onChange={handleChange} required placeholder="PAN Number" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg uppercase" />
                <input name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="GST Number (if applicable)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg uppercase" />
                <input name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} required placeholder="Bank Account Number" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                <input name="bankIfsc" value={formData.bankIfsc} onChange={handleChange} required placeholder="Bank IFSC Code" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg uppercase" />
                <input name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} required placeholder="Account Holder Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                <input name="bankName" value={formData.bankName} onChange={handleChange} required placeholder="Bank Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
              </div>

              <textarea
                name="menuDetailsText"
                value={formData.menuDetailsText}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Menu details (category, top dishes, pricing notes, cuisine style)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              />

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Restaurant Location (Map)</p>
                <MapPicker
                  initialPosition={{ lat: Number(formData.lat), lng: Number(formData.lng) }}
                  onSelect={(point) => setFormData((prev) => ({ ...prev, lat: point.lat, lng: point.lng }))}
                  mapHeight={260}
                />
                <div className="mt-2 text-xs text-gray-600">
                  Latitude: {Number(formData.lat).toFixed(6)} | Longitude: {Number(formData.lng).toFixed(6)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Required Documents & Media</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">
                    PAN card (image/pdf) *
                    <input type="file" name="panCard" onChange={handleRestaurantFileChange} accept="image/*,.pdf" required className="mt-1 block w-full text-sm" />
                  </label>
                  <label className="text-sm text-gray-700">
                    FSSAI license document (image/pdf) *
                    <input type="file" name="fssaiDocument" onChange={handleRestaurantFileChange} accept="image/*,.pdf" required className="mt-1 block w-full text-sm" />
                    <a href="https://foscos.fssai.gov.in" target="_blank" rel="noreferrer" className="text-primary-600 text-xs">Don't have a FSSAI license? Apply here.</a>
                  </label>
                  <label className="text-sm text-gray-700">
                    Menu details document (optional image/pdf)
                    <input type="file" name="menuDocument" onChange={handleRestaurantFileChange} accept="image/*,.pdf" className="mt-1 block w-full text-sm" />
                  </label>
                  <label className="text-sm text-gray-700">
                    Menu image *
                    <input type="file" name="menuImage" onChange={handleRestaurantFileChange} accept="image/*" required className="mt-1 block w-full text-sm" />
                  </label>
                  <label className="text-sm text-gray-700 sm:col-span-2">
                    Profile food image *
                    <input type="file" name="profileFoodImage" onChange={handleRestaurantFileChange} accept="image/*" required className="mt-1 block w-full text-sm" />
                    <a href="/partner" className="text-primary-600 text-xs">What is profile food image? Refer here.</a>
                  </label>
                </div>
                <p className="text-xs text-gray-600">Admins can review and later edit menu items, pricing, restaurant details, and images after document verification.</p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900">Partner Contract & Terms</p>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 space-y-3 leading-relaxed">
                  <h4 className="font-semibold text-gray-900">FlashBites Restaurant Partner Terms</h4>
                  <p>Welcome to FlashBites.</p>
                  <p>
                    By submitting the restaurant onboarding form and joining the FlashBites platform, you agree to the following
                    Restaurant Partner Terms.
                  </p>
                  <p>
                    These terms outline the basic responsibilities, commercial structure, payout process, and operational guidelines
                    for listing your restaurant on FlashBites.
                  </p>
                  <p>Please read these terms carefully before proceeding.</p>

                  <div>
                    <p className="font-semibold text-gray-900">1. Platform Role</p>
                    <p>
                      FlashBites is a technology platform that connects customers with restaurant partners and delivery partners.
                    </p>
                    <p>FlashBites does not prepare, cook, own, or sell food items.</p>
                    <p>
                      All food items listed on the platform are solely prepared, owned, and sold by the Restaurant Partner.
                    </p>
                    <p>The sale of food takes place directly between the customer and the Restaurant Partner.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">2. Restaurant Responsibilities</p>
                    <p>By joining FlashBites, you agree to:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>provide fresh, hygienic, and safe food</li>
                      <li>maintain accurate menu items and pricing</li>
                      <li>ensure availability of listed items</li>
                      <li>accept and prepare orders on time</li>
                      <li>use proper packaging</li>
                      <li>comply with FSSAI and applicable food safety laws</li>
                      <li>maintain professional conduct with customers and delivery partners</li>
                    </ul>
                    <p>You are responsible for keeping your restaurant details and menu updated.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">3. Pricing and Menu Control</p>
                    <p>You retain full control over:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>menu pricing</li>
                      <li>item descriptions</li>
                      <li>availability</li>
                      <li>special offers</li>
                    </ul>
                    <p>FlashBites will not change your menu pricing without your approval.</p>
                    <p>Promotional discounts and campaign offers may be run only with mutual consent.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">4. Commission and Fees</p>
                    <p>FlashBites charges a platform commission on every successfully completed order.</p>
                    <p>
                      The commission percentage may vary depending on location, category, and services provided.
                    </p>
                    <p>The applicable commission will be communicated during onboarding.</p>
                    <p>No hidden charges will be applied.</p>
                    <p>Optional marketing and featured listing services may be available separately.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">5. Payments and Settlements</p>
                    <p>
                      FlashBites collects customer payments on your behalf and settles the payable amount after deducting:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>commission</li>
                      <li>taxes</li>
                      <li>approved refund adjustments</li>
                    </ul>
                    <p>Payouts are processed on a weekly basis and are generally settled within 3 to 5 working days.</p>
                    <p>A detailed payout statement will be shared through your dashboard.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">6. Refund and Complaint Responsibility</p>
                    <p>You are responsible for issues arising from:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>food quality</li>
                      <li>stale or unsafe food</li>
                      <li>wrong or missing items</li>
                      <li>preparation errors</li>
                    </ul>
                    <p>FlashBites will handle delivery-related issues including:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>rider misconduct</li>
                      <li>delivery delay</li>
                      <li>transit damage</li>
                      <li>technical platform issues</li>
                    </ul>
                    <p>In disputed cases, the issue may be jointly reviewed.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">7. Delivery Services</p>
                    <p>
                      Where FlashBites provides delivery support, our delivery partners will handle order pickup and delivery.
                    </p>
                    <p>FlashBites is responsible for rider operations and delivery flow.</p>
                    <p>Restaurants are expected to hand over orders in a timely and properly packed manner.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">8. Legal Compliance</p>
                    <p>You confirm that your restaurant complies with all applicable laws including:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>FSSAI registration / license</li>
                      <li>GST compliance (where applicable)</li>
                      <li>local business licenses</li>
                      <li>tax regulations</li>
                    </ul>
                    <p>FlashBites may request verification documents during onboarding or at any time.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">9. Non-Exclusivity</p>
                    <p>
                      Your partnership with FlashBites is non-exclusive. You are free to list your restaurant on other platforms
                      and continue offline operations.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">10. Suspension and Termination</p>
                    <p>FlashBites reserves the right to suspend or remove listings in cases involving:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>fraud</li>
                      <li>unsafe food</li>
                      <li>legal non-compliance</li>
                      <li>repeated order issues</li>
                      <li>customer complaints</li>
                      <li>misuse of the platform</li>
                    </ul>
                    <p>Either party may terminate the partnership with prior notice.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">11. Acceptance</p>
                    <p>By submitting the onboarding form, you confirm that:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>all information provided is correct</li>
                      <li>you agree to these terms</li>
                      <li>you consent to onboarding and listing on FlashBites</li>
                    </ul>
                    <p>For full legal agreement details, please contact our onboarding team.</p>
                  </div>
                </div>
                <input
                  name="contractSignerName"
                  value={formData.contractSignerName}
                  onChange={handleChange}
                  required
                  placeholder="Signer full name (digital signature)"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                />
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="acceptedPartnerContract"
                    checked={formData.acceptedPartnerContract}
                    onChange={handleChange}
                    required
                    className="mt-1 h-4 w-4"
                  />
                  <span>I have read and agree to the Partner Contract Terms & Conditions, and I authorize submission with my digital signature.</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <input name="name" value={formData.name} onChange={handleChange} required placeholder="Full Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
              <input name="city" value={formData.city} onChange={handleChange} required placeholder="City" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
              <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white">
                <option value="bike">Bike</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
              </select>
            </>
          )}

          <input name="phone" value={formData.phone} onChange={handleChange} required maxLength={10} placeholder="10-digit Phone" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
          <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="Email" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
          <input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="Password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />

          <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-70">
            {loading ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Already registered?{' '}
          <Link to={config.loginTo} className="text-primary-600 font-semibold hover:text-primary-700">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default BusinessRegister;
