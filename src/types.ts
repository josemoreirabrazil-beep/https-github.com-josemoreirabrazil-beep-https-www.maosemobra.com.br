export type ProjectStatus = 'Planejamento' | 'Em Andamento' | 'Pausada' | 'Concluída';
export type ProjectType = 'Residencial' | 'Comercial' | 'Reforma' | 'Construção Nova' | 'Industrial';

export interface Project {
  id: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientInstitutionalName?: string;
  clientDocument?: string;
  clientLogoUrl?: string;
  address: string;
  type: ProjectType;
  budgetTotal: number;
  startDate: string;
  estimatedEndDate: string;
  status: ProjectStatus;
  notes: string;
  preConstructionChecklist?: ChecklistItem[];
  driveFolderId?: string;
  driveFolderName?: string;
  createdAt: string;
}

export type WeatherType = 'Ensolarado' | 'Parcialmente Nublado' | 'Chuvoso' | 'Tempestade' | 'Nublado';

export interface LaborCount {
  role: string;
  count: number;
}

export interface PhotoAttachment {
  id: string;
  url: string;
  name: string;
  caption: string;
  driveFileId?: string;
  uploadedAt: string;
}

export interface DailyLog {
  id: string;
  projectId: string;
  date: string;
  weather: WeatherType;
  labor: LaborCount[];
  servicesExecuted: string;
  occurrences: string;
  notes: string;
  photos: PhotoAttachment[];
  aiSummary?: string;
  driveDocId?: string;
  reminderTime?: string;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'Materiais Básicos' 
  | 'Acabamentos' 
  | 'Mão de Obra' 
  | 'Instalações Elétricas & Hidráulicas' 
  | 'Equipamentos & Caçambas' 
  | 'Mobilização & Desmobilização' 
  | 'Transporte & Deslocamento' 
  | 'Alimentação & Hospedagem (Fora da Cidade)' 
  | 'Projetos, Taxas & Alvarás' 
  | 'Entrada / Aporte do Solicitante'
  | 'Outros';

export type PaymentStatus = 'Pendente' | 'Pago' | 'Parcial';
export type TransactionType = 'Despesa' | 'Receita';

export interface Expense {
  id: string;
  projectId: string;
  description: string;
  category: ExpenseCategory;
  type?: TransactionType; // 'Despesa' (saída de caixa) ou 'Receita' (entrada de caixa / recebido)
  phaseId?: string;
  plannedAmount: number;
  actualAmount: number;
  status: PaymentStatus;
  date: string;
  supplier: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  driveReceiptFileId?: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  deadline?: string;
}

export type PhaseTaskChecklist = ChecklistItem;

export type PhaseStatus = 'Não iniciada' | 'Em andamento' | 'Atrasada' | 'Concluída' | 'Planejamento';

export interface Phase {
  id: string;
  projectId: string;
  title: string;
  order: number;
  startDate: string;
  endDate: string;
  progressPercentage: number;
  status: PhaseStatus;
  color?: string;
  checklist: ChecklistItem[];
  notes?: string;
}

export interface TeamMember {
  id: string;
  projectId?: string;
  name: string;
  role: string;
  category?: 'labor' | 'supplier' | 'technical' | 'Equipe' | 'Fornecedor' | 'Prestador Especializado';
  phone?: string;
  email?: string;
  company?: string;
  dailyRate?: number;
  rating?: number;
  notes?: string;
}

export type TeamMemberOrSupplier = TeamMember;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  modifiedTime: string;
  size?: string;
  thumbnailLink?: string;
}

export type DriveFile = DriveFileItem;

export interface MaterialCalcResult {
  title: string;
  items: { name: string; quantity: number; unit: string; description: string }[];
  mixRatio?: string;
  recommendations: string[];
  lossMarginPct: number;
}

