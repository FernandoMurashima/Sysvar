# SysMura — Tabela de Atributos Essenciais (v3)

> Base para modelagem em Django/MySQL. Campos em `snake_case`. Tipos MySQL sugeridos. Datas em UTC. Valores monetários em `DECIMAL(12,2)`. Quantidades em `DECIMAL(12,3)`.

---

## 1) Organização (Empresa / Loja / Usuário)

### **empresa**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | PK |
| nome_fantasia | VARCHAR(150) | | | ✖ | | | |
| razao_social | VARCHAR(200) | | | ✖ | | | |
| cnpj | CHAR(14) | | | ✖ | ✔ | | Somente dígitos |
| inscr_estadual | VARCHAR(20) | | | ✔ | | | |
| regime_tributario | ENUM('simples','presumido','real') | | | ✖ | | 'simples' | |
| ativo | TINYINT(1) | | | ✖ | | 1 | |
| criacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| atualizacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Índices**: `UNIQUE(cnpj)`.

---

### **loja**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| nome | VARCHAR(120) | | | ✖ | | | |
| codigo | VARCHAR(30) | | | ✖ | | | Código curto da loja |
| cnpj | CHAR(14) | | | ✔ | | | |
| tipo_loja | ENUM('fisica','ecommerce','quiosque','deposito') | | | ✖ | | 'fisica' | |
| logradouro | VARCHAR(120) | | | ✔ | | | |
| numero | VARCHAR(10) | | | ✔ | | | |
| complemento | VARCHAR(60) | | | ✔ | | | |
| bairro | VARCHAR(60) | | | ✔ | | | |
| cidade | VARCHAR(60) | | | ✔ | | | |
| uf | CHAR(2) | | | ✔ | | | |
| cep | CHAR(8) | | | ✔ | | | |
| ativo | TINYINT(1) | | | ✖ | | 1 | |
| criacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| atualizacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Índices**: `UNIQUE(empresa_id,codigo)`; `FK(empresa_id)`.

---

### **usuario**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | Usuário vinculado a 1 loja |
| nome | VARCHAR(120) | | | ✖ | | | |
| email | VARCHAR(180) | | | ✖ | ✔ | | Lowercased |
| hash_senha | VARCHAR(255) | | | ✖ | | | |
| perfil | ENUM('admin_empresa','gerente_loja','operador') | | | ✖ | | 'operador' | |
| ativo | TINYINT(1) | | | ✖ | | 1 | |
| ultimo_login_em | DATETIME | | | ✔ | | | |
| criacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| atualizacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Índices**: `UNIQUE(email)`; `FK(loja_id)`.

---

## 2) Produtos / SKU / Preços

### **produto**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| nome | VARCHAR(180) | | | ✖ | | | |
| codigo | VARCHAR(60) | | | ✖ | | | Código interno |
| ncm | VARCHAR(8) | | | ✔ | | | |
| marca | VARCHAR(80) | | | ✔ | | | |
| unidade_medida | VARCHAR(6) | | | ✖ | | 'UN' | |
| peso_liquido | DECIMAL(10,3) | | | ✔ | | 0 | kg |
| peso_bruto | DECIMAL(10,3) | | | ✔ | | 0 | kg |
| altura_cm | DECIMAL(10,2) | | | ✔ | | 0 | |
| largura_cm | DECIMAL(10,2) | | | ✔ | | 0 | |
| profundidade_cm | DECIMAL(10,2) | | | ✔ | | 0 | |
| ativo | TINYINT(1) | | | ✖ | | 1 | |
| criacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| atualizacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Índices**: `UNIQUE(empresa_id,codigo)`; `FK(empresa_id)`.

---

### **cor** (catálogo)
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| nome | VARCHAR(60) | | | ✖ | | | |
| codigo_hex | CHAR(7) | | | ✔ | | | `#RRGGBB` |
| ativo | TINYINT(1) | | | ✖ | | 1 | |

---

