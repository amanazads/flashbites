import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import { getPublicCoupons } from '../api/couponApi';
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TagIcon,
  StarIcon,
  GiftIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { BRAND } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';

const getCouponMeta = (coupon) => {
  if (coupon.discountType === 'percentage') {
    return {
      discountLabel: `${coupon.discountValue}% OFF`,
      title: `${coupon.discountValue}% Off`,
      tag: 'PERCENT DEAL',
      icon: SparklesIcon,
      iconColor: '#8B5CF6',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    };
  }

  return {
    discountLabel: `\u20b9${coupon.discountValue} OFF`,
    title: `\u20b9${coupon.discountValue} Off`,
    tag: 'FLAT DEAL',
    icon: TagIcon,
    iconColor: BRAND,
    gradient: `linear-gradient(135deg, ${BRAND} 0%, #C2410C 100%)`,
  };
};

const formatValidTill = (validTill, t) => {
  if (!validTill) return t('promos.limitedTime', 'Limited time');
  const date = new Date(validTill);
  if (Number.isNaN(date.getTime())) return t('promos.limitedTime', 'Limited time');
  return `${t('promos.validTill', 'Valid till')} ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

const mapCouponForCard = (coupon, t) => {
  const meta = getCouponMeta(coupon);
  const minOrder = Number(coupon.minOrderValue || 0);
  const minOrderText = minOrder > 0 ? ` on orders above \u20b9${minOrder}` : '';
  const maxDiscountText = coupon.maxDiscount ? ` Max discount \u20b9${coupon.maxDiscount}.` : '';

  return {
    _id: coupon._id,
    code: coupon.code,
    title: `${meta.title}${minOrderText}`,
    description: `${coupon.description || 'Apply this coupon at checkout.'}${maxDiscountText}`.trim(),
    discount: meta.discountLabel,
    minOrder,
    validTill: formatValidTill(coupon.validTill, t),
    tag: meta.tag,
    icon: meta.icon,
    iconColor: meta.iconColor,
    gradient: meta.gradient,
  };
};

const CouponCard = ({ coupon, t }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(t('promos.copiedToast', 'Copied! Use {code} at checkout').replace('{code}', coupon.code));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t('promos.copyFailed', 'Unable to copy coupon code'));
    }
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: coupon.gradient }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <coupon.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight">{coupon.title}</p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block"
              style={{ background: 'rgba(255,255,255,0.22)', color: 'white' }}
            >
              {coupon.tag}
            </span>
          </div>
        </div>
        <p className="text-white font-black text-[18px] text-right leading-tight flex-shrink-0 ml-2">
          {coupon.discount}
        </p>
      </div>

      <div className="relative flex items-center">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-gray-50" style={{ boxShadow: 'inset -2px 0 0 #E5E7EB' }} />
        <div className="flex-1 border-t border-dashed border-gray-200 mx-3" />
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-gray-50" style={{ boxShadow: 'inset 2px 0 0 #E5E7EB' }} />
      </div>

      <div className="px-4 pb-4 pt-3">
        <p className="text-[13px] text-gray-500 mb-3 leading-relaxed">{coupon.description}</p>

        <div className="flex items-center gap-2 text-[12px] text-gray-400 mb-3">
          <span className="font-medium">{t('promos.minOrder', 'Min order')}:</span>
          <span className="font-semibold text-gray-600">\u20b9{coupon.minOrder}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="font-medium">{t('promos.validity', 'Validity')}:</span>
          <span className="font-semibold text-gray-600">{coupon.validTill}</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{
              background: '#F5F7FA',
              border: `1.5px dashed ${coupon.iconColor}`,
            }}
          >
            <TagIcon className="w-4 h-4 flex-shrink-0" style={{ color: coupon.iconColor }} />
            <span className="font-bold text-[14px] tracking-wider" style={{ color: coupon.iconColor }}>
              {coupon.code}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-95"
            style={{
              background: copied ? '#1BA672' : coupon.gradient,
              boxShadow: 'none',
              minWidth: '90px',
            }}
          >
            {copied ? (
              <><CheckIcon className="w-4 h-4" /> {t('promos.copied', 'Copied')}</>
            ) : (
              <><ClipboardDocumentIcon className="w-4 h-4" /> {t('promos.copy', 'Copy')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const PromosPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const { t } = useLanguage();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCoupons = async () => {
      setLoading(true);
      try {
        const response = await getPublicCoupons();
        const rawCoupons = response?.data?.coupons || response?.coupons || [];
        if (cancelled) return;
        setCoupons(rawCoupons.map((coupon) => mapCouponForCard(coupon, t)));
      } catch {
        if (!cancelled) {
          setCoupons([]);
          toast.error(t('promos.failedLoad', 'Failed to load latest coupons'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCoupons();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(() => coupons.length, [coupons]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <SEO
        title="Offers & Coupons – FlashBites"
        description="Exclusive coupons and discount offers on FlashBites. Save on every order with active promo codes from admin and restaurants."
        url="/promos"
      />

      <div className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto min-h-screen">
        <div
          className="sticky top-0 z-20 px-4 pt-3 pb-4 bg-white"
          style={{ borderBottom: '1px solid #F0F2F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-[20px] font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                {t('promos.title', 'Offers & Coupons')}
              </h1>
              <p className="text-[12px] text-gray-400">{loading ? t('promos.loadingOffers', 'Loading offers...') : `${activeCount} ${t('promos.activeOffers', 'active offers')}`}</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#FFF7ED' }}
            >
              <StarIcon className="w-5 h-5" style={{ color: BRAND }} />
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div
            className="rounded-2xl p-5 text-white mb-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #3D1A1A 100%)' }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
              style={{ background: BRAND, transform: 'translate(40%, -40%)' }}
            />
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1">{t('promos.exclusive', 'FlashBites Exclusive')}</p>
            <p className="text-white text-[22px] font-black leading-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
              {t('promos.saveMore', 'Save More,')}<br />{t('promos.saveMore2', 'Order More')}
            </p>
            <p className="text-white/50 text-[13px]">{t('promos.verifiedOnly', 'Only verified active coupons are shown here')}</p>
          </div>
        </div>

        <div className="px-4 pb-28 space-y-3">
          {!isAuthenticated && (
            <div
              className="p-4 rounded-2xl flex items-center gap-3"
              style={{ background: '#FFF7ED', border: `1.5px solid ${BRAND}22` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: BRAND }}
              >
                <GiftIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900">{t('promos.loginApply', 'Log in to apply coupons')}</p>
                <p className="text-[12px] text-gray-500">{t('promos.loginCheckout', 'Sign in to use these offers at checkout')}</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto text-[12px] font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                style={{ background: BRAND }}
              >
                {t('promos.login', 'Login')}
              </button>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl p-5 text-sm text-gray-500" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              {t('promos.loadingCoupons', 'Loading coupons...')}
            </div>
          )}

          {!loading && coupons.length === 0 && (
            <div className="bg-white rounded-2xl p-5 text-sm text-gray-500" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              {t('promos.none', 'No active coupons are available right now.')}
            </div>
          )}

          {!loading && coupons.map((coupon) => (
            <CouponCard key={coupon._id} coupon={coupon} t={t} />
          ))}

          <div className="pt-2 pb-4 text-center">
            <p className="text-[12px] text-gray-400">
              {t('promos.managedByAdmin', 'Offers are managed by admin and may change without notice.')}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {t('promos.needHelp', 'Need help?')}{' '}
              <a href="mailto:info.flashbites@gmail.com" className="font-semibold" style={{ color: BRAND }}>
                info.flashbites@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromosPage;
