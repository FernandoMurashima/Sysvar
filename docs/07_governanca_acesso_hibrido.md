# SysMura — Governança de Acesso (RBAC Híbrido)

## 1) Objetivo
Modelo de controle de acesso combinando **Papéis (roles)** + **Overrides por usuário**, com **escopo por loja** e menu em **2 níveis (opção → subopção)**.  
Relatórios são limitados à **loja do usuário**; *Admin Empresa* pode selecionar qualquer loja da empresa.

---

## 2) Estrutura (conceitual, sem código)
- **module**(id, nome, ordem, ativo)
- **menu_item**(id, parent_id?, module_id, label, rota, ordem, ativo)
- **permission**(id, recurso, acao, descricao)  
  _Ex.: `compras.pedido:aprovar`_
- **permission_map**(id, menu_item_id, permission_id) — liga menu → permissões
- **role**(id, nome, descricao, ativo)
- **role_permission**(role_id, permission_id)
- **user_role**(user_id, loja_id, role_id)
- **user_permission_override**(user_id, loja_id, permission_id, effect ENUM('allow','deny'))
- **audit_perm**(id, quem_id, alvo_tipo, alvo_id, acao, detalhes, timestamp)

**Regras de avaliação**  
Permissão efetiva = **UNIÃO**(permissões dos papéis do usuário na loja) **±** overrides.  
Precedência: **deny** explícito (override) **>** allow.

---

## 3) Perfis padrão (roles)
- **admin_empresa** → todas permissões na empresa/lojas.
- **gerente_loja** → todas permissões da *própria* loja, exceto configurações sensíveis de empresa.
- **financeiro** → pagar/receber/baixas/contas/movimentos/relatórios financeiros da loja.
- **compras** → fornecedores, pedidos de compra, entradas.
- **almoxarifado** → inventário, ajustes, transferências, consulta de movimentações.
- **auditor** → somente leitura + relatórios da loja.
- **operador_pdv** (futuro) → vendas PDV básicas.

---

## 4) Catálogo inicial de permissões (recurso: ações)

**Cadastros**
- `cad.produto:{ver,criar,editar,excluir}`
- `cad.sku:{ver,criar,editar,excluir}`
- `cad.cliente:{ver,criar,editar,excluir}`
- `cad.fornecedor:{ver,criar,editar,excluir}`
- `cad.tabela_preco:{ver,criar,editar,excluir}`

**Compras**
- `compras.pedido:{ver,criar,editar,excluir,aprovar}`
- `compras.entrada:{ver,confirmar,cancelar}`

**Estoque**
- `estoque.mov:{ver}`
- `estoque.inventario:{ver,criar,fechar,ajustar}`
- `estoque.ajuste:{ver,criar,aprovar}`
- `estoque.transferencia:{ver,criar,aprovar,receber}`

**Vendas**
- `venda.pedido:{ver,criar,editar,cancelar}`

**Financeiro**
- `fin.pagar:{ver,criar,editar,excluir,baixar,estornar}`
- `fin.receber:{ver,criar,editar,excluir,baixar,estornar}`
- `fin.baixa:{ver,criar,estornar}`
- `fin.conta:{ver,criar,editar,excluir}`
- `fin.mov:{ver}`

**Relatórios**
- `rel.estoque:{ver,exportar}`
- `rel.vendas:{ver,exportar}`
- `rel.financeiro:{ver,exportar}`

**Configurações**
- `cfg.natureza:{ver,criar,editar,excluir}`
- `cfg.centro_custo:{ver,criar,editar,excluir}`
- `cfg.usuarios:{ver,criar,editar,excluir}`

---

## 5) Matriz Role × Permissão
Legenda: ✅ permitido | — não incluso (negar por padrão).

### 5.1 Cadastros
| Permissão | admin_empresa | gerente_loja | financeiro | compras | almoxarifado | auditor | operador_pdv |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| cad.produto:ver/criar/editar/excluir | ✅ | ✅ | — | ✅ | — | ver ✅ | — |
| cad.sku:ver/criar/editar/excluir | ✅ | ✅ | — | ✅ | — | ver ✅ | — |
| cad.cliente:ver/criar/editar/excluir | ✅ | ✅ | — | — | — | ver ✅ | criar/editar ✅ (somente se PDV exigir)\* |
| cad.fornecedor:ver/criar/editar/excluir | ✅ | ✅ | — | ✅ | — | ver ✅ | — |
| cad.tabela_preco:ver/criar/editar/excluir | ✅ | editar ✅ | — | — | — | ver ✅ | — |

\* *operador_pdv*: opcionalmente permitir `cad.cliente:{ver,criar,editar}` para cadastro rápido no balcão (sem excluir).

### 5.2 Compras
| Permissão | admin_empresa | gerente_loja | financeiro | compras | almoxarifado | auditor | operador_pdv |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| compras.pedido:ver | ✅ | ✅ | — | ✅ | — | ✅ | — |
| compras.pedido:criar/editar/excluir | ✅ | ✅ | — | ✅ | — | — | — |
| compras.pedido:aprovar | ✅ | ✅ | — | ✅(opcional) | — | — | — |
| compras.entrada:ver | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| compras.entrada:confirmar/cancelar | ✅ | ✅ | — | ✅ | — | — | — |

