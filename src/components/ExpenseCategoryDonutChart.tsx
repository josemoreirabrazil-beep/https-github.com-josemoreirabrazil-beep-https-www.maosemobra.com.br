import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Wallet, PieChart as PieIcon } from 'lucide-react';
import type { Expense } from '../types';

interface ExpenseCategoryDonutChartProps {
  expenses: Expense[];
}

const CATEGORY_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export const ExpenseCategoryDonutChart: React.FC<ExpenseCategoryDonutChartProps> = ({ expenses }) => {
  // Filter out income transactions, keep only expenses
  const expenseList = useMemo(() => {
    return expenses.filter(
      (e) => e.type !== 'Receita' && e.category !== 'Entrada / Aporte do Solicitante'
    );
  }, [expenses]);

  // Group by category: Material, Mão de Obra, Equipamentos, Outros
  const chartData = useMemo(() => {
    const groups: { [key: string]: number } = {
      'Material': 0,
      'Mão de Obra': 0,
      'Equipamentos': 0,
      'Outros': 0,
    };

    expenseList.forEach((exp) => {
      const catLower = (exp.category || '').toLowerCase();
      const amount = Number(exp.actualAmount) || Number(exp.plannedAmount) || 0;

      if (catLower.includes('material') || catLower.includes('materiais') || catLower.includes('insumo')) {
        groups['Material'] += amount;
      } else if (
        catLower.includes('mão') ||
        catLower.includes('mao') ||
        catLower.includes('equipe') ||
        catLower.includes('serviço') ||
        catLower.includes('salário') ||
        catLower.includes('profissional')
      ) {
        groups['Mão de Obra'] += amount;
      } else if (
        catLower.includes('equipamento') ||
        catLower.includes('máquina') ||
        catLower.includes('locação') ||
        catLower.includes('aluguel')
      ) {
        groups['Equipamentos'] += amount;
      } else {
        groups['Outros'] += amount;
      }
    });

    return Object.entries(groups)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [expenseList]);

  const totalExpenseSum = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
          <PieIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Distribuição de Gastos por Categoria
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Nenhuma despesa cadastrada ainda para gerar o gráfico de rosca.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Distribuição de Gastos por Categoria
            </h3>
            <p className="text-xs text-slate-500">
              Participação percentual de Material, Mão de Obra, Equipamentos e Outros
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Despesas</span>
          <span className="text-sm sm:text-base font-mono font-black text-slate-900 dark:text-white">
            R$ {totalExpenseSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Donut Chart Container */}
      <div className="h-64 sm:h-72 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [
                `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${
                  totalExpenseSum > 0 ? Math.round((Number(value) / totalExpenseSum) * 100) : 0
                }%)`,
                'Valor Gasto',
              ]}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '1rem',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
