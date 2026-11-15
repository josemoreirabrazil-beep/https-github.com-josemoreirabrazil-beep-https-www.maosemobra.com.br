import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  KeyRound,
  Lock,
  Upload,
  FileCode2,
  Plug,
  Activity,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react';
import type {
  FiscalApiProviderId,
  FiscalConfiguration,
  WebServiceCnaeActivity,
} from '../types';
import {
  fetchFiscalConfig,
  saveFiscalConfig,
  uploadDigitalCertificate,
  testFiscalApiConnection,
  syncCertificateWithProvider,
  type FiscalCredentialChecks,
} from '../services/fiscalService';

interface FiscalAutomationModuleProps {
  adminToken?: string;
  onDataChanged?: () => void;
  onOpenInvoicesTab?: () => void;
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

function formatCnpjInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

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

export const FiscalAutomationModule: React.FC<FiscalAutomationModuleProps> = ({
  adminToken,
  onDataChanged,
  onOpenInvoicesTab,
}) => {
  const [config, setConfig] = useState<FiscalConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingCert, setIsSyncingCert] = useState(false);
  const [isInstallingCert, setIsInstallingCert] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Company Identity & CNPJ State
  const [companyName, setCompanyName] = useState('MOREIRA BRASIL SERVIÇOS');
  const [companyCnpj, setCompanyCnpj] = useState('68.603.032/0001-15');

  // Tax & Emitter Parameters
  const [environment, setEnvironment] = useState<'homologacao' | 'producao'>('producao');
  const [regimeTributario, setRegimeTributario] = useState<FiscalConfiguration['regimeTributario']>('Simples Nacional');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [municipioNome, setMunicipioNome] = useState('');
  const [municipioIbge, setMunicipioIbge] = useState('');
  const [uf, setUf] = useState('BA');
  const [rpsSeries, setRpsSeries] = useState('WEB');
  const [defaultAliquotaIss, setDefaultAliquotaIss] = useState('2.0');
  const [autoEmitOnPayment, setAutoEmitOnPayment] = useState(true);
  const [serviceDescriptionTemplate, setServiceDescriptionTemplate] = useState('');

  // Provider & Endpoints State
  const [apiProvider, setApiProvider] = useState<FiscalApiProviderId>('prefeitura_abrasf_soap');
  const [autoTransmitToProvider, setAutoTransmitToProvider] = useState(false);
  const [productionEndpoint, setProductionEndpoint] = useState('');
  const [homologacaoEndpoint, setHomologacaoEndpoint] = useState('');
  const [soapAction, setSoapAction] = useState('http://nfse.abrasf.org.br/GerarNfse');
  const [useStoredCertificateMtls, setUseStoredCertificateMtls] = useState(true);
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [apiCompanyId, setApiCompanyId] = useState('68603032000115');
  const [customHeaderName, setCustomHeaderName] = useState('Authorization');

  // Web Services CNAEs + Per-Activity Endpoints
  const [webActivities, setWebActivities] = useState<WebServiceCnaeActivity[]>([]);

  // Certificate A1 Installation Mode (File Upload OR Direct Base64 / PEM Insertion)
  const [certInputTab, setCertInputTab] = useState<'file' | 'pfx_base64' | 'pem_text'>('file');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [pfxBase64Text, setPfxBase64Text] = useState('');
  const [pemCertText, setPemCertText] = useState('');
  const [pemPrivateKeyText, setPemPrivateKeyText] = useState('');

  // Live Connection Test Diagnostic
  const [lastTestDiagnostic, setLastTestDiagnostic] = useState<{
    connected: boolean;
    httpStatus?: number;
    message: string;
    testedAt: string;
    credentialChecks?: FiscalCredentialChecks;
  } | null>(null);

