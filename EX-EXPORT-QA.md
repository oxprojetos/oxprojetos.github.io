# OX Pesquisa Pro v0.4 | EX-EXPORT-01 a EX-EXPORT-04
**Referência:** 10/11/2026 | **Base:** WPP-01R1 PR #5 `e02448600e795d0af03ccceb8891e282a9ca9628` | **Status:** laboratório isolado, DRAFT, sem publicação.

## Implementação

1. **EX-EXPORT-01 | Escopo explícito:** seletor *Somente registros filtrados* (padrão seguro) ou *Todos os registros carregados*. Contagem exibida antes do download; a paginação visual não reduz a exportação. Exportação bloqueada se a fonte falhar parcialmente ou se o escopo selecionado estiver vazio.
2. **EX-EXPORT-02 | Integridade transversal:** preservadas 22 colunas, nomes e ordem, CNPJ como texto, zeros à esquerda e dados brutos das fontes. CSV continua UTF-8 com BOM e separador ponto e vírgula. Testes geram 20 registros sintéticos e verificam também a opção filtrada com 7.
3. **EX-EXPORT-03 | Higiene dos telefones:** fragmentos inválidos, incluindo `000000000000`, ficam visíveis na coluna bruta com aviso visual, mas não contam como contato utilizável e não geram `wa.me`. Fragmentos válidos separados por /, vírgula, ponto e vírgula ou quebras de linha mantêm seus ícones candidatos. Nenhuma conta WhatsApp é validada e nenhuma mensagem é enviada.
4. **EX-EXPORT-04 | Capital social numérico:** XLS e XLSX escrevem valores financeiros válidos como células numéricas Excel com 2 casas decimais. Entradas inválidas/ambíguas permanecem texto, nunca são convertidas por aproximação. CSV preserva representação textual. CNPJ, telefone e CNAE continuam texto.

## Evidência P0 no srv1866007

- `tests/ex-export.test.mjs`: **5/5** testes Node PASS no checkout exato da branch.
- `tests/verify_formats.py`: CSV 20/7 linhas, XLSX 19/6 células numéricas (um texto deliberadamente inválido), XLS BIFF8 19/6 células NUMBER, tudo PASS.
- Teste de navegador isolado desktop e celular: **40 verificações PASS**. Os dois formatos efetivamente baixados em cada viewport foram `OX_pesquisa_7_empresas_filtradas.xlsx` e `OX_pesquisa_20_empresas_todas.csv`; cenário 503 sintético bloqueia exportação.
- Regressões anteriores reexecutadas na candidata combinada com CNAE-01: WPP, autocomplete, múltiplos CNAEs, v0.4 e toque/acessibilidade, todas PASS.
- Fontes de empresas, login e WhatsApp: mocks em Chrome com tráfego externo bloqueado. Não há comprovação de edição no Excel do usuário ou testes reais da nova versão.
- Arquivos de evidência e snapshots em `/home/oxrunner/ox-pesquisa-ci-p0/waves/20261110-ex-export-01-04/qa/`.

## Dependências e integração

- Este PR é baseado na **branch de WPP-01R1 (#5)**, não na `main`, para preservar a correção de telefone multilinha. A CNAE-01 (#6) continua independente; a combinação foi validada em laboratório.
- O `index.html` deste PR altera somente o módulo de exportação. Quando #6 for integrada, revalidar o merge de `index.html` e executar novamente a QA combinada antes do GO.
- Não reutilizar contagens sintéticas como prova de busca real; a HML-04/HML-05 anterior foi feita sobre a versão publicada, que não contém este PR.

## Roteiro de aceite manual pendente

1. Abrir a versão candidata em homologação **autorizada**, com usuário real, sem expor senha ou JWT.
2. Pesquisar um lote de até 20 empresas; com *Somente ativas*, escolher **Somente filtrados** e conferir contagem e conteúdo exportados; alternar para **Todos carregados**.
3. Verificar XLS/XLSX no Microsoft Excel sem reparos, célula de CNPJ como texto e capital social como número formatado em duas casas, com soma funcional.
4. Verificar CSV importando com a coluna CNPJ definida como **Texto**; o Excel pode remover zeros ao abrir automaticamente sem importação.
5. Confirmar telefones inválidos sem link, bloqueio por falha parcial e nenhuma mudança em dados ou sistemas reais.

## Gates
`EX_EXPORT_LOCAL_QA=PASS` | `EX_EXPORT_REAL_EXCEL=NOT_RUN` | `GLOBAL_GATE=BLOCKED` | `PROD=NO-GO` | `MAIN_MERGE=NO_GO` | `DEPLOY=NO_GO`.

Nenhuma alteração de banco, Edge, CI, GitHub Actions, produção ou WhatsApp foi autorizada/executada. 
