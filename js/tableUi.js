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
    var wrap = document.querySelector(".thc-datalist-wrap");
    if (!wrap) return;
    var bar = document.getElementById("tableActions");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tableActions";
      bar.className = "table-actions hidden";
      bar.innerHTML =
        '\n                <button id="tableDeleteSelected" type="button" class="dl-btn-delete">Delete Selected Script(s)</button>\n                <button id="tableCreateScriptTop" type="button" class="dl-btn-create">Duplicate Script(s)</button>\n            ';
      wrap.insertBefore(bar, wrap.firstChild);
      // Hook up bulk delete
      var delBtn = document.getElementById("tableDeleteSelected");
      delBtn &&
        delBtn.addEventListener("click", async function () {
          try {
            var ids = Array.isArray(window.vsSelectedRowIds)
              ? window.vsSelectedRowIds.slice()
              : [];
            if (!ids.length) return;
            // Validate all selected are Draft
            var nonDraft = ids.filter(function (id) {
              var row = window.vsRowMap && window.vsRowMap[id];
              var st = getStatus(row);
              return String(st) !== "Draft";
            });
            if (nonDraft.length > 0) {
              alert(
                "You have selected script(s) that cannot be deleted. Please deselect those script(s) and try again."
              );
              return;
            }
            if (!window.vsCancelScripts) {
              console.warn("vsCancelScripts not defined");
              return;
            }
            // Confirm bulk delete
            var ok = confirm(
              "Are you sure you want to delete the selected script(s)?"
            );
            if (!ok) return;
            delBtn.disabled = true;
            delBtn.textContent = "Cancelling…";
            await window.vsCancelScripts(ids);
          } finally {
            delBtn.disabled = false;
            delBtn.textContent = "Delete Selected Script(s)";
          }
        });
      // Top duplicate script(s) button
      var createBtnTop = document.getElementById("tableCreateScriptTop");
      if (createBtnTop) {
        createBtnTop.addEventListener("click", async function () {
          try {
            var ids = Array.isArray(window.vsSelectedRowIds)
              ? window.vsSelectedRowIds.slice()
              : [];
            if (!ids.length) return;
            if (!window.vsDuplicateScripts) {
              console.warn("vsDuplicateScripts not defined");
              return;
            }
            createBtnTop.disabled = true;
            var orig = createBtnTop.textContent;
            createBtnTop.textContent = "Duplicating…";
            await window.vsDuplicateScripts(ids);
          } finally {
            createBtnTop.disabled = false;
            createBtnTop.textContent = "Duplicate Script(s)";
          }
        });
      }
    }
  }

  function setBulkActionsVisible(visible) {
    var bar = document.getElementById("tableActions");
    if (!bar) return;
    if (visible) bar.classList.remove("hidden");
    else bar.classList.add("hidden");
  }
  ctx
    .setTheme("light")
    .setDataGridProps({
      pageSizeOptions: [25, 50, 100],
      density: "compact",
    })
    .setFinalizeColumns((cols) => {
      const lower = (v) => (typeof v === "string" ? v.toLowerCase() : "");
      const isRepeatsColumn = (col) => {
        const f = lower(col?.field);
        const h = lower(col?.headerName);
        return f === "repeats" || f === "script_repeats" || h === "repeats";
      };
      const isRemainingColumn = (col) => {
        const f = lower(col?.field);
        const h = lower(col?.headerName);
        return (
          f === "remaining" ||
          f === "scriptremaining" ||
          f === "script_remaining" ||
          h === "remaining"
        );
      };
      const isBlankLike = (value) => {
        if (value == null) return true;
        if (typeof value === "number") return false;
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) return true;
          const lowerTrim = trimmed.toLowerCase();
          return (
            lowerTrim === "null" ||
            lowerTrim === "undefined" ||
            lowerTrim === "n/a" ||
            lowerTrim === "na"
          );
        }
        return false;
      };
      const normalizeDisplay = (col, value, params) => {
        if (!isBlankLike(value)) return value;
        let fallback = col && col.field ? params?.row?.[col.field] : undefined;
        if (isBlankLike(fallback)) {
          const target = col && col.field ? lower(col.field) : "";
          if (target && params?.row && typeof params.row === "object") {
            for (const key in params.row) {
              if (!Object.prototype.hasOwnProperty.call(params.row, key))
                continue;
              if (lower(key) === target) {
                fallback = params.row[key];
                break;
              }
            }
          }
        }
        if (!isBlankLike(fallback)) return fallback;
        if (isRepeatsColumn(col) || isRemainingColumn(col)) return 0;
        return "-";
      };
      const enhanceFormatter = (col) => {
        const originalFormatter = col.valueFormatter;
        const originalRenderCell = col.renderCell;
        col.valueFormatter = (params) => {
          let value = originalFormatter
            ? originalFormatter(params)
            : params?.value;
          value = normalizeDisplay(col, value, params);
          return value;
        };
        if (originalRenderCell) {
          col.renderCell = (params) => {
            const result = originalRenderCell(params);
            if (typeof result === "string" && isBlankLike(result)) {
              return normalizeDisplay(col, result, params);
            }
            if (result == null) {
              const fallback = normalizeDisplay(col, result, params);
              return fallback;
            }
            return result;
          };
        }
      };

      cols = Array.isArray(cols) ? cols.slice() : [];
      cols = cols.filter((col) => {
        if (!col) return false;
        const header = (col.headerName || "").trim().toLowerCase();
        const field = (col.field || "").trim().toLowerCase();
        if (header === "id" || field === "id") return false;
        if (header === "drug id" || field === "drug_id" || field === "drugid")
          return false;
        if (
          header === "dosage instructions" ||
          field === "dosage_instructions" ||
          field === "dosageinstructions"
        )
          return false;
        if (
          header === "dispense quantity" ||
          field === "dispense_quantity" ||
          field === "dispensequantity"
        )
          return false;
        if (
          header === "interval days" ||
          field === "interval_days" ||
          field === "intervaldays"
        )
          return false;
        return true;
      });

      if (cols[0]) cols[0] = { ...cols[0], minWidth: 160 };
      const hasActions = cols.some((c) => c.field === "__actions");
      if (!hasActions) {
        const R = window.vitalStatsReact || window.React;
        cols.push({
          field: "__actions",
          headerName: "Actions",
          sortable: false,
          filterable: false,
          align: "center",
          headerAlign: "center",
          width: 140,
          renderCell: (params) => {
            try {
              window.vsRowMap[params.id] = params.row;
            } catch (_) {}
            const status = getStatus(params?.row);
            const isDraft = String(status) === "Draft";
            const detail = { id: params.id, row: params.row, ctx };
            const buttons = [];

            if (typeof window.vsEditScript === "function") {
              const onEdit = (e) => {
                e.stopPropagation();
                try {
                  window.vsEditScript(detail);
                } catch (err) {
                  console.error(err);
                }
              };
              const editIcon = R.createElement(
                "svg",
                {
                  xmlns: "http://www.w3.org/2000/svg",
                  viewBox: "0 0 20 20",
                  fill: "currentColor",
                  width: 14,
                  height: 14,
                  "aria-hidden": "true",
                },
                R.createElement("path", {
                  d: "M17.414 2.586a2 2 0 010 2.828l-8.899 8.9a2 2 0 01-.878.518l-3.316.943a1 1 0 01-1.23-1.23l.943-3.316a2 2 0 01.518-.878l8.9-8.899a2 2 0 012.828 0zM5.121 11.121a.5.5 0 00-.129.219l-.52 1.83 1.83-.52a.5.5 0 00.218-.129l6.69-6.69-1.399-1.4-6.69 6.69zM3 16a1 1 0 100 2h14a1 1 0 100-2H3z",
                })
              );
              const editBtnChildren = [
                editIcon,
                R.createElement(
                  "span",
                  { className: "sr-only" },
                  "Edit script"
                ),
              ];
              buttons.push(
                R.createElement(
                  "button",
                  {
                    type: "button",
                    className: "dl-btn-edit",
                    onClick: onEdit,
                    title: "Edit script",
                    "aria-label": "Edit script",
                  },
                  editBtnChildren
                )
              );
            }

            if (isDraft) {
              const onDelete = async (e) => {
                e.stopPropagation();
                try {
                  if (typeof window.vsDeleteRow === "function") {
                    await window.vsDeleteRow(detail);
                  } else {
                    const elem = document.getElementById("thc-datalist");
                    elem &&
                      elem.dispatchEvent(
                        new CustomEvent("row-delete", { detail })
                      );
                  }
                } catch (_) {}
              };
              buttons.push(
                R.createElement(
                  "button",
                  {
                    type: "button",
                    className: "dl-btn-delete",
                    onClick: onDelete,
                  },
                  "Delete"
                )
              );
            }

            if (!buttons.length) return null;
            if (buttons.length === 1) return buttons[0];
            return R.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  alignItems: "center",
                },
              },
              buttons
            );
          },
        });
      }

      cols.forEach((col) => {
        if (!col || !col.field || col.field === "__actions") return;
        enhanceFormatter(col);
      });
      return cols;
    })
    .setFinalizeDataGridProps((props) => {
      // Make sure our bulk bar exists in the DOM
      ensureBulkActionsBar();
      return {
        ...props,
        disableColumnMenu: true,
        checkboxSelection: true,
        rowSelection: true,
        getRowId: (row) =>
          row?.ID ?? row?.id ?? row?.Id ?? row?.uid ?? row?._id,
        onRowSelectionModelChange: (selectionModel) => {
          try {
            window.vsSelectedRowIds = Array.isArray(selectionModel)
              ? selectionModel
              : [];
            setBulkActionsVisible(window.vsSelectedRowIds.length > 0);
          } catch (e) {
            console.warn("Selection update failed", e);
          }
          // Call through to existing handler if any
          if (typeof props.onRowSelectionModelChange === "function") {
            props.onRowSelectionModelChange(selectionModel);
          }
        },
      };
    });
};
