// Sistema de Internacionalização (i18n) e Multilíngues - Mãos em Obra

export type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'pt-PT' | 'fr' | 'de' | 'it';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  currency: string;
  currencySymbol: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'pt-BR', name: 'Português (Brasil)', nativeName: 'Português (BR)', flag: '🇧🇷', currency: 'BRL', currencySymbol: 'R$' },
  { code: 'en', name: 'English (US)', nativeName: 'English', flag: '🇺🇸', currency: 'USD', currencySymbol: '$' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸', currency: 'EUR', currencySymbol: '€' },
  { code: 'pt-PT', name: 'Português (Portugal)', nativeName: 'Português (PT)', flag: '🇵🇹', currency: 'EUR', currencySymbol: '€' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷', currency: 'EUR', currencySymbol: '€' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪', currency: 'EUR', currencySymbol: '€' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹', currency: 'EUR', currencySymbol: '€' },
];

const STORAGE_KEY = 'maosemobra_selected_language';

// Listeners for reactive updates
type LanguageChangeListener = (lang: SupportedLanguage) => void;
const listeners = new Set<LanguageChangeListener>();

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'pt-BR';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      return saved;
    }
    // Auto-detect browser language if available
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('fr')) return 'fr';
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('it')) return 'it';
    if (browserLang === 'pt-pt') return 'pt-PT';
  } catch {
    // fallback
  }
  return 'pt-BR';
}

let currentLanguage: SupportedLanguage = getStoredLanguage();

export function setLanguage(lang: SupportedLanguage): void {
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  } catch (e) {
    console.warn('Storage error saving language:', e);
  }
  listeners.forEach(fn => fn(lang));
}

export function subscribeLanguageChange(listener: LanguageChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentLanguageInfo(): LanguageInfo {
  return SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];
}

