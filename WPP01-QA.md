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
