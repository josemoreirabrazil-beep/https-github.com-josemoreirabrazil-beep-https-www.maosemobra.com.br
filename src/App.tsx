import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, type NavTab } from './components/Navigation';
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
import { AdminMasterView } from './components/AdminMasterView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { InstallAppModal } from './components/InstallAppModal';
import { WithdrawalModal } from './components/WithdrawalModal';
import { Download, CheckCircle2, X, Megaphone, ExternalLink } from 'lucide-react';
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
  saveGoals
} from './services/storage';
import { subscribeToAuthChanges, googleSignIn, getCachedGoogleToken } from './services/firebaseAuth';
import { getCachedAdminSession, clearAdminSession } from './services/adminAuth';
import type { Project, DailyLog, Expense, Phase, TeamMember, ServiceRequest, AdminMasterUser, ProjectGoal } from './types';
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

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [teamCategoryFilter, setTeamCategoryFilter] = useState<'all' | 'labor' | 'supplier' | 'technical'>('all');

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  // 🔔 Webhook / Retorno Automático do Mercado Pago State
  const [webhookNotification, setWebhookNotification] = useState<WebhookProcessResult | null>(null);

  // Admin Master Global State
  const [adminUser, setAdminUser] = useState<AdminMasterUser | null>(() => getCachedAdminSession());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Auth / Google Drive State
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser && !!getCachedGoogleToken());
    });
    return () => unsubscribe();
  }, []);

  // When project changes, refresh the data collections
  useEffect(() => {
    setRdos(getDailyLogs(currentProject.id));
    setExpenses(getExpenses(currentProject.id));
    setPhases(getPhases(currentProject.id));
    setGoals(loadGoals(currentProject.id));
  }, [currentProjectId]);

  // 🔔 1. Processamento Automático do Retorno do Mercado Pago via URL / Redirecionamento
  useEffect(() => {
    const mpRedirect = parseMercadoPagoRedirectParams();
    if (mpRedirect) {
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
      } else {
        setIsAdminLoginModalOpen(true);
      }
    } else {
      setActiveTab(tab);
    }
    // Smooth scroll up on tab change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Login Success Handler
  const handleAdminLoginSuccess = (userMaster: AdminMasterUser) => {
    setAdminUser(userMaster);
    setActiveTab('admin');
    confetti({ particleCount: 60, spread: 70 });
  };

  // Admin Logout Handler
  const handleAdminLogout = () => {
    clearAdminSession();
    setAdminUser(null);
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
    let updatedProjects: Project[];
    if (projects.some(p => p.id === projectData.id)) {
      updatedProjects = projects.map(p => p.id === projectData.id ? { ...p, ...projectData } as Project : p);
    } else {
      updatedProjects = [projectData as Project, ...projects];
      setCurrentProjectId(projectData.id!);
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

  const handleRequireAuth = async () => {
    try {
      await googleSignIn();
    } catch (err: any) {
      alert(`Falha na autenticação Google: ${err.message || err}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Header */}
      <Header
        projects={projects}
        currentProject={currentProject}
        onSelectProject={(id) => setCurrentProjectId(id)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onOpenEditProjectModal={() => setIsEditProjectModalOpen(true)}
        isAuthenticated={isAuthenticated}
        userEmail={user?.email}
        userPhoto={user?.photoURL}
        rdos={rdos}
        expenses={expenses}
        phases={phases}
        isAdminAuthenticated={!!adminUser}
        onOpenAdminModal={() => setIsAdminLoginModalOpen(true)}
        onNavigateToAdmin={() => setActiveTab('admin')}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenWithdrawalModal={() => setIsWithdrawalModalOpen(true)}
      />

      {/* Navigation Sub-header */}
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        rdoCount={rdos.length}
        unpaidExpensesCount={expenses.filter(e => e.status !== 'Pago').length}
        requestsCount={serviceRequests.filter(r => r.status === 'Pendente de Orçamento').length}
        isAdminAuthenticated={!!adminUser}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenWithdrawalModal={() => setIsWithdrawalModalOpen(true)}
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
            onOpenWithdrawalModal={() => setIsWithdrawalModalOpen(true)}
          />
        )}
        
        {activeTab === 'opportunities' && (
          <OpportunitiesView />
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

        {activeTab === 'requests' && (
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

        {activeTab === 'rdo' && (
          <DailyLogView
            project={currentProject}
            rdos={rdos}
            onSaveRdo={handleSaveRdo}
            onDeleteRdo={handleDeleteRdo}
            isAuthenticated={isAuthenticated}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {activeTab === 'financial' && (
          <FinancialView
            project={currentProject}
            expenses={expenses}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onUpdateProject={handleSaveProject}
            onClearExpenses={handleClearExpenses}
            onBulkSaveExpenses={handleBulkSaveExpenses}
            isAuthenticated={isAuthenticated}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineView
            phases={phases}
            onUpdatePhase={handleUpdatePhase}
            onAddPhase={handleAddPhase}
            onDeletePhase={handleDeletePhase}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorAndAIView
            project={currentProject}
          />
        )}

        {activeTab === 'drive' && (
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

        {activeTab === 'team' && (
          <TeamSuppliersView
            team={team}
            onSaveMember={handleSaveTeamMember}
            onDeleteMember={handleDeleteTeamMember}
            initialCategoryFilter={teamCategoryFilter}
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
        onOpenWithdrawalModal={() => setIsWithdrawalModalOpen(true)}
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

      {/* Modal Oficial de Saque R$ 1.834,80 p/ Mercado Pago */}
      <WithdrawalModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        availableAmount={1834.80}
      />

    </div>
  );
}
