# SysMura — Roadmap de Implementação (v1)

> **Objetivo**: garantir que o desenvolvimento siga a ordem lógica dos blocos definidos no Cap. 09, com entregáveis claros, dependências mapeadas e critérios de aceite antes de avançar.

---

## 1) Sequência de Blocos Internos

1. **B1 — Fundamentos & Cadastros & Governança**  
2. **B2 — Compras/Entradas & Estoque automático**  
3. **B3 — Vendas & Financeiro (inclui PDV)**  
4. **B4 — Relatórios & Consolidação**  
5. **B5 — Recursos Plus (Promoções, Cashback, Transferências, Fiscal, Multiloja)**  

---

## 2) Detalhamento por Bloco

### Bloco 1 — Fundamentos & Cadastros & Governança
- **Objetivos**:  
  - Multi-tenant (Empresa/Loja/Usuário)  
  - RBAC híbrido (Cap. 07) + menu dinâmico  
  - Naturezas e Centros de Custo  
  - Cadastros: Produto/SKU, Cliente, Fornecedor, Tabela de Preço  
- **Dependências**: nenhuma (bloco inicial)  
- **Entregáveis**:  
  - Models Django + APIs REST  
  - Telas Angular de CRUD  
  - Tela de login + controle de sessão  
  - Menu dinâmico Angular baseado em permissões  
- **Critérios de Aceite**:  
  - CRUD completo com validações  
  - Permissões aplicadas (deny by default)  
  - Auditoria de criação/edição  

---

### Bloco 2 — Compras/Entradas & Estoque
- **Objetivos**:  
  - Pedido de Compra (PO) com aprovação  
  - Entrada vinculada ao PO + rateio despesas  
  - Atualização de custo médio  
  - Estoque: movimentos e saldos  
  - Ajustes + Inventário básico  
  - Importação XML NF-e (entrada)  
- **Dependências**: B1 (cadastros + permissões)  
- **Entregáveis**:  
  - Models de PO, Entrada, Movimentos  
  - APIs de compras/estoque  
  - Telas Angular de PO, Entrada, Consulta Estoque  
  - Parser XML NF-e (entrada)  
- **Critérios de Aceite**:  
  - Confirmação de entrada gera estoque + AP financeiro  
  - Movimentos auditados  
  - Rateio calculado corretamente  

---

### Bloco 3 — Vendas & Financeiro (inclui PDV)
- **Objetivos**:  
  - Orçamento/Pedido/Venda  
  - PDV integrado (dinheiro/cartão/pix)  
  - Troca/Devolução  
  - Financeiro: contas a pagar/receber, baixas, estornos  
  - Contas financeiras e movimentos  
- **Dependências**: B1 (cadastros), B2 (estoque)  
- **Entregáveis**:  
  - Models de Venda, AR, AP, Baixa, Conta, Movimento  
  - APIs REST correspondentes  
  - Telas Angular de Vendas, Financeiro, PDV  
  - Regras de cancelamento e devolução  
- **Critérios de Aceite**:  
  - Venda faturada gera saída de estoque + AR  
  - Devolução estorna estoque e financeiro  
  - PDV funciona offline/online  

---

### Bloco 4 — Relatórios & Consolidação
- **Objetivos**:  
  - Relatórios por loja (Estoque, Vendas, Financeiro, DRE)  
  - Exportação CSV  
- **Dependências**: B1–B3  
- **Entregáveis**:  
  - Endpoints de relatórios  
  - Telas Angular de filtros e tabelas  
  - Exportação CSV  
- **Critérios de Aceite**:  
  - Totais batendo com operações  
  - Escopo por loja respeitado  
  - Exportação só para quem tem permissão  

---

### Bloco 5 — Recursos Plus
- **Objetivos**:  
  - Promoções e Cashback  
  - Transferências entre lojas  
  - Multi-loja (escopo e relatórios)  
  - Emissão Fiscal (NFC-e/NF-e) opcional por UF  
- **Dependências**: B1–B4  
- **Entregáveis**:  
  - Models e APIs correspondentes  
  - Telas Angular de promoções, cashback, transferências  
  - Integração fiscal (homologação/testes)  
- **Critérios de Aceite**:  
  - Regras de promoção/cashback auditáveis  
  - Transferência gera movimentos origem/destino  
  - Emissão fiscal validada em homologação SEFAZ  

---

## 3) Infraestrutura Mínima

- **Backend**: Django + DRF, deploy em nuvem (ex.: VPS ou container em cloud).  
- **Banco**: MySQL, backup diário.  
- **Frontend**: Angular local, build otimizado.  
- **CI/CD**: Git + pipeline de testes/lint/build.  
- **Ambientes**: dev, homologação, produção.  

---

## 4) Governança do Projeto

- **Versionamento**: Git com branches (`main`, `develop`, `feature/*`).  
- **Revisão de Código**: 4-olhos; PR obrigatório.  
- **Documentação**: atualizar MkDocs **antes** do início de cada bloco.  
- **Changelog**: por release interna (B1–B5).  
- **Testes**: unitários (70% mínimo em regras críticas) + funcionais.  
- **Auditoria**: logs de acesso, permissões, transições de estado.  

---

## 5) Definition of Ready (DoR)

Um bloco só inicia quando:  
- Documentação correspondente concluída.  
- Modelos e estados validados (Cap. 06–08).  
- Permissões necessárias mapeadas (Cap. 07).  

---

## 6) Definition of Done (DoD)

Um bloco só é dado como concluído quando:  
- Código revisado e testado.  
- Documentação atualizada.  
- Testes de QA e UAT realizados.  
- Deploy em ambiente de homologação validado.  
- Checklist de critérios de aceite atendido.  

---
