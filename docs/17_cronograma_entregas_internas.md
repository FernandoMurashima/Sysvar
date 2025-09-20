# SysMura — Cronograma de Entregas Internas (v1)

> Este capítulo define a linha do tempo sugerida para execução dos blocos B1–B5 e checklist final, com marcos internos de validação (QA, UAT, documentação).

---

## 1) Estrutura de Blocos

- **B1 — Fundamentos & Cadastros & RBAC**  
- **B2 — Compras/Entradas & Estoque**  
- **B3 — Vendas & Financeiro & PDV**  
- **B4 — Relatórios & Consolidação**  
- **B5 — Recursos Plus (Promoções, Cashback, Transferências, Fiscal, Multiloja)**  
- **Go-Live — Checklist Final v1**

---

## 2) Cronograma Macro (estimado)

| Bloco | Conteúdo Principal | Duração Estimada | Marcos de Validação |
|-------|-------------------|------------------|---------------------|
| **B1** | Fundamentos (multi-tenant, RBAC, cadastros básicos, menu, CSV) | 4–6 semanas | QA cadastros + RBAC; UAT permissões; Doc cap. 11 pronta |
| **B2** | Compras, Entradas, NF-e import, Estoque, Ajustes, Inventário | 6–8 semanas | QA fluxo PO→Entrada→Estoque; UAT inventário; Doc cap. 12 pronta |
| **B3** | Vendas, Devoluções, PDV (offline/online), Financeiro (AP/AR, baixas) | 8–10 semanas | QA vendas→estoque→financeiro; UAT PDV; Doc cap. 13 pronta |
| **B4** | Relatórios (Estoque, Vendas, Financeiro, DRE) + Exportações | 4–6 semanas | QA consistência relatórios; UAT escopo loja; Doc cap. 14 pronta |
| **B5** | Promoções, Cashback, Transferências, Multi-loja, Fiscal (NFC-e/NF-e) | 8–12 semanas | QA transferências e fiscais; UAT multi-loja; Doc cap. 15 pronta |
| **Go-Live** | Checklist final (cap. 16), testes integrados, migração SysVar→SysMura | 2–3 semanas | QA regressivo; UAT geral; Aprovação final |

---

## 3) Linha do Tempo (visual simplificada)

- **Mês 1–2** → B1 concluído  
- **Mês 3–4** → B2 concluído  
- **Mês 5–7** → B3 concluído  
- **Mês 8** → B4 concluído  
- **Mês 9–11** → B5 concluído  
- **Mês 12** → Checklist Go-Live + Deploy  

*(ajustar conforme velocidade e equipe disponível)*

---

## 4) Marcos Transversais
- **Documentação**: cada bloco só inicia após documentação validada.  
- **QA**: rodado ao final de cada bloco.  
- **UAT (User Acceptance Test)**: rodado em ambiente de homologação antes de liberar o próximo bloco.  
- **Migração SysVar → SysMura**: testada em paralelo a B3–B4.  
- **Revisões semanais**: acompanhamento de progresso e riscos.  

---

## 5) Critérios para Avançar de Bloco
- Documentação atualizada no MkDocs.  
- Testes unitários e funcionais mínimos cumpridos.  
- QA interno concluído com relatório.  
- UAT validado pelo responsável de negócio.  
- Changelog atualizado.  

---

## 6) Observações
- Estimativas são referenciais: podem variar conforme recursos de equipe.  
- B5 (Recursos Plus) é o bloco mais **extenso e arriscado** (Promoções, Fiscal, Multi-loja). Planejar reforço de QA.  
- O cronograma macro pode ser convertido em **sprints** (2 semanas) para gestão ágil.  

---
