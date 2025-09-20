# SysMura — Plano do Bloco 3 (Vendas & Financeiro & PDV)

## 1) Objetivos do B3
- **Vendas**
    - Orçamento, Pedido e Venda.
    - Aplicação de Tabela de Preço e descontos.
    - Troca e Devolução de mercadorias.
- **PDV SysMura**
    - Módulo separado, mas integrado ao backend.
    - Operação balcão: Dinheiro, Cartão, Pix.
    - Cancelamento controlado por permissões e política.
    - Funcionamento offline com fila local e reenvio.
- **Financeiro**
    - Contas a Receber (AR) e Contas a Pagar (AP).
    - Parcelas: aberto, parcial, baixado, cancelado.
    - Baixas e Estornos com movimentação em contas financeiras.
    - Contas financeiras (caixa, banco, cartão, pix).
    - Movimentos financeiros e conciliação manual.

---

## 2) Entregáveis
- **Models Django/MySQL**: Venda, Pedido, AR, AP, Baixa, Conta, Movimento.
- **APIs REST**:
    - Vendas: orçamento, pedido, venda, devolução.
    - Financeiro: contas a pagar/receber, baixas, estornos, contas financeiras, movimentos.
- **Frontend Angular**:
    - Tela de Venda (pedido/venda).
    - Tela de Devolução/Troca.
    - Tela de Financeiro (a pagar, a receber, baixas).
    - Tela de Contas Financeiras e Movimentos.
- **PDV**:
    - Interface simplificada (grade de produtos, formas de pagamento).
    - Cancelamento controlado.
    - Comprovante de venda (print ou PDF).
- **Testes**: vendas gerando estoque e financeiro; devolução revertendo.

---

## 3) Ordem de Execução
1. **Vendas Básicas**
    - Orçamento → Pedido → Venda.
    - Descontos por item e total, respeitando permissões.
    - Integração com Estoque (SAÍDA) e Financeiro (AR).
2. **Devolução/Troca**
    - Vinculação à venda original.
    - Estorno de estoque e financeiro.
3. **PDV**
     - Operação balcão (offline/online).
     - Formas de pagamento (Dinheiro, Cartão, Pix).
     - Cancelamento de venda com política definida.
4. **Financeiro**
    - Contas a Receber e Pagar (geradas por vendas e entradas).
    - Baixas (parcial/total) e Estornos.
    - Contas financeiras (saldo, movimentos).
    - Conciliação manual.
5. **Auditoria**
    - Log de todas as transições (Cap. 08).
    - Auditoria financeira (quem baixou/estornou).

---

## 4) Especificação das APIs (rascunho)

### 4.1 Vendas
- `GET/POST/PATCH/DELETE /vendas/pedidos`
- `POST /vendas/pedidos/:id/faturar`
- `POST /vendas/pedidos/:id/cancelar`
- `POST /vendas/pedidos/:id/devolver`

### 4.2 PDV
- `POST /pdv/vendas`
- `POST /pdv/vendas/:id/cancelar`
- `GET /pdv/vendas/:id/comprovante`

### 4.3 Financeiro
- **Contas a Receber/Pagar**
    - `GET/POST/PATCH/DELETE /financeiro/receber`
    - `GET/POST/PATCH/DELETE /financeiro/pagar`
- **Baixas**
    - `POST /financeiro/receber/:id/baixa`
    - `POST /financeiro/receber/:id/estorno`
    - `POST /financeiro/pagar/:id/baixa`
    - `POST /financeiro/pagar/:id/estorno`
- **Contas Financeiras**
    - `GET/POST/PATCH/DELETE /financeiro/contas`
- **Movimentos**
    - `GET/POST /financeiro/movimentos`

---

## 5) Permissões por Endpoint (exemplos)
- `venda.pedido:*` → criar/editar/faturar/cancelar/devolver.
- `pdv.venda:*` → criar/cancelar vendas PDV.
- `fin.receber:*` → criar/editar/baixar/estornar AR.
- `fin.pagar:*` → criar/editar/baixar/estornar AP.
- `fin.conta:*` → gerenciar contas financeiras.
- `fin.mov:ver` → consultar movimentos.

---

## 6) Critérios de Aceite do B3
- Venda faturada gera SAÍDA de estoque e AR no financeiro.
- Devolução gera ENTRADA de estoque e estorno financeiro.
- PDV funciona offline, reenvia fila quando online.
- Contas a Pagar/Receber refletindo corretamente entradas e vendas.
- Baixas e Estornos registrados com trilha de auditoria.
- Relatórios de contas e movimentos consistentes.

---

## 7) Testes
- Unitários: cálculo de descontos, geração de parcelas.
- Funcionais: fluxo Orçamento → Pedido → Venda → AR.
- Fluxo Devolução: venda revertida em estoque e financeiro.
- PDV: venda offline → reenvio → sincronização.
- Financeiro: baixas parciais, totais, estornos.
- Segurança: permissão negada em endpoints críticos.

---

## 8) Riscos & Mitigações
- **Offline PDV** → fila robusta, reenvio idempotente.
- **Descontos** → regras claras para evitar preço negativo.
- **Baixas/Estornos** → trilha de auditoria obrigatória.
- **Trocas/Devoluções** → política de estoque parcial e financeiro coerente.
- **Conciliação** → inicialmente manual; automatização futura.

---
