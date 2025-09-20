# SysMura — Plano do Bloco 4 (Relatórios & Consolidação)

## 1) Objetivos do B4
- Relatórios consolidados para tomada de decisão do lojista.
- Escopo **restrito por loja** (Admin Empresa pode alternar).
- Exportação CSV para análises externas.
- DRE Gerencial (simplificada).

---

## 2) Entregáveis
- **APIs REST**:
    - Relatórios de Estoque, Vendas, Financeiro, DRE.
    - Exportação CSV.
- **Frontend Angular**:
    - Telas de filtro e apresentação de relatórios.
    - Botão de exportação (visível apenas para quem tem permissão).
- **Testes**:
    - Validação de totais com base nos dados transacionais.
    - Escopo por loja respeitado.
- **Observabilidade**:
    - Logs de consultas de relatórios (auditoria).

---

## 3) Ordem de Execução
1. **Relatório de Estoque**
    - Saldos por Loja/SKU.
    - Movimentos por período/documento.
    - Curva ABC.
2. **Relatório de Vendas**
    - Período/cliente/produto/vendedor.
    - Ticket médio, descontos aplicados.
3. **Relatório Financeiro**
    - Contas a pagar/receber (aberto, quitado, projetado).
    - Fluxo de caixa por conta.
4. **DRE Gerencial (simplificada)**
    - Receita líquida.
    - CMV.
    - Despesas operacionais por natureza/centro de custo.
5. **Exportação CSV**
    - Disponível em todos os relatórios.
    - Respeita permissões `rel.*:exportar`.

---

## 4) Especificação das APIs (rascunho)

### 4.1 Estoque
- `GET /relatorios/estoque/saldos?loja_id=:id&periodo_ini=&periodo_fim=`
- `GET /relatorios/estoque/movimentos?loja_id=:id&periodo_ini=&periodo_fim=`
- `GET /relatorios/estoque/curva-abc?loja_id=:id`

### 4.2 Vendas
- `GET /relatorios/vendas?loja_id=:id&periodo_ini=&periodo_fim=&cliente_id=&produto_id=`

### 4.3 Financeiro
- `GET /relatorios/financeiro/pagar?loja_id=:id&status=`
- `GET /relatorios/financeiro/receber?loja_id=:id&status=`
- `GET /relatorios/financeiro/fluxo-caixa?loja_id=:id&periodo_ini=&periodo_fim=`

### 4.4 DRE
- `GET /relatorios/dre?loja_id=:id&periodo_ini=&periodo_fim=`

### 4.5 Exportação
- `GET /relatorios/:tipo/export?loja_id=:id&periodo_ini=&periodo_fim=`

---

## 5) Permissões por Endpoint (exemplos)
- `rel.estoque:ver` → visualizar relatórios de estoque.
- `rel.vendas:ver` → visualizar relatórios de vendas.
- `rel.financeiro:ver` → visualizar relatórios financeiros.
- `rel.*:exportar` → exportar CSV.

---

## 6) Critérios de Aceite do B4
- Relatórios exibem apenas dados da loja do usuário.
- Totais batendo com documentos base (compras, vendas, financeiro).
- Exportação CSV disponível apenas para perfis autorizados.
- DRE gerencial apresenta lucro/prejuízo simplificado.
- Performance: consultas retornam em < 3s até 50k registros.

---

## 7) Testes
- Unitários: agregações SQL (soma, média, agrupamento).
- Funcionais: filtros por período, cliente, produto, vendedor.
- Cross-check: valores de relatórios batendo com lançamentos.
- Performance: stress test em consultas com 1 ano de dados.

---

## 8) Riscos & Mitigações
- **Performance** → índices adequados (loja_id, datas, sku_id).
- **Exportação** → risco de vazamento de dados; validar permissões.
- **DRE simplificada** → alinhar fórmulas (Receita − CMV − Despesas) e revisar com contador.
- **Consistência multi-loja** → sempre filtrar por loja_id do usuário.

---
