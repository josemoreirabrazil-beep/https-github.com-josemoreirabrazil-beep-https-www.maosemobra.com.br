import type { Project, DailyLog, Expense, Phase, TeamMemberOrSupplier, ServiceRequest, ProposalQuote, ConstructionOpportunity, ServiceProviderProfile, CorporateContact } from '../types';
import { INITIAL_CORPORATE_CONTACTS } from '../data/corporateContacts';

const STORAGE_KEYS = {
  PROJECTS: 'maos_em_obra_projects',
  CURRENT_PROJECT_ID: 'maos_em_obra_current_project_id',
  RDOS: 'maos_em_obra_rdos',
  EXPENSES: 'maos_em_obra_expenses',
  PHASES: 'maos_em_obra_phases',
  TEAM: 'maos_em_obra_team',
  SERVICE_REQUESTS: 'maos_em_obra_service_requests',
  PROPOSALS: 'maos_em_obra_proposals',
  GOALS: 'maos_em_obra_goals',
  OPPORTUNITIES: 'maos_em_obra_opportunities',
  PROVIDERS: 'maos_em_obra_providers',
  CORPORATE_CONTACTS: 'maos_em_obra_corporate_contacts_v2',
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

export function loadGoals(projectId?: string): import('../types').ProjectGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    const allGoals: import('../types').ProjectGoal[] = raw ? JSON.parse(raw) : [];
    if (projectId) {
      return allGoals.filter(g => g.projectId === projectId);
    }
    return allGoals;
  } catch (e) {
    return [];
  }
}

export function saveGoals(projectId: string, goals: import('../types').ProjectGoal[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    const allGoals: import('../types').ProjectGoal[] = raw ? JSON.parse(raw) : [];
    const otherGoals = allGoals.filter(g => g.projectId !== projectId);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify([...otherGoals, ...goals]));
  } catch (e) {
    console.error(e);
  }
}

