// CNAEs do piloto online: catálogo curto apenas como sugestão, não como limite.
// A Edge Function v2 aceita um único CNAE de 7 dígitos por requisição.
export const MAX_CNAES = 5;
export const CNAE_SUGGESTIONS = Object.freeze([
  { code: '4731800', label: 'Postos de combustíveis' },
  { code: '4930202', label: 'Transporte rodoviário intermunicipal / interestadual' },
  { code: '4930201', label: 'Transporte rodoviário municipal' },
  { code: '4930203', label: 'Transporte de produtos perigosos' },
  { code: '4732600', label: 'Comércio de lubrificantes' }
]);
export function cleanCnaeInput(value) {
  const source = String(value ?? '').trim();
  if (!source || !/^[0-9.\/\-\s]+$/.test(source)) return null;
  const code = source.replace(/[.\/\-\s]/g,'');
  return /^[0-9]{7}$/.test(code) ? code : null;
}
export function splitCnaeInput(value) {
  return String(value ?? '').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
}
export function addCnaeCodes(existing, input, max = MAX_CNAES) {
  const base = [...existing];
  const values = splitCnaeInput(input);
  if (!values.length) return { ok: false, codes: base, error: 'Digite um CNAE de sete dígitos.' };
  for (const candidate of values) {
    const code = cleanCnaeInput(candidate);
    if (!code) return {ok: false, codes: [...existing], error: 'CNAE inválido: ' + candidate + '. Digite sete dígitos numéricos.'};
    if (base.includes(code)) continue;
    if (base.length >= max) return {ok: false, codes: [...existing], error: 'Limite de ' + max + ' CNAEs por pesquisa.'};
    base.push(code);
  }
  return {ok:true,codes:base,error:''};
}
export function describeCnae(code) {
  return CNAE_SUGGESTIONS.find(item=>item.code===code)?.label || 'CNAE informado';
}
