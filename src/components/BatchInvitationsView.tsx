import React, { useState, useMemo, useEffect } from 'react';
import {
  Send,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  Search,
  Building2,
  Globe,
  RefreshCw,
  Play,
  Pause,
  Copy,
  Check,
  Plus,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpRight,
  MessageSquare
} from 'lucide-react';
import type { CorporateContact, CorporateContactRegion, CorporateContactStatus } from '../types';
import { loadCorporateContacts, saveCorporateContacts, updateCorporateContactStatus } from '../services/storage';
import confetti from 'canvas-confetti';

interface BatchInvitationsViewProps {
  onNavigateToOpportunities?: () => void;
}

export const BatchInvitationsView: React.FC<BatchInvitationsViewProps> = ({
  onNavigateToOpportunities,
}) => {
  const [contacts, setContacts] = useState<CorporateContact[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | CorporateContactRegion>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | CorporateContactStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Template state
  const templates = [
    {
      id: 'template-parceria',
      title: 'Convite Parceria & Obras Abertas',
      tag: 'Alta Conversão',
      subject: 'Oportunidades de Obras & Parceria Comercial - Plataforma Mãos em Obra',
      body: 'Olá equipe da {empresa}! Localizamos sua empresa e gostaríamos de convidá-los para acessar a plataforma Mãos em Obra. Temos solicitações de orçamentos, demandas de reformas e oportunidades de subempreitada ativas na sua região. Conheça e receba demandas de obras em: https://maosemobra.app',
    },
    {
      id: 'template-oportunidades',
      title: 'Painel de Oportunidades & Subempreiteiras',
      tag: 'Prestadores & Vagas',
      subject: 'Conecte sua construtora a novos clientes e obras no Mãos em Obra',
      body: 'Prezados da {empresa}, estamos conectando construtoras e fornecedores a clientes qualificados através do Mãos em Obra. Cadastre sua equipe ou divulgue suas vagas e propostas em nosso Painel de Oportunidades com avaliação de reputação: https://maosemobra.app',
    },
    {
      id: 'template-gestao-rdo',
      title: 'Apresentação Mãos em Obra (RDO + Gestão)',
      tag: 'Gestão Completa',
      subject: 'Diário de Obra Digital e Gestão Completa para a {empresa}',
      body: 'Olá {empresa}! O Mãos em Obra é o sistema completo para Diário de Obra Digital (RDO), controle financeiro, cotação de materiais e gestão de equipes na construção civil. Conheça as ferramentas e modernize o controle dos seus canteiros: https://maosemobra.app',
    },
  ];

  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0].id);
  const [customMessage, setCustomMessage] = useState<string>(templates[0].body);

  // Automated Queue Dispatch State
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueProgress, setQueueProgress] = useState(0);
  const [queueCurrentIndex, setQueueCurrentIndex] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [currentQueueContact, setCurrentQueueContact] = useState<CorporateContact | null>(null);
  const [dispatchIntervalMs, setDispatchIntervalMs] = useState(2500);

  // Modal Novo Contato
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyRegion, setNewCompanyRegion] = useState<CorporateContactRegion>('SP');
  const [newCompanyCategory, setNewCompanyCategory] = useState('Construtora & Incorporadora');

  // Load contacts
  useEffect(() => {
    const loaded = loadCorporateContacts();
    setContacts(loaded);
  }, []);

  // Sync template change
  const handleSelectTemplate = (templateId: string) => {
    setActiveTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setCustomMessage(tmpl.body);
    }
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchRegion = selectedRegion === 'ALL' || c.region === selectedRegion;
      const matchStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.toLowerCase().includes(search) ||
        (c.category && c.category.toLowerCase().includes(search));

      return matchRegion && matchStatus && matchSearch;
    });
  }, [contacts, selectedRegion, selectedStatus, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = contacts.length;
    const sent = contacts.filter((c) => c.status !== 'Pendente' && c.status !== 'Na Fila').length;
    const pending = total - sent;
    const spCount = contacts.filter((c) => c.region === 'SP').length;
    const rjCount = contacts.filter((c) => c.region === 'RJ').length;
    const mgCount = contacts.filter((c) => c.region === 'MG').length;
    const baCount = contacts.filter((c) => c.region === 'BA').length;
    const nacCount = contacts.filter((c) => c.region === 'Nacional').length;
    const intCount = contacts.filter((c) => c.region === 'Internacional').length;

    return { total, sent, pending, spCount, rjCount, mgCount, baCount, nacCount, intCount };
  }, [contacts]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  // Copy helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Build tailored message
  const getTailoredMessage = (companyName: string) => {
    return customMessage.replace(/{empresa}/g, companyName);
  };

  // Manual WhatsApp Dispatch
  const handleManualWhatsApp = (contact: CorporateContact) => {
    const msg = getTailoredMessage(contact.name);
    const cleanPhone = contact.whatsapp.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    const updated = updateCorporateContactStatus(contact.id, 'Enviado', 'WhatsApp');
    setContacts(updated);
    confetti({ particleCount: 30, spread: 60 });
  };

  // Manual Email Dispatch
  const handleManualEmail = (contact: CorporateContact) => {
    const currentTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];
    const subject = currentTemplate.subject.replace(/{empresa}/g, contact.name);
    const body = getTailoredMessage(contact.name);
    const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    const updated = updateCorporateContactStatus(contact.id, 'Enviado', 'Email');
    setContacts(updated);
  };

  // Batch Email Copy (BCC / Cco)
  const handleCopyBatchEmails = () => {
    const targetContacts =
      selectedIds.size > 0
        ? contacts.filter((c) => selectedIds.has(c.id))
        : filteredContacts;

    if (targetContacts.length === 0) {
      alert('Nenhum contato selecionado ou visível para copiar.');
      return;
    }

    const emailList = targetContacts.map((c) => c.email).filter(Boolean).join('; ');
    handleCopyText(emailList, 'batch-emails');
    confetti({ particleCount: 60, spread: 70 });
  };

  // Automated Queue Dispatch (Simulated CRM Batch Pipeline)
  const handleStartQueue = async () => {
    const targetIds =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : filteredContacts.filter((c) => c.status === 'Pendente').map((c) => c.id);

    if (targetIds.length === 0) {
      alert('Todos os contatos filtrados já foram disparados ou nenhum foi selecionado!');
      return;
    }

    setIsQueueRunning(true);
    setQueueTotal(targetIds.length);
    setQueueProgress(0);

    for (let i = 0; i < targetIds.length; i++) {
      const id = targetIds[i];
      const contact = contacts.find((c) => c.id === id);
      if (!contact) continue;

      setQueueCurrentIndex(i + 1);
      setCurrentQueueContact(contact);
      setQueueProgress(Math.round(((i + 1) / targetIds.length) * 100));

      // Wait interval
      await new Promise((resolve) => setTimeout(resolve, dispatchIntervalMs));

      // Update contact status
      const updated = updateCorporateContactStatus(id, 'Enviado', 'WhatsApp');
      setContacts(updated);
    }

    setIsQueueRunning(false);
    setCurrentQueueContact(null);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    alert(`Sucesso! ${targetIds.length} convites foram processados e disparados no lote.`);
    setSelectedIds(new Set());
  };

  // Add new company
  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    const cleanWhatsapp = newCompanyPhone.replace(/\D/g, '');
    const newContact: CorporateContact = {
      id: `custom-${Date.now()}`,
      name: newCompanyName.trim(),
      phone: newCompanyPhone.trim(),
      whatsapp: cleanWhatsapp.startsWith('55') ? cleanWhatsapp : `55${cleanWhatsapp}`,
      email: newCompanyEmail.trim(),
      region: newCompanyRegion,
      status: 'Pendente',
      category: newCompanyCategory,
    };

    const nextContacts = [newContact, ...contacts];
    saveCorporateContacts(nextContacts);
    setContacts(nextContacts);

    setNewCompanyName('');
    setNewCompanyPhone('');
    setNewCompanyEmail('');
    setIsAddModalOpen(false);
    confetti({ particleCount: 50, spread: 60 });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in">
      {/* ======================================================== */}
      {/* 🚀 BANNER SUPERIOR: DISPARO DE CONVITES EM LOTE */}
      {/* ======================================================== */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 text-white border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-sm">
                <Send className="w-3.5 h-3.5" />
                CENTRAL DE DISPAROS B2B
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-amber-300 border border-amber-400/20">
                {stats.total} Empresas Qualificadas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Disparo de Convites Automático & Manual em Lote
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Base oficial com mais de 300 construtoras, incorporadoras e empreiteiras (SP, RJ, MG, BA, Nacional e Portugal). Envie abordagens personalizadas via <strong>WhatsApp</strong> em 1 clique ou acione a <strong>Fila Automatizada CRM</strong>.
            </p>
          </div>

          {/* Quick Actions in Banner */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Cadastrar Empresa</span>
            </button>

            <button
              onClick={handleCopyBatchEmails}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
            >
              {copiedKey === 'batch-emails' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>E-mails Copiados (Cco)!</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Copiar Lote Cco</span>
                </>
              )}
            </button>

            {onNavigateToOpportunities && (
              <button
                onClick={onNavigateToOpportunities}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
              >
                <span>Ver Vagas & Obras</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total na Base</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-[10px] font-bold text-amber-400 uppercase">Pendentes</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">{stats.pending}</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-[10px] font-bold text-emerald-400 uppercase">Disparados</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{stats.sent}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase">São Paulo (SP)</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.spCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase">RJ / MG / BA</div>
            <div className="text-xl font-black text-white mt-0.5">
              {stats.rjCount + stats.mgCount + stats.baCount}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Internacional</div>
            <div className="text-xl font-black text-sky-400 mt-0.5">{stats.intCount} (PT)</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ✍️ MODELOS DE MENSAGENS & CONFIGURADOR DE DISPARO */}
      {/* ======================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                Configurar Mensagem do Convite & Abordagem
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A variável <code className="text-amber-600 dark:text-amber-400 font-bold">{`{empresa}`}</code> será substituída dinamicamente pelo nome de cada construtora.
              </p>
            </div>
          </div>

          {/* Template Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTemplateId === tmpl.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{tmpl.title}</span>
                <span className="text-[10px] opacity-70">({tmpl.tag})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Textarea for editing the message */}
        <div className="space-y-2">
          <textarea
            rows={3}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-amber-500 font-medium"
            placeholder="Digite o texto personalizado que será enviado para os contatos..."
          />
        </div>

        {/* Live Preview Bar */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
          <div className="truncate">
            <span className="font-bold text-amber-700 dark:text-amber-400 mr-2">Preview Dinâmico:</span>
            <span className="italic">"{getTailoredMessage('FBS Construtora')}"</span>
          </div>
          <button
            onClick={() => handleCopyText(getTailoredMessage('FBS Construtora'), 'preview-msg')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-amber-600 text-xs font-bold flex items-center gap-1 transition"
          >
            {copiedKey === 'preview-msg' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ⚡ DISPARO AUTOMÁTICO EM LOTE & BARRA DE PROGRESSO */}
      {/* ======================================================== */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-amber-500/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
                <span>Motor de Disparo Automático em Lote (CRM Pipeline)</span>
                {isQueueRunning && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black animate-pulse">
                    Fila Ativa
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Dispara convites em sequência com cadência configurável para os contatos selecionados ou filtrados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Interval Selector */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Intervalo:</span>
              <select
                value={dispatchIntervalMs}
                onChange={(e) => setDispatchIntervalMs(Number(e.target.value))}
                disabled={isQueueRunning}
                className="bg-transparent text-amber-400 font-bold focus:outline-none"
              >
                <option value={1500} className="bg-slate-900 text-white">1.5s (Rápido)</option>
                <option value={2500} className="bg-slate-900 text-white">2.5s (Recomendado)</option>
                <option value={4000} className="bg-slate-900 text-white">4.0s (Seguro)</option>
              </select>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartQueue}
              disabled={isQueueRunning || filteredContacts.length === 0}
              className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                isQueueRunning
                  ? 'bg-amber-600 text-white cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isQueueRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Disparando Fila ({queueCurrentIndex}/{queueTotal})...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Disparar Lote {selectedIds.size > 0 ? `(${selectedIds.size} selecionados)` : `(${filteredContacts.filter(c => c.status === 'Pendente').length} pendentes)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar (when running or recent) */}
        {isQueueRunning && (
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                Processando: <strong className="text-amber-400">{currentQueueContact?.name}</strong> ({currentQueueContact?.region})
              </span>
              <span className="font-mono text-amber-400 font-bold">{queueProgress}% ({queueCurrentIndex} de {queueTotal})</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${queueProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 🔍 FILTROS, BUSCA & BARRA DE AÇÃO EM LOTE */}
      {/* ======================================================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome da empresa, email, telefone ou região..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Region Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Região:</span>
          {(['ALL', 'SP', 'RJ', 'MG', 'BA', 'Nacional', 'Internacional'] as const).map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedRegion === reg
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {reg === 'ALL' ? 'Todas' : reg}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="Pendente">Pendentes</option>
            <option value="Enviado">Enviados</option>
            <option value="Recebido">Recebidos</option>
            <option value="Visualizado">Visualizados</option>
            <option value="Lido">Lidos</option>
            <option value="Respondido">Respondidos</option>
          </select>
        </div>
      </div>

      {/* Selected Action Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAllFiltered}
            className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
          >
            {selectedIds.size === filteredContacts.length && filteredContacts.length > 0
              ? 'Desmarcar Todos'
              : `Selecionar Todos os ${filteredContacts.length} Visíveis`}
          </button>
          {selectedIds.size > 0 && (
            <span className="font-bold text-slate-900 dark:text-white">
              ({selectedIds.size} selecionados)
            </span>
          )}
        </div>

        <div className="font-medium">
          Exibindo <strong>{filteredContacts.length}</strong> de {contacts.length} empresas
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📋 TABELA / GRID DE EMPRESAS PARA DISPARO */}
      {/* ======================================================== */}
      <div className="space-y-3">
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-40" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma empresa encontrada</h4>
            <p className="text-xs text-slate-500 mt-1">Ajuste os filtros de região ou termos de pesquisa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => {
              const isSelected = selectedIds.has(contact.id);
              const isSent = contact.status === 'Enviado' || contact.status === 'Respondido';

              return (
                <div
                  key={contact.id}
                  className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : isSent
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  {/* Top: Checkbox, Region Badge & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(contact.id)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {contact.region}
                      </span>
                      {contact.category && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {contact.category}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                        isSent
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {isSent ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{contact.status}</span>
                    </span>
                  </div>

                  {/* Body: Name & Contact Info */}
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {contact.name}
                    </h4>

                    <div className="space-y-1 text-xs">
                      {/* Phone / WhatsApp */}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate">
                        <Mail className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    </div>

                    {contact.lastDispatchedAt && (
                      <div className="text-[10px] text-slate-400 italic">
                        Último envio: {new Date(contact.lastDispatchedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} ({contact.dispatchChannel})
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    {/* WhatsApp 1-Click Button */}
                    <button
                      onClick={() => handleManualWhatsApp(contact)}
                      title="Abrir WhatsApp com mensagem pronta"
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Email 1-Click Button */}
                    <button
                      onClick={() => handleManualEmail(contact)}
                      title="Enviar E-mail via cliente padrão"
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-sky-500" />
                      <span className="hidden sm:inline">E-mail</span>
                    </button>

                    {/* Copy Phone / Info */}
                    <button
                      onClick={() => handleCopyText(`${contact.name} - ${contact.phone} - ${contact.email}`, `contact-${contact.id}`)}
                      title="Copiar dados da empresa"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                    >
                      {copiedKey === `contact-${contact.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 🏢 MODAL: CADASTRAR NOVA EMPRESA / CONTATO */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Cadastrar Nova Construtora / Empresa
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCompanySubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Empresa / Construtora *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Construtora Alpha Ltda"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={newCompanyPhone}
                    onChange={(e) => setNewCompanyPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={newCompanyEmail}
                    onChange={(e) => setNewCompanyEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Região
                  </label>
                  <select
                    value={newCompanyRegion}
                    onChange={(e) => setNewCompanyRegion(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="SP">São Paulo (SP)</option>
                    <option value="RJ">Rio de Janeiro (RJ)</option>
                    <option value="MG">Minas Gerais (MG)</option>
                    <option value="BA">Bahia & Nordeste (BA)</option>
                    <option value="Nacional">Nacional (Brasil)</option>
                    <option value="Internacional">Internacional (Portugal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Segmento / Categoria
                  </label>
                  <input
                    type="text"
                    value={newCompanyCategory}
                    onChange={(e) => setNewCompanyCategory(e.target.value)}
                    placeholder="Ex: Edificações Residenciais"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar na Base</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
