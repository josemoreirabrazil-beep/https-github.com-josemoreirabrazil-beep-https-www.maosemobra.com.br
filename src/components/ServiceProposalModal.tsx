import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  Printer, 
  Send, 
  DollarSign, 
  Sparkles, 
  Building2, 
  User, 
  Phone, 
  Calendar, 
  Layers,
  ChevronDown,
  Truck,
  Utensils,
  Hotel,
  Compass,
  MapPin,
  AlertCircle
} from 'lucide-react';
import type { Project, Expense, ExpenseCategory, ProposalServiceItem, ServiceRequest, LogisticsQuote } from '../types';
import { BLANK_SERVICE_TEMPLATES } from '../data/serviceTemplates';
import { MercadoPagoModal } from './MercadoPagoModal';
import confetti from 'canvas-confetti';

interface ServiceProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  serviceRequest?: ServiceRequest | null;
  onApplyProposal: (
    items: ProposalServiceItem[], 
    totalAmount: number, 
    notes: string, 
    logisticsQuote: LogisticsQuote
  ) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Mão de Obra',
  'Materiais Básicos',
  'Acabamentos',
  'Instalações Elétricas & Hidráulicas',
  'Equipamentos & Caçambas',
  'Mobilização & Desmobilização',
  'Transporte & Deslocamento',
  'Alimentação & Hospedagem (Fora da Cidade)',
  'Projetos, Taxas & Alvarás',
  'Outros',
];

const UNIT_OPTIONS = ['m²', 'un', 'pontos', 'diária', 'vb', 'vg', 'm', 'm³', 'sacos', 'h', 'km'];