// Translations dictionary
export const translations: Record<SupportedLanguage, Record<string, string>> = {
  'pt-BR': {
    'app.title': 'Mãos em Obra',
    'app.subtitle': 'Painel de Gerenciamento de Canteiro & Custos',
    'app.badge': 'Canteiro Pro',
    'nav.dashboard': 'Painel Geral',
    'nav.opportunities': 'Oportunidades & Prestadores',
    'nav.invitations': 'Disparo de Convites',
    'nav.requests': 'Solicitações & Logística',
    'nav.rdo': 'Diário de Obra (RDO)',
    'nav.financial': 'Orçamento & Custos',
    'nav.timeline': 'Cronograma & Fases',
    'nav.calculator': 'Calculadora & IA',
    'nav.drive': 'Google Drive',
    'nav.team': 'Equipe & Lojas',
    'nav.admin': 'Admin Master',
    'btn.withdraw': 'Sacar R$ 1.834,80 p/ Mercado Pago',
    'btn.withdrawShort': 'Sacar R$ 1.834,80',
    'btn.downloadApp': 'Baixar App',
    'btn.adminMaster': 'Admin Master',
    'btn.syncDrive': 'Backup no Drive',
    'btn.connectGoogle': 'Conectar Google',
    'btn.newProject': 'Nova Obra',
    'btn.editProject': 'Editar',
    'btn.languages': 'Multilíngues',
    'lang.selectTitle': 'Selecionar Idioma',
    'status.inProgress': 'Em Andamento',
    'status.completed': 'Concluída',
    'status.planning': 'Planejamento',
    'status.paid': 'Pago',
    'status.pending': 'Pendente',
  },
  'en': {
    'app.title': 'Mãos em Obra',
    'app.subtitle': 'Construction Site & Cost Management Dashboard',
    'app.badge': 'Site Pro',
    'nav.dashboard': 'Overview',
    'nav.opportunities': 'Opportunities & Contractors',
    'nav.invitations': 'Batch Invitations',
    'nav.requests': 'Requests & Logistics',
    'nav.rdo': 'Daily Site Log (RDO)',
    'nav.financial': 'Budget & Expenses',
    'nav.timeline': 'Timeline & Phases',
    'nav.calculator': 'Calculator & AI',
    'nav.drive': 'Google Drive',
    'nav.team': 'Team & Suppliers',
    'nav.admin': 'Admin Master',
    'btn.withdraw': 'Withdraw R$ 1,834.80 to Mercado Pago',
    'btn.withdrawShort': 'Withdraw R$ 1,834.80',
    'btn.downloadApp': 'Download App',
    'btn.adminMaster': 'Admin Master',
    'btn.syncDrive': 'Drive Backup',
    'btn.connectGoogle': 'Connect Google',
    'btn.newProject': 'New Project',
    'btn.editProject': 'Edit',
    'btn.languages': 'Multilingual',
    'lang.selectTitle': 'Select Language',
    'status.inProgress': 'In Progress',
    'status.completed': 'Completed',
    'status.planning': 'Planning',
    'status.paid': 'Paid',
    'status.pending': 'Pending',
  },
  'es': {
    'app.title': 'Mãos em Obra',
    'app.subtitle': 'Panel de Gestión de Obras y Costos',
    'app.badge': 'Obra Pro',
    'nav.dashboard': 'Panel General',
    'nav.opportunities': 'Oportunidades y Proveedores',
    'nav.invitations': 'Envío de Invitaciones',
    'nav.requests': 'Solicitudes y Logística',
    'nav.rdo': 'Diario de Obra (RDO)',
    'nav.financial': 'Presupuesto y Costos',
    'nav.timeline': 'Cronograma y Fases',
    'nav.calculator': 'Calculadora e IA',
    'nav.drive': 'Google Drive',
    'nav.team': 'Equipo y Tiendas',
    'nav.admin': 'Admin Master',
    'btn.withdraw': 'Retirar R$ 1.834,80 a Mercado Pago',
    'btn.withdrawShort': 'Retirar R$ 1.834,80',
    'btn.downloadApp': 'Descargar App',
    'btn.adminMaster': 'Admin Master',
    'btn.syncDrive': 'Copia en Drive',
    'btn.connectGoogle': 'Conectar Google',
    'btn.newProject': 'Nueva Obra',
    'btn.editProject': 'Editar',
    'btn.languages': 'Multilingüe',
    'lang.selectTitle': 'Seleccionar Idioma',
    'status.inProgress': 'En Curso',
    'status.completed': 'Completada',
    'status.planning': 'Planificación',
    'status.paid': 'Pagado',
    'status.pending': 'Pendiente',
  },
  'pt-PT': {
    'app.title': 'Mãos em Obra',
    'app.subtitle': 'Painel de Gestão de Estaleiro & Custos de Obra',
    'app.badge': 'Estaleiro Pro',
    'nav.dashboard': 'Painel Geral',
    'nav.opportunities': 'Oportunidades & Empreiteiros',
    'nav.invitations': 'Disparo de Convites',
    'nav.requests': 'Pedidos & Logística',
    'nav.rdo': 'Diário de Obra (RDO)',
    'nav.financial': 'Orçamento & Despesas',
    'nav.timeline': 'Cronograma & Fases',
    'nav.calculator': 'Calculadora & IA',
    'nav.drive': 'Google Drive',
    'nav.team': 'Equipa & Lojas',
    'nav.admin': 'Admin Master',
    'btn.withdraw': 'Levantar R$ 1.834,80 p/ Mercado Pago',
    'btn.withdrawShort': 'Levantar R$ 1.834,80',
    'btn.downloadApp': 'Descarregar App',
    'btn.adminMaster': 'Admin Master',
    'btn.syncDrive': 'Cópia no Drive',
    'btn.connectGoogle': 'Ligar Google',
    'btn.newProject': 'Nova Obra',
    'btn.editProject': 'Editar',
    'btn.languages': 'Multilínguas',
    'lang.selectTitle': 'Selecionar Idioma',
    'status.inProgress': 'Em Execução',
    'status.completed': 'Concluída',
    'status.planning': 'Planeamento',
    'status.paid': 'Pago',
    'status.pending': 'Pendente',
  },
  'fr': {
    'app.title': 'Mãos em Obra',
    'app.subtitle': 'Tableau de bord de gestion de chantier et coûts',
    'app.badge': 'Chantier Pro',
    'nav.dashboard': 'Tableau de Bord',
    'nav.opportunities': 'Opportunités & Artisans',
    'nav.invitations': 'Envoi d\'Invitations',
    'nav.requests': 'Demandes & Logistique',
    'nav.rdo': 'Journal de Chantier',
    'nav.financial': 'Budget & Dépenses',
    'nav.timeline': 'Planning & Phases',
    'nav.calculator': 'Calculateur & IA',
    'nav.drive': 'Google Drive',
    'nav.team': 'Équipe & Magasins',
    'nav.admin': 'Admin Master',
    'btn.withdraw': 'Retirer R$ 1.834,80 vers Mercado Pago',
    'btn.withdrawShort': 'Retirer R$ 1.834,80',
    'btn.downloadApp': 'Télécharger l\'App',
    'btn.adminMaster': 'Admin Master',
    'btn.syncDrive': 'Sauvegarde Drive',
    'btn.connectGoogle': 'Connecter Google',
    'btn.newProject': 'Nouveau Projet',
    'btn.editProject': 'Modifier',
    'btn.languages': 'Multilingue',
    'lang.selectTitle': 'Choisir la Langue',
    'status.inProgress': 'En Cours',
    'status.completed': 'Terminé',
    'status.planning': 'Planification',
    'status.paid': 'Payé',
    'status.pending': 'En Attente',
  },
  'de': {
    'app.title': 'Mãos em Obra',
    'app.subtitle': 'Baustellen- & Kostenmanagement-Dashboard',
    'app.badge': 'Bau Pro',
    'nav.dashboard': 'Übersicht',
    'nav.opportunities': 'Aufträge & Handwerker',
    'nav.invitations': 'Einladungsversand',
    'nav.requests': 'Anfragen & Logistik',
    'nav.rdo': 'Bautagebuch',
    'nav.financial': 'Budget & Kosten',
    'nav.timeline': 'Zeitplan & Phasen',
    'nav.calculator': 'Rechner & KI',
    'nav.drive': 'Google Drive',
    'nav.team': 'Team & Lieferanten',
    'nav.admin': 'Admin Master',
    'btn.withdraw': 'R$ 1.834,80 auf Mercado Pago auszahlen',
    'btn.withdrawShort': 'R$ 1.834,80 auszahlen',
    'btn.downloadApp': 'App herunterladen',
    'btn.adminMaster': 'Admin Master',
    'btn.syncDrive': 'Drive-Sicherung',
    'btn.connectGoogle': 'Mit Google verbinden',
    'btn.newProject': 'Neues Projekt',
    'btn.editProject': 'Bearbeiten',
    'btn.languages': 'Mehrsprachig',
    'lang.selectTitle': 'Sprache auswählen',
    'status.inProgress': 'In Bearbeitung',
    'status.completed': 'Abgeschlossen',
    'status.planning': 'Planung',
    'status.paid': 'Bezahlt',
    'status.pending': 'Ausstehend',
  },
  'it': {
    'app.title': 'Mãos em Obra',
    'app.subtitle': 'Pannello di Gestione Cantiere & Costi',
    'app.badge': 'Cantiere Pro',
    'nav.dashboard': 'Panoramica',
    'nav.opportunities': 'Opportunità & Imprese',
    'nav.invitations': 'Invio Inviti',
    'nav.requests': 'Richieste & Logistica',
    'nav.rdo': 'Giornale dei Lavori',
    'nav.financial': 'Budget & Spese',
    'nav.timeline': 'Cronoprogramma & Fasi',
    'nav.calculator': 'Calcolatore & IA',
    'nav.drive': 'Google Drive',
    'nav.team': 'Squadra & Fornitori',
    'nav.admin': 'Admin Master',
    'btn.withdraw': 'Prelevare R$ 1.834,80 su Mercado Pago',
    'btn.withdrawShort': 'Prelevare R$ 1.834,80',
    'btn.downloadApp': 'Scarica App',
    'btn.adminMaster': 'Admin Master',
    'btn.syncDrive': 'Backup Drive',
    'btn.connectGoogle': 'Accedi con Google',
    'btn.newProject': 'Nuova Opera',
    'btn.editProject': 'Modifica',
    'btn.languages': 'Multilingue',
    'lang.selectTitle': 'Seleziona Lingua',
    'status.inProgress': 'In Corso',
    'status.completed': 'Completata',
    'status.planning': 'Pianificazione',
    'status.paid': 'Pagato',
    'status.pending': 'In Sospeso',
  },
};

export function t(key: string, fallback?: string): string {
  const langDict = translations[currentLanguage];
  if (langDict && langDict[key]) {
    return langDict[key];
  }
  const defaultDict = translations['pt-BR'];
  if (defaultDict && defaultDict[key]) {
    return defaultDict[key];
  }
  return fallback || key;
}
