import type { Expense, ServiceRequest } from '../types';
import { getExpenses, saveExpenses, loadServiceRequests, saveServiceRequests } from './storage';
import confetti from 'canvas-confetti';

export const MERCADO_PAGO_WEBHOOK_ENDPOINT = '/api/mercadopago/webhook';
export const MERCADO_PAGO_WEBHOOK_ALT_ENDPOINT = '/api/webhook/mercadopago';

export interface MercadoPagoWebhookNotification {
  id?: string | number;
  live_mode?: boolean;
  type?: string;
  action?: string;
  date_created?: string;
  user_id?: string | number;
  api_version?: string;
  data?: {
    id?: string;
  };
  // Extra properties for simulated/manual triggers
  amount?: number;
  status?: string;
  external_reference?: string;
  referenceId?: string;
  payer_email?: string;
  payer_name?: string;
}

export interface MercadoPagoRedirectReturn {
  collectionId?: string | null;
  collectionStatus?: string | null;
  paymentId?: string | null;
  status?: string | null;
  externalReference?: string | null;
  paymentType?: string | null;
  merchantOrderId?: string | null;
  preferenceId?: string | null;
  siteId?: string | null;
  processingMode?: string | null;
  merchantAccountId?: string | null;
  mpStatus?: string | null;
  ref?: string | null;
}

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  paymentId?: string;
  status?: 'Aprovado' | 'Pendente' | 'Rejeitado' | 'Cancelado' | 'Reembolsado' | string;
  externalReference?: string;
  matchedEntity?: string;
  updatedExpensesCount?: number;
  updatedServiceRequestsCount?: number;
  autoSweepInitiated?: boolean;
}

/**
 * Checks GET health of the Mercado Pago Webhook listener endpoint
 */
export async function checkWebhookEndpointHealth(): Promise<{
  active: boolean;
  endpoint: string;
  message: string;
}> {
  try {
    const res = await fetch(MERCADO_PAGO_WEBHOOK_ENDPOINT, { method: 'GET' });
    if (!res.ok) throw new Error('Endpoint retornou status ' + res.status);
    const data = await res.json();
    return {
      active: true,
      endpoint: data.endpoint || MERCADO_PAGO_WEBHOOK_ENDPOINT,
      message: data.message || 'Webhook Mercado Pago ativo e operacional.',
    };
  } catch (error: any) {
    return {
      active: false,
      endpoint: MERCADO_PAGO_WEBHOOK_ENDPOINT,
      message: error?.message || 'Falha ao conectar com o endpoint de webhook.',
    };
  }
}

/**
 * Sends a Mercado Pago webhook notification payload directly to the server endpoint
 */
export async function sendWebhookNotification(
  payload: MercadoPagoWebhookNotification
): Promise<WebhookProcessResult> {
  try {
    const response = await fetch(MERCADO_PAGO_WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok && !data.success) {
      return {
        success: false,
        message: data.error || data.message || 'Erro ao processar notificação de webhook no servidor.',
      };
    }

    return {
      success: true,
      message: data.message || 'Notificação processada com sucesso no endpoint.',
      paymentId: data.paymentId || (typeof payload.id === 'string' ? payload.id : undefined),
      status: data.status,
      externalReference: data.externalReference || payload.external_reference,
      matchedEntity: data.matchedEntity,
    };
  } catch (err: any) {
    console.error('Error dispatching webhook notification:', err);
    return {
      success: false,
      message: err.message || 'Erro de rede ao enviar notificação para o webhook.',
    };
  }
}

/**
 * Simulates an incoming payment notification from Mercado Pago
 */
export async function simulateWebhookNotification(params: {
  receiptId?: string;
  referenceId?: string;
  status?: 'approved' | 'pending' | 'rejected' | string;
  amount?: number;
  payerEmail?: string;
}): Promise<WebhookProcessResult> {
  try {
    const response = await fetch('/api/mercadopago/webhook/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiptId: params.receiptId,
        referenceId: params.referenceId,
        status: params.status || 'approved',
        amount: params.amount,
        payerEmail: params.payerEmail,
      }),
    });

    const data = await response.json();
    return {
      success: data.success ?? true,
      message: data.message || 'Simulação de webhook processada com sucesso.',
      paymentId: data.paymentId,
      status: data.status,
      externalReference: data.referenceId,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Falha ao executar simulação de webhook.',
    };
  }
}

