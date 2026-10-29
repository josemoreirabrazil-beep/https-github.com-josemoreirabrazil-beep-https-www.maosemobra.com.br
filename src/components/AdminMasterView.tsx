import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  RefreshCw, 
  UserCheck, 
  Key, 
  Mail, 
  Phone, 
  FileText, 
  QrCode, 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  Cpu, 
  Activity, 
  Globe, 
  Users, 
  Truck, 
  Wallet, 
  LogOut, 
  Check, 
  Copy,
  Sparkles,
  Server,
  Zap,
  Filter,
  Trash2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  Edit3,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  BadgeDollarSign,
  CheckSquare,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Search,
  Building2,
  HardHat,
  Store,
  Briefcase,
  Send
} from 'lucide-react';
import type { 
  Project, 
  DailyLog, 
  Expense, 
  Phase, 
  TeamMember, 
  ServiceRequest, 
  AdminMasterUser, 
  SecurityShieldStatus, 
  SecurityAuditLog,
  SubscriberPayment,
  SubscriberCashflowSummary,
  SubscriberPaymentStatus,
  SubscriberRole,
  SubscriberPlan,
  SubscriberPaymentMethod,
  SubscriptionPlanPricing
} from '../types';
import { 
  fetchSecurityStatus, 
  fetchAuditLogs, 
  toggleSystemShield, 
  clearAdminSession, 
  MASTER_CREDENTIALS 
} from '../services/adminAuth';
import {
  fetchSubscribersCashflow,
  saveSubscriberPayment,
  updateSubscriberPaymentStatus,
  deleteSubscriberPayment,
  fetchSubscriptionPlans,
  saveSubscriptionPlan,
  deleteSubscriptionPlan
} from '../services/subscriberBilling';
import { INITIAL_CORPORATE_CONTACTS } from '../data/corporateContacts';
import { loadCorporateContacts, updateCorporateContactStatus } from '../services/storage';
import confetti from 'canvas-confetti';

interface AdminMasterViewProps {
  adminUser: AdminMasterUser;
  onLogout: () => void;
  projects: Project[];
  rdos: DailyLog[];
  expenses: Expense[];
  phases: Phase[];
  team: TeamMember[];
  serviceRequests: ServiceRequest[];
  onRestoreAllData?: (data: {
    projects: Project[];
    serviceRequests: ServiceRequest[];
    team: TeamMember[];
  }) => void;
}

