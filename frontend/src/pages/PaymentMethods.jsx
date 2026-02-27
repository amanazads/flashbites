import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiPlusCircle,
  FiMoreVertical,
  FiTrash2,
  FiShield,
  FiCreditCard,
  FiCheckCircle,
  FiDollarSign,
  FiLayers,
  FiClock,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getUserOrders } from '../api/orderApi';

const initialUpi = [];
const initialCards = [];
const initialWallets = [];
const LS_KEYS = {
  cards: 'payment_methods_manual_cards',
  upi: 'payment_methods_manual_upi',
  wallets: 'payment_methods_manual_wallets',
  option: 'payment_methods_selected_option',
};

const loadStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const extraPaymentOptions = [
  { id: 'opt_cod', title: 'Cash on Delivery', subtitle: 'Pay when order arrives', icon: FiDollarSign },
  { id: 'opt_netbanking', title: 'Net Banking', subtitle: 'Pay directly from bank account', icon: FiLayers },
  { id: 'opt_paylater', title: 'Pay Later', subtitle: 'Buy now, pay in easy installments', icon: FiClock },
];

const PaymentMethods = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState(() => loadStored(LS_KEYS.cards, initialCards));
  const [upiIds, setUpiIds] = useState(() => loadStored(LS_KEYS.upi, initialUpi));
  const [wallets, setWallets] = useState(() => loadStored(LS_KEYS.wallets, initialWallets));
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [methodType, setMethodType] = useState('card');
  const [inputValue, setInputValue] = useState('');
  const [selectedExtraOption, setSelectedExtraOption] = useState(() => loadStored(LS_KEYS.option, 'opt_cod'));
  const [loading, setLoading] = useState(true);

  const allMethods = useMemo(() => {
    const cardMethods = cards.map((c) => ({ id: c.id, type: 'card', label: c.title || 'Card' }));
    const upiMethods = upiIds.map((u) => ({ id: u.id, type: 'upi', label: u.handle }));
    return [...cardMethods, ...upiMethods];
  }, [cards, upiIds]);

  useEffect(() => {
    const loadMethods = async () => {
      try {
        const response = await getUserOrders({ limit: 50 });
        const orders = response?.data?.orders || [];

        const seen = new Set();
        const realCards = [];
        const realUpis = [];

        orders.forEach((order) => {
          const method = order?.paymentMethod;
          if (!method || seen.has(method)) return;
          seen.add(method);

          const usedOn = order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'recently';

          if (method === 'card') {
            realCards.push({
              id: `card-${order._id}`,
              title: 'Card Payment',
              subtitle: `Last used on ${usedOn}`,
            });
          }

          if (method === 'upi') {
            realUpis.push({
              id: `upi-${order._id}`,
              handle: 'UPI Payment',
              label: `Last used on ${usedOn}`,
              active: true,
            });
          }

          if (method === 'cod') {
            setSelectedExtraOption('opt_cod');
          }
        });

        setCards((prev) => {
          const manual = prev.filter((c) => String(c.id).startsWith('manual-card_'));
          return [...manual, ...realCards];
        });

        setUpiIds((prev) => {
          const manual = prev.filter((u) => String(u.id).startsWith('manual-upi_'));
          return [...manual, ...realUpis];
        });

        const firstMethod = realCards[0]?.id || realUpis[0]?.id || cards[0]?.id || upiIds[0]?.id || '';
        setSelectedMethodId(firstMethod);
      } catch {
        toast.error('Failed to load payment methods');
      } finally {
        setLoading(false);
      }
    };

    loadMethods();
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.cards, JSON.stringify(cards.filter((c) => String(c.id).startsWith('manual-card_'))));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.upi, JSON.stringify(upiIds.filter((u) => String(u.id).startsWith('manual-upi_'))));
  }, [upiIds]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.wallets, JSON.stringify(wallets.filter((w) => String(w.id).startsWith('manual-wallet_'))));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.option, JSON.stringify(selectedExtraOption));
  }, [selectedExtraOption]);

  const addMethod = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      toast.error('Please enter details');
      return;
    }

    if (methodType === 'card') {
      const last4 = inputValue.replace(/\s+/g, '').slice(-4);
      if (last4.length < 4) {
        toast.error('Enter valid card number');
        return;
      }
      const newCard = {
        id: `manual-card_${Date.now()}`,
        title: `Card •••• ${last4}`,
        subtitle: 'Added manually',
      };
      setCards((prev) => [newCard, ...prev]);
      setSelectedMethodId(newCard.id);
      toast.success('Card added');
    } else if (methodType === 'upi') {
      if (!inputValue.includes('@')) {
        toast.error('Enter valid UPI ID');
        return;
      }
      const newUpi = {
        id: `manual-upi_${Date.now()}`,
        handle: inputValue.trim(),
        label: 'New UPI ID',
        active: true,
      };
      setUpiIds((prev) => [newUpi, ...prev.map((u) => ({ ...u, active: false }))]);
      setSelectedMethodId(newUpi.id);
      toast.success('UPI ID added');
    } else {
      const walletName = inputValue.trim();
      const newWallet = {
        id: `manual-wallet_${Date.now()}`,
        name: walletName,
        status: 'Linked',
        action: 'MANAGE',
        linked: true,
      };
      setWallets((prev) => [newWallet, ...prev]);
      toast.success('Wallet added');
    }

    setInputValue('');
    setShowAddModal(false);
  };

  const removeUpi = (id) => {
    setUpiIds((prev) => prev.filter((u) => u.id !== id));
    if (selectedMethodId === id) setSelectedMethodId(allMethods[0]?.id || '');
    toast.success('UPI ID removed');
  };

  const removeWallet = (id) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
    toast.success('Wallet removed');
  };

  return (
    <div className="bg-[#f3f4f6] min-h-screen">
      <div className="max-w-md mx-auto px-5 pt-5 pb-28">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Payment Methods</h1>
          <div className="w-9 h-9" />
        </div>

        {(loading || cards.length > 0) && (
          <section className="mt-6">
            <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Saved Cards</h3>
            {loading && <div className="text-xs text-slate-400 px-1 py-2">Loading...</div>}
            <div className="space-y-2">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedMethodId(card.id)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-8 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center">
                      <span className="px-1 truncate">CARD</span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[16px] font-semibold text-slate-900 leading-5">{card.title}</p>
                      <p className="text-[13px] text-slate-500">{card.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedMethodId === card.id && <FiCheckCircle className="w-4 h-4 text-green-500" />}
                    <FiMoreVertical className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {upiIds.length > 0 && (
          <section className="mt-5">
            <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">UPI IDs</h3>
            <div className="space-y-2">
              {upiIds.map((upi) => (
                <button
                  key={upi.id}
                  onClick={() => setSelectedMethodId(upi.id)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#f3ece8] text-orange-500 flex items-center justify-center shrink-0">
                      <FiCreditCard className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[16px] font-semibold text-slate-900">{upi.handle}</p>
                      <p className="text-[13px] text-slate-500">{upi.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedMethodId === upi.id && <span className="w-2 h-2 rounded-full bg-green-500" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUpi(upi.id);
                      }}
                      className="text-slate-400"
                      aria-label="Delete UPI"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {wallets.length > 0 && (
          <section className="mt-5">
            <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Digital Wallets</h3>
            <div className="space-y-2">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="rounded-xl bg-white border border-slate-200 px-3 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-cyan-100 flex items-center justify-center text-cyan-700 text-[11px] font-bold">
                      {wallet.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-slate-900">{wallet.name}</p>
                      <p className="text-[13px] text-slate-500">{wallet.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 rounded-full bg-orange-50 text-orange-500 text-[11px] font-semibold">
                      {wallet.action}
                    </button>
                    <button
                      onClick={() => removeWallet(wallet.id)}
                      className="text-slate-400"
                      aria-label="Delete wallet"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">More Payment Options</h3>
          <div className="space-y-2">
            {extraPaymentOptions.map((option) => {
              const Icon = option.icon;
              const active = selectedExtraOption === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedExtraOption(option.id)}
                  className={`w-full rounded-xl border px-3 py-3 flex items-center justify-between transition-colors ${
                    active ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${active ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900">{option.title}</p>
                      <p className="text-[12px] text-slate-500">{option.subtitle}</p>
                    </div>
                  </div>
                  {active && <FiCheckCircle className="w-4 h-4 text-green-500" />}
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-6 rounded-3xl border border-slate-200 border-dashed bg-[#eef2f6] px-4 py-4 flex items-start gap-3">
          <FiShield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[13px] text-slate-500 leading-5">
            Your payment details are secure. FlashBites uses industry-standard encryption to protect your data.
          </p>
        </div>
      </div>

      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full h-11 rounded-full bg-orange-500 text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-sm"
        >
          <FiPlusCircle className="w-5 h-5" />
          Add New Payment Method
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-3xl p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Add Payment Method</h2>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMethodType('card')}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold ${methodType === 'card' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Card
              </button>
              <button
                onClick={() => setMethodType('upi')}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold ${methodType === 'upi' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                UPI ID
              </button>
              <button
                onClick={() => setMethodType('wallet')}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold ${methodType === 'wallet' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Wallet
              </button>
            </div>
            <form onSubmit={addMethod} className="space-y-3">
              <input
                placeholder={
                  methodType === 'card'
                    ? 'Enter card number'
                    : methodType === 'upi'
                      ? 'Enter UPI ID'
                      : 'Enter wallet name'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-orange-500 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;
