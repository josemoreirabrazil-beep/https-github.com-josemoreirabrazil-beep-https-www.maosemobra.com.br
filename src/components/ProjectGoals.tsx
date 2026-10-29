import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react';
import type { ProjectGoal, GoalType } from '../types';

interface ProjectGoalsProps {
  projectId: string;
  goals: ProjectGoal[];
  onSaveGoal: (goal: ProjectGoal) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const ProjectGoals: React.FC<ProjectGoalsProps> = ({
  projectId,
  goals,
  onSaveGoal,
  onDeleteGoal
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<GoalType>('Conclusão Física');
  const [targetValue, setTargetValue] = useState<number>(0);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [unit, setUnit] = useState('%');
  const [deadline, setDeadline] = useState('');

  const resetForm = () => {
    setTitle('');
    setType('Conclusão Física');
    setTargetValue(0);
    setCurrentValue(0);
    setUnit('%');
    setDeadline('');
    setEditingGoalId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (goal: ProjectGoal) => {
    setTitle(goal.title);
    setType(goal.type);
    setTargetValue(goal.targetValue);
    setCurrentValue(goal.currentValue);
    setUnit(goal.unit);
    setDeadline(goal.deadline || '');
    setEditingGoalId(goal.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: ProjectGoal = {
      id: editingGoalId || `goal-${Date.now()}`,
      projectId,
      title,
      type,
      targetValue,
      currentValue,
      unit,
      month: new Date().toISOString().substring(0, 7),
      deadline: deadline || undefined,
      createdAt: new Date().toISOString(),
    };
    onSaveGoal(newGoal);
    resetForm();
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-500';
    if (percent >= 75) return 'bg-blue-500';
    if (percent >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Metas de Obra</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Acompanhamento mensal de objetivos críticos</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.length > 0 ? (
          goals.map(goal => {
            const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
            const isCompleted = percent >= 100;

            return (
              <div 
                key={goal.id}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        goal.type === 'Economia de Orçamento' ? 'bg-emerald-500/10 text-emerald-500' :
                        goal.type === 'Conclusão Física' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {goal.type}
                      </span>
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{goal.title}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEdit(goal)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {goal.currentValue} {goal.unit} <span className="text-slate-400 font-bold">de {goal.targetValue} {goal.unit}</span>
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">{percent}%</div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percent)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Prazo: {goal.deadline ? new Date(goal.deadline).toLocaleDateString('pt-BR') : 'Mensal'}
                  </div>
                  <div className="flex items-center gap-1">
                    {percent > 50 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
                    {percent}% Ativado
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="md:col-span-2 py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <Target className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-500">Nenhuma meta definida para este mês</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-black text-amber-500 hover:underline"
              >
                Definir minha primeira meta
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingGoalId ? 'Editar Meta' : 'Nova Meta de Obra'}
              </h3>
              <button onClick={resetForm} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <AlertCircle className="w-5 h-5 text-slate-400 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título da Meta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reboco do Térreo, Economia de Material..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as GoalType)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold cursor-pointer"
                  >
                    <option value="Conclusão Física">Conclusão Física</option>
                    <option value="Economia de Orçamento">Economia de Orçamento</option>
                    <option value="Qualidade/RDOs">Qualidade/RDOs</option>
                    <option value="Segurança/Zero Acidentes">Segurança</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: %, R$, m2..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Alvo</label>
                  <input
                    type="number"
                    required
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Atual</label>
                  <input
                    type="number"
                    required
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prazo Final (Opcional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                >
                  {editingGoalId ? 'Atualizar Meta' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
