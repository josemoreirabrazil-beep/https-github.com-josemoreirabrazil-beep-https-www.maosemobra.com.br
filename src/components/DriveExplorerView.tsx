import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  FolderSync, 
  Upload, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileCode, 
  File, 
  Trash2, 
  RefreshCw, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive,
  FolderOpen
} from 'lucide-react';
import type { Project, DailyLog, Expense, Phase } from '../types';
import { 
  getOrCreateProjectFolder, 
  listFiles, 
  uploadFile, 
  deleteFile, 
  exportProjectToDrive,
  type DriveFile 
} from '../services/googleDrive';
import { googleSignIn } from '../services/firebaseAuth';
import confetti from 'canvas-confetti';
import { ConfirmationModal } from './ConfirmationModal';

interface DriveExplorerViewProps {
  project: Project;
  rdos: DailyLog[];
  expenses: Expense[];
  phases: Phase[];
  isAuthenticated: boolean;
  userEmail?: string | null;
  onRequireAuth: () => void;
}

export const DriveExplorerView: React.FC<DriveExplorerViewProps> = ({
  project,
  rdos,
  expenses,
  phases,
  isAuthenticated,
  userEmail,
  onRequireAuth,
}) => {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDriveContents = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fId = await getOrCreateProjectFolder(project.title);
      setFolderId(fId);
      const driveFiles = await listFiles(fId);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Error fetching drive contents:', err);
      setErrorMsg(err.message || 'Falha ao carregar arquivos do Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDriveContents();
    }
  }, [isAuthenticated, project.title]);

  const handleSyncAll = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setIsSyncing(true);
    try {
      await exportProjectToDrive(project, rdos, expenses, phases);
      confetti({ particleCount: 60, spread: 60 });
      await fetchDriveContents();
    } catch (err: any) {
      alert(`Erro na sincronização: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !folderId) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        await uploadFile(file, folderId);
      }
      confetti({ particleCount: 40, spread: 50 });
      await fetchDriveContents();
    } catch (err: any) {
      alert(`Erro no upload: ${err.message || err}`);
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFile(fileToDelete.id);
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err: any) {
      alert(`Erro ao excluir arquivo: ${err.message || err}`);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (mimeType.includes('json')) return <FileCode className="w-5 h-5 text-amber-500" />;
    return <FileText className="w-5 h-5 text-sky-500" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-';
    const num = Number(bytes);
    if (isNaN(num)) return '-';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-sky-500" />
            Google Drive & Documentos da Obra
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Armazenamento em nuvem de relatórios RDO, plantas, contratos e planilhas financeiras
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <button
                onClick={fetchDriveContents}
                disabled={isLoading}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                title="Atualizar lista de arquivos"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition"
              >
                <FolderSync className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo no Drive'}
              </button>
            </>
          ) : (
            <button
              onClick={onRequireAuth}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition"
            >
              Conectar Google Drive
            </button>
          )}
        </div>
      </div>

      {/* Google Drive Status Banner */}
      <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 p-6 sm:p-7 rounded-3xl border border-sky-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Pasta: Mãos em Obra - {project.title}
              </h3>
              {isAuthenticated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3" /> Conectado ({userEmail})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Todos os backups, diários de obra (RDOs), recibos e relatórios são salvos de forma organizada em sua conta Google Drive.
            </p>
          </div>
        </div>

        {folderId && (
          <a
            href={`https://drive.google.com/drive/folders/${folderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            Abrir no Google Drive
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}
      </div>

      {/* Upload Zone */}
      {isAuthenticated && folderId && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center hover:border-amber-400 dark:hover:border-amber-500 transition shadow-sm">
          <label className="cursor-pointer flex flex-col items-center justify-center">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl mb-2">
              <Upload className={`w-6 h-6 ${isUploading ? 'animate-bounce' : ''}`} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isUploading ? 'Enviando arquivos para o Google Drive...' : 'Enviar Plantas, Contratos ou Fotos para a Obra'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Clique para selecionar ou arraste arquivos (PDFs, DWG, imagens, notas)
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Drive File List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Arquivos na Pasta ({files.length})
          </span>
          {folderId && (
            <span className="text-[11px] text-slate-400 font-mono">
              ID da Pasta: {folderId.substring(0, 12)}...
            </span>
          )}
        </div>

        {!isAuthenticated ? (
          <div className="py-12 text-center p-6 space-y-3">
            <Cloud className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Conecte ao Google Drive</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Faça login com sua conta Google para visualizar e sincronizar os documentos desta obra diretamente no Drive.
            </p>
            <button
              onClick={onRequireAuth}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
            >
              Conectar Conta Google
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center p-6 text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
            Carregando arquivos do Google Drive...
          </div>
        ) : errorMsg ? (
          <div className="py-8 text-center p-6 text-xs text-rose-500">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {errorMsg}
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center p-6 space-y-3">
            <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Nenhum arquivo ainda nesta pasta</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Clique em "Sincronizar Tudo no Drive" para gerar o relatório executivo e a planilha financeira.
            </p>
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              Sincronizar Agora
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{formatFileSize(file.size)}</span>
                      {file.modifiedTime && (
                        <>
                          <span>•</span>
                          <span>Modificado: {new Date(file.modifiedTime).toLocaleDateString('pt-BR')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      Abrir <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}

                  <button
                    onClick={() => setFileToDelete(file)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                    title="Excluir arquivo do Google Drive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for File Deletion */}
      <ConfirmationModal
        isOpen={!!fileToDelete}
        title="Excluir Arquivo do Google Drive"
        message={`Tem certeza que deseja remover o arquivo "${fileToDelete?.name}" do Google Drive? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Arquivo"
        onConfirm={confirmDeleteFile}
        onCancel={() => setFileToDelete(null)}
      />

    </div>
  );
};