export const ServiceProposalModal: React.FC<ServiceProposalModalProps> = ({
  isOpen,
  onClose,
  project,
  serviceRequest,
  onApplyProposal,
}) => {
  // Professional & Solicitante info
  const [professionalName, setProfessionalName] = useState('Mãos em Obra • Serviços Especializados');
  const [professionalPhone, setProfessionalPhone] = useState('+55 73 99859-9213');
  const [professionalPixKey, setProfessionalPixKey] = useState('+55 73998599213');
  
  const [clientName, setClientName] = useState(serviceRequest?.clientName || project?.clientName || 'Solicitante / Cliente');
  const [clientPhone, setClientPhone] = useState(serviceRequest?.clientPhone || '');
  const [address, setAddress] = useState(serviceRequest?.address || project?.address || '');
  const [validityDays, setValidityDays] = useState(15);
  const [paymentTerms, setPaymentTerms] = useState('30% de entrada na assinatura + 40% na metade dos serviços + 30% na entrega final');
  const [notes, setNotes] = useState('Orçamento inclui ferramental técnico, execução conforme normas ABNT e limpeza diária do local.');

  // Out of Town & Logistics module state
  const [isOutOfTown, setIsOutOfTown] = useState<boolean>(serviceRequest?.isOutOfTown ?? false);
  const [distanceKm, setDistanceKm] = useState<number>(serviceRequest?.distanceKm || 0);
  const [mobilizationAmount, setMobilizationAmount] = useState<number>(0);
  const [transportAmount, setTransportAmount] = useState<number>(0);
  
  // Per Diem & Lodging for Out-of-city jobs
  const [teamSize, setTeamSize] = useState<number>(2);
  const [daysCount, setDaysCount] = useState<number>(5);
  const [dailyMealRate, setDailyMealRate] = useState<number>(60);
  const [dailyLodgingRate, setDailyLodgingRate] = useState<number>(120);
  const [enableMealsAndLodging, setEnableMealsAndLodging] = useState<boolean>(serviceRequest?.isOutOfTown ?? false);

  // Proposal items with blank prices
  const [items, setItems] = useState<ProposalServiceItem[]>(() => {
    if (serviceRequest) {
      return [
        {
          id: `prop-item-${Date.now()}-0`,
          description: serviceRequest.title + (serviceRequest.estimatedScope ? ` (${serviceRequest.estimatedScope})` : ''),
          category: 'Mão de Obra',
          unit: 'vb',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        }
      ];
    }
    const defaultTemplate = BLANK_SERVICE_TEMPLATES[0];
    return defaultTemplate.items.map((it, idx) => ({
      id: `prop-item-${Date.now()}-${idx}`,
      description: it.description,
      category: it.category,
      unit: it.suggestedUnit,
      quantity: it.defaultQty,
      unitPrice: 0,
      totalPrice: 0,
    }));
  });

  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isMpModalOpen, setIsMpModalOpen] = useState(false);

  useEffect(() => {
    if (serviceRequest) {
      setClientName(serviceRequest.clientName);
      setClientPhone(serviceRequest.clientPhone);
      setAddress(`${serviceRequest.address} - ${serviceRequest.city}/${serviceRequest.state}`);
      setIsOutOfTown(serviceRequest.isOutOfTown);
      setDistanceKm(serviceRequest.distanceKm || 0);
      setEnableMealsAndLodging(serviceRequest.isOutOfTown);
      if (serviceRequest.isOutOfTown) {
        // Suggest typical logistics amounts if out of town
        setTransportAmount(Math.round((serviceRequest.distanceKm || 100) * 2 * 1.5));
        setMobilizationAmount(350);
      }
    } else if (project) {
      if (project.clientName) setClientName(project.clientName);
      if (project.address) setAddress(project.address);
    }
  }, [serviceRequest, project, isOpen]);

  if (!isOpen) return null;

  // Handle line item edits
  const handleItemChange = (id: string, field: keyof ProposalServiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
        const price = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
        updated.totalPrice = Math.round(qty * price * 100) / 100;
      }
      return updated;
    }));
  };

  const handleAddItem = () => {
    const newItem: ProposalServiceItem = {
      id: `prop-item-${Date.now()}-${items.length}`,
      description: '',
      category: 'Mão de Obra',
      unit: 'm²',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = BLANK_SERVICE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    const newItems: ProposalServiceItem[] = template.items.map((it, idx) => ({
      id: `prop-item-${Date.now()}-${idx}`,
      description: it.description,
      category: it.category,
      unit: it.suggestedUnit,
      quantity: it.defaultQty,
      unitPrice: 0,
      totalPrice: 0,
    }));
    setItems(newItems);
  };

  const handleClearAllItems = () => {
    setItems([]);
  };

  // Calculations for Logistics
  const totalMealsAmount = (enableMealsAndLodging && isOutOfTown) ? (teamSize * daysCount * dailyMealRate) : 0;
  const totalLodgingAmount = (enableMealsAndLodging && isOutOfTown) ? (teamSize * daysCount * dailyLodgingRate) : 0;
  const totalLogisticsAmount = (Number(mobilizationAmount) || 0) + (Number(transportAmount) || 0) + totalMealsAmount + totalLodgingAmount;

  // Calculations for Service Items
  const itemsTotal = items.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
  const laborSubtotal = items.filter(i => i.category === 'Mão de Obra').reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
  const materialsSubtotal = items.filter(i => i.category !== 'Mão de Obra').reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
  
  // Grand Total of proposal
  const grandTotalAmount = itemsTotal + totalLogisticsAmount;

  const logisticsQuoteObject: LogisticsQuote = {
    mobilizationAmount: Number(mobilizationAmount) || 0,
    transportAmount: Number(transportAmount) || 0,
    isOutOfTown,
    distanceKm,
    teamSize,
    daysCount,
    dailyMealRate,
    totalMealsAmount,
    dailyLodgingRate,
    totalLodgingAmount,
    totalLogisticsAmount,
    logisticsNotes: isOutOfTown ? `Serviço fora da cidade (${teamSize} pessoas, ${daysCount} dias de diárias)` : undefined,
  };

  // Apply to project
  const handleApply = () => {
    onApplyProposal(items, grandTotalAmount, notes, logisticsQuoteObject);
    confetti({ particleCount: 50, spread: 60 });
    onClose();
  };

  // WhatsApp formatted quote with explicit logistics & out-of-town breakdown
  const handleCopyWhatsApp = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    let text = `📄 *PROPOSTA COMERCIAL & COTAÇÃO DE SERVIÇOS*\n`;
    text += `*Obra / Projeto:* ${project?.title || 'Serviços Especializados'}\n`;
    text += `*Cliente / Solicitante:* ${clientName}\n`;
    if (address) text += `*Local da Execução:* ${address}\n`;
    if (isOutOfTown) text += `*Deslocamento:* Serviço fora da cidade (${distanceKm || 0} km)\n`;
    text += `*Data:* ${today} (Válido por ${validityDays} dias)\n\n`;
    
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🛠️ *DISCRIMINAÇÃO DOS SERVIÇOS TÉCNICOS:*\n`;

    items.forEach((item, index) => {
      text += `${index + 1}. *${item.description}*\n`;
      text += `   ↳ ${item.quantity} ${item.unit} x R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = *R$ ${item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
    });

    if (totalLogisticsAmount > 0) {
      text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🚚 *LOGÍSTICA & DESLOCAMENTO (FORA DA CIDADE):*\n`;
      if (mobilizationAmount > 0) {
        text += `• Mobilização & Desmobilização (Canteiro e Ferramental): R$ ${mobilizationAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      if (transportAmount > 0) {
        text += `• Transporte / Combustível / Pedágios: R$ ${transportAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      if (totalMealsAmount > 0) {
        text += `• Alimentação da Equipe (${teamSize} pessoas x ${daysCount} dias x R$${dailyMealRate}): R$ ${totalMealsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      if (totalLodgingAmount > 0) {
        text += `• Hospedagem / Pousada (${teamSize} pessoas x ${daysCount} noites x R$${dailyLodgingRate}): R$ ${totalLodgingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      text += `*Subtotal Logística & Diárias:* R$ ${totalLogisticsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    if (laborSubtotal > 0) text += `• Mão de Obra Técnica: R$ ${laborSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    if (materialsSubtotal > 0) text += `• Materiais / Equipamentos: R$ ${materialsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    if (totalLogisticsAmount > 0) text += `• Logística, Diárias & Transporte: R$ ${totalLogisticsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `💰 *VALOR TOTAL GLOBAL DA PROPOSTA:* *R$ ${grandTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    
    text += `💳 *Condições de Pagamento:*\n${paymentTerms}\n\n`;
    if (professionalPixKey) text += `🔑 *Chave Pix:* ${professionalPixKey}\n\n`;
    if (notes) text += `📝 *Observações Técnicas:*\n${notes}\n\n`;
    text += `*Responsável Técnico:* ${professionalName} • ${professionalPhone}\n`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-4 sm:my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Proposta & Precificação de Serviços com Logística
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {serviceRequest ? `Respondendo solicitação de: ${serviceRequest.clientName}` : 'Adicione valores de serviços, mobilização, transporte e hospedagem'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          
          {/* If quoting a specific Service Request, show client's brief */}
          {serviceRequest && (
            <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Demanda Descrita pelo Solicitante:
                </span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  {serviceRequest.category}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {serviceRequest.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl">
                {serviceRequest.description}
              </p>
              {serviceRequest.isOutOfTown && (
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5 pt-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Obra localizada fora da cidade ({serviceRequest.city} - {serviceRequest.distanceKm || 0} km). Custos de diárias e transporte ativados abaixo.</span>
                </div>
              )}
            </div>
          )}

          {/* Header Info Grid: Professional & Solicitante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700/60">
            
            {/* Solicitante (Client) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                <User className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Dados do Solicitante (Cliente)
                </h3>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nome do Solicitante *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Validade da Proposta</label>
                  <select
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Endereço do Local da Obra</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  placeholder="Rua, Número, Bairro, Cidade"
                />
              </div>
            </div>

            {/* Professional (Prestador) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                <Building2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Dados do Prestador / Profissional
                </h3>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nome / Empresa do Profissional</label>
                <input
                  type="text"
                  value={professionalName}
                  onChange={(e) => setProfessionalName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  placeholder="Seu nome ou Razão Social"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Seu Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={professionalPhone}
                    onChange={(e) => setProfessionalPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    placeholder="(11) 98765-4321"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Chave Pix para Pagamento</label>
                  <input
                    type="text"
                    value={professionalPixKey}
                    onChange={(e) => setProfessionalPixKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    placeholder="CPF, CNPJ, E-mail ou Celular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Condições de Pagamento Sugeridas</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  placeholder="Ex: 30% sinal + 40% meio + 30% entrega"
                />
              </div>
            </div>

          </div>

          {/* Quick Template Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Carregar Pacote de Serviços em Branco:
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              {BLANK_SERVICE_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleLoadTemplate(t.id)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 transition shadow-2xs"
                >
                  {t.title}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearAllItems}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              >
                Limpar Lista
              </button>
            </div>
          </div>

          {/* Service Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Itens e Serviços Técnicos Cotados ({items.length})
              </h3>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Serviço
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Item / Descrição do Serviço</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-2 w-20">Unidade</th>
                      <th className="py-2.5 px-2 w-20 text-right">Qtd</th>
                      <th className="py-2.5 px-3 w-28 text-right">Unitário (R$)</th>
                      <th className="py-2.5 px-3 w-28 text-right">Total (R$)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          Nenhum item na proposta. Escolha um pacote acima ou clique em "Adicionar Serviço".
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              placeholder="Ex: Assentamento de piso porcelanato..."
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category}
                              onChange={(e) => handleItemChange(item.id, 'category', e.target.value as ExpenseCategory)}
                              className="w-full px-2 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                            >
                              {EXPENSE_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                              className="w-full px-1.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-center font-mono"
                            >
                              {UNIT_OPTIONS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-right font-semibold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice || ''}
                              onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                              placeholder="0,00"
                              className="w-full px-2.5 py-1.5 text-xs bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 rounded-lg text-slate-900 dark:text-white text-right font-black focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                            R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                              title="Remover item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* LOGISTICS & OUT OF TOWN MODULE */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Custos de Logística, Deslocamento & Diárias (Fora da Cidade)
                </h3>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOutOfTown}
                  onChange={(e) => {
                    setIsOutOfTown(e.target.checked);
                    if (e.target.checked) setEnableMealsAndLodging(true);
                  }}
                  className="rounded-sm text-amber-500 focus:ring-amber-400"
                />
                <span>Serviço Fora da Cidade / Regional</span>
              </label>
            </div>

            {/* Mobilization & Transport */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Mobilização & Desmobilização (R$)
                  <span className="text-slate-400 font-normal block text-[10px]">Envio/retirada de canteiro, betoneira, andaimes e ferramental</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="10"
                  value={mobilizationAmount || ''}
                  onChange={(e) => setMobilizationAmount(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Transporte & Deslocamento (R$)
                  <span className="text-slate-400 font-normal block text-[10px]">Combustível, fretes, passagens e pedágios da equipe</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="10"
                  value={transportAmount || ''}
                  onChange={(e) => setTransportAmount(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* Meals & Lodging (Out of town only) */}
            {isOutOfTown && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                    <Hotel className="w-3.5 h-3.5 text-purple-500" />
                    Diárias de Alimentação & Hospedagem da Equipe:
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMealsAndLodging}
                      onChange={(e) => setEnableMealsAndLodging(e.target.checked)}
                      className="rounded-sm text-amber-500"
                    />
                    <span>Incluir diárias no orçamento</span>
                  </label>
                </div>

                {enableMealsAndLodging && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Nº Profissionais</label>
                      <input
                        type="number"
                        min={1}
                        value={teamSize}
                        onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value)))}
                        className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Dias / Diárias</label>
                      <input
                        type="number"
                        min={1}
                        value={daysCount}
                        onChange={(e) => setDaysCount(Math.max(1, Number(e.target.value)))}
                        className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Alimentação (R$/dia)</label>
                      <input
                        type="number"
                        min={0}
                        value={dailyMealRate}
                        onChange={(e) => setDailyMealRate(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Hospedagem (R$/noite)</label>
                      <input
                        type="number"
                        min={0}
                        value={dailyLodgingRate}
                        onChange={(e) => setDailyLodgingRate(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                )}

                {totalLogisticsAmount > 0 && (
                  <div className="flex items-center justify-between text-xs bg-amber-500/10 p-3 rounded-xl text-amber-900 dark:text-amber-200 font-semibold">
                    <span>Subtotal de Logística & Diárias Fora da Cidade:</span>
                    <span className="font-extrabold text-sm">
                      R$ {totalLogisticsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observations & Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Observações Técnicas / Inclusões do Orçamento
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
                placeholder="Ex: Não inclui materiais de acabamento como tintas e pisos, que serão fornecidos pelo cliente..."
              />
            </div>

            {/* Totals Bento Box */}
            <div className="p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Mão de Obra Técnica:</span>
                  <span className="font-semibold text-white">R$ {laborSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Materiais / Equipamentos:</span>
                  <span className="font-semibold text-white">R$ {materialsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {totalLogisticsAmount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Logística & Diárias (Fora da Cidade):</span>
                    <span className="font-bold text-amber-400">R$ {totalLogisticsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-amber-400">TOTAL DA PROPOSTA:</span>
                  <span className="text-2xl font-black text-amber-400">
                    R$ {grandTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-right">
                {items.length} itens cotados • Logística inclusa
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition shadow-xs ${
                copiedSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
              }`}
            >
              {copiedSuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedSuccess ? 'Copiado para WhatsApp!' : 'Copiar para WhatsApp'}
            </button>

            <button
              type="button"
              onClick={() => setIsMpModalOpen(true)}
              className="px-3.5 py-2.5 bg-[#009ee3] hover:bg-[#0082ba] text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Gerar cobrança Pix ou Cartão com Mercado Pago"
            >
              <div className="w-4 h-4 rounded bg-white text-[#009ee3] flex items-center justify-center font-black text-[9px]">
                mp
              </div>
              <span>Mercado Pago (Pix / Cartão)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold transition flex items-center gap-1.5"
              title="Imprimir / Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-2xl transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Aplicar ao Projeto & Salvar Custos
            </button>
          </div>
        </div>

        {/* Mercado Pago Payment Modal */}
        <MercadoPagoModal
          isOpen={isMpModalOpen}
          onClose={() => setIsMpModalOpen(false)}
          title={`Proposta Comercial - ${clientName || project.title}`}
          amount={grandTotalAmount > 0 ? grandTotalAmount : 100}
          description={`Proposta de Serviços - ${project.title}`}
          payerName={clientName || project.clientName || 'Cliente'}
          payerEmail={project.clientEmail || 'cliente@obra.com.br'}
          referenceId={`prop-${project.id}-${Date.now()}`}
          onPaymentSuccess={() => {
            alert('Pagamento aprovado no Mercado Pago! Aplicando proposta aos custos da obra.');
            handleApply();
          }}
        />

      </div>
    </div>
  );
};
