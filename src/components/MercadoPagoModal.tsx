import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  QrCode,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  Lock,
  Phone,
  KeyRound,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Repeat,
  Printer,
  ShieldCheck,
  FileText
} from 'lucide-react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

import {
  createMercadoPagoSubscription,
  createMercadoPagoPreference,
  createMercadoPagoPix,
  checkMercadoPagoPayment,
  getMercadoPagoStatus,
  processMercadoPagoCardPayment,
  MercadoPagoSubscriptionResponse,
  MercadoPagoPixResponse,
  MercadoPagoPreferenceResponse
} from '../services/mercadoPago';
import { fetchSubscriptionPlans, INITIAL_PLANS } from '../services/subscriberBilling';
import type { SubscriptionPlanPricing } from '../types';
import {
  PIX_KEY_RAW,
  PIX_KEY_FORMATTED,
  PIX_RECEIVER_NAME,
  generatePixPayload,
  generateQrCodeDataUrl
} from '../utils/pix';
import confetti from 'canvas-confetti';

interface MercadoPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  description?: string;
  payerName?: string;
  payerEmail?: string;
  referenceId?: string;
  requirePlanSelection?: boolean;
  selectedPlanId?: string;
  onPaymentSuccess?: (paymentInfo: { method: string; amount: number; paymentId?: string | number; planName?: string }) => void;
}

