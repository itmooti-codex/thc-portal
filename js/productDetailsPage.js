const TERPENE_TOTAL_KEY = 'Terpene';

const terpMap = {
    [TERPENE_TOTAL_KEY]: terpeneValue,
    'Myrcene': myrceneValue,
    'Limonene': limoneneValue,
    'Beta-caryophyllene': betaCaryophylleneValue,
    'Humulene': humuleneValue,
    'Linalool': linaloolValue,
    'Caryophyllene-oxide': caryophylleneOxideValue,
    'Alpha-bisabolol': alphaBisabololValue,
    'Alpha-pinene': alphaPineneValue,
    'Terpinolene': terpinoleneValue,
    'Beta-pinene': betaPineneValue,
    'Trans-caryophyllene': transCaryophylleneValue,
    'Ocimene': ocimeneValue,
    'Farnesene': farneseneValue,
    'Delta-3-carene': delta3CareneValue,
    'Nerolidol': nerolidolValue,
    'Terpineol': terpineolValue,
    'Guaiol': guaiolValue,
    'Trans-Nerolidol': transNerolidolValue,
    'Camphene': campheneValue,
    'Fenchyl': fenchylValue,
    'Borneol': borneolValue,
    'Phytol': phytolValue,
    'Others': othersValue
};

// Utilities
const n = v => {
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : 0;
};
const asPct = num => `${num.toFixed(2)}%`; // 0.71 => "0.71%"
const realPctOfProduct = raw => n(raw) / 100; // show on right
const shareOfTotal = (raw, totalRaw) => {
    const total = n(totalRaw);
    const value = n(raw);
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
};

// Distinct, stable colors per key
const colorByKey = (() => {
    const palette = [
        '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
        '#14B8A6', '#F97316', '#22C55E', '#6366F1', '#84CC16', '#06B6D4',
        '#E11D48', '#A855F7', '#0EA5E9', '#F43F5E', '#65A30D', '#9333EA',
        '#FDE047', '#2DD4BF', '#7C3AED', '#059669', '#2563EB', '#FB7185'
    ];
    const keys = Object.keys(terpMap).filter(k => k !== TERPENE_TOTAL_KEY);
    const map = {};
    keys.forEach((k, i) => map[k] = palette[i % palette.length]);
    return map;
})();

function paintRow(rowEl, key, totalRaw) {
    const raw = terpMap[key];
    const valueEl = rowEl.querySelector('.metric-value');
    const barEl = rowEl.querySelector('.metric-bar');
    const trackEl = rowEl.querySelector('.metric-track');

    const displayPct = realPctOfProduct(raw);     // e.g., 71 -> 0.71%
    const widthPct = shareOfTotal(raw, totalRaw); // e.g., 71/256 -> 27.73%

    if (valueEl) valueEl.textContent = asPct(displayPct);
    if (barEl) {
        barEl.style.width = `${widthPct}%`;
        const color = colorByKey[key] || '#334155';
        barEl.style.backgroundColor = color;
    }
    if (trackEl) {
        trackEl.style.backgroundColor = '#E5E7EB'; // neutral track
        trackEl.style.opacity = '1';
    }
}

function reorderRows(rowsWrapper) {
    const rows = Array.from(rowsWrapper.querySelectorAll('.terpene-row[data-terpene]'));
    rows.sort((a, b) => {
        const ka = a.getAttribute('data-terpene');
        const kb = b.getAttribute('data-terpene');
        const va = Number.isFinite(parseFloat(terpMap[ka])) ? parseFloat(terpMap[ka]) : -1;
        const vb = Number.isFinite(parseFloat(terpMap[kb])) ? parseFloat(terpMap[kb]) : -1;
        if (vb !== va) return vb - va;
        return ka.localeCompare(kb);
    });
    rows.forEach(row => rowsWrapper.appendChild(row));
}

function setHeaderTotal(totalRaw) {
    const pill = document.getElementById('terpene-total-pill');
    if (!pill) return;
    pill.textContent = asPct(n(totalRaw) / 100); // e.g., 256 => 2.56%
}

