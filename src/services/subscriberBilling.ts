import type { 
  SubscriberPayment, 
  SubscriberCashflowSummary,
  SubscriberPaymentStatus,
  SubscriptionPlanPricing,
  LiveMercadoPagoPayment,
  RealSubscriberStatusItem,
  RealSubscribersStatusResponse
} from '../types';
import { getCachedAdminSession } from './adminAuth';

const LOCAL_STORAGE_KEY = 'maos_em_obra_subscriber_payments_v4';
const PLANS_STORAGE_KEY = 'maos_em_obra_subscription_plans_v5';
const ACTIVE_SUBSCRIPTION_STORAGE_KEY = 'maos_em_obra_active_subscription_v1';
export const SUBSCRIPTION_UPDATED_EVENT = 'maos-em-obra-subscription-updated';

const CLIENT_PERIOD_CATALOG = [
  { period: '2026-08', label: '1º Período (Ago/2026)' },
  { period: '2026-09', label: '2º Período (Set/2026)' },
  { period: '2026-10/11', label: '3º Período (Out-Nov/2026)' },
  { period: '2026-12', label: '4º Período (Dez/2026)' },
  { period: '2027-01', label: '5º Período (Jan/2027)' },
  { period: '2027-02', label: '6º Período (Fev/2027)' },
];

export function buildClientPeriodsBreakdown(
  unitPlanAmount: number,
  periodsCount: number,
  isPaid = false
): Array<{
  period: string;
  label: string;
  amount: number;
  status: 'Não Compensado (Refazer Checkout)' | 'Pago';
}> {
  const count = Math.max(1, Math.min(12, Math.round(Number(periodsCount) || 1)));
  const unit = Number((Number(unitPlanAmount) || 0).toFixed(2));
  const list: Array<{
    period: string;
    label: string;
    amount: number;
    status: 'Não Compensado (Refazer Checkout)' | 'Pago';
  }> = [];
  for (let i = 0; i < count; i++) {
    const preset = CLIENT_PERIOD_CATALOG[i] || {
      period: `Período ${i + 1}`,
      label: `${i + 1}º Período`,
    };
    list.push({
      period: preset.period,
      label: preset.label,
      amount: unit,
      status: isPaid ? 'Pago' : 'Não Compensado (Refazer Checkout)',
    });
  }
  return list;
}

export function formatClientPeriodsLabel(
  periodsCountOrBreakdown: number | Array<{ period: string; label?: string }>
): string {
  const count = Array.isArray(periodsCountOrBreakdown)
    ? Math.max(1, periodsCountOrBreakdown.length)
    : Math.max(1, Math.round(Number(periodsCountOrBreakdown) || 1));
  if (count === 1) return '1 período mensal (Out-Nov/2026)';
  if (count === 2) return '2 períodos acumulados (Set/2026 e Out-Nov/2026)';
  if (count === 3) return '3 períodos acumulados (Ago/2026, Set/2026 e Out-Nov/2026)';
  if (count === 6) return '6 períodos (Ciclo Promocional Completo de 6 Meses)';
  return `${count} períodos acumulados`;
}

export interface ActiveSubscriptionState {
  planId: string;
  planCode: string;
  planName: string;
  price: number;
  billingCycle?: 'Mensal' | 'Anual' | 'Gratuito';
  activatedAt: string;
}

export function getActiveUserSubscription(): ActiveSubscriptionState {
  try {
    const raw = localStorage.getItem(ACTIVE_SUBSCRIPTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.planName) {
        return parsed as ActiveSubscriptionState;
      }
    }
  } catch {
    // fallback to free plan
  }
  return {
    planId: 'plan-004',
    planCode: 'Gratuito Lançamento',
    planName: 'Cadastro Gratuito',
    price: 0,
    activatedAt: new Date().toISOString(),
  };
}

export function setActiveUserSubscription(sub: Partial<ActiveSubscriptionState>): ActiveSubscriptionState {
  const next: ActiveSubscriptionState = {
    planId: sub.planId || 'plan-004',
    planCode: sub.planCode || 'Gratuito Lançamento',
    planName: sub.planName || 'Cadastro Gratuito',
    price: Number(sub.price) || 0,
    billingCycle: sub.billingCycle || (Number(sub.price) <= 0 ? 'Gratuito' : (sub.planName || '').toLowerCase().includes('anual') || Number(sub.price) >= 400 ? 'Anual' : 'Mensal'),
    activatedAt: sub.activatedAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(ACTIVE_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_UPDATED_EVENT, { detail: next }));
    }
  } catch {
    // ignore storage errors
  }
  return next;
}

export function hasPaidServiceAccess(sub?: ActiveSubscriptionState | null): boolean {
  const current = sub || getActiveUserSubscription();
  const code = (current.planCode || '').toLowerCase();
  const name = (current.planName || '').toLowerCase();
  if (Number(current.price) > 0) return true;
  if (['plan-001', 'plan-002', 'plan-003', 'plan-005'].includes(current.planId)) return true;
  if (
    !code.includes('gratuito') &&
    !name.includes('gratuito') &&
    (code.includes('mensal') || code.includes('anual') || name.includes('pro') || name.includes('construtor') || name.includes('básico'))
  ) {
    return true;
  }
  return false;
}

export function hasProLaudoAccess(sub?: ActiveSubscriptionState | null): boolean {
  const current = sub || getActiveUserSubscription();
  const code = (current.planCode || '').toLowerCase();
  const name = (current.planName || '').toLowerCase();
  return (
    current.planId === 'plan-001' ||
    code === 'mensal pro' ||
    name.includes('mensal pro') ||
    code === 'pro'
  );
}

