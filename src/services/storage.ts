import type { Project, DailyLog, Expense, Phase, TeamMemberOrSupplier, ServiceRequest, ProposalQuote } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'maos_em_obra_projects',
  CURRENT_PROJECT_ID: 'maos_em_obra_current_project_id',
  RDOS: 'maos_em_obra_rdos',
  EXPENSES: 'maos_em_obra_expenses',
  PHASES: 'maos_em_obra_phases',
  TEAM: 'maos_em_obra_team',
  SERVICE_REQUESTS: 'maos_em_obra_service_requests',
  PROPOSALS: 'maos_em_obra_proposals',
};

export const INITIAL_SERVICE_REQUESTS: ServiceRequest[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_PHASES: Phase[] = [];
export const INITIAL_RDOS: DailyLog[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_TEAM: TeamMemberOrSupplier[] = [];

// Clean up any historical fake/simulated data stored in localStorage
function purgeLegacyMockData(): void {
  try {
    const rawProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (rawProjects && (rawProjects.includes('Mariana Silveira') || rawProjects.includes('Reforma Apartamento 402') || rawProjects.includes('Casa Contemporânea'))) {
      localStorage.removeItem(STORAGE_KEYS.PROJECTS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
      localStorage.removeItem(STORAGE_KEYS.PHASES);
      localStorage.removeItem(STORAGE_KEYS.RDOS);
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      localStorage.removeItem(STORAGE_KEYS.TEAM);
      localStorage.removeItem(STORAGE_KEYS.SERVICE_REQUESTS);
    }
    const rawTeam = localStorage.getItem(STORAGE_KEYS.TEAM);
    if (rawTeam && (rawTeam.includes('Mestre Zé') || rawTeam.includes('Telhanorte Marginal Tietê'))) {
      localStorage.removeItem(STORAGE_KEYS.TEAM);
    }
    const rawRequests = localStorage.getItem(STORAGE_KEYS.SERVICE_REQUESTS);
    if (rawRequests && (rawRequests.includes('Mariana Silveira') || rawRequests.includes('Eduardo Guimarães'))) {
      localStorage.removeItem(STORAGE_KEYS.SERVICE_REQUESTS);
    }
  } catch (e) {
    // Ignore storage check errors
  }
}

// Run cleanup immediately on module load
purgeLegacyMockData();

// Helper functions for storage
export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load projects from storage:', e);
    return [];
  }
}
export const getProjects = loadProjects;

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function loadCurrentProjectId(): string {
  const current = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
  if (current) return current;
  const projects = loadProjects();
  return projects[0]?.id || 'proj-1';
}

export function saveCurrentProjectId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, id);
}

export function loadPhases(projectId?: string): Phase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PHASES);
    const allPhases: Phase[] = raw ? JSON.parse(raw) : INITIAL_PHASES;
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PHASES, JSON.stringify(INITIAL_PHASES));
    }
    if (projectId) {
      return allPhases.filter(p => p.projectId === projectId);
    }
    return allPhases;
  } catch (e) {
    return INITIAL_PHASES;
  }
}
export const getPhases = loadPhases;

export function savePhases(projectIdOrPhases: string | Phase[], maybePhases?: Phase[]): void {
  try {
    if (typeof projectIdOrPhases === 'string') {
      const projectId = projectIdOrPhases;
      const phasesToSave = maybePhases || [];
      const raw = localStorage.getItem(STORAGE_KEYS.PHASES);
      const allPhases: Phase[] = raw ? JSON.parse(raw) : INITIAL_PHASES;
      const otherPhases = allPhases.filter(p => p.projectId !== projectId);
      localStorage.setItem(STORAGE_KEYS.PHASES, JSON.stringify([...otherPhases, ...phasesToSave]));
    } else {
      localStorage.setItem(STORAGE_KEYS.PHASES, JSON.stringify(projectIdOrPhases));
    }
  } catch (e) {
    console.error(e);
  }
}

