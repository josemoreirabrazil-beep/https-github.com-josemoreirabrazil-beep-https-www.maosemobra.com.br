import React, { useState } from 'react';
import { 
  ClipboardList, 
  Send, 
  MapPin, 
  Truck, 
  Utensils, 
  Hotel, 
  Calendar, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Phone, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  ArrowRight,
  HelpCircle,
  Copy,
  Printer,
  Compass,
  Building2,
  Trash2
} from 'lucide-react';
import type { Project, ServiceRequest, ProposalQuote, Expense } from '../types';
import { ServiceProposalModal } from './ServiceProposalModal';
import { MercadoPagoModal } from './MercadoPagoModal';
import confetti from 'canvas-confetti';

interface ServiceRequestsViewProps {
  currentProject: Project;
  serviceRequests: ServiceRequest[];
  onSaveServiceRequest: (request: ServiceRequest) => void;
  onDeleteServiceRequest: (id: string) => void;
  onUpdateServiceRequest: (request: ServiceRequest) => void;
  onApplyQuoteToExpenses: (expenses: Expense[], budgetTotal: number) => void;
  isAuthenticated: boolean;
  onRequireAuth: (action: string) => void;
}

export const ServiceRequestsView: React.FC<ServiceRequestsViewProps> = ({
  currentProject,
  serviceRequests,
  onSaveServiceRequest,
  onDeleteServiceRequest,
  onUpdateServiceRequest,
  onApplyQuoteToExpenses,
  isAuthenticated,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'new_request' | 'calculator'>('requests');
  
  // Filter states
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocationType, setFilterLocationType] = useState<'all' | 'in_town' | 'out_of_town'>('all');

  // Proposal modal state for pricing a specific request
  const [selectedRequestForQuote, setSelectedRequestForQuote] = useState<ServiceRequest | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Mercado Pago Payment State
  const [isMpModalOpen, setIsMpModalOpen] = useState(false);
  const [mpTargetRequest, setMpTargetRequest] = useState<ServiceRequest | null>(null);

  // New Request Form State (Solicitante)
  const [clientName, setClientName] = useState(currentProject?.clientName || '');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState(currentProject?.address || '');
  const [isOutOfTown, setIsOutOfTown] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Reformas & Acabamentos');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'Normal' | 'Alta' | 'Urgente'>('Normal');
  const [estimatedScope, setEstimatedScope] = useState('');
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Quick Logistics Calculator State (Starts empty for professional input)
  const [calcTeamSize, setCalcTeamSize] = useState<number>(0);
  const [calcDays, setCalcDays] = useState<number>(0);
  const [calcDistanceOneWay, setCalcDistanceOneWay] = useState<number>(0);
  const [calcFuelCostPerLiter, setCalcFuelCostPerLiter] = useState<number>(0);
  const [calcVehicleKmPerLiter, setCalcVehicleKmPerLiter] = useState<number>(0);
  const [calcTolls, setCalcTolls] = useState<number>(0);
  const [calcDailyMeal, setCalcDailyMeal] = useState<number>(0);
  const [calcDailyLodging, setCalcDailyLodging] = useState<number>(0);
  const [calcMobilization, setCalcMobilization] = useState<number>(0);

  // Calculator computations
  const totalKmRoundTrip = calcDistanceOneWay * 2;
  const fuelLiters = calcVehicleKmPerLiter > 0 ? (totalKmRoundTrip / calcVehicleKmPerLiter) : 0;
  const totalFuelCost = fuelLiters * calcFuelCostPerLiter;
  const totalTransportCost = totalFuelCost + calcTolls;
  const totalMealsCost = calcTeamSize * calcDays * calcDailyMeal;
  const totalLodgingCost = calcTeamSize * calcDays * calcDailyLodging;
  const totalLogisticsAll = calcMobilization + totalTransportCost + totalMealsCost + totalLodgingCost;

  // Handle create request by Solicitante
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !clientName.trim()) {
      alert('Por favor, preencha o título do serviço, seu nome e a descrição detalhada do que precisa ser feito.');
      return;
    }

    const newRequest: ServiceRequest = {
      id: `req-${Date.now()}`,
      projectId: currentProject?.id,
      clientName,
      clientPhone,
      clientEmail,
      city,
      state,
      address,
      isOutOfTown,
      distanceKm: isOutOfTown ? Number(distanceKm) || 0 : 0,
      title,
      category,
      description,
      urgency,
      estimatedScope,
      desiredStartDate: desiredStartDate || new Date().toISOString().split('T')[0],
      status: 'Pendente de Orçamento',
      createdAt: new Date().toISOString(),
    };

    onSaveServiceRequest(newRequest);
    confetti({ particleCount: 60, spread: 70 });
    setSubmittedSuccess(true);

    // Reset form
    setTitle('');
    setDescription('');
    setEstimatedScope('');
    setTimeout(() => {
      setSubmittedSuccess(false);
      setActiveTab('requests');
    }, 1500);
  };

  // Open quotation builder for professional
  const handleOpenQuoteBuilder = (request: ServiceRequest) => {
    setSelectedRequestForQuote(request);
    setIsQuoteModalOpen(true);
  };

  // Filter requests
  const filteredRequests = serviceRequests.filter(req => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (filterCity !== 'all' && !req.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterLocationType === 'out_of_town' && !req.isOutOfTown) return false;
    if (filterLocationType === 'in_town' && req.isOutOfTown) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner / Hero Explanation */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Módulo de Serviços, Cotações & Logística Regional</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Solicitações de Serviços & Precificação com Logística
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
            O <strong>solicitante</strong> descreve os tipos de serviços a serem executados e o local da obra. Os <strong>profissionais</strong> adicionam seus valores, discriminando mão de obra, materiais, <strong>mobilização/desmobilização</strong>, <strong>transporte</strong> e <strong>diárias de alimentação e hospedagem</strong> caso o trabalho seja fora da sua cidade.
          </p>

          {/* Promoção de Lançamento Ribbon */}
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shrink-0 mt-0.5 sm:mt-0">
                PROMO
              </div>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-amber-300 block">
                  🚀 Promoção de Lançamento: Inscrição 100% Gratuita!
                </span>
                <span className="text-[11px] sm:text-xs text-slate-300 leading-snug block">
                  A inscrição e cadastro são <strong>gratuitos para o cliente solicitante e para o profissional</strong>. O envio e execução de orçamentos e serviços possuem seus respectivos valores acordados e cobrados normalmente.
                </span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30 shrink-0">
              Inscrição Grátis Ativa
            </div>
          </div>

          {/* Quick Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'requests'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Pedidos Recebidos ({serviceRequests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('new_request')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'new_request'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Nova Solicitação (Solicitante)</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'calculator'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Calculadora de Deslocamento & Diárias</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: LIST OF REQUESTS (Professional perspective) */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Controls / Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Filtrar por:
              </span>

              {/* Location filter */}
              <select
                value={filterLocationType}
                onChange={(e) => setFilterLocationType(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              >
                <option value="all">Todas as Localizações</option>
                <option value="out_of_town">🚗 Fora da Cidade (Requer Diárias/Logística)</option>
                <option value="in_town">📍 Na Cidade Local</option>
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              >
                <option value="all">Todos os Status</option>
                <option value="Pendente de Orçamento">Pendente de Orçamento</option>
                <option value="Orçado pelo Profissional">Orçado pelo Profissional</option>
                <option value="Aprovado pelo Solicitante">Aprovado</option>
              </select>
            </div>

            <button
              onClick={() => setActiveTab('new_request')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Descrever Novo Serviço</span>
            </button>
          </div>

          {/* Cards of Service Requests */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Não há pedidos de serviços com os filtros selecionados. Clique em "Descrever Novo Serviço" para cadastrar a demanda do solicitante.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredRequests.map((req) => {
                const isOutOfTownJob = req.isOutOfTown;

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500/40 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Badges & Urgency */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {req.category}
                          </span>

                          {isOutOfTownJob ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Truck className="w-3 h-3" />
                              <span>Fora da Cidade ({req.distanceKm || 100} km) • Requer Diárias</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              <MapPin className="w-3 h-3" />
                              <span>Serviço na Cidade</span>
                            </span>
                          )}

                          {req.urgency === 'Urgente' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-600 dark:text-rose-400">
                              Urgente
                            </span>
                          )}
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          req.status === 'Orçado pelo Profissional'
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            : req.status === 'Aprovado pelo Solicitante'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Title & Description of requested work */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {req.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {req.description}
                        </p>
                      </div>

                      {/* Scope & Location Details */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            <span>Local do Serviço</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {req.city} - {req.state}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {req.address}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                            <User className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Solicitante</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {req.clientName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {req.clientPhone || 'WhatsApp não informado'}
                          </p>
                        </div>
                      </div>

                      {/* Out of town highlights */}
                      {isOutOfTownJob && (
                        <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 text-xs space-y-1.5">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                            <Truck className="w-4 h-4 text-amber-500" />
                            <span>Custos de Logística Requeridos para este Serviço:</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Mobilização</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Transporte / KM</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Diárias & Hotel</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* If a quote has already been applied */}
                      {req.appliedQuote && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                            <span>Orçamento Emitido pelo Profissional:</span>
                            <span className="text-sm font-extrabold">
                              R$ {req.appliedQuote.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>Mão de Obra: R$ {req.appliedQuote.laborTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span>Logística: R$ {req.appliedQuote.logistics?.totalLogisticsAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onDeleteServiceRequest(req.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Excluir solicitação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {req.appliedQuote && (
                          <button
                            onClick={() => {
                              setMpTargetRequest(req);
                              setIsMpModalOpen(true);
                            }}
                            className="px-3 py-2 bg-[#009ee3] hover:bg-[#0082ba] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition"
                            title="Pagar entrada ou total com Mercado Pago (Pix/Cartão)"
                          >
                            <div className="w-3.5 h-3.5 rounded bg-white text-[#009ee3] flex items-center justify-center font-black text-[8px]">
                              mp
                            </div>
                            <span>Pagar via Mercado Pago</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenQuoteBuilder(req)}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Precificar & Gerar Proposta</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SOLICITANTE CREATES NEW SERVICE REQUEST */}
      {activeTab === 'new_request' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Descrever Serviços Solicitados (Visão do Solicitante)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Descreva detalhadamente o que precisa ser executado para que os profissionais enviem suas cotações
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateRequest} className="py-6 space-y-5">
            {/* Promoção de Inscrição Notice */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Inscrição de Lançamento Gratuita:</strong>
                Sua inscrição na plataforma como solicitante é 100% gratuita. Ao submeter seu pedido, os profissionais parceiros enviarão suas propostas comerciais com os devidos custos de mão de obra e logística para você avaliar e aprovar.
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Título da Solicitação / Serviço Principal *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reforma Completa de Telhado, Instalação Elétrica Trifásica, Assentamento de Porcelanato"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            {/* Category & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Categoria de Serviço
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="Reformas & Acabamentos">Reformas & Acabamentos</option>
                  <option value="Construção & Alvenaria">Construção & Alvenaria</option>
                  <option value="Instalações Elétricas">Instalações Elétricas</option>
                  <option value="Instalações Hidráulicas">Instalações Hidráulicas</option>
                  <option value="Pintura & Texturas">Pintura & Texturas</option>
                  <option value="Telhados & Coberturas">Telhados & Coberturas</option>
                  <option value="Gesso & Drywall">Gesso & Drywall</option>
                  <option value="Estruturas & Madeira">Estruturas & Madeira / Deck</option>
                  <option value="Outros Serviços Técnicos">Outros Serviços Técnicos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nível de Urgência
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="Normal">Normal (Planejamento regular)</option>
                  <option value="Alta">Alta (Início nos próximos 7 dias)</option>
                  <option value="Urgente">Urgente (Imediato / Emergencial)</option>
                </select>
              </div>
            </div>

            {/* Description of work */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Descrição Detalhada do Serviço a Executar *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva tudo o que precisa ser feito (ex: remoção de entulho, demolição de parede de 15m², abertura de rasgos para conduíte, impermeabilização com manta asfáltica, instalação de 3 caixas de gordura...)"
                className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 outline-hidden leading-relaxed"
              />
            </div>

            {/* Estimated scope & Desired start */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Escopo Estimado / Metragens (se souber)
                </label>
                <input
                  type="text"
                  value={estimatedScope}
                  onChange={(e) => setEstimatedScope(e.target.value)}
                  placeholder="Ex: 80m² de piso, 2 banheiros, 12 pontos de tomada"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Previsão Desejada para Início
                </label>
                <input
                  type="date"
                  value={desiredStartDate}
                  onChange={(e) => setDesiredStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* Location & Out of Town Logistics Switch */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <MapPin className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Localização da Obra / Serviço
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cidade da Obra *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Campos do Jordão, Campinas, São Paulo"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Estado *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Endereço / Bairro / Referência</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro ou Zona Rural"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* OUT OF TOWN TOGGLE */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOutOfTown}
                    onChange={(e) => setIsOutOfTown(e.target.checked)}
                    className="mt-0.5 rounded-sm text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Este serviço é FORA da cidade base do profissional?
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Marque esta opção se os profissionais precisarão incluir custos de deslocamento, transporte, mobilização e diárias de alimentação/hospedagem.
                    </span>
                  </div>
                </label>

                {isOutOfTown && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Distância estimada da cidade base (em KM de ida):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      placeholder="Ex: 120 km"
                      className="w-48 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Solicitante Contact */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <User className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Dados de Contato do Solicitante
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nome do Solicitante *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">WhatsApp / Telefone para Contato *</label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>{submittedSuccess ? 'Solicitação Enviada com Sucesso!' : 'Enviar Solicitação para Cotação'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: QUICK LOGISTICS & PER DIEM CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Calculadora de Mobilização, Transporte, Alimentação & Hospedagem
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simule com precisão todos os custos operacionais para serviços e obras executadas fora da cidade base
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Input Form Column */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Parâmetros da Obra Fora da Cidade
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nº de Profissionais na Equipe
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={calcTeamSize}
                    onChange={(e) => setCalcTeamSize(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Duração / Dias de Obra
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={calcDays}
                    onChange={(e) => setCalcDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Distância de Ida (KM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={calcDistanceOneWay}
                    onChange={(e) => setCalcDistanceOneWay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Pedágios Totais (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={calcTolls}
                    onChange={(e) => setCalcTolls(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-2">
                2. Diárias & Mobilização
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Alimentação / pessoa / dia (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={calcDailyMeal}
                    onChange={(e) => setCalcDailyMeal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Hospedagem / pessoa / noite (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={calcDailyLodging}
                    onChange={(e) => setCalcDailyLodging(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Mobilização & Desmobilização (Canteiro, Ferramental, Andaimes) (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  value={calcMobilization}
                  onChange={(e) => setCalcMobilization(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* Results Column */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-700">
                  Resumo Detalhado dos Custos de Logística
                </h3>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-500" />
                    Mobilização & Desmobilização:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    R$ {calcMobilization.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-500" />
                    Transporte ({totalKmRoundTrip} km ida/volta + pedágios):
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    R$ {totalTransportCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                    Alimentação ({calcTeamSize} pessoas x {calcDays} dias x R${calcDailyMeal}):
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    R$ {totalMealsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Hotel className="w-3.5 h-3.5 text-purple-500" />
                    Hospedagem ({calcTeamSize} pessoas x {calcDays} noites x R${calcDailyLodging}):
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    R$ {totalLodgingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Total Box */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-500/30 space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  Total de Logística & Diárias Fora da Cidade:
                </div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  R$ {totalLogisticsAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Este valor pode ser adicionado diretamente na proposta comercial que será enviada ao solicitante.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR PRICING AND QUOTING A REQUEST (PROFESSIONAL VIEW) */}
      {selectedRequestForQuote && (
        <ServiceProposalModal
          isOpen={isQuoteModalOpen}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setSelectedRequestForQuote(null);
          }}
          project={currentProject}
          serviceRequest={selectedRequestForQuote}
          onApplyProposal={(items, totalAmount, notes, logisticsQuote) => {
            // Update request status to Quoted
            const updatedRequest: ServiceRequest = {
              ...selectedRequestForQuote,
              status: 'Orçado pelo Profissional',
              appliedQuote: {
                id: `prop-${Date.now()}`,
                projectId: currentProject?.id || '',
                serviceRequestId: selectedRequestForQuote.id,
                clientName: selectedRequestForQuote.clientName,
                clientPhone: selectedRequestForQuote.clientPhone,
                clientAddress: selectedRequestForQuote.address,
                professionalName: 'Mãos em Obra • Serviços Especializados',
                professionalPhone: '(11) 98765-4321',
                proposalDate: new Date().toISOString().split('T')[0],
                validityDays: 15,
                paymentTerms: 'Entrada + parcelas conforme medição',
                executionDays: 10,
                items,
                laborTotal: items.filter(i => i.category === 'Mão de Obra').reduce((a, b) => a + b.totalPrice, 0),
                materialsTotal: items.filter(i => i.category !== 'Mão de Obra').reduce((a, b) => a + b.totalPrice, 0),
                logistics: logisticsQuote,
                totalAmount,
                notes,
                createdAt: new Date().toISOString(),
                isOutOfTown: selectedRequestForQuote.isOutOfTown,
              }
            };
            onUpdateServiceRequest(updatedRequest);

            // Convert items and logistics into project expenses
            const newExpenses: Expense[] = items.map((item, idx) => ({
              id: `exp-prop-${Date.now()}-${idx}`,
              projectId: currentProject?.id || 'proj-1',
              description: item.description,
              category: item.category,
              plannedAmount: item.totalPrice,
              actualAmount: item.totalPrice,
              status: 'Pendente',
              date: new Date().toISOString().split('T')[0],
              supplier: 'Proposta Comercial - ' + selectedRequestForQuote.clientName,
            }));

            // Add logistics expenses if present
            if (logisticsQuote && logisticsQuote.totalLogisticsAmount > 0) {
              if (logisticsQuote.mobilizationAmount > 0) {
                newExpenses.push({
                  id: `exp-log-mob-${Date.now()}`,
                  projectId: currentProject?.id || 'proj-1',
                  description: 'Mobilização e Desmobilização de Equipamentos e Equipe',
                  category: 'Mobilização & Desmobilização',
                  plannedAmount: logisticsQuote.mobilizationAmount,
                  actualAmount: logisticsQuote.mobilizationAmount,
                  status: 'Pendente',
                  date: new Date().toISOString().split('T')[0],
                  supplier: 'Logística de Obra',
                });
              }

              if (logisticsQuote.transportAmount > 0) {
                newExpenses.push({
                  id: `exp-log-transp-${Date.now()}`,
                  projectId: currentProject?.id || 'proj-1',
                  description: 'Transporte, Combustível e Deslocamento Regional',
                  category: 'Transporte & Deslocamento',
                  plannedAmount: logisticsQuote.transportAmount,
                  actualAmount: logisticsQuote.transportAmount,
                  status: 'Pendente',
                  date: new Date().toISOString().split('T')[0],
                  supplier: 'Transporte / Logística',
                });
              }

              if (logisticsQuote.totalMealsAmount > 0 || logisticsQuote.totalLodgingAmount > 0) {
                newExpenses.push({
                  id: `exp-log-meals-${Date.now()}`,
                  projectId: currentProject?.id || 'proj-1',
                  description: `Diárias Fora da Cidade (${logisticsQuote.teamSize} pessoas x ${logisticsQuote.daysCount} dias - Alimentação & Hospedagem)`,
                  category: 'Alimentação & Hospedagem (Fora da Cidade)',
                  plannedAmount: (logisticsQuote.totalMealsAmount || 0) + (logisticsQuote.totalLodgingAmount || 0),
                  actualAmount: (logisticsQuote.totalMealsAmount || 0) + (logisticsQuote.totalLodgingAmount || 0),
                  status: 'Pendente',
                  date: new Date().toISOString().split('T')[0],
                  supplier: 'Hospedagem & Alimentação Equipe',
                });
              }
            }

            onApplyQuoteToExpenses(newExpenses, totalAmount);
            confetti({ particleCount: 50, spread: 60 });
          }}
        />
      )}

      {/* Mercado Pago Modal for Service Requests */}
      {mpTargetRequest && (
        <MercadoPagoModal
          isOpen={isMpModalOpen}
          onClose={() => {
            setIsMpModalOpen(false);
            setMpTargetRequest(null);
          }}
          title={mpTargetRequest.title}
          amount={mpTargetRequest.appliedQuote?.totalAmount || 100}
          description={`Serviço: ${mpTargetRequest.title} - ${mpTargetRequest.clientName}`}
          payerName={mpTargetRequest.clientName}
          payerEmail={mpTargetRequest.clientEmail || 'cliente@obra.com.br'}
          referenceId={`req-${mpTargetRequest.id}-${Date.now()}`}
          onPaymentSuccess={() => {
            alert('Pagamento processado com sucesso via Mercado Pago! Proposta aprovada.');
            const updated: ServiceRequest = {
              ...mpTargetRequest,
              status: 'Aprovado pelo Solicitante',
            };
            onUpdateServiceRequest(updated);
            setIsMpModalOpen(false);
            setMpTargetRequest(null);
          }}
        />
      )}

    </div>
  );
};
