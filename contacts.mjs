// Indicação de candidatos móveis. NÃO verifica cadastro no WhatsApp.
export function mobileCandidates(value) {
  const phones = String(value ?? '').split(/\s*\/\s*|\s*;\s*|\s*,\s*/);
  const numbers = new Set();
  for (const raw of phones) {
    let number = raw.replace(/\D/g, '');
    if (number.startsWith('55') && number.length === 13) number = number.slice(2);
    // DDD com 2 dígitos + telefone celular brasileiro com 9 dígitos iniciados em 9.
    if (/^[1-9][0-9]9[0-9]{8}$/.test(number)) numbers.add(`55${number}`);
  }
  return [...numbers];
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
