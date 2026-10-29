import React from 'react';
import { 
  Building2, 
  HardHat, 
  Store, 
  Briefcase, 
  Users, 
  ClipboardList, 
  Wallet, 
  CalendarClock, 
  Calculator, 
  FolderKanban, 
  Truck, 
  ShieldCheck, 
  Plus, 
  ArrowUpRight,
  HeartHandshake,
  QrCode,
  Lock,
  ExternalLink,
  Download,
  Smartphone
} from 'lucide-react';
import type { NavTab } from './Navigation';
import type { Project, TeamMember, ServiceRequest } from '../types';

interface FooterProps {
  currentProject: Project;
  projects: Project[];
  team: TeamMember[];
  serviceRequests: ServiceRequest[];
  onNavigate: (tab: NavTab, teamCategoryFilter?: 'all' | 'labor' | 'supplier' | 'technical') => void;
  onOpenNewProject: () => void;
  onOpenAdminLogin: () => void;
  isAdminAuthenticated: boolean;
  onOpenInstallModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentProject,
  projects,
  team,
  serviceRequests,
  onNavigate,
  onOpenNewProject,
  onOpenAdminLogin,
  isAdminAuthenticated,
  onOpenInstallModal,
}) => {
  const laborCount = team.filter(m => {
    const isSupplier = m.role.toLowerCase().includes('loja') || m.role.toLowerCase().includes('madeireira') || m.role.toLowerCase().includes('depósito') || m.role.toLowerCase().includes('fornecedor');
    const isTech = m.role.toLowerCase().includes('engenheiro') || m.role.toLowerCase().includes('arquiteto') || m.role.toLowerCase().includes('topógrafo');
    return !isSupplier && !isTech;
  }).length;

  const supplierCount = team.filter(m => 
    m.role.toLowerCase().includes('loja') || m.role.toLowerCase().includes('madeireira') || m.role.toLowerCase().includes('depósito') || m.role.toLowerCase().includes('fornecedor')
  ).length;

  const technicalCount = team.filter(m => 
    m.role.toLowerCase().includes('engenheiro') || m.role.toLowerCase().includes('arquiteto') || m.role.toLowerCase().includes('topógrafo')
  ).length;

  const totalRegistered = team.length + serviceRequests.length;

  return (
    <footer className="mt-16 bg-slate-900 border-t border-slate-800 text-slate-300 transition-colors">
      {/* Top Quick Links Ribbon */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200">Acesso Rápido de Navegação:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Obra Link */}
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 hover:border-amber-500/50 transition cursor-pointer flex items-center gap-1.5"
              title="Ir para o Painel da Obra"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Obra: {currentProject.title}</span>
            </button>

            {/* Todos (0) Link */}
            <button
              onClick={() => onNavigate('team', 'all')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 hover:border-amber-500/50 transition cursor-pointer flex items-center gap-1.5"
              title="Ver todos os inscritos e equipe"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Todos ({team.length})</span>
            </button>

            {/* Mão de Obra Link */}
            <button
              onClick={() => onNavigate('team', 'labor')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 hover:border-amber-500/50 transition cursor-pointer flex items-center gap-1.5"
              title="Filtrar por Mão de Obra (Pedreiros, Pintores, Eletricistas...)"
            >
              <HardHat className="w-3.5 h-3.5 text-amber-500" />
              <span>Mão de Obra ({laborCount})</span>
            </button>

            {/* Lojas & Materiais Link */}
            <button
              onClick={() => onNavigate('team', 'supplier')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 hover:border-amber-500/50 transition cursor-pointer flex items-center gap-1.5"
              title="Filtrar por Lojas & Depósitos de Materiais"
            >
              <Store className="w-3.5 h-3.5 text-blue-400" />
              <span>Lojas & Materiais ({supplierCount})</span>
            </button>

            {/* Técnicos & Projetistas Link */}
            <button
              onClick={() => onNavigate('team', 'technical')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 hover:border-amber-500/50 transition cursor-pointer flex items-center gap-1.5"
              title="Filtrar por Engenheiros, Arquitetos e Técnicos"
            >
              <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              <span>Técnicos & Projetistas ({technicalCount})</span>
            </button>
            
            {/* Oportunidades Link */}
            <button
              onClick={() => onNavigate('opportunities')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 hover:border-amber-500/50 transition cursor-pointer flex items-center gap-1.5"
              title="Ver mercado de oportunidades e vagas em obras"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              <span>Oportunidades</span>
            </button>

            {/* Baixar App Link */}
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border border-amber-400 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Baixar e Instalar o App Oficial no Celular ou PC"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar App (Celular / PC)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Column 1: Brand & Project Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 rounded-2xl text-slate-950 shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Mãos em Obra
                </h3>
                <p className="text-xs text-slate-400">
                  Gestão Inteligente de Canteiro, Orçamentos & Equipe
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Plataforma completa para gestão de reformas e construções civis. Controle diários RDO, custos em tempo real, cronograma físico-financeiro, cotações e propostas com mobilização e transporte.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">Obra Selecionada:</span>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="text-amber-400 hover:underline font-bold truncate max-w-[180px] cursor-pointer"
                  title="Abrir painel da obra"
                >
                  {currentProject.title}
                </button>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Inscritos Totais na Plataforma:</span>
                <span className="font-bold text-emerald-400">{totalRegistered} cadastrados</span>
              </div>
            </div>

            {/* Launch Promo Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <HeartHandshake className="w-4 h-4" />
              <span>Inscrição Gratuita de Lançamento (Clientes & Prestadores)</span>
            </div>
          </div>

          {/* Column 2: Gestão da Obra */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              Gestão de Obras
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300"
                >
                  <span>Painel Geral da Obra</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('rdo')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300"
                >
                  <span>Diário de Obra (RDO)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('financial')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300"
                >
                  <span>Orçamento & Custos Financeiros</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('timeline')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300"
                >
                  <span>Cronograma & Etapas</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenNewProject}
                  className="text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Nova Obra</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Equipe & Categorias */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Equipe & Contatos
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('team', 'all')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center justify-between w-full text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Todos os Contatos</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                    {team.length}
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('team', 'labor')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center justify-between w-full text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mão de Obra</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                    {laborCount}
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('team', 'supplier')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center justify-between w-full text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-400" />
                    <span>Lojas & Materiais</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                    {supplierCount}
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('team', 'technical')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center justify-between w-full text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                    <span>Técnicos & Projetistas</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                    {technicalCount}
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('requests')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300 pt-1"
                >
                  <Truck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Solicitações & Logística</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('opportunities')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300"
                >
                  <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mercado de Oportunidades</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                    NOVO
                  </span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Ferramentas & Admin */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Segurança & Utilitários
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('calculator')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  <span>Calculadora & Mestre IA</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('drive')}
                  className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5 text-slate-300"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                  <span>Backup Google Drive</span>
                </button>
              </li>
              {onOpenInstallModal && (
                <li>
                  <button
                    onClick={onOpenInstallModal}
                    className="hover:text-amber-300 font-extrabold transition cursor-pointer flex items-center gap-1.5 text-amber-400"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar App (Celular & PC)</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    if (isAdminAuthenticated) {
                      onNavigate('admin');
                    } else {
                      onOpenAdminLogin();
                    }
                  }}
                  className={`px-3 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 w-full mt-2 ${
                    isAdminAuthenticated
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <div className="text-left">
                    <div className="text-xs">Admin Master Global</div>
                    <div className="text-[10px] opacity-80">
                      {isAdminAuthenticated ? '🛡️ Blindagem Ativa' : 'Acesso Restrito Nível 0'}
                    </div>
                  </div>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Security Line */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Mãos em Obra • Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Sistema Blindado contra Invasão Externa (WAF & TLS 1.3)
            </span>
            <span className="text-slate-600">•</span>
            <span>Chave PIX: +55 73998599213</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
