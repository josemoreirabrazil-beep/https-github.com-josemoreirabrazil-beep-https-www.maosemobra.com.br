import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  DollarSign, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Camera, 
  Bot, 
  FolderSync, 
  Trash2, 
  Edit3, 
  Receipt, 
  Store, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  X,
  Sparkles,
  Layers,
  ChevronDown,
  RotateCcw,
  Sliders,
  QrCode,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import type { Expense, ExpenseCategory, PaymentStatus, Project, ProposalServiceItem, LogisticsQuote, TransactionType } from '../types';
import { uploadTextFile, getOrCreateProjectFolder } from '../services/googleDrive';
import { BLANK_SERVICE_TEMPLATES, generateBlankExpensesForProject } from '../data/serviceTemplates';
import { EditBudgetModal } from './EditBudgetModal';
import { ServiceProposalModal } from './ServiceProposalModal';
import { MercadoPagoModal } from './MercadoPagoModal';
import confetti from 'canvas-confetti';

interface FinancialViewProps {
  project: Project;
  expenses: Expense[];
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateProject?: (projectData: Partial<Project>) => void;
  onClearExpenses?: () => void;
  onBulkSaveExpenses?: (expenses: Expense[]) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
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

export const FinancialView: React.FC<FinancialViewProps> = ({
  project,
  expenses,
  onSaveExpense,
  onDeleteExpense,
  onUpdateProject,
  onClearExpenses,
  onBulkSaveExpenses,
  isAuthenticated,
  onRequireAuth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Mercado Pago Payment Modal State
  const [isMpModalOpen, setIsMpModalOpen] = useState(false);
  const [mpPaymentTarget, setMpPaymentTarget] = useState<{
    expenseId?: string;
    title: string;
    amount: number;
    description?: string;
    payerName?: string;
    isNewIncome?: boolean;
  }>({
    title: 'Cobrança Mercado Pago',
    amount: 0,
  });

  // Form states
  const [transactionType, setTransactionType] = useState<TransactionType>('Despesa');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Mão de Obra');
  const [plannedAmount, setPlannedAmount] = useState<number>(0);
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [status, setStatus] = useState<PaymentStatus>('Pendente');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // AI OCR state
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [showOcrDrawer, setShowOcrDrawer] = useState(false);
  const [isExportingToDrive, setIsExportingToDrive] = useState(false);

  // Template dropdown menu
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Financial calculations
  const totalPlanned = Number(project.budgetTotal) || 0;
  const incomeTransactions = expenses.filter(e => e.type === 'Receita' || e.category === 'Entrada / Aporte do Solicitante');
  const expenseTransactions = expenses.filter(e => e.type !== 'Receita' && e.category !== 'Entrada / Aporte do Solicitante');

  // Real Received Cash (Entradas recebidas)
  const totalReceived = incomeTransactions.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0), 0);
  
