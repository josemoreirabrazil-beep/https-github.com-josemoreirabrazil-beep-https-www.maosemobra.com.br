import React, { useState } from 'react';
import { 
  HardHat, 
  ChevronDown, 
  Plus, 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  RefreshCw, 
  FolderSync, 
  LogOut, 
  ExternalLink,
  Building,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ShieldCheck,
  Download,
  Wallet,
  ArrowUpRight
} from 'lucide-react';
import type { Project, DailyLog, Expense, Phase } from '../types';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { exportProjectToDrive } from '../services/googleDrive';
import { LanguageSelector } from './LanguageSelector';
import { PushNotificationCenter } from './PushNotificationCenter';
import confetti from 'canvas-confetti';

interface HeaderProps {
  projects: Project[];
  currentProject: Project;
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenEditProjectModal: () => void;
  isAuthenticated: boolean;
  userEmail?: string | null;
  userPhoto?: string | null;
  rdos: DailyLog[];
  expenses: Expense[];
  phases: Phase[];
  onSyncSuccess?: () => void;
  isAdminAuthenticated?: boolean;
  onOpenAdminModal?: () => void;
  onNavigateToAdmin?: () => void;
  onOpenInstallModal?: () => void;
  onOpenWithdrawalModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenEditProjectModal,
  isAuthenticated,
  userEmail,
  userPhoto,
  rdos,
  expenses,
  phases,
  onSyncSuccess,
  isAdminAuthenticated = false,
  onOpenAdminModal,
  onNavigateToAdmin,
  onOpenInstallModal,
  onOpenWithdrawalModal,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      await googleSignIn();
      setSyncStatusMsg('Conectado ao Google Drive com sucesso!');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      alert(`Falha ao conectar ao Google Drive: ${err.message || err}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  const handleBackupToDrive = async () => {
    if (!isAuthenticated) {
      await handleGoogleLogin();
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg('Sincronizando relatórios e dados no Google Drive...');
    try {
      const res = await exportProjectToDrive(currentProject, rdos, expenses, phases);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.1 } });
      setSyncStatusMsg(`Obra sincronizada! Arquivos salvos na pasta Google Drive.`);
      if (onSyncSuccess) onSyncSuccess();
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao sincronizar com o Google Drive: ${err.message || err}`);
      setSyncStatusMsg(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Em Andamento':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Em Andamento</span>;
      case 'Concluída':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Concluída</span>;
      case 'Planejamento':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Planejamento</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-xs font-black">
              <HardHat className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Mãos em Obra
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full">
                  Canteiro Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal hidden md:block">
                Painel de Gerenciamento de Canteiro & Custos
              </p>
            </div>
          </div>

          {/* Project Switcher */}
          <div className="relative flex-1 max-w-xs sm:max-w-sm">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                    {currentProject.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate">
                    {currentProject.clientName || currentProject.type}
                  </span>
                  <span className="text-[10px] font-bold text-slate-900 dark:text-amber-400">
                    R$ {currentProject.budgetTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Minhas Obras ({projects.length})
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-1">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between gap-2 ${
                        proj.id === currentProject.id ? 'bg-amber-50/80 dark:bg-amber-950/30 font-semibold' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {proj.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {proj.address || proj.type}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(proj.status)}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenNewProjectModal();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova Obra
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenEditProjectModal();
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Editar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Tools, Multilingual Menu & Google Drive Sync */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* 🌐 BOTÃO MENU MULTILÍNGUES SEMPRE VISÍVEL */}
            <LanguageSelector variant="header" showLabel={true} />

            {/* 🔔 FIREBASE CLOUD MESSAGING PUSH NOTIFICATIONS */}
            <PushNotificationCenter />

            {/* 🔥 BOTÃO OFICIAL DE SAQUE R$ 1.834,80 P/ MERCADO PAGO COM ANIMAÇÃO DE PULSAÇÃO SUAVE 🔥 */}
            <button
              onClick={onOpenWithdrawalModal}
              title="Sacar R$ 1.834,80 via PIX para sua conta Mercado Pago"
              className="relative flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#009ee3] hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer shrink-0 active:scale-95 border border-emerald-400/60 animate-pulse"
            >
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-black hidden lg:inline">Sacar R$ 1.834,80 p/ Mercado Pago</span>
              <span className="font-black lg:hidden">Sacar R$ 1.834,80</span>
            </button>

            {/* Baixar App / Instalar PWA Button */}
            <button
              onClick={onOpenInstallModal}
              title="Baixar e Instalar o App no Celular ou Computador"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-black rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer shrink-0 active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span className="font-extrabold">Baixar App</span>
            </button>
            
            {/* Admin Master Shield Button */}
            <button
              onClick={() => {
                if (isAdminAuthenticated && onNavigateToAdmin) {
                  onNavigateToAdmin();
                } else if (onOpenAdminModal) {
                  onOpenAdminModal();
                }
              }}
              title={isAdminAuthenticated ? "Painel Admin Master Global (Blindagem Ativa)" : "Acesso Admin Master Global"}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-2xl border transition shadow-xs cursor-pointer ${
                isAdminAuthenticated
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${isAdminAuthenticated ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">Admin Master</span>
              {isAdminAuthenticated && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse hidden sm:inline-block" />
              )}
            </button>

            {/* Quick Drive Sync Button */}
            <button
              onClick={handleBackupToDrive}
              disabled={isSyncing}
              title="Salvar backup e relatórios no Google Drive"
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-2xl border transition shadow-xs cursor-pointer ${
                isAuthenticated 
                  ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline font-bold">
                {isSyncing ? 'Sincronizando...' : 'Backup no Drive'}
              </span>
            </button>

            {/* Google Drive Auth Button / Avatar */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:border-amber-400 transition shadow-xs"
                  title="Google Drive Conectado"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {userPhoto ? (
                      <img src={userPhoto} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      userEmail?.substring(0, 2).toUpperCase() || 'CS'
                    )}
                  </div>
                  <span className="hidden lg:inline text-xs font-medium text-slate-700 dark:text-slate-300 pr-2 max-w-[120px] truncate">
                    {userEmail?.split('@')[0]}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in">
                    <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
                        {userEmail?.substring(0, 2).toUpperCase() || 'CS'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {userEmail}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Drive Conectado
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Desconectar Google
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition shadow-xs"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                  G
                </div>
                <span className="hidden sm:inline">Conectar Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Toast Notification */}
        {syncStatusMsg && (
          <div className="py-2.5 px-4 my-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center justify-between animate-in slide-in-from-top-1">
            <span className="flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-amber-600 animate-spin" />
              {syncStatusMsg}
            </span>
            <button onClick={() => setSyncStatusMsg(null)} className="text-amber-600 font-bold hover:underline">
              Fechar
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