export const INITIAL_OPPORTUNITIES: ConstructionOpportunity[] = [
  {
    id: 'opp-1',
    title: 'Instalação Elétrica - Prédio Residencial',
    location: 'Bairro Jardim, Santo André',
    city: 'Santo André',
    state: 'SP',
    budget: 'R$ 18.000',
    type: 'Obra Residencial',
    category: 'Elétrica',
    description: 'Execução completa de infraestrutura elétrica para 12 apartamentos de um novo empreendimento. Inclui passagem de fiação, montagem de quadros e instalação de luminárias nas áreas comuns.',
    requirements: ['Registro no CFT/CREA', 'Experiência comprovada em prédios', 'Ferramental próprio', 'Equipe mínima de 3 pessoas'],
    postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    deadline: '2026-11-15',
    status: 'Aberta',
    companyName: 'Moreira Construções Ltda',
    contactName: 'Eng. Ricardo Moreira',
    contactPhone: '(11) 98765-4321',
    creatorRole: 'Contratante',
    urgency: 'Alta'
  },
  {
    id: 'opp-2',
    title: 'Reforma de Fachada Comercial & Pastilhas',
    location: 'Av. Paulista, São Paulo',
    city: 'São Paulo',
    state: 'SP',
    budget: 'R$ 24.500',
    type: 'Reforma',
    category: 'Pintura',
    description: 'Recuperação de pastilhas e pintura de fachada de loja comercial. Trabalho em altura (necessário NR-35). Área total aproximada de 450m².',
    requirements: ['Certificação NR-35 em dia', 'Seguro de vida para equipe', 'CNPJ/MEI ativo', 'Referências de serviços similares'],
    postedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    deadline: '2026-11-10',
    status: 'Aberta',
    companyName: 'Retail Solutions Engenharia',
    contactName: 'Mariana Costa',
    contactPhone: '(11) 99988-7766',
    creatorRole: 'Empresa',
    urgency: 'Normal'
  },
  {
    id: 'opp-3',
    title: 'Alvenaria Estrutural & Reboco em 4 Geminadas',
    location: 'Condomínio Solar, Itatiba',
    city: 'Itatiba',
    state: 'SP',
    budget: 'R$ 120,00 por m²',
    type: 'Subempreitada',
    category: 'Alvenaria',
    description: 'Levantamento de alvenaria estrutural e reboco técnico para 4 casas geminadas. Projeto estrutural já aprovado e blocos no local. Início imediato.',
    requirements: ['Equipe especializada em alvenaria estrutural', 'Leitura técnica de projetos', 'MEI ou Contrato Social'],
    postedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    deadline: '2026-11-05',
    status: 'Aberta',
    companyName: 'Inova Obras Construtora',
    contactName: 'Carlos Augusto Mendes',
    contactPhone: '(11) 91234-5678',
    creatorRole: 'Contratante',
    urgency: 'Crítica'
  },
  {
    id: 'opp-4',
    title: 'Instalação Hidráulica PPR e Esgoto em 3 Banheiros',
    location: 'Cambuí, Campinas',
    city: 'Campinas',
    state: 'SP',
    budget: 'R$ 5.800',
    type: 'Reforma',
    category: 'Hidráulica',
    description: 'Substituição completa de prumadas e tubulações antigas de ferro por PPR termofusão e PVC esgoto série R em sobrado residencial.',
    requirements: ['Termofusora própria', 'Garantia de estanqueidade', 'Experiência comprovada em reformas'],
    postedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    deadline: '2026-11-08',
    status: 'Aberta',
    companyName: 'Residência Família Silva',
    contactName: 'Dr. Roberto Silva',
    contactPhone: '(19) 99234-8765',
    creatorRole: 'Solicitante',
    urgency: 'Alta'
  },
  {
    id: 'opp-5',
    title: 'Forro Drywall Acústico & Sancas com Fita LED',
    location: 'Rudge Ramos, São Bernardo do Campo',
    city: 'São Bernardo do Campo',
    state: 'SP',
    budget: 'R$ 8.200',
    type: 'Reforma',
    category: 'Gesso / Drywall',
    description: 'Execução de forro de drywall em 140m² de residência térrea, com rebaixamento e tabica perimetral, além de nichos iluminados na sala.',
    requirements: ['Laser de nível próprio', 'Pistola finca-pinos', 'Pontualidade de entrega'],
    postedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    deadline: '2026-11-18',
    status: 'Aberta',
    companyName: 'Studio Arquitetura & Interiores',
    contactName: 'Arq. Camila Ferreira',
    contactPhone: '(11) 98112-3344',
    creatorRole: 'Contratante',
    urgency: 'Normal'
  }
];

