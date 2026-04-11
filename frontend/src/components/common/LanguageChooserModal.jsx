import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageChooserModal = ({ canClose = false, minVisibleMs = 3000 }) => {
  const { setLanguage, closeLanguageModal, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    setCanContinue(false);
    const timer = setTimeout(() => {
      setCanContinue(true);
    }, minVisibleMs);

    return () => clearTimeout(timer);
  }, [minVisibleMs]);

  const applyLanguage = () => {
    if (!canContinue) return;
    setLanguage(selectedLanguage);
  };

  return (
    <div className="fixed inset-0 z-[3200] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center px-4">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          {canClose && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={closeLanguageModal}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close language selector"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-[8px] uppercase tracking-[0.24em] text-gray-400 font-semibold">
            {t('language.switch', 'Language')}
          </p>
          <h2 className="text-[21px] leading-none font-black text-gray-900 mt-2">
            {t('language.chooseTitle', 'Choose your language')}
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            {t('language.chooseDescription', 'You can change this anytime later.')}
          </p>
        </div>

        <div className="p-4 space-y-3">
          <button
            type="button"
            onClick={() => setSelectedLanguage('en')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-left ${
              selectedLanguage === 'en'
                ? 'border-[#EA580C] bg-orange-50'
                : 'border-gray-200 hover:border-[#EA580C] hover:bg-orange-50'
            }`}
          >
            <div className="h-11 w-11 rounded-2xl bg-[#FFF0ED] flex items-center justify-center text-lg">A</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{t('language.english', 'English')}</p>
              <p className="text-[10px] text-gray-500">English</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedLanguage('hi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-left ${
              selectedLanguage === 'hi'
                ? 'border-[#EA580C] bg-orange-50'
                : 'border-gray-200 hover:border-[#EA580C] hover:bg-orange-50'
            }`}
          >
            <div className="h-11 w-11 rounded-2xl bg-[#FFF0ED] flex items-center justify-center text-lg">अ</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{t('language.hindi', 'हिंदी')}</p>
              <p className="text-[10px] text-gray-500">Hindi</p>
            </div>
          </button>

          <button
            type="button"
            onClick={applyLanguage}
            disabled={!canContinue}
            className="w-full rounded-2xl px-4 py-3 text-[12px] font-semibold text-white bg-[#EA580C] hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {t('language.continue', 'Continue')}
          </button>
          {!canContinue && (
            <p className="text-[11px] text-center text-gray-500">
              {t('language.waitToContinue', 'Please wait a moment...')}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LanguageChooserModal;
