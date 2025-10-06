// Product type icons: keep in main.js (not search.js)
(function () {
    const GRID_SELECTOR = '.grid-root[data-dynamic-list]';
    const LINEAGE_BADGE_SELECTOR = '[data-lineage-badge]';
    const LINEAGE_VARIANT_CLASS_MAP = {
        balanced: ['border-slate-200', 'bg-slate-100', 'text-slate-700'],
        sativa: ['border-amber-200', 'bg-amber-50', 'text-amber-800'],
        indica: ['border-indigo-200', 'bg-indigo-50', 'text-indigo-800']
    };
    const ALL_LINEAGE_CLASSES = Object.values(LINEAGE_VARIANT_CLASS_MAP).reduce(function (acc, classes) {
        return acc.concat(classes);
    }, []);

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

    function updateTypeIcons(scope) {
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

    function normalizeLineage(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function deriveLineageMeta(rawValue) {
        const label = normalizeLineage(rawValue);
        if (!label) {
            return { label: '', variant: 'balanced', icon: '' };
        }
        const lower = label.toLowerCase();
        const hasSativa = /sativa/.test(lower);
        const hasIndica = /indica/.test(lower);
        const isBalancedKeyword = /(balanced|hybrid|50\/50|equal)/.test(lower);
        let variant = 'balanced';
        if ((hasSativa && !hasIndica) || (/day/.test(lower) && !hasIndica)) {
            variant = 'sativa';
        } else if ((hasIndica && !hasSativa) || (/night/.test(lower) && !hasSativa)) {
            variant = 'indica';
        } else if (hasSativa && hasIndica && !isBalancedKeyword) {
            variant = 'balanced';
        } else if (isBalancedKeyword) {
            variant = 'balanced';
        }

        let icon = '';
        if (variant === 'sativa') icon = '☀️';
        if (variant === 'indica') icon = '🌙';

        return { label: label, variant: variant, icon: icon };
    }

    function applyLineageVariantClasses(badge, variant) {
        const targetVariant = LINEAGE_VARIANT_CLASS_MAP[variant] ? variant : 'balanced';
        for (let i = 0; i < ALL_LINEAGE_CLASSES.length; i++) {
            badge.classList.remove(ALL_LINEAGE_CLASSES[i]);
        }
        const classes = LINEAGE_VARIANT_CLASS_MAP[targetVariant];
        for (let i = 0; i < classes.length; i++) {
            badge.classList.add(classes[i]);
        }
    }

    function updateLineageBadges(scope) {
        const root = scope || document;
        const badges = root.querySelectorAll(LINEAGE_BADGE_SELECTOR);
        badges.forEach(function (badge) {
            const card = badge.closest('.group') || badge.closest('.flex');
            if (!card) return;

            const labelEl = badge.querySelector('.lineage-label');
            const iconEl = badge.querySelector('.lineage-icon');
            let lineage = '';
            const si = card.querySelector('.search-index');
            if (si) {
                lineage = si.getAttribute('data-client-preference-lineage') || '';
            }
            if (!lineage && labelEl) {
                lineage = labelEl.textContent || '';
            }
            lineage = normalizeLineage(lineage);
            if (!lineage || /^\[.*\]$/.test(lineage)) {
                if (!badge.classList.contains('hidden')) badge.classList.add('hidden');
                if (iconEl && iconEl.textContent) iconEl.textContent = '';
                if (iconEl && !iconEl.classList.contains('hidden')) iconEl.classList.add('hidden');
                return;
            }
            if (badge.classList.contains('hidden')) badge.classList.remove('hidden');

            const meta = deriveLineageMeta(lineage);
            const displayLabel = meta.label || lineage;
            const currentVariant = badge.getAttribute('data-lineage-variant') || '';

            if (labelEl) {
                if (labelEl.textContent !== displayLabel) labelEl.textContent = displayLabel;
            } else if (badge.textContent !== displayLabel) {
                badge.textContent = displayLabel;
            }

            if (iconEl) {
                if (meta.icon) {
                    if (iconEl.textContent !== meta.icon) iconEl.textContent = meta.icon;
                    if (iconEl.classList.contains('hidden')) iconEl.classList.remove('hidden');
                } else {
                    if (iconEl.textContent) iconEl.textContent = '';
                    if (!iconEl.classList.contains('hidden')) iconEl.classList.add('hidden');
                }
            }

            if (currentVariant !== meta.variant) {
                applyLineageVariantClasses(badge, meta.variant);
                badge.setAttribute('data-lineage-variant', meta.variant);
            }
            if (badge.getAttribute('title') !== displayLabel) {
                badge.setAttribute('title', displayLabel);
            }
        });
    }

    function updateCardDecorations(scope) {
        updateTypeIcons(scope);
        updateLineageBadges(scope);
    }

    function initCardDecorations() {
        updateCardDecorations();
        const grid = document.querySelector(GRID_SELECTOR);
        if (!grid) return;
        let scheduled = false;
        const schedule = () => {
            if (scheduled) return; scheduled = true;
            queueMicrotask(() => { scheduled = false; updateCardDecorations(grid); });
        };
        const mo = new MutationObserver(schedule);
        mo.observe(grid, { childList: true, subtree: true, characterData: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCardDecorations);
    } else {
        initCardDecorations();
    }
})();
