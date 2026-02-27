import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBell,
  FiSearch,
  FiChevronDown,
  FiChevronRight,
  FiMessageCircle,
  FiPhone,
  FiMail,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi';
import { getUserOrders } from '../api/orderApi';
import toast from 'react-hot-toast';

const faqs = [
  {
    q: 'Where is my order?',
    a: 'Open Orders and tap your active order to see live status updates and ETA.',
  },
  {
    q: 'How can I request a refund?',
    a: 'Go to Orders, select the order, and tap Report an issue. Our team reviews it quickly.',
  },
  {
    q: 'Can I cancel after placing the order?',
    a: 'You can cancel before restaurant confirmation. After that, cancellation depends on preparation status.',
  },
  {
    q: 'My item is missing, what should I do?',
    a: 'Use Help on the order details page and choose Missing Item. We will resolve with refund/replacement.',
  },
];

const HelpPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [recentIssues, setRecentIssues] = useState([]);
  const openWhatsAppSupport = () => {
    const phone = '918001234567';
    const message = encodeURIComponent('Hi FlashBites support, I need help with my order.');
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const loadRecentIssues = async () => {
      try {
        const response = await getUserOrders({ page: 1, limit: 8 });
        const orders = response?.data?.orders || [];

        const prioritized = orders
          .filter((order) => ['cancelled', 'pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(order.status))
          .slice(0, 2)
          .map((order) => ({
            id: order._id,
            orderNo: order._id?.slice(-4) || '----',
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
          }));

        setRecentIssues(prioritized);
      } catch {
        toast.error('Failed to load recent issues');
      } finally {
        setOrdersLoading(false);
      }
    };

    loadRecentIssues();
  }, []);

  const statusMeta = (status) => {
    if (status === 'cancelled') {
      return {
        title: 'Order Cancelled',
        subtitle: 'Status: Resolved',
        icon: <FiCheckCircle className="w-4 h-4" />,
        iconClass: 'bg-green-100 text-green-500',
      };
    }
    return {
      title: 'Order Support Request',
      subtitle: 'Status: Investigating',
      icon: <FiClock className="w-4 h-4" />,
      iconClass: 'bg-orange-100 text-orange-500',
    };
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const hasIssues = useMemo(() => recentIssues.length > 0, [recentIssues]);

  return (
    <div className="bg-[#f3f4f6] min-h-screen">
      <div className="max-w-md mx-auto px-5 pt-5 pb-32">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[20px] font-semibold text-slate-900">Help Center</h1>
          <button onClick={() => navigate('/notifications')} className="w-9 h-9 rounded-full flex items-center justify-center text-orange-500">
            <FiBell className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5">
          <h2 className="text-[36px] leading-tight font-semibold text-slate-900">How can we help?</h2>
        </div>

        <section className="mt-6">
          <h3 className="text-[26px] font-semibold text-slate-900">FAQs</h3>
          <div className="mt-2 space-y-2">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-[15px] font-semibold text-slate-900 pr-3">{item.q}</span>
                    <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 text-[14px] text-slate-600">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[22px] font-semibold text-slate-900">Recent Issues</h3>
            <button onClick={() => navigate('/orders')} className="text-orange-500 text-[13px] font-medium">View All</button>
          </div>
          {ordersLoading && (
            <div className="rounded-xl bg-white border border-slate-200 px-3 py-4 text-[13px] text-slate-500">
              Loading recent issues...
            </div>
          )}
          {!ordersLoading && !hasIssues && (
            <div className="rounded-xl bg-white border border-slate-200 px-3 py-4 text-[13px] text-slate-500">
              No recent issues found.
            </div>
          )}
          <div className="space-y-2">
            {recentIssues.map((issue) => {
              const meta = statusMeta(issue.status);
              return (
                <button
                  key={issue.id}
                  onClick={() => navigate(`/orders/${issue.id}`)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-3 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3 text-left">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.iconClass}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">{meta.title} - Order #{issue.orderNo}</p>
                      <p className="text-[12px] text-slate-500">{meta.subtitle} · {timeAgo(issue.createdAt)}</p>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-[22px] font-semibold text-slate-900">Still need help?</h3>
          <button
            onClick={openWhatsAppSupport}
            className="mt-2 w-full h-12 rounded-xl bg-orange-500 text-white px-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FiMessageCircle className="w-4 h-4" />
              <div className="text-left">
                <p className="text-[15px] font-semibold leading-tight">Live Chat</p>
                <p className="text-[11px] text-orange-100">Wait time: &lt; 2 mins</p>
              </div>
            </div>
            <FiChevronRight className="w-4 h-4" />
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a href="tel:18001234567" className="h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center gap-2 text-[14px] font-medium text-slate-700">
              <FiPhone className="w-4 h-4 text-orange-500" />
              Call Us
            </a>
            <a href="mailto:support@flashbites.com" className="h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center gap-2 text-[14px] font-medium text-slate-700">
              <FiMail className="w-4 h-4 text-orange-500" />
              Email
            </a>
          </div>
        </section>
      </div>

    </div>
  );
};

export default HelpPage;