document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('terpene-card');
    if (!card) return;

    const rowsWrapper = card.querySelector('.terpene-rows');
    if (!rowsWrapper) return;

    const totalRaw = n(terpeneValue);

    // 1) Fill the header pill with total terpene %
    setHeaderTotal(totalRaw);

    // 2) Reorder rows by value (desc)
    reorderRows(rowsWrapper);

    // 3) Paint rows
    const rows = rowsWrapper.querySelectorAll('.terpene-row[data-terpene]');
    rows.forEach(row => {
        const key = row.getAttribute('data-terpene');
        if (!terpMap.hasOwnProperty(key)) return;
        paintRow(row, key, totalRaw);
    });

    // No total row appended anymore—header shows it
});

function getTypeIcon(type) {
    switch (type) {
        case "accessory": return "🧰";
        case "extract": return "🧪";
        case "edible": return "🍪";
        case "flower": return "🍃";
        case "oil": return "💧";
        case "vape": return "💨";
        default: return "🍃";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const iconEl = document.querySelector(".typeIcon");
    if (iconEl) {
        iconEl.textContent = getTypeIcon(itemType);
    }
});

// Common aliases & tricky names → ISO-2 codes
const aliasToCode = {
    "usa": "US", "us": "US", "united states": "US", "united states of america": "US",
    "uk": "GB", "united kingdom": "GB", "england": "GB", "scotland": "GB",
    "wales": "GB", "northern ireland": "GB",
    "south korea": "KR", "korea, republic of": "KR",
    "north korea": "KP", "korea, democratic people's republic of": "KP",
    "czechia": "CZ", "czech republic": "CZ",
    "russia": "RU", "viet nam": "VN",
    "uae": "AE", "united arab emirates": "AE"
    // add more aliases here if your data uses them
};

const clean = str => String(str || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

async function resolveCountryCode(name) {
    const norm = clean(name);
    if (!norm) return "";

    if (aliasToCode[norm]) return aliasToCode[norm];

    // Try exact match via REST Countries
    try {
        const r1 = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=true`);
        const a1 = await r1.json();
        if (Array.isArray(a1) && a1[0]?.cca2) return a1[0].cca2;
    } catch { }

    // Fallback: loose match
    try {
        const r2 = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`);
        const a2 = await r2.json();
        if (Array.isArray(a2) && a2[0]?.cca2) return a2[0].cca2;
    } catch { }

    return "";
}

function setFlag(imgEl, code, label) {
    if (!imgEl || !code) {
        if (imgEl) imgEl.style.display = "none";
        return;
    }
    const lc = code.toLowerCase();
    // FlagCDN PNG with srcset for retina; switch to .svg if you prefer
    imgEl.src = `https://flagcdn.com/w40/${lc}.png`;
    imgEl.srcset = `https://flagcdn.com/w80/${lc}.png 2x, https://flagcdn.com/w160/${lc}.png 4x`;
    imgEl.alt = `${label} flag`;
}

document.addEventListener("DOMContentLoaded", async () => {
    const img = document.querySelector(".countryFlag");
    const country = (originCountry || "").trim();
    const code = await resolveCountryCode(country);
    setFlag(img, code, country);
});






const n1 = v => {
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : 0;
};
const clamp01 = v => Math.max(0, Math.min(100, v));
const isPercentUnit = (strengthUnit || "").trim().toLowerCase() === "%";

const pillClass = {
    THC: "mt-2 inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800",
    CBD: "mt-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800",
};

function updateHeroMetric(key, value) {
    const root = document.querySelector(`[data-hero-metric="${key}"]`);
    if (!root) return;

    const valEl = root.querySelector(".metric-value");
    const barEl = root.querySelector(".metric-bar");
    const trackEl = barEl ? barEl.parentElement : null;

    const raw = n1(value);

    if (isPercentUnit) {
        if (valEl) valEl.textContent = `${raw}%`;
        if (trackEl) trackEl.classList.remove("hidden");
        if (barEl) barEl.style.width = `${clamp01(raw)}%`;
    } else {
        if (valEl) {
            valEl.innerHTML = `<span class="${pillClass[key]}">${value}${strengthUnit} ${key}</span>`;
        }
        if (trackEl) trackEl.classList.add("hidden");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    updateHeroMetric("THC", thcValue);
    updateHeroMetric("CBD", cbdValue);
});