  const syncFromConfig = (cfg: FiscalConfiguration) => {
    setConfig(cfg);
    setCompanyName(cfg.companyName || 'MOREIRA BRASIL SERVIÇOS');
    setCompanyCnpj(cfg.cnpjFormatted || formatCnpjInput(cfg.cnpj || '68603032000115'));
    setEnvironment(cfg.environment);
    setRegimeTributario(cfg.regimeTributario);
    setInscricaoMunicipal(cfg.inscricaoMunicipal);
    setMunicipioNome(cfg.municipioNome);
    setMunicipioIbge(cfg.municipioIbge);
    setUf(cfg.uf);
    setRpsSeries(cfg.rpsSeries);
    setDefaultAliquotaIss(String(cfg.defaultAliquotaIss));
    setAutoEmitOnPayment(cfg.autoEmitOnPayment);
    setServiceDescriptionTemplate(cfg.serviceDescriptionTemplate);
    setWebActivities(cfg.webActivities || []);

    if (cfg.apiIntegration) {
      setApiProvider(cfg.apiIntegration.provider);
      setAutoTransmitToProvider(cfg.apiIntegration.autoTransmitToProvider);
      setProductionEndpoint(cfg.apiIntegration.productionEndpoint || '');
      setHomologacaoEndpoint(cfg.apiIntegration.homologacaoEndpoint || '');
      setSoapAction(cfg.apiIntegration.soapAction || 'http://nfse.abrasf.org.br/GerarNfse');
      setUseStoredCertificateMtls(cfg.apiIntegration.useStoredCertificateMtls);
      setApiCompanyId(cfg.apiIntegration.apiCompanyId || cfg.cnpj || '68603032000115');
      setCustomHeaderName(cfg.apiIntegration.customHeaderName || 'Authorization');
      setApiTokenInput(cfg.apiIntegration.apiTokenMasked || '');

      if (cfg.apiIntegration.lastConnectionTestAt && cfg.apiIntegration.lastConnectionMessage) {
        setLastTestDiagnostic((prev) => ({
          connected: cfg.apiIntegration!.lastConnectionStatus === 'Conectado',
          httpStatus: prev?.httpStatus,
          message: cfg.apiIntegration!.lastConnectionMessage || '',
          testedAt: cfg.apiIntegration!.lastConnectionTestAt || new Date().toISOString(),
          credentialChecks: prev?.credentialChecks,
        }));
      }
    }
  };

