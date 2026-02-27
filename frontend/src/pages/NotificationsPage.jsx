import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import {
  FiArrowLeft,
  FiWifiOff,
  FiWifi,
  FiVolume2,
  FiVolumeX,
  FiBell,
  FiBellOff,
  FiSliders,
  FiZap,
  FiMonitor,
} from 'react-icons/fi';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    connected,
    soundEnabled,
    toggleSound,
    requestNotificationPermission,
    notificationPermission,
  } = useNotifications();

  const browserBlocked = notificationPermission === 'denied';
  const browserGranted = notificationPermission === 'granted';

  return (
    <div className="bg-[#f3f4f6] min-h-screen">
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#f3f4f6] pb-8">
        <header className="sticky top-0 z-10 bg-[#f3f4f6] border-b border-slate-200 px-5 py-5">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-0 w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-semibold text-slate-900">Notification Settings</h1>
          </div>
        </header>

        <main className="px-5 pt-6 space-y-7">
          <section>
            <h2 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-3">Connection Status</h2>
            <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${connected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {connected ? <FiWifi className="w-7 h-7" /> : <FiWifiOff className="w-7 h-7" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-slate-900">Real-time Connection</p>
                    <p className={`text-[13px] font-medium ${connected ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {connected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <span className={`w-4 h-4 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'} shadow`} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-3">Preferences</h2>
            <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    {soundEnabled ? <FiVolume2 className="w-7 h-7" /> : <FiVolumeX className="w-7 h-7" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-slate-900">Sound Notifications</p>
                    <p className="text-[13px] text-slate-500 leading-6">Play sound when you receive new orders or updates</p>
                  </div>
                </div>
                <button
                  onClick={toggleSound}
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  className={`inline-flex w-14 h-8 items-center rounded-full p-1 transition-colors ${soundEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                >
                  <span className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${browserGranted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {browserGranted ? <FiBell className="w-7 h-7" /> : <FiBellOff className="w-7 h-7" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-slate-900">Browser Notifications</p>
                    <p className={`text-[13px] font-medium ${browserBlocked ? 'text-rose-500' : browserGranted ? 'text-emerald-600' : 'text-orange-500'}`}>
                      Status: {browserBlocked ? 'Blocked' : browserGranted ? 'Enabled' : 'Not enabled'}
                    </p>
                    {!browserGranted && (
                      <p className="text-[13px] text-slate-500 leading-6 mt-1">
                        Please enable notifications in your browser settings to receive alerts while away from this tab.
                      </p>
                    )}
                  </div>
                </div>
                {!browserGranted && (
                  <button
                    onClick={requestNotificationPermission}
                    className="h-10 px-4 rounded-full bg-[#fff0ea] text-orange-500 text-[15px] font-semibold"
                  >
                    Fix
                  </button>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-3">How It Works</h2>
            <div className="rounded-3xl border border-orange-100 bg-[#fff8f5] p-5 space-y-4">
              <div className="flex items-start gap-3">
                <FiVolume2 className="w-5 h-5 text-orange-500 mt-0.5" />
                <p className="text-[15px] text-slate-700 leading-7">Sound alerts play instantly when you receive notifications</p>
              </div>
              <div className="flex items-start gap-3">
                <FiMonitor className="w-5 h-5 text-orange-500 mt-0.5" />
                <p className="text-[15px] text-slate-700 leading-7">Browser notifications work even when FlashBites tab is in background</p>
              </div>
              <div className="flex items-start gap-3">
                <FiZap className="w-5 h-5 text-orange-500 mt-0.5" />
                <p className="text-[15px] text-slate-700 leading-7">All notifications are real-time with no delays</p>
              </div>
              <div className="flex items-start gap-3">
                <FiSliders className="w-5 h-5 text-orange-500 mt-0.5" />
                <p className="text-[15px] text-slate-700 leading-7">You can toggle sound on/off anytime without affecting connection</p>
              </div>
            </div>
          </section>
        </main>

      </div>
    </div>
  );
};

export default NotificationsPage;