### 5.3 Estoque
| Permissão | admin_empresa | gerente_loja | financeiro | compras | almoxarifado | auditor | operador_pdv |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| estoque.mov:ver | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| estoque.inventario:ver | ✅ | ✅ | — | — | ✅ | ✅ | — |
| estoque.inventario:criar/fechar/ajustar | ✅ | ✅ | — | — | ✅ | — | — |
| estoque.ajuste:ver | ✅ | ✅ | — | — | ✅ | ✅ | — |
| estoque.ajuste:criar/aprovar | ✅ | ✅ | — | — | ✅ | — | — |
| estoque.transferencia:ver | ✅ | ✅ | — | — | ✅ | ✅ | — |
| estoque.transferencia:criar/aprovar/receber | ✅ | ✅ | — | — | ✅ | — | — |

### 5.4 Vendas
| Permissão | admin_empresa | gerente_loja | financeiro | compras | almoxarifado | auditor | operador_pdv |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| venda.pedido:ver | ✅ | ✅ | — | — | — | ✅ | ✅ |
| venda.pedido:criar/editar | ✅ | ✅ | — | — | — | — | ✅ |
| venda.pedido:cancelar | ✅ | ✅ | — | — | — | — | (opcional)\* |

\* *operador_pdv*: `cancelar` pode ser restrito (override caso a caso) ou exigir aprovação.

### 5.5 Financeiro
| Permissão | admin_empresa | gerente_loja | financeiro | compras | almoxarifado | auditor | operador_pdv |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| fin.pagar:ver/criar/editar/excluir | ✅ | ✅ | ✅ | — | — | ver ✅ | — |
| fin.pagar:baixar/estornar | ✅ | ✅ | ✅ | — | — | — | — |
| fin.receber:ver/criar/editar/excluir | ✅ | ✅ | ✅ | — | — | ver ✅ | — |
| fin.receber:baixar/estornar | ✅ | ✅ | ✅ | — | — | — | — |
| fin.baixa:ver/criar/estornar | ✅ | ✅ | ✅ | — | — | ver ✅ | — |
| fin.conta:ver/criar/editar/excluir | ✅ | (ver) ✅ | ✅ | — | — | ver ✅ | — |
| fin.mov:ver | ✅ | ✅ | ✅ | — | — | ✅ | — |

### 5.6 Relatórios
| Permissão | admin_empresa | gerente_loja | financeiro | compras | almoxarifado | auditor | operador_pdv |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| rel.estoque:ver/exportar | ✅ | ✅ | — | — | ✅ | ✅ | — |
| rel.vendas:ver/exportar | ✅ | ✅ | — | — | — | ✅ | ✅ |
| rel.financeiro:ver/exportar | ✅ | ✅ | ✅ | — | — | ✅ | — |

### 5.7 Configurações
| Permissão | admin_empresa | gerente_loja | financeiro | compras | almoxarifado | auditor | operador_pdv |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| cfg.natureza:ver/criar/editar/excluir | ✅ | — | — | — | — | — | — |
| cfg.centro_custo:ver/criar/editar/excluir | ✅ | — | — | — | — | — | — |
| cfg.usuarios:ver/criar/editar/excluir | ✅ | — | — | — | — | — | — |

> **Observação:** O *gerente_loja* pode ganhar acesso a algumas configurações (ex.: `cfg.usuarios:criar` apenas na própria loja) via **override allow**.

---

## 6) Escopo de dados e relatórios
- **Usuário** é vinculado a **uma Loja**; toda consulta/ação é automaticamente filtrada por `loja_id` do usuário.  
- **Admin Empresa** pode selecionar qualquer loja da empresa.  
- **Relatórios (`rel.*`)**: sempre limitados à loja do usuário; Admin Empresa pode alternar.

---

## 7) Menu dinâmico (opção → subopção)
- Cada **menu_item** mapeia para 1+ permissões (via `permission_map`).  
- Se o usuário **não tem** nenhuma das permissões requeridas por um item, **o item não é exibido**.  
- O backend valida novamente em cada rota/ação (**deny by default**).

---

## 8) Overrides e precedência
- **user_permission_override** por loja e permissão, com `effect ∈ {allow, deny}`.
- **Precedência**: `deny` explícito **vence** `allow`.  
- Usos típicos:
  - *Conceder* `compras.pedido:aprovar` a um operador específico.
  - *Negar* `venda.pedido:cancelar` a todos, exceto gerente.

---

## 9) Auditoria e segurança
- **audit_perm** registra concessões/revog. de papéis/overrides (quem/quando/motivo).
- Registrar **tentativas negadas** (rota, permissão requerida, usuário, timestamp).
- **Cache** de permissões efetivas por usuário/loja (invalidar ao mudar papéis/overrides).

---

## 10) Próximos passos
1. Validar a matriz Role × Permissão com os times (Compras, Estoque, Financeiro, Loja).  
2. Fechar lista de **subopções do menu** e seus mapeamentos (`permission_map`).  
3. Definir **regras de aprovação** (ex.: quem pode aprovar transferência, cancelar venda).  
4. Preparar **telas administrativas**: papéis, permissões, overrides e auditoria.  
5. Implementar o **middleware de autorização** no backend e o **menu dinâmico** no frontend.