/**
 * Parses URL query parameters for Mercado Pago redirect returns
 */
export function parseMercadoPagoRedirectParams(searchString?: string): MercadoPagoRedirectReturn | null {
  if (typeof window === 'undefined') return null;

  const rawSearch = searchString ?? window.location.search;
  if (!rawSearch || rawSearch.length <= 1) return null;

  const params = new URLSearchParams(rawSearch);

  // Mercado Pago standard redirect parameters
  const collectionId = params.get('collection_id');
  const collectionStatus = params.get('collection_status');
  const paymentId = params.get('payment_id');
  const status = params.get('status');
  const externalReference = params.get('external_reference');
  const paymentType = params.get('payment_type');
  const merchantOrderId = params.get('merchant_order_id');
  const preferenceId = params.get('preference_id');
  const siteId = params.get('site_id');
  const processingMode = params.get('processing_mode');
  const merchantAccountId = params.get('merchant_account_id');
  const mpStatus = params.get('mp_status');
  const ref = params.get('ref');

  // Verify if any Mercado Pago indicator is present
  const hasMpParams = Boolean(
    collectionId || 
    collectionStatus || 
    paymentId || 
    status || 
    externalReference || 
    preferenceId || 
    mpStatus || 
    (ref && (status || mpStatus))
  );

  if (!hasMpParams) return null;

  return {
    collectionId,
    collectionStatus,
    paymentId: paymentId || collectionId,
    status: status || collectionStatus || mpStatus,
    externalReference: externalReference || ref,
    paymentType,
    merchantOrderId,
    preferenceId,
    siteId,
    processingMode,
    merchantAccountId,
    mpStatus,
    ref: ref || externalReference,
  };
}

/**
 * Clears Mercado Pago query parameters from the browser's address bar without reload
 */
