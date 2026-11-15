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
  Lock
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';

export type NavTab = 'dashboard' | 'opportunities' | 'invitations' | 'requests' | 'rdo' | 'reports' | 'financial' | 'timeline' | 'calculator' | 'drive' | 'team' | 'admin';

const SERVICE_TABS: NavTab[] = ['reports', 'requests', 'rdo', 'financial', 'timeline', 'calculator', 'drive', 'team'];

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  rdoCount: number;
  unpaidExpensesCount: number;
  requestsCount?: number;
  techDocsCount?: number;
  isAdminAuthenticated?: boolean;
  hasServiceAccess?: boolean;
  onOpenInstallModal?: () => void;
  onOpenWithdrawalModal?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  rdoCount,
  unpaidExpensesCount,
  requestsCount = 0,
  techDocsCount = 0,
  isAdminAuthenticated = false,
  hasServiceAccess = true,
  onOpenInstallModal,
  onOpenWithdrawalModal,
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
      label: 'ART & Laudos',
      description: 'Emissão de ART (CREA), RRT, Laudos e Logo do Cliente',
      icon: FileCheck2,
      badge: techDocsCount > 0 ? `${techDocsCount}` : undefined,
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
    <nav className="bg-[#f8f9fa] dark:bg-slate-950 sticky top-20 z-30 py-2 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {/* Pinned Menu Button */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(prev => !prev)}
              aria-expanded={isMenuOpen}
              aria-label="Abrir menu de navegação"
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-black border transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 ${
                isMenuOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border-slate-800 dark:border-slate-700'
              }`}
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 text-amber-400" />}
              <span>Menu</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Menu Principal do Sistema
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {tabs.length} módulos
                  </span>
                </div>

                <div className="max-h-[65vh] overflow-y-auto py-2 space-y-1">
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
                              {isLockedService ? 'Requer plano pago (Cadastro Gratuito só vê oportunidades)' : tab.description}
                            </div>
                          </div>
                        </div>

                        {isLockedService ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            Plano Pago
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

          {/* Scrollable Tabs */}
          <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
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

          {/* Sacar p/ MP */}
          {onOpenWithdrawalModal && (
            <button
              onClick={onOpenWithdrawalModal}
              title="Sacar R$ 1.834,80 via PIX p/ Mercado Pago"
              className="relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-[#009ee3] hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition whitespace-nowrap shrink-0 cursor-pointer active:scale-95 border border-emerald-400/50 animate-pulse"
            >
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
              <Wallet className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Sacar R$ 1.834,80 p/ MP</span>
              <span className="sm:hidden">Sacar R$ 1.834,80</span>
            </button>
          )}

          {/* Direct Baixar App Button */}
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              title="Baixar App no Celular ou Computador"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-black bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border border-amber-500/30 transition whitespace-nowrap shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar App</span>
            </button>
          )}

          {/* Language Selector */}
          <div className="shrink-0">
            <LanguageSelector variant="nav" showLabel={true} />
          </div>
        </div>
      </div>
    </nav>
  );
};
