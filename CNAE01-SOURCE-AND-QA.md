# CNAE-01 | Catálogo IBGE e autocomplete | 10/11/2026

Base: `997600171716831995a333e744135375b983522f`.
Branch: `feature/ox-pesquisa-cnae01-autocomplete-20261110`.

## Proveniência do catálogo
- **Fonte primária:** IBGE, API de CNAE subclasses `https://servicodados.ibge.gov.br/api/v2/cnae/subclasses`, requisição pública GET feita em 10/11/2026 para gerar o artefato estático.
- **SHA-256 do JSON original da resposta:** `787e14982265b0ffedf5f0180cbec8a2ea64d117fca459b76608ebc99dd668a7`.
- 1.332 registros com códigos de 7 dígitos, todos únicos; descrições transcritas diretamente do atributo `descricao`.
- Gerado em `cnae-catalog.mjs` por redução da resposta ao par `[id,descricao]`, ordenado por código. Nenhuma chamada ao IBGE em tempo de uso.
- A versão da fonte é a versão retornada pela API no dia da captura; não alegar que reflete mudanças futuras sem nova captura.
- Alias como “posto” são atalhos de pesquisa mantidos **separadamente** do texto oficial, sem modificar códigos ou descrições.

## Escopo
- `cnae-autocomplete.mjs`: busca normalizada por nome, termos, alias ou código parcial; exibição de no máximo oito sugestões e seleção manual.
- `index.html`: combobox acessível, teclado, lista por mouse/toque, sem novas consultas às empresas.
- `cnae-autocomplete.css`: estilização local responsiva.
- Reaproveita `app.js` e `cnae-multi.mjs` intactos, incluindo escolha de até cinco códigos, chamadas sequenciais por CNAE e bloqueio de exportação em erro parcial.

## Limites e release
O catálogo não realiza busca de empresas nem valida a atividade de empresas individuais. Não armazena resultados em banco. Revalidar por QA P0 offline em telas de celular e desktop, 1.332 itens, acentos, termos “posto”, “transporte”, “combustível”, “4731”, teclado, seleção, exportações e acessibilidade.

**NÃO** fazer merge/deploy sem novo GO. Nenhuma alteração ao Supabase, Edge Function, API, banco ou outros projetos. Rollback: remover os novos módulos/catalogo/stylesheet e restaurar apenas `index.html` ao SHA-base.
