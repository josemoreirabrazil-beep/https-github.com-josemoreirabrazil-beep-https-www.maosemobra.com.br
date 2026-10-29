import React, { useState } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  HardHat,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  Bookmark,
  Share2
} from 'lucide-react';
import type { ConstructionOpportunity, OpportunityType } from '../types';

const MOCK_OPPORTUNITIES: ConstructionOpportunity[] = [
  {
    id: 'opp-1',
    title: 'Instalação Elétrica - Prédio Residencial',
    location: 'Bairro Jardim, Santo André',
    city: 'Santo André',
    state: 'SP',
    budget: 'R$ 15.000 - R$ 25.000',
    type: 'Obra Residencial',
    category: 'Elétrica',
    description: 'Execução completa de infraestrutura elétrica para 12 apartamentos de um novo empreendimento. Inclui passagem de fiação, montagem de quadros e instalação de luminárias nas áreas comuns.',
    requirements: ['Registro no CFT/CREA', 'Experiência comprovada em prédios', 'Ferramental próprio', 'Equipe mínima de 3 pessoas'],
    postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    deadline: '2026-11-15',
    status: 'Aberta',
    companyName: 'Moreira Construções Ltda',
    contactName: 'Eng. Ricardo',
    contactPhone: '(11) 98765-4321',
    urgency: 'Alta'
  },
  {
    id: 'opp-2',
    title: 'Reforma de Fachada Comercial',
    location: 'Av. Paulista, São Paulo',
    city: 'São Paulo',
    state: 'SP',
    budget: 'A combinar',
    type: 'Reforma',
    category: 'Pintura/Revestimento',
    description: 'Recuperação de pastilhas e pintura de fachada de loja comercial. Trabalho em altura (necessário NR-35). Área total de 450m2.',
    requirements: ['Certificação NR-35 em dia', 'Seguro de vida para equipe', 'CNPJ ativo', 'Referências de serviços similares'],
    postedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    deadline: '2026-11-10',
    status: 'Aberta',
    companyName: 'Retail Solutions',
    contactName: 'Mariana Costa',
    contactPhone: '(11) 99988-7766',
    urgency: 'Normal'
  },
  {
    id: 'opp-3',
    title: 'Subempreitada de Alvenaria Estrutural',
    location: 'Condomínio Solar, Itatiba',
    city: 'Itatiba',
    state: 'SP',
    budget: 'R$ 120,00 por m2',
    type: 'Subempreitada',
    category: 'Alvenaria',
    description: 'Levantamento de alvenaria estrutural para 4 casas geminadas. Projeto já aprovado e materiais no local. Início imediato.',
    requirements: ['Equipe especializada em alvenaria estrutural', 'Leitura técnica de projetos', 'MEI ou Contrato Social'],
    postedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    deadline: '2026-11-05',
    status: 'Aberta',
    companyName: 'Inova Obras',
    contactName: 'Carlos Augusto',
    contactPhone: '(11) 91234-5678',
    urgency: 'Crítica'
  },
  {
    id: 'opp-4',
    title: 'Instalação de Ar Condicionado Central',
    location: 'Centro Histórico, Porto Alegre',
    city: 'Porto Alegre',
    state: 'RS',
    budget: 'R$ 8.000',
    type: 'Manutenção',
    category: 'Climatização',
    description: 'Substituição de sistema chiller por VRF em andar de escritórios. Inclui remoção do sistema antigo e testes de carga.',
    requirements: ['Técnico em Refrigeração', 'Experiência com sistemas VRF', 'Disponibilidade para trabalhar em horários alternativos'],
    postedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    deadline: '2026-11-20',
    status: 'Aberta',
    companyName: 'ClimaTech Sul',
    contactName: 'Pedro Martins',
    contactPhone: '(51) 98877-6655',
    urgency: 'Normal'
  }
];