### **tamanho** (catálogo)
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| nome | VARCHAR(30) | | | ✖ | | | |
| ordem | INT | | | ✔ | | | Ordenação |
| ativo | TINYINT(1) | | | ✖ | | 1 | |

---

### **sku**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| produto_id | BIGINT UNSIGNED | | produto(id) | ✖ | | | |
| cor_id | BIGINT UNSIGNED | | cor(id) | ✔ | | | |
| tamanho_id | BIGINT UNSIGNED | | tamanho(id) | ✔ | | | |
| codigo_sku | VARCHAR(80) | | | ✖ | | | Visível no PDV/ERP |
| gtin | VARCHAR(14) | | | ✔ | ✔ | | EAN/UPC |
| ativo | TINYINT(1) | | | ✖ | | 1 | |
| criacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| atualizacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Restrições**: `UNIQUE(produto_id,coalesce(cor_id,0),coalesce(tamanho_id,0))` (garante uma combinação por produto).

---

### **tabela_preco**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✔ | | | Escopo opcional por loja |
| nome | VARCHAR(80) | | | ✖ | | | |
| vigencia_inicio | DATE | | | ✔ | | | |
| vigencia_fim | DATE | | | ✔ | | | |
| status | ENUM('rascunho','ativa','inativa') | | | ✖ | | 'rascunho' | |

**Índices**: `FK(empresa_id)`, `FK(loja_id)`.

### **tabela_preco_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| tabela_preco_id | BIGINT UNSIGNED | | tabela_preco(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| preco | DECIMAL(12,2) | | | ✖ | | 0 | BRL |
| moeda | CHAR(3) | | | ✖ | | 'BRL' | |
| criacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| atualizacao_em | DATETIME | | | ✖ | | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Restrições**: `UNIQUE(tabela_preco_id, sku_id)`.

---

## 3) Compras / Entradas

### **fornecedor**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| nome_fantasia | VARCHAR(150) | | | ✖ | | | |
| razao_social | VARCHAR(200) | | | ✖ | | | |
| cnpj_cpf | VARCHAR(14) | | | ✖ | | | Somente dígitos |
| inscr_estadual | VARCHAR(20) | | | ✔ | | | |
| email | VARCHAR(180) | | | ✔ | | | |
| telefone | VARCHAR(20) | | | ✔ | | | |
| logradouro/bairro/cidade/uf/cep | VARCHARs | | | ✔ | | | Endereço |
| ativo | TINYINT(1) | | | ✖ | | 1 | |

**Índices**: `INDEX(cnpj_cpf)`; `FK(empresa_id)`.

---

### **pedido_compra**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| fornecedor_id | BIGINT UNSIGNED | | fornecedor(id) | ✖ | | | |
| numero | VARCHAR(30) | | | ✖ | | | Sequencial por empresa |
| data_emissao | DATE | | | ✖ | | | |
| status | ENUM('rascunho','enviado','aprovado','cancelado','parcialmente_recebido','recebido') | | | ✖ | | 'rascunho' | |
| condicao_pagamento_id | BIGINT UNSIGNED | | condicao_pagamento(id) | ✔ | | | |
| observacoes | TEXT | | | ✔ | | | |
| total_bruto | DECIMAL(12,2) | | | ✖ | | 0 | |
| total_desconto | DECIMAL(12,2) | | | ✖ | | 0 | |
| total_liquido | DECIMAL(12,2) | | | ✖ | | 0 | |
| criacao_em/atualizacao_em | DATETIME | | | ✖ | | | Auditar |

**Índices**: `UNIQUE(empresa_id,numero)`; FKs.

### **pedido_compra_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| pedido_compra_id | BIGINT UNSIGNED | | pedido_compra(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| quantidade | DECIMAL(12,3) | | | ✖ | | 0 | |
| preco_unitario | DECIMAL(12,4) | | | ✖ | | 0 | |
| desconto_percentual | DECIMAL(5,2) | | | ✔ | | 0 | |
| total_item | DECIMAL(12,2) | | | ✖ | | 0 | |

