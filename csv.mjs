const columns = [
 ['cnpj','CNPJ'], ['razao_social','Razão social'], ['nome_fantasia','Nome fantasia'],
 ['municipio','Cidade'], ['uf','UF'], ['telefone','Telefone'], ['email','E-mail'],
 ['situacao','Situação'], ['cnae_principal','CNAE principal'], ['porte','Porte'],
 ['capital_social','Capital social'], ['website','Site'], ['instagram','Instagram'],
 ['facebook','Facebook'], ['linkedin','LinkedIn'], ['youtube','YouTube'], ['tiktok','TikTok'], ['x','X/Twitter'], ['fonte_site','Origem dos links sociais'], ['consultado_site_em','Site consultado em'], ['fonte','Fonte cadastral'], ['consultado_em','Cadastro consultado em']
];
function safeCell(value) {
  let result = String(value ?? '');
  // Evita injeção de fórmulas no Excel/LibreOffice ao importar CSV.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(result)) result = "'" + result;
  return '"' + result.replaceAll('"', '""') + '"';
}
export function toCsv(rows) {
  const values = [columns.map(([,title])=>title), ...rows.map(row => columns.map(([field])=>row[field] ?? ''))];
  return '\uFEFF' + values.map(row => row.map(safeCell).join(';')).join('\r\n');
}
