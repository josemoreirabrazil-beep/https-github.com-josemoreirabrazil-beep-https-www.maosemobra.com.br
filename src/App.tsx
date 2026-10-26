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
import { AdminMasterView } from './components/AdminMasterView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { InstallAppModal } from './components/InstallAppModal';
import { Download } from 'lucide-react';
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
  saveServiceRequests 
} from './services/storage';
import { subscribeToAuthChanges, googleSignIn, getCachedGoogleToken } from './services/firebaseAuth';
import { getCachedAdminSession, clearAdminSession } from './services/adminAuth';
import type { Project, DailyLog, Expense, Phase, TeamMember, ServiceRequest, AdminMasterUser } from './types';
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

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [teamCategoryFilter, setTeamCategoryFilter] = useState<'all' | 'labor' | 'supplier' | 'technical'>('all');

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

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
  }, [currentProjectId]);

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
      />

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
            onNavigate={handleTabChange}
            onOpenNewRdo={() => setActiveTab('rdo')}
            onOpenNewExpense={() => setActiveTab('financial')}
            onSyncDrive={() => setActiveTab('drive')}
            onUpdateProject={handleSaveProject}
            isAuthenticated={isAuthenticated}
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

    </div>
  );
}
