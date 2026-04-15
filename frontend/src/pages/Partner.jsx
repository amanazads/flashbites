import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  TruckIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  DocumentTextIcon,
  CameraIcon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import axios from '../api/axios';
import { submitPartnerApplication } from '../api/partnerApi';
import AddressInput from '../components/location/AddressInput';
import MapPicker from '../components/location/MapPicker';
import { reverseGeocodeCoordinates } from '../api/locationApi';
import logo from '../assets/logo.png';
import { useLanguage } from '../contexts/LanguageContext';
import { getDeliveryAddressLabel } from '../utils/deliveryAddress';

const isValidCoordinatePair = (lat, lng) => (
  Number.isFinite(lat)
  && Number.isFinite(lng)
  && lat >= -90
  && lat <= 90
  && lng >= -180
  && lng <= 180
  && !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
);

const Partner = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const selectedDeliveryAddress = useSelector((s) => s.ui.selectedDeliveryAddress);
  const deliveryAddressLabel = getDeliveryAddressLabel(selectedDeliveryAddress, t('common.currentArea', 'Current Area'));
  const [activeSection, setActiveSection] = useState('overview'); // overview, delivery, restaurant, restaurantRegistration, career, contact
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    vehicleType: 'bike',
    vehicleNumber: '',
    vehicleModel: '',
    licenseNumber: '',
    aadharNumber: '',
    bankAccount: {
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
  });

  const [documents, setDocuments] = useState({
    photo: null,
    drivingLicense: null,
    aadharCard: null,
  });

  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [restaurantLocationSearch, setRestaurantLocationSearch] = useState('');
  const [restaurantFormData, setRestaurantFormData] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    businessType: '',
    cuisineTypes: '',
    openingTime: '',
    closingTime: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
    },
    location: {
      lat: '',
      lng: '',
    },
    fssaiLicenseNumber: '',
    gstNumber: '',
    panNumber: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
    },
    menuItems: [
      {
        name: '',
        nameHi: '',
        category: '',
        price: '',
        description: '',
        descriptionHi: '',
      },
    ],
    acceptTerms: false,
    acceptAgreement: false,
  });

  const [restaurantDocuments, setRestaurantDocuments] = useState({
    fssaiLicense: null,
    menuDocument: null,
    ownerIdProof: null,
    cancelledCheque: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('partner.fileSizeLimit', 'File size should not exceed 5MB'));
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error(t('partner.fileTypeAllowed', 'Only JPG, PNG, and PDF files are allowed'));
        return;
      }

      setDocuments(prev => ({
        ...prev,
        [type]: file,
      }));

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (type === 'photo') setPhotoPreview(reader.result);
          if (type === 'drivingLicense') setLicensePreview(reader.result);
          if (type === 'aadharCard') setAadharPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!documents.photo || !documents.drivingLicense || !documents.aadharCard) {
      toast.error(t('partner.uploadRequiredDocs', 'Please upload all required documents'));
      return;
    }

    if (formData.phone.length !== 10) {
      toast.error(t('partner.phone10DigitsSingle', 'Phone number must be 10 digits'));
      return;
    }

    if (formData.alternatePhone && formData.alternatePhone.length !== 10) {
      toast.error(t('partner.altPhone10Digits', 'Alternate phone number must be 10 digits'));
      return;
    }

    if (formData.aadharNumber.length !== 12) {
      toast.error(t('partner.aadhar12Digits', 'Aadhar number must be 12 digits'));
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Append all text fields
      submitData.append('fullName', formData.fullName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('alternatePhone', formData.alternatePhone);
      submitData.append('dateOfBirth', formData.dateOfBirth);
      submitData.append('address', JSON.stringify(formData.address));
      submitData.append('vehicleType', formData.vehicleType);
      submitData.append('vehicleNumber', formData.vehicleNumber);
      submitData.append('vehicleModel', formData.vehicleModel);
      submitData.append('licenseNumber', formData.licenseNumber);
      submitData.append('aadharNumber', formData.aadharNumber);
      submitData.append('bankAccount', JSON.stringify(formData.bankAccount));
      submitData.append('emergencyContact', JSON.stringify(formData.emergencyContact));
      
      // Append files
      submitData.append('photo', documents.photo);
      submitData.append('drivingLicense', documents.drivingLicense);
      submitData.append('aadharCard', documents.aadharCard);

      await submitPartnerApplication(submitData);

      const deliveryCsvRow = [
        'Delivery Partner',
        formData.fullName,
        formData.email,
        formData.phone,
        formData.alternatePhone,
        formData.vehicleType,
        formData.vehicleNumber,
        formData.licenseNumber,
        formData.aadharNumber,
        formData.address.city,
        formData.address.state,
        documents.photo?.name || 'NA',
        documents.drivingLicense?.name || 'NA',
        documents.aadharCard?.name || 'NA',
        'Pending Approval',
      ].join(',');

      const deliveryMessage = [
        'New delivery partner application submitted.',
        '',
        `Full Name: ${formData.fullName}`,
        `Email: ${formData.email}`,
        `Phone: ${formData.phone}`,
        `Alternate Phone: ${formData.alternatePhone}`,
        `DOB: ${formData.dateOfBirth}`,
        `Address: ${formData.address.street}, ${formData.address.city}, ${formData.address.state}, ${formData.address.zipCode}`,
        `Vehicle Type: ${formData.vehicleType}`,
        `Vehicle Number: ${formData.vehicleNumber}`,
        `Vehicle Model: ${formData.vehicleModel}`,
        `License Number: ${formData.licenseNumber}`,
        `Aadhar Number: ${formData.aadharNumber}`,
        `Bank Account Holder: ${formData.bankAccount.accountHolderName}`,
        `Bank Account Number: ${formData.bankAccount.accountNumber}`,
        `IFSC: ${formData.bankAccount.ifscCode}`,
        `Emergency Contact: ${formData.emergencyContact.name} (${formData.emergencyContact.relation}) - ${formData.emergencyContact.phone}`,
        '',
        'Uploaded Documents:',
        `Photo: ${documents.photo?.name || 'NA'}`,
        `Driving License: ${documents.drivingLicense?.name || 'NA'}`,
        `Aadhar Card: ${documents.aadharCard?.name || 'NA'}`,
        '',
        'Approval Instruction: Please review and add this entry to the approval Excel sheet.',
        `Excel Row (CSV): ${deliveryCsvRow}`,
      ].join('\n');

      try {
        await axios.post('/contact', {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          subject: `Delivery Partner Approval Request - ${formData.fullName}`,
          message: deliveryMessage,
        });
      } catch (notifyError) {
        console.error('Delivery admin notification failed:', notifyError);
      }
      
      toast.success(t('partner.applicationSubmitted', 'Application submitted. Details were sent to admin for approval review.'));
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || t('partner.submitFailed', 'Failed to submit application'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setRestaurantFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
      return;
    }

    setRestaurantFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRestaurantMenuItemChange = (index, field, value) => {
    setRestaurantFormData((prev) => {
      const updatedItems = [...prev.menuItems];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };

      return {
        ...prev,
        menuItems: updatedItems,
      };
    });
  };

  const addRestaurantMenuItem = () => {
    setRestaurantFormData((prev) => ({
      ...prev,
      menuItems: [
        ...prev.menuItems,
        {
          name: '',
          nameHi: '',
          category: '',
          price: '',
          description: '',
          descriptionHi: '',
        },
      ],
    }));
  };

  const removeRestaurantMenuItem = (index) => {
    setRestaurantFormData((prev) => {
      if (prev.menuItems.length === 1) {
        return prev;
      }

      const updatedItems = prev.menuItems.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        menuItems: updatedItems,
      };
    });
  };

  const handleRestaurantDocumentChange = (e, key) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('partner.eachDoc5mb', 'Each document must be 5MB or smaller'));
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('partner.pdfJpgPng', 'Only PDF, JPG, and PNG files are allowed'));
      return;
    }

    setRestaurantDocuments((prev) => ({
      ...prev,
      [key]: file,
    }));
  };

  const resetRestaurantForm = () => {
    setRestaurantFormData({
      restaurantName: '',
      ownerName: '',
      email: '',
      phone: '',
      alternatePhone: '',
      businessType: '',
      cuisineTypes: '',
      openingTime: '',
      closingTime: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
      },
      location: {
        lat: '',
        lng: '',
      },
      fssaiLicenseNumber: '',
      gstNumber: '',
      panNumber: '',
      bankDetails: {
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
      },
      menuItems: [
        {
          name: '',
          category: '',
          price: '',
          description: '',
        },
      ],
      acceptTerms: false,
      acceptAgreement: false,
    });

    setRestaurantLocationSearch('');

    setRestaurantDocuments({
      fssaiLicense: null,
      menuDocument: null,
      ownerIdProof: null,
      cancelledCheque: null,
    });
  };

  const setRestaurantCoordinates = (lat, lng) => {
    if (!isValidCoordinatePair(lat, lng)) {
      return false;
    }

    setRestaurantFormData((prev) => ({
      ...prev,
      location: {
        lat: Number(lat).toFixed(6),
        lng: Number(lng).toFixed(6),
      },
    }));

    return true;
  };

  const handleRestaurantAddressSelect = (selection) => {
    const lat = Number(selection?.lat);
    const lng = Number(selection?.lng);

    if (isValidCoordinatePair(lat, lng)) {
      setRestaurantCoordinates(lat, lng);
    }

    setRestaurantLocationSearch(selection?.fullAddress || selection?.address || '');

    setRestaurantFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        street: selection?.street || selection?.address || prev.address.street,
        city: selection?.city || prev.address.city,
        state: selection?.state || prev.address.state,
        pincode: selection?.zipCode || prev.address.pincode,
      },
    }));
  };

  const handleRestaurantMapSelect = ({ lat, lng }) => {
    setRestaurantCoordinates(Number(lat), Number(lng));
  };

  const handleRestaurantLocationInput = (field, value) => {
    setRestaurantFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  const getRestaurantGeoFailureMessage = (error) => {
    if (!window.isSecureContext) {
      return 'Location capture needs HTTPS (or localhost). Enter latitude/longitude manually.';
    }

    if (error?.code === 1) {
      return 'Location permission is blocked. Please allow location for browser/app and try again.';
    }
    if (error?.code === 2) {
      return 'Location signal is unavailable right now. Move to open sky and retry.';
    }
    if (error?.code === 3) {
      return 'Location request timed out. Retry once, or enter latitude/longitude manually.';
    }
    return 'Unable to capture location automatically. Enter latitude/longitude manually.';
  };

  const handleUseCurrentRestaurantLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device. Enter latitude/longitude manually.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        if (!setRestaurantCoordinates(lat, lng)) {
          toast.error('Could not fetch valid coordinates. Please try again.');
          return;
        }

        try {
          const response = await reverseGeocodeCoordinates(lat, lng);
          const location = response?.data?.location || response?.location || null;
          if (location) {
            setRestaurantLocationSearch(location.fullAddress || '');
            setRestaurantFormData((prev) => ({
              ...prev,
              address: {
                ...prev.address,
                street: location.street || prev.address.street,
                city: location.city || prev.address.city,
                state: location.state || prev.address.state,
                pincode: location.zipCode || prev.address.pincode,
              },
            }));
          }
        } catch (error) {
          console.error('Reverse geocode failed for restaurant registration:', error);
        }

        toast.success(t('partner.locationCaptured', 'Restaurant location captured'));
      },
      (error) => {
        toast.error(getRestaurantGeoFailureMessage(error));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleRestaurantSubmit = async (e) => {
    e.preventDefault();

    const validMenuItems = restaurantFormData.menuItems.filter(
      (item) => item.name.trim() && item.price !== ''
    );

    if (restaurantFormData.phone.length !== 10) {
      toast.error(t('partner.phone10DigitsSingle', 'Phone number must be 10 digits'));
      return;
    }

    if (restaurantFormData.alternatePhone && restaurantFormData.alternatePhone.length !== 10) {
      toast.error(t('partner.altPhone10Digits', 'Alternate phone number must be 10 digits'));
      return;
    }

    if (!restaurantDocuments.fssaiLicense || !restaurantDocuments.menuDocument || !restaurantDocuments.ownerIdProof) {
      toast.error(t('partner.uploadRequiredDocs', 'Please upload all required documents'));
      return;
    }

    if (validMenuItems.length === 0) {
      toast.error(t('partner.menuItemRequired', 'Add at least one menu item with name and price'));
      return;
    }

    if (!restaurantFormData.acceptTerms || !restaurantFormData.acceptAgreement) {
      toast.error(t('partner.acceptTermsRequired', 'Please accept Terms and Partner Agreement before submitting'));
      return;
    }

    const locationLat = Number(restaurantFormData.location?.lat);
    const locationLng = Number(restaurantFormData.location?.lng);
    if (!isValidCoordinatePair(locationLat, locationLng)) {
      toast.error(t('partner.validLocationRequired', 'Please set a valid restaurant location using address search, map pin, current location, or manual coordinates'));
      return;
    }

    setRestaurantLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('restaurantName', restaurantFormData.restaurantName);
      submitData.append('ownerName', restaurantFormData.ownerName);
      submitData.append('email', restaurantFormData.email);
      submitData.append('phone', restaurantFormData.phone);
      submitData.append('alternatePhone', restaurantFormData.alternatePhone || '');
      submitData.append('businessType', restaurantFormData.businessType);
      submitData.append('cuisineTypes', restaurantFormData.cuisineTypes);
      submitData.append('openingTime', restaurantFormData.openingTime);
      submitData.append('closingTime', restaurantFormData.closingTime);
      submitData.append('address', JSON.stringify(restaurantFormData.address));
      submitData.append('location', JSON.stringify({ lat: locationLat, lng: locationLng }));
      submitData.append('fssaiLicenseNumber', restaurantFormData.fssaiLicenseNumber);
      submitData.append('gstNumber', restaurantFormData.gstNumber || '');
      submitData.append('panNumber', restaurantFormData.panNumber || '');
      submitData.append('bankDetails', JSON.stringify(restaurantFormData.bankDetails));
      submitData.append('menuItems', JSON.stringify(validMenuItems));
      submitData.append('acceptTerms', String(restaurantFormData.acceptTerms));
      submitData.append('acceptAgreement', String(restaurantFormData.acceptAgreement));

      if (restaurantDocuments.fssaiLicense) {
        submitData.append('fssaiLicense', restaurantDocuments.fssaiLicense);
      }
      if (restaurantDocuments.menuDocument) {
        submitData.append('menuDocument', restaurantDocuments.menuDocument);
      }
      if (restaurantDocuments.ownerIdProof) {
        submitData.append('ownerIdProof', restaurantDocuments.ownerIdProof);
      }
      if (restaurantDocuments.cancelledCheque) {
        submitData.append('cancelledCheque', restaurantDocuments.cancelledCheque);
      }

      await axios.post('/partners/restaurant-apply', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const restaurantCsvRow = [
        'Restaurant Partner',
        restaurantFormData.restaurantName,
        restaurantFormData.ownerName,
        restaurantFormData.email,
        restaurantFormData.phone,
        restaurantFormData.fssaiLicenseNumber,
        restaurantFormData.address.city,
        restaurantFormData.address.state,
        locationLat,
        locationLng,
        restaurantFormData.bankDetails.accountHolderName,
        restaurantFormData.bankDetails.ifscCode,
        restaurantDocuments.fssaiLicense?.name || 'NA',
        restaurantDocuments.menuDocument?.name || 'NA',
        'Pending Verification',
      ].join(',');

      const message = [
        `Restaurant Name: ${restaurantFormData.restaurantName}`,
        `Owner Name: ${restaurantFormData.ownerName}`,
        `Business Type: ${restaurantFormData.businessType}`,
        `Cuisine Types: ${restaurantFormData.cuisineTypes}`,
        `Phone: ${restaurantFormData.phone}`,
        `Alternate Phone: ${restaurantFormData.alternatePhone || 'N/A'}`,
        `Opening Time: ${restaurantFormData.openingTime}`,
        `Closing Time: ${restaurantFormData.closingTime}`,
        `Address: ${restaurantFormData.address.street}, ${restaurantFormData.address.city}, ${restaurantFormData.address.state}, ${restaurantFormData.address.pincode}`,
        `Landmark: ${restaurantFormData.address.landmark || 'N/A'}`,
        `Latitude: ${locationLat}`,
        `Longitude: ${locationLng}`,
        `FSSAI License Number: ${restaurantFormData.fssaiLicenseNumber}`,
        `GST Number: ${restaurantFormData.gstNumber || 'N/A'}`,
        `PAN Number: ${restaurantFormData.panNumber || 'N/A'}`,
        `Bank Account Holder: ${restaurantFormData.bankDetails.accountHolderName}`,
        `Bank Account Number: ${restaurantFormData.bankDetails.accountNumber}`,
        `IFSC: ${restaurantFormData.bankDetails.ifscCode}`,
        `UPI ID: ${restaurantFormData.bankDetails.upiId || 'N/A'}`,
        '',
        'Menu Items:',
        ...validMenuItems.map((item, index) => {
          const categoryText = item.category ? ` | Category: ${item.category}` : '';
          const descriptionText = item.description ? ` | Description: ${item.description}` : '';
          return `${index + 1}. ${item.name} | Price: Rs ${item.price}${categoryText}${descriptionText}`;
        }),
        '',
        'Uploaded Document Names:',
        `FSSAI License: ${restaurantDocuments.fssaiLicense?.name || 'N/A'}`,
        `Menu Document: ${restaurantDocuments.menuDocument?.name || 'N/A'}`,
        `Owner ID Proof: ${restaurantDocuments.ownerIdProof?.name || 'N/A'}`,
        `Cancelled Cheque: ${restaurantDocuments.cancelledCheque?.name || 'N/A'}`,
        '',
        `Accepted Terms: ${restaurantFormData.acceptTerms ? 'Yes' : 'No'}`,
        `Accepted Partner Agreement: ${restaurantFormData.acceptAgreement ? 'Yes' : 'No'}`,
        '',
        'Approval Instruction: Please review and add this registration to the restaurant approval Excel sheet.',
        `Excel Row (CSV): ${restaurantCsvRow}`,
        'Post-Verification Action: Share new restaurant owner login credentials after verification for smooth restaurant login.',
      ].join('\n');

      try {
        await axios.post('/contact', {
          name: restaurantFormData.ownerName,
          email: restaurantFormData.email,
          phone: restaurantFormData.phone,
          subject: `Restaurant Partner Registration - ${restaurantFormData.restaurantName}`,
          message,
        });
      } catch (notifyError) {
        console.error('Restaurant admin notification failed:', notifyError);
      }

      toast.success(t('partner.restaurantSubmitted', 'Restaurant registration submitted and sent to admin approval queue. Credentials will be generated on approval.'));
      resetRestaurantForm();
      setActiveSection('restaurant');
    } catch (error) {
      toast.error(error.response?.data?.message || t('partner.registrationFailed', 'Failed to submit registration'));
    } finally {
      setRestaurantLoading(false);
    }
  };

  const restaurantLat = Number(restaurantFormData.location?.lat);
  const restaurantLng = Number(restaurantFormData.location?.lng);
  const mapInitialPosition = isValidCoordinatePair(restaurantLat, restaurantLng)
    ? { lat: restaurantLat, lng: restaurantLng }
    : { lat: 31.53, lng: 75.91 };

  return (
    <div className="partner-home-theme min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="lg:hidden" style={{ backgroundColor: 'rgb(245, 243, 241)' }}>
        <div className="max-w-7xl mx-auto px-4 xs:px-5 sm:px-6 lg:px-0 pt-[max(env(safe-area-inset-top),10px)] pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-[0_8px_18px_rgba(234,88,12,0.32)]"
                aria-label="Go back"
                style={{ background: 'linear-gradient(rgb(255, 122, 69) 0%, rgb(234, 88, 12) 100%)' }}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              <button type="button" className="flex items-center gap-2 text-left">
                <MapPinIcon className="h-4 w-4" style={{ color: 'rgb(234, 88, 12)' }} />
                <div>
                  <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">{t('common.deliverTo', 'Deliver to')}</p>
                  <p className="text-[12px] leading-none font-semibold text-gray-900 truncate">{deliveryAddressLabel}</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/restaurants')}>
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-700" />
              </button>
              <button type="button" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
                <img src={logo} alt="Profile" className="h-full w-full object-cover" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('partner.heroTitle', 'Partner With FlashBites')}</h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto mb-8">
            {t('partner.heroSubtitle', 'Join us in revolutionizing food delivery in rural and semi-urban India. Whether you\'re a restaurant owner, delivery partner, or looking for a career, we have opportunities for you.')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setActiveSection('restaurant')}
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              {t('partner.restaurantPartner', 'Restaurant Partner')}
            </button>
            <button
              onClick={() => setActiveSection('delivery')}
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              {t('partner.deliveryPartner', 'Delivery Partner')}
            </button>
            {/* <button
              onClick={() => setActiveSection('career')}
              className="bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors"
            >
              Careers
            </button> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-12">
            {/* Why Partner With Us */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Partner With Us?</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                FlashBites is committed to empowering local businesses and creating opportunities 
                in underserved markets across India.
              </p>
            </div>

            {/* Partnership Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Restaurant Partner */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <BuildingStorefrontIcon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Restaurant Partner</h3>
                <p className="text-gray-600 mb-6 text-center">
                  Expand your reach and grow your business by partnering with FlashBites.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Less commission earlier</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Free onboarding & marketing support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Access to thousands of customers</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Real-time analytics dashboard</span>
                  </li>
                </ul>
                <button
                  onClick={() => setActiveSection('restaurant')}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  Learn More
                </button>
              </div>

              {/* Delivery Partner */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <TruckIcon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Delivery Partner</h3>
                <p className="text-gray-600 mb-6 text-center">
                  Earn flexible income by delivering food to customers in your area.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Earn minimum ₹15,000 - ₹30,000/month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Flexible working hours</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Weekly payments</span>
                  </li>
                  
                </ul>
                <button
                  onClick={() => setActiveSection('delivery')}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  Apply Now
                </button>
              </div>

              {/* Career */}
              {/* <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <BriefcaseIcon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Career Opportunities</h3>
                <p className="text-gray-600 mb-6 text-center">
                  Join our team and help build the future of food delivery in India.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Competitive salary & benefits</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Growth & learning opportunities</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Work-life balance</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Dynamic startup culture</span>
                  </li>
                </ul>
                <button
                  onClick={() => setActiveSection('career')}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  Explore Jobs
                </button>
              </div> */}
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-4xl font-bold mb-2">50+</div>
                  <div className="text-primary-100">Restaurant Partners</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">50+</div>
                  <div className="text-primary-100">Delivery Partners</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">1000+</div>
                  <div className="text-primary-100">Happy Customers</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">5+</div>
                  <div className="text-primary-100">Cities</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Partner Section */}
        {activeSection === 'restaurant' && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex items-center mb-6">
                <BuildingStorefrontIcon className="h-12 w-12 text-primary-600 mr-4" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Partner Your Restaurant</h2>
                  <p className="text-gray-600">Grow Your Business with FlashBites</p>
                </div>
              </div>

              <div className="space-y-8">
                <p className="text-gray-700 leading-relaxed">
                  Join FlashBites and take your restaurant online with a fast-growing food delivery platform built for
                  urban, semi-urban, and rural markets. Reach more customers, increase daily orders, and grow your
                  revenue with zero upfront setup cost and complete operational support.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Whether you run a cafe, bakery, cloud kitchen, street food outlet, dhaba, or a full-service
                  restaurant, FlashBites helps you get discovered and grow faster.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Why Partner with FlashBites</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Zero Initial Cost</h4>
                      <p className="text-sm text-gray-600">
                        Start your online business journey with no registration fee and no setup charges. Listing your
                        restaurant on FlashBites is completely free.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Increase Your Reach</h4>
                      <p className="text-sm text-gray-600">
                        Get access to customers across your city, town, and surrounding areas through our growing
                        delivery network and strong local presence.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Marketing &amp; Promotions</h4>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        <li>featured listings</li>
                        <li>app promotions</li>
                        <li>festival campaigns</li>
                        <li>local offers</li>
                        <li>social media promotions</li>
                        <li>professional food photography support</li>
                      </ul>
                      <p className="text-sm text-gray-600 mt-2">Optional premium promotion plans are also available.</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Real-Time Dashboard</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Manage everything from one place with your dedicated restaurant dashboard.
                      </p>
                      <p className="text-sm font-medium text-gray-700 mb-1">Track:</p>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        <li>live incoming orders</li>
                        <li>revenue and payouts</li>
                        <li>daily and weekly analytics</li>
                        <li>order history</li>
                        <li>customer insights</li>
                        <li>menu performance</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Weekly Settlements</h4>
                      <p className="text-sm text-gray-600">
                        Get transparent and reliable payouts with weekly settlement cycles. Detailed payout statements
                        and commission breakdowns are shared for complete transparency.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Dedicated Business Support</h4>
                      <p className="text-sm text-gray-600 mb-2">Our team supports you with:</p>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        <li>onboarding</li>
                        <li>menu upload</li>
                        <li>technical support</li>
                        <li>payout issues</li>
                        <li>marketing guidance</li>
                        <li>restaurant growth support</li>
                      </ul>
                      <p className="text-sm text-gray-600 mt-2">Support is available whenever you need assistance.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h3>
                  <div className="space-y-5">
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">1</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Register Your Restaurant</h4>
                        <p className="text-sm text-gray-600 mt-1">Fill in your restaurant details including:</p>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mt-1">
                          <li>restaurant name</li>
                          <li>owner details</li>
                          <li>address</li>
                          <li>FSSAI details</li>
                          <li>bank information</li>
                          <li>menu details</li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-2">Our onboarding team can also assist you during registration.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">2</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Upload Your Menu</h4>
                        <p className="text-sm text-gray-600 mt-1">Upload your menu with:</p>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mt-1">
                          <li>item names</li>
                          <li>prices</li>
                          <li>food descriptions</li>
                          <li>category sections</li>
                          <li>food images</li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-2">Our team can help digitize your menu if needed.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">3</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Verification &amp; Approval</h4>
                        <p className="text-sm text-gray-600 mt-1">Our team reviews your documents and restaurant details.</p>
                        <p className="text-sm font-medium text-gray-700 mt-2">Verification generally includes:</p>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mt-1">
                          <li>FSSAI / compliance check</li>
                          <li>menu validation</li>
                          <li>location verification</li>
                          <li>payout setup</li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-2">Approval timeline: 24-48 hours</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold">4</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Go Live &amp; Start Receiving Orders</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Once approved, your restaurant goes live on FlashBites and starts receiving customer orders
                          through the app and website.
                        </p>
                        <p className="text-sm text-gray-600 mt-2">You can manage orders directly from your dashboard in real time.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary-50 rounded-lg p-6 space-y-5">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Commercial Terms</h3>
                    <h4 className="font-semibold text-gray-900 mb-1">Transparent Commission Model</h4>
                    <p className="text-sm text-gray-700">
                      FlashBites charges a 20-25% commission per completed order, depending on location, category, and
                      support services. No hidden charges are applied.
                    </p>
                    <h4 className="font-semibold text-gray-900 mt-3 mb-1">Optional Marketing Plans</h4>
                    <p className="text-sm text-gray-700">
                      Restaurants can opt for featured promotions and premium marketing plans starting from Rs 5,000 - Rs 20,000 per
                      month or an additional 15-18% promotional commission, depending on campaign type.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Who Can Join</h3>
                    <ul className="grid md:grid-cols-2 list-disc pl-5 text-sm text-gray-700 gap-y-1">
                      <li>veg restaurants</li>
                      <li>non-veg restaurants</li>
                      <li>bakeries</li>
                      <li>cafes</li>
                      <li>street food vendors</li>
                      <li>home kitchens</li>
                      <li>cloud kitchens</li>
                      <li>local dhabas</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Required Documents</h3>
                    <p className="text-sm text-gray-700 mb-2">Keep these ready for faster onboarding:</p>
                    <ul className="grid md:grid-cols-2 list-disc pl-5 text-sm text-gray-700 gap-y-1">
                      <li>FSSAI registration / license</li>
                      <li>PAN details</li>
                      <li>bank account details</li>
                      <li>owner ID proof</li>
                      <li>GST details (if applicable)</li>
                      <li>menu / food photos</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-primary-100 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Growing with FlashBites</h3>
                  <p className="text-gray-700 mb-4">
                    Take your restaurant online and start reaching more customers with FlashBites.
                  </p>
                  <p className="text-gray-700 mb-5">Partner with us today and grow your food business faster.</p>

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setActiveSection('restaurantRegistration')}
                      className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                    >
                      Register Your Restaurant
                    </button>
                    <button
                      onClick={() => setActiveSection('contact')}
                      className="bg-white text-primary-600 border-2 border-primary-600 px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors font-semibold"
                    >
                      Talk to Onboarding Team
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Registration Form */}
        {activeSection === 'restaurantRegistration' && (
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setActiveSection('restaurant')}
              className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              {t('partner.backToRestaurantPartner', 'Back to Restaurant Partner')}
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('partner.restaurantRegistrationForm', 'Restaurant Registration Form')}</h2>
                <p className="text-gray-600">
                  {t('partner.completeOnboardingForm', 'Complete the onboarding form with your restaurant details, required documents, and menu information.')}
                </p>
              </div>

              <form onSubmit={handleRestaurantSubmit} className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('partner.basicInformation', 'Basic Information')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="restaurantName"
                        value={restaurantFormData.restaurantName}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter restaurant name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Owner Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="ownerName"
                        value={restaurantFormData.ownerName}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter owner name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={restaurantFormData.email}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="owner@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={restaurantFormData.phone}
                        onChange={handleRestaurantChange}
                        required
                        pattern="[0-9]{10}"
                        maxLength="10"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alternate Phone
                      </label>
                      <input
                        type="tel"
                        name="alternatePhone"
                        value={restaurantFormData.alternatePhone}
                        onChange={handleRestaurantChange}
                        pattern="[0-9]{10}"
                        maxLength="10"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional alternate number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="businessType"
                        value={restaurantFormData.businessType}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select business type</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="cafe">Cafe</option>
                        <option value="bakery">Bakery</option>
                        <option value="cloud-kitchen">Cloud Kitchen</option>
                        <option value="street-food">Street Food Outlet</option>
                        <option value="dhaba">Dhaba</option>
                        <option value="home-kitchen">Home Kitchen</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cuisine Types <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="cuisineTypes"
                        value={restaurantFormData.cuisineTypes}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="North Indian, Chinese, Fast Food"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opening Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="openingTime"
                        value={restaurantFormData.openingTime}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Closing Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="closingTime"
                        value={restaurantFormData.closingTime}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Address / Location
                      </label>
                      <AddressInput
                        value={restaurantLocationSearch}
                        onChange={setRestaurantLocationSearch}
                        onSelect={handleRestaurantAddressSelect}
                        placeholder="Search your restaurant address"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Select from suggestions to auto-fill address and coordinates.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={restaurantFormData.address.street}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Shop/Building, street, area"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={restaurantFormData.address.city}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        value={restaurantFormData.address.state}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="State"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleUseCurrentRestaurantLocation}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <MapPinIcon className="h-5 w-5" />
                        Use Current Location
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={restaurantFormData.location.lat}
                        onChange={(e) => handleRestaurantLocationInput('lat', e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g. 31.520370"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={restaurantFormData.location.lng}
                        onChange={(e) => handleRestaurantLocationInput('lng', e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g. 75.857277"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <MapPicker
                        initialPosition={mapInitialPosition}
                        onSelect={handleRestaurantMapSelect}
                        mapHeight={280}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.pincode"
                        value={restaurantFormData.address.pincode}
                        onChange={handleRestaurantChange}
                        required
                        pattern="[0-9]{6}"
                        maxLength="6"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="6-digit PIN code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Landmark
                      </label>
                      <input
                        type="text"
                        name="address.landmark"
                        value={restaurantFormData.address.landmark}
                        onChange={handleRestaurantChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional landmark"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal and Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        FSSAI License Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fssaiLicenseNumber"
                        value={restaurantFormData.fssaiLicenseNumber}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter FSSAI license number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="gstNumber"
                        value={restaurantFormData.gstNumber}
                        onChange={handleRestaurantChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional GST number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        name="panNumber"
                        value={restaurantFormData.panNumber}
                        onChange={handleRestaurantChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional PAN number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Holder Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankDetails.accountHolderName"
                        value={restaurantFormData.bankDetails.accountHolderName}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="As per bank records"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankDetails.accountNumber"
                        value={restaurantFormData.bankDetails.accountNumber}
                        onChange={handleRestaurantChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Bank account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IFSC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankDetails.ifscCode"
                        value={restaurantFormData.bankDetails.ifscCode}
                        onChange={handleRestaurantChange}
                        required
                        pattern="[A-Z]{4}0[A-Z0-9]{6}"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g. SBIN0001234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UPI ID
                      </label>
                      <input
                        type="text"
                        name="bankDetails.upiId"
                        value={restaurantFormData.bankDetails.upiId}
                        onChange={handleRestaurantChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional UPI ID"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{t('partner.menuItemDetails', 'Menu Item Details')}</h3>
                    <button
                      type="button"
                      onClick={addRestaurantMenuItem}
                      className="text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      + {t('partner.addMenuItem', 'Add Menu Item')}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {restaurantFormData.menuItems.map((item, index) => (
                      <div key={`menu-item-${index}`} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{t('partner.item', 'Item')} {index + 1}</h4>
                          {restaurantFormData.menuItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRestaurantMenuItem(index)}
                              className="text-red-600 hover:text-red-700 text-sm font-semibold"
                            >
                              {t('partner.remove', 'Remove')}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleRestaurantMenuItemChange(index, 'name', e.target.value)}
                            placeholder={t('partner.itemName', 'Item name')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={item.nameHi || ''}
                            onChange={(e) => handleRestaurantMenuItemChange(index, 'nameHi', e.target.value)}
                            placeholder={t('partner.itemNameHindiOptional', 'Item name in Hindi (optional)')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleRestaurantMenuItemChange(index, 'category', e.target.value)}
                            placeholder={t('partner.category', 'Category')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            min="1"
                            value={item.price}
                            onChange={(e) => handleRestaurantMenuItemChange(index, 'price', e.target.value)}
                            placeholder={t('partner.price', 'Price')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleRestaurantMenuItemChange(index, 'description', e.target.value)}
                            placeholder={t('partner.description', 'Description')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={item.descriptionHi || ''}
                            onChange={(e) => handleRestaurantMenuItemChange(index, 'descriptionHi', e.target.value)}
                            placeholder={t('partner.descriptionHindiOptional', 'Description in Hindi (optional)')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('partner.documentUploads', 'Document Uploads')}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('partner.uploadDocsHelp', 'Upload PDF/JPG/PNG files, maximum 5MB each.')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        FSSAI License Copy <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleRestaurantDocumentChange(e, 'fssaiLicense')}
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
                        required
                      />
                      {restaurantDocuments.fssaiLicense && (
                        <p className="text-xs text-gray-500 mt-1">{restaurantDocuments.fssaiLicense.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Menu Document / Menu Card <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleRestaurantDocumentChange(e, 'menuDocument')}
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
                        required
                      />
                      {restaurantDocuments.menuDocument && (
                        <p className="text-xs text-gray-500 mt-1">{restaurantDocuments.menuDocument.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Owner ID Proof <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleRestaurantDocumentChange(e, 'ownerIdProof')}
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
                        required
                      />
                      {restaurantDocuments.ownerIdProof && (
                        <p className="text-xs text-gray-500 mt-1">{restaurantDocuments.ownerIdProof.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cancelled Cheque / Bank Proof
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleRestaurantDocumentChange(e, 'cancelledCheque')}
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
                      />
                      {restaurantDocuments.cancelledCheque && (
                        <p className="text-xs text-gray-500 mt-1">{restaurantDocuments.cancelledCheque.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-5">
                  <h3 className="text-lg font-semibold text-gray-900">{t('partner.restaurantTermsTitle', 'FlashBites Restaurant Partner Terms')}</h3>

                  <div className="max-h-80 overflow-y-auto pr-2 space-y-4 text-sm text-gray-700">
                    <p>
                      Welcome to FlashBites.
                    </p>

                    <p>
                      By submitting the restaurant onboarding form and joining the FlashBites platform, you agree to the
                      following Restaurant Partner Terms.
                    </p>

                    <p>
                      These terms outline the basic responsibilities, commercial structure, payout process, and
                      operational guidelines for listing your restaurant on FlashBites.
                    </p>

                    <p>
                      Please read these terms carefully before proceeding.
                    </p>

                    <div>
                      <h4 className="font-semibold text-gray-900">1. Platform Role</h4>
                      <p>FlashBites is a technology platform that connects customers with restaurant partners and delivery partners.</p>
                      <p>FlashBites does not prepare, cook, own, or sell food items.</p>
                      <p>All food items listed on the platform are solely prepared, owned, and sold by the Restaurant Partner.</p>
                      <p>The sale of food takes place directly between the customer and the Restaurant Partner.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">2. Restaurant Responsibilities</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>provide fresh, hygienic, and safe food</li>
                        <li>maintain accurate menu items and pricing</li>
                        <li>ensure availability of listed items</li>
                        <li>accept and prepare orders on time</li>
                        <li>use proper packaging</li>
                        <li>comply with FSSAI and applicable food safety laws</li>
                        <li>maintain professional conduct with customers and delivery partners</li>
                      </ul>
                      <p className="mt-2">You are responsible for keeping your restaurant details and menu updated.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">3. Pricing and Menu Control</h4>
                      <p>You retain full control over:</p>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>menu pricing</li>
                        <li>item descriptions</li>
                        <li>availability</li>
                        <li>special offers</li>
                      </ul>
                      <p>
                        FlashBites will not change your menu pricing without your approval.
                      </p>
                      <p>Promotional discounts and campaign offers may be run only with mutual consent.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">4. Commission and Fees</h4>
                      <p>FlashBites charges a platform commission on every successfully completed order.</p>
                      <p>The commission percentage may vary depending on location, category, and services provided.</p>
                      <p>The applicable commission will be communicated during onboarding.</p>
                      <p>No hidden charges will be applied.</p>
                      <p>
                        Optional marketing and featured listing services may be available separately.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">5. Payments and Settlements</h4>
                      <p>
                        FlashBites collects customer payments on your behalf and settles the payable amount after
                        deducting:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>commission</li>
                        <li>taxes</li>
                        <li>approved refund adjustments</li>
                      </ul>
                      <p>
                        Payouts are processed on a weekly basis and are generally settled within 3 to 5 working days.
                      </p>
                      <p>A detailed payout statement will be shared through your dashboard.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">6. Refund and Complaint Responsibility</h4>
                      <p>You are responsible for issues arising from:</p>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>food quality</li>
                        <li>stale or unsafe food</li>
                        <li>wrong or missing items</li>
                        <li>preparation errors</li>
                      </ul>
                      <p className="mt-2">FlashBites will handle delivery-related issues including:</p>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>rider misconduct</li>
                        <li>delivery delay</li>
                        <li>transit damage</li>
                        <li>technical platform issues</li>
                      </ul>
                      <p>
                        In disputed cases, the issue may be jointly reviewed.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">7. Delivery Services</h4>
                      <p>
                        Where FlashBites provides delivery support, our delivery partners will handle order pickup and
                        delivery.
                      </p>
                      <p>FlashBites is responsible for rider operations and delivery flow.</p>
                      <p>Restaurants are expected to hand over orders in a timely and properly packed manner.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">8. Legal Compliance</h4>
                      <p>You confirm that your restaurant complies with all applicable laws including:</p>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>FSSAI registration / license</li>
                        <li>GST compliance (where applicable)</li>
                        <li>local business licenses</li>
                        <li>tax regulations</li>
                      </ul>
                      <p>
                        FlashBites may request verification documents during onboarding or at any time.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">9. Non-Exclusivity</h4>
                      <p>Your partnership with FlashBites is non-exclusive.</p>
                      <p>You are free to list your restaurant on other platforms and continue offline operations.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">10. Suspension and Termination</h4>
                      <p>FlashBites reserves the right to suspend or remove listings in cases involving:</p>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>fraud</li>
                        <li>unsafe food</li>
                        <li>legal non-compliance</li>
                        <li>repeated order issues</li>
                        <li>customer complaints</li>
                        <li>misuse of the platform</li>
                      </ul>
                      <p>
                        Either party may terminate the partnership with prior notice.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">11. Acceptance</h4>
                      <p>
                        By submitting the onboarding form, you confirm that:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>all information provided is correct</li>
                        <li>you agree to these terms</li>
                        <li>you consent to onboarding and listing on FlashBites</li>
                      </ul>
                      <p className="mt-2">For full legal agreement details, please contact our onboarding team.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="acceptTerms"
                        checked={restaurantFormData.acceptTerms}
                        onChange={handleRestaurantChange}
                        className="mt-1"
                      />
                      <span>
                        {t('partner.acceptRestaurantTerms', 'I have read and accept the FlashBites Restaurant Partner Terms.')}
                      </span>
                    </label>

                    <label className="flex items-start gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="acceptAgreement"
                        checked={restaurantFormData.acceptAgreement}
                        onChange={handleRestaurantChange}
                        className="mt-1"
                      />
                      <span>
                        {t('partner.acceptPartnerAgreement', 'I agree to the Partner Agreement, onboarding process, and operational guidelines.')}
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={restaurantLoading}
                  className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
                >
                  {restaurantLoading ? t('partner.submitting', 'Submitting...') : t('partner.submitRestaurantRegistration', 'Submit Restaurant Registration')}
                </button>

                <p className="text-sm text-gray-600 text-center">
                  {t('partner.submissionSentToAdmin', 'Submission details are sent to admin at info.flashbites@gmail.com for approval and tracking. New restaurant login credentials are shared with the owner after verification.')}
                </p>
              </form>
            </div>
          </div>
        )}

        {/* Delivery Partner Section */}
        {activeSection === 'delivery' && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <TruckIcon className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Become a Delivery Partner
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Join FlashBites as a delivery partner and earn flexible income. Fill out the form below to get started.
              </p>
            </div>

            {/* Benefits Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Why Join Us?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-primary-600 font-bold text-2xl mb-1">₹15,000 - ₹30,000</div>
                  <div className="text-sm text-gray-600">Monthly Earnings (Flexible)</div>
                </div>
                <div className="text-center">
                  <div className="text-primary-600 font-bold text-2xl mb-1">Flexible</div>
                  <div className="text-sm text-gray-600">Working Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-primary-600 font-bold text-2xl mb-1">Weekly</div>
                  <div className="text-sm text-gray-600">{t('partner.paymentCycle', 'Payment Cycle')}</div>
                </div>
              </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-primary-600" />
              {t('partner.personalInformation', 'Personal Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10-digit mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone <span className="text-red-500"></span>
                </label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  // required
                  // pattern="[0-9]{10}"
                  // maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Alternate contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhar Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{12}"
                  maxLength="12"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="12-digit Aadhar number"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2 text-primary-600" />
              {t('partner.address', 'Address')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="House/Flat number, Street name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{6}"
                  maxLength="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="6-digit PIN code"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TruckIcon className="h-5 w-5 mr-2 text-primary-600" />
              {t('partner.vehicleInformation', 'Vehicle Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="bike">Bike/Scooter</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., UP12AB1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Honda Activa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driving License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="DL number"
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600" />
              {t('partner.bankDetails', 'Bank Details')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.accountHolderName"
                  value={formData.bankAccount.accountHolderName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="As per bank records"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.accountNumber"
                  value={formData.bankAccount.accountNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Bank account number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccount.ifscCode"
                  value={formData.bankAccount.ifscCode}
                  onChange={handleChange}
                  required
                  pattern="[A-Z]{4}0[A-Z0-9]{6}"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., SBIN0001234"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PhoneIcon className="h-5 w-5 mr-2 text-primary-600" />
              {t('partner.emergencyContact', 'Emergency Contact')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="emergencyContact.name"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="emergencyContact.phone"
                  value={formData.emergencyContact.phone}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10-digit number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="emergencyContact.relation"
                  value={formData.emergencyContact.relation}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Father, Mother"
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CameraIcon className="h-5 w-5 mr-2 text-primary-600" />
              {t('partner.uploadDocuments', 'Upload Documents')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('partner.uploadClearDocsHelp', 'Please upload clear images or PDF files (max 5MB each)')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Photo <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 transition-colors">
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => {
                          setDocuments(prev => ({ ...prev, photo: null }));
                          setPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <CameraIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <label className="cursor-pointer text-primary-600 hover:text-primary-700">
                        {t('partner.clickToUpload', 'Click to upload')}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => handleFileChange(e, 'photo')}
                          className="hidden"
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Driving License */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driving License <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 transition-colors">
                  {licensePreview ? (
                    <div className="relative">
                      <img src={licensePreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => {
                          setDocuments(prev => ({ ...prev, drivingLicense: null }));
                          setLicensePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <label className="cursor-pointer text-primary-600 hover:text-primary-700">
                        {t('partner.clickToUpload', 'Click to upload')}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={(e) => handleFileChange(e, 'drivingLicense')}
                          className="hidden"
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Aadhar Card */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhar Card <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 transition-colors">
                  {aadharPreview ? (
                    <div className="relative">
                      <img src={aadharPreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => {
                          setDocuments(prev => ({ ...prev, aadharCard: null }));
                          setAadharPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <label className="cursor-pointer text-primary-600 hover:text-primary-700">
                        {t('partner.clickToUpload', 'Click to upload')}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={(e) => handleFileChange(e, 'aadharCard')}
                          className="hidden"
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Submit */}
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                {t('partner.submitAgreementNote', 'By submitting this application, you agree to our terms and conditions. We will verify your documents and contact you within 3-5 business days.')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? t('partner.submitting', 'Submitting...') : t('partner.submitApplication', 'Submit Application')}
            </button>
          </div>
        </form>
          </div>
        )}

        {/* Career & Contact Sections */}
        {activeSection === 'career' && (
          <div className="max-w-4xl mx-auto mt-8">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <BriefcaseIcon className="h-12 w-12 text-primary-600 mr-4" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Career Opportunities</h2>
                  <p className="text-gray-600">Join our team and make an impact</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Why Work With Us?</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Impact at Scale</h4>
                        <p className="text-sm text-gray-600">Help transform food delivery in rural and semi-urban India.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Competitive Benefits</h4>
                        <p className="text-sm text-gray-600">Market-leading salary, health insurance, and perks.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Learning & Growth</h4>
                        <p className="text-sm text-gray-600">Continuous learning opportunities and career progression.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Startup Culture</h4>
                        <p className="text-sm text-gray-600">Fast-paced, innovative environment with ownership mindset.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Open Positions</h3>
                  <div className="space-y-4">
                    {/* Position 1 */}
                    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Senior Software Engineer</h4>
                          <p className="text-sm text-gray-600">Engineering • Full-time • Sitapur, UP</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">Open</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Build scalable backend systems and APIs. Work with Node.js, MongoDB, and cloud technologies.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Node.js</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">MongoDB</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">AWS</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">3+ years exp</span>
                      </div>
                      <button
                        onClick={() => setActiveSection('contact')}
                        className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                      >
                        Apply Now →
                      </button>
                    </div>

                    {/* Position 2 */}
                    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Operations Manager</h4>
                          <p className="text-sm text-gray-600">Operations • Full-time • Sitapur, UP</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">Open</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Manage restaurant partnerships, delivery operations, and ensure excellent customer experience.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Operations</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Team Management</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">2+ years exp</span>
                      </div>
                      <button
                        onClick={() => setActiveSection('contact')}
                        className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                      >
                        Apply Now →
                      </button>
                    </div>

                    {/* Position 3 */}
                    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Marketing Manager</h4>
                          <p className="text-sm text-gray-600">Marketing • Full-time • Remote</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">Open</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        Lead marketing campaigns, brand building, and customer acquisition strategies.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Digital Marketing</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">Brand Strategy</span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">2+ years exp</span>
                      </div>
                      <button
                        onClick={() => setActiveSection('contact')}
                        className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                      >
                        Apply Now →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Don't See Your Role?</h3>
                  <p className="text-gray-600 mb-4">
                    We're always looking for talented individuals. Send us your resume and we'll keep you in mind for future opportunities.
                  </p>
                  <button
                    onClick={() => setActiveSection('contact')}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                  >
                    Send Resume
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Section */}
        {activeSection === 'contact' && (
          <div className="max-w-2xl mx-auto mt-8">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
              Back to Overview
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <EnvelopeIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h2>
                <p className="text-gray-600">We'd love to hear from you. Reach out for any partnership inquiries or career opportunities.</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start">
                  <PhoneIcon className="h-6 w-6 text-primary-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <a href="tel:+917068247779" className="text-primary-600 hover:text-primary-700">
                      +91 70682 47779
                    </a>
                    <p className="text-sm text-gray-500 mt-1">Mon-Sat, 9 AM - 6 PM</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <EnvelopeIcon className="h-6 w-6 text-primary-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <div className="space-y-1">
                      {/* <div>
                        <span className="text-sm text-gray-600">Restaurant Partnership: </span>
                        <a href="mailto:restaurants@flashbites.com" className="text-primary-600 hover:text-primary-700">
                          restaurants@flashbites.com
                        </a>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Delivery Partnership: </span>
                        <a href="mailto:delivery@flashbites.com" className="text-primary-600 hover:text-primary-700">
                          delivery@flashbites.com
                        </a>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Careers: </span>
                        <a href="mailto:careers@flashbites.com" className="text-primary-600 hover:text-primary-700">
                          careers@flashbites.com
                        </a>
                      </div> */}
                      <div>
                        <span className="text-sm text-gray-600">General: </span>
                        <a href="mailto:info.flashbites@gmail.com" className="text-primary-600 hover:text-primary-700">
                          info.flashbites@gmail.com
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPinIcon className="h-6 w-6 text-primary-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Office</h3>
                    <p className="text-gray-600">
                      FlashBites Headquarters<br />
                      Sitapur, Uttar Pradesh, India<br />
                      PIN: 261303
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveSection('restaurant')}
                    className="flex items-center justify-center px-4 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-semibold"
                  >
                    <BuildingStorefrontIcon className="h-5 w-5 mr-2" />
                    Restaurant Partner
                  </button>
                  <button
                    onClick={() => setActiveSection('delivery')}
                    className="flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                  >
                    <TruckIcon className="h-5 w-5 mr-2" />
                    Delivery Partner
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Partner;
