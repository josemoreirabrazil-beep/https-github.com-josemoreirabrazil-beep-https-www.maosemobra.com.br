// Client service for Mercado Pago API integration

export interface MercadoPagoPreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  mode: 'live' | 'demo';
  notice?: string;
}

export interface MercadoPagoPixResponse {
  paymentId: string | number;
  status: string;
  statusDetail?: string;
  qrCode?: string;
  qrCodeBase64?: string | null;
  pixKey?: string;
  ticketUrl?: string;
  mode: 'live' | 'demo' | 'pix_direct';
  notice?: string;
}

export interface MercadoPagoStatusResponse {
  configured: boolean;
  publicKey: string | null;
  message: string;
}

export async function getMercadoPagoStatus(): Promise<MercadoPagoStatusResponse> {
  try {
    const res = await fetch('/api/mercadopago/status');
    if (!res.ok) throw new Error('Falha ao consultar status');
    return await res.json();
  } catch (e) {
    return {
      configured: false,
      publicKey: null,
      message: 'Modo de testes ativo.'
    };
  }
}

export async function createMercadoPagoPreference(data: {
  title: string;
  amount: number;
  payerName?: string;
  payerEmail?: string;
  referenceId?: string;
  description?: string;
}): Promise<MercadoPagoPreferenceResponse> {
  const response = await fetch('/api/mercadopago/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao gerar preferência do Mercado Pago');
  }

  return response.json();
}

export async function createMercadoPagoPix(data: {
  amount: number;
  description: string;
  payerName?: string;
  payerEmail?: string;
  payerCpf?: string;
  referenceId?: string;
}): Promise<MercadoPagoPixResponse> {
  const response = await fetch('/api/mercadopago/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao gerar cobrança PIX do Mercado Pago');
  }

  return response.json();
}

export async function checkMercadoPagoPayment(paymentId: string | number): Promise<{
  id: string | number;
  status: string;
  statusDetail?: string;
  amount?: number;
}> {
  const response = await fetch(`/api/mercadopago/check-payment/${paymentId}`);
  if (!response.ok) {
    throw new Error('Erro ao consultar status do pagamento');
  }
  return response.json();
}

export async function processMercadoPagoCardPayment(data: {
  transactionAmount: number;
  token?: string;
  description?: string;
  installments?: number;
  paymentMethodId?: string;
  payerEmail?: string;
  payerCpf?: string;
  payerName?: string;
  referenceId?: string;
}): Promise<MercadoPagoPixResponse> {
  const response = await fetch('/api/mercadopago/process-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao processar pagamento com cartão');
  }

  return response.json();
}

export async function batchCreateMercadoPagoPreferences(items: Array<{
  title: string;
  amount: number;
  payerName?: string;
  payerEmail?: string;
  referenceId?: string;
  description?: string;
}>): Promise<{ success: boolean; preferences: Array<any> }> {
  const response = await fetch('/api/mercadopago/batch-preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao gerar lote de preferências no Mercado Pago');
  }

  return response.json();
}

export interface AutoTransferItem {
  id: string;
  transferId: string;
  amount: number;
  pixKey: string;
  beneficiary: string;
  cpf: string;
  destination: string;
  status: string;
  timestamp: string;
  qrCode: string;
  origin: string;
  message: string;
}

export interface AutoTransfersStatusResponse {
  enabled: boolean;
  targetPixKey: string;
  beneficiary: string;
  cpf: string;
  destination: string;
  rule: string;
  totalTransferred: number;
  recentCount: number;
  history: AutoTransferItem[];
}

export async function getAutoTransfersHistory(): Promise<AutoTransfersStatusResponse> {
  const response = await fetch('/api/mercadopago/auto-transfers-history');
  if (!response.ok) {
    throw new Error('Falha ao consultar histórico de transferências automáticas');
  }
  return response.json();
}

export async function triggerAutoSweep(amount?: number, reason?: string): Promise<{
  success: boolean;
  sweepAmount: number;
  transfer: any;
  history: AutoTransferItem[];
  message: string;
}> {
  const response = await fetch('/api/mercadopago/auto-sweep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, reason }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao executar varredura automática de saldo');
  }

  return response.json();
}

export interface ClientProviderReceipt {
  id: string;
  category: 'cliente' | 'prestador';
  partyName: string;
  partyEmail: string;
  partyPhone?: string;
  partyCpfCnpj?: string;
  description: string;
  projectName?: string;
  amount: number;
  method: 'PIX' | 'Cartão de Crédito' | 'Mercado Pago' | 'Boleto';
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Cancelado' | 'Reembolsado';
  referenceId: string;
  mpPaymentId?: string;
  paymentDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  lastWebhookAt?: string;
  notes?: string;
}

export interface RecebimentosResponse {
  success: boolean;
  summary: {
    totalOverallApproved: number;
    totalOverallPending: number;
    clientesApproved: number;
    clientesPending: number;
    prestadoresApproved: number;
    prestadoresPending: number;
    totalCount: number;
    pendingCount: number;
    approvedCount: number;
  };
  receipts: ClientProviderReceipt[];
}

export async function getRecebimentos(params?: {
  category?: 'cliente' | 'prestador';
  status?: string;
  search?: string;
}): Promise<RecebimentosResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);
  if (params?.search) query.append('search', params.search);

  const response = await fetch(`/api/recebimentos?${query.toString()}`);
  if (!response.ok) throw new Error('Erro ao buscar recebimentos');
  return response.json();
}

export async function createRecebimento(data: Partial<ClientProviderReceipt>): Promise<{ success: boolean; receipt: ClientProviderReceipt }> {
  const response = await fetch('/api/recebimentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao criar recebimento');
  }
  return response.json();
}

export async function simulateWebhook(data: {
  receiptId?: string;
  referenceId?: string;
  status?: string;
  amount?: number;
  payerEmail?: string;
}): Promise<any> {
  const response = await fetch('/api/mercadopago/webhook/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao simular webhook');
  }
  return response.json();
}

export async function getWebhookLogs(): Promise<{ success: boolean; logs: any[] }> {
  const response = await fetch('/api/mercadopago/webhook-logs');
  if (!response.ok) throw new Error('Erro ao carregar logs de webhook');
  return response.json();
}

