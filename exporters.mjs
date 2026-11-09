/* OX P0: exports reais sem CDN, sem dependências, sem envio de dados. */
import { toCsv } from './csv.mjs';

export const EXPORT_COLUMNS = [
  ['cnpj', 'CNPJ'], ['razao_social', 'Razão social'], ['nome_fantasia', 'Nome fantasia'],
  ['municipio', 'Cidade'], ['uf', 'UF'], ['telefone', 'Telefone'], ['email', 'E-mail'],
  ['situacao', 'Situação'], ['cnae_principal', 'CNAE principal'], ['porte', 'Porte'],
  ['capital_social', 'Capital social'], ['website', 'Site'], ['instagram', 'Instagram'],
  ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['x', 'X/Twitter'], ['fonte_site', 'Origem dos links sociais'], ['consultado_site_em', 'Site consultado em'], ['fonte', 'Fonte cadastral'], ['consultado_em', 'Cadastro consultado em']
];

function safeText(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').slice(0, 32767);
}
export function exportMatrix(rows) {
  return [EXPORT_COLUMNS.map(([, title]) => title), ...rows.map(row => EXPORT_COLUMNS.map(([field]) => safeText(row[field])))];
}
function concat(parts) {
  let n = 0; for (const p of parts) n += p.length;
  const out = new Uint8Array(n); let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function U16(v) { const a = new Uint8Array(2); new DataView(a.buffer).setUint16(0, v, true); return a; }
function U32(v) { const a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, v >>> 0, true); return a; }
const encoder = new TextEncoder();
function utf8(s) { return encoder.encode(s); }
function utf16le(s) {
  const b = new Uint8Array(s.length * 2), d = new DataView(b.buffer);
  for (let i = 0; i < s.length; i++) d.setUint16(2 * i, s.charCodeAt(i), true);
  return b;
}
function crc32(bytes) {
  let c = -1;
  for (const byte of bytes) {
    c ^= byte;
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (c ^ -1) >>> 0;
}
function zipStored(entries) {
  const locals = [], dirs = []; let offset = 0;
  for (const [filename, content] of entries) {
    const name = utf8(filename), bytes = utf8(content), checksum = crc32(bytes);
    const local = new Uint8Array(30), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true); lv.setUint32(14, checksum, true);
    lv.setUint32(18, bytes.length, true); lv.setUint32(22, bytes.length, true);
    lv.setUint16(26, name.length, true);
    locals.push(local, name, bytes);
    const central = new Uint8Array(46), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint32(16, checksum, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
    dirs.push(central, name); offset += local.length + name.length + bytes.length;
  }
  const centralSize = dirs.reduce((n, b) => n + b.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  return concat([...locals, ...dirs, end]);
}
function xml(s) {
  return safeText(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function colName(index) { let x = index + 1, s = ''; while (x) { x--; s = String.fromCharCode(65 + (x % 26)) + s; x = Math.floor(x / 26); } return s; }
export function toXlsx(rows) {
  const matrix = exportMatrix(rows), columns = matrix[0].length;
  const sheetRows = matrix.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${colName(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('');
  const colWidths = matrix[0].map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${[19,36,30,20,8,27,30,15,15,22,18,30,30,30,30,30,30,30,22,23,20,24][i] ?? 20}" customWidth="1"/>`).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${colWidths}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${colName(columns - 1)}${matrix.length}"/></worksheet>`;
  return zipStored([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Empresas OX" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF176EA3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs></styleSheet>`],
    ['xl/worksheets/sheet1.xml', sheet]
  ]);
}
function biffRecord(type, payload = new Uint8Array(0)) {
  const h = new Uint8Array(4), dv = new DataView(h.buffer);
  dv.setUint16(0, type, true); dv.setUint16(2, payload.length, true);
  return concat([h, payload]);
}
function bof(type) { return biffRecord(0x0809, concat([U16(0x0600), U16(type), U16(0x0DBB), U16(0x07CC), U32(0x41), U32(0x06)])); }
function sstRecords(strings, total) {
  const items = []; let curr = [U32(total), U32(strings.length)], bytes = 8;
  for (const string of strings) {
    if (string.length > 3900) throw new Error('Texto acima do limite seguro deste XLS P0. Utilize XLSX.');
    const limited = string;
    const value = concat([U16(limited.length), Uint8Array.of(1), utf16le(limited)]);
    if (bytes + value.length > 8224 && bytes > 0) { items.push(concat(curr)); curr = []; bytes = 0; }
    curr.push(value); bytes += value.length;
  }
  items.push(concat(curr));
  return items.map((b, i) => biffRecord(i === 0 ? 0x00FC : 0x003C, b));
}
function directoryEntry(name, type, start, size, child = 0xFFFFFFFF) {
  const out = new Uint8Array(128), view = new DataView(out.buffer);
  out.set(utf16le(name + '\0').slice(0, 64));
  view.setUint16(64, Math.min((name.length + 1) * 2, 64), true);
  out[66] = type; out[67] = 1;
  view.setUint32(68, 0xFFFFFFFF, true); view.setUint32(72, 0xFFFFFFFF, true);
  view.setUint32(76, child, true); view.setUint32(116, start >>> 0, true);
  view.setUint32(120, size >>> 0, true); view.setUint32(124, 0, true);
  return out;
}
function makeOleWorkbook(stream) {
  const sectorSize = 512;
  const streamBytes = new Uint8Array(Math.max(4096, Math.ceil(stream.length / sectorSize) * sectorSize));
  streamBytes.set(stream);
  const wbSectors = streamBytes.length / sectorSize;
  const dirAt = wbSectors;
  let fatCount = 1;
  while (fatCount * 128 < wbSectors + 1 + fatCount) fatCount++;
  if (fatCount > 109) throw new Error('Arquivo XLS excede o limite deste exportador P0. Use XLSX.');
  const sectors = wbSectors + 1 + fatCount;
  const out = new Uint8Array((sectors + 1) * sectorSize);
  const view = new DataView(out.buffer);
  out.set(Uint8Array.of(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1));
  view.setUint16(24, 0x003E, true); view.setUint16(26, 3, true); view.setUint16(28, 0xFFFE, true);
  view.setUint16(30, 9, true); view.setUint16(32, 6, true);
  view.setUint32(44, fatCount, true); view.setUint32(48, dirAt, true);
  view.setUint32(56, 4096, true); view.setUint32(60, 0xFFFFFFFE, true); view.setUint32(68, 0xFFFFFFFE, true);
  for (let i = 0; i < 109; i++) view.setUint32(76 + 4 * i, i < fatCount ? dirAt + 1 + i : 0xFFFFFFFF, true);
  out.set(streamBytes, sectorSize);
  const dir = concat([
    directoryEntry('Root Entry', 5, 0xFFFFFFFE, 0, 1),
    directoryEntry('Workbook', 2, 0, streamBytes.length),
    new Uint8Array(128), new Uint8Array(128)
  ]);
  out.set(dir, sectorSize * (dirAt + 1));
  const fat = Array(fatCount * 128).fill(0xFFFFFFFF);
  for (let i = 0; i < wbSectors; i++) fat[i] = i === wbSectors - 1 ? 0xFFFFFFFE : i + 1;
  fat[dirAt] = 0xFFFFFFFE;
  for (let i = 0; i < fatCount; i++) fat[dirAt + 1 + i] = 0xFFFFFFFD;
  const fatStart = sectorSize * (dirAt + 2);
  for (let i = 0; i < fat.length; i++) view.setUint32(fatStart + i * 4, fat[i] >>> 0, true);
  return out;
}
export function toXls(rows) {
  const matrix = exportMatrix(rows), indices = new Map(), strings = [];
  let total = 0;
  for (const row of matrix) for (const v of row) {
    if (!v) continue; total++;
    if (!indices.has(v)) { indices.set(v, strings.length); strings.push(v); }
  }
  const dim = concat([U32(0), U32(matrix.length), U16(0), U16(matrix[0].length), U16(0)]);
  const cells = [bof(0x0010), biffRecord(0x0200, dim)];
  for (let r = 0; r < matrix.length; r++) for (let c = 0; c < matrix[r].length; c++) {
    const text = matrix[r][c]; if (!text) continue;
    cells.push(biffRecord(0x00FD, concat([U16(r), U16(c), U16(0), U32(indices.get(text))])));
  }
  cells.push(biffRecord(0x000A));
  const sheet = concat(cells);
  const codepage = biffRecord(0x0042, U16(1200));
  const xf = biffRecord(0x00E0, new Uint8Array(20));
  const sst = sstRecords(strings, total);
  const sheetName = 'Empresas OX';
  const bound = offset => biffRecord(0x0085, concat([U32(offset), Uint8Array.of(0, 0, sheetName.length, 1), utf16le(sheetName)]));
  const global = offset => concat([bof(0x0005), codepage, xf, ...sst, bound(offset), biffRecord(0x000A)]);
  const first = global(0);
  return makeOleWorkbook(concat([global(first.length), sheet]));
}
export function exportBytes(rows, format) {
  if (!['csv', 'xls', 'xlsx'].includes(format)) throw new Error('Formato não permitido');
  return format === 'csv' ? utf8(toCsv(rows)) : format === 'xls' ? toXls(rows) : toXlsx(rows);
}
