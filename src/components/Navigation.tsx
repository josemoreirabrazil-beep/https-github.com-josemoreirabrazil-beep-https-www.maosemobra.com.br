import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Wallet, 
  CalendarClock, 
  Calculator, 
  FolderKanban, 
  Users,
  Send,
  Truck,
  ShieldCheck
} from 'lucide-react';

export type NavTab = 'dashboard' | 'requests' | 'rdo' | 'financial' | 'timeline' | 'calculator' | 'drive' | 'team' | 'admin';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  rdoCount: number;
  unpaidExpensesCount: number;
  requestsCount?: number;
  isAdminAuthenticated?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  rdoCount,
  unpaidExpensesCount,
  requestsCount = 0,
  isAdminAuthenticated = false,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'Painel Geral',
      icon: LayoutDashboard,
    },
    {
      id: 'requests' as NavTab,
      label: 'Solicitações & Logística',
      icon: Truck,
      badge: requestsCount > 0 ? `${requestsCount} pedidos` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'rdo' as NavTab,
      label: 'Diário de Obra (RDO)',
      icon: ClipboardList,
      badge: rdoCount > 0 ? `${rdoCount}` : undefined,
    },
    {
      id: 'financial' as NavTab,
      label: 'Orçamento & Custos',
      icon: Wallet,
      badge: unpaidExpensesCount > 0 ? `${unpaidExpensesCount} a pagar` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'timeline' as NavTab,
      label: 'Cronograma & Fases',
      icon: CalendarClock,
    },
    {
      id: 'calculator' as NavTab,
      label: 'Calculadora & IA',
      icon: Calculator,
      highlight: true,
    },
    {
      id: 'drive' as NavTab,
      label: 'Google Drive',
      icon: FolderKanban,
    },
    {
      id: 'team' as NavTab,
      label: 'Equipe & Lojas',
      icon: Users,
    },
    {
      id: 'admin' as NavTab,
      label: 'Admin Master',
      icon: ShieldCheck,
      badge: isAdminAuthenticated ? 'Blindado' : 'Acesso',
      badgeColor: isAdminAuthenticated 
        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' 
        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
      adminSpecial: true,
    },
  ];

  return (
    <nav className="bg-[#f8f9fa] dark:bg-slate-950 sticky top-20 z-30 py-2 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
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
    </nav>
  );
};
