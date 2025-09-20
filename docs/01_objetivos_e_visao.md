SysMura — Objetivos e Visão do Produto
# 1. Objetivos
## 1.1 Objetivo Geral

Desenvolver um sistema de gestão para pequenos lojistas de moda masculina e feminina, que seja simples, acessível e completo, fornecendo ao lojista uma visão clara do seu negócio sem custo elevado de implantação, operação ou treinamento.

### Objetivos Específicos

- Baixo custo de operação: arquitetura enxuta, interface intuitiva, treinamento mínimo.
- Escalabilidade comercial: licenciamento multiempresa com manutenção fácil do código.
- Controle integrado: unificar cadastros, estoque, compras, vendas, financeiro e relatórios.
- Flexibilidade operacional: lançamentos que podem impactar estoque, financeiro, ambos ou nenhum, conforme Natureza de Lançamento.
- Análise de resultado: permitir que o lojista veja lucro/prejuízo a qualquer momento (custos, receitas e despesas).
- Expansão modular: base preparada para PDV SysMura (módulo separado), NF-e, promoções e cashback.

#2. Visão do Produto
##2.1 Público-alvo

Pequenos lojistas do varejo de moda masculina e feminina que precisam de organização e visão do negócio sem a complexidade e o custo de ERPs tradicionais.

##2.2 Escopo Intencional (módulos)

- Cadastros
- Produtos (grades, cores, tamanhos), Clientes, Fornecedores
- Natureza de Lançamento (define reflexos em estoque/financeiro)
- Estoque
- Entradas/saídas, inventário, relatórios de movimentação e posição
- Compras & Notas
- Pedido de Compra (PO) obrigatório para qualquer entrada
- Revenda: entrada impacta estoque + financeiro
- Uso/Consumo (gás, água, energia, telefone etc.): entrada impacta somente financeiro
- Vendas
- Relatórios por período/produto/cliente (o PDV SysMura será módulo à parte, porém integrado)
- Financeiro
- Contas a pagar/receber, conciliações e fluxo de caixa
- Base para apuração de margem e resultado operacional
- Promoções & Cashback
- Regras simples aplicáveis nas vendas
- Relatórios Integrados
- Visão consolidada do negócio (estoque, compras, vendas, financeiro)

##2.3 Premissas de Arquitetura (alto nível)

- Back-end: Django/DRF (nuvem) • Banco: MySQL • Front-end: Angular (local)
- API versionada desde o início: /api/v1
- Autenticação: JWT (access/refresh), preparada para perfis de acesso (RBAC)
- Multiempresa: dados isolados por licença/empresa
- Auditoria: registros de quem/quando/o quê em operações críticas
- Documentação viva (MkDocs): decisões registradas e revisáveis ao longo do projeto

##2.4 Itens futuros planejados (fora do MVP imediato, mas no produto)

- PDV SysMura (módulo separado, integrado a estoque/financeiro)
- NF-e e integrações fiscais
- Regras avançadas de promoções e programas de fidelidade/cashback