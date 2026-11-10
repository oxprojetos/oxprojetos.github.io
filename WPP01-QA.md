# WPP-01 | Refinamento visual do WhatsApp | 10/11/2026

Base: `997600171716831995a333e744135375b983522f`.
Branch: `feature/ox-pesquisa-wpp01-compacto-20261110`.

## Escopo
- Ajuste da coluna Telefone em `app.js`, reaproveitando `mobileCandidatesDetailed`, `actionLink` e `whatsappGlyph`.
- Cada telefone recebido permanece exibido **sem alteração** e recebe imediatamente ao lado o link correto, somente se for um possível celular brasileiro.
- Múltiplos números são separados por linha; links duplicados para o mesmo candidato são omitidos.
- `app.css`: círculo visual verde de **23px** dentro de área clicável de **36px no desktop / 44px no celular**. Aviso `9+` compacto; foco teclado preservado.
- Nenhum WhatsApp é verificado antecipadamente; nenhuma mensagem é enviada.

## Regras de validação e release
Executar testes P0 offline, Chrome com rede isolada, celulares atuais/antigos, telefone fixo, vazio, múltiplos, click/touch, foco e exportações CSV/XLS/XLSX. Revalidar blobs da branch contra snapshot de testes.

**NÃO** fazer merge/deploy sem novo GO. API, Supabase, banco e demais projetos intocados. Rollback: restaurar apenas `app.js` e `app.css` ao SHA-base; não modificar `contacts.mjs`.

## WPP-01R1 | Regressão de separadores de telefones | 10/11/2026
- Falha reproduzida: dois celulares separados por LF/CRLF/CR eram tratados como um campo numérico inválido, sem ícones nem contagem de celular.
- Correção mínima em `contacts.mjs` e `app.js`: acrescenta separadores de quebra de linha, sem alterar telefones exibidos, números enviados à função de exportação ou mensagens.
- Regressão versionada em `tests/wpp01-multiline.test.mjs`: LF, CRLF, CR, ponto e vírgula, barra, duplicados, telefone fixo e texto inválido.
- Teste offline na VPS `srv1866007`, com Node/Chrome em namespace sem rede, em cópia isolada do snapshot combinado WPP-01 + CNAE-01. Registros sintéticos, sem login Supabase, fornecedor externo ou WhatsApp real.
- Resultados da candidata combinada: **30 testes Node + 54 WPP Chrome + 46 CNAE Chrome + 71 múltiplos CNAEs + 96 regressão v0.4 + 259 toque/acessibilidade = 556 validações PASS**.
- Os blobs Git dos dois arquivos alterados foram comparados byte a byte com os arquivos efetivamente testados na VPS.
- O checkpoint 549 PASS de WPP-01 + CNAE-01 permanece histórico. Este complemento não autoriza merge ou publicação.
- `GLOBAL_GATE=BLOCKED`, `PROD=NO-GO`, `MAIN_MERGE=NO_GO`, `DEPLOY=NO_GO`.