export const OpportunitiesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [selectedOpp, setSelectedOpp] = useState<ConstructionOpportunity | null>(null);

  const categories = ['Todas', 'Alvenaria', 'Elétrica', 'Pintura/Revestimento', 'Climatização', 'Hidráulica', 'Gesso', 'Marcenaria'];
  const types = ['Todos', 'Obra Residencial', 'Reforma', 'Projeto', 'Manutenção', 'Consultoria', 'Subempreitada'];

  const filteredOpportunities = MOCK_OPPORTUNITIES.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || opp.category === categoryFilter;
    const matchesType = typeFilter === 'Todos' || opp.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Mercado de Oportunidades
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Oportunidades de <span className="text-amber-400 italic">Trabalho & Obra</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Conectamos profissionais qualificados a projetos reais. Encontre sua próxima obra, gerencie orçamentos e expanda seus negócios na construção civil.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-amber-400">{MOCK_OPPORTUNITIES.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Vagas Abertas</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-emerald-400">12</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Empresas Ativas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Filter className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Filtros</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Busca Rápida</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ex: Pintor, Elétrica..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Categoria</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        categoryFilter === cat
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tipo de Obra</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                >
                  {types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('Todas');
                setTypeFilter('Todos');
              }}
              className="w-full py-2.5 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Limpar Todos os Filtros
            </button>
          </div>

          {/* Premium Ad / Info */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-slate-950 shadow-lg space-y-3">
            <h4 className="text-sm font-black uppercase leading-tight">Destaque seu Perfil Profissional</h4>
            <p className="text-[11px] font-medium opacity-90 leading-relaxed">
              Profissionais com perfil completo e fotos de obras concluídas têm <span className="font-black">3x mais chances</span> de serem selecionados.
            </p>
            <button className="w-full py-2 rounded-xl bg-slate-950 text-white text-[11px] font-black uppercase transition-transform active:scale-95">
              Completar Meu Perfil
            </button>
          </div>
        </div>

        {/* Main List */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-500" />
              Exibindo {filteredOpportunities.length} resultados
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Ordenar por:</span>
              <select className="bg-transparent font-bold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
                <option>Mais recentes</option>
                <option>Maior valor</option>
                <option>Menor prazo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredOpportunities.length > 0 ? (
              filteredOpportunities.map(opp => (
                <div 
                  key={opp.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-lg transition-all group"
                >
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            opp.urgency === 'Crítica' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' :
                            opp.urgency === 'Alta' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' :
                            'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                          }`}>
                            {opp.urgency}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                            {opp.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                          {opp.title}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold">{opp.companyName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{opp.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-black text-slate-900 dark:text-white">{opp.budget}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Prazo: {new Date(opp.deadline || '').toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {opp.description}
                      </p>
                    </div>

                    <div className="flex flex-col justify-between sm:w-48 gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-5">
                      <div className="space-y-1 text-right hidden sm:block">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Publicado</div>
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(opp.postedAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setSelectedOpp(opp)}
                          className="w-full py-2.5 rounded-xl bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-amber-400 transition-all shadow-sm active:scale-95"
                        >
                          Ver Detalhes
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex gap-2">
                          <button className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 transition-colors flex items-center justify-center">
                            <Bookmark className="w-4 h-4" />
                          </button>
                          <button className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Nenhuma oportunidade encontrada</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Tente ajustar seus filtros ou mude o termo de busca para encontrar o que procura.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('Todas');
                    setTypeFilter('Todos');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase shadow-md active:scale-95 transition-transform"
                >
                  Ver Todas as Oportunidades
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="relative h-40 bg-slate-900 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-amber-900/40"></div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors">
                  <Bookmark className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setSelectedOpp(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                >
                  <AlertCircle className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="absolute bottom-[-24px] left-8 w-16 h-16 bg-amber-500 rounded-2xl shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-900">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="pt-10 px-8 pb-8 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase border border-amber-500/20">
                    {selectedOpp.type}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase border border-slate-200 dark:border-slate-700">
                    {selectedOpp.category}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {selectedOpp.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                  <span>{selectedOpp.companyName}</span>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedOpp.location}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Orçamento Estimado</div>
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{selectedOpp.budget}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Prazo de Início</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">Imediato</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Descrição do Serviço</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedOpp.description}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Requisitos Técnicos</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedOpp.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Responsável</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">{selectedOpp.contactName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[11px] uppercase transition-colors hover:bg-slate-200 dark:hover:bg-slate-750 flex items-center justify-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    Ligar
                  </button>
                  <button className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-[11px] uppercase transition-all shadow-md hover:bg-amber-400 flex items-center justify-center gap-2 active:scale-95">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Enviar Orçamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