export const REDUCED_PLAN_PRICES: Record<string, number> = {
  'Mensal Básico': 25.00,
  'Mensal Pro': 29.90,
  'Mensal Construtor': 49.90,
  'Anual Construtor': 499.00,
  'Gratuito Lançamento': 0.00,
  'Cadastro Gratuito': 0.00,
};

export function getReducedPlanPrice(planType?: string, currentAmount?: number): number {
  const normalized = (planType || '').toLowerCase().trim();
  if (!normalized) return Number(currentAmount) || 0;
  if (normalized.includes('personalizado')) return Number(currentAmount) || 0;
  if (normalized.includes('gratuito') || normalized.includes('isento')) return 0;
  if (normalized.includes('anual')) return 499.00;
  if (normalized.includes('construtor') || normalized.includes('empreit') || normalized.includes('incorp')) return 49.90;
  if (normalized.includes('básico') || normalized.includes('basico')) return 25.00;
  if (normalized.includes('pro')) return 29.90;
  return Number(currentAmount) || 0;
}

export function normalizePendingSubscriberCharges(payments: SubscriberPayment[]): {
  updatedPayments: SubscriberPayment[];
  adjustedCount: number;
} {
  let adjustedCount = 0;
  const updatedPayments = payments.map((p) => {
    const isPendingOrOverdue = p.status === 'Pendente' || p.status === 'Atrasado';
    const isPaidInMp = p.mpVerifiedStatus === 'approved' || p.billingStatus === 'Pago no MP';
    if (!isPendingOrOverdue || isPaidInMp) {
      return p;
    }

    const periodsCount = Math.max(1, Math.min(12, Math.round(Number(p.periodsCount) || 3)));
    const unitPrice = getReducedPlanPrice(p.planType, p.unitPlanAmount ?? p.amount);
    const targetPrice = Number((unitPrice * periodsCount).toFixed(2));

    if (
      Math.abs((Number(p.amount) || 0) - targetPrice) <= 0.009 &&
      p.periodsCount === periodsCount &&
      p.unitPlanAmount === unitPrice
    ) {
      return p;
    }

    adjustedCount++;
    const previousFormatted = (Number(p.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const targetFormatted = targetPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    return {
      ...p,
      unitPlanAmount: unitPrice,
      periodsCount,
      periodsLabel: formatClientPeriodsLabel(periodsCount),
      periodsBreakdown: buildClientPeriodsBreakdown(unitPrice, periodsCount, false),
      amount: targetPrice,
      status: targetPrice <= 0 ? ('Isento / Cortesia' as const) : p.status,
      billingStatus: targetPrice <= 0 ? undefined : (p.billingStatus || ('Cobrança Emitida' as const)),
      notes: `Valor pendente ajustado de R$ ${previousFormatted} para R$ ${targetFormatted} (${periodsCount} períodos x R$ ${unitPrice.toFixed(2)} — ${p.planType}).`,
    };
  });

  return { updatedPayments, adjustedCount };
}

export const INITIAL_PLANS: SubscriptionPlanPricing[] = [
  {
    id: 'plan-001',
    name: 'Mensal Pro',
    code: 'Mensal Pro',
    price: 29.90,
    billingCycle: 'Mensal',
    isRecurring: true,
    targetAudience: 'Prestadores, Técnicos, Lojas e Profissionais Independentes',
    features: ['Exclusivo: Emissão de Laudos Técnicos e Vistorias', 'Assinatura mensal recorrente Mercado Pago', 'Acesso completo aos serviços, RDOs e financeiro'],
    activeSubscribersCount: 3,
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'plan-002',
    name: 'Mensal Construtor',
    code: 'Mensal Construtor',
    price: 49.90,
    billingCycle: 'Mensal',
    isRecurring: true,
    targetAudience: 'Construtoras, Empreiteiras e Incorporadoras',
    features: ['Assinatura mensal recorrente Mercado Pago', 'Até 5 subcontas e backup em nuvem', 'Registro de ARTs/RRTs e relatórios PDF/Excel'],
    activeSubscribersCount: 1,
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'plan-005',
    name: 'Anual Construtor',
    code: 'Anual Construtor',
    price: 499.00,
    billingCycle: 'Anual',
    isRecurring: true,
    targetAudience: 'Construtoras, Empreiteiras e Incorporadoras (Plano Anual)',
    features: ['Plano anual com economia de 2 meses no Mercado Pago', 'Multiobras ilimitadas, até 15 subcontas e backup Drive', 'Acesso total a serviços, ARTs/RRTs, RDOs e relatórios'],
    activeSubscribersCount: 0,
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'plan-003',
    name: 'Mensal Básico',
    code: 'Mensal Básico',
    price: 25.00,
    billingCycle: 'Mensal',
    isRecurring: true,
    targetAudience: 'Profissionais avulsos e orçamentistas',
    features: ['Assinatura mensal recorrente Mercado Pago', 'Envio mensal de propostas e contato WhatsApp', 'Ferramentas essenciais da obra'],
    activeSubscribersCount: 1,
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'plan-004',
    name: 'Cadastro Gratuito',
    code: 'Gratuito Lançamento',
    price: 0.00,
    billingCycle: 'Gratuito',
    isRecurring: false,
    targetAudience: 'Visitantes — apenas visualização das oportunidades',
    features: ['Apenas visualização das oportunidades de obras abertas', 'Sem acesso aos serviços (RDO, Caixa, Propostas, WhatsApp)', 'Assine um plano pago a qualquer momento para liberar serviços'],
    activeSubscribersCount: 2,
    updatedAt: new Date().toISOString().split('T')[0],
  }
];

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlanPricing[]> {
  try {
    const payments = getStoredPayments();
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    let plans: SubscriptionPlanPricing[] = raw ? JSON.parse(raw) : INITIAL_PLANS;
    // Computa dinamicamente só e somente os dados reais de assinantes inscritos
    return plans.map(p => ({
      ...p,
      activeSubscribersCount: payments.filter(sub => sub.planType === p.code || sub.planType === p.name).length
    }));
  } catch {
    return INITIAL_PLANS;
  }
}

export async function saveSubscriptionPlan(plan: Partial<SubscriptionPlanPricing>): Promise<SubscriptionPlanPricing> {
  const plans = await fetchSubscriptionPlans();
  const now = new Date().toISOString().split('T')[0];

  if (plan.id) {
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = {
        ...plans[idx],
        ...plan,
        price: Number(plan.price) || 0,
        updatedAt: now,
      } as SubscriptionPlanPricing;
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
      return plans[idx];
    }
  }

  const newPlan: SubscriptionPlanPricing = {
    id: `plan-${Date.now()}`,
    name: plan.name || 'Novo Plano',
    code: plan.code || 'Personalizado',
    price: Number(plan.price) || 0,
    billingCycle: plan.billingCycle || 'Mensal',
    targetAudience: plan.targetAudience || 'Geral',
    features: plan.features || ['Recursos essenciais'],
    activeSubscribersCount: 0,
    updatedAt: now,
  };

  plans.push(newPlan);
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  return newPlan;
}

export async function deleteSubscriptionPlan(id: string): Promise<boolean> {
  const plans = await fetchSubscriptionPlans();
  const filtered = plans.filter(p => p.id !== id);
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

const INITIAL_LOCAL_PAYMENTS: SubscriberPayment[] = [
  {
    id: 'sub-pay-001',
    subscriberName: 'Eng. Carlos Eduardo Martins',
    subscriberEmail: 'carlos.martins.eng@gmail.com',
    subscriberPhone: '(73) 99123-4567',
    subscriberRole: 'Técnico / Projetista',
    planType: 'Mensal Pro',
    unitPlanAmount: 29.90,
    periodsCount: 3,
    periodsLabel: '3 períodos acumulados (Ago/2026, Set/2026 e Out-Nov/2026)',
    periodsBreakdown: buildClientPeriodsBreakdown(29.90, 3, false),
    amount: 89.70,
    method: 'Mercado Pago',
    status: 'Pendente',
    paymentDate: '',
    dueDate: '2026-11-20',
    reference: 'Cobrança Acumulada (3 Períodos: Ago, Set e Out-Nov/2026) — Mensal Pro (R$ 29,90/mês)',
    notes: 'Pagamentos anteriores não compensados devido a erro no checkout do Mercado Pago. Valor atualizado com os 3 períodos pelo plano reduzido (3x R$ 29,90 = R$ 89,70) para refazer o checkout.',
    transactionId: 'SUB-PAY001-3PER',
    projectCount: 4,
    billingStatus: 'Cobrança Emitida',
    billingExternalRef: 'SUB-PAY001-3PER',
  },
  {
    id: 'sub-pay-002',
    subscriberName: 'Construtora & Empreiteira Bahia Sul',
    subscriberEmail: 'contato@bahiasulconstrutora.com.br',
    subscriberPhone: '(73) 98844-3322',
    subscriberRole: 'Construtora / Empreiteiro',
    planType: 'Mensal Construtor',
    unitPlanAmount: 49.90,
    periodsCount: 3,
    periodsLabel: '3 períodos acumulados (Ago/2026, Set/2026 e Out-Nov/2026)',
    periodsBreakdown: buildClientPeriodsBreakdown(49.90, 3, false),
    amount: 149.70,
    method: 'Mercado Pago',
    status: 'Pendente',
    paymentDate: '',
    dueDate: '2026-11-20',
    reference: 'Cobrança Acumulada (3 Períodos: Ago, Set e Out-Nov/2026) — Mensal Construtor (R$ 49,90/mês)',
    notes: 'Pagamentos anteriores não compensados devido a erro no checkout do Mercado Pago. Valor atualizado com os 3 períodos pelo plano reduzido (3x R$ 49,90 = R$ 149,70) para refazer o checkout.',
    transactionId: 'SUB-PAY002-3PER',
    projectCount: 12,
    billingStatus: 'Cobrança Emitida',
    billingExternalRef: 'SUB-PAY002-3PER',
  },
  {
    id: 'sub-pay-003',
    subscriberName: 'Depósito & Madeireira São Jorge',
    subscriberEmail: 'vendas@deposito-saojorge.com.br',
    subscriberPhone: '(73) 99911-8877',
    subscriberRole: 'Loja / Fornecedor',
    planType: 'Mensal Pro',
    unitPlanAmount: 29.90,
    periodsCount: 3,
    periodsLabel: '3 períodos acumulados (Ago/2026, Set/2026 e Out-Nov/2026)',
    periodsBreakdown: buildClientPeriodsBreakdown(29.90, 3, false),
    amount: 89.70,
    method: 'Mercado Pago',
    status: 'Pendente',
    paymentDate: '',
    dueDate: '2026-11-20',
    reference: 'Cobrança Acumulada (3 Períodos: Ago, Set e Out-Nov/2026) — Mensal Pro (R$ 29,90/mês)',
    notes: 'Pagamentos anteriores não compensados devido a erro no checkout do Mercado Pago. Valor atualizado com os 3 períodos pelo plano reduzido (3x R$ 29,90 = R$ 89,70) para refazer o checkout.',
    transactionId: 'SUB-PAY003-3PER',
    projectCount: 8,
    billingStatus: 'Cobrança Emitida',
    billingExternalRef: 'SUB-PAY003-3PER',
  },
  {
    id: 'sub-pay-004',
    subscriberName: 'Mestre Valdir Ramos (Alvenaria & Acabamentos)',
    subscriberEmail: 'valdir.mestre.obras@gmail.com',
    subscriberPhone: '(73) 98133-7766',
    subscriberRole: 'Prestador de Serviço',
    planType: 'Gratuito Lançamento',
    unitPlanAmount: 0.00,
    periodsCount: 1,
    periodsLabel: 'Isento / Gratuito Lançamento',
    amount: 0.00,
    method: 'Dinheiro',
    status: 'Isento / Cortesia',
    paymentDate: '2026-08-01',
    dueDate: '2026-12-31',
    reference: 'Inscrição Gratuita Promocional de Lançamento',
    notes: 'Gratuidade promocional para prestador de mão de obra.',
    transactionId: 'FREE-LAUNCH-PROMO-001',
    projectCount: 2,
  },
  {
    id: 'sub-pay-005',
    subscriberName: 'Dra. Mariana Sampaio (Cliente Solicitante)',
    subscriberEmail: 'mariana.sampaio@adv.com.br',
    subscriberPhone: '(73) 99201-1122',
    subscriberRole: 'Solicitante / Cliente',
    planType: 'Gratuito Lançamento',
    unitPlanAmount: 0.00,
    periodsCount: 1,
    periodsLabel: 'Isento / Gratuito Lançamento',
    amount: 0.00,
    method: 'PIX',
    status: 'Isento / Cortesia',
    paymentDate: '2026-08-05',
    dueDate: '2026-12-31',
    reference: 'Inscrição Gratuita Solicitante de Reforma',
    notes: 'Inscrição 100% gratuita para solicitação de cotações.',
    transactionId: 'FREE-LAUNCH-PROMO-002',
    projectCount: 1,
  },
  {
    id: 'sub-pay-006',
    subscriberName: 'Topografia & Sondagem Litoral',
    subscriberEmail: 'financeiro@topografialitoral.com.br',
    subscriberPhone: '(73) 98877-0099',
    subscriberRole: 'Técnico / Projetista',
    planType: 'Mensal Pro',
    unitPlanAmount: 29.90,
    periodsCount: 3,
    periodsLabel: '3 períodos acumulados (Ago/2026, Set/2026 e Out-Nov/2026)',
    periodsBreakdown: buildClientPeriodsBreakdown(29.90, 3, false),
    amount: 89.70,
    method: 'Mercado Pago',
    status: 'Pendente',
    paymentDate: '',
    dueDate: '2026-11-20',
    reference: 'Cobrança Acumulada (3 Períodos: Ago, Set e Out-Nov/2026) — Mensal Pro (R$ 29,90/mês)',
    notes: 'Pagamentos anteriores não compensados devido a erro no checkout do Mercado Pago. Valor atualizado com os 3 períodos pelo plano reduzido (3x R$ 29,90 = R$ 89,70) para refazer o checkout.',
    transactionId: 'SUB-PAY006-3PER',
    projectCount: 3,
    billingStatus: 'Cobrança Emitida',
    billingExternalRef: 'SUB-PAY006-3PER',
  },
  {
    id: 'sub-pay-007',
    subscriberName: 'Elétrica & Automação Santos',
    subscriberEmail: 'contato@eletricasantos.com.br',
    subscriberPhone: '(73) 99188-4455',
    subscriberRole: 'Prestador de Serviço',
    planType: 'Mensal Básico',
    unitPlanAmount: 25.00,
    periodsCount: 3,
    periodsLabel: '3 períodos acumulados (Ago/2026, Set/2026 e Out-Nov/2026)',
    periodsBreakdown: buildClientPeriodsBreakdown(25.00, 3, false),
    amount: 75.00,
    method: 'Mercado Pago',
    status: 'Pendente',
    paymentDate: '',
    dueDate: '2026-11-20',
    reference: 'Cobrança Acumulada (3 Períodos: Ago, Set e Out-Nov/2026) — Mensal Básico (R$ 25,00/mês)',
    notes: 'Pagamentos anteriores não compensados devido a erro no checkout do Mercado Pago. Valor atualizado com os 3 períodos pelo plano reduzido (3x R$ 25,00 = R$ 75,00) para refazer o checkout.',
    transactionId: 'SUB-PAY007-3PER',
    projectCount: 1,
    billingStatus: 'Cobrança Emitida',
    billingExternalRef: 'SUB-PAY007-3PER',
  }
];

function getStoredPayments(): SubscriberPayment[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_LOCAL_PAYMENTS));
      return INITIAL_LOCAL_PAYMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const { updatedPayments, adjustedCount } = normalizePendingSubscriberCharges(parsed);
      if (adjustedCount > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPayments));
      }
      return updatedPayments;
    }
    return INITIAL_LOCAL_PAYMENTS;
  } catch {
    return INITIAL_LOCAL_PAYMENTS;
  }
}

