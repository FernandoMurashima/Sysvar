# SysMura — Escopo Completo da Versão 1 (v1)

> **Objetivo**: entregar um produto **completo e atrativo** ao pequeno lojista (moda masculino/feminino), com **baixo custo de operação**, **treinamento reduzido**, **PDV integrado** (módulo separado), **governança de acesso híbrida** e documentação rigorosa.

**Arquitetura**: Front-end **Angular** (local), Back-end **Django** (nuvem), Banco **MySQL**.  
**Tenant**: Empresa → Lojas → Usuários (usuário vinculado a **uma loja**).  
**Escopo de relatórios**: **restritos à loja do usuário** (Admin Empresa pode alternar loja).  
**Natureza de lançamento**: define impacto em **Estoque** e/ou **Financeiro**.

---

## 0) Visão Geral do Conteúdo da v1

- **Cadastros**: Produto/SKU (cor/tamanho), Cliente, Fornecedor, Tabela de Preço, Usuários, Naturezas, Centros de Custo.
- **Governança de Acesso** (RBAC híbrido): papéis + overrides, menu por opção → subopção, auditoria, cache de permissões.
- **Compras**: Pedido de Compra (PO) com aprovação; Entrada vinculada ao PO; Rateio de despesas acessórias; Atualização de custo.
- **Estoque**: Saldos por loja/SKU; Movimentações (entrada/saída/ajuste/transferência/inventário); Inventário e Ajuste com aprovação; Transferência interlojas.
- **Vendas**: Orçamento/Pedido/Venda simples; Tabela de Preço; Descontos; Regras básicas de promoção; Troca/Devolução.
- **PDV SysMura (módulo separado, integrado)**: venda balcão, formas de pagamento (dinheiro/cartão/Pix), cancelamento com política.
- **Financeiro**: Contas a Pagar/Receber (títulos e parcelas); Baixas/Estornos; Contas e Movimentos; Fluxo de Caixa simples.
- **Relatórios**: Estoque (saldo/mov.), Vendas (período/vendedor/produto), Financeiro (Aberto/Quitado/Projeção), **DRE gerencial** (simplificada).
- **Fiscais (BR)**: **Entrada** por XML de NF-e (importação e conferência); Emissão fiscal (*NFC-e/NF-e*) como módulo **opcional** configurável por UF.
- **Promoções & Cashback**: Regras básicas aplicadas a itens/venda; saldo de cashback e resgate.
- **Multi-loja**: permitido, com transferência e relatórios por loja.  
- **Migração**: aproveitamento do SysVar (mapa de dados + rotinas de importação).

---

## 1) Organização de Entregas Internas (todos os blocos pertencem à v1)

> **Importante**: os blocos são para **organização interna** de desenvolvimento, QA e documentação. O cliente recebe **tudo junto** como v1.

### Bloco 1 — Fundamentos & Cadastros & Governança
- **Fundamentos**
  - Multi-tenant: Empresa/Loja/Usuário vinculados; timezone; numerações.
  - RBAC híbrido: papéis padrão + overrides por usuário; cache; auditoria.
  - Menu dinâmico (opção → subopção) por permissões mapeadas.
  - Naturezas de Lançamento e Centros de Custo.
- **Cadastros**
  - Produto + **SKU** (cor/tamanho), GTIN; Catálogos de cor/tamanho; Importação CSV.
  - Clientes e Fornecedores (dados fiscais básicos).
  - Tabela de Preços (vigências; escopo por loja).
- **Critérios de Aceite**
  - Menu reflete permissões; endpoints com **deny by default**.
  - CRUD completo com validações e auditoria (`criado_por/atualizado_por`).
  - Importação CSV com relatório de erros e *rollback* transacional.

### Bloco 2 — Compras/Entradas & Estoque automático
- **Compras**
  - **Pedido de Compra**: rascunho → enviado → **aprovado** → (parcial) → recebido; cancelamento com regra.
  - **Entrada** vinculada ao PO: confirmação gera **movimento de estoque (ENTRADA)** e **AP** (pagar) conforme natureza; **rateio** de despesas (frete/seguro/impostos/outros) por valor.
  - **NF-e de Entrada**: importação de **XML** (itens, CFOP, totais) para conferência e vinculação ao PO.
- **Estoque**
  - Saldos por loja/SKU; **movimentos** referenciais (doc/linha).
  - **Ajuste** com aprovação; **Inventário** (snapshot, contagem, fechamento) gerando ajustes.
- **Critérios de Aceite**
  - Estoque consistente após confirmar/cancelar/estornar (testes de caixa preta).
  - Rateio recalcula custo unitário rateado e total da entrada.
  - Importação de XML detecta divergências e emite alertas.

### Bloco 3 — Vendas & Financeiro
- **Vendas**
  - Orçamento/Pedido/Venda; aplicação de Tabela de Preço; descontos por item/total com política; **troca/devolução** (estorno de estoque e financeiro).
  - **PDV SysMura (módulo separado)**: venda balcão com Dinheiro/Cartão/Pix, cancelamento conforme política/perm., emissão de comprovante.
- **Financeiro**
  - **Receber/Pagar**: títulos e parcelas; status `aberto/parcial/baixado/cancelado`.
  - **Baixas** (parcial/total) e **Estornos** com geração de **movimento de conta** (crédito/debito).
  - **Contas Financeiras** (caixa/banco/cartão/pix/outros) e **Movimentos**; conciliação manual.
- **Critérios de Aceite**
  - Faturar venda gera **SAÍDA** de estoque e **AR** (receber); devolução reverte.
  - Entradas geram **AP** (pagar) por condição de pagamento; estorno consistente.
  - PDV consegue operar com rede instável (fila local; reenvio).

