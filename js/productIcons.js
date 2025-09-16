// Product type icons: keep in main.js (not search.js)
(function () {
    const GRID_SELECTOR = '.grid-root[data-dynamic-list]';

    function normalizeType(v) {
        const s = String(v || '').toLowerCase();
        if (!s) return '';
        if (/vape|vapor|cartridge|cart/.test(s)) return 'vape';
        if (/edible|gummy|chocolate|cookie|chew|lozenge/.test(s)) return 'edible';
        if (/extract|concentrate|hash|rosin|wax|shatter/.test(s)) return 'extract';
        if (/flower|bud|pre[- ]?roll/.test(s)) return 'flower';
        if (/oil|tincture|drops?/.test(s)) return 'oil';
        if (/accessor|device|equipment/.test(s)) return 'accessory';
        return s;
    }

    function iconForType(t) {
        switch (normalizeType(t)) {
            case 'accessory': return '🧰';
            case 'extract': return '🧪';
            case 'edible': return '🍪';
            case 'flower': return '🍃';
            case 'oil': return '💧';
            case 'vape': return '💨';
            default: return '🍃';
        }
    }

    function findTypeForCard(card) {
        // Prefer the visible Type label next to the icon
        let type = '';
        const label = card.querySelector('.items-type-icon + span');
        if (label) type = (label.textContent || '').trim();

        // Fallback to hidden data attributes if label is missing/empty
        if (!type) {
            const si = card.querySelector('.search-index');
            if (si) {
                type = si.getAttribute('data-type')
                    || si.getAttribute('data-sub_type')
                    || si.getAttribute('data-dosage_form')
                    || si.getAttribute('data-item_type')
                    || '';
            }
        }
        return type;
    }

    function updateAllTypeIcons(scope) {
        const root = scope || document;
        const icons = root.querySelectorAll('.items-type-icon');
        icons.forEach(function (iconSpan) {
            const card = iconSpan.closest('.group') || iconSpan.closest('.flex');
            if (!card) return;
            const type = findTypeForCard(card);
            const icon = iconForType(type);
            if (iconSpan.textContent !== icon) iconSpan.textContent = icon;
            if (type) iconSpan.setAttribute('title', type);
        });
    }

    function initTypeIcons() {
        updateAllTypeIcons();
        const grid = document.querySelector(GRID_SELECTOR);
        if (!grid) return;
        let scheduled = false;
        const schedule = () => {
            if (scheduled) return; scheduled = true;
            queueMicrotask(() => { scheduled = false; updateAllTypeIcons(grid); });
        };
        const mo = new MutationObserver(schedule);
        mo.observe(grid, { childList: true, subtree: true, characterData: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTypeIcons);
    } else {
        initTypeIcons();
    }
})();
