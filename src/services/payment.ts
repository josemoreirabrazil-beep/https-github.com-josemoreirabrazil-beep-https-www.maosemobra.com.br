import type { Expense } from '../types';

/**
 * Utilitário para processamento e simulação de Webhooks do Mercado Pago.
 * Garante a integridade dos dados e a atualização de status no sistema Mãos em Obra.
 */

/**
 * Simula o recebimento de um Webhook do Mercado Pago.
 * Útil para testes de integração e automação local.
 */
export const simulateMercadoPagoWebhook = async (paymentId: string | number, status: 'approved' | 'pending' | 'rejected' = 'approved') => {
  console.log(`[SIMULATION] Recebendo Webhook para Pagamento: ${paymentId} com status: ${status}`);
  
  // No mundo real, isso seria uma chamada POST externa do Mercado Pago para o nosso /api/mercadopago/webhook
  // Aqui estamos simulando a lógica que o servidor executaria.
  
  try {
    const response = await fetch('/api/mercadopago/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment',
        action: 'payment.created',
        data: { id: String(paymentId) },
        // Em simulação, injetamos o status desejado
        simulatedStatus: status
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao processar webhook simulado', error);
    throw error;
  }
};

/**
 * Função utilitária para verificar se uma despesa/receita pendente foi paga no Mercado Pago.
 * Pode ser usada em loops de polling global no App.tsx.
 */
export const syncExpenseWithMercadoPago = async (expense: Expense): Promise<Expense | null> => {
  if (expense.status === 'Pago') return null;
  
  // Usamos o ID da despesa como external_reference (padrão do sistema)
  const referenceId = expense.id;
  
  try {
    const response = await fetch(`/api/mercadopago/payment-status/${referenceId}`);
    const data = await response.json();
    
    if (data.found && data.status === 'approved') {
      return {
        ...expense,
        status: 'Pago',
        actualAmount: data.amount || expense.actualAmount || expense.plannedAmount,
        invoiceNumber: expense.invoiceNumber || `AUTO-MP-${Date.now()}`,
        date: new Date().toISOString().split('T')[0]
      };
    }
  } catch (error) {
    console.error(`Erro ao sincronizar despesa ${expense.id}`, error);
  }
  
  return null;
};