function saveStoredPayments(payments: SubscriberPayment[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payments));
  } catch (err) {
    console.error('Error saving subscriber payments to local storage', err);
  }
}

export async function fetchSubscribersCashflow(): Promise<{
  summary: SubscriberCashflowSummary;
  payments: SubscriberPayment[];
}> {
  const session = getCachedAdminSession();
  const token = session?.token;

  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/subscribers-cashflow', { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.payments) {
        saveStoredPayments(data.payments);
        return data;
      }
    }
  } catch (err) {
    console.warn('Fallback to local storage for subscribers cashflow', err);
  }

  // Fallback calculation using local storage
  const payments = getStoredPayments();
  const approved = payments.filter(p => p.status === 'Aprovado');
  const pending = payments.filter(p => p.status === 'Pendente' || p.status === 'Atrasado');
  const totalCollected = approved.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const pendingAmount = pending.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  
  const monthlyRecurringRevenue = approved
    .filter(p => Number(p.amount) > 0)
    .reduce((a, b) => a + (Number(b.unitPlanAmount) || Number(b.amount)), 0);

  const totalSubscribers = payments.length;
  const freeTierSubscribers = payments.filter(p => p.planType === 'Gratuito Lançamento' || p.status === 'Isento / Cortesia').length;
  const activePaidSubscribers = approved.filter(p => Number(p.amount) > 0).length;
  const overdueSubscribers = payments.filter(p => p.status === 'Atrasado').length;
  const payingSubscribersCount = payments.filter(p => p.planType !== 'Gratuito Lançamento' && p.status !== 'Isento / Cortesia').length;
  const totalPendingPeriodsCount = pending.reduce((acc, curr) => acc + (Number(curr.periodsCount) || 1), 0);

  return {
    summary: {
      totalCollected,
      pendingAmount,
      monthlyRecurringRevenue,
      totalSubscribers,
      activePaidSubscribers,
      freeTierSubscribers,
      overdueSubscribers,
      payingSubscribersCount,
      totalPendingPeriodsCount,
    },
    payments,
  };
}

