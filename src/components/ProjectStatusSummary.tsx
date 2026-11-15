import React from 'react';
import { Phase, Project } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDashed,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface ProjectStatusSummaryProps {
  project: Project;
  phases: Phase[];
  onNavigateToTimeline?: () => void;
}

export const ProjectStatusSummary: React.FC<ProjectStatusSummaryProps> = ({
  project,
  phases,
  onNavigateToTimeline,
}) => {
  const totalPhases = phases.length;
  const completedPhases = phases.filter(
    (p) => p.status === 'Concluída' || p.progressPercentage >= 100
  ).length;
  const inProgressPhases = phases.filter(
    (p) => p.status === 'Em andamento' && p.progressPercentage < 100
  ).length;
  const delayedPhases = phases.filter((p) => p.status === 'Atrasada').length;
  const notStartedPhases = phases.filter(
    (p) => p.status === 'Não iniciada'
  ).length;

  // Percentual de conclusão calculado automaticamente: fases finalizadas vs. total de fases cadastradas
  const completionPercentage =
    totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  // Média ponderada de execução física das etapas (informativo complementar)
  const weightedAverageProgress =
    totalPhases > 0
      ? Math.round(
          phases.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) /
            totalPhases
        )
      : 0;

  const getStatusBadgeColor = () => {
    if (completionPercentage === 100 && totalPhases > 0) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (delayedPhases > 0) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (inProgressPhases > 0 || completedPhases > 0) {
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    }
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  const getOverallStatusText = () => {
    if (totalPhases === 0) return 'Sem Fases Cadastradas';
    if (completionPercentage === 100) return 'Obra 100% Finalizada';
    if (delayedPhases > 0) return `Atenção: ${delayedPhases} Fase(s) em Atraso`;
    if (inProgressPhases > 0) return 'Execução Dentro do Cronograma';
    return 'Aguardando Início das Fases';
  };

  return (
    <section
      data-testid="project-status-summary"
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden"
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 transition-all duration-700"
        style={{ width: `${Math.max(completionPercentage, 6)}%` }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Resumo de Status da Obra
              </h2>
              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getStatusBadgeColor()}`}
              >
                {getOverallStatusText()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Cálculo automático de conclusão baseado nas fases finalizadas vs. total de fases cadastradas em{' '}
              <span className="text-zinc-200 font-medium">{project.title}</span>
            </p>
          </div>
        </div>

        {onNavigateToTimeline && (
          <button
            type="button"
            onClick={onNavigateToTimeline}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-wider border border-zinc-700 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
          >
            Gerenciar Fases
            <ArrowUpRight className="w-4 h-4 text-orange-400" />
          </button>
        )}
      </div>

      {/* Main Progress Bar Container */}
      <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
              Percentual de Conclusão da Obra (Fases Finalizadas / Total)
            </span>
            <div className="flex items-baseline gap-3">
              <span
                data-testid="status-summary-percentage"
                className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight"
              >
                {completionPercentage}%
              </span>
              <span
                data-testid="status-summary-ratio"
                className="text-sm font-semibold text-orange-400"
              >
                {completedPhases} de {totalPhases}{' '}
                {totalPhases === 1 ? 'fase finalizada' : 'fases finalizadas'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Avanço físico médio:</span>
              <strong className="text-white font-mono">
                {weightedAverageProgress}%
              </strong>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          role="progressbar"
          aria-label="Percentual de conclusão da obra baseado nas fases finalizadas"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="status-summary-progressbar"
          className="w-full h-4 bg-zinc-800/90 rounded-full overflow-hidden p-0.5 border border-zinc-700/60 relative"
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out relative ${
              completionPercentage === 100
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 shadow-[0_0_15px_rgba(249,115,22,0.45)]'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Scale Markers */}
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-2 px-0.5">
          <span>0% (Início)</span>
          <span>25%</span>
          <span>50% (Metade)</span>
          <span>75%</span>
          <span>100% (Entrega)</span>
        </div>
      </div>

      {/* 4 Breakdown Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <div className="bg-zinc-950/60 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white font-mono leading-none">
              {completedPhases}
              <span className="text-xs font-normal text-zinc-500 ml-1">
                /{totalPhases}
              </span>
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mt-1">
              Fases Finalizadas
            </p>
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-orange-500/20 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white font-mono leading-none">
              {inProgressPhases}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-400 mt-1">
              Em Andamento
            </p>
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <CircleDashed className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white font-mono leading-none">
              {notStartedPhases}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mt-1">
              Não Iniciadas
            </p>
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-rose-500/20 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white font-mono leading-none">
              {delayedPhases}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mt-1">
              Em Atraso
            </p>
          </div>
        </div>
      </div>

      {/* Phase Chips Strip */}
      {totalPhases > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Detalhamento das Fases Cadastradas ({totalPhases})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {phases.map((phase, idx) => {
              const isCompleted =
                phase.status === 'Concluída' || phase.progressPercentage >= 100;
              const isDelayed = phase.status === 'Atrasada';
              const isInProgress = phase.status === 'Em andamento' && !isCompleted;

              return (
                <div
                  key={phase.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                    isCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : isDelayed
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : isInProgress
                      ? 'bg-orange-950/20 border-orange-500/30 text-orange-200'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-300 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold truncate" title={phase.title}>
                      {phase.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] font-bold">
                      {isCompleted ? '100%' : `${phase.progressPercentage}%`}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isDelayed
                          ? 'bg-rose-500/20 text-rose-300'
                          : isInProgress
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isCompleted ? 'Concluída' : phase.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl p-4 text-zinc-400 text-xs">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-orange-400 shrink-0" />
            <span>
              Nenhuma fase cadastrada ainda para esta obra. Cadastre as fases no cronograma para acompanhar o progresso automaticamente.
            </span>
          </div>
          {onNavigateToTimeline && (
            <button
              type="button"
              onClick={onNavigateToTimeline}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs shrink-0 cursor-pointer"
            >
              Cadastrar Fases
            </button>
          )}
        </div>
      )}
    </section>
  );
};
