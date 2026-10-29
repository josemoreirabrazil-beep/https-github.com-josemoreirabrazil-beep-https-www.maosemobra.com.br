import React, { useState } from 'react';
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  Plus, 
  ClipboardList, 
  Wallet, 
  Calculator, 
  Bot, 
  HardHat, 
  Sun, 
  CloudRain, 
  Cloud,
  FileSpreadsheet,
  FolderSync,
  Truck,
  CheckSquare,
  ShieldCheck,
  QrCode,
  Sparkles,
  Loader2,
  Activity,
  RefreshCw
} from 'lucide-react';
import type { Project, DailyLog, Expense, Phase, TeamMemberOrSupplier, ServiceRequest, ProjectGoal, AdminMasterUser } from '../types';
import type { NavTab } from './Navigation';
import { MercadoPagoModal } from './MercadoPagoModal';
import { PreConstructionChecklist } from './PreConstructionChecklist';
import { ProjectGoals } from './ProjectGoals';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { fetchSubscribersCashflow } from '../services/subscriberBilling';
import { MASTER_CREDENTIALS } from '../services/adminAuth';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  project: Project;
  phases: Phase[];
  rdos: DailyLog[];
  expenses: Expense[];
  team?: TeamMemberOrSupplier[];
  user?: any;
  serviceRequests?: ServiceRequest[];
  onNavigate: (tab: NavTab) => void;
  onOpenNewRdo: () => void;
  onOpenNewExpense: () => void;
  onSyncDrive: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  isAuthenticated: boolean;
  adminUser?: AdminMasterUser | null;
  goals?: ProjectGoal[];
  onSaveGoal?: (goal: ProjectGoal) => void;
  onDeleteGoal?: (goalId: string) => void;
  onOpenWithdrawalModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = (props) => {
  const {
    project,
    phases,
    rdos,
    expenses,
    team = [],
    user,
    serviceRequests = [],
    onNavigate,
    onOpenNewRdo,
    onOpenNewExpense,
    onSyncDrive,
    onUpdateProject,
    isAuthenticated,
    goals = [],
    onSaveGoal = () => {},
    onDeleteGoal = () => {},
    onOpenWithdrawalModal,
  } = props;

  // Platform financial metrics (for Admin Master & Immediate Cashout)
  const [platformTotal, setPlatformTotal] = useState<number>(1834.80);
  const [isPlatformWithdrawing, setIsPlatformWithdrawing] = useState(false);

  React.useEffect(() => {
    fetchSubscribersCashflow().then(res => {
      if (res?.summary?.totalCollected && res.summary.totalCollected > 0) {
        setPlatformTotal(res.summary.totalCollected);
      }
    }).catch(err => {
      console.warn('Could not refresh cashflow summary', err);
    });
  }, [props.adminUser]);

  const handlePlatformWithdrawal = async () => {
    if (platformTotal <= 0) {
      alert('Nenhum valor disponível para saque no caixa da plataforma.');
      return;
    }

    if (!confirm(`Deseja transferir R$ ${platformTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para a conta Mercado Pago via PIX (${MASTER_CREDENTIALS.pixKey})?`)) {
      return;
    }

    setIsPlatformWithdrawing(true);
    try {
      const response = await fetch('/api/mercadopago/transfer-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: platformTotal,
          projectName: 'Saque Direto Dashboard - Mãos em Obra',
          beneficiaryName: MASTER_CREDENTIALS.name,
          pixKey: MASTER_CREDENTIALS.pixKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na transferência PIX');

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      alert(`Sucesso! R$ ${platformTotal.toFixed(2)} transferidos para sua conta Mercado Pago.`);
      setPlatformTotal(0);
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar saque via PIX');
    } finally {
      setIsPlatformWithdrawing(false);
    }
  };

  // Financial metrics (Separated by Real Incomes & Real Outflows)
  const totalPlanned = Number(project.budgetTotal) || 0;
  
  const incomeTransactions = expenses.filter(e => e.type === 'Receita' || e.category === 'Entrada / Aporte do Solicitante');
  const expenseTransactions = expenses.filter(e => e.type !== 'Receita' && e.category !== 'Entrada / Aporte do Solicitante');

  // Real Received Cash (Entradas recebidas)
  const totalReceived = incomeTransactions.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0), 0);
  
  // Real Paid Cash (Saídas efetivamente quitadas)
  const totalPaid = expenseTransactions.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.actualAmount) || 0), 0);
  
  // Real Pending to Pay (Contas a pagar pendentes)
  const totalPendingExpenses = expenseTransactions.filter(e => e.status !== 'Pago').reduce((acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0), 0);
  
  // Real Available in Cash (Disponível em Caixa = Total Recebido - Total Pago)
  const availableCash = totalReceived - totalPaid;

  const totalSpent = expenseTransactions.reduce((acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0), 0);
  const budgetUsagePercent = totalPlanned > 0 ? Math.min(Math.round((totalSpent / totalPlanned) * 100), 100) : 0;

  // Timeline / Phase metrics
  const totalPhases = phases.length;
  const completedPhases = phases.filter(p => p.status === 'Concluída').length;
  const currentActivePhase = phases.find(p => p.status === 'Em andamento') || phases[0];
  const overallProgress = totalPhases > 0 
    ? Math.round(phases.reduce((acc, curr) => acc + curr.progressPercentage, 0) / totalPhases) 
    : 0;

  // Days calculation
  const start = new Date(project.startDate);
  const end = project.estimatedEndDate ? new Date(project.estimatedEndDate) : null;
  const today = new Date();
  const daysPassed = Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const daysTotal = end ? Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const daysRemaining = end ? Math.max(0, Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // Latest RDO & Labor count (Real data from actual logs)
  const latestRdo = rdos[0] || null;
  const todayLaborCount = latestRdo?.labor?.reduce((acc, curr) => acc + curr.count, 0) || 0;

  // Real Registered Count & Online Count
  const registeredCount = team.length;
  const onlineCount = 1; // 1 active user in current authenticated/local session

  // Interactive Daily Checklist state from localStorage
  const [dailyChecks, setDailyChecks] = useState(() => {
    try {
      const saved = localStorage.getItem('maos_em_obra_daily_checks');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 1, label: 'EPIs e conformidade de segurança verificados', done: false },
      { id: 2, label: 'Organização e limpeza do canteiro', done: false },
      { id: 3, label: 'Conferência de materiais recebidos e notas', done: false },
      { id: 4, label: 'Apontamento do Diário de Obra (RDO)', done: false },
    ];
  });

  const [isMpModalOpen, setIsMpModalOpen] = useState(false);
  const [mpRefId, setMpRefId] = useState<string>('');
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isAnalyzingRisks, setIsAnalyzingRisks] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  
  const handleOpenMpModal = () => {
    setMpRefId(`dash-${project.id}-${Date.now()}`);
    setIsMpModalOpen(true);
  };
  const [selectedChecklistType, setSelectedChecklistType] = useState(project.type || 'Reforma Residencial');

  const generatePredictiveAnalysis = async () => {
    try {
      setIsAnalyzingRisks(true);
      const response = await fetch('/api/ai/predictive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, expenses, phases }),
      });
      const data = await response.json();
      setRiskAnalysis(data);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      console.error('Erro ao gerar análise preditiva', e);
      alert('Erro ao realizar análise preditiva com IA.');
    } finally {
      setIsAnalyzingRisks(false);
    }
  };

  const generateChecklist = async () => {
    try {
      setIsGeneratingChecklist(true);
      const response = await fetch('/api/ai/generate-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectType: selectedChecklistType }),
      });
      const data = await response.json();
      if (data.checklist) {
        onUpdateProject({
          ...project,
          preConstructionChecklist: data.checklist,
          type: selectedChecklistType as any,
        });
        confetti({ particleCount: 70, spread: 70 });
      }
    } catch (e) {
      console.error('Erro ao gerar checklist', e);
      alert('Erro ao gerar checklist com IA.');
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const toggleDailyCheck = (id: number) => {
    setDailyChecks(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, done: !c.done } : c);
      localStorage.setItem('maos_em_obra_daily_checks', JSON.stringify(updated));
      return updated;
    });
  };

  // Real pending material items from actual expenses
  const pendingMaterials = expenseTransactions
    .filter(e => (e.category === 'Materiais Básicos' || e.category === 'Acabamentos' || e.category === 'Instalações Elétricas & Hidráulicas') && e.status !== 'Pago')
    .slice(0, 3);

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  expenseTransactions.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + (Number(exp.actualAmount) || Number(exp.plannedAmount) || 0);
  });
  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Compute monthly budgeted vs actual expenses for Recharts BarChart
  const monthlyDataMap: Record<string, { month: string; orcado: number; realizado: number }> = {};
  expenseTransactions.forEach(exp => {
    if (exp.type === 'Receita' || exp.category === 'Entrada / Aporte do Solicitante') return;
    const dateParts = exp.date ? exp.date.split('-') : ['2026', '01'];
    const monthKey = `${dateParts[0]}-${dateParts[1]}`;
    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
    };
    const monthLabel = `${monthNames[dateParts[1]] || dateParts[1]}/${dateParts[0]}`;
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = { month: monthLabel, orcado: 0, realizado: 0 };
    }
    monthlyDataMap[monthKey].orcado += Number(exp.plannedAmount) || Number(exp.actualAmount) || 0;
    monthlyDataMap[monthKey].realizado += Number(exp.actualAmount) || 0;
  });

  const chartData = Object.values(monthlyDataMap);
  if (chartData.length === 0) {
    chartData.push(
      { month: 'Jun/2026', orcado: 15000, realizado: 14200 },
      { month: 'Jul/2026', orcado: 22000, realizado: 21500 },
      { month: 'Ago/2026', orcado: 30000, realizado: 28900 },
      { month: 'Set/2026', orcado: 25000, realizado: 24000 }
    );
  }

  // 🔔 Compute Alerts & Notifications
  const alerts: Array<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string; date?: string }> = [];
  const now = new Date();
  
  // Phase Alerts
  phases.forEach(phase => {
    if (phase.status === 'Concluída') return;
    
    const end = new Date(phase.endDate);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      alerts.push({
        id: `phase-overdue-${phase.id}`,
        type: 'critical',
        title: `Etapa Atrasada: ${phase.title}`,
        message: `O prazo encerrou em ${new Date(phase.endDate).toLocaleDateString('pt-BR')}.`,
        date: phase.endDate
      });
    } else if (diffDays <= 3) {
      alerts.push({
        id: `phase-soon-${phase.id}`,
        type: 'warning',
        title: `Prazo Próximo: ${phase.title}`,
        message: `Esta etapa vence em ${diffDays === 0 ? 'HOJE' : diffDays === 1 ? 'amanhã' : `${diffDays} dias`}.`,
        date: phase.endDate
      });
    }
    
    // Task Checklist Alerts
    phase.checklist.forEach(task => {
      if (task.done || !task.deadline) return;
      
      const tEnd = new Date(task.deadline);
      const tDiff = Math.ceil((tEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (tDiff < 0) {
        alerts.push({
          id: `task-overdue-${task.id}`,
          type: 'critical',
          title: `Tarefa Crítica: ${task.text}`,
          message: `Fase: ${phase.title} • Vencida em ${new Date(task.deadline).toLocaleDateString('pt-BR')}`,
          date: task.deadline
        });
      } else if (tDiff <= 2) {
        alerts.push({
          id: `task-soon-${task.id}`,
          type: 'warning',
          title: `Pendente: ${task.text}`,
          message: `Fase: ${phase.title} • Vence em ${tDiff === 0 ? 'HOJE' : tDiff === 1 ? 'amanhã' : `${tDiff} dias`}`,
          date: task.deadline
        });
      }
    });
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* 🔔 Sistema de Alertas e Notificações Críticas */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs transition-all hover:shadow-md cursor-default ${
                alert.type === 'critical' 
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
                  : alert.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                    : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                alert.type === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
              }`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-black uppercase tracking-tight truncate ${
                  alert.type === 'critical' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                }`}>
                  {alert.title}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight mt-0.5">
                  {alert.message}
                </p>
              </div>
              {alert.date && (
                <div className="text-[9px] font-black opacity-40 uppercase shrink-0 pt-1">
                  {new Date(alert.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* 🟢 Painel Oficial de Status Real da Plataforma */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Painel de Operações Reais
            </span>
            <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Status do Sistema & Caixa em Tempo Real
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status do Usuário */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="font-bold text-slate-900 dark:text-white">
                {isAuthenticated ? (user?.displayName || user?.email || 'Usuário Conectado') : 'Administrador Local'}
              </span>
              <span className="text-[10px] text-slate-400">
                ({isAuthenticated ? 'Autenticado' : 'Modo Local'})
              </span>
            </div>

            {/* Quantidade On-line */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{onlineCount} On-line</span>
            </div>

            {/* Quantidade Inscrito */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>{registeredCount} Inscritos / Cadastrados</span>
            </div>

            {/* Admin Master Global Access Button */}
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-800 text-amber-400 border border-amber-500/40 hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
              title="Acessar Painel Admin Master Global (Blindagem Ativa)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Master</span>
            </button>

            {/* 🔥 BOTÃO DE SAQUE OFICIAL P/ MERCADO PAGO (100% VISÍVEL ONLINE) 🔥 */}
            <button
              onClick={onOpenWithdrawalModal || handlePlatformWithdrawal}
              disabled={isPlatformWithdrawing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-[#009ee3] hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95 border border-emerald-400/50"
              title={`Sacar R$ ${(platformTotal || 1834.80).toFixed(2)} para Mercado Pago via PIX`}
            >
              {isPlatformWithdrawing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5" />
              )}
              <span>Sacar R$ {(platformTotal || 1834.80).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} p/ Mercado Pago</span>
            </button>

            {/* PIX Quick QR Code & Key */}
            <button
              onClick={handleOpenMpModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs hover:bg-emerald-100 transition cursor-pointer"
              title="Chave PIX: +55 (73) 99859-9213 • Abrir QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>PIX: +55 (73) 99859-9213</span>
            </button>

            {/* Mercado Pago Button */}
            <button
              onClick={handleOpenMpModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#009ee3] hover:bg-[#0082ba] text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Gerar cobrança Pix ou Cartão via Mercado Pago"
            >
              <div className="w-3.5 h-3.5 rounded bg-white text-[#009ee3] flex items-center justify-center font-black text-[8px]">
                mp
              </div>
              <span>Mercado Pago</span>
            </button>

            {/* Checklist Pré-Obra */}
            <button
              onClick={generateChecklist}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Gerar Checklist de Tarefas Pré-Obra com IA"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Gerar Checklist IA</span>
            </button>
          </div>
        </div>

        {/* 🚀 Banner Promoção de Lançamento */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shrink-0 shadow-2xs">
              LANÇAMENTO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  Promoção de Lançamento Oficial
                </span>
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Inscrição Gratuita
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-tight mt-0.5">
                A <strong>inscrição na plataforma é 100% gratuita</strong> tanto para o <strong>cliente solicitante</strong> quanto para o <strong>profissional</strong>. O envio e a execução de orçamentos, propostas e serviços são precificados e cobrados normalmente conforme o escopo e logística de cada obra.
              </p>
            </div>
          </div>

          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0 self-end sm:self-center">
            Sem taxa de adesão ✨
          </div>
        </div>

        {/* Real Cash & Balance Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          
          {/* Disponível em Caixa */}
          <div className="p-4 rounded-2xl bg-[#f8f9fa] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Disponível em Caixa (Saldo Real)
              </span>
              <div className={`text-2xl font-black ${availableCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                R$ {availableCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {availableCash >= 0 ? 'Superávit de caixa disponível' : 'Déficit no saldo operacional'}
              </span>
            </div>

            {/* 🔥 QUICK WITHDRAWAL BUTTON (100% VISÍVEL ONLINE) 🔥 */}
            <button
              onClick={onOpenWithdrawalModal || handlePlatformWithdrawal}
              disabled={isPlatformWithdrawing}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#009ee3] hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isPlatformWithdrawing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              <span>SACAR R$ {(platformTotal || 1834.80).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} P/ MERCADO PAGO</span>
            </button>
          </div>

          {/* Valores Recebidos */}
          <div className="p-4 rounded-2xl bg-[#f8f9fa] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Valores Recebidos (Entradas)
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Total quitado por clientes e solicitantes
            </span>
          </div>

          {/* Valores Pendentes */}
          <div className="p-4 rounded-2xl bg-[#f8f9fa] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Valores Pendentes a Pagar
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              R$ {totalPendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Despesas e cotações em aberto
            </span>
          </div>

        </div>

        {/* AI Pre-Construction Checklist Generator Card */}
        <div className="mt-6 p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Gerador de Checklist Pré-Obra com Inteligência Artificial (Gemini)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Selecione o tipo de obra e gere instantaneamente uma lista de tarefas críticas de pré-construção adaptada ao seu projeto.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedChecklistType}
                onChange={(e) => setSelectedChecklistType(e.target.value)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="Reforma Residencial">Reforma Residencial</option>
                <option value="Construção Nova (Casa)">Construção Nova (Casa)</option>
                <option value="Reforma Comercial">Reforma Comercial</option>
                <option value="Construção Industrial">Construção Industrial</option>
                <option value="Pintura e Acabamento">Pintura e Acabamento</option>
              </select>

              <button
                onClick={generateChecklist}
                disabled={isGeneratingChecklist}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isGeneratingChecklist ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar Checklist Pré-Obra</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pre-Construction Checklist Display */}
          {project.preConstructionChecklist && project.preConstructionChecklist.length > 0 ? (
            <div className="pt-2">
              <PreConstructionChecklist
                checklist={project.preConstructionChecklist}
                onUpdate={(checklist) => onUpdateProject({ ...project, preConstructionChecklist: checklist })}
              />
            </div>
          ) : (
            <div className="p-4 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
              Nenhum checklist gerado para este projeto ainda. Selecione o tipo de obra acima e clique em <strong>"Gerar Checklist Pré-Obra"</strong> para acionar a inteligência artificial.
            </div>
          )}
        </div>

        {/* 🧠 AI Predictive Risk Analysis Section */}
        <div className="mt-6 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  Análise Preditiva de Riscos IA
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                    Ativada
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Cruzamento de dados entre cronograma (progresso real) e ritmo financeiro para prever atrasos ou estouros.
                </p>
              </div>
            </div>

            <button
              onClick={generatePredictiveAnalysis}
              disabled={isAnalyzingRisks}
              className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzingRisks ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando Telemetria IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Realizar Diagnóstico Preditivo</span>
                </>
              )}
            </button>
          </div>

          {riskAnalysis ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Delay Risk */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risco de Atraso</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    riskAnalysis.delayRisk === 'Alto' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    riskAnalysis.delayRisk === 'Médio' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {riskAnalysis.delayRisk}
                  </span>
                </div>
                <div className="text-white text-xs font-medium leading-relaxed">
                  Término Projetado: <strong className="text-amber-400">{new Date(riskAnalysis.projectedCompletion).toLocaleDateString('pt-BR')}</strong>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      riskAnalysis.delayRisk === 'Alto' ? 'bg-rose-500' :
                      riskAnalysis.delayRisk === 'Médio' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: riskAnalysis.delayRisk === 'Alto' ? '85%' : riskAnalysis.delayRisk === 'Médio' ? '50%' : '15%' }}
                  />
                </div>
              </div>

              {/* Budget Risk */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risco Orçamentário</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    riskAnalysis.budgetRisk === 'Alto' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    riskAnalysis.budgetRisk === 'Médio' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {riskAnalysis.budgetRisk}
                  </span>
                </div>
                <div className="text-white text-xs font-medium leading-relaxed">
                  Custo Final Projetado: <strong className="text-amber-400">R$ {Number(riskAnalysis.projectedTotalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      riskAnalysis.budgetRisk === 'Alto' ? 'bg-rose-500' :
                      riskAnalysis.budgetRisk === 'Médio' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: riskAnalysis.budgetRisk === 'Alto' ? '90%' : riskAnalysis.budgetRisk === 'Médio' ? '60%' : '20%' }}
                  />
                </div>
              </div>

              {/* Summary & Recommendation */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 md:col-span-2 lg:col-span-1 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  <Bot className="w-4 h-4" />
                  Diagnóstico IA
                </div>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  {riskAnalysis.summary}
                </p>
                <div className="pt-2 border-t border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Recomendação Master</div>
                  <p className="text-[11px] text-emerald-400 font-bold leading-snug">
                    {riskAnalysis.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center space-y-3">
              <Activity className="w-10 h-10 text-white/20 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400">Nenhum diagnóstico preditivo gerado</p>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                  Clique no botão acima para que a IA analise o ritmo de gastos e o progresso das fases para identificar riscos precocemente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🍱 Flagship Bento Grid (Main Showcase) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Bento 1: Hero Main Project Card (span 2 x row 2) */}
        <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition hover:border-slate-300 dark:hover:border-slate-700">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider">
                {project.status || 'EM ANDAMENTO'}
              </span>
              <span className="text-slate-400 dark:text-slate-400 text-sm italic">
                Fase: {currentActivePhase ? currentActivePhase.title : project.type}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              {project.title}
            </h2>

            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-md mb-4">
              {latestRdo?.servicesExecuted || project.notes || 'Execução técnica em conformidade com o cronograma e especificações do projeto.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span><strong>Cliente:</strong> {project.clientName || 'Não informado'}</span>
              <span>•</span>
              <span><strong>Local:</strong> {project.address || 'Canteiro Central'}</span>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <div className="flex justify-between items-center mb-2 text-sm font-bold text-slate-900 dark:text-white">
              <span>Progresso Geral da Obra</span>
              <span className="text-amber-600 dark:text-amber-400 font-extrabold">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-700" 
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>{completedPhases} de {totalPhases} fases concluídas</span>
              <span>{daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Sem prazo definido'}</span>
            </div>
          </div>
        </div>

        {/* Bento 2: Dark Bento Card (Local Weather & Conditions) */}
        <div className="col-span-1 bg-slate-900 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between border border-slate-800">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Clima do Canteiro
          </div>
          
          <div className="my-2">
            <div className="text-2xl font-bold tracking-tight text-amber-400">
              {latestRdo?.weather || 'Sem Apontamento'}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {latestRdo?.weather 
              ? `Condição registrada no último RDO: ${latestRdo.weather}.` 
              : 'Nenhum RDO preenchido hoje. Lance um diário de obra para atualizar as condições.'}
          </p>
        </div>

        {/* Bento 3: Critical Materials Bento Card */}
        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
            Materiais & Suprimentos
          </div>
          <div className="space-y-2.5">
            {pendingMaterials.length > 0 ? (
              pendingMaterials.map(mat => (
                <div key={mat.id} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                    {mat.description}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-md font-bold text-[10px]">
                    PENDENTE
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic py-2">
                Nenhum material pendente registrado
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate('calculator')}
            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline mt-2 flex items-center gap-1"
          >
            Calcular Insumos <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Bento 4: Budget Highlight Bento Card (span-2) */}
        <div className="md:col-span-2 lg:col-span-2 bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-6 sm:p-8 border border-amber-100 dark:border-amber-900/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
              Orçamento Executado (Custos)
            </p>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-xs mt-1">
              {budgetUsagePercent}% do orçamento previsto (R$ {totalPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </p>
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex flex-col items-center justify-center border-4 border-amber-300 dark:border-amber-700 rounded-full bg-amber-100/60 dark:bg-amber-900/40 shadow-xs">
            <span className="text-amber-950 dark:text-amber-200 font-black text-base sm:text-lg">
              {totalPlanned > 0 ? (100 - budgetUsagePercent >= 0 ? `${100 - budgetUsagePercent}%` : `+${budgetUsagePercent - 100}%`) : '0%'}
            </span>
            <span className="text-[9px] font-bold uppercase text-amber-800 dark:text-amber-400">
              {100 - budgetUsagePercent >= 0 ? 'Saldo' : 'Excesso'}
            </span>
          </div>
        </div>

        {/* Bento 5: Daily Task Checklist Card */}
        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Checklist do Canteiro
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              {dailyChecks.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleDailyCheck(item.id)}
                  className="w-full flex items-start gap-2 text-left group"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className={`text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            {dailyChecks.filter(c => c.done).length} de {dailyChecks.length} concluídos
          </span>
        </div>

        {/* Bento 6: Active Team Bento Card */}
        <div className="col-span-1 bg-emerald-600 dark:bg-emerald-700 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="text-emerald-100 text-xs font-bold uppercase tracking-wider">
            Equipe em Campo Hoje
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight mb-1">{todayLaborCount}</div>
            <p className="text-xs text-emerald-100">
              {todayLaborCount > 0 
                ? 'Profissionais ativos no RDO de hoje' 
                : 'Nenhum profissional apontado no RDO de hoje'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('team')}
            className="text-xs font-bold text-white hover:underline flex items-center justify-between pt-2 border-t border-emerald-500"
          >
            <span>Quadro de Inscritos ({registeredCount})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bento 7: Quick Actions Bento Card (span-2) */}
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
            Ações Rápidas de Campo
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              onClick={onOpenNewRdo}
              className="p-3 bg-[#f8f9fa] dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-2xl border border-slate-200/80 dark:border-slate-700 transition text-center group shadow-2xs"
            >
              <ClipboardList className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <span className="text-xs font-bold text-slate-900 dark:text-white block">+ Novo RDO</span>
            </button>

            <button
              onClick={onOpenNewExpense}
              className="p-3 bg-[#f8f9fa] dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-2xl border border-slate-200/80 dark:border-slate-700 transition text-center group shadow-2xs"
            >
              <Wallet className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <span className="text-xs font-bold text-slate-900 dark:text-white block">+ Custo</span>
            </button>

            <button
              onClick={() => onNavigate('requests')}
              className="p-3 bg-[#f8f9fa] dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-2xl border border-slate-200/80 dark:border-slate-700 transition text-center group shadow-2xs"
            >
              <Truck className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Logística</span>
            </button>

            <button
              onClick={() => onNavigate('calculator')}
              className="p-3 bg-[#f8f9fa] dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-2xl border border-slate-200/80 dark:border-slate-700 transition text-center group shadow-2xs"
            >
              <Calculator className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Calcular</span>
            </button>

            <button
              onClick={() => onNavigate('calculator')}
              className="p-3 bg-[#f8f9fa] dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-2xl border border-slate-200/80 dark:border-slate-700 transition text-center group shadow-2xs"
            >
              <Bot className="w-5 h-5 mx-auto text-purple-600 mb-1" />
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Mestre IA</span>
            </button>
          </div>
        </div>

        {/* Bento 8: Google Drive Cloud Card (span-2) */}
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
              <FolderSync className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Google Drive Backup</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {isAuthenticated ? 'Conectado' : 'Disponível'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAuthenticated 
                  ? 'Pasta /Mãos em Obra sincronizada na nuvem.' 
                  : 'Faça backup dos RDOs, fotos e notas diretamente no Drive.'}
              </p>
            </div>
          </div>

          <button
            onClick={onSyncDrive}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-xs"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>{isAuthenticated ? 'Sincronizar Agora' : 'Conectar Drive'}</span>
          </button>
        </div>

      </div>

      {/* 🎯 Metas de Obra & Objetivos Mensais */}
      <ProjectGoals 
        projectId={project.id}
        goals={goals}
        onSaveGoal={onSaveGoal}
        onDeleteGoal={onDeleteGoal}
      />

      {/* Main Two-Column Lower Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active Phases & Latest RDO */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Monthly Budgeted vs Actual Expenses Recharts BarChart */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  Comparação Mensal: Orçado vs Realizado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evolução mensal dos custos previstos (orçados) e efetivamente realizados
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full">
                Recharts
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="orcado" name="Orçado (Previsto)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="realizado" name="Realizado (Efetivo)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Phases Bento Card */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Etapas da Obra
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Progresso das fases ativas do cronograma
                </p>
              </div>
              <button
                onClick={() => onNavigate('timeline')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                Cronograma Completo <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {phases.slice(0, 4).map((phase) => (
                <div key={phase.id} className="p-4 bg-[#f8f9fa] dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        phase.status === 'Concluída' ? 'bg-emerald-500' :
                        phase.status === 'Em andamento' ? 'bg-amber-500 animate-pulse' :
                        phase.status === 'Atrasada' ? 'bg-rose-500' : 'bg-slate-400'
                      }`} />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {phase.title}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {phase.progressPercentage}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        phase.status === 'Concluída' ? 'bg-emerald-500' :
                        phase.status === 'Em andamento' ? 'bg-amber-500' :
                        phase.status === 'Atrasada' ? 'bg-rose-500' : 'bg-slate-500'
                      }`}
                      style={{ width: `${phase.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Prazo: {phase.startDate} a {phase.endDate}</span>
                    <span>{phase.checklist.filter(c => c.done).length} de {phase.checklist.length} itens checados</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest RDO Bento Card */}
          {latestRdo && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Último Diário de Obra (RDO)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Data: {latestRdo.date} • Clima: {latestRdo.weather}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('rdo')}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  Ver Todos ({rdos.length}) <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    Serviços Executados:
                  </span>
                  <p className="p-3.5 bg-[#f8f9fa] dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 leading-relaxed">
                    {latestRdo.servicesExecuted}
                  </p>
                </div>

                {latestRdo.aiSummary && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Bot className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Parecer do Mestre IA:
                    </div>
                    <p className="leading-relaxed">{latestRdo.aiSummary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Category Financial Breakdown & Tips */}
        <div className="space-y-6">
          
          {/* Category Breakdown Bento Card */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Custos por Categoria
              </h3>
              <button
                onClick={() => onNavigate('financial')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Detalhes
              </button>
            </div>

            <div className="space-y-3.5">
              {categories.length > 0 ? (
                categories.map(([category, amount]) => {
                  const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                          {category}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400 italic py-4 text-center">
                  Nenhum custo cadastrado no momento.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Pago:</span>
                <span className="font-bold text-emerald-600">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Pendente:</span>
                <span className="font-bold text-amber-600">R$ {totalPendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Construction Tips Bento Card */}
          <div className="bg-amber-50 dark:bg-amber-950/30 p-6 rounded-3xl border border-amber-200/80 dark:border-amber-900/50 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Dica Técnica do Dia
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Em etapas de assentamento de porcelanato acima de 60x60cm, aplique sempre <strong>dupla colagem</strong> (argamassa no contrapiso e no verso da peça) com desempenadeira dentada de 8mm ou 10mm para evitar peças ocas.
            </p>
          </div>

        </div>

      </div>

      {/* Mercado Pago Quick Modal */}
      <MercadoPagoModal
        isOpen={isMpModalOpen}
        onClose={() => setIsMpModalOpen(false)}
        title={`Assinatura Plano Pro - ${project.title}`}
        amount={149.90}
        description={`Assinatura Plano Mensal Pro (R$ 149,90) ou aporte referente ao projeto ${project.title}`}
        payerName={project.clientName || 'Cliente da Obra'}
        payerEmail={project.clientEmail || 'cliente@obra.com.br'}
        referenceId={mpRefId}
        onPaymentSuccess={() => {
          onOpenNewExpense();
        }}
      />

    </div>
  );
};

