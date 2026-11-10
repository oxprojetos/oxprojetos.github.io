import { CNAE_CATALOG } from './cnae-catalog.mjs';

// Pure index, no API calls. Descriptions are preserved from the official IBGE snapshot.
export const CATALOG_SIZE = CNAE_CATALOG.length;
const fold = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const aliasMap = new Map([
 ['4731800', ['posto', 'postos', 'posto de combustiveis', 'gasolina', 'diesel']],
 ['4930201', ['transportadora', 'transporte de carga municipal']],
 ['4930202', ['transportadora', 'transporte de carga intermunicipal']],
 ['4930203', ['transportadora', 'carga perigosa']],
 ['4732600', ['lubrificantes', 'oleo automotivo']]
]);
const index = CNAE_CATALOG.map(([code, description]) => ({
  code, description, folded:fold(description), aliases:(aliasMap.get(code)||[]).map(fold)
}));

export function searchCnae(query, excluded = [], limit = 8) {
  const q = fold(query), blocked = new Set(excluded), numeric = /^[0-9.\-/\s]+$/.test(q);
  if (q.length < 2) return [];
  const cleanCode = q.replace(/\D/g,'');
  const terms = q.split(/\s+/).filter(Boolean);
  const found = [];
  for (const item of index) {
    if (blocked.has(item.code)) continue;
    let score = null;
    if (numeric && cleanCode) {
      if (item.code === cleanCode) score = 0;
      else if (item.code.startsWith(cleanCode)) score = 1;
    } else {
      if (item.folded === q) score = 0;
      else if (item.folded.startsWith(q)) score = 1;
      else if (item.aliases.some(a => a === q || a.startsWith(q))) score = 2;
      else if (terms.length && terms.every(term => item.folded.includes(term))) score = 3;
      else if (item.aliases.some(a => a.includes(q))) score = 4;
    }
    if (score !== null) found.push({code:item.code,description:item.description,score});
  }
  found.sort((a,b)=>a.score-b.score || a.description.localeCompare(b.description,'pt-BR') || a.code.localeCompare(b.code));
  return found.slice(0,Math.min(12,Math.max(1,limit)));
}

export function setupCnaeAutocomplete(doc = document) {
  const input = doc.getElementById('cnae-input');
  const list = doc.getElementById('cnae-options');
  const add = doc.getElementById('cnae-add');
  const status = doc.getElementById('cnae-suggestions-status');
  if (!input || !list || !add || !status) return false;
  let results = [], active = -1;
  const selectedCodes = () => [...doc.querySelectorAll('#cnae-chips .cnae-chip')]
    .map(el=>el.textContent.match(/^\s*(\d{7})/)?.[1]).filter(Boolean);
  const close = () => {
    results=[]; active=-1; list.hidden=true; list.replaceChildren();
    input.setAttribute('aria-expanded','false');
    input.removeAttribute('aria-activedescendant');
  };
  const highlight = next => {
    if (!results.length) return;
    active = (next + results.length) % results.length;
    [...list.children].forEach((option,i) => option.setAttribute('aria-selected',String(i===active)));
    input.setAttribute('aria-activedescendant','cnae-option-'+active);
    list.children[active].scrollIntoView({block:'nearest'});
  };
  const choose = code => {
    if (add.disabled || selectedCodes().length>=5) {
      status.textContent='Limite de cinco CNAEs ou pesquisa em andamento.';
      close(); return;
    }
    input.value=code;
    close();
    add.click(); // Original app.js validates, adds the chip and preserves all query/export behavior.
    input.focus({preventScroll:true});
    status.textContent=selectedCodes().includes(code) ? 'CNAE '+code+' adicionado.' : 'Revise a seleção do CNAE.';
  };
  const refresh = () => {
    close();
    results=searchCnae(input.value,selectedCodes());
    if (!results.length) {
      status.textContent=input.value.trim().length>=2 ? 'Nenhum CNAE correspondente encontrado.':'';
      return;
    }
    const fragment=doc.createDocumentFragment();
    for (const [i,item] of results.entries()) {
      const button=doc.createElement('button');
      button.type='button';
      button.id='cnae-option-'+i;
      button.setAttribute('role','option');
      button.setAttribute('aria-selected','false');
      button.className='cnae-option';
      const code=doc.createElement('strong');code.textContent=item.code;
      const description=doc.createElement('span');description.textContent=item.description;
      button.append(code,description);
      button.addEventListener('pointerdown',e=>e.preventDefault());
      button.addEventListener('click',()=>choose(item.code));
      fragment.append(button);
    }
    list.append(fragment);list.hidden=false;
    input.setAttribute('aria-expanded','true');
    status.textContent=results.length+' sugestões de atividade disponíveis.';
  };
  input.addEventListener('input',refresh);
  input.addEventListener('focus',()=>{if(input.value.trim().length>=2)refresh();});
  input.addEventListener('keydown',event=>{
    if (list.hidden || !results.length) return;
    if (event.key==='ArrowDown'||event.key==='ArrowUp') {
      event.preventDefault();event.stopImmediatePropagation();
      highlight(event.key==='ArrowDown'?active+1:active<0?results.length-1:active-1);
    } else if (event.key==='Enter') {
      event.preventDefault();event.stopImmediatePropagation();
      choose(results[active<0?0:active].code);
    } else if (event.key==='Escape') {
      event.preventDefault();event.stopImmediatePropagation();close();
    } else if (event.key==='Tab') {
      close();
    }
  },true);
  doc.addEventListener('pointerdown',event=>{
    if (event.target!==input && !list.contains(event.target)) close();
  });
  return true;
}
if (typeof document!=='undefined') setupCnaeAutocomplete(document);
