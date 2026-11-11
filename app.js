import { apiFetch,signIn,signOut,loggedIn,configured,beginPasswordSetup,requestPasswordReset,updatePassword } from './ox-auth.mjs';
import { exportBytes } from './exporters.mjs';
import { selectedExportRows } from './export-scope.mjs';
import { validateCnpj } from './cnpj-validation.mjs';
import { mobileCandidates, mobileCandidatesDetailed, hasUsablePhone, isUsablePhone, emailAddress, safeExternalUrl } from './contacts.mjs';
import { addCnaeCodes, describeCnae, MAX_CNAES } from './cnae-multi.mjs';

const $ = id => document.getElementById(id);
let rows = [], cursor = null, page = 0, mode = 'search', query = null, controller = null, tablePage = 1, multiCnaeActive = false;
const state = { busy: false, requested: 0, complete: false, partialError: false };

let selectedCnaes = ['4731800'];
function renderCnaes() {
  const box = $('cnae-chips');
  box.replaceChildren();
  for (const code of selectedCnaes) {
    const chip = document.createElement('span');
    chip.className = 'cnae-chip';
    const caption = document.createElement('span');
    caption.textContent = code + ' · ' + describeCnae(code);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remover CNAE ' + code);
    remove.addEventListener('click', () => {
      if (state.busy) return;
      selectedCnaes = selectedCnaes.filter(x => x !== code);
      renderCnaes();
    });
    chip.append(caption, remove);
    box.append(chip);
  }
  $('cnae-count').textContent = selectedCnaes.length + '/' + MAX_CNAES;
}
function addTypedCnaes() {
  const field = $('cnae-input');
  const value = field.value;
  const next = addCnaeCodes(selectedCnaes, value);
  if (!next.ok) {
    $('cnae-feedback').textContent = next.error;
    return false;
  }
  selectedCnaes = next.codes;
  field.value = '';
  $('cnae-feedback').textContent = '';
  renderCnaes();
  return true;
}
$('cnae-add').addEventListener('click', () => {
  if (!state.busy) addTypedCnaes();
});
$('cnae-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (!state.busy) addTypedCnaes();
  }
});
renderCnaes();

function switchMode(newMode) {
  controller?.abort(); mode = newMode;
  $('tab-search').classList.toggle('selected', mode === 'search');
  $('tab-cnpj').classList.toggle('selected', mode === 'cnpj');
  $('form-search').classList.toggle('hide', mode !== 'search');
  $('form-cnpj').classList.toggle('hide', mode !== 'cnpj');
  reset();
}
function message(msg, type = '') { $('feedback').textContent = msg; $('feedback').className = `feedback ${type}`; }
function reset() {
  rows = []; cursor = null; page = 0; query = null; tablePage = 1; multiCnaeActive = false;
  state.requested = 0; state.complete = false; state.partialError = false;
  $('filter').value = ''; $('city-filter').value = ''; message('Pronto para iniciar uma nova consulta.'); render();
}
function normalizedFilter(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}
function filtered() {
  const q = normalizedFilter($('filter').value.trim());
  const city = normalizedFilter($('city-filter').value.trim());
  return rows.filter(r => {
    if (city && !normalizedFilter(r.municipio).includes(city)) return false;
    if ($('active').checked && r.situacao !== 'ATIVA') return false;
    if ($('contact').checked && !hasUsablePhone(r.telefone) && !emailAddress(r.email)) return false;
    if (!q) return true;
    return normalizedFilter([r.cnpj,r.razao_social,r.nome_fantasia,r.municipio,r.uf,r.telefone,r.email,r.website].join(' ')).includes(q);
  });
}
function textCell(tr, value) {
  const td = document.createElement('td'); td.textContent = String(value ?? '').trim() || '—'; tr.append(td); return td;
}
function actionLink(parent, label, href, title, className) {
  const a = document.createElement('a'); a.textContent = label;
  a.href = href; a.target = href.startsWith('mailto:') ? '_self' : '_blank'; a.rel = 'noopener noreferrer';
  a.className = className; a.title = title; a.setAttribute('aria-label', title);
  parent.append(a); return a;
}
// Símbolo vetorial local, sem CDN e sem consultar a existência de conta WhatsApp.
function whatsappGlyph() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of [
    'M20 11.6a8.2 8.2 0 0 1-12 7.2L3.7 20l1.3-4.1A8.2 8.2 0 1 1 20 11.6Z',
    'M8.2 8.3c.3-.4.8-.4 1.1-.1l1.3 1.4c.3.3.3.7.1 1l-.6.8a8.5 8.5 0 0 0 2.5 2.5l.8-.6c.3-.2.7-.2 1 .1l1.4 1.3c.3.3.3.8-.1 1.1-.5.5-1.2.7-1.9.5-2.2-.5-5-3.3-5.5-5.5-.2-.7 0-1.4.5-1.9Z'
  ]) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