export const INITIAL_PROVIDERS: ServiceProviderProfile[] = [
  {
    id: 'prov-2',
    name: 'Marcos Paulo Ferreira',
    companyOrTradeName: 'MP Instalações Elétricas',
    category: 'Eletricista',
    specialties: ['Instalações Prediais', 'Quadros Trifásicos', 'Padrão Enel', 'Infraestrutura Drywall'],
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 97654-3210',
    whatsapp: '11976543210',
    email: 'marcos.eletrica.sp@gmail.com',
    dailyRate: 'R$ 260 / diária',
    experienceYears: 12,
    bio: 'Eletrotécnico com registro no CFT. Especialista em montagem de quadros de distribuição, cabeamento estruturado e laudos elétricos conforme NBR 5410.',
    availability: 'Disponível Imediato',
    rating: 5.0,
    reviewsCount: 58,
    rankingBadge: 'Top 1 Ouro',
    documentType: 'CNPJ',
    registeredAt: '2026-02-10',
    verified: true,
    pixKey: 'marcos.eletrica.sp@gmail.com',
    reviews: [
      {
        id: 'rev-201',
        providerId: 'prov-2',
        reviewerName: 'Eng. Roberto Albuquerque',
        reviewerRole: 'Engenheiro',
        projectName: 'Prédio Residencial Moema (12 aptos)',
        rating: 5,
        qualityRating: 5,
        punctualityRating: 5,
        costBenefitRating: 5,
        comment: 'Excelente profissional! Refez todo o quadro geral de disjuntores e distribuição com absoluto capricho e identificação clara dos circuitos. Recomendo de olhos fechados.',
        date: '2026-03-12',
        recommend: true
      },
      {
        id: 'rev-202',
        providerId: 'prov-2',
        reviewerName: 'Juliana Mendes',
        reviewerRole: 'Proprietário',
        projectName: 'Reforma Completa de Fiação em Casa',
        rating: 5,
        qualityRating: 5,
        punctualityRating: 5,
        costBenefitRating: 5,
        comment: 'Pontualíssimo e muito educado. Trouxe todos os equipamentos e deixou o canteiro limpo todos os dias. 5 estrelas merecidas!',
        date: '2026-02-28',
        recommend: true
      }
    ]
  },
  {
    id: 'prov-6',
    name: 'Eng. Fernando Albuquerque',
    companyOrTradeName: 'Albuquerque Engenharia & Projetos',
    category: 'Engenheiro Civil',
    specialties: ['Responsabilidade Técnica (ART)', 'Laudos de Reforma (NBR 16280)', 'Cálculo Estrutural', 'Gerenciamento de Obras'],
    city: 'Santo André',
    state: 'SP',
    phone: '(11) 99345-6789',
    whatsapp: '11993456789',
    email: 'fernando@albuquerque.eng.br',
    dailyRate: 'R$ 480 / visita técnica',
    experienceYears: 15,
    bio: 'Engenheiro Civil formado pela Poli-USP com registro ativo no CREA-SP. Emissão ágil de ARTs, vistorias prediais e acompanhamento técnico rigoroso.',
    availability: 'Disponível Imediato',
    rating: 5.0,
    reviewsCount: 64,
    rankingBadge: 'Top 2 Prata',
    documentType: 'CNPJ',
    registeredAt: '2026-01-05',
    verified: true,
    pixKey: 'fernando@albuquerque.eng.br',
    reviews: [
      {
        id: 'rev-601',
        providerId: 'prov-6',
        reviewerName: 'Condomínio Parque das Flores',
        reviewerRole: 'Contratante',
        projectName: 'Laudo Pericial Estrutural de Fachada',
        rating: 5,
        qualityRating: 5,
        punctualityRating: 5,
        costBenefitRating: 5,
        comment: 'Emitiu a ART e o relatório fotográfico técnico em menos de 48h. Evitou problemas com a prefeitura e orientou com muita segurança.',
        date: '2026-03-20',
        recommend: true
      }
    ]
  },
  {
    id: 'prov-1',
    name: 'Carlos Eduardo Rocha',
    companyOrTradeName: 'Rocha Construção Civil',
    category: 'Mestre de Obras / Alvenaria',
    specialties: ['Alvenaria Estrutural', 'Fundações', 'Lajes & Ferragens', 'Reboco Desempenado'],
    city: 'Santo André',
    state: 'SP',
    phone: '(11) 98722-1100',
    whatsapp: '11987221100',
    email: 'carlos.rocha.obras@gmail.com',
    dailyRate: 'R$ 320 / diária',
    experienceYears: 18,
    bio: 'Mestre de obras com vasta experiência em gestão de equipes, leitura minuciosa de projetos estruturais e entrega rigorosa no cronograma.',
    availability: 'Disponível Imediato',
    rating: 4.9,
    reviewsCount: 42,
    rankingBadge: 'Top 3 Bronze',
    documentType: 'MEI',
    registeredAt: '2026-01-15',
    verified: true,
    pixKey: '11987221100',
    reviews: [
      {
        id: 'rev-101',
        providerId: 'prov-1',
        reviewerName: 'Marcelo Pires',
        reviewerRole: 'Contratante',
        projectName: 'Construção de Sobrado 180m²',
        rating: 5,
        qualityRating: 5,
        punctualityRating: 5,
        costBenefitRating: 4,
        comment: 'O Mestre Carlos é o líder de obra mais competente que já contratei. Alinhamento de paredes e prumo sem nenhum defeito.',
        date: '2026-03-05',
        recommend: true
      },
      {
        id: 'rev-102',
        providerId: 'prov-1',
        reviewerName: 'Construtora Vale Real',
        reviewerRole: 'Solicitante',
        projectName: 'Alvenaria Estrutural 3 Casas',
        rating: 4.8,
        qualityRating: 5,
        punctualityRating: 4.5,
        costBenefitRating: 5,
        comment: 'Equipe muito produtiva, cumpriu a meta de fiadas diárias conforme cronograma. Voltaremos a contratar.',
        date: '2026-02-15',
        recommend: true
      }
    ]
  },
  {
    id: 'prov-4',
    name: 'Lucas Silveira',
    companyOrTradeName: 'Silveira Hidráulica & Desentupimento',
    category: 'Hidráulica',
    specialties: ['Termofusão PPR', 'Tubulação Tigre / Amanco', 'Gás Encanado', 'Válvula Hydra'],
    city: 'Campinas',
    state: 'SP',
    phone: '(19) 98234-5678',
    whatsapp: '19982345678',
    email: 'silveira.hidro@gmail.com',
    dailyRate: 'R$ 240 / diária',
    experienceYears: 14,
    bio: 'Especialista em tubulações prediais e residenciais de água quente e fria, detecção eletrônica de vazamentos e testes de estanqueidade.',
    availability: 'Disponível Imediato',
    rating: 4.9,
    reviewsCount: 27,
    rankingBadge: 'Destaque 5 Estrelas',
    documentType: 'MEI',
    registeredAt: '2026-02-20',
    verified: true,
    pixKey: '19982345678',
    reviews: [
      {
        id: 'rev-401',
        providerId: 'prov-4',
        reviewerName: 'Dra. Silvia Queiroz',
        reviewerRole: 'Proprietário',
        projectName: 'Instalação de Tubulação de Água Quente PPR',
        rating: 5,
        qualityRating: 5,
        punctualityRating: 5,
        costBenefitRating: 5,
        comment: 'Resolveu um vazamento crônico que dois encanadores anteriores não conseguiram achar. Fez teste de pressão e deixou tudo perfeito.',
        date: '2026-03-18',
        recommend: true
      }
    ]
  },
  {
    id: 'prov-3',
    name: 'Gilberto Santos',
    companyOrTradeName: 'Santos Pinturas & Acabamentos',
    category: 'Pintor',
    specialties: ['Pintura Airless', 'Cimento Queimado', 'Textura Projetada', 'Verniz & Esmalte'],
    city: 'São Caetano do Sul',
    state: 'SP',
    phone: '(11) 99123-4567',
    whatsapp: '11991234567',
    email: 'gilberto.pinturas@hotmail.com',
    dailyRate: 'R$ 220 / diária',
    experienceYears: 9,
    bio: 'Pintor profissional com maquinário Airless de alta produtividade. Acabamento fino sem respingos, mascaramento de pisos e entrega limpa.',
    availability: 'Disponível em 15 dias',
    rating: 4.8,
    reviewsCount: 31,
    rankingBadge: 'Destaque 5 Estrelas',
    documentType: 'MEI',
    registeredAt: '2026-03-01',
    verified: true,
    pixKey: '11991234567',
    reviews: [
      {
        id: 'rev-301',
        providerId: 'prov-3',
        reviewerName: 'Eduardo Antunes',
        reviewerRole: 'Proprietário',
        projectName: 'Pintura Interna e Cimento Queimado',
        rating: 5,
        qualityRating: 5,
        punctualityRating: 4.5,
        costBenefitRating: 5,
        comment: 'O cimento queimado da parede da sala ficou impecável! Protegeu todo o piso de madeira com lona e fita crepe.',
        date: '2026-03-10',
        recommend: true
      }
    ]
  },
  {
    id: 'prov-5',
    name: 'Arlete Cristina Souza',
    companyOrTradeName: 'ArtGesso Interiores',
    category: 'Gesso / Drywall',
    specialties: ['Drywall Paredes & Forros', 'Sancas Iluminadas', 'Nichos Decorativos', 'Tratamento de Juntas Knauf'],
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 98456-7890',
    whatsapp: '11984567890',
    email: 'arlete.gesso@gmail.com',
    dailyRate: 'R$ 210 / diária',
    experienceYears: 8,
    bio: 'Instaladora profissional de sistemas Drywall e gesso acartonado. Nivelamento a laser de precisão milimétrica e acabamento perfeito para pintura.',
    availability: 'Agendamento Prévio',
    rating: 4.9,
    reviewsCount: 19,
    rankingBadge: 'Destaque 5 Estrelas',
    documentType: 'MEI',
    registeredAt: '2026-04-05',
    verified: true,
    pixKey: '11984567890',
    reviews: [
      {
        id: 'rev-501',
        providerId: 'prov-5',
        reviewerName: 'Patrícia Fontes',
        reviewerRole: 'Proprietário',
        projectName: 'Forro com Cortineiro Iluminado',
        rating: 5,
        qualityRating: 5,
        punctualityRating: 5,
        costBenefitRating: 5,
        comment: 'Muito caprichosa no tratamento das juntas do gesso. O pintor elogiou que não precisou de quase nenhuma correção de massa.',
        date: '2026-04-12',
        recommend: true
      }
    ]
  }
];

