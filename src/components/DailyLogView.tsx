import React, { useState } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Calendar, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Users, 
  Camera, 
  Trash2, 
  Sparkles, 
  Bot, 
  FolderSync, 
  FileText, 
  Printer, 
  Check, 
  AlertTriangle,
  Image as ImageIcon,
  X
} from 'lucide-react';
import type { DailyLog, WeatherType, LaborCount, PhotoAttachment, Project } from '../types';
import { uploadTextFile, getOrCreateProjectFolder } from '../services/googleDrive';
import confetti from 'canvas-confetti';

interface DailyLogViewProps {
  project: Project;
  rdos: DailyLog[];
  onSaveRdo: (rdo: DailyLog) => void;
  onDeleteRdo: (rdoId: string) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

const DEFAULT_LABOR_ROLES = [
  'Mestre de Obras / Encarregado',
  'Pedreiro Alvenaria',
  'Pedreiro Azulejista',
  'Ajudante Geral / Servente',
  'Eletricista',
  'Encanador / Bombeiro Hidráulico',
  'Pintor',
  'Gesseiro / Drywall',
];

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  project,
  rdos,
  onSaveRdo,
  onDeleteRdo,
  isAuthenticated,
  onRequireAuth,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRdoId, setEditingRdoId] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState<WeatherType>('Ensolarado');
  const [labor, setLabor] = useState<LaborCount[]>([
    { role: 'Mestre de Obras / Encarregado', count: 1 },
    { role: 'Pedreiro Azulejista', count: 2 },
    { role: 'Ajudante Geral / Servente', count: 2 },
  ]);
  const [customRole, setCustomRole] = useState('');
  const [servicesExecuted, setServicesExecuted] = useState('');
  const [occurrences, setOccurrences] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<PhotoAttachment | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setWeather('Ensolarado');
    setLabor([
      { role: 'Mestre de Obras / Encarregado', count: 1 },
      { role: 'Pedreiro Azulejista', count: 2 },
      { role: 'Ajudante Geral / Servente', count: 2 },
    ]);
    setServicesExecuted('');
    setOccurrences('');
    setNotes('');
    setPhotos([]);
    setAiSummary('');
    setIsCreating(false);
    setEditingRdoId(null);
  };

  const handleStartEdit = (rdo: DailyLog) => {
    setEditingRdoId(rdo.id);
    setDate(rdo.date);
    setWeather(rdo.weather);
    setLabor(rdo.labor || []);
    setServicesExecuted(rdo.servicesExecuted);
    setOccurrences(rdo.occurrences || '');
    setNotes(rdo.notes || '');
    setPhotos(rdo.photos || []);
    setAiSummary(rdo.aiSummary || '');
    setIsCreating(true);
  };

  const handleLaborCountChange = (role: string, delta: number) => {
    setLabor(prev => {
      const existing = prev.find(l => l.role === role);
      if (existing) {
        const newCount = Math.max(0, existing.count + delta);
        if (newCount === 0) {
          return prev.filter(l => l.role !== role);
        }
        return prev.map(l => l.role === role ? { ...l, count: newCount } : l);
      } else if (delta > 0) {
        return [...prev, { role, count: delta }];
      }
      return prev;
    });
  };

  const handleAddCustomRole = () => {
    if (!customRole.trim()) return;
    if (!labor.some(l => l.role.toLowerCase() === customRole.trim().toLowerCase())) {
      setLabor(prev => [...prev, { role: customRole.trim(), count: 1 }]);
    }
    setCustomRole('');
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    const photo: PhotoAttachment = {
      id: `photo-${Date.now()}`,
      url: newPhotoUrl.trim(),
      name: `Foto_${date}_${photos.length + 1}.jpg`,
      caption: newPhotoCaption.trim() || 'Registro fotográfico da obra',
      uploadedAt: new Date().toISOString(),
    };
    setPhotos(prev => [...prev, photo]);
    setNewPhotoUrl('');
    setNewPhotoCaption('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const photo: PhotoAttachment = {
        id: `photo-${Date.now()}`,
        url: reader.result as string,
        name: file.name,
        caption: file.name.replace(/\.[^/.]+$/, ''),
        uploadedAt: new Date().toISOString(),
      };
      setPhotos(prev => [...prev, photo]);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiSummary = async () => {
    if (!servicesExecuted.trim()) {
      alert('Preencha os serviços executados antes de solicitar a análise da IA.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/ai/analyze-rdo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.title,
          rdoData: {
            date,
            weather,
            labor,
            services: servicesExecuted,
            occurrences,
            notes,
          },
        }),
      });

      if (!response.ok) throw new Error('Erro ao conectar com a IA');
      const data = await response.json();
      setAiSummary(data.summary);
      confetti({ particleCount: 40, spread: 50 });
    } catch (err: any) {
      alert(`Falha ao gerar resumo IA: ${err.message}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveToGoogleDrive = async (rdoToSave: DailyLog) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setIsSavingToDrive(true);
    try {
      const folderId = await getOrCreateProjectFolder(project.title);
      const markdown = `# DIÁRIO DE OBRA (RDO) #${rdoToSave.date}
**Projeto:** ${project.title}
**Data:** ${rdoToSave.date}
**Condições Climáticas:** ${rdoToSave.weather}
**Cliente:** ${project.clientName || 'N/A'}

---
### 👷 EFETIVO DE MÃO DE OBRA
${rdoToSave.labor.map(l => `- **${l.count}x** ${l.role}`).join('\n') || 'Nenhum profissional registrado'}
**Total de Efetivo:** ${rdoToSave.labor.reduce((acc, curr) => acc + curr.count, 0)} trabalhadores

---
### 🔨 SERVIÇOS EXECUTADOS
${rdoToSave.servicesExecuted}

---
### ⚠️ OCORRÊNCIAS & INTERCORRÊNCIAS
${rdoToSave.occurrences || 'Nenhuma ocorrência registrada'}

---
### 📝 OBSERVAÇÕES TÉCNICAS
${rdoToSave.notes || 'Sem observações adicionais'}

${rdoToSave.aiSummary ? `---
### 🤖 PARECER TÉCNICO MESTRE IA
${rdoToSave.aiSummary}
` : ''}

---
*Gerado pelo aplicativo Mãos em Obra em ${new Date().toLocaleString('pt-BR')}*
`;

      const fileName = `RDO_${rdoToSave.date}_${project.title.replace(/\s+/g, '_')}.md`;
      await uploadTextFile(fileName, markdown, folderId, 'text/markdown');
      
      confetti({ particleCount: 50, spread: 60 });
      alert(`RDO de ${rdoToSave.date} salvo com sucesso no Google Drive!`);
    } catch (err: any) {
      alert(`Erro ao salvar no Drive: ${err.message || err}`);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicesExecuted.trim()) return;

    const newRdo: DailyLog = {
      id: editingRdoId || `rdo-${Date.now()}`,
      projectId: project.id,
      date,
      weather,
      labor,
      servicesExecuted: servicesExecuted.trim(),
      occurrences: occurrences.trim(),
      notes: notes.trim(),
      photos,
      aiSummary,
      createdAt: new Date().toISOString(),
    };

    onSaveRdo(newRdo);
    resetForm();
  };

  const getWeatherIcon = (w: WeatherType) => {
    switch (w) {
      case 'Ensolarado': return <Sun className="w-4 h-4 text-amber-500" />;
      case 'Parcialmente Nublado': return <Cloud className="w-4 h-4 text-blue-400" />;
      case 'Nublado': return <Cloud className="w-4 h-4 text-slate-400" />;
      case 'Chuvoso': return <CloudRain className="w-4 h-4 text-sky-500" />;
      case 'Tempestade': return <CloudLightning className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            Diário de Obra (RDO)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro diário de serviços, efetivo de trabalhadores, clima, ocorrências e fotos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Novo Registro de Hoje
            </button>
          )}
        </div>
      </div>

      {/* Creation / Edit Form */}
      {isCreating && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              {editingRdoId ? 'Editar Diário de Obra' : 'Novo Diário de Obra (RDO)'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Date & Weather Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data do Registro
                </span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#f8f9fa] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Condições do Tempo / Clima
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(['Ensolarado', 'Parcialmente Nublado', 'Nublado', 'Chuvoso', 'Tempestade'] as WeatherType[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeather(w)}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-[11px] font-semibold transition ${
                      weather === w
                        ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {getWeatherIcon(w)}
                    <span className="mt-1 truncate max-w-full">{w.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Labor Force / Efetivo Section */}
          <div className="bg-[#f8f9fa] dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                Efetivo no Canteiro Hoje ({labor.reduce((acc, curr) => acc + curr.count, 0)} trabalhadores)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {DEFAULT_LABOR_ROLES.map((role) => {
                const current = labor.find(l => l.role === role)?.count || 0;
                return (
                  <div key={role} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate mr-2">
                      {role}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLaborCountChange(role, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-slate-900 dark:text-white">
                        {current}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLaborCountChange(role, 1)}
                        className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Custom Role */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <input
                type="text"
                placeholder="Adicionar outra função (ex: Topógrafo, Marceneiro)..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddCustomRole}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Services Executed */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Serviços Executados no Dia *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Descreva em detalhes as frentes de trabalho atacadas (ex: Concluída a impermeabilização do banheiro social; assentados 25m² de piso porcelanato na sala; passagem de fiação no circuito 3)..."
              value={servicesExecuted}
              onChange={(e) => setServicesExecuted(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          {/* Occurrences & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> Ocorrências, Atrasos ou Imprevistos
                </span>
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Falta de água pela manhã por 2h; atraso na entrega da argamassa; chuva forte paralisou fachada..."
                value={occurrences}
                onChange={(e) => setOccurrences(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Observações Técnicas / Fiscalização
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Medições conferidas com trena laser; solicitada proteção do piso com papelão ondulado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Photos Section */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-500" />
                Registros Fotográficos da Obra ({photos.length})
              </label>
            </div>

            {/* Photo thumbnails */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {photos.map((photo, idx) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-900">
                    <img 
                      src={photo.url} 
                      alt={photo.caption} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200 cursor-pointer"
                      onClick={() => setActivePhotoModal(photo)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-90 p-2 flex flex-col justify-between">
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter(p => p.id !== photo.id))}
                        className="self-end p-1 bg-rose-600/90 text-white rounded-md hover:bg-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-white font-medium truncate">
                        {photo.caption}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Photo Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Link da imagem (URL) ou use o upload..."
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Legenda da foto..."
                value={newPhotoCaption}
                onChange={(e) => setNewPhotoCaption(e.target.value)}
                className="sm:w-48 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-900 dark:text-white rounded-xl text-xs font-bold"
              >
                + Foto
              </button>
              <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                <Camera className="w-3.5 h-3.5" />
                Upload Arquivo
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* AI Parecer Técnico Box */}
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Parecer Técnico Inteligente (Mestre IA)
              </span>
              <button
                type="button"
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-lg text-xs font-bold transition"
              >
                <Bot className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                {isGeneratingAi ? 'Analisando...' : 'Gerar Parecer com IA'}
              </button>
            </div>

            {aiSummary ? (
              <textarea
                rows={3}
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                className="w-full mt-2 p-3 text-xs bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-slate-900 dark:text-white leading-relaxed"
              />
            ) : (
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
                Clique em "Gerar Parecer com IA" para obter um resumo executivo para o cliente e alertas preventivos automáticos.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl transition shadow-xs"
            >
              {editingRdoId ? 'Atualizar Diário' : 'Salvar Diário de Obra'}
            </button>
          </div>
        </form>
      )}

      {/* RDOs List View */}
      <div className="space-y-4">
        {rdos.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhum RDO lançado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Comece criando o primeiro relatório diário de obra para documentar os serviços, mão de obra e fotos.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              + Criar Primeiro RDO
            </button>
          </div>
        ) : (
          rdos.map((rdo, index) => (
            <div 
              key={rdo.id} 
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-400/80 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-xs">
                    RDO #{rdos.length - index}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Data: {rdo.date}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        {getWeatherIcon(rdo.weather)} {rdo.weather}
                      </span>
                      <span>•</span>
                      <span>{rdo.labor.reduce((acc, curr) => acc + curr.count, 0)} trabalhadores</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleSaveToGoogleDrive(rdo)}
                    disabled={isSavingToDrive}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 rounded-xl transition"
                    title="Salvar no Google Drive"
                  >
                    <FolderSync className="w-3.5 h-3.5" />
                    Salvar no Drive
                  </button>

                  <button
                    onClick={() => handleStartEdit(rdo)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Excluir o RDO do dia ${rdo.date}?`)) {
                        onDeleteRdo(rdo.id);
                      }
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                    title="Excluir RDO"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Labor breakdown */}
              {rdo.labor.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {rdo.labor.map(l => (
                    <span key={l.role} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Users className="w-3 h-3 text-amber-500" />
                      <strong>{l.count}x</strong> {l.role}
                    </span>
                  ))}
                </div>
              )}

              {/* Services Executed */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Serviços Executados
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {rdo.servicesExecuted}
                </p>
              </div>

              {/* Occurrences & Notes */}
              {(rdo.occurrences || rdo.notes) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {rdo.occurrences && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-rose-900 dark:text-rose-200">
                      <span className="font-bold block mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Ocorrências:
                      </span>
                      {rdo.occurrences}
                    </div>
                  )}
                  {rdo.notes && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-slate-700 dark:text-slate-300">
                      <span className="font-bold block mb-0.5">Observações:</span>
                      {rdo.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Photos Gallery */}
              {rdo.photos && rdo.photos.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Fotos do Dia ({rdo.photos.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {rdo.photos.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setActivePhotoModal(p)}
                        className="group relative rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        <img src={p.url} alt={p.caption} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex items-end">
                          <span className="text-[10px] text-white font-medium truncate">{p.caption}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary Card */}
              {rdo.aiSummary && (
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Bot className="w-4 h-4 text-amber-600" />
                    Parecer Técnico do Mestre IA:
                  </div>
                  <p className="leading-relaxed">{rdo.aiSummary}</p>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* Photo Full Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden p-4">
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activePhotoModal.url} alt={activePhotoModal.caption} className="w-full max-h-[70vh] object-contain rounded-xl" />
            <div className="mt-3 text-center">
              <h4 className="text-sm font-bold text-white">{activePhotoModal.caption}</h4>
              <p className="text-xs text-slate-400">{activePhotoModal.name}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
