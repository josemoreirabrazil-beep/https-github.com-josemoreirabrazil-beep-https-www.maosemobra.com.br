import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface MonthlyBudgetBarDataPoint {
  month: string;
  orcado: number;
  realizado: number;
}

interface MonthlyBudgetBarChartProps {
  data: MonthlyBudgetBarDataPoint[];
}

export const MonthlyBudgetBarChart: React.FC<MonthlyBudgetBarChartProps> = ({ data }) => {
  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
          <Tooltip
            formatter={(value: any) => [
              `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              '',
            ]}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="orcado" name="Orçado (Previsto)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          <Bar dataKey="realizado" name="Realizado (Efetivo)" fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyBudgetBarChart;