export function loadRdos(projectId?: string): DailyLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RDOS);
    const allRdos: DailyLog[] = raw ? JSON.parse(raw) : INITIAL_RDOS;
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RDOS, JSON.stringify(INITIAL_RDOS));
    }
    if (projectId) {
      return allRdos.filter(r => r.projectId === projectId);
    }
    return allRdos;
  } catch (e) {
    return INITIAL_RDOS;
  }
}
export const getDailyLogs = loadRdos;

export function saveRdos(projectIdOrRdos: string | DailyLog[], maybeRdos?: DailyLog[]): void {
  try {
    if (typeof projectIdOrRdos === 'string') {
      const projectId = projectIdOrRdos;
      const rdosToSave = maybeRdos || [];
      const raw = localStorage.getItem(STORAGE_KEYS.RDOS);
      const allRdos: DailyLog[] = raw ? JSON.parse(raw) : INITIAL_RDOS;
      const otherRdos = allRdos.filter(r => r.projectId !== projectId);
      localStorage.setItem(STORAGE_KEYS.RDOS, JSON.stringify([...otherRdos, ...rdosToSave]));
    } else {
      localStorage.setItem(STORAGE_KEYS.RDOS, JSON.stringify(projectIdOrRdos));
    }
  } catch (e) {
    console.error(e);
  }
}
export const saveDailyLogs = saveRdos;

export function loadExpenses(projectId?: string): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const allExpenses: Expense[] = raw ? JSON.parse(raw) : INITIAL_EXPENSES;
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    }
    if (projectId) {
      return allExpenses.filter(e => e.projectId === projectId);
    }
    return allExpenses;
  } catch (e) {
    return INITIAL_EXPENSES;
  }
}
export const getExpenses = loadExpenses;

export function saveExpenses(projectIdOrExpenses: string | Expense[], maybeExpenses?: Expense[]): void {
  try {
    if (typeof projectIdOrExpenses === 'string') {
      const projectId = projectIdOrExpenses;
      const expensesToSave = maybeExpenses || [];
      const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const allExpenses: Expense[] = raw ? JSON.parse(raw) : INITIAL_EXPENSES;
      const otherExpenses = allExpenses.filter(e => e.projectId !== projectId);
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([...otherExpenses, ...expensesToSave]));
    } else {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(projectIdOrExpenses));
    }
  } catch (e) {
    console.error(e);
  }
}

export function clearProjectExpenses(projectId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const allExpenses: Expense[] = raw ? JSON.parse(raw) : [];
    const otherExpenses = allExpenses.filter(e => e.projectId !== projectId);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(otherExpenses));
  } catch (e) {
    console.error(e);
  }
}

export function bulkSaveProjectExpenses(projectId: string, newExpenses: Expense[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const allExpenses: Expense[] = raw ? JSON.parse(raw) : [];
    const otherExpenses = allExpenses.filter(e => e.projectId !== projectId);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([...otherExpenses, ...newExpenses]));
  } catch (e) {
    console.error(e);
  }
}

export function loadTeam(): TeamMemberOrSupplier[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEAM);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(INITIAL_TEAM));
      return INITIAL_TEAM;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_TEAM;
  }
}
export const getTeamMembers = loadTeam;

export function saveTeam(team: TeamMemberOrSupplier[]): void {
  localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
}
export const saveTeamMembers = saveTeam;

export function loadServiceRequests(): ServiceRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICE_REQUESTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(INITIAL_SERVICE_REQUESTS));
      return INITIAL_SERVICE_REQUESTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_SERVICE_REQUESTS;
  }
}

export function saveServiceRequests(requests: ServiceRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(requests));
  } catch (e) {
    console.error(e);
  }
}

export function loadProposals(): ProposalQuote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROPOSALS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveProposals(proposals: ProposalQuote[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals));
  } catch (e) {
    console.error(e);
  }
}

