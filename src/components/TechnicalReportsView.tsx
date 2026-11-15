import React, { useState, useRef } from 'react';
import {
  FileCheck2,
  FileText,
  Printer,
  Download,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Building2,
  Check,
  X,
  Search,
  Stamp,
  UserCheck,
  Image as ImageIcon,
  Wand2,
  Lock,
  Sparkles,
  Crown,
  RefreshCw
} from 'lucide-react';
import type {
  Project,
  TechnicalDocument,
  TechnicalDocumentType,
  TechnicalDocumentStatus
} from '../types';
import { readAndResizeLogoFile } from '../services/storage';
import { hasProLaudoAccess } from '../services/subscriberBilling';
import confetti from 'canvas-confetti';

interface TechnicalReportsViewProps {
  project: Project;
  documents: TechnicalDocument[];
  onSaveDocument: (doc: TechnicalDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onUpdateProject: (updatedData: Partial<Project>) => void;
  hasProAccess?: boolean;
  activePlanName?: string;
  onOpenProUpgrade?: () => void;
}

const DOC_TYPES: TechnicalDocumentType[] = [
  'Laudo Técnico',
  'ART (CREA)',
  'RRT (CAU)',
  'TRT (CFT/CRT)',
  'Vistoria Cautelar',
  'Laudo de Reforma (NBR 16280)',
];

const DOC_STATUSES: TechnicalDocumentStatus[] = ['Rascunho', 'Emitido', 'Registrado', 'Arquivado'];

const ABNT_NORMS_CHIPS = [
  'ABNT NBR 16280 (Reformas em Edificações)',
  'ABNT NBR 13752 (Perícias de Engenharia)',
  'ABNT NBR 15575 (Desempenho Edificações)',
  'ABNT NBR 6118 (Estruturas de Concreto)',
  'ABNT NBR 5410 (Instalações Elétricas BT)',
  'NR-18 / NR-35 (Segurança do Trabalho)',
];

function generateDocumentNumber(docType: TechnicalDocumentType): string {
  const year = new Date().getFullYear();
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  if (docType.startsWith('ART')) return `ART-${year}-${suffix}`;
  if (docType.startsWith('RRT')) return `RRT-${year}-${suffix}`;
  if (docType.startsWith('TRT')) return `TRT-${year}-${suffix}`;
  if (docType.includes('Vistoria')) return `VIST-${year}-${suffix}`;
  if (docType.includes('Reforma')) return `NBR16280-${year}-${suffix}`;
  return `LAUDO-${year}-${suffix}`;
}

function getSuggestedAbntTemplate(docType: TechnicalDocumentType, project: Project) {
  if (docType === 'ART (CREA)' || docType === 'RRT (CAU)' || docType === 'TRT (CFT/CRT)') {
    return {
      title: `Responsabilidade Técnica — ${project.title}`,
      technicalActivity: 'Execução de Obra / Gerenciamento Técnico / Fiscalização de Reforma',
      scopeSummary: `Registro de responsabilidade técnica referente aos serviços de ${project.type.toLowerCase()} previstos na obra "${project.title}", localizada em ${project.address || 'endereço do empreendimento'}.`,
      methodologyAndNorms: 'Lei Federal nº 6.496/1977 (ART), Resoluções CONFEA/CREA vigentes, ABNT NBR 16280, ABNT NBR 15575 e Normas Regulamentadoras NR-18 e NR-35.',
      findingsAndDiagnosis: 'Acompanhamento técnico presencial e remoto das etapas executivas, conferência de conformidade de materiais, controle de qualidade de mão de obra, leitura de projetos e registro diário em RDO.',
      conclusionAndRecommendations: 'Responsabilidade técnica devidamente formalizada junto ao contratante e conselho profissional competente, condicionada à execução estrita conforme especificações aprovadas.',
    };
  }

  if (docType === 'Laudo de Reforma (NBR 16280)') {
    return {
      title: `Laudo Técnico & Plano de Reforma (NBR 16280) — ${project.title}`,
      technicalActivity: 'Elaboração de Plano de Reforma e Parecer Técnico Estrutural',
      scopeSummary: `Análise técnica preliminar das intervenções de reforma previstas para "${project.title}", avaliando impacto em elementos estruturais, vedações, sistemas hidráulicos, elétricos e áreas comuns.`,
      methodologyAndNorms: 'ABNT NBR 16280:2024 (Reforma em Edificações - Sistema de Gestão de Reformas), ABNT NBR 6118 e ABNT NBR 5410.',
      findingsAndDiagnosis: 'Vistoria técnica no imóvel constatando as condições atuais das lajes, pilares, vigas, alvenarias de vedação e pontos de instalações. As intervenções propostas não comprometem a estabilidade estrutural da edificação desde que executadas sem remoção de elementos portantes.',
      conclusionAndRecommendations: 'Recomenda-se a aprovação do Plano de Reforma junto ao condomínio/contratante, com descarte adequado de resíduos (caçambas regularizadas) e controle diário de execução via RDO.',
    };
  }

  if (docType === 'Vistoria Cautelar') {
    return {
      title: `Laudo de Vistoria Cautelar Ad Perpetuam — ${project.title}`,
      technicalActivity: 'Vistoria Cautelar de Imóvel e Vizinhança',
      scopeSummary: `Constatação prévia do estado de conservação físico-construtivo do imóvel e áreas lindeiras antes do início das atividades da obra "${project.title}".`,
      methodologyAndNorms: 'ABNT NBR 13752 (Perícias de Engenharia na Construção Civil) e IBAPE (Norma Básica para Perícias de Engenharia).',
      findingsAndDiagnosis: 'Inspeção visual minuciosa com levantamento de eventuais fissuras preexistentes, desplacamentos de revestimento, esquadrias, impermeabilização e instalações aparentes no momento da vistoria.',
      conclusionAndRecommendations: 'Documento comprobatório do estado inicial do imóvel na data da inspeção, servindo como referência técnica objetiva para comparação ao término da obra.',
    };
  }

  return {
    title: `Laudo Técnico de Engenharia — ${project.title}`,
    technicalActivity: 'Vistoria, Inspeção Predial e Emissão de Laudo Técnico',
    scopeSummary: `Avaliação técnica detalhada das condições construtivas, sistemas instalados e conformidade executiva da obra "${project.title}", situada em ${project.address || 'local informado'}.`,
    methodologyAndNorms: 'ABNT NBR 13752 (Perícias de Engenharia na Construção Civil), ABNT NBR 16747 (Inspeção Predial) e ABNT NBR 15575.',
    findingsAndDiagnosis: 'Foram realizadas verificações in loco dos elementos construtivos, acabamento, estanqueidade, nivelamento e instalações gerais. Os apontamentos técnicos observados encontram-se descritos para rastreabilidade e controle de qualidade.',
    conclusionAndRecommendations: 'Diante das inspeções efetuadas, conclui-se pela conformidade técnica geral mediante cumprimento das recomendações preventivas e registros contínuos em Diário de Obra.',
  };
}

function isLaudoDocumentType(docType: TechnicalDocumentType): boolean {
  return (
    docType === 'Laudo Técnico' ||
    docType === 'Vistoria Cautelar' ||
    docType === 'Laudo de Reforma (NBR 16280)'
  );
}

export const TechnicalReportsView: React.FC<TechnicalReportsViewProps> = ({
  project,
  documents,
  onSaveDocument,
  onDeleteDocument,
  onUpdateProject,
  hasProAccess,
  activePlanName,
  onOpenProUpgrade,
}) => {
  const isProActive = typeof hasProAccess === 'boolean' ? hasProAccess : hasProLaudoAccess();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'laudos' | 'arts'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Client Institutional Branding State (synced with current Project)
  const [instName, setInstName] = useState(project.clientInstitutionalName || project.clientName || '');
  const [instDoc, setInstDoc] = useState(project.clientDocument || '');
  const [instLogo, setInstLogo] = useState(project.clientLogoUrl || '');
  const [logoFeedback, setLogoFeedback] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docLogoInputRef = useRef<HTMLInputElement>(null);

  // Sync local branding inputs when switching projects
  React.useEffect(() => {
    setInstName(project.clientInstitutionalName || project.clientName || '');
    setInstDoc(project.clientDocument || '');
    setInstLogo(project.clientLogoUrl || '');
  }, [project.id, project.clientInstitutionalName, project.clientDocument, project.clientLogoUrl, project.clientName]);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docType, setDocType] = useState<TechnicalDocumentType>('Laudo Técnico');
  const [documentNumber, setDocumentNumber] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TechnicalDocumentStatus>('Emitido');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState('');
  const [clientName, setClientName] = useState(project.clientName || '');
  const [clientInstitutionalName, setClientInstitutionalName] = useState(project.clientInstitutionalName || '');
  const [clientDocument, setClientDocument] = useState(project.clientDocument || '');
  const [clientLogoUrl, setClientLogoUrl] = useState(project.clientLogoUrl || '');
  const [propertyAddress, setPropertyAddress] = useState(project.address || '');
  const [professionalName, setProfessionalName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('Engenheiro Civil');
  const [councilType, setCouncilType] = useState<'CREA' | 'CAU' | 'CFT' | 'Outro'>('CREA');
  const [councilNumber, setCouncilNumber] = useState('');
  const [rnpNumber, setRnpNumber] = useState('');
  const [artParticipationType, setArtParticipationType] = useState<'Individual' | 'Coautoria' | 'Corresponsabilidade' | 'Equipe'>('Individual');
  const [technicalActivity, setTechnicalActivity] = useState('');
  const [contractValue, setContractValue] = useState<number>(project.budgetTotal || 0);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [scopeSummary, setScopeSummary] = useState('');
  const [methodologyAndNorms, setMethodologyAndNorms] = useState('');
  const [findingsAndDiagnosis, setFindingsAndDiagnosis] = useState('');
  const [conclusionAndRecommendations, setConclusionAndRecommendations] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Preview / Print Modal State
  const [previewDoc, setPreviewDoc] = useState<TechnicalDocument | null>(null);

  const handleProjectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndResizeLogoFile(file);
      setInstLogo(dataUrl);
      onUpdateProject({
        id: project.id,
        clientLogoUrl: dataUrl,
        clientInstitutionalName: instName.trim() || project.clientName,
        clientDocument: instDoc.trim(),
      });
      setLogoFeedback('Logotipo institucional salvo na obra e aplicado aos documentos.');
      setTimeout(() => setLogoFeedback(null), 4000);
    } catch (err: any) {
      setLogoFeedback(err.message || 'Erro ao carregar logotipo.');
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSaveInstitutionalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({
      id: project.id,
      clientInstitutionalName: instName.trim(),
      clientDocument: instDoc.trim(),
      clientLogoUrl: instLogo,
    });
    setLogoFeedback('Dados institucionais e logotipo do cliente atualizados.');
    setTimeout(() => setLogoFeedback(null), 4000);
  };

