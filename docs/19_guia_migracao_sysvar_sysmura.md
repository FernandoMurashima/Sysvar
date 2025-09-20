# SysMura — Guia de Migração SysVar → SysMura

> Este capítulo define o processo para migração de dados e configurações do **SysVar** para o **SysMura**, garantindo continuidade e consistência.

---

## 1) Objetivos
- Reaproveitar cadastros existentes no SysVar.
- Garantir consistência entre entidades (Produto, Cliente, Fornecedor, etc.).
- Minimizar impacto na operação do lojista.
- Definir estratégia clara de migração: **ETL (Extract → Transform → Load)**.

---

## 2) Escopo da Migração
### 2.1 Tabelas que serão migradas
- **Empresa/Loja** → estrutura organizacional.
- **Usuários/RBAC** → replicar contas e permissões básicas.
- **Produtos/SKUs** → códigos, descrições, atributos essenciais.
- **Clientes** → dados cadastrais, contatos.
- **Fornecedores** → dados cadastrais.
- **Estoque Inicial** → saldo de SKUs por loja.
- **Financeiro**:
    - Contas a pagar em aberto.
    - Contas a receber em aberto.
- **Histórico mínimo** (opcional) → últimos 6 meses de movimentações.

### 2.2 Fora do escopo
- Logs antigos de acesso/auditoria.
- Documentos cancelados ou obsoletos.
- Cadastros duplicados/obsoletos → devem ser limpos antes.

---

## 3) Estratégia de Migração
1. **Extração (E)**  
      - Exportar dados do SysVar em CSV/JSON.  
      - Garantir encoding UTF-8 e colunas bem nomeadas.  
      - Relatórios de inconsistências (valores nulos, duplicados).  

2. **Transformação (T)**  
    - Padronizar chaves (ex: CPF/CNPJ sem máscara).  
    - Normalizar campos (unidades, categorias, tabelas de preço).  
    - Ajustar relacionamentos (Produto → SKU → Estoque).  
    - Mapear permissões antigas para RBAC híbrido do SysMura.  

3. **Carga (L)**  
    - Importadores dedicados no SysMura:
        - `import/csv/produtos`
        - `import/csv/clientes`
        - `import/csv/fornecedores`
        - `import/csv/estoque-inicial`
        - `import/csv/financeiro`
    - Logs detalhados de sucesso/erro por linha.  
    - Rollback automático em falha.  

---

## 4) Fases de Migração
- **Fase 1 — Preparação**  
    - Levantamento de dados no SysVar.  
    - Identificação de duplicidades e inconsistências.  

- **Fase 2 — Teste de Migração**  
    - Executar migração em ambiente de homologação.  
    - Validar cadastros e saldos migrados.  
    - Ajustar transformações necessárias.  

- **Fase 3 — Produção (Go-Live)**  
    - Congelar operações no SysVar.  
    - Executar ETL final.  
    - Validar com relatórios comparativos.  
    - Liberar SysMura com base migrada.  

---

## 5) Critérios de Aceite
  - 100% dos cadastros essenciais migrados sem perda de dados.  
  - Saldos de estoque por SKU idênticos ao SysVar no dia do corte.  
  - Contas a pagar/receber em aberto iguais ao SysVar.  
  - Permissões de usuários reconfiguradas corretamente.  
  - Relatórios de validação sem divergências críticas.  

---

## 6) Riscos & Mitigações
  - **Dados inconsistentes no SysVar** → rodar scripts de saneamento antes.  
  - **Chaves duplicadas (CPF, SKU)** → resolver manualmente na preparação.  
  - **Financeiro divergente** → conciliação obrigatória antes do corte.  
  - **Interrupção longa** → planejar janela de migração fora do horário comercial.  

---

## 7) Observações
  - O SysMura deve nascer **já com dados reais** (não vazio).  
  - Scripts de migração ficarão versionados no repositório.  
  - Cada carga deve gerar **relatório de erros** para correção manual.  

---
