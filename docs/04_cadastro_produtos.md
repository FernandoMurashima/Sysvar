---
title: "04 — Cadastro de Produtos"
description: "Modelos, endpoints e exemplos DRF para os catálogos de produto (Unidade, Cor, Grade/Tamanho, Grupo/Subgrupo, Família, Coleção, Material, NCM) e entidades Produto & SKU."
---

# 04 — Cadastro de Produtos

!!! abstract "Versão"
    **Sysmura — v0.4**  
    _Escopo:_ catálogos de produto e entidades **Produto** e **SKU** (DRF).

!!! info "Autenticação"
    Todas as rotas exigem:
    ```text
    Authorization: Token SEU_TOKEN_AQUI
    ```
    Dica: use `/api/health/` para checar disponibilidade.

---

## 1) Visão geral

Este capítulo cobre os **cadastros de apoio** ao produto e os próprios **produtos/SKUs**:

- **Unidade** — sigla comercial (UN, CX, KG…).  
- **Cor** — paleta/nominal (descricao, cor legada, código, status).  
- **Grade & Tamanho** — tamanhos vinculados a uma grade.  
- **Grupo & Subgrupo** — taxonomia mercadológica.  
- **Família** — família de produto (código/margem).  
- **Coleção** — sazonalidade (código, estação, status, contador auto).  
- **Material** — matéria-prima/base.  
- **NCM** — classificação fiscal.  
- **Produto** — ficha base.  
- **SKU** — variação comercial (cor/tamanho/unidade) com preços.

---

## 2) Modelos (resumo)

> Nomes de campos **conforme a API (backend)**.

### Unidade
- `sigla` *(str, unique, ≤5)*  
- `descricao` *(str, ≤60)*  
- `codigo` *(str, ≤10, opcional)*  
- `data_cadastro` *(auto)*

### Cor
- `descricao` *(str, unique, ≤100)*  
- `codigo` *(str, ≤12, opcional)*  
- `cor` *(str, ≤30, opcional — legado)*  
- `status` *(str, ≤10, opcional — ex.: "Ativo"/"Inativo")*  
- `data_cadastro` *(auto)*

### Grade
- `descricao` *(str, ≤100, idx)*  
- `status` *(str, ≤10, opcional)*  
- `data_cadastro` *(auto)*

### Tamanho
- `grade` *(FK → Grade)*  
- `tamanho` *(str, ≤10 — ex.: P, M, 38…)*  
- `descricao` *(str, ≤100, default="Tamanho")*  
- `status` *(str, ≤10, opcional)*  
- `data_cadastro` *(auto)*  
- **Único por**: (`grade`, `tamanho`)

### Grupo
- `codigo` *(str, ≤12, idx)*  
- `descricao` *(str, ≤100)*  
- `margem` *(decimal, max 6,2, ≥0, default=0)*  
- `data_cadastro` *(auto)*

### Subgrupo
- `grupo` *(FK → Grupo, PROTECT, opcional)*  
- `descricao` *(str, ≤100)*  
- `margem` *(decimal, max 6,2, ≥0, default=0)*  
- `data_cadastro` *(auto)*  
- **Único por**: (`grupo`, `descricao`)

### Família
- `descricao` *(str, unique, ≤100)*  
- `codigo` *(str, ≤10, opcional)*  
- `margem` *(decimal, max 6,2, ≥0, default=0)*  
- `data_cadastro` *(auto)*

### Coleção
- `descricao` *(str, ≤100)*  
- `codigo` *(str, ≤?)*  
- `estacao` *(str, 2 — 01..04)*  
- `status` *(str, opcional: "Ativo"/"Bloqueado"/"Planejamento" ou vazio)*  
- `contador` *(int, somente leitura, se habilitado no modelo)*  
- `data_cadastro` *(auto)*

### Material
- `descricao` *(str, ≤100)*  
- `codigo` *(str, ≤?)*  
- `data_cadastro` *(auto)*

### NCM
- `ncm` *(str — código)*  
- `descricao` *(str)*

