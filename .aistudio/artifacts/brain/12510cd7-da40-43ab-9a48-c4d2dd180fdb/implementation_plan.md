# Painel de Oportunidades & Banco de Prestadores de Serviços

Implementação completa do painel bidirecional que conecta **Solicitantes/Contratantes** de obras a **Prestadores de Serviços/Profissionais Qualificados**, com formulários de cadastro e persistência integrada.

## 1. Visão Geral das Funcionalidades

### A. Painel de Oportunidades de Obras (Para Prestadores)
- **Visualização de Demandas**: Listagem de obras abertas postadas por particulares, construtoras e empreiteiros.
- **Filtros Avançados**: Especialidade (Alvenaria, Elétrica, Pintura, Hidráulica, Drywall, etc.), Tipo de Obra (Residencial, Reforma, Subempreitada, Manutenção) e Grau de Urgência (Crítica, Alta, Normal).
- **Ações Imediatas**:
  - Botão de contato direto no WhatsApp com mensagem pré-formatada citando a vaga e o solicitante.
  - Modal de detalhes completos com escopo, orçamento previsto, prazos e requisitos técnicos.

### B. Banco de Prestadores de Serviços & Sistema de Ranking (Para Solicitantes)
- **Pódio de Reputação (Top Rankeados)**:
  - Destaque em pódio para **Top 1 Ouro**, **Top 2 Prata** e **Top 3 Bronze**, com cálculo ponderado por nota média, número de avaliações e anos de experiência.
  - Ordenação dinâmica por: Posição no Ranking Geral, Maior Nota em Estrelas, Quantidade de Depoimentos e Anos de Experiência.
- **Sistema Completo de Avaliações (Estrelas & Reviews)**:
  - Exibição visual de estrelas (1 a 5), nota média, total de reviews e percentual de recomendação dos solicitantes (ex: 100% recomendam).
  - Modal interativo **"Avaliar Profissional"**:
    - Seletor com 5 estrelas interativas com animação e rótulo descritivo (Péssimo a Excelente).
    - Avaliação de subcritérios técnicos: Qualidade do Acabamento, Pontualidade no Prazo e Custo-Benefício.
    - Toggle de recomendação ("Você recomenda este profissional?").
    - Nome do avaliador, papel (Proprietário, Construtora, Engenheiro), nome da obra e depoimento detalhado.
  - Recálculo dinâmico da nota média e reordenação instantânea do ranking com persistência no `localStorage`.
- **Feed de Depoimentos no Perfil**:
  - Aba de **Avaliações** no modal de detalhes do prestador, com score breakdown, médias por critério e todos os depoimentos de clientes reais.

### C. Formulário de Cadastro Integrado (Dual Role)
- **Modal com Seletor de Perfil**:
  1. **Sou Solicitante / Contratante**: Cadastro de demandas de obras com título, categoria, orçamento previsto, urgência, cidade/estado, localização, responsável, WhatsApp com DDD, descrição e requisitos técnicos.
  2. **Sou Prestador de Serviços**: Cadastro de perfil profissional com nome, nome fantasia/empresa, especialidades, anos de experiência, cidade/estado, WhatsApp, diária/preço médio, disponibilidade, tipo de documento e chave PIX.
- **Persistência em Tempo Real**: Os dados recém-cadastrados são salvos localmente (`localStorage`) e refletidos de imediato nas listagens com animação de celebração (`canvas-confetti`).

### D. Integração Global e Navegação
- Aba dedicada na barra de navegação: **"Oportunidades & Prestadores"** com badge destacada.
- Atalho direto em **Ações Rápidas de Campo** no `DashboardView` para acesso instantâneo.