**Restrições**: `UNIQUE(pedido_compra_id, sku_id)`.

---

### **entrada**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| fornecedor_id | BIGINT UNSIGNED | | fornecedor(id) | ✖ | | | |
| pedido_compra_id | BIGINT UNSIGNED | | pedido_compra(id) | ✖ | | | Obrigatório por regra |
| numero_documento | VARCHAR(60) | | | ✔ | | | NF-e/Chave |
| data_entrada | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| natureza_id | BIGINT UNSIGNED | | natureza_lancamento(id) | ✖ | | | |
| status | ENUM('aberta','confirmada','cancelada') | | | ✖ | | 'aberta' | |
| total_itens | DECIMAL(12,2) | | | ✖ | | 0 | |
| total_acessorias | DECIMAL(12,2) | | | ✖ | | 0 | |
| total_geral | DECIMAL(12,2) | | | ✖ | | 0 | |

### **entrada_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| entrada_id | BIGINT UNSIGNED | | entrada(id) | ✖ | | | |
| sequencia | INT | | | ✖ | | | Para permitir múltiplas linhas iguais |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| quantidade | DECIMAL(12,3) | | | ✖ | | 0 | |
| custo_unitario | DECIMAL(12,4) | | | ✖ | | 0 | Sem rateio |
| custo_unitario_rateado | DECIMAL(12,4) | | | ✖ | | 0 | Com rateio |
| total | DECIMAL(12,2) | | | ✖ | | 0 | |
| pedido_compra_item_id | BIGINT UNSIGNED | | pedido_compra_item(id) | ✔ | | | |

**Restrições**: `UNIQUE(entrada_id,sequencia)`.

### **despesa_acessoria_entrada**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| entrada_id | BIGINT UNSIGNED | | entrada(id) | ✖ | | | |
| tipo | ENUM('frete','seguro','imposto','outros') | | | ✖ | | | |
| valor | DECIMAL(12,2) | | | ✖ | | 0 | |

### **rateio_acessoria_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| entrada_item_id | BIGINT UNSIGNED | | entrada_item(id) | ✖ | | | |
| despesa_id | BIGINT UNSIGNED | | despesa_acessoria_entrada(id) | ✖ | | | |
| valor_rateado | DECIMAL(12,2) | | | ✖ | | 0 | Rateio por valor (v1) |

---

### **natureza_lancamento**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| nome | VARCHAR(80) | | | ✖ | | | |
| tipo_estoque | ENUM('ENTRADA','SAIDA','NENHUM') | | | ✖ | | 'NENHUM' | |
| tipo_financeiro | ENUM('GERA_TITULO','BAIXA_DIRETA','NENHUM') | | | ✖ | | 'NENHUM' | |
| centro_custo_id | BIGINT UNSIGNED | | centro_custo(id) | ✔ | | | |

---

## 4) Estoque

### **estoque** (saldo)
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| saldo | DECIMAL(12,3) | | | ✖ | | 0 | |
| reservado | DECIMAL(12,3) | | | ✖ | | 0 | |

**Restrições**: `UNIQUE(loja_id, sku_id)`.

### **movimento_estoque**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| data_mov | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| tipo | ENUM('ENTRADA','SAIDA','AJUSTE','TRANSFERENCIA','INVENTARIO') | | | ✖ | | | Direção macro |
| referencia_tipo | ENUM('ENTRADA','VENDA','AJUSTE','INVENTARIO','TRANSFERENCIA') | | | ✖ | | | Documento gerador |
| referencia_id | BIGINT UNSIGNED | | | ✖ | | | ID do documento |
| quantidade | DECIMAL(12,3) | | | ✖ | | 0 | Sinal + entrada, − saída |
| observacao | VARCHAR(255) | | | ✔ | | | |

**Índices**: `INDEX(loja_id, sku_id, data_mov)`, `INDEX(referencia_tipo, referencia_id)`.

