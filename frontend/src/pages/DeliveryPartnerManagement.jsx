import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  MapPinIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import {
  getDeliveryPartners,
  getDeliveryPartnerDetails,
  updateDeliveryPartner,
  toggleDeliveryPartnerStatus,
  getDeliveryPartnerOrders,
  rejectOrderAssignment,
  reassignOrderToPartner
} from '../api/adminApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const DeliveryPartnerManagement = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // list | details | orders
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerOrders, setPartnerOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [filters, setFilters] = useState({ isActive: '', isOnDuty: '', search: '' });
  const [editingPartner, setEditingPartner] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [availablePartners, setAvailablePartners] = useState([]);

  // Fetch delivery partners
  const fetchPartners = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.isActive) params.isActive = filters.isActive;
      if (filters.isOnDuty) params.isOnDuty = filters.isOnDuty;
      if (filters.search) params.search = filters.search;

      const response = await getDeliveryPartners(params);
      if (response.success) {
        setPartners(response.data.partners);
        setPagination(response.data.pagination);
      } else {
        toast.error(response.message || 'Failed to fetch delivery partners');
      }
    } catch (error) {
      toast.error('Failed to fetch delivery partners');
      console.error('Fetch partners error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch partner details
  const fetchPartnerDetails = async (partnerId) => {
    setLoading(true);
    try {
      const response = await getDeliveryPartnerDetails(partnerId);
      if (response.success) {
        setSelectedPartner(response.data.partner);
        setEditFormData({
          name: response.data.partner.name,
          email: response.data.partner.email || '',
          isActive: response.data.partner.isActive
        });
        setView('details');
      } else {
        toast.error('Failed to fetch partner details');
      }
    } catch (error) {
      toast.error('Failed to fetch partner details');
      console.error('Fetch partner error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch partner orders
  const fetchPartnerOrders = async (partnerId, page = 1) => {
    setLoading(true);
    try {
      const response = await getDeliveryPartnerOrders(partnerId, { page, limit: 20 });
      if (response.success) {
        setPartnerOrders(response.data.orders);
        setView('orders');
      } else {
        toast.error('Failed to fetch partner orders');
      }
    } catch (error) {
      toast.error('Failed to fetch partner orders');
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load available partners for reassigning orders
  const loadAvailablePartners = async () => {
    try {
      const response = await getDeliveryPartners({ limit: 100, isActive: 'true' });
      if (response.success) {
        setAvailablePartners(response.data.partners.filter(p => p._id !== selectedPartner._id));
      }
    } catch (error) {
      console.error('Failed to load available partners:', error);
    }
  };

  // Update delivery partner
  const handleUpdatePartner = async () => {
    try {
      setLoading(true);
      const response = await updateDeliveryPartner(selectedPartner._id, editFormData);
      if (response.success) {
        toast.success('Partner updated successfully');
        setSelectedPartner(response.data.partner);
        fetchPartners(pagination.page);
      } else {
        toast.error(response.message || 'Failed to update partner');
      }
    } catch (error) {
      toast.error('Failed to update partner');
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle partner status
  const handleToggleStatus = async (partnerId, currentStatus) => {
    const result = await Swal.fire({
      title: currentStatus ? 'Deactivate Partner?' : 'Activate Partner?',
      text: currentStatus
        ? 'This partner will no longer receive orders.'
        : 'This partner will be able to receive orders again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, proceed'
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const response = await toggleDeliveryPartnerStatus(partnerId, !currentStatus);
        if (response.success) {
          toast.success(`Partner ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
          fetchPartners(pagination.page);
          if (selectedPartner?._id === partnerId) {
            setSelectedPartner(response.data.partner);
          }
        } else {
          toast.error(response.message || 'Failed to update partner status');
        }
      } catch (error) {
        toast.error('Failed to update partner status');
        console.error('Toggle status error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Reject order assignment
  const handleRejectOrder = async (orderId) => {
    const result = await Swal.fire({
      title: 'Reject Order',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Enter reason...',
      inputAttributes: { 'aria-label': 'Reason for rejection' },
      showCancelButton: true,
      confirmButtonText: 'Reject Order'
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const response = await rejectOrderAssignment(
          selectedPartner._id,
          orderId,
          result.value || 'Admin rejected order'
        );
        if (response.success) {
          toast.success('Order rejected and reassigned');
          fetchPartnerOrders(selectedPartner._id);
        } else {
          toast.error(response.message || 'Failed to reject order');
        }
      } catch (error) {
        toast.error('Failed to reject order');
        console.error('Reject error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Reassign order
  const handleReassignOrder = async (orderId) => {
    if (!availablePartners.length) {
      toast.error('No available partners for reassignment');
      return;
    }

    const { value: targetPartnerId } = await Swal.fire({
      title: 'Reassign Order',
      input: 'select',
      inputOptions: availablePartners.reduce((acc, partner) => {
        acc[partner._id] = `${partner.name} (${partner.phone})`;
        return acc;
      }, {}),
      inputPlaceholder: 'Select a partner...',
      showCancelButton: true,
      confirmButtonText: 'Reassign'
    });

    if (targetPartnerId) {
      try {
        setLoading(true);
        const response = await reassignOrderToPartner(
          selectedPartner._id,
          orderId,
          targetPartnerId
        );
        if (response.success) {
          toast.success('Order reassigned successfully');
          fetchPartnerOrders(selectedPartner._id);
        } else {
          toast.error(response.message || 'Failed to reassign order');
        }
      } catch (error) {
        toast.error('Failed to reassign order');
        console.error('Reassign error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchPartners(1);
    }
  }, [view, filters]);

  useEffect(() => {
    if (view === 'details' && selectedPartner) {
      loadAvailablePartners();
    }
  }, [view, selectedPartner]);

  // List View
  if (view === 'list') {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TruckIcon className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Delivery Partner Management</h2>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.isActive}
            onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            value={filters.isOnDuty}
            onChange={(e) => setFilters({ ...filters, isOnDuty: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Duties</option>
            <option value="true">On Duty</option>
            <option value="false">Off Duty</option>
          </select>

          <button
            onClick={() => setFilters({ isActive: '', isOnDuty: '', search: '' })}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Reset
          </button>
        </div>

        {/* Partners Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Duty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Deliveries
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : partners.length > 0 ? (
                partners.map((partner) => (
                  <tr key={partner._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {partner.avatar ? (
                          <img
                            src={partner.avatar}
                            alt={partner.name}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 mr-2" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{partner.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {partner.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {partner.isActive ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {partner.isOnDuty ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          On Duty
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                          Off Duty
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {partner.stats?.completedDeliveries || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => fetchPartnerDetails(partner._id)}
                        className="btn-icon text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(partner._id, partner.isActive)}
                        className={`btn-icon ${
                          partner.isActive
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={partner.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {partner.isActive ? (
                          <XCircleIcon className="w-5 h-5" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No delivery partners found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPartners(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => fetchPartners(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Details View
  if (view === 'details' && selectedPartner) {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Back to List
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Partner Details</h2>
          <div></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Partner Info Section */}
          <div className="md:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={selectedPartner.phone}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editFormData.isActive}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleUpdatePartner}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setView('list')}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <button
                  onClick={() => fetchPartnerOrders(selectedPartner._id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  View All Orders
                </button>
              </div>
              {/* Recent orders will be displayed here */}
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Deliveries</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {selectedPartner.stats?.totalDeliveries || 0}
                  </p>
                </div>
                <ShoppingBagIcon className="w-12 h-12 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {selectedPartner.stats?.completedDeliveries || 0}
                  </p>
                </div>
                <CheckIcon className="w-12 h-12 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cancelled</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {selectedPartner.stats?.cancelledDeliveries || 0}
                  </p>
                </div>
                <XMarkIcon className="w-12 h-12 text-red-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedPartner.stats?.totalEarnings || 0)}
                  </p>
                </div>
                <BanknotesIcon className="w-12 h-12 text-purple-600 opacity-50" />
              </div>
            </div>

            <button
              onClick={() => handleToggleStatus(selectedPartner._id, selectedPartner.isActive)}
              className={`w-full py-3 rounded-lg font-semibold text-white ${
                selectedPartner.isActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {selectedPartner.isActive ? 'Deactivate Partner' : 'Activate Partner'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Orders View
  if (view === 'orders' && selectedPartner) {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setView('details')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Back to Details
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            Orders for {selectedPartner.name}
          </h2>
          <div></div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : partnerOrders.length > 0 ? (
                partnerOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {String(order._id).slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {order.userId?.name}
                        </p>
                        <p className="text-xs text-gray-500">{order.userId?.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.restaurantId?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {['confirmed', 'ready', 'out_for_delivery'].includes(order.status) && (
                        <>
                          <button
                            onClick={() => handleRejectOrder(order._id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                            title="Reject Order"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleReassignOrder(order._id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            title="Reassign Order"
                          >
                            Reassign
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};

export default DeliveryPartnerManagement;
