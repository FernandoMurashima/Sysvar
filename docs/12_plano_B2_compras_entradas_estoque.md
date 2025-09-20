# SysMura — Plano do Bloco 2 (Compras/Entradas & Estoque)

## 1) Objetivos do B2
- **Compras**
      - Pedido de Compra (PO) com aprovação.
      - Entrada de mercadoria vinculada ao PO.
      - Rateio de despesas acessórias (frete, seguro, impostos).
      - Importação de NF-e (XML) para conferência.
- **Estoque**
      - Movimentos (ENTRADA, SAÍDA, AJUSTE).
      - Saldos por Loja/SKU.
      - Ajustes de estoque com aprovação.
      - Inventário básico (snapshot, contagem, fechamento).
- **Integração Financeira**
      - Entrada confirmada gera **contas a pagar (AP)**.
      - Atualização de custo médio a partir das entradas.

---

## 2) Entregáveis
- **Models Django/MySQL**: Pedido de Compra, Entrada, Movimentos de Estoque, Ajustes, Inventário.
- **APIs REST**:
      - Compras: Pedido, Entrada, NF-e import.
      - Estoque: Consulta de saldos, Movimentos, Ajuste, Inventário.
- **Frontend Angular**:
      - Tela de Pedido de Compra (rascunho → aprovação).
      - Tela de Entrada (com rateio de despesas).
      - Tela de Estoque (consulta, movimentações).
      - Tela de Ajuste e Inventário.
- **Testes**: consistência entre PO ↔ Entrada ↔ Movimentos ↔ Financeiro.
- **Observabilidade**: logs de transição de estado, divergências de NF-e.

---

## 3) Ordem de Execução
1. **Pedido de Compra**
         - Estados: rascunho → enviado → aprovado → (parcial) → recebido → cancelado.
         - Aprovação controlada por permissões (Cap. 07).
2. **Entrada de Mercadoria**
      - Vinculação obrigatória a PO aprovado.
      - Rateio de despesas calculado e aplicado.
      - Confirmação gera:
         - Movimentos de estoque (ENTRADA).
         - AP no financeiro.
3. **NF-e de Entrada**
      - Endpoint para upload de XML.
      - Parser com validações (CFOP, NCM, totais).
      - Tela de conferência (diferenças PO × XML).
4. **Estoque — Movimentos & Saldos**
      - Estrutura de saldos por Loja/SKU.
      - Movimentos gerados automaticamente por entradas/ajustes/inventário.
5. **Ajustes**
      - Rascunho → aprovado/cancelado.
      - Justificativa obrigatória.
6. **Inventário**
      - Abertura gera snapshot (`qtd_sistema`).
      - Contagem registrada por SKU.
      - Fechamento gera ajustes de diferença.
7. **Observabilidade**
      - Logs de cada transição de estado.
      - Relatórios de divergências (PO × Entrada × NF-e).

---

## 4) Especificação das APIs (rascunho)

### 4.1 Compras
- `GET/POST/PATCH/DELETE /compras/pedidos`
- `POST /compras/pedidos/:id/aprovar`
- `POST /compras/pedidos/:id/cancelar`

### 4.2 Entradas
- `GET/POST/PATCH/DELETE /compras/entradas`
- `POST /compras/entradas/:id/confirmar`
- `POST /compras/entradas/:id/cancelar`

### 4.3 NF-e
- `POST /compras/nfe/upload` (multipart XML)
- `GET /compras/nfe/:id/diff` → diferenças PO × XML

### 4.4 Estoque
- `GET /estoque/saldos?loja_id=:id&sku_id=:id`
- `GET /estoque/movimentos`
- `GET/POST/PATCH/DELETE /estoque/ajustes`
- `POST /estoque/ajustes/:id/aprovar`
- `GET/POST/PATCH/DELETE /estoque/inventarios`
- `POST /estoque/inventarios/:id/fechar`

---

## 5) Permissões por Endpoint (exemplos)
- `compras.pedido:*` → criar/editar/aprovar/cancelar pedidos.
- `compras.entrada:*` → criar/confirmar/cancelar entradas.
- `estoque.mov:ver` → visualizar movimentos.
- `estoque.ajuste:*` → criar/aprovar/cancelar ajustes.
- `estoque.inventario:*` → criar/fechar inventários.

---

## 6) Critérios de Aceite do B2
- Pedido de Compra: só aprovado gera Entrada.
- Entrada confirmada gera movimentos de estoque e AP no financeiro.
- NF-e XML importado gera conferência com divergências listadas.
- Ajuste exige justificativa; Inventário gera ajustes automáticos.
- Relatórios de saldos/movimentos consistentes com operações.

---

## 7) Testes
- Unitários: rateio de despesas, cálculo de custo médio.
- Funcionais: fluxo PO → Entrada → Estoque → AP.
- Casos de divergência: PO × Entrada × XML.
- Estorno/cancelamento testados (não deixa saldo negativo).
- Carga leve: 1k SKUs em inventário.

---

## 8) Riscos & Mitigações
- **Rateio incorreto** → validar soma de rateio = total despesas.
- **Estoque negativo** → política definida (bloquear ou permitir com aviso).
- **XML divergente** → gerar relatório claro de diferenças.
- **Inventário parcial** → definir política (ajuste só itens contados? ou todos?).

---
