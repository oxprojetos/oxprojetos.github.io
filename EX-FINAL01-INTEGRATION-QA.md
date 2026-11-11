# EX-FINAL-01 | OX Extractor v0.4 | Frontend integrado

**Data:** 10/11/2026. **Escopo:** integração isolada de PR #5 WPP-01, PR #6 CNAE-01 e PR #7 EX-EXPORT-01..04, preservando `main` e a versão publicada.

## Proveniência

- `main` de referência: `997600171716831995a333e744135375b983522f`
- WPP-01R1 PR #5: `e02448600e795d0af03ccceb8891e282a9ca9628`
- CNAE-01 PR #6: `ffc343eae11df1d6e1972060d0b1c2dd5aef417e`
- EX-EXPORT-01..04 PR #7: `59bb7f26c6c77020f678791ea456190092c03144`
- Branch integrada baseada exatamente no commit do PR #7, com os arquivos íntegros do PR #6, `index.html` mesclado e filtro local de cidade adicionado.
- Nenhum PR anterior foi sobrescrito ou fechado. Esta branch é candidata, não publicação.

## Funcionalidades combinadas

- Ícones WhatsApp por telefone candidato, com preservação do número de origem e descarte de fragmentos inválidos.
- Autocomplete por código/nome com catálogo local oficial IBGE (1.332 subclasses), inclusive teclado e toque.
- Até cinco CNAEs simultâneos, deduplicação por CNPJ e proteção contra falha parcial da consulta.
- Exportação em CSV, XLS e XLSX: scope `filtered` (padrão mais seguro) ou `all`, sem limitar dados à página visual. CNPJ como texto e capital válido como número no Excel.
- Filtro dedicado de cidade sobre registros **já carregados**, combinável com texto/ativos/contato e aplicado também à exportação filtrada. Case- e accent-insensitive: `Belem` encontra `Belém`.
- UI informa que filtro de cidade **não realiza consulta municipal à base completa**. Pesquisa municipal abrangente exige contrato de backend/fonte separado.

## QA no laboratório offline da VPS

- Merge Git automático entre base PR #7 e código PR #6, `index.html` sem conflito; `git diff --check` sem erros.
- Node: 13/13 testes PASS, incluindo arquivos versionados do PR #7 e regressões de WhatsApp; uso de mocks, sem chamadas reais.
- Navegador Chrome com isolamento de rede via `unshare`: seis suítes PASS: WhatsApp (54), CNAE autocomplete (46), multi-CNAE (71), v0.4 (96), touchscreen/acessibilidade (259), exportações/cidade (46). **572 assertions registradas nas suítes, não necessariamente independentes**. Zero tráfego externo observado.
- Filtros cidade + ativa: 20 sintéticas totais, 7 ativas, 3 ativas em Belém, aceitando digitação `Belem`; exportar todos ainda seleciona 20. Exportações reais da UI simulada local baixam CSV/XLSX sem enviar dados.
- Limites: sem login real na candidata, sem fornecedor real, sem Microsoft Excel real e sem WhatsApp real.

## Critérios para EX-FINAL-02

- Confirmar contrato do backend para filtros e limite 20/50/100/200, sem confundir filtro local por cidade com busca global por cidade.
- Verificar paginação da fonte, deduplicação, respostas malformadas, perdas parciais, exportação completa/filtrada e segurança de URLs.
- Homologar o frontend integrado em prévia controlada com JWT real, sem mudar produção até gates e autorização.

## Gates

`EX_FINAL01_LOCAL_INTEGRATION=PASS`
`EX_FINAL01_CANDIDATE_LIVE=NOT_RUN`
`EX_FINAL01_AUTHENTICATED_E2E=NOT_RUN`
`GLOBAL_GATE=BLOCKED`
`PROD=NO-GO`
`MAIN_MERGE=NO_GO`
`DEPLOY=NO_GO`