### **ajuste_estoque**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| natureza_id | BIGINT UNSIGNED | | natureza_lancamento(id) | ✖ | | | tipo_estoque='AJUSTE' (regra) |
| status | ENUM('rascunho','aprovado','cancelado') | | | ✖ | | 'rascunho' | |
| justificativa | VARCHAR(255) | | | ✔ | | | |
| criado_em/atualizado_em | DATETIME | | | ✖ | | | |

### **ajuste_estoque_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| ajuste_id | BIGINT UNSIGNED | | ajuste_estoque(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| quantidade | DECIMAL(12,3) | | | ✖ | | 0 | + ganho; − perda |

---

### **inventario**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| status | ENUM('aberto','em_contagem','fechado','cancelado') | | | ✖ | | 'aberto' | |
| data | DATE | | | ✖ | | | |
| observacao | VARCHAR(255) | | | ✔ | | | |

### **inventario_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| inventario_id | BIGINT UNSIGNED | | inventario(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| qtd_contada | DECIMAL(12,3) | | | ✖ | | 0 | |
| qtd_sistema | DECIMAL(12,3) | | | ✖ | | 0 | Snapshot |

---

### **transferencia**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| loja_origem_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| loja_destino_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| natureza_id | BIGINT UNSIGNED | | natureza_lancamento(id) | ✖ | | | tipo_estoque reflete saída/entrada |
| status | ENUM('rascunho','aprovacao','expedida','recebida','cancelada') | | | ✖ | | 'rascunho' | |
| observacao | VARCHAR(255) | | | ✔ | | | |

### **transferencia_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| transferencia_id | BIGINT UNSIGNED | | transferencia(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| quantidade | DECIMAL(12,3) | | | ✖ | | 0 | |

---

## 5) Vendas

### **venda**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| loja_id | BIGINT UNSIGNED | | loja(id) | ✖ | | | |
| cliente_id | BIGINT UNSIGNED | | cliente(id) | ✔ | | | Nulo = balcão |
| condicao_pagamento_id | BIGINT UNSIGNED | | condicao_pagamento(id) | ✔ | | | |
| vendedor_id | BIGINT UNSIGNED | | usuario(id) | ✔ | | | |
| data_venda | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| status | ENUM('aberta','faturada','cancelada') | | | ✖ | | 'aberta' | |
| total_bruto | DECIMAL(12,2) | | | ✖ | | 0 | |
| total_descontos | DECIMAL(12,2) | | | ✖ | | 0 | |
| total_liquido | DECIMAL(12,2) | | | ✖ | | 0 | |

### **venda_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| venda_id | BIGINT UNSIGNED | | venda(id) | ✖ | | | |
| sku_id | BIGINT UNSIGNED | | sku(id) | ✖ | | | |
| quantidade | DECIMAL(12,3) | | | ✖ | | 0 | |
| preco_unitario | DECIMAL(12,4) | | | ✖ | | 0 | |
| tabela_preco_id | BIGINT UNSIGNED | | tabela_preco(id) | ✔ | | | |
| total_item | DECIMAL(12,2) | | | ✖ | | 0 | |

### **forma_pagamento**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| descricao | VARCHAR(60) | | | ✖ | | | Ex.: Dinheiro, Pix, Cartão |
| ativo | TINYINT(1) | | | ✖ | | 1 | |

### **condicao_pagamento**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| descricao | VARCHAR(80) | | | ✖ | | | Ex.: 30/60, 3x s/ juros |
| regras_parcela | JSON | | | ✖ | | | Ex.: [{"dias":0, "percent":100}] |

---

## 6) Financeiro

### **receber**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| venda_id | BIGINT UNSIGNED | | venda(id) | ✖ | | | |
| cliente_id | BIGINT UNSIGNED | | cliente(id) | ✔ | | | |
| valor_total | DECIMAL(12,2) | | | ✖ | | 0 | |
| status | ENUM('aberto','parcial','baixado','cancelado') | | | ✖ | | 'aberto' | |

