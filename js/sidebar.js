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

    function normalizeKeyName(key) {
        return String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    }

    function findRowKey(row, target) {
        if (!row) return null;
        var targetNorm = normalizeKeyName(target);
        for (var key in row) {
            if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
            if (normalizeKeyName(key) === targetNorm) return key;
        }
        return null;
    }

    function pickRowValue(row, candidates) {
        if (!row) return { key: null, value: undefined };
        for (var i = 0; i < candidates.length; i++) {
            var actualKey = findRowKey(row, candidates[i]);
            if (actualKey && row[actualKey] != null) {
                return { key: actualKey, value: row[actualKey] };
            }
        }
        return { key: null, value: undefined };
    }

    function withScriptVariants(candidates) {
        var seen = Object.create(null);
        var result = [];
        function push(val) {
            var normalized = normalizeKeyName(val);
            if (!normalized) return;
            if (seen[normalized]) return;
            seen[normalized] = true;
            result.push(val);
        }
        candidates.forEach(function (raw) {
            if (!raw) return;
            var base = String(raw).trim();
            if (!base) return;
            push(base);
            if (!/^script[\s_]?/i.test(base)) {
                push('script_' + base);
                push('script' + base);
                if (/^[a-z]/i.test(base)) {
                    push('script' + base.charAt(0).toUpperCase() + base.slice(1));
                }
            }
        });
        return result;
    }

    function pad2(num) {
        return String(num).padStart(2, '0');
    }

    function formatDateForInput(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '';
        return date.getUTCFullYear() + '-' + pad2(date.getUTCMonth() + 1) + '-' + pad2(date.getUTCDate());
    }

    function toDateInputValue(value) {
        if (value == null || value === '') return '';
        if (value instanceof Date) return formatDateForInput(value);
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) return '';
            var numeric = value;
            if (numeric > 1e12) {
                return formatDateForInput(new Date(numeric));
            }
            return formatDateForInput(new Date(numeric * 1000));
        }
        var str = String(value).trim();
        if (!str) return '';
        if (/^\d+$/.test(str)) {
            var intVal = parseInt(str, 10);
            if (!isNaN(intVal)) {
                if (str.length > 10) return formatDateForInput(new Date(intVal));
                return formatDateForInput(new Date(intVal * 1000));
            }
            return '';
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }
        if (/^(\d{2})-(\d{2})-(\d{4})$/.test(str) || /^(\d{2})\/(\d{2})\/(\d{4})$/.test(str)) {
            var parts = str.split(/[-\/]/);
            if (parts.length === 3) {
                return parts[2] + '-' + pad2(parts[1]) + '-' + pad2(parts[0]);
            }
        }
        var parsed = new Date(str);
        if (!isNaN(parsed.getTime())) return formatDateForInput(parsed);
        return '';
    }

    function toNullableNumber(value) {
        if (value === '' || value == null) return null;
        var num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    function safeString(value) {
        if (value == null) return '';
        return String(value).trim();
    }

    function normalizeQuantityFieldName(key) {
        if (!key) return '';
        var normalized = normalizeKeyName(key);
        if (normalized === 'qty' || normalized === 'scriptqty') return 'qty';
        if (normalized === 'quantity' || normalized === 'scriptquantity') return 'quantity';
        return '';
    }

    function toEpochSecondsValue(val) {
        if (val == null || val === '') return null;
        if (typeof val === 'number') {
            if (!Number.isFinite(val)) return null;
            if (val > 1e12) return Math.floor(val / 1000);
            return Math.floor(val);
        }
        var str = String(val).trim();
        if (!str) return null;
        if (/^\d+$/.test(str)) {
            var intVal = parseInt(str, 10);
            if (!isNaN(intVal)) {
                if (str.length > 10) return Math.floor(intVal / 1000);
                return Math.floor(intVal);
            }
            return null;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            var direct = new Date(str + 'T00:00:00Z');
            return isNaN(direct.getTime()) ? null : Math.floor(direct.getTime() / 1000);
        }
        if (/^(\d{2})-(\d{2})-(\d{4})$/.test(str) || /^(\d{2})\/(\d{2})\/(\d{4})$/.test(str)) {
            var parts = str.split(/[-\/]/);
            if (parts.length === 3) {
                var dmyDate = new Date(parts[2] + '-' + parts[1] + '-' + parts[0] + 'T00:00:00Z');
                return isNaN(dmyDate.getTime()) ? null : Math.floor(dmyDate.getTime() / 1000);
            }
        }
        var parsed = new Date(str);
        if (!isNaN(parsed.getTime())) return Math.floor(parsed.getTime() / 1000);
        return null;
    }

    function buildUpdatePayload(entry) {
        if (!entry) return {};
        var payload = {};
        payload.dosage_instructions = safeString(entry.dosage);
        payload.route_of_administration = safeString(entry.route);
        var repeatsNum = toNullableNumber(entry.repeats);
        payload.repeats = repeatsNum === null ? null : repeatsNum;
        var intervalNum = toNullableNumber(entry.intervalDays);
        payload.interval_days = intervalNum === null ? null : intervalNum;
        var dispenseNum = toNullableNumber(entry.dispenseQty);
        payload.dispense_quantity = dispenseNum === null ? null : dispenseNum;
        var qtyNum = toNullableNumber(entry.qty);
        if (entry.quantityFieldName) {
            payload[entry.quantityFieldName] = qtyNum === null ? null : qtyNum;
        }
        if (Object.prototype.hasOwnProperty.call(entry, 'validUntil')) {
            var initial = Object.prototype.hasOwnProperty.call(entry, 'initialValidUntil') ? entry.initialValidUntil : undefined;
            var current = entry.validUntil;
            if (initial !== current) {
                if (current === '' || current == null) {
                    payload.valid_until = null;
                } else {
                    var validUntil = toEpochSecondsValue(current);
                    if (validUntil != null) {
                        payload.valid_until = validUntil;
                    }
                }
            }
        }
        payload.doctor_notes_to_pharmacy = entry.notesToPharmacy != null ? String(entry.notesToPharmacy) : '';
        return payload;
    }

    function renderSidebar() {
        if (!list) return;
        var hasEditMode = false;
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
            if (entry && entry.editing) hasEditMode = true;
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
            var safeName = (entry && typeof entry.name === 'string') ? entry.name.trim() : '';
            var displayName = safeName || (entry && entry.custom ? 'New Item' : id);
            name.textContent = displayName;

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

            function addTextInput(parent, labelText, key, type, opts) {
                opts = opts || {};
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
                inp.addEventListener('input', function () {
                    var rawVal = this.value;
                    if (type === 'number') {
                        entry[key] = rawVal === '' ? '' : this.valueAsNumber;
                    } else {
                        entry[key] = rawVal;
                    }
                    if (typeof opts.onInput === 'function') {
                        opts.onInput(rawVal, this);
                    }
                });
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
            if (entry.custom) {
                addTextInput(panel, 'Item Name', 'name', 'text', {
                    onInput: function (value) {
                        var trimmed = String(value || '').trim();
                        name.textContent = trimmed || 'New Item';
                    }
                });
                addTextInput(panel, 'Catalyst Link', 'newItemLink', 'text');
            }
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
                if (hasEditMode) {
                    createBtn.textContent = 'Edit Script';
                    createBtn.setAttribute('aria-label', 'Edit Script');
                } else {
                    var count = selected.size;
                    var label = 'Create ' + count + ' script' + (count === 1 ? '' : 's');
                    createBtn.textContent = label;
                    createBtn.setAttribute('aria-label', label);
                }
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
        var editIds = [];
        selected.forEach(function (entry, key) {
            if (entry && entry.editing) editIds.push(key);
        });
        if (editIds.length) {
            for (var i = 0; i < editIds.length; i++) {
                selected.delete(editIds[i]);
            }
        }
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
            var focusLength = entry.name ? String(entry.name).length : 0;
            pendingFocus = { id: syntheticId, field: 'name', start: 0, end: focusLength };
            renderSidebar();
        } catch (e) {
            console.error('Failed to add custom script entry', e);
        }
    };

    window.vsOpenScriptEditor = function (opts) {
        try {
            opts = opts || {};
            var scriptId = opts.scriptId;
            if (!scriptId) {
                alert('Missing script id for editing.');
                return;
            }
            var row = opts.row || {};
            selected.clear();
            var entryId = 'edit:' + scriptId;

            var namePick = pickRowValue(row, withScriptVariants(['drug_item_name', 'drug item name', 'drug_name', 'item_name', 'item_item_name', 'product_name', 'script_name', 'item']));
            var brandPick = pickRowValue(row, withScriptVariants(['item_brand', 'brand', 'drug_brand']));
            var entryName = safeString(namePick.value);
            if (!entryName) {
                var brandName = safeString(brandPick.value);
                var itemName = safeString(pickRowValue(row, withScriptVariants(['item_item_name', 'item_name', 'product_name', 'drug_name', 'item'])).value);
                if (brandName && itemName && brandName.toLowerCase() !== itemName.toLowerCase()) {
                    entryName = brandName + ' | ' + itemName;
                } else if (brandName) {
                    entryName = brandName;
                } else if (itemName) {
                    entryName = itemName;
                }
            }
            if (!entryName) entryName = 'Script ' + scriptId;

            var qtyPick = pickRowValue(row, withScriptVariants(['qty', 'quantity']));
            var qtyNum = toNullableNumber(qtyPick.value);
            var entryQty = qtyNum !== null ? qtyNum : '1';

            var repeatsPick = pickRowValue(row, withScriptVariants(['repeats', 'repeat_count']));
            var repeatsNum = toNullableNumber(repeatsPick.value);

            var intervalPick = pickRowValue(row, withScriptVariants(['interval_days', 'interval', 'interval_day']));
            var intervalNum = toNullableNumber(intervalPick.value);

            var dispensePick = pickRowValue(row, withScriptVariants(['dispense_quantity', 'dispensed_quantity', 'quantity_dispensed', 'dispense_qty']));
            var dispenseNum = toNullableNumber(dispensePick.value);

            var validPick = pickRowValue(row, withScriptVariants(['valid_until', 'validuntil', 'expiry_date']));
            var notesPick = pickRowValue(row, withScriptVariants(['doctor_notes_to_pharmacy', 'notes_to_pharmacy', 'pharmacy_notes']));
            var dosagePick = pickRowValue(row, withScriptVariants(['dosage_instructions', 'dosageinstructions', 'dosage']));
            var routePick = pickRowValue(row, withScriptVariants(['route_of_administration', 'route', 'administration_route']));

            var entry = {
                editing: true,
                scriptId: scriptId,
                ctx: opts.ctx || null,
                name: entryName,
                checkbox: null,
                qty: entryQty,
                quantityFieldName: normalizeQuantityFieldName(qtyPick.key),
                dosage: safeString(dosagePick.value),
                route: safeString(routePick.value),
                repeats: repeatsNum !== null ? repeatsNum : '',
                intervalDays: intervalNum !== null ? intervalNum : '',
                dispenseQty: dispenseNum !== null ? dispenseNum : '',
                validUntil: toDateInputValue(validPick.value),
                notesToPharmacy: notesPick.value != null ? String(notesPick.value) : '',
                drugId: row.drug_id ?? row.Drug_ID ?? row.drugId ?? null,
                open: true
            };
            entry.initialValidUntil = entry.validUntil;

            selected.set(entryId, entry);
            collapsed = false;
            pendingFocus = { id: entryId, field: 'dosage', start: null, end: null };
            renderSidebar();
        } catch (e) {
            console.error('Failed to open script editor', e);
            alert('Unable to open editor for this script.');
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
            var origText = createBtn.textContent;

            var editingEntries = entriesList.filter(function (item) {
                return item.entry && item.entry.editing;
            });
            if (editingEntries.length > 0) {
                if (entriesList.length !== editingEntries.length) {
                    alert('Remove other items before editing a script.');
                    return;
                }
                if (editingEntries.length !== 1) {
                    alert('Select a single script to edit.');
                    return;
                }
                var editEntry = editingEntries[0].entry || {};
                if (!editEntry.scriptId) {
                    alert('Missing script id for update.');
                    return;
                }
                if (typeof window.vsPerformScriptUpdate !== 'function') {
                    alert('Update handler is not available.');
                    return;
                }
                var payload;
                try {
                    payload = buildUpdatePayload(editEntry);
                } catch (err) {
                    console.error(err);
                    alert('Unable to prepare script update.');
                    return;
                }
                createBtn.disabled = true;
                createBtn.textContent = 'Saving…';
                try {
                    await window.vsPerformScriptUpdate({ scriptId: editEntry.scriptId, payload: payload });
                    alert('Script updated successfully.');
                    selected.clear();
                    renderSidebar();
                    if (editEntry.ctx) {
                        try {
                            if (typeof editEntry.ctx.reload === 'function') {
                                editEntry.ctx.reload();
                            } else if (typeof editEntry.ctx.refresh === 'function') {
                                editEntry.ctx.refresh();
                            }
                        } catch (_) { }
                    }
                } catch (err) {
                    console.error(err);
                    alert('Failed to update script: ' + (err && err.message ? err.message : 'Unknown error'));
                } finally {
                    createBtn.disabled = false;
                    if (selected.size > 0) {
                        createBtn.textContent = origText;
                    } else {
                        createBtn.textContent = 'Create Script';
                    }
                }
                return;
            }
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
                        valid_until: toEpochSecondsValue(entry.validUntil),
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
                if (selected.size > 0) {
                    createBtn.textContent = origText;
                } else {
                    createBtn.textContent = 'Create Script';
                }
            }
        });
    }
})();
