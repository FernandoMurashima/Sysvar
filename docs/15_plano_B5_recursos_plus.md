# SysMura — Plano do Bloco 5 (Recursos Plus: Promoções, Cashback, Transferências, Fiscal, Multiloja)

## 1) Objetivos do B5
- **Promoções**: criar campanhas por produto, categoria ou período, com regras de desconto configuráveis.
- **Cashback**: permitir acúmulo (% sobre o valor líquido da venda), consulta de saldo por cliente e resgate em vendas futuras.
- **Transferências entre lojas**: movimentar estoque entre filiais, com controle de aprovação e recebimento.
- **Multi-loja**: habilitar navegação e relatórios multi-filiais, com restrições de RBAC por escopo de loja.
- **Fiscal (opcional, por UF)**: emissão de NFC-e/NF-e, incluindo numeração, série, certificado digital e contingência.

---

## 2) Entregáveis
- **APIs REST**:
    - Promoções: CRUD de campanhas + associação a SKUs/categorias.
    - Cashback: CRUD de regras, saldo por cliente, resgate em venda.
    - Transferências: rascunho → aprovação → expedição → recebimento.
    - Multi-loja: filtros e relatórios respeitando escopo de RBAC.
    - Fiscal: endpoints para emissão, cancelamento, inutilização, consulta de status.
- **Frontend Angular**:
    - Telas para Promoções e Cashback.
    - Tela para Transferências entre lojas.
    - Ajustes nos relatórios para filtros de loja.
    - Tela de configuração fiscal por UF.
- **Testes**:
    - Validação de promoções e descontos.
    - Fluxo completo de transferência (origem → destino).
    - Emissão fiscal em ambiente de homologação.
- **Observabilidade**:
    - Logs de campanhas, alterações de regras fiscais e transferências.

---

## 3) Ordem de Execução
1. **Promoções**
    - Definição de tipos de promo (por produto, categoria, percentual, valor fixo).
    - Regras de vigência e combinabilidade.
    - Auditoria de alterações.
2. **Cashback**
    - Configuração de % por loja ou categoria.
    - Registro de acúmulo em vendas.
    - Resgate automático em vendas futuras.
    - Consulta de saldo por cliente.
3. **Transferências**
    - Fluxo: rascunho → aprovação → expedida → recebida.
    - Gera movimento de estoque saída/entrada.
    - Política para cancelamento/estorno.
4. **Multi-loja**
    - Ajustes no RBAC para restringir relatórios por loja.
    - Navegação multi-loja (Admin Empresa).
    - Relatórios consolidados por empresa.
5. **Fiscal**
    - Emissão de NFC-e/NF-e.
    - Cancelamento e inutilização.
    - Contingência offline.
    - Configuração por UF: série, numeração, certificado.

---

## 4) Especificação das APIs (rascunho)

### 4.1 Promoções
- `GET/POST/PATCH/DELETE /promocoes`
- `POST /promocoes/:id/ativar`
- `POST /promocoes/:id/inativar`

### 4.2 Cashback
- `GET/POST/PATCH/DELETE /cashback/regras`
- `GET /cashback/clientes/:id/saldo`
- `POST /cashback/resgate`

### 4.3 Transferências
- `GET/POST/PATCH/DELETE /estoque/transferencias`
- `POST /estoque/transferencias/:id/aprovar`
- `POST /estoque/transferencias/:id/expedir`
- `POST /estoque/transferencias/:id/receber`

### 4.4 Multi-loja
- `GET /relatorios/*?empresa_id=&loja_id=`
- `GET /empresas/:id/lojas`

### 4.5 Fiscal
- `POST /fiscal/nfe/emissao`
- `POST /fiscal/nfe/cancelamento`
- `POST /fiscal/nfe/inutilizacao`
- `GET /fiscal/nfe/:id/status`

---

## 5) Permissões por Endpoint (exemplos)
- `promo:*` → criar/editar/ativar promoções.
- `cashback:*` → gerenciar regras e saldos.
- `estoque.transferencia:*` → criar/aprovar/expedir/receber.
- `rel.multi_loja:*` → acessar relatórios de múltiplas lojas.
- `fiscal.nfe:*` → emitir/cancelar NF-e.

---

## 6) Critérios de Aceite do B5
- Promoções aplicadas corretamente nos preços, sem permitir valores negativos.
- Cashback acumulado e resgatado em vendas futuras, saldo consistente.
- Transferência gera saída na origem e entrada no destino, com rastreabilidade.
- Multi-loja: relatórios e filtros respeitam escopo do usuário.
- Emissão fiscal validada em ambiente de homologação SEFAZ.
- Logs claros para auditoria de regras e documentos fiscais.

---

## 7) Testes
- Unitários: cálculo de promoções e cashback.
- Funcionais: fluxo de transferência completo.
- Fiscal: emissão, cancelamento, contingência em homologação.
- Cross-check: saldo de cashback após vendas e resgates.
- Multi-loja: relatórios por loja vs. relatórios consolidados.

---

## 8) Riscos & Mitigações
- **Promoções complexas** → começar com regras simples; evoluir gradualmente.
- **Cashback acumulado incorretamente** → auditoria de transações e relatórios por cliente.
- **Transferência parcial** → definir política clara para divergências.
- **Fiscal por UF** → separar por configuração; testes em homologação antes da produção.
- **Multi-loja** → risco de vazamento de dados entre lojas; validação estrita de `loja_id`.

---
