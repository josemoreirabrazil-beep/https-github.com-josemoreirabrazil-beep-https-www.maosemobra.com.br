import React, { useState } from 'react';
import { 
  CalendarClock, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Calendar, 
  Check, 
  ListChecks,
  X
} from 'lucide-react';
import type { Phase, ChecklistItem, PhaseStatus } from '../types';
import confetti from 'canvas-confetti';

interface TimelineViewProps {
  phases: Phase[];
  onUpdatePhase: (phase: Phase) => void;
  onAddPhase: (phase: Phase) => void;
  onDeletePhase: (phaseId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  phases,
  onUpdatePhase,
  onAddPhase,
  onDeletePhase,
}) => {
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(phases[0]?.id || null);
  const [isNewPhaseModalOpen, setIsNewPhaseModalOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState<{ [phaseId: string]: string }>({});

  // New Phase Form
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<PhaseStatus>('Planejamento');

  const handleToggleChecklist = (phase: Phase, checkId: string) => {
    const updatedChecklist = phase.checklist.map(item => 
      item.id === checkId ? { ...item, done: !item.done } : item
    );

    const total = updatedChecklist.length;
    const completed = updatedChecklist.filter(i => i.done).length;
    const newProgress = total > 0 ? Math.round((completed / total) * 100) : phase.progressPercentage;
    const newStatus: PhaseStatus = newProgress === 100 ? 'Concluída' : newProgress > 0 ? 'Em andamento' : phase.status;

    if (newProgress === 100 && phase.progressPercentage < 100) {
      confetti({ particleCount: 50, spread: 60 });
    }

    onUpdatePhase({
      ...phase,
      checklist: updatedChecklist,
      progressPercentage: newProgress,
      status: newStatus,
    });
  };

  const handleProgressSliderChange = (phase: Phase, newProgress: number) => {
    const newStatus: PhaseStatus = newProgress === 100 ? 'Concluída' : newProgress > 0 ? 'Em andamento' : 'Planejamento';
    onUpdatePhase({
      ...phase,
      progressPercentage: newProgress,
      status: newStatus,
    });
  };

  const handleAddChecklistItem = (phase: Phase) => {
    const text = newChecklistText[phase.id]?.trim();
    if (!text) return;

    const newItem: ChecklistItem = {
      id: `check-${Date.now()}`,
      text,
      done: false,
    };

    onUpdatePhase({
      ...phase,
      checklist: [...phase.checklist, newItem],
    });

    setNewChecklistText(prev => ({ ...prev, [phase.id]: '' }));
  };

  const handleCreatePhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      projectId: phases[0]?.projectId || 'proj-1',
      title: title.trim(),
      order: phases.length + 1,
      startDate,
      endDate: endDate || startDate,
      progressPercentage: 0,
      status,
      checklist: [
        { id: `c-${Date.now()}-1`, text: 'Conferência inicial de medidas e esquadro', done: false },
        { id: `c-${Date.now()}-2`, text: 'Execução conforme norma técnica ABNT', done: false },
        { id: `c-${Date.now()}-3`, text: 'Vistoria e aceite do cliente', done: false },
      ],
    };

    onAddPhase(newPhase);
    setTitle('');
    setIsNewPhaseModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-amber-500" />
            Cronograma Físico & Controle de Qualidade
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o andamento de cada etapa com checklists técnicos de fiscalização
          </p>
        </div>

        <button
          onClick={() => setIsNewPhaseModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nova Etapa / Fase
        </button>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {phases.map((phase, idx) => {
          const isExpanded = expandedPhaseId === phase.id;
          const completedChecks = phase.checklist.filter(c => c.done).length;

          return (
            <div 
              key={phase.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition duration-150 hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Phase Bar Header */}
              <div 
                onClick={() => setExpandedPhaseId(isExpanded ? null : phase.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    phase.status === 'Concluída' ? 'bg-emerald-500 text-white' :
                    phase.status === 'Em andamento' ? 'bg-amber-500 text-slate-950' :
                    phase.status === 'Atrasada' ? 'bg-rose-500 text-white' :
                    'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {phase.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        phase.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        phase.status === 'Em andamento' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        phase.status === 'Atrasada' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {phase.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {phase.startDate} até {phase.endDate}
                      </span>
                      <span>•</span>
                      <span>{completedChecks} de {phase.checklist.length} itens do checklist</span>
                    </div>
                  </div>
                </div>

                {/* Progress Mini Bar & Toggle */}
                <div className="flex items-center gap-4 sm:w-64">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                      <span className="text-slate-900 dark:text-white">{phase.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          phase.status === 'Concluída' ? 'bg-emerald-500' :
                          phase.status === 'Em andamento' ? 'bg-amber-500' :
                          phase.status === 'Atrasada' ? 'bg-rose-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${phase.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details & Quality Checklist */}
              {isExpanded && (
                <div className="p-5 bg-[#f8f9fa] dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
                  
                  {/* Slider Control */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Ajuste Fino de Avanço Físico: {phase.progressPercentage}%
                      </span>
                      <span className="text-xs text-slate-500">Arraste para atualizar</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={phase.progressPercentage}
                      onChange={(e) => handleProgressSliderChange(phase, Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Checklist Section */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-amber-500" />
                        Checklist Técnico de Fiscalização
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {completedChecks}/{phase.checklist.length} Concluídos
                      </span>
                    </div>

                    <div className="space-y-2">
                      {phase.checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklist(phase, item.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                            item.done 
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 text-slate-900 dark:text-white' 
                              : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition ${
                            item.done ? 'bg-emerald-500 text-white' : 'border border-slate-400 dark:border-slate-500'
                          }`}>
                            {item.done && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-xs font-medium flex-1 ${item.done ? 'line-through text-slate-400' : ''}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Add checklist item */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="Adicionar item de verificação técnica..."
                        value={newChecklistText[phase.id] || ''}
                        onChange={(e) => setNewChecklistText({ ...newChecklistText, [phase.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem(phase)}
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddChecklistItem(phase)}
                        className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
                      >
                        + Item
                      </button>
                    </div>
                  </div>

                  {/* Delete Phase button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a etapa "${phase.title}"?`)) {
                          onDeletePhase(phase.id);
                        }
                      }}
                      className="text-xs font-medium text-rose-500 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir Etapa
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Phase Modal */}
      {isNewPhaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nova Etapa da Obra
              </h3>
              <button onClick={() => setIsNewPhaseModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePhase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome da Etapa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Instalação de Esquadrias e Vidros..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Data Início
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Data Fim Prevista
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPhaseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Criar Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
