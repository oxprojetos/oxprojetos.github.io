// Candidatos para abrir WhatsApp. NÃO verifica a existência da conta.
// Números antigos com DDD + 8 dígitos iniciando em 9 são ajustados conforme
// a regra histórica do nono dígito da Anatel. A conta pode não existir.
export function mobileCandidatesDetailed(value) {
  const phones = String(value ?? '').split(/[\r\n]+|\s*\/\s*|\s*;\s*|\s*,\s*/);
  const candidates = new Map();
  for (const raw of phones) {
    let number = raw.replace(/\D/g, '');
    if (number.startsWith('55') && (number.length === 12 || number.length === 13)) number = number.slice(2);
    let adjusted = false;
    if (/^[1-9][0-9]9[0-9]{7}$/.test(number)) {
      // Ex.: 91 9131-9773 -> 91 9 9131-9773; jamais alterar o número exibido na tabela.
      number = number.slice(0, 2) + '9' + number.slice(2);
      adjusted = true;
    }
    if (/^[1-9][0-9]9[0-9]{8}$/.test(number)) {
      const international = '55' + number;
      if (!candidates.has(international)) candidates.set(international, { number: international, adjusted });
      else if (!adjusted) candidates.set(international, { number: international, adjusted: false });
    }
  }
  return [...candidates.values()];
}
export function mobileCandidates(value) {
  return mobileCandidatesDetailed(value).map(candidate => candidate.number);
}
export function emailAddress(value) {
  const v = String(value ?? '').trim();
  return /^[^\s@<>\x00-\x1F]+@[^\s@<>\x00-\x1F]+\.[A-Za-z]{2,}$/.test(v) && v.length <= 254 ? v : '';
}
export function safeExternalUrl(value, platform) {
  const source = String(value ?? '').trim();
  if (!source) return '';
  let candidate = source;
  if (!/^https?:\/\//i.test(candidate)) {
    if (!/^[\w.-]+\.[A-Za-z]{2,}(?:\/.*)?$/.test(candidate)) return '';
    candidate = 'https://' + candidate;
  }
  try {
    const url = new URL(candidate);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    const h = url.hostname.toLowerCase();
    if (platform) {
      const allowed = {
        instagram: ['instagram.com'],
        facebook: ['facebook.com', 'fb.com'],
        linkedin: ['linkedin.com'],
        youtube: ['youtube.com','youtu.be'],
        tiktok: ['tiktok.com'],
        x: ['x.com','twitter.com']
      }[platform];
      if (!allowed || !allowed.some(x => h === x || h.endsWith('.' + x))) return '';
    } else if (h === 'localhost' || /^(127|10|192\.168)\./.test(h) || h.endsWith('.local')) return '';
    return url.href;
  } catch { return ''; }
}