export function loadOpportunities(): ConstructionOpportunity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(INITIAL_OPPORTUNITIES));
      return INITIAL_OPPORTUNITIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_OPPORTUNITIES;
  }
}

export function saveOpportunities(opportunities: ConstructionOpportunity[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(opportunities));
  } catch (e) {
    console.error(e);
  }
}

export function loadServiceProviders(): ServiceProviderProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROVIDERS);
    let providers: ServiceProviderProfile[] = raw ? JSON.parse(raw) : INITIAL_PROVIDERS;
    
    // Merge or hydrate reviews if not present in localStorage
    providers = providers.map(p => {
      const initialMatch = INITIAL_PROVIDERS.find(init => init.id === p.id);
      const reviews = (p.reviews && p.reviews.length > 0) 
        ? p.reviews 
        : (initialMatch?.reviews || []);
      
      const reviewsCount = p.reviewsCount || reviews.length || 1;
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : p.rating || 5.0;

      return {
        ...p,
        reviews,
        reviewsCount,
        rating: Number(avgRating.toFixed(1))
      };
    });

    // Assign ranking badges
    providers.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });

    providers = providers.map((p, idx) => {
      let badge: ServiceProviderProfile['rankingBadge'] = undefined;
      if (idx === 0) badge = 'Top 1 Ouro';
      else if (idx === 1) badge = 'Top 2 Prata';
      else if (idx === 2) badge = 'Top 3 Bronze';
      else if (p.rating >= 4.8) badge = 'Destaque 5 Estrelas';
      return { ...p, rankingBadge: badge };
    });

    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
    }
    return providers;
  } catch (e) {
    return INITIAL_PROVIDERS;
  }
}

