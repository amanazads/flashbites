import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { BRAND } from '../../constants/theme';

const LocationGateModal = ({
  isOpen,
  selectedAddress,
  savedAddresses = [],
  isAuthenticated = false,
  detectingLocation = false,
  onUseCurrentLocation,
  onSelectSavedAddress,
  onOpenManualAddress,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1600] bg-slate-950/60 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
          >
            <div
              className="px-6 py-6 border-b border-orange-100"
              style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 70%)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] text-orange-500 uppercase">Choose Location</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900" style={{ letterSpacing: '-0.03em' }}>
                    Where should we deliver?
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Select your current location or enter a delivery address to see restaurants available for that area.
                  </p>
                </div>
                {selectedAddress && typeof onClose === 'function' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-white text-slate-500 hover:bg-orange-50"
                    aria-label="Close location selector"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <button
                type="button"
                onClick={onUseCurrentLocation}
                disabled={detectingLocation}
                className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-left transition hover:bg-orange-100 disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <MapPinIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {detectingLocation ? 'Detecting your current location...' : 'Use Current Location'}
                    </p>
                    <p className="text-xs text-slate-500">Use GPS to show restaurants delivering near you right now.</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-orange-500" />
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenManualAddress}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                    <PlusIcon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {isAuthenticated ? 'Add or Select Delivery Address' : 'Enter Delivery Address'}
                    </p>
                    <p className="text-xs text-slate-500">Search an address, fine-tune the pin on map, and browse that area.</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                </div>
              </button>

              {savedAddresses.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Saved Addresses</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr._id}
                        type="button"
                        onClick={() => onSelectSavedAddress(addr)}
                        className="flex w-full items-center gap-3 border-b border-slate-200/80 px-4 py-3 text-left last:border-b-0 hover:bg-white"
                      >
                        <MapPinIcon className="h-4 w-4 flex-shrink-0 text-orange-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{addr.fullAddress || addr.street}</p>
                          <p className="text-xs capitalize text-slate-500">{addr.type || 'saved address'}</p>
                        </div>
                        {selectedAddress?.id === addr._id && (
                          <CheckIcon className="h-4 w-4 flex-shrink-0" style={{ color: BRAND }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isAuthenticated && (
                <p className="px-1 text-xs text-slate-500">
                  <Link to="/login" className="font-semibold text-orange-600">Sign in</Link> to save addresses for faster checkout later.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationGateModal;
