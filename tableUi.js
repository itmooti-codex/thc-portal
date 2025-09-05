
window.vsInit = function (dynamicList) {
    const ctx = dynamicList.tableCtx;
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
                        return R.createElement('button', { type: 'button', className: 'dl-btn-delete', onClick }, 'Delete');
                    }
                });
            }
            return cols;
        })
        .setFinalizeDataGridProps((props) => ({
            ...props,
            disableColumnMenu: true,
            checkboxSelection: true,
            rowSelection: true,
        }));
};