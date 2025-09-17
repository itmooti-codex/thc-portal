// Simple front-end search + pagination for the dynamic grid
(function () {
  const GRID_SELECTOR = '.grid-root[data-dynamic-list]';
  let PAGE_SIZE = 50;
  const COUNT_SHOWING = document.getElementById('pageShowing');
  const COUNT_TOTAL = document.getElementById('totalResults');
  const PAGINATION = document.getElementById('gridPagination');
  const SEARCH_INPUT = document.querySelector('input[placeholder="Search products"]');
  const SEARCH_BTN = (SEARCH_INPUT && SEARCH_INPUT.parentElement) ? SEARCH_INPUT.parentElement.querySelector('button') : null;
  let PRICE_FILTER_ACTIVE = false;

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
  let refreshScheduled = false;

  function norm(v) {
    return (v == null ? '' : String(v)).toLowerCase();
  }

  function textOf(el) { return (el && el.textContent ? el.textContent : '').trim(); }

  function pruneCheckCounts(root = document) {
    if (!root) return;
    const containers = new Set();
    const badges = root.querySelectorAll ? root.querySelectorAll('.checkCount') : [];
    badges.forEach((badge) => {
      const raw = (badge.textContent || '').trim();
      const normalized = raw.replace(/\s+/g, ' ');
      const lowered = normalized.toLowerCase();
      let remove = false;
      if (!normalized) remove = true;
      else if (/^(?:null|undefined|n\/?a|--?|—)$/.test(lowered)) remove = true;
      else {
        const numbers = normalized.match(/-?\d+(?:\.\d+)?/g) || [];
        if (numbers.length === 0) {
          remove = true;
        } else {
          const hasValue = numbers.some((token) => {
            const value = parseFloat(token);
            return !Number.isNaN(value) && value !== 0;
          });
          if (!hasValue) remove = true;
        }
      }
      if (remove) {
        containers.add(badge.parentElement);
        badge.remove();
      }
    });
    containers.forEach((container) => {
      if (!container) return;
      if (container.querySelector('.checkCount')) return;
      container.classList.add('hidden');
    });
  }

  function parseCardMeta(card) {
    const si = card.querySelector('.search-index');
    // Type: prefer visible label next to the icon
    let typeText = '';
    const typeLbl = card.querySelector('.items-type-icon + span');
    if (typeLbl) typeText = textOf(typeLbl);
    if (!typeText && si) {
      typeText = textOf({ textContent: si.getAttribute('data-type') }) ||
                 textOf({ textContent: si.getAttribute('data-sub_type') }) ||
                 textOf({ textContent: si.getAttribute('data-dosage_form') });
    }

    // Status: prefer hidden data, fallback to visible last meta span
    let statusText = si ? textOf({ textContent: si.getAttribute('data-status') }) : '';
    if (!statusText) {
      const statusSpan = card.querySelector('.px-5.pb-4 .flex.items-center.gap-2:last-child span:last-child');
      if (statusSpan) statusText = textOf(statusSpan);
    }

    // Price: parse from meta row font-medium within price group
    let price = null;
    try {
      const groups = card.querySelectorAll('.px-5.pb-4 .flex.items-center.gap-2');
      const priceSpan = (groups && groups[1]) ? groups[1].querySelector('.font-medium') : null;
      const fallbackSpan = card.querySelector('.px-5.pb-4 span.font-medium');
      const raw = textOf(priceSpan || fallbackSpan).replace(/[^0-9.]/g, '');
      if (raw) price = parseFloat(raw);
    } catch (e) { /* ignore */ }

    // Favorite: heart button active
    const heart = card.querySelector('.js-heart');
    const isFav = !!(heart && heart.classList.contains('active'));

    return { typeText, statusText, price, isFav };
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
      const meta = parseCardMeta(card);
      items.push({ id, node: card, textByField, score: 0, meta });
    }
    state.items = items;
    // Initial order as a tiebreaker
    state.items.forEach((it, idx) => { it._ord = idx; });
  }

  function scoreItem(item, query) {
    if (!query) return 1; // neutral score when no query
    let score = 0;
    for (const [field, text] of Object.entries(item.textByField)) {
      if (!text) continue;
      const w = FIELD_WEIGHT[field] || 1;
      let fieldScore = 0;
      
      // Check for exact phrase match first (highest priority)
      if (text.includes(query)) {
        fieldScore += 5 * w; // Higher score for phrase matches
      }
      
      score += fieldScore;
    }
    return score;
  }

  function getActiveFilters() {
    // Button filters
    const container = document.getElementById('product-type');
    const activeBtns = container ? Array.from(container.querySelectorAll('button[data-active="true"]')) : [];
    const activeLabels = activeBtns.map(b => {
      const s = b.querySelector('.font-medium');
      return (s ? s.textContent : b.textContent || '').trim();
    }).filter(Boolean);
    const types = new Set();
    const statuses = new Set();
    let myFav = false;
    const isKnownTypeLabel = (l) => {
      const s = l.toLowerCase();
      return (
        s.includes('flower') || s.includes('oil') || s.includes('vape') || s.includes('cartridge') ||
        s.includes('gummy') || s.includes('edible') || s.includes('capsule') || s.includes('other') ||
        s.includes('concentrate') || s.includes('bubble hash') || s.includes('hash')
      );
    };
    for (const label of activeLabels) {
      const l = label.toLowerCase();
      if (l.includes('favourites') || l.includes('favorites')) {
        // Treat any favourites as personal favorites filter for now
        myFav = true;
        continue;
      }
      if (/(in\s*stock|out\s*of\s*stock)/.test(l)) {
        statuses.add(label);
        continue;
      }
      // Only treat known product-type labels as a type filter
      if (isKnownTypeLabel(label)) types.add(label);
    }

    // Price range
    const minEl = document.getElementById('min');
    const maxEl = document.getElementById('max');
    const minVal = minEl ? parseFloat(minEl.value) : NaN;
    const maxVal = maxEl ? parseFloat(maxEl.value) : NaN;

    return {
      types,
      statuses,
      myFav,
      priceMin: PRICE_FILTER_ACTIVE ? (isNaN(minVal) ? null : minVal) : null,
      priceMax: PRICE_FILTER_ACTIVE ? (isNaN(maxVal) ? null : maxVal) : null,
    };
  }

  function readRuntimeMeta(card) {
    // Type from visible label
    let typeText = '';
    const typeLbl = card.querySelector('.items-type-icon + span');
    if (typeLbl) typeText = textOf(typeLbl);
    if (!typeText) {
      const si = card.querySelector('.search-index');
      if (si) {
        typeText = textOf({ textContent: si.getAttribute('data-type') })
          || textOf({ textContent: si.getAttribute('data-sub_type') })
          || textOf({ textContent: si.getAttribute('data-dosage_form') });
      }
    }
    // Status from hidden or visible last meta row
    let statusText = '';
    const si2 = card.querySelector('.search-index');
    if (si2) statusText = textOf({ textContent: si2.getAttribute('data-status') });
    if (!statusText) {
      const statusSpan = card.querySelector('.px-5.pb-4 .flex.items-center.gap-2:last-child span:last-child');
      if (statusSpan) statusText = textOf(statusSpan);
    }
    // Price from price group
    let price = null;
    try {
      const groups = card.querySelectorAll('.px-5.pb-4 .flex.items-center.gap-2');
      const priceSpan = (groups && groups[1]) ? groups[1].querySelector('.font-medium') : null;
      const raw = textOf(priceSpan).replace(/[^0-9.]/g, '');
      if (raw) price = parseFloat(raw);
    } catch (_) { }
    // Favorite state
    const heart = card.querySelector('.js-heart');
    const isFav = !!(heart && heart.classList.contains('active'));
    return { typeText, statusText, price, isFav };
  }

  function itemMatchesFilters(it, f) {
    const metaNow = readRuntimeMeta(it.node);
    // Type filter: if any active, require item type to include any label
    if (f.types && f.types.size > 0) {
      const t = (metaNow.typeText || '').toLowerCase();
      if (!t) return false;
      let ok = false;
      for (const want of f.types) {
        const w = String(want).toLowerCase();
        if (t.includes(w) || w.includes(t)) { ok = true; break; }
      }
      if (!ok) return false;
    }
    // Status filter
    if (f.statuses && f.statuses.size > 0) {
      const s = (metaNow.statusText || '').toLowerCase();
      let ok = false;
      for (const want of f.statuses) {
        const w = String(want).toLowerCase();
        if (s.includes(w)) { ok = true; break; }
      }
      if (!ok) return false;
    }
    // Favorites
    if (f.myFav) {
      if (!metaNow.isFav) return false;
    }
    // Price range
    if (f.priceMin != null || f.priceMax != null) {
      const p = (typeof metaNow.price === 'number') ? metaNow.price : null;
      if (p != null) {
        if (f.priceMin != null && p < f.priceMin) return false;
        if (f.priceMax != null && p > f.priceMax) return false;
      }
    }
    return true;
  }

  function applyQuery() {
    const q = norm(state.query || '');
    const withScores = state.items.map(it => {
      it.score = scoreItem(it, q);
      return it;
    });
    
    // For phrase matching: only show items that contain the search phrase
    const filtered = (q.length > 0)
      ? withScores.filter(it => it.score > 0)
      : withScores.slice();
    
    // Apply button/price filters
    const filters = getActiveFilters();
    const filtered2 = filtered.filter(it => itemMatchesFilters(it, filters));
    
    // Sort by score desc, then stable by original order
    filtered2.sort((a, b) => (b.score - a.score) || (a._ord - b._ord));
    state.filtered = filtered2;
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

    // Ensure/Toggle no-results empty state
    const gridRoot = document.querySelector(GRID_SELECTOR);
    let noResultsEl = gridRoot ? gridRoot.querySelector('#noResultsMessage') : null;
    const ensureNoResultsEl = () => {
      if (!gridRoot) return null;
      if (!noResultsEl) {
        noResultsEl = document.createElement('div');
        noResultsEl.id = 'noResultsMessage';
        noResultsEl.className = 'col-span-full flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-slate-300 bg-white p-8 my-6';
        noResultsEl.innerHTML = [
          '<div class="text-lg font-semibold text-slate-900">No results found</div>',
          '<p class="mt-2 text-slate-600">Try adjusting your search or filters.</p>',
          '<button type="button" id="addNewProductBtn" class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-white font-medium hover:bg-indigo-700">',
          '  <span class="text-xl leading-none">+</span>',
          '  Add New Product',
          '</button>'
        ].join('');
        gridRoot.appendChild(noResultsEl);
        // Wire the Add New Product button to open script sidebar with custom item
        var addBtn = noResultsEl.querySelector('#addNewProductBtn');
        if (addBtn) {
          addBtn.addEventListener('click', function () {
            try {
              var q = state.query || '';
              if (window.vsAddCustomScriptEntry) {
                window.vsAddCustomScriptEntry({ name: q });
              }
            } catch (e) { console.error(e); }
          });
        }
      }
      return noResultsEl;
    };

    // Hide/show cards
    const allNodes = state.items.map(it => it.node);
    allNodes.forEach(n => { n.style.display = 'none'; });
    pageItems.forEach(it => { it.node.style.display = ''; });

    // Toggle empty state visibility based on total
    if (total === 0) {
      const el = ensureNoResultsEl();
      if (el) el.style.display = '';
    } else if (noResultsEl) {
      noResultsEl.style.display = 'none';
    }

    updateCounts(pageItems.length, total);
    pruneCheckCounts(gridRoot);
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
    const addPage = (p) => {
      if (pages.length === 0 || pages[pages.length - 1] !== p) pages.push(p);
    };
    if (totalPages <= maxButtons) {
      for (let p = 1; p <= totalPages; p++) addPage(p);
    } else {
      const left = Math.max(1, state.page - 2);
      const right = Math.min(totalPages, state.page + 2);
      addPage(1);
      if (left > 2) pages.push('…');
      for (let p = Math.max(2, left); p <= Math.min(totalPages - 1, right); p++) addPage(p);
      if (right < totalPages - 1) pages.push('…');
      addPage(totalPages);
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

  function refreshSearch(options) {
    if (refreshScheduled) return;
    refreshScheduled = true;
    queueMicrotask(() => {
      refreshScheduled = false;
      const grid = document.querySelector(GRID_SELECTOR);
      if (grid) pruneCheckCounts(grid);
      buildIndex();
      const prevPage = state.page;
      applyQuery();
      if (options && options.preservePage) {
        const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
        state.page = Math.min(prevPage, totalPages);
      }
      renderPage();
    });
  }

  // Debounce helper
  function debounce(fn, ms) {
    let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function initEvents() {
    // Only search when the Search button is clicked
    if (SEARCH_BTN) {
      SEARCH_BTN.addEventListener('click', () => doSearch(SEARCH_INPUT ? SEARCH_INPUT.value : ''));
    }

    // Reset button: when clicked, also reset search results to default
    const RESET_BTN = document.getElementById('reset-button');
    if (RESET_BTN) {
      RESET_BTN.addEventListener('click', () => {
        // Ensure our search state and grid return to initial state
        PRICE_FILTER_ACTIVE = false;
        doSearch('');
      });
    }

    // Hook into results-per-page dropdown
    const psRoot = document.querySelector('[data-dd="pagesize"]');
    if (psRoot) {
      // Ensure label matches default page size
      const label = psRoot.querySelector('[data-dd-label]');
      if (label) label.textContent = String(PAGE_SIZE);

      // Reflect initial check mark
      const menuAll = psRoot.querySelectorAll('[data-dd-menu] [data-check]');
      menuAll.forEach(icon => icon.classList.add('opacity-0'));
      const defaultLi = psRoot.querySelector(`[data-dd-menu] li[role="option"][data-value="${PAGE_SIZE}"] [data-check]`);
      if (defaultLi) defaultLi.classList.remove('opacity-0');

      const menu = psRoot.querySelector('[data-dd-menu]');
      if (menu) {
        menu.addEventListener('click', (e) => {
          const li = e.target.closest('li[role="option"][data-value]');
          if (!li) return;
          const value = parseInt(li.getAttribute('data-value'), 10);
          if (!isNaN(value) && value > 0) {
            PAGE_SIZE = value;
            state.page = 1;
            renderPage();
          }
        });
      }
    }

    // React to filter button clicks instantly
    const filterContainer = document.getElementById('product-type');
    const filterSection = document.querySelector('.filter-buttons');
    const handleFilterClick = (root) => (e) => {
      const btn = e.target && e.target.closest && e.target.closest('button');
      if (!btn || !root.contains(btn)) return;
      // Run after dropdown.js toggles data-active
      setTimeout(() => { doSearch(state.query || ''); }, 0);
    };
    if (filterContainer) filterContainer.addEventListener('click', handleFilterClick(filterContainer));
    if (filterSection) filterSection.addEventListener('click', handleFilterClick(filterSection));

    // Observe attribute changes in filters to re-apply without clicks (programmatic toggles)
    const observeFilters = (root) => {
      if (!root) return;
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'data-active') {
            doSearch(state.query || '');
            break;
          }
        }
      });
      mo.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
    };
    observeFilters(filterContainer);
    observeFilters(filterSection);

    // React to price range changes instantly
    const minEl = document.getElementById('min');
    const maxEl = document.getElementById('max');
    const onRange = debounce(() => { PRICE_FILTER_ACTIVE = true; doSearch(state.query || ''); }, 50);
    if (minEl) minEl.addEventListener('input', onRange);
    if (maxEl) maxEl.addEventListener('input', onRange);

    // If favorites change and a favorites filter is active, re-apply filters
    document.addEventListener('click', (e) => {
      const heart = e.target && e.target.closest && e.target.closest('.js-heart');
      if (!heart) return;
      // run after main.js toggles classes
      setTimeout(() => { doSearch(state.query || ''); }, 0);
    });
  }

  function initOnceDataReady() {
    // Dynamic list populates asynchronously; observe until at least one card appears, then build index once
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;
    if (grid.querySelector('input.js-compare')) {
      refreshSearch({ preservePage: false });
      startContinuousObserver(grid);
      return;
    }
    const observer = new MutationObserver(() => {
      const hasCards = !!grid.querySelector('input.js-compare');
      if (!hasCards) return;
      observer.disconnect();
      refreshSearch({ preservePage: false });
      startContinuousObserver(grid);
    });
    observer.observe(grid, { childList: true, subtree: true });
  }

  function startContinuousObserver(grid) {
    const continuousObserver = new MutationObserver((mutations) => {
      let needsRefresh = false;
      for (const m of mutations) {
        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
          needsRefresh = true;
          break;
        }
      }
      if (needsRefresh) refreshSearch({ preservePage: true });
    });
    continuousObserver.observe(grid, { childList: true, subtree: false });
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
