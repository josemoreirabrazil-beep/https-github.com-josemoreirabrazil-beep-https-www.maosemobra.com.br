import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Send,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Mail,
  MessageCircle,
  Users,
  PlusCircle,
  Sparkles,
  FileSpreadsheet,
  X,
  Clock,
  ShieldCheck,
  Zap,
  UserPlus,
  BadgeDollarSign,
  Megaphone
} from 'lucide-react';
import type {
  Project,
  TeamMember,
  ServiceRequest,
  SubscriberPayment,
  SubscriberPeriodChargeItem,
  SubscriptionPlanPricing,
  SubscriberPlan,
  SubscriberRole,
  LiveMercadoPagoPayment
} from '../types';
import {
  emitSubscribersBillingBatch,
  fetchLiveMercadoPagoPayments,
  markSubscribersBillingSent,
  adjustPendingSubscribersBilling,
  getReducedPlanPrice,
  buildClientPeriodsBreakdown,
  formatClientPeriodsLabel,
  INITIAL_PLANS,
  DEFAULT_CHECKOUT_RECOVERY_NOTICE,
  buildCheckoutRecoveryMessage,
  fetchActiveSubscriberNotices,
  sendSubscriberBillingNotice,
  type NoticeDispatchRecipient,
  type SubscriberBillingNotice
} from '../services/subscriberBilling';
import { loadServiceProviders } from '../services/storage';
import { generateQrCodeDataUrl } from '../utils/pix';
import confetti from 'canvas-confetti';

interface SubscriberBillingDispatcherProps {
  adminToken?: string;
  subscriberPayments: SubscriberPayment[];
  subscriptionPlans: SubscriptionPlanPricing[];
  projects: Project[];
  team: TeamMember[];
  serviceRequests: ServiceRequest[];
  onBillingUpdated: () => Promise<void> | void;
}

interface BillableCandidate {
  id: string;
  source: 'Assinante' | 'Cliente Obra' | 'Solicitante' | 'Equipe/Fornecedor' | 'Prestador';
  subscriberName: string;
  subscriberEmail: string;
  subscriberPhone: string;
  subscriberRole: SubscriberRole;
  planType: SubscriberPlan;
  unitPlanAmount: number;
  periodsCount: number;
  periodsLabel: string;
  periodsBreakdown: SubscriberPeriodChargeItem[];
  amount: number;
  status: string;
  dueDate: string;
  billingStatus?: SubscriberPayment['billingStatus'];
  billingLink?: string;
  pixTicketUrl?: string;
  pixCopyPaste?: string;
  mpPaymentId?: string | number;
  mpPreferenceId?: string;
  billingExternalRef?: string;
  billingEmittedAt?: string;
  billingSentAt?: string;
  billingChannel?: string;
  billingMessage?: string;
  mpVerifiedStatus?: string;
}

