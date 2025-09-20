# SysMura — Checklist Final da v1 (Go-Live)

> Este checklist consolida todos os critérios de aceite dos blocos B1–B5, servindo como guia final de validação antes do deploy em produção.

---

## 1) Fundamentos & Cadastros & RBAC (B1)
- [ ] Login, refresh e logout funcionando.
- [ ] Bloqueio após N tentativas de login inválidas.
- [ ] RBAC híbrido implementado (roles + overrides).
- [ ] Menu dinâmico refletindo permissões do usuário.
- [ ] Permissões aplicadas no backend (deny by default).
- [ ] Cadastros básicos (Produto, SKU, Cliente, Fornecedor, Tabela de Preço, Natureza, Centro de Custo, Cor, Tamanho) completos.
- [ ] Importação CSV funcionando com rollback em erros.
- [ ] Auditoria (`criado_por`, `atualizado_por`) ativa em todas as entidades.

---

## 2) Compras/Entradas & Estoque (B2)
- [ ] Pedido de Compra com fluxo rascunho → aprovado → recebido/cancelado.
- [ ] Entrada confirmada gera movimento de estoque (ENTRADA) e AP (financeiro).
- [ ] Rateio de despesas (frete/seguro/impostos) funcionando.
- [ ] Importação XML de NF-e validada, divergências listadas.
- [ ] Saldos de estoque corretos por loja/SKU.
- [ ] Ajustes exigem justificativa, aprovados geram movimentos.
- [ ] Inventário gera snapshot e ajustes por diferença.

---

## 3) Vendas & Financeiro & PDV (B3)
- [ ] Fluxo Orçamento → Pedido → Venda funcionando.
- [ ] Venda faturada gera movimento de estoque (SAÍDA) e AR (financeiro).
- [ ] Devolução gera entrada de estoque e estorno financeiro.
- [ ] PDV opera em modo offline/online com fila local.
- [ ] Formas de pagamento: Dinheiro, Cartão, Pix testadas.
- [ ] Cancelamento de venda segue política de permissão.
- [ ] Contas a Receber/Pagar com status (aberto/parcial/baixado/cancelado).
- [ ] Baixas parciais/totais registradas; estornos reabrem títulos.
- [ ] Contas financeiras e movimentos conciliáveis manualmente.

---

## 4) Relatórios & Consolidação (B4)
- [ ] Relatórios de Estoque (saldos, movimentos, curva ABC).
- [ ] Relatórios de Vendas (período, cliente, produto, vendedor).
- [ ] Relatórios Financeiros (pagar/receber, fluxo de caixa).
- [ ] DRE Gerencial simplificada implementada.
- [ ] Escopo por loja respeitado (Admin pode alternar loja).
- [ ] Exportação CSV funcionando e restrita a usuários autorizados.
- [ ] Performance validada (< 3s para até 50k registros).

---

## 5) Recursos Plus (B5)
- [ ] Promoções ativas aplicando descontos corretos.
- [ ] Cashback acumulado em vendas e resgatável em vendas futuras.
- [ ] Transferências entre lojas gerando saída/entrada de estoque.
- [ ] Multi-loja funcionando (relatórios por loja e consolidados).
- [ ] Emissão Fiscal (NFC-e/NF-e) testada em ambiente de homologação SEFAZ.
- [ ] Cancelamento/Inutilização/Contingência fiscal funcionando.
- [ ] Logs de auditoria para promoções, cashback, transferências e fiscais.

---

## 6) Segurança & Observabilidade
- [ ] Logs estruturados de acesso e operações críticas.
- [ ] Tentativas de acesso negado registradas (rota, permissão, usuário, timestamp).
- [ ] Auditoria de concessões/revogações de permissões.
- [ ] Backup diário do banco validado.
- [ ] Monitoramento básico (req/s, latência, erros) ativo.

---

## 7) Performance & Disponibilidade
- [ ] Consultas principais indexadas (loja_id, sku_id, datas).
- [ ] Testes de carga em cadastros e relatórios.
- [ ] Failover ou contingência testada em emissão fiscal.
- [ ] RPO ≤ 24h e RTO ≤ 4h verificados.

---

## 8) Documentação & Governança
- [ ] Todos os capítulos (01–16) atualizados no MkDocs.
- [ ] `mkdocs.yml` coerente com a estrutura.
- [ ] Changelog das releases internas (B1–B5) registrado.
- [ ] Scripts de migração (SysVar → SysMura) revisados e testados.
- [ ] QA e UAT concluídos com dados de exemplo.

---

## 9) Aprovação Final
- [ ] Todos os blocos marcados como concluídos.
- [ ] Critérios de aceite atendidos.
- [ ] Checklist assinado por responsável técnico e de negócio.

---
