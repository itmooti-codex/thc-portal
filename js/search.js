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
  const SEARCH_NOTES_WRAPPER = document.querySelector('.json-search-notes');
  let currentNotesKey = '';

  let searchTermEntries = [];
  const searchTermLookup = new Map();

  clearSearchNotes();

  const BENEFIT_CODES = [
    ['399', 'Analgesic'],
    ['398', 'Anti-inflammatory'],
    ['397', 'Antibacterial'],
    ['396', 'Anticancer'],
    ['395', 'Anticonvulsant'],
    ['394', 'Antidepressant'],
    ['393', 'Antifungal'],
    ['392', 'Antimicrobial'],
    ['391', 'Antioxidant'],
    ['390', 'Antispasmodic'],
    ['389', 'Antitumor'],
    ['388', 'Antiviral'],
    ['387', 'Anxiolytic'],
    ['386', 'Appetite Suppressant'],
    ['385', 'Bronchodilator'],
    ['384', 'Cooling'],
    ['383', 'Decongestant'],
    ['382', 'Gastroprotective'],
    ['381', 'Immunostimulant'],
    ['380', 'Insect Repellent'],
    ['379', 'Lung-Protective'],
    ['378', 'Memory Aid'],
    ['377', 'Mood-Elevating'],
    ['376', 'Muscle Relaxant'],
    ['375', 'Neuroprotective'],
    ['374', 'Sedative'],
    ['373', 'Skin-Protective'],
  ];

  const CONDITION_CODES = [
    ['497', 'Chronic Non-Cancer Pain'],
    ['502', 'Anxiety Disorder'],
    ['476', 'Epilepsy'],
    ['483', 'Neuropathic Pain'],
    ['551', 'Chemotherapy-Induced Nausea and Vomiting'],
    ['550', 'Palliative Care'],
    ['484', 'Autism Spectrum Disorder'],
    ['555', 'PTSD'],
    ['489', 'Sleep Disorder'],
    ['472', "Parkinson's Disease"],
    ['470', 'Depression'],
    ['500', 'Endometriosis'],
    ['556', 'ADHD'],
    ['554', 'Migraines'],
    ['559', 'Glaucoma'],
    ['552', 'Loss of Appetite'],
    ['498', 'Cancer'],
    ['553', 'Headaches'],
    ['501', 'Arthritis'],
    ['557', 'Crohns / Ulcerative Colitis / IBS / Gut'],
    ['485', 'Multiple Sclerosis'],
    ['490', 'Inflammation'],
    ['499', 'Fibromyalgia'],
    ['558', 'Chronic Illness'],
  ];

  const TERPENE_CODES = [
    ['295', 'Humulene'],
    ['511', 'Beta-caryophyllene'],
    ['293', 'Ocimene'],
    ['291', 'Alpha-bisabolol'],
    ['509', 'Caryphyllene-oxide'],
    ['227', 'Myrcene'],
    ['229', 'Limonene'],
    ['228', 'Linalool'],
    ['294', 'Alpha-Pinene'],
    ['358', 'Terpinolene'],
    ['292', 'Beta-Pinene'],
    ['655', 'Trans-caryophyllene'],
    ['288', 'Farnesene'],
    ['656', 'Delta-3-carene'],
    ['361', 'Nerolidol'],
    ['505', 'Terpineol'],
    ['508', 'Guaiol'],
    ['657', 'Trans-Nerolidol'],
    ['289', 'Camphene'],
    ['231', 'Fenchyl'],
    ['290', 'Borneol'],
    ['507', 'Phytol'],
    ['658', 'Others'],
  ];

  const BENEFITS_MAP = Object.fromEntries(BENEFIT_CODES);
  const CONDITIONS_MAP = Object.fromEntries(CONDITION_CODES);
  const TERPENES_MAP = Object.fromEntries(TERPENE_CODES);

  const COUNTRY_MAP = {
    AU: 'Australia',
    AUS: 'Australia',
    NZ: 'New Zealand',
    NZL: 'New Zealand',
    CA: 'Canada',
    CAN: 'Canada',
    US: 'United States',
    USA: 'United States',
    UK: 'United Kingdom',
    GB: 'United Kingdom',
  };

  const FILTER_FIELDS = ['type', 'sub_type', 'dominance', 'lineage', 'status'];

  let state = {
    items: [],         // [{ id, node, tokens, primaryTokens, filterValues, searchBlob, score }]
    filtered: [],
    page: 1,
    query: '',
    tokens: []
  };
  let refreshScheduled = false;

  function norm(v) {
    if (v == null) return '';
    return String(v).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function normalizeForSearch(value) {
    const base = norm(value);
    if (!base) return '';
    return base.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function collapseTokens(value) {
    return value.replace(/\s+/g, '');
  }

  function textOf(el) { return (el && el.textContent ? el.textContent : '').trim(); }

  function canonicalStatus(value) {
    const cleaned = normalizeForSearch(value);
    if (!cleaned) return '';
    if (/(out\s*of\s*stock|not\s*available|unavailable|sold\s*out)/.test(cleaned)) return 'not-available';
    if (/(in\s*stock|available)/.test(cleaned)) return 'in-stock';
    return cleaned.replace(/\s+/g, '-');
  }

  function parseTermList(value) {
    if (!value) return new Set();
    const withoutParens = String(value).replace(/\([^)]*\)/g, ' ');
    const cleaned = withoutParens.replace(/[\u2013\u2014]/g, ' ').replace(/[\/|]/g, ' ');
    const segments = cleaned.split(/[,;&]+/);
    const tokens = new Set();
    segments.forEach((segment) => {
      const normalizedSegment = normalizeForSearch(segment);
      if (!normalizedSegment) return;
      const words = normalizedSegment.split(' ').filter(Boolean);
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;
        if (/^\d+$/.test(word)) continue;
        tokens.add(word);
      }
    });
    return tokens;
  }

  function normalizeTermKey(term) {
    return normalizeForSearch(term);
  }

  function createSearchTermEntry(raw) {
    if (!raw || !raw['Search term']) return null;
    const normalizedKey = normalizeTermKey(raw['Search term']);
    const cannabinoidTokens = parseTermList(raw['Predominant Cannabinoids']);
    const terpeneTokens = parseTermList(raw['Predominant Terpenes']);

    const noteFields = [
      'Cannabinoid Ratio Suggestion',
      'Comments for programmer to search',
      'Scientific References',
      'Unnamed: 6',
      'Unnamed: 7',
      'Unnamed: 8'
    ];

    const notes = [];
    noteFields.forEach((field) => {
      const value = raw[field];
      if (value == null) return;
      const trimmed = String(value).trim();
      if (!trimmed) return;
      notes.push({
        key: field,
        label: field.replace(/[:]/g, '').trim(),
        value: trimmed
      });
    });

    return {
      term: raw['Search term'],
      normalizedTerm: normalizedKey,
      cannabinoidTokens,
      terpeneTokens,
      notes,
    };
  }

  function registerSearchTerms(data) {
    if (!Array.isArray(data)) return;
    searchTermEntries = [];
    searchTermLookup.clear();
    data.forEach((entry) => {
      const processed = createSearchTermEntry(entry);
      if (!processed || !processed.normalizedTerm) return;
      searchTermEntries.push(processed);
      searchTermLookup.set(processed.normalizedTerm, processed);
    });
  }

  function loadSearchTerms() {
    fetch('https://itmooti-codex.github.io/thc-portal/searchTerm.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        registerSearchTerms(json);
        doSearch(state.query || '');
      })
      .catch((err) => {
        console.error('Failed to load search term metadata', err);
      });
  }

  function findSearchTermEntry(query) {
    const normalized = normalizeTermKey(query);
    if (!normalized) return null;
    if (searchTermLookup.has(normalized)) return searchTermLookup.get(normalized);
    return null;
  }

  function hasIntersection(setA, setB) {
    if (!setA || !setB) return false;
    for (const value of setA) {
      if (setB.has(value)) return true;
    }
    return false;
  }

  function itemMatchesSearchTerm(item, termEntry) {
    const hasCannabinoids = termEntry.cannabinoidTokens && termEntry.cannabinoidTokens.size > 0;
    const hasTerpenes = termEntry.terpeneTokens && termEntry.terpeneTokens.size > 0;

    let matches = false;
    if (hasCannabinoids && hasIntersection(termEntry.cannabinoidTokens, item.dominanceTokens)) {
      matches = true;
    }
    if (!matches && hasTerpenes && hasIntersection(termEntry.terpeneTokens, item.terpeneTokens)) {
      matches = true;
    }
    if (!hasCannabinoids && !hasTerpenes) {
      matches = true;
    }
    return matches;
  }

  function clearSearchNotes() {
    if (!SEARCH_NOTES_WRAPPER) return;
    SEARCH_NOTES_WRAPPER.innerHTML = '';
    SEARCH_NOTES_WRAPPER.classList.add('hidden');
    currentNotesKey = '';
  }

  function copyToClipboard(text) {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); } catch (_) { /* ignore */ }
    document.body.removeChild(textarea);
  }

  function renderSearchNotes(entry) {
    if (!SEARCH_NOTES_WRAPPER) return;
    if (!entry) {
      clearSearchNotes();
      return;
    }
    if (currentNotesKey === entry.normalizedTerm) return;
    SEARCH_NOTES_WRAPPER.innerHTML = '';
    SEARCH_NOTES_WRAPPER.classList.remove('hidden');

    const heading = document.createElement('div');
    heading.className = 'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500';
    heading.textContent = `Highlights for "${entry.term}"`;
    SEARCH_NOTES_WRAPPER.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'flex flex-wrap gap-3';

    entry.notes.forEach((note) => {
      const card = document.createElement('div');
      const keyClass = note.key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      card.className = `json-note-card ${keyClass} flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-sm text-slate-700 shadow-sm`;

      const content = document.createElement('div');
      content.className = 'max-w-xs whitespace-pre-wrap break-words';
      const labelEl = document.createElement('div');
      labelEl.className = 'text-xs font-semibold uppercase tracking-wide text-indigo-600';
      labelEl.textContent = note.label;
      const valueEl = document.createElement('div');
      valueEl.className = 'mt-1';
      valueEl.textContent = note.value;
      content.appendChild(labelEl);
      content.appendChild(valueEl);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'ml-auto inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400';
      copyBtn.setAttribute('aria-label', `Copy ${note.label}`);
      copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4a2 2 0 012-2h6a2 2 0 012 2v9a2 2 0 01-2 2h-1v-1h1a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v1H6V4z" /><path d="M4 6a2 2 0 012-2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2-1a1 1 0 00-1 1v9a1 1 0 001 1h6a1 1 0 001-1V6a1 1 0 00-1-1H6z" /></svg>';
      copyBtn.addEventListener('click', () => copyToClipboard(note.value));

      card.appendChild(content);
      card.appendChild(copyBtn);
      list.appendChild(card);
    });

    SEARCH_NOTES_WRAPPER.appendChild(list);
    currentNotesKey = entry.normalizedTerm;
  }

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

  function parseCodeList(raw) {
    if (!raw) return [];
    return (String(raw).match(/\d+/g) || []);
  }

  function mapCodes(raw, map) {
    const codes = parseCodeList(raw);
    const names = [];
    for (let i = 0; i < codes.length; i++) {
      const label = map[codes[i]];
      if (label) names.push(label);
    }
    return names;
  }

  function collectTokens(value, tokensSet, parts) {
    const normalized = normalizeForSearch(value);
    if (!normalized) return [];
    parts.push(normalized);
    const tokens = normalized.split(' ').filter(Boolean);
    tokens.forEach((token) => tokensSet.add(token));
    const collapsed = collapseTokens(normalized);
    if (collapsed && collapsed.length > 1) tokensSet.add(collapsed);
    return tokens;
  }

  function canonicalFilterValue(field, value) {
    if (!value) return '';
    if (field === 'status') return canonicalStatus(value);
    return normalizeForSearch(value).replace(/\s+/g, '-');
  }

  function tokenizeQuery(input) {
    const normalized = normalizeForSearch(input);
    if (!normalized) return [];
    const parts = normalized.split(' ').filter(Boolean);
    const tokens = new Set(parts);
    if (parts.length === 1) {
      const collapsed = collapseTokens(normalized);
      if (collapsed && collapsed.length > 1) tokens.add(collapsed);
    }
    return Array.from(tokens);
  }

  function matchesQuery(item, queryTokens) {
    if (!queryTokens.length) return true;
    for (let i = 0; i < queryTokens.length; i++) {
      const token = queryTokens[i];
      if (!item.tokens.has(token)) return false;
    }
    return true;
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
      if (!si) continue;
      const ds = si.dataset || {};

      const itemName = ds.itemName || textOf(card.querySelector('h3'));
      const brand = ds.brand || textOf(card.querySelector('h3 + p'));
      const type = ds.type || textOf(card.querySelector('.items-type-icon + span')) || '';
      const subType = ds.subType || '';
      const dominance = ds.dominance || '';
      const lineage = ds.clientPreferenceLineage || '';
      const status = ds.status || textOf(card.querySelector('.px-5.pb-4 .flex.items-center.gap-2:last-child span:last-child'));
      const originCountryRaw = ds.originCountry || textOf(card.querySelector('.origin-country'));
      const organicRaw = ds.organic;
      const isOrganic = ['true', 'yes', '1'].includes(norm(organicRaw));

      const benefitNames = mapCodes(ds.benefits, BENEFITS_MAP);
      const conditionNames = mapCodes(ds.conditions, CONDITIONS_MAP);
      const terpeneNames = mapCodes(ds.dominantTerpenes, TERPENES_MAP);

      const tokens = new Set();
      const parts = [];
      const primaryTokens = new Set();

      collectTokens(itemName, tokens, parts).forEach((token) => primaryTokens.add(token));
      collectTokens(brand, tokens, parts).forEach((token) => primaryTokens.add(token));
      collectTokens(type, tokens, parts);
      collectTokens(subType, tokens, parts);
      collectTokens(dominance, tokens, parts);
      collectTokens(lineage, tokens, parts);

      if (isOrganic) collectTokens('organic', tokens, parts);

      if (status) {
        collectTokens(status, tokens, parts);
        const canonStatus = canonicalStatus(status);
        if (canonStatus === 'in-stock') {
          collectTokens('in stock', tokens, parts);
          collectTokens('available', tokens, parts);
        } else if (canonStatus === 'not-available') {
          collectTokens('out of stock', tokens, parts);
          collectTokens('not available', tokens, parts);
        }
      }

      if (originCountryRaw) {
        collectTokens(originCountryRaw, tokens, parts);
        const cc = originCountryRaw.toUpperCase();
        if (COUNTRY_MAP[cc]) collectTokens(COUNTRY_MAP[cc], tokens, parts);
        if (cc.length <= 3 && cc !== originCountryRaw) collectTokens(cc, tokens, parts);
      }

      benefitNames.forEach((name) => collectTokens(name, tokens, parts));
      conditionNames.forEach((name) => collectTokens(name, tokens, parts));
      terpeneNames.forEach((name) => collectTokens(name, tokens, parts));

      const searchBlob = parts.join(' ').trim();

      const dominanceTokens = new Set();
      if (dominance) {
        normalizeForSearch(dominance).split(' ').filter(Boolean).forEach((token) => dominanceTokens.add(token));
      }

      const terpeneTokens = new Set();
      terpeneNames.forEach((name) => {
        const normalizedName = normalizeForSearch(name);
        if (!normalizedName) return;
        normalizedName.split(' ').filter(Boolean).forEach((token) => terpeneTokens.add(token));
      });

      const filterValues = {
        type: canonicalFilterValue('type', type),
        sub_type: canonicalFilterValue('sub_type', subType),
        dominance: canonicalFilterValue('dominance', dominance),
        lineage: canonicalFilterValue('lineage', lineage),
        status: canonicalFilterValue('status', status)
      };

      const meta = parseCardMeta(card);
      items.push({ id, node: card, tokens, primaryTokens, searchBlob, filterValues, meta, score: 0, dominanceTokens, terpeneTokens });
    }
    state.items = items;
    state.items.forEach((it, idx) => { it._ord = idx; });
  }

  function scoreItem(item, queryTokens) {
    if (!queryTokens.length) return 1;
    let score = 0;
    for (let i = 0; i < queryTokens.length; i++) {
      const token = queryTokens[i];
      if (item.primaryTokens.has(token)) score += 6;
      if (item.tokens.has(token)) score += 3;
      if (item.searchBlob.includes(token)) score += 1;
    }
    return score;
  }

  function getActiveFilters() {
    const filters = Object.create(null);
    const activeButtons = document.querySelectorAll('button[data-filter-field][data-active="true"]');
    activeButtons.forEach((btn) => {
      const field = btn.getAttribute('data-filter-field');
      if (!field) return;
      const valueAttr = btn.getAttribute('data-filter-value') || btn.textContent;
      const canonical = canonicalFilterValue(field, valueAttr);
      if (!canonical) return;
      if (!filters[field]) filters[field] = new Set();
      filters[field].add(canonical);
    });

    let myFav = false;
    const favBtn = document.querySelector('#favorites-section .my-favorite');
    if (favBtn && favBtn.getAttribute('data-active') === 'true') {
      myFav = true;
    }

    const minEl = document.getElementById('min');
    const maxEl = document.getElementById('max');
    const minVal = minEl ? parseFloat(minEl.value) : NaN;
    const maxVal = maxEl ? parseFloat(maxEl.value) : NaN;

    return {
      filters,
      myFav,
      priceMin: PRICE_FILTER_ACTIVE ? (isNaN(minVal) ? null : minVal) : null,
      priceMax: PRICE_FILTER_ACTIVE ? (isNaN(maxVal) ? null : maxVal) : null,
    };
  }

  function itemMatchesFilters(item, filterState) {
    const filterMap = filterState.filters || {};
    for (let i = 0; i < FILTER_FIELDS.length; i++) {
      const field = FILTER_FIELDS[i];
      const set = filterMap[field];
      if (!set || set.size === 0) continue;
      const value = item.filterValues[field];
      if (!value) return false;
      if (!set.has(value)) return false;
    }

    let runtimeMeta = null;
    if (filterState.myFav || filterState.priceMin != null || filterState.priceMax != null) {
      runtimeMeta = readRuntimeMeta(item.node);
    }

    if (filterState.myFav) {
      if (!runtimeMeta || !runtimeMeta.isFav) return false;
    }

    if (filterState.priceMin != null || filterState.priceMax != null) {
      const price = runtimeMeta && typeof runtimeMeta.price === 'number' ? runtimeMeta.price : null;
      if (price != null) {
        if (filterState.priceMin != null && price < filterState.priceMin) return false;
        if (filterState.priceMax != null && price > filterState.priceMax) return false;
      }
    }

    return true;
  }

  function applyQuery() {
    const tokens = tokenizeQuery(state.query || '');
    state.tokens = tokens;
    const filters = getActiveFilters();
    const matchedTermEntry = findSearchTermEntry(state.query || '');

    const filteredByQuery = state.items.filter((it) => matchesQuery(it, tokens));
    filteredByQuery.forEach((item) => {
      item.score = scoreItem(item, tokens);
    });

    let filtered = filteredByQuery;
    if (matchedTermEntry) {
      filtered = filtered.filter((item) => itemMatchesSearchTerm(item, matchedTermEntry));
    }

    filtered = filtered.filter((item) => itemMatchesFilters(item, filters));
    filtered.sort((a, b) => (b.score - a.score) || (a._ord - b._ord));
    state.filtered = filtered;
    state.page = 1;

    if (matchedTermEntry) {
      renderSearchNotes(matchedTermEntry);
    } else {
      clearSearchNotes();
    }
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
    // Trigger search on button click or typing
    if (SEARCH_BTN) {
      SEARCH_BTN.addEventListener('click', () => doSearch(SEARCH_INPUT ? SEARCH_INPUT.value : ''));
    }
    if (SEARCH_INPUT) {
      const handleInput = debounce(() => doSearch(SEARCH_INPUT.value), 150);
      SEARCH_INPUT.addEventListener('input', handleInput);
      SEARCH_INPUT.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSearch(SEARCH_INPUT.value);
        }
      });
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
    const filterRoot = document.querySelector('.filter-buttons');
    if (filterRoot) {
      filterRoot.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest && e.target.closest('button');
        if (!btn || !filterRoot.contains(btn)) return;
        if (!btn.hasAttribute('data-filter-field') && !btn.classList.contains('my-favorite')) return;
        setTimeout(() => { doSearch(state.query || ''); }, 0);
      });
    }

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
    observeFilters(filterRoot);
    observeFilters(document.getElementById('favorites-section'));

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

    document.addEventListener('thc:favorites-sync', () => {
      const filters = getActiveFilters();
      if (!filters.myFav) return;
      doSearch(state.query || '');
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

  loadSearchTerms();
})();
