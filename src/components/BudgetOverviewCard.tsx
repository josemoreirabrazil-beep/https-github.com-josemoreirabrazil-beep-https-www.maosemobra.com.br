import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Edit3, Check, Wallet, ArrowUpRight } from 'lucide-react';
import type { Project, Expense } from '../types';
import confetti from 'canvas-confetti';

interface BudgetOverviewCardProps {
  project: Project;
  expenses: Expense[];
  onUpdateProject: (updated: Project) => void;
  onNavigateToFinancial: () => void;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  project,
  expenses,
  onUpdateProject,
  onNavigateToFinancial,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>(String(project.budgetTotal || 0));

  const totalPlanned = Number(project.budgetTotal) || 0;

  const expenseTransactions = expenses.filter(
    (e) => e.type !== 'Receita' && e.category !== 'Entrada / Aporte do Solicitante'
  );
  const totalSpent = expenseTransactions.reduce(
    (acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0),
    0
  );

  const budgetBalance = totalPlanned - totalSpent;
  const usagePercent = totalPlanned > 0 ? Math.min(Math.round((totalSpent / totalPlanned) * 100), 100) : 0;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const newTotal = Number(budgetInput) || 0;
    onUpdateProject({
      ...project,
      budgetTotal: newTotal,
    });
    setIsEditing(false);
    confetti({ particleCount: 50, spread: 60 });
  };

  const getStatusColor = () => {
    if (usagePercent > 100) return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    if (usagePercent >= 85) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  };

  const getStatusText = () => {
    if (usagePercent > 100) return 'Orçamento Estourado';
    if (usagePercent >= 85) return 'Atenção: Próximo do Limite';
    return 'Orçamento Saudável';
  };

  return (
    <div
      data-testid="budget-overview-card"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Orçamento Total Previsto vs. Realizado
                </h3>
                <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Valores calculados em tempo real com base nas despesas cadastradas no financeiro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setBudgetInput(String(project.budgetTotal || 0));
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                <span>Editar Orçamento Previsto</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onNavigateToFinancial}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              <span>Ver Financeiro</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveBudget} className="p-4 mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                Novo Orçamento Total Previsto (R$):
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto mt-auto">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Orçamento</span>
              </button>
            </div>
          </form>
        )}

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Orçamento Total Previsto
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              R$ {totalPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Realizado (Gasto)
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Saldo Orçamentário Restante
            </span>
            <span className={`text-xl sm:text-2xl font-black font-mono ${budgetBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              R$ {budgetBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Taxa de Utilização do Orçamento</span>
            <span className="font-mono">{usagePercent}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                usagePercent > 100
                  ? 'bg-rose-500'
                  : usagePercent >= 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