export async function saveSubscriberPayment(payment: Partial<SubscriberPayment>): Promise<SubscriberPayment> {
  const session = getCachedAdminSession();
  const token = session?.token;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/subscribers-payment', {
      method: 'POST',
      headers,
      body: JSON.stringify(payment),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.payment) {
        const local = getStoredPayments();
        const idx = local.findIndex(p => p.id === data.payment.id);
        if (idx !== -1) {
          local[idx] = data.payment;
        } else {
          local.unshift(data.payment);
        }
        saveStoredPayments(local);
        return data.payment;
      }
    }
  } catch (err) {
    console.warn('Fallback to local storage for saveSubscriberPayment', err);
  }

  // Local fallback
  const local = getStoredPayments();
  if (payment.id) {
    const idx = local.findIndex(p => p.id === payment.id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...payment } as SubscriberPayment;
      saveStoredPayments(local);
      return local[idx];
    }
  }

  const newPayment: SubscriberPayment = {
    id: payment.id || `sub-pay-${Date.now()}`,
    subscriberName: payment.subscriberName || 'Assinante',
    subscriberEmail: payment.subscriberEmail || '',
    subscriberPhone: payment.subscriberPhone || '',
    subscriberRole: payment.subscriberRole || 'Prestador de Serviço',
    planType: payment.planType || 'Mensal Pro',
    amount: Number(payment.amount) || 0,
    method: payment.method || 'PIX',
    status: payment.status || 'Aprovado',
    paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
    dueDate: payment.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    reference: payment.reference || 'Assinatura / Uso da Plataforma',
    notes: payment.notes || '',
    transactionId: payment.transactionId || `TX-${Date.now()}`,
    projectCount: Number(payment.projectCount) || 1,
  };

  local.unshift(newPayment);
  saveStoredPayments(local);
  return newPayment;
}

