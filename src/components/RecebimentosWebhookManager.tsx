import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  PlusCircle, 
  Search, 
  Copy, 
  Check, 
  QrCode, 
  ArrowUpRight, 
  Zap, 
  Building2, 
  HardHat, 
  User, 
  Sparkles, 
  Activity,
  X,
  FileText
} from 'lucide-react';
import { 
  ClientProviderReceipt, 
  getRecebimentos, 
  createRecebimento, 
  simulateWebhook, 
  getWebhookLogs 
} from '../services/mercadoPago';
import confetti from 'canvas-confetti';

interface RecebimentosWebhookManagerProps {
  onRefreshParent?: () => void;
}

export const RecebimentosWebhookManager: React.FC<RecebimentosWebhookManagerProps> = ({
  onRefreshParent,
}) => {
  const [receipts, setReceipts] = useState<ClientProviderReceipt[]>([]);
  const [summary, setSummary] = useState<any>({
    totalOverallApproved: 0,
    totalOverallPending: 0,
    clientesApproved: 0,
    clientesPending: 0,
    prestadoresApproved: 0,
    prestadoresPending: 0,
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
  });
  const [activeCategory, setActiveCategory] = useState<'all' | 'cliente' | 'prestador'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Simulation Modal state
  const [simulatingReceipt, setSimulatingReceipt] = useState<ClientProviderReceipt | null>(null);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // New Receipt Modal state
  const [isNewReceiptModalOpen, setIsNewReceiptModalOpen] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<'cliente' | 'prestador'>('cliente');
  const [newPartyName, setNewPartyName] = useState<string>('');
  const [newPartyEmail, setNewPartyEmail] = useState<string>('');
  const [newPartyPhone, setNewPartyPhone] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newMethod, setNewMethod] = useState<'PIX' | 'Cartão de Crédito' | 'Mercado Pago'>('PIX');

  // Webhook Logs Modal state
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const webhookEndpointUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/mercadopago/webhook` : '/api/mercadopago/webhook';

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getRecebimentos({
        category: activeCategory === 'all' ? undefined : activeCategory,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setReceipts(data.receipts || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error loading receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [activeCategory, statusFilter]);

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookEndpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleExecuteSimulation = async (receipt: ClientProviderReceipt, targetStatus: string = 'approved') => {
    setSimulationLoading(true);
    setSimulationResult(null);

    try {
      const res = await simulateWebhook({
        receiptId: receipt.id,
        referenceId: receipt.referenceId,
        status: targetStatus,
        amount: receipt.amount,
        payerEmail: receipt.partyEmail,
      });

      if (targetStatus === 'approved') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setSimulationResult(`Webhook executado: status de "${receipt.partyName}" atualizado para ${res.status}.`);
      await loadData();
      if (onRefreshParent) onRefreshParent();
      setTimeout(() => {
        setSimulatingReceipt(null);
        setSimulationResult(null);
      }, 2000);
    } catch (err: any) {
      setSimulationResult(`Erro ao disparar webhook: ${err.message || 'Falha na requisição'}`);
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleCreateNewReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName || !newAmount || Number(newAmount) <= 0) return;

    try {
      await createRecebimento({
        category: newCategory,
        partyName: newPartyName,
        partyEmail: newPartyEmail,
        partyPhone: newPartyPhone,
        description: newDescription || `Recebimento de ${newCategory === 'cliente' ? 'Cliente' : 'Prestador'}`,
        projectName: newProjectName,
        amount: Number(newAmount),
        method: newMethod,
      });

      setIsNewReceiptModalOpen(false);
      setNewPartyName('');
      setNewPartyEmail('');
      setNewPartyPhone('');
      setNewDescription('');
      setNewProjectName('');
      setNewAmount('');
      confetti({ particleCount: 70, spread: 60 });
      await loadData();
    } catch (err) {
      console.error('Error creating receipt:', err);
    }
  };

  const handleOpenLogs = async () => {
    setIsLogsModalOpen(true);
    setLoadingLogs(true);
    try {
      const res = await getWebhookLogs();
      setWebhookLogs(res.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      
      {/* Header and Webhook Configuration Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Zap className="w-5 h-5 fill-emerald-500" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Sincronização de Recebimentos via Webhook Mercado Pago
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 uppercase">
              Webhook Ativo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Receba notificações IPN em tempo real do Mercado Pago e atualize automaticamente o status de pagamentos de clientes e prestadores de serviço.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyWebhookUrl}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Copiar URL para configurar no Painel de Desenvolvedores do Mercado Pago"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedUrl ? 'URL Copiada!' : 'Copiar URL do Webhook'}</span>
          </button>

          <button
            onClick={handleOpenLogs}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>Logs do Webhook</span>
          </button>

          <button
            onClick={() => setIsNewReceiptModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Novo Recebimento</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Recebido de Clientes
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            R$ {summary.clientesApproved?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Aportes & Entradas Liquidadas
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Recebido de Prestadores
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            R$ {summary.prestadoresApproved?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Taxas & Mensalidades Pro
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
            Pendente / Em Aberto
          </span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">
            R$ {summary.totalOverallPending?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {summary.pendingCount} cobranças aguardando PIX
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
            Total Geral Liquidado
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            R$ {summary.totalOverallApproved?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {summary.approvedCount} recebimentos confirmados
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Todos ({summary.totalCount})
          </button>
          <button
            onClick={() => setActiveCategory('cliente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeCategory === 'cliente'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-500" />
            <span>Clientes</span>
          </button>
          <button
            onClick={() => setActiveCategory('prestador')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeCategory === 'prestador'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <HardHat className="w-3.5 h-3.5 text-amber-500" />
            <span>Prestadores</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, ref ou obra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="Aprovado">Apenas Aprovados</option>
            <option value="Pendente">Apenas Pendentes</option>
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Pagador / Entidade</th>
              <th className="py-3 px-3">Categoria</th>
              <th className="py-3 px-3">Descrição / Projeto</th>
              <th className="py-3 px-3">Valor / Método</th>
              <th className="py-3 px-3">Status Webhook</th>
              <th className="py-3 px-3">Data / Último Evento</th>
              <th className="py-3 px-3 text-right">Ação / Simulação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  Nenhum recebimento encontrado.
                </td>
              </tr>
            ) : (
              receipts.map((receipt) => {
                const isApproved = receipt.status === 'Aprovado';
                const isPending = receipt.status === 'Pendente';

                return (
                  <tr key={receipt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    {/* Pagador */}
                    <td className="py-3.5 px-3">
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                        {receipt.partyName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {receipt.partyPhone && <span>{receipt.partyPhone}</span>}
                        {receipt.partyEmail && <span>• {receipt.partyEmail}</span>}
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        receipt.category === 'cliente'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {receipt.category === 'cliente' ? <User className="w-3 h-3" /> : <HardHat className="w-3 h-3" />}
                        <span>{receipt.category === 'cliente' ? 'Cliente' : 'Prestador'}</span>
                      </span>
                    </td>

                    {/* Descrição & Projeto */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {receipt.description}
                      </div>
                      {receipt.projectName && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                          Obra: {receipt.projectName}
                        </div>
                      )}
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        Ref: {receipt.referenceId}
                      </div>
                    </td>

                    {/* Valor & Método */}
                    <td className="py-3.5 px-3">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        R$ {receipt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                        {receipt.method}
                      </div>
                    </td>

                    {/* Status Webhook */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                        isApproved
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : isPending
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      }`}>
                        {isApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{receipt.status}</span>
                      </span>
                    </td>

                    {/* Data / Atualização */}
                    <td className="py-3.5 px-3">
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {receipt.paymentDate ? `Pago: ${receipt.paymentDate}` : `Venc: ${receipt.dueDate || 'A combinar'}`}
                      </div>
                      {receipt.lastWebhookAt && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          <span>Sincronizado: {new Date(receipt.lastWebhookAt).toLocaleTimeString('pt-BR')}</span>
                        </div>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-3 text-right">
                      {isPending ? (
                        <button
                          onClick={() => setSimulatingReceipt(receipt)}
                          className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                          title="Simular notificação de webhook do Mercado Pago para este pagamento"
                        >
                          <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                          <span>Simular Baixa</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Creditado</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Simular Webhook Notification */}
      {simulatingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Zap className="w-5 h-5 fill-emerald-500" />
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Testar Notificação de Webhook Mercado Pago
                </h4>
              </div>
              <button 
                onClick={() => setSimulatingReceipt(null)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dispara uma chamada IPN idêntica à enviada pelos servidores do Mercado Pago para atualizar o status do recebimento.
            </p>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Pagador:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{simulatingReceipt.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Categoria:</span>
                <span className="font-bold uppercase text-[10px] text-emerald-600">{simulatingReceipt.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor:</span>
                <span className="font-black text-emerald-600">R$ {simulatingReceipt.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referência:</span>
                <span className="font-mono text-[10px]">{simulatingReceipt.referenceId}</span>
              </div>
            </div>

            {simulationResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                {simulationResult}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleExecuteSimulation(simulatingReceipt, 'approved')}
                disabled={simulationLoading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {simulationLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Simular Aprovação (Pagamento Concluído)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Recebimento */}
      {isNewReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <span>Cadastrar Novo Recebimento</span>
              </h4>
              <button onClick={() => setIsNewReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewReceipt} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="cliente">Cliente / Solicitante</option>
                    <option value="prestador">Prestador de Serviço</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Pagador / Razão Social</label>
                <input
                  type="text"
                  placeholder="Ex: Dra. Juliana Santos ou Construtora Costa"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newPartyEmail}
                    onChange={(e) => setNewPartyEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição do Recebimento</label>
                <input
                  type="text"
                  placeholder="Ex: Entrada 1ª Parcela Obra ou Taxa de Proposta Comercial"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Projeto / Obra</label>
                  <input
                    type="text"
                    placeholder="Ex: Reforma Apartamento 42"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Método Esperado</label>
                  <select
                    value={newMethod}
                    onChange={(e: any) => setNewMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="PIX">PIX (Chave + QR Code)</option>
                    <option value="Mercado Pago">Mercado Pago (Checkout Pro)</option>
                    <option value="Cartão de Crédito">Cartão de Crédito Transparente</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewReceiptModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black cursor-pointer shadow-md"
                >
                  Salvar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Webhook Logs */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Logs de Eventos Recebidos pelo Webhook
                </h4>
              </div>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {loadingLogs ? (
                <div className="py-8 text-center text-slate-400 text-xs">Carregando logs...</div>
              ) : webhookLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">Nenhum evento registrado ainda.</div>
              ) : (
                webhookLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{log.eventType}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>ID Pagamento: <strong>{log.paymentId}</strong></div>
                      <div>Ref: <strong>{log.externalReference || 'N/A'}</strong></div>
                      <div>Vinculado a: <strong>{log.matchedEntity || 'N/A'}</strong></div>
                      <div>Status: <strong className="text-emerald-600">{log.status}</strong></div>
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                      Resultado: {log.result}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
