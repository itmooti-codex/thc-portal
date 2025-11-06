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
        var str = (typeof raw === 'string') ? raw : String(raw);
        return str.trim();
    }

    function isArchivedValue(raw) {
        if (raw == null) return false;
        if (typeof raw === 'string') {
            return raw.toLowerCase() === 'true';
        }
        return Boolean(raw);
    }

    async function cancelOne(id) {
        var scriptId = extractScriptId(id);
        var cfg = getApiConfig();
        if (!cfg.endpoint || !cfg.apiKey) {
            alert('API endpoint or key not configured.');
            return { ok: false, id: scriptId, error: 'Missing config' };
        }
        try { console.debug('Cancelling script ID', scriptId); } catch (_) { }
        if (scriptId == null || scriptId === '') {
            return { ok: false, id: scriptId, error: 'Missing script ID' };
        }
        var query = `mutation updateScripts(
  $id: ThcScriptID
  $payload: ScriptUpdateInput = null
) {
  updateScripts(
    query: [{ where: { id: $id } }]
    payload: $payload
  ) {
    script_status
  }
}`;
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
            var updated = json.data && json.data.updateScripts;
            if (!updated || (Array.isArray(updated) && updated.length === 0)) {
                console.warn('updateScripts returned null for id', scriptId);
                return { ok: false, id: scriptId, error: 'No matching script for ID' };
            }
            return { ok: true, id: scriptId };
        } catch (e) {
            console.error('Network error:', e);
            return { ok: false, id: scriptId, error: String(e) };
        }
    }

    async function archiveOne(id) {
        var scriptId = extractScriptId(id);
        var cfg = getApiConfig();
        if (!cfg.endpoint || !cfg.apiKey) {
            alert('API endpoint or key not configured.');
            return { ok: false, id: scriptId, error: 'Missing config' };
        }
        if (scriptId == null || scriptId === '') {
            return { ok: false, id: scriptId, error: 'Missing script ID' };
        }
        var query = "mutation archiveScripts(\n  $id: ThcScriptID\n  $payload: ScriptUpdateInput = null\n) {\n  updateScripts(\n    query: [{ where: { id: $id } }]\n    payload: $payload\n  ) {\n    doctor_archive_action\n  }\n}";
        var variables = { id: scriptId, payload: { doctor_archive_action: true } };
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
            var updated = json.data && json.data.updateScripts;
            if (!updated || (Array.isArray(updated) && updated.length === 0)) {
                console.warn('archiveScripts returned null for id', scriptId);
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

    window.vsArchiveScripts = async function (ids, options) {
        options = options || {};
        if (!Array.isArray(ids) || ids.length === 0) return;
        var confirmMessage = options.confirmMessage || 'Are you sure you want to archive the selected script(s)?';
        if (!options.skipConfirm) {
            var ok = confirm(confirmMessage);
            if (!ok) return;
        }

        var seen = Object.create(null);
        var targets = [];
        var alreadyArchived = 0;

        ids.forEach(function (gridId) {
            var row = (window.vsRowMap && window.vsRowMap[gridId]) || null;
            var rawId = row ? (row.ID ?? row.id ?? row.Id) : gridId;
            var scriptId = extractScriptId(rawId);
            if (!scriptId) return;
            if (seen[scriptId]) return;
            if (row && isArchivedValue(row.doctor_archive_action ?? row.Doctor_Archive_Action ?? row.doctorArchiveAction ?? row.DoctorArchiveAction)) {
                alreadyArchived++;
                return;
            }
            seen[scriptId] = true;
            targets.push({ gridId: gridId, scriptId: scriptId, row: row });
        });

        if (targets.length === 0) {
            if (alreadyArchived > 0) {
                alert('Selected script(s) are already archived.');
            }
            return;
        }

        var results = await Promise.all(targets.map(function (entry) {
            return archiveOne(entry.scriptId);
        }));

        var okCount = 0;
        var fail = null;
        results.forEach(function (res, idx) {
            if (res && res.ok) {
                okCount++;
                var entry = targets[idx];
                if (entry && entry.row) {
                    entry.row.doctor_archive_action = true;
                    entry.row.Doctor_Archive_Action = true;
                }
                if (window.vsRowMap && entry && entry.gridId && window.vsRowMap[entry.gridId]) {
                    window.vsRowMap[entry.gridId].doctor_archive_action = true;
                    window.vsRowMap[entry.gridId].Doctor_Archive_Action = true;
                }
            } else if (!fail) {
                fail = res;
            }
        });

        if (okCount > 0) {
            alert('Archived ' + okCount + ' script' + (okCount === 1 ? '' : 's') + '.');
        }
        if (fail) {
            alert('Some updates failed: ' + (fail && fail.error ? fail.error : 'Unknown error'));
        } else if (okCount === 0 && alreadyArchived > 0) {
            alert('Selected script(s) are already archived.');
        }

        if (typeof window.vsRefreshScriptsTable === 'function') {
            try {
                window.vsRefreshScriptsTable();
            } catch (err) {
                console.warn('Failed to refresh table after archive', err);
            }
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

    window.vsEditScript = function (detail) {
        try {
            if (!detail || !detail.row) return;
            var row = detail.row || {};
            var rawId = row.ID ?? row.id ?? row.Id ?? detail.id;
            var scriptId = extractScriptId(rawId);
            if (!scriptId) {
                alert('Unable to determine script id for editing.');
                return;
            }
            if (typeof window.vsOpenScriptEditor !== 'function') {
                console.warn('vsOpenScriptEditor is not available');
                return;
            }
            window.vsOpenScriptEditor({
                scriptId: scriptId,
                row: row,
                ctx: detail.ctx || null
            });
        } catch (e) {
            console.error('Failed to open script editor', e);
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

    const UPDATE_SCRIPT_MUTATION = `mutation updateScript(\n  $id: ThcScriptID!\n  $payload: ScriptUpdateInput = null\n) {\n  updateScript(\n    query: [{ where: { id: $id } }]\n    payload: $payload\n  ) {\n    dosage_instructions\n  }\n}`;

    window.vsPerformScriptUpdate = async function (options) {
        options = options || {};
        var scriptId = extractScriptId(options.scriptId);
        if (!scriptId) {
            throw new Error('Missing script id for update.');
        }
        var payload = options.payload || {};
        var cfg = getApiConfig();
        if (!cfg.endpoint || !cfg.apiKey) {
            throw new Error('API endpoint or key not configured.');
        }
        var cleanPayload = {};
        for (var key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                var value = payload[key];
                if (value !== undefined) {
                    cleanPayload[key] = value;
                }
            }
        }
        var body = {
            query: UPDATE_SCRIPT_MUTATION,
            variables: {
                id: scriptId,
                payload: cleanPayload
            }
        };
        try {
            var res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': cfg.apiKey
                },
                body: JSON.stringify(body)
            });
            var json = await res.json();
            if (json.errors) {
                var msg = (json.errors[0] && json.errors[0].message) ? json.errors[0].message : 'Unknown error';
                throw new Error(msg);
            }
            return json.data && json.data.updateScript;
        } catch (e) {
            if (e && e.message) throw e;
            throw new Error('Network error while updating script.');
        }
    };
})();
