# OX Pesquisa Pro v0.4 | Proposta de interface (sem publicação)

Este PR adapta o layout aprovado da demonstração OX Pesquisa Pro ao site real, preservando código e contratos de autenticação, consultas e exportação. **Não publica, altera Supabase ou faz consultas por conta própria.**

## Arquivos modificados
- `index.html`: reorganiza apresentação, introduz menu lateral, login separado e área autenticada, preservando IDs originais utilizados por `app.js`.
- `app.css`: adiciona identidade OX Pro responsiva, sem remover as regras v0.4 existentes.
- `pro-ui.js`: interações locais de layout, menu móvel, navegação entre os formulários originais, colunas opcionais e painel de detalhes do registro renderizado.

## Compatibilidade e limites
- `app.js`, `ox-auth.mjs`, `config.js`, `exporters.mjs`, `contacts.mjs` e demais arquivos funcionais **não modificados**.
- Login usa o formulário e o fluxo Supabase Auth existente. Recuperação mantém link e token em memória, sem novo backend.
- Pesquisa por UF/CNAE e CNPJ utiliza os mesmos forms, com os mesmos IDs, eventos e `apiFetch` do código atual.
- Exportação CSV/XLS/XLSX mantém `exportBytes(rows, format)`, incluindo todos os registros carregados e restrição de exportação em erro parcial.
- O botão Colunas apenas altera visibilidade na tabela, **não altera os registros exportados**.
- Painel de detalhes reutiliza texto já renderizado na tabela. Sem enriquecimento, gravação, novos provedores ou banco.
- O usuário só visualiza o corpo do sistema após o formulário original sinalizar autenticação. Isso é um controle de apresentação; **a segurança real continua dependendo da autenticação e da Edge Function**.
- O enriquecimento de sites mantém status de revisão e Google Places continua dependente de configuração real.

## Critérios de QA antes de publicar
- Verificar integridade dos blobs dos 11 arquivos originais mais `pro-ui.js` no commit exato.
- Executar browser QA sem rede externa, mockando somente as respostas de Supabase, verificando login, logout, recuperação, alternância de modos, consultas sintéticas e exportações.
- Testar desktop 1440px, tablet e celular 390px. Verificar ausência de overflow horizontal da página e operação de menu.
- Verificar tabela responsiva e colunas, detalhes, filtros, paginação e download, sem regressão funcional.
- `GLOBAL_GATE=BLOCKED`, `PROD=NO-GO`, `MERGE=NO_GO`, `DEPLOY=NO_GO` até autorização do usuário.