export async function updateSubscriberPaymentStatus(
  id: string, 
  status: SubscriberPaymentStatus, 
  notes?: string
): Promise<boolean> {
  const session = getCachedAdminSession();
  const token = session?.token;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/subscribers-payment/${id}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status, notes }),
    });

    if (res.ok) {
      const local = getStoredPayments();
      const item = local.find(p => p.id === id);
      if (item) {
        item.status = status;
        if (notes) item.notes = notes;
        if (status === 'Aprovado' && !item.paymentDate) {
          item.paymentDate = new Date().toISOString().split('T')[0];
        }
        saveStoredPayments(local);
      }
      return true;
    }
  } catch (err) {
    console.warn('Fallback local update for subscriber status', err);
  }

  // Local fallback
  const local = getStoredPayments();
  const item = local.find(p => p.id === id);
  if (item) {
    item.status = status;
    if (notes) item.notes = notes;
    if (status === 'Aprovado' && !item.paymentDate) {
      item.paymentDate = new Date().toISOString().split('T')[0];
    }
    saveStoredPayments(local);
    return true;
  }

  return false;
}

export async function deleteSubscriberPayment(id: string): Promise<boolean> {
  const session = getCachedAdminSession();
  const token = session?.token;

  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/subscribers-payment/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (res.ok) {
      const local = getStoredPayments();
      const filtered = local.filter(p => p.id !== id);
      saveStoredPayments(filtered);
      return true;
    }
  } catch (err) {
    console.warn('Fallback local delete for subscriber payment', err);
  }

  const local = getStoredPayments();
  const filtered = local.filter(p => p.id !== id);
  saveStoredPayments(filtered);
  return true;
}

export interface EmittedBillingCharge {
  id: string;
  subscriberName: string;
  subscriberEmail: string;
  subscriberPhone: string;
  subscriberRole: string;
  planType: string;
  amount: number;
  dueDate: string;
  billingExternalRef: string;
  billingLink: string;
  pixTicketUrl: string;
  pixCopyPaste: string;
  mpPreferenceId: string;
  mpPaymentId: string | number;
  billingMessage: string;
  mode: 'live' | 'partial' | 'fallback';
  billingEmittedAt: string;
}