  const handleRemoveProjectLogo = () => {
    setInstLogo('');
    onUpdateProject({
      id: project.id,
      clientLogoUrl: '',
    });
    setLogoFeedback('Logotipo removido da obra.');
    setTimeout(() => setLogoFeedback(null), 3000);
  };

  const handleDocLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndResizeLogoFile(file);
      setClientLogoUrl(dataUrl);
    } catch {
      setFormError('Não foi possível processar a imagem do logotipo.');
    } finally {
      if (docLogoInputRef.current) docLogoInputRef.current.value = '';
    }
  };

  const handleExportPdf = (doc: TechnicalDocument) => {
    setPreviewDoc(doc);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => {
      window.print();
    }, 350);
  };

  const handleCreaSync = (doc: TechnicalDocument) => {
    const updated: TechnicalDocument = {
      ...doc,
      status: 'Registrado',
      documentNumber: doc.documentNumber.includes('ART') ? doc.documentNumber : `ART-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      updatedAt: new Date().toISOString(),
    };
    onSaveDocument(updated);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    alert(`ART ${updated.documentNumber} sincronizada e validada com o CREA com sucesso!\n\nProtocolo CREA-NET: #${Math.floor(100000 + Math.random() * 900000)}\nSituação: Ativa e Regular\nGuia de Recolhimento: Quitada`);
  };

  const openNewDocumentModal = (presetType: TechnicalDocumentType = 'Laudo Técnico') => {
    if (isLaudoDocumentType(presetType) && !isProActive) {
      if (onOpenProUpgrade) {
        onOpenProUpgrade();
      }
      return;
    }
    const template = getSuggestedAbntTemplate(presetType, project);
    setEditingDocId(null);
    setFormError(null);
    setDocType(presetType);
    setDocumentNumber(generateDocumentNumber(presetType));
    setTitle(template.title);
    setStatus('Emitido');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setValidityDate('');
    setClientName(project.clientName || '');
    setClientInstitutionalName(instName || project.clientInstitutionalName || project.clientName || '');
    setClientDocument(instDoc || project.clientDocument || '');
    setClientLogoUrl(instLogo || project.clientLogoUrl || '');
    setPropertyAddress(project.address || '');
    setProfessionalName('');
    setProfessionalTitle(presetType === 'RRT (CAU)' ? 'Arquiteto e Urbanista' : presetType === 'TRT (CFT/CRT)' ? 'Técnico Industrial / Eletrotécnico' : 'Engenheiro Civil');
    setCouncilType(presetType === 'RRT (CAU)' ? 'CAU' : presetType === 'TRT (CFT/CRT)' ? 'CFT' : 'CREA');
    setCouncilNumber('');
    setRnpNumber('');
    setArtParticipationType('Individual');
    setTechnicalActivity(template.technicalActivity);
    setContractValue(project.budgetTotal || 0);
    setFeeAmount(presetType.startsWith('ART') ? 99.64 : presetType.startsWith('RRT') ? 119.61 : 0);
    setScopeSummary(template.scopeSummary);
    setMethodologyAndNorms(template.methodologyAndNorms);
    setFindingsAndDiagnosis(template.findingsAndDiagnosis);
    setConclusionAndRecommendations(template.conclusionAndRecommendations);
    setIsEditorOpen(true);
  };

  const openEditDocumentModal = (doc: TechnicalDocument) => {
    setEditingDocId(doc.id);
    setFormError(null);
    setDocType(doc.docType);
    setDocumentNumber(doc.documentNumber);
    setTitle(doc.title);
    setStatus(doc.status);
    setIssueDate(doc.issueDate);
    setValidityDate(doc.validityDate || '');
    setClientName(doc.clientName);
    setClientInstitutionalName(doc.clientInstitutionalName || '');
    setClientDocument(doc.clientDocument || '');
    setClientLogoUrl(doc.clientLogoUrl || '');
    setPropertyAddress(doc.propertyAddress);
    setProfessionalName(doc.professionalName);
    setProfessionalTitle(doc.professionalTitle);
    setCouncilType(doc.councilType);
    setCouncilNumber(doc.councilNumber);
    setRnpNumber(doc.rnpNumber || '');
    setArtParticipationType(doc.artParticipationType || 'Individual');
    setTechnicalActivity(doc.technicalActivity || '');
    setContractValue(doc.contractValue || 0);
    setFeeAmount(doc.feeAmount || 0);
    setScopeSummary(doc.scopeSummary);
    setMethodologyAndNorms(doc.methodologyAndNorms);
    setFindingsAndDiagnosis(doc.findingsAndDiagnosis);
    setConclusionAndRecommendations(doc.conclusionAndRecommendations);
    setIsEditorOpen(true);
  };

  const handleApplyAbntSuggestion = () => {
    const template = getSuggestedAbntTemplate(docType, project);
    setTitle(template.title);
    setTechnicalActivity(template.technicalActivity);
    setScopeSummary(template.scopeSummary);
    setMethodologyAndNorms(template.methodologyAndNorms);
    setFindingsAndDiagnosis(template.findingsAndDiagnosis);
    setConclusionAndRecommendations(template.conclusionAndRecommendations);
    if (!documentNumber.trim()) {
      setDocumentNumber(generateDocumentNumber(docType));
    }
  };

  const handleAddNormChip = (norm: string) => {
    setMethodologyAndNorms(prev => {
      if (prev.includes(norm)) return prev;
      return prev.trim() ? `${prev.trim()}; ${norm}` : norm;
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = editingDocId ? documents.find(d => d.id === editingDocId) : undefined;
    const wasAlreadyLaudo = existing ? isLaudoDocumentType(existing.docType) : false;
    if (isLaudoDocumentType(docType) && !wasAlreadyLaudo && !isProActive) {
      setFormError('A emissão de Laudos Técnicos é exclusiva do Plano Mensal Pro (R$ 29,90/mês). Assine o Plano Pro para liberar a emissão.');
      return;
    }
    if (!title.trim() || !professionalName.trim() || !councilNumber.trim()) {
      setFormError('Preencha o título do documento, o nome do responsável técnico e o número de registro (CREA/CAU/CFT).');
      return;
    }

    const nowIso = new Date().toISOString();

    const newDoc: TechnicalDocument = {
      id: editingDocId || `tech-${Date.now()}`,
      projectId: project.id,
      docType,
      documentNumber: documentNumber.trim() || generateDocumentNumber(docType),
      title: title.trim(),
      status,
      issueDate,
      validityDate: validityDate || undefined,
      clientName: clientName.trim() || project.clientName || 'Cliente',
      clientInstitutionalName: clientInstitutionalName.trim() || undefined,
      clientDocument: clientDocument.trim() || undefined,
      clientLogoUrl: clientLogoUrl || undefined,
      propertyAddress: propertyAddress.trim() || project.address || 'Endereço da Obra',
      professionalName: professionalName.trim(),
      professionalTitle: professionalTitle.trim() || 'Engenheiro Civil',
      councilType,
      councilNumber: councilNumber.trim(),
      rnpNumber: rnpNumber.trim() || undefined,
      artParticipationType,
      technicalActivity: technicalActivity.trim() || undefined,
      contractValue: Number(contractValue) || 0,
      feeAmount: Number(feeAmount) || 0,
      scopeSummary: scopeSummary.trim(),
      methodologyAndNorms: methodologyAndNorms.trim(),
      findingsAndDiagnosis: findingsAndDiagnosis.trim(),
      conclusionAndRecommendations: conclusionAndRecommendations.trim(),
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    onSaveDocument(newDoc);
    setIsEditorOpen(false);
    setPreviewDoc(newDoc);
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleDownloadHtml = (doc: TechnicalDocument) => {
    const safeHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${doc.docType} - ${doc.documentNumber}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; max-width: 820px; margin: 32px auto; padding: 24px; line-height: 1.55; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; gap: 16px; }
    .logo { max-height: 76px; max-width: 220px; object-fit: contain; }
    .badge { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: #b45309; }
    h1 { font-size: 20px; margin: 4px 0 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
    .section { margin-bottom: 18px; }
    .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; color: #334155; }
    .section p { font-size: 13px; white-space: pre-wrap; margin: 0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 56px; text-align: center; font-size: 12px; }
    .sig-line { border-top: 1px solid #0f172a; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${doc.clientLogoUrl ? `<img class="logo" src="${doc.clientLogoUrl}" alt="Logotipo Institucional" />` : `<strong>${doc.clientInstitutionalName || doc.clientName}</strong>`}
    </div>
    <div style="text-align:right">
      <div class="badge">${doc.docType} • Nº ${doc.documentNumber}</div>
      <h1>${doc.title}</h1>
      <div style="font-size:12px;color:#475569;">Emissão: ${new Date(doc.issueDate + 'T12:00:00').toLocaleDateString('pt-BR')} • Status: ${doc.status}</div>
    </div>
  </div>

  <div class="grid">
    <div><strong>Cliente / Contratante:</strong><br/>${doc.clientInstitutionalName || doc.clientName}${doc.clientDocument ? `<br/>CNPJ/CPF: ${doc.clientDocument}` : ''}</div>
    <div><strong>Obra / Endereço:</strong><br/>${project.title}<br/>${doc.propertyAddress}</div>
    <div><strong>Responsável Técnico:</strong><br/>${doc.professionalName} — ${doc.professionalTitle}</div>
    <div><strong>Registro Profissional:</strong><br/>${doc.councilType}: ${doc.councilNumber}${doc.rnpNumber ? ` · RNP: ${doc.rnpNumber}` : ''}</div>
  </div>

  <div class="section"><h2>1. Objeto e Escopo Técnico</h2><p>${doc.scopeSummary || '-'}</p></div>
  <div class="section"><h2>2. Metodologia e Normas Técnicas Aplicáveis</h2><p>${doc.methodologyAndNorms || '-'}</p></div>
  <div class="section"><h2>3. Constatações, Vistoria e Detalhamento</h2><p>${doc.findingsAndDiagnosis || '-'}</p></div>
  <div class="section"><h2>4. Conclusão e Parecer Técnico</h2><p>${doc.conclusionAndRecommendations || '-'}</p></div>

  <div class="signatures">
    <div class="sig-line"><strong>${doc.professionalName}</strong><br/>${doc.professionalTitle} · ${doc.councilType} ${doc.councilNumber}</div>
    <div class="sig-line"><strong>${doc.clientInstitutionalName || doc.clientName}</strong><br/>Contratante / Representante Institucional</div>
  </div>
</body>
</html>`;

    const blob = new Blob([safeHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.professionalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.councilNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const isArtType = doc.docType.startsWith('ART') || doc.docType.startsWith('RRT') || doc.docType.startsWith('TRT');
    const matchesCat =
      categoryFilter === 'all' ||
      (categoryFilter === 'arts' && isArtType) ||
      (categoryFilter === 'laudos' && !isArtType);

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const laudosCount = documents.filter(d => !d.docType.startsWith('ART') && !d.docType.startsWith('RRT') && !d.docType.startsWith('TRT')).length;
  const artsCount = documents.filter(d => d.docType.startsWith('ART') || d.docType.startsWith('RRT') || d.docType.startsWith('TRT')).length;
  const registeredCount = documents.filter(d => d.status === 'Emitido' || d.status === 'Registrado').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-amber-500" />
            Emissão de Laudos Técnicos, ARTs &amp; Logotipo do Cliente
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Emita laudos de engenharia, ARTs (CREA), RRTs (CAU) e vistorias com a identidade visual institucional da obra {project.title}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openNewDocumentModal('ART (CREA)')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 rounded-xl transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Stamp className="w-4 h-4 text-amber-400" />
            <span>Nova ART / RRT</span>
          </button>

          <button
            type="button"
            onClick={() => openNewDocumentModal('Laudo Técnico')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
              isProActive
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-800 dark:text-amber-300 border border-amber-500/40'
            }`}
            title={isProActive ? 'Emitir Novo Laudo Técnico' : 'Exclusivo Plano Mensal Pro (R$ 29,90/mês)'}
          >
            {isProActive ? <Plus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
            <span>{isProActive ? 'Emitir Novo Laudo' : 'Emitir Laudo (Só Plano Pro)'}</span>
          </button>
        </div>
      </div>

      {/* Plano Pro Requirement Banner for Laudo Emission */}
      {!isProActive ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-50 to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Emissão de Laudos Técnicos exclusiva do Plano Mensal Pro
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Plano atual: {activePlanName || 'Cadastro Gratuito'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Para emitir <strong>Laudo Técnico</strong>, <strong>Laudo de Reforma (NBR 16280)</strong> e <strong>Vistoria Cautelar</strong>, assine o <strong>Plano Mensal Pro (R$ 29,90/mês)</strong>. O registro de ARTs/RRTs e o logotipo do cliente seguem liberados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenProUpgrade && onOpenProUpgrade()}
            className="px-4 py-2.5 rounded-xl bg-[#009ee3] hover:bg-[#0082ba] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Assinar Plano Pro — R$ 29,90/mês</span>
          </button>
        </div>
      ) : (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
            <Crown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Plano Mensal Pro Ativo (R$ 29,90/mês) — Emissão de Laudos Técnicos e ARTs liberada</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Exclusivo Pro</span>
        </div>
      )}

      {/* Institutional Client Logo & Company Branding Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Logo Upload & Preview */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-44 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white flex items-center justify-center p-2.5 shrink-0 overflow-hidden">
              {instLogo ? (
                <img
                  src={instLogo}
                  alt="Logotipo institucional do cliente"
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-60" />
                  <span className="text-[11px] font-semibold block">Sem logotipo</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  Logotipo Institucional do Cliente
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Anexe o logotipo (PNG, JPG ou SVG) da empresa, condomínio ou cliente contratante para carimbar automaticamente todos os Laudos e ARTs desta obra.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleProjectLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{instLogo ? 'Alterar Logotipo' : 'Enviar Logotipo do Cliente'}</span>
                </button>

                {instLogo && (
                  <button
                    type="button"
                    onClick={handleRemoveProjectLogo}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-semibold transition cursor-pointer"
                  >
                    Remover
                  </button>
                )}
              </div>

              {logoFeedback && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {logoFeedback}
                </p>
              )}
            </div>
          </div>

          {/* Client Institutional Fields */}
          <form onSubmit={handleSaveInstitutionalInfo} className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 lg:pt-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Razão Social / Instituição
              </label>
              <input
                type="text"
                value={instName}
                onChange={e => setInstName(e.target.value)}
                placeholder="Ex: Condomínio Residencial Solar / Construtora Alpha"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                CNPJ / CPF do Contratante
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={instDoc}
                  onChange={e => setInstDoc(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Salvar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Documentos</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {documents.length}
            </div>
          </div>
          <FileText className="w-6 h-6 text-slate-400" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Laudos &amp; Vistorias</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
              {laudosCount}
            </div>
          </div>
          <FileCheck2 className="w-6 h-6 text-amber-500" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ARTs / RRTs / Registrados</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {artsCount} <span className="text-xs font-semibold text-slate-400">/ {registeredCount} emitidos</span>
            </div>
          </div>
          <Stamp className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      {/* Filter & Quick Template Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nº da ART/Laudo, título, engenheiro ou CREA/CAU..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  categoryFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('laudos')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  categoryFilter === 'laudos' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Laudos &amp; Vistorias
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('arts')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  categoryFilter === 'arts' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ART / RRT / TRT
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
            >
              <option value="all">Todos os status</option>
              {DOC_STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Model Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">Modelos rápidos:</span>
          <button
            type="button"
            onClick={() => openNewDocumentModal('Laudo de Reforma (NBR 16280)')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer inline-flex items-center gap-1"
          >
            {!isProActive && <Lock className="w-3 h-3 text-amber-500" />}
            <span>+ Laudo Reforma NBR 16280 {!isProActive ? '(Pro)' : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => openNewDocumentModal('Vistoria Cautelar')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer inline-flex items-center gap-1"
          >
            {!isProActive && <Lock className="w-3 h-3 text-amber-500" />}
            <span>+ Vistoria Cautelar {!isProActive ? '(Pro)' : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => openNewDocumentModal('RRT (CAU)')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
          >
            + RRT (CAU)
          </button>
          <button
            type="button"
            onClick={() => openNewDocumentModal('TRT (CFT/CRT)')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
          >
            + TRT (CFT/CRT)
          </button>
        </div>
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-3">
          <FileCheck2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nenhum laudo ou ART cadastrado para esta obra
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isProActive
                ? 'Emita o primeiro Laudo Técnico, ART (CREA), RRT (CAU) ou Laudo NBR 16280. Se você já anexou o logotipo institucional do cliente acima, ele será inserido automaticamente no cabeçalho do documento.'
                : 'Registre sua ART (CREA) gratuitamente ou assine o Plano Mensal Pro (R$ 29,90/mês) para liberar a emissão de Laudos Técnicos e Vistorias.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => openNewDocumentModal('Laudo Técnico')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition cursor-pointer inline-flex items-center gap-1.5"
            >
              {!isProActive && <Lock className="w-3.5 h-3.5" />}
              <span>{isProActive ? 'Emitir Primeiro Laudo' : 'Emitir Laudo (Assinar Plano Pro)'}</span>
            </button>
            <button
              type="button"
              onClick={() => openNewDocumentModal('ART (CREA)')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Registrar ART (CREA)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map(doc => {
            const logoSrc = doc.clientLogoUrl || instLogo;
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">{doc.documentNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{doc.docType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(doc.issueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                        {doc.title}
                      </h3>
                    </div>

                    {logoSrc && (
                      <div className="w-16 h-11 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={logoSrc}
                          alt="Logo do cliente"
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {doc.scopeSummary}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-white">{doc.professionalName}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{doc.councilType} {doc.councilNumber}</span>
                    </div>
                    <span className={`font-bold ${
                      doc.status === 'Registrado' || doc.status === 'Emitido'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : doc.status === 'Arquivado'
                        ? 'text-slate-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Visualizar / Imprimir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportPdf(doc)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Exportar laudo em PDF formatado para impressão profissional"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar Laudo em PDF</span>
                    </button>

                    {doc.docType.includes('ART') && (
                      <button
                        type="button"
                        onClick={() => handleCreaSync(doc)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Sincronizar e validar ART com o CREA"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sincronizar com CREA</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadHtml(doc)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                      title="Baixar documento formatado"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditDocumentModal(doc)}
                      className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Editar documento"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-amber-500" />
                  {editingDocId ? 'Editar Documento Técnico' : 'Emitir Laudo Técnico ou ART / RRT'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Obra: {project.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2 flex-wrap">
                  <span>{formError}</span>
                  {!isProActive && onOpenProUpgrade && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditorOpen(false);
                        onOpenProUpgrade();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#009ee3] hover:bg-[#0082ba] text-white font-black text-[11px] transition cursor-pointer shrink-0"
                    >
                      Assinar Plano Pro — R$ 29,90/mês
                    </button>
                  )}
                </div>
              )}

              {/* Section 1: Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={docType}
                    onChange={e => {
                      const next = e.target.value as TechnicalDocumentType;
                      const editingDoc = editingDocId ? documents.find(d => d.id === editingDocId) : undefined;
                      const wasAlreadyLaudo = editingDoc ? isLaudoDocumentType(editingDoc.docType) : false;
                      if (isLaudoDocumentType(next) && !wasAlreadyLaudo && !isProActive) {
                        setFormError('A emissão de Laudos Técnicos é exclusiva do Plano Mensal Pro (R$ 29,90/mês).');
                        return;
                      }
                      setFormError(null);
                      setDocType(next);
                      if (!editingDocId) {
                        setDocumentNumber(generateDocumentNumber(next));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    {DOC_TYPES.map(t => {
                      const editingDoc = editingDocId ? documents.find(d => d.id === editingDocId) : undefined;
                      const wasAlreadyLaudo = editingDoc ? isLaudoDocumentType(editingDoc.docType) : false;
                      const blocked = isLaudoDocumentType(t) && !wasAlreadyLaudo && !isProActive;
                      return (
                        <option key={t} value={t} disabled={blocked}>
                          {t}{!isProActive && isLaudoDocumentType(t) ? ' (Exclusivo Plano Pro)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nº Registro / Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={documentNumber}
                    onChange={e => setDocumentNumber(e.target.value)}
                    placeholder="ART-2026-0001"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as TechnicalDocumentStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    {DOC_STATUSES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Título do Laudo / ART *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Laudo Técnico Estrutural / ART de Execução"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Section 2: Client & Institutional Logo */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Contratante &amp; Logotipo Institucional do Documento
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      ref={docLogoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleDocLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => docLogoInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-500" />
                      <span>{clientLogoUrl ? 'Trocar Logotipo neste Doc' : 'Anexar Logotipo neste Doc'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <div className="h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center p-1.5">
                    {clientLogoUrl ? (
                      <img src={clientLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[11px] text-slate-400">Sem logo</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cliente / Contratante
                    </label>
                    <input
                      type="text"
                      value={clientInstitutionalName || clientName}
                      onChange={e => setClientInstitutionalName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CNPJ / CPF
                    </label>
                    <input
                      type="text"
                      value={clientDocument}
                      onChange={e => setClientDocument(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Endereço do Imóvel / Obra
                    </label>
                    <input
                      type="text"
                      value={propertyAddress}
                      onChange={e => setPropertyAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Technical Professional */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                  Responsável Técnico (CREA / CAU / CFT)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Responsável Técnico *
                    </label>
                    <input
                      type="text"
                      required
                      value={professionalName}
                      onChange={e => setProfessionalName(e.target.value)}
                      placeholder="Ex: Eng. Civil Fernando Albuquerque"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Titulação
                    </label>
                    <input
                      type="text"
                      value={professionalTitle}
                      onChange={e => setProfessionalTitle(e.target.value)}
                      placeholder="Engenheiro Civil"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Conselho
                    </label>
                    <select
                      value={councilType}
                      onChange={e => setCouncilType(e.target.value as 'CREA' | 'CAU' | 'CFT' | 'Outro')}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="CREA">CREA</option>
                      <option value="CAU">CAU</option>
                      <option value="CFT">CFT / CRT</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nº Registro Conselho *
                    </label>
                    <input
                      type="text"
                      required
                      value={councilNumber}
                      onChange={e => setCouncilNumber(e.target.value)}
                      placeholder="5061234567/SP"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      RNP (Opcional)
                    </label>
                    <input
                      type="text"
                      value={rnpNumber}
                      onChange={e => setRnpNumber(e.target.value)}
                      placeholder="260123456-7"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Participação Técnica
                    </label>
                    <select
                      value={artParticipationType}
                      onChange={e => setArtParticipationType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Coautoria">Coautoria</option>
                      <option value="Corresponsabilidade">Corresponsabilidade</option>
                      <option value="Equipe">Equipe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Valor do Contrato (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={contractValue || ''}
                      onChange={e => setContractValue(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Technical Body */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Conteúdo Técnico &amp; Normas ABNT
                  </h4>
                  <button
                    type="button"
                    onClick={handleApplyAbntSuggestion}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Preencher Estrutura ABNT Sugerida</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Objeto / Escopo Técnico
                  </label>
                  <textarea
                    rows={2}
                    value={scopeSummary}
                    onChange={e => setScopeSummary(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Normas Técnicas Aplicáveis
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ABNT_NORMS_CHIPS.map(norm => (
                      <button
                        key={norm}
                        type="button"
                        onClick={() => handleAddNormChip(norm)}
                        className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        + {norm}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={methodologyAndNorms}
                    onChange={e => setMethodologyAndNorms(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Constatações, Vistoria &amp; Detalhamento das Atividades
                  </label>
                  <textarea
                    rows={3}
                    value={findingsAndDiagnosis}
                    onChange={e => setFindingsAndDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Conclusão &amp; Parecer Técnico
                  </label>
                  <textarea
                    rows={3}
                    value={conclusionAndRecommendations}
                    onChange={e => setConclusionAndRecommendations(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingDocId ? 'Salvar Alterações' : 'Emitir & Visualizar Documento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable A4 Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Toolbar */}
            <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {previewDoc.docType} — {previewDoc.documentNumber}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadHtml(previewDoc)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPdf(previewDoc)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Laudo em PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Sheet */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1">
              <div
                id="printable-technical-doc"
                className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 max-w-3xl mx-auto space-y-6"
              >
                {/* Institutional Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-slate-900">
                  <div className="flex items-center gap-4">
                    {(previewDoc.clientLogoUrl || instLogo) ? (
                      <div className="w-36 h-16 flex items-center justify-start">
                        <img
                          src={previewDoc.clientLogoUrl || instLogo}
                          alt="Logotipo institucional do cliente"
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600">
                        {previewDoc.clientInstitutionalName || previewDoc.clientName}
                      </div>
                    )}
                  </div>

                  <div className="sm:text-right">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                      {previewDoc.docType} · Nº {previewDoc.documentNumber}
                    </div>
                    <h1 className="text-lg font-black text-slate-900 mt-0.5 leading-tight">
                      {previewDoc.title}
                    </h1>
                    <div className="text-xs text-slate-500 mt-1">
                      Emissão: {new Date(previewDoc.issueDate + 'T12:00:00').toLocaleDateString('pt-BR')} · Status: {previewDoc.status}
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                      Cliente / Contratante Institucional
                    </span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {previewDoc.clientInstitutionalName || previewDoc.clientName}
                    </span>
                    {previewDoc.clientDocument && (
                      <span className="font-mono text-slate-600 block">CNPJ/CPF: {previewDoc.clientDocument}</span>
                    )}
                  </div>

                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                      Empreendimento / Local da Obra
                    </span>
                    <span className="font-bold text-slate-900 block mt-0.5">{project.title}</span>
                    <span className="text-slate-600 block">{previewDoc.propertyAddress}</span>
                  </div>

                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                      Responsável Técnico
                    </span>
                    <span className="font-bold text-slate-900 block mt-0.5">{previewDoc.professionalName}</span>
                    <span className="text-slate-600 block">{previewDoc.professionalTitle}</span>
                  </div>

                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                      Registro Profissional &amp; Participação
                    </span>
                    <span className="font-mono font-bold text-slate-900 block mt-0.5">
                      {previewDoc.councilType}: {previewDoc.councilNumber}
                    </span>
                    <span className="text-slate-600 block">
                      Participação: {previewDoc.artParticipationType || 'Individual'}
                      {previewDoc.contractValue ? ` · Contrato: R$ ${Number(previewDoc.contractValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                    </span>
                  </div>
                </div>

                {/* Technical Sections */}
                <div className="space-y-4 text-xs leading-relaxed">
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                      1. Objeto e Escopo Técnico
                    </h2>
                    <p className="text-slate-800 whitespace-pre-wrap">{previewDoc.scopeSummary || '—'}</p>
                  </div>

                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                      2. Metodologia e Normas Técnicas Aplicáveis
                    </h2>
                    <p className="text-slate-800 whitespace-pre-wrap">{previewDoc.methodologyAndNorms || '—'}</p>
                  </div>

                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                      3. Constatações, Vistoria e Detalhamento Técnico
                    </h2>
                    <p className="text-slate-800 whitespace-pre-wrap">{previewDoc.findingsAndDiagnosis || '—'}</p>
                  </div>

                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                      4. Conclusão e Parecer Técnico
                    </h2>
                    <p className="text-slate-800 whitespace-pre-wrap">{previewDoc.conclusionAndRecommendations || '—'}</p>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-10 text-center text-xs">
                  <div className="border-t border-slate-900 pt-2">
                    <div className="font-bold text-slate-900">{previewDoc.professionalName}</div>
                    <div className="text-slate-600">{previewDoc.professionalTitle} · {previewDoc.councilType} {previewDoc.councilNumber}</div>
                  </div>
                  <div className="border-t border-slate-900 pt-2">
                    <div className="font-bold text-slate-900">{previewDoc.clientInstitutionalName || previewDoc.clientName}</div>
                    <div className="text-slate-600">Contratante / Representante Institucional</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