function phoneCell(tr, row) {
  const td = document.createElement('td');
  td.className = 'contact-cell';
  const text = String(row.telefone ?? '').trim();
  const parts = text ? text.split(/[\r\n]+|\s*\/\s*|\s*;\s*|\s*,\s*/).map(s => s.trim()).filter(Boolean) : [];
  const displayed = parts.length ? parts : ['—'];
  const unique = new Set();
  for (const rawPhone of displayed) {
    const line = document.createElement('div');
    line.className = 'phone-line';
    const val = document.createElement('span');
    val.className = 'phone-number';
    val.textContent = rawPhone;
    if(rawPhone !== '—' && !isUsablePhone(rawPhone)) { val.classList.add('phone-invalid'); val.title = 'Número inválido ou não verificável; mantido como recebido da fonte.'; }
    line.append(val);
    // Link somente para candidato de celular, sem validação de conta nem envio.
    for (const candidate of mobileCandidatesDetailed(rawPhone)) {
      if (unique.has(candidate.number)) continue;
      unique.add(candidate.number);
      const mobile = candidate.number;
      const title = candidate.adjusted
        ? `Possível celular antigo: nono dígito acrescentado conforme regra Anatel. Abrir WhatsApp para ${mobile.slice(2)} (número e conta não verificados)`
        : `Abrir WhatsApp para ${mobile.slice(2)} (cadastro não verificado)`;
      const link = actionLink(line, '', `https://wa.me/${mobile}`, title, candidate.adjusted ? 'whatsapp-icon whatsapp-legacy' : 'whatsapp-icon');
      link.append(whatsappGlyph());
    }
    td.append(line);
  }
  tr.append(td);
}
function emailCell(tr, row) {
  const td = document.createElement('td'); const address = emailAddress(row.email);
  if (address) actionLink(td, address, `mailto:${address}`, `Redigir e-mail para ${address}, sem envio automático`, 'email-link');
  else td.textContent = '—'; tr.append(td);
}
function socialCell(tr, row) {
  const td = document.createElement('td'); td.className = 'social-cell';
  let count = 0;
  for (const [key, label] of [['website','Site'],['instagram','IG'],['facebook','FB'],['linkedin','IN'],['youtube','YT'],['tiktok','TT'],['x','X']]) {
    const link = safeExternalUrl(row[key], key === 'website' ? undefined : key);
    if (link) { actionLink(td, label, link, `Abrir ${label} informado pela fonte ${row.fonte}`, 'social-link'); count++; }
  }
  if (row.website) { const button=document.createElement('button');button.type='button';button.className='mini-enrich';button.textContent='Ver redes';button.addEventListener('click',()=>{$('site-url').value=row.website;$('site-cnpj').value=row.cnpj;$('site-url').focus();$('form-enrich').scrollIntoView({behavior:'smooth',block:'center'});});td.append(button); }
  if (!count && !row.website) td.textContent = '—'; tr.append(td);
}
function render() {
  $('count-total').textContent = rows.length;
  $('count-active').textContent = rows.filter(r => r.situacao === 'ATIVA').length;
  $('count-phone').textContent = rows.filter(r => hasUsablePhone(r.telefone)).length;
  $('count-email').textContent = rows.filter(r => Boolean(r.email)).length;
  $('count-mobile').textContent = rows.filter(r => mobileCandidates(r.telefone).length > 0).length;
  const list = filtered(), body = $('records'); body.replaceChildren();
  const perPage = Number($('per-page').value) || 25;
  const pageCount = Math.max(1, Math.ceil(list.length / perPage));
  tablePage = Math.max(1, Math.min(tablePage, pageCount));
  const visible = list.slice((tablePage - 1) * perPage, tablePage * perPage);
  if (!visible.length) {
    const tr = document.createElement('tr'); const td = textCell(tr, rows.length ? 'Nenhum registro corresponde aos filtros locais.' : 'Nenhuma empresa carregada. Execute uma pesquisa.');
    td.colSpan = 9; td.className = 'empty'; body.append(tr);
  } else {
    const frag = document.createDocumentFragment();
    for (const row of visible) {
      const tr = document.createElement('tr'); textCell(tr, row.cnpj);
      const td = document.createElement('td');
      const strong = document.createElement('strong'); strong.textContent = row.razao_social || '—'; td.append(strong);
      if (row.nome_fantasia) { const span = document.createElement('span'); span.textContent = row.nome_fantasia; td.append(span); }
      tr.append(td);
      for (const key of ['municipio', 'uf']) textCell(tr, row[key]);
      phoneCell(tr, row); emailCell(tr, row); socialCell(tr, row);
      for (const key of ['situacao', 'fonte']) textCell(tr, row[key]);
      frag.append(tr);
    }
    body.append(frag);
  }
  $('summary').textContent = `${list.length} após filtros · ${rows.length} registros carregados · página visual ${tablePage}/${pageCount}`;
  const status = state.requested ? `${rows.length} de ${state.requested} solicitados` : `${rows.length} registros`;
  $('page-info').textContent = multiCnaeActive
    ? `${status}; ${page} página(s) da API em ${selectedCnaes.length} CNAE(s). ${state.partialError ? 'Consulta parcial: exportação bloqueada.' : 'Limite por CNAE aplicado; outros resultados podem existir na fonte.'}`
    : page ? `${status}; ${page} página(s) da API. ${state.partialError ? 'Falha parcial: exportação completa bloqueada.' : cursor ? 'Existem outros registros na fonte; o lote solicitado foi concluído quando atingiu o limite.' : 'Não há mais páginas indicadas.'}` : 'Nenhuma pesquisa iniciada.';
  $('prev-table').disabled = tablePage <= 1;
  $('next-table').disabled = tablePage >= pageCount;
  $('table-page').textContent = `Página ${tablePage} de ${pageCount}`;
  const scope = $('export-scope').value;
  const exportRows = selectedExportRows(rows, list, scope);
  $('export-format').disabled = !exportRows.length || state.busy || state.partialError;
  $('export').disabled = !exportRows.length || state.busy || state.partialError;
  $('export-count').textContent = rows.length
    ? `${exportRows.length} registro(s) selecionado(s) para exportação (${scope === 'filtered' ? 'somente filtrados' : 'todos os carregados'}). A página visual não reduz o arquivo.${state.partialError ? ' Pesquisa parcial: exportação bloqueada.' : ''}`
    : 'Nenhum registro carregado para exportar.';
  $('export').textContent = `Baixar ${exportRows.length} registro(s)`;
  $('more').hidden = !cursor || mode !== 'search'; $('more').disabled = state.busy;
}
async function run(path, more) {
  if (state.busy) return;
  if (!more) { rows = []; cursor = null; page = 0; tablePage = 1; multiCnaeActive = false; state.complete = false; state.partialError = false; }
  state.busy = true;
  $('form-search').querySelector('button[type="submit"]').disabled = true;
  $('form-cnpj').querySelector('button[type="submit"]').disabled = true;
  controller?.abort(); controller = new AbortController();
  const request = controller;
  if (!more) state.requested = mode === 'search' ? Number(query?.get('limit') ?? 200) : 1;
  else state.requested = rows.length + Number(query?.get('limit') ?? 200);
  let url = path, received = 0, newCount = 0;
  message(`Consultando fontes: preparando até ${state.requested} registro(s)...`);
  render();
  try {
    const seen = new Set(rows.map(row => row.cnpj));
    const consultedCursors = new Set();
    while (rows.length < state.requested) {
      if (page >= 10) throw new Error('Limite de 10 páginas por pesquisa para proteger a API. Reduza a pesquisa.');
      const beforePage = rows.length;
      const response = await apiFetch(url, { signal: request.signal, headers: { Accept: 'application/json' } });
      let result;
      try { result = await response.json(); } catch { throw new Error(`Resposta HTTP ${response.status} não é JSON válido`); }
      if (!response.ok) throw new Error(`${result.message || result.error || `HTTP ${response.status}`}${result.failures?.length ? ' | Fontes: ' + result.failures.map(f => `${f.fonte} (${f.status})`).join(', ') : ''}`);
      const list = Array.isArray(result.data) ? result.data : [result.data];
      for (const item of list) if (item && !seen.has(item.cnpj)) {
        rows.push(item); seen.add(item.cnpj); newCount++;
        if (rows.length === state.requested) break;
      }
      received += list.length; page++;
      const previousCursor = cursor;
      cursor = typeof result.cursor === 'string' && result.cursor ? result.cursor : null;
      message(`Recebidos ${rows.length}/${state.requested} registros. Fonte: ${result.source}.`, 'ok');
      render();
      if (mode !== 'search' || !cursor || !list.length) break;
      if (rows.length === beforePage || cursor === previousCursor || consultedCursors.has(cursor)) throw new Error('Paginação repetida ou sem novos CNPJs, interrompida por segurança.');
      consultedCursors.add(cursor);
      const next = new URLSearchParams(query);
      next.set('limit', String(Math.min(200, state.requested - rows.length)));
      next.set('cursor', cursor);
      url = '/api/search?' + next;
    }
    state.complete = true;
    message(`Pesquisa concluída: ${newCount} novo(s), ${rows.length} no total. Solicitados: ${state.requested}. ${rows.length < state.requested ? 'A fonte retornou menos registros disponíveis ou interrompeu a paginação.' : 'Lote completo.'} Exportação inclui todos os carregados.`, 'ok');
  } catch (e) {
    if (e.name !== 'AbortError') {
      state.partialError = Boolean(rows.length && rows.length < state.requested);
      message(`Falha: ${e.message}. ${state.partialError ? 'Dados parciais na tela. Complete a consulta antes de exportar.' : 'Nenhum dado fictício foi gerado.'}`, 'error');
    }
  } finally {
    state.busy = false;
    $('form-search').querySelector('button[type="submit"]').disabled = !loggedIn();
    $('form-cnpj').querySelector('button[type="submit"]').disabled = !loggedIn();
    render();
  }
}

