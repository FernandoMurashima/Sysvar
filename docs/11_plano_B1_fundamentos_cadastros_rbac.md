# SysMura — Plano do Bloco 1 (Fundamentos & Cadastros & RBAC)

## 1) Objetivos do B1
- Multi-tenant básico (Empresa/Loja/Usuário vinculado à **Loja**).
- Autenticação + sessão.
- **RBAC híbrido** (roles + overrides) com menu dinâmico.
- Cadastros: **Produto, SKU (cor/tamanho), Cliente, Fornecedor, Tabela de Preço**.
- Naturezas de lançamento e Centros de Custo.
- Importação CSV (produtos/clientes/fornecedores) com relatório de erros.
- Auditoria: `criado_por`, `atualizado_por`, logs de acesso/negação.

---

## 2) Entregáveis
- **Modelos e Tabelas** (Django/MySQL) conforme Cap. 06/07.
- **APIs REST** documentadas (OpenAPI/Markdown) para:
  - Autenticação e sessão.
  - Usuários/roles/overrides (RBAC).
  - Produto, SKU, Cor, Tamanho, Cliente, Fornecedor, Tabela de Preço (+ itens).
  - Natureza e Centro de Custo.
  - Importação CSV.
- **Frontend** (Angular): login, menu dinâmico, CRUDs listados acima.
- **Testes**: unitários, funcionais, autorização.
- **Observabilidade**: logs estruturados de acesso + tentativas negadas.

---

## 3) Ordem de Execução
1. Autenticação & Sessão (login, refresh, logout, bloqueio após N falhas).
2. RBAC Híbrido (roles + overrides, cache, auditoria).
3. Menu dinâmico (opção → subopção).
4. Cadastros básicos (Cor, Tamanho, Produto/SKU, Cliente, Fornecedor, Tabela de Preço, Natureza, Centro de Custo).
5. Importação CSV (layout, validação, rollback).
6. Auditoria & Observabilidade.

---

## 4) Especificação das APIs (rascunho)

### 4.1 Autenticação
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### 4.2 RBAC
- `GET /rbac/permissions/effective?loja_id=:id`
- `GET/POST/PATCH /roles`
- `GET/PUT /roles/:id/permissions`
- `GET/PUT /users/:id/roles?loja_id=:id`
- `GET/PUT /users/:id/overrides?loja_id=:id`

### 4.3 Menu
- `GET /menu?loja_id=:id`

### 4.4 Catálogos
- `GET/POST/PATCH/DELETE /catalogo/cores`
- `GET/POST/PATCH/DELETE /catalogo/tamanhos`

### 4.5 Produto/SKU
- `GET/POST/PATCH/DELETE /produtos`
- `GET/POST/PATCH/DELETE /produtos/:produto_id/skus`

### 4.6 Cliente/Fornecedor
- `GET/POST/PATCH/DELETE /clientes`
- `GET/POST/PATCH/DELETE /fornecedores`

### 4.7 Tabela de Preço
- `GET/POST/PATCH/DELETE /tabelas-preco`
- `GET/POST/PATCH/DELETE /tabelas-preco/:id/itens`

### 4.8 Natureza & Centro de Custo
- `GET/POST/PATCH/DELETE /naturezas`
- `GET/POST/PATCH/DELETE /centros-custo`

### 4.9 Importação CSV
- `POST /import/csv`

---

## 5) Permissões por Endpoint (exemplos)
- `GET /produtos` → `cad.produto:ver`
- `POST /produtos` → `cad.produto:criar`
- `PATCH /produtos/:id` → `cad.produto:editar`
- `DELETE /produtos/:id` → `cad.produto:excluir`
- `GET /menu` → requer permissão de itens retornados
- RBAC-admin → `cfg.usuarios:*`, `cfg.natureza:*`, `cfg.centro_custo:*`

---

## 6) Critérios de Aceite do B1
- Login/refresh/logout funcionando; bloqueio após N falhas.
- RBAC híbrido completo; menu dinâmico refletindo permissões.
- Deny by default validado.
- CRUDs de Cadastros com validações e auditoria.
- Importação CSV com relatório de erros e rollback.
- Logs estruturados e auditoria em entidades críticas.

---

## 7) Testes
- Unitários: cálculo de permissões, validações de campos, parse CSV.
- Funcionais: acesso negado sem permissão, CRUDs, importação CSV com erros.
- Carga leve: paginação em listagens grandes.
- Segurança: brute-force login bloqueado, tokens inválidos.

---

## 8) Riscos & Mitigações
- **Complexidade de permissão** → começar pequeno, expandir depois.
- **Import CSV** → padronizar layouts e encoding.
- **Cache de permissões** → invalidar sempre em alterações.

---