  // Real Paid Cash (Saídas quitadas)
  const totalPaid = expenseTransactions.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.actualAmount) || 0), 0);
  
  // Real Pending Outflows (Contas a pagar pendentes)
  const totalPendingExpenses = expenseTransactions.filter(e => e.status !== 'Pago').reduce((acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0), 0);
  
  // Real Available Cash (Disponível em Caixa)
  const availableCash = totalReceived - totalPaid;
  const totalCosts = expenseTransactions.reduce((acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0), 0);

  const resetForm = () => {
    setTransactionType('Despesa');
    setDescription('');
    setCategory('Mão de Obra');
    setPlannedAmount(0);
    setActualAmount(0);
    setStatus('Pendente');
    setDate(new Date().toISOString().split('T')[0]);
    setSupplier('');
    setInvoiceNumber('');
    setEditingExpenseId(null);
    setIsModalOpen(false);
  };

  const getExpenseAlert = (exp: Expense) => {
    if (exp.status === 'Pago') return null;
    
    const expDate = new Date(exp.date);
    const now = new Date();
    const diffDays = (now.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 7) return { type: 'overdue', message: 'Pendente há mais de 7 dias' };
    if (diffDays >= 0 && diffDays <= 3) return { type: 'near-expiry', message: 'Próximo ao vencimento' };
    return null;
  };

  const handleStartEdit = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setTransactionType(exp.type || (exp.category === 'Entrada / Aporte do Solicitante' ? 'Receita' : 'Despesa'));
    setDescription(exp.description);
    setCategory(exp.category);
    setPlannedAmount(exp.plannedAmount || 0);
    setActualAmount(exp.actualAmount || 0);
    setStatus(exp.status);
    setDate(exp.date);
    setSupplier(exp.supplier || '');
    setInvoiceNumber(exp.invoiceNumber || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newExpense: Expense = {
      id: editingExpenseId || `exp-${Date.now()}`,
      projectId: project.id,
      description: description.trim(),
      category: transactionType === 'Receita' ? 'Entrada / Aporte do Solicitante' : category,
      type: transactionType,
      plannedAmount: Number(plannedAmount) || Number(actualAmount) || 0,
      actualAmount: Number(actualAmount) || 0,
      status,
      date,
      supplier: supplier.trim(),
      invoiceNumber: invoiceNumber.trim(),
    };

    onSaveExpense(newExpense);
    resetForm();
  };

  const handleOpenMercadoPagoForExpense = (exp: Expense) => {
    const val = Number(exp.actualAmount) || Number(exp.plannedAmount) || 0;
    setMpPaymentTarget({
      expenseId: exp.id,
      title: exp.description,
      amount: val > 0 ? val : 100,
      description: `Pagamento ${exp.category} - ${exp.supplier || project.title}`,
      payerName: exp.supplier || project.clientName || 'Cliente',
      isNewIncome: exp.type === 'Receita' || exp.category === 'Entrada / Aporte do Solicitante',
    });
    setIsMpModalOpen(true);
  };

  const handleOpenMercadoPagoQuickCharge = () => {
    setMpPaymentTarget({
      title: `Aporte / Pagamento de Obra - ${project.title}`,
      amount: 500,
      description: `Cobrança emitida para cliente de ${project.title}`,
      payerName: project.clientName || 'Cliente da Obra',
      isNewIncome: true,
    });
    setIsMpModalOpen(true);
  };

  const handleMercadoPagoPaymentSuccess = (paymentInfo: { method: string; amount: number; paymentId?: string | number }) => {
    if (mpPaymentTarget.expenseId) {
      // Find existing expense and mark as Pago
      const targetExp = expenses.find(e => e.id === mpPaymentTarget.expenseId);
      if (targetExp) {
        onSaveExpense({
          ...targetExp,
          status: 'Pago',
          actualAmount: paymentInfo.amount || targetExp.actualAmount || targetExp.plannedAmount,
          invoiceNumber: targetExp.invoiceNumber || `MP-${paymentInfo.paymentId || Date.now()}`,
          supplier: targetExp.supplier ? `${targetExp.supplier} (Mercado Pago ${paymentInfo.method})` : `Mercado Pago (${paymentInfo.method})`,
        });
      }
    } else {
      // Create new income transaction
      const newIncomeExpense: Expense = {
        id: `exp-mp-${Date.now()}`,
        projectId: project.id,
        description: mpPaymentTarget.title || 'Recebimento via Mercado Pago',
        category: 'Entrada / Aporte do Solicitante',
        type: 'Receita',
        plannedAmount: paymentInfo.amount,
        actualAmount: paymentInfo.amount,
        status: 'Pago',
        date: new Date().toISOString().split('T')[0],
        supplier: `Mercado Pago (${paymentInfo.method})`,
        invoiceNumber: `MP-${paymentInfo.paymentId || Date.now()}`,
      };
      onSaveExpense(newIncomeExpense);
    }
  };

  const handleImageOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const b64 = res.split(',')[1];
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/financial-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: {
            inlineData: {
              data: base64,
              mimeType: file.type || 'image/jpeg',
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Falha no processamento');
      const data = await response.json();

      if (data.description) setDescription(data.description);
      if (data.amount) {
        setActualAmount(data.amount);
        setPlannedAmount(data.amount);
      }
      if (data.category) setCategory(data.category as ExpenseCategory);
      if (data.date) setDate(data.date);
      if (data.supplier) setSupplier(data.supplier);
      if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);

      setShowOcrDrawer(false);
      confetti({ particleCount: 30, spread: 50 });
    } catch (err) {
      console.error(err);
      alert('Não foi possível ler os dados do cupom automaticamente. Por favor, preencha manualmente.');
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleTextOcr = async () => {
    if (!ocrRawText.trim()) return;
    setIsOcrLoading(true);
    try {
      const response = await fetch('/api/financial-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ocrRawText }),
      });

      if (!response.ok) throw new Error('Falha no processamento');
      const data = await response.json();

      if (data.description) setDescription(data.description);
      if (data.amount) {
        setActualAmount(data.amount);
        setPlannedAmount(data.amount);
      }
      if (data.category) setCategory(data.category as ExpenseCategory);
      if (data.date) setDate(data.date);
      if (data.supplier) setSupplier(data.supplier);
      if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);

      setShowOcrDrawer(false);
      setOcrRawText('');
      confetti({ particleCount: 30, spread: 50 });
    } catch (err) {
      console.error(err);
      alert('Não foi possível extrair os dados do texto.');
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleExportToGoogleDrive = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setIsExportingToDrive(true);
    try {
      const folderId = await getOrCreateProjectFolder(project.title);
      const csvHeader = 'Data;Descricao;Categoria;Fornecedor;Numero_Nota;Valor_Realizado;Status\n';
      const csvRows = expenses.map(e => 
        `"${e.date}";"${e.description}";"${e.category}";"${e.supplier || ''}";"${e.invoiceNumber || ''}";"${e.actualAmount}";"${e.status}"`
      ).join('\n');

      const fileName = `Planilha_Financeira_${project.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      await uploadTextFile(fileName, csvHeader + csvRows, folderId, 'text/csv');

      confetti({ particleCount: 60, spread: 70 });
      alert('Planilha Financeira exportada com sucesso para a pasta do projeto no Google Drive!');
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar planilha para o Google Drive.');
    } finally {
      setIsExportingToDrive(false);
    }
  };

  // Load blank service template with R$ 0,00 amounts
  const handleLoadBlankTemplate = (templateId: string) => {
    setShowTemplateDropdown(false);
    const templateExpenses = generateBlankExpensesForProject(project.id, templateId);
    
    if (onBulkSaveExpenses) {
      onBulkSaveExpenses([...expenses, ...templateExpenses]);
      confetti({ particleCount: 40, spread: 60 });
    } else {
      templateExpenses.forEach(exp => onSaveExpense(exp));
    }
  };

  // Clear all expenses
  const handleClearExpenses = () => {
    if (window.confirm('Tem certeza que deseja zerar todos os custos desta obra para começar uma nova proposta em branco?')) {
      if (onClearExpenses) {
        onClearExpenses();
      }
    }
  };

  // Save budget from modal
  const handleSaveBudget = (newBudget: number) => {
    if (onUpdateProject) {
      onUpdateProject({ budgetTotal: newBudget });
      confetti({ particleCount: 40, spread: 50 });
    }
  };

  // Apply proposal items from Proposal Modal (including logistics)
  const handleApplyProposal = (
    items: ProposalServiceItem[], 
    totalAmount: number, 
    notes: string, 
    logisticsQuote?: LogisticsQuote
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const newExpenses: Expense[] = items.map((it, idx) => ({
      id: `exp-prop-${Date.now()}-${idx}`,
      projectId: project.id,
      description: `${it.description} (${it.quantity} ${it.unit})`,
      category: it.category,
      plannedAmount: it.totalPrice,
      actualAmount: it.totalPrice,
      status: 'Pendente',
      date: today,
      supplier: 'Proposta Comercial p/ Solicitante',
      invoiceNumber: `Item #${idx + 1}`,
    }));

    // Add logistics items if present
    if (logisticsQuote && logisticsQuote.totalLogisticsAmount > 0) {
      if (logisticsQuote.mobilizationAmount > 0) {
        newExpenses.push({
          id: `exp-log-mob-${Date.now()}`,
          projectId: project.id,
          description: 'Mobilização & Desmobilização (Canteiro e Ferramentas)',
          category: 'Mobilização & Desmobilização',
          plannedAmount: logisticsQuote.mobilizationAmount,
          actualAmount: logisticsQuote.mobilizationAmount,
          status: 'Pendente',
          date: today,
          supplier: 'Logística de Obra',
        });
      }

      if (logisticsQuote.transportAmount > 0) {
        newExpenses.push({
          id: `exp-log-transp-${Date.now()}`,
          projectId: project.id,
          description: 'Transporte, Combustível e Deslocamento Regional',
          category: 'Transporte & Deslocamento',
          plannedAmount: logisticsQuote.transportAmount,
          actualAmount: logisticsQuote.transportAmount,
          status: 'Pendente',
          date: today,
          supplier: 'Transporte / Logística',
        });
      }

      if (logisticsQuote.totalMealsAmount > 0 || logisticsQuote.totalLodgingAmount > 0) {
        newExpenses.push({
          id: `exp-log-meals-${Date.now()}`,
          projectId: project.id,
          description: `Alimentação & Hospedagem Fora da Cidade (${logisticsQuote.teamSize} pessoas x ${logisticsQuote.daysCount} dias)`,
          category: 'Alimentação & Hospedagem (Fora da Cidade)',
          plannedAmount: (logisticsQuote.totalMealsAmount || 0) + (logisticsQuote.totalLodgingAmount || 0),
          actualAmount: (logisticsQuote.totalMealsAmount || 0) + (logisticsQuote.totalLodgingAmount || 0),
          status: 'Pendente',
          date: today,
          supplier: 'Hospedagem & Alimentação Equipe',
        });
      }
    }

    if (onBulkSaveExpenses) {
      onBulkSaveExpenses(newExpenses);
    } else {
      newExpenses.forEach(exp => onSaveExpense(exp));
    }

    if (onUpdateProject) {
      onUpdateProject({ budgetTotal: totalAmount });
    }
  };

  // Filtered expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.supplier && exp.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.invoiceNumber && exp.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            Orçamentos & Custos de Obras
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre serviços com valores abertos para propor aos solicitantes e gerencie o fluxo financeiro
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Proposal Generator Button */}
          <button
            onClick={() => setIsProposalModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition"
          >
            <FileText className="w-4 h-4" />
            Gerar Proposta p/ Solicitante
          </button>

          {/* Quick Blank Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl transition shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Serviços em Branco</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showTemplateDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-30 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Carregar Itens com R$ 0,00:
                </div>
                {BLANK_SERVICE_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleLoadBlankTemplate(tmpl.id)}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-900 dark:hover:text-amber-300 transition block"
                  >
                    <div className="font-bold">{tmpl.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{tmpl.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export to Drive */}
          <button
            onClick={handleExportToGoogleDrive}
            disabled={isExportingToDrive}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 rounded-xl border border-sky-200 dark:border-sky-800 transition"
            title="Exportar dados para o Google Drive"
          >
            <FolderSync className="w-4 h-4" />
            <span className="hidden sm:inline">Drive</span>
          </button>

          {/* PIX Quick QR Code & Key Button */}
          <button
            onClick={handleOpenMercadoPagoQuickCharge}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs border border-emerald-500/30 transition cursor-pointer"
            title="Chave PIX: +55 (73) 99859-9213 • Gerar QR Code de Pagamento"
          >
            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">PIX: +55 (73) 99859-9213</span>
            <span className="md:hidden">PIX</span>
          </button>

          {/* Mercado Pago Quick Charge Button */}
          <button
            onClick={handleOpenMercadoPagoQuickCharge}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#009ee3] hover:bg-[#0082ba] active:bg-[#006f9e] text-white font-bold rounded-xl text-xs shadow-xs transition"
            title="Gerar cobrança Pix ou Cartão via Mercado Pago"
          >
            <div className="w-4 h-4 rounded-md bg-white text-[#009ee3] flex items-center justify-center font-black text-[9px]">
              mp
            </div>
            <span>Cobrança Mercado Pago</span>
          </button>

          {/* New Expense Button */}
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Lançar Custo
          </button>
        </div>
      </div>

      {/* Bento KPI Financial Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Disponível em Caixa (Saldo Real) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Disponível em Caixa
          </span>
          <div className={`text-2xl font-black ${availableCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            R$ {availableCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {availableCash >= 0 ? 'Saldo líquido em caixa' : 'Déficit no fluxo de caixa'}
          </span>
        </div>

        {/* 2. Valores Recebidos */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Valores Recebidos
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Aportes e pagamentos de clientes</span>
        </div>

        {/* 3. Valores Pagos (Saídas) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Valores Pagos (Saídas)
          </span>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Despesas quitadas na obra</span>
        </div>

        {/* 4. Valores Pendentes a Pagar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Valores Pendentes
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            R$ {totalPendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Contas e cotações pendentes</span>
        </div>

        {/* 5. Orçamento / Contrato Global (Clickable to Edit) */}
        <div 
          onClick={() => setIsEditBudgetModalOpen(true)}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group cursor-pointer hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Orçamento / Contrato
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
              <Edit3 className="w-3 h-3" /> Editar
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
            <span>R$ {totalPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 group-hover:text-emerald-500 transition">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Clique para alterar o valor total</span>
        </div>
      </div>

      {/* Filter, Search Bar & Quick Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por serviço, material, fornecedor ou solicitante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white flex-1 md:flex-initial"
          >
            <option value="all">Todas as Categorias</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
          >
            <option value="all">Todos os Status</option>
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
            <option value="Parcial">Parcial</option>
          </select>

          {expenses.length > 0 && (
            <button
              onClick={handleClearExpenses}
              className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 transition flex items-center gap-1"
              title="Zerar todos os custos e começar proposta em branco"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zerar Custos</span>
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição do Serviço / Custo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Responsável / Doc</th>
                <th className="py-3 px-4 text-right">Valor Cotado (R$)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        Nenhum custo cadastrado no momento.
                      </p>
                      <p className="text-xs text-slate-500">
                        Os custos estão prontos e vazios para o profissional preencher ao apresentar a proposta ao solicitante.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => setIsProposalModalOpen(true)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition"
                        >
                          Criar Proposta Comercial
                        </button>
                        <button
                          onClick={() => handleLoadBlankTemplate('reforma-residencial')}
                          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition"
                        >
                          Inserir Itens em Branco (R$ 0,00)
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {exp.description}
                      {getExpenseAlert(exp) && (
                        <div title={getExpenseAlert(exp)?.message} className={`p-1 rounded-full ${getExpenseAlert(exp)?.type === 'overdue' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div>{exp.supplier || '-'}</div>
                      {exp.invoiceNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">{exp.invoiceNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white text-right whitespace-nowrap">
                      {exp.actualAmount === 0 ? (
                        <span className="text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md text-[11px]">
                          R$ 0,00 (A Definir)
                        </span>
                      ) : (
                        `R$ ${exp.actualAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        exp.status === 'Pago' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                          : exp.status === 'Pendente' 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                      {/* Mercado Pago Action */}
                      <button
                        onClick={() => handleOpenMercadoPagoForExpense(exp)}
                        className="p-1.5 text-[#009ee3] hover:bg-[#009ee3]/10 dark:hover:bg-[#009ee3]/20 rounded-lg transition"
                        title="Pagar ou Cobrar com Mercado Pago (Pix / Cartão 12x)"
                      >
                        <div className="w-4 h-4 rounded bg-[#009ee3] text-white flex items-center justify-center font-black text-[9px] shadow-2xs">
                          mp
                        </div>
                      </button>

                      <button
                        onClick={() => handleStartEdit(exp)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Editar valor / serviço"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir o custo "${exp.description}"?`)) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                        title="Excluir"
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

      {/* New / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingExpenseId ? 'Editar Custo / Serviço' : 'Lançar Novo Custo ou Serviço'}
                  </h3>
                  <p className="text-xs text-slate-500">Defina o valor para a proposta ou acompanhamento</p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart OCR trigger button */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Preencher com IA (Cupom / Nota)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOcrDrawer(!showOcrDrawer)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition"
              >
                {showOcrDrawer ? 'Fechar Leitor' : 'Ler Foto/Texto'}
              </button>
            </div>

            {/* OCR Drawer */}
            {showOcrDrawer && (
              <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Envie a foto do recibo/cupom fiscal ou cole o texto:
                </div>
                
                <div className="flex gap-2">
                  <label className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 text-center cursor-pointer hover:bg-slate-100 transition flex items-center justify-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" />
                    {isOcrLoading ? 'Processando...' : 'Carregar Foto do Recibo'}
                    <input type="file" accept="image/*" onChange={handleImageOcr} className="hidden" disabled={isOcrLoading} />
                  </label>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Ou cole o texto do cupom/recibo aqui..."
                    value={ocrRawText}
                    onChange={(e) => setOcrRawText(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleTextOcr}
                    disabled={isOcrLoading}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {isOcrLoading ? 'IA Analisando...' : 'Extrair Dados com IA'}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Type Switcher: Despesa vs Receita */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipo de Lançamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionType('Despesa');
                      if (category === 'Entrada / Aporte do Solicitante') setCategory('Mão de Obra');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      transactionType === 'Despesa'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span>🔴 Despesa / Saída</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionType('Receita');
                      setCategory('Entrada / Aporte do Solicitante');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      transactionType === 'Receita'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span>🟢 Receita / Entrada (Solicitante)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  {transactionType === 'Receita' ? 'Identificação do Aporte / Pagamento do Cliente *' : 'Descrição do Material ou Serviço *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={transactionType === 'Receita' ? 'Ex: 1ª Parcela da Reforma, Entrada de 50%, Pagamento Solicitante...' : 'Ex: Mão de obra alvenaria, Porcelanato 60m², Transporte...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Status {transactionType === 'Receita' ? 'do Recebimento' : 'do Pagamento'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Pendente">{transactionType === 'Receita' ? 'A Receber / Pendente' : 'Pendente / Proposta'}</option>
                    <option value="Pago">{transactionType === 'Receita' ? 'Recebido / Quitado' : 'Pago'}</option>
                    <option value="Parcial">Parcial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00 (pode ficar vazio/zerado)"
                    value={actualAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setActualAmount(val);
                      setPlannedAmount(val);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Data do Documento / Registro
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Responsável / Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mãos em Obra, Telhanorte..."
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Nº da Proposta / Nota / Recibo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Proposta #01, NF-e 44921..."
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                >
                  {editingExpenseId ? 'Atualizar Custo' : 'Salvar Custo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      <EditBudgetModal
        isOpen={isEditBudgetModalOpen}
        onClose={() => setIsEditBudgetModalOpen(false)}
        project={project}
        expenses={expenses}
        onSaveBudget={handleSaveBudget}
      />

      {/* Service Proposal Generator Modal */}
      <ServiceProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        project={project}
        onApplyProposal={handleApplyProposal}
      />

      {/* Mercado Pago Integrated Payment Modal */}
      <MercadoPagoModal
        isOpen={isMpModalOpen}
        onClose={() => setIsMpModalOpen(false)}
        title={mpPaymentTarget.title}
        amount={mpPaymentTarget.amount}
        description={mpPaymentTarget.description}
        payerName={mpPaymentTarget.payerName}
        payerEmail={project.clientEmail || 'cliente@obra.com.br'}
        referenceId={mpPaymentTarget.expenseId || `proj-${project.id}-${Date.now()}`}
        onPaymentSuccess={handleMercadoPagoPaymentSuccess}
      />

    </div>
  );
};
