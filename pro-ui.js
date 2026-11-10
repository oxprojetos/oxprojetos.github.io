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
  const compact = window.matchMedia('(max-width: 1020px)');
  menuButton.setAttribute('aria-controls', 'pro-sidebar');
  const menu = (open, restoreFocus = false) => {
    const visible = Boolean(open) && compact.matches && !authLogout.hidden;
    body.classList.toggle('pro-menu-open', visible);
    scrim.hidden = !visible;
    menuButton.setAttribute('aria-expanded', String(visible));
    menuButton.setAttribute('aria-label', visible ? 'Fechar menu' : 'Abrir menu');
    // Off-screen navigation must not be focusable by keyboard or assistive technology.
    const unavailable = authLogout.hidden || (compact.matches && !visible);
    sidebar.inert = unavailable;
    sidebar.setAttribute('aria-hidden', String(unavailable));
    if (restoreFocus && compact.matches) menuButton.focus({preventScroll:true});
  };
  compact.addEventListener('change', () => menu(false));
  menuButton.addEventListener('click', () => menu(!body.classList.contains('pro-menu-open')));
  scrim.addEventListener('click', () => menu(false, true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!panel.hidden) { e.preventDefault(); closeDetail(); return; }
      if (!colMenu.hidden) { closeColumns(); colButton.focus({preventScroll:true}); return; }
      if (body.classList.contains('pro-menu-open')) menu(false, true);
    }
    if (e.key === 'Tab' && !panel.hidden) {
      // The details drawer is modal while open and has one focusable close control.
      e.preventDefault();
      close.focus({preventScroll:true});
    }
  });
  const nav = {
    search: $('pro-nav-search'), cnpj: $('pro-nav-cnpj'), sources: $('pro-nav-sources')
  };
  const setActive = id => {
    for (const [key, btn] of Object.entries(nav)) {
      const selected = key === id;
      btn.classList.toggle('active', selected);
      if (selected) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
  };
  nav.search.addEventListener('click', () => {
    $('tab-search').click(); setActive('search'); menu(false, true);
    document.querySelector('.pro-search-card').scrollIntoView({behavior:'instant',block:'start'});
  });
  nav.cnpj.addEventListener('click', () => {
    $('tab-cnpj').click(); setActive('cnpj'); menu(false, true);
    document.querySelector('.pro-search-card').scrollIntoView({behavior:'instant',block:'start'});
  });
  nav.sources.addEventListener('click', () => {
    setActive('sources');menu(false, true);
    $('sources-detail').closest('.extra-tools').scrollIntoView({behavior:'instant',block:'start'});
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
    if (!authenticated) {closeDetail(false);closeColumns();}
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
  for (const th of headers) th.setAttribute('scope', 'col');
  const caption = document.createElement('caption');
  caption.className = 'pro-sr-only';
  caption.textContent = 'Resultados de empresas. Use Ver detalhes para abrir informações de cada registro.';
  table.prepend(caption);
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
  // Rows are re-rendered by the original app.js on search, filter and pagination.
  // Enhance each new row with a native button; it supports touch, Enter and Space.
  const decorateRows = () => {
    for (const tr of table.tBodies[0].rows) {
      if (tr.dataset.proDetails === 'ready' || tr.cells.length !== headers.length) continue;
      const first = tr.cells[0];
      if (first.querySelector('a,button,input') || !first.textContent.trim()) continue;
      const value = first.textContent.trim();
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'pro-details-open';
      action.textContent = value;
      action.setAttribute('aria-label', 'Ver detalhes de ' + (tr.cells[1].textContent.trim() || 'empresa') + ', CNPJ ' + value);
      tr.dataset.proDetails = 'ready';
      first.replaceChildren(action);
    }
  };
  new MutationObserver(() => {hideColumns();decorateRows();}).observe(table.tBodies[0], {childList:true});
  const cols = document.createElement('div');
  cols.className = 'pro-column-wrapper';
  const colButton = document.createElement('button');
  colButton.className = 'pro-column-toggle';
  colButton.id = 'pro-columns-toggle';
  colButton.type = 'button';
  colButton.setAttribute('aria-expanded', 'false');
  colButton.setAttribute('aria-controls', 'pro-columns-menu');
  colButton.textContent = '☷ Colunas';
  const colMenu = document.createElement('div');
  colMenu.className = 'pro-column-menu';
  colMenu.id = 'pro-columns-menu';
  colMenu.hidden = true;
  colMenu.setAttribute('role', 'group');
  colMenu.setAttribute('aria-label', 'Colunas visíveis nos resultados');
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
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'pro-detail-heading');
  panel.setAttribute('aria-describedby', 'pro-detail-caption');
  panel.hidden = true;
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label','Fechar detalhes');
  close.textContent = '✕';
  const heading = document.createElement('h2');
  heading.id = 'pro-detail-heading';
  const subtitle = document.createElement('div');
  subtitle.className = 'pro-detail-caption';
  subtitle.id = 'pro-detail-caption';
  subtitle.textContent = 'Detalhes dos registros carregados. Campos não validados são exibidos como recebidos.';
  const dl = document.createElement('dl');
  panel.append(close,document.createTextNode('PERFIL DA EMPRESA'),heading,subtitle,dl);
  body.append(overlay,panel);
  const workspaceRoot = document.querySelector('.pro-app');
  let previousFocus = null;
  function closeDetail(restoreFocus = true) {
    if (panel.hidden) return;
    panel.hidden = true;
    overlay.hidden = true;
    workspaceRoot.inert = false;
    if (restoreFocus && previousFocus?.isConnected && !authLogout.hidden) {
      previousFocus.focus({preventScroll:true});
    }
    previousFocus = null;
  }
  close.addEventListener('click', () => closeDetail());
  overlay.addEventListener('click', () => closeDetail());
  function openDetail(tr, trigger) {
    if (!tr || tr.cells.length !== headers.length || !tr.cells[0].textContent.trim()) return;
    const values = [...tr.cells].map(cell => cell.textContent.trim());
    heading.textContent = values[1] || 'Empresa';
    dl.replaceChildren();
    values.forEach((value,index) => {
      const dt = document.createElement('dt');
      dt.textContent = headers[index].textContent.trim();
      const dd = document.createElement('dd');
      dd.textContent = value || 'Não informado';
      dl.append(dt,dd);
    });
    previousFocus = trigger?.isConnected ? trigger : document.activeElement;
    panel.hidden = false;
    overlay.hidden = false;
    workspaceRoot.inert = true;
    close.focus({preventScroll:true});
  }
  table.tBodies[0].addEventListener('click', e => {
    const action = e.target.closest('button.pro-details-open');
    if (action) {
      openDetail(action.closest('tr'), action);
      return;
    }
    if (e.target.closest('a,button,input,select')) return;
    // Coarse pointers use the explicit 44px target; no accidental row activation on swipe.
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const tr = e.target.closest('tr');
    if (tr) openDetail(tr, e.target.closest('td') || tr);
  });
  decorateRows();
  setActive('search');
  // All dialog and column elements must exist before initial authentication state is applied.
  applyAuth();
})();