export async function fetchLiveMercadoPagoPayments(explicitToken?: string): Promise<{
  success: boolean;
  totalInMercadoPago: number;
  approvedCount: number;
  pendingCount: number;
  subscriberMatchedApprovedCount: number;
  reconciledCount: number;
  payments: LiveMercadoPagoPayment[];
  subscriberPayments?: SubscriberPayment[];
}> {
  const token = explicitToken || getCachedAdminSession()?.token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/mercadopago/live-payments', { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao consultar pagamentos ao vivo do Mercado Pago');
  }
  if (Array.isArray(data.subscriberPayments)) {
    saveStoredPayments(data.subscriberPayments);
  }
  return data;
}

export async function emitSubscribersBillingBatch(
  subscribers: Partial<SubscriberPayment>[],
  explicitToken?: string
): Promise<{
  success: boolean;
  totalEmitted: number;
  livePreferencesCount: number;
  livePixCount: number;
  emittedCharges: EmittedBillingCharge[];
  subscriberPayments: SubscriberPayment[];
}> {
  const token = explicitToken || getCachedAdminSession()?.token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/admin/subscribers-billing/emit-batch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ subscribers }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao emitir cobranças no Mercado Pago');
  }

  if (Array.isArray(data.subscriberPayments)) {
    saveStoredPayments(data.subscriberPayments);
  }
  return data;
}

export async function adjustPendingSubscribersBilling(
  options?: {
    reemitMercadoPago?: boolean;
    updates?: Array<{
      id: string;
      planType?: string;
      amount?: number;
      unitPlanAmount?: number;
      periodsCount?: number;
    }>;
  },
  explicitToken?: string
): Promise<{
  success: boolean;
  adjustedCount: number;
  adjustedIds: string[];
  adjustedDetails: Array<{
    id: string;
    subscriberName: string;
    planType: string;
    periodsCount?: number;
    unitPlanAmount?: number;
    previousAmount: number;
    newAmount: number;
  }>;
  reemittedCount: number;
  livePreferencesCount: number;
  livePixCount: number;
  subscriberPayments: SubscriberPayment[];
}> {
  const token = explicitToken || getCachedAdminSession()?.token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const bodyPayload = {
    reemitMercadoPago: options?.reemitMercadoPago !== false,
    updates: options?.updates || [],
  };

  try {
    const res = await fetch('/api/admin/subscribers-billing/adjust-pending', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao ajustar cobranças pendentes.');
    }
    if (Array.isArray(data.subscriberPayments)) {
      saveStoredPayments(data.subscriberPayments);
    }
    return data;
  } catch (err) {
    // Fallback local normalization if offline or unauthenticated
    const local = getStoredPayments();
    const { updatedPayments, adjustedCount } = normalizePendingSubscriberCharges(local);
    saveStoredPayments(updatedPayments);
    if (err instanceof Error && err.message.includes('Acesso restrito')) {
      throw err;
    }
    return {
      success: true,
      adjustedCount,
      adjustedIds: [],
      adjustedDetails: [],
      reemittedCount: 0,
      livePreferencesCount: 0,
      livePixCount: 0,
      subscriberPayments: updatedPayments,
    };
  }
}

