---
title: "02 — Cadastros Base (Loja, Cliente, Fornecedor, Funcionário)"
description: "Modelos, endpoints e exemplos DRF para Loja, Cliente, Fornecedor e Funcionário."
---

# 02 — Cadastros Base (Loja, Cliente, Fornecedor, Funcionário)

!!! abstract "Versão"
    **Sysmura — v0.2**  
    _Novidades:_ incluído o cadastro **Funcionário** (FK para Loja) e exemplos de integração.

!!! info "Autenticação"
    Todas as rotas exigem:
    ```text
    Authorization: Token SEU_TOKEN_AQUI
    ```
    Dica: use `/api/health/` para checar disponibilidade.

---

## 1) Visão geral

Este capítulo documenta os **cadastros essenciais** do backend:

- **Loja** — unidade (CNPJ único, endereço/contato).
- **Cliente** — pessoa/entidade compradora (CPF único).
- **Fornecedor** — parceiro de suprimento (CNPJ único).
- **Funcionário** — colaborador vinculado a **Loja**, com **categoria**, **meta** e **datas**.

---

## 2) Modelos (resumo)

### Loja
- `nome` *(str, idx)* — nome fantasia  
- `cnpj` *(str, unique)*  
- `cidade`, `estado` *(UF)*  
- `telefone1`, `email` *(validação)*  
- `data_cadastro` *(auto)*

### Cliente
- `nome` *(idx)*, `apelido`  
- `cpf` *(unique + validação)*  
- Endereço/contato: `cidade`, `estado`, `cep`, `email`  
- Flags: `bloqueio`, `mala_direta`  
- `data_cadastro` *(auto)*

### Fornecedor
- `nome` *(idx)*  
- `cnpj` *(unique + validação)*  
- `contato`, `telefone1`, `email`  
- `ativo` *(bool, idx)*  
- `data_cadastro` *(auto)*

### Funcionário
- `nome` *(idx)* — (no front o campo é “nomefuncionario”, a API recebe **`nome`**)  
- `apelido`  
- `cpf` *(unique + validação, opcional)*  
- `categoria` *(choices: Tecnico, Caixa, Gerente, Vendedor, Assistente, Auxiliar, Diretoria)*  
- `meta` *(decimal ≥ 0, opcional)*  
- `inicio`, `fim` *(date, opcionais)*  
- **`loja`** *(FK → Loja, obrigatório)*  
- `data_cadastro` *(auto)*

> Modelos completos em `sysmura_app/models.py`.

---

## 3) Endpoints (DRF)

**Base:** `/api/`

| Recurso           | Endpoint                 | Métodos                      |
|-------------------|--------------------------|------------------------------|
| Lojas             | `/lojas/`                | GET, POST                    |
| Loja (id)         | `/lojas/{id}/`           | GET, PUT, PATCH, DELETE      |
| Clientes          | `/clientes/`             | GET, POST                    |
| Cliente (id)      | `/clientes/{id}/`        | GET, PUT, PATCH, DELETE      |
| Fornecedores      | `/fornecedores/`         | GET, POST                    |
| Fornecedor (id)   | `/fornecedores/{id}/`    | GET, PUT, PATCH, DELETE      |
| **Funcionários**  | **`/funcionarios/`**     | **GET, POST**                |
| Funcionário (id)  | **`/funcionarios/{id}/`**| **GET, PUT, PATCH, DELETE**  |

### Busca / Filtros / Ordenação
- **Busca** (`?search=`):
  - Lojas: `nome`, `cnpj`, `cidade`, `estado`
  - Clientes: `nome`, `cpf`, `cidade`, `estado`, `email`
  - Fornecedores: `nome`, `cnpj`, `contato`, `email`, `telefone1`, `telefone2`
  - Funcionários: `nome`, `apelido`, `cpf`, `categoria`
- **Filtros**:
  - Fornecedores: `ativo`, `cidade`, `estado`
  - Funcionários: `loja=<id>`, `categoria=<valor>`
- **Ordenação** (`?ordering=`):
  - Lojas: `nome`, `cnpj`, `cidade`, `estado`
  - Clientes: `nome`, `cpf`, `cidade`, `estado`
  - Fornecedores: `nome`, `cnpj`
  - Funcionários: `nome`, `categoria`, `data_cadastro`

**Exemplos**
```text
/api/clientes/?search=silva&ordering=nome
/api/fornecedores/?ativo=true&estado=SP&ordering=nome
/api/lojas/?search=matriz
/api/funcionarios/?loja=1&ordering=nome
