import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Expense } from '../types';

interface ExpenseCategoryDonutChartProps {
  expenses: Expense[];
  budgetTotal?: number;
  onOpenNewExpense?: () => void;
}

interface CategorySlice {
  name: string;
  value: number;
  color: string;
  isRemainingBudget?: boolean;
}

const CATEGORY_DEFINITIONS: Array<{
  name: string;
  color: string;
  matcher: (catLower: string) => boolean;
}> = [
  {
    name: 'Materiais',
    color: '#f59e0b',
    matcher: (c) =>
      c.includes('material') ||
      c.includes('materiais') ||
      c.includes('acabamento') ||
      c.includes('insumo'),
  },
  {
    name: 'Mão de Obra',
    color: '#10b981',
    matcher: (c) =>
      c.includes('mão de obra') ||
      c.includes('mao de obra') ||
      c.includes('pedreiro') ||
      c.includes('servente') ||
      c.includes('equipe') ||
      c.includes('salário') ||
      c.includes('salario') ||
      c.includes('diária') ||
      c.includes('diaria') ||
      c.includes('profissional'),
  },
  {
    name: 'Serviços Terceirizados',
    color: '#3b82f6',
    matcher: (c) =>
      c.includes('terceir') ||
      c.includes('empreit') ||
      c.includes('instalaç') ||
      c.includes('instalac') ||
      c.includes('elétric') ||
      c.includes('eletric') ||
      c.includes('hidráulic') ||
      c.includes('hidraulic') ||
      c.includes('projeto') ||
      c.includes('taxa') ||
      c.includes('alvar') ||
      c.includes('mobiliza') ||
      c.includes('transporte') ||
      c.includes('frete') ||
      c.includes('serviço') ||
      c.includes('servico'),
  },
  {
    name: 'Equipamentos',
    color: '#8b5cf6',
    matcher: (c) =>
      c.includes('equipamento') ||
      c.includes('máquina') ||
      c.includes('maquina') ||
      c.includes('caçamba') ||
      c.includes('cacamba') ||
      c.includes('locação') ||
      c.includes('locacao') ||
      c.includes('aluguel'),
  },
];

const OTHER_CATEGORY_COLOR = '#ec4899';
const REMAINING_BUDGET_COLOR = '#94a3b8';

