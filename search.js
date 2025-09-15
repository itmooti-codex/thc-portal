// Simple front-end search + pagination for the dynamic grid
(function () {
  const GRID_SELECTOR = '.grid-root[data-dynamic-list]';
  const PAGE_SIZE = 10;
  const COUNT_SHOWING = document.getElementById('pageShowing');
  const COUNT_TOTAL = document.getElementById('totalResults');
  const PAGINATION = document.getElementById('gridPagination');
  const SEARCH_INPUT = document.querySelector('input[placeholder="Search products"]');
  const SEARCH_BTN = (SEARCH_INPUT && SEARCH_INPUT.parentElement) ? SEARCH_INPUT.parentElement.querySelector('button') : null;

  // Fields to index and search
  const FIELD_ATTRS = [
    'active_ingredient_1', 'active_ingredient_2', 'active_ingredient_3',
    'brand', 'client_preference_effect', 'client_preference_lineage', 'client_preference_thc_cbd',
    'cultivar', 'description', 'dominance', 'dosage_form', 'dosage_instructions',
    'item_name', 'plant_species', 'route', 'status', 'sub_type', 'typical_use'
  ];

  // Relative weights: prioritize name and brand slightly higher
  const FIELD_WEIGHT = {
    item_name: 3,
    brand: 2,
  };

  let state = {
    items: [],         // [{id, node, textByField: {field: string}, score: number}]
    filtered: [],      // same objects in sorted order
    page: 1,
    query: ''
  };

  function norm(v) {
    return (v == null ? '' : String(v)).toLowerCase();
  }

  function buildIndex() {
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;
    const cards = Array.from(grid.children).filter(el => el && el.querySelector('input.js-compare'));
    const items = [];
    for (const card of cards) {
      const checkbox = card.querySelector('input.js-compare');
      const id = checkbox ? checkbox.getAttribute('data-item-id') : null;
      const si = card.querySelector('.search-index');
      const textByField = Object.create(null);
      FIELD_ATTRS.forEach(f => {
        const val = si ? si.getAttribute('data-' + f) : '';
        textByField[f] = norm(val);
      });
      // Fallbacks for a few visible fields if missing
      if (!textByField.item_name) {
        const h3 = card.querySelector('h3');
        textByField.item_name = norm(h3 && h3.textContent);
      }
      if (!textByField.brand) {
        const p = card.querySelector('h3 + p');
        textByField.brand = norm(p && p.textContent);
      }
      items.push({ id, node: card, textByField, score: 0 });
    }
    state.items = items;
    // Initial order as a tiebreaker
    state.items.forEach((it, idx) => { it._ord = idx; });
  }

  function scoreItem(item, tokens) {
    if (tokens.length === 0) return 1; // neutral score when no query
    let score = 0;
    for (const [field, text] of Object.entries(item.textByField)) {
      if (!text) continue;
      const w = FIELD_WEIGHT[field] || 1;
      let fieldScore = 0;
      for (const t of tokens) {
        if (!t) continue;
        if (text === t) fieldScore += 3 * w;
        else if (text.startsWith(t)) fieldScore += 2 * w;
        else if (text.includes(t)) fieldScore += 1 * w;
      }
      score += fieldScore;
    }
    return score;
  }

  function applyQuery() {
    const q = norm(state.query || '');
    const tokens = q.split(/\s+/).filter(Boolean);
    const withScores = state.items.map(it => {
      it.score = scoreItem(it, tokens);
      return it;
    });
    // Filter out zero-score when there is a query
    const filtered = (tokens.length > 0)
      ? withScores.filter(it => it.score > 0)
      : withScores.slice();
    // Sort by score desc, then stable by original order
    filtered.sort((a, b) => (b.score - a.score) || (a._ord - b._ord));
    state.filtered = filtered;
    state.page = 1; // reset to first page on each search
  }

  function updateCounts(visibleCount, totalCount) {
    if (COUNT_SHOWING) COUNT_SHOWING.textContent = String(visibleCount);
    if (COUNT_TOTAL) COUNT_TOTAL.textContent = String(totalCount);
  }

  function renderPage() {
    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    const pageItems = state.filtered.slice(start, end);

    // Hide/show cards
    const allNodes = state.items.map(it => it.node);
    allNodes.forEach(n => { n.style.display = 'none'; });
    pageItems.forEach(it => { it.node.style.display = ''; });

    updateCounts(pageItems.length, total);
    renderPagination(totalPages);
  }

  function pageButton(label, page, disabled, active) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.className = [
      'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md border text-sm',
      active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-700 hover:bg-slate-50',
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    ].join(' ');
    if (!disabled && !active) btn.addEventListener('click', () => { state.page = page; renderPage(); });
    return btn;
  }

  function renderPagination(totalPages) {
    if (!PAGINATION) return;
    PAGINATION.innerHTML = '';
    if (totalPages <= 1) return;

    // Prev
    const prev = pageButton('Prev', Math.max(1, state.page - 1), state.page === 1, false);
    PAGINATION.appendChild(prev);

    // Page numbers (compact: show up to 7 buttons with ellipses)
    const maxButtons = 7;
    const pages = [];
    if (totalPages <= maxButtons) {
      for (let p = 1; p <= totalPages; p++) pages.push(p);
    } else {
      const left = Math.max(1, state.page - 2);
      const right = Math.min(totalPages, state.page + 2);
      pages.push(1);
      if (left > 2) pages.push('…');
      for (let p = left; p <= right; p++) pages.push(p);
      if (right < totalPages - 1) pages.push('…');
      pages.push(totalPages);
    }
    pages.forEach(p => {
      if (p === '…') {
        const span = document.createElement('span');
        span.textContent = '…';
        span.className = 'px-1 text-slate-500';
        PAGINATION.appendChild(span);
      } else {
        PAGINATION.appendChild(pageButton(String(p), p, false, p === state.page));
      }
    });

    // Next
    const next = pageButton('Next', Math.min(totalPages, state.page + 1), state.page === totalPages, false);
    PAGINATION.appendChild(next);
  }

  function doSearch(query) {
    state.query = query || '';
    applyQuery();
    renderPage();
  }

  // Debounce helper
  function debounce(fn, ms) {
    let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function initEvents() {
    if (SEARCH_INPUT) {
      const onInput = debounce(() => doSearch(SEARCH_INPUT.value), 200);
      SEARCH_INPUT.addEventListener('input', onInput);
      SEARCH_INPUT.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch(SEARCH_INPUT.value);
      });
    }
    if (SEARCH_BTN) {
      SEARCH_BTN.addEventListener('click', () => doSearch(SEARCH_INPUT ? SEARCH_INPUT.value : ''));
    }
  }

  function initOnceDataReady() {
    // Dynamic list populates asynchronously; observe until at least one card appears, then build index once
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;
    const observer = new MutationObserver(() => {
      const hasCards = !!grid.querySelector('input.js-compare');
      if (!hasCards) return;
      observer.disconnect();
      buildIndex();
      doSearch(''); // initial render
    });
    observer.observe(grid, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initEvents();
      initOnceDataReady();
    });
  } else {
    initEvents();
    initOnceDataReady();
  }
})();

