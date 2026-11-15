import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  KeyRound,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Download,
  Printer,
  XCircle,
  Search,
  Building2,
  Globe,
  Zap,
  Save,
  Eye,
  Lock,
  Layers,
  X,
  FileCode2,
  Server,
  Send,
  Plug,
  Activity,
} from 'lucide-react';
import type {
  FiscalApiProviderId,
  FiscalConfiguration,
  FiscalNfseRecord,
  FiscalNfseSummary,
  FiscalTransmissionLog,
  WebServiceCnaeActivity,
} from '../types';
import {
  fetchFiscalNfseList,
  saveFiscalConfig,
  uploadDigitalCertificate,
  emitManualNfse,
  emitPendingApprovedNfseBatch,
  cancelFiscalNfse,
  downloadNfseXmlFile,
  testFiscalApiConnection,
  syncCertificateWithProvider,
  transmitNfseToApi,
} from '../services/fiscalService';

interface FiscalNfseManagerProps {
  adminToken?: string;
  onDataChanged?: () => void;
}

const PROVIDER_OPTIONS: Array<{
  id: FiscalApiProviderId;
  label: string;
  shortDesc: string;
  defaultProdUrl: string;
  defaultHomologUrl: string;
  requiresToken: boolean;
  supportsMtls: boolean;
}> = [
  {
    id: 'prefeitura_abrasf_soap',
    label: 'Prefeitura Municipal (ABRASF v2.04 SOAP + mTLS)',
    shortDesc: 'Conexão direta ao WebService SOAP da Prefeitura usando o certificado A1 armazenado.',
    defaultProdUrl: 'https://nfse.ilheus.ba.gov.br/ws/nfse.asmx',
    defaultHomologUrl: 'https://homologacao-nfse.ilheus.ba.gov.br/ws/nfse.asmx',
    requiresToken: false,
    supportsMtls: true,
  },
  {
    id: 'portal_nacional_nfse',
    label: 'Portal Nacional NFS-e (SEFIN / ADN mTLS)',
    shortDesc: 'Padrão Nacional DPS XML via HTTPS mTLS direto na Receita/SEFIN.',
    defaultProdUrl: 'https://sefin.nfse.gov.br/SefinNacional/nfse',
    defaultHomologUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse',
    requiresToken: false,
    supportsMtls: true,
  },
  {
    id: 'focus_nfe',
    label: 'Focus NFe REST API (v2)',
    shortDesc: 'Gateway REST nacional com sincronização do .PFX e emissão automática em qualquer município.',
    defaultProdUrl: 'https://api.focusnfe.com.br',
    defaultHomologUrl: 'https://homologacao.focusnfe.com.br',
    requiresToken: true,
    supportsMtls: false,
  },
  {
    id: 'nfe_io',
    label: 'NFe.io REST API (v1)',
    shortDesc: 'Emissor cloud REST v1 com suporte a CNAEs de Serviços Web e sincronização de certificado.',
    defaultProdUrl: 'https://api.nfe.io',
    defaultHomologUrl: 'https://api.nfe.io',
    requiresToken: true,
    supportsMtls: false,
  },
  {
    id: 'plugnotas',
    label: 'PlugNotas / TecnoSpeed REST API',
    shortDesc: 'API PlugNotas para transmissão municipal e consulta automática de NFS-e.',
    defaultProdUrl: 'https://api.plugnotas.com.br',
    defaultHomologUrl: 'https://api.sandbox.plugnotas.com.br',
    requiresToken: true,
    supportsMtls: false,
  },
  {
    id: 'webhook_custom',
    label: 'API Prefeitura / ERP Customizada (REST JSON)',
    shortDesc: 'Integra qualquer endpoint REST municipal, middleware ou gateway com mTLS e chave custom.',
    defaultProdUrl: '',
    defaultHomologUrl: '',
    requiresToken: false,
    supportsMtls: true,
  },
];

