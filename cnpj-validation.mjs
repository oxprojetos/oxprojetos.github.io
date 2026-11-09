// Algoritmo da Receita Federal para CNPJ numérico e alfanumérico (módulo 11).
// Compartilhado pelo navegador e pelo backend para barrar consultas inválidas.
export function normalizedCnpj(value) {
  return String(value ?? '').toUpperCase().replace(/[.\/\-\s]/g, '');
}
const W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
function digit(chars, weights) {
  const remainder = [...chars].reduce((sum, char, i) => sum + (char.charCodeAt(0) - 48) * weights[i], 0) % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
export function validateCnpj(value) {
  const cnpj = normalizedCnpj(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) {
    return { valid: false, normalized: cnpj, reason: 'O CNPJ precisa ter 14 caracteres: 12 letras/números e 2 dígitos verificadores.' };
  }
  if (/^([0-9A-Z])\1{11}/.test(cnpj)) {
    return { valid: false, normalized: cnpj, reason: 'Sequência repetida não constitui um CNPJ válido.' };
  }
  const dv1 = digit(cnpj.slice(0, 12), W1);
  const dv2 = digit(cnpj.slice(0, 12) + dv1, W2);
  if (`${dv1}${dv2}` !== cnpj.slice(12)) {
    return { valid: false, normalized: cnpj, reason: 'Dígitos verificadores não conferem. Confira os números digitados.' };
  }
  return { valid: true, normalized: cnpj, reason: '' };
}