export interface ProposalServiceItem {
  id: string;
  description: string;
  category: ExpenseCategory;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface LogisticsQuote {
  mobilizationAmount: number; // Mobilização e desmobilização de ferramentas, andaimes e equipe
  transportAmount: number; // Combustível, transporte, pedágios ou fretes
  isOutOfTown: boolean; // Serviço executado fora da cidade base
  distanceKm?: number;
  teamSize: number; // Quantidade de profissionais na equipe
  daysCount: number; // Quantidade de diárias / dias úteis
  dailyMealRate: number; // Valor de alimentação diária por pessoa (R$/dia)
  totalMealsAmount: number; // teamSize * daysCount * dailyMealRate
  dailyLodgingRate: number; // Valor de hospedagem / pousada por pessoa (R$/noite)
  totalLodgingAmount: number; // teamSize * daysCount * dailyLodgingRate
  totalLogisticsAmount: number; // mobilization + transport + meals + lodging
  logisticsNotes?: string;
}

export interface ProposalQuote {
  id: string;
  projectId: string;
  serviceRequestId?: string;
  proposalNumber?: string;
  clientName: string;
  clientPhone?: string;
  clientCity?: string;
  clientAddress?: string;
  professionalName: string;
  professionalPhone: string;
  professionalCity?: string;
  professionalEmail?: string;
  professionalPixKey?: string;
  proposalDate: string;
  validityDays: number;
  paymentTerms: string;
  executionDays: number;
  items: ProposalServiceItem[];
  laborTotal: number;
  materialsTotal: number;
  logistics: LogisticsQuote;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export type ServiceRequestStatus = 
  | 'Pendente de Orçamento' 
  | 'Orçado pelo Profissional' 
  | 'Aprovado pelo Solicitante' 
  | 'Em Execução' 
  | 'Concluído';

export interface ServiceRequest {
  id: string;
  projectId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  city: string;
  state: string;
  address: string;
  isOutOfTown: boolean;
  distanceKm?: number;
  title: string;
  category: string;
  description: string;
  urgency: 'Normal' | 'Alta' | 'Urgente';
  priority?: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
  executionDueDate?: string;
  estimatedScope?: string;
  desiredStartDate?: string;
  photos?: string[];
  status: ServiceRequestStatus;
  createdAt: string;
  appliedQuote?: ProposalQuote;
}

export interface AdminMasterUser {
  username: string;
  email: string;
  cpf: string;
  name: string;
  role: 'SUPER_ADMIN_MASTER_GLOBAL';
  pixKey: string;
  phone: string;
  token?: string;
  authenticatedAt?: string;
  ipAddress?: string;
  permissions: string[];
}

export interface SecurityShieldStatus {
  activeArmor: boolean;
  protectionLevel: 'ULTRA_SHIELD_MAX' | 'STRICT' | 'STANDARD';
  sslEncryption: string;
  blockedThreatsCount: number;
  firewalledRequestsCount: number;
  rateLimiterActive: boolean;
  bruteForceGuardActive: boolean;
  antiTamperActive: boolean;
  xssSanitizerActive: boolean;
  lastAuditTime: string;
  serverUptimeSeconds: number;
  environment: string;
}

export type SecurityAuditLogType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_BLOCKED'
  | 'BRUTE_FORCE_THROTTLED'
  | 'INJECTION_ATTEMPT_BLOCKED'
  | 'DATA_EXPORT'
  | 'SECURITY_SCAN'
  | 'CONFIG_CHANGE'
  | 'BALANCE_ACCESS_VIEW'
  | 'BALANCE_WITHDRAW_ATTEMPT'
  | 'BALANCE_ACCESS_DENIED'
  | 'PIX_AUTO_TRANSFER'
  | 'SENSITIVE_DATA_VIEW';

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  type: SecurityAuditLogType | string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
  ip: string;
  userAgent?: string;
  details: string;
  actorEmail?: string;
  actorName?: string;
  actorRole?: 'ADMIN_MASTER' | 'SUBSCRIBER' | 'USER' | 'VISITOR' | 'SYSTEM' | 'UNKNOWN';
  action?: string;
  resource?: string;
  authorized?: boolean;
  amountInvolved?: number;
}

export type SubscriberRole = 
  | 'Prestador de Serviço' 
  | 'Solicitante / Cliente' 
  | 'Construtora / Empreiteiro' 
  | 'Loja / Fornecedor' 
  | 'Técnico / Projetista';

export type SubscriberPlan = 
  | 'Gratuito Lançamento' 
  | 'Mensal Básico'
  | 'Mensal Pro' 
  | 'Mensal Construtor' 
  | 'Anual Construtor'
  | 'Personalizado';

export type SubscriberPaymentStatus = 
  | 'Aprovado' 
  | 'Pendente' 
  | 'Atrasado' 
  | 'Cancelado' 
  | 'Isento / Cortesia';

export type SubscriberPaymentMethod = 
  | 'PIX' 
  | 'Mercado Pago' 
  | 'Cartão de Crédito' 
  | 'Boleto' 
  | 'Dinheiro';

export type SubscriberBillingStatus =
  | 'Não Emitida'
  | 'Cobrança Emitida'
  | 'Enviada'
  | 'Pago no MP';

export interface SubscriberPeriodChargeItem {
  period: string;
  label: string;
  amount: number;
  status: 'Não Compensado (Refazer Checkout)' | 'Pago';
}

export interface SubscriberPayment {
  id: string;
  subscriberName: string;
  subscriberEmail: string;
  subscriberPhone: string;
  subscriberRole: SubscriberRole;
  planType: SubscriberPlan;
  unitPlanAmount?: number;
  periodsCount?: number;
  periodsLabel?: string;
  periodsBreakdown?: SubscriberPeriodChargeItem[];
  amount: number;
  method: SubscriberPaymentMethod;
  status: SubscriberPaymentStatus;
  paymentDate: string;
  dueDate: string;
  reference: string;
  notes?: string;
  transactionId?: string;
  projectCount?: number;
  billingStatus?: SubscriberBillingStatus;
  billingLink?: string;
  pixTicketUrl?: string;
  pixCopyPaste?: string;
  mpPreferenceId?: string;
  mpPaymentId?: string | number;
  billingExternalRef?: string;
  billingEmittedAt?: string;
  billingSentAt?: string;
  billingChannel?: 'WhatsApp' | 'Email' | 'Link Copiado' | string;
  billingMessage?: string;
  mpVerifiedStatus?: string;
}

export interface LiveMercadoPagoPayment {
  id: string | number;
  status: string;
  statusDetail?: string;
  amount: number;
  description?: string;
  externalReference?: string;
  payerEmail?: string;
  payerName?: string;
  paymentMethodId?: string;
  dateCreated?: string;
  dateApproved?: string;
  ticketUrl?: string;
}

export interface SubscriberCashflowSummary {
  totalCollected: number;
  pendingAmount: number;
  monthlyRecurringRevenue: number;
  totalSubscribers: number;
  activePaidSubscribers: number;
  freeTierSubscribers: number;
  overdueSubscribers: number;
  payingSubscribersCount?: number;
  totalPendingPeriodsCount?: number;
}

export interface RealSubscriberStatusItem {
  id: string;
  subscriberName: string;
  subscriberEmail?: string;
  subscriberPhone?: string;
  subscriberRole: SubscriberRole;
  planType: SubscriberPlan | string;
  amount: number;
  method: SubscriberPaymentMethod | string;
  status: SubscriberPaymentStatus | string;
  paymentDate: string;
  dueDate: string;
  billingStatus?: SubscriberBillingStatus;
  mpVerifiedStatus?: string;
  mpPaymentId?: string | number;
  projectCount?: number;
  isActive: boolean;
  verificationBadge:
    | 'Pago Confirmado no MP'
    | 'Ativo no Sistema'
    | 'Cadastro Gratuito Ativo'
    | 'Cobrança Pendente'
    | 'Em Atraso'
    | 'Cancelado';
}

export interface RealSubscribersStatusResponse {
  success: boolean;
  checkedAt: string;
  summary: {
    totalEnrolledSubscribers: number;
    activePaidSubscribers: number;
    activeFreeSubscribers: number;
    pendingSubscribers: number;
    overdueSubscribers: number;
    mpVerifiedPaidSubscribers: number;
  };
  mpLiveStats: {
    configured: boolean;
    totalPaymentsInMp: number;
    approvedPaymentsInMp: number;
    pendingPaymentsInMp: number;
    recurringSubscriptionsActiveInMp: number;
    recurringSubscriptionsPendingInMp: number;
    activeMpPlansCount: number;
    liveApprovedPayments: LiveMercadoPagoPayment[];
    liveRecurringSubscriptions: Array<{
      id: string;
      reason: string;
      status: string;
      amount: number;
      payerEmail?: string;
      dateCreated?: string;
    }>;
  };
  subscribers: RealSubscriberStatusItem[];
}

export interface SubscriptionPlanPricing {
  id: string;
  name: string;
  code: string;
  price: number;
  billingCycle: 'Mensal' | 'Anual' | 'Gratuito';
  isRecurring?: boolean;
  targetAudience: string;
  features: string[];
  activeSubscribersCount: number;
  updatedAt: string;
}

export type OpportunityType = 'Obra Residencial' | 'Reforma' | 'Projeto' | 'Manutenção' | 'Consultoria' | 'Subempreitada';
export type OpportunityStatus = 'Aberta' | 'Em Seleção' | 'Preenchida' | 'Cancelada';

export interface ConstructionOpportunity {
  id: string;
  title: string;
  location: string;
  city: string;
  state: string;
  budget?: string;
  type: OpportunityType;
  description: string;
  requirements: string[];
  postedAt: string;
  deadline?: string;
  status: OpportunityStatus;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  creatorRole?: 'Solicitante' | 'Contratante' | 'Empresa';
  category: string; // e.g. "Alvenaria", "Elétrica", "Pintura"
  urgency: 'Normal' | 'Alta' | 'Crítica';
}

export type ProviderAvailability = 'Disponível Imediato' | 'Disponível em 15 dias' | 'Agendamento Prévio' | 'Ocupado';

export interface ProviderReview {
  id: string;
  providerId: string;
  reviewerName: string;
  reviewerRole?: 'Solicitante' | 'Contratante' | 'Engenheiro' | 'Proprietário';
  projectName?: string;
  rating: number; // 1 a 5
  qualityRating?: number; // 1 a 5
  punctualityRating?: number; // 1 a 5
  costBenefitRating?: number; // 1 a 5
  comment: string;
  date: string;
  recommend: boolean;
}

export interface ServiceProviderProfile {
  id: string;
  name: string;
  companyOrTradeName?: string;
  category: string; // e.g. "Pedreiro / Alvenaria", "Eletricista", "Pintor", "Mestre de Obras", etc.
  specialties: string[];
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  email?: string;
  dailyRate?: string;
  experienceYears: number;
  bio: string;
  availability: ProviderAvailability;
  rating: number;
  reviewsCount: number;
  reviews?: ProviderReview[];
  rankingBadge?: 'Top 1 Ouro' | 'Top 2 Prata' | 'Top 3 Bronze' | 'Destaque 5 Estrelas';
  documentType?: 'CPF' | 'CNPJ' | 'MEI';
  registeredAt: string;
  verified: boolean;
  pixKey?: string;
}

export type GoalType = 'Conclusão Física' | 'Economia de Orçamento' | 'Segurança/Zero Acidentes' | 'Qualidade/RDOs' | 'Outro';

export interface ProjectGoal {
  id: string;
  projectId: string;
  title: string;
  type: GoalType;
  targetValue: number; // e.g. 100 for 100% or R$ amount
  currentValue: number;
  unit: string; // e.g. "%", "R$", "RDOs"
  month: string; // "YYYY-MM"
  deadline?: string;
  createdAt: string;
}

export type CorporateContactRegion = 'SP' | 'RJ' | 'MG' | 'BA' | 'Nacional' | 'Internacional';
export type CorporateContactStatus = 
  | 'Pendente' 
  | 'Na Fila' 
  | 'Enviado' 
  | 'Recebido' 
  | 'Visualizado' 
  | 'Lido' 
  | 'Respondido';

export interface CorporateContact {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  region: CorporateContactRegion;
  status: CorporateContactStatus;
  category?: string;
  lastDispatchedAt?: string;
  dispatchChannel?: 'WhatsApp' | 'Email';
  receivedAt?: string;
  viewedAt?: string;
  readAt?: string;
  respondedAt?: string;
  responseText?: string;
  responseInterest?: 'Interessado' | 'Em Avaliação' | 'Cadastrado' | 'Sem Interesse';
  notes?: string;
}

export interface InvitationTemplate {
  id: string;
  title: string;
  subject: string;
  channel: 'WhatsApp' | 'Email';
  body: string;
}

export type TechnicalDocumentType =
  | 'Laudo Técnico'
  | 'ART (CREA)'
  | 'RRT (CAU)'
  | 'TRT (CFT/CRT)'
  | 'Vistoria Cautelar'
  | 'Laudo de Reforma (NBR 16280)';

export type TechnicalDocumentStatus = 'Rascunho' | 'Emitido' | 'Registrado' | 'Arquivado';

export interface TechnicalDocument {
  id: string;
  projectId: string;
  docType: TechnicalDocumentType;
  documentNumber: string;
  title: string;
  status: TechnicalDocumentStatus;
  issueDate: string;
  validityDate?: string;
  clientName: string;
  clientInstitutionalName?: string;
  clientDocument?: string;
  clientLogoUrl?: string;
  propertyAddress: string;
  professionalName: string;
  professionalTitle: string;
  councilType: 'CREA' | 'CAU' | 'CFT' | 'Outro';
  councilNumber: string;
  rnpNumber?: string;
  artParticipationType?: 'Individual' | 'Coautoria' | 'Corresponsabilidade' | 'Equipe';
  technicalActivity?: string;
  contractValue?: number;
  feeAmount?: number;
  scopeSummary: string;
  methodologyAndNorms: string;
  findingsAndDiagnosis: string;
  conclusionAndRecommendations: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebServiceCnaeActivity {
  code: string;
  description: string;
  lc116Code: string;
  lc116Description: string;
  issRate: number;
  category: 'Serviços Web';
  enabled: boolean;
  isPrimary?: boolean;
  customEndpoint?: string;
}

export interface DigitalCertificateProfile {
  id: string;
  companyName: string;
  cnpj: string;
  cnpjFormatted: string;
  certificateType: string;
  status: 'Ativo (Perfil A1 Vinculado)' | 'Ativo (.PFX Validado ICP-Brasil)' | 'Expirado' | 'Substituir';
  hasUploadedPfx: boolean;
  fileName?: string;
  subjectName: string;
  issuerName: string;
  serialNumber: string;
  thumbprintSha256: string;
  validFrom: string;
  validTo: string;
  uploadedAt?: string;
  lastVerifiedAt: string;
  cnpjMatchesEmitter: boolean;
}

export type FiscalApiProviderId =
  | 'prefeitura_abrasf_soap'
  | 'portal_nacional_nfse'
  | 'focus_nfe'
  | 'nfe_io'
  | 'plugnotas'
  | 'webhook_custom';

export interface FiscalApiIntegrationConfig {
  provider: FiscalApiProviderId;
  providerLabel: string;
  autoTransmitToProvider: boolean;
  productionEndpoint: string;
  homologacaoEndpoint: string;
  soapAction: string;
  useStoredCertificateMtls: boolean;
  hasApiToken: boolean;
  apiTokenMasked?: string;
  apiCompanyId: string;
  customHeaderName: string;
  lastConnectionTestAt?: string;
  lastConnectionStatus?: 'Conectado' | 'Falha na Conexão' | 'Não Testado';
  lastConnectionMessage?: string;
  lastCertificateSyncAt?: string;
}

export interface FiscalTransmissionInfo {
  provider: FiscalApiProviderId;
  providerLabel: string;
  transmissionStatus:
    | 'Autorizada na API'
    | 'Transmitida (Aguardando Retorno)'
    | 'Rejeitada pela API'
    | 'Assinada Localmente (Aguardando Conexão API)';
  usedStoredCertificateMtls: boolean;
  protocolNumber?: string;
  externalInvoiceId?: string;
  externalPdfUrl?: string;
  externalXmlUrl?: string;
  httpStatus?: number;
  requestEndpoint?: string;
  responseMessage?: string;
  lastAttemptAt?: string;
  authorizedAt?: string;
}

export interface FiscalTransmissionLog {
  id: string;
  timestamp: string;
  nfseId?: string;
  nfseNumber?: string;
  provider: FiscalApiProviderId;
  providerLabel: string;
  action: 'EMITIR_NFSE' | 'TESTE_CONEXAO' | 'SINCRONIZAR_CERTIFICADO' | 'CANCELAR_NFSE';
  endpoint: string;
  usedMtlsCertificate: boolean;
  success: boolean;
  httpStatus?: number;
  protocolNumber?: string;
  message: string;
}

export interface FiscalConfiguration {
  autoEmitOnPayment: boolean;
  environment: 'homologacao' | 'producao';
  regimeTributario: 'Simples Nacional' | 'MEI' | 'Lucro Presumido' | 'Lucro Real';
  inscricaoMunicipal: string;
  municipioNome: string;
  municipioIbge: string;
  uf: string;
  rpsSeries: string;
  nextRpsNumber: number;
  nextNfseNumber: number;
  defaultAliquotaIss: number;
  defaultWebActivityCode: string;
  serviceDescriptionTemplate: string;
  emailNotificationToClient: boolean;
  restrictToWebActivitiesOnly: true;
  companyName: string;
  cnpj: string;
  cnpjFormatted: string;
  certificateVaultEncrypted?: boolean;
  vaultSecretConfigured?: boolean;
  vaultCipherAlgorithm?: string;
  vaultKeyFingerprint?: string;
  vaultFilePersisted?: boolean;
  webActivities: WebServiceCnaeActivity[];
  certificate: DigitalCertificateProfile;
  apiIntegration?: FiscalApiIntegrationConfig;
}

export interface FiscalNfseRecord {
  id: string;
  nfseNumber: string;
  rpsNumber: number;
  rpsSeries: string;
  verificationCode: string;
  status: 'Autorizada' | 'Cancelada' | 'Erro';
  environment: 'homologacao' | 'producao';
  issuedAt: string;
  competenceDate: string;
  prestadorName: string;
  prestadorCnpj: string;
  prestadorIm?: string;
  tomadorName: string;
  tomadorEmail?: string;
  tomadorDocument?: string;
  tomadorRole?: string;
  cnaeCode: string;
  cnaeDescription: string;
  lc116Code: string;
  serviceDescription: string;
  grossAmount: number;
  aliquotaIss: number;
  issAmount: number;
  netAmount: number;
  paymentId?: string;
  paymentReference?: string;
  triggerSource: 'Automático (Pagamento Aprovado)' | 'Automático (Webhook Mercado Pago)' | 'Emissão Manual' | 'Emissão em Lote';
  certificateSubject: string;
  certificateThumbprint: string;
  xmlSignedDigest: string;
  xmlContent: string;
  transmission?: FiscalTransmissionInfo;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface FiscalNfseSummary {
  totalAuthorizedCount: number;
  totalCancelledCount: number;
  totalAuthorizedAmount: number;
  totalIssAmount: number;
  autoIssuedCount: number;
  approvedPaymentsPendingNfse: number;
  transmittedAuthorizedCount?: number;
  pendingTransmissionCount?: number;
  rejectedTransmissionCount?: number;
}

export interface WorkPermitChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface WorkPermit {
  id: string;
  projectId: string;
  permitNumber: string;
  workType: 'Trabalho em Altura (NR-35)' | 'Trabalho a Quente (Solda/Corte - NR-18)' | 'Espaço Confinado (NR-33)' | 'Serviços Elétricos (NR-10)' | 'Içamento de Cargas' | 'Escavação / Movimentação de Terra' | 'Outros';
  location: string;
  date: string;
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Integral (24h)';
  supervisorName: string;
  safetyTechnician: string;
  riskChecklist: WorkPermitChecklistItem[];
  ppeRequired: string[];
  workersList: string[];
  status: 'Pendente' | 'Liberada / Ativa' | 'Suspensa' | 'Encerrada';
  notes?: string;
  createdAt: string;
}

export interface DdsAttendee {
  name: string;
  role: string;
  signature: boolean;
}

export interface DdsRecord {
  id: string;
  projectId: string;
  ddsNumber: string;
  date: string;
  topic: string;
  speakerName: string;
  location: string;
  summary: string;
  attendees: DdsAttendee[];
  createdAt: string;
}

export interface ProjectGalleryPhoto {
  id: string;
  projectId: string;
  url: string;
  caption: string;
  folder: 'Fachada' | 'Estrutura' | 'Acabamento' | 'Instalações' | 'Segurança' | 'Geral';
  linkedToType?: 'RDO' | 'Laudo Técnico' | 'ART' | 'Nenhum';
  linkedToName?: string;
  capturedAt: string;
}



