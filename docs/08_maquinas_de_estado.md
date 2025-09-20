# SysMura — Máquinas de Estado (v1)

> Padrões gerais:
> - Transições executadas em **transação**.
> - **Side effects** explícitos (estoque/financeiro).
> - **Guards** (pré-condições) e **Permissões** por transição.
> - **Escopo por loja** sempre aplicado.
> - Estados-finais não permitem retorno, salvo via “reabrir” quando previsto.

---

## 1) Pedido de Compra (PO)

**Estados**: `rascunho` → `enviado` → `aprovado` → `recebido` (final)  
Estados alternativos: `cancelado` (final), `parcialmente_recebido` (intermediário)

| De | Para | Ação | Guards (pré-condições) | Side effects | Permissão |
|---|---|---|---|---|---|
| rascunho | enviado | Enviar ao fornecedor | itens > 0; fornecedor definido | — | `compras.pedido:editar` |
| enviado | aprovado | Aprovar | política de aprovação (papel/override) | registra aprovador+data | `compras.pedido:aprovar` |
| enviado/aprovado | cancelado | Cancelar | não deve haver entradas vinculadas | — | `compras.pedido:editar` |
| aprovado | parcialmente_recebido | Receber parcial | existe `entrada` vinculada com qty < total | — | `compras.entrada:confirmar` |
| parcialmente_recebido | recebido | Receber total | somatório entradas == total PO | — | `compras.entrada:confirmar` |

**Invariantes**
- `cancelado` não pode ter `entrada` confirmada.
- `recebido` exige 100% dos itens recebidos (por SKU).

---

## 2) Entrada de Mercadoria

**Estados**: `aberta` → `confirmada` (final)  
Alternativo: `cancelada` (final)

| De | Para | Ação | Guards | Side effects | Permissão |
|---|---|---|---|---|---|
| aberta | confirmada | Confirmar entrada | referencia a PO **aprovado**; totais batem; rateio calculado | **Movimento de estoque (ENTRADA)** por item; atualiza custo médio (se aplicável); gera **AP** (pagar + parcelas) conforme natureza | `compras.entrada:confirmar` |
| aberta | cancelada | Cancelar | sem movimentos gerados; ou usuário com poder de desfazer rascunho | — | `compras.entrada:cancelar` |

**Invariantes**
- `confirmada` é irreversível via edição; reversão exige **estorno** (nova transação inversa).

---

## 3) Transferência de Estoque

**Estados**: `rascunho` → `aprovacao` → `expedida` → `recebida` (final)  
Alternativo: `cancelada` (final)

| De | Para | Ação | Guards | Side effects | Permissão |
|---|---|---|---|---|---|
| rascunho | aprovacao | Enviar p/ aprovação | itens > 0; lojas origem/destino distintas | — | `estoque.transferencia:criar` |
| aprovacao | expedida | Aprovar/Expedir | saldo suficiente na origem | **Movimento de estoque (SAÍDA)** na origem; opcional reservar na destino | `estoque.transferencia:aprovar` |
| expedida | recebida | Receber | documento não cancelado; destino confirma | **Movimento de estoque (ENTRADA)** na destino | `estoque.transferencia:receber` |
| rascunho/aprovacao | cancelada | Cancelar | não expedida ainda | — | `estoque.transferencia:aprovar` |
| expedida | cancelada | Cancelar (exceção) | política de estorno; sem recebimento | **Estorno** do movimento de saída | `estoque.transferencia:aprovar` |

**Invariantes**
- `recebida` exige correspondência 1:1 de itens (ou política de parcial c/ ajuste).

---

## 4) Inventário

**Estados**: `aberto` → `em_contagem` → `fechado` (final)  
Alternativo: `cancelado` (final)

| De | Para | Ação | Guards | Side effects | Permissão |
|---|---|---|---|---|---|
| aberto | em_contagem | Iniciar contagem | seleção de SKUs/área | snapshot `qtd_sistema` | `estoque.inventario:criar` |
| em_contagem | fechado | Fechar inventário | contagens finalizadas | **Ajustes** por diferença (gera `movimento_estoque:AJUSTE`) | `estoque.inventario:fechar` |
| aberto/em_contagem | cancelado | Cancelar | conforme política | — | `estoque.inventario:ajustar` |

---

## 5) Ajuste de Estoque

**Estados**: `rascunho` → `aprovado` (final)  
Alternativo: `cancelado` (final)

| De | Para | Ação | Guards | Side effects | Permissão |
|---|---|---|---|---|---|
| rascunho | aprovado | Aprovar ajuste | justificativa obrigatória | **Movimento de estoque (AJUSTE)** por item (+ ganho, − perda) | `estoque.ajuste:aprovar` |
| rascunho | cancelado | Cancelar | — | — | `estoque.ajuste:criar` |

---

## 6) Venda

**Estados**: `aberta` → `faturada` (final)  
Alternativo: `cancelada` (final)

| De | Para | Ação | Guards | Side effects | Permissão |
|---|---|---|---|---|---|
| aberta | faturada | Faturar | itens > 0; pagamento/condição definida; preço válido | **Movimento de estoque (SAÍDA)**; gera **AR** (receber + parcelas) | `venda.pedido:criar` (faturar na visão PDV) |
| aberta | cancelada | Cancelar | política de cancelamento; sem faturamento ou com estorno | se já houve saída, **estorna** movimentos e AR | `venda.pedido:cancelar` |

**Observação**: em PDV, “faturar” pode ser sinônimo de “concluir venda”.

---

## 7) Financeiro — Títulos (Pagar/Receber)

**Estados**: `aberto` → `parcial` → `baixado` (final)  
Alternativo: `cancelado` (final)

| De | Para | Ação | Guards | Side effects | Permissão |
|---|---|---|---|---|---|
| aberto | parcial | Baixa parcial | valor pago < valor parcela | `movimento_conta` (CRÉDITO p/ receber; DÉBITO p/ pagar) | `fin.receber:baixar` / `fin.pagar:baixar` |
| parcial | baixado | Quitar | soma pagamentos == valor parcela | `movimento_conta` correspondente | `fin.receber:baixar` / `fin.pagar:baixar` |
| aberto/parcial | cancelado | Cancelar parcela | regra: só se origem também cancelada (venda/entrada) | — | `fin.baixa:estornar` (ou perm. específica) |
| baixado | parcial/aberto | Estornar baixa | política de estorno | **Estorno** de `movimento_conta`; reabre saldo | `fin.baixa:estornar` |

**Invariantes**
- `baixado` não pode aceitar novos recebimentos/pagamentos.
- Estorno deve preservar trilha de auditoria (documento de estorno vinculado).

---

## 8) Regras transversais

- **Auditoria**: toda transição grava (quem, quando, de→para, motivo).
- **Conciliação**: side effects (estoque/financeiro) referenciam o documento e a linha (ex.: `referencia_tipo`, `referencia_id`).
- **Segurança**: backend valida `recurso:ação` em toda transição (deny by default).
- **Idempotência**: repetir a mesma ação no mesmo estado não deve duplicar efeitos.
- **Integridade**: documentos “filhos” não confirmam sem “pais” aprovados (ex.: `entrada` sem `pedido_compra` aprovado).

---

## 9) Próximos passos
1. Validar políticas de **cancelamento/estorno** por módulo (quem pode, em que prazos).
2. Fechar **mensagens de erro** padronizadas para guards (UX clara).
3. Confirmar se teremos **parciais** em transferência/entrada e como ajustar saldos.
4. Definir **webhooks/eventos** pós-transição (ex.: “entrada confirmada” → notificar financeiro).