### Produto
- `descricao`, `desc_reduzida`, `referencia`  
- `ncm` *(FK)*, `unidade_base` *(FK)*  
- `grupo` *(FK)*, `subgrupo` *(FK)*, `familia` *(FK)*, `colecao` *(FK)*, `material` *(FK)*  
- `produto_foto`, `produto_foto1`, `produto_foto2` *(imagens, opcionais)*  
- `ativo` *(bool)*, `observacoes` *(text, opcional)*  
- `data_cadastro` *(auto)*

### SKU (ProdutoSKU)
- `produto` *(FK → Produto)*  
- `sku`, `ean` *(str)*  
- `unidade` *(FK → Unidade)*, `fator_conversao` *(decimal)*  
- `cor` *(FK → Cor)*, `tamanho` *(FK → Tamanho)*  
- `preco_custo`, `preco_venda` *(decimal)*  
- `ativo` *(bool)*, `data_cadastro` *(auto)*

---

## 3) Endpoints (DRF)

**Base:** `/api/`

| Recurso           | Endpoint          | Métodos                      |
|-------------------|-------------------|------------------------------|
| Unidades          | `/unidades/`      | GET, POST                    |
| Unidade (id)      | `/unidades/{id}/` | GET, PUT, PATCH, DELETE      |
| Cores             | `/cores/`         | GET, POST                    |
| Cor (id)          | `/cores/{id}/`    | GET, PUT, PATCH, DELETE      |
| Grades            | `/grades/`        | GET, POST                    |
| Grade (id)        | `/grades/{id}/`   | GET, PUT, PATCH, DELETE      |
| Tamanhos          | `/tamanhos/`      | GET, POST                    |
| Tamanho (id)      | `/tamanhos/{id}/` | GET, PUT, PATCH, DELETE      |
| Grupos            | `/grupos/`        | GET, POST                    |
| Grupo (id)        | `/grupos/{id}/`   | GET, PUT, PATCH, DELETE      |
| Subgrupos         | `/subgrupos/`     | GET, POST                    |
| Subgrupo (id)     | `/subgrupos/{id}/`| GET, PUT, PATCH, DELETE      |
| Famílias          | `/familias/`      | GET, POST                    |
| Família (id)      | `/familias/{id}/` | GET, PUT, PATCH, DELETE      |
| Coleções          | `/colecoes/`      | GET, POST                    |
| Coleção (id)      | `/colecoes/{id}/` | GET, PUT, PATCH, DELETE      |
| Materiais         | `/materiais/`     | GET, POST                    |
| Material (id)     | `/materiais/{id}/`| GET, PUT, PATCH, DELETE      |
| NCMs              | `/ncms/`          | GET, POST                    |
| NCM (id)          | `/ncms/{id}/`     | GET, PUT, PATCH, DELETE      |
| **Produtos**      | `/produtos/`      | GET, POST                    |
| **Produto (id)**  | `/produtos/{id}/` | GET, PUT, PATCH, DELETE      |
| **SKUs**          | `/skus/`          | GET, POST                    |
| **SKU (id)**      | `/skus/{id}/`     | GET, PUT, PATCH, DELETE      |

### Busca / Filtros / Ordenação
- **Unidades**  
  - Busca: `sigla`, `descricao`, `codigo`  
  - Ordenação: `sigla`
- **Cores**  
  - Busca: `descricao`, `codigo`, `cor`  
  - Ordenação: `descricao`
- **Grades**  
  - Busca: `descricao`, `status`  
  - Ordenação: `descricao`
- **Tamanhos**  
  - Filtro: `grade=<id>`  
  - Busca: `descricao`, `tamanho`, `grade__descricao`  
  - Ordenação: `grade__descricao`, `tamanho`
- **Grupos**  
  - Busca: `descricao`, `codigo`  
  - Ordenação: `descricao`, `codigo`
- **Subgrupos**  
  - Filtro: `grupo=<id>`  
  - Busca: `descricao`, `grupo__descricao`  
  - Ordenação: `descricao`
- **Famílias**  
  - Busca: `descricao`, `codigo`  
  - Ordenação: `descricao`
- **Coleções**  
  - Busca: `descricao`, `codigo`, `estacao`, `status`  
  - Ordenação: `descricao`, `codigo`
- **Materiais**  
  - Busca: `descricao`, `codigo`  
  - Ordenação: `descricao`
- **NCMs**  
  - Busca: `ncm`, `descricao`  
  - Ordenação: `ncm`
