# SysMura — Governança de Acesso (RBAC Híbrido)

## 1. Objetivo

Definir o modelo de controle de acesso ao sistema SysMura baseado em:

* **Papéis (roles)** pré-definidos, que agrupam permissões comuns.
* **Overrides por usuário** (exceções), permitindo ajustes finos sem criar novos papéis.
* **Escopo por loja**: permissões são sempre vinculadas a uma loja. Admin de empresa pode ter acesso multi-lojas.

O modelo garante que:

* Menus exibem apenas opções e subopções que o usuário tem permissão.
* Backend é a autoridade final (nega por padrão; menu é apenas UX).
* Relatórios são sempre restritos à loja do usuário (exceto Admin Empresa).

---

## 2. Estrutura de tabelas (conceitual)

* **module** (id, nome, ordem, ativo)
* **menu\_item** (id, parent\_id?, module\_id, label, rota, ordem, ativo)
* **permission** (id, recurso, acao, descricao)
* **permission\_map** (id, menu\_item\_id, permission\_id) — liga menu → permissões
* **role** (id, nome, descricao, ativo)
* **role\_permission** (role\_id, permission\_id)
* **user\_role** (user\_id, loja\_id, role\_id)
* **user\_permission\_override** (user\_id, loja\_id, permission\_id, effect ENUM('allow','deny'))
* **audit\_perm** (id, quem\_id, alvo\_tipo, alvo\_id, acao, detalhes, timestamp)

---

## 3. Perfis padrão (roles)

* **admin\_empresa** → todas permissões na empresa e lojas.
* **gerente\_loja** → todas permissões da loja, exceto configurações sensíveis.
* **financeiro** → contas a pagar, contas a receber, baixas, relatórios financeiros.
* **compras** → pedidos de compra, entradas, fornecedores.
* **almoxarifado** → estoque, inventário, ajustes, transferências.
* **auditor** → somente leitura + relatórios da loja.
* **operador\_pdv** (futuro) → vendas PDV.

---

## 4. Catálogo inicial de módulos e subopções

### Cadastros

* Produtos → permissões: `cad.produto:{ver,criar,editar,excluir}`
* SKUs → `cad.sku:{ver,criar,editar,excluir}`
* Clientes → `cad.cliente:{ver,criar,editar,excluir}`
* Fornecedores → `cad.fornecedor:{ver,criar,editar,excluir}`
* Tabela de Preço → `cad.tabela_preco:{ver,criar,editar,excluir}`

### Compras

* Pedidos de Compra → `compras.pedido:{ver,criar,editar,excluir,aprovar}`
* Entradas → `compras.entrada:{ver,confirmar,cancelar}`

### Estoque

* Movimentações → `estoque.mov:{ver}`
* Inventário → `estoque.inventario:{ver,criar,fechar,ajustar}`
* Ajustes → `estoque.ajuste:{ver,criar,aprovar}`
* Transferências → `estoque.transferencia:{ver,criar,aprovar,receber}`

### Vendas

* Vendas → `venda.pedido:{ver,criar,editar,cancelar}`

### Financeiro

* Contas a Pagar → `fin.pagar:{ver,criar,editar,excluir,baixar}`
* Contas a Receber → `fin.receber:{ver,criar,editar,excluir,baixar}`
* Baixas → `fin.baixa:{ver,criar,estornar}`
* Contas Financeiras → `fin.conta:{ver,criar,editar,excluir}`
* Movimentos de Conta → `fin.mov:{ver}`

### Relatórios

* Estoque → `rel.estoque:{ver,exportar}`
* Vendas → `rel.vendas:{ver,exportar}`
* Financeiro → `rel.financeiro:{ver,exportar}`

### Configurações

* Naturezas de Lançamento → `cfg.natureza:{ver,criar,editar,excluir}`
* Centros de Custo → `cfg.centro_custo:{ver,criar,editar,excluir}`
* Usuários → `cfg.usuarios:{ver,criar,editar,excluir}`

---

## 5. Ações padrão

* **CRUD**: ver, criar, editar, excluir
* **Fluxo**: aprovar, confirmar, cancelar, reabrir
* **Financeiro**: baixar, estornar
* **Relatórios**: exportar
* **Configuração**: configurar

---

## 6. Regras de escopo

* Usuário → sempre vinculado a uma **Loja**.
* Permissões → válidas apenas para a loja vinculada.
* **Admin Empresa** → pode acessar múltiplas lojas.
* Relatórios → sempre filtrados pela loja do usuário; Admin Empresa pode selecionar.

---

## 7. Auditoria e segurança

* Logs de concessão/revogação de papéis e overrides.
* Cache de permissões por usuário/loja, invalidado a cada alteração.
* Middleware de backend checa `recurso:acao` em cada rota.
* Política **deny by default**: se não tem permissão, nega.

---

## 8. Próximos passos

1. Criar matriz inicial Role × Permissão (mapa de quais papéis incluem quais permissões).
2. Definir telas de administração de usuários, papéis e overrides.
3. Implementar middleware de autorização no backend e geração de menu dinâmico no frontend.