const formatBrl = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ExpenseCategoryDonutChart: React.FC<ExpenseCategoryDonutChartProps> = ({
  expenses,
  budgetTotal = 0,
  onOpenNewExpense,
}) => {
  const [viewMode, setViewMode] = useState<'budget' | 'expenses'>(
    budgetTotal > 0 ? 'budget' : 'expenses'
  );

  const safeBudgetTotal = Math.max(0, Number(budgetTotal) || 0);

  // Mantém apenas despesas reais/planejadas (exclui receitas/aportes)
  const expenseList = useMemo(() => {
    return expenses.filter(
      (e) => e.type !== 'Receita' && e.category !== 'Entrada / Aporte do Solicitante'
    );
  }, [expenses]);

  const { expenseSlices, totalExpenses } = useMemo(() => {
    const totals: Record<string, number> = {
      'Materiais': 0,
      'Mão de Obra': 0,
      'Serviços Terceirizados': 0,
      'Equipamentos': 0,
      'Outros': 0,
    };

    expenseList.forEach((exp) => {
      const catLower = (exp.category || '').toLowerCase();
      const amount = Number(exp.actualAmount) || Number(exp.plannedAmount) || 0;
      if (amount <= 0) return;

      const matchedDef = CATEGORY_DEFINITIONS.find((def) => def.matcher(catLower));
      if (matchedDef) {
        totals[matchedDef.name] += amount;
      } else {
        totals['Outros'] += amount;
      }
    });

    const colorLookup: Record<string, string> = {
      ...Object.fromEntries(CATEGORY_DEFINITIONS.map((d) => [d.name, d.color])),
      'Outros': OTHER_CATEGORY_COLOR,
    };

    const slices: CategorySlice[] = Object.entries(totals)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: colorLookup[name] || OTHER_CATEGORY_COLOR,
      }))
      .sort((a, b) => b.value - a.value);

    const sum = slices.reduce((acc, item) => acc + item.value, 0);
    return { expenseSlices: slices, totalExpenses: sum };
  }, [expenseList]);

  const activeMode = safeBudgetTotal > 0 ? viewMode : 'expenses';
  const remainingBudget = Math.max(0, safeBudgetTotal - totalExpenses);
  const budgetUsagePct =
    safeBudgetTotal > 0 ? Math.round((totalExpenses / safeBudgetTotal) * 100) : 0;
  const isOverBudget = safeBudgetTotal > 0 && totalExpenses > safeBudgetTotal;

  const chartData = useMemo(() => {
    if (activeMode === 'budget' && safeBudgetTotal > 0 && remainingBudget > 0) {
      return [
        ...expenseSlices,
        {
          name: 'Saldo Disponível do Orçamento',
          value: remainingBudget,
          color: REMAINING_BUDGET_COLOR,
          isRemainingBudget: true,
        },
      ];
    }
    return expenseSlices;
  }, [activeMode, safeBudgetTotal, remainingBudget, expenseSlices]);

  const denominator =
    activeMode === 'budget' && safeBudgetTotal > 0
      ? Math.max(safeBudgetTotal, totalExpenses)
      : totalExpenses;

  if (expenseSlices.length === 0 && safeBudgetTotal <= 0) {
    return (
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
          <PieIcon className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Distribuição do Orçamento por Categoria
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Defina o orçamento total da obra ou lance despesas em Materiais, Mão de Obra e Serviços Terceirizados para visualizar o gráfico de rosca.
        </p>
        {onOpenNewExpense && (
          <button
            type="button"
            onClick={onOpenNewExpense}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Lançar Primeira Despesa
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Distribuição do Orçamento por Categoria de Despesa
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Materiais, Mão de Obra, Serviços Terceirizados e demais custos</span>
            {safeBudgetTotal > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-semibold">
                  Orçamento total: {formatBrl(safeBudgetTotal)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {safeBudgetTotal > 0 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('budget')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeMode === 'budget'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sobre o Orçamento
              </button>
              <button
                type="button"
                onClick={() => setViewMode('expenses')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeMode === 'expenses'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Apenas Despesas
              </button>
            </div>
          )}

          {onOpenNewExpense && (
            <button
              type="button"
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Despesa</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid: Donut + Tabular Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-6">
        {/* Left: Recharts Donut Chart */}
        <div className="lg:col-span-5 relative h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={104}
                paddingAngle={chartData.length > 1 ? 3 : 0}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload as CategorySlice;
                  const pctBudget =
                    safeBudgetTotal > 0
                      ? ((item.value / safeBudgetTotal) * 100).toFixed(1)
                      : null;
                  const pctExpenses =
                    !item.isRemainingBudget && totalExpenses > 0
                      ? ((item.value / totalExpenses) * 100).toFixed(1)
                      : null;

                  return (
                    <div className="rounded-xl bg-slate-900 text-white border border-slate-700 px-3.5 py-2.5 shadow-lg text-xs space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-amber-400">
                        {formatBrl(item.value)}
                      </div>
                      {pctBudget !== null && (
                        <div className="text-slate-300 font-mono tabular-nums">
                          {pctBudget}% do orçamento total
                        </div>
                      )}
                      {pctExpenses !== null && (
                        <div className="text-slate-400 font-mono tabular-nums">
                          {pctExpenses}% das despesas lançadas
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Summary Inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {activeMode === 'budget' && safeBudgetTotal > 0 ? 'Orçamento Total' : 'Total Despesas'}
            </span>
            <span className="text-sm sm:text-base font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
              {formatBrl(activeMode === 'budget' && safeBudgetTotal > 0 ? safeBudgetTotal : totalExpenses)}
            </span>
            {safeBudgetTotal > 0 && (
              <span
                className={`text-[11px] font-mono tabular-nums font-semibold mt-0.5 ${
                  isOverBudget
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {budgetUsagePct}% utilizado
              </span>
            )}
          </div>
        </div>

        {/* Right: Structured Category Breakdown */}
        <div className="lg:col-span-7 divide-y divide-slate-100 dark:divide-slate-800">
          {chartData.map((item) => {
            const pct = denominator > 0 ? ((item.value / denominator) * 100).toFixed(1) : '0.0';
            const barWidth = denominator > 0 ? Math.min(100, (item.value / denominator) * 100) : 0;

            return (
              <div key={item.name} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className={`truncate font-semibold ${
                        item.isRemainingBudget
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatBrl(item.value)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}

          {/* Budget Status Summary Footer Line */}
          <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {isOverBudget ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    Orçamento excedido em{' '}
                    <span className="font-mono tabular-nums">
                      {formatBrl(totalExpenses - safeBudgetTotal)}
                    </span>
                  </span>
                </>
              ) : safeBudgetTotal > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Total comprometido:{' '}
                    <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatBrl(totalExpenses)}
                    </strong>{' '}
                    ({budgetUsagePct}% do orçamento)
                  </span>
                </>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">
                  Total de despesas lançadas:{' '}
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatBrl(totalExpenses)}
                  </strong>
                </span>
              )}
            </div>

            {safeBudgetTotal > 0 && !isOverBudget && (
              <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Disponível: {formatBrl(remainingBudget)}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
