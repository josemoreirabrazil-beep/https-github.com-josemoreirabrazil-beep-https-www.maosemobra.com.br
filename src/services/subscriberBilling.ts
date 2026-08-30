import type { 
  SubscriberPayment, 
  SubscriberCashflowSummary,
  SubscriberPaymentStatus,
  SubscriptionPlanPricing 
} from '../types';
import { getCachedAdminSession } from './adminAuth';

const LOCAL_STORAGE_KEY = 'maos_em_obra_subscriber_payments_v2';
const PLANS_STORAGE_KEY = 'maos_em_obra_subscription_plans_v1';

const INITIAL_PLANS: SubscriptionPlanPricing[] = [
  {
    id: 'plan-001',
    name: 'Mensal Pro',
    code: 'Mensal Pro',
    price: 149.90,
    billingCycle: 'Mensal',
    targetAudience: 'Prestadores, Técnicos, Lojas e Profissionais Independentes',
    features: ['Obras ilimitadas', 'RDOs e Diárias digitais', 'Controle financeiro de caixa', 'Suporte prioritário via WhatsApp'],
    activeSubscribersCount: 14,
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'plan-002',
    name: 'Anual Construtor',
    code: 'Anual Construtor',
    price: 1490.00,
    billingCycle: 'Anual',
    targetAudience: 'Construtoras, Empreiteiras e Incorporadoras',
    features: ['2 meses grátis (economia de R$ 300)', 'Exportação de relatórios avançados (PDF/Excel)', 'Backup em nuvem dedicado', 'Até 5 subcontas de engenheiros/mestres'],
    activeSubscribersCount: 6,
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'plan-003',
    name: 'Taxa de Proposta / Uso por Obra',
    code: 'Taxa de Proposta / Uso',
    price: 45.00,
    billingCycle: 'Por Uso',
    targetAudience: 'Profissionais avulsos e orçamentistas',
    features: ['Liberação pontual por obra/proposta enviada', 'Sem mensalidade fixa', 'Acesso completo às ferramentas da obra'],
    activeSubscribersCount: 9,
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'plan-004',
    name: 'Gratuito Lançamento',
    code: 'Gratuito Lançamento',
    price: 0.00,
    billingCycle: 'Gratuito',
    targetAudience: 'Clientes solicitantes e novos usuários da fase de lançamento',
    features: ['Cadastros de projetos iniciais', 'Envio de solicitações para prestadores', 'Acesso à vitrine de lojas'],
    activeSubscribersCount: 22,
    updatedAt: new Date().toISOString().split('T')[0],
  }
];

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlanPricing[]> {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(INITIAL_PLANS));
      return INITIAL_PLANS;
    }
    return JSON.parse(raw);
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
    amount: 149.90,
    method: 'PIX',
    status: 'Aprovado',
    paymentDate: '2026-08-25',
    dueDate: '2026-09-25',
    reference: 'Assinatura Mensal Pro - Gestão & RDO Ilimitado',
    notes: 'Comprovante PIX validado com sucesso.',
    transactionId: 'PIX-73998599213-982103',
    projectCount: 4,
  },
  {
    id: 'sub-pay-002',
    subscriberName: 'Construtora & Empreiteira Bahia Sul',
    subscriberEmail: 'contato@bahiasulconstrutora.com.br',
    subscriberPhone: '(73) 98844-3322',
    subscriberRole: 'Construtora / Empreiteiro',
    planType: 'Anual Construtor',
    amount: 1490.00,
    method: 'Mercado Pago',
    status: 'Aprovado',
    paymentDate: '2026-08-10',
    dueDate: '2027-08-10',
    reference: 'Plano Anual Construtor Master (12 meses + Drive Backup)',
    notes: 'Processado via Mercado Pago Checkout Pro (Cartão de Crédito 12x).',
    transactionId: 'MP-PREF-9948172635',
    projectCount: 12,
  },
  {
    id: 'sub-pay-003',
    subscriberName: 'Depósito & Madeireira São Jorge',
    subscriberEmail: 'vendas@deposito-saojorge.com.br',
    subscriberPhone: '(73) 99911-8877',
    subscriberRole: 'Loja / Fornecedor',
    planType: 'Mensal Pro',
    amount: 149.90,
    method: 'PIX',
    status: 'Aprovado',
    paymentDate: '2026-08-18',
    dueDate: '2026-09-18',
    reference: 'Catálogo de Materiais e Cotações Rápidas',
    notes: 'Pagamento recebido na chave PIX do Master.',
    transactionId: 'PIX-73998599213-441092',
    projectCount: 8,
  },
  {
    id: 'sub-pay-004',
    subscriberName: 'Mestre Valdir Ramos (Alvenaria & Acabamentos)',
    subscriberEmail: 'valdir.mestre.obras@gmail.com',
    subscriberPhone: '(73) 98133-7766',
    subscriberRole: 'Prestador de Serviço',
    planType: 'Gratuito Lançamento',
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
    amount: 149.90,
    method: 'PIX',
    status: 'Pendente',
    paymentDate: '2026-08-28',
    dueDate: '2026-09-02',
    reference: 'Renovação Mensal Pro Setembro',
    notes: 'Aguardando confirmação do comprovante PIX.',
    transactionId: 'PIX-PENDING-771829',
    projectCount: 3,
  },
  {
    id: 'sub-pay-007',
    subscriberName: 'Elétrica & Automação Santos',
    subscriberEmail: 'contato@eletricasantos.com.br',
    subscriberPhone: '(73) 99188-4455',
    subscriberRole: 'Prestador de Serviço',
    planType: 'Taxa de Proposta / Uso',
    amount: 45.00,
    method: 'Mercado Pago',
    status: 'Aprovado',
    paymentDate: '2026-08-29',
    dueDate: '2026-08-29',
    reference: 'Taxa de Envio de Proposta Comercial Obra Residencial',
    notes: 'Taxa de intermediação aprovada via Mercado Pago.',
    transactionId: 'MP-FEE-881920',
    projectCount: 1,
  }
];

function getStoredPayments(): SubscriberPayment[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_LOCAL_PAYMENTS));
      return INITIAL_LOCAL_PAYMENTS;
    }
    return JSON.parse(raw);
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
  
  const monthlySubs = approved.filter(p => p.planType === 'Mensal Pro').reduce((a, b) => a + Number(b.amount), 0);
  const annualSubs = approved.filter(p => p.planType === 'Anual Construtor').reduce((a, b) => a + Number(b.amount) / 12, 0);
  const monthlyRecurringRevenue = monthlySubs + annualSubs;

  const totalSubscribers = payments.length;
  const freeTierSubscribers = payments.filter(p => p.planType === 'Gratuito Lançamento' || p.status === 'Isento / Cortesia').length;
  const activePaidSubscribers = approved.filter(p => Number(p.amount) > 0).length;
  const overdueSubscribers = payments.filter(p => p.status === 'Atrasado').length;

  return {
    summary: {
      totalCollected,
      pendingAmount,
      monthlyRecurringRevenue,
      totalSubscribers,
      activePaidSubscribers,
      freeTierSubscribers,
      overdueSubscribers,
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