const formatBRL = (value: number) =>
  `R$ ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateBR = (isoOrDate?: string) => {
  if (!isoOrDate) return '—';
  const parsed = new Date(isoOrDate.length === 10 ? `${isoOrDate}T12:00:00` : isoOrDate);
  if (Number.isNaN(parsed.getTime())) return isoOrDate;
  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTimeBR = (iso?: string) => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const FiscalNfseManager: React.FC<FiscalNfseManagerProps> = ({
  adminToken,
  onDataChanged,
}) => {
  const [config, setConfig] = useState<FiscalConfiguration | null>(null);
  const [invoices, setInvoices] = useState<FiscalNfseRecord[]>([]);
  const [transmissionLogs, setTransmissionLogs] = useState<FiscalTransmissionLog[]>([]);
  const [summary, setSummary] = useState<FiscalNfseSummary>({
    totalAuthorizedCount: 0,
    totalCancelledCount: 0,
    totalAuthorizedAmount: 0,
    totalIssAmount: 0,
    autoIssuedCount: 0,
    approvedPaymentsPendingNfse: 0,
    transmittedAuthorizedCount: 0,
    pendingTransmissionCount: 0,
    rejectedTransmissionCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingApi, setIsSavingApi] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isSyncingCert, setIsSyncingCert] = useState(false);
  const [transmittingId, setTransmittingId] = useState<string | null>(null);
  const [isTogglingAuto, setIsTogglingAuto] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [isBatchEmitting, setIsBatchEmitting] = useState(false);
  const [isEmittingManual, setIsEmittingManual] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editable Fiscal Form State
  const [environment, setEnvironment] = useState<'homologacao' | 'producao'>('producao');
  const [regimeTributario, setRegimeTributario] = useState<FiscalConfiguration['regimeTributario']>('Simples Nacional');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [municipioNome, setMunicipioNome] = useState('');
  const [municipioIbge, setMunicipioIbge] = useState('');
  const [uf, setUf] = useState('BA');
  const [rpsSeries, setRpsSeries] = useState('WEB');
  const [defaultAliquotaIss, setDefaultAliquotaIss] = useState('2.0');
  const [serviceDescriptionTemplate, setServiceDescriptionTemplate] = useState('');
  const [emailNotificationToClient, setEmailNotificationToClient] = useState(true);
  const [webActivities, setWebActivities] = useState<WebServiceCnaeActivity[]>([]);

  // Prefeitura / API Gateway Integration Form State
  const [apiProvider, setApiProvider] = useState<FiscalApiProviderId>('prefeitura_abrasf_soap');
  const [autoTransmitToProvider, setAutoTransmitToProvider] = useState(false);
  const [productionEndpoint, setProductionEndpoint] = useState('');
  const [homologacaoEndpoint, setHomologacaoEndpoint] = useState('');
  const [soapAction, setSoapAction] = useState('http://nfse.abrasf.org.br/GerarNfse');
  const [useStoredCertificateMtls, setUseStoredCertificateMtls] = useState(true);
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [apiCompanyId, setApiCompanyId] = useState('68603032000115');
  const [customHeaderName, setCustomHeaderName] = useState('Authorization');

  // Certificate Upload Form
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');

  // Filters for History
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Autorizada' | 'Cancelada'>('ALL');

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTomadorName, setManualTomadorName] = useState('');
  const [manualTomadorEmail, setManualTomadorEmail] = useState('');
  const [manualTomadorDocument, setManualTomadorDocument] = useState('');
  const [manualTomadorRole, setManualTomadorRole] = useState('Prestador de Serviço');
  const [manualAmount, setManualAmount] = useState('29.90');
  const [manualCnaeCode, setManualCnaeCode] = useState('6319-4/00');
  const [manualCompetenceDate, setManualCompetenceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [manualDescription, setManualDescription] = useState('');

  const [previewInvoice, setPreviewInvoice] = useState<FiscalNfseRecord | null>(null);
  const [cancelTargetInvoice, setCancelTargetInvoice] = useState<FiscalNfseRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelamento administrativo a pedido do emissor');

  const syncFormFromConfig = (cfg: FiscalConfiguration) => {
    setConfig(cfg);
    setEnvironment(cfg.environment);
    setRegimeTributario(cfg.regimeTributario);
    setInscricaoMunicipal(cfg.inscricaoMunicipal);
    setMunicipioNome(cfg.municipioNome);
    setMunicipioIbge(cfg.municipioIbge);
    setUf(cfg.uf);
    setRpsSeries(cfg.rpsSeries);
    setDefaultAliquotaIss(String(cfg.defaultAliquotaIss));
    setServiceDescriptionTemplate(cfg.serviceDescriptionTemplate);
    setEmailNotificationToClient(cfg.emailNotificationToClient);
    setWebActivities(cfg.webActivities || []);
    setManualCnaeCode(cfg.defaultWebActivityCode || cfg.webActivities?.[0]?.code || '6319-4/00');

    if (cfg.apiIntegration) {
      setApiProvider(cfg.apiIntegration.provider);
      setAutoTransmitToProvider(cfg.apiIntegration.autoTransmitToProvider);
      setProductionEndpoint(cfg.apiIntegration.productionEndpoint || '');
      setHomologacaoEndpoint(cfg.apiIntegration.homologacaoEndpoint || '');
      setSoapAction(cfg.apiIntegration.soapAction || 'http://nfse.abrasf.org.br/GerarNfse');
      setUseStoredCertificateMtls(cfg.apiIntegration.useStoredCertificateMtls);
      setApiCompanyId(cfg.apiIntegration.apiCompanyId || '68603032000115');
      setCustomHeaderName(cfg.apiIntegration.customHeaderName || 'Authorization');
      setApiTokenInput(cfg.apiIntegration.apiTokenMasked || '');
    }
  };

  const loadFiscalData = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const data = await fetchFiscalNfseList(adminToken);
      setInvoices(data.invoices);
      setSummary(data.summary);
      setTransmissionLogs(data.transmissionLogs || []);
      if (data.config) {
        syncFormFromConfig(data.config);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Não foi possível carregar os dados fiscais e o certificado digital.',
      });
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiscalData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const selectedProviderMeta = useMemo(
    () => PROVIDER_OPTIONS.find((p) => p.id === apiProvider) || PROVIDER_OPTIONS[0],
    [apiProvider]
  );

  const handleSelectProvider = (nextProvider: FiscalApiProviderId) => {
    setApiProvider(nextProvider);
    const meta = PROVIDER_OPTIONS.find((p) => p.id === nextProvider);
    if (meta) {
      if (meta.defaultProdUrl) setProductionEndpoint(meta.defaultProdUrl);
      if (meta.defaultHomologUrl) setHomologacaoEndpoint(meta.defaultHomologUrl);
      setUseStoredCertificateMtls(meta.supportsMtls);
    }
  };

  const handleSaveApiIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingApi) return;
    setIsSavingApi(true);
    setFeedback(null);
    try {
      const updated = await saveFiscalConfig(
        {
          apiIntegration: {
            provider: apiProvider,
            autoTransmitToProvider,
            productionEndpoint,
            homologacaoEndpoint,
            soapAction,
            useStoredCertificateMtls,
            apiCompanyId,
            customHeaderName,
            apiToken: apiTokenInput && !apiTokenInput.includes('••••') ? apiTokenInput : undefined,
          },
        },
        adminToken
      );
      syncFormFromConfig(updated);
      setFeedback({
        type: 'success',
        message: `Integração ${updated.apiIntegration?.providerLabel} salva e vinculada ao cofre criptográfico do CNPJ 68.603.032/0001-15.`,
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar integração API.' });
    } finally {
      setIsSavingApi(false);
    }
  };

  const handleTestApiConnection = async () => {
    if (isTestingApi) return;
    setIsTestingApi(true);
    setFeedback(null);
    try {
      // Save current API fields first so test checks what user sees on screen
      await saveFiscalConfig(
        {
          apiIntegration: {
            provider: apiProvider,
            autoTransmitToProvider,
            productionEndpoint,
            homologacaoEndpoint,
            soapAction,
            useStoredCertificateMtls,
            apiCompanyId,
            customHeaderName,
            apiToken: apiTokenInput && !apiTokenInput.includes('••••') ? apiTokenInput : undefined,
          },
        },
        adminToken
      );

      const res = await testFiscalApiConnection(adminToken);
      if (res.config) syncFormFromConfig(res.config);
      await loadFiscalData(false);
      setFeedback({
        type: res.connected ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Falha ao executar teste de conexão HTTPS/mTLS.',
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSyncCertificate = async () => {
    if (isSyncingCert) return;
    setIsSyncingCert(true);
    setFeedback(null);
    try {
      const res = await syncCertificateWithProvider(adminToken);
      if (res.config) syncFormFromConfig(res.config);
      await loadFiscalData(false);
      setFeedback({
        type: 'success',
        message: res.message,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao sincronizar Certificado Digital A1 com o provedor.',
      });
    } finally {
      setIsSyncingCert(false);
    }
  };

  const handleTransmitInvoice = async (invoice: FiscalNfseRecord) => {
    if (transmittingId) return;
    setTransmittingId(invoice.id);
    setFeedback(null);
    try {
      const res = await transmitNfseToApi(invoice.id, adminToken);
      await loadFiscalData(false);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message:
          res.message ||
          (res.success
            ? `NFS-e #${invoice.nfseNumber} transmitida com sucesso para a Prefeitura/API.`
            : `Falha ao transmitir NFS-e #${invoice.nfseNumber}. Verifique o log de transmissão.`),
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao transmitir NFS-e para o servidor fiscal.',
      });
    } finally {
      setTransmittingId(null);
    }
  };

  const handleToggleAutoEmit = async () => {
    if (!config || isTogglingAuto) return;
    setIsTogglingAuto(true);
    setFeedback(null);
    try {
      const nextValue = !config.autoEmitOnPayment;
      const updated = await saveFiscalConfig({ autoEmitOnPayment: nextValue }, adminToken);
      syncFormFromConfig(updated);
      setFeedback({
        type: 'success',
        message: nextValue
          ? 'Emissão automática de NFS-e ativada para todos os pagamentos aprovados (PIX, Cartão e Mercado Pago).'
          : 'Emissão automática de NFS-e pausada. Notas poderão ser emitidas manualmente ou em lote.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao alterar emissão automática.' });
    } finally {
      setIsTogglingAuto(false);
    }
  };

  const handleToggleActivity = (code: string) => {
    setWebActivities((prev) => {
      const target = prev.find((a) => a.code === code);
      if (!target) return prev;
      const enabledCount = prev.filter((a) => a.enabled).length;
      if (target.enabled && enabledCount <= 1) {
        setFeedback({
          type: 'error',
          message: 'Pelo menos uma atividade CNAE de Serviços Web deve permanecer habilitada.',
        });
        return prev;
      }
      const next = prev.map((a) =>
        a.code === code ? { ...a, enabled: !a.enabled, isPrimary: !a.enabled ? a.isPrimary : false } : a
      );
      if (!next.some((a) => a.isPrimary && a.enabled)) {
        const firstEnabled = next.find((a) => a.enabled);
        if (firstEnabled) firstEnabled.isPrimary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryActivity = (code: string) => {
    setWebActivities((prev) =>
      prev.map((a) => ({
        ...a,
        enabled: a.code === code ? true : a.enabled,
        isPrimary: a.code === code,
      }))
    );
  };

  const handleSaveFiscalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingConfig) return;
    setIsSavingConfig(true);
    setFeedback(null);
    try {
      const primaryActivity =
        webActivities.find((a) => a.isPrimary && a.enabled) || webActivities.find((a) => a.enabled);
      const updated = await saveFiscalConfig(
        {
          environment,
          regimeTributario,
          inscricaoMunicipal,
          municipioNome,
          municipioIbge,
          uf,
          rpsSeries,
          defaultAliquotaIss: Number(defaultAliquotaIss) || 2.0,
          serviceDescriptionTemplate,
          emailNotificationToClient,
          defaultWebActivityCode: primaryActivity?.code,
          webActivities,
        },
        adminToken
      );
      syncFormFromConfig(updated);
      setFeedback({
        type: 'success',
        message: 'Configuração tributária e catálogo de atividades Web da MOREIRA BRASIL SERVIÇOS salvos no cofre criptografado.',
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar configuração fiscal.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile) {
      setFeedback({
        type: 'error',
        message: 'Selecione o arquivo do Certificado Digital A1 (.pfx, .p12 ou .pem) da MOREIRA BRASIL SERVIÇOS.',
      });
      return;
    }

    setIsUploadingCert(true);
    setFeedback(null);
    try {
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler arquivo selecionado.'));
        reader.readAsDataURL(certFile);
      });

      const res = await uploadDigitalCertificate(
        {
          fileName: certFile.name,
          base64Content,
          password: certPassword,
        },
        adminToken
      );

      setCertFile(null);
      setCertPassword('');
      await loadFiscalData(false);
      setFeedback({
        type: 'success',
        message: res.message || 'Certificado Digital validado e armazenado no cofre criptografado.',
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao validar o arquivo do Certificado Digital.',
      });
    } finally {
      setIsUploadingCert(false);
    }
  };

  const handleEmitPendingBatch = async () => {
    if (isBatchEmitting) return;
    setIsBatchEmitting(true);
    setFeedback(null);
    try {
      const res = await emitPendingApprovedNfseBatch(adminToken);
      await loadFiscalData(false);
      setFeedback({
        type: 'success',
        message:
          res.emittedCount > 0
            ? `${res.emittedCount} NFS-e(s) emitida(s) em lote para pagamentos aprovados.`
            : 'Todos os pagamentos aprovados já possuem NFS-e emitida.',
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro na emissão em lote.' });
    } finally {
      setIsBatchEmitting(false);
    }
  };

  const handleManualEmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmittingManual) return;
    const numericAmount = Number(String(manualAmount).replace(',', '.'));
    if (!manualTomadorName.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFeedback({
        type: 'error',
        message: 'Informe o nome do tomador e um valor válido maior que R$ 0,00.',
      });
      return;
    }

    setIsEmittingManual(true);
    setFeedback(null);
    try {
      const res = await emitManualNfse(
        {
          tomadorName: manualTomadorName.trim(),
          tomadorEmail: manualTomadorEmail.trim() || undefined,
          tomadorDocument: manualTomadorDocument.trim() || undefined,
          tomadorRole: manualTomadorRole,
          grossAmount: numericAmount,
          cnaeCode: manualCnaeCode,
          competenceDate: manualCompetenceDate,
          serviceDescription: manualDescription.trim() || undefined,
          transmitImmediately: autoTransmitToProvider,
        },
        adminToken
      );
      setIsManualModalOpen(false);
      setManualTomadorName('');
      setManualTomadorEmail('');
      setManualTomadorDocument('');
      setManualDescription('');
      await loadFiscalData(false);
      setFeedback({
        type: 'success',
        message:
          res.invoice.transmission?.transmissionStatus === 'Autorizada na API'
            ? `NFS-e #${res.invoice.nfseNumber} emitida e autorizada na API para ${res.invoice.tomadorName}!`
            : `NFS-e #${res.invoice.nfseNumber} emitida e assinada para ${res.invoice.tomadorName}.`,
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao emitir NFS-e manual.' });
    } finally {
      setIsEmittingManual(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetInvoice || isCancelling) return;
    setIsCancelling(true);
    setFeedback(null);
    try {
      const res = await cancelFiscalNfse(cancelTargetInvoice.id, cancelReason, adminToken);
      setCancelTargetInvoice(null);
      await loadFiscalData(false);
      setFeedback({
        type: 'success',
        message: `NFS-e #${res.invoice.nfseNumber} cancelada com registro na auditoria fiscal.`,
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao cancelar NFS-e.' });
    } finally {
      setIsCancelling(false);
    }
  };

  const enabledWebActivities = useMemo(
    () => webActivities.filter((a) => a.enabled),
    [webActivities]
  );

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.nfseNumber.toLowerCase().includes(q) ||
        inv.tomadorName.toLowerCase().includes(q) ||
        (inv.tomadorEmail || '').toLowerCase().includes(q) ||
        inv.cnaeCode.toLowerCase().includes(q) ||
        inv.verificationCode.toLowerCase().includes(q) ||
        (inv.paymentReference || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, searchQuery, statusFilter]);

  if (isLoading && !config) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
        <span>Carregando módulo fiscal NFS-e, Certificado Digital e API da Prefeitura...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-start justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Emitter & Automation Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              {config?.companyName || 'MOREIRA BRASIL SERVIÇOS'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono tabular-nums font-bold">
              CNPJ {config?.cnpjFormatted || '68.603.032/0001-15'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold">
              <Globe className="w-3.5 h-3.5" />
              Exclusivo Serviços Web
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              Cofre A1 AES-256-GCM
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Geração e transmissão automatizada de NFS-e (ABRASF v2.04 SOAP mTLS, Portal Nacional SEFIN e Gateways Focus NFe / NFe.io / PlugNotas) usando o Certificado Digital armazenado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleAutoEmit}
            disabled={isTogglingAuto}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              config?.autoEmitOnPayment
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {config?.autoEmitOnPayment
                ? 'Emissão Automática: ATIVA'
                : 'Emissão Automática: PAUSADA'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleEmitPendingBatch}
            disabled={isBatchEmitting}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBatchEmitting ? 'animate-spin' : ''}`} />
            <span>Emitir Pendentes ({summary.approvedPaymentsPendingNfse})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Emitir NFS-e Manual</span>
          </button>

          <button
            type="button"
            onClick={() => loadFiscalData(false)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Atualizar lista de NFS-e e transmissões"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Notas Emitidas / API</span>
            <FileCheck2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {summary.totalAuthorizedCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {summary.transmittedAuthorizedCount || 0} autorizadas na API · {summary.autoIssuedCount} automáticas
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Volume Faturado NFS-e</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatBRL(summary.totalAuthorizedAmount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Serviços Web faturados
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>ISS Apurado ({config?.defaultAliquotaIss?.toFixed(2) || '2.00'}%)</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatBRL(summary.totalIssAmount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {config?.regimeTributario || 'Simples Nacional'} · {config?.municipioNome}/{config?.uf}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Status Transmissão API</span>
            <Server className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-sm font-black text-slate-900 dark:text-white truncate">
            {config?.apiIntegration?.lastConnectionStatus || 'Não Testado'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {summary.pendingTransmissionCount || 0} aguardando envio · {summary.rejectedTransmissionCount || 0} rejeitadas
          </div>
        </div>
      </div>

      {/* Integração API da Prefeitura / Emissores NFS-e */}
      <form
        onSubmit={handleSaveApiIntegration}
        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plug className="w-4 h-4 text-sky-500" />
              Integração API da Prefeitura & Serviços de Emissão de NFS-e
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transmissão automatizada via mTLS com o Certificado Digital A1 armazenado ou via Gateway REST para os Serviços Web da MOREIRA BRASIL SERVIÇOS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestApiConnection}
              disabled={isTestingApi}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-sky-500 ${isTestingApi ? 'animate-spin' : ''}`} />
              <span>{isTestingApi ? 'Testando TLS...' : 'Testar Conexão & mTLS'}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncCertificate}
              disabled={isSyncingCert}
              className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className={`w-3.5 h-3.5 ${isSyncingCert ? 'animate-spin' : ''}`} />
              <span>{isSyncingCert ? 'Sincronizando...' : 'Sincronizar Certificado A1'}</span>
            </button>

            <button
              type="submit"
              disabled={isSavingApi}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingApi ? 'Salvando...' : 'Salvar Integração API'}</span>
            </button>
          </div>
        </div>

        {/* Provider Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {PROVIDER_OPTIONS.map((opt) => {
            const active = apiProvider === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectProvider(opt.id)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  active
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/30'
                    : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {opt.label}
                  </span>
                  {opt.supportsMtls && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 shrink-0">
                      mTLS A1
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {opt.shortDesc}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="lg:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Endpoint de Produção (URL Prefeitura ou Gateway)
            </label>
            <input
              type="url"
              value={productionEndpoint}
              onChange={(e) => setProductionEndpoint(e.target.value)}
              placeholder="https://nfse.sua-prefeitura.ba.gov.br/ws/nfse.asmx"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Endpoint de Homologação (Testes)
            </label>
            <input
              type="url"
              value={homologacaoEndpoint}
              onChange={(e) => setHomologacaoEndpoint(e.target.value)}
              placeholder="https://homologacao-nfse.sua-prefeitura.ba.gov.br/ws/nfse.asmx"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
            />
          </div>

          {apiProvider === 'prefeitura_abrasf_soap' && (
            <div className="lg:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                SOAPAction (ABRASF v2.04)
              </label>
              <input
                type="text"
                value={soapAction}
                onChange={(e) => setSoapAction(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
              />
            </div>
          )}

          {(selectedProviderMeta.requiresToken || apiProvider === 'webhook_custom') && (
            <div className="lg:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                API Token / Chave Secreta ({selectedProviderMeta.label.split(' ')[0]})
              </label>
              <input
                type="password"
                value={apiTokenInput}
                onChange={(e) => setApiTokenInput(e.target.value)}
                placeholder={
                  config?.apiIntegration?.hasApiToken
                    ? 'Token salvo no cofre criptografado (digite novo para substituir)'
                    : 'Cole aqui seu Token / API Key de produção ou homologação'
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
              />
            </div>
          )}

          {apiProvider === 'nfe_io' && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company ID (NFe.io)
              </label>
              <input
                type="text"
                value={apiCompanyId}
                onChange={(e) => setApiCompanyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
              />
            </div>
          )}

          {apiProvider === 'webhook_custom' && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cabeçalho HTTP Auth
              </label>
              <input
                type="text"
                value={customHeaderName}
                onChange={(e) => setCustomHeaderName(e.target.value)}
                placeholder="Authorization"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={autoTransmitToProvider}
                onChange={(e) => setAutoTransmitToProvider(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span>Transmitir automaticamente para a API da Prefeitura ao aprovar pagamento</span>
            </label>

            <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={useStoredCertificateMtls}
                onChange={(e) => setUseStoredCertificateMtls(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span>Autenticar requisições HTTPS via mTLS com o Certificado A1 armazenado</span>
            </label>
          </div>

          {config?.apiIntegration?.lastConnectionTestAt && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Último teste: {formatDateTimeBR(config.apiIntegration.lastConnectionTestAt)} ·{' '}
              <span
                className={
                  config.apiIntegration.lastConnectionStatus === 'Conectado'
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-rose-600 dark:text-rose-400 font-bold'
                }
              >
                {config.apiIntegration.lastConnectionStatus}
              </span>
            </div>
          )}
        </div>
      </form>

      {/* Digital Certificate + Tax & Web CNAE Configuration */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Digital Certificate ICP-Brasil A1 */}
        <div className="xl:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  Certificado Digital ICP-Brasil A1 (Armazenado)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Assinatura XML RSA-SHA256 e autenticação mTLS persistida em cofre AES-256-GCM
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  config?.certificate?.status === 'Expirado'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {config?.certificate?.status || 'Ativo (Perfil A1 Vinculado)'}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Razão Social</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">
                  {config?.certificate?.companyName || 'MOREIRA BRASIL SERVIÇOS'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">CNPJ Titular</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {config?.certificate?.cnpjFormatted || '68.603.032/0001-15'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Tipo</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {config?.certificate?.certificateType}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Emissor (AC)</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-right truncate max-w-[230px]" title={config?.certificate?.issuerName}>
                  {config?.certificate?.issuerName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Nº de Série</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[220px]" title={config?.certificate?.serialNumber}>
                  {config?.certificate?.serialNumber}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Thumbprint SHA-256</span>
                <span className="font-mono tabular-nums text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[220px]" title={config?.certificate?.thumbprintSha256}>
                  {config?.certificate?.thumbprintSha256}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Validade</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateBR(config?.certificate?.validFrom)} — {formatDateBR(config?.certificate?.validTo)}
                </span>
              </div>
              {config?.certificate?.fileName && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Arquivo armazenado</span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[220px]">
                    {config.certificate.fileName}
                  </span>
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={handleUploadCertificate}
            className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                Instalar ou Atualizar Arquivo A1 (.PFX / .P12 / .PEM)
              </span>
            </div>

            <div className="space-y-2.5">
              <label className="block">
                <span className="sr-only">Selecionar arquivo .pfx ou .p12</span>
                <input
                  type="file"
                  accept=".pfx,.p12,.pem,.crt"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 dark:file:border-slate-700 file:text-xs file:font-bold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
                />
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Senha do certificado .PFX / .P12"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isUploadingCert || !certFile}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingCert ? 'Validando...' : 'Validar e Armazenar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Armazenado com criptografia AES-256-GCM para assinatura XML RSA-SHA256 e autenticação mTLS automática com a Prefeitura.
              </p>
            </div>
          </form>
        </div>

        {/* Configuração Tributária & Atividades Web Exclusivas */}
        <form
          onSubmit={handleSaveFiscalConfig}
          className="xl:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" />
                Parâmetros Fiscais & Atividades Exclusivas de Serviços Web
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Somente CNAEs e códigos LC 116/03 de Serviços Web (62xx/63xx) estão liberados para emissão neste CNPJ.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingConfig ? 'Salvando...' : 'Salvar Configuração Fiscal'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ambiente NFS-e
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as 'homologacao' | 'producao')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="producao">Produção (Validade Fiscal)</option>
                <option value="homologacao">Homologação (Testes)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Regime Tributário
              </label>
              <select
                value={regimeTributario}
                onChange={(e) =>
                  setRegimeTributario(e.target.value as FiscalConfiguration['regimeTributario'])
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="MEI">MEI</option>
                <option value="Lucro Presumido">Lucro Presumido</option>
                <option value="Lucro Real">Lucro Real</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Inscrição Municipal (IM)
              </label>
              <input
                type="text"
                value={inscricaoMunicipal}
                onChange={(e) => setInscricaoMunicipal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Município / UF
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={municipioNome}
                  onChange={(e) => setMunicipioNome(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="Município"
                />
                <input
                  type="text"
                  value={uf}
                  maxLength={2}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  className="w-14 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Código IBGE · Série RPS
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={municipioIbge}
                  onChange={(e) => setMunicipioIbge(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums"
                  placeholder="IBGE"
                />
                <input
                  type="text"
                  value={rpsSeries}
                  maxLength={5}
                  onChange={(e) => setRpsSeries(e.target.value.toUpperCase())}
                  className="w-20 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-mono"
                  placeholder="Série"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alíquota Padrão ISS (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={defaultAliquotaIss}
                onChange={(e) => setDefaultAliquotaIss(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="text-xs space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Modelo Padrão de Discriminação dos Serviços Web
            </label>
            <textarea
              rows={2}
              value={serviceDescriptionTemplate}
              onChange={(e) => setServiceDescriptionTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
            />
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotificationToClient}
                onChange={(e) => setEmailNotificationToClient(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span>Notificar tomador automaticamente quando a NFS-e for autorizada</span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Atividades Permitidas (Exclusivo Serviços Web — CNAEs 62xx/63xx)
              </h4>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Atividades de construção/obra bloqueadas neste CNPJ
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {webActivities.map((act) => (
                <div
                  key={act.code}
                  className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                    act.enabled
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/70 dark:bg-slate-950/50 opacity-75'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={act.enabled}
                      onChange={() => handleToggleActivity(act.code)}
                      className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {act.code}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                          LC 116: {act.lc116Code}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                          ISS {act.issRate.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {act.description}
                      </p>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleSetPrimaryActivity(act.code)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 ${
                      act.isPrimary
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {act.isPrimary ? 'Principal (Automática)' : 'Definir Principal'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Histórico de NFS-e Emitidas */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-amber-500" />
              Notas Fiscais de Serviço Eletrônicas (NFS-e) Emitidas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              XML padrão ABRASF v2.04 assinado, transmissão API Prefeitura/Gateway e DANFSe pronta para download.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nº NFS-e, tomador, CNAE..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white w-60"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              {(['ALL', 'Autorizada', 'Cancelada'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === status
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {status === 'ALL' ? 'Todas' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3.5">NFS-e / RPS</th>
                <th className="py-3 px-3.5">Tomador</th>
                <th className="py-3 px-3.5">Atividade Web</th>
                <th className="py-3 px-3.5">Transmissão Prefeitura / API</th>
                <th className="py-3 px-3.5 text-right">Valor Bruto & ISS</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma NFS-e encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const txStatus =
                    inv.transmission?.transmissionStatus ||
                    'Assinada Localmente (Aguardando Conexão API)';
                  const isTransmittingThis = transmittingId === inv.id;
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          #{inv.nfseNumber}
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                          RPS {inv.rpsNumber}/{inv.rpsSeries} · Cód. {inv.verificationCode}
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-slate-400">
                          {formatDateTimeBR(inv.issuedAt)}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {inv.tomadorName}
                        </div>
                        {inv.tomadorEmail && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {inv.tomadorEmail}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">{inv.triggerSource}</div>
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[210px]">
                        <div className="font-mono tabular-nums font-bold text-sky-700 dark:text-sky-400">
                          CNAE {inv.cnaeCode} · LC {inv.lc116Code}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {inv.cnaeDescription}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top max-w-[230px]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            txStatus === 'Autorizada na API'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : txStatus === 'Rejeitada pela API'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : txStatus === 'Transmitida (Aguardando Retorno)'
                              ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {txStatus}
                        </span>
                        {inv.transmission?.protocolNumber && (
                          <div className="font-mono tabular-nums text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                            Prot: {inv.transmission.protocolNumber}
                          </div>
                        )}
                        {inv.transmission?.responseMessage && (
                          <div
                            className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2"
                            title={inv.transmission.responseMessage}
                          >
                            {inv.transmission.responseMessage}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 align-top text-right">
                        <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {formatBRL(inv.grossAmount)}
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                          ISS ({inv.aliquotaIss.toFixed(2)}%): {formatBRL(inv.issAmount)}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            inv.status === 'Autorizada'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-top text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {inv.status === 'Autorizada' && txStatus !== 'Autorizada na API' && (
                            <button
                              type="button"
                              onClick={() => handleTransmitInvoice(inv)}
                              disabled={Boolean(transmittingId)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Transmitir via API da Prefeitura / Provedor usando Certificado armazenado"
                            >
                              <Send className={`w-3 h-3 ${isTransmittingThis ? 'animate-pulse' : ''}`} />
                              <span>{isTransmittingThis ? 'Enviando...' : 'Transmitir API'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Visualizar DANFSe"
                          >
                            <Eye className="w-3 h-3" />
                            <span>DANFSe</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadNfseXmlFile(inv)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Baixar XML Assinado ABRASF v2.04"
                          >
                            <Download className="w-3 h-3" />
                            <span>XML</span>
                          </button>

                          {inv.status === 'Autorizada' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelTargetInvoice(inv);
                                setCancelReason('Cancelamento administrativo a pedido do emissor');
                              }}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Cancelar NFS-e"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log de Transmissões API & Prefeitura */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-500" />
              Log de Transmissões API & Prefeitura (mTLS / REST)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registro real das chamadas HTTPS/SOAP executadas pelo servidor utilizando o Certificado Digital A1 armazenado.
            </p>
          </div>
          <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
            {transmissionLogs.length} evento(s)
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Ação / NFS-e</th>
                <th className="py-2.5 px-3">Provedor & Endpoint</th>
                <th className="py-2.5 px-3">mTLS A1</th>
                <th className="py-2.5 px-3">Retorno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transmissionLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma transmissão externa registrada ainda. Configure o provedor acima e clique em Testar Conexão ou Transmitir API.
                  </td>
                </tr>
              ) : (
                transmissionLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDateTimeBR(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                      {log.nfseNumber && (
                        <div className="font-mono tabular-nums text-[11px] text-slate-500">
                          NFS-e #{log.nfseNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {log.providerLabel}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate" title={log.endpoint}>
                        {log.endpoint}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {log.usedMtlsCertificate ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sim (mTLS)</span>
                      ) : (
                        <span className="text-slate-500">Token / Local</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                            log.success
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {log.httpStatus ? `HTTP ${log.httpStatus}` : log.success ? 'OK' : 'ERRO'}
                        </span>
                        {log.protocolNumber && (
                          <span className="font-mono text-[10px] text-slate-500">
                            {log.protocolNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {log.message}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Emissão Manual de NFS-e */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Emitir NFS-e Manual (Serviços Web)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prestador: {config?.companyName} · CNPJ {config?.cnpjFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualEmitSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome / Razão Social do Tomador *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualTomadorName}
                    onChange={(e) => setManualTomadorName(e.target.value)}
                    placeholder="Ex: Construtora Atlântico Ltda"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail do Tomador
                  </label>
                  <input
                    type="email"
                    value={manualTomadorEmail}
                    onChange={(e) => setManualTomadorEmail(e.target.value)}
                    placeholder="financeiro@cliente.com.br"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CPF / CNPJ do Tomador
                  </label>
                  <input
                    type="text"
                    value={manualTomadorDocument}
                    onChange={(e) => setManualTomadorDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor do Serviço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Competência
                  </label>
                  <input
                    type="date"
                    value={manualCompetenceDate}
                    onChange={(e) => setManualCompetenceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Atividade Web (CNAE Permitido) *
                  </label>
                  <select
                    value={manualCnaeCode}
                    onChange={(e) => setManualCnaeCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {(enabledWebActivities.length > 0 ? enabledWebActivities : webActivities).map(
                      (act) => (
                        <option key={act.code} value={act.code}>
                          {act.code} (LC {act.lc116Code}) — {act.description}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Perfil / Categoria na Plataforma
                  </label>
                  <select
                    value={manualTomadorRole}
                    onChange={(e) => setManualTomadorRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Prestador de Serviço">Prestador de Serviço</option>
                    <option value="Construtora / Empreiteiro">Construtora / Empreiteiro</option>
                    <option value="Solicitante / Cliente">Solicitante / Cliente</option>
                    <option value="Técnico / Projetista">Técnico / Projetista</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Discriminação Personalizada (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder="Deixe em branco para usar o modelo padrão de Serviços Web."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEmittingManual}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                >
                  {isEmittingManual ? 'Assinando e Emitindo...' : 'Emitir NFS-e Assinada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualização DANFSe */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  DANFSe — Nota Fiscal de Serviços Eletrônica #{previewInvoice.nfseNumber}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Código de Verificação: {previewInvoice.verificationCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadNfseXmlFile(previewInvoice)}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar XML</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir DANFSe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs bg-white text-slate-900">
              <div className="border border-slate-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Documento Auxiliar da NFS-e · ABRASF v2.04
                  </div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {previewInvoice.prestadorName}
                  </div>
                  <div className="font-mono tabular-nums text-slate-700 mt-0.5">
                    CNPJ: 68.603.032/0001-15 · IM: {previewInvoice.prestadorIm || config?.inscricaoMunicipal}
                  </div>
                  <div className="text-slate-600">
                    Município Prestador: {config?.municipioNome}/{config?.uf} (IBGE {config?.municipioIbge})
                  </div>
                </div>
                <div className="sm:text-right font-mono tabular-nums">
                  <div className="text-[11px] text-slate-500">Número NFS-e</div>
                  <div className="text-lg font-black text-slate-900">#{previewInvoice.nfseNumber}</div>
                  <div className="text-[11px] text-slate-600">
                    RPS {previewInvoice.rpsNumber}/{previewInvoice.rpsSeries}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Emissão: {formatDateTimeBR(previewInvoice.issuedAt)}
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-4 space-y-1">
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  Tomador de Serviços
                </div>
                <div className="font-bold text-sm text-slate-900">{previewInvoice.tomadorName}</div>
                <div className="text-slate-700">
                  E-mail: {previewInvoice.tomadorEmail || 'Não informado'} · Documento:{' '}
                  <span className="font-mono">{previewInvoice.tomadorDocument || 'Não informado'}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    Discriminação do Serviço Web
                  </span>
                  <span className="font-mono tabular-nums font-bold text-sky-700">
                    CNAE {previewInvoice.cnaeCode} · LC 116/03 {previewInvoice.lc116Code}
                  </span>
                </div>
                <p className="text-slate-800 leading-relaxed">{previewInvoice.serviceDescription}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 border border-slate-300 rounded-xl p-4 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] text-slate-500 font-sans font-bold">Valor dos Serviços</div>
                  <div className="text-sm font-black text-slate-900">{formatBRL(previewInvoice.grossAmount)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-sans font-bold">
                    ISS ({previewInvoice.aliquotaIss.toFixed(2)}%)
                  </div>
                  <div className="text-sm font-black text-slate-900">{formatBRL(previewInvoice.issAmount)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-sans font-bold">Valor Líquido</div>
                  <div className="text-sm font-black text-emerald-700">{formatBRL(previewInvoice.netAmount)}</div>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 font-mono text-[10px] text-slate-600 space-y-1">
                <div>Assinatura Digital XML (RSA-SHA256): {previewInvoice.xmlSignedDigest}</div>
                <div>Certificado Titular: {previewInvoice.certificateSubject}</div>
                <div>Thumbprint SHA-256: {previewInvoice.certificateThumbprint}</div>
                {previewInvoice.transmission && (
                  <div>
                    Transmissão API: {previewInvoice.transmission.transmissionStatus}
                    {previewInvoice.transmission.protocolNumber
                      ? ` · Protocolo: ${previewInvoice.transmission.protocolNumber}`
                      : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancelamento de NFS-e */}
      {cancelTargetInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Cancelar NFS-e #{cancelTargetInvoice.nfseNumber}
              </h4>
              <button
                type="button"
                onClick={() => setCancelTargetInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmCancel} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Informe a justificativa fiscal para cancelar a nota emitida para{' '}
                <strong>{cancelTargetInvoice.tomadorName}</strong> ({formatBRL(cancelTargetInvoice.grossAmount)}).
              </p>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelTargetInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
