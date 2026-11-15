import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Users,
  Printer,
  Trash2,
  CheckSquare,
  Square,
  FileCheck2,
  Building2,
  Sparkles,
  Search
} from 'lucide-react';
import type { Project, WorkPermit, DdsRecord, WorkPermitChecklistItem } from '../types';
import { loadWorkPermits, saveWorkPermits, loadDdsRecords, saveDdsRecords } from '../services/storage';

interface SafetyWorkPermitAndDdsViewProps {
  project: Project;
}

const DEFAULT_RISK_CHECKLIST: WorkPermitChecklistItem[] = [
  { id: 'c1', label: 'Inspeção prévia dos equipamentos e ferramentas realizada', checked: true },
  { id: 'c2', label: 'Uso obrigatório de EPIs específicos (cinto paraquedista, óculos, luvas)', checked: true },
  { id: 'c3', label: 'Isolamento e sinalização da área de risco executados', checked: true },
  { id: 'c4', label: 'Presença de extintor de incêndio ou ponto de água adequado', checked: false },
  { id: 'c5', label: 'Linhada de vida e pontos de ancoragem certificados (para trabalho em altura)', checked: false },
  { id: 'c6', label: 'Desenergização e bloqueio de circuitos elétricos (Lockout/Tagout)', checked: false },
  { id: 'c7', label: 'Equipe orientada sobre os riscos e procedimentos de emergência', checked: true },
];

const DEFAULT_PPES = [
  'Capacete de segurança com jugular',
  'Óculos de proteção contra impactos / UV',
  'Protetor auricular tipo concha ou inserção',
  'Cinto de segurança tipo paraquedista com duplo talabarte',
  'Botas de segurança com biqueira de aço',
  'Luvas de raspa / vaqueta / nitrílica',
  'Máscara PFF2 para poeira / fumos metálicos',
  'Colete refletivo de alta visibilidade'
];