function formatBrWhatsappUrl(phone: string, message: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

function buildMailtoUrl(
  email: string,
  name: string,
  plan: string,
  amount: number,
  message: string,
  isNotice = false
): string | null {
  if (!email || !email.includes('@')) return null;
  const subject = isNotice
    ? `Comunicado Mãos em Obra: Regularização Checkout Mercado Pago & Planos Reduzidos por 6 Meses — ${plan}`
    : `Cobrança Mãos em Obra — ${plan} (R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;
  const body = message.replace(/\*/g, '');
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const SubscriberBillingDispatcher: React.FC<SubscriberBillingDispatcherProps> = ({
  adminToken,
  subscriberPayments,
  subscriptionPlans,
  projects,
  team,
  serviceRequests,
  onBillingUpdated,
}) => {
  const availablePlans = useMemo(
    () => (subscriptionPlans.length > 0 ? subscriptionPlans : INITIAL_PLANS).filter(p => Number(p.price) > 0),
    [subscriptionPlans]
  );

  const [candidates, setCandidates] = useState<BillableCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includePlatformUsers, setIncludePlatformUsers] = useState<boolean>(false);

  const [isEmitting, setIsEmitting] = useState(false);
  const [isAdjustingPending, setIsAdjustingPending] = useState(false);
  const [isSyncingMp, setIsSyncingMp] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const prevServerSnapshotRef = useRef<Map<string, { amount: number; planType: string; periodsCount?: number; billingExternalRef?: string; billingLink?: string }>>(new Map());

  // Live Mercado Pago account audit state
  const [liveMpPayments, setLiveMpPayments] = useState<LiveMercadoPagoPayment[]>([]);
  const [liveMpMeta, setLiveMpMeta] = useState<{
    totalInMercadoPago: number;
    approvedCount: number;
    pendingCount: number;
    subscriberMatchedApprovedCount: number;
    syncedAt?: string;
  } | null>(null);
  const [showLiveMpList, setShowLiveMpList] = useState(false);

  // Add real subscriber inline modal/drawer
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<SubscriberRole>('Prestador de Serviço');
  const [newPlan, setNewPlan] = useState<SubscriberPlan>('Mensal Pro');
  const [newAmount, setNewAmount] = useState('29.90');

  // QR preview modal state
  const [qrPreviewCandidate, setQrPreviewCandidate] = useState<BillableCandidate | null>(null);
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState<string>('');

  // Official Comunicado (Checkout MP Error + 6-Month Reduced Plan Prices) state
  const [noticeMessage, setNoticeMessage] = useState<string>(DEFAULT_CHECKOUT_RECOVERY_NOTICE);
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [activeNoticeMeta, setActiveNoticeMeta] = useState<SubscriberBillingNotice | null>(null);
  const [dispatchedRecipients, setDispatchedRecipients] = useState<NoticeDispatchRecipient[]>([]);
  const [copiedNoticeId, setCopiedNoticeId] = useState<string | null>(null);

  // Build unified candidates list preserving unsaved local overrides unless server data updated
  useEffect(() => {
    const defaultDue = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

    setCandidates((prev) => {
      const prevMap = new Map<string, BillableCandidate>(prev.map((c) => [c.id, c]));
      const nextList: BillableCandidate[] = [];
      const seenEmails = new Set<string>();
      const seenNames = new Set<string>();

      // 1. Registered subscribers from subscriberPayments (primary source)
      for (const sub of subscriberPayments) {
        if (Number(sub.amount) <= 0 && sub.planType === 'Gratuito Lançamento') continue;
        const existing = prevMap.get(sub.id);
        const prevSnap = prevServerSnapshotRef.current.get(sub.id);
        const serverChanged =
          !prevSnap ||
          Math.abs(prevSnap.amount - (Number(sub.amount) || 0)) > 0.009 ||
          prevSnap.planType !== sub.planType ||
          prevSnap.periodsCount !== sub.periodsCount ||
          prevSnap.billingExternalRef !== sub.billingExternalRef ||
          prevSnap.billingLink !== sub.billingLink;

        const emailKey = (sub.subscriberEmail || '').trim().toLowerCase();
        const nameKey = (sub.subscriberName || '').trim().toLowerCase();
        if (emailKey) seenEmails.add(emailKey);
        if (nameKey) seenNames.add(nameKey);

        const resolvedPlan = serverChanged ? sub.planType : (existing?.planType || sub.planType);
        const resolvedUnit =
          serverChanged
            ? Number(sub.unitPlanAmount) || getReducedPlanPrice(resolvedPlan, 29.90)
            : existing?.unitPlanAmount || Number(sub.unitPlanAmount) || getReducedPlanPrice(resolvedPlan, 29.90);
        const resolvedPeriodsCount =
          serverChanged
            ? Math.max(1, Number(sub.periodsCount) || 3)
            : Math.max(1, existing?.periodsCount || Number(sub.periodsCount) || 3);
        const resolvedAmount = serverChanged
          ? Number(sub.amount) || Number((resolvedUnit * resolvedPeriodsCount).toFixed(2))
          : existing?.amount !== undefined
          ? existing.amount
          : Number(sub.amount) || Number((resolvedUnit * resolvedPeriodsCount).toFixed(2));
        const resolvedBreakdown =
          serverChanged && sub.periodsBreakdown && sub.periodsBreakdown.length > 0
            ? sub.periodsBreakdown
            : buildClientPeriodsBreakdown(resolvedUnit, resolvedPeriodsCount);
        const resolvedPeriodsLabel =
          serverChanged && sub.periodsLabel
            ? sub.periodsLabel
            : formatClientPeriodsLabel(resolvedBreakdown);

        nextList.push({
          id: sub.id,
          source: 'Assinante',
          subscriberName: sub.subscriberName,
          subscriberEmail: sub.subscriberEmail || '',
          subscriberPhone: sub.subscriberPhone || '',
          subscriberRole: sub.subscriberRole,
          planType: resolvedPlan,
          unitPlanAmount: resolvedUnit,
          periodsCount: resolvedPeriodsCount,
          periodsLabel: resolvedPeriodsLabel,
          periodsBreakdown: resolvedBreakdown,
          amount: resolvedAmount,
          status: sub.status,
          dueDate: sub.dueDate || defaultDue,
          billingStatus: sub.billingStatus || (sub.mpVerifiedStatus === 'approved' ? 'Pago no MP' : 'Cobrança Emitida'),
          billingLink: sub.billingLink ?? (serverChanged ? undefined : existing?.billingLink),
          pixTicketUrl: sub.pixTicketUrl ?? (serverChanged ? undefined : existing?.pixTicketUrl),
          pixCopyPaste: sub.pixCopyPaste ?? (serverChanged ? undefined : existing?.pixCopyPaste),
          mpPaymentId: sub.mpPaymentId ?? (serverChanged ? undefined : existing?.mpPaymentId),
          mpPreferenceId: sub.mpPreferenceId ?? (serverChanged ? undefined : existing?.mpPreferenceId),
          billingExternalRef: sub.billingExternalRef ?? (serverChanged ? undefined : existing?.billingExternalRef),
          billingEmittedAt: sub.billingEmittedAt ?? (serverChanged ? undefined : existing?.billingEmittedAt),
          billingSentAt: sub.billingSentAt ?? (serverChanged ? undefined : existing?.billingSentAt),
          billingChannel: sub.billingChannel ?? (serverChanged ? undefined : existing?.billingChannel),
          billingMessage: sub.billingMessage ?? (serverChanged ? undefined : existing?.billingMessage),
          mpVerifiedStatus: sub.mpVerifiedStatus,
        });
      }

      // 2. Optional: Import real platform users (Projects clients, Service Requests, Team, Service Providers)
      if (includePlatformUsers) {
        const pushExternal = (
          raw: Omit<
            BillableCandidate,
            'status' | 'dueDate' | 'unitPlanAmount' | 'periodsCount' | 'periodsLabel' | 'periodsBreakdown'
          >
        ) => {
          const emailKey = raw.subscriberEmail.trim().toLowerCase();
          const nameKey = raw.subscriberName.trim().toLowerCase();
          if (!nameKey) return;
          if (emailKey && seenEmails.has(emailKey)) return;
          if (seenNames.has(nameKey)) return;
          if (emailKey) seenEmails.add(emailKey);
          seenNames.add(nameKey);

          const existing = prevMap.get(raw.id);
          const resolvedPlan = existing?.planType || raw.planType;
          const resolvedUnit = existing?.unitPlanAmount || getReducedPlanPrice(resolvedPlan, raw.amount);
          const resolvedPeriodsCount = Math.max(1, existing?.periodsCount || 3);
          const resolvedBreakdown = buildClientPeriodsBreakdown(resolvedUnit, resolvedPeriodsCount);
          const resolvedLabel = formatClientPeriodsLabel(resolvedBreakdown);
          const resolvedAmount =
            existing?.amount !== undefined
              ? existing.amount
              : Number((resolvedUnit * resolvedPeriodsCount).toFixed(2));

          nextList.push({
            ...raw,
            planType: resolvedPlan,
            unitPlanAmount: resolvedUnit,
            periodsCount: resolvedPeriodsCount,
            periodsLabel: resolvedLabel,
            periodsBreakdown: resolvedBreakdown,
            amount: resolvedAmount,
            status: 'Pendente',
            dueDate: defaultDue,
            billingStatus: existing?.billingStatus || 'Cobrança Emitida',
            billingLink: existing?.billingLink,
            pixTicketUrl: existing?.pixTicketUrl,
            pixCopyPaste: existing?.pixCopyPaste,
            billingMessage: existing?.billingMessage,
            billingEmittedAt: existing?.billingEmittedAt,
            billingSentAt: existing?.billingSentAt,
            billingChannel: existing?.billingChannel,
          });
        };

        projects.forEach((p) => {
          pushExternal({
            id: `cli-proj-${p.id}`,
            source: 'Cliente Obra',
            subscriberName: p.clientName,
            subscriberEmail: p.clientEmail || '',
            subscriberPhone: '',
            subscriberRole: 'Solicitante / Cliente',
            planType: 'Mensal Pro',
            amount: 29.90,
          });
        });

        serviceRequests.forEach((sr) => {
          pushExternal({
            id: `cli-req-${sr.id}`,
            source: 'Solicitante',
            subscriberName: sr.clientName,
            subscriberEmail: sr.clientEmail || '',
            subscriberPhone: sr.clientPhone || '',
            subscriberRole: 'Solicitante / Cliente',
            planType: 'Mensal Básico',
            amount: 25.00,
          });
        });

        team.forEach((tm) => {
          pushExternal({
            id: `team-${tm.id}`,
            source: 'Equipe/Fornecedor',
            subscriberName: tm.name,
            subscriberEmail: tm.email || '',
            subscriberPhone: tm.phone || '',
            subscriberRole: tm.category === 'supplier' || tm.category === 'Fornecedor' ? 'Loja / Fornecedor' : 'Prestador de Serviço',
            planType: 'Mensal Pro',
            amount: 29.90,
          });
        });

        const providers = loadServiceProviders();
        providers.forEach((prov) => {
          pushExternal({
            id: `prov-real-${prov.id}`,
            source: 'Prestador',
            subscriberName: prov.name,
            subscriberEmail: prov.email || '',
            subscriberPhone: prov.whatsapp || prov.phone || '',
            subscriberRole: 'Prestador de Serviço',
            planType: 'Mensal Pro',
            amount: 29.90,
          });
        });
      }

      // Preserve manually added custom rows not yet saved
      for (const old of prev) {
        if (old.id.startsWith('custom-') && !nextList.some((n) => n.id === old.id)) {
          nextList.unshift(old);
        }
      }

      return nextList;
    });

    const nextSnap = new Map<string, { amount: number; planType: string; periodsCount?: number; billingExternalRef?: string; billingLink?: string }>();
    for (const sub of subscriberPayments) {
      nextSnap.set(sub.id, {
        amount: Number(sub.amount) || 0,
        planType: sub.planType,
        periodsCount: sub.periodsCount,
        billingExternalRef: sub.billingExternalRef,
        billingLink: sub.billingLink,
      });
    }
    prevServerSnapshotRef.current = nextSnap;
  }, [subscriberPayments, includePlatformUsers, projects, serviceRequests, team]);

  // Pre-select all unpaid / unverified-in-MP candidates on first load
  useEffect(() => {
    if (candidates.length > 0 && selectedIds.size === 0) {
      const unpaid = candidates.filter((c) => c.mpVerifiedStatus !== 'approved').map((c) => c.id);
      if (unpaid.length > 0) {
        setSelectedIds(new Set(unpaid));
      }
    }
  }, [candidates.length]);

  // Sync live payments from Mercado Pago API on mount
  const handleSyncLiveMercadoPago = async (silent = false) => {
    setIsSyncingMp(true);
    if (!silent) setStatusNotice(null);
    try {
      const res = await fetchLiveMercadoPagoPayments(adminToken);
      setLiveMpPayments(res.payments || []);
      setLiveMpMeta({
        totalInMercadoPago: res.totalInMercadoPago,
        approvedCount: res.approvedCount,
        pendingCount: res.pendingCount,
        subscriberMatchedApprovedCount: res.subscriberMatchedApprovedCount,
        syncedAt: new Date().toLocaleTimeString('pt-BR'),
      });
      if (res.reconciledCount > 0) {
        await onBillingUpdated();
        setStatusNotice({
          type: 'success',
          text: `Sincronizado com Mercado Pago: ${res.reconciledCount} pagamento(s) de assinante(s) confirmado(s) e atualizado(s) automaticamente!`,
        });
      } else if (!silent) {
        setStatusNotice({
          type: res.subscriberMatchedApprovedCount > 0 ? 'success' : 'warning',
          text:
            res.subscriberMatchedApprovedCount > 0
              ? `${res.subscriberMatchedApprovedCount} assinatura(s) confirmadas na API do Mercado Pago.`
              : `Consulta ao vivo no Mercado Pago concluída (${res.totalInMercadoPago} transações na conta, 0 pagamentos compensados devido ao erro anterior de checkout). Valor total faturado até o momento: R$ 0,00. As cobranças de todos os períodos foram geradas para que os pagantes refaçam o checkout!`,
        });
      }
    } catch (err: any) {
      if (!silent) {
        setStatusNotice({
          type: 'error',
          text: err.message || 'Não foi possível consultar o histórico ao vivo do Mercado Pago.',
        });
      }
    } finally {
      setIsSyncingMp(false);
    }
  };

  useEffect(() => {
    handleSyncLiveMercadoPago(true);
    fetchActiveSubscriberNotices()
      .then((res) => {
        if (res.notices.length > 0) {
          setActiveNoticeMeta(res.notices[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handlePlanChangeForCandidate = (id: string, planCode: SubscriberPlan) => {
    const matchedPlan = availablePlans.find((p) => p.code === planCode || p.name === planCode);
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const unit = matchedPlan ? Number(matchedPlan.price) : getReducedPlanPrice(planCode, c.unitPlanAmount || 29.90);
        const pCount = Math.max(1, c.periodsCount || 3);
        const breakdown = buildClientPeriodsBreakdown(unit, pCount);
        const totalAmt = Number((unit * pCount).toFixed(2));
        return {
          ...c,
          planType: planCode,
          unitPlanAmount: unit,
          periodsBreakdown: breakdown,
          periodsLabel: formatClientPeriodsLabel(breakdown),
          amount: totalAmt,
        };
      })
    );
  };

  const handlePeriodsCountChangeForCandidate = (id: string, nextPeriodsCount: number) => {
    const safeCount = Math.max(1, Math.min(12, Math.round(nextPeriodsCount || 1)));
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const unit =
          c.planType === 'Personalizado'
            ? Number(c.unitPlanAmount) || Number(c.amount) || 29.90
            : getReducedPlanPrice(c.planType, c.unitPlanAmount);
        const breakdown = buildClientPeriodsBreakdown(unit, safeCount);
        const totalAmt = Number((unit * safeCount).toFixed(2));
        return {
          ...c,
          unitPlanAmount: unit,
          periodsCount: safeCount,
          periodsBreakdown: breakdown,
          periodsLabel: formatClientPeriodsLabel(breakdown),
          amount: totalAmt,
        };
      })
    );
  };

  const handleAmountChangeForCandidate = (id: string, value: string) => {
    const parsed = parseFloat(value);
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, amount: Number.isNaN(parsed) ? 0 : parsed } : c))
    );
  };

  const handleAddCustomSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = `custom-${Date.now()}`;
    const unitAmt = Number(newAmount) || 29.90;
    const pCount = 3;
    const breakdown = buildClientPeriodsBreakdown(unitAmt, pCount);
    const totalAmt = Number((unitAmt * pCount).toFixed(2));
    const due = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

    const newItem: BillableCandidate = {
      id,
      source: 'Assinante',
      subscriberName: newName.trim(),
      subscriberEmail: newEmail.trim(),
      subscriberPhone: newPhone.trim(),
      subscriberRole: newRole,
      planType: newPlan,
      unitPlanAmount: unitAmt,
      periodsCount: pCount,
      periodsLabel: formatClientPeriodsLabel(breakdown),
      periodsBreakdown: breakdown,
      amount: totalAmt,
      status: 'Pendente',
      dueDate: due,
      billingStatus: 'Cobrança Emitida',
    };

    setCandidates((prev) => [newItem, ...prev]);
    setSelectedIds((prev) => new Set(prev).add(id));
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setShowAddForm(false);
  };

  const handleEmitSelectedCharges = async () => {
    const targets = candidates.filter((c) => selectedIds.has(c.id) && Number(c.amount) > 0);
    if (targets.length === 0) {
      setStatusNotice({
        type: 'warning',
        text: 'Selecione pelo menos 1 assinante com valor maior que R$ 0,00 para emitir cobrança no Mercado Pago.',
      });
      return;
    }

    setIsEmitting(true);
    setStatusNotice(null);
    try {
      const payload = targets.map((t) => ({
        id: t.id,
        subscriberName: t.subscriberName,
        subscriberEmail: t.subscriberEmail,
        subscriberPhone: t.subscriberPhone,
        subscriberRole: t.subscriberRole,
        planType: t.planType,
        unitPlanAmount: Number(t.unitPlanAmount) || getReducedPlanPrice(t.planType, t.amount),
        periodsCount: Math.max(1, Number(t.periodsCount) || 3),
        periodsLabel: t.periodsLabel,
        periodsBreakdown: t.periodsBreakdown,
        amount: Number(t.amount),
        dueDate: t.dueDate,
        reference: `Assinatura ${t.planType} (${t.periodsCount || 3} períodos: ${t.periodsLabel || 'Ago/2026, Set/2026 e Out-Nov/2026'}) - Mãos em Obra`,
      }));

      const res = await emitSubscribersBillingBatch(payload, adminToken);

      // Update local candidates immediately with returned charges
      const chargeMap = new Map(res.emittedCharges.map((ch) => [ch.id, ch]));
      setCandidates((prev) =>
        prev.map((c) => {
          const ch = chargeMap.get(c.id);
          if (!ch) return c;
          return {
            ...c,
            status: c.mpVerifiedStatus === 'approved' ? 'Aprovado' : 'Pendente',
            billingStatus: c.mpVerifiedStatus === 'approved' ? 'Pago no MP' : 'Cobrança Emitida',
            billingLink: ch.billingLink,
            pixTicketUrl: ch.pixTicketUrl,
            pixCopyPaste: ch.pixCopyPaste,
            mpPreferenceId: ch.mpPreferenceId,
            mpPaymentId: ch.mpPaymentId,
            billingExternalRef: ch.billingExternalRef,
            billingEmittedAt: ch.billingEmittedAt,
            billingMessage: ch.billingMessage,
          };
        })
      );

      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      setStatusNotice({
        type: 'success',
        text: `${res.totalEmitted} cobrança(s) de todos os períodos emitidas no Mercado Pago (${res.livePreferencesCount} links Checkout Pro + ${res.livePixCount} PIX gerados ao vivo). Agora clique em "WhatsApp", "E-mail" ou "Refazer Checkout MP"!`,
      });

      await onBillingUpdated();
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        text: err.message || 'Erro ao emitir cobranças no Mercado Pago.',
      });
    } finally {
      setIsEmitting(false);
    }
  };

  const handleAdjustPendingCharges = async (forcedPeriodsCount?: number) => {
    const pendingRows = candidates.filter(
      (c) =>
        (c.status === 'Pendente' || c.status === 'Atrasado') &&
        c.mpVerifiedStatus !== 'approved' &&
        c.billingStatus !== 'Pago no MP'
    );

    if (pendingRows.length === 0) {
      setStatusNotice({
        type: 'warning',
        text: 'Nenhuma cobrança pendente ou em atraso encontrada para ajuste no momento.',
      });
      return;
    }

    setIsAdjustingPending(true);
    setStatusNotice(null);

    try {
      const updates = pendingRows.map((c) => {
        const unit =
          c.planType === 'Personalizado'
            ? Number(c.unitPlanAmount) || Number(c.amount) || 29.90
            : getReducedPlanPrice(c.planType, c.unitPlanAmount);
        const pCount = Math.max(
          1,
          forcedPeriodsCount !== undefined ? forcedPeriodsCount : Number(c.periodsCount) || 3
        );
        return {
          id: c.id,
          planType: c.planType,
          unitPlanAmount: unit,
          periodsCount: pCount,
          amount: Number((unit * pCount).toFixed(2)),
        };
      });

      const res = await adjustPendingSubscribersBilling(
        { reemitMercadoPago: true, updates },
        adminToken
      );

      const serverMap = new Map(
        (res.subscriberPayments || []).map((s) => [s.id, s])
      );
      setCandidates((prev) =>
        prev.map((c) => {
          const updatedSub = serverMap.get(c.id);
          if (updatedSub) {
            const unit = Number(updatedSub.unitPlanAmount) || getReducedPlanPrice(updatedSub.planType, 29.90);
            const pCount = Math.max(1, Number(updatedSub.periodsCount) || 3);
            const breakdown =
              updatedSub.periodsBreakdown && updatedSub.periodsBreakdown.length > 0
                ? updatedSub.periodsBreakdown
                : buildClientPeriodsBreakdown(unit, pCount);
            return {
              ...c,
              planType: updatedSub.planType,
              unitPlanAmount: unit,
              periodsCount: pCount,
              periodsBreakdown: breakdown,
              periodsLabel: updatedSub.periodsLabel || formatClientPeriodsLabel(breakdown),
              amount: Number(updatedSub.amount) || Number((unit * pCount).toFixed(2)),
              status: updatedSub.status,
              billingStatus: updatedSub.billingStatus || 'Cobrança Emitida',
              billingLink: updatedSub.billingLink,
              pixTicketUrl: updatedSub.pixTicketUrl,
              pixCopyPaste: updatedSub.pixCopyPaste,
              mpPreferenceId: updatedSub.mpPreferenceId,
              mpPaymentId: updatedSub.mpPaymentId,
              billingExternalRef: updatedSub.billingExternalRef,
              billingEmittedAt: updatedSub.billingEmittedAt,
              billingMessage: updatedSub.billingMessage,
            };
          }
          const isPending =
            (c.status === 'Pendente' || c.status === 'Atrasado') &&
            c.mpVerifiedStatus !== 'approved' &&
            c.billingStatus !== 'Pago no MP';
          if (isPending && c.planType !== 'Personalizado') {
            const unit = getReducedPlanPrice(c.planType, c.unitPlanAmount);
            const pCount = Math.max(
              1,
              forcedPeriodsCount !== undefined ? forcedPeriodsCount : Number(c.periodsCount) || 3
            );
            const breakdown = buildClientPeriodsBreakdown(unit, pCount);
            const expectedTotal = Number((unit * pCount).toFixed(2));
            return {
              ...c,
              unitPlanAmount: unit,
              periodsCount: pCount,
              periodsBreakdown: breakdown,
              periodsLabel: formatClientPeriodsLabel(breakdown),
              amount: expectedTotal,
              billingStatus: 'Cobrança Emitida',
            };
          }
          return c;
        })
      );

      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      const totalAfter = updates.reduce((acc, u) => acc + u.amount, 0);
      setStatusNotice({
        type: 'success',
        text: `Valores das cobranças de todos os períodos aplicados para todos os ${updates.length} pagantes (Total em cobrança: R$ ${totalAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Faturado até o momento: R$ 0,00). Os links de checkout do Mercado Pago e PIX foram atualizados para que refaçam o checkout!`,
      });

      await onBillingUpdated();
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        text: err.message || 'Erro ao ajustar cobranças de todos os períodos.',
      });
    } finally {
      setIsAdjustingPending(false);
    }
  };

  const handleMarkDispatched = async (id: string, channel: 'WhatsApp' | 'Email' | 'Link Copiado') => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              billingStatus: c.billingStatus === 'Pago no MP' ? 'Pago no MP' : 'Enviada',
              billingSentAt: new Date().toISOString(),
              billingChannel: channel,
            }
          : c
      )
    );
    await markSubscribersBillingSent([id], channel, adminToken);
    await onBillingUpdated();
  };

  const handleCopyBillingText = async (candidate: BillableCandidate) => {
    const text =
      candidate.billingMessage ||
      `Cobrança Mãos em Obra — ${candidate.subscriberName} (${candidate.planType}): R$ ${candidate.amount.toFixed(2)}\nLink Mercado Pago: ${candidate.billingLink || ''}\nPIX Copia e Cola: ${candidate.pixCopyPaste || ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(candidate.id);
      setTimeout(() => setCopiedId(null), 2200);
      await handleMarkDispatched(candidate.id, 'Link Copiado');
    } catch {
      // Fallback ignored
    }
  };

  const handleOpenQrPreview = async (candidate: BillableCandidate) => {
    setQrPreviewCandidate(candidate);
    if (candidate.pixCopyPaste) {
      const url = await generateQrCodeDataUrl(candidate.pixCopyPaste);
      setQrPreviewDataUrl(url);
    } else {
      setQrPreviewDataUrl('');
    }
  };

  const handleSendCheckoutRecoveryNotice = async () => {
    const selectedTargets = candidates.filter(
      (c) =>
        selectedIds.has(c.id) &&
        Number(c.amount) > 0 &&
        c.mpVerifiedStatus !== 'approved' &&
        c.billingStatus !== 'Pago no MP'
    );
    const pendingTargets = candidates.filter(
      (c) =>
        Number(c.amount) > 0 &&
        c.mpVerifiedStatus !== 'approved' &&
        c.billingStatus !== 'Pago no MP' &&
        (c.status === 'Pendente' ||
          c.status === 'Atrasado' ||
          c.billingStatus === 'Cobrança Emitida' ||
          c.billingStatus === 'Enviada')
    );

    const targets = pendingTargets.length > 0 ? pendingTargets : selectedTargets;
    const targetIds = targets.map((t) => t.id);

    setIsSendingNotice(true);
    setStatusNotice(null);
    try {
      const res = await sendSubscriberBillingNotice(
        {
          subscriberIds: targetIds.length > 0 ? targetIds : undefined,
          customMessage: noticeMessage,
        },
        adminToken
      );

      setActiveNoticeMeta(res.notice);
      setDispatchedRecipients(res.recipients || []);

      const serverMsgMap = new Map(
        (res.recipients || []).map((r) => [r.id, r.personalizedMessage])
      );
      setCandidates((prev) =>
        prev.map((c) => {
          const updatedMsg = serverMsgMap.get(c.id);
          if (!updatedMsg) return c;
          return {
            ...c,
            billingStatus: c.billingStatus === 'Pago no MP' ? 'Pago no MP' : 'Enviada',
            billingSentAt: new Date().toISOString(),
            billingChannel: 'Comunicado + Cobrança',
            billingMessage: updatedMsg,
          };
        })
      );

      confetti({ particleCount: 75, spread: 70, origin: { y: 0.5 } });
      setStatusNotice({
        type: 'success',
        text: `Comunicado oficial publicado no aplicativo e preparado para ${res.recipientsCount} assinante(s) em cobrança! Utilize os botões de WhatsApp, E-mail ou Copiar abaixo caso deseje reenviar individualmente.`,
      });
      await onBillingUpdated();
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        text: err.message || 'Não foi possível enviar o comunicado aos assinantes em cobrança.',
      });
    } finally {
      setIsSendingNotice(false);
    }
  };

  const handleCopyNoticeRecipient = async (recipient: NoticeDispatchRecipient) => {
    try {
      await navigator.clipboard.writeText(recipient.personalizedMessage);
      setCopiedNoticeId(recipient.id);
      setTimeout(() => setCopiedNoticeId(null), 2200);
      await handleMarkDispatched(recipient.id, 'Link Copiado');
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleExportBillingCsv = () => {
    const headers = ['Assinante', 'Origem', 'Email', 'WhatsApp', 'Plano', 'Valor (R$)', 'Status Cobrança', 'Link Checkout Pro MP', 'Link Fatura PIX', 'PIX Copia e Cola', 'Referência'];
    const rows = candidates.map((c) => [
      `"${c.subscriberName.replace(/"/g, '""')}"`,
      c.source,
      c.subscriberEmail,
      c.subscriberPhone,
      c.planType,
      c.amount.toFixed(2),
      c.billingStatus || 'Não Emitida',
      c.billingLink || '',
      c.pixTicketUrl || '',
      c.pixCopyPaste || '',
      c.billingExternalRef || '',
    ]);
    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `cobrancas-assinantes-mercadopago-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const emittedCount = candidates.filter((c) => Boolean(c.billingLink || c.pixCopyPaste)).length;
  const sentCount = candidates.filter((c) => c.billingStatus === 'Enviada' || c.billingStatus === 'Pago no MP').length;
  const pendingCandidates = candidates.filter(
    (c) =>
      (c.status === 'Pendente' || c.status === 'Atrasado') &&
      c.mpVerifiedStatus !== 'approved' &&
      c.billingStatus !== 'Pago no MP'
  );
  const mismatchedPendingCount = pendingCandidates.filter((c) => {
    if (c.planType === 'Personalizado') return false;
    const expected = Number(
      (getReducedPlanPrice(c.planType, c.unitPlanAmount) * Math.max(1, c.periodsCount || 3)).toFixed(2)
    );
    return Math.abs((Number(c.amount) || 0) - expected) > 0.009;
  }).length;
  const pendingAllPeriodsTotal = pendingCandidates.reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );
  const pendingAllPeriodsCount = pendingCandidates.reduce(
    (sum, c) => sum + Math.max(1, Number(c.periodsCount) || 3),
    0
  );
  const selectedTotalAmount = candidates
    .filter((c) => selectedIds.has(c.id))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#009ee3]/40 shadow-md space-y-5">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-[#009ee3]/15 text-[#009ee3]">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Central de Emissão &amp; Envio de Cobranças Reais (Mercado Pago)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              API Produção Ativa
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gere links oficiais de pagamento (Checkout Pro + PIX QR Code ao vivo) com os valores de todos os períodos acumulados para cada assinante pagante refazer o checkout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSyncLiveMercadoPago(false)}
            disabled={isSyncingMp}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#009ee3] ${isSyncingMp ? 'animate-spin' : ''}`} />
            <span>{isSyncingMp ? 'Consultando MP...' : 'Sincronizar Pagamentos MP'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIncludePlatformUsers((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
              includePlatformUsers
                ? 'bg-amber-500 text-slate-950 border-amber-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Incluir também Clientes de Obras, Solicitantes, Equipe e Prestadores cadastrados na plataforma"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{includePlatformUsers ? 'Usuários da Plataforma Incluídos' : 'Incluir Clientes & Equipe'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Adicionar Assinante</span>
          </button>

          <button
            type="button"
            onClick={handleExportBillingCsv}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Exportar Links</span>
          </button>
        </div>
      </div>

      {/* All-Periods Billing & Zero-Billed Checkout Redo Banner */}
      <div className="p-5 rounded-2xl bg-slate-950 text-white border-2 border-amber-500/60 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Valor Total Faturado até o momento: R$ 0,00
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingCandidates.length} Pagantes • {pendingAllPeriodsCount} Períodos Acumulados
              </span>
            </div>
            <h4 className="text-sm font-black text-white">
              Valores das Cobranças de Todos os Períodos Adicionados para Refazerem o Checkout
            </h4>
            <p className="text-xs text-slate-300">
              Como nenhum valor foi compensado anteriormente (<strong className="text-rose-400">R$ 0,00 faturado</strong>), os valores de todos os períodos (<strong className="text-amber-400">Ago/2026, Set/2026 e Out-Nov/2026</strong>) já estão somados nas cobranças abaixo com os planos reduzidos por 6 meses para que todos os pagantes refaçam o checkout imediatamente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <div className="text-[10px] font-bold uppercase text-slate-400">Faturado Compensado</div>
              <div className="text-lg font-black text-rose-400 tabular-nums">R$ 0,00</div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-right">
              <div className="text-[10px] font-bold uppercase text-amber-300">
                Total Cobrado ({pendingAllPeriodsCount} períodos)
              </div>
              <div className="text-lg font-black text-amber-400 tabular-nums">
                R$ {pendingAllPeriodsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Period Multipliers for All Paying Subscribers */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-300 font-bold">
            Definir quantidade de períodos na cobrança de todos os pagantes:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustPendingCharges(3)}
              disabled={isAdjustingPending}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer transition disabled:opacity-50"
            >
              3 Períodos Acumulados (Ago+Set+Out/Nov • R$ 493,80)
            </button>
            <button
              type="button"
              onClick={() => handleAdjustPendingCharges(6)}
              disabled={isAdjustingPending}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-[11px] cursor-pointer transition disabled:opacity-50"
            >
              6 Períodos (Semestre Promocional • R$ 987,60)
            </button>
            <button
              type="button"
              onClick={() => handleAdjustPendingCharges(1)}
              disabled={isAdjustingPending}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[11px] cursor-pointer transition disabled:opacity-50"
            >
              1 Período Mensal (R$ 164,60)
            </button>
          </div>
        </div>
      </div>

      {/* Live Mercado Pago Audit Strip */}
      {liveMpMeta && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${liveMpMeta.subscriberMatchedApprovedCount > 0 ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Auditoria Real Mercado Pago:
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                liveMpMeta.subscriberMatchedApprovedCount > 0
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }`}>
                {liveMpMeta.subscriberMatchedApprovedCount} assinatura(s) liquidadas no MP (R$ 0,00 faturado)
              </span>
            </div>

            <span className="text-slate-500 dark:text-slate-400">
              Transações totais na conta MP: <strong className="text-slate-800 dark:text-slate-200">{liveMpMeta.totalInMercadoPago}</strong> ({liveMpMeta.approvedCount} aprovadas no extrato recente)
            </span>

            {liveMpMeta.syncedAt && (
              <span className="text-[11px] text-slate-400">
                Atualizado às {liveMpMeta.syncedAt}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowLiveMpList((v) => !v)}
            className="text-xs font-bold text-[#009ee3] hover:underline flex items-center gap-1 cursor-pointer self-start lg:self-auto"
          >
            <span>{showLiveMpList ? 'Ocultar Extrato Mercado Pago' : 'Ver Extrato Real do Mercado Pago'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Optional Expandable Live Mercado Pago Transactions Table */}
      {showLiveMpList && (
        <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-[#009ee3]">
            Últimas Transações Reais na Conta Mercado Pago
          </div>
          {liveMpPayments.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma transação retornada pela API.</p>
          ) : (
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-2">ID Pagamento MP</th>
                    <th className="py-2 px-2">Valor</th>
                    <th className="py-2 px-2">Status MP</th>
                    <th className="py-2 px-2">Descrição / Ref</th>
                    <th className="py-2 px-2">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {liveMpPayments.slice(0, 12).map((lp) => (
                    <tr key={String(lp.id)}>
                      <td className="py-1.5 px-2 font-mono">{lp.id}</td>
                      <td className="py-1.5 px-2 font-bold">R$ {lp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lp.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : lp.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {lp.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 truncate max-w-xs">{lp.description || lp.externalReference || 'Pagamento direto'}</td>
                      <td className="py-1.5 px-2 text-slate-400">{lp.dateCreated ? new Date(lp.dateCreated).toLocaleDateString('pt-BR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Subscriber Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCustomSubscriber}
          className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs"
        >
          <div className="lg:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome / Empresa *</label>
            <input
              type="text"
              required
              placeholder="Nome completo do assinante"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
            <input
              type="email"
              placeholder="email@dominio.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp</label>
            <input
              type="text"
              placeholder="(73) 99999-9999"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Plano &amp; Valor Unitário</label>
            <select
              value={newPlan}
              onChange={(e) => {
                const code = e.target.value as SubscriberPlan;
                setNewPlan(code);
                const p = availablePlans.find((item) => item.code === code || item.name === code);
                if (p) setNewAmount(String(p.price));
              }}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            >
              {availablePlans.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name} (R$ {p.price.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="1"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-24 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black"
            />
            <button
              type="submit"
              className="flex-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer whitespace-nowrap"
            >
              Incluir
            </button>
          </div>
        </form>
      )}

      {/* Status Notice */}
      {statusNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 border ${
            statusNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : statusNotice.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Batch Action Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 cursor-pointer"
          >
            {selectedIds.size === candidates.length && candidates.length > 0 ? 'Desmarcar Todos' : `Selecionar Todos (${candidates.length})`}
          </button>

          <div>
            <span className="text-slate-400">Selecionados:</span>{' '}
            <strong className="text-amber-400">{selectedIds.size} assinante(s)</strong>
          </div>
          <div>
            <span className="text-slate-400">Total de Todos os Períodos:</span>{' '}
            <strong className="text-emerald-400">
              R$ {selectedTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div>
            <span className="text-slate-400">Emitidos:</span>{' '}
            <strong className="text-white">{emittedCount}</strong>
            <span className="text-slate-500 mx-1">•</span>
            <span className="text-slate-400">Enviados:</span>{' '}
            <strong className="text-[#009ee3]">{sentCount}</strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleAdjustPendingCharges()}
            disabled={isAdjustingPending || pendingCandidates.length === 0}
            className={`px-4 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 border ${
              mismatchedPendingCount > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
            }`}
            title="Atualiza os valores de todos os períodos nas cobranças pendentes e regenera os links de checkout do Mercado Pago"
          >
            {isAdjustingPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Atualizando Cobranças...</span>
              </>
            ) : (
              <>
                <BadgeDollarSign className="w-4 h-4" />
                <span>
                  Aplicar Cobranças de Todos Períodos ({pendingCandidates.length})
                  {mismatchedPendingCount > 0 ? ` • ${mismatchedPendingCount} p/ corrigir` : ''}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleEmitSelectedCharges}
            disabled={isEmitting || selectedIds.size === 0}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#009ee3] to-emerald-500 hover:from-[#0082ba] hover:to-emerald-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isEmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Emitindo Links &amp; PIX no Mercado Pago...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Gerar / Atualizar Checkouts no Mercado Pago ({selectedIds.size})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Official Checkout Error & 6-Month Reduced Plan Notice Dispatcher */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 dark:from-amber-950/30 dark:via-slate-900 dark:to-emerald-950/20 border-2 border-amber-500/50 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Comunicado aos Assinantes em Cobrança (Erro Checkout Mercado Pago + Cobrança de Todos os Períodos)
              </h4>
              {activeNoticeMeta && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Ativo no App • {pendingCandidates.length} em cobrança
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Informa automaticamente quem está recebendo cobrança que o faturamento anterior ficou em <strong>R$ 0,00</strong> por falha de compensação no checkout do Mercado Pago e envia o novo link com os <strong>valores de todos os períodos</strong> já com desconto de 6 meses.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSendCheckoutRecoveryNotice}
            disabled={isSendingNotice}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isSendingNotice ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Publicando Comunicado...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Comunicado &amp; Novo Checkout ({pendingCandidates.length})</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-500/30 font-bold text-slate-700 dark:text-slate-200">
            Básico: <strong className="text-emerald-600 dark:text-emerald-400">R$ 25,00/mês (3x = R$ 75,00)</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-500/30 font-bold text-slate-700 dark:text-slate-200">
            Pro: <strong className="text-emerald-600 dark:text-emerald-400">R$ 29,90/mês (3x = R$ 89,70)</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-500/30 font-bold text-slate-700 dark:text-slate-200">
            Construtor: <strong className="text-emerald-600 dark:text-emerald-400">R$ 49,90/mês (3x = R$ 149,70)</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 font-black">
            Total 5 Pagantes (Todos os Períodos): R$ {pendingAllPeriodsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
            Texto do Comunicado (Personalizado com plano, períodos acumulados, valor total e links de checkout):
          </label>
          <textarea
            rows={3}
            value={noticeMessage}
            onChange={(e) => setNoticeMessage(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Immediate per-subscriber quick dispatch cards for pending uncompensated subscribers */}
        {(dispatchedRecipients.length > 0 || pendingCandidates.length > 0) && (
          <div className="pt-2 border-t border-amber-500/20 space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Assinantes Pagantes Prontos para Refazer o Checkout ({dispatchedRecipients.length > 0 ? dispatchedRecipients.length : pendingCandidates.length}):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(dispatchedRecipients.length > 0
                ? dispatchedRecipients
                : pendingCandidates.map((p) => ({
                    id: p.id,
                    subscriberName: p.subscriberName,
                    subscriberEmail: p.subscriberEmail,
                    subscriberPhone: p.subscriberPhone,
                    planType: p.planType,
                    amount: p.amount,
                    billingLink: p.billingLink,
                    pixTicketUrl: p.pixTicketUrl,
                    pixCopyPaste: p.pixCopyPaste,
                    personalizedMessage: buildCheckoutRecoveryMessage(p, noticeMessage),
                  }))
              ).map((rec) => {
                const candidateMatch = candidates.find((cand) => cand.id === rec.id);
                const pCount = candidateMatch?.periodsCount || 3;
                const uPrice = candidateMatch?.unitPlanAmount || getReducedPlanPrice(rec.planType, 29.90);
                const waUrl = rec.subscriberPhone ? formatBrWhatsappUrl(rec.subscriberPhone, rec.personalizedMessage) : null;
                const mailUrl = rec.subscriberEmail
                  ? buildMailtoUrl(
                      rec.subscriberEmail,
                      rec.subscriberName,
                      rec.planType,
                      rec.amount,
                      rec.personalizedMessage,
                      true
                    )
                  : null;
                return (
                  <div
                    key={`notice-rec-${rec.id}`}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {rec.subscriberName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {rec.planType} ({pCount}x R$ {uPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) •{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          Total R$ {Number(rec.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {rec.billingLink && (
                        <a
                          href={rec.billingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#009ee3] hover:bg-[#0082ba] text-white font-black text-[11px] inline-flex items-center gap-1 transition"
                          title="Abrir Link de Checkout do Mercado Pago"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Refazer Checkout</span>
                        </a>
                      )}
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleMarkDispatched(rec.id, 'WhatsApp')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] inline-flex items-center gap-1 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {mailUrl && (
                        <a
                          href={mailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleMarkDispatched(rec.id, 'Email')}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] inline-flex items-center gap-1 transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>E-mail</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyNoticeRecipient(rec)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        {copiedNoticeId === rec.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedNoticeId === rec.id ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Subscribers Billing Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-2 w-8">
                <input
                  type="checkbox"
                  checked={candidates.length > 0 && selectedIds.size === candidates.length}
                  onChange={handleSelectAll}
                  className="rounded cursor-pointer"
                />
              </th>
              <th className="py-3 px-3">Assinante Real</th>
              <th className="py-3 px-3">Plano, Períodos &amp; Valor Total Cobrado</th>
              <th className="py-3 px-3">Status Mercado Pago / Envio</th>
              <th className="py-3 px-3 text-right">Refazer Checkout &amp; Envio Direto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  Nenhum assinante com plano pago encontrado. Clique em &quot;Incluir Clientes &amp; Equipe&quot; ou &quot;Adicionar Assinante&quot;.
                </td>
              </tr>
            ) : (
              candidates.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const hasCharge = Boolean(c.billingLink || c.pixCopyPaste || c.billingMessage);
                const msg =
                  c.billingMessage ||
                  buildCheckoutRecoveryMessage(c, noticeMessage);
                const waHref = hasCharge ? formatBrWhatsappUrl(c.subscriberPhone, msg) : null;
                const mailHref = hasCharge ? buildMailtoUrl(c.subscriberEmail, c.subscriberName, c.planType, c.amount, msg) : null;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(c.id)}
                        className="rounded cursor-pointer"
                      />
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white">{c.subscriberName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500">
                          {c.source}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.subscriberPhone || 'Sem WhatsApp'} {c.subscriberEmail ? `• ${c.subscriberEmail}` : ''}
                      </div>
                      {c.billingExternalRef && (
                        <div className="text-[10px] font-mono text-[#009ee3] mt-0.5">
                          Ref MP: {c.billingExternalRef}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={c.planType}
                          onChange={(e) => handlePlanChangeForCandidate(c.id, e.target.value as SubscriberPlan)}
                          className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          {availablePlans.map((p) => (
                            <option key={p.id} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                          <option value="Personalizado">Personalizado</option>
                        </select>

                        <select
                          value={c.periodsCount || 3}
                          onChange={(e) => handlePeriodsCountChangeForCandidate(c.id, Number(e.target.value))}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-black text-amber-800 dark:text-amber-300 cursor-pointer"
                          title="Quantidade de períodos somados na cobrança"
                        >
                          <option value={1}>1 período (Mensal)</option>
                          <option value={2}>2 períodos</option>
                          <option value={3}>3 períodos (Ago+Set+Out/Nov)</option>
                          <option value={4}>4 períodos</option>
                          <option value={5}>5 períodos</option>
                          <option value={6}>6 períodos (Semestre Completo)</option>
                        </select>

                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-400">Total R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={c.amount}
                            onChange={(e) => handleAmountChangeForCandidate(c.id, e.target.value)}
                            className="w-24 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="font-bold text-slate-500 dark:text-slate-400">
                          {c.periodsCount || 3}x R${' '}
                          {(c.unitPlanAmount || getReducedPlanPrice(c.planType, c.amount)).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                          /mês:
                        </span>
                        {(c.periodsBreakdown || []).map((pb) => (
                          <span
                            key={`${c.id}-${pb.period}`}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono"
                          >
                            {pb.period}: R$ {pb.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {c.mpVerifiedStatus === 'approved' || c.billingStatus === 'Pago no MP' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Pago no Mercado Pago</span>
                        </span>
                      ) : c.billingStatus === 'Enviada' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            <Send className="w-3 h-3" />
                            <span>Enviada ({c.billingChannel || 'WhatsApp'})</span>
                          </span>
                          <div className="text-[10px] text-slate-400">Aguardando refazer checkout MP</div>
                        </div>
                      ) : hasCharge ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>Pronta p/ Refazer Checkout ({c.periodsCount || 3} períodos)</span>
                          </span>
                          {c.mpPaymentId && (
                            <div className="text-[10px] text-slate-400 font-mono">PIX ID: {c.mpPaymentId}</div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Ainda não emitida</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {!hasCharge ? (
                        <span className="text-[11px] text-slate-400 italic">
                          Marque e clique em Emitir acima
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {c.billingLink && (
                            <a
                              href={c.billingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-[#009ee3] hover:bg-[#0082ba] text-white font-black text-[11px] inline-flex items-center gap-1 shadow-xs transition whitespace-nowrap"
                              title="Abrir Link Oficial Checkout Pro Mercado Pago para refazer o checkout"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Refazer Checkout MP</span>
                            </a>
                          )}

                          {waHref && (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleMarkDispatched(c.id, 'WhatsApp')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] inline-flex items-center gap-1 shadow-xs transition whitespace-nowrap"
                              title="Abrir WhatsApp com Link Mercado Pago e PIX Copia e Cola prontos"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          {mailHref && (
                            <a
                              href={mailHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleMarkDispatched(c.id, 'Email')}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] inline-flex items-center gap-1 shadow-xs transition whitespace-nowrap"
                              title="Enviar cobrança por E-mail"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>E-mail</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyBillingText(c)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                            title="Copiar mensagem completa com Link e PIX"
                          >
                            {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === c.id ? 'Copiado!' : 'Copiar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenQrPreview(c)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                            title="Visualizar QR Code PIX e Link Checkout"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR / Link</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QR Code & Link Modal */}
      {qrPreviewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Cobrança Mercado Pago Emitida ({qrPreviewCandidate.periodsCount || 3} Períodos)
                </h4>
                <p className="text-xs text-slate-500">{qrPreviewCandidate.subscriberName}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrPreviewCandidate(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  {qrPreviewCandidate.planType} ({qrPreviewCandidate.periodsCount || 3}x R${' '}
                  {(qrPreviewCandidate.unitPlanAmount || 29.9).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </div>
                <div className="text-[10px] font-mono text-slate-400">{qrPreviewCandidate.periodsLabel}</div>
              </div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                R$ {qrPreviewCandidate.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {qrPreviewDataUrl && (
              <div className="flex flex-col items-center p-4 bg-white rounded-2xl border border-slate-200">
                <img src={qrPreviewDataUrl} alt="QR Code PIX Mercado Pago" className="w-44 h-44" />
                <span className="text-[11px] font-bold text-slate-500 mt-2">
                  Escaneie com o app de qualquer banco (PIX Mercado Pago)
                </span>
              </div>
            )}

            {qrPreviewCandidate.billingLink && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Link Checkout Pro (Cartão / PIX / Boleto)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={qrPreviewCandidate.billingLink}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                  />
                  <a
                    href={qrPreviewCandidate.billingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-[#009ee3] hover:bg-[#0082ba] text-white text-xs font-black inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleCopyBillingText(qrPreviewCandidate)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Cobrança Completa (Link + PIX Copia e Cola)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