  const loadConfig = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const data = await fetchFiscalConfig(adminToken);
      if (data.config) syncFromConfig(data.config);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao carregar configurações fiscais de automação.',
      });
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const selectedProviderMeta = useMemo(
    () => PROVIDER_OPTIONS.find((p) => p.id === apiProvider) || PROVIDER_OPTIONS[0],
    [apiProvider]
  );

  const cleanCnpjDigits = companyCnpj.replace(/\D/g, '');
  const isCnpjValid = cleanCnpjDigits.length === 14 && !/^(\d)\1{13}$/.test(cleanCnpjDigits);

  const handleSelectProvider = (nextProvider: FiscalApiProviderId) => {
    setApiProvider(nextProvider);
    const meta = PROVIDER_OPTIONS.find((p) => p.id === nextProvider);
    if (meta) {
      if (meta.defaultProdUrl) setProductionEndpoint(meta.defaultProdUrl);
      if (meta.defaultHomologUrl) setHomologacaoEndpoint(meta.defaultHomologUrl);
      setUseStoredCertificateMtls(meta.supportsMtls);
    }
  };

  const buildSavePayload = () => {
    const primaryActivity =
      webActivities.find((a) => a.isPrimary && a.enabled) || webActivities.find((a) => a.enabled);
    return {
      companyName: companyName.trim() || 'MOREIRA BRASIL SERVIÇOS',
      cnpj: cleanCnpjDigits,
      autoEmitOnPayment,
      environment,
      regimeTributario,
      inscricaoMunicipal,
      municipioNome,
      municipioIbge,
      uf,
      rpsSeries,
      defaultAliquotaIss: Number(defaultAliquotaIss) || 2.0,
      serviceDescriptionTemplate,
      defaultWebActivityCode: primaryActivity?.code,
      webActivities,
      apiIntegration: {
        provider: apiProvider,
        autoTransmitToProvider,
        productionEndpoint,
        homologacaoEndpoint,
        soapAction,
        useStoredCertificateMtls,
        apiCompanyId: apiCompanyId || cleanCnpjDigits,
        customHeaderName,
        apiToken: apiTokenInput && !apiTokenInput.includes('••••') ? apiTokenInput : undefined,
      },
    };
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    if (!isCnpjValid) {
      setFeedback({
        type: 'error',
        message: 'Informe um CNPJ válido com 14 dígitos numéricos para a empresa emissora.',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const updated = await saveFiscalConfig(buildSavePayload(), adminToken);
      syncFromConfig(updated);
      setFeedback({
        type: 'success',
        message: `Configurações salvas no cofre AES-256-GCM para ${updated.companyName} (CNPJ ${updated.cnpjFormatted}).`,
      });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao salvar configuração.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (isTesting) return;
    if (!isCnpjValid) {
      setFeedback({
        type: 'error',
        message: 'CNPJ inválido. Preencha os 14 dígitos do CNPJ antes de testar as credenciais contra a API.',
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      await saveFiscalConfig(buildSavePayload(), adminToken);
      const res = await testFiscalApiConnection(adminToken);
      if (res.config) syncFromConfig(res.config);
      setLastTestDiagnostic({
        connected: res.connected,
        httpStatus: res.httpStatus,
        message: res.message,
        testedAt: new Date().toISOString(),
        credentialChecks: res.credentialChecks,
      });
      setFeedback({
        type: res.connected ? 'success' : 'error',
        message: res.message,
      });
      onDataChanged?.();
    } catch (err: any) {
      const errMsg = err?.message || 'Falha ao validar credenciais contra a API escolhida.';
      setLastTestDiagnostic({
        connected: false,
        message: errMsg,
        testedAt: new Date().toISOString(),
      });
      setFeedback({ type: 'error', message: errMsg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncCertificate = async () => {
    if (isSyncingCert) return;
    setIsSyncingCert(true);
    setFeedback(null);
    try {
      await saveFiscalConfig(buildSavePayload(), adminToken);
      const res = await syncCertificateWithProvider(adminToken);
      if (res.config) syncFromConfig(res.config);
      setFeedback({ type: 'success', message: res.message });
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao sincronizar Certificado A1 com o emissor.',
      });
    } finally {
      setIsSyncingCert(false);
    }
  };

  const handleInstallCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInstallingCert) return;
    setFeedback(null);

    try {
      setIsInstallingCert(true);

      // Persist CNPJ / Company Name before validating certificate match
      if (isCnpjValid) {
        await saveFiscalConfig(buildSavePayload(), adminToken);
      }

      if (certInputTab === 'file') {
        if (!certFile) {
          throw new Error('Selecione um arquivo .pfx, .p12, .pem ou .crt do Certificado A1.');
        }
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
            insertionMode: 'file',
          },
          adminToken
        );
        setFeedback({ type: 'success', message: res.message });
        setCertFile(null);
        setCertPassword('');
      } else if (certInputTab === 'pfx_base64') {
        if (!pfxBase64Text.trim()) {
          throw new Error('Cole o conteúdo Base64 do certificado .PFX / .P12.');
        }
        const res = await uploadDigitalCertificate(
          {
            fileName: `certificado-a1-${cleanCnpjDigits || 'empresa'}.pfx`,
            base64Content: pfxBase64Text.trim(),
            password: certPassword,
            insertionMode: 'pfx_base64',
          },
          adminToken
        );
        setFeedback({ type: 'success', message: res.message });
        setPfxBase64Text('');
        setCertPassword('');
      } else {
        if (!pemCertText.trim()) {
          throw new Error('Cole o conteúdo X.509 PEM (-----BEGIN CERTIFICATE-----).');
        }
        const res = await uploadDigitalCertificate(
          {
            fileName: `certificado-a1-${cleanCnpjDigits || 'empresa'}.pem`,
            insertionMode: 'pem_text',
            certificatePemText: pemCertText.trim(),
            privateKeyPemText: pemPrivateKeyText.trim(),
          },
          adminToken
        );
        setFeedback({ type: 'success', message: res.message });
        setPemCertText('');
        setPemPrivateKeyText('');
      }

      await loadConfig(false);
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Não foi possível validar o Certificado Digital A1.',
      });
    } finally {
      setIsInstallingCert(false);
    }
  };

  const handleToggleActivity = (code: string) => {
    setWebActivities((prev) => {
      const enabledCount = prev.filter((a) => a.enabled).length;
      return prev.map((a) => {
        if (a.code !== code) return a;
        if (a.enabled && enabledCount <= 1) return a;
        const nextEnabled = !a.enabled;
        return { ...a, enabled: nextEnabled, isPrimary: nextEnabled ? a.isPrimary : false };
      });
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

  const handleActivityFieldChange = (
    code: string,
    field: 'issRate' | 'customEndpoint',
    value: string
  ) => {
    setWebActivities((prev) =>
      prev.map((a) => {
        if (a.code !== code) return a;
        if (field === 'issRate') {
          return { ...a, issRate: Number(value) || 0 };
        }
        return { ...a, customEndpoint: value };
      })
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 text-slate-500 text-xs font-semibold">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
        <span>Carregando FiscalAutomationModule (Certificado A1, CNPJ & Endpoints)...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="fiscal-automation-module">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Card: Identidade Fiscal & Ações Principais */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-black">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              {companyName || 'MOREIRA BRASIL SERVIÇOS'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono tabular-nums font-bold">
              CNPJ {formatCnpjInput(companyCnpj)}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold">
              <Globe className="w-3.5 h-3.5" />
              Endpoint: {apiProvider === 'prefeitura_abrasf_soap' ? 'prefeitura_abrasf_soap (SOAP mTLS)' : apiProvider}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              Cofre FISCAL_VAULT_SECRET ({config?.vaultCipherAlgorithm || 'AES-256-GCM'} • Key {config?.vaultKeyFingerprint || 'Ativa'})
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>FiscalAutomationModule</strong> — Persistência segura do Certificado Digital A1 com <code className="font-mono">FISCAL_VAULT_SECRET</code> e integração SOAP mTLS (<code className="font-mono">prefeitura_abrasf_soap</code>) para as atividades de serviços web.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-testid="fiscal-test-connection-btn"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-sky-400 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Validando Credenciais...' : 'Testar Conexão & Validar Credenciais'}</span>
          </button>

          <button
            type="button"
            data-testid="fiscal-save-config-btn"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Configuração'}</span>
          </button>

          {onOpenInvoicesTab && (
            <button
              type="button"
              onClick={onOpenInvoicesTab}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver Notas Emitidas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Connection & Credential Validation Diagnostic Bar */}
      {lastTestDiagnostic && (
        <div
          className={`p-4 rounded-2xl border space-y-3 text-xs ${
            lastTestDiagnostic.connected
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {lastTestDiagnostic.connected ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>
                    Validação de Credenciais & Conexão:{' '}
                    {lastTestDiagnostic.connected ? 'Conectado & Credenciais Aceitas' : 'Falha / Credencial Pendente'}
                  </span>
                  {lastTestDiagnostic.httpStatus !== undefined && (
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                      HTTP {lastTestDiagnostic.httpStatus}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {lastTestDiagnostic.message}
                </p>
              </div>
            </div>
            <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              Testado em {formatDateTimeBR(lastTestDiagnostic.testedAt)}
            </span>
          </div>

          {lastTestDiagnostic.credentialChecks && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-black/5 dark:border-white/10 text-[11px]">
              <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">CNPJ Empresa</span>
                <span className={`font-mono font-bold ${lastTestDiagnostic.credentialChecks.cnpjValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {lastTestDiagnostic.credentialChecks.cnpjFormatted} {lastTestDiagnostic.credentialChecks.cnpjValid ? '✓' : '✗'}
                </span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Certificado A1 / mTLS</span>
                <span className={`font-bold ${lastTestDiagnostic.credentialChecks.mtlsActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}`}>
                  {lastTestDiagnostic.credentialChecks.mtlsActive
                    ? 'A1 mTLS Ativo ✓'
                    : lastTestDiagnostic.credentialChecks.certificateLoaded
                    ? 'A1 Carregado'
                    : 'Sem .PFX enviado'}
                </span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">API Token / Chave</span>
                <span
                  className={`font-bold ${
                    !lastTestDiagnostic.credentialChecks.tokenRequired ||
                    lastTestDiagnostic.credentialChecks.tokenConfigured
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {lastTestDiagnostic.credentialChecks.tokenConfigured
                    ? 'Configurado ✓'
                    : lastTestDiagnostic.credentialChecks.tokenRequired
                    ? 'Obrigatório (Ausente)'
                    : 'Via mTLS / Opcional'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid Principal: Certificado Digital A1 + Empresa/CNPJ/Endpoints */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: CERTIFICADO DIGITAL A1 */}
        <div className="xl:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                Certificado Digital A1 (Upload Seguro)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vinculado ao CNPJ {formatCnpjInput(companyCnpj)} com cofre AES-256-GCM
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                config?.certificate?.status === 'Expirado'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {config?.certificate?.status || 'Ativo (Perfil A1 Vinculado)'}
            </span>
          </div>

          {/* Card de Status Atual do Certificado */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Empresa / Titular</span>
              <span className="font-bold text-slate-900 dark:text-white text-right">
                {config?.certificate?.companyName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">CNPJ Vinculado</span>
              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                {config?.certificate?.cnpjFormatted}{' '}
                {config?.certificate?.cnpjMatchesEmitter ? '✓' : '(Divergente)'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Emissor (AC)</span>
              <span className="text-slate-700 dark:text-slate-300 text-right truncate max-w-[220px]" title={config?.certificate?.issuerName}>
                {config?.certificate?.issuerName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Nº de Série</span>
              <span className="font-mono tabular-nums text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
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
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Cofre FISCAL_VAULT_SECRET</span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                {config?.vaultCipherAlgorithm || 'AES-256-GCM'} • Key {config?.vaultKeyFingerprint || 'Ativa'} {config?.vaultFilePersisted ? '(Persistido ✓)' : ''}
              </span>
            </div>
            {config?.certificate?.fileName && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Arquivo</span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[220px]">
                  {config.certificate.fileName}
                </span>
              </div>
            )}
          </div>

          {/* Abas: Upload Arquivo vs Base64 .PFX vs PEM X.509 */}
          <form onSubmit={handleInstallCertificate} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCertInputTab('file')}
                className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                  certInputTab === 'file'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Arquivo .PFX
              </button>
              <button
                type="button"
                onClick={() => setCertInputTab('pfx_base64')}
                className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                  certInputTab === 'pfx_base64'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Colar Base64
              </button>
              <button
                type="button"
                onClick={() => setCertInputTab('pem_text')}
                className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                  certInputTab === 'pem_text'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Inserir PEM
              </button>
            </div>

            {certInputTab === 'file' && (
              <div className="space-y-2.5 text-xs">
                <input
                  type="file"
                  accept=".pfx,.p12,.pem,.crt"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 dark:file:border-slate-700 file:text-xs file:font-bold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200 cursor-pointer"
                />
                <input
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Senha do Certificado Digital .PFX / .P12"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {certInputTab === 'pfx_base64' && (
              <div className="space-y-2.5 text-xs">
                <textarea
                  rows={4}
                  value={pfxBase64Text}
                  onChange={(e) => setPfxBase64Text(e.target.value)}
                  placeholder="Cole aqui o conteúdo Base64 do arquivo .PFX / .P12 da empresa..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />
                <input
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Senha do Certificado Base64 .PFX / .P12"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {certInputTab === 'pem_text' && (
              <div className="space-y-2.5 text-xs">
                <textarea
                  rows={3}
                  value={pemCertText}
                  onChange={(e) => setPemCertText(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />
                <textarea
                  rows={3}
                  value={pemPrivateKeyText}
                  onChange={(e) => setPemPrivateKeyText(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY----- (Chave Privada RSA compatível)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={isInstallingCert}
                className="flex-1 py-2 px-4 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isInstallingCert ? 'Validando...' : 'Validar e Armazenar Certificado A1'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncCertificate}
                disabled={isSyncingCert}
                className="py-2 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                title="Sincronizar certificado armazenado com a API / Prefeitura"
              >
                {isSyncingCert ? 'Sincronizando...' : 'Sincronizar A1'}
              </button>
            </div>
          </form>
        </div>

        {/* COLUNA DIREITA: EMPRESA/CNPJ, PROVEDOR EMISSOR, ENDPOINTS E PARÂMETROS */}
        <form
          onSubmit={handleSaveAll}
          className="xl:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5"
        >
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plug className="w-4 h-4 text-sky-500" />
              Empresa (CNPJ), API de Notas Fiscais & Endpoints de Emissão
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina o CNPJ da empresa emissora, selecione a API e configure as URLs de Produção e Homologação.
            </p>
          </div>

          {/* Empresa & CNPJ Editáveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Razão Social / Nome Empresarial
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="MOREIRA BRASIL SERVIÇOS"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                CNPJ da Empresa Emissora *
              </label>
              <input
                type="text"
                value={companyCnpj}
                onChange={(e) => setCompanyCnpj(formatCnpjInput(e.target.value))}
                placeholder="68.603.032/0001-15"
                maxLength={18}
                className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border font-mono tabular-nums font-bold ${
                  isCnpjValid
                    ? 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    : 'border-rose-400 text-rose-600'
                }`}
              />
            </div>
          </div>

          {/* Seletor de API Emissora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PROVIDER_OPTIONS.map((opt) => {
              const active = apiProvider === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectProvider(opt.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/30'
                      : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                      {opt.label}
                    </span>
                    {opt.supportsMtls && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 shrink-0">
                        mTLS
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Endpoint de Produção (Serviços Web)
              </label>
              <input
                type="url"
                value={productionEndpoint}
                onChange={(e) => setProductionEndpoint(e.target.value)}
                placeholder="https://nfse.municipio.ba.gov.br/ws/nfse.asmx"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Endpoint de Homologação (Testes)
              </label>
              <input
                type="url"
                value={homologacaoEndpoint}
                onChange={(e) => setHomologacaoEndpoint(e.target.value)}
                placeholder="https://homologacao.municipio.ba.gov.br/ws/nfse.asmx"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
              />
            </div>

            {apiProvider === 'prefeitura_abrasf_soap' && (
              <div>
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
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  API Token / Chave Secreta
                </label>
                <input
                  type="password"
                  value={apiTokenInput}
                  onChange={(e) => setApiTokenInput(e.target.value)}
                  placeholder="Informe o Token/API Key do emissor"
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
                  Header de Autenticação
                </label>
                <input
                  type="text"
                  value={customHeaderName}
                  onChange={(e) => setCustomHeaderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ambiente</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as 'homologacao' | 'producao')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="producao">Produção</option>
                <option value="homologacao">Homologação</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Regime Tributário</label>
              <select
                value={regimeTributario}
                onChange={(e) => setRegimeTributario(e.target.value as FiscalConfiguration['regimeTributario'])}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="MEI">MEI</option>
                <option value="Lucro Presumido">Lucro Presumido</option>
                <option value="Lucro Real">Lucro Real</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Inscrição Mun.</label>
              <input
                type="text"
                value={inscricaoMunicipal}
                onChange={(e) => setInscricaoMunicipal(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Série RPS</label>
              <input
                type="text"
                value={rpsSeries}
                maxLength={5}
                onChange={(e) => setRpsSeries(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center"
              />
            </div>

            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Município</label>
              <input
                type="text"
                value={municipioNome}
                onChange={(e) => setMunicipioNome(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UF</label>
              <input
                type="text"
                value={uf}
                maxLength={2}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IBGE</label>
              <input
                type="text"
                value={municipioIbge}
                onChange={(e) => setMunicipioIbge(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alíquota ISS Padrão (%)</label>
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

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoEmitOnPayment}
                  onChange={(e) => setAutoEmitOnPayment(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span>Gerar NFS-e automaticamente ao aprovar pagamento</span>
              </label>

              <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoTransmitToProvider}
                  onChange={(e) => setAutoTransmitToProvider(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span>Transmitir automaticamente à API após emissão</span>
              </label>

              <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={useStoredCertificateMtls}
                  onChange={(e) => setUseStoredCertificateMtls(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span>Autenticar via mTLS com Certificado A1 armazenado</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Validando...' : 'Testar Conexão & Credenciais'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* MÓDULO DE ENDPOINTS POR ATIVIDADE DE SERVIÇOS WEB */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-amber-500" />
              Endpoints & Alíquotas por Atividade de Serviços Web (CNAEs 62xx/63xx)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Somente atividades Web são permitidas neste CNPJ. Opcionalmente informe um Endpoint específico por CNAE (em branco utiliza o Endpoint Principal configurado acima).
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Endpoints Web</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3.5">Ativa</th>
                <th className="py-2.5 px-3.5">CNAE / LC 116</th>
                <th className="py-2.5 px-3.5">Descrição (Serviços Web)</th>
                <th className="py-2.5 px-3.5">ISS (%)</th>
                <th className="py-2.5 px-3.5">Endpoint Específico da Atividade (opcional)</th>
                <th className="py-2.5 px-3.5 text-right">Padrão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {webActivities.map((act) => (
                <tr
                  key={act.code}
                  className={
                    act.enabled
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/70 dark:bg-slate-950/50 opacity-70'
                  }
                >
                  <td className="py-2.5 px-3.5">
                    <input
                      type="checkbox"
                      checked={act.enabled}
                      onChange={() => handleToggleActivity(act.code)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {act.code}
                    </div>
                    <div className="font-mono tabular-nums text-[11px] text-sky-600 dark:text-sky-400">
                      LC 116: {act.lc116Code}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 max-w-[260px] text-slate-700 dark:text-slate-300">
                    {act.description}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      value={act.issRate}
                      onChange={(e) => handleActivityFieldChange(act.code, 'issRate', e.target.value)}
                      className="w-20 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums text-right"
                    />
                  </td>
                  <td className="py-2.5 px-3.5 min-w-[240px]">
                    <input
                      type="url"
                      value={act.customEndpoint || ''}
                      onChange={(e) =>
                        handleActivityFieldChange(act.code, 'customEndpoint', e.target.value)
                      }
                      placeholder={
                        (environment === 'homologacao' ? homologacaoEndpoint : productionEndpoint) ||
                        'Herdando Endpoint Geral'
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                    />
                  </td>
                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryActivity(act.code)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        act.isPrimary
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {act.isPrimary ? 'Principal' : 'Definir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
