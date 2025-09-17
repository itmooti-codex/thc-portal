(function () {
        function closeAllExcept(except) {
            document.querySelectorAll('[data-dd-menu]').forEach(m => {
                const root = m.closest('[data-dd]');
                if (!except || root !== except) {
                    m.classList.add('hidden');
                    root.querySelector('[data-dd-trigger]').setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Toggle menus
        document.querySelectorAll('[data-dd]').forEach(root => {
            const trigger = root.querySelector('[data-dd-trigger]');
            const menu = root.querySelector('[data-dd-menu]');
            const label = root.querySelector('[data-dd-label]');

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menu.classList.contains('hidden');
                closeAllExcept(root);
                menu.classList.toggle('hidden', !isHidden ? true : false);
                trigger.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            });

            // Select an item
            menu.addEventListener('click', (e) => {
                const li = e.target.closest('li[role="option"]');
                if (!li) return;
                const value = li.getAttribute('data-value');
                label.textContent = li.querySelector('span').textContent;

                // Update checkmarks
                menu.querySelectorAll('[data-check]').forEach(icon => icon.classList.add('opacity-0'));
                const check = li.querySelector('[data-check]');
                if (check) check.classList.remove('opacity-0');

                // pagesize behavior handled by search.js; skip count updates here
                menu.classList.add('hidden');
                trigger.setAttribute('aria-expanded', 'false');
            });
        });

        // Click outside to close
        document.addEventListener('click', () => closeAllExcept(null));
    })();

; (function () {
    const toggleBtn = document.getElementById("toggle-view-more");
    const moreGroup = document.getElementById("more-product-type");
    const extraGroups = [
        document.getElementById('filter-subtype'),
        document.getElementById('filter-dominance'),
        document.getElementById('filter-carrier'),
        document.getElementById('filter-plant-species'),
    ];

    toggleBtn.addEventListener("click", () => {
        const isHidden = moreGroup.classList.contains("hidden");
        moreGroup.classList.toggle("hidden");
        // Toggle additional filter groups together with stock group
        for (let i = 0; i < extraGroups.length; i++) {
            const g = extraGroups[i];
            if (g) g.classList.toggle('hidden');
        }
        toggleBtn.textContent = isHidden ? "view less" : "view more";
    });
})();

const min = document.getElementById('min');
const max = document.getElementById('max');
const progress = document.getElementById('progress');
const bubble = document.getElementById('activeBubble');

const initialMinValue = +min.getAttribute('value');
const initialMaxValue = +max.getAttribute('value');

const minAttr = +min.min;
const maxAttr = +max.max;
const range = maxAttr - minAttr;

function update() {
    const minVal = +min.value;
    const maxVal = +max.value;
    const minPct = ((minVal - minAttr) / range) * 100;
    const maxPct = ((maxVal - minAttr) / range) * 100;

    progress.style.left = minPct + '%';
    progress.style.right = (100 - maxPct) + '%';
}

function showBubble(input) {
    const val = +input.value;
    const pct = ((val - minAttr) / range) * 100;
    bubble.style.left = pct + '%';
    bubble.textContent = `$${val}`;
    bubble.classList.remove('hidden');
}

function hideBubble() {
    bubble.classList.add('hidden');
}

[min, max].forEach(input => {
    input.addEventListener('input', update);
    input.addEventListener('mousedown', () => showBubble(input));
    input.addEventListener('touchstart', () => showBubble(input));
    input.addEventListener('mousemove', () => showBubble(input));
    input.addEventListener('mouseup', hideBubble);
    input.addEventListener('touchend', hideBubble);
});


update();

(function () {
    var ids = [
        'product-type',
        'filter-type',
        'filter-subtype',
        'filter-dominance',
        'filter-carrier',
        'filter-plant-species'
    ];

    function attach(section) {
        section.addEventListener('click', function (e) {
            var el = e.target.closest('button');
            if (!el || !section.contains(el)) return;
            var isActive = el.getAttribute('data-active') === 'true';
            el.setAttribute('data-active', isActive ? 'false' : 'true');
        });
    }

    function init() {
        for (var i = 0; i < ids.length; i++) {
            var s = document.getElementById(ids[i]);
            if (s) attach(s);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// Reset filters: deactivate all, clear search, reset sliders
function resetFilters() {
    // Deactivate buttons in existing section(s)
    var filterButtons = document.querySelectorAll('#product-type button');
    for (var i = 0; i < filterButtons.length; i++) {
        filterButtons[i].setAttribute('data-active', 'false');
    }

    // Clear search input
    var search = document.querySelector('input[placeholder="Search products"]');
    if (search) search.value = '';

    // Reset sliders to initial values and refresh visuals
    if (!isNaN(initialMinValue)) min.value = initialMinValue;
    if (!isNaN(initialMaxValue)) max.value = initialMaxValue;
    if (typeof update === 'function') update();
    if (typeof hideBubble === 'function') hideBubble();

    // 4) Uncheck all non-compare checkboxes (reset toggles)
    var checkboxes = document.querySelectorAll('input[type="checkbox"]:not(.js-compare)');
    for (var i = 0; i < checkboxes.length; i++) {
        var cb = checkboxes[i];
        if (cb.checked) {
            cb.checked = false;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

  // 5) Reset exact-match selects
  var buttonGroups = [
    'filter-type',
    'filter-subtype',
    'filter-dominance',
    'filter-carrier',
    'filter-plant-species'
  ];
  for (var g = 0; g < buttonGroups.length; g++) {
    var grp = document.getElementById(buttonGroups[g]);
    if (!grp) continue;
    var btns = grp.querySelectorAll('button[data-active]');
    for (var b = 0; b < btns.length; b++) {
      btns[b].setAttribute('data-active', 'false');
    }
  }
};

function setupResetFilters() {
    var resetBtn = document.getElementById('reset-button');
    if (!resetBtn) return;
    resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        resetFilters();
    });
};

// Expose for manual invocation if needed
if (typeof window !== 'undefined') {
    window.resetFilters = resetFilters;
    window.setupResetFilters = setupResetFilters;
};

// Auto-initialize on DOM ready to keep behavior
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupResetFilters);
} else {
    setupResetFilters();
};

// Removed legacy cleanup for .thumb elements (no longer used)


document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#min, #max").forEach(item => {
        // Check and update z-index class
        if (item.classList.contains("z-20")) {
            item.classList.remove("z-20");
            item.classList.add("z-30");
        }

        // Apply inline styles
        item.style.marginLeft = "0.25rem";    // ml-1
        item.style.marginTop = "0";   // -mt-1
    });
});

