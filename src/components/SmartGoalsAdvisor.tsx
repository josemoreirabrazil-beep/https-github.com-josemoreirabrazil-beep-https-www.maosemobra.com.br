import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { Expense, Phase, Project, ProjectGoal } from '../types';
import type { NavTab } from './Navigation';

interface SmartGoalsAdvisorProps {
  project: Project;
  phases: Phase[];
  expenses: Expense[];
  goals: ProjectGoal[];
  onSaveGoal: (goal: ProjectGoal) => void;
  onNavigate: (tab: NavTab) => void;
}

interface SmartRecommendation {
  id: string;
  severity: 'critical' | 'warning' | 'healthy';
  title: string;
  rationale: string;
  suggestedGoal?: Omit<ProjectGoal, 'id' | 'projectId' | 'month' | 'createdAt'>;
  actionTab: NavTab;
  actionLabel: string;
}

const formatBrl = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function computeExpectedPhaseProgress(startDateStr: string, endDateStr: string, nowMs: number): number | null {
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  if (nowMs <= start) return 0;
  if (nowMs >= end) return 100;
  return Math.round(((nowMs - start) / (end - start)) * 100);
}

export const SmartGoalsAdvisor: React.FC<SmartGoalsAdvisorProps> = ({
  project,
  phases,
  expenses,
  goals,
  onSaveGoal,
  onNavigate,
}) => {
  const analysis = useMemo(() => {
    const nowMs = Date.now();
    const budgetTotal = Math.max(0, Number(project.budgetTotal) || 0);

    const expenseRows = expenses.filter(
      (e) => e.type !== 'Receita' && e.category !== 'Entrada / Aporte do Solicitante'
    );

    const totalSpent = expenseRows.reduce(
      (sum, e) => sum + (Number(e.actualAmount) || Number(e.plannedAmount) || 0),
      0
    );

    const pendingExpensesTotal = expenseRows
      .filter((e) => e.status !== 'Pago')
      .reduce((sum, e) => sum + (Number(e.actualAmount) || Number(e.plannedAmount) || 0), 0);

    const categoryTotals: Record<string, number> = {};
    expenseRows.forEach((e) => {
      const cat = e.category || 'Outros';
      const val = Number(e.actualAmount) || Number(e.plannedAmount) || 0;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
    });

    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topCategoryName = sortedCategories[0]?.[0] || 'Insumos';
    const topCategoryAmount = sortedCategories[0]?.[1] || 0;
    const topCategoryPct = totalSpent > 0 ? Math.round((topCategoryAmount / totalSpent) * 100) : 0;

    const orderedPhases = [...phases].sort((a, b) => (a.order || 0) - (b.order || 0));
    const avgPhysicalProgress =
      orderedPhases.length > 0
        ? Math.round(
            orderedPhases.reduce((sum, p) => sum + Math.max(0, Math.min(100, Number(p.progressPercentage) || 0)), 0) /
              orderedPhases.length
          )
        : 0;

    const budgetUsedPct = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0;
    const costProgressGap = budgetTotal > 0 ? budgetUsedPct - avgPhysicalProgress : 0;

    const recommendations: SmartRecommendation[] = [];

    // 1. Análise por fase (progresso real vs prazo e impacto no orçamento)
    orderedPhases.forEach((phase, idx) => {
      if (phase.status === 'Concluída' || phase.progressPercentage >= 100) return;

      const phaseNumber = phase.order || idx + 1;
      const actualProgress = Math.max(0, Math.min(100, Number(phase.progressPercentage) || 0));
      const expectedProgress = computeExpectedPhaseProgress(phase.startDate, phase.endDate, nowMs);
      const endMs = new Date(phase.endDate).getTime();
      const isOverdueByDate = Number.isFinite(endMs) && nowMs > endMs;
      const scheduleLag = expectedProgress !== null ? expectedProgress - actualProgress : 0;
      const isDelayed = phase.status === 'Atrasada' || isOverdueByDate || scheduleLag >= 15;

      const phaseLinkedSpent = expenseRows
        .filter((e) => e.phaseId === phase.id)
        .reduce((sum, e) => sum + (Number(e.actualAmount) || Number(e.plannedAmount) || 0), 0);
      const phaseSharePct =
        budgetTotal > 0 && orderedPhases.length > 0
          ? Math.round((phaseLinkedSpent / (budgetTotal / orderedPhases.length)) * 100)
          : 0;

      const highCostPressure = costProgressGap >= 10 || phaseSharePct > actualProgress + 15 || budgetUsedPct >= 75;
      const pendingChecklistCount = (phase.checklist || []).filter((item) => !item.done).length;

      if (isDelayed) {
        if (highCostPressure) {
          recommendations.push({
            id: `phase-delay-cost-${phase.id}`,
            severity: 'critical',
            title: `Atraso na Fase ${phaseNumber} (${phase.title}) detectado — Otimize custo de insumos`,
            rationale: `Avanço real da fase em ${actualProgress}%${
              expectedProgress !== null ? ` contra ${expectedProgress}% esperado` : ''
            }, enquanto o consumo do orçamento atingiu ${budgetUsedPct}% (${formatBrl(totalSpent)}). Priorize compras programadas em ${topCategoryName} e evite retrabalho.`,
            suggestedGoal: {
              title: `Reduzir custos na Fase ${phaseNumber}: ${phase.title}`,
              type: 'Economia de Orçamento',
              currentValue: Math.min(100, Math.max(0, 100 - budgetUsedPct)),
              targetValue: 15,
              unit: '% economia',
              deadline: phase.endDate || undefined,
            },
            actionTab: 'calculator',
            actionLabel: 'Otimizar Insumos',
          });
        } else {
          recommendations.push({
            id: `phase-delay-schedule-${phase.id}`,
            severity: 'warning',
            title: `Atraso na Fase ${phaseNumber} (${phase.title}) detectado — Acelerar frente de serviço`,
            rationale: `Progresso físico real em ${actualProgress}%${
              expectedProgress !== null ? ` (esperado ${expectedProgress}%)` : ''
            } com ${pendingChecklistCount} tarefa(s) pendente(s) no checklist antes do prazo ${phase.endDate}.`,
            suggestedGoal: {
              title: `Recuperar prazo da Fase ${phaseNumber}: ${phase.title}`,
              type: 'Conclusão Física',
              currentValue: actualProgress,
              targetValue: 100,
              unit: '%',
              deadline: phase.endDate || undefined,
            },
            actionTab: 'timeline',
            actionLabel: 'Ajustar Cronograma',
          });
        }
      }
    });

    // 2. Desvio global entre orçamento gasto e progresso físico médio das fases
    if (budgetTotal > 0 && (totalSpent > budgetTotal || costProgressGap >= 15)) {
      const targetCap = Math.round(budgetTotal * 0.95);
      recommendations.push({
        id: 'budget-overrun-risk',
        severity: totalSpent > budgetTotal ? 'critical' : 'warning',
        title:
          totalSpent > budgetTotal
            ? `Orçamento total excedido — Contenção imediata em ${topCategoryName}`
            : `Gasto acima do avanço físico (+${costProgressGap} p.p.) — Otimize ${topCategoryName}`,
        rationale: `Orçamento executado em ${budgetUsedPct}% (${formatBrl(totalSpent)} de ${formatBrl(
          budgetTotal
        )}) para ${avgPhysicalProgress}% de progresso físico médio. ${topCategoryName} concentra ${topCategoryPct}% dos custos.`,
        suggestedGoal: {
          title: `Limitar gastos em ${topCategoryName} dentro do teto`,
          type: 'Economia de Orçamento',
          currentValue: Math.round(totalSpent),
          targetValue: targetCap > 0 ? targetCap : Math.round(budgetTotal),
          unit: 'R$',
        },
        actionTab: 'financial',
        actionLabel: 'Revisar Financeiro',
      });
    }

    // 3. Comprometimento futuro com despesas pendentes
    if (budgetTotal > 0 && pendingExpensesTotal > 0 && totalSpent > budgetTotal * 0.85) {
      recommendations.push({
        id: 'pending-commitment-alert',
        severity: 'warning',
        title: 'Contas pendentes pressionam a margem disponível do orçamento',
        rationale: `Existem ${formatBrl(pendingExpensesTotal)} em lançamentos ainda não quitados. Renegocie prazos de pagamento ou substitua insumos alternativos antes da próxima medição.`,
        actionTab: 'financial',
        actionLabel: 'Gerenciar Despesas',
      });
    }

    // 4. Estado saudável caso fases existam e estejam dentro da curva esperada
    if (orderedPhases.length > 0 && recommendations.length === 0) {
      const nextActivePhase =
        orderedPhases.find((p) => p.status !== 'Concluída' && p.progressPercentage < 100) || orderedPhases[0];
      const nextPhaseNum = nextActivePhase.order || orderedPhases.indexOf(nextActivePhase) + 1;

      recommendations.push({
        id: 'execution-balanced',
        severity: 'healthy',
        title: `Execução equilibrada — Fases em ${avgPhysicalProgress}% vs Orçamento em ${budgetUsedPct}%`,
        rationale: `O avanço físico acompanha o ritmo financeiro (${formatBrl(totalSpent)} aplicados). Mantenha o controle de compras da Fase ${nextPhaseNum} (${nextActivePhase.title}) para preservar saldo.`,
        suggestedGoal: {
          title: `Concluir Fase ${nextPhaseNum} (${nextActivePhase.title}) dentro do orçamento`,
          type: 'Conclusão Física',
          currentValue: Math.round(nextActivePhase.progressPercentage || 0),
          targetValue: 100,
          unit: '%',
          deadline: nextActivePhase.endDate || undefined,
        },
        actionTab: 'timeline',
        actionLabel: 'Acompanhar Fases',
      });
    }

    return {
      budgetTotal,
      totalSpent,
      avgPhysicalProgress,
      budgetUsedPct,
      costProgressGap,
      orderedPhasesCount: orderedPhases.length,
      recommendations: recommendations.slice(0, 4),
    };
  }, [project.budgetTotal, phases, expenses]);

  const existingTitles = useMemo(
    () => new Set(goals.map((g) => g.title.trim().toLowerCase())),
    [goals]
  );

  const handleApplySuggestedGoal = (rec: SmartRecommendation) => {
    if (!rec.suggestedGoal) return;
    const goal: ProjectGoal = {
      id: `goal-smart-${Date.now()}`,
      projectId: project.id,
      title: rec.suggestedGoal.title,
      type: rec.suggestedGoal.type,
      targetValue: rec.suggestedGoal.targetValue,
      currentValue: rec.suggestedGoal.currentValue,
      unit: rec.suggestedGoal.unit,
      month: new Date().toISOString().substring(0, 7),
      deadline: rec.suggestedGoal.deadline,
      createdAt: new Date().toISOString(),
    };
    onSaveGoal(goal);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 space-y-5">
      {/* Header & Cross-Comparison Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Metas Inteligentes: Progresso das Fases vs Orçamento
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Diagnóstico automático entre avanço físico do cronograma e consumo financeiro para sugerir ações corretivas
            </p>
          </div>
        </div>

        {/* Metrics Strip (tabular figures, unboxed) */}
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Avanço Físico Médio</span>
            <span className="text-base font-mono tabular-nums font-bold text-slate-900 dark:text-white">
              {analysis.avgPhysicalProgress}%
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Orçamento Consumido</span>
            <span className="text-base font-mono tabular-nums font-bold text-slate-900 dark:text-white">
              {analysis.budgetTotal > 0 ? `${analysis.budgetUsedPct}%` : formatBrl(analysis.totalSpent)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Desvio Físico × Custo</span>
            <span
              className={`text-sm font-mono tabular-nums font-bold inline-flex items-center gap-1 ${
                analysis.costProgressGap >= 15
                  ? 'text-rose-600 dark:text-rose-400'
                  : analysis.costProgressGap >= 5
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {analysis.costProgressGap > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{analysis.costProgressGap} p.p. gasto
                </>
              ) : analysis.costProgressGap < 0 ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  {Math.abs(analysis.costProgressGap)} p.p. economia
                </>
              ) : (
                'Alinhado'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations List or Empty State */}
      {analysis.orderedPhasesCount === 0 ? (
        <div className="py-6 text-center space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Cadastre as fases do cronograma para que o painel cruze automaticamente o percentual concluído de cada etapa com o orçamento gasto.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('timeline')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Cadastrar Primeira Fase</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {analysis.recommendations.map((rec) => {
            const alreadySaved = rec.suggestedGoal
              ? existingTitles.has(rec.suggestedGoal.title.trim().toLowerCase())
              : false;

            const severityColor =
              rec.severity === 'critical'
                ? 'text-rose-600 dark:text-rose-400'
                : rec.severity === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400';

            const severityText =
              rec.severity === 'critical'
                ? 'Ação Corretiva Crítica'
                : rec.severity === 'warning'
                ? 'Atenção Recomendada'
                : 'Ritmo Saudável';

            return (
              <div
                key={rec.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${severityColor}`}>
                    {rec.severity === 'healthy' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{severityText}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rec.rationale}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {rec.suggestedGoal && (
                    alreadySaved ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Meta ativa em Metas de Obra</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplySuggestedGoal(rec)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Aplicar como Meta</span>
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigate(rec.actionTab)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{rec.actionLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
