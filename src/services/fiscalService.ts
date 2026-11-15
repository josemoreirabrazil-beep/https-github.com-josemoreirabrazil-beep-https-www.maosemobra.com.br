import type {
  FiscalApiIntegrationConfig,
  FiscalConfiguration,
  FiscalNfseRecord,
  FiscalNfseSummary,
  FiscalTransmissionLog,
  WebServiceCnaeActivity,
} from '../types';
import { getCachedAdminSession } from './adminAuth';

function buildAuthHeaders(explicitToken?: string, json = false): Record<string, string> {
  const token = explicitToken || getCachedAdminSession()?.token;
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchFiscalConfig(explicitToken?: string): Promise<{
  config: FiscalConfiguration;
  webCatalog: WebServiceCnaeActivity[];
}> {
  const res = await fetch('/api/fiscal/config', {
    headers: buildAuthHeaders(explicitToken),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao carregar configuração fiscal e certificado digital.');
  }
  return {
    config: data.config,
    webCatalog: data.webCatalog || [],
  };
}

export async function saveFiscalConfig(
  updates: Omit<Partial<FiscalConfiguration>, 'apiIntegration'> & {
    apiIntegration?: Partial<FiscalApiIntegrationConfig> & { apiToken?: string };
  },
  explicitToken?: string
): Promise<FiscalConfiguration> {
  const res = await fetch('/api/fiscal/config', {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao salvar configuração fiscal.');
  }
  return data.config;
}

export async function uploadDigitalCertificate(
  payload: {
    fileName?: string;
    base64Content?: string;
    password?: string;
    insertionMode?: 'file' | 'pfx_base64' | 'pem_text';
    certificatePemText?: string;
    privateKeyPemText?: string;
  },
  explicitToken?: string
): Promise<{
  success: boolean;
  message: string;
  certificate: FiscalConfiguration['certificate'];
}> {
  const res = await fetch('/api/fiscal/certificate/upload', {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao validar e instalar o Certificado Digital.');
  }
  return data;
}

export async function fetchFiscalNfseList(explicitToken?: string): Promise<{
  invoices: FiscalNfseRecord[];
  summary: FiscalNfseSummary;
  config: FiscalConfiguration;
  transmissionLogs?: FiscalTransmissionLog[];
}> {
  const res = await fetch('/api/fiscal/nfse', {
    headers: buildAuthHeaders(explicitToken),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao consultar notas fiscais emitidas.');
  }
  return {
    invoices: data.invoices || [],
    summary: data.summary,
    config: data.config,
    transmissionLogs: data.transmissionLogs || [],
  };
}

export async function emitManualNfse(
  payload: {
    tomadorName: string;
    tomadorEmail?: string;
    tomadorDocument?: string;
    tomadorRole?: string;
    grossAmount: number;
    cnaeCode?: string;
    serviceDescription?: string;
    competenceDate?: string;
    paymentId?: string;
    paymentReference?: string;
    transmitImmediately?: boolean;
  },
  explicitToken?: string
): Promise<{
  success: boolean;
  invoice: FiscalNfseRecord;
  summary: FiscalNfseSummary;
}> {
  const res = await fetch('/api/fiscal/nfse/emit', {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao emitir NFS-e.');
  }
  return data;
}

export async function emitPendingApprovedNfseBatch(
  explicitToken?: string
): Promise<{
  success: boolean;
  emittedCount: number;
  invoices: FiscalNfseRecord[];
  summary: FiscalNfseSummary;
}> {
  const res = await fetch('/api/fiscal/nfse/emit-pending-approved', {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao emitir notas fiscais dos pagamentos aprovados.');
  }
  return data;
}

export async function transmitNfseToApi(
  id: string,
  explicitToken?: string
): Promise<{
  success: boolean;
  invoice: FiscalNfseRecord;
  log?: FiscalTransmissionLog;
  message?: string;
}> {
  const res = await fetch(`/api/fiscal/nfse/${encodeURIComponent(id)}/transmit`, {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao transmitir NFS-e para a API da Prefeitura/Emissor.');
  }
  return data;
}

export interface FiscalCredentialChecks {
  cnpjValid: boolean;
  cnpjFormatted: string;
  companyName: string;
  certificateLoaded: boolean;
  mtlsActive: boolean;
  tokenRequired: boolean;
  tokenConfigured: boolean;
  provider: FiscalApiIntegrationConfig['provider'];
  providerLabel: string;
  endpoint: string;
  environment: 'homologacao' | 'producao';
  httpStatus?: number;
}

export async function testFiscalApiConnection(
  explicitToken?: string
): Promise<{
  success: boolean;
  connected: boolean;
  httpStatus?: number;
  message: string;
  credentialChecks?: FiscalCredentialChecks;
  config: FiscalConfiguration;
  log?: FiscalTransmissionLog;
}> {
  const res = await fetch('/api/fiscal/provider/test-connection', {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Falha ao testar conexão com a API fiscal.');
  }
  return data;
}

export async function syncCertificateWithProvider(
  explicitToken?: string
): Promise<{
  success: boolean;
  message: string;
  config: FiscalConfiguration;
  log?: FiscalTransmissionLog;
}> {
  const res = await fetch('/api/fiscal/provider/sync-certificate', {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao sincronizar o certificado digital A1 com o provedor.');
  }
  return data;
}

export async function fetchFiscalTransmissionLogs(
  explicitToken?: string
): Promise<FiscalTransmissionLog[]> {
  const res = await fetch('/api/fiscal/transmissions', {
    headers: buildAuthHeaders(explicitToken),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao carregar logs de transmissão NFS-e.');
  }
  return data.logs || [];
}

export async function cancelFiscalNfse(
  id: string,
  reason: string,
  explicitToken?: string
): Promise<{
  success: boolean;
  invoice: FiscalNfseRecord;
}> {
  const res = await fetch(`/api/fiscal/nfse/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: buildAuthHeaders(explicitToken, true),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao cancelar NFS-e.');
  }
  return data;
}

export function downloadNfseXmlFile(invoice: FiscalNfseRecord): void {
  const blob = new Blob([invoice.xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NFSe-${invoice.nfseNumber}-${invoice.prestadorCnpj}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

