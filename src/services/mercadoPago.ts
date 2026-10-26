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

