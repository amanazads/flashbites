import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  TruckIcon,
  ChartBarIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getRestaurants, updateRestaurant } from '../api/restaurantApi';
import { getAllPartnerApplications, approvePartner, rejectPartner } from '../api/partnerApi';
import {
  getComprehensiveAnalytics,
  getAccountDeletionRequests,
  reviewAccountDeletionRequest,
  getDeliveryPartnerDutyBoard,
  getDeliveryTrackingDashboard,
  getDeliveryPartnerEarningsControl,
  updateGlobalDeliveryPartnerEarningsConfig,
  updateDeliveryPartnerEarningsConfig,
  resetAllDeliveryPartnerEarningsOverrides,
  updateRestaurantPayoutRate,
  updateUserRole,
  getPlatformSettings,
  updatePlatformSettings,
  blockUser,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} from '../api/adminApi';
import { updateOrderStatus, cancelOrder } from '../api/orderApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/constants';
import axios from '../api/axios';
import socketService from '../services/socketService';
import RestaurantLocationModal from '../components/admin/RestaurantLocationModal';

const MENU_CATEGORIES = [
  'Starters',
  'Main Course',
  'Desserts',
  'Beverages',
  'Breads',
  'Rice',
  'Snacks',
  'Fast Food',
  'Pizza',
  'Burger',
  'South Indian',
  'North Indian',
  'Chinese',
  'Paneer',
  'Cake',
  'Biryani',
  'Veg Meal',
  'Noodles',
  'Sandwich',
  'Dosa',
  'Italian',
  'Momos',
  'Chaap',
  'Fries',
  'Shakes',
  'Coffee'
];
const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'restaurant_owner', label: 'Restaurant Owner' },
  { value: 'delivery_partner', label: 'Delivery Partner' },
  { value: 'admin', label: 'Admin' },
];

const ORDER_STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
];