### Bloco 4 — Relatórios & Consolidação
- **Relatórios** (sempre **por loja** do usuário; Admin pode alternar):
  - **Estoque**: saldo atual, curva ABC, movimentos por período/documento.
  - **Vendas**: por período/cliente/produto/vendedor (quando aplicável), ticket médio, descontos.
  - **Financeiro**: a pagar/receber por status, projeção de caixa, fluxo por conta.
  - **DRE gerencial** (simplificada): receita − CMV − despesas operacionais (por natureza/centro de custo).
- **Consolidação**
  - Exportação CSV; agendamentos simples (download manual).
- **Critérios de Aceite**
  - Totais batendo com operações; filtros por período/loja; exportar **somente** se permissão (`rel.*:exportar`).

### Bloco 5 — Recursos Plus (ainda v1)
- **Promoções**: por produto/categoria/período; combinabilidade com descontos.
- **Cashback**: regra de acúmulo (% do líquido), saldo por cliente, resgate em vendas futuras.
- **Transferência** entre lojas: rascunho → aprovação → expedida → recebida (movimentos de **SAÍDA**/**ENTRADA**).
- **Multi-loja**: navegação, filtros e relatórios por loja; política de acesso por loja.
- **Fiscais (opcionais por UF)**: NFC-e/NF-e de **emissão** (configurável), numeração, série, certificado; contingências.  
  > *Observação*: a **Entrada** por XML já está no Bloco 2. Emissão pode ser ligada/ajustada por UF.
- **Critérios de Aceite**
  - Promoção não permite preço negativo; cashback não excede total líquido.
  - Transferência preserva rastreabilidade (doc/itens); inventário ajusta diferenças.
  - Módulo fiscal de emissão passa por ambiente de **homologação** e validações de schema.

---

## 2) Requisitos Não Funcionais (RNF) da v1

- **Segurança & Acesso**: RBAC híbrido; backend valida todas as rotas; auditoria de concessões e tentativas negadas.
- **Desempenho**: listas paginadas; consultas com índices (loja_id, sku_id, datas); tempo de resposta < 500 ms para 95% das requisições comuns.
- **Disponibilidade**: 99,5% (v1); **backup diário** e RPO ≤ 24h; RTO ≤ 4h.
- **Observabilidade**: logs estruturados, correlação de requisições, métricas básicas (req/s, latência, erros), trilhas de auditoria nos documentos.
- **Internacionalização**: PT-BR prioritário; moedas BRL; formatação local.
- **Privacidade**: dados pessoais minimizados; senhas com hash forte; transporte TLS.
- **Documentação**: capítulos atualizados **antes** de iniciar cada bloco; changelog por release interna.

---

## 3) “Feito” (Definition of Done) por Bloco

1. **Código** revisado (4-olhos), testes unitários ≥ 70% nas regras críticas.
2. **Máquinas de estado** implementadas conforme Cap. 08.
3. **Docs** (Cap. 01–09) atualizadas e linkadas no `mkdocs.yml`.
4. **Migração** (se aplicável) com script idempotente e plano de rollback.
5. **QA** funcional e de regressão; **UAT** com dados de exemplo.
6. **Observabilidade**: logs e métricas verificáveis em ambiente de teste.
7. **Permissões** auditadas (Role × Permissão) coerentes com o Cap. 07.

---

## 4) Migração a partir do SysVar (Aproveitamento)

- **Mapeamento de dados**: produtos, clientes, fornecedores, saldos de estoque, títulos financeiros.
- **ETL**: saneamento de códigos (GTIN, NCM), normalização de tamanhos/cores, de-para de naturezas.
- **Procedimento**: Dry-run em base de homologação; checklist de validação; janela de corte; backup antes/depois.

---

## 5) Riscos & Mitigações

- **Complexidade fiscal por UF** → começar com **Entrada por XML** (Bloco 2) e **emissão opcional** (Bloco 5), isolada por feature flag.
- **Performance em estoque** → índices corretos; evitar locks longos; confirmações em transação curta.
- **Promoção/Desconto/Cache** → regras determinísticas; teste de combinabilidade; auditoria de alterações.
- **Conciliação financeira** → começar com conciliação **manual** (v1); automatização futura.

---

## 6) Cronograma Macro (interno)

- **B1** Fundamentos & Cadastros & RBAC → _T0 – T1_  
- **B2** Compras/Entradas & Estoque → _T1 – T2_  
- **B3** Vendas & Financeiro & PDV → _T2 – T3_  
- **B4** Relatórios & Consolidação → _T3 – T4_  
- **B5** Plus (Promo, Cashback, Transferência, Emissão Fiscal, Multiloja) → _T4 – T5_

> Detalhamento por sprint será mantido em planning interno e refletido na documentação ao abrir cada bloco.

---

## 7) Checklist de Aceite da v1 (externo)

- ✅ Cadastros completos e governança de acesso funcional.  
- ✅ Fluxo **PO → Entrada → Estoque → AP**.  
- ✅ Fluxo **Venda/PDV → Estoque → AR**.  
- ✅ Baixas/Estornos e movimentos de conta.  
- ✅ Relatórios por loja (Estoque, Vendas, Financeiro) + **DRE gerencial**.  
- ✅ Promoções e Cashback ativáveis.  
- ✅ Transferência interlojas.  
- ✅ Importação XML de NF-e (entrada).  
- ✅ Emissão fiscal (NFC-e/NF-e) **opcional** por UF (homologação validada).  
- ✅ Documentação MkDocs atualizada (Cap. 01–09) e scripts de migração.