(function () {
    const PLACEHOLDER_SRC = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='20' viewBox='0 0 28 20'%3E%3Crect width='28' height='20' fill='%23e5e7eb'/%3E%3Ctext x='14' y='14' text-anchor='middle' font-size='12' fill='%239ca3af'%3E%3F%3C/text%3E%3C/svg%3E";

    function isValidCode(code) {
        // Flags API expects a 2-letter ISO country code
        return /^[A-Z]{2}$/.test(code);
    }

    function resolveFlagSrc(countryCode) {
        if (!countryCode || countryCode === "[Origin_Country]" || !isValidCode(countryCode)) {
            return PLACEHOLDER_SRC;
        }
        return `https://flagsapi.com/${countryCode}/flat/24.png`;
    }

    function updateFlags() {
        const origins = document.querySelectorAll(".origin-country");
        origins.forEach((p) => {
            const originCountry = (p.textContent || "").trim().toUpperCase();
            const flagImg = p.nextElementSibling instanceof HTMLImageElement
                ? p.nextElementSibling
                : null;
            if (!flagImg) return;
            const nextSrc = resolveFlagSrc(originCountry);
            if (flagImg.src !== nextSrc) {
                flagImg.src = nextSrc;
            }
        });
    }

    // Initial run (in case content is already present)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateFlags, { once: true });
    } else {
        updateFlags();
    }

    // Observe DOM changes and batch updates
    let scheduled = false;
    const scheduleUpdate = () => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
            scheduled = false;
            updateFlags();
        });
    };

    const observer = new MutationObserver(() => {
        scheduleUpdate();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
})();