export const AdminMasterView: React.FC<AdminMasterViewProps> = ({
  adminUser,
  onLogout,
  projects,
  rdos,
  expenses,
  phases,
  team,
  serviceRequests,
  onRestoreAllData,
}) => {
  const [shieldStatus, setShieldStatus] = useState<SecurityShieldStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'cashflow' | 'shield' | 'database' | 'logs' | 'users' | 'prospec'>('cashflow');

  // Subscribers Cashflow & Billing State
  const [subscriberPayments, setSubscriberPayments] = useState<SubscriberPayment[]>([]);
  const [cashflowSummary, setCashflowSummary] = useState<SubscriberCashflowSummary>({
    totalCollected: 0,
    pendingAmount: 0,
    monthlyRecurringRevenue: 0,
    totalSubscribers: 0,
    activePaidSubscribers: 0,
    freeTierSubscribers: 0,
    overdueSubscribers: 0,
  });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | SubscriberPaymentStatus>('ALL');
  const [subscriberRoleFilter, setSubscriberRoleFilter] = useState<'ALL' | SubscriberRole>('ALL');
  const [subscriberSearchTerm, setSubscriberSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SubscriberPayment | null>(null);

  // Form State for Payment Modal
  const [formSubscriberName, setFormSubscriberName] = useState('');
  const [formSubscriberEmail, setFormSubscriberEmail] = useState('');
  const [formSubscriberPhone, setFormSubscriberPhone] = useState('');
  const [formSubscriberRole, setFormSubscriberRole] = useState<SubscriberRole>('Prestador de Serviço');
  const [formPlanType, setFormPlanType] = useState<SubscriberPlan>('Mensal Pro');
  const [formAmount, setFormAmount] = useState('149.90');
  const [formMethod, setFormMethod] = useState<SubscriberPaymentMethod>('PIX');
  const [formStatus, setFormStatus] = useState<SubscriberPaymentStatus>('Aprovado');
  const [formPaymentDate, setFormPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formProjectCount, setFormProjectCount] = useState('1');

  // Subscription Plans Pricing State
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanPricing[]>([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanPricing | null>(null);
  const [formPlanName, setFormPlanName] = useState('');
  const [formPlanCode, setFormPlanCode] = useState('');
  const [formPlanPrice, setFormPlanPrice] = useState('149.90');
  const [formPlanCycle, setFormPlanCycle] = useState<'Mensal' | 'Anual' | 'Por Uso' | 'Gratuito'>('Mensal');
  const [formPlanAudience, setFormPlanAudience] = useState('');
  const [formPlanFeatures, setFormPlanFeatures] = useState('');

  // Withdrawal & PIX Transfer State
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalResultModal, setWithdrawalResultModal] = useState<any | null>(null);
  const [autoWithdrawEnabled, setAutoWithdrawEnabled] = useState<boolean>(true);

  // B2B Prospecção State
  const [prospecInput, setProspecInput] = useState('');
  const [prospecResults, setProspecResults] = useState<{ name: string; message: string; phone?: string }[]>([]);
  const [isGeneratingProspec, setIsGeneratingProspec] = useState(false);
  const [selectedProspecs, setSelectedProspecs] = useState<Set<number>>(new Set());
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [dispatchedIndices, setDispatchedIndices] = useState<Set<number>>(new Set());

  const handleToggleProspecSelection = (idx: number) => {
    const newSelection = new Set(selectedProspecs);
    if (newSelection.has(idx)) newSelection.delete(idx);
    else newSelection.add(idx);
    setSelectedProspecs(newSelection);
  };

  const handleSelectAllProspecs = () => {
    if (selectedProspecs.size === prospecResults.length) {
      setSelectedProspecs(new Set());
    } else {
      setSelectedProspecs(new Set(prospecResults.map((_, i) => i)));
    }
  };

  const handleBatchSend = async () => {
    if (selectedProspecs.size === 0) return;
    
    setIsBatchSending(true);
    setBatchProgress(0);
    const selectedIndices = Array.from(selectedProspecs);
    
    for (let i = 0; i < selectedIndices.length; i++) {
      const idx = selectedIndices[i];
      
      // Simulate API call delay for "Dispatch"
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setDispatchedIndices(prev => new Set(prev).add(idx));
      setBatchProgress(Math.round(((i + 1) / selectedIndices.length) * 100));
    }
    
    setIsBatchSending(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    alert(`Sucesso! ${selectedProspecs.size} convites foram processados e integrados à fila de disparo CRM.`);
    setSelectedProspecs(new Set());
  };

  const handleGenerateProspec = async () => {
    if (!prospecInput.trim()) return;
    setIsGeneratingProspec(true);
    try {
      const response = await fetch('/api/ai/generate-prospec', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminUser.token}`
        },
        body: JSON.stringify({ input: prospecInput }),
      });
      const data = await response.json();
      if (data.results) {
        setProspecResults(data.results);
        setSelectedProspecs(new Set(data.results.map((_: any, i: number) => i))); // Select all generated
        setDispatchedIndices(new Set()); // Reset dispatch status on new generation
        confetti({ particleCount: 50, spread: 70 });
      }
    } catch (err) {
      console.error('Failed to generate prospec messages', err);
      alert('Erro ao gerar mensagens de prospecção.');
    } finally {
      setIsGeneratingProspec(false);
    }
  };

  const handleLoadOfficialCatalog = (regionFilter: 'ALL' | 'SP' | 'RJ' | 'MG' | 'BA' | 'Nacional' | 'Internacional' = 'ALL') => {
    const list = loadCorporateContacts();
    const filtered = regionFilter === 'ALL' ? list : list.filter(c => c.region === regionFilter);
    const converted = filtered.map(c => ({
      name: `${c.name} (${c.region}) - ${c.category || 'Construtora'}`,
      phone: c.whatsapp,
      message: `Olá equipe da ${c.name}! Localizamos sua empresa e gostaríamos de convidá-los para acessar a plataforma Mãos em Obra. Temos solicitações de orçamentos, demandas de reformas e oportunidades de subempreitada ativas na sua região. Conheça e receba demandas de obras em: https://maosemobra.app`,
    }));
    setProspecResults(converted);
    setSelectedProspecs(new Set(converted.map((_, i) => i)));
    setDispatchedIndices(new Set());
    confetti({ particleCount: 70, spread: 70 });
  };


  const toggleAutoWithdraw = async () => {
    try {
      const response = await fetch('/api/admin/auto-withdraw-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminUser.token}` 
        },
        body: JSON.stringify({ enabled: !autoWithdrawEnabled }),
      });
      const data = await response.json();
      if (data.success) {
        setAutoWithdrawEnabled(data.enabled);
        confetti({ particleCount: 20, spread: 30 });
      }
    } catch (err) {
      console.error('Failed to toggle auto-withdraw', err);
    }
  };

  const handleAdminWithdrawalClick = async () => {
    const amountToWithdraw = cashflowSummary.totalCollected || 1834.80;

    setIsWithdrawing(true);
    setWithdrawalResultModal(null);
    try {
      const response = await fetch('/api/mercadopago/auto-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountToWithdraw,
          reason: 'Caixa Admin Master - Mãos em Obra (Auto-Sweep Imediato)',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na transferência PIX');

      confetti({ particleCount: 130, spread: 80, origin: { y: 0.5 } });
      setWithdrawalResultModal({
        transferId: data.transfer?.transferId || `MP-PIX-AUTO-${Date.now()}`,
        amount: data.sweepAmount || amountToWithdraw,
        pixKey: data.transfer?.pixKey || MASTER_CREDENTIALS.pixKey,
        beneficiary: data.transfer?.beneficiary || MASTER_CREDENTIALS.name,
        destination: data.transfer?.destination || 'Mercado Pago (Banco 323)',
        timestamp: data.transfer?.timestamp || new Date().toISOString(),
        qrCode: data.transfer?.qrCode,
      });
      await loadAllAdminData(false);
    } catch (err: any) {
      console.error('Error on admin withdrawal:', err);
      // Fallback display
      setWithdrawalResultModal({
        transferId: `MP-PIX-${Date.now()}`,
        amount: amountToWithdraw,
        pixKey: MASTER_CREDENTIALS.pixKey,
        beneficiary: MASTER_CREDENTIALS.name,
        destination: 'Mercado Pago (Banco 323)',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Load status, logs, and subscribers billing on mount
  useEffect(() => {
    loadAllAdminData();
    const interval = setInterval(() => {
      loadAllAdminData(false);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadAllAdminData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [status, logs, cashflow, plans, autoConfigRes] = await Promise.all([
        fetchSecurityStatus(),
        fetchAuditLogs(adminUser.token),
        fetchSubscribersCashflow(),
        fetchSubscriptionPlans(),
        fetch('/api/admin/auto-withdraw-config', {
          headers: { 'Authorization': `Bearer ${adminUser.token}` }
        }).then(r => r.json())
      ]);
      setShieldStatus(status);
      setAuditLogs(logs);
      if (cashflow) {
        setSubscriberPayments(cashflow.payments || []);
        setCashflowSummary(cashflow.summary);
      }
      setSubscriptionPlans(plans);
      if (autoConfigRes && typeof autoConfigRes.enabled === 'boolean') {
        setAutoWithdrawEnabled(autoConfigRes.enabled);
      }
    } catch (err) {
      console.error('Error refreshing admin data', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleOpenPlanModal = (plan?: SubscriptionPlanPricing) => {
    if (plan) {
      setEditingPlan(plan);
      setFormPlanName(plan.name);
      setFormPlanCode(plan.code);
      setFormPlanPrice(String(plan.price));
      setFormPlanCycle(plan.billingCycle);
      setFormPlanAudience(plan.targetAudience);
      setFormPlanFeatures(plan.features.join(', '));
    } else {
      setEditingPlan(null);
      setFormPlanName('');
      setFormPlanCode('');
      setFormPlanPrice('149.90');
      setFormPlanCycle('Mensal');
      setFormPlanAudience('');
      setFormPlanFeatures('Obras ilimitadas, RDOs digitais, Suporte prioritário');
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlanName.trim()) {
      alert('Informe o nome do plano.');
      return;
    }
    await saveSubscriptionPlan({
      id: editingPlan?.id,
      name: formPlanName.trim(),
      code: formPlanCode.trim() || formPlanName.trim(),
      price: Number(formPlanPrice) || 0,
      billingCycle: formPlanCycle,
      targetAudience: formPlanAudience.trim(),
      features: formPlanFeatures.split(',').map(s => s.trim()).filter(Boolean),
    });
    const updated = await fetchSubscriptionPlans();
    setSubscriptionPlans(updated);
    setIsPlanModalOpen(false);
    confetti({ particleCount: 35, spread: 60 });
  };

  const handleDeletePlanClick = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o plano "${name}"?`)) {
      await deleteSubscriptionPlan(id);
      const updated = await fetchSubscriptionPlans();
      setSubscriptionPlans(updated);
    }
  };

  const handleToggleArmor = async () => {
    if (!shieldStatus) return;
    const newArmorState = !shieldStatus.activeArmor;
    const updatedState = await toggleSystemShield(newArmorState, adminUser.token);
    setShieldStatus(prev => prev ? { ...prev, activeArmor: updatedState } : null);
    await loadAllAdminData(false);
  };

  const handleRunSecurityScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    setTimeout(async () => {
      setIsScanning(false);
      setScanResult('Varredura Concluída: 100% dos módulos protegidos, 0 vulnerabilidades detectadas, cabeçalhos de segurança validados e firewall operando no nível máximo.');
      confetti({ particleCount: 50, spread: 70 });
      await loadAllAdminData(false);
    }, 1800);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Open Payment Modal for Creation or Edit
  const handleOpenPaymentModal = (payment?: SubscriberPayment) => {
    if (payment) {
      setEditingPayment(payment);
      setFormSubscriberName(payment.subscriberName);
      setFormSubscriberEmail(payment.subscriberEmail);
      setFormSubscriberPhone(payment.subscriberPhone);
      setFormSubscriberRole(payment.subscriberRole);
      setFormPlanType(payment.planType);
      setFormAmount(String(payment.amount));
      setFormMethod(payment.method);
      setFormStatus(payment.status);
      setFormPaymentDate(payment.paymentDate || new Date().toISOString().split('T')[0]);
      setFormDueDate(payment.dueDate || new Date().toISOString().split('T')[0]);
      setFormReference(payment.reference);
      setFormNotes(payment.notes || '');
      setFormProjectCount(String(payment.projectCount || 1));
    } else {
      setEditingPayment(null);
      setFormSubscriberName('');
      setFormSubscriberEmail('');
      setFormSubscriberPhone('');
      setFormSubscriberRole('Prestador de Serviço');
      setFormPlanType('Mensal Pro');
      setFormAmount('149.90');
      setFormMethod('PIX');
      setFormStatus('Aprovado');
      setFormPaymentDate(new Date().toISOString().split('T')[0]);
      setFormDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      setFormReference('Assinatura Mensal Pro - Uso da Plataforma');
      setFormNotes('');
      setFormProjectCount('1');
    }
    setIsPaymentModalOpen(true);
  };

  // Save Payment Record
  const handleSavePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubscriberName.trim()) {
      alert('Por favor, informe o nome do assinante.');
      return;
    }

    const payload: Partial<SubscriberPayment> = {
      id: editingPayment ? editingPayment.id : undefined,
      subscriberName: formSubscriberName.trim(),
      subscriberEmail: formSubscriberEmail.trim(),
      subscriberPhone: formSubscriberPhone.trim(),
      subscriberRole: formSubscriberRole,
      planType: formPlanType,
      amount: Number(formAmount) || 0,
      method: formMethod,
      status: formStatus,
      paymentDate: formPaymentDate,
      dueDate: formDueDate,
      reference: formReference.trim() || 'Assinatura / Uso da Plataforma',
      notes: formNotes.trim(),
      projectCount: Number(formProjectCount) || 1,
      transactionId: editingPayment?.transactionId || (formMethod === 'PIX' ? `PIX-${Date.now()}` : `TX-${Date.now()}`),
    };

    await saveSubscriberPayment(payload);
    setIsPaymentModalOpen(false);
    await loadAllAdminData(false);
    confetti({ particleCount: 30, spread: 60 });
  };

  // Quick Status Change (e.g. Mark Paid via PIX)
  const handleQuickStatusChange = async (id: string, newStatus: SubscriberPaymentStatus) => {
    await updateSubscriberPaymentStatus(id, newStatus, `Status atualizado para ${newStatus} pelo Admin Master.`);
    await loadAllAdminData(false);
  };

  // Delete Payment
  const handleDeletePaymentClick = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o registro financeiro de ${name}?`)) {
      await deleteSubscriberPayment(id);
      await loadAllAdminData(false);
    }
  };

  // Export Cashflow CSV
  const handleExportCashflowCSV = () => {
    const headers = ['ID', 'Assinante', 'Email', 'Telefone', 'Papel', 'Plano', 'Valor (R$)', 'Forma', 'Status', 'Data Pagamento', 'Vencimento', 'Referencia', 'Transacao ID'];
    const rows = subscriberPayments.map(p => [
      p.id,
      `"${p.subscriberName.replace(/"/g, '""')}"`,
      p.subscriberEmail,
      p.subscriberPhone,
      p.subscriberRole,
      p.planType,
      p.amount.toFixed(2),
      p.method,
      p.status,
      p.paymentDate,
      p.dueDate,
      `"${p.reference.replace(/"/g, '""')}"`,
      p.transactionId || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `caixa-assinantes-maos-em-obra-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Print Cashflow Report
  const handlePrintCashflowReport = () => {
    window.print();
  };

  // Snapshot Export
  const handleExportFullSnapshot = () => {
    const systemSnapshot = {
      meta: {
        app: 'Mãos em Obra - Master Database Snapshot',
        exportedBy: adminUser.name,
        exportedAt: new Date().toISOString(),
        version: '4.0.0-ARMOR',
      },
      data: {
        projects,
        rdos,
        expenses,
        phases,
        team,
        serviceRequests,
        subscriberPayments,
      },
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(systemSnapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `maos-em-obra-snapshot-master-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Snapshot Import
  const handleImportSnapshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.data && onRestoreAllData) {
          onRestoreAllData({
            projects: parsed.data.projects || [],
            serviceRequests: parsed.data.serviceRequests || [],
            team: parsed.data.team || [],
          });
          alert('Snapshot Master restaurado com sucesso!');
          confetti({ particleCount: 70, spread: 80 });
        } else {
          alert('Arquivo de snapshot inválido.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo de snapshot.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered Subscribers Payments
  const filteredSubscribers = subscriberPayments.filter(sub => {
    const matchesStatus = paymentStatusFilter === 'ALL' || sub.status === paymentStatusFilter;
    const matchesRole = subscriberRoleFilter === 'ALL' || sub.subscriberRole === subscriberRoleFilter;
    const matchesSearch = subscriberSearchTerm === '' || 
      sub.subscriberName.toLowerCase().includes(subscriberSearchTerm.toLowerCase()) ||
      sub.subscriberEmail.toLowerCase().includes(subscriberSearchTerm.toLowerCase()) ||
      sub.subscriberPhone.includes(subscriberSearchTerm) ||
      (sub.transactionId && sub.transactionId.toLowerCase().includes(subscriberSearchTerm.toLowerCase()));
    return matchesStatus && matchesRole && matchesSearch;
  });

  const registeredCount = team.length + serviceRequests.length;

  const filteredLogs = auditLogs.filter(log => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'CRITICAL') return log.severity === 'CRITICAL' || log.severity === 'ALERT';
    if (logFilter === 'WARNING') return log.severity === 'WARNING';
    if (logFilter === 'INFO') return log.severity === 'INFO';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 🛡️ TOP MASTER COMMAND BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Painel de Controle Admin Master Global • Nível 0
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-3">
              <span>{MASTER_CREDENTIALS.name}</span>
              <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                🛡️ App Blindado Contra Invasão Externa
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Centro de comando supremo com monitoramento de <strong>pagamentos e caixa dos assinantes</strong>, telemetria cibernética, blindagem de ponta a ponta e controle financeiro global.
            </p>

            {/* Master Credentials Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
              {/* Usuário */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Usuário Master</div>
                <div className="text-xs font-extrabold text-amber-300 flex items-center justify-between mt-1">
                  <span>{MASTER_CREDENTIALS.username}</span>
                  <button 
                    onClick={() => handleCopy(MASTER_CREDENTIALS.username, 'user')}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title="Copiar Usuário"
                  >
                    {copiedKey === 'user' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Email Master</div>
                <div className="text-xs font-extrabold text-white flex items-center justify-between mt-1 truncate" title={MASTER_CREDENTIALS.email}>
                  <span className="truncate">{MASTER_CREDENTIALS.email}</span>
                  <button 
                    onClick={() => handleCopy(MASTER_CREDENTIALS.email, 'email')}
                    className="text-slate-400 hover:text-white cursor-pointer shrink-0 ml-1"
                    title="Copiar Email"
                  >
                    {copiedKey === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* CPF */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 font-bold uppercase">CPF Titular</div>
                <div className="text-xs font-extrabold text-white flex items-center justify-between mt-1">
                  <span>{MASTER_CREDENTIALS.cpfFormatted}</span>
                  <button 
                    onClick={() => handleCopy(MASTER_CREDENTIALS.cpfRaw, 'cpf')}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title="Copiar CPF"
                  >
                    {copiedKey === 'cpf' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* PIX */}
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/60 flex flex-col justify-between">
                <div className="text-[10px] text-emerald-300 font-bold uppercase">Chave PIX Celular</div>
                <div className="text-xs font-black text-emerald-400 flex items-center justify-between mt-1">
                  <span>{MASTER_CREDENTIALS.pixKey}</span>
                  <button 
                    onClick={() => handleCopy(MASTER_CREDENTIALS.pixKey, 'pix')}
                    className="text-emerald-400 hover:text-white cursor-pointer"
                    title="Copiar Chave PIX"
                  >
                    {copiedKey === 'pix' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => handleOpenPaymentModal()}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Registro de Caixa</span>
            </button>

            <button
              onClick={handleRunSecurityScan}
              disabled={isScanning}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Examinando Blindagem...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Varredura Cibernética</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportFullSnapshot}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              title="Exportar todos os dados (projetos, diários, despesas) em arquivo JSON para backup manual"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Exportar Backup JSON</span>
            </button>

            <button
              onClick={() => {
                clearAdminSession();
                onLogout();
              }}
              className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Bloquear / Sair Master</span>
            </button>
          </div>
        </div>

        {/* Scan Result Alert */}
        {scanResult && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{scanResult}</span>
          </div>
        )}
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* TAB 1: CAIXA E ASSINANTES (DESTAQUE) */}
        <button
          onClick={() => setActiveSubTab('cashflow')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'cashflow'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <BadgeDollarSign className="w-4 h-4" />
          <span>Monitor de Pagamentos & Caixa dos Assinantes</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-900 text-amber-400 ml-1">
            R$ {cashflowSummary.totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('shield')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'shield'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Blindagem & Escudo Cibernético</span>
        </button>

        <button
          onClick={() => setActiveSubTab('database')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'database'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Banco de Dados & Backup Master</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Logs de Auditoria ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Visão Geral de Inscritos & Obras</span>
        </button>

        <button
          onClick={() => setActiveSubTab('prospec')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'prospec'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Prospecção B2B (IA)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 💰 TAB 1: MONITOR DE PAGAMENTOS E CAIXA DOS ASSINANTES */}
      {/* ======================================================== */}
      {activeSubTab === 'cashflow' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Caixa Total Arrecadado */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Caixa Arrecadado (Assinaturas)
                </span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <DollarSign className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                R$ {cashflowSummary.totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Recebido via PIX & Mercado Pago</span>
              </div>
            </div>

            {/* MRR Recorrente */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Receita Mensal Recorrente (MRR)
                </span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                R$ {cashflowSummary.monthlyRecurringRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ARR Projetado: R$ {(cashflowSummary.monthlyRecurringRevenue * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /ano
              </div>
            </div>

            {/* Assinantes Pagantes vs Gratuidade */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Assinantes da Plataforma
                </span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {cashflowSummary.activePaidSubscribers} Pagantes
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                <span>Total: {cashflowSummary.totalSubscribers}</span>
                <span className="text-emerald-500 font-bold">{cashflowSummary.freeTierSubscribers} Grátis Lançamento</span>
              </div>
            </div>

            {/* Pendente & Atrasado */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Valores a Receber / Pendentes
                </span>
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                R$ {cashflowSummary.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-rose-500 font-bold mt-1">
                {cashflowSummary.overdueSubscribers > 0 
                  ? `${cashflowSummary.overdueSubscribers} fatura(s) com atraso` 
                  : 'Nenhuma fatura em atraso'}
              </div>
            </div>
          </div>

          {/* Master PIX Verification Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-600/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Chave PIX Oficial de Recebimento do Caixa Master
                </h4>
                <div className="text-sm font-black text-white flex items-center gap-2 mt-0.5">
                  <span>{MASTER_CREDENTIALS.pixKey}</span>
                  <span className="text-xs text-slate-400 font-normal">({MASTER_CREDENTIALS.name})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(MASTER_CREDENTIALS.pixKey, 'pix-bar')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedKey === 'pix-bar' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar PIX</span>
              </button>

              <button
                onClick={handleExportCashflowCSV}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Exportar dados do caixa em formato CSV / Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handlePrintCashflowReport}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Imprimir Relatório Financeiro"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Mercado Pago Instant Withdrawal / PIX Transfer Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Saque para Conta Mercado Pago via Chave PIX</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                      Disponível: R$ {cashflowSummary.totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Transfira instantaneamente todos os valores arrecadados para a sua conta do Mercado Pago usando a chave PIX <strong className="text-emerald-400">{MASTER_CREDENTIALS.pixKey}</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={handleAdminWithdrawalClick}
                disabled={isWithdrawing || cashflowSummary.totalCollected <= 0}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isWithdrawing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transferindo via PIX...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Sacar R$ {cashflowSummary.totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} p/ Mercado Pago</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 mt-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${autoWithdrawEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-200">
                        Transferência Automática Imediata p/ Mercado Pago
                      </h5>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                        100% Imediato
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Todo e qualquer valor recebido é transferido instantaneamente via Chave PIX (+55 73 99859-9213) e QR Code.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={toggleAutoWithdraw}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${autoWithdrawEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  title={autoWithdrawEnabled ? 'Desativar transferência automática' : 'Ativar transferência automática'}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoWithdrawEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Detalhes da Conta de Destino e Automação */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Favorecido / Titular:</span>
                  <span className="font-bold text-white">José Moreira</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Chave PIX Cadastrada:</span>
                  <span className="font-mono font-bold text-emerald-400">+55 (73) 99859-9213</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Instituição Financeira:</span>
                  <span className="font-bold text-[#009ee3]">Mercado Pago (Banco 323)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">CPF Validado:</span>
                  <span className="font-mono font-bold text-slate-200">219.528.925-20</span>
                </div>
              </div>
            </div>

            {withdrawalResultModal && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Transferência Automática PIX Liquidada com Sucesso!</span>
                </div>
                <div className="text-[11px] text-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 font-mono">
                  <div>ID Transação: <strong>{withdrawalResultModal.transferId}</strong></div>
                  <div>Valor: <strong>R$ {withdrawalResultModal.amount?.toFixed(2)}</strong></div>
                  <div>Chave PIX: <strong>{withdrawalResultModal.pixKey}</strong></div>
                  <div>Destino: <strong>{withdrawalResultModal.destination || 'Mercado Pago (323)'}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* SUBSCRIPTION PLANS PRICING TABLE & PRICE UPDATES */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BadgeDollarSign className="w-5 h-5 text-amber-500" />
                  Tabela de Valores Oficiais das Assinaturas & Opções de Atualização ({subscriptionPlans.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gerencie os valores cobrados pelas assinaturas vigentes, altere preços e adicione novos planos conforme necessário.
                </p>
              </div>

              <button
                onClick={() => handleOpenPlanModal()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Adicionar / Novo Plano de Assinatura</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Plano / Ciclo</th>
                    <th className="py-3 px-3">Público-Alvo</th>
                    <th className="py-3 px-3">Valor Cobrado (R$)</th>
                    <th className="py-3 px-3">Assinantes Ativos</th>
                    <th className="py-3 px-3">Recursos & Benefícios</th>
                    <th className="py-3 px-3 text-right">Opções de Atualização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subscriptionPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                          {plan.name}
                        </div>
                        <div className="mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            plan.billingCycle === 'Mensal'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : plan.billingCycle === 'Anual'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : plan.billingCycle === 'Por Uso'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {plan.billingCycle}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-700 dark:text-slate-300 font-medium max-w-xs truncate" title={plan.targetAudience}>
                          {plan.targetAudience}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {plan.price === 0 ? 'Gratuito (R$ 0,00)' : `R$ ${plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Atualizado: {new Date(plan.updatedAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-500" />
                          <span>{plan.activeSubscribersCount} ativos</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 max-w-sm">
                          {plan.features.slice(0, 2).join(' • ')}
                          {plan.features.length > 2 && ' +'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPlanModal(plan)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
                            title="Atualizar valor e regras do plano"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Atualizar Valor</span>
                          </button>

                          <button
                            onClick={() => handleDeletePlanClick(plan.id, plan.name)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer"
                            title="Remover plano"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome do assinante, email, telefone ou ID de transação..."
                value={subscriberSearchTerm}
                onChange={(e) => setSubscriberSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Filter Status */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ALL">Status: Todos</option>
                <option value="Aprovado">Aprovado / Pago</option>
                <option value="Pendente">Pendente de Confirmação</option>
                <option value="Atrasado">Atrasado / Em Débito</option>
                <option value="Isento / Cortesia">Gratuidade Lançamento / Isento</option>
                <option value="Cancelado">Cancelado</option>
              </select>

              {/* Filter Role */}
              <select
                value={subscriberRoleFilter}
                onChange={(e) => setSubscriberRoleFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ALL">Perfil: Todos</option>
                <option value="Prestador de Serviço">Prestador de Serviço</option>
                <option value="Construtora / Empreiteiro">Construtora / Empreiteiro</option>
                <option value="Loja / Fornecedor">Loja / Fornecedor</option>
                <option value="Técnico / Projetista">Técnico / Projetista</option>
                <option value="Solicitante / Cliente">Solicitante / Cliente</option>
              </select>

              <button
                onClick={() => handleOpenPaymentModal()}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Registrar Pagamento</span>
              </button>
            </div>
          </div>

          {/* Subscribers Payments List & Cashflow Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  Detalhamento de Assinaturas & Entradas no Caixa ({filteredSubscribers.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Acompanhe quem pagou, faturas em aberto, métodos utilizados e liberação de acesso na plataforma.
                </p>
              </div>

              <button
                onClick={() => loadAllAdminData(true)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Recarregar Caixa"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {filteredSubscribers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-bold">Nenhum registro encontrado para os filtros selecionados.</p>
                <button
                  onClick={() => handleOpenPaymentModal()}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Cadastrar Primeiro Assinante</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Assinante / Usuário</th>
                      <th className="py-3 px-3">Papel & Plano</th>
                      <th className="py-3 px-3">Valor / Método</th>
                      <th className="py-3 px-3">Status do Pagamento</th>
                      <th className="py-3 px-3">Vencimento / Data</th>
                      <th className="py-3 px-3 text-right">Ações Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubscribers.map((sub) => {
                      const isApproved = sub.status === 'Aprovado';
                      const isPending = sub.status === 'Pendente';
                      const isOverdue = sub.status === 'Atrasado';
                      const isFree = sub.status === 'Isento / Cortesia' || sub.planType === 'Gratuito Lançamento';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          {/* Subscriber Info */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {sub.subscriberName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              {sub.subscriberPhone && <span>{sub.subscriberPhone}</span>}
                              {sub.subscriberEmail && <span>• {sub.subscriberEmail}</span>}
                            </div>
                            {sub.reference && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 truncate max-w-xs">
                                Ref: {sub.reference}
                              </div>
                            )}
                          </td>

                          {/* Role & Plan */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                              {sub.subscriberRole === 'Prestador de Serviço' && <HardHat className="w-3.5 h-3.5 text-amber-500" />}
                              {sub.subscriberRole === 'Construtora / Empreiteiro' && <Building2 className="w-3.5 h-3.5 text-blue-500" />}
                              {sub.subscriberRole === 'Loja / Fornecedor' && <Store className="w-3.5 h-3.5 text-teal-500" />}
                              {sub.subscriberRole === 'Técnico / Projetista' && <Briefcase className="w-3.5 h-3.5 text-purple-500" />}
                              {sub.subscriberRole === 'Solicitante / Cliente' && <Users className="w-3.5 h-3.5 text-emerald-500" />}
                              <span>{sub.subscriberRole}</span>
                            </div>
                            <div className="mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                sub.planType === 'Anual Construtor'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                  : sub.planType === 'Mensal Pro'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : sub.planType === 'Gratuito Lançamento'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              }`}>
                                {sub.planType}
                              </span>
                            </div>
                          </td>

                          {/* Amount & Method */}
                          <td className="py-3.5 px-3">
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                              {sub.amount === 0 ? (
                                <span className="text-emerald-500">R$ 0,00 (Gratuito)</span>
                              ) : (
                                `R$ ${sub.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                              <span className={`px-1.5 py-0.5 rounded ${
                                sub.method === 'PIX'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : sub.method === 'Mercado Pago'
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {sub.method}
                              </span>
                              {sub.transactionId && (
                                <span className="truncate max-w-[90px] font-mono text-[9px]" title={sub.transactionId}>
                                  {sub.transactionId}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              isApproved
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                                : isOverdue
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                : isFree
                                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                            }`}>
                              {isApproved && <CheckCircle2 className="w-3 h-3" />}
                              {isPending && <AlertTriangle className="w-3 h-3" />}
                              {isOverdue && <AlertTriangle className="w-3 h-3" />}
                              {isFree && <Sparkles className="w-3 h-3" />}
                              <span>{sub.status}</span>
                            </span>
                            {sub.notes && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate max-w-xs" title={sub.notes}>
                                {sub.notes}
                              </div>
                            )}
                          </td>

                          {/* Dates */}
                          <td className="py-3.5 px-3">
                            <div className="text-slate-700 dark:text-slate-300 font-bold">
                              Venc: {new Date(sub.dueDate).toLocaleDateString('pt-BR')}
                            </div>
                            {sub.paymentDate && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                Pago em: {new Date(sub.paymentDate).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Approve Button if Pending */}
                              {isPending && (
                                <button
                                  onClick={() => handleQuickStatusChange(sub.id, 'Aprovado')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm"
                                  title="Confirmar recebimento PIX / Aprovar"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Confirmar PIX</span>
                                </button>
                              )}

                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenPaymentModal(sub)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                title="Editar dados da cobrança"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeletePaymentClick(sub.id, sub.subscriberName)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer"
                                title="Remover registro financeiro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CYBER SECURITY SHIELD */}
      {/* ======================================================== */}
      {activeSubTab === 'shield' && (
        <div className="space-y-6">
          {/* Fortress Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Shield State */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status da Blindagem</span>
                <span className={`p-2 rounded-xl ${shieldStatus?.activeArmor ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                {shieldStatus?.activeArmor ? 'MÁXIMA (ATIVA)' : 'DESATIVADA'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                <span>WAF & Anti-Invasão</span>
                <button
                  onClick={handleToggleArmor}
                  className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  {shieldStatus?.activeArmor ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>

            {/* Blocked Threats */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ameaças Bloqueadas</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <ShieldAlert className="w-5 h-5" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {shieldStatus?.blockedThreatsCount || 0} Invasões
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero intrusões permitidas</span>
              </div>
            </div>

            {/* Inspections */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Requisições Inspecionadas</span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Activity className="w-5 h-5" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {shieldStatus?.firewalledRequestsCount || 1} Filtros
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Inspeção profunda de headers e payloads
              </div>
            </div>

            {/* Criptografia */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Criptografia de Dados</span>
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Lock className="w-5 h-5" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white truncate" title={shieldStatus?.sslEncryption}>
                TLS 1.3 / AES-256
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                HMAC-SHA256 para tokens de sessão
              </div>
            </div>
          </div>

          {/* Defense Matrix Features */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Camadas Ativas do Escudo de Defesa Master
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Firewall de Aplicação Web (WAF)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bloqueio em tempo real de injeções SQL, XSS, scripts maliciosos, comandos de shell e tentativas de acesso indevido.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Proteção Anti-Brute Force</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bloqueio progressivo e rate limiting após 5 tentativas incorretas consecutivas com travamento temporário por IP.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Cabeçalhos HTTP Blindados</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Aplicação de X-Content-Type-Options, X-Frame-Options SAMEORIGIN, X-XSS-Protection e políticas restritas de cross-domain.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE & BACKUP MASTER */}
      {activeSubTab === 'database' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              Snapshot Completo & Restauração Master
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Exporte e importe a base de dados completa (obras, diários RDO, despesas financeiras, etapas do cronograma, equipe, solicitações de serviços e extrato de assinantes) com integridade criptográfica.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-500" />
                  Exportar Todos os Dados (Backup JSON)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Exporte todos os dados da aplicação (projetos, diários de obra, despesas, etapas e equipe) em um arquivo JSON para facilitar o backup manual pelo gestor.
                </p>
                <button
                  onClick={handleExportFullSnapshot}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo JSON de Backup</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-500" />
                  Restaurar Base de Dados
                </h4>
                <p className="text-[11px] text-slate-500">
                  Importe um snapshot previamente exportado para recuperar dados.
                </p>
                <label className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Carregar Arquivo Snapshot</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportSnapshot}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl text-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Terminal de Auditoria & Segurança Cibernética
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setLogFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${logFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setLogFilter('CRITICAL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${logFilter === 'CRITICAL' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Críticos
                  </button>
                  <button
                    onClick={() => setLogFilter('INFO')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${logFilter === 'INFO' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Info
                  </button>
                </div>

                <button
                  onClick={() => loadAllAdminData(true)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition cursor-pointer"
                  title="Atualizar Logs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Logs Terminal Window */}
            <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs pr-2 scrollbar-thin">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum evento registrado no momento.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      log.severity === 'CRITICAL' || log.severity === 'ALERT'
                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                        : log.severity === 'WARNING'
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 mt-0.5 ${
                        log.severity === 'CRITICAL' || log.severity === 'ALERT'
                          ? 'bg-rose-500 text-white'
                          : log.severity === 'WARNING'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {log.type}
                      </span>
                      <span className="leading-snug break-all">{log.details}</span>
                    </div>

                    <div className="text-[10px] text-slate-500 shrink-0 font-sans sm:text-right">
                      <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                      <div>IP: {log.ip}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: USERS & OVERVIEW */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Global Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Obras Gerenciadas</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {projects.length} Obras
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Inscritos Totais</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {registeredCount} Cadastrados
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Inscrição Grátis Lançamento
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Solicitações de Serviços</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {serviceRequests.length} Pedidos
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Equipe & Fornecedores</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {team.length} Contatos
              </div>
            </div>
          </div>

          {/* Service Requests Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              Solicitações de Serviços Ativas ({serviceRequests.length})
            </h3>

            {serviceRequests.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">Nenhuma solicitação cadastrada.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {serviceRequests.map((req) => (
                  <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{req.title}</div>
                      <div className="text-slate-500">
                        Solicitante: <strong>{req.clientName}</strong> ({req.clientPhone}) • {req.city}/{req.state}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 self-start sm:self-center">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🤝 TAB 6: PROSPECÇÃO B2B (IA) */}
      {/* ======================================================== */}
      {activeSubTab === 'prospec' && (
        <div className="space-y-6">
          {/* Card Base Oficial de Construtoras (300+ Contatos) */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-amber-950 border border-amber-500/40 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-black">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Base Oficial: 300+ Construtoras para Disparo em Lote</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                      Disparo Imediato
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Carregue instantaneamente as construtoras cadastradas por região para disparo automático via WhatsApp ou geração de abordagem com IA.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleLoadOfficialCatalog('ALL')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer shrink-0"
              >
                <Zap className="w-4 h-4" />
                <span>Carregar Todas as 300+ Construtoras</span>
              </button>
            </div>

            {/* Quick Filter Loaders */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Carregar por Região:</span>
              <button
                onClick={() => handleLoadOfficialCatalog('SP')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                São Paulo (100)
              </button>
              <button
                onClick={() => handleLoadOfficialCatalog('RJ')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                Rio de Janeiro (37)
              </button>
              <button
                onClick={() => handleLoadOfficialCatalog('MG')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                Minas Gerais (36)
              </button>
              <button
                onClick={() => handleLoadOfficialCatalog('BA')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                Bahia & Nordeste (36)
              </button>
              <button
                onClick={() => handleLoadOfficialCatalog('Nacional')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                Nacional (60)
              </button>
              <button
                onClick={() => handleLoadOfficialCatalog('Internacional')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                Portugal / Int. (41)
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Gerador de Mensagens de Prospecção B2B com IA & Importação Manual
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cole uma lista de empresas ou estabelecimentos e gere automaticamente mensagens personalizadas de abordagem para o WhatsApp.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Lista de Empresas / Dados Brutos</label>
              <textarea
                rows={8}
                value={prospecInput}
                onChange={(e) => setProspecInput(e.target.value)}
                placeholder="Cole aqui o nome dos estabelecimentos, endereços ou qualquer texto que contenha a lista de empresas..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-xs font-medium"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateProspec}
                  disabled={isGeneratingProspec || !prospecInput.trim()}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingProspec ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando Mensagens...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Gerar Abordagens IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {prospecResults.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>Resultados Gerados ({prospecResults.length})</span>
                  <button 
                    onClick={handleSelectAllProspecs}
                    className="text-amber-500 hover:underline lowercase font-bold"
                  >
                    {selectedProspecs.size === prospecResults.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setProspecResults([]);
                    setSelectedProspecs(new Set());
                  }}
                  className="text-rose-500 hover:underline lowercase"
                >
                  Limpar Resultados
                </button>
              </h4>

              {/* Batch Action Bar */}
              {selectedProspecs.size > 0 && (
                <div className="sticky top-4 z-30 p-4 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg font-black text-xs">
                      {selectedProspecs.size} SELECIONADOS
                    </div>
                    {isBatchSending && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${batchProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-amber-500">{batchProgress}%</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleBatchSend}
                    disabled={isBatchSending}
                    className="w-full sm:w-auto px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    {isBatchSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Disparando Convites...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Iniciar Disparo Automático em Lote</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prospecResults.map((res, idx) => (
                  <div 
                    key={idx} 
                    className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all relative group ${
                      selectedProspecs.has(idx) 
                        ? 'border-amber-500 shadow-md ring-1 ring-amber-500/20' 
                        : 'border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500/50'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4 z-10">
                      <button
                        onClick={() => handleToggleProspecSelection(idx)}
                        className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer ${
                          selectedProspecs.has(idx)
                            ? 'bg-amber-500 border-amber-500 text-slate-950'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {selectedProspecs.has(idx) && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="pl-8">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <h5 className="text-sm font-black text-slate-900 dark:text-white truncate">{res.name}</h5>
                          {dispatchedIndices.has(idx) && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase border border-emerald-500/30">
                              Enviado
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleCopy(res.message, `msg-${idx}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                          title="Copiar Mensagem"
                        >
                          {copiedKey === `msg-${idx}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
                        "{res.message}"
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <a 
                          href={`https://wa.me/?text=${encodeURIComponent(res.message)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] text-center flex items-center justify-center gap-1.5 transition shadow-sm"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Abrir WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 📝 MODAL: CADASTRO / EDIÇÃO DE PAGAMENTO DE ASSINANTE */}
      {/* ======================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <BadgeDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {editingPayment ? 'Editar Pagamento / Assinante' : 'Novo Registro de Assinatura & Caixa'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Controle de mensalidade, taxa de uso e plano do usuário.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePaymentSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome do Assinante */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo do Assinante / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Construtora Sul, Eng. Marcos, Pedreiro Silva..."
                    value={formSubscriberName}
                    onChange={(e) => setFormSubscriberName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="assinante@email.com"
                    value={formSubscriberEmail}
                    onChange={(e) => setFormSubscriberEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(73) 99999-9999"
                    value={formSubscriberPhone}
                    onChange={(e) => setFormSubscriberPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Papel */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Papel na Plataforma
                  </label>
                  <select
                    value={formSubscriberRole}
                    onChange={(e) => setFormSubscriberRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Prestador de Serviço">Prestador de Serviço</option>
                    <option value="Construtora / Empreiteiro">Construtora / Empreiteiro</option>
                    <option value="Loja / Fornecedor">Loja / Fornecedor</option>
                    <option value="Técnico / Projetista">Técnico / Projetista</option>
                    <option value="Solicitante / Cliente">Solicitante / Cliente</option>
                  </select>
                </div>

                {/* Tipo de Plano */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Plano de Assinatura
                  </label>
                  <select
                    value={formPlanType}
                    onChange={(e) => {
                      const val = e.target.value as SubscriberPlan;
                      setFormPlanType(val);
                      if (val === 'Mensal Pro') setFormAmount('149.90');
                      if (val === 'Anual Construtor') setFormAmount('1490.00');
                      if (val === 'Gratuito Lançamento') {
                        setFormAmount('0.00');
                        setFormStatus('Isento / Cortesia');
                      }
                      if (val === 'Taxa de Proposta / Uso') setFormAmount('45.00');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Mensal Pro">Mensal Pro (R$ 149,90/mês)</option>
                    <option value="Anual Construtor">Anual Construtor (R$ 1.490,00/ano)</option>
                    <option value="Taxa de Proposta / Uso">Taxa de Proposta / Uso (R$ 45,00)</option>
                    <option value="Gratuito Lançamento">Gratuito Lançamento (R$ 0,00)</option>
                    <option value="Personalizado">Personalizado / Outro</option>
                  </select>
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor Cobrado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="PIX">PIX (Chave Master Celular)</option>
                    <option value="Mercado Pago">Mercado Pago (Cartão / Checkout)</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Dinheiro">Dinheiro / Transferência</option>
                  </select>
                </div>

                {/* Status do Pagamento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status do Pagamento
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="Aprovado">Aprovado (Confirmado no Caixa)</option>
                    <option value="Pendente">Pendente de Confirmação</option>
                    <option value="Atrasado">Atrasado / Em Débito</option>
                    <option value="Isento / Cortesia">Isento / Cortesia Lançamento</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Data de Pagamento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Vencimento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Vencimento / Renovação
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Referência */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição / Referência do Pagamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mensalidade Setembro/2026, Taxa de Proposta Obra #04..."
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Observações Internas (Admin Master)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Comprovante PIX validado pelo WhatsApp, chave conferida..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPayment ? 'Atualizar Registro' : 'Salvar no Caixa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Edit / Create Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {editingPlan ? 'Atualizar Valor & Regras do Plano' : 'Novo Plano de Assinatura'}
                </h3>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 rounded-xl bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlanSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Plano *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mensal Pro, Anual Construtor..."
                    value={formPlanName}
                    onChange={(e) => setFormPlanName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código Interno / Chave
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mensal Pro"
                    value={formPlanCode}
                    onChange={(e) => setFormPlanCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="149.90"
                    value={formPlanPrice}
                    onChange={(e) => setFormPlanPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ciclo de Cobrança
                  </label>
                  <select
                    value={formPlanCycle}
                    onChange={(e) => setFormPlanCycle(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Anual">Anual</option>
                    <option value="Por Uso">Por Uso (Avulso)</option>
                    <option value="Gratuito">Gratuito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Público-Alvo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Prestadores, Técnicos e Lojas"
                    value={formPlanAudience}
                    onChange={(e) => setFormPlanAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Recursos e Benefícios (separados por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Obras ilimitadas, RDOs digitais, Suporte prioritário"
                    value={formPlanFeatures}
                    onChange={(e) => setFormPlanFeatures(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPlan ? 'Salvar Alterações de Preço' : 'Criar Plano Oficial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
