import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, type NavTab, type UserAccessRole } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { DailyLogView } from './components/DailyLogView';
import { FinancialView } from './components/FinancialView';
import { TimelineView } from './components/TimelineView';
import { CalculatorAndAIView } from './components/CalculatorAndAIView';
import { DriveExplorerView } from './components/DriveExplorerView';
import { TeamSuppliersView } from './components/TeamSuppliersView';
import { ServiceRequestsView } from './components/ServiceRequestsView';
import { OpportunitiesView } from './components/OpportunitiesView';
import { BatchInvitationsView } from './components/BatchInvitationsView';
import { TechnicalReportsView } from './components/TechnicalReportsView';
import { NotificationSettingsView } from './components/NotificationSettingsView';
import { SafetyWorkPermitAndDdsView } from './components/SafetyWorkPermitAndDdsView';
import { AdminMasterView } from './components/AdminMasterView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { InstallAppModal } from './components/InstallAppModal';
import { WithdrawalModal } from './components/WithdrawalModal';
import { MercadoPagoModal } from './components/MercadoPagoModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Download, CheckCircle2, X, Megaphone, ExternalLink, Lock, Briefcase, Sparkles, ShieldCheck, LogIn } from 'lucide-react';
import { 
  parseMercadoPagoRedirectParams, 
  processMercadoPagoRedirectReturn, 
  startAutomaticWebhookSync,
  type WebhookProcessResult 
} from './services/webhookHandler';
import { 
  getProjects, 
  saveProjects, 
  getDailyLogs, 
  saveDailyLogs, 
  getExpenses, 
  saveExpenses, 
  getPhases, 
  savePhases, 
  getTeamMembers, 
  saveTeamMembers, 
  loadServiceRequests, 
  saveServiceRequests,
  loadGoals,
  saveGoals,
  loadTechnicalDocuments,
  saveTechnicalDocuments
} from './services/storage';
import { subscribeToAuthChanges, googleSignIn, getCachedGoogleToken } from './services/firebaseAuth';
import { getCachedAdminSession, clearAdminSession } from './services/adminAuth';
import {
  getActiveUserSubscription,
  setActiveUserSubscription,
  hasPaidServiceAccess,
  hasProLaudoAccess,
  syncEnrolledSubscriberToServer,
  verifyAuthenticatedSubscriberAccess,
  fetchActiveSubscriberNotices,
  fetchSubscribersCashflow,
  SUBSCRIPTION_UPDATED_EVENT,
  type ActiveSubscriptionState,
  type SubscriberBillingNotice
} from './services/subscriberBilling';
import { usePushNotifications } from './hooks/usePushNotifications';
import { logBalanceAccessEvent } from './services/balanceAudit';
import type { Project, DailyLog, Expense, Phase, TeamMember, ServiceRequest, AdminMasterUser, ProjectGoal, TechnicalDocument } from './types';
import confetti from 'canvas-confetti';

