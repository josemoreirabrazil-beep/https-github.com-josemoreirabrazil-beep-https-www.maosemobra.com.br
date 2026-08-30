export type ProjectStatus = 'Planejamento' | 'Em Andamento' | 'Pausada' | 'Concluída';
export type ProjectType = 'Residencial' | 'Comercial' | 'Reforma' | 'Construção Nova' | 'Industrial';

export interface Project {
  id: string;
  title: string;
  clientName: string;
  address: string;
  type: ProjectType;
  budgetTotal: number;
  startDate: string;
  estimatedEndDate: string;
  status: ProjectStatus;
  notes: string;
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
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
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

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_BLOCKED' | 'BRUTE_FORCE_THROTTLED' | 'INJECTION_ATTEMPT_BLOCKED' | 'DATA_EXPORT' | 'SECURITY_SCAN' | 'CONFIG_CHANGE';
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
  ip: string;
  userAgent?: string;
  details: string;
}

export type SubscriberRole = 
  | 'Prestador de Serviço' 
  | 'Solicitante / Cliente' 
  | 'Construtora / Empreiteiro' 
  | 'Loja / Fornecedor' 
  | 'Técnico / Projetista';

export type SubscriberPlan = 
  | 'Gratuito Lançamento' 
  | 'Mensal Pro' 
  | 'Anual Construtor' 
  | 'Taxa de Proposta / Uso' 
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

export interface SubscriberPayment {
  id: string;
  subscriberName: string;
  subscriberEmail: string;
  subscriberPhone: string;
  subscriberRole: SubscriberRole;
  planType: SubscriberPlan;
  amount: number;
  method: SubscriberPaymentMethod;
  status: SubscriberPaymentStatus;
  paymentDate: string;
  dueDate: string;
  reference: string;
  notes?: string;
  transactionId?: string;
  projectCount?: number;
}

export interface SubscriberCashflowSummary {
  totalCollected: number;
  pendingAmount: number;
  monthlyRecurringRevenue: number;
  totalSubscribers: number;
  activePaidSubscribers: number;
  freeTierSubscribers: number;
  overdueSubscribers: number;
}

export interface SubscriptionPlanPricing {
  id: string;
  name: string;
  code: string;
  price: number;
  billingCycle: 'Mensal' | 'Anual' | 'Por Uso' | 'Gratuito';
  targetAudience: string;
  features: string[];
  activeSubscribersCount: number;
  updatedAt: string;
}

