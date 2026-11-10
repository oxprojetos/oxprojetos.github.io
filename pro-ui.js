/* OX Pesquisa Pro v0.4 | layout-only controls. Existing auth, API and export modules remain untouched. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const authLogout = $('auth-logout');
  const sidebar = $('pro-sidebar');
  const mainBody = $('pro-main-body');
  if (!authLogout || !sidebar || !mainBody) return;
  const body = document.body;
  const menuButton = $('pro-menu-toggle');
  const scrim = $('pro-mobile-scrim');
  const menu = (open) => {
    body.classList.toggle('pro-menu-open', Boolean(open));
    scrim.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(Boolean(open)));
  };
  menuButton.addEventListener('click', () => menu(!body.classList.contains('pro-menu-open')));
  scrim.addEventListener('click', () => menu(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { menu(false); closeDetail(); closeColumns(); }
  });
  const nav = {
    search: $('pro-nav-search'), cnpj: $('pro-nav-cnpj'), sources: $('pro-nav-sources')
  };
  const setActive = id => {
    for (const [key, btn] of Object.entries(nav)) btn.classList.toggle('active', key === id);
  };
  nav.search.addEventListener('click', () => {
    $('tab-search').click(); setActive('search'); menu(false);
    document.querySelector('.pro-search-card').scrollIntoView({behavior:'smooth',block:'start'});
  });
  nav.cnpj.addEventListener('click', () => {
    $('tab-cnpj').click(); setActive('cnpj'); menu(false);
    document.querySelector('.pro-search-card').scrollIntoView({behavior:'smooth',block:'start'});
  });
  nav.sources.addEventListener('click', () => {
    setActive('sources');menu(false);
    $('sources-detail').closest('.extra-tools').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('tab-search').addEventListener('click', () => setActive('search'));
  $('tab-cnpj').addEventListener('click', () => setActive('cnpj'));
  $('pro-top-logout').addEventListener('click', () => {
    authLogout.click(); menu(false);
    window.scrollTo({top:0,behavior:'instant'});
  });
  const applyAuth = () => {
    const authenticated = !authLogout.hidden;
    body.classList.toggle('pro-authenticated', authenticated);
    body.classList.toggle('pro-locked', !authenticated);
    sidebar.hidden = !authenticated;
    mainBody.hidden = !authenticated;
    menu(false);
    if (!authenticated) {closeDetail();closeColumns();}
  };
  new MutationObserver(applyAuth).observe(authLogout, {attributes:true,attributeFilter:['hidden']});

  // Move only filter DOM nodes: IDs, input values, events and query/export logic are preserved.
  const localFilters = document.querySelector('.pro-results-card .filter');
  const searchCard = document.querySelector('.pro-search-card');
  if (localFilters && searchCard) {
    const feed = $('feedback');
    searchCard.insertBefore(localFilters, feed);
  }

  const table = document.querySelector('.pro-results-card table');
  const headers = [...table.querySelectorAll('thead th')];
  const visibleColumns = new Set(headers.map((_,i) => i));
  const hideColumns = () => {
    for (let i=0;i<headers.length;i++) {
      headers[i].classList.toggle('pro-column-hidden', !visibleColumns.has(i));
      for (const tr of table.tBodies[0].rows) {
        if (tr.cells.length === headers.length && tr.cells[i]) {
          tr.cells[i].classList.toggle('pro-column-hidden', !visibleColumns.has(i));
        }
      }
    }
  };
  new MutationObserver(hideColumns).observe(table.tBodies[0], {childList:true});
  const cols = document.createElement('div');
  cols.className = 'pro-column-wrapper';
  const colButton = document.createElement('button');
  colButton.className = 'pro-column-toggle';
  colButton.id = 'pro-columns-toggle';
  colButton.type = 'button';
  colButton.setAttribute('aria-expanded', 'false');
  colButton.textContent = '☷ Colunas';
  const colMenu = document.createElement('div');
  colMenu.className = 'pro-column-menu';
  colMenu.id = 'pro-columns-menu';
  colMenu.hidden = true;
  const label = document.createElement('strong');
  label.textContent = 'Colunas exibidas na tabela';
  colMenu.append(label);
  for (const [index,th] of headers.entries()) {
    const field = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    // The two primary identifiers always remain visible.
    check.disabled = index < 2;
    check.addEventListener('change', () => {
      if (check.checked) visibleColumns.add(index); else visibleColumns.delete(index);
      hideColumns();
    });
    const name = document.createElement('span');
    name.textContent = th.textContent.trim();
    field.append(check,name);colMenu.append(field);
  }
  colButton.addEventListener('click', () => {
    colMenu.hidden = !colMenu.hidden;
    colButton.setAttribute('aria-expanded', String(!colMenu.hidden));
  });
  cols.append(colButton,colMenu);
  document.querySelector('.pro-results-card .export-controls').prepend(cols);
  function closeColumns(){colMenu.hidden = true; colButton.setAttribute('aria-expanded','false');}
  document.addEventListener('click', e => { if (!cols.contains(e.target))closeColumns(); });
  hideColumns();

  const overlay = document.createElement('div');
  overlay.className = 'pro-detail-backdrop';
  overlay.hidden = true;
  const panel = document.createElement('aside');
  panel.className = 'pro-detail-panel';
  panel.id = 'pro-detail-panel';
  panel.setAttribute('aria-label','Detalhes da empresa');
  panel.hidden = true;
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label','Fechar detalhes');
  close.textContent = '✕';
  const heading = document.createElement('h2');
  const subtitle = document.createElement('div');
  subtitle.className = 'pro-detail-caption';
  subtitle.textContent = 'Detalhes dos registros carregados. Campos não validados são exibidos como recebidos.';
  const dl = document.createElement('dl');
  panel.append(close,document.createTextNode('PERFIL DA EMPRESA'),heading,subtitle,dl);
  body.append(overlay,panel);
  function closeDetail(){panel.hidden = true; overlay.hidden = true;}
  close.addEventListener('click',closeDetail);
  overlay.addEventListener('click',closeDetail);
  table.tBodies[0].addEventListener('click',e => {
    if (e.target.closest('a,button,input'))return;
    const tr=e.target.closest('tr');
    if (!tr || tr.cells.length!==headers.length || !tr.cells[0].textContent.trim())return;
    const vals=[...tr.cells].map(x=>x.textContent.trim());
    heading.textContent=vals[1] || 'Empresa';
    dl.replaceChildren();
    vals.forEach((value,i) => {
      const dt=document.createElement('dt');dt.textContent=headers[i].textContent.trim();
      const dd=document.createElement('dd');dd.textContent=value||'Não informado';
      dl.append(dt,dd);
    });
    panel.hidden=false;overlay.hidden=false;
  });
  // All dialog and column elements must exist before initial authentication state is applied.
  applyAuth();
})();
