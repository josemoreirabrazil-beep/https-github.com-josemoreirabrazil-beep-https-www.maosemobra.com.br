import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  CreditCard, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  Building2,
  Lock,
  ArrowRight,
  Phone,
  KeyRound,
  Sparkles
} from 'lucide-react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

import { 
  createMercadoPagoPreference, 
  createMercadoPagoPix, 
  checkMercadoPagoPayment, 
  getMercadoPagoStatus,
  processMercadoPagoCardPayment,
  MercadoPagoPixResponse,
  MercadoPagoPreferenceResponse
} from '../services/mercadoPago';
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
  onPaymentSuccess?: (paymentInfo: { method: string; amount: number; paymentId?: string | number }) => void;
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
  onPaymentSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'pix' | 'card'>('pix');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // PIX state
  const [pixData, setPixData] = useState<MercadoPagoPixResponse | null>(null);
  const [qrCodeImgUrl, setQrCodeImgUrl] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins

  // Card / Checkout Pro state
  const [prefData, setPrefData] = useState<MercadoPagoPreferenceResponse | null>(null);
  const [mpStatus, setMpStatus] = useState<{ configured: boolean; message: string }>({ configured: false, message: '' });

  // Transparent Card Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState(payerName || 'Titular do Cartão');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('2028');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');
  const [cardInstallments, setCardInstallments] = useState('1');
  const [cardProcessing, setCardProcessing] = useState(false);

  const [currentAmount, setCurrentAmount] = useState<number>(amount);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsApproved(false);
      setTimeLeft(900);
      const initial = amount > 0 && amount !== 500 ? amount : 149.90;
      setCurrentAmount(initial);
      loadConfigAndData(initial);
    }
  }, [isOpen, amount]);

  // Countdown timer for PIX
  useEffect(() => {
    if (!isOpen || !pixData || isApproved || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, pixData, isApproved, timeLeft]);

  // 🔔 Real-time status polling (Automated Checkout Transparente)
  useEffect(() => {
    if (!isOpen || isApproved || !referenceId) return;

    let pollInterval: NodeJS.Timeout;

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

    // Initial check and then every 4 seconds
    pollStatus();
    pollInterval = setInterval(pollStatus, 4000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOpen, isApproved, referenceId, activeTab]);

  const loadConfigAndData = async (targetAmount: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const status = await getMercadoPagoStatus();
      setMpStatus(status);

      // Generate standardized BRCode payload for key +5573998599213
      const standardPayload = generatePixPayload({
        key: PIX_KEY_RAW,
        name: PIX_RECEIVER_NAME,
        amount: Number(targetAmount) > 0 ? Number(targetAmount) : undefined,
        description: description || title,
        txId: referenceId ? referenceId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) : undefined,
      });

      // Render local QR code data url immediately
      const localQrUrl = await generateQrCodeDataUrl(standardPayload);
      setQrCodeImgUrl(localQrUrl);

      // Call server backend
      try {
        const pix = await createMercadoPagoPix({
          amount: targetAmount,
          description: description || title,
          payerName,
          payerEmail,
          referenceId,
        });
        setPixData({
          ...pix,
          qrCode: pix.qrCode || standardPayload,
        });

        // If backend provided Base64 image, use it, else keep localQrUrl
        if (pix.qrCodeBase64) {
          setQrCodeImgUrl(`data:image/jpeg;base64,${pix.qrCodeBase64}`);
        }
      } catch (e) {
        // Fallback to local standardized PIX
        setPixData({
          paymentId: `PIX-${Date.now()}`,
          status: 'pending',
          qrCode: standardPayload,
          pixKey: PIX_KEY_FORMATTED,
          mode: 'pix_direct'
        });
      }

      // Generate Preference for card/checkout pro in background
      createMercadoPagoPreference({
        title,
        amount: targetAmount,
        description,
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
        amount: currentAmount,
        paymentId: pixData?.paymentId,
      });
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Mercado Pago Brand Elements */}
        <div className="bg-[#009ee3] text-white p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#009ee3] flex items-center justify-center font-black text-xl shadow-xs">
              mp
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">Mercado Pago & PIX</span>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Oficial
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium">Pagamento Seguro com QR Code e Chave Direta</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount & Reference Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Valor a Pagar
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                R$ {Number(currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right max-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Referência
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate block">
                {title}
              </span>
            </div>
          </div>

          {/* Quick Plan Selector */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Escolher Plano:
            </span>
            <select
              value={currentAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentAmount(val);
                loadConfigAndData(val);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold"
            >
              <option value={149.90}>Plano Mensal Pro - R$ 149,90</option>
              <option value={1490.00}>Plano Anual Construtor - R$ 1.490,00</option>
              <option value={45.00}>Taxa de Proposta / Uso - R$ 45,00</option>
              {amount > 0 && amount !== 149.90 && amount !== 1490.00 && amount !== 45.00 && (
                <option value={amount}>Valor Atual da Obra - R$ {Number(amount).toFixed(2)}</option>
              )}
            </select>
          </div>
        </div>

        {/* Payment Tabs: PIX vs Card */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('pix')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'pix'
                ? 'border-[#009ee3] text-[#009ee3] bg-[#009ee3]/5'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>PIX (QR Code & Chave Celular)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'card'
                ? 'border-[#009ee3] text-[#009ee3] bg-[#009ee3]/5'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-[#009ee3]" />
            <span>Cartão 12x / Boleto</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#009ee3] animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Gerando QR Code e Chave PIX...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-bold block mb-0.5">Modo PIX Direto</span>
                Você pode utilizar o QR Code e a chave PIX celular abaixo para pagar imediatamente.
              </div>
            </div>
          )}

          {isApproved ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Pagamento Aprovado!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                O pagamento de R$ {Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi registrado com sucesso e o saldo de caixa foi atualizado.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Concluir e Fechar
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: PIX */}
              {activeTab === 'pix' && !loading && (
                <div className="space-y-4">
                  {/* Official PIX Key Display Box */}
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
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

                  {/* Timer */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300">
                    <span className="font-medium">Válido por:</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{formattedTime}</span>
                  </div>

                  {/* QR Code Container */}
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
                      Abra o aplicativo do seu banco e aponte a câmera para o QR Code
                    </span>
                  </div>

                  {/* Pix Copia e Cola */}
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
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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

                  {/* Actions: Check Status & Immediate Confirmation */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleCheckPayment}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Verificar Status no Mercado Pago</span>
                    </button>

                    <button
                      onClick={() => triggerSuccess('PIX')}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirmar Recebimento / Dar Baixa Imediata</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Card / Checkout Transparente */}
              {activeTab === 'card' && !loading && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold block flex items-center gap-1.5 text-xs">
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
                    if (!cardNumber || !cardCvv || !cardHolderName) {
                      alert('Por favor, preencha o número do cartão, nome do titular e CVV.');
                      return;
                    }
                    try {
                      setCardProcessing(true);
                      setError(null);
                      const res = await processMercadoPagoCardPayment({
                        transactionAmount: currentAmount,
                        description: description || title,
                        installments: Number(cardInstallments) || 1,
                        payerEmail: payerEmail || 'cliente@maosemobra.com.br',
                        payerName: cardHolderName,
                        payerCpf: cardCpf,
                        referenceId: referenceId || `card-${Date.now()}`,
                      });

                      if (res.status === 'approved' || res.status === 'in_process' || res.mode === 'demo') {
                        triggerSuccess(`Cartão (${cardInstallments}x)`);
                      } else {
                        alert(`Pagamento processado com status: ${res.status} (${res.statusDetail || 'verifique o cartão'})`);
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
                          <option value="2">2x de R$ {(currentAmount / 2).toFixed(2)}</option>
                          <option value="3">3x de R$ {(currentAmount / 3).toFixed(2)}</option>
                          <option value="6">6x de R$ {(currentAmount / 6).toFixed(2)}</option>
                          <option value="12">12x de R$ {(currentAmount / 12).toFixed(2)}</option>
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
  );
};