- **Produtos**  
  - Filtros: `ativo`, `grupo`, `subgrupo`, `familia`, `colecao`, `material`, `unidade_base`, `ncm`  
  - Busca: `descricao`, `referencia`, `grupo__descricao`, `subgrupo__descricao`, `familia__descricao`, `colecao__descricao`, `material__descricao`, `ncm__ncm`  
  - Ordenação: `descricao`, `referencia`
- **SKUs**  
  - Filtros: `ativo`, `produto`, `unidade`, `cor`, `tamanho`, `produto__grupo`, `produto__familia`, `produto__colecao`  
  - Busca: `sku`, `ean`, `produto__descricao`, `cor__descricao`, `tamanho__tamanho`  
  - Ordenação: `sku`, `ean`, `preco_venda`

---

## 4) Exemplos (PowerShell)

> Substitua `SEU_TOKEN_AQUI` pelo token real.  
> Exemplos usam `Invoke-RestMethod`.

### 4.1 Unidades
**Criar**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/unidades/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "sigla":"UN", "descricao":"Unidade", "codigo":"1" }'
```
**Buscar/Ordenar**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/unidades/?search=UN&ordering=sigla" -Method Get `
  -Headers @{ "Authorization" = "Token SEU_TOKEN_AQUI" }
```

### 4.2 Cores
**Criar**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/cores/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "descricao":"Preto", "codigo":"0001", "cor":"Preto", "status":"Ativo" }'
```

### 4.3 Grades & Tamanhos
**Criar grade**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/grades/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "descricao": "Adulto", "status": "Ativo" }'
```
**Criar tamanho (grade=1)**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/tamanhos/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "grade": 1, "tamanho": "M", "descricao":"Tamanho", "status":"Ativo" }'
```

### 4.4 Grupos & Subgrupos
**Criar grupo**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/grupos/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "codigo":"10", "descricao":"Calça", "margem":"12.5" }'
```
**Criar subgrupo (grupo=1)**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/subgrupos/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "grupo":1, "descricao":"Jeans", "margem":"10.00" }'
```

### 4.5 Família
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/familias/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "descricao":"Básicos", "codigo":"BAS", "margem":"8.00" }'
```

### 4.6 Coleção
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/colecoes/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "descricao":"2025 Verão", "codigo":"25", "estacao":"01", "status":"Planejamento" }'
```

### 4.7 Material
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/materiais/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{ "descricao":"Algodão", "codigo":"ALG" }'
```

### 4.8 NCM
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/ncms/" -Method Get `
  -Headers @{ "Authorization" = "Token SEU_TOKEN_AQUI" }
```

### 4.9 Produto
**Criar (exemplo mínimo)**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/produtos/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{
    "descricao":"Camisa Polo",
    "desc_reduzida":"Polo",
    "referencia":"POLO-001",
    "ncm": 1,
    "unidade_base": 1,
    "grupo": 1,
    "subgrupo": 1,
    "familia": 1,
    "colecao": 1,
    "material": 1,
    "ativo": true,
    "observacoes": "Linha premium"
  }'
```

### 4.10 SKU
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/skus/" -Method Post `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Token SEU_TOKEN_AQUI" } `
  -Body '{
    "produto": 1,
    "sku": "POLO-001-PRETO-M",
    "ean": "1234567890123",
    "unidade": 1,
    "fator_conversao": "1.00",
    "cor": 1,
    "tamanho": 1,
    "preco_custo": "50.00",
    "preco_venda": "129.90",
    "ativo": true
  }'
```

---

## 5) Paginação

Se configurada a paginação global do DRF, use os parâmetros:
```
?page=1&page_size=20
```

---

## 6) Erros comuns & Dicas

- **401 Unauthorized**: faltou o header `Authorization`.  
- **400 Bad Request**: validação (campos obrigatórios, formatos e `unique`).  
- **404 Not Found**: id inexistente/rota incorreta.  
- **Relacionamentos**: ao criar **Tamanho**, **Subgrupo**, **SKU**, garanta os IDs de FK.  
- **Campos exclusivos**: ex.: *Tamanho* único por (`grade`, `tamanho`).

---

## 7) Admin

Gerencie tudo via **Django Admin**:
```
/admin/
```
Com pesquisa, filtros e colunas configuradas em `admin.py`.

