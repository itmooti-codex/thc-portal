
// Heart/save button logic with GraphQL favorites (prevents duplicates)
(function () {
    // Internal state: favorites keyed by item id -> array of favorite record ids
    var favState = {
        loaded: false,
        map: new Map()
    };
    // Simple lock per item to prevent rapid double-clicks
    var locks = new Set();

    function getCfg() {
        var d = window.THCPortalDefaults || {};
        return {
            endpoint: d.apiEndpoint,
            apiKey: d.apiKey,
            doctorId: d.doctorId,
            // Use only for creating favorites per requirement
            loggednInUserId: d.loggednInUserId
        };
    }

    function normalizeKey(v) {
        if (v == null) return '';
        return String(v).trim();
    }

    function resolveOwnerId(cfg) {
        var id = (cfg && cfg.loggednInUserId != null && cfg.loggednInUserId !== '')
            ? cfg.loggednInUserId
            : cfg && cfg.doctorId;
        return normalizeKey(id);
    }

    function toIdMaybeNum(v) {
        if (v == null) return v;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
            var trimmed = v.trim();
            if (trimmed === '') return trimmed;
            if (/^\d+$/.test(trimmed)) return Number(trimmed);
            return trimmed;
        }
        return v;
    }

    async function fetchFavorites() {
        var cfg = getCfg();
        var ownerId = resolveOwnerId(cfg);
        // If config missing, mark loaded and leave map empty (no server sync)
        if (!cfg.endpoint || !cfg.apiKey || !ownerId) {
            favState.loaded = true;
            applyHearts();
            return;
        }
        var query = "query calcOPatientInterestedPatientInterestedItems {\n  calcOPatientInterestedPatientInterestedItems {\n    ID: field(arg: [\"id\"])\n    Patient_Interested_ID: field(arg: [\"patient_interested_id\"])\n    Patient_Interested_Item_ID: field(arg: [\"patient_interested_item_id\"])\n  }\n}";
        try {
            var res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Api-Key': cfg.apiKey },
                body: JSON.stringify({ query: query })
            });
            var json = await res.json();
            if (json.errors) {
                console.error('GraphQL favorites query error', json.errors);
                favState.loaded = true;
                applyHearts();
                return;
            }
            var rows = (json && json.data && json.data.calcOPatientInterestedPatientInterestedItems) || [];
            var map = new Map();
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i] || {};
                // Only keep records for the active favorite owner
                if (normalizeKey(r.Patient_Interested_ID) !== ownerId) continue;
                var itemId = normalizeKey(r.Patient_Interested_Item_ID);
                if (!itemId) continue;
                var favId = r.ID;
                if (!map.has(itemId)) map.set(itemId, []);
                map.get(itemId).push(favId);
            }
            favState.map = map;
            favState.loaded = true;
            applyHearts();
        } catch (e) {
            console.error('Favorites fetch failed', e);
            favState.loaded = true;
            applyHearts();
        }
    }

    async function createFavorite(itemId) {
        var cfg = getCfg();
        var ownerId = resolveOwnerId(cfg);
        var query = "mutation createOPatientInterestedPatientInterestedItem($payload: OPatientInterestedPatientInterestedItemCreateInput = null) {\n  createOPatientInterestedPatientInterestedItem(payload: $payload) {\n    patient_interested_id\n    patient_interested_item_id\n  }\n}";
        var variables = {
            payload: {
                // For creation only, prefer loggednInUserId if present; otherwise doctorId
                patient_interested_id: toIdMaybeNum(ownerId),
                patient_interested_item_id: toIdMaybeNum(itemId)
            }
        };
        var res = await fetch(cfg.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Api-Key': cfg.apiKey },
            body: JSON.stringify({ query: query, variables: variables })
        });
        var json = await res.json();
        if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
        // We don't get the new ID back; refresh to pick it up
    }

    async function deleteFavoriteById(favId) {
        var cfg = getCfg();
        var query = "mutation deleteOPatientInterestedPatientInterestedItem($id: ThcOPatientInterestedPatientInterestedItemID) {\n  deleteOPatientInterestedPatientInterestedItem(query: [{ where: { id: $id } }]) {\n    id\n  }\n}";
        var variables = { id: toIdMaybeNum(String(favId)) };
        var res = await fetch(cfg.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Api-Key': cfg.apiKey },
            body: JSON.stringify({ query: query, variables: variables })
        });
        var json = await res.json();
        if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
    }

    function applyHearts() {
        var nodes = document.querySelectorAll('.js-heart');
        for (var i = 0; i < nodes.length; i++) {
            var b = nodes[i];
            var id = normalizeKey(b.getAttribute('data-item-id'));
            var has = id ? favState.map.has(id) : false;
            b.classList.toggle('active', !!has);
            b.setAttribute('aria-pressed', has ? 'true' : 'false');
        }
    }

    async function toggleFavorite(btn) {
        var cfg = getCfg();
        var itemId = normalizeKey(btn.getAttribute('data-item-id'));
        if (!itemId) return;
        var ownerId = resolveOwnerId(cfg);
        // Guard against misconfiguration: fall back to local toggle if no API
        if (!cfg.endpoint || !cfg.apiKey || !ownerId) {
            // Local fallback (no persistence server-side)
            var on = !btn.classList.contains('active');
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            return;
        }
        var key = itemId;
        if (locks.has(key)) return;
        locks.add(key);
        btn.disabled = true;
        try { btn.setAttribute('aria-busy', 'true'); } catch (_) { }
        try {
            var existing = favState.map.get(key) || [];
            if (existing.length > 0) {
                // Delete all duplicates for this item for true toggle-off
                await Promise.all(existing.map(deleteFavoriteById));
            } else {
                await createFavorite(key);
            }
            // Refresh state from server to stay canonical and get IDs
            await fetchFavorites();
        } catch (e) {
            console.error('Favorite toggle failed', e);
            alert('Failed to update favorite: ' + (e && e.message ? e.message : 'Unknown error'));
        } finally {
            locks.delete(key);
            btn.disabled = false;
            try { btn.removeAttribute('aria-busy'); } catch (_) { }
            applyHearts();
        }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest && e.target.closest('.js-heart');
        if (!btn) return;
        e.preventDefault();
        toggleFavorite(btn);
    });

    document.addEventListener('DOMContentLoaded', function () {
        // Initial fetch of favorites and bind to dynamic list changes
        fetchFavorites();
        var host = document.querySelector('[data-dynamic-list]');
        if (!host) return;
        var mo = new MutationObserver(function () { applyHearts(); });
        mo.observe(host, { childList: true, subtree: true });
    });

    // Favorites section buttons: toggle active styling (no popup)
    document.addEventListener('click', function (e) {
        var favBtn = e.target && e.target.closest && e.target.closest('#favorites-section button');
        if (!favBtn) return;
        e.preventDefault();
        var isActive = favBtn.getAttribute('data-active') === 'true';
        favBtn.setAttribute('data-active', isActive ? 'false' : 'true');
    });
})();