async function runMultipleCnaes(cnaes, data) {
  if (state.busy) return;
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const uf = String(data.get('uf') || ''), source = String(data.get('source') || 'minhareceita');
  const perCnae = Number(data.get('limit'));
  if (!['minhareceita'].includes(source) || !/^[A-Z]{2}$/.test(uf) ||
      !Number.isInteger(perCnae) || perCnae < 1 || perCnae > 200 ||
      cnaes.length < 2 || cnaes.length > MAX_CNAES) {
    message('Parâmetros de pesquisa inválidos. Revise os CNAEs e o limite.', 'error');
    return;
  }
  rows = []; cursor = null; page = 0; tablePage = 1; query = null;
  multiCnaeActive = true;
  state.busy = true; state.complete = false; state.partialError = false;
  state.requested = cnaes.length * perCnae;
  const seenCompanies = new Set();
  const submitSearch = $('form-search').querySelector('button[type="submit"]');
  const submitCnpj = $('form-cnpj').querySelector('button[type="submit"]');
  submitSearch.disabled = true; submitCnpj.disabled = true;
  $('cnae-add').disabled = true; $('cnae-input').disabled = true;
  render();
  try {
    for (const [index, cnae] of cnaes.entries()) {
      let receivedForCnae = 0, pagesForCnae = 0, nextCursor = null;
      const usedCursors = new Set();
      message(`Consultando CNAE ${cnae} (${index + 1}/${cnaes.length})... ${rows.length} empresas distintas.`);
      do {
        if (signal.aborted) throw Object.assign(new Error('Cancelado'), {name:'AbortError'});
        if (pagesForCnae >= 10) throw new Error('O CNAE ' + cnae + ' excedeu o limite de 10 páginas.');
        const params = new URLSearchParams({
          uf, cnae, source, limit: String(Math.min(200, perCnae - receivedForCnae))
        });
        if (nextCursor) params.set('cursor', nextCursor);
        const response = await apiFetch('/api/search?' + params, {signal, headers: {Accept:'application/json'}});
        let result;
        try { result = await response.json(); }
        catch { throw new Error('Resposta HTTP ' + response.status + ' não contém JSON válido.'); }
        if (!response.ok) throw new Error(`CNAE ${cnae}: ${result?.message || result?.error || 'HTTP ' + response.status}`);
        if (!Array.isArray(result.data)) throw new Error('CNAE ' + cnae + ': resposta sem lista de empresas.');
        const remaining = perCnae - receivedForCnae;
        const chunk = result.data.slice(0, remaining);
        const previousCount = receivedForCnae;
        for (const item of chunk) {
          if (!item || typeof item.cnpj !== 'string' || !/^\d{14}$/.test(item.cnpj)) continue;
          if (!seenCompanies.has(item.cnpj)) {
            seenCompanies.add(item.cnpj);
            rows.push(item);
          }
        }
        receivedForCnae += chunk.length;
        page++; pagesForCnae++;
        const returnedCursor = typeof result.cursor === 'string' && result.cursor ? result.cursor : null;
        if (!returnedCursor || receivedForCnae >= perCnae) {
          nextCursor = null; break;
        }
        if (!chunk.length || receivedForCnae === previousCount ||
            returnedCursor === nextCursor || usedCursors.has(returnedCursor)) {
          throw new Error('Paginação repetida ou sem novos registros para CNAE ' + cnae);
        }
        usedCursors.add(returnedCursor);
        nextCursor = returnedCursor;
        render();
      } while (nextCursor);
      render();
    }
    state.complete = true;
    message(`Pesquisa concluída: ${cnaes.length} CNAEs consultados, ${rows.length} CNPJs distintos carregados. A exportação inclui somente os registros recebidos.`, 'ok');
  } catch (error) {
    if (error.name !== 'AbortError') {
      state.partialError = true; // Nunca liberar exportação de uma pesquisa multi-CNAE incompleta.
      message('Pesquisa interrompida: ' + error.message + '. Resultados parciais mantidos somente na tela, sem exportação.', 'error');
    }
  } finally {
    state.busy = false;
    $('cnae-add').disabled = false; $('cnae-input').disabled = false;
    submitSearch.disabled = !loggedIn();
    submitCnpj.disabled = !loggedIn();
    render();
  }
}

