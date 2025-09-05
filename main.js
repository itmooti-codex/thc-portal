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

// Heart/save button logic with localStorage persistence
(function () {
    var KEY = 'hearted_items_v1';
    function loadSet() {
        try { var arr = JSON.parse(localStorage.getItem(KEY) || '[]'); return new Set(arr); } catch { return new Set(); }
    }
    function saveSet(set) {
        localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
    }
    var loved = loadSet();

    function applyHearts() {
        var nodes = document.querySelectorAll('.js-heart');
        for (var i = 0; i < nodes.length; i++) {
            var b = nodes[i];
            var id = b.getAttribute('data-item-id');
            var on = loved.has(id);
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.js-heart');
        if (!btn) return;
        var id = btn.getAttribute('data-item-id');
        if (loved.has(id)) loved.delete(id); else loved.add(id);
        saveSet(loved);
        applyHearts();
    });

    document.addEventListener('DOMContentLoaded', function () {
        applyHearts();
        var host = document.querySelector('[data-dynamic-list]');
        if (!host) return;
        var mo = new MutationObserver(function () { applyHearts(); });
        mo.observe(host, { childList: true, subtree: true });
    });
})();