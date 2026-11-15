import React, { useState, useEffect } from 'react';
import {
  Camera,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  Tag,
  CheckCircle2,
  Sparkles,
  Search,
  Maximize2,
  X,
  FileCheck2,
  ClipboardList
} from 'lucide-react';
import type { Project, ProjectGalleryPhoto, TechnicalDocument, DailyLog } from '../types';
import { loadGalleryPhotos, saveGalleryPhotos } from '../services/storage';
import confetti from 'canvas-confetti';

interface ProjectPhotoGalleryProps {
  project: Project;
  rdos?: DailyLog[];
  technicalDocs?: TechnicalDocument[];
}

const FOLDERS = ['Todas', 'Fachada', 'Estrutura', 'Acabamento', 'Instalações', 'Segurança', 'Geral'] as const;

export const ProjectPhotoGallery: React.FC<ProjectPhotoGalleryProps> = ({
  project,
  rdos = [],
  technicalDocs = [],
}) => {
  const [photos, setPhotos] = useState<ProjectGalleryPhoto[]>(() => loadGalleryPhotos(project.id));
  const [selectedFolder, setSelectedFolder] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State for Adding Photo
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoFolder, setNewPhotoFolder] = useState<ProjectGalleryPhoto['folder']>('Fachada');
  const [linkedType, setLinkedType] = useState<ProjectGalleryPhoto['linkedToType']>('Nenhum');
  const [linkedName, setLinkedName] = useState('');

  // Lightbox Modal State
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<ProjectGalleryPhoto | null>(null);

  useEffect(() => {
    setPhotos(loadGalleryPhotos(project.id));
  }, [project.id]);

  const handleCaptureCamera = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewPhotoUrl(dataUrl);
      if (!newPhotoCaption) {
        setNewPhotoCaption(`Foto Canteiro - ${new Date().toLocaleDateString('pt-BR')}`);
      }
      setIsAddModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;

    const newPhoto: ProjectGalleryPhoto = {
      id: `gal-${Date.now()}`,
      projectId: project.id,
      url: newPhotoUrl.trim(),
      caption: newPhotoCaption.trim() || 'Registro fotográfico da obra',
      folder: newPhotoFolder,
      linkedToType: linkedType,
      linkedToName: linkedType !== 'Nenhum' ? linkedName || (linkedType === 'RDO' ? rdos[0]?.date : technicalDocs[0]?.title) : undefined,
      capturedAt: new Date().toISOString(),
    };

    const updated = [newPhoto, ...photos];
    setPhotos(updated);
    saveGalleryPhotos(project.id, updated);
    confetti({ particleCount: 50, spread: 60 });

    // Reset form
    setNewPhotoUrl('');
    setNewPhotoCaption('');
    setIsAddModalOpen(false);
  };

  const handleDeletePhoto = (id: string) => {
    if (!confirm('Deseja excluir esta foto da galeria?')) return;
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    saveGalleryPhotos(project.id, updated);
    if (activeLightboxPhoto?.id === id) setActiveLightboxPhoto(null);
  };

  const filteredPhotos = photos.filter(p => {
    const matchFolder = selectedFolder === 'Todas' || p.folder === selectedFolder;
    const search = searchTerm.toLowerCase().trim();
    const matchSearch =
      !search ||
      p.caption.toLowerCase().includes(search) ||
      p.folder.toLowerCase().includes(search) ||
      (p.linkedToName && p.linkedToName.toLowerCase().includes(search));
    return matchFolder && matchSearch;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Galeria de Fotos do Projeto
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Captura via câmera, organização por pastas e vínculo automático a RDOs e laudos técnicos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs">
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Tirar Foto (Câmera)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCaptureCamera}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setNewPhotoUrl('');
              setNewPhotoCaption('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Foto / Arquivo</span>
          </button>
        </div>
      </div>

      {/* Folders & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {FOLDERS.map((folder) => {
            const count = folder === 'Todas' ? photos.length : photos.filter(p => p.folder === folder).length;
            return (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedFolder === folder
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{folder}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedFolder === folder ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar fotos ou vínculos..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhuma foto encontrada nesta pasta</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Utilize a câmera do dispositivo ou adicione arquivos para organizar a galeria técnica da obra.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
          >
            Adicionar Primeira Foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-amber-500/50 transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-video bg-slate-950 overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                  onClick={() => setActiveLightboxPhoto(photo)}
                />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950/80 text-amber-400 border border-amber-500/30 backdrop-blur-xs">
                    {photo.folder}
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5">
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Excluir foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                  {photo.caption}
                </h4>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-mono">
                    {new Date(photo.capturedAt).toLocaleDateString('pt-BR')}
                  </span>

                  {photo.linkedToType && photo.linkedToType !== 'Nenhum' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                      {photo.linkedToType === 'RDO' ? <ClipboardList className="w-3 h-3" /> : <FileCheck2 className="w-3 h-3" />}
                      <span className="truncate max-w-[100px]">{photo.linkedToType}: {photo.linkedToName || 'Vinculado'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Sem vínculo</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Photo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Adicionar Foto à Galeria</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Link da Imagem (URL) ou Câmera</label>
                <input
                  type="text"
                  required
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto_obra.jpg ou data:image/..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {newPhotoUrl && (
                <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700">
                  <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Legenda / Descrição da Foto</label>
                <input
                  type="text"
                  required
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="Ex: Conclusão de alvenaria do 2º pavimento"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pasta Organizacional</label>
                  <select
                    value={newPhotoFolder}
                    onChange={(e) => setNewPhotoFolder(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Fachada">Fachada</option>
                    <option value="Estrutura">Estrutura</option>
                    <option value="Acabamento">Acabamento</option>
                    <option value="Instalações">Instalações</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Vincular a Documento / RDO</label>
                  <select
                    value={linkedType}
                    onChange={(e) => setLinkedType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Nenhum">Nenhum vínculo</option>
                    <option value="RDO">Diário de Obra (RDO)</option>
                    <option value="Laudo Técnico">Laudo Técnico</option>
                    <option value="ART">ART / RRT</option>
                  </select>
                </div>
              </div>

              {linkedType !== 'Nenhum' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nome / Referência do Documento Vinculado</label>
                  <input
                    type="text"
                    value={linkedName}
                    onChange={(e) => setLinkedName(e.target.value)}
                    placeholder={linkedType === 'RDO' ? 'Ex: RDO 15/11/2026' : 'Ex: Laudo Estrutural Nº 042'}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl cursor-pointer shadow-xs"
                >
                  Salvar Foto na Galeria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setActiveLightboxPhoto(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full max-h-[75vh] flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/10">
              <img src={activeLightboxPhoto.url} alt={activeLightboxPhoto.caption} className="max-w-full max-h-[75vh] object-contain" />
            </div>

            <div className="mt-4 text-center text-white space-y-1">
              <h3 className="text-base font-bold">{activeLightboxPhoto.caption}</h3>
              <p className="text-xs text-slate-400">
                Pasta: <strong className="text-amber-400">{activeLightboxPhoto.folder}</strong> · Data: {new Date(activeLightboxPhoto.capturedAt).toLocaleDateString('pt-BR')}
                {activeLightboxPhoto.linkedToType && activeLightboxPhoto.linkedToType !== 'Nenhum' ? ` · Vinculado a ${activeLightboxPhoto.linkedToType}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
