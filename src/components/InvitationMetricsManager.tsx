import React, { useState, useMemo, useEffect } from 'react';
import { 
  Send, 
  CheckCheck, 
  Eye, 
  MessageSquare, 
  MessageCircle,
  Building2, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  TrendingUp, 
  Sparkles, 
  Phone, 
  Mail, 
  Check, 
  Copy, 
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  Zap,
  Inbox,
  AlertCircle,
  X
} from 'lucide-react';
import type { CorporateContact, CorporateContactRegion, CorporateContactStatus } from '../types';
import { loadCorporateContacts, saveCorporateContacts, updateCorporateContactStatus } from '../services/storage';
import confetti from 'canvas-confetti';

interface InvitationMetricsManagerProps {
  onRefreshParent?: () => void;
}

export const InvitationMetricsManager: React.FC<InvitationMetricsManagerProps> = ({
  onRefreshParent,
}) => {
  const [contacts, setContacts] = useState<CorporateContact[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | CorporateContactStatus | 'WITH_RESPONSE'>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | CorporateContactRegion>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'kpis' | 'responses' | 'contacts'>('kpis');

  // Modal de Registro de Resposta
  const [editingResponseContact, setEditingResponseContact] = useState<CorporateContact | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseInterest, setResponseInterest] = useState<'Interessado' | 'Em Avaliação' | 'Cadastrado' | 'Sem Interesse'>('Interessado');

  const loadData = () => {
    const loaded = loadCorporateContacts();
    setContacts(loaded);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Métricas de funil de envio
  const metrics = useMemo(() => {
    const total = contacts.length;
    const sent = contacts.filter(c => c.status !== 'Pendente' && c.status !== 'Na Fila').length;
    const received = contacts.filter(c => ['Recebido', 'Visualizado', 'Lido', 'Respondido'].includes(c.status)).length;
    const viewed = contacts.filter(c => ['Visualizado', 'Lido', 'Respondido'].includes(c.status)).length;
    const read = contacts.filter(c => ['Lido', 'Respondido'].includes(c.status)).length;
    const responded = contacts.filter(c => c.status === 'Respondido').length;
    const pending = contacts.filter(c => c.status === 'Pendente' || c.status === 'Na Fila').length;

    // Respostas com texto registrado
    const responsesList = contacts.filter(c => c.responseText && c.responseText.trim().length > 0);

    // Taxas
    const deliveryRate = sent > 0 ? ((received / sent) * 100).toFixed(1) : '0.0';
    const viewRate = sent > 0 ? ((viewed / sent) * 100).toFixed(1) : '0.0';
    const readRate = sent > 0 ? ((read / sent) * 100).toFixed(1) : '0.0';
    const responseRate = sent > 0 ? ((responded / sent) * 100).toFixed(1) : '0.0';

    return {
      total,
      sent,
      received,
      viewed,
      read,
      responded,
      pending,
      responsesList,
      deliveryRate,
      viewRate,
      readRate,
      responseRate,
    };
  }, [contacts]);

  // Lista filtrada para tabela
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // Filtro de região
      if (selectedRegion !== 'ALL' && c.region !== selectedRegion) return false;

      // Filtro de status
      if (selectedStatus === 'WITH_RESPONSE') {
        if (!c.responseText || c.responseText.trim().length === 0) return false;
      } else if (selectedStatus !== 'ALL') {
        if (c.status !== selectedStatus) return false;
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchName = c.name.toLowerCase().includes(s);
        const matchEmail = c.email.toLowerCase().includes(s);
        const matchPhone = c.phone.includes(s) || c.whatsapp.includes(s);
        const matchResponse = c.responseText?.toLowerCase().includes(s);
        if (!matchName && !matchEmail && !matchPhone && !matchResponse) return false;
      }

      return true;
    });
  }, [contacts, selectedRegion, selectedStatus, searchTerm]);

  // Atualizar status individual com 1 clique
  const handleQuickAdvanceStatus = (contact: CorporateContact, nextStatus: CorporateContactStatus) => {
    const updated = updateCorporateContactStatus(contact.id, nextStatus, contact.dispatchChannel || 'WhatsApp');
    setContacts(updated);
    if (nextStatus === 'Respondido') {
      confetti({ particleCount: 80, spread: 60 });
    }
    if (onRefreshParent) onRefreshParent();
  };

  // Abrir modal de resposta
  const handleOpenResponseModal = (contact: CorporateContact) => {
    setEditingResponseContact(contact);
    setResponseText(contact.responseText || '');
    setResponseInterest(contact.responseInterest || 'Interessado');
  };

  // Salvar resposta da empresa
  const handleSaveResponse = () => {
    if (!editingResponseContact) return;

    const updated = updateCorporateContactStatus(
      editingResponseContact.id,
      'Respondido',
      editingResponseContact.dispatchChannel || 'WhatsApp',
      {
        responseText: responseText.trim() || 'Resposta recebida via WhatsApp.',
        responseInterest,
      }
    );

    setContacts(updated);
    setEditingResponseContact(null);

    if (responseInterest === 'Interessado' || responseInterest === 'Cadastrado') {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    if (onRefreshParent) onRefreshParent();
  };

  // Respostas Rápidas pré-definidas para o modal
  const quickReplies = [
    { text: 'Recebemos o convite e temos interesse em cadastrar nossas obras no portal.', interest: 'Interessado' as const },
    { text: 'Favor enviar apresentação comercial e valores de planos para nosso setor de compras.', interest: 'Em Avaliação' as const },
    { text: 'Excelente iniciativa! Já efetuamos o cadastro de nossa equipe na plataforma.', interest: 'Cadastrado' as const },
    { text: 'Gostamos das ferramentas de RDO digital e cotações. Gostaríamos de uma demonstração.', interest: 'Interessado' as const },
  ];

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-2xl shadow-sm">
              <Send className="w-5 h-5 fill-slate-950" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Painel de Gestão de Convites & Status de Conversão
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
              CRM 300+ Empresas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe o funil completo: quantidade enviada, recebidos, visualizados, lidos, respondidos e o conteúdo das respostas das empresas.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'kpis'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            <span>Funil & Métricas</span>
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'responses'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Respostas Recebidas ({metrics.responsesList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'contacts'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Lista de Contatos ({metrics.total})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📊 KPI CARDS: ENVIADO, RECEBIDO, VISUALIZADO, LIDO, RESPONDIDO */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* 1. Total Base */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Base Oficial</span>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.total}
          </div>
          <div className="text-[10px] text-slate-500">
            {metrics.pending} pendentes
          </div>
        </div>

        {/* 2. Enviados */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-1">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Enviados</span>
            <Send className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
            {metrics.sent}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
            {metrics.total > 0 ? ((metrics.sent / metrics.total) * 100).toFixed(0) : 0}% da base
          </div>
        </div>

        {/* 3. Recebidos */}
        <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-900/40 space-y-1">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Recebidos</span>
            <Inbox className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-teal-700 dark:text-teal-300">
            {metrics.received}
          </div>
          <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
            {metrics.deliveryRate}% entrega
          </div>
        </div>

        {/* 4. Visualizados */}
        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-900/40 space-y-1">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Visualizados</span>
            <Eye className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300">
            {metrics.viewed}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
            {metrics.viewRate}% abertura
          </div>
        </div>

        {/* 5. Lidos */}
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 space-y-1">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Lidos</span>
            <CheckCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
            {metrics.read}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
            {metrics.readRate}% leitura
          </div>
        </div>

        {/* 6. Respondidos */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider">Respondidos</span>
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {metrics.responded}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            {metrics.responseRate}% conversão
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 🚀 FUNIL VISUAL DE PROGRESSÃO */}
      {/* ======================================================== */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Progresso do Funil de Convites
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {metrics.sent} disparados • {metrics.responded} respostas obtidas
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pt-1 text-[10px]">
          {/* Enviado */}
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-blue-500 w-full" />
            <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
              <span>Enviados</span>
              <span>{metrics.sent}</span>
            </div>
          </div>

          {/* Recebido */}
          <div className="space-y-1">
            <div 
              className="h-2 rounded-full bg-teal-500 transition-all duration-500" 
              style={{ width: `${metrics.sent > 0 ? (metrics.received / metrics.sent) * 100 : 0}%` }}
            />
            <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
              <span>Recebidos</span>
              <span>{metrics.received}</span>
            </div>
          </div>

          {/* Visualizado */}
          <div className="space-y-1">
            <div 
              className="h-2 rounded-full bg-purple-500 transition-all duration-500" 
              style={{ width: `${metrics.sent > 0 ? (metrics.viewed / metrics.sent) * 100 : 0}%` }}
            />
            <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
              <span>Vistos</span>
              <span>{metrics.viewed}</span>
            </div>
          </div>

          {/* Lido */}
          <div className="space-y-1">
            <div 
              className="h-2 rounded-full bg-indigo-500 transition-all duration-500" 
              style={{ width: `${metrics.sent > 0 ? (metrics.read / metrics.sent) * 100 : 0}%` }}
            />
            <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
              <span>Lidos</span>
              <span>{metrics.read}</span>
            </div>
          </div>

          {/* Respondido */}
          <div className="space-y-1">
            <div 
              className="h-2 rounded-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${metrics.sent > 0 ? (metrics.responded / metrics.sent) * 100 : 0}%` }}
            />
            <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 font-black">
              <span>Respondidos</span>
              <span>{metrics.responded}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 💬 TAB: FEED DE RESPOSTAS RECEBIDAS DAS EMPRESAS */}
      {/* ======================================================== */}
      {activeTab === 'responses' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>Respostas Obtidas dos Contatos ({metrics.responsesList.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Empresas que responderam à abordagem de convite para ingressar no Mãos em Obra.
              </p>
            </div>
          </div>

          {metrics.responsesList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              Nenhuma resposta registrada ainda. Registre respostas na aba "Lista de Contatos".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {metrics.responsesList.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {contact.name}
                        </h5>
                        <span className="text-[10px] text-slate-400">
                          {contact.category || 'Construtora'} • {contact.region}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        contact.responseInterest === 'Interessado'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                          : contact.responseInterest === 'Cadastrado'
                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300'
                          : contact.responseInterest === 'Em Avaliação'
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {contact.responseInterest || 'Respondido'}
                      </span>
                    </div>

                    {/* Resposta Textual */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 italic relative">
                      "{contact.responseText}"
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Respondido em: {contact.respondedAt ? new Date(contact.respondedAt).toLocaleString('pt-BR') : 'Data registrada'}</span>
                      <span>Canal: {contact.dispatchChannel || 'WhatsApp'}</span>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <a
                      href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Olá ${contact.name}, recebemos sua resposta e estamos à disposição para auxiliar no cadastro e publicação de obras na plataforma Mãos em Obra!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Conversar no WhatsApp</span>
                    </a>
                    <button
                      onClick={() => handleOpenResponseModal(contact)}
                      className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 📋 TAB: LISTA COMPLETA DE CONTATOS & STATUS */}
      {/* ======================================================== */}
      {(activeTab === 'contacts' || activeTab === 'kpis') && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por empresa, telefone, e-mail ou resposta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Region Filter */}
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todas as Regiões</option>
                <option value="SP">São Paulo (SP)</option>
                <option value="RJ">Rio de Janeiro (RJ)</option>
                <option value="MG">Minas Gerais (MG)</option>
                <option value="BA">Bahia & Nordeste (BA)</option>
                <option value="Nacional">Nacional</option>
                <option value="Internacional">Internacional (Portugal)</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todos os Status</option>
                <option value="WITH_RESPONSE">💬 Apenas com Resposta</option>
                <option value="Respondido">Respondidos</option>
                <option value="Lido">Lidos (Check Duplo)</option>
                <option value="Visualizado">Visualizados</option>
                <option value="Recebido">Recebidos</option>
                <option value="Enviado">Enviados</option>
                <option value="Pendente">Pendentes</option>
              </select>

              <button
                onClick={loadData}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Recarregar Contatos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Empresa / Contato</th>
                  <th className="py-3 px-3">Região</th>
                  <th className="py-3 px-3">WhatsApp / E-mail</th>
                  <th className="py-3 px-3">Status Atual</th>
                  <th className="py-3 px-3">Resposta da Empresa</th>
                  <th className="py-3 px-3 text-right">Atualizar Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContacts.slice(0, 25).map((contact) => {
                  const isSent = contact.status === 'Enviado';
                  const isReceived = contact.status === 'Recebido';
                  const isViewed = contact.status === 'Visualizado';
                  const isRead = contact.status === 'Lido';
                  const isResponded = contact.status === 'Respondido';
                  const isPending = contact.status === 'Pendente';

                  return (
                    <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      {/* Empresa */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                          {contact.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {contact.category || 'Construção Civil'}
                        </div>
                      </td>

                      {/* Região */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {contact.region}
                        </span>
                      </td>

                      {/* Contato */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                          {contact.phone}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {contact.email}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isResponded
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                            : isRead
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300'
                            : isViewed
                            ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300'
                            : isReceived
                            ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-300'
                            : isSent
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300'
                        }`}>
                          {isResponded && <MessageSquare className="w-3 h-3 text-emerald-600" />}
                          {isRead && <CheckCheck className="w-3 h-3 text-indigo-600" />}
                          {isViewed && <Eye className="w-3 h-3 text-purple-600" />}
                          {isReceived && <Inbox className="w-3 h-3 text-teal-600" />}
                          {isSent && <Send className="w-3 h-3 text-blue-600" />}
                          {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{contact.status}</span>
                        </span>
                      </td>

                      {/* Resposta */}
                      <td className="py-3 px-3 max-w-xs">
                        {contact.responseText ? (
                          <div className="space-y-0.5">
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 italic truncate" title={contact.responseText}>
                              "{contact.responseText}"
                            </p>
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                              {contact.responseInterest || 'Interessado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sem resposta ainda</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Registrar / Editar Resposta */}
                          <button
                            onClick={() => handleOpenResponseModal(contact)}
                            className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Registrar resposta recebida da empresa"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>{contact.responseText ? 'Ver Resposta' : 'Registrar Resposta'}</span>
                          </button>

                          {/* Ciclo Rápido */}
                          {contact.status === 'Pendente' && (
                            <button
                              onClick={() => handleQuickAdvanceStatus(contact, 'Enviado')}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Marcar Enviado
                            </button>
                          )}
                          {contact.status === 'Enviado' && (
                            <button
                              onClick={() => handleQuickAdvanceStatus(contact, 'Recebido')}
                              className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Marcar Recebido
                            </button>
                          )}
                          {contact.status === 'Recebido' && (
                            <button
                              onClick={() => handleQuickAdvanceStatus(contact, 'Visualizado')}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Marcar Visto
                            </button>
                          )}
                          {contact.status === 'Visualizado' && (
                            <button
                              onClick={() => handleQuickAdvanceStatus(contact, 'Lido')}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Marcar Lido
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>Exibindo os primeiros 25 contatos de {filteredContacts.length} filtrados.</span>
            <span className="font-bold text-amber-600">Base com 300+ construtoras e fornecedores cadastrados</span>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 📝 MODAL: REGISTRAR / EDITAR RESPOSTA DA EMPRESA */}
      {/* ======================================================== */}
      {editingResponseContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Registrar Resposta de {editingResponseContact.name}
                </h4>
              </div>
              <button onClick={() => setEditingResponseContact(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Contato:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{editingResponseContact.phone} • {editingResponseContact.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Região:</span>
                <span className="font-bold text-amber-600">{editingResponseContact.region}</span>
              </div>
            </div>

            {/* Sugestões de Respostas Rápidas */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Modelos de Resposta Rápida:</span>
              <div className="space-y-1">
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setResponseText(qr.text);
                      setResponseInterest(qr.interest);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-[11px] text-slate-700 dark:text-slate-300 transition cursor-pointer border border-transparent hover:border-emerald-300"
                  >
                    "{qr.text}"
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de Texto da Resposta */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Texto / Conteúdo da Resposta:
              </label>
              <textarea
                rows={3}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Digite a resposta enviada pela empresa ou o resumo do contato..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* Nível de Interesse */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Classificação de Interesse da Empresa:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['Interessado', 'Em Avaliação', 'Cadastrado', 'Sem Interesse'] as const).map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => setResponseInterest(interest)}
                    className={`py-2 px-3 rounded-xl font-bold transition border cursor-pointer ${
                      responseInterest === interest
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingResponseContact(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveResponse}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
              >
                Salvar Resposta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
