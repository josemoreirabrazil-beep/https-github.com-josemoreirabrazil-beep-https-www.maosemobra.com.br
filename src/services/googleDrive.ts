import { getAccessToken } from './firebaseAuth';
import type { DriveFileItem, Project, DailyLog, Expense, Phase } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

async function getAuthHeaders() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado no Google Drive. Por favor, conecte sua conta Google.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function findFolderByName(folderName: string, parentId?: string): Promise<string | null> {
  const headers = await getAuthHeaders();
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const response = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Token expirado. Reconecte o Google Drive.');
    throw new Error(`Erro ao buscar pasta no Drive: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function createFolder(folderName: string, parentId?: string): Promise<string> {
  const headers = await getAuthHeaders();
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar pasta no Drive: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

export async function getOrCreateAppRootFolder(): Promise<string> {
  const rootFolderName = 'Mãos em Obra - Projetos e Relatórios';
  const existingId = await findFolderByName(rootFolderName);
  if (existingId) return existingId;
  return await createFolder(rootFolderName);
}

export async function getOrCreateProjectFolder(projectTitle: string): Promise<string> {
  const rootFolderId = await getOrCreateAppRootFolder();
  const projectFolderName = `Obra - ${projectTitle}`;
  const existingId = await findFolderByName(projectFolderName, rootFolderId);
  if (existingId) return existingId;
  return await createFolder(projectFolderName, rootFolderId);
}

export async function listFilesInFolder(folderId?: string): Promise<DriveFileItem[]> {
  const headers = await getAuthHeaders();
  let query = 'trashed = false';
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const fields = 'files(id,name,mimeType,webViewLink,webContentLink,iconLink,modifiedTime,size,thumbnailLink)';
  const response = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&fields=${encodeURIComponent(fields)}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar arquivos do Drive: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function uploadTextFile(
  fileName: string, 
  content: string, 
  folderId?: string, 
  mimeType = 'text/markdown'
): Promise<DriveFileItem> {
  const headers = await getAuthHeaders();
  const metadata: any = {
    name: fileName,
    mimeType,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,modifiedTime,size`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar arquivo para o Drive: ${response.statusText}`);
  }

  return await response.json();
}

export async function uploadBinaryFile(
  file: File, 
  folderId?: string
): Promise<DriveFileItem> {
  const headers = await getAuthHeaders();
  const metadata: any = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const fileBlob = new Blob([fileArrayBuffer], { type: file.type || 'application/octet-stream' });

  const formData = new FormData();
  formData.append('metadata', metadataBlob);
  formData.append('file', fileBlob);

  // Using multipart upload with fetch
  const response = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,modifiedTime,size`, {
    method: 'POST',
    headers: {
      ...headers,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Erro ao fazer upload do arquivo: ${response.statusText}`);
  }

  return await response.json();
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${DRIVE_API_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Erro ao excluir arquivo no Drive: ${response.statusText}`);
  }
}

export const listFiles = listFilesInFolder;
export const uploadFile = uploadBinaryFile;
export const deleteFile = deleteDriveFile;
export type DriveFile = DriveFileItem;

export async function exportProjectToDrive(
  project: Project,
  rdos: DailyLog[],
  expenses: Expense[],
  phases: Phase[]
): Promise<{ reportFile: DriveFileItem; backupFile: DriveFileItem }> {
  const folderId = await getOrCreateProjectFolder(project.title);

  // 1. Generate formatted Markdown / Text Executive Report
  const totalExpenses = expenses.reduce((acc, cur) => acc + (cur.actualAmount || cur.plannedAmount), 0);
  const totalPaid = expenses.filter(e => e.status === 'Pago').reduce((acc, cur) => acc + cur.actualAmount, 0);
  const pendingAmount = expenses.filter(e => e.status !== 'Pago').reduce((acc, cur) => acc + (cur.actualAmount || cur.plannedAmount), 0);
  
  const reportContent = `# RELATÓRIO CONSOLIDADO DE OBRA
**Mãos em Obra - Gestão & Controle de Construção Civil**

---
## DADOS GERAIS DO PROJETO
- **Obra:** ${project.title}
- **Cliente:** ${project.clientName || 'Não especificado'}
- **Endereço:** ${project.address || 'Não especificado'}
- **Tipo:** ${project.type}
- **Status Atual:** ${project.status}
- **Data de Início:** ${project.startDate}
- **Previsão de Término:** ${project.estimatedEndDate}
- **Orçamento Previsto Total:** R$ ${project.budgetTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Total Investido/Comprometido:** R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Total Efetivamente Pago:** R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Saldo a Pagar:** R$ ${pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

---
## ETAPAS E CRONOGRAMA
${phases.map((p, idx) => `
### ${idx + 1}. ${p.title} (${p.status} - ${p.progressPercentage}%)
- Período: ${p.startDate} até ${p.endDate}
- Checklists (${p.checklist.filter(c => c.done).length}/${p.checklist.length} concluídos):
${p.checklist.map(c => `  - [${c.done ? 'X' : ' '}] ${c.text}`).join('\n')}
`).join('\n')}

---
## DIÁRIO DE OBRA (ÚLTIMOS REGISTROS RDO)
${rdos.slice(0, 10).map((rdo, idx) => `
### RDO #${rdos.length - idx} - Data: ${rdo.date} (Clima: ${rdo.weather})
- **Efetivo de Obra:** ${rdo.labor.map(l => `${l.count}x ${l.role}`).join(', ') || 'Nenhum'}
- **Serviços Executados:** ${rdo.servicesExecuted}
- **Ocorrências / Desvios:** ${rdo.occurrences || 'Nenhuma'}
- **Observações:** ${rdo.notes || 'Sem observações adicionais'}
${rdo.aiSummary ? `\n> **Parecer Técnico IA:**\n> ${rdo.aiSummary.replace(/\n/g, '\n> ')}` : ''}
`).join('\n---\n')}

---
## DESPESAS E CUSTOS REGISTRADOS
| Descrição | Categoria | Fornecedor | Previsto (R$) | Realizado (R$) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${expenses.map(e => `| ${e.description} | ${e.category} | ${e.supplier || '-'} | R$ ${e.plannedAmount.toFixed(2)} | R$ ${e.actualAmount.toFixed(2)} | ${e.status} |`).join('\n')}

---
*Gerado automaticamente pelo aplicativo Mãos em Obra em ${new Date().toLocaleString('pt-BR')}.*
`;

  const reportFileName = `Relatorio_Executivo_${project.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
  const reportFile = await uploadTextFile(reportFileName, reportContent, folderId, 'text/markdown');

  // 2. Full JSON Backup (can be reimported or audited)
  const backupData = {
    exportedAt: new Date().toISOString(),
    project,
    phases,
    rdos,
    expenses,
  };
  const backupFileName = `Backup_Dados_${project.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  const backupFile = await uploadTextFile(backupFileName, JSON.stringify(backupData, null, 2), folderId, 'application/json');

  return { reportFile, backupFile };
}