export function clearMercadoPagoRedirectParams(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const mpKeys = [
    'collection_id',
    'collection_status',
    'payment_id',
    'status',
    'external_reference',
    'payment_type',
    'merchant_order_id',
    'preference_id',
    'site_id',
    'processing_mode',
    'merchant_account_id',
    'mp_status',
    'ref',
  ];

  let hasAny = false;
  for (const key of mpKeys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      hasAny = true;
    }
  }

  if (hasAny) {
    const cleanUrl = url.pathname + (url.search ? url.search : '') + url.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

export interface ProcessRedirectContext {
  currentProjectId?: string;
  expenses?: Expense[];
  onUpdateExpenses?: (updated: Expense[]) => void;
  serviceRequests?: ServiceRequest[];
  onUpdateServiceRequests?: (updated: ServiceRequest[]) => void;
}

/**
 * Fully processes a Mercado Pago redirect return in the client:
 * 1. Dispatches confirmation notification to server webhook endpoint.
 * 2. Updates matching local expenses (marks as 'Pago').
 * 3. Updates matching service requests (marks as 'Aprovado pelo Solicitante').
 * 4. Cleans up URL parameters.
 */
export async function processMercadoPagoRedirectReturn(
  redirectData: MercadoPagoRedirectReturn,
  context: ProcessRedirectContext = {}
): Promise<WebhookProcessResult> {
  const paymentId = redirectData.paymentId || redirectData.collectionId || `MP-RET-${Date.now()}`;
  const rawStatus = (redirectData.status || redirectData.collectionStatus || redirectData.mpStatus || 'approved').toLowerCase();
  const externalRef = redirectData.externalReference || redirectData.ref || '';

  const isApproved = rawStatus === 'approved' || rawStatus === 'success' || rawStatus === 'accredited';
  const isPending = rawStatus === 'pending' || rawStatus === 'in_process';
  const isRejected = rawStatus === 'rejected' || rawStatus === 'failure' || rawStatus === 'cancelled';

  const internalStatus: 'Aprovado' | 'Pendente' | 'Rejeitado' = isApproved 
    ? 'Aprovado' 
    : (isRejected ? 'Rejeitado' : 'Pendente');

  let updatedExpensesCount = 0;
  let updatedServiceRequestsCount = 0;

  // 1. Notify Backend Webhook to synchronize database, receipts and audit logs
  try {
    await sendWebhookNotification({
      id: paymentId,
      action: 'payment.updated',
      type: 'payment',
      status: isApproved ? 'approved' : rawStatus,
      external_reference: externalRef,
      referenceId: externalRef,
      amount: undefined,
    });
  } catch (notifyErr) {
    console.warn('Notice: Background webhook dispatch completed with local fallback', notifyErr);
  }

  // 2. Synchronize Matching Expenses in current or loaded project
  if (context.currentProjectId && isApproved) {
    const currentExpenses = context.expenses ?? getExpenses(context.currentProjectId);
    let expensesChanged = false;
    const newExpenses = currentExpenses.map(exp => {
      // Match by exact referenceId, invoiceNumber, or partial match
      const isMatch = (
        (externalRef && (exp.id === externalRef || exp.invoiceNumber === externalRef)) ||
        (externalRef && externalRef.includes(exp.id))
      );

      if (isMatch && exp.status !== 'Pago') {
        expensesChanged = true;
        updatedExpensesCount++;
        return {
          ...exp,
          status: 'Pago' as const,
          date: new Date().toISOString().split('T')[0],
          invoiceNumber: exp.invoiceNumber || `MP-${paymentId}`,
          supplier: exp.supplier ? `${exp.supplier} (Mercado Pago)` : 'Mercado Pago (Confirmado)',
        };
      }
      return exp;
    });

    if (expensesChanged) {
      saveExpenses(context.currentProjectId, newExpenses);
      if (context.onUpdateExpenses) {
        context.onUpdateExpenses(newExpenses);
      }
    }
  }

  // 3. Synchronize Matching Service Requests
  const allServiceRequests = context.serviceRequests ?? loadServiceRequests();
  let requestsChanged = false;
  const newRequests = allServiceRequests.map(req => {
    const isMatch = (
      (externalRef && (req.id === externalRef || req.appliedQuote?.id === externalRef)) ||
      (externalRef && externalRef.includes(req.id))
    );

    if (isMatch && isApproved && req.status !== 'Aprovado pelo Solicitante' && req.status !== 'Concluído') {
      requestsChanged = true;
      updatedServiceRequestsCount++;
      return {
        ...req,
        status: 'Aprovado pelo Solicitante' as const,
      };
    }
    return req;
  });

  if (requestsChanged) {
    saveServiceRequests(newRequests);
    if (context.onUpdateServiceRequests) {
      context.onUpdateServiceRequests(newRequests);
    }
  }

  // 4. Trigger celebration if approved
  if (isApproved) {
    try {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch {
      // Ignore if confetti is not available
    }
  }

  // 5. Clean up the URL parameters so they don't persist on page refresh
  clearMercadoPagoRedirectParams();

  return {
    success: true,
    message: isApproved 
      ? `Pagamento ${paymentId} confirmado com sucesso via retorno do Mercado Pago!` 
      : (isPending 
        ? `Pagamento ${paymentId} em processamento no Mercado Pago. Status atualizado.` 
        : `Pagamento ${paymentId} não foi concluído (${rawStatus}).`),
    paymentId,
    status: internalStatus,
    externalReference: externalRef,
    updatedExpensesCount,
    updatedServiceRequestsCount,
  };
}

/**
 * Starts automatic real-time sync with webhook and receipts state
 * Polls every intervalMs for payment status updates on pending records
 */
export function startAutomaticWebhookSync(options: {
  projectId: string;
  getPendingExpenseIds: () => string[];
  onExpenseApproved: (expenseId: string, amount: number) => void;
  intervalMs?: number;
}): () => void {
  const intervalTime = options.intervalMs || 10000;

  const timer = setInterval(async () => {
    const pendingIds = options.getPendingExpenseIds();
    if (!pendingIds || pendingIds.length === 0) return;

    for (const id of pendingIds) {
      try {
        const res = await fetch(`/api/mercadopago/payment-status/${encodeURIComponent(id)}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.found && data.status === 'approved') {
          options.onExpenseApproved(id, data.amount || 0);
        }
      } catch {
        // Silent catch for background poll
      }
    }
  }, intervalTime);

  return () => clearInterval(timer);
}