export async function markSubscribersBillingSent(
  subscriberIds: string[],
  channel: 'WhatsApp' | 'Email' | 'Link Copiado',
  explicitToken?: string
): Promise<{ success: boolean; updatedCount: number; subscriberPayments?: SubscriberPayment[] }> {
  const token = explicitToken || getCachedAdminSession()?.token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch('/api/admin/subscribers-billing/mark-sent', {
      method: 'POST',
      headers,
      body: JSON.stringify({ subscriberIds, channel }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (Array.isArray(data.subscriberPayments)) {
        saveStoredPayments(data.subscriberPayments);
      }
      return data;
    }
  } catch (err) {
    console.warn('Fallback local mark-sent update:', err);
  }

  const local = getStoredPayments();
  const nowIso = new Date().toISOString();
  const updated = local.map((p) =>
    subscriberIds.includes(p.id)
      ? {
          ...p,
          billingStatus: p.billingStatus === 'Pago no MP' ? ('Pago no MP' as const) : ('Enviada' as const),
          billingSentAt: nowIso,
          billingChannel: channel,
        }
      : p
  );
  saveStoredPayments(updated);
  return { success: true, updatedCount: subscriberIds.length, subscriberPayments: updated };
}

export async function fetchRealSubscribersStatus(forceRefresh = false): Promise<RealSubscribersStatusResponse> {
  const token = getCachedAdminSession()?.token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const query = forceRefresh ? '?refresh=1' : '';
    const res = await fetch(`/api/subscribers/real-status${query}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data && data.subscribers) {
        return data as RealSubscribersStatusResponse;
      }
    }
  } catch (err) {
    console.warn('Fallback to local subscriber status snapshot:', err);
  }

  const local = getStoredPayments();
  const activePaid = local.filter((s) => s.status === 'Aprovado' && Number(s.amount) > 0).length;
  const activeFree = local.filter((s) => s.planType === 'Gratuito Lançamento' || s.status === 'Isento / Cortesia').length;
  const pending = local.filter((s) => s.status === 'Pendente').length;
  const overdue = local.filter((s) => s.status === 'Atrasado').length;
  const mpVerified = local.filter((s) => s.mpVerifiedStatus === 'approved' || s.billingStatus === 'Pago no MP').length;

  const mapped: RealSubscriberStatusItem[] = local.map((s) => {
    const isFree = s.planType === 'Gratuito Lançamento' || s.status === 'Isento / Cortesia';
    const isPaidActive = s.status === 'Aprovado' && Number(s.amount) > 0;
    const isMpVerified = s.mpVerifiedStatus === 'approved' || s.billingStatus === 'Pago no MP';
    let verificationBadge: RealSubscriberStatusItem['verificationBadge'] = 'Cobrança Pendente';
    if (s.status === 'Cancelado') verificationBadge = 'Cancelado';
    else if (s.status === 'Atrasado') verificationBadge = 'Em Atraso';
    else if (isFree) verificationBadge = 'Cadastro Gratuito Ativo';
    else if (isPaidActive && isMpVerified) verificationBadge = 'Pago Confirmado no MP';
    else if (isPaidActive) verificationBadge = 'Ativo no Sistema';

    return {
      id: s.id,
      subscriberName: s.subscriberName,
      subscriberEmail: s.subscriberEmail,
      subscriberPhone: s.subscriberPhone,
      subscriberRole: s.subscriberRole,
      planType: s.planType,
      amount: Number(s.amount) || 0,
      method: s.method,
      status: s.status,
      paymentDate: s.paymentDate,
      dueDate: s.dueDate,
      billingStatus: s.billingStatus,
      mpVerifiedStatus: s.mpVerifiedStatus,
      mpPaymentId: s.mpPaymentId,
      projectCount: s.projectCount || 1,
      isActive: isPaidActive || isFree,
      verificationBadge,
    };
  });

  return {
    success: true,
    checkedAt: new Date().toISOString(),
    summary: {
      totalEnrolledSubscribers: local.length,
      activePaidSubscribers: activePaid,
      activeFreeSubscribers: activeFree,
      pendingSubscribers: pending,
      overdueSubscribers: overdue,
      mpVerifiedPaidSubscribers: mpVerified,
    },
    mpLiveStats: {
      configured: false,
      totalPaymentsInMp: 0,
      approvedPaymentsInMp: 0,
      pendingPaymentsInMp: 0,
      recurringSubscriptionsActiveInMp: 0,
      recurringSubscriptionsPendingInMp: 0,
      activeMpPlansCount: 0,
      liveApprovedPayments: [],
      liveRecurringSubscriptions: [],
    },
    subscribers: mapped,
  };
}

export async function syncEnrolledSubscriberToServer(payload: {
  subscriberName: string;
  subscriberEmail?: string;
  subscriberPhone?: string;
  subscriberRole?: string;
  planType: string;
  amount: number;
  method?: string;
  transactionId?: string | number;
  mpPaymentId?: string | number;
  mpVerifiedStatus?: string;
}): Promise<void> {
  try {
    await fetch('/api/subscribers/enroll-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking sync
  }
}

export interface VerifiedSubscriberAccess {
  isAdmin: boolean;
  isMasterEmail: boolean;
  verified: boolean;
  hasServiceAccess: boolean;
  hasProLaudoAccess: boolean;
  planId: string;
  planCode: string;
  planName: string;
  price: number;
  billingCycle: 'Mensal' | 'Anual' | 'Gratuito';
}

export async function verifyAuthenticatedSubscriberAccess(
  email?: string | null,
  explicitAdminToken?: string | null
): Promise<VerifiedSubscriberAccess> {
  const token = explicitAdminToken || getCachedAdminSession()?.token;
  const cleanEmail = (email || '').trim().toLowerCase();

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/subscribers/verify-access', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: cleanEmail || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.hasServiceAccess === 'boolean') {
        return data as VerifiedSubscriberAccess;
      }
    }
  } catch {
    // Fallback to local records below
  }

  if (token) {
    return {
      isAdmin: true,
      isMasterEmail: true,
      verified: true,
      hasServiceAccess: true,
      hasProLaudoAccess: true,
      planId: 'plan-001',
      planCode: 'Mensal Pro',
      planName: 'Admin Master Global',
      price: 29.90,
      billingCycle: 'Mensal',
    };
  }

  if (cleanEmail) {
    const local = getStoredPayments();
    const matched = local.find(
      (s) =>
        s.subscriberEmail &&
        s.subscriberEmail.trim().toLowerCase() === cleanEmail &&
        s.status === 'Aprovado' &&
        Number(s.amount) > 0
    );
    if (matched) {
      const lower = (matched.planType || '').toLowerCase();
      const isAnnual = lower.includes('anual') || Number(matched.amount) >= 400;
      const isPro = lower.includes('pro');
      return {
        isAdmin: false,
        isMasterEmail: false,
        verified: true,
        hasServiceAccess: true,
        hasProLaudoAccess: isPro,
        planId: isAnnual ? 'plan-005' : isPro ? 'plan-001' : lower.includes('construtor') ? 'plan-002' : 'plan-003',
        planCode: matched.planType,
        planName: matched.planType,
        price: Number(matched.amount) || 0,
        billingCycle: isAnnual ? 'Anual' : 'Mensal',
      };
    }
  }

  return {
    isAdmin: false,
    isMasterEmail: false,
    verified: Boolean(cleanEmail),
    hasServiceAccess: false,
    hasProLaudoAccess: false,
    planId: 'plan-004',
    planCode: 'Gratuito Lançamento',
    planName: 'Cadastro Gratuito',
    price: 0,
    billingCycle: 'Gratuito',
  };
}

export interface SubscriberBillingNotice {
  id: string;
  title: string;
  reasonCode: string;
  message: string;
  promoDurationMonths: number;
  reducedPlansSummary: Array<{ name: string; price: number; cycle: string }>;
  targetSubscribersCount: number;
  sentAt: string;
  sentBy: string;
  channels: string[];
  active: boolean;
}

export interface NoticeDispatchRecipient {
  id: string;
  subscriberName: string;
  subscriberEmail?: string;
  subscriberPhone?: string;
  planType: string;
  amount: number;
  billingLink?: string;
  pixTicketUrl?: string;
  pixCopyPaste?: string;
  personalizedMessage: string;
}

export const DEFAULT_CHECKOUT_RECOVERY_NOTICE =
  'Olá! Você está recebendo a cobrança atualizada de todos os períodos da plataforma Mãos em Obra porque os pagamentos anteriores não foram compensados (R$ 0,00 faturado/compensado até o momento) devido a um erro técnico que havia no checkout do Mercado Pago (problema já corrigido). Para apoiar nossos assinantes, reduzimos os valores dos planos por 6 meses: Mensal Básico R$ 25,00/mês, Mensal Pro R$ 29,90/mês, Mensal Construtor R$ 49,90/mês e Anual Construtor R$ 499,00/ano. Refaça seu checkout pelo link atualizado ou PIX para compensação imediata.';

export function buildCheckoutRecoveryMessage(
  subscriber: {
    subscriberName: string;
    planType: string;
    unitPlanAmount?: number;
    periodsCount?: number;
    periodsLabel?: string;
    amount: number;
    billingLink?: string;
    pixTicketUrl?: string;
    pixCopyPaste?: string;
  },
  customIntro?: string
): string {
  const periods = Math.max(1, Number(subscriber.periodsCount) || 3);
  const unitVal =
    Number(subscriber.unitPlanAmount) ||
    getReducedPlanPrice(subscriber.planType, Number((Number(subscriber.amount) / periods).toFixed(2))) ||
    Number((Number(subscriber.amount) / periods).toFixed(2));
  const unitFormatted = unitVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const amountFormatted = (Number(subscriber.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const periodsText = subscriber.periodsLabel || formatClientPeriodsLabel(periods);
  const intro = (customIntro || '').trim()
    ? customIntro!.trim()
    : 'Informamos que você está recebendo a cobrança de todos os períodos porque os valores anteriores não foram compensados (R$ 0,00 compensado até o momento) por conta de um erro que havia no checkout do Mercado Pago (já corrigido).\n\nReduzimos os valores dos planos por *6 meses*:\n• *Mensal Básico:* R$ 25,00/mês\n• *Mensal Pro:* R$ 29,90/mês\n• *Mensal Construtor:* R$ 49,90/mês\n• *Anual Construtora/Empreiteira:* R$ 499,00/ano';

  return [
    `Olá, *${subscriber.subscriberName}*!`,
    ``,
    intro,
    ``,
    `📌 *Resumo dos Períodos p/ Refazer o Checkout:*`,
    `• *Plano:* ${subscriber.planType} (R$ ${unitFormatted}/mês na promoção de 6 meses)`,
    `• *Períodos incluídos:* ${periodsText} (${periods}x R$ ${unitFormatted})`,
    `• *Valor Total a Compensar:* R$ ${amountFormatted}`,
    subscriber.billingLink ? `\n💳 *Refazer Checkout via Mercado Pago (Checkout Corrigido):*\n${subscriber.billingLink}` : '',
    subscriber.pixTicketUrl ? `\n🧾 *Fatura PIX Direta (QR Code):*\n${subscriber.pixTicketUrl}` : '',
    subscriber.pixCopyPaste ? `\n💠 *PIX Copia e Cola (Mercado Pago):*\n${subscriber.pixCopyPaste}` : '',
    `\nAssim que compensar, a liberação no sistema é automática.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function fetchActiveSubscriberNotices(): Promise<{
  notices: SubscriberBillingNotice[];
  uncompensatedPendingCount: number;
}> {
  try {
    const res = await fetch('/api/subscribers/notices');
    if (!res.ok) throw new Error('Falha ao carregar comunicados');
    const data = await res.json();
    return {
      notices: Array.isArray(data.notices) ? data.notices : [],
      uncompensatedPendingCount: Number(data.uncompensatedPendingCount) || 0,
    };
  } catch {
    return {
      notices: [
        {
          id: 'notice-mp-checkout-6m-fallback',
          title: 'Comunicado Importante: Erro no Checkout Mercado Pago & Planos Reduzidos por 6 Meses',
          reasonCode: 'mercadopago_checkout_error_6m_promo',
          message: DEFAULT_CHECKOUT_RECOVERY_NOTICE,
          promoDurationMonths: 6,
          reducedPlansSummary: [
            { name: 'Mensal Básico', price: 25.00, cycle: 'mês' },
            { name: 'Mensal Pro', price: 29.90, cycle: 'mês' },
            { name: 'Mensal Construtor', price: 49.90, cycle: 'mês' },
            { name: 'Anual Construtor / Empreiteira', price: 499.00, cycle: 'ano' },
          ],
          targetSubscribersCount: 1,
          sentAt: new Date().toISOString(),
          sentBy: 'Admin Master',
          channels: ['Painel do Assinante', 'WhatsApp', 'E-mail'],
          active: true,
        },
      ],
      uncompensatedPendingCount: 1,
    };
  }
}

export async function sendSubscriberBillingNotice(
  params: {
    subscriberIds?: string[];
    customMessage?: string;
    title?: string;
    channels?: string[];
  },
  explicitToken?: string
): Promise<{
  success: boolean;
  notice: SubscriberBillingNotice;
  recipientsCount: number;
  recipients: NoticeDispatchRecipient[];
  subscriberPayments: SubscriberPayment[];
}> {
  const sessionToken = explicitToken || getCachedAdminSession()?.token;
  if (!sessionToken) {
    throw new Error('Autenticação Admin Master necessária para enviar comunicado.');
  }

  const res = await fetch('/api/admin/subscribers-billing/send-notice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao registrar e enviar comunicado aos assinantes.');
  }

  const data = await res.json();
  if (Array.isArray(data.subscriberPayments)) {
    saveStoredPayments(data.subscriberPayments);
  }
  return data;
}