### **receber_parcela**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| receber_id | BIGINT UNSIGNED | | receber(id) | ✖ | | | |
| vencimento | DATE | | | ✖ | | | |
| valor | DECIMAL(12,2) | | | ✖ | | 0 | |
| status | ENUM('aberto','parcial','baixado','cancelado') | | | ✖ | | 'aberto' | |
| forma_pagamento_id | BIGINT UNSIGNED | | forma_pagamento(id) | ✔ | | | |

### **pagar**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| entrada_id | BIGINT UNSIGNED | | entrada(id) | ✖ | | | |
| fornecedor_id | BIGINT UNSIGNED | | fornecedor(id) | ✖ | | | |
| valor_total | DECIMAL(12,2) | | | ✖ | | 0 | |
| status | ENUM('aberto','parcial','baixado','cancelado') | | | ✖ | | 'aberto' | |

### **pagar_parcela**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| pagar_id | BIGINT UNSIGNED | | pagar(id) | ✖ | | | |
| vencimento | DATE | | | ✖ | | | |
| valor | DECIMAL(12,2) | | | ✖ | | 0 | |
| status | ENUM('aberto','parcial','baixado','cancelado') | | | ✖ | | 'aberto' | |
| forma_pagamento_id | BIGINT UNSIGNED | | forma_pagamento(id) | ✔ | | | |

### **conta_financeira**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| empresa_id | BIGINT UNSIGNED | | empresa(id) | ✖ | | | |
| tipo | ENUM('caixa','banco','cartao','pix','outros') | | | ✖ | | | |
| descricao | VARCHAR(120) | | | ✖ | | | |
| ativo | TINYINT(1) | | | ✖ | | 1 | |

### **movimento_conta**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| conta_id | BIGINT UNSIGNED | | conta_financeira(id) | ✖ | | | |
| data_mov | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| tipo | ENUM('credito','debito') | | | ✖ | | | |
| valor | DECIMAL(12,2) | | | ✖ | | 0 | |
| origem | VARCHAR(40) | | | ✖ | | | 'receber_parcela' ou 'pagar_parcela' |
| origem_id | BIGINT UNSIGNED | | | ✖ | | | ID da parcela |

**Índices**: `INDEX(conta_id, data_mov)`, `INDEX(origem, origem_id)`.

### **baixa**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| data | DATETIME | | | ✖ | | CURRENT_TIMESTAMP | |
| valor_total | DECIMAL(12,2) | | | ✖ | | 0 | |
| observacao | VARCHAR(255) | | | ✔ | | | |

### **baixa_item**
| Campo | Tipo | PK | FK | Nulo | Único | Default | Observações |
|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED AI | ✔ | | ✖ | ✔ | | |
| baixa_id | BIGINT UNSIGNED | | baixa(id) | ✖ | | | |
| tipo | ENUM('AR','AP') | | | ✖ | | | AR=Receber, AP=Pagar |
| parcela_id | BIGINT UNSIGNED | | (receber_parcela|pagar_parcela)(id) | ✖ | | | FK condicional por tipo |
| conta_id | BIGINT UNSIGNED | | conta_financeira(id) | ✖ | | | |
| valor | DECIMAL(12,2) | | | ✖ | | 0 | |

**Regra**: cada `baixa_item` gera um `movimento_conta` correspondente (crédito para AR, débito para AP).

---

## 7) Observações gerais
- **Monetários**: `DECIMAL(12,2)`; **quantidades**: `DECIMAL(12,3)`.
- **Datas**: UTC; timezone tratado na aplicação.
- **Auditoria**: acrescentar `criado_por` / `atualizado_por` nas tabelas operacionais.
- **Integridade**: confirmar documentos em transação para manter saldos consistentes.

## 8) Próximos passos
1. Revisar/ajustar nomes e enums.
2. Definir **regras de status** por documento (máquinas de estado) e gatilhos de geração de movimentos.
3. (Opcional) Constraints/Triggers MySQL úteis (ex.: impedir `entrada` sem PO aprovado).
