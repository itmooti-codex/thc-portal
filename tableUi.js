
window.vsInit = function (dynamicList) {
    const ctx = dynamicList.tableCtx;
    // Keep selection in a global so other scripts can access
    window.vsSelectedRowIds = window.vsSelectedRowIds || [];
    window.vsRowMap = window.vsRowMap || Object.create(null);

    function getStatus(row) {
        if (!row) return undefined;
        return row.script_status ?? row.Script_Status ?? row.status ?? row.Status;
    }

    function ensureBulkActionsBar() {
        var wrap = document.querySelector('.thc-datalist-wrap');
        if (!wrap) return;
        var bar = document.getElementById('tableActions');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'tableActions';
            bar.className = 'table-actions hidden';
            bar.innerHTML = "\n                <button id=\"tableDeleteSelected\" type=\"button\" class=\"dl-btn-delete\">Delete Selected Script</button>\n                <button id=\"tableCreateScriptTop\" type=\"button\" class=\"dl-btn-create\">Create Script</button>\n            ";
            wrap.insertBefore(bar, wrap.firstChild);
            // Hook up bulk delete
            var delBtn = document.getElementById('tableDeleteSelected');
            delBtn && delBtn.addEventListener('click', async function () {
                try {
                    var ids = Array.isArray(window.vsSelectedRowIds) ? window.vsSelectedRowIds.slice() : [];
                    if (!ids.length) return;
                    // Validate all selected are Draft
                    var nonDraft = ids.filter(function (id) {
                        var row = window.vsRowMap && window.vsRowMap[id];
                        var st = getStatus(row);
                        return String(st) !== 'Draft';
                    });
                    if (nonDraft.length > 0) {
                        alert('You have selected script(s) that cannot be deleted. Please deselect those script(s) and try again.');
                        return;
                    }
                    if (!window.vsCancelScripts) {
                        console.warn('vsCancelScripts not defined');
                        return;
                    }
                    // Confirm bulk delete
                    var ok = confirm('Are you sure you want to delete the selected script(s)?');
                    if (!ok) return;
                    delBtn.disabled = true;
                    delBtn.textContent = 'Cancelling…';
                    await window.vsCancelScripts(ids);
                } finally {
                    delBtn.disabled = false;
                    delBtn.textContent = 'Delete Selected Script';
                }
            });
            // Top create script button (functionality to be implemented later)
            var createBtnTop = document.getElementById('tableCreateScriptTop');
            if (createBtnTop) {
                createBtnTop.addEventListener('click', function () {
                    // Placeholder for future implementation
                    console.log('Create Script (top) clicked for', window.vsSelectedRowIds);
                });
            }
        }
    }

    function setBulkActionsVisible(visible) {
        var bar = document.getElementById('tableActions');
        if (!bar) return;
        if (visible) bar.classList.remove('hidden'); else bar.classList.add('hidden');
    }
    ctx
        .setTheme('light')
        .setDataGridProps({
            pageSizeOptions: [25, 50, 100],
            density: 'compact',
        })
        .setFinalizeColumns((cols) => {
            if (cols && cols[0]) cols[0] = { ...cols[0], minWidth: 160 };
            const hasActions = Array.isArray(cols) && cols.some(c => c.field === '__actions');
            if (!hasActions) {
                const R = window.vitalStatsReact || window.React;
                cols = cols || [];
                cols.push({
                    field: '__actions',
                    headerName: 'Actions',
                    sortable: false,
                    filterable: false,
                    align: 'center',
                    headerAlign: 'center',
                    width: 120,
                    renderCell: (params) => {
                        const onClick = async (e) => {
                            e.stopPropagation();
                            const detail = { id: params.id, row: params.row, ctx };
                            try {
                                if (typeof window.vsDeleteRow === 'function') {
                                    await window.vsDeleteRow(detail);
                                } else {
                                    const elem = document.getElementById('thc-datalist');
                                    elem && elem.dispatchEvent(new CustomEvent('row-delete', { detail }));
                                }
                            } catch (_) { }
                        };
                        // Keep a reference to the full row for selection validation later
                        try { window.vsRowMap[params.id] = params.row; } catch (_) {}
                        const status = getStatus(params?.row);
                        const isDraft = String(status) === 'Draft';
                        if (!isDraft) return null;
                        return R.createElement('button', { type: 'button', className: 'dl-btn-delete', onClick }, 'Delete');
                    }
                });
            }
            return cols;
        })
        .setFinalizeDataGridProps((props) => {
            // Make sure our bulk bar exists in the DOM
            ensureBulkActionsBar();
            return ({
                ...props,
                disableColumnMenu: true,
                checkboxSelection: true,
                rowSelection: true,
                getRowId: (row) => row?.ID ?? row?.id ?? row?.Id ?? row?.uid ?? row?._id,
                onRowSelectionModelChange: (selectionModel) => {
                    try {
                        window.vsSelectedRowIds = Array.isArray(selectionModel) ? selectionModel : [];
                        setBulkActionsVisible(window.vsSelectedRowIds.length > 0);
                    } catch (e) {
                        console.warn('Selection update failed', e);
                    }
                    // Call through to existing handler if any
                    if (typeof props.onRowSelectionModelChange === 'function') {
                        props.onRowSelectionModelChange(selectionModel);
                    }
                },
            });
        });
};
