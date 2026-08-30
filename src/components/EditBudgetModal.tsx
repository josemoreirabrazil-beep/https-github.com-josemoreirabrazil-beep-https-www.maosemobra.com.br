import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calculator, Sparkles, TrendingUp, Check } from 'lucide-react';
import type { Project, Expense } from '../types';

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  expenses: Expense[];
  onSaveBudget: (newBudget: number) => void;
}

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  isOpen,
  onClose,
  project,
  expenses,
  onSaveBudget,
}) => {
  const [budgetValue, setBudgetValue] = useState<number>(project.budgetTotal || 0);

  useEffect(() => {
    setBudgetValue(project.budgetTotal || 0);
  }, [project.budgetTotal, isOpen]);

  if (!isOpen) return null;

  const totalPlannedFromExpenses = expenses.reduce((acc, curr) => acc + (curr.plannedAmount || curr.actualAmount || 0), 0);
  const totalActualFromExpenses = expenses.reduce((acc, curr) => acc + (curr.actualAmount || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBudget(Number(budgetValue) || 0);
    onClose();
  };

  const handleApplySumFromExpenses = () => {
    setBudgetValue(totalPlannedFromExpenses);
  };

  const handleApplyWithMargin = (marginPct: number) => {
    const base = totalPlannedFromExpenses > 0 ? totalPlannedFromExpenses : budgetValue;
    const withMargin = Math.round(base * (1 + marginPct / 100));
    setBudgetValue(withMargin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Atualizar Orçamento da Obra
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste o valor total previsto para a obra / proposta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Valor Total do Orçamento (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                R$
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={budgetValue}
                onChange={(e) => setBudgetValue(Number(e.target.value))}
                className="w-full pl-11 pr-4 py-3 text-lg font-black bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quick calculation shortcuts */}
          {expenses.length > 0 && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Atalhos de Cálculo dos Custos Lançados:
              </span>
              
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleApplySumFromExpenses}
                  className="w-full text-left px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                    Soma exata dos itens cadastrados:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {totalPlannedFromExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </button>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyWithMargin(10)}
                    className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 transition"
                  >
                    +10% Margem
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWithMargin(15)}
                    className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 transition"
                  >
                    +15% Margem
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWithMargin(20)}
                    className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 transition"
                  >
                    +20% Margem
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Salvar Orçamento
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
