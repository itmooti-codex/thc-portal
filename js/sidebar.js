// Compare sidebar logic
(function () {
    var selected = new Map();
    var sidebar = document.getElementById('compareSidebar');
    var list = document.getElementById('compareList');
    var fab = document.getElementById('compareFab');
    var fabCount = document.getElementById('compareCountFab');
    var createBtn = document.getElementById('compareCreate');
    var collapsed = false;

    var pendingFocus = null;

    function renderSidebar() {
        if (!list) return;
        var focusState = null;
        var activeEl = document.activeElement;
        if (activeEl && list.contains(activeEl) && activeEl.dataset && activeEl.dataset.entryId) {
            focusState = {
                id: activeEl.dataset.entryId,
                field: activeEl.dataset.entryField || '',
                start: (typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null,
                end: (typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null
            };
        }
        if (!focusState && pendingFocus && selected.has(pendingFocus.id)) {
            focusState = pendingFocus;
        }
        pendingFocus = null;

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
                var handledByCheckbox = false;
                if (entry.checkbox) {
                    entry.checkbox.checked = false;
                    if (entry.checkbox.isConnected) {
                        entry.checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        handledByCheckbox = true;
                    }
                }
                if (!handledByCheckbox) {
                    selected.delete(id);
                    renderSidebar();
                } else {
                    setTimeout(function () {
                        if (selected.has(id)) {
                            selected.delete(id);
                            renderSidebar();
                        }
                    }, 0);
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
                inp.dataset.entryId = id;
                inp.dataset.entryField = key;
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
                ta.dataset.entryId = id;
                ta.dataset.entryField = key;
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
                sel.dataset.entryId = id;
                sel.dataset.entryField = key;

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
            // Only for custom (not-found) entries, include Item Link
            if (entry.custom) {
                addTextInput(panel, 'Catalyst Link', 'newItemLink', 'text');
            }
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

        if (focusState && !selected.has(focusState.id)) {
            focusState = null;
        }

        if (focusState) {
            var escapeAttr = function (value) {
                return String(value).replace(/["\\]/g, '\\$&');
            };
            requestAnimationFrame(function () {
                var selector = '[data-entry-id="' + escapeAttr(focusState.id) + '"][data-entry-field="' + escapeAttr(focusState.field) + '"]';
                var target = list.querySelector(selector);
                if (target) {
                    target.focus();
                    if (focusState.start != null && typeof target.setSelectionRange === 'function') {
                        try { target.setSelectionRange(focusState.start, focusState.end != null ? focusState.end : focusState.start); } catch (_) { }
                    }
                }
            });
        }

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
            pendingFocus = { id: id, field: 'dosage', start: null, end: null };
            // Auto-open when first adding
            if (selected.size === 1) collapsed = false;
        } else {
            selected.delete(id);
        }
        renderSidebar();
    }

    document.addEventListener('change', handleChange);

    // Allow adding a custom script entry when user searches and finds no match
    window.vsAddCustomScriptEntry = function (opts) {
        try {
            var defaults = (window.THCPortalDefaults || {});
            var name = (opts && opts.name) ? String(opts.name) : '';
            var entry = {
                custom: true,
                name: name || 'New Item',
                checkbox: null,
                // Leave dosage and route blank for user to fill
                dosage: '',
                route: '',
                // Same defaults as normal
                qty: (defaults.qty != null ? defaults.qty : 1),
                repeats: (defaults.repeats != null ? defaults.repeats : 3),
                intervalDays: (defaults.intervalDays != null ? defaults.intervalDays : 1),
                dispenseQty: (defaults.dispenseQty != null ? defaults.dispenseQty : 1),
                validUntil: (function sixMonthsFromToday() {
                    var d = new Date();
                    d.setMonth(d.getMonth() + (defaults.validUntilMonths || 6));
                    var yyyy = d.getFullYear();
                    var mm = String(d.getMonth() + 1).padStart(2, '0');
                    var dd = String(d.getDate()).padStart(2, '0');
                    return yyyy + '-' + mm + '-' + dd;
                })(),
                // New optional field for custom entries only
                newItemLink: ''
            };
            // Use a synthetic id to avoid collision with real ids
            var syntheticId = 'custom:' + Date.now();
            entry.open = true; // open accordion by default for quick editing
            selected.set(syntheticId, entry);
            collapsed = false; // ensure sidebar is expanded
            pendingFocus = { id: syntheticId, field: 'dosage', start: null, end: null };
            renderSidebar();
        } catch (e) {
            console.error('Failed to add custom script entry', e);
        }
    };

    // Cleanup if dynamic list refreshes
    document.addEventListener('DOMContentLoaded', function () {
        var host = document.querySelector('[data-dynamic-list]');
        if (!host) return;
        var mo = new MutationObserver(function () {
            var changed = false;
            selected.forEach(function (entry, id) {
                // Do not auto-remove custom entries (added via Add New Product)
                if (entry && entry.custom) return;
                // Only prune entries that were tied to a checkbox and that checkbox left the DOM
                if (entry && entry.checkbox && !document.body.contains(entry.checkbox)) {
                    selected.delete(id);
                    changed = true;
                }
            });
            if (changed) renderSidebar();
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
            var entriesList = [];
            selected.forEach(function (entry, id) {
                entriesList.push({ entry: entry, id: id });
            });
            if (entriesList.length === 0) return;
            var searchInput = document.querySelector('input[placeholder="Search products"]');
            var customEntries = entriesList.filter(function (item) { return item.entry && item.entry.custom; });
            var itemMutation = `mutation createItem($payload: ItemCreateInput = null) {
  createItem(payload: $payload) {
    id
    item_name
    status
    link_to_catalyst_listing
  }
}`;

            async function ensureCustomItems() {
                if (!customEntries.length) return;
                for (var idx = 0; idx < customEntries.length; idx++) {
                    var item = customEntries[idx];
                    var entry = item && item.entry;
                    if (!entry || entry.createdItemId) continue;
                    var rawName = (entry.name || (searchInput && searchInput.value) || '').trim();
                    var itemName = rawName || 'New Item';
                    var catalystLink = (entry.newItemLink || '').trim();
                    var variables = {
                        payload: {
                            item_name: itemName,
                            status: 'Not Available',
                            link_to_catalyst_listing: catalystLink || null
                        }
                    };
                    var itemResponse;
                    try {
                        itemResponse = await fetch(endpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Api-Key': apiKey
                            },
                            body: JSON.stringify({ query: itemMutation, variables: variables })
                        });
                    } catch (err) {
                        var networkErr = new Error('Failed to create item: network error.');
                        networkErr.isItemCreationError = true;
                        throw networkErr;
                    }
                    var itemJson;
                    try {
                        itemJson = await itemResponse.json();
                    } catch (_) {
                        var parseErr = new Error('Failed to create item: invalid server response.');
                        parseErr.isItemCreationError = true;
                        throw parseErr;
                    }
                    if (itemJson.errors) {
                        console.error('Item creation errors', itemJson.errors);
                        var msg = (itemJson.errors[0] && itemJson.errors[0].message) ? itemJson.errors[0].message : 'Unknown error';
                        var errObj = new Error('Failed to create item: ' + msg);
                        errObj.isItemCreationError = true;
                        throw errObj;
                    }
                    var created = itemJson.data && itemJson.data.createItem;
                    var newId = created && (created.id !== undefined ? created.id : null);
                    if (newId == null) {
                        var missingIdErr = new Error('Failed to create item: missing id in response.');
                        missingIdErr.isItemCreationError = true;
                        throw missingIdErr;
                    }
                    entry.createdItemId = newId;
                    entry.drugId = newId;
                }
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

            var query = `mutation createScripts($payload: [ScriptCreateInput] = null) {
  createScripts(payload: $payload) {
    dosage_instructions
    route_of_administration
    repeats
    interval_days
    dispense_quantity
    valid_until @dateFormat(value: "DD-MM-YYYY")
    doctor_notes_to_pharmacy
    doctor_id
    patient_id
    drug_id
    script_status
    appointment_id
  }
}`;

            var origText = createBtn.textContent;
            createBtn.disabled = true;
            createBtn.textContent = 'Creating…';

            try {
                await ensureCustomItems();

                // Build payload
                var payload = [];
                var hadCustom = false;
                entriesList.forEach(function (item) {
                    var entry = item.entry;
                    var id = item.id;
                    // Prefer the explicit numeric drugId from the DOM, fallback to map key
                    var raw = (entry && entry.drugId != null) ? entry.drugId : id;
                    // Build common fields
                    var obj = {
                        dosage_instructions: entry.dosage || '',
                        route_of_administration: entry.route || '',
                        repeats: Number(entry.repeats || 0),
                        interval_days: Number(entry.intervalDays || 0),
                        dispense_quantity: Number(entry.dispenseQty || 0),
                        valid_until: toEpochSeconds(entry.validUntil),
                        doctor_notes_to_pharmacy: entry.notesToPharmacy || '',
                        doctor_id: defaults.doctorId,
                        patient_id: defaults.patientId,
                        script_status: 'Draft',
                        appointment_id: defaults.appointmentId
                    };
                    if (entry && entry.custom) {
                        hadCustom = true;
                        var createdId = entry.createdItemId != null ? entry.createdItemId : raw;
                        if (createdId != null) {
                            var coerced = (typeof createdId === 'string' && /^\d+$/.test(createdId)) ? Number(createdId) : createdId;
                            obj.drug_id = coerced;
                        }
                        if (entry.newItemLink) obj.new_item_link = entry.newItemLink;
                    } else {
                        // Coerce numeric IDs when possible for GraphQL Int types
                        var drugId = (typeof raw === 'string' && /^\d+$/.test(raw)) ? Number(raw) : raw;
                        obj.drug_id = drugId;
                    }
                    payload.push(obj);
                });

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
                    var errMsg = (json.errors[0] && json.errors[0].message) ? json.errors[0].message : 'Unknown error';
                    var scriptErr = new Error('Failed to create scripts: ' + errMsg);
                    scriptErr.isScriptCreationError = true;
                    throw scriptErr;
                }

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
                // Remove custom entries we added from 'Add New Product'
                var toDelete = [];
                selected.forEach(function (entry, id) { if (entry && entry.custom) toDelete.push(id); });
                toDelete.forEach(function (id) { selected.delete(id); });
                renderSidebar();

                // If this was a custom (not-found) add, reset filters and search to show products again
                if (hadCustom) {
                    try {
                        var resetBtn = document.getElementById('reset-button');
                        if (resetBtn && typeof resetBtn.click === 'function') {
                            resetBtn.click();
                        } else if (typeof window.resetFilters === 'function') {
                            window.resetFilters();
                            // Best-effort: also clear search input
                            var inp = document.querySelector('input[placeholder="Search products"]');
                            if (inp) inp.value = '';
                        }
                    } catch (_) { }
                }
            } catch (e) {
                console.error(e);
                if (e && e.isItemCreationError) {
                    alert(e.message || 'Failed to create item for script.');
                } else if (e && e.isScriptCreationError) {
                    alert(e.message || 'Failed to create scripts.');
                } else {
                    alert('Network or server error while creating scripts.');
                }
            } finally {
                createBtn.disabled = false;
                createBtn.textContent = origText;
            }
        });
    }
})();
