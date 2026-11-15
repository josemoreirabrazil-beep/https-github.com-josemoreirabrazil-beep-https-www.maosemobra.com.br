import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  Building, 
  FileText, 
  DollarSign, 
  Calendar, 
  Users, 
  Briefcase, 
  ShieldCheck, 
  HardHat, 
  Calculator, 
  FolderOpen, 
  Bell, 
  Send, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import type { Project, DailyLog, Expense, Phase, TeamMember, ServiceRequest, TechnicalDocument } from '../types';
import type { NavTab } from './Navigation';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProject: Project;
  onSelectProject: (projectId: string) => void;
  rdos: DailyLog[];
  expenses: Expense[];
  phases: Phase[];
  team: TeamMember[];
  serviceRequests: ServiceRequest[];
  techDocs: TechnicalDocument[];
  onNavigate: (tab: NavTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProject,
  onSelectProject,
  rdos,
  expenses,
  phases,
  team,
  serviceRequests,
  techDocs,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const query = searchTerm.trim().toLowerCase();

  const results = useMemo(() => {
    const defaultTabs: Array<{ id: NavTab; title: string; icon: any; desc: string }> = [
      { id: 'dashboard', title: 'Dashboard Geral', icon: Building, desc: 'Visão geral da obra e indicadores principais' },
      { id: 'requests', title: 'Solicitações de Serviços', icon: Briefcase, desc: 'Orçamentos e cotações de fornecedores' },
      { id: 'rdo', title: 'Diário de Obra (RDO)', icon: FileText, desc: 'Registros diários e ocorrências' },
      { id: 'financial', title: 'Financeiro & Custos', icon: DollarSign, desc: 'Controle de despesas e orçamento' },
      { id: 'timeline', title: 'Cronograma & Fases', icon: Calendar, desc: 'Fases da obra e prazos' },
      { id: 'reports', title: 'Laudos Técnicos & ARTs', icon: ShieldCheck, desc: 'Documentos e laudos de engenharia' },
      { id: 'team', title: 'Equipe & Fornecedores', icon: Users, desc: 'Profissionais e parceiros da obra' },
      { id: 'invitations', title: 'Envio em Massa de Convites', icon: Send, desc: 'Automação para 800+ contatos corporativos' },
      { id: 'opportunities', title: 'Oportunidades de Obras', icon: Briefcase, desc: 'Mural de licitações' },
      { id: 'calculator', title: 'Calculadora de Materiais & IA', icon: Calculator, desc: 'Estimativas' },
      { id: 'drive', title: 'Google Drive Explorer', icon: FolderOpen, desc: 'Arquivos e pastas' },
      { id: 'safety', title: 'Permissões de Trabalho & DDS', icon: HardHat, desc: 'Segurança' },
      { id: 'notifications', title: 'Push Notification Manager', icon: Bell, desc: 'Lembretes' },
    ];

    if (!query) {
      return {
        tabs: defaultTabs,
        projects: [] as Project[],
        rdos: [] as DailyLog[],
        expenses: [] as Expense[],
        phases: [] as Phase[],
        serviceRequests: [] as ServiceRequest[],
        techDocs: [] as TechnicalDocument[],
        team: [] as TeamMember[],
      };
    }

    const matchedTabs = defaultTabs.filter(t => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));

    const matchedProjects = projects.filter(p => 
      p.title.toLowerCase().includes(query) ||
      (p.clientName && p.clientName.toLowerCase().includes(query)) ||
      (p.address && p.address.toLowerCase().includes(query)) ||
      (p.type && p.type.toLowerCase().includes(query))
    );

    const matchedRdos = rdos.filter(r =>
      r.date.includes(query) ||
      (r.weather && r.weather.toLowerCase().includes(query)) ||
      (r.servicesExecuted && r.servicesExecuted.toLowerCase().includes(query)) ||
      (r.occurrences && r.occurrences.toLowerCase().includes(query)) ||
      (r.notes && r.notes.toLowerCase().includes(query))
    );

    const matchedExpenses = expenses.filter(e =>
      (e.description && e.description.toLowerCase().includes(query)) ||
      (e.category && e.category.toLowerCase().includes(query)) ||
      (e.supplier && e.supplier.toLowerCase().includes(query)) ||
      (e.status && e.status.toLowerCase().includes(query)) ||
      e.date.includes(query)
    );

    const matchedPhases = phases.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query)
    );

    const matchedRequests = serviceRequests.filter(sr =>
      sr.title.toLowerCase().includes(query) ||
      sr.clientName.toLowerCase().includes(query) ||
      sr.description.toLowerCase().includes(query) ||
      sr.status.toLowerCase().includes(query) ||
      (sr.priority && sr.priority.toLowerCase().includes(query))
    );

    const matchedTechDocs = techDocs.filter(td =>
      td.title.toLowerCase().includes(query) ||
      td.docType.toLowerCase().includes(query) ||
      td.documentNumber.toLowerCase().includes(query) ||
      td.professionalName.toLowerCase().includes(query)
    );

    const matchedTeam = team.filter(tm =>
      tm.name.toLowerCase().includes(query) ||
      tm.role.toLowerCase().includes(query) ||
      (tm.category && tm.category.toLowerCase().includes(query)) ||
      (tm.phone && tm.phone.toLowerCase().includes(query))
    );

    return {
      tabs: matchedTabs,
      projects: matchedProjects,
      rdos: matchedRdos,
      expenses: matchedExpenses,
      phases: matchedPhases,
      serviceRequests: matchedRequests,
      techDocs: matchedTechDocs,
      team: matchedTeam,
    };
  }, [query, projects, rdos, expenses, phases, serviceRequests, techDocs, team]);

  if (!isOpen) return null;

  const totalResultsCount = 
    results.tabs.length +
    results.projects.length +
    results.rdos.length +
    results.expenses.length +
    results.phases.length +
    results.serviceRequests.length +
    results.techDocs.length +
    results.team.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[80vh] animate-in zoom-in-95">
        
        {/* Search Header Input */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/80 dark:bg-slate-900/80">
          <Search className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar em todo o sistema (obras, RDOs, despesas, laudos, equipe, módulos)..."
            className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 divide-y divide-slate-100 dark:divide-slate-800/60">
          
          {totalResultsCount === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Nenhum resultado encontrado para &quot;{searchTerm}&quot;
              </p>
              <p className="text-xs text-slate-500">
                Tente pesquisar por nome da obra, despesa, número de RDO, fornecedor ou módulo.
              </p>
            </div>
          )}

          {/* Navigation / Modules */}
          {results.tabs.length > 0 && (
            <div className="space-y-2 pt-2 first:pt-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Módulos do Sistema ({results.tabs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.tabs.map((tab) => {
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onNavigate(tab.id);
                        onClose();
                      }}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/60 hover:border-amber-500/50 transition flex items-center justify-between group text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {tab.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {tab.desc}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>Obras ({results.projects.length})</span>
              </div>
              <div className="space-y-2">
                {results.projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      onNavigate('dashboard');
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/60 transition flex items-center justify-between group text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {proj.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {proj.clientName} • {proj.address} • R$ {proj.budgetTotal.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {proj.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Service Requests */}
          {results.serviceRequests.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Solicitações de Serviços ({results.serviceRequests.length})</span>
              </div>
              <div className="space-y-2">
                {results.serviceRequests.map((sr) => (
                  <button
                    key={sr.id}
                    onClick={() => {
                      onNavigate('requests');
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/60 transition flex items-center justify-between group text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {sr.title} ({sr.clientName})
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {sr.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {sr.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RDOs */}
          {results.rdos.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Diários de Obra / RDOs ({results.rdos.length})</span>
              </div>
              <div className="space-y-2">
                {results.rdos.map((rdo) => (
                  <button
                    key={rdo.id}
                    onClick={() => {
                      onNavigate('rdo');
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/60 transition flex items-center justify-between group text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>Data: {rdo.date}</span>
                        <span className="text-[10px] text-slate-500">Clima: {rdo.weather}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-lg">
                        {rdo.servicesExecuted}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      {rdo.labor?.reduce((acc, l) => acc + l.count, 0) || 0} Trabalhadores
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expenses */}
          {results.expenses.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Despesas & Custos ({results.expenses.length})</span>
              </div>
              <div className="space-y-2">
                {results.expenses.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => {
                      onNavigate('financial');
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/60 transition flex items-center justify-between group text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {exp.description}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {exp.category} • {exp.supplier || 'Fornecedor Geral'} • {exp.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                        R$ {(exp.actualAmount || exp.plannedAmount).toLocaleString('pt-BR')}
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        exp.status === 'Pago' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {exp.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Technical Documents & Reports */}
          {results.techDocs.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Laudos Técnicos & ARTs ({results.techDocs.length})</span>
              </div>
              <div className="space-y-2">
                {results.techDocs.map((td) => (
                  <button
                    key={td.id}
                    onClick={() => {
                      onNavigate('reports');
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/60 transition flex items-center justify-between group text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {td.title} ({td.documentNumber})
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {td.docType} • Resp: {td.professionalName}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {td.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team Members */}
          {results.team.length > 0 && (
            <div className="space-y-2 pt-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Equipe & Fornecedores ({results.team.length})</span>
              </div>
              <div className="space-y-2">
                {results.team.map((tm) => (
                  <button
                    key={tm.id}
                    onClick={() => {
                      onNavigate('team');
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/60 transition flex items-center justify-between group text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {tm.name} ({tm.role})
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {tm.category} • {tm.phone || tm.email}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      Ativo
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Pressione <strong className="text-slate-800 dark:text-white">ESC</strong> para fechar</span>
          <span>Mãos em Obra • Pesquisa Global Inteligente</span>
        </div>

      </div>
    </div>
  );
};
