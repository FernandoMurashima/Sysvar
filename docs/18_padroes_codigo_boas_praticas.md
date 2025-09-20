# SysMura — Padrões de Código & Boas Práticas

> Este capítulo define regras e convenções para garantir qualidade, consistência e manutenibilidade no backend (Django) e frontend (Angular).

---

## 1) Princípios Gerais
- **Clareza sobre esperteza** → código fácil de ler > código “esperto”.
- **Consistência** → seguir convenções do projeto, não inventar variações.
- **Separação de responsabilidades** → cada módulo faz uma coisa.
- **Documentação viva** → comentários e docstrings claros, alinhados à realidade.
- **Deny by default** em permissões (segurança acima de tudo).

---

## 2) Backend — Django
### 2.1 Estrutura do Projeto
- **apps/** organizados por domínio (`cadastros`, `compras`, `estoque`, `vendas`, `financeiro`, `fiscal`, etc.).
- Cada app com:
    - `models.py` → modelos de dados.
    - `serializers.py` → validação + serialização.
    - `views.py` → APIs REST.
    - `urls.py` → rotas locais.
    - `tests/` → unitários e funcionais.
- **settings** divididos por ambiente (`dev`, `homolog`, `prod`).

### 2.2 Modelos
- Nomes em **singular** (`Produto`, `Cliente`, `PedidoCompra`).
- Campos obrigatórios sempre com `blank=False, null=False`.
- Auditoria padrão: `criado_em`, `atualizado_em`, `criado_por`, `atualizado_por`.
- Soft delete apenas quando realmente necessário.

### 2.3 APIs (DRF)
- Padrão **RESTful** (`GET/POST/PATCH/DELETE`).
- Rotas em **snake_case** (ex: `/api/produtos/`).
- Paginação padrão (page/size).
- Filtros e ordering habilitados (`?search=`, `?ordering=`).
- Respostas sempre em JSON.
- Mensagens de erro claras (não expor stacktrace).

### 2.4 Segurança
- Autenticação por token JWT.
- Autorização via RBAC híbrido (Cap. 07).
- Sempre validar `empresa_id` e `loja_id` no backend.
- Logs de acesso/negação obrigatórios.

### 2.5 Testes
- Unitários ≥ 70% de cobertura nos domínios críticos.
- Testes de permissão (rota sem permissão → 403).
- Testes de integração em fluxos críticos (PO → Entrada → Estoque).

---

## 3) Frontend — Angular
### 3.1 Estrutura
- `src/app/` dividido em **módulos de domínio** (`cadastros`, `compras`, `estoque`, etc.).
- Cada módulo com:
    - `components/`
    - `services/`
    - `models/`
- Reuso de componentes UI sempre que possível.

### 3.2 Componentes
- Nomes em **kebab-case** (`produto-list.component.ts`).
- Usar **Reactive Forms** (`FormBuilder`, `Validators`).
- Erros exibidos via `<small class="err">`.

### 3.3 Serviços
- Um service por recurso (`ProdutosService`, `ComprasService`).
- Centralizar chamadas HTTP.
- Tipar responses com interfaces (`Produto`, `Cliente`).
- Tratar erros no `catchError`.

### 3.4 Estilo & UI
- CSS organizado por componente (`.component.scss`).
- Padrão responsivo (mobile first).
- Uso de ícones do Bootstrap/Material.
- Menu dinâmico conforme permissões do usuário.

### 3.5 Testes
- Unitários em services (mock de HTTP).
- Unitários em components (validação de formulários).
- Testes de integração básicos (fluxo de cadastro, edição, exclusão).

---

## 4) Versionamento & CI/CD
- Branches:
    - `main` → produção.
    - `develop` → homologação.
    - `feature/*` → novas funcionalidades.
- Pull requests com revisão obrigatória (4-olhos).
- Pipeline CI:
    - Lint + Testes unitários.
    - Build Angular + Collectstatic Django.
    - Deploy em ambiente de teste.

---

## 5) Observabilidade
- Logs estruturados em JSON.
- Correlation ID por request.
- Monitorar latência, erros e throughput.
- Alertas básicos (erros 5xx, indisponibilidade).

---

## 6) Documentação
- Cada módulo documentado em `docs/` antes do início do desenvolvimento.
- Alterações refletidas imediatamente no MkDocs.
- Changelog atualizado a cada merge em `develop`.

---

## 7) Riscos & Mitigações
- **Divergência entre backend/frontend** → contrato de APIs formalizado no MkDocs.
- **Baixa cobertura de testes** → CI bloqueia merge se < 70% em domínios críticos.
- **Vazamento de dados entre lojas** → validação estrita de `empresa_id`/`loja_id`.
- **Desorganização de UI** → padronizar CSS e componentes reutilizáveis.

---
