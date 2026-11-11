// OX Pesquisa P02: metas de lotes e validação de paginação por cursor.
// Somente estado em memória. Nenhuma chamada externa, banco ou publicação.
export const MAX_SOURCE_PAGES = 10;
export const MAX_CURSOR_LENGTH = 512;
export function nextBatchGoal(loaded, priorGoal, batchSize, retry = false) {
  if (![loaded, priorGoal, batchSize].every(Number.isSafeInteger) || loaded < 0 || batchSize < 1 || batchSize > 200)
    throw new Error('Parâmetros de lote inválidos.');
  if (retry && priorGoal > loaded) return priorGoal;
  return loaded + batchSize;
}
export function readSourcePage(result, {search = true, remaining} = {}) {
  if (!Number.isSafeInteger(remaining) || remaining < 1 || remaining > 200)
    throw new Error('Quantidade restante do lote inválida.');
  if (!result || typeof result !== 'object' || !result.data)
    throw new Error('Resposta da fonte sem dados válidos.');
  if (search && !Array.isArray(result.data))
    throw new Error('A fonte retornou um lote em formato inválido.');
  if (!search && (Array.isArray(result.data) || typeof result.data !== 'object'))
    throw new Error('A fonte retornou um CNPJ em formato inválido.');
  const list = search ? result.data : [result.data];
  if (list.length > remaining)
    throw new Error('A fonte retornou registros acima do limite solicitado.');
  if (!list.every(row => row && typeof row.cnpj === 'string' && /^\d{14}$/.test(row.cnpj)))
    throw new Error('A fonte retornou CNPJ ausente ou malformado.');
  return list;
}
export function nextSourceCursor(rawCursor, {previous = null, used, before, after} = {}) {
  if (rawCursor === null || rawCursor === undefined || rawCursor === '') return null;
  if (typeof rawCursor !== 'string' || rawCursor.length > MAX_CURSOR_LENGTH)
    throw new Error('Cursor da fonte inválido ou excessivamente longo.');
  if (rawCursor === previous || used?.has(rawCursor) || after <= before)
    throw new Error('Paginação repetida ou sem novos CNPJs, interrompida por segurança.');
  return rawCursor;
}
