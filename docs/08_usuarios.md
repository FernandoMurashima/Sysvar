---
title: "08 — Usuários (User & Perfil)"
description: "Endpoints, payloads e exemplos para gerenciamento de usuários e perfil no Sysmura (DRF)."
---

# 08 — Usuários (User & Perfil)

!!! abstract "Versão"
    **Sysmura — v0.3**  
    _Novidades:_ adicionados endpoints **/users/** e **/users/me/**. Payload compatível com o front (`type`, `Idloja`) e autenticação por Token.

!!! info "Autenticação"
    Todas as rotas exigem:
    ```text
    Authorization: Token SEU_TOKEN_AQUI
    ```
    Dica: use `/api/health/` para checar disponibilidade.  
    Para obter token: `POST /api/auth/token/` com `username` e `password` (form-data ou JSON).

---

## 1) Visão geral

Este capítulo documenta o **cadastro de usuários do sistema** e a rota para obter os dados do **usuário logado**.

- **User** — baseado em `AbstractUser`, com campo `role` (códigos) e vínculo opcional **Loja**.  
- **Compatibilidade de payload** com o front: o backend aceita `type` (rótulos) e `Idloja` (FK numérica), mapeando internamente para `role` e `loja`.

---

## 2) Modelo (resumo)

### User
- `username` *(str, unique, req.)*  
- `first_name`, `last_name` *(str, opcional)*  
- `email` *(str, opcional)*  
- `role` *(choices, req.)* — armazenado como código:
    | Código | Rótulo      |
    |-------:|-------------|
    | `REG`  | Regular     |
    | `CAX`  | Caixa       |
    | `GER`  | Gerente     |
    | `ADM`  | Admin       |
    | `AUX`  | Auxiliar    |
    | `AST`  | Assistente  |
- `loja` *(FK → Loja, opcional)*  
- `password` *(write-only; obrigatório na criação)*

> No front usamos `type` (`Regular`, `Caixa`, `Gerente`, `Admin`, `Auxiliar`, `Assistente`) e `Idloja`. O backend converte para `role` e `loja` automaticamente.

---

## 3) Endpoints

**Base:** `/api/`

| Recurso          | Endpoint          | Métodos                  | Observações |
|------------------|-------------------|--------------------------|-------------|
| **Usuários**     | `/users/`         | GET, POST                | Busca por `?search=` (username, nome, email) e ordenação por `?ordering=` (ex.: `-id`). |
| Usuário (id)     | `/users/{id}/`    | GET, PATCH, DELETE       | Atualização parcial recomendada (PATCH). |
| **Meu perfil**   | `/users/me/`      | GET                      | Retorna dados do usuário autenticado. |

### Busca / Ordenação
- **Busca** (`?search=`): `username`, `first_name`, `last_name`, `email`  
- **Ordenação** (`?ordering=`): `id`, `username` (ex.: `?ordering=-id`)

> Dependendo da configuração do projeto, podem existir filtros adicionais (`?loja=`, `?role=`).

---

## 4) Mapeamento de campos (Front ⇄ Backend)

| Front (enviar) | Backend (armazenado) | Tipo / Regra |
|---|---|---|
| `username` | `username` | **obrigatório**; máx. 150; somente `A-Za-z0-9_.-` |
| `first_name` | `first_name` | opcional |
| `last_name` | `last_name` | opcional |
| `email` | `email` | opcional; formato válido |
| `type` | `role` | **obrigatório**; rótulos aceitos: `Regular`, `Caixa`, `Gerente`, `Admin`, `Auxiliar`, `Assistente` |
| `Idloja` | `loja` | opcional; enviar **número** (id da loja) |
| `password` | `password` | **obrigatório na criação** (mín. 6); opcional em updates |

**Retorno típico (`GET /users/`):**
```json
[
  {
    "id": 7,
    "username": "maria",
    "first_name": "Maria",
    "last_name": "Souza",
    "email": "maria@exemplo.com",
    "type": "Gerente",
    "role": "GER",
    "loja": 1
  }
]
```

**Retorno (`GET /users/me/`):**
```json
{
  "id": 7,
  "username": "maria",
  "role": "GER",
  "loja": 1
}
```

---

## 5) Exemplos (PowerShell)

> Substitua o token real. Todos os exemplos usam `Invoke-RestMethod`.

### 5.1 Obter Token
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/token/" -Method Post `
  -Body @{ username = "admin"; password = "senha123" }
```

### 5.2 Meu Perfil
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/users/me/" -Method Get `
  -Headers @{ "Authorization" = "Token SEU_TOKEN_AQUI" }
```

### 5.3 Listar Usuários (com busca/ordenação)
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/users/?search=maria&ordering=-id" -Method Get `
  -Headers @{ "Authorization" = "Token SEU_TOKEN_AQUI" }
```

### 5.4 Criar Usuário
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/users/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{
    "username": "joao",
    "first_name": "João",
    "last_name": "Silva",
    "email": "joao@exemplo.com",
    "type": "Regular",
    "Idloja": 1,
    "password": "minhaSenhaForte"
  }'
```

### 5.5 Atualizar Parcial (PATCH)
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/users/7/" -Method Patch `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "type": "Gerente", "Idloja": 2 }'
```

### 5.6 Excluir
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/users/7/" -Method Delete `
  -Headers @{ "Authorization" = "Token SEU_TOKEN_AQUI" }
```

---

## 6) Paginação (GET)
Se configurada no projeto, as listas retornam com paginação DRF. Parâmetros usuais:
```
?page=1&page_size=20
```

---

## 7) Erros comuns & Dicas

- **401 Unauthorized** — faltou header `Authorization`.  
- **400 Bad Request** — validação: `username` inválido, `email` inválido, `type` desconhecido, `password` curto ou ausente na criação.  
- **404 Not Found** — usuário inexistente ou endpoint incorreto (ex.: `/users/me/` em vez de `/me/` ou vice-versa).  
- **Conflitos de nomes de campos** — no front use `type` e `Idloja`. O backend traduz para `role`/`loja`.  
- **Senha** — só envie `password` quando for **definir/alterar** a senha.

---

## 8) Changelog (resumo)
- **v0.3** — Criação dos endpoints `/users/` e `/users/me/`; compatibilidade de payload com `type` e `Idloja`; exemplos atualizados.
- **v0.2** — Cadastros base consolidados (Loja, Cliente, Fornecedor, Funcionário).
- **v0.1** — Estrutura inicial e autenticação por Token.
