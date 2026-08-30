import type { ExpenseCategory, Expense } from '../types';

export interface ServiceTemplateItem {
  description: string;
  category: ExpenseCategory;
  suggestedUnit: string;
  defaultQty: number;
}

export interface ServiceTemplateGroup {
  id: string;
  title: string;
  description: string;
  items: ServiceTemplateItem[];
}

export const BLANK_SERVICE_TEMPLATES: ServiceTemplateGroup[] = [
  {
    id: 'reforma-residencial',
    title: 'Reforma Residencial / Apartamento',
    description: 'Pacote padrão com todas as etapas de reforma para orçar ao cliente',
    items: [
      { description: 'Demolição de alvenaria e remoção de revestimentos antigos', category: 'Mão de Obra', suggestedUnit: 'vb', defaultQty: 1 },
      { description: 'Locação e descarte de caçambas de entulho', category: 'Equipamentos & Caçambas', suggestedUnit: 'un', defaultQty: 3 },
      { description: 'Nivelamento e regularização de contrapiso', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 45 },
      { description: 'Impermeabilização de banheiros, cozinha e áreas molhadas', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 25 },
      { description: 'Assentamento de porcelanato / piso cerâmico e rodapés', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 60 },
      { description: 'Revisão e novos circuitos elétricos (quadro + pontos)', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'pontos', defaultQty: 18 },
      { description: 'Instalações hidrossanitárias (água quente, fria e esgoto)', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'pontos', defaultQty: 8 },
      { description: 'Forro de gesso acartonado (Drywall) estruturado', category: 'Acabamentos', suggestedUnit: 'm²', defaultQty: 50 },
      { description: 'Pintura geral (lixamento, emassamento, selador e 2 demãos)', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 140 },
      { description: 'Instalação de louças sanitárias, torneiras e acessórios', category: 'Mão de Obra', suggestedUnit: 'un', defaultQty: 6 },
    ],
  },
  {
    id: 'construcao-alvenaria',
    title: 'Construção Nova / Alvenaria',
    description: 'Etapas de fundação, estrutura, paredes e cobertura com valores em branco',
    items: [
      { description: 'Locação de obra, escavação e fundações / baldrames', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 100 },
      { description: 'Alvenaria de vedação e estrutural com vãos e vergas', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 180 },
      { description: 'Concretagem de vigas, pilares e laje', category: 'Mão de Obra', suggestedUnit: 'm³', defaultQty: 15 },
      { description: 'Chapisco, emboço e reboco desempenado interno/externo', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 220 },
      { description: 'Estrutura de telhado e cobertura com telhas', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 110 },
      { description: 'Passagem de eletrodutos e tubulação hidráulica embutida', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'vb', defaultQty: 1 },
      { description: 'Instalação de portas, janelas e esquadrias de alumínio', category: 'Acabamentos', suggestedUnit: 'un', defaultQty: 10 },
    ],
  },
  {
    id: 'eletrica-hidraulica',
    title: 'Instalações Elétricas & Hidráulicas',
    description: 'Serviços especializados de instalações com preço a preencher',
    items: [
      { description: 'Instalação e montagem de quadro de distribuição com DR e DPS', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'un', defaultQty: 1 },
      { description: 'Passagem e fiação de circuitos elétricos 110V/220V', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'pontos', defaultQty: 24 },
      { description: 'Instalação de luminárias, spots LED e fita de LED', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'un', defaultQty: 16 },
      { description: 'Instalação de tubulação de água fria/quente em PPR/PVC', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'pontos', defaultQty: 6 },
      { description: 'Instalação de ramal de esgoto e caixas sifonadas', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'un', defaultQty: 4 },
      { description: 'Infraestrutura para ar-condicionado tipo Split', category: 'Instalações Elétricas & Hidráulicas', suggestedUnit: 'pontos', defaultQty: 3 },
    ],
  },
  {
    id: 'pintura-acabamento',
    title: 'Pintura & Revestimentos Finos',
    description: 'Serviços de acabamento fino prontos para cotação ao solicitante',
    items: [
      { description: 'Aplicação de massa corrida / acrílica com lixamento fino', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 120 },
      { description: 'Pintura acrílica acetinada / fosca (2 demãos cruzadas)', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 120 },
      { description: 'Pintura de portas de madeira com esmalte sintético', category: 'Mão de Obra', suggestedUnit: 'un', defaultQty: 5 },
      { description: 'Assentamento de revestimento metro white / pastilhas', category: 'Acabamentos', suggestedUnit: 'm²', defaultQty: 15 },
      { description: 'Aplicação de rejunte epóxi ou acrílico anti-mofo', category: 'Mão de Obra', suggestedUnit: 'm²', defaultQty: 40 },
    ],
  },
];

/**
 * Creates empty expense items (with R$ 0,00) for a project
 */
export function generateBlankExpensesForProject(projectId: string, templateId?: string): Expense[] {
  const group = BLANK_SERVICE_TEMPLATES.find(t => t.id === templateId) || BLANK_SERVICE_TEMPLATES[0];
  const today = new Date().toISOString().split('T')[0];

  return group.items.map((item, index) => ({
    id: `exp-template-${Date.now()}-${index}`,
    projectId,
    description: `${item.description} (${item.defaultQty} ${item.suggestedUnit})`,
    category: item.category,
    plannedAmount: 0,
    actualAmount: 0,
    status: 'Pendente',
    date: today,
    supplier: 'Profissional / Prestador Responsável',
    invoiceNumber: 'Proposta Comercial',
  }));
}