$('tab-search').addEventListener('click', () => switchMode('search'));
$('tab-cnpj').addEventListener('click', () => switchMode('cnpj'));
$('form-search').addEventListener('submit', e => {
  e.preventDefault();
  if (state.busy) return;
  if ($('cnae-input').value.trim() && !addTypedCnaes()) {
    message('Revise o CNAE informado antes de pesquisar.', 'error');
    return;
  }
  if (!selectedCnaes.length) {
    $('cnae-feedback').textContent = 'Adicione ao menos um CNAE para pesquisar.';
    return;
  }
  const data = new FormData(e.currentTarget);
  if (selectedCnaes.length === 1) {
    query = new URLSearchParams({ uf: data.get('uf'), cnae: selectedCnaes[0], limit: data.get('limit'), source: data.get('source') });
    run('/api/search?' + query, false);
  } else {
    runMultipleCnaes([...selectedCnaes], data);
  }
});
$('form-cnpj').addEventListener('submit', e => {
  e.preventDefault(); const data = new FormData(e.currentTarget);
  const result = validateCnpj(data.get('cnpj'));
  if (!result.valid) { message(`CNPJ inválido: ${result.reason} A consulta não foi enviada às fontes.`, 'error'); return; }
  query = null; run(`/api/cnpj/${encodeURIComponent(result.normalized)}?source=${encodeURIComponent(data.get('source'))}`, false);
});
$('more').addEventListener('click', () => {
  if (!cursor || !query) return;
  const next = new URLSearchParams(query); next.set('cursor', cursor);
  run('/api/search?' + next, true);
});
for (const id of ['filter', 'city-filter', 'active', 'contact']) $(id).addEventListener(['filter', 'city-filter'].includes(id) ? 'input' : 'change', () => { tablePage = 1; render(); });
$('export-scope').addEventListener('change', render);
$('per-page').addEventListener('change', () => { tablePage = 1; render(); });
$('prev-table').addEventListener('click', () => { tablePage--; render(); });
$('next-table').addEventListener('click', () => { tablePage++; render(); });
$('export').addEventListener('click', () => {
  if (state.busy || state.partialError || !rows.length) return;
  const format = $('export-format').value, scope = $('export-scope').value;
  const exporting = selectedExportRows(rows, filtered(), scope);
  if(!exporting.length) return;
  try {
    // Exporta somente o escopo explicitamente escolhido; paginação visual não reduz o conjunto.
    const bytes = exportBytes(exporting, format);
    const types = { csv: 'text/csv;charset=utf-8', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    const blob = new Blob([bytes], { type: types[format] });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `OX_pesquisa_${exporting.length}_empresas_${scope === 'filtered' ? 'filtradas' : 'todas'}.${format}`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    message(`Exportação ${format.toUpperCase()} gerada com ${exporting.length} registros ${scope === 'filtered' ? 'filtrados' : 'carregados'}, independentemente da página visual.`, 'ok');
  } catch (e) { message(`Erro ao gerar ${format.toUpperCase()}: ${e.message}`, 'error'); }
});
render();

// As ferramentas extras não disparam envios, não alteram o Supabase nem a carteira do Painel OX.
let latestEnrichment = null;
function setBoxLinks(parent, values) {
  parent.replaceChildren();
  for(const [label, url] of values){
    if(!url)continue;
    const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='social-link';parent.append(a);
  }
}
$('form-enrich').addEventListener('submit', async e=>{
  e.preventDefault();const data=new FormData(e.currentTarget);const site=String(data.get('website')||'').trim();
  const box=$('enrich-result');box.textContent='Verificando a página HTTPS indicada...';$('apply-enrich').hidden=true;
  latestEnrichment=null;
  try{
    const res=await apiFetch('/api/site-enrich?'+new URLSearchParams({url:site}));const r=await res.json();
    if(!res.ok)throw new Error(r.message||r.error||`HTTP ${res.status}`);
    latestEnrichment=r.data;
    const links=document.createElement('div');
    setBoxLinks(links,[['Site',r.data.website],['Instagram',r.data.instagram],['Facebook',r.data.facebook],['LinkedIn',r.data.linkedin],['YouTube',r.data.youtube],['TikTok',r.data.tiktok],['X',r.data.x]]);
    box.replaceChildren();
    const info=document.createElement('p');info.textContent=`Página consultada: ${r.data.pagina_origem}. Redes não encontradas significam ausência de links nesta página, não ausência de perfis.`;
    box.append(info,links);
    if(r.data.emails?.length){const mail=document.createElement('p');mail.textContent='E-mails publicados: '+r.data.emails.join(' | ');box.append(mail);}
    const target=$('site-cnpj').value.replace(/\D/g,'');const exists=rows.some(x=>x.cnpj===target);
    $('apply-enrich').hidden=!exists;
    if(!exists){const note=document.createElement('p');note.textContent='Para adicionar à tabela, informe o CNPJ de um registro já carregado e consulte novamente.';box.append(note);}
  }catch(err){box.textContent='Não foi possível consultar o site: '+err.message;}
});
$('apply-enrich').addEventListener('click',()=>{
  if(!latestEnrichment)return;
  const target=$('site-cnpj').value.replace(/\D/g,'');const item=rows.find(x=>x.cnpj===target);
  if(!item)return;
  for(const key of ['website','instagram','facebook','linkedin','youtube','tiktok','x'])if(latestEnrichment[key]&&!item[key])item[key]=latestEnrichment[key];
  if(!item.email&&latestEnrichment.emails?.[0])item.email=latestEnrichment.emails[0];
  item.fonte_site='website_public_links';item.consultado_site_em=latestEnrichment.coletado_em;
  render();message(`Links adicionados apenas à tabela local para ${target}. Nenhum banco de dados foi modificado.`, 'ok');
});
$('form-places').addEventListener('submit',async e=>{
  e.preventDefault();const d=new FormData(e.currentTarget);const box=$('places-result');box.textContent='Consultando Google Places...';
  try{
    const res=await apiFetch('/api/places/search?'+new URLSearchParams({q:d.get('q'),limit:d.get('limit')}));const out=await res.json();
    if(!res.ok)throw new Error(out.message||out.error||`HTTP ${res.status}`);
    box.replaceChildren();
    const note=document.createElement('p');note.textContent=`${out.count} locais encontrados. Fonte: Google Maps. Consulta temporária, não associada a CNPJ e sem exportação.`;box.append(note);
    for(const p of out.data){const line=document.createElement('p');line.textContent=`${p.nome} | ${p.endereco} `;
      if(p.mapa){const a=document.createElement('a');a.textContent='Abrir no Google Maps';a.href=p.mapa;a.rel='noopener noreferrer';a.target='_blank';line.append(a);}box.append(line);}
    const attr=document.createElement('p');attr.textContent='Dados e atribuição: Google Maps';box.append(attr);
  }catch(e){box.textContent='Google Places: '+e.message;}
});
async function refreshSources(){
  try{
    const r=await apiFetch('/api/sources');if(!r.ok)throw new Error('não autorizado');
    const z=await r.json();
    const labels={minhareceita:'Minha Receita',opencnpj:'OpenCNPJ',brasilapi:'BrasilAPI',cnpjws:'CNPJ.ws',rictom_local:'rictom local',website_social:'Redes de sites empresariais',google_places:'Google Places',supabase:'Supabase'};
    $('sources-detail').textContent=Object.entries(labels).map(([key,label])=>`${label}: ${z[key]??'não configurado'}`).join(' | ');
  }catch{$('sources-detail').textContent='Fontes disponíveis após autenticação. Confira sua sessão.';}
}
function authState(){
  const ok=loggedIn();
  $('auth-login').hidden=ok;
  $('auth-logout').hidden=!ok;
  $('session-label').textContent=ok?'AUTENTICADO · PESQUISA PESSOAL':'ACESSO PRIVADO · LOGIN NECESSÁRIO';
  for(const formId of ['form-search','form-cnpj'])$(formId).querySelector('button[type="submit"]').disabled=!ok;
  $('form-places').querySelector('button[type="submit"]').disabled=!ok;
  $('form-enrich').querySelector('button[type="submit"]').disabled=true;
  if(ok)refreshSources();else $('sources-detail').textContent='Faça login para consultar as fontes.';
}
$('auth-login').addEventListener('submit',async e=>{
  e.preventDefault();const d=new FormData(e.currentTarget);
  $('auth-feedback').textContent='Validando acesso...';
  try{await signIn(String(d.get('email')||''),String(d.get('password')||''));$('auth-feedback').textContent='Acesso autorizado.';authState();}
  catch(err){$('auth-feedback').textContent=err.message;}
});
$('auth-logout').addEventListener('click',()=>{signOut();reset();authState();});
if(!configured())$('auth-feedback').textContent='Publicação ainda não configurada: falta vincular um Supabase exclusivo.';
authState();

$('auth-forgot').addEventListener('click',()=>{
  $('auth-reset').hidden=!$('auth-reset').hidden;
  $('auth-feedback').textContent='Informe somente o e-mail usado no convite. O link será enviado se a conta existir.';
});
$('auth-reset').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=String(new FormData(e.currentTarget).get('email')||'');
  $('auth-feedback').textContent='Solicitando link...';
  try {
    await requestPasswordReset(email);
    $('auth-feedback').textContent='Se a conta estiver habilitada, você receberá um e-mail. Abra somente o link mais recente.';
    $('auth-reset').hidden=true;
  } catch(err) {
    $('auth-feedback').textContent=err.message;
  }
});
$('auth-set-password').addEventListener('submit',async e=>{
  e.preventDefault();
  const d=new FormData(e.currentTarget),pass=String(d.get('password')||''),verify=String(d.get('confirm')||'');
  if(pass!==verify){$('auth-feedback').textContent='As senhas não conferem.';return;}
  $('auth-feedback').textContent='Definindo senha...';
  try {
    await updatePassword(pass);
    e.currentTarget.reset();
    $('auth-set-password').hidden=true;
    $('auth-feedback').textContent='Senha definida. Entre com seu e-mail e a nova senha.';
  } catch(err){
    $('auth-feedback').textContent=err.message;
  }
});
const redirectHash=globalThis.location.hash||'';
if(beginPasswordSetup(redirectHash)){
  // Eliminar tokens do endereço logo após recebê-los; somente memória até concluir.
  globalThis.history.replaceState(null,'',globalThis.location.pathname+globalThis.location.search);
  $('auth-set-password').hidden=false;
  $('auth-feedback').textContent='Convite/recuperação confirmado. Defina sua nova senha abaixo.';
}
