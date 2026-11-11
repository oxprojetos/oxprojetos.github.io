// EX-EXPORT-01: explicit selection of loaded versus filtered rows.
export const EXPORT_SCOPES = Object.freeze(['filtered','all']);
export function selectedExportRows(loaded, filtered, scope) {
  if (!Array.isArray(loaded) || !Array.isArray(filtered) || !EXPORT_SCOPES.includes(scope))
    throw new Error('Escopo de exportação inválido.');
  return scope === 'all' ? loaded : filtered;
}
