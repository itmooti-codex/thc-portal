(function () {
  const ROOT_IDS = [
    'filter-type',
    'filter-subtype',
    'filter-dominance',
    'filter-lineage',
    'filter-status',
    'favorites-section'
  ];

  const ICONS = new Map([
    // Type
    ['accessory', '🧰'],
    ['edible', '🍪'],
    ['flower', '🍃'],
    ['vape', '💨'],
    ['oil', '💧'],
    ['extract', '🧪'],

    // Sub-Type
    ['vaporiser', '🔌'],
    ['budget', '💲'],
    ['core', '⚙️'],
    ['craft', '🧵'],

    // Dominance
    ['thc-dominant', '🔺'],
    ['cbd-dominant', '🟢'],
    ['cbg-dominant', '🧬'],
    ['cbn-dominant', '💤'],
    ['thcv-dominant', '⚡'],
    ['broad-spectrum', '🌈'],
    ['full-spectrum', '🟣'],

    // Carrier
    ['coconut oil', '🥥'],
    ['mct oil', '🧪'],
    ['olive oil', '🫒'],
    ['hemp seed oil', '🌱'],
    ['hemp oil', '🌿'],
    ['other', '❓'],

    // Plant Species
    ['sativa dominant', '☀️'],
    ['indica dominant', '🌙'],
    ['sativa 70/30', '☀️'],
    ['indica 70/30', '🌙'],
    ['indica 80/20', '🌙'],
    ['indica 60/40', '🌙'],
    ['sativa 80/20', '☀️'],
    ['sativa 60/40', '☀️'],
    ['sativa', '☀️'],
    ['indica', '🌙'],

    // Favorites & stock (if labels present without emoji)
    ['my favourites', '❤️'],
    ['patient favourites', '👤'],
    ['in stock', '✅'],
    ['out of stock', '⛔']
  ]);

  function norm(s) { return String(s || '').trim().toLowerCase(); }

  function ensureIcon(button) {
    const labelEl = button.querySelector('.font-medium');
    const label = labelEl ? labelEl.textContent : button.textContent;
    const key = norm(label);
    const icon = ICONS.get(key);
    if (!icon) return;
    // If already has a leading emoji span we added, skip
    if (button.firstElementChild && button.firstElementChild.dataset && button.firstElementChild.dataset.icon === 'true') return;
    // Prepend icon span
    const span = document.createElement('span');
    span.textContent = icon;
    span.dataset.icon = 'true';
    span.className = 'inline-block text-2xl leading-none';
    button.insertBefore(span, button.firstChild);
  }

  function applyIcons(root) {
    if (!root) return;
    const buttons = root.querySelectorAll('button');
    buttons.forEach(ensureIcon);
  }

  function init() {
    ROOT_IDS.forEach((id) => {
      const root = document.getElementById(id);
      if (root) applyIcons(root);
    });

    // Observe mutations to keep icons after dynamic changes/toggles
    const observer = new MutationObserver((mutations) => {
      let needs = false;
      for (const m of mutations) {
        if (m.type === 'childList' || m.type === 'subtree' || m.type === 'attributes') { needs = true; break; }
      }
      if (needs) {
        ROOT_IDS.forEach((id) => {
          const root = document.getElementById(id);
          if (root) applyIcons(root);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

