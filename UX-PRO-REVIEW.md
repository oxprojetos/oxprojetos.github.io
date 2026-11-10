# OX Pesquisa Pro v0.4 | Checklist final de revisão P0 | 10/11/2026

O PR #2 contém exclusivamente adaptação visual do site OX Pesquisa existente. **Não executar merge nem deploy sem GO explícito do usuário.**

## 1. Escopo e integridade
- [x] Branch isolada `feature/ox-pesquisa-pro-v04-layout-20261110`, baseada na main publicada.
- [x] Arquivos alterados no PR: `index.html`, `app.css`, `pro-ui.js` e este documento.
- [x] Preservados byte a byte no PR: `app.js`, `ox-auth.mjs`, `config.js`, `exporters.mjs`, `csv.mjs`, `contacts.mjs` e `cnpj-validation.mjs`.
- [x] Todos os arquivos conferidos contra os Git blobs do commit final.
- [x] Nenhuma implementação de fetch, banco, credenciais, repositório novo ou integração Supabase adicionada ao layout.
- [x] Nenhum deploy, merge, ações GitHub ou consulta real de fornecedores executados.

## 2. Correções realizadas nesta revisão
- [x] Corrigida a grade de tablet e celular que atribuía largura zero à área `pro-workspace`, tornando a tabela aparentemente presente, mas fisicamente inclicável.
- [x] Adicionado botão `Ver detalhes` nativo a cada registro renderizado, alvo mínimo de 44 px, sem modificar o conteúdo exportado.
- [x] Botões de detalhes são recriados após consultas, filtros e paginação via observação do `tbody`.
- [x] Modal com `role=dialog`, `aria-modal=true`, rótulos e descrição; fundo `inert` enquanto aberto.
- [x] Abertura com toque, mouse, Enter e Espaço; fechamento com botão, Esc e backdrop; restauração do foco.
- [x] Navegação móvel removida da ordem de tabulação quando recolhida (`inert` + `aria-hidden`), foco devolvido ao acionador ao fechar.
- [x] Marcados `scope=col`, legenda acessível na tabela, `aria-controls` e `aria-expanded` nos controles relevantes.
- [x] Indicadores de foco e cores de texto ajustados, com opção de movimento reduzido mantida.
- [x] Filtros em layout empilhado no tablet, rolagem horizontal restrita à tabela, sem transbordamento do documento.

## 3. Evidências no CI próprio da VPS srv1866007
**Laboratório P0 com `unshare --net` e dados fictícios. Nenhuma requisição externa real.**

- [x] QA de regressão v0.4: **96 verificações aprovadas**, Chrome desktop 1440×900, tablet 820×1050 e celular 390×844.
- [x] Login/logout simulados, recuperação, pesquisa por CNPJ, pesquisa por UF/CNAE, filtros, seleção de colunas e downloads CSV/XLS/XLSX testados.
- [x] QA específica de toque e acessibilidade: **242 verificações aprovadas** em 320×700, 390×844, 768×1024, 820×1050, 1024×820 e 1440×900.
- [x] Teste de `touchscreen.tap` (toque efetivo em coordenadas de dispositivo, não `element.click()`) em cinco larguras móveis/tablet.
- [x] Modal, foco, navegação móvel, verificação de IDs únicos, largura da página e rerenderização de registros aprovados.
- [x] Zero erros de JavaScript e zero requisições externas proibidas.
- [x] Capturas de tela produzidas na VPS e hashes de evidências registrados no checkpoint P0.
- [ ] Auditoria WCAG formal com leitor de tela humano e dispositivo físico. Não incluída nesta rodada.
- [ ] Login e consultas usando Supabase real na branch. Não executados por restrição de escopo.

## 4. Checklist de publicação futura, NÃO autorizado
- [ ] Usuário inspeciona o diff e os exemplos visuais do PR #2 e concede **GO específico para publicação da interface**.
- [ ] Reler a main e o SHA da branch para detectar deriva. Se houver alteração, interromper e reconciliar.
- [ ] Confirmar o conjunto exato de quatro arquivos e o rollback para o commit base `56ae46ea57bc51d014520181a845070dabfbeefa`.
- [ ] Após GO, mesclar exclusivamente este PR de interface. **Não** acionar mudanças no Supabase ou na API.
- [ ] Confirmar conclusão do GitHub Pages e igualdade de hashes dos arquivos servidos.
- [ ] Testar login e logout reais com conta autorizada, sem compartilhar credenciais no chat; testes de sessão e recuperação pelo usuário.
- [ ] Testar uma consulta pequena autorizada por CNPJ, um lote pequeno UF/CNAE e exportações no navegador.
- [ ] Revisar visualmente em celular e desktop, verificar orientação e toque em dispositivos reais.
- [ ] Se a nova interface impedir login, consultas ou exportações, reverter somente os quatro arquivos visuais à baseline conhecida; reconfirmar funcionamento do site.

## 5. Gates
`GLOBAL_GATE=BLOCKED` | `PROD=NO-GO` | `MERGE=NO_GO` | `DEPLOY=NO_GO`.

A aprovação dos testes sintéticos autoriza revisão do PR, **não** publicação nem afirma compatibilidade real do Supabase ou de provedores externos.
