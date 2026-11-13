# OX Pesquisa · Candidata integrada PR #9 + PR #10 + PR #27

**Data:** 11/11/2026 · **Escopo:** laboratório offline; não autoriza publicação, merge ou ativação de fornecedor.

## Proveniência imutável
- Frontend base de produção `main`: `2fda9950d9823317f7e36520c627504d9212133f`.
- Frontend PR #9, paginação/retomada/filtros: `56733fed5230e61424704d928edadd3d0fe64068`.
- Frontend PR #10, interface Places/redes: `4c381390d1387c638044bbf0db02e863e37cd20c`.
- Backend PR #27, core Places/redes: `593b6a71c4653344208b15361d7971f4c86062b9`.
- Backend de produção `main`: `0e134cd508c394e6b4627abe64cade3848a10ce3`.
- A candidata reúne os arquivos do PR #10 sobre o PR #9 em **uma branch separada** com commit de pai único PR #9, sem mesclar nenhuma PR ou `main`. Backend #27 permanece independente.

## Contrato de integração
1. Auth e RLS permanecem no backend, com `withSupabase({auth:'user'})` e verificação de `ox_research_authorized_users`. Nenhum token real é utilizado em testes offline.
2. Consulta CNAE/CNPJ continua no fornecedor aprovado, até 200 registros por lote, com cursor opaco validado e bloqueio de exportação em erro parcial. Retry completa a quantidade originalmente solicitada, sem duplicar CNPJs.
3. Exportação de empresas CSV/XLS/XLSX preserva escolha entre registros filtrados ou todos os carregados, independente da página visual. Cidade é apenas filtro local. Não há persistência comercial.
4. `GET /api/social/validate?url=` valida exclusivamente URLs informadas manualmente pelo usuário. Não acessa redes sociais, não verifica identidade de perfil e não associa automaticamente links a CNPJs.
5. `GET /api/places/search` fica **desabilitado por padrão**. Se for habilitado futuramente mediante autorização, usa Places Text Search (New), paginado até 20 por página e 3 páginas na interface. Resultados Places são transitórios, sem exportação/CNPJ. Campos de telefone/site exigem segundo opt-in pois usam SKU de custo maior.
6. `/api/site-enrich` segue HTTP 501 enquanto a mitigação SSRF não for comprovada.

## Homologação offline executada
- Backend Node 24: **32/32** testes PASS, incluindo segurança, quotas, tokens, validação social e contrato da Edge com mocks.
- Frontend Node 24: **18/18** PASS.
- Browser individual do PR #9, integrado: **48/48** verificações desktop/mobile, retry 429, exportações e filtro municipal.
- Browser individual do PR #10, integrado: **34/34** verificações desktop/mobile, link social, Places desabilitado/fixture, links e não exportação.
- **Browser integrado cruzando as três frentes:** **54/54** verificações desktop/mobile, com `processApi` real do backend #27 nos endpoints social/Places, empresas sintéticas e autenticação sintética. Nenhuma conexão de rede externa e nenhum erro JS.
- Seis suítes adicionais de regressão antiga de UI/CNAE/WhatsApp/exportação/acessibilidade: **6/6 PASS**.
- Extrações XLSX/CSV produzidas pelo teste cruzado: XLSX com 40 CNPJs distintos, 22 colunas e capital numérico; CSV filtrado com 9 empresas, 22 colunas, em desktop/mobile. ZIP/XML e CSV validados com Python stdlib.
- Todos os testes executados em namespace de rede Linux offline (`unshare --net`), sem credenciais reais, sync, Supabase staging ou chamadas externas.

## Matriz de gates e escopo não comprovado
| Gate | Resultado |
| --- | --- |
| Código frontend combinado sem conflito e com proveniência | PASS |
| Backend PR #27 com hash de origem validado | PASS |
| Testes offline combinados e regressões | PASS |
| Dados XLSX/CSV sintéticos e integridade estrutural | PASS |
| Autenticação/JWT real na candidata combinada | NOT_RUN |
| Supabase staging com candidatos PR9/PR10/PR27 | NOT_RUN |
| Google Places faturável, quota e APIs sociais | DISABLED |
| Google/Meta/LinkedIn autorização, termos, custo | NOT_APPROVED |
| Merges e deploy de produção | NO_GO |

## Próxima homologação e rollback (documental)
- Validar as branches e a origem `https://oxprojetos.github.io` antes de qualquer ambiente novo. Não recriar branch staging com cobrança sem autorização financeira.
- Reproduzir E2E real autorizado com conta específica (sem enviar senha/JWT no chat), CORS, JWT, RLS, limites, multi-CNAE, paginação, exportação e regressão.
- Dependência de deploy futuro: backend compatível com frontend antes do frontend, mantendo todas as flags externas desligadas. Definir monitoramento/rollback antes de qualquer GO.
- Rollback do frontend até a baseline `2fda9950d9823317f7e36520c627504d9212133f`; backend até `0e134cd508c394e6b4627abe64cade3848a10ce3`. Preservar estados de Auth/RLS e contas. Rollback só após decisão específica, nunca nesta onda.

`GLOBAL_GATE=BLOCKED` · `PROD=NO-GO` · `STAGING=DELETED` · `BILLABLE_CALLS=0` · `DEPLOY=NOT_RUN`
