import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  CalendarClock,
  Calculator,
  FolderKanban,
  Users,
  Truck,
  ShieldCheck,
  Download,
  Briefcase,
  FileCheck2,
  Menu,
  X,
  ChevronDown,
  Lock,
  UserCheck,
  Sparkles,
  LogIn,
  Send,
  BellRing
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';

export type NavTab = 'dashboard' | 'opportunities' | 'invitations' | 'requests' | 'rdo' | 'reports' | 'financial' | 'timeline' | 'calculator' | 'drive' | 'team' | 'notifications' | 'safety' | 'admin';
export type UserAccessRole = 'admin' | 'subscriber_pro' | 'subscriber_paid' | 'free' | 'visitor';

const SERVICE_TABS: NavTab[] = ['reports', 'requests', 'rdo', 'financial', 'timeline', 'calculator', 'drive', 'team', 'safety'];

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  rdoCount: number;
  unpaidExpensesCount: number;
  requestsCount?: number;
  techDocsCount?: number;
  isAdminAuthenticated?: boolean;
  isUserAuthenticated?: boolean;
  hasServiceAccess?: boolean;
  hasProAccess?: boolean;
  userAccessRole?: UserAccessRole;
  activePlanName?: string;
  userEmail?: string | null;
  onOpenAdminModal?: () => void;
  onOpenChoosePlanModal?: () => void;
  onRequireAuth?: () => void;
  onOpenInstallModal?: () => void;
  onOpenWithdrawalModal?: () => void;
  adminWithdrawalAmount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  rdoCount,
  unpaidExpensesCount,
  requestsCount = 0,
  techDocsCount = 0,
  isAdminAuthenticated = false,
  isUserAuthenticated = false,
  hasServiceAccess = true,
  hasProAccess = false,
  userAccessRole = 'visitor',
  activePlanName = 'Cadastro Gratuito',
  userEmail = null,
  onOpenAdminModal,
  onOpenChoosePlanModal,
  onRequireAuth,
  onOpenInstallModal,
  onOpenWithdrawalModal,
  adminWithdrawalAmount = 1834.80,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'Painel Geral',
      description: 'Visão geral da obra, caixa e planos',
      icon: LayoutDashboard,
    },
    {
      id: 'reports' as NavTab,
      label: 'ART & Laudos Admin',
      description: 'Emissão de ART (CREA), RRT, Laudos e Logo do Cliente',
      icon: FileCheck2,
      badge: isAdminAuthenticated ? 'Admin' : hasProAccess ? 'Pro' : techDocsCount > 0 ? `${techDocsCount}` : 'Admin',
      badgeColor: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black',
    },
    {
      id: 'invitations' as NavTab,
      label: 'Automação de Convites em Massa',
      description: 'Disparo automático em lote (WhatsApp, E-mail e CCO) p/ 300+ construtoras',
      icon: Send,
      highlight: true,
      badge: 'Automação 300+',
      badgeColor: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black',
    },
    {
      id: 'safety' as NavTab,
      label: 'Segurança (PT & DDS)',
      description: 'Permissões de Trabalho e Fichas de Diálogo Diário de Segurança',
      icon: ShieldCheck,
      highlight: true,
      badge: 'NR-10/18/35',
      badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black',
    },
    {
      id: 'opportunities' as NavTab,
      label: hasServiceAccess ? 'Oportunidades & Prestadores' : 'Oportunidades (Visualização)',
      description: hasServiceAccess
        ? 'Vagas em obras e profissionais qualificados'
        : 'Visualização gratuita das oportunidades abertas',
      icon: Briefcase,
      highlight: true,
      badge: hasServiceAccess ? 'Vagas & Equipe' : 'Grátis (Só Ver)',
      badgeColor: hasServiceAccess
        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black'
        : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black',
    },
    {
      id: 'requests' as NavTab,
      label: 'Solicitações & Logística',
      description: 'Pedidos de orçamento, propostas e deslocamento',
      icon: Truck,
      badge: requestsCount > 0 ? `${requestsCount} pedidos` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'rdo' as NavTab,
      label: 'Diário de Obra (RDO)',
      description: 'Registro diário de equipe, clima e fotos',
      icon: ClipboardList,
      badge: rdoCount > 0 ? `${rdoCount}` : undefined,
    },
    {
      id: 'financial' as NavTab,
      label: 'Orçamento & Custos',
      description: 'Despesas, receitas, aportes e Mercado Pago',
      icon: Wallet,
      badge: unpaidExpensesCount > 0 ? `${unpaidExpensesCount} a pagar` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'timeline' as NavTab,
      label: 'Cronograma & Fases',
      description: 'Etapas físicas e progresso percentual',
      icon: CalendarClock,
    },
    {
      id: 'calculator' as NavTab,
      label: 'Calculadora & IA',
      description: 'Cálculo de materiais e assistente técnico',
      icon: Calculator,
      highlight: true,
    },
    {
      id: 'drive' as NavTab,
      label: 'Google Drive',
      description: 'Backup e arquivos sincronizados da obra',
      icon: FolderKanban,
    },
    {
      id: 'team' as NavTab,
      label: 'Equipe & Lojas',
      description: 'Mão de obra, fornecedores e técnicos',
      icon: Users,
    },
    {
      id: 'notifications' as NavTab,
      label: 'Configurações de Notificações',
      description: 'Lembretes diários de RDO e alertas de prazos de despesas via Push',
      icon: BellRing,
      highlight: true,
      badge: 'RDO & Despesas',
      badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black',
    },
    {
      id: 'admin' as NavTab,
      label: 'Admin Master',
      description: 'Controle global, assinantes e segurança',
      icon: ShieldCheck,
      badge: isAdminAuthenticated ? 'Blindado' : 'Acesso',
      badgeColor: isAdminAuthenticated
        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
      adminSpecial: true,
    },
  ];

  const handleSelectFromMenu = (tabId: NavTab) => {
    onTabChange(tabId);
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 xl:top-[81px] z-30 py-2 bg-[#f8f9fa]/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pinned Primary Group: Menu + ART & Laudos (Never hidden or collapsed on any screen) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Pinned Menu Button */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                data-testid="nav-menu-btn"
                onClick={() => setIsMenuOpen(prev => !prev)}
                aria-expanded={isMenuOpen}
                aria-label="Abrir menu de navegação"
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-black border transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 ${
                  isMenuOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border-slate-800 dark:border-slate-700'
                }`}
              >
                {isMenuOpen ? <X className="w-4 h-4 shrink-0" /> : <Menu className="w-4 h-4 text-amber-400 shrink-0" />}
                <span>Menu</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div className="fixed left-3 right-3 mt-2 sm:absolute sm:left-0 sm:right-auto sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Menu Principal do Sistema
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {tabs.length} módulos
                    </span>
                  </div>

                  {/* Verified Auth & Role Status Strip */}
                  <div className={`mx-1 my-2 p-2.5 rounded-2xl border text-[11px] space-y-2 ${
                    isAdminAuthenticated
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : hasServiceAccess
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-black min-w-0">
                        <UserCheck className={`w-3.5 h-3.5 shrink-0 ${
                          isAdminAuthenticated || hasServiceAccess ? 'text-emerald-500' : 'text-amber-500'
                        }`} />
                        <span className="truncate">
                          {isAdminAuthenticated
                            ? 'Admin Master Global (Autenticado)'
                            : userAccessRole === 'subscriber_pro'
                            ? `Assinante Pro (${activePlanName})`
                            : userAccessRole === 'subscriber_paid'
                            ? `Assinante Ativo (${activePlanName})`
                            : isUserAuthenticated
                            ? 'Autenticado · Cadastro Gratuito'
                            : 'Visitante · Não Autenticado'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                        isAdminAuthenticated || hasProAccess
                          ? 'bg-emerald-500 text-white'
                          : hasServiceAccess
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}>
                        {isAdminAuthenticated
                          ? 'ADMIN'
                          : hasProAccess
                          ? 'PRO'
                          : hasServiceAccess
                          ? 'ATIVO'
                          : 'GRÁTIS'}
                      </span>
                    </div>

                    {userEmail && (
                      <div className="text-[10px] opacity-80 truncate font-medium">
                        Conta: {userEmail}
                      </div>
                    )}

                    {!hasServiceAccess && (
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        {!isUserAuthenticated && onRequireAuth && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              onRequireAuth();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Entrar (Google)</span>
                          </button>
                        )}
                        {!isAdminAuthenticated && onOpenAdminModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              onOpenAdminModal();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Admin Master</span>
                          </button>
                        )}
                        {onOpenChoosePlanModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              onOpenChoosePlanModal();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#009ee3] text-white font-black text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Assinar Plano</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto py-1 space-y-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const isReports = tab.id === 'reports';
                      const isLockedService = !hasServiceAccess && SERVICE_TABS.includes(tab.id);

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleSelectFromMenu(tab.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-2xl transition flex items-center justify-between gap-3 cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-slate-950'
                              : isReports
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-slate-900 dark:text-white border border-amber-500/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-slate-950/15 text-slate-950'
                                : isReports
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-black truncate flex items-center gap-1.5">
                                <span>{isReports ? 'Emissão de ART & Laudos' : tab.label}</span>
                                {isLockedService && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                              </div>
                              <div className={`text-[11px] truncate ${
                                isActive ? 'text-slate-900/80' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {isLockedService
                                  ? (!isUserAuthenticated ? 'Requer login/assinatura (ou acesso Admin)' : 'Requer plano pago (Cadastro Gratuito só vê oportunidades)')
                                  : tab.description}
                              </div>
                            </div>
                          </div>

                          {isLockedService ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              {!isUserAuthenticated ? 'Login / Plano' : 'Plano Pago'}
                            </span>
                          ) : tab.badge ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                              isActive
                                ? 'bg-slate-950/15 text-slate-950'
                                : tab.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {tab.badge}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Direct ART & Laudos Admin Button (Only Second Button Kept in Navigation Bar) */}
            <button
              type="button"
              data-testid="nav-art-laudos-btn"
              onClick={() => onTabChange('reports')}
              title={
                isAdminAuthenticated
                  ? 'Emissão de ART & Laudos (Admin Master — Acesso Total Liberado)'
                  : hasProAccess
                  ? 'Emissão de ART & Laudos (Plano Pro Ativo — Acesso Total Liberado)'
                  : hasServiceAccess
                  ? 'Emissão de ART (CREA/RRT) liberada — Laudos no Plano Pro'
                  : 'ART & Laudos Admin — Entre como Assinante/Admin ou escolha um Plano Pago'
              }
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-black border transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                activeTab === 'reports'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-amber-500/20'
                  : 'bg-slate-900 dark:bg-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 text-amber-400 border-amber-500/60'
              }`}
            >
              <FileCheck2 className={`w-4 h-4 shrink-0 ${activeTab === 'reports' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>ART &amp; Laudos</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                activeTab === 'reports'
                  ? 'bg-slate-950/15 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isAdminAuthenticated ? 'Admin' : hasProAccess ? 'Pro' : 'Admin'}
              </span>
            </button>

            {/* Pinned Direct Mass Invitations Automation Button */}
            <button
              type="button"
              data-testid="nav-mass-invitations-btn"
              onClick={() => onTabChange('invitations')}
              title="Automação dos Disparos de Convites em Massa (Fila Automática WhatsApp, E-mail e CCO p/ 300+ Construtoras)"
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-black border transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                activeTab === 'invitations'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-500/60'
              }`}
            >
              <Send className={`w-4 h-4 shrink-0 ${activeTab === 'invitations' ? 'text-slate-950' : 'text-emerald-500'}`} />
              <span>Convites em Massa</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                activeTab === 'invitations'
                  ? 'bg-slate-950/15 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              }`}>
                Automação
              </span>
            </button>
          </div>

          {/* Right Utility Actions (Stays aligned right on Row 1, desktop stays on far right) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:order-3">


            {/* Direct Baixar App Button */}
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                title="Baixar App no Celular ou Computador"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-black bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border border-amber-500/30 transition whitespace-nowrap shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline">Baixar App</span>
                <span className="xl:hidden">App</span>
              </button>
            )}

            {/* Language Selector */}
            <div className="shrink-0">
              <LanguageSelector variant="nav" showLabel={true} />
            </div>
          </div>

          {/* Scrollable Tabs (Full-width Row 2 on < lg so it NEVER squishes to 0px; middle flex-1 on >= lg) */}
          <div className="w-full lg:w-auto lg:flex-1 lg:order-2 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {tabs.filter((tab) => tab.id !== 'reports').map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isLockedService = !hasServiceAccess && SERVICE_TABS.includes(tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {isLockedService && (
                    <Lock className={`w-3 h-3 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-500'}`} />
                  )}
                  {tab.badge && !isLockedService && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-slate-950/15 text-slate-950'
                          : tab.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {tab.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
