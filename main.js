// Compare sidebar logic
(function () {
    var selected = new Map();
    var sidebar = document.getElementById('compareSidebar');
    var list = document.getElementById('compareList');
    var fab = document.getElementById('compareFab');
    var fabCount = document.getElementById('compareCountFab');
    var createBtn = document.getElementById('compareCreate');
    var collapsed = false;

    function renderSidebar() {
        list.innerHTML = '';
        selected.forEach(function (entry, id) {
            // Row container + visual card
            var wrap = document.createElement('div');
            wrap.className = 'px-4 py-2';
            var card = document.createElement('div');
            card.className = 'rounded-xl border border-slate-200 overflow-hidden shadow-sm';

            // Header row
            var header = document.createElement('div');
            header.className = 'flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100';

            var name = document.createElement('div');
            name.className = 'text-slate-900 text-sm font-semibold truncate';
            name.textContent = entry.name || id;

            var controls = document.createElement('div');
            controls.className = 'flex items-center gap-2';

            var chevron = document.createElement('span');
            var chevClasses = 'h-4 w-4 text-slate-500 transform transition-transform duration-200 ' + (entry.open ? 'rotate-180' : '');
            chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="' + chevClasses + '" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>';

            var btn = document.createElement('button');
            btn.className = 'inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50';
            btn.setAttribute('aria-label', 'Remove');
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 8.586l4.243-4.243 1.414 1.414L11.414 10l4.243 4.243-1.414 1.414L10 11.414l-4.243 4.243-1.414-1.414L8.586 10 4.343 5.757l1.414-1.414L10 8.586z" clip-rule="evenodd"/></svg>';
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (entry.checkbox) {
                    entry.checkbox.checked = false;
                    entry.checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            controls.appendChild(chevron);
            controls.appendChild(btn);
            header.appendChild(name);
            header.appendChild(controls);

            // Panel row (hidden by default)
            var panel = document.createElement('div');
            panel.className = 'px-4 pb-4 bg-white border-t border-slate-200 ' + (entry.open ? '' : 'hidden');

            function addTextInput(parent, labelText, key, type) {
                var wrap = document.createElement('div');
                wrap.className = 'mt-3';
                var lbl = document.createElement('label');
                lbl.className = 'block text-xs text-slate-500';
                lbl.textContent = labelText;
                var inp = document.createElement('input');
                inp.type = type || 'text';
                if (type === 'number') inp.min = '0';
                inp.value = (entry[key] != null && entry[key] !== undefined) ? entry[key] : '';
                inp.placeholder = labelText;
                inp.className = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500';
                inp.addEventListener('click', function (e) { e.stopPropagation(); });
                inp.addEventListener('input', function () { entry[key] = (type === 'number') ? this.valueAsNumber : this.value; });
                wrap.appendChild(lbl);
                wrap.appendChild(inp);
                parent.appendChild(wrap);
            }

            function addTextarea(parent, labelText, key) {
                var wrap = document.createElement('div');
                wrap.className = 'mt-3';
                var lbl = document.createElement('label');
                lbl.className = 'block text-xs text-slate-500';
                lbl.textContent = labelText;
                var ta = document.createElement('textarea');
                ta.rows = 3;
                ta.placeholder = labelText;
                ta.className = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500';
                ta.value = entry[key] || '';
                ta.addEventListener('click', function (e) { e.stopPropagation(); });
                ta.addEventListener('input', function () { entry[key] = this.value; });
                wrap.appendChild(lbl);
                wrap.appendChild(ta);
                parent.appendChild(wrap);
            }

            function addRouteSelect(parent, labelText, key) {
                var wrap = document.createElement('div');
                wrap.className = 'mt-3';
                var lbl = document.createElement('label');
                lbl.className = 'block text-xs text-slate-500';
                lbl.textContent = labelText;
                var sel = document.createElement('select');
                sel.className = '!block mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white';

                var options = [
                    { title: 'Select none', code: '' },
                    { title: 'Transdermal', code: '602' },
                    { title: 'Rectal', code: '601' },
                    { title: 'Mucosal', code: '600' },
                    { title: 'Topical', code: '599' },
                    { title: 'Sublingual', code: '598' },
                    { title: 'inhalation route', code: '597' },
                    { title: 'Intrapulmonary', code: '596' },
                    { title: 'Respiratory tract', code: '595' },
                    { title: 'Nasal/intranasal', code: '594' },
                    { title: 'Oral route', code: '593' },
                ];

                options.forEach(function (opt) {
                    var o = document.createElement('option');
                    o.value = opt.title;
                    o.textContent = opt.title;
                    o.setAttribute('data-code', opt.code);
                    if ((entry[key] || '').toLowerCase() === opt.title.toLowerCase()) {
                        o.selected = true;
                    }
                    sel.appendChild(o);
                });

                sel.addEventListener('click', function (e) { e.stopPropagation(); });
                sel.addEventListener('change', function () { entry[key] = this.value; });

                wrap.appendChild(lbl);
                wrap.appendChild(sel);
                parent.appendChild(wrap);
            }

            // Fields
            addTextInput(panel, 'Quantity', 'qty', 'number');
            addTextarea(panel, 'Dosage Instructions', 'dosage');
            // Removed Additional Instructions as per requirements
            addRouteSelect(panel, 'Route of administration', 'route');
            addTextInput(panel, 'Repeats', 'repeats', 'number');
            addTextInput(panel, 'Interval Days', 'intervalDays', 'number');
            addTextInput(panel, 'Dispense Quantity', 'dispenseQty', 'number');
            addTextInput(panel, 'Valid Until', 'validUntil', 'date');
            addTextarea(panel, 'Doctor Notes To Pharmacy', 'notesToPharmacy');

            header.addEventListener('click', function () {
                // Only one accordion open at a time
                var wasOpen = !!entry.open;
                selected.forEach(function (e) { e.open = false; });
                entry.open = !wasOpen;
                renderSidebar();
            });

            card.appendChild(header);
            card.appendChild(panel);
            wrap.appendChild(card);
            list.appendChild(wrap);
        });

        if (selected.size > 0) {
            sidebar.classList.remove('hidden');
            fab.classList.remove('hidden');
            fabCount.textContent = String(selected.size);
            if (createBtn) {
                var count = selected.size;
                var label = 'Create ' + count + ' script' + (count === 1 ? '' : 's');
                createBtn.textContent = label;
                createBtn.setAttribute('aria-label', label);
            }
            if (!collapsed) {
                document.documentElement.classList.add('compare-open');
            } else {
                document.documentElement.classList.remove('compare-open');
            }
        } else {
            sidebar.classList.add('hidden');
            fab.classList.add('hidden');
            document.documentElement.classList.remove('compare-open');
            collapsed = false;
            if (createBtn) {
                createBtn.textContent = 'Create Script';
                createBtn.setAttribute('aria-label', 'Create Script');
            }
        }
    }

    function handleChange(ev) {
        var cb = ev.target;
        if (!cb.classList.contains('js-compare')) return;
        var id = cb.getAttribute('data-item-id');
        var name = cb.getAttribute('data-item-name');
        if (cb.checked) {
            var defaults = (window.THCPortalDefaults || {});
            var dosage = cb.getAttribute('data-item-dosage-instructions') || defaults.dosage || '';
            var route = cb.getAttribute('data-item-route') || (defaults.route || '');
            var rawDrugId = cb.getAttribute('data-item-drug-id');
            var drugId = (rawDrugId && /^\d+$/.test(String(rawDrugId))) ? Number(rawDrugId) : rawDrugId;

            function sixMonthsFromToday() {
                var d = new Date();
                d.setMonth(d.getMonth() + (defaults.validUntilMonths || 6));
                var yyyy = d.getFullYear();
                var mm = String(d.getMonth() + 1).padStart(2, '0');
                var dd = String(d.getDate()).padStart(2, '0');
                return yyyy + '-' + mm + '-' + dd;
            }

            var entry = {
                name: name,
                checkbox: cb,
                qty: (defaults.qty != null ? defaults.qty : 1),
                dosage: dosage,
                route: route,
                repeats: (defaults.repeats != null ? defaults.repeats : 3),
                intervalDays: (defaults.intervalDays != null ? defaults.intervalDays : 1),
                dispenseQty: (defaults.dispenseQty != null ? defaults.dispenseQty : 1),
                validUntil: sixMonthsFromToday(),
                drugId: drugId
            };

            // Ensure only one opens if none currently open
            if (selected.size === 0) entry.open = true;
            selected.set(id, entry);
            // Auto-open when first adding
            if (selected.size === 1) collapsed = false;
        } else {
            selected.delete(id);
        }
        renderSidebar();
    }

    document.addEventListener('change', handleChange);

    // Cleanup if dynamic list refreshes
    document.addEventListener('DOMContentLoaded', function () {
        var host = document.querySelector('[data-dynamic-list]');
        if (!host) return;
        var mo = new MutationObserver(function () {
            selected.forEach(function (entry, id) {
                if (!entry.checkbox || !document.body.contains(entry.checkbox)) {
                    selected.delete(id);
                }
            });
            renderSidebar();
        });
        mo.observe(host, { childList: true, subtree: true });
    });

    // Sidebar explicit close button
    var closeBtn = document.getElementById('compareClose');
    closeBtn.addEventListener('click', function () {
        if (selected.size > 0) {
            collapsed = true;
            renderSidebar();
        }
    });

    // FAB expands the sidebar
    fab.addEventListener('click', function () {
        if (selected.size > 0) {
            collapsed = false;
            renderSidebar();
        }
    });

    // Create scripts via GraphQL
    if (createBtn) {
        createBtn.addEventListener('click', async function () {
            if (selected.size === 0) return;
            var defaults = window.THCPortalDefaults || {};
            var endpoint = defaults.apiEndpoint;
            var apiKey = defaults.apiKey;
            if (!endpoint || !apiKey) {
                alert('API endpoint or key not configured.');
                return;
            }
            function toEpochSeconds(val) {
                if (!val) return null;
                if (typeof val === 'number') return Math.floor(val);
                if (typeof val === 'string') {
                    // If the string is numeric, treat as seconds
                    if (/^\d+$/.test(val)) return parseInt(val, 10);
                    // Expecting YYYY-MM-DD from date input; convert to UTC midnight
                    var d = new Date(val + 'T00:00:00Z');
                    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
                }
                return null;
            }
            // Build payload
            var payload = [];
            selected.forEach(function (entry, id) {
                // Prefer the explicit numeric drugId from the DOM, fallback to map key
                var raw = (entry && entry.drugId != null) ? entry.drugId : id;
                // Coerce numeric IDs when possible for GraphQL Int types
                var drugId = (typeof raw === 'string' && /^\d+$/.test(raw)) ? Number(raw) : raw;
                payload.push({
                    dosage_instructions: entry.dosage || '',
                    route_of_administration: entry.route || '',
                    repeats: Number(entry.repeats || 0),
                    interval_days: Number(entry.intervalDays || 0),
                    dispense_quantity: Number(entry.dispenseQty || 0),
                    valid_until: toEpochSeconds(entry.validUntil),
                    doctor_notes_to_pharmacy: entry.notesToPharmacy || '',
                    doctor_id: defaults.doctorId,
                    patient_id: defaults.patientId,
                    drug_id: drugId,
                    script_status: 'Draft',
                    appointment_id: defaults.appointmentId
                });
            });

            var query = `mutation createScripts($payload: [ScriptCreateInput] = null) {\n  createScripts(payload: $payload) {\n    dosage_instructions\n    route_of_administration\n    repeats\n    interval_days\n    dispense_quantity\n    valid_until @dateFormat(value: \"DD-MM-YYYY\")\n    doctor_notes_to_pharmacy\n    doctor_id\n    patient_id\n    drug_id\n    script_status\n   appointment_id\n}\n}`;

            var origText = createBtn.textContent;
            createBtn.disabled = true;
            createBtn.textContent = 'Creating…';

            try {
                var res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': apiKey
                    },
                    body: JSON.stringify({ query: query, variables: { payload: payload } })
                });
                var json = await res.json();
                if (json.errors) {
                    console.error('GraphQL errors', json.errors);
                    alert('Failed to create scripts: ' + (json.errors[0]?.message || 'Unknown error'));
                } else {
                    // Success: clear selection and show result count
                    var created = json.data && json.data.createScripts ? json.data.createScripts.length : 0;
                    alert('Created ' + created + ' script' + (created === 1 ? '' : 's'));
                    // Uncheck all associated checkboxes via existing remove behavior
                    selected.forEach(function (entry) {
                        if (entry.checkbox) {
                            entry.checkbox.checked = false;
                            entry.checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                }
            } catch (e) {
                console.error(e);
                alert('Network or server error while creating scripts.');
            } finally {
                createBtn.disabled = false;
                createBtn.textContent = origText;
            }
        });
    }
})();

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
            case 'extract':   return '🧪';
            case 'edible':    return '🍪';
            case 'flower':    return '🍃';
            case 'oil':       return '💧';
            case 'vape':      return '💨';
            default:          return '🍃';
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

// Table: row delete and bulk cancel via GraphQL
(function () {
    function getApiConfig() {
        var defaults = window.THCPortalDefaults || {};
        return {
            endpoint: defaults.apiEndpoint,
            apiKey: defaults.apiKey
        };
    }

    function extractScriptId(raw) {
        if (raw == null) return raw;
        // If numeric string, coerce to number; else keep as-is
        if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw);
        return raw;
    }

    async function cancelOne(id) {
        var scriptId = extractScriptId(id);
        var cfg = getApiConfig();
        if (!cfg.endpoint || !cfg.apiKey) {
            alert('API endpoint or key not configured.');
            return { ok: false, id: scriptId, error: 'Missing config' };
        }
        try { console.debug('Cancelling script ID', scriptId); } catch (_) { }
        var query = `mutation updateScripts(\n  $id: ThcScriptID\n  $payload: ScriptUpdateInput = null\n) {\n  updateScripts(\n    query: [{ where: { id: $id } }]\n    payload: $payload\n  ) {\n    script_status\n  }\n}`;
        var variables = { id: scriptId, payload: { script_status: 'Cancelled' } };
        try {
            var res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': cfg.apiKey
                },
                body: JSON.stringify({ query: query, variables: variables })
            });
            var json = await res.json();
            if (json.errors) {
                console.error('GraphQL error:', json.errors);
                return { ok: false, id: scriptId, error: json.errors[0]?.message || 'GraphQL error' };
            }
            if (!json.data || !json.data.updateScripts) {
                console.warn('updateScripts returned null for id', scriptId);
                return { ok: false, id: scriptId, error: 'No matching script for ID' };
            }
            return { ok: true, id: scriptId };
        } catch (e) {
            console.error('Network error:', e);
            return { ok: false, id: scriptId, error: String(e) };
        }
    }

    // Bulk cancel helper exposed for tableUi.js
    window.vsCancelScripts = async function (ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        // Map DataGrid ids to actual script IDs if necessary using vsRowMap
        var scriptIds = ids.map(function (gridId) {
            var row = (window.vsRowMap && window.vsRowMap[gridId]) || null;
            var raw = row ? (row.ID ?? row.id ?? row.Id) : gridId;
            return extractScriptId(raw);
        });
        var results = await Promise.all(scriptIds.map(cancelOne));
        var okCount = results.filter(r => r.ok).length;
        var fail = results.find(r => !r.ok);
        if (okCount > 0) {
            alert('Cancelled ' + okCount + ' script' + (okCount === 1 ? '' : 's'));
        }
        if (fail) {
            alert('Some updates failed: ' + (fail.error || 'Unknown error'));
        }
    };

    // Called by tableUi row action
    window.vsDeleteRow = async function (detail) {
        try {
            var status = (detail && detail.row) ? (detail.row.script_status ?? detail.row.Script_Status ?? detail.row.status ?? detail.row.Status) : undefined;
            if (String(status) !== 'Draft') {
                return; // do nothing if not Draft
            }
            var ok = confirm('Are you sure you want to delete this script?');
            if (!ok) return;
            await window.vsCancelScripts([detail.id]);
        } catch (e) {
            console.error(e);
        }
    };

    // Duplicate selected scripts via createScripts mutation
    window.vsDuplicateScripts = async function (ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        var defaults = window.THCPortalDefaults || {};
        var endpoint = defaults.apiEndpoint;
        var apiKey = defaults.apiKey;
        if (!endpoint || !apiKey) { alert('API endpoint or key not configured.'); return; }

        function toEpochSeconds(val) {
            if (!val) return null;
            if (typeof val === 'number') return Math.floor(val);
            if (typeof val === 'string') {
                if (/^\d+$/.test(val)) return parseInt(val, 10);
                var d = new Date(val + 'T00:00:00Z');
                if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
            }
            return null;
        }

        function sixMonthsFromToday(months) {
            var d = new Date();
            d.setMonth(d.getMonth() + (months || defaults.validUntilMonths || 6));
            var yyyy = d.getFullYear();
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            return yyyy + '-' + mm + '-' + dd;
        }

        // Build payload from selected rows (copy same values where present)
        var payload = [];
        var missingDrug = [];
        var usedDefaultsCount = 0;
        ids.forEach(function (gridId) {
            var row = (window.vsRowMap && window.vsRowMap[gridId]) || {};

            // Copy fields from row with fallbacks to defaults
            var dosage = row.dosage_instructions || row.Dosage_Instructions || defaults.dosage || '';
            var condition = row.condition || row.Condition || defaults.condition || '';
            var route = row.route_of_administration || row.Route_of_administration || defaults.route || '';
            var repeats = (row.repeats != null ? row.repeats : (row.Repeats != null ? row.Repeats : defaults.repeats));
            repeats = Number(repeats != null ? repeats : 0);
            var remaining = (row.remaining != null ? row.remaining : (row.Remaining != null ? row.Remaining : defaults.remaining));
            remaining = Number(remaining != null ? remaining : 0);
            var intervalDays = (row.interval_days != null ? row.interval_days : (row.Interval_Days != null ? row.Interval_Days : defaults.intervalDays));
            intervalDays = Number(intervalDays != null ? intervalDays : 0);
            var dispenseQty = (row.dispense_quantity != null ? row.dispense_quantity : (row.Dispense_Quantity != null ? row.Dispense_Quantity : defaults.dispenseQty));
            dispenseQty = Number(dispenseQty != null ? dispenseQty : 0);
            var eScriptLink = row.e_script_link || row.E_Script_Link || defaults.eScriptLink || null;
            var validUntilStr = row.valid_until || row.Valid_Until || sixMonthsFromToday();
            var validUntil = toEpochSeconds(validUntilStr);
            var notes = row.doctor_notes_to_pharmacy || row.Doctor_Notes_To_Pharmacy || defaults.notesToPharmacy || '';

            // Required: drug_id
            var rawDrug = row.drug_id || row.Drug_ID || defaults.drugId;
            if (rawDrug == null || rawDrug === '') { missingDrug.push(gridId); return; }
            var drugId = (typeof rawDrug === 'string' && /^\d+$/.test(rawDrug)) ? Number(rawDrug) : rawDrug;

            // Count defaults used for informational alert
            if (!row.condition && !row.Condition && defaults.condition != null) usedDefaultsCount++;
            if (!row.route_of_administration && !row.Route_of_administration && defaults.route != null) usedDefaultsCount++;
            if ((row.repeats == null && row.Repeats == null) && defaults.repeats != null) usedDefaultsCount++;
            if ((row.remaining == null && row.Remaining == null) && defaults.remaining != null) usedDefaultsCount++;
            if ((row.interval_days == null && row.Interval_Days == null) && defaults.intervalDays != null) usedDefaultsCount++;
            if ((row.dispense_quantity == null && row.Dispense_Quantity == null) && defaults.dispenseQty != null) usedDefaultsCount++;
            if (!row.e_script_link && !row.E_Script_Link && defaults.eScriptLink != null) usedDefaultsCount++;

            payload.push({
                // Explicit fields to duplicate
                script_status: 'Draft',
                condition: condition,
                route_of_administration: route,
                repeats: repeats,
                remaining: remaining,
                interval_days: intervalDays,
                e_script_link: eScriptLink,
                drug_id: drugId,

                // Other fields we already support
                dosage_instructions: dosage,
                dispense_quantity: dispenseQty,
                valid_until: validUntil,
                doctor_notes_to_pharmacy: notes,
                doctor_id: defaults.doctorId,
                patient_id: defaults.patientId,
                appointment_id: defaults.appointmentId
            });
        });

        if (missingDrug.length && payload.length === 0) {
            alert('Unable to duplicate: missing drug_id and no default provided.');
            return;
        }

        var query = `mutation createScripts($payload: [ScriptCreateInput] = null) {\n  createScripts(payload: $payload) {\n    id\n    script_status\n    condition\n    route_of_administration\n    repeats\n    remaining\n    interval_days\n    e_script_link\n    drug_id\n  }\n}`;

        try {
            var res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey },
                body: JSON.stringify({ query: query, variables: { payload: payload } })
            });
            var json = await res.json();
            if (json.errors) {
                console.error('GraphQL errors', json.errors);
                alert('Failed to duplicate scripts: ' + (json.errors[0]?.message || 'Unknown error'));
                return;
            }
            var created = json.data && json.data.createScripts ? json.data.createScripts.length : 0;
            var msgs = [];
            msgs.push(created + ' script' + (created === 1 ? '' : 's') + ' duplicated as Draft');
            if (missingDrug.length) msgs.push('Skipped ' + missingDrug.length + ' due to missing drug_id');
            if (usedDefaultsCount > 0) msgs.push('Applied defaults for some missing fields');
            alert(msgs.join('. '));
        } catch (e) {
            console.error(e);
            alert('Network or server error while duplicating scripts.');
        }
    };
})();

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

    function toIdMaybeNum(v) {
        if (v == null) return v;
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
        return v;
    }

    async function fetchFavorites() {
        var cfg = getCfg();
        // If config missing, mark loaded and leave map empty (no server sync)
        if (!cfg.endpoint || !cfg.apiKey || !cfg.doctorId) {
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
            var docIdStr = String(cfg.doctorId);
            var map = new Map();
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i] || {};
                // Only keep records for this logged-in doctor
                if (String(r.Patient_Interested_ID) !== docIdStr) continue;
                var itemId = String(r.Patient_Interested_Item_ID);
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
        var query = "mutation createOPatientInterestedPatientInterestedItem($payload: OPatientInterestedPatientInterestedItemCreateInput = null) {\n  createOPatientInterestedPatientInterestedItem(payload: $payload) {\n    patient_interested_id\n    patient_interested_item_id\n  }\n}";
        var variables = {
            payload: {
                // For creation only, prefer loggednInUserId if present; otherwise doctorId
                patient_interested_id: toIdMaybeNum((cfg.loggednInUserId != null && cfg.loggednInUserId !== '') ? cfg.loggednInUserId : cfg.doctorId),
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
            var id = b.getAttribute('data-item-id');
            var has = favState.map.has(String(id));
            b.classList.toggle('active', !!has);
            b.setAttribute('aria-pressed', has ? 'true' : 'false');
        }
    }

    async function toggleFavorite(btn) {
        var cfg = getCfg();
        var itemId = btn.getAttribute('data-item-id');
        if (!itemId) return;
        // Guard against misconfiguration: fall back to local toggle if no API
        if (!cfg.endpoint || !cfg.apiKey || !cfg.doctorId) {
            // Local fallback (no persistence server-side)
            var on = !btn.classList.contains('active');
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            return;
        }
        var key = String(itemId);
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