export const MercadoPagoModal: React.FC<MercadoPagoModalProps> = ({
  isOpen,
  onClose,
  title,
  amount,
  description,
  payerName,
  payerEmail,
  referenceId,
  requirePlanSelection = false,
  selectedPlanId,
  onPaymentSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'pix' | 'card'>('pix');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Plans & Flexible Amount State
  const [plans, setPlans] = useState<SubscriptionPlanPricing[]>(() => [...INITIAL_PLANS].sort((a, b) => a.price - b.price));
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [currentAmount, setCurrentAmount] = useState<number | null>(null);
  const [activeBillingCycle, setActiveBillingCycle] = useState<'Mensal' | 'Anual' | 'Gratuito'>('Mensal');
  const [activeTitle, setActiveTitle] = useState<string>(title);
  const [activeDescription, setActiveDescription] = useState<string>(description || title);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // PIX state
  const [pixData, setPixData] = useState<MercadoPagoPixResponse | null>(null);
  const [qrCodeImgUrl, setQrCodeImgUrl] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins

  // Card / Checkout Pro & Recurring Subscription state
  const [prefData, setPrefData] = useState<MercadoPagoPreferenceResponse | null>(null);
  const [subData, setSubData] = useState<MercadoPagoSubscriptionResponse | null>(null);

  // Transparent Card Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState(payerName || 'Titular do Cartão');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('2028');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');
  const [cardInstallments, setCardInstallments] = useState('1');
  const [cardProcessing, setCardProcessing] = useState(false);

  const loadConfigAndData = useCallback(async (
    targetAmount: number,
    targetTitle: string,
    targetDesc: string,
    targetCycle: 'Mensal' | 'Anual' | 'Gratuito' = 'Mensal'
  ) => {
    if (targetAmount <= 0) {
      setLoading(false);
      setError(null);
      setPixData(null);
      setPrefData(null);
      setSubData(null);
      setQrCodeImgUrl('');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await getMercadoPagoStatus().catch(() => null);

      const standardPayload = generatePixPayload({
        key: PIX_KEY_RAW,
        name: PIX_RECEIVER_NAME,
        amount: Number(targetAmount) > 0 ? Number(targetAmount) : undefined,
        description: targetDesc || targetTitle,
        txId: referenceId ? referenceId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) : undefined,
      });

      const localQrUrl = await generateQrCodeDataUrl(standardPayload);
      setQrCodeImgUrl(localQrUrl);

      try {
        const pix = await createMercadoPagoPix({
          amount: targetAmount,
          description: targetDesc || targetTitle,
          payerName,
          payerEmail,
          referenceId,
        });
        setPixData({
          ...pix,
          qrCode: pix.qrCode || standardPayload,
        });

        if (pix.qrCodeBase64) {
          setQrCodeImgUrl(`data:image/jpeg;base64,${pix.qrCodeBase64}`);
        }
      } catch {
        setPixData({
          paymentId: `PIX-${Date.now()}`,
          status: 'pending',
          qrCode: standardPayload,
          pixKey: PIX_KEY_FORMATTED,
          mode: 'pix_direct'
        });
      }

      createMercadoPagoSubscription({
        title: targetTitle,
        planName: targetTitle,
        billingCycle: targetCycle,
        amount: targetAmount,
        description: targetDesc,
        payerName,
        payerEmail,
        referenceId,
      }).then(sub => {
        setSubData(sub);
      }).catch(() => {
        setSubData(null);
      });

      createMercadoPagoPreference({
        title: targetTitle,
        amount: targetAmount,
        description: targetDesc,
        payerName,
        payerEmail,
        referenceId,
      }).then(pref => {
        setPrefData(pref);
      }).catch(() => {
        // Ignore background preference errors
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao conectar ao Mercado Pago');
    } finally {
      setLoading(false);
    }
  }, [payerEmail, payerName, referenceId]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setError(null);
    setIsApproved(false);
    setTimeLeft(900);
    setShowCustomInput(false);
    setPixData(null);
    setPrefData(null);
    setSubData(null);
    setQrCodeImgUrl('');
    setCardHolderName(payerName || 'Titular do Cartão');

    const initModal = async () => {
      let loadedPlans = [...INITIAL_PLANS].sort((a, b) => a.price - b.price);
      try {
        const fetched = await fetchSubscriptionPlans();
        if (fetched && fetched.length > 0) {
          loadedPlans = [...fetched].sort((a, b) => a.price - b.price);
        }
      } catch {
        // Use INITIAL_PLANS fallback
      }

      if (cancelled) return;
      setPlans(loadedPlans);

      if (requirePlanSelection) {
        // Open in free-choice plan showcase mode without forcing any fixed price
        setSelectedOptionId(null);
        setCurrentAmount(null);
        setActiveTitle('Selecione um dos planos disponíveis abaixo');
        setActiveDescription(description || title);
        setLoading(false);
        return;
      }

      const explicitPlan = selectedPlanId
        ? loadedPlans.find(p => p.id === selectedPlanId)
        : loadedPlans.find(p => Math.abs(Number(p.price) - Number(amount)) < 0.01);

      if (explicitPlan && amount !== 500) {
        const price = Number(explicitPlan.price) || 0;
        const cycle = explicitPlan.billingCycle || (price === 0 ? 'Gratuito' : 'Mensal');
        const nextTitle = price === 0
          ? `${explicitPlan.name} (R$ 0,00)`
          : cycle === 'Anual'
          ? `${explicitPlan.name} (Assinatura Anual Construtoras)`
          : `${explicitPlan.name} (Assinatura Mensal Recorrente)`;
        const nextDesc = `${explicitPlan.name} - ${explicitPlan.targetAudience}`;
        setSelectedOptionId(explicitPlan.id);
        setCurrentAmount(price);
        setActiveBillingCycle(cycle);
        setActiveTitle(nextTitle);
        setActiveDescription(nextDesc);
        loadConfigAndData(price, nextTitle, nextDesc, cycle);
      } else if (amount > 0 && amount !== 500) {
        const inferredCycle = amount >= 400 ? 'Anual' : 'Mensal';
        setSelectedOptionId('project-custom');
        setCurrentAmount(Number(amount));
        setActiveBillingCycle(inferredCycle);
        setActiveTitle(title);
        setActiveDescription(description || title);
        loadConfigAndData(Number(amount), title, description || title, inferredCycle);
      } else {
        setSelectedOptionId(null);
        setCurrentAmount(null);
        setActiveBillingCycle('Mensal');
        setActiveTitle('Selecione um dos planos disponíveis abaixo');
        setActiveDescription(description || title);
        setLoading(false);
      }
    };

    initModal();
    return () => {
      cancelled = true;
    };
  }, [isOpen, amount, title, description, payerName, requirePlanSelection, selectedPlanId, loadConfigAndData]);

  // Countdown timer for PIX
  useEffect(() => {
    if (!isOpen || !pixData || isApproved || timeLeft <= 0 || !currentAmount || currentAmount <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, pixData, isApproved, timeLeft, currentAmount]);

  // Real-time status polling
  useEffect(() => {
    if (!isOpen || isApproved || !referenceId || !currentAmount || currentAmount <= 0) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/mercadopago/payment-status/${referenceId}`);
        const data = await response.json();

        if (data.found && data.status === 'approved') {
          triggerSuccess(activeTab.toUpperCase());
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    };

    pollStatus();
    const pollInterval = setInterval(pollStatus, 4000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isOpen, isApproved, referenceId, activeTab, currentAmount]);

  const handleSelectPlan = (plan: SubscriptionPlanPricing) => {
    const price = Number(plan.price) || 0;
    const cycle = plan.billingCycle || (price === 0 ? 'Gratuito' : 'Mensal');
    const nextTitle = price === 0
      ? `${plan.name} (R$ 0,00)`
      : cycle === 'Anual'
      ? `${plan.name} (Assinatura Anual Construtoras)`
      : `${plan.name} (Assinatura Mensal Recorrente)`;
    const nextDesc = `${plan.name} - ${plan.targetAudience}`;
    setSelectedOptionId(plan.id);
    setShowCustomInput(false);
    setCurrentAmount(price);
    setActiveBillingCycle(cycle);
    setActiveTitle(nextTitle);
    setActiveDescription(nextDesc);
    setTimeLeft(900);
    loadConfigAndData(price, nextTitle, nextDesc, cycle);
  };

  const handleSelectProjectAmount = () => {
    const val = Number(amount);
    const inferredCycle = val >= 400 ? 'Anual' : 'Mensal';
    setSelectedOptionId('project-custom');
    setShowCustomInput(false);
    setCurrentAmount(val);
    setActiveBillingCycle(inferredCycle);
    setActiveTitle(title);
    setActiveDescription(description || title);
    setTimeLeft(900);
    loadConfigAndData(val, title, description || title, inferredCycle);
  };

  const handleApplyCustomAmount = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(customAmountInput.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setError('Informe um valor válido maior que R$ 0,00 para gerar o checkout.');
      return;
    }
    const nextTitle = `Pagamento Personalizado - ${title}`;
    setSelectedOptionId('manual-custom');
    setCurrentAmount(parsed);
    setActiveTitle(nextTitle);
    setActiveDescription(description || nextTitle);
    setTimeLeft(900);
    loadConfigAndData(parsed, nextTitle, description || nextTitle);
  };

  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyKeyOnly = () => {
    navigator.clipboard.writeText(PIX_KEY_RAW);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleCheckPayment = async () => {
    if (!pixData?.paymentId) return;
    try {
      setLoading(true);
      const res = await checkMercadoPagoPayment(pixData.paymentId);
      if (res.status === 'approved') {
        triggerSuccess('PIX');
      } else {
        setError('Aguardando compensação do pagamento no Mercado Pago. Se já realizou o PIX, aguarde alguns instantes ou confirme manualmente abaixo.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erro ao consultar status');
    } finally {
      setLoading(false);
    }
  };

  const triggerSuccess = (method: string) => {
    setIsApproved(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    if (onPaymentSuccess) {
      onPaymentSuccess({
        method,
        amount: currentAmount ?? 0,
        paymentId: pixData?.paymentId,
        planName: activeTitle,
      });
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const hasSpecificProjectOption =
    !requirePlanSelection &&
    amount > 0 &&
    amount !== 500 &&
    !plans.some(p => Math.abs(Number(p.price) - Number(amount)) < 0.01);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-[#009ee3] text-white p-5 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#009ee3] flex items-center justify-center font-black text-xl shadow-xs">
              mp
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">Planos &amp; Checkout Mercado Pago</span>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mensal &amp; Anual
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium">
                Planos mensais (R$ 25,00, R$ 29,90, R$ 49,90), Anual Construtor (R$ 499,00/ano) ou Cadastro Gratuito (só oportunidades)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1">
          {/* Amount & Plan Selection Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 border-b border-slate-200/70 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {currentAmount === 0
                    ? 'Cadastro Selecionado'
                    : activeBillingCycle === 'Anual'
                    ? 'Assinatura Anual Selecionada'
                    : 'Assinatura Mensal Selecionada'}
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {currentAmount === null
                    ? 'Escolha um plano abaixo'
                    : currentAmount === 0
                    ? 'Cadastro Gratuito (R$ 0,00)'
                    : `R$ ${Number(currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${activeBillingCycle === 'Anual' ? '/ano' : '/mês'}`}
                </span>
              </div>
              <div className="text-right max-w-[280px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Modalidade Ativa
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">
                  {activeTitle}
                </span>
              </div>
            </div>

            {/* All Available Plans Grid */}
            {!isApproved && (
              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-[#009ee3]" />
                    Planos Disponíveis ({plans.length} opções):
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(prev => !prev)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                        showCustomInput || selectedOptionId === 'manual-custom'
                          ? 'bg-[#009ee3] text-white border-[#009ee3]'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#009ee3]'
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Digitar Outro Valor</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {hasSpecificProjectOption && (
                    <button
                      type="button"
                      onClick={handleSelectProjectAmount}
                      className={`text-left p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedOptionId === 'project-custom'
                          ? 'border-[#009ee3] bg-sky-50/90 dark:bg-sky-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-sky-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            Valor da Obra / Serviço
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            {title}
                          </span>
                        </div>
                        <span className="text-sm font-black text-[#009ee3] tabular-nums shrink-0">
                          R$ {Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </button>
                  )}

                  {plans.map((plan) => {
                    const isSelected = selectedOptionId === plan.id;
                    const priceValue = Number(plan.price) || 0;
                    const isAnnualPlan = plan.billingCycle === 'Anual';
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handleSelectPlan(plan)}
                        className={`text-left p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-[#009ee3] bg-sky-50/90 dark:bg-sky-950/40 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {plan.name}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                priceValue === 0
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : isAnnualPlan
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-[#009ee3]/15 text-[#009ee3]'
                              }`}>
                                {priceValue === 0
                                  ? 'Só Oportunidades'
                                  : isAnnualPlan
                                  ? 'Anual Construtoras'
                                  : 'Mensal Recorrente'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {plan.targetAudience}
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-1.5">
                            <span className={`text-sm font-black tabular-nums ${
                              priceValue === 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isSelected
                                ? 'text-[#009ee3]'
                                : 'text-slate-900 dark:text-white'
                            }`}>
                              {priceValue === 0
                                ? 'R$ 0,00'
                                : `R$ ${priceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${isAnnualPlan ? '/ano' : '/mês'}`}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#009ee3] shrink-0" />}
                          </div>
                        </div>

                        {plan.features && plan.features.length > 0 && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-x-2 gap-y-0.5">
                            {plan.features.slice(0, 2).map((feat, idx) => (
                              <span key={idx}>• {feat}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Form */}
                {showCustomInput && (
                  <form onSubmit={handleApplyCustomAmount} className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Digite o valor desejado (ex: 250,00)"
                      value={customAmountInput}
                      onChange={e => setCustomAmountInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#009ee3]"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-[#009ee3] hover:bg-[#0082ba] text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                    >
                      Aplicar Valor
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Payment Tabs (visible only once a paid plan > 0 is selected) */}
          {!isApproved && currentAmount !== null && currentAmount > 0 && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                onClick={() => setActiveTab('pix')}
                className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                  activeTab === 'pix'
                    ? 'border-[#009ee3] text-[#009ee3] bg-[#009ee3]/5'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>PIX Transparente (QR Code &amp; Copia e Cola)</span>
              </button>

              <button
                onClick={() => setActiveTab('card')}
                className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                  activeTab === 'card'
                    ? 'border-[#009ee3] text-[#009ee3] bg-[#009ee3]/5'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#009ee3]" />
                <span>Cartão de Crédito Transparente</span>
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-4">
            {loading && (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#009ee3] animate-spin" />
                <p className="text-xs text-slate-500 font-medium">
                  Gerando QR Code e Checkout para R$ {Number(currentAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}...
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-bold block mb-0.5">Aviso de Pagamento</span>
                  {error}
                </div>
              </div>
            )}

            {isApproved ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {currentAmount === 0
                    ? 'Cadastro Gratuito Ativado!'
                    : activeBillingCycle === 'Anual'
                    ? 'Assinatura Anual Confirmada!'
                    : 'Assinatura Mensal Confirmada!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {currentAmount === 0
                    ? `Seu cadastro gratuito "${activeTitle}" (R$ 0,00) foi ativado apenas para visualização de oportunidades.`
                    : `A assinatura ${activeBillingCycle === 'Anual' ? 'anual' : 'mensal recorrente'} de R$ ${Number(currentAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${activeBillingCycle === 'Anual' ? '/ano' : '/mês'} (${activeTitle}) foi registrada com sucesso.`}
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            ) : currentAmount === null && !loading ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 text-center space-y-2">
                <Repeat className="w-7 h-7 text-[#009ee3] mx-auto" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Escolha um plano pago para liberar os serviços ou mantenha o cadastro gratuito
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Assine um plano mensal (<strong>Mensal Básico R$ 25,00</strong>, <strong>Mensal Pro R$ 29,90</strong>, <strong>Mensal Construtor R$ 49,90</strong>), o plano anual para construtoras/incorporadoras (<strong>Anual Construtor R$ 499,00/ano</strong>) ou mantenha o <strong>Cadastro Gratuito (R$ 0,00 — apenas visualização das oportunidades)</strong>.
                </p>
              </div>
            ) : currentAmount === 0 && !loading ? (
              /* Free Registration Activation View */
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                      {activeTitle} — Sem Custo de Adesão (R$ 0,00)
                    </h4>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/90 mt-1">
                      O cadastro gratuito permite <strong>apenas visualização das oportunidades</strong> abertas na plataforma e <strong>não dá acesso aos serviços</strong> (RDO, Orçamento, Propostas, ART/Laudos ou WhatsApp). Selecione um plano pago acima para liberar os serviços.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerSuccess('Cadastro Gratuito (R$ 0,00)')}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Cadastro Gratuito (Só Oportunidades)</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mercado Pago Recurring Monthly/Annual Subscription CTA */}
                {!loading && subData?.initPoint && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#009ee3]/10 via-sky-50 to-indigo-50 dark:from-[#009ee3]/20 dark:via-slate-800 dark:to-slate-800 border border-[#009ee3]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#007eb5] dark:text-sky-300">
                        <Repeat className="w-4 h-4 shrink-0" />
                        <span>
                          {activeBillingCycle === 'Anual'
                            ? 'Assinatura Anual Recorrente no Mercado Pago'
                            : 'Assinatura Mensal Recorrente no Mercado Pago'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {activeBillingCycle === 'Anual' ? 'Cobrança anual automática de ' : 'Cobrança automática todo mês de '}
                        <strong>
                          R$ {Number(currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          {activeBillingCycle === 'Anual' ? '/ano' : '/mês'}
                        </strong>{' '}
                        gerenciada pelo Mercado Pago.
                      </p>
                    </div>
                    <a
                      href={subData.initPoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-[#009ee3] hover:bg-[#0082ba] text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 whitespace-nowrap"
                    >
                      <span>{activeBillingCycle === 'Anual' ? 'Assinar Anualmente no MP' : 'Assinar Mensalmente no MP'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {/* TAB 1: PIX */}
                {activeTab === 'pix' && !loading && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                          <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chave PIX (Telefone / Celular)</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          Ativa
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                              {PIX_KEY_FORMATTED}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {PIX_KEY_RAW} • Favorecido: {PIX_RECEIVER_NAME}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleCopyKeyOnly}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                            copiedKey
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                          }`}
                          title="Copiar apenas o número da chave PIX"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey ? 'Copiada!' : 'Copiar Chave'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300">
                      <span className="font-medium">Válido por:</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{formattedTime}</span>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                      {qrCodeImgUrl ? (
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                          <img
                            src={qrCodeImgUrl}
                            alt="QR Code PIX +55 73998599213"
                            className="w-44 h-44 rounded-lg object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-44 h-44 bg-white p-3 rounded-xl flex flex-col items-center justify-center border border-slate-200 shadow-xs relative">
                          <QrCode className="w-28 h-28 text-slate-900" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#009ee3] mt-1">
                            PIX Mercado Pago
                          </span>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-2.5 text-center">
                        Abra o aplicativo do seu banco e aponte a câmera para o QR Code (R$ {Number(currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Código PIX Copia e Cola (Payload Banco Central)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={pixData?.qrCode || ''}
                          className="flex-1 px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 select-all truncate"
                        />
                        <button
                          onClick={handleCopyPix}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                            copiedPix
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#009ee3] hover:bg-[#0082ba] text-white shadow-xs'
                          }`}
                          title="Copiar código PIX completo"
                        >
                          {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPix ? 'Copiado!' : 'Copiar Código'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        onClick={handleCheckPayment}
                        className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Verificar Status no Mercado Pago</span>
                      </button>

                      <button
                        onClick={() => triggerSuccess('PIX')}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar Recebimento (R$ {Number(currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: Card */}
                {activeTab === 'card' && !loading && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold flex items-center gap-1.5 text-xs">
                          <CreditCard className="w-4 h-4 text-[#009ee3]" />
                          Checkout Transparente - Cartão de Crédito
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Pagamento direto e seguro processado via API Mercado Pago (SSL)
                        </p>
                      </div>
                      <span className="bg-[#009ee3] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!cardNumber || !cardCvv || !cardHolderName || !currentAmount) {
                        setError('Por favor, preencha o número do cartão, nome do titular e CVV.');
                        return;
                      }
                      try {
                        setCardProcessing(true);
                        setError(null);
                        const res = await processMercadoPagoCardPayment({
                          transactionAmount: currentAmount,
                          description: activeDescription || activeTitle,
                          installments: Number(cardInstallments) || 1,
                          payerEmail: payerEmail || 'cliente@maosemobra.com.br',
                          payerName: cardHolderName,
                          payerCpf: cardCpf,
                          referenceId: referenceId || `card-${Date.now()}`,
                        });

                        if (res.status === 'approved' || res.status === 'in_process' || res.mode === 'demo') {
                          triggerSuccess(`Cartão (${cardInstallments}x)`);
                        } else {
                          setError(`Pagamento processado com status: ${res.status} (${res.statusDetail || 'verifique os dados do cartão'})`);
                        }
                      } catch (err: any) {
                        console.error(err);
                        setError(err.message || 'Erro ao processar pagamento com cartão');
                      } finally {
                        setCardProcessing(false);
                      }
                    }} className="space-y-3">

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Número do Cartão
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="4532 •••• •••• ••••"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#009ee3]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Nome do Titular (como no cartão)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="JOSÉ SILVA"
                          value={cardHolderName}
                          onChange={e => setCardHolderName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#009ee3]"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Mês Exp.
                          </label>
                          <select
                            value={cardExpMonth}
                            onChange={e => setCardExpMonth(e.target.value)}
                            className="w-full px-2.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                          >
                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Ano Exp.
                          </label>
                          <select
                            value={cardExpYear}
                            onChange={e => setCardExpYear(e.target.value)}
                            className="w-full px-2.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                          >
                            {['2026', '2027', '2028', '2029', '2030', '2031', '2032'].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            CVV
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            placeholder="123"
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value)}
                            className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white text-center"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            CPF do Titular
                          </label>
                          <input
                            type="text"
                            placeholder="000.000.000-00"
                            value={cardCpf}
                            onChange={e => setCardCpf(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Parcelamento
                          </label>
                          <select
                            value={cardInstallments}
                            onChange={e => setCardInstallments(e.target.value)}
                            className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                          >
                            <option value="1">1x de R$ {Number(currentAmount).toFixed(2)} (Sem juros)</option>
                            <option value="2">2x de R$ {(Number(currentAmount) / 2).toFixed(2)}</option>
                            <option value="3">3x de R$ {(Number(currentAmount) / 3).toFixed(2)}</option>
                            <option value="6">6x de R$ {(Number(currentAmount) / 6).toFixed(2)}</option>
                            <option value="12">12x de R$ {(Number(currentAmount) / 12).toFixed(2)}</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={cardProcessing}
                        className="w-full py-3.5 px-4 bg-[#009ee3] hover:bg-[#0082ba] text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg mt-2 cursor-pointer disabled:opacity-50"
                      >
                        {cardProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processando Pagamento...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Pagar R$ {Number(currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com Cartão</span>
                          </>
                        )}
                      </button>
                    </form>

                    {prefData?.initPoint && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                        <a
                          href={prefData.initPoint}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#009ee3] hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <span>Ou prefere usar o Checkout Pro redirecionado?</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Security Guarantee Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Ambiente Criptografado SSL 256-bit</span>
              </div>
              <div className="flex items-center gap-1 font-bold text-slate-500 dark:text-slate-400">
                <span>Chave: {PIX_KEY_FORMATTED}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
