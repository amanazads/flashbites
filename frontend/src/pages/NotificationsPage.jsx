import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import NotificationSettings from '../components/common/NotificationSettings';
import logo from '../assets/logo.png';
import { useLanguage } from '../contexts/LanguageContext';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-3xl mx-auto container-px pt-0 pb-6 sm:pb-8">
        <div className="px-4 pt-[max(env(safe-area-inset-top),10px)] -mx-6 max-[388px]:-mx-4 mb-4" style={{ backgroundColor: 'rgb(245, 243, 241)' }}>
          <div className="flex items-center justify-between mb-4">
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
                  <p className="text-[12px] leading-none font-semibold text-gray-900">{t('common.currentArea', 'Current Area')}</p>
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

        <NotificationSettings />
      </div>
    </div>
  );
};

export default NotificationsPage;