export function saveServiceProviders(providers: ServiceProviderProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
  } catch (e) {
    console.error(e);
  }
}

export function loadCorporateContacts(): CorporateContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CORPORATE_CONTACTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CORPORATE_CONTACTS, JSON.stringify(INITIAL_CORPORATE_CONTACTS));
      return INITIAL_CORPORATE_CONTACTS;
    }
    const contacts: CorporateContact[] = JSON.parse(raw);
    // If stored array is smaller than the initial dataset (e.g. earlier test), merge to include full 300+
    if (contacts.length < INITIAL_CORPORATE_CONTACTS.length) {
      const existingMap = new Map(contacts.map(c => [c.id, c]));
      const merged = INITIAL_CORPORATE_CONTACTS.map(initial => existingMap.get(initial.id) || initial);
      localStorage.setItem(STORAGE_KEYS.CORPORATE_CONTACTS, JSON.stringify(merged));
      return merged;
    }
    return contacts;
  } catch (e) {
    return INITIAL_CORPORATE_CONTACTS;
  }
}

export function saveCorporateContacts(contacts: CorporateContact[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CORPORATE_CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    console.error('Failed to save corporate contacts', e);
  }
}

export function updateCorporateContactStatus(
  contactId: string, 
  status: CorporateContact['status'], 
  channel: 'WhatsApp' | 'Email' = 'WhatsApp'
): CorporateContact[] {
  const current = loadCorporateContacts();
  const updated = current.map(c => {
    if (c.id === contactId) {
      return {
        ...c,
        status,
        dispatchChannel: channel,
        lastDispatchedAt: new Date().toISOString(),
      };
    }
    return c;
  });
  saveCorporateContacts(updated);
  return updated;
}



