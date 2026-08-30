import React, { useState, useEffect } from 'react';
import { X, Building2, Calendar, DollarSign, User, MapPin, FileText } from 'lucide-react';
import type { Project, ProjectType, ProjectStatus } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: Partial<Project>) => void;
  initialData?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<ProjectType>('Reforma');
  const [budgetTotal, setBudgetTotal] = useState<number>(50000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedEndDate, setEstimatedEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Em Andamento');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setClientName(initialData.clientName || '');
      setAddress(initialData.address || '');
      setType(initialData.type || 'Reforma');
      setBudgetTotal(initialData.budgetTotal || 0);
      setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
      setEstimatedEndDate(initialData.estimatedEndDate || '');
      setStatus(initialData.status || 'Em Andamento');
      setNotes(initialData.notes || '');
    } else {
      setTitle('');
      setClientName('');
      setAddress('');
      setType('Reforma');
      setBudgetTotal(50000);
      setStartDate(new Date().toISOString().split('T')[0]);
      const future = new Date();
      future.setMonth(future.getMonth() + 3);
      setEstimatedEndDate(future.toISOString().split('T')[0]);
      setStatus('Em Andamento');
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: initialData?.id || `proj-${Date.now()}`,
      title: title.trim(),
      clientName: clientName.trim(),
      address: address.trim(),
      type,
      budgetTotal: Number(budgetTotal) || 0,
      startDate,
      estimatedEndDate,
      status,
      notes: notes.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialData ? 'Editar Obra / Projeto' : 'Nova Obra / Projeto'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre informações de escopo, orçamento e cronograma
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
              Título da Obra *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Reforma Apartamento 402, Construção Casa Vila Madalena..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500" /> Cliente / Proprietário
                </span>
              </label>
              <input
                type="text"
                placeholder="Ex: Mariana Silveira"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Projeto
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              >
                <option value="Reforma">Reforma</option>
                <option value="Construção Nova">Construção Nova</option>
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" /> Endereço / Localização
              </span>
            </label>
            <input
              type="text"
              placeholder="Ex: Alameda Santos, 1420 - Jardins, São Paulo"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Orçamento Previsto (R$)
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" /> Início
                </span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" /> Previsão Término
                </span>
              </label>
              <input
                type="date"
                value={estimatedEndDate}
                onChange={(e) => setEstimatedEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status da Obra
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              >
                <option value="Planejamento">Planejamento</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Pausada">Pausada</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Observações Gerais
                </span>
              </label>
              <input
                type="text"
                placeholder="Ex: Alvenaria convencional, acabamento alto padrão..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl transition shadow-xs"
            >
              {initialData ? 'Salvar Alterações' : 'Criar Obra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