export const SafetyWorkPermitAndDdsView: React.FC<SafetyWorkPermitAndDdsViewProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<'pt' | 'dds'>('pt');
  
  // Work Permits (PT) State
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>(() => loadWorkPermits(project.id));
  const [isCreatingPt, setIsCreatingPt] = useState(false);
  const [selectedPt, setSelectedPt] = useState<WorkPermit | null>(null);

  // New PT Form State
  const [ptWorkType, setPtWorkType] = useState<WorkPermit['workType']>('Trabalho em Altura (NR-35)');
  const [ptLocation, setPtLocation] = useState(project.address || 'Canteiro Principal');
  const [ptDate, setPtDate] = useState(new Date().toISOString().split('T')[0]);
  const [ptShift, setPtShift] = useState<WorkPermit['shift']>('Manhã');
  const [ptSupervisor, setPtSupervisor] = useState('Eng. Responsável / Mestre');
  const [ptSafetyTech, setPtSafetyTech] = useState('Técnico de Segurança do Trabalho');
  const [ptChecklist, setPtChecklist] = useState<WorkPermitChecklistItem[]>(DEFAULT_RISK_CHECKLIST);
  const [ptSelectedPpes, setPtSelectedPpes] = useState<string[]>(DEFAULT_PPES.slice(0, 5));
  const [ptWorkersInput, setPtWorkersInput] = useState('João da Silva (Montador)\nCarlos Eduardo (Eletricista)\nMarcos Vinicius (Auxiliar)');
  const [ptNotes, setPtNotes] = useState('Executar liberação rigorosa conforme procedimentos de segurança da obra.');

  // DDS State
  const [ddsRecords, setDdsRecords] = useState<DdsRecord[]>(() => loadDdsRecords(project.id));
  const [isCreatingDds, setIsCreatingDds] = useState(false);
  const [selectedDds, setSelectedDds] = useState<DdsRecord | null>(null);

  // New DDS Form State
  const [ddsTopic, setDdsTopic] = useState('Uso Correto de EPIs e Prevenção de Quedas');
  const [ddsDate, setDdsDate] = useState(new Date().toISOString().split('T')[0]);
  const [ddsSpeaker, setDdsSpeaker] = useState('Técnico de Segurança / Mestre de Obras');
  const [ddsLocation, setDdsLocation] = useState(project.address || 'Área de Vivência / Canteiro');
  const [ddsSummary, setDdsSummary] = useState('Reforçado com a equipe a importância da verificação diária do cinto de segurança e linha de vida, bem como a proibição de improviso em andaimes.');
  const [ddsAttendeesInput, setDdsAttendeesInput] = useState('João da Silva - Montador (Presente)\nCarlos Eduardo - Eletricista (Presente)\nMarcos Vinicius - Auxiliar (Presente)\nRoberto Souza - Pedreiro (Presente)');

  const [searchQuery, setSearchQuery] = useState('');

  // Handle Create Work Permit
  const handleSaveWorkPermit = (e: React.FormEvent) => {
    e.preventDefault();
    const workersList = ptWorkersInput.split('\n').map(w => w.trim()).filter(Boolean);
    const newPt: WorkPermit = {
      id: `pt-${Date.now()}`,
      projectId: project.id,
      permitNumber: `PT-${new Date().getFullYear()}-${String(workPermits.length + 1).padStart(3, '0')}`,
      workType: ptWorkType,
      location: ptLocation,
      date: ptDate,
      shift: ptShift,
      supervisorName: ptSupervisor,
      safetyTechnician: ptSafetyTech,
      riskChecklist: ptChecklist,
      ppeRequired: ptSelectedPpes,
      workersList,
      status: 'Liberada / Ativa',
      notes: ptNotes,
      createdAt: new Date().toISOString(),
    };

    const updated = [newPt, ...workPermits];
    setWorkPermits(updated);
    saveWorkPermits(project.id, updated);
    setIsCreatingPt(false);
    setSelectedPt(newPt);
  };

  // Handle Create DDS
  const handleSaveDds = (e: React.FormEvent) => {
    e.preventDefault();
    const attendeeLines = ddsAttendeesInput.split('\n').map(l => l.trim()).filter(Boolean);
    const attendees = attendeeLines.map(line => {
      const parts = line.split('-');
      return {
        name: parts[0]?.trim() || line,
        role: parts[1]?.trim() || 'Colaborador',
        signature: true,
      };
    });

    const newDds: DdsRecord = {
      id: `dds-${Date.now()}`,
      projectId: project.id,
      ddsNumber: `DDS-${new Date().getFullYear()}-${String(ddsRecords.length + 1).padStart(3, '0')}`,
      date: ddsDate,
      topic: ddsTopic,
      speakerName: ddsSpeaker,
      location: ddsLocation,
      summary: ddsSummary,
      attendees,
      createdAt: new Date().toISOString(),
    };

    const updated = [newDds, ...ddsRecords];
    setDdsRecords(updated);
    saveDdsRecords(project.id, updated);
    setIsCreatingDds(false);
    setSelectedDds(newDds);
  };

  const handleDeletePt = (id: string) => {
    if (!confirm('Deseja excluir esta Permissão de Trabalho?')) return;
    const updated = workPermits.filter(p => p.id !== id);
    setWorkPermits(updated);
    saveWorkPermits(project.id, updated);
    if (selectedPt?.id === id) setSelectedPt(null);
  };

  const handleDeleteDds = (id: string) => {
    if (!confirm('Deseja excluir esta Ficha de DDS?')) return;
    const updated = ddsRecords.filter(d => d.id !== id);
    setDdsRecords(updated);
    saveDdsRecords(project.id, updated);
    if (selectedDds?.id === id) setSelectedDds(null);
  };

  const filteredPts = workPermits.filter(p => 
    p.permitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.workType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDds = ddsRecords.filter(d =>
    d.ddsNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.speakerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
                Segurança do Trabalho (NR-10, NR-18, NR-33, NR-35)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Permissão de Trabalho (PT) & Ficha de D.D.S.
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Gerencie liberações de serviços críticos no canteiro de obras e registre os Diálogos Diários de Segurança com lista de presença dos colaboradores.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pt');
                setIsCreatingPt(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Permissão de Trabalho (PT)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('dds');
                setIsCreatingDds(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Ficha de D.D.S.
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pt')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'pt'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Permissões de Trabalho ({workPermits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dds')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'dds'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Diálogo Diário de Segurança - DDS ({ddsRecords.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'pt' ? 'Buscar PT por número ou tipo...' : 'Buscar DDS por tópico ou número...'}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'pt' ? (
        <div className="space-y-6">
          {/* PT List & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: List of PTs */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Permissões Emitidas ({filteredPts.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingPt(true)}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  + Nova PT
                </button>
              </div>

              {filteredPts.length > 0 ? (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredPts.map((pt) => {
                    const isSelected = selectedPt?.id === pt.id;
                    return (
                      <div
                        key={pt.id}
                        onClick={() => setSelectedPt(pt)}
                        className={`p-4 rounded-2xl border transition cursor-pointer text-left ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400">
                            {pt.permitNumber}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            pt.status === 'Liberada / Ativa'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : pt.status === 'Suspensa'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {pt.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                          {pt.workType}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          Local: {pt.location}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span>{pt.date} ({pt.shift})</span>
                          <span>{pt.workersList.length} executantes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                  <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma Permissão de Trabalho</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Clique no botão acima para emitir uma PT para trabalhos críticos.</p>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPt(true)}
                    className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Emitir Primeira PT
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: PT Details / Preview */}
            <div className="lg:col-span-2">
              {selectedPt ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg">
                          {selectedPt.permitNumber}
                        </span>
                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                          {selectedPt.status}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedPt.workType}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir / PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePt(selectedPt.id)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                        title="Excluir PT"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                      <span className="text-slate-400 block mb-1">Data de Emissão</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedPt.date}</strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                      <span className="text-slate-400 block mb-1">Turno</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedPt.shift}</strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                      <span className="text-slate-400 block mb-1">Local da Obra</span>
                      <strong className="text-slate-800 dark:text-slate-200 truncate block" title={selectedPt.location}>{selectedPt.location}</strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                      <span className="text-slate-400 block mb-1">Técnico Resp.</span>
                      <strong className="text-slate-800 dark:text-slate-200 truncate block" title={selectedPt.safetyTechnician}>{selectedPt.safetyTechnician}</strong>
                    </div>
                  </div>

                  {/* Checklist & PPE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Checklist de Verificação de Riscos
                      </h4>
                      <div className="space-y-2">
                        {selectedPt.riskChecklist.map((item) => (
                          <div key={item.id} className="flex items-start gap-2.5 text-xs">
                            {item.checked ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <span className={item.checked ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400 line-through'}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        EPIs e EPCs Obrigatórios
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPt.ppeRequired.map((ppe, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-xl">
                            ✓ {ppe}
                          </span>
                        ))}
                      </div>

                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-6 mb-2">
                        Colaboradores Autorizados ({selectedPt.workersList.length})
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {selectedPt.workersList.map((worker, idx) => (
                          <li key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-lg">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{worker}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {selectedPt.notes && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 rounded-2xl text-xs text-amber-900 dark:text-amber-200">
                      <strong>Observações do Supervisor:</strong> {selectedPt.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Selecione uma Permissão de Trabalho na lista ao lado</p>
                  <p className="text-xs mt-1">Ou clique em Nova Permissão de Trabalho para emitir uma PT.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* DDS List & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: List of DDS */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Fichas de DDS Realizadas ({filteredDds.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingDds(true)}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  + Novo DDS
                </button>
              </div>

              {filteredDds.length > 0 ? (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredDds.map((dds) => {
                    const isSelected = selectedDds?.id === dds.id;
                    return (
                      <div
                        key={dds.id}
                        onClick={() => setSelectedDds(dds)}
                        className={`p-4 rounded-2xl border transition cursor-pointer text-left ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400">
                            {dds.ddsNumber}
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                            Realizado
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-1">
                          {dds.topic}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ministrante: {dds.speakerName}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span>{dds.date}</span>
                          <span>{dds.attendees.length} presentes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                  <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum DDS Registrado</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Registre o diálogo diário de segurança e lista de presença da equipe.</p>
                  <button
                    type="button"
                    onClick={() => setIsCreatingDds(true)}
                    className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Registrar Primeiro DDS
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: DDS Details / Preview */}
            <div className="lg:col-span-2">
              {selectedDds ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg">
                          {selectedDds.ddsNumber}
                        </span>
                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                          Diálogo Realizado
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedDds.topic}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir / Ata PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDds(selectedDds.id)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                        title="Excluir DDS"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
                      <span className="text-slate-400 block mb-1">Data do Diálogo</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedDds.date}</strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
                      <span className="text-slate-400 block mb-1">Ministrante / Instrutor</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedDds.speakerName}</strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
                      <span className="text-slate-400 block mb-1">Local</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedDds.location}</strong>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Resumo dos Tópicos Discutidos
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      {selectedDds.summary}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Lista de Presença dos Colaboradores ({selectedDds.attendees.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedDds.attendees.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                              {idx + 1}
                            </div>
                            <div>
                              <strong className="text-slate-900 dark:text-white block">{att.name}</strong>
                              <span className="text-[11px] text-slate-400">{att.role}</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-md">
                            Presente ✓
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Selecione uma Ficha de DDS na lista ao lado</p>
                  <p className="text-xs mt-1">Ou clique em Novo DDS para registrar o diálogo diário de segurança.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Work Permit (PT) */}
      {isCreatingPt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Segurança NR-10 / NR-18 / NR-35</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Emitir Permissão de Trabalho (PT)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingPt(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkPermit} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Trabalho Crítico</label>
                  <select
                    value={ptWorkType}
                    onChange={(e) => setPtWorkType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="Trabalho em Altura (NR-35)">Trabalho em Altura (NR-35)</option>
                    <option value="Trabalho a Quente (Solda/Corte - NR-18)">Trabalho a Quente (Solda/Corte - NR-18)</option>
                    <option value="Espaço Confinado (NR-33)">Espaço Confinado (NR-33)</option>
                    <option value="Serviços Elétricos (NR-10)">Serviços Elétricos (NR-10)</option>
                    <option value="Içamento de Cargas">Içamento de Cargas</option>
                    <option value="Escavação / Movimentação de Terra">Escavação / Movimentação de Terra</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Local Específico na Obra</label>
                  <input
                    type="text"
                    value={ptLocation}
                    onChange={(e) => setPtLocation(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={ptDate}
                    onChange={(e) => setPtDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Turno</label>
                  <select
                    value={ptShift}
                    onChange={(e) => setPtShift(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Integral (24h)">Integral (24h)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Técnico de Segurança</label>
                  <input
                    type="text"
                    value={ptSafetyTech}
                    onChange={(e) => setPtSafetyTech(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Checklist de Riscos e Precauções</label>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {ptChecklist.map((chk, idx) => (
                    <label key={chk.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chk.checked}
                        onChange={(e) => {
                          const updated = [...ptChecklist];
                          updated[idx].checked = e.target.checked;
                          setPtChecklist(updated);
                        }}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span className="text-slate-700 dark:text-slate-300">{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Colaboradores Executantes (um nome por linha)
                </label>
                <textarea
                  rows={3}
                  value={ptWorkersInput}
                  onChange={(e) => setPtWorkersInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                  placeholder="Nome do Colaborador (Função)"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Observações ou Condições Especiais</label>
                <input
                  type="text"
                  value={ptNotes}
                  onChange={(e) => setPtNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingPt(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold cursor-pointer"
                >
                  Emitir e Liberar PT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create DDS */}
      {isCreatingDds && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Segurança Diária (Toolbox Talk)</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registrar Ficha de D.D.S.</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingDds(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDds} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tópico / Assunto Principal do DDS</label>
                  <input
                    type="text"
                    value={ddsTopic}
                    onChange={(e) => setDdsTopic(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Ministrante / Responsável</label>
                  <input
                    type="text"
                    value={ddsSpeaker}
                    onChange={(e) => setDdsSpeaker(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={ddsDate}
                    onChange={(e) => setDdsDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Local do Diálogo</label>
                  <input
                    type="text"
                    value={ddsLocation}
                    onChange={(e) => setDdsLocation(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Resumo dos Pontos Discutidos</label>
                <textarea
                  rows={3}
                  value={ddsSummary}
                  onChange={(e) => setDdsSummary(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lista de Participantes Presentes (Nome - Cargo por linha)
                </label>
                <textarea
                  rows={4}
                  value={ddsAttendeesInput}
                  onChange={(e) => setDdsAttendeesInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                  placeholder="Nome do Colaborador - Cargo (Presente)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingDds(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold cursor-pointer"
                >
                  Salvar Ficha de DDS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
