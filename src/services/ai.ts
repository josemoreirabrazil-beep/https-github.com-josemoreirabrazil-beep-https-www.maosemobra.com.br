import type { Project, Expense } from '../types';

export interface BudgetOptimizationSuggestion {
  id: string;
  expenseId?: string; // Optional: if it relates to a specific expense
  title: string;
  description: string;
  originalAmount?: number;
  suggestedAmount: number;
  savings: number;
  justification: string;
}

export interface OptimizationResponse {
  suggestions: BudgetOptimizationSuggestion[];
  globalStrategy: string;
}

/**
 * Chama a API do Gemini para analisar os gastos e sugerir otimizações no orçamento.
 */
export const getBudgetOptimizationSuggestions = async (
  project: Project,
  expenses: Expense[]
): Promise<OptimizationResponse> => {
  try {
    const response = await fetch('/api/ai/optimize-budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, expenses }),
    });

    if (!response.ok) {
      throw new Error('Falha ao obter sugestões da IA');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro no serviço de otimização de orçamento:', error);
    throw error;
  }
};
