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
  },
  delivery_partner: {
    title: 'Delivery Partner Registration',
    subtitle: 'Create your delivery partner account',
    loginTo: '/accounts/delivery/login',
  },
};

const BusinessRegister = ({ role }) => {
  const navigate = useNavigate();
  const config = roleConfig[role] || roleConfig.restaurant_owner;

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

      toast.success('Registration submitted. Wait for admin approval before login.');
      navigate(config.loginTo);
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
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 space-y-2">
                  <p>By onboarding with FlashBites, you confirm that all details and documents submitted are accurate and legally valid.</p>
                  <p>You agree to comply with food safety regulations (including FSSAI), maintain authentic menu information, and uphold service quality commitments.</p>
                  <p>FlashBites may review, verify, and request corrections in documents, menu details, pricing, images, and operational information.</p>
                  <p>After verification, admin may edit restaurant profile content, images, pricing, menu items, and operational settings for platform compliance.</p>
                  <p>Providing false information may result in rejection, suspension, or permanent delisting from the platform.</p>
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
