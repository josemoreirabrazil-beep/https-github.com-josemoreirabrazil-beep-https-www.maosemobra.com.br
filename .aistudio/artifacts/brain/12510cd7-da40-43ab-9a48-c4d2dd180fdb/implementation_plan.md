# Plano de Implementação: Checklist de Tarefas Pré-Obra via IA

Para atender à solicitação de gerar checklists de "Tarefas Pré-Obra" utilizando IA, baseada no tipo de obra, seguirei o plano abaixo:

## 1. Estrutura de Dados
- Atualizar a interface `Project` (em `src/types.ts`) para incluir um campo `preConstructionChecklist?: ChecklistItem[]`.
- Definir a interface `ChecklistItem`:
  ```typescript
  interface ChecklistItem {
    id: string;
    task: string;
    completed: boolean;
  }
  ```

## 2. Integração com IA (Servidor)
- Criar um novo endpoint no `server.ts` (ou utilizar a estrutura existente se apropriado) para invocar a API do Gemini.
- A requisição receberá o `tipo de obra` e retornará uma lista formatada de tarefas pré-obra sugeridas.

## 3. UI/UX no DashboardView
- Adicionar um botão no `DashboardView` (ou um novo card de "Ações Rápidas") para "Gerar Checklist Pré-Obra".
- Ao clicar:
  - Selecionar/Confirmar o tipo de obra.
  - Chamar o serviço de IA.
  - Exibir o checklist gerado em um novo componente `PreConstructionChecklist`.
- O checklist será **salvo permanentemente** no projeto via `onUpdateProject`.
- O componente `PreConstructionChecklist` permitirá:
  - Marcar tarefas como concluídas.
  - Editar o texto das tarefas.
  - Adicionar novas tarefas manualmente.

## 4. Persistência
- Garantir que a atualização do checklist dispare a função `onUpdateProject` ou `onSaveProject` (conforme o padrão existente no `App.tsx`) para manter a persistência no estado global e, consequentemente, no banco de dados.