export default function App() {
  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    const list = getProjects();
    return list[0]?.id || 'proj-1';
  });

  // Current Project Data
  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0] || {
    id: 'proj-1',
    title: 'Minha Obra',
    clientName: 'Cliente',
    address: 'Endereço da Obra',
    type: 'Reforma',
    status: 'Em Andamento',
    budgetTotal: 0,
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    notes: 'Projeto inicial',
    createdAt: new Date().toISOString(),
  };

  // Associated Data Collections
  const [rdos, setRdos] = useState<DailyLog[]>(() => getDailyLogs(currentProject.id));
  const [expenses, setExpenses] = useState<Expense[]>(() => getExpenses(currentProject.id));
  const [phases, setPhases] = useState<Phase[]>(() => getPhases(currentProject.id));
  const [team, setTeam] = useState<TeamMember[]>(() => getTeamMembers());
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(() => loadServiceRequests());
  const [goals, setGoals] = useState<ProjectGoal[]>(() => loadGoals(currentProject.id));
  const [techDocs, setTechDocs] = useState<TechnicalDocument[]>(() => loadTechnicalDocuments(currentProject.id));

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [teamCategoryFilter, setTeamCategoryFilter] = useState<'all' | 'labor' | 'supplier' | 'technical'>('all');

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Global Ctrl+K or Cmd+K shortcut for Global Search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 🔔 Webhook / Retorno Automático do Mercado Pago State
  const [webhookNotification, setWebhookNotification] = useState<WebhookProcessResult | null>(null);

  // Auth / Google Drive State
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Google Drive OAuth token state
  const [isAuthResolved, setIsAuthResolved] = useState<boolean>(false);

  // Admin Master Global State
  const [adminUser, setAdminUser] = useState<AdminMasterUser | null>(() => getCachedAdminSession());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [adminWithdrawalAmount, setAdminWithdrawalAmount] = useState<number>(0);

  // Active Subscription Plan State (Free tier = view opportunities only; Pro = Laudo emission)
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscriptionState>(() => getActiveUserSubscription());
  const [isProUpgradeModalOpen, setIsProUpgradeModalOpen] = useState(false);
  const [upgradeModalMode, setUpgradeModalMode] = useState<'pro-laudo' | 'choose-plan'>('choose-plan');

  // Official Subscriber Checkout Recovery & 6-Month Reduced Plan Notice
  const [subscriberNotices, setSubscriberNotices] = useState<SubscriberBillingNotice[]>([]);
  const [dismissedNoticeId, setDismissedNoticeId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('maos_em_obra_dismissed_notice_id');
    } catch {
      return null;
    }
  });

  const isFirebaseSignedIn = Boolean(user);
  const isAdminAuthenticated = Boolean(adminUser);
  const isUserAuthenticated = isFirebaseSignedIn || isAdminAuthenticated;
  const isPaidSubscriber = hasPaidServiceAccess(activeSubscription);
  const isProSubscriber = hasProLaudoAccess(activeSubscription);
  const canAccessServices = isPaidSubscriber || isAdminAuthenticated;
  const canEmitProLaudos = isProSubscriber || isAdminAuthenticated;
  const userAccessRole: UserAccessRole = isAdminAuthenticated
    ? 'admin'
    : isProSubscriber
    ? 'subscriber_pro'
    : isPaidSubscriber
    ? 'subscriber_paid'
    : isFirebaseSignedIn
    ? 'free'
    : 'visitor';

  const serviceTabSet = new Set<NavTab>(['reports', 'requests', 'rdo', 'financial', 'timeline', 'calculator', 'drive', 'team']);
  const isLockedServiceTab = serviceTabSet.has(activeTab) && !canAccessServices;

  const openChoosePlanModal = () => {
    setUpgradeModalMode('choose-plan');
    setIsProUpgradeModalOpen(true);
  };

  const openProLaudoModal = () => {
    setUpgradeModalMode('pro-laudo');
    setIsProUpgradeModalOpen(true);
  };

  useEffect(() => {
    const syncSub = () => setActiveSubscription(getActiveUserSubscription());
    window.addEventListener(SUBSCRIPTION_UPDATED_EVENT, syncSub);
    window.addEventListener('storage', syncSub);
    return () => {
      window.removeEventListener(SUBSCRIPTION_UPDATED_EVENT, syncSub);
      window.removeEventListener('storage', syncSub);
    };
  }, []);

  useEffect(() => {
    fetchActiveSubscriberNotices()
      .then((res) => {
        setSubscriberNotices((res.notices || []).filter((n) => n.active));
      })
      .catch(() => {});
  }, [activeTab]);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser && !!getCachedGoogleToken());
      setIsAuthResolved(true);
      try {
        if (currentUser?.email) {
          localStorage.setItem('maos_em_obra_last_user_email', currentUser.email);
        } else {
          localStorage.removeItem('maos_em_obra_last_user_email');
        }
      } catch {}
    });
    return () => unsubscribe();
  }, []);

  // Verify authenticated user (Firebase email / Admin token) against enrolled active subscribers on backend
  useEffect(() => {
    if (!isAuthResolved && !adminUser) return;
    if (!user?.email && !adminUser?.token) return;

    let cancelled = false;
    verifyAuthenticatedSubscriberAccess(user?.email, adminUser?.token)
      .then((verified) => {
        if (cancelled) return;
        if (verified.hasServiceAccess && !verified.isAdmin) {
          const currentLocal = getActiveUserSubscription();
          const alreadyHasPro = hasProLaudoAccess(currentLocal);
          if (!hasPaidServiceAccess(currentLocal) || (verified.hasProLaudoAccess && !alreadyHasPro)) {
            const synced = setActiveUserSubscription({
              planId: verified.planId,
              planCode: verified.planCode,
              planName: verified.planName,
              price: verified.price,
              billingCycle: verified.billingCycle,
            });
            setActiveSubscription(synced);
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthResolved, user?.email, adminUser?.token]);

  // Carrega o saldo real da plataforma apenas quando Admin Master Global estiver autenticado
  useEffect(() => {
    if (!isAdminAuthenticated) return;
    let cancelled = false;
    fetchSubscribersCashflow()
      .then((res) => {
        if (!cancelled && res?.summary?.totalCollected && res.summary.totalCollected > 0) {
          setAdminWithdrawalAmount(res.summary.totalCollected);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated, activeTab]);

  // 🚀 Firebase Cloud Messaging Push Notifications Hook
  const { requestPermission, latestNotification } = usePushNotifications();

  // Auto request permission on first authenticated session
  useEffect(() => {
    if (isAuthenticated) {
      requestPermission().catch(() => {});
    }
  }, [isAuthenticated]);

  // Display banner when FCM notification arrives
  useEffect(() => {
    if (latestNotification) {
      setWebhookNotification({
        success: true,
        message: `${latestNotification.title}: ${latestNotification.body}`,
        status: 'Aprovado',
      });
      const timer = setTimeout(() => setWebhookNotification(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [latestNotification]);

  // When project changes, refresh the data collections
  useEffect(() => {
    setRdos(getDailyLogs(currentProject.id));
    setExpenses(getExpenses(currentProject.id));
    setPhases(getPhases(currentProject.id));
    setGoals(loadGoals(currentProject.id));
    setTechDocs(loadTechnicalDocuments(currentProject.id));
  }, [currentProjectId]);

  // 🔔 1. Processamento Automático do Retorno do Mercado Pago via URL / Redirecionamento
  useEffect(() => {
    const mpRedirect = parseMercadoPagoRedirectParams();
    if (mpRedirect) {
      const refLower = String(mpRedirect.ref || mpRedirect.externalReference || '').toLowerCase();
      const statusLower = String(mpRedirect.mpStatus || mpRedirect.status || mpRedirect.collectionStatus || '').toLowerCase();
      const searchLower = typeof window !== 'undefined' ? window.location.search.toLowerCase() : '';
      if (statusLower === 'approved' || statusLower === 'authorized') {
        let matchedSub: {
          planId: string;
          planCode: string;
          planName: string;
          price: number;
          billingCycle: 'Mensal' | 'Anual';
          role: string;
        } | null = null;
        if (refLower.includes('anual') || refLower.includes('annual') || refLower.includes('plan-005') || searchLower.includes('subscription=annual')) {
          matchedSub = { planId: 'plan-005', planCode: 'Anual Construtor', planName: 'Anual Construtor', price: 499.00, billingCycle: 'Anual', role: 'Construtora / Empreiteiro' };
        } else if (refLower.includes('pro') || refLower.includes('plan-001')) {
          matchedSub = { planId: 'plan-001', planCode: 'Mensal Pro', planName: 'Mensal Pro', price: 29.90, billingCycle: 'Mensal', role: 'Técnico / Projetista' };
        } else if (refLower.includes('construtor') || refLower.includes('plan-002')) {
          matchedSub = { planId: 'plan-002', planCode: 'Mensal Construtor', planName: 'Mensal Construtor', price: 49.90, billingCycle: 'Mensal', role: 'Construtora / Empreiteiro' };
        } else if (refLower.includes('basico') || refLower.includes('básico') || refLower.includes('plan-003')) {
          matchedSub = { planId: 'plan-003', planCode: 'Mensal Básico', planName: 'Mensal Básico', price: 25.00, billingCycle: 'Mensal', role: 'Prestador de Serviço' };
        }
        if (matchedSub) {
          const updated = setActiveUserSubscription(matchedSub);
          setActiveSubscription(updated);
          syncEnrolledSubscriberToServer({
            subscriberName: user?.displayName || currentProject.clientName || `Assinante ${matchedSub.planName}`,
            subscriberEmail: user?.email || currentProject.clientEmail || '',
            subscriberRole: matchedSub.role,
            planType: matchedSub.planCode,
            amount: matchedSub.price,
            method: 'Mercado Pago',
            mpVerifiedStatus: 'approved',
          });
        }
      }

      processMercadoPagoRedirectReturn(mpRedirect, {
        currentProjectId: currentProject.id,
        expenses,
        onUpdateExpenses: (updated) => setExpenses(updated),
        serviceRequests,
        onUpdateServiceRequests: (updated) => setServiceRequests(updated),
      }).then((result) => {
        setWebhookNotification(result);
        const timer = setTimeout(() => {
          setWebhookNotification(null);
        }, 12000);
        return () => clearTimeout(timer);
      }).catch(err => {
        console.error('Erro ao processar retorno automático do Mercado Pago:', err);
      });
    }
  }, [currentProject.id]);

  // 🔄 2. Background Automated Payment Sync com Webhook (Observador Master)
  useEffect(() => {
    const pendingExpenses = expenses.filter(e => e.status !== 'Pago');
    if (pendingExpenses.length === 0) return;

    const stopSync = startAutomaticWebhookSync({
      projectId: currentProject.id,
      getPendingExpenseIds: () => expenses.filter(e => e.status !== 'Pago').map(e => e.id),
      onExpenseApproved: (expenseId, amount) => {
        const newExpenses = expenses.map(exp => {
          if (exp.id === expenseId && exp.status !== 'Pago') {
            return {
              ...exp,
              status: 'Pago' as const,
              actualAmount: amount || exp.actualAmount || exp.plannedAmount,
              invoiceNumber: exp.invoiceNumber || `AUTO-MP-${Date.now()}`,
              supplier: exp.supplier ? `${exp.supplier} (Webhook)` : 'Mercado Pago (Auto Sync)',
              date: new Date().toISOString().split('T')[0],
            };
          }
          return exp;
        });

        setExpenses(newExpenses);
        saveExpenses(currentProject.id, newExpenses);

        setWebhookNotification({
          success: true,
          message: `Despesa ${expenseId} atualizada para Paga via sincronização de Webhook!`,
          status: 'Aprovado',
          updatedExpensesCount: 1,
        });

        confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
      },
      intervalMs: 8000,
    });

    return () => stopSync();
  }, [expenses, currentProject.id]);

  // Tab change handler with Admin intercept and optional team filter
  const handleTabChange = (tab: NavTab, categoryFilter?: 'all' | 'labor' | 'supplier' | 'technical') => {
    if (categoryFilter) {
      setTeamCategoryFilter(categoryFilter);
    }
    if (tab === 'admin') {
      if (adminUser) {
        setActiveTab('admin');
        logBalanceAccessEvent({
          type: 'BALANCE_ACCESS_VIEW',
          severity: 'INFO',
          action: 'NAVIGATE_ADMIN_MASTER',
          resource: 'AdminMasterView',
          details: `Admin Master (${adminUser.email}) acessou o Painel Master Global e funções de saldo.`,
          authorized: true,
          amountInvolved: adminWithdrawalAmount,
          actorEmail: adminUser.email,
          actorName: adminUser.name,
          actorRole: 'ADMIN_MASTER',
        });
      } else {
        setIsAdminLoginModalOpen(true);
        logBalanceAccessEvent({
          type: 'BALANCE_ACCESS_DENIED',
          severity: 'WARNING',
          action: 'ADMIN_PANEL_ACCESS_ATTEMPT',
          resource: 'AdminMasterView',
          details: `Tentativa de acesso ao Painel Admin Master Global sem autenticação Master (${user?.email || 'Visitante'}). Modal de login exibido.`,
          authorized: false,
          actorEmail: user?.email || null,
          actorName: user?.displayName || null,
        });
      }
    } else {
      setActiveTab(tab);
    }
    // Smooth scroll up on tab change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWithdrawalModalWithAudit = (source: string) => {
    if (!isAdminAuthenticated || !adminUser) {
      logBalanceAccessEvent({
        type: 'BALANCE_ACCESS_DENIED',
        severity: 'CRITICAL',
        action: 'OPEN_WITHDRAWAL_MODAL_BLOCKED',
        resource: `ValorRealDisponivelModal (${source})`,
        details: `Tentativa bloqueada de acessar o valor real disponível em conta a partir de "${source}" por usuário sem privilégio Admin Master (${user?.email || 'Visitante'}).`,
        authorized: false,
        actorEmail: user?.email || null,
        actorName: user?.displayName || null,
      });
      return;
    }

    logBalanceAccessEvent({
      type: 'BALANCE_ACCESS_VIEW',
      severity: 'INFO',
      action: 'OPEN_WITHDRAWAL_MODAL',
      resource: `ValorRealDisponivelModal (${source})`,
      details: `Admin Master (${adminUser.email}) consultou o valor real disponível em conta via ${source} (Valor: R$ ${adminWithdrawalAmount.toFixed(2)}).`,
      authorized: true,
      amountInvolved: adminWithdrawalAmount,
      actorEmail: adminUser.email,
      actorName: adminUser.name,
      actorRole: 'ADMIN_MASTER',
    });
    setIsWithdrawalModalOpen(true);
  };

  // Admin Login Success Handler
  const handleAdminLoginSuccess = (userMaster: AdminMasterUser) => {
    setAdminUser(userMaster);
    setActiveTab('admin');
    logBalanceAccessEvent({
      type: 'BALANCE_ACCESS_VIEW',
      severity: 'INFO',
      action: 'ADMIN_MASTER_AUTHENTICATED',
      resource: 'AdminMasterView > Saldo & Segurança',
      details: `Admin Master Global (${userMaster.email}) autenticado e liberado para funções de saldo e auditoria.`,
      authorized: true,
      actorEmail: userMaster.email,
      actorName: userMaster.name,
      actorRole: 'ADMIN_MASTER',
    });
    confetti({ particleCount: 60, spread: 70 });
  };

  // Admin Logout Handler
  const handleAdminLogout = () => {
    clearAdminSession();
    setAdminUser(null);
    setIsWithdrawalModalOpen(false);
    setActiveTab('dashboard');
  };

  // Restore All Data from Master Snapshot
  const handleRestoreAllData = (data: {
    projects: Project[];
    serviceRequests: ServiceRequest[];
    team: TeamMember[];
  }) => {
    if (data.projects?.length) {
      setProjects(data.projects);
      saveProjects(data.projects);
      if (data.projects[0]) setCurrentProjectId(data.projects[0].id);
    }
    if (data.serviceRequests?.length) {
      setServiceRequests(data.serviceRequests);
      saveServiceRequests(data.serviceRequests);
    }
    if (data.team?.length) {
      setTeam(data.team);
      saveTeamMembers(data.team);
    }
  };

  // Handlers for Project CRUD
  const handleSaveProject = (projectData: Partial<Project>) => {
    const targetId = projectData.id || currentProject.id;
    let updatedProjects: Project[];
    if (projects.some(p => p.id === targetId)) {
      updatedProjects = projects.map(p => p.id === targetId ? { ...p, ...projectData, id: targetId } as Project : p);
    } else {
      const baseProject = targetId === currentProject.id ? { ...currentProject, ...projectData, id: targetId } : projectData;
      updatedProjects = [baseProject as Project, ...projects];
      setCurrentProjectId(targetId);
      confetti({ particleCount: 50, spread: 60 });
    }
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  // Handlers for RDO
  const handleSaveRdo = (newRdo: DailyLog) => {
    let updated: DailyLog[];
    if (rdos.some(r => r.id === newRdo.id)) {
      updated = rdos.map(r => r.id === newRdo.id ? newRdo : r);
    } else {
      updated = [newRdo, ...rdos];
      confetti({ particleCount: 40, spread: 50 });
    }
    setRdos(updated);
    saveDailyLogs(currentProject.id, updated);
  };

  const handleDeleteRdo = (rdoId: string) => {
    const updated = rdos.filter(r => r.id !== rdoId);
    setRdos(updated);
    saveDailyLogs(currentProject.id, updated);
  };

  // Handlers for Expenses
  const handleSaveExpense = (newExp: Expense) => {
    let updated: Expense[];
    if (expenses.some(e => e.id === newExp.id)) {
      updated = expenses.map(e => e.id === newExp.id ? newExp : e);
    } else {
      updated = [newExp, ...expenses];
      confetti({ particleCount: 40, spread: 50 });
    }
    setExpenses(updated);
    saveExpenses(currentProject.id, updated);
  };

  const handleDeleteExpense = (expId: string) => {
    const updated = expenses.filter(e => e.id !== expId);
    setExpenses(updated);
    saveExpenses(currentProject.id, updated);
  };

  const handleClearExpenses = () => {
    setExpenses([]);
    saveExpenses(currentProject.id, []);
  };

  const handleBulkSaveExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    saveExpenses(currentProject.id, newExpenses);
  };

  // Handlers for Phases
  const handleUpdatePhase = (updatedPhase: Phase) => {
    const updated = phases.map(p => p.id === updatedPhase.id ? updatedPhase : p);
    setPhases(updated);
    savePhases(currentProject.id, updated);
  };

  const handleAddPhase = (newPhase: Phase) => {
    const updated = [...phases, newPhase];
    setPhases(updated);
    savePhases(currentProject.id, updated);
  };

  const handleDeletePhase = (phaseId: string) => {
    const updated = phases.filter(p => p.id !== phaseId);
    setPhases(updated);
    savePhases(currentProject.id, updated);
  };

  // Handlers for Team
  const handleSaveTeamMember = (member: TeamMember) => {
    let updated: TeamMember[];
    if (team.some(t => t.id === member.id)) {
      updated = team.map(t => t.id === member.id ? member : t);
    } else {
      updated = [...team, member];
    }
    setTeam(updated);
    saveTeamMembers(updated);
  };

  const handleDeleteTeamMember = (memberId: string) => {
    const updated = team.filter(t => t.id !== memberId);
    setTeam(updated);
    saveTeamMembers(updated);
  };

  // Handlers for Service Requests (Solicitações de Serviços e Logística)
  const handleSaveServiceRequest = (newRequest: ServiceRequest) => {
    const updated = [newRequest, ...serviceRequests];
    setServiceRequests(updated);
    saveServiceRequests(updated);
  };

  const handleDeleteServiceRequest = (requestId: string) => {
    const updated = serviceRequests.filter(r => r.id !== requestId);
    setServiceRequests(updated);
    saveServiceRequests(updated);
  };

  const handleUpdateServiceRequest = (updatedRequest: ServiceRequest) => {
    const updated = serviceRequests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
    setServiceRequests(updated);
    saveServiceRequests(updated);
  };

  const handleApplyQuoteToExpenses = (newExpenses: Expense[], budgetTotal: number) => {
    const updated = [...expenses, ...newExpenses];
    setExpenses(updated);
    saveExpenses(currentProject.id, updated);
    handleSaveProject({ budgetTotal: Math.max(Number(currentProject.budgetTotal) || 0, budgetTotal) });
  };

  const handleSaveGoal = (goal: ProjectGoal) => {
    let updated: ProjectGoal[];
    if (goals.some(g => g.id === goal.id)) {
      updated = goals.map(g => g.id === goal.id ? goal : g);
    } else {
      updated = [goal, ...goals];
    }
    setGoals(updated);
    saveGoals(currentProject.id, updated);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updated = goals.filter(g => g.id !== goalId);
    setGoals(updated);
    saveGoals(currentProject.id, updated);
  };

  // Handlers for Technical Documents (Laudos & ARTs)
  const handleSaveTechDoc = (doc: TechnicalDocument) => {
    const updated = techDocs.some(d => d.id === doc.id)
      ? techDocs.map(d => (d.id === doc.id ? doc : d))
      : [doc, ...techDocs];
    setTechDocs(updated);
    saveTechnicalDocuments(currentProject.id, updated);
  };

  const handleDeleteTechDoc = (docId: string) => {
    const updated = techDocs.filter(d => d.id !== docId);
    setTechDocs(updated);
    saveTechnicalDocuments(currentProject.id, updated);
  };

  const handleRequireAuth = async () => {
    try {
      await googleSignIn();
    } catch (err: any) {
      alert(`Falha na autenticação Google: ${err.message || err}`);
    }
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f8f9fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Header */}
      <Header
        projects={projects}
        currentProject={currentProject}
        onSelectProject={(id) => setCurrentProjectId(id)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onOpenEditProjectModal={() => setIsEditProjectModalOpen(true)}
        isAuthenticated={isAuthenticated}
        isUserAuthenticated={isUserAuthenticated}
        hasServiceAccess={canAccessServices}
        hasProAccess={canEmitProLaudos}
        userEmail={adminUser?.email || user?.email}
        userPhoto={user?.photoURL}
        rdos={rdos}
        expenses={expenses}
        phases={phases}
        isAdminAuthenticated={isAdminAuthenticated}
        onOpenAdminModal={() => setIsAdminLoginModalOpen(true)}
        onNavigateToAdmin={() => setActiveTab('admin')}
        onNavigateToReports={() => handleTabChange('reports')}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenWithdrawalModal={isAdminAuthenticated ? () => openWithdrawalModalWithAudit('Header') : undefined}
        adminWithdrawalAmount={isAdminAuthenticated ? adminWithdrawalAmount : undefined}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
      />

      {/* Navigation Sub-header */}
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        rdoCount={rdos.length}
        unpaidExpensesCount={expenses.filter(e => e.status !== 'Pago').length}
        requestsCount={serviceRequests.filter(r => r.status === 'Pendente de Orçamento').length}
        techDocsCount={techDocs.length}
        isAdminAuthenticated={isAdminAuthenticated}
        isUserAuthenticated={isUserAuthenticated}
        hasServiceAccess={canAccessServices}
        hasProAccess={canEmitProLaudos}
        userAccessRole={userAccessRole}
        activePlanName={isAdminAuthenticated ? 'Admin Master Global' : activeSubscription.planName}
        userEmail={adminUser?.email || user?.email || null}
        onOpenAdminModal={() => setIsAdminLoginModalOpen(true)}
        onOpenChoosePlanModal={openChoosePlanModal}
        onRequireAuth={handleRequireAuth}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenWithdrawalModal={isAdminAuthenticated ? () => openWithdrawalModalWithAudit('Navigation') : undefined}
        adminWithdrawalAmount={isAdminAuthenticated ? adminWithdrawalAmount : undefined}
      />

      {/* 🔔 Banner de Confirmação Automática de Webhook Mercado Pago */}
      {webhookNotification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full animate-fade-in">
          <div className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between gap-3 ${
            webhookNotification.status === 'Aprovado' 
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-200' 
              : (webhookNotification.status === 'Rejeitado'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-200'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200')
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${
                webhookNotification.status === 'Aprovado' 
                  ? 'bg-emerald-500 text-white' 
                  : (webhookNotification.status === 'Rejeitado' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950')
              }`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <span>Notificação do Mercado Pago Processada Automaticamente</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-black">
                    Webhook Ativo
                  </span>
                </div>
                <p className="text-xs font-semibold mt-0.5">
                  {webhookNotification.message}
                </p>
                {(webhookNotification.updatedExpensesCount || webhookNotification.updatedServiceRequestsCount) ? (
                  <p className="text-[11px] opacity-80 mt-0.5 font-bold">
                    {webhookNotification.updatedExpensesCount ? `• ${webhookNotification.updatedExpensesCount} despesa(s) marcada(s) como Paga` : ''}
                    {webhookNotification.updatedServiceRequestsCount ? ` • ${webhookNotification.updatedServiceRequestsCount} solicitação(ões) aprovada(s)` : ''}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => setWebhookNotification(null)}
              className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer text-current"
              title="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 📢 COMUNICADO OFICIAL PARA ASSINANTES & VISITANTES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-2 border-amber-500/80 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-black shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span>Comunicado Oficial Mãos em Obra</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                  Portal Oficial
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5 font-medium">
                Seja bem-vindo ao aplicativo oficial <strong>Mãos em Obra</strong>. Acesse a plataforma completa para gestão de obras, orçamentos e oportunidades no endereço oficial:
              </p>
            </div>
          </div>

          <a
            href="https://www.maosemobra.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 shrink-0 cursor-pointer w-full md:w-auto"
          >
            <span>Acessar www.maosemobra.com.br</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 📣 COMUNICADO AOS ASSINANTES: ERRO CHECKOUT MERCADO PAGO & PLANOS REDUZIDOS POR 6 MESES */}
      {(() => {
        const currentNotice = subscriberNotices[0];
        if (!currentNotice || dismissedNoticeId === currentNotice.id) return null;
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 w-full">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/70 text-slate-900 dark:text-amber-100 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      {currentNotice.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                      Planos Reduzidos por {currentNotice.promoDurationMonths} Meses
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-amber-100/90 leading-relaxed font-medium">
                    {currentNotice.message}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-bold">
                    {currentNotice.reducedPlansSummary.map((plan) => (
                      <span
                        key={plan.name}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-500/40 text-slate-800 dark:text-slate-200"
                      >
                        {plan.name}:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{plan.cycle}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
                <button
                  type="button"
                  onClick={openChoosePlanModal}
                  className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer whitespace-nowrap"
                >
                  Regularizar / Ver Planos Reduzidos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedNoticeId(currentNotice.id);
                    try {
                      localStorage.setItem('maos_em_obra_dismissed_notice_id', currentNotice.id);
                    } catch {}
                  }}
                  className="p-2 rounded-xl hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition cursor-pointer"
                  title="Dispensar comunicado"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            project={currentProject}
            phases={phases}
            rdos={rdos}
            expenses={expenses}
            team={team}
            user={user}
            serviceRequests={serviceRequests}
            goals={goals}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
            onNavigate={handleTabChange}
            onOpenNewRdo={() => setActiveTab('rdo')}
            onOpenNewExpense={() => setActiveTab('financial')}
            onSyncDrive={() => setActiveTab('drive')}
            onUpdateProject={handleSaveProject}
            isAuthenticated={isAuthenticated}
            adminUser={adminUser}
            activeSubscription={activeSubscription}
            onOpenWithdrawalModal={isAdminAuthenticated ? () => openWithdrawalModalWithAudit('DashboardView') : undefined}
          />
        )}
        
        {activeTab === 'opportunities' && (
          <OpportunitiesView
            hasServiceAccess={canAccessServices}
            onRequirePaidPlan={openChoosePlanModal}
          />
        )}

        {isLockedServiceTab && (
          <div className="max-w-3xl mx-auto my-6 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500/40 shadow-xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  {isUserAuthenticated
                    ? `Conta Autenticada (${user?.email || 'Local'}) · Cadastro Gratuito (R$ 0,00)`
                    : 'Visitante Não Autenticado · Acesso Restrito'}
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {activeTab === 'reports'
                    ? 'Acesso a ART & Laudos Técnicos — Assinante Pago ou Admin Master'
                    : 'Acesso aos Serviços Disponível Apenas para Assinantes Pagos ou Admin'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Os cadastros gratuitos dão acesso <strong>apenas à visualização das oportunidades de obras</strong>. Se você já é assinante pago, entre com sua conta Google; se for administrador, faça login no <strong>Admin Master</strong>; ou escolha um plano mensal (a partir de R$ 25,00/mês — <strong>Laudos Técnicos no Plano Pro R$ 29,90/mês</strong>) ou o plano anual (R$ 499,00/ano).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {!isFirebaseSignedIn && (
                <button
                  type="button"
                  onClick={handleRequireAuth}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Entrar com Google (Assinante)</span>
                </button>
              )}

              {!isAdminAuthenticated && (
                <button
                  type="button"
                  onClick={() => setIsAdminLoginModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Acesso Admin Master</span>
                </button>
              )}

              <button
                type="button"
                onClick={openChoosePlanModal}
                className="w-full py-3 px-4 rounded-2xl bg-[#009ee3] hover:bg-[#0082ba] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Escolher Plano Pago (Mensal ou Anual)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('opportunities')}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-emerald-500" />
                <span>Visualizar Oportunidades (Gratuito)</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'invitations' && (
          <BatchInvitationsView
            onNavigateToOpportunities={() => setActiveTab('opportunities')}
          />
        )}

        {activeTab === 'admin' && adminUser && (
          <AdminMasterView
            adminUser={adminUser}
            onLogout={handleAdminLogout}
            projects={projects}
            rdos={rdos}
            expenses={expenses}
            phases={phases}
            team={team}
            serviceRequests={serviceRequests}
            onRestoreAllData={handleRestoreAllData}
          />
        )}

        {activeTab === 'requests' && canAccessServices && (
          <ServiceRequestsView
            currentProject={currentProject}
            serviceRequests={serviceRequests}
            onSaveServiceRequest={handleSaveServiceRequest}
            onDeleteServiceRequest={handleDeleteServiceRequest}
            onUpdateServiceRequest={handleUpdateServiceRequest}
            onApplyQuoteToExpenses={handleApplyQuoteToExpenses}
            isAuthenticated={isAuthenticated}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {activeTab === 'rdo' && canAccessServices && (
          <DailyLogView
            project={currentProject}
            rdos={rdos}
            onSaveRdo={handleSaveRdo}
            onDeleteRdo={handleDeleteRdo}
            isAuthenticated={isAuthenticated}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {activeTab === 'reports' && canAccessServices && (
          <TechnicalReportsView
            project={currentProject}
            documents={techDocs}
            onSaveDocument={handleSaveTechDoc}
            onDeleteDocument={handleDeleteTechDoc}
            onUpdateProject={handleSaveProject}
            hasProAccess={canEmitProLaudos}
            activePlanName={isAdminAuthenticated ? 'Admin Master Global' : activeSubscription.planName}
            onOpenProUpgrade={openProLaudoModal}
          />
        )}

        {activeTab === 'financial' && canAccessServices && (
          <FinancialView
            project={currentProject}
            expenses={expenses}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onUpdateProject={handleSaveProject}
            onClearExpenses={handleClearExpenses}
            onBulkSaveExpenses={handleBulkSaveExpenses}
            isAuthenticated={isAuthenticated}
            isAdminAuthenticated={isAdminAuthenticated}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {activeTab === 'timeline' && canAccessServices && (
          <TimelineView
            phases={phases}
            onUpdatePhase={handleUpdatePhase}
            onAddPhase={handleAddPhase}
            onDeletePhase={handleDeletePhase}
          />
        )}

        {activeTab === 'calculator' && canAccessServices && (
          <CalculatorAndAIView
            project={currentProject}
          />
        )}

        {activeTab === 'drive' && canAccessServices && (
          <DriveExplorerView
            project={currentProject}
            rdos={rdos}
            expenses={expenses}
            phases={phases}
            isAuthenticated={isAuthenticated}
            userEmail={user?.email}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {activeTab === 'team' && canAccessServices && (
          <TeamSuppliersView
            team={team}
            onSaveMember={handleSaveTeamMember}
            onDeleteMember={handleDeleteTeamMember}
            initialCategoryFilter={teamCategoryFilter}
          />
        )}

        {activeTab === 'safety' && canAccessServices && (
          <SafetyWorkPermitAndDdsView
            project={currentProject}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationSettingsView
            currentProject={currentProject}
            rdos={rdos}
            expenses={expenses}
            onNavigateToRdo={() => handleTabChange('rdo')}
            onNavigateToFinancial={() => handleTabChange('financial')}
          />
        )}
      </main>

      {/* Footer with Comprehensive Quick Navigation Links */}
      <Footer
        currentProject={currentProject}
        projects={projects}
        team={team}
        serviceRequests={serviceRequests}
        onNavigate={handleTabChange}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        isAdminAuthenticated={!!adminUser}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenWithdrawalModal={isAdminAuthenticated ? () => openWithdrawalModalWithAudit('Footer') : undefined}
        adminWithdrawalAmount={isAdminAuthenticated ? adminWithdrawalAmount : undefined}
      />

      {/* Floating Quick Download / Install Button */}
      <button
        onClick={() => setIsInstallModalOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-xl shadow-amber-500/25 border border-amber-300 dark:border-amber-400 transition-all hover:scale-105 active:scale-95 cursor-pointer group"
        title="Baixar Aplicativo no Celular ou Computador"
      >
        <div className="w-6 h-6 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
          <Download className="w-3.5 h-3.5" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-[11px] leading-tight font-extrabold uppercase tracking-wide">Baixar App</div>
          <div className="text-[10px] leading-tight opacity-90 font-medium">Celular / Computador</div>
        </div>
        <span className="sm:hidden text-xs font-black">Baixar App</span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
        </span>
      </button>

      {/* Download / Install App Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Admin Master Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* New Project Modal */}
      <ProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSave={handleSaveProject}
      />

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        onSave={handleSaveProject}
        initialData={currentProject}
      />

      {/* Modal Oficial de Saque p/ Mercado Pago — Exclusivo Admin Master Global */}
      {isAdminAuthenticated && (
        <WithdrawalModal
          isOpen={isWithdrawalModalOpen}
          onClose={() => setIsWithdrawalModalOpen(false)}
          isAdminAuthenticated={isAdminAuthenticated}
          availableAmount={adminWithdrawalAmount}
          onSuccess={(withdrawnAmount) => {
            setAdminWithdrawalAmount((prev) => Math.max(0, Number((prev - withdrawnAmount).toFixed(2))));
          }}
        />
      )}

      {/* Checkout Mercado Pago para Seleção de Planos (Mensal, Anual Construtoras ou Pro) */}
      <MercadoPagoModal
        isOpen={isProUpgradeModalOpen}
        onClose={() => setIsProUpgradeModalOpen(false)}
        title={
          upgradeModalMode === 'pro-laudo'
            ? `Plano Mensal Pro — Emissão de Laudos (${currentProject.title})`
            : `Escolher Plano Pago — ${currentProject.title}`
        }
        amount={upgradeModalMode === 'pro-laudo' ? 29.90 : 0}
        selectedPlanId={upgradeModalMode === 'pro-laudo' ? 'plan-001' : undefined}
        requirePlanSelection={upgradeModalMode === 'choose-plan'}
        description={
          upgradeModalMode === 'pro-laudo'
            ? 'Assinatura Mensal Recorrente Plano Pro (R$ 29,90/mês) — Libera emissão de Laudos Técnicos e Vistorias'
            : 'Escolha um plano mensal (R$ 25,00, R$ 29,90, R$ 49,90) ou o Plano Anual Construtor (R$ 499,00/ano) para liberar todos os serviços'
        }
        payerName={currentProject.clientName || 'Assinante Mãos em Obra'}
        payerEmail={currentProject.clientEmail || 'cliente@maosemobra.com.br'}
        referenceId={`SUB-${upgradeModalMode === 'pro-laudo' ? 'PRO' : 'PLAN'}-${currentProject.id}-${Date.now()}`}
        onPaymentSuccess={(paymentInfo) => {
          const nameLower = (paymentInfo.planName || '').toLowerCase();
          let chosen: {
            planId: string;
            planCode: string;
            planName: string;
            price: number;
            billingCycle: 'Mensal' | 'Anual' | 'Gratuito';
          } = {
            planId: 'plan-004',
            planCode: 'Gratuito Lançamento',
            planName: 'Cadastro Gratuito',
            price: 0,
            billingCycle: 'Gratuito',
          };
          if (nameLower.includes('anual') || Math.abs(paymentInfo.amount - 499.00) < 0.5 || paymentInfo.amount >= 400) {
            chosen = {
              planId: 'plan-005',
              planCode: 'Anual Construtor',
              planName: 'Anual Construtor',
              price: 499.00,
              billingCycle: 'Anual',
            };
          } else if (Math.abs(paymentInfo.amount - 29.90) < 0.05 || nameLower.includes('pro')) {
            chosen = {
              planId: 'plan-001',
              planCode: 'Mensal Pro',
              planName: 'Mensal Pro',
              price: 29.90,
              billingCycle: 'Mensal',
            };
          } else if (Math.abs(paymentInfo.amount - 49.90) < 0.05 || nameLower.includes('construtor')) {
            chosen = {
              planId: 'plan-002',
              planCode: 'Mensal Construtor',
              planName: 'Mensal Construtor',
              price: 49.90,
              billingCycle: 'Mensal',
            };
          } else if (Math.abs(paymentInfo.amount - 25.00) < 0.05 || nameLower.includes('básico')) {
            chosen = {
              planId: 'plan-003',
              planCode: 'Mensal Básico',
              planName: 'Mensal Básico',
              price: 25.00,
              billingCycle: 'Mensal',
            };
          }
          const updated = setActiveUserSubscription(chosen);
          setActiveSubscription(updated);
          syncEnrolledSubscriberToServer({
            subscriberName: user?.displayName || currentProject.clientName || 'Assinante Mãos em Obra',
            subscriberEmail: user?.email || currentProject.clientEmail || '',
            subscriberRole: chosen.planCode.includes('Construtor') ? 'Construtora / Empreiteiro' : 'Técnico / Projetista',
            planType: chosen.planCode,
            amount: chosen.price,
            method: paymentInfo.method === 'pix' ? 'PIX' : 'Mercado Pago',
            transactionId: paymentInfo.paymentId,
            mpPaymentId: paymentInfo.paymentId,
            mpVerifiedStatus: chosen.price > 0 ? 'approved' : undefined,
          });
        }}
      />

      {/* 🔍 Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        projects={projects}
        currentProject={currentProject}
        onSelectProject={(id) => setCurrentProjectId(id)}
        rdos={rdos}
        expenses={expenses}
        phases={phases}
        team={team}
        serviceRequests={serviceRequests}
        techDocs={techDocs}
        onNavigate={handleTabChange}
      />

    </div>
  );
}
