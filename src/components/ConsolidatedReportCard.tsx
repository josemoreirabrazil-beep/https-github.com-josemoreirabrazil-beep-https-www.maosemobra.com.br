import React from 'react';
import { FileSpreadsheet, Download, Sparkles, TrendingUp, DollarSign, Layers } from 'lucide-react';
import type { Project, Expense, Phase } from '../types';
import confetti from 'canvas-confetti';

interface ConsolidatedReportCardProps {
  project: Project;
  expenses: Expense[];
  phases: Phase[];
}

export const ConsolidatedReportCard: React.FC<ConsolidatedReportCardProps> = ({
  project,
  expenses,
  phases,
}) => {
  const totalPlanned = Number(project.budgetTotal) || 0;
  
  const expenseTransactions = expenses.filter(e => e.type !== 'Receita' && e.category !== 'Entrada / Aporte do Solicitante');
  const totalSpent = expenseTransactions.reduce((acc, curr) => acc + (Number(curr.actualAmount) || Number(curr.plannedAmount) || 0), 0);
  const budgetBalance = totalPlanned - totalSpent;

  const totalPhases = phases.length;
  const completedPhases = phases.filter(p => p.status === 'Concluída' || p.progressPercentage >= 100).length;
  const completionPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const handleDownloadCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    
    // Header
    csvContent += 'RELATORIO CONSOLIDADO DE OBRA - MAOS EM OBRA\n';
    csvContent += `Obra,${project.title}\n`;
    csvContent += `Cliente,${project.clientInstitutionalName || project.clientName || 'N/A'}\n`;
    csvContent += `Data de Emissao,${new Date().toLocaleDateString('pt-BR')}\n\n`;

    // Financial Summary
    csvContent += 'RESUMO FINANCEIRO (ORCADO VS REALIZADO)\n';
    csvContent += `Orcamento Total Previsto (R$),${totalPlanned.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Total Realizado / Gasto (R$),${totalSpent.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Saldo Restante (R$),${budgetBalance.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Percentual de Utilizacao Orcamentaria,${totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0}%\n\n`;

    // Phase Progress Summary
    csvContent += 'STATUS E PROGRESSO DAS FASES\n';
    csvContent += `Total de Fases Cadastradas,${totalPhases}\n`;
    csvContent += `Fases Finalizadas,${completedPhases}\n`;
    csvContent += `Percentual de Conclusao da Obra,${completionPercentage}%\n\n`;

    // Phases Detail Table
    csvContent += 'DETALHAMENTO DAS FASES\n';
    csvContent += 'Ordem,Titulo da Fase,Status,Progresso (%),Data Inicio,Data Fim\n';
    phases.forEach((p, idx) => {
      csvContent += `${idx + 1},"${p.title.replace(/",/g, '""')}",${p.status},${p.progressPercentage}%,${p.startDate},${p.endDate}\n`;
    });

    // Expenses Detail Table
    csvContent += '\nDETALHAMENTO DE DESPESAS\n';
    csvContent += 'Descricao,Categoria,Fornecedor,Status,Valor Previsto (R$),Valor Realizado (R$),Data\n';
    expenseTransactions.forEach(e => {
      csvContent += `"${e.description.replace(/",/g, '""')}","${e.category}","${e.supplier}",${e.status},${(e.plannedAmount || 0).toFixed(2).replace('.', ',')},${(e.actualAmount || 0).toFixed(2).replace('.', ',')},${e.date}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Relatorio_Consolidado_${project.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-7 text-white border border-slate-800 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
              Relatório Consolidado Exportável
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Resumo Financeiro & Progresso de Fases (CSV)
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Gere e baixe instantaneamente um relatório em formato CSV combinando o orçamento previsto vs. realizado com o avanço físico de todas as fases da obra.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition active:scale-95 cursor-pointer shrink-0"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Baixar Relatório Consolidado (CSV)</span>
        </button>
      </div>
    </div>
  );
};