const AdminPanel = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [dutyBoard, setDutyBoard] = useState([]);
  const [trackingOrders, setTrackingOrders] = useState([]);
  const [trackingSummary, setTrackingSummary] = useState({
    totalActiveOrders: 0,
    outForDeliveryCount: 0,
    readyCount: 0,
    assignedCount: 0,
  });
  const [dutySummary, setDutySummary] = useState({
    totalPartners: 0,
    onDutyCount: 0,
    offDutyCount: 0,
    activelyDeliveringCount: 0
  });
  const [menuItems, setMenuItems] = useState([]);
  const [deliveryEarningsGlobal, setDeliveryEarningsGlobal] = useState({
    perOrder: 40,
    bonusThreshold: 13,
    bonusAmount: 850
  });
  const [deliveryEarningsPartners, setDeliveryEarningsPartners] = useState([]);
  const [deliveryEarningsSaving, setDeliveryEarningsSaving] = useState(false);
  const [partnerEarningDrafts, setPartnerEarningDrafts] = useState({});
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [menuLoading, setMenuLoading] = useState(false);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    commissionPercent: 25,
    deliveryFee: 40,
    platformFee: 25,
    taxRate: 5,
    restaurantPayoutRate: 75,
    deliveryChargeRules: [
      { minDistance: 0, maxDistance: 5, charge: 0 },
      { minDistance: 5, maxDistance: 15, charge: 25 },
      { minDistance: 15, maxDistance: 9999, charge: 30 }
    ],
    promoBanners: []
  });
  const [restaurantPayoutDrafts, setRestaurantPayoutDrafts] = useState({});
  const [restaurantPayoutSavingId, setRestaurantPayoutSavingId] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    totalPartners: 0,
    pendingPartners: 0,
    pendingDeletionRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    if (!autoRefreshEnabled || user?.role !== 'admin') return;

    const interval = setInterval(() => {
      fetchData();
      console.log('Admin panel auto-refreshed');
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, user]);

  // Socket.IO listener for new orders (admin receives all new orders)
  useEffect(() => {
    if (user?.role !== 'admin') return;

    const handleNewOrder = (data) => {
      console.log('🔄 Admin: Auto-refreshing data on order event:', data.type);
      
      // Refresh data silently, global useNotifications handles UI
      if (autoRefreshEnabled && activeTab === 'orders') {
        fetchData();
      }
    };

    const handleOrderFinancialUpdate = () => {
      if (['overview', 'earnings', 'analytics', 'orders'].includes(activeTab)) {
        fetchData();
      }
    };

    socketService.onNewOrder(handleNewOrder);
    socketService.on('orderUpdate', handleOrderFinancialUpdate);

    return () => {
      socketService.off('new-order');
      socketService.off('orderUpdate');
    };
  }, [user, activeTab, autoRefreshEnabled]);

  // Recalculate stats when data changes
  useEffect(() => {
    const pendingApprovals = restaurants.filter(r => !r.isApproved).length;
    const pendingPartners = partners.filter(p => p.status === 'pending').length;
    const pendingDeletionRequests = deletionRequests.filter(r => r.status === 'pending').length;
    setStats({
      totalRestaurants: restaurants.length,
      totalUsers: users.length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      pendingApprovals,
      totalPartners: partners.length,
      pendingPartners,
      pendingDeletionRequests,
    });
  }, [restaurants, users, orders, partners, deletionRequests]);

  useEffect(() => {
    if (!selectedRestaurantId && restaurants.length > 0) {
      setSelectedRestaurantId(restaurants[0]._id);
    }
  }, [restaurants, selectedRestaurantId]);

  useEffect(() => {
    if (activeTab === 'menu-items' && selectedRestaurantId) {
      fetchRestaurantMenu(selectedRestaurantId);
    }
  }, [activeTab, selectedRestaurantId]);

  useEffect(() => {
    if (activeTab === 'fees' || activeTab === 'content' || activeTab === 'earnings') {
      fetchPlatformSettings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'coupons') {
      fetchCoupons();
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch restaurants from admin endpoint
      try {
        const restaurantsRes = await axios.get('/admin/restaurants');
        const restaurantsList = restaurantsRes.data?.data?.restaurants || restaurantsRes.data?.restaurants || [];
        console.log('Admin restaurants loaded:', restaurantsList.length);
        setRestaurants(restaurantsList);
        setRestaurantPayoutDrafts((prev) => {
          const next = {};
          restaurantsList.forEach((restaurant) => {
            const existing = prev[restaurant._id];
            if (existing !== undefined) {
              next[restaurant._id] = existing;
              return;
            }
            const override = Number(restaurant.payoutRateOverride);
            next[restaurant._id] = Number.isFinite(override) ? String(override * 100) : '';
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to load restaurants:', err);
        toast.error('Failed to load restaurants');
      }
      
      // Fetch users
      try {
        const usersRes = await axios.get('/admin/users');
        setUsers(usersRes.data?.data?.users || []);
      } catch (err) {
        console.log('Users endpoint not available yet');
      }
      
      // Fetch orders
      try {
        const ordersRes = await axios.get('/admin/orders');
        setOrders(ordersRes.data?.data?.orders || []);
      } catch (err) {
        console.log('Orders endpoint not available yet');
      }
      
      // Fetch partners
      try {
        const partnersRes = await getAllPartnerApplications();
        setPartners(partnersRes.data?.partners || []);
      } catch (err) {
        console.log('Partners endpoint not available yet');
      }

      // Fetch delivery partner duty board
      try {
        const dutyBoardRes = await getDeliveryPartnerDutyBoard();
        const dutyData = dutyBoardRes?.data?.data?.dutyBoard || [];
        const summary = dutyBoardRes?.data?.data?.summary || {};
        setDutyBoard(dutyData);
        setDutySummary({
          totalPartners: summary.totalPartners || 0,
          onDutyCount: summary.onDutyCount || 0,
          offDutyCount: summary.offDutyCount || 0,
          activelyDeliveringCount: summary.activelyDeliveringCount || 0
        });
      } catch (err) {
        console.log('Duty board endpoint not available yet');
      }

      // Fetch delivery tracking dashboard
      try {
        const trackingRes = await getDeliveryTrackingDashboard();
        setTrackingOrders(trackingRes?.data?.data?.orders || []);
        setTrackingSummary({
          totalActiveOrders: trackingRes?.data?.data?.totalActiveOrders || 0,
          outForDeliveryCount: trackingRes?.data?.data?.outForDeliveryCount || 0,
          readyCount: trackingRes?.data?.data?.readyCount || 0,
          assignedCount: trackingRes?.data?.data?.assignedCount || 0,
        });
      } catch (err) {
        console.log('Delivery tracking endpoint not available yet');
      }

      // Fetch delivery earnings controls
      try {
        const earningsRes = await getDeliveryPartnerEarningsControl();
        const payload = earningsRes?.data?.data || {};
        const globalConfig = payload.globalConfig || {
          perOrder: 40,
          bonusThreshold: 13,
          bonusAmount: 850
        };
        const partnerControls = payload.partners || [];
        setDeliveryEarningsGlobal(globalConfig);
        setDeliveryEarningsPartners(partnerControls);

        const drafts = partnerControls.reduce((acc, partner) => {
          acc[partner._id] = {
            perOrder: partner.effectiveConfig?.perOrder ?? globalConfig.perOrder,
            bonusThreshold: partner.effectiveConfig?.bonusThreshold ?? globalConfig.bonusThreshold,
            bonusAmount: partner.effectiveConfig?.bonusAmount ?? globalConfig.bonusAmount
          };
          return acc;
        }, {});
        setPartnerEarningDrafts(drafts);
      } catch (err) {
        console.log('Delivery earnings endpoint not available yet');
      }

      // Fetch account deletion requests
      try {
        const requestsRes = await getAccountDeletionRequests({ limit: 100 });
        setDeletionRequests(requestsRes.data?.data?.requests || []);
      } catch (err) {
        console.log('Account deletion requests endpoint not available yet');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const response = await getPlatformSettings();
      const settings = response?.data?.settings;
      if (settings) {
        setPlatformSettings(settings);
        setSettingsForm({
          commissionPercent: settings.commissionPercent ?? 25,
          deliveryFee: settings.deliveryFee ?? 40,
          platformFee: settings.platformFee ?? 25,
          taxRate: (settings.taxRate ?? 0.05) * 100,
          restaurantPayoutRate: (settings.restaurantPayoutRate ?? 0.75) * 100,
          deliveryChargeRules: settings.deliveryChargeRules || [
            { minDistance: 0, maxDistance: 5, charge: 0 },
            { minDistance: 5, maxDistance: 15, charge: 25 },
            { minDistance: 15, maxDistance: 9999, charge: 30 }
          ],
          promoBanners: settings.promoBanners || []
        });
      }
    } catch (error) {
      toast.error('Failed to load platform settings');
    }
  };

  const fetchCoupons = async () => {
    try {
      setCouponsLoading(true);
      const response = await getCoupons({ limit: 200 });
      const list = response?.data?.coupons || response?.data?.data?.coupons || [];
      setCoupons(list);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    const restaurantOptions = restaurants
      .map((r) => `<option value="${r._id}">${r.name}</option>`)
      .join('');

    const result = await Swal.fire({
      title: 'Create Coupon',
      html: `
        <input id="swal-code" class="swal2-input" placeholder="CODE" />
        <textarea id="swal-desc" class="swal2-textarea" placeholder="Description"></textarea>
        <select id="swal-discountType" class="swal2-select">
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
        </select>
        <input id="swal-discountValue" class="swal2-input" type="number" min="0" placeholder="Discount value" />
        <input id="swal-minOrder" class="swal2-input" type="number" min="0" placeholder="Min order value" />
        <input id="swal-maxDiscount" class="swal2-input" type="number" min="0" placeholder="Max discount (optional)" />
        <input id="swal-validFrom" class="swal2-input" type="date" />
        <input id="swal-validTill" class="swal2-input" type="date" />
        <input id="swal-usageLimit" class="swal2-input" type="number" min="0" placeholder="Usage limit (optional)" />
        <label class="swal2-checkbox" style="display:flex;align-items:center;gap:8px;">
          <input id="swal-isActive" type="checkbox" checked /> Active
        </label>
        <label class="swal2-checkbox" style="display:flex;align-items:center;gap:8px;">
          <input id="swal-autoApply" type="checkbox" /> Auto apply
        </label>
        <label class="swal2-checkbox" style="display:flex;align-items:center;gap:8px;">
          <input id="swal-userSpecific" type="checkbox" /> User specific
        </label>
        <input id="swal-userIds" class="swal2-input" placeholder="User IDs (comma-separated)" />
        <select id="swal-restaurants" class="swal2-select" multiple style="height:120px;">
          ${restaurantOptions}
        </select>
        <p style="font-size:12px;color:#6B7280;margin-top:4px;">Leave restaurants empty for all restaurants.</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create',
      preConfirm: () => {
        const code = document.getElementById('swal-code')?.value?.trim();
        const description = document.getElementById('swal-desc')?.value?.trim();
        const discountType = document.getElementById('swal-discountType')?.value;
        const discountValue = Number(document.getElementById('swal-discountValue')?.value);
        const minOrderValue = Number(document.getElementById('swal-minOrder')?.value || 0);
        const maxDiscountValue = document.getElementById('swal-maxDiscount')?.value;
        const maxDiscount = maxDiscountValue ? Number(maxDiscountValue) : null;
        const validFrom = document.getElementById('swal-validFrom')?.value;
        const validTill = document.getElementById('swal-validTill')?.value;
        const usageLimitValue = document.getElementById('swal-usageLimit')?.value;
        const usageLimit = usageLimitValue ? Number(usageLimitValue) : null;
        const isActive = document.getElementById('swal-isActive')?.checked;
        const autoApply = document.getElementById('swal-autoApply')?.checked;
        const userSpecific = document.getElementById('swal-userSpecific')?.checked;
        const userIdsRaw = document.getElementById('swal-userIds')?.value || '';
        const userIds = userIdsRaw
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        const selected = document.getElementById('swal-restaurants')?.selectedOptions || [];
        const applicableRestaurants = Array.from(selected).map((opt) => opt.value);

        if (!code || !description || !discountType || Number.isNaN(discountValue)) {
          Swal.showValidationMessage('Provide code, description, discount type, and discount value');
          return false;
        }
        if (!validFrom || !validTill) {
          Swal.showValidationMessage('Provide valid start and end dates');
          return false;
        }

        return {
          code,
          description,
          discountType,
          discountValue,
          minOrderValue,
          maxDiscount,
          validFrom,
          validTill,
          usageLimit,
          isActive,
          autoApply,
          userSpecific,
          applicableUsers: userSpecific ? userIds : [],
          applicableRestaurants
        };
      }
    });

    if (!result.isConfirmed) return;

    try {
      await createCoupon(result.value);
      toast.success('Coupon created');
      fetchCoupons();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create coupon');
    }
  };

  const handleEditCoupon = async (coupon) => {
    const restaurantOptions = restaurants
      .map((r) => `<option value="${r._id}" ${coupon.applicableRestaurants?.some((id) => id.toString() === r._id.toString()) ? 'selected' : ''}>${r.name}</option>`)
      .join('');

    const result = await Swal.fire({
      title: 'Edit Coupon',
      html: `
        <input id="swal-code" class="swal2-input" placeholder="CODE" value="${coupon.code || ''}" />
        <textarea id="swal-desc" class="swal2-textarea" placeholder="Description">${coupon.description || ''}</textarea>
        <select id="swal-discountType" class="swal2-select">
          <option value="percentage" ${coupon.discountType === 'percentage' ? 'selected' : ''}>Percentage</option>
          <option value="fixed" ${coupon.discountType === 'fixed' ? 'selected' : ''}>Fixed</option>
        </select>
        <input id="swal-discountValue" class="swal2-input" type="number" min="0" placeholder="Discount value" value="${coupon.discountValue || 0}" />
        <input id="swal-minOrder" class="swal2-input" type="number" min="0" placeholder="Min order value" value="${coupon.minOrderValue || 0}" />
        <input id="swal-maxDiscount" class="swal2-input" type="number" min="0" placeholder="Max discount (optional)" value="${coupon.maxDiscount || ''}" />
        <input id="swal-validFrom" class="swal2-input" type="date" value="${coupon.validFrom ? coupon.validFrom.slice(0, 10) : ''}" />
        <input id="swal-validTill" class="swal2-input" type="date" value="${coupon.validTill ? coupon.validTill.slice(0, 10) : ''}" />
        <input id="swal-usageLimit" class="swal2-input" type="number" min="0" placeholder="Usage limit (optional)" value="${coupon.usageLimit || ''}" />
        <label class="swal2-checkbox" style="display:flex;align-items:center;gap:8px;">
          <input id="swal-isActive" type="checkbox" ${coupon.isActive ? 'checked' : ''} /> Active
        </label>
        <label class="swal2-checkbox" style="display:flex;align-items:center;gap:8px;">
          <input id="swal-autoApply" type="checkbox" ${coupon.autoApply ? 'checked' : ''} /> Auto apply
        </label>
        <label class="swal2-checkbox" style="display:flex;align-items:center;gap:8px;">
          <input id="swal-userSpecific" type="checkbox" ${coupon.userSpecific ? 'checked' : ''} /> User specific
        </label>
        <input id="swal-userIds" class="swal2-input" placeholder="User IDs (comma-separated)" value="${coupon.applicableUsers?.join(', ') || ''}" />
        <select id="swal-restaurants" class="swal2-select" multiple style="height:120px;">
          ${restaurantOptions}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save',
      preConfirm: () => {
        const code = document.getElementById('swal-code')?.value?.trim();
        const description = document.getElementById('swal-desc')?.value?.trim();
        const discountType = document.getElementById('swal-discountType')?.value;
        const discountValue = Number(document.getElementById('swal-discountValue')?.value);
        const minOrderValue = Number(document.getElementById('swal-minOrder')?.value || 0);
        const maxDiscountValue = document.getElementById('swal-maxDiscount')?.value;
        const maxDiscount = maxDiscountValue ? Number(maxDiscountValue) : null;
        const validFrom = document.getElementById('swal-validFrom')?.value;
        const validTill = document.getElementById('swal-validTill')?.value;
        const usageLimitValue = document.getElementById('swal-usageLimit')?.value;
        const usageLimit = usageLimitValue ? Number(usageLimitValue) : null;
        const isActive = document.getElementById('swal-isActive')?.checked;
        const autoApply = document.getElementById('swal-autoApply')?.checked;
        const userSpecific = document.getElementById('swal-userSpecific')?.checked;
        const userIdsRaw = document.getElementById('swal-userIds')?.value || '';
        const userIds = userIdsRaw
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        const selected = document.getElementById('swal-restaurants')?.selectedOptions || [];
        const applicableRestaurants = Array.from(selected).map((opt) => opt.value);

        if (!code || !description || !discountType || Number.isNaN(discountValue)) {
          Swal.showValidationMessage('Provide code, description, discount type, and discount value');
          return false;
        }
        if (!validFrom || !validTill) {
          Swal.showValidationMessage('Provide valid start and end dates');
          return false;
        }

        return {
          code,
          description,
          discountType,
          discountValue,
          minOrderValue,
          maxDiscount,
          validFrom,
          validTill,
          usageLimit,
          isActive,
          autoApply,
          userSpecific,
          applicableUsers: userSpecific ? userIds : [],
          applicableRestaurants
        };
      }
    });

    if (!result.isConfirmed) return;

    try {
      await updateCoupon(coupon._id, result.value);
      toast.success('Coupon updated');
      fetchCoupons();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (coupon) => {
    const result = await Swal.fire({
      title: 'Delete this coupon?',
      text: coupon.code,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete'
    });

    if (!result.isConfirmed) return;

    try {
      await deleteCoupon(coupon._id);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete coupon');
    }
  };

  const handleSettingsChange = (field, value) => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeliveryRuleChange = (index, field, value) => {
    setSettingsForm((prev) => {
      const rules = [...prev.deliveryChargeRules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, deliveryChargeRules: rules };
    });
  };

  const savePlatformSettings = async () => {
    try {
      setSettingsSaving(true);
      const payload = {
        commissionPercent: Number(settingsForm.commissionPercent),
        deliveryFee: Number(settingsForm.deliveryFee),
        platformFee: Number(settingsForm.platformFee),
        taxRate: Number(settingsForm.taxRate) / 100,
        restaurantPayoutRate: Number(settingsForm.restaurantPayoutRate) / 100,
        deliveryChargeRules: settingsForm.deliveryChargeRules.map((rule) => ({
          minDistance: Number(rule.minDistance),
          maxDistance: Number(rule.maxDistance),
          charge: Number(rule.charge)
        })),
        promoBanners: (settingsForm.promoBanners || []).map((banner, index) => ({
          tag: banner.tag || '',
          bold: banner.bold || '',
          sub: banner.sub || '',
          cta: banner.cta || '',
          bg: banner.bg || '',
          img: banner.img || '',
          isActive: banner.isActive !== false,
          sortOrder: Number.isFinite(Number(banner.sortOrder)) ? Number(banner.sortOrder) : index
        }))
      };

      await updatePlatformSettings(payload);
      toast.success('Platform settings updated');
      fetchPlatformSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const fetchAnalytics = async (period = analyticsPeriod) => {
    setAnalyticsLoading(true);
    try {
      const response = await getComprehensiveAnalytics({ period });
      setAnalytics(response.data.data);
      console.log('Analytics loaded:', response.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleApproveRestaurant = async (restaurantId) => {
    try {
      await axios.patch(`/admin/restaurants/${restaurantId}/approve`, {
        isApproved: true
      });
      toast.success('Restaurant approved');
      fetchData(); // Auto-refresh
    } catch (error) {
      toast.error('Failed to approve restaurant');
      console.error(error);
    }
  };

  const handleRejectRestaurant = async (restaurantId) => {
    const result = await Swal.fire({
      title: 'Reject this restaurant?',
      text: 'The restaurant owner will be notified.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Yes, reject it',
    });
    if (!result.isConfirmed) return;
    
    try {
      await axios.patch(`/admin/restaurants/${restaurantId}/approve`, {
        isApproved: false
      });
      toast.success('Restaurant rejected');
      fetchData(); // Auto-refresh
    } catch (error) {
      toast.error('Failed to reject restaurant');
      console.error(error);
    }
  };

  const handleApprovePartner = async (partnerId) => {
    try {
      await approvePartner(partnerId);
      toast.success('Partner application approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve partner');
      console.error(error);
    }
  };

  const handleRejectPartner = async (partnerId) => {
    const result = await Swal.fire({
      title: 'Reject Partner Application',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Enter your reason here...',
      inputAttributes: { 'aria-label': 'Reason for rejection' },
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Reject',
      inputValidator: (value) => {
        if (!value) return 'Please provide a rejection reason!';
      },
    });
    if (!result.isConfirmed) return;
    const reason = result.value;
    
    try {
      await rejectPartner(partnerId, reason);
      toast.success('Partner application rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject partner');
      console.error(error);
    }
  };

  const handleReviewDeletionRequest = async (requestId, action) => {
    const isApprove = action === 'approve';

    const result = await Swal.fire({
      title: isApprove ? 'Approve and delete account?' : 'Reject deletion request?',
      input: 'textarea',
      inputLabel: isApprove ? 'Optional admin note' : 'Reason for rejection',
      inputPlaceholder: isApprove ? 'Add optional note for records' : 'Enter rejection reason',
      showCancelButton: true,
      confirmButtonColor: isApprove ? '#16a34a' : '#ef4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: isApprove ? 'Approve & Delete' : 'Reject Request',
      inputValidator: (value) => {
        if (!isApprove && !value) return 'Please provide a rejection reason';
      },
    });

    if (!result.isConfirmed) return;

    try {
      await reviewAccountDeletionRequest(requestId, {
        action,
        adminNotes: result.value || ''
      });
      toast.success(isApprove ? 'Request approved and account deleted' : 'Request rejected');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to review request');
    }
  };

  const handleUpdateUserRole = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      toast.success('User role updated');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleSaveGlobalDeliveryEarnings = async () => {
    try {
      setDeliveryEarningsSaving(true);
      await updateGlobalDeliveryPartnerEarningsConfig({
        perOrder: Number(deliveryEarningsGlobal.perOrder),
        bonusThreshold: Number(deliveryEarningsGlobal.bonusThreshold),
        bonusAmount: Number(deliveryEarningsGlobal.bonusAmount)
      });
      toast.success('Global delivery earnings updated');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update global earnings');
    } finally {
      setDeliveryEarningsSaving(false);
    }
  };

  const handleSavePartnerDeliveryEarnings = async (partnerId) => {
    try {
      setDeliveryEarningsSaving(true);
      const draft = partnerEarningDrafts[partnerId];
      await updateDeliveryPartnerEarningsConfig(partnerId, {
        perOrder: Number(draft?.perOrder),
        bonusThreshold: Number(draft?.bonusThreshold),
        bonusAmount: Number(draft?.bonusAmount)
      });
      toast.success('Partner payout override saved');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update partner payout');
    } finally {
      setDeliveryEarningsSaving(false);
    }
  };

  const handleResetPartnerToGlobal = async (partnerId) => {
    try {
      setDeliveryEarningsSaving(true);
      await updateDeliveryPartnerEarningsConfig(partnerId, { resetToGlobal: true });
      toast.success('Partner payout reset to global');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reset partner payout');
    } finally {
      setDeliveryEarningsSaving(false);
    }
  };

  const handleResetAllPartnerOverrides = async () => {
    const result = await Swal.fire({
      title: 'Reset all partner overrides?',
      text: 'All delivery partners will use global payout settings.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Reset All'
    });

    if (!result.isConfirmed) return;

    try {
      setDeliveryEarningsSaving(true);
      await resetAllDeliveryPartnerEarningsOverrides();
      toast.success('All partner overrides reset');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reset all overrides');
    } finally {
      setDeliveryEarningsSaving(false);
    }
  };

  const handleSaveRestaurantPayoutRate = async (restaurantId) => {
    try {
      setRestaurantPayoutSavingId(restaurantId);
      const draftPercent = restaurantPayoutDrafts[restaurantId];
      const hasExplicitValue = draftPercent !== undefined && String(draftPercent).trim() !== '';

      if (!hasExplicitValue) {
        await updateRestaurantPayoutRate(restaurantId, { resetToGlobal: true });
      } else {
        const percentage = Number(draftPercent);
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
          toast.error('Payout rate must be between 0 and 100%');
          return;
        }

        await updateRestaurantPayoutRate(restaurantId, {
          payoutRateOverride: percentage / 100
        });
      }

      toast.success('Restaurant payout rate updated');
      fetchData();
      fetchPlatformSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update restaurant payout rate');
    } finally {
      setRestaurantPayoutSavingId(null);
    }
  };

  const handleResetRestaurantPayoutRate = async (restaurantId) => {
    try {
      setRestaurantPayoutSavingId(restaurantId);
      await updateRestaurantPayoutRate(restaurantId, { resetToGlobal: true });
      setRestaurantPayoutDrafts((prev) => ({
        ...prev,
        [restaurantId]: ''
      }));
      toast.success('Restaurant payout reset to global');
      fetchData();
      fetchPlatformSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reset restaurant payout rate');
    } finally {
      setRestaurantPayoutSavingId(null);
    }
  };

  const handleToggleUserBlock = async (userId, isActive) => {
    try {
      await blockUser(userId, !isActive);
      toast.success(isActive ? 'User blocked' : 'User unblocked');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleOrderStatusChange = async (orderId, nextStatus) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success('Order status updated');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleCancelOrder = async (order) => {
    const result = await Swal.fire({
      title: 'Cancel this order?',
      input: 'textarea',
      inputLabel: 'Reason for cancellation',
      inputPlaceholder: 'Optional reason',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Cancel Order'
    });

    if (!result.isConfirmed) return;

    try {
      await cancelOrder(order._id, result.value || 'Cancelled by admin');
      toast.success('Order cancelled');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleSaveRestaurantLocation = async (payload) => {
    if (!editingRestaurant) return;
    try {
      setSavingRestaurant(true);
      await updateRestaurant(editingRestaurant._id, payload);
      toast.success('Restaurant updated');
      setEditingRestaurant(null);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update restaurant');
    } finally {
      setSavingRestaurant(false);
    }
  };

  const handleAddBanner = () => {
    setSettingsForm((prev) => ({
      ...prev,
      promoBanners: [
        ...(prev.promoBanners || []),
        { tag: '', bold: '', sub: '', cta: '', bg: '', img: '', isActive: true, sortOrder: prev.promoBanners?.length || 0 }
      ]
    }));
  };

  const handleUpdateBanner = (index, field, value) => {
    setSettingsForm((prev) => {
      const next = [...(prev.promoBanners || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, promoBanners: next };
    });
  };

  const handleRemoveBanner = (index) => {
    setSettingsForm((prev) => {
      const next = [...(prev.promoBanners || [])];
      next.splice(index, 1);
      return { ...prev, promoBanners: next };
    });
  };

  const fetchRestaurantMenu = async (restaurantId) => {
    if (!restaurantId) {
      setMenuItems([]);
      return;
    }

    try {
      setMenuLoading(true);
      const response = await axios.get(`/restaurants/${restaurantId}/menu`);
      const items = response.data?.data?.items || response.data?.items || [];
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to fetch restaurant menu', error);
      toast.error('Failed to fetch menu items');
    } finally {
      setMenuLoading(false);
    }
  };

  const handleEditMenuItem = async (restaurantId, item) => {
    const categoryOptions = MENU_CATEGORIES
      .map((category) => `<option value="${category}" ${item.category === category ? 'selected' : ''}>${category}</option>`)
      .join('');

    const result = await Swal.fire({
      title: 'Edit Menu Item',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Name" value="${item.name || ''}" />
        <textarea id="swal-description" class="swal2-textarea" placeholder="Description">${item.description || ''}</textarea>
        <input id="swal-price" class="swal2-input" type="number" min="0" step="0.01" placeholder="Price" value="${item.price || 0}" />
        <select id="swal-category" class="swal2-select">${categoryOptions}</select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      preConfirm: () => {
        const name = document.getElementById('swal-name')?.value?.trim();
        const description = document.getElementById('swal-description')?.value?.trim();
        const category = document.getElementById('swal-category')?.value;
        const priceValue = document.getElementById('swal-price')?.value;
        const price = Number(priceValue);

        if (!name || !description || !category || Number.isNaN(price) || price < 0) {
          Swal.showValidationMessage('Please provide valid name, description, category and price');
          return false;
        }

        return {
          name,
          description,
          category,
          price,
          isVeg: item.isVeg,
          isAvailable: item.isAvailable,
          prepTime: item.prepTime || 20,
        };
      }
    });

    if (!result.isConfirmed) return;

    try {
      await axios.put(`/restaurants/${restaurantId}/menu/${item._id}`, result.value);
      toast.success('Menu item updated');
      fetchRestaurantMenu(restaurantId);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update menu item');
    }
  };

  const handleToggleMenuItemAvailability = async (restaurantId, itemId) => {
    try {
      await axios.patch(`/restaurants/${restaurantId}/menu/${itemId}/availability`);
      toast.success('Menu item availability updated');
      fetchRestaurantMenu(restaurantId);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update availability');
    }
  };

  const handleDeleteMenuItem = async (restaurantId, itemId) => {
    const result = await Swal.fire({
      title: 'Delete this menu item?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Delete',
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/restaurants/${restaurantId}/menu/${itemId}`);
      toast.success('Menu item deleted');
      fetchRestaurantMenu(restaurantId);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete menu item');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 max-[388px]:py-4">
      <div className="max-w-7xl mx-auto container-px">
        {/* Header */}
        <div className="mb-6 sm:mb-8 max-[388px]:mb-5 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl max-[388px]:text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="mt-2 text-sm sm:text-base max-[388px]:text-xs text-gray-600">
              Manage restaurants, users, and platform settings
            </p>
          </div>
          <div className="w-full sm:w-auto flex gap-2">
            <button
              onClick={() => setAutoRefreshEnabled((prev) => !prev)}
              className={`w-full sm:w-auto px-4 py-2 max-[388px]:px-3 max-[388px]:py-2 max-[388px]:text-xs rounded-lg text-white ${autoRefreshEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {autoRefreshEnabled ? 'Stop Auto Refresh' : 'Start Auto Refresh'}
            </button>
            <button
              onClick={fetchData}
              className="w-full sm:w-auto px-4 py-2 max-[388px]:px-3 max-[388px]:py-2 max-[388px]:text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-[388px]:gap-4 mb-8 max-[388px]:mb-6">
          <div className="bg-white rounded-lg shadow p-6 max-[388px]:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingStorefrontIcon className="h-8 w-8 text-primary-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Restaurants</p>
                <p className="text-2xl max-[388px]:text-xl font-bold text-gray-900">{stats.totalRestaurants}</p>
                {stats.pendingApprovals > 0 && (
                  <p className="text-xs text-primary-600">{stats.pendingApprovals} pending approval</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 max-[388px]:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl max-[388px]:text-xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 max-[388px]:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl max-[388px]:text-xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 max-[388px]:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl max-[388px]:text-xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto whitespace-nowrap scrollbar-hide">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('fees')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'fees'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Fees & Charges
              </button>
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'content'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Content
              </button>
              <button
                onClick={() => setActiveTab('restaurants')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'restaurants'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Restaurants ({restaurants.length})
              </button>
              <button
                onClick={() => setActiveTab('coupons')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'coupons'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Coupons ({coupons.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'users'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('menu-items')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'menu-items'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Menu Items
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'orders'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('tracking')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'tracking'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Delivery Tracking ({trackingSummary.totalActiveOrders || 0})
              </button>
              <button
                onClick={() => setActiveTab('partners')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'partners'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Partners ({partners.length})
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'earnings'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Earnings Control
              </button>
              <button
                onClick={() => {
                  setActiveTab('analytics');
                  fetchAnalytics();
                }}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'analytics'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('deletionRequests')}
                className={`px-4 sm:px-6 max-[388px]:px-3 py-3 max-[388px]:py-2 text-xs sm:text-sm max-[388px]:text-[11px] font-medium ${
                  activeTab === 'deletionRequests'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Deletion Requests ({deletionRequests.length})
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6 max-[388px]:p-3">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Platform Overview</h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Welcome to the admin panel. Monitor and manage all aspects of the FlashBites platform.
                  </p>
                  {stats.pendingApprovals > 0 && (
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                      <p className="text-primary-800 font-medium">
                        ⚠️ {stats.pendingApprovals} restaurant(s) awaiting approval
                      </p>
                      <button
                        onClick={() => setActiveTab('restaurants')}
                        className="mt-2 text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Review Now →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'fees' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Fees & Charges</h2>
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Commission Percent (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="0.1"
                        value={settingsForm.commissionPercent}
                        onChange={(e) => handleSettingsChange('commissionPercent', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Default Delivery Fee (INR)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={settingsForm.deliveryFee}
                        onChange={(e) => handleSettingsChange('deliveryFee', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Platform Fee (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsForm.platformFee}
                        onChange={(e) => handleSettingsChange('platformFee', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={settingsForm.taxRate}
                        onChange={(e) => handleSettingsChange('taxRate', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Restaurant Payout Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settingsForm.restaurantPayoutRate}
                        onChange={(e) => handleSettingsChange('restaurantPayoutRate', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">Used when a restaurant has no custom override.</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Delivery Charge Rules</h3>
                    <div className="space-y-3">
                      {settingsForm.deliveryChargeRules.map((rule, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Min KM</label>
                            <input
                              type="number"
                              min="0"
                              value={rule.minDistance}
                              onChange={(e) => handleDeliveryRuleChange(index, 'minDistance', e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Max KM</label>
                            <input
                              type="number"
                              min="0"
                              value={rule.maxDistance}
                              onChange={(e) => handleDeliveryRuleChange(index, 'maxDistance', e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Charge (INR)</label>
                            <input
                              type="number"
                              min="0"
                              value={rule.charge}
                              onChange={(e) => handleDeliveryRuleChange(index, 'charge', e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={savePlatformSettings}
                      disabled={settingsSaving}
                      className="px-5 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {settingsSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Homepage Banners</h2>
                  <button
                    onClick={handleAddBanner}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold"
                  >
                    Add Banner
                  </button>
                </div>
                <div className="space-y-4">
                  {(settingsForm.promoBanners || []).length === 0 && (
                    <div className="text-sm text-gray-500">No banners configured yet.</div>
                  )}
                  {(settingsForm.promoBanners || []).map((banner, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Tag</label>
                          <input
                            type="text"
                            value={banner.tag || ''}
                            onChange={(e) => handleUpdateBanner(index, 'tag', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">CTA</label>
                          <input
                            type="text"
                            value={banner.cta || ''}
                            onChange={(e) => handleUpdateBanner(index, 'cta', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Headline</label>
                          <input
                            type="text"
                            value={banner.bold || ''}
                            onChange={(e) => handleUpdateBanner(index, 'bold', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Subtext</label>
                          <input
                            type="text"
                            value={banner.sub || ''}
                            onChange={(e) => handleUpdateBanner(index, 'sub', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Background</label>
                          <input
                            type="text"
                            value={banner.bg || ''}
                            onChange={(e) => handleUpdateBanner(index, 'bg', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            placeholder="CSS gradient or color"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL</label>
                          <input
                            type="text"
                            value={banner.img || ''}
                            onChange={(e) => handleUpdateBanner(index, 'img', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={banner.isActive !== false}
                            onChange={(e) => handleUpdateBanner(index, 'isActive', e.target.checked)}
                          />
                          Active
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Sort</span>
                          <input
                            type="number"
                            value={banner.sortOrder ?? index}
                            onChange={(e) => handleUpdateBanner(index, 'sortOrder', e.target.value)}
                            className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveBanner(index)}
                          className="ml-auto text-sm font-semibold text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={savePlatformSettings}
                    disabled={settingsSaving}
                    className="px-5 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {settingsSaving ? 'Saving...' : 'Save Content'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'coupons' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Coupon Management</h2>
                  <button
                    onClick={handleCreateCoupon}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold"
                  >
                    New Coupon
                  </button>
                </div>
                {couponsLoading ? (
                  <div className="text-center py-6 text-gray-500">Loading coupons...</div>
                ) : coupons.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">No coupons created yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {coupons.map((coupon) => (
                          <tr key={coupon._id}>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{coupon.code}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {coupon.discountType === 'percentage'
                                ? `${coupon.discountValue}%`
                                : formatCurrency(coupon.discountValue)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {coupon.validFrom?.slice(0, 10)} → {coupon.validTill?.slice(0, 10)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {coupon.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditCoupon(coupon)}
                                  className="inline-flex items-center px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                  <PencilSquareIcon className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCoupon(coupon)}
                                  className="inline-flex items-center px-2.5 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                >
                                  <TrashIcon className="h-4 w-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'restaurants' && (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4">
                  <h2 className="text-xl font-bold">Restaurant Management</h2>
                  <div className="text-sm text-gray-600">
                    Total: {restaurants.length} | 
                    <span className="text-yellow-600 ml-1">
                      Pending: {restaurants.filter(r => !r.isApproved).length}
                    </span>
                  </div>
                </div>
                {restaurants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No restaurants registered yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {restaurants.map((restaurant) => (
                          <tr key={restaurant._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {restaurant.image && (
                                  <img
                                    src={restaurant.image}
                                    alt={restaurant.name}
                                    className="h-10 w-10 rounded-full object-cover mr-3"
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                                  <div className="text-sm text-gray-500">{restaurant.cuisines?.join(', ')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{restaurant.ownerId?.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{restaurant.ownerId?.email || restaurant.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {restaurant.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                restaurant.isApproved
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {restaurant.isApproved ? 'Approved' : 'Pending'}
                              </span>
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                restaurant.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {restaurant.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {!restaurant.isApproved ? (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleApproveRestaurant(restaurant._id)}
                                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectRestaurant(restaurant._id)}
                                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                    title="Reject"
                                  >
                                    <XCircleIcon className="h-4 w-4 mr-1" />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setEditingRestaurant(restaurant)}
                                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                  >
                                    <PencilSquareIcon className="h-4 w-4 mr-1" />
                                    Edit Location
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await updateRestaurant(restaurant._id, { isActive: !restaurant.isActive });
                                        toast.success(restaurant.isActive ? 'Restaurant deactivated' : 'Restaurant activated');
                                        fetchData();
                                      } catch (error) {
                                        toast.error(error?.response?.data?.message || 'Failed to update restaurant');
                                      }
                                    }}
                                    className={`inline-flex items-center px-3 py-1 rounded-md transition-colors ${restaurant.isActive ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                  >
                                    {restaurant.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold mb-4">User Management</h2>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    User management endpoint not yet implemented
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <select
                                value={user.role}
                                onChange={(e) => handleUpdateUserRole(user._id, e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                              >
                                {ROLE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleToggleUserBlock(user._id, user.isActive)}
                                className={`ml-2 inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold ${user.isActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                              >
                                {user.isActive ? 'Block' : 'Unblock'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                  <h2 className="text-xl font-bold">Order Management</h2>
                  <button
                    onClick={fetchData}
                    className="btn-outline text-sm flex items-center"
                    disabled={loading}
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No orders to display yet</p>
                    <p className="text-gray-400 text-sm mt-2">Orders will appear here once customers start ordering</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order._id} className="border rounded-lg p-6 hover:shadow-lg transition bg-white">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg">
                                Order #{order._id?.slice(-8).toUpperCase()}
                              </h3>
                              <span className={`badge ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                {ORDER_STATUS_LABELS[order.status] || order.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Restaurant: <span className="font-medium">{order.restaurantId?.name || 'N/A'}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Customer: <span className="font-medium">{order.userId?.name || 'N/A'}</span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-2xl font-bold text-primary-600">
                              {formatCurrency(order.total || order.totalAmount || 0)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 capitalize">
                              {order.paymentMethod || 'N/A'}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                              <select
                                value={order.status}
                                onChange={(e) => handleOrderStatusChange(order._id, e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white"
                              >
                                {ORDER_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>{ORDER_STATUS_LABELS[status] || status}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleCancelOrder(order)}
                                disabled={order.status === 'cancelled'}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-100 text-red-700 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {order.items && order.items.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-3 mt-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Order Items:</p>
                            <div className="space-y-1">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <p key={idx} className="text-sm text-gray-700">
                                  {item.quantity}x {item.name}
                                </p>
                              ))}
                              {order.items.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{order.items.length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'menu-items' && (
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                  <h2 className="text-xl font-bold">Menu Item Management</h2>
                  <div className="flex gap-2 items-center">
                    <label className="text-sm text-gray-600">Restaurant</label>
                    <select
                      value={selectedRestaurantId}
                      onChange={(e) => setSelectedRestaurantId(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {restaurants.map((restaurant) => (
                        <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {menuLoading ? (
                  <div className="text-center py-10 text-gray-500">Loading menu items...</div>
                ) : menuItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No menu items found for this restaurant.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Availability</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {menuItems.map((item) => (
                          <tr key={item._id}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500 line-clamp-2">{item.description}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(item.price || 0)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.isVeg ? 'Veg' : 'Non-veg'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {item.isAvailable ? 'Available' : 'Unavailable'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleEditMenuItem(selectedRestaurantId, item)}
                                  className="inline-flex items-center px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                  <PencilSquareIcon className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleMenuItemAvailability(selectedRestaurantId, item._id)}
                                  className="inline-flex items-center px-2.5 py-1.5 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200"
                                >
                                  {item.isAvailable ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(selectedRestaurantId, item._id)}
                                  className="inline-flex items-center px-2.5 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                >
                                  <TrashIcon className="h-4 w-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'partners' && (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4">
                  <h2 className="text-xl font-bold">Delivery Partner Applications</h2>
                  <div className="text-sm text-gray-600">
                    Total: {partners.length} | 
                    <span className="text-yellow-600 ml-1">
                      Pending: {partners.filter(p => p.status === 'pending').length}
                    </span>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Live Duty Board</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Total Partners</p>
                      <p className="text-lg font-bold text-gray-900">{dutySummary.totalPartners}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-xs text-green-700">On Duty</p>
                      <p className="text-lg font-bold text-green-800">{dutySummary.onDutyCount}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">Off Duty</p>
                      <p className="text-lg font-bold text-amber-800">{dutySummary.offDutyCount}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-700">Actively Delivering</p>
                      <p className="text-lg font-bold text-blue-800">{dutySummary.activelyDeliveringCount}</p>
                    </div>
                  </div>

                  {dutyBoard.length === 0 ? (
                    <div className="text-sm text-gray-500">No delivery partner duty data available yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {dutyBoard.map((partner) => (
                        <div key={partner._id} className="rounded-lg border border-gray-100 p-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{partner.name}</p>
                              <p className="text-xs text-gray-600">{partner.phone || 'No phone'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${partner.isOnDuty ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {partner.isOnDuty ? 'On Duty' : 'Off Duty'}
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${partner.activeAssignmentsCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                Active Orders: {partner.activeAssignmentsCount}
                              </span>
                            </div>
                          </div>

                          {partner.currentAssignment ? (
                            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                              <p className="font-semibold text-gray-800">
                                Order #{partner.currentAssignment.orderNumber} ({partner.currentAssignment.status.replace('_', ' ')})
                              </p>
                              <p className="mt-1 text-gray-700">
                                From: {partner.currentAssignment.from.restaurantName}
                              </p>
                              <p className="text-xs text-gray-500 break-words">
                                {partner.currentAssignment.from.address || 'Restaurant address unavailable'}
                              </p>
                              <p className="mt-2 text-gray-700">
                                To: {partner.currentAssignment.customer.name}
                              </p>
                              <p className="text-xs text-gray-500 break-words">
                                {partner.currentAssignment.to.address || 'Customer address unavailable'}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-gray-500">No active route assigned currently.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900">Delivery Earnings Controls</h3>
                    <button
                      onClick={handleResetAllPartnerOverrides}
                      disabled={deliveryEarningsSaving}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                    >
                      Reset All Partner Overrides
                    </button>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Global Payout Configuration</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Per Order (INR)</label>
                        <input
                          type="number"
                          min="0"
                          value={deliveryEarningsGlobal.perOrder}
                          onChange={(e) => setDeliveryEarningsGlobal((prev) => ({ ...prev, perOrder: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Bonus Threshold (orders)</label>
                        <input
                          type="number"
                          min="1"
                          value={deliveryEarningsGlobal.bonusThreshold}
                          onChange={(e) => setDeliveryEarningsGlobal((prev) => ({ ...prev, bonusThreshold: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Bonus Amount (INR)</label>
                        <input
                          type="number"
                          min="0"
                          value={deliveryEarningsGlobal.bonusAmount}
                          onChange={(e) => setDeliveryEarningsGlobal((prev) => ({ ...prev, bonusAmount: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleSaveGlobalDeliveryEarnings}
                        disabled={deliveryEarningsSaving}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
                      >
                        {deliveryEarningsSaving ? 'Saving...' : 'Save Global Config'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {deliveryEarningsPartners.length === 0 ? (
                      <p className="text-sm text-gray-500">No delivery partners available for earnings controls.</p>
                    ) : (
                      deliveryEarningsPartners.map((partner) => {
                        const draft = partnerEarningDrafts[partner._id] || {
                          perOrder: deliveryEarningsGlobal.perOrder,
                          bonusThreshold: deliveryEarningsGlobal.bonusThreshold,
                          bonusAmount: deliveryEarningsGlobal.bonusAmount
                        };

                        return (
                          <div key={partner._id} className="rounded-lg border border-gray-100 p-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{partner.name}</p>
                                <p className="text-xs text-gray-500">{partner.phone || 'No phone'} • Delivered: {partner.stats?.totalDeliveries || 0} • Earnings: {formatCurrency(partner.stats?.totalEarnings || 0)}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${partner.hasOverride ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                {partner.hasOverride ? 'Using Override' : 'Using Global'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                type="number"
                                min="0"
                                value={draft.perOrder}
                                onChange={(e) => setPartnerEarningDrafts((prev) => ({
                                  ...prev,
                                  [partner._id]: { ...prev[partner._id], perOrder: e.target.value }
                                }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                placeholder="Per order"
                              />
                              <input
                                type="number"
                                min="1"
                                value={draft.bonusThreshold}
                                onChange={(e) => setPartnerEarningDrafts((prev) => ({
                                  ...prev,
                                  [partner._id]: { ...prev[partner._id], bonusThreshold: e.target.value }
                                }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                placeholder="Bonus threshold"
                              />
                              <input
                                type="number"
                                min="0"
                                value={draft.bonusAmount}
                                onChange={(e) => setPartnerEarningDrafts((prev) => ({
                                  ...prev,
                                  [partner._id]: { ...prev[partner._id], bonusAmount: e.target.value }
                                }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                placeholder="Bonus amount"
                              />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 justify-end">
                              <button
                                onClick={() => handleResetPartnerToGlobal(partner._id)}
                                disabled={deliveryEarningsSaving}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                              >
                                Reset to Global
                              </button>
                              <button
                                onClick={() => handleSavePartnerDeliveryEarnings(partner._id)}
                                disabled={deliveryEarningsSaving}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
                              >
                                Save Override
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {partners.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No partner applications yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partners.map((partner) => (
                      <div key={partner._id} className="border rounded-lg p-6 bg-white hover:shadow-lg transition">
                        <div className="flex flex-col lg:flex-row gap-4 lg:justify-between lg:items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {partner.documents?.photo?.url && (
                                <img
                                  src={partner.documents.photo.url}
                                  alt={partner.fullName}
                                  className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                                />
                              )}
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">{partner.fullName}</h3>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  partner.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  partner.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600"><span className="font-medium">Email:</span> {partner.email}</p>
                                <p className="text-gray-600"><span className="font-medium">Phone:</span> {partner.phone}</p>
                                <p className="text-gray-600"><span className="font-medium">Alternate:</span> {partner.alternatePhone}</p>
                              </div>
                              <div>
                                <p className="text-gray-600"><span className="font-medium">Vehicle:</span> {partner.vehicleType.toUpperCase()} - {partner.vehicleNumber}</p>
                                <p className="text-gray-600"><span className="font-medium">Model:</span> {partner.vehicleModel}</p>
                                <p className="text-gray-600"><span className="font-medium">License:</span> {partner.licenseNumber}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-gray-600">
                                  <span className="font-medium">Address:</span> {partner.address.street}, {partner.address.city}, {partner.address.state} - {partner.address.zipCode}
                                </p>
                              </div>
                            </div>

                            {partner.rejectionReason && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-800">
                                  <span className="font-medium">Rejection Reason:</span> {partner.rejectionReason}
                                </p>
                              </div>
                            )}

                            <div className="mt-3 flex gap-2">
                              {partner.documents?.drivingLicense?.url && (
                                <a
                                  href={partner.documents.drivingLicense.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                  View License
                                </a>
                              )}
                              {partner.documents?.aadharCard?.url && (
                                <a
                                  href={partner.documents.aadharCard.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                  View Aadhar
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="ml-0 lg:ml-4 w-full lg:w-auto">
                            {partner.status === 'pending' && (
                              <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                                <button
                                  onClick={() => handleApprovePartner(partner._id)}
                                  className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors whitespace-nowrap"
                                >
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectPartner(partner._id)}
                                  className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors whitespace-nowrap"
                                >
                                  <XCircleIcon className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Applied: {formatDateTime(partner.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tracking' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Delivery Tracking Dashboard</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Active Orders</p>
                    <p className="text-lg font-bold text-gray-900">{trackingSummary.totalActiveOrders}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-blue-700">Out for Delivery</p>
                    <p className="text-lg font-bold text-blue-800">{trackingSummary.outForDeliveryCount}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs text-amber-700">Ready</p>
                    <p className="text-lg font-bold text-amber-800">{trackingSummary.readyCount}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-xs text-green-700">Assigned</p>
                    <p className="text-lg font-bold text-green-800">{trackingSummary.assignedCount}</p>
                  </div>
                </div>

                {trackingOrders.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No active delivery routes right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trackingOrders.map((order) => (
                      <div key={order._id} className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">Order #{order.orderNumber}</p>
                            <p className="text-xs text-gray-500">Status: {String(order.status || '').replace(/_/g, ' ')}</p>
                          </div>
                          <div className="text-xs text-gray-600">
                            ETA: {order.etaMinutes > 0 ? `${order.etaMinutes} min` : 'N/A'}
                          </div>
                        </div>

                        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs uppercase text-gray-400">Restaurant</p>
                            <p className="font-medium text-gray-800">{order.restaurant?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400">Customer</p>
                            <p className="font-medium text-gray-800">{order.customer?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500 break-words">{order.customer?.address || 'Address unavailable'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400">Delivery Partner</p>
                            {order.deliveryPartner ? (
                              <>
                                <p className="font-medium text-gray-800">{order.deliveryPartner.name}</p>
                                <p className="text-xs text-gray-500">{order.deliveryPartner.phone || 'No phone'}</p>
                              </>
                            ) : (
                              <p className="text-xs text-amber-600">Not assigned yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Payout & Earnings Control</h2>
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-1 mb-4">
                    <h3 className="text-base font-bold text-gray-900">Restaurant Payout Controls</h3>
                    <p className="text-xs text-gray-500">
                      Global default: {Number(settingsForm.restaurantPayoutRate || 0).toFixed(1)}%. Keep override empty to use global.
                    </p>
                  </div>

                  {restaurants.length === 0 ? (
                    <p className="text-sm text-gray-500">No restaurants available.</p>
                  ) : (
                    <div className="space-y-3">
                      {restaurants.map((restaurant) => {
                        const draftPercent = restaurantPayoutDrafts[restaurant._id] ?? '';
                        const effectiveOverride = Number(restaurant.payoutRateOverride);
                        const hasOverride = Number.isFinite(effectiveOverride);

                        return (
                          <div key={restaurant._id} className="rounded-lg border border-gray-100 p-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{restaurant.name}</p>
                                <p className="text-xs text-gray-500">
                                  {hasOverride
                                    ? `Override: ${(effectiveOverride * 100).toFixed(2)}%`
                                    : `Using global: ${Number(settingsForm.restaurantPayoutRate || 0).toFixed(1)}%`}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={draftPercent}
                                  onChange={(e) => setRestaurantPayoutDrafts((prev) => ({
                                    ...prev,
                                    [restaurant._id]: e.target.value
                                  }))}
                                  className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  placeholder="Override %"
                                />
                                <button
                                  onClick={() => handleSaveRestaurantPayoutRate(restaurant._id)}
                                  disabled={restaurantPayoutSavingId === restaurant._id}
                                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
                                >
                                  {restaurantPayoutSavingId === restaurant._id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => handleResetRestaurantPayoutRate(restaurant._id)}
                                  disabled={restaurantPayoutSavingId === restaurant._id}
                                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900">Delivery Earnings Controls</h3>
                    <button
                      onClick={handleResetAllPartnerOverrides}
                      disabled={deliveryEarningsSaving}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                    >
                      Reset All Partner Overrides
                    </button>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Global Payout Configuration</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Per Order (INR)</label>
                        <input
                          type="number"
                          min="0"
                          value={deliveryEarningsGlobal.perOrder}
                          onChange={(e) => setDeliveryEarningsGlobal((prev) => ({ ...prev, perOrder: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Bonus Threshold (orders)</label>
                        <input
                          type="number"
                          min="1"
                          value={deliveryEarningsGlobal.bonusThreshold}
                          onChange={(e) => setDeliveryEarningsGlobal((prev) => ({ ...prev, bonusThreshold: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Bonus Amount (INR)</label>
                        <input
                          type="number"
                          min="0"
                          value={deliveryEarningsGlobal.bonusAmount}
                          onChange={(e) => setDeliveryEarningsGlobal((prev) => ({ ...prev, bonusAmount: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleSaveGlobalDeliveryEarnings}
                        disabled={deliveryEarningsSaving}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
                      >
                        {deliveryEarningsSaving ? 'Saving...' : 'Save Global Config'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {deliveryEarningsPartners.length === 0 ? (
                      <p className="text-sm text-gray-500">No delivery partners available for earnings controls.</p>
                    ) : (
                      deliveryEarningsPartners.map((partner) => {
                        const draft = partnerEarningDrafts[partner._id] || {
                          perOrder: deliveryEarningsGlobal.perOrder,
                          bonusThreshold: deliveryEarningsGlobal.bonusThreshold,
                          bonusAmount: deliveryEarningsGlobal.bonusAmount
                        };

                        return (
                          <div key={partner._id} className="rounded-lg border border-gray-100 p-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{partner.name}</p>
                                <p className="text-xs text-gray-500">{partner.phone || 'No phone'} • Delivered: {partner.stats?.totalDeliveries || 0} • Earnings: {formatCurrency(partner.stats?.totalEarnings || 0)}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${partner.hasOverride ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                {partner.hasOverride ? 'Using Override' : 'Using Global'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                type="number"
                                min="0"
                                value={draft.perOrder}
                                onChange={(e) => setPartnerEarningDrafts((prev) => ({
                                  ...prev,
                                  [partner._id]: { ...prev[partner._id], perOrder: e.target.value }
                                }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                placeholder="Per order"
                              />
                              <input
                                type="number"
                                min="1"
                                value={draft.bonusThreshold}
                                onChange={(e) => setPartnerEarningDrafts((prev) => ({
                                  ...prev,
                                  [partner._id]: { ...prev[partner._id], bonusThreshold: e.target.value }
                                }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                placeholder="Bonus threshold"
                              />
                              <input
                                type="number"
                                min="0"
                                value={draft.bonusAmount}
                                onChange={(e) => setPartnerEarningDrafts((prev) => ({
                                  ...prev,
                                  [partner._id]: { ...prev[partner._id], bonusAmount: e.target.value }
                                }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                placeholder="Bonus amount"
                              />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 justify-end">
                              <button
                                onClick={() => handleResetPartnerToGlobal(partner._id)}
                                disabled={deliveryEarningsSaving}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                              >
                                Reset to Global
                              </button>
                              <button
                                onClick={() => handleSavePartnerDeliveryEarnings(partner._id)}
                                disabled={deliveryEarningsSaving}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
                              >
                                Save Override
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'deletionRequests' && (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4">
                  <h2 className="text-xl font-bold">Account Deletion Requests</h2>
                  <div className="text-sm text-gray-600">
                    Total: {deletionRequests.length} |
                    <span className="text-yellow-600 ml-1">
                      Pending: {deletionRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </div>
                </div>

                {deletionRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No account deletion requests yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deletionRequests.map((request) => (
                      <div key={request._id} className="border rounded-lg p-5 bg-white">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base font-bold text-gray-900">{request.name}</h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                request.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : request.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {request.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{request.email || 'No email'} • {request.phone}</p>
                            <p className="text-sm text-gray-700 mt-2">
                              <span className="font-semibold">Reason:</span> {request.reason}
                            </p>
                            {request.details && (
                              <p className="text-sm text-gray-700 mt-1">
                                <span className="font-semibold">Details:</span> {request.details}
                              </p>
                            )}
                            {request.adminNotes && (
                              <p className="text-sm text-gray-700 mt-1">
                                <span className="font-semibold">Admin Note:</span> {request.adminNotes}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Requested: {formatDateTime(request.createdAt)}
                              {request.reviewedAt ? ` • Reviewed: ${formatDateTime(request.reviewedAt)}` : ''}
                            </p>
                          </div>

                          {request.status === 'pending' && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => handleReviewDeletionRequest(request._id, 'approve')}
                                className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors whitespace-nowrap"
                              >
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Approve & Delete
                              </button>
                              <button
                                onClick={() => handleReviewDeletionRequest(request._id, 'reject')}
                                className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors whitespace-nowrap"
                              >
                                <XCircleIcon className="h-4 w-4 mr-1" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                {/* Period Selector */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                  <h2 className="text-xl font-bold">Business Analytics</h2>
                  <select
                    value={analyticsPeriod}
                    onChange={(e) => {
                      setAnalyticsPeriod(e.target.value);
                      fetchAnalytics(e.target.value);
                    }}
                    className="w-full sm:w-auto px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                {analyticsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading analytics...</p>
                  </div>
                ) : analytics ? (
                  <div className="space-y-6">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <ShoppingBagIcon className="h-10 w-10 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm text-blue-800">Total Orders</p>
                            <p className="text-3xl font-bold text-blue-900">{analytics.overview.totalOrders}</p>
                            <p className="text-xs text-blue-600 mt-1">{analytics.overview.deliveredOrders} delivered</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-10 w-10 text-green-600" />
                          <div className="ml-4">
                            <p className="text-sm text-green-800">Total Revenue</p>
                            <p className="text-3xl font-bold text-green-900">{formatCurrency(analytics.overview.totalRevenue)}</p>
                            <p className="text-xs text-green-600 mt-1">Avg: {formatCurrency(analytics.overview.avgOrderValue)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <BuildingStorefrontIcon className="h-10 w-10 text-purple-600" />
                          <div className="ml-4">
                            <p className="text-sm text-purple-800">Restaurants</p>
                            <p className="text-3xl font-bold text-purple-900">{analytics.overview.activeRestaurants}</p>
                            <p className="text-xs text-purple-600 mt-1">{analytics.overview.pendingRestaurants} pending</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <TruckIcon className="h-10 w-10 text-primary-600" />
                          <div className="ml-4">
                            <p className="text-sm text-primary-800">Delivery Partners</p>
                            <p className="text-3xl font-bold text-primary-900">{analytics.overview.totalDeliveryPartners}</p>
                            <p className="text-xs text-primary-600 mt-1">Active fleet</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-5">
                        <p className="text-sm text-emerald-800">Platform Profit</p>
                        <p className="text-2xl font-bold text-emerald-900 mt-1">
                          {formatCurrency(analytics.overview.totalPlatformProfit || 0)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5">
                        <p className="text-sm text-amber-800">Restaurant Earnings</p>
                        <p className="text-2xl font-bold text-amber-900 mt-1">
                          {formatCurrency(analytics.overview.totalRestaurantEarnings || 0)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-5">
                        <p className="text-sm text-indigo-800">Delivery Earnings</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-1">
                          {formatCurrency(analytics.overview.totalDeliveryEarnings || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Payment Methods</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-green-900">💳 Online Payments</span>
                              <span className="text-sm text-green-600">{analytics.paymentBreakdown.online.percentage}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-green-700">{analytics.paymentBreakdown.online.count} orders</span>
                              <span className="text-lg font-bold text-green-900">{formatCurrency(analytics.paymentBreakdown.online.amount)}</span>
                            </div>
                          </div>

                          <div className="p-4 bg-primary-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-primary-900">💵 Cash on Delivery</span>
                              <span className="text-sm text-primary-600">{analytics.paymentBreakdown.cash.percentage}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-primary-700">{analytics.paymentBreakdown.cash.count} orders</span>
                              <span className="text-lg font-bold text-primary-900">{formatCurrency(analytics.paymentBreakdown.cash.amount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Restaurant Status</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">Total Restaurants</span>
                            <span className="text-2xl font-bold">{analytics.restaurantStatus.total}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium text-green-700">🟢 Active</span>
                            <span className="text-xl font-bold text-green-900">{analytics.restaurantStatus.active}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">⚫ Inactive</span>
                            <span className="text-xl font-bold text-gray-900">{analytics.restaurantStatus.inactive}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                            <span className="font-medium text-primary-700">⏳ Pending Approval</span>
                            <span className="text-xl font-bold text-primary-900">{analytics.restaurantStatus.pending}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Restaurants */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">Top Performing Restaurants</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {analytics.ordersByRestaurant.slice(0, 10).map((restaurant, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{restaurant.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${restaurant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {restaurant.isActive ? '🟢 Active' : '⚫ Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{restaurant.totalOrders}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                  {formatCurrency(restaurant.totalRevenue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(restaurant.avgOrderValue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Delivery Partners Performance */}
                    {analytics.deliveryPartnerStats && analytics.deliveryPartnerStats.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Top Delivery Partners</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {analytics.deliveryPartnerStats.slice(0, 6).map((partner, index) => (
                            <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{partner.name}</h4>
                                <TruckIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{partner.phone}</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Total Deliveries:</span>
                                <span className="font-semibold">{partner.totalDeliveries}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Completed:</span>
                                <span className="font-semibold text-green-600">{partner.completedDeliveries}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cash Collection Details */}
                    {analytics.cashOrders && analytics.cashOrders.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Recent Cash Collections (COD)</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Partner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {analytics.cashOrders.slice(0, 20).map((order, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.orderNumber}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.restaurant}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div>
                                      <p className="font-medium">{order.deliveryPartner}</p>
                                      <p className="text-xs text-gray-500">{order.deliveryPartnerPhone}</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-600">
                                    {formatCurrency(order.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Daily Revenue Trend */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">Daily Revenue Trend</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {analytics.dailyRevenue.map((day, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {new Date(day.date).toLocaleDateString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.orderCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                  {formatCurrency(day.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No analytics data available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingRestaurant && (
        <RestaurantLocationModal
          restaurant={editingRestaurant}
          saving={savingRestaurant}
          onClose={() => setEditingRestaurant(null)}
          onSave={handleSaveRestaurantLocation}
        />
      )}
    </div>
  );
};

export default AdminPanel;
