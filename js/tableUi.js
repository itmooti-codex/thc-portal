window.vsInit = function (dynamicList) {
  const ctx = dynamicList.tableCtx;
  let hasMedicineColumn = false;
  // Keep selection in a global so other scripts can access
  window.vsSelectedRowIds = window.vsSelectedRowIds || [];
  window.vsRowMap = window.vsRowMap || Object.create(null);
  window.vsDynamicList = dynamicList;
  window.vsTableCtx = ctx;

  function refreshScriptsTable() {
    if (ctx && typeof ctx.refresh === "function") {
      try {
        ctx.refresh();
        return;
      } catch (err) {
        console.warn("ctx.refresh failed", err);
      }
    }
    if (dynamicList && typeof dynamicList.refresh === "function") {
      try {
        dynamicList.refresh();
      } catch (err) {
        console.warn("dynamicList.refresh failed", err);
      }
    }
  }

  window.vsRefreshScriptsTable = refreshScriptsTable;

  function getStatus(row) {
    if (!row) return undefined;
    return row.script_status ?? row.Script_Status ?? row.status ?? row.Status;
  }

  function normalizeStatusValue(status) {
    return String(status || "")
      .toLowerCase()
      .replace(/[_\s]+/g, " ")
      .trim();
  }

  const ARCHIVE_ALLOWED_STATUS_SET = new Set([
    "open",
    "stock issue",
    "stockissue",
  ]);

  const ARCHIVE_BLOCK_REASON_LABELS = {
    draft: "Draft",
    fulfilled: "Fulfilled",
    archived: "Archived",
    cancelled: "Cancelled",
    "to be processed": "To Be Processed",
    tobeprocessed: "To Be Processed",
  };

  function archiveBlockReasonForStatus(status) {
    const normalized = normalizeStatusValue(status);
    if (!normalized) return "Unknown status";
    if (ARCHIVE_ALLOWED_STATUS_SET.has(normalized)) return null;
    if (ARCHIVE_BLOCK_REASON_LABELS[normalized]) {
      return ARCHIVE_BLOCK_REASON_LABELS[normalized];
    }
    return status ? String(status) : "Unknown status";
  }

  function isArchived(row) {
    if (!row) return false;
    const raw =
      row.doctor_archive_action ??
      row.Doctor_Archive_Action ??
      row.doctorArchiveAction ??
      row.DoctorArchiveAction ??
      row.archive ??
      row.Archive;
    if (typeof raw === "string") {
      return raw.toLowerCase() === "true";
    }
    return Boolean(raw);
  }

  function ensureBulkActionsBar() {
    var wrap =
      document.querySelector(".thc-datalist-wrap.all-data") ||
      document.querySelector(".thc-datalist-wrap");
    if (!wrap) return;
    var container = wrap.parentNode;
    if (!container) return;
    var bar = document.getElementById("tableActions");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tableActions";
      bar.className = "table-actions hidden";
      bar.innerHTML =
        '\n                <button id="tableDeleteSelected" type="button" class="dl-btn-delete">Delete Selected Script(s)</button>\n                <button id="tableArchiveSelected" type="button" class="dl-btn-archive">Archive Script(s)</button>\n                <button id="tableCreateScriptTop" type="button" class="dl-btn-create">Duplicate Script(s)</button>\n            ';
      container.insertBefore(bar, wrap);
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
      const archiveBtn = document.getElementById("tableArchiveSelected");
      if (archiveBtn) {
        archiveBtn.addEventListener("click", async function () {
          const originalText = archiveBtn.textContent;
          try {
            const ids = Array.isArray(window.vsSelectedRowIds)
              ? window.vsSelectedRowIds.slice()
              : [];
            if (!ids.length) return;
            if (typeof window.vsArchiveScripts !== "function") {
              console.warn("vsArchiveScripts not defined");
              return;
            }
            const blockedReasons = [];
            ids.forEach((id) => {
              const row =
                (window.vsRowMap && window.vsRowMap[id]) || null;
              if (!row) return;
              if (isArchived(row)) {
                blockedReasons.push("Archived");
                return;
              }
              const reason = archiveBlockReasonForStatus(getStatus(row));
              if (reason) blockedReasons.push(reason);
            });
            if (blockedReasons.length) {
              const uniqueReasons = Array.from(
                new Set(blockedReasons)
              );
              alert(
                "Selected script(s) with status " +
                  uniqueReasons.join(", ") +
                  " cannot be archived."
              );
              return;
            }
            archiveBtn.disabled = true;
            archiveBtn.textContent = "Archiving…";
            await window.vsArchiveScripts(ids, {
              confirmMessage:
                "Are you sure you want to archive the selected script(s)?",
            });
          } finally {
            archiveBtn.disabled = false;
            archiveBtn.textContent = originalText;
          }
        });
      }
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
      const isMedicineColumn = (col) => {
        const f = lower(col?.field);
        const h = lower(col?.headerName);
        if (!f && !h) return false;
        return (
          f === "medicine" ||
          f === "medication" ||
          f === "medicine_name" ||
          f === "medicinename" ||
          f === "drugname" ||
          f === "drug_name" ||
          h === "medicine" ||
          h === "medication" ||
          h === "medicine name" ||
          h === "medication name"
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
      hasMedicineColumn = false;
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
        if (
          header === "drug item name" ||
          field === "drug_item_name" ||
          field === "drugitemname"
        )
          return false;
        if (
          header === "doctor archive action" ||
          field === "doctor_archive_action" ||
          field === "doctorarchiveaction"
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
            const normalizedStatus = normalizeStatusValue(status);
            const isDraft = normalizedStatus === "draft";
            const isFulfilled = normalizedStatus === "fulfilled";
            const archived = isArchived(params?.row);
            const archiveStatusReason = archiveBlockReasonForStatus(status);
            const detail = { id: params.id, row: params.row, ctx };
            const buttons = [];

            if (isDraft && typeof window.vsEditScript === "function") {
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

            if (
              !archived &&
              !archiveStatusReason &&
              typeof window.vsArchiveScripts === "function"
            ) {
              const onArchive = async (e) => {
                e.stopPropagation();
                const ok = confirm(
                  "Are you sure you want to archive this script?"
                );
                if (!ok) return;
                try {
                  await window.vsArchiveScripts([params.id], {
                    skipConfirm: true,
                  });
                } catch (err) {
                  console.error("Failed to archive script", err);
                }
              };
              const archiveIcon = R.createElement(
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
                  d: "M4 3a2 2 0 012-2h8a2 2 0 012 2v3H4V3z",
                }),
                R.createElement("path", {
                  d: "M3 8h14v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 4a1 1 0 100 2h4a1 1 0 100-2H8z",
                })
              );
              buttons.push(
                R.createElement(
                  "button",
                  {
                    type: "button",
                    className: "dl-btn-archive",
                    onClick: onArchive,
                    title: "Archive script",
                    "aria-label": "Archive script",
                  },
                  archiveIcon,
                  R.createElement("span", { className: "sr-only" }, "Archive")
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
        if (!col || !col.field) return;
        if (col.field !== "__actions" && col.resizable == null) {
          col.resizable = true;
        }
        if (col.field !== "__actions" && isMedicineColumn(col)) {
          hasMedicineColumn = true;
          if (typeof col.flex !== "number" || col.flex < 1.3) {
            col.flex = 1.3;
          }
          if (typeof col.minWidth !== "number" || col.minWidth < 260) {
            col.minWidth = 260;
          }
          if (Object.prototype.hasOwnProperty.call(col, "width")) {
            delete col.width;
          }
          if (!col.align) col.align = "left";
          if (!col.headerAlign) col.headerAlign = "left";
          if (!col.__dlMedicineApplied) {
            const prevRenderCell = col.renderCell;
            col.renderCell = (params) => {
              const R = window.vitalStatsReact || window.React;
              let content =
                typeof prevRenderCell === "function"
                  ? prevRenderCell(params)
                  : params?.formattedValue ?? params?.value;
              if (content == null) content = "";
              if (!R || typeof R.createElement !== "function") return content;
              const title =
                typeof content === "string" || typeof content === "number"
                  ? String(content)
                  : undefined;
              return R.createElement(
                "div",
                {
                  className: "dl-cell-medicine-content",
                  style: {
                    display: "block",
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    lineHeight: 1.35,
                    width: "100%",
                  },
                  title,
                },
                content
              );
            };
            if (!col.cellClassName) {
              col.cellClassName = "dl-cell-medicine";
            } else if (typeof col.cellClassName === "string") {
              if (col.cellClassName.indexOf("dl-cell-medicine") === -1) {
                col.cellClassName = col.cellClassName + " dl-cell-medicine";
              }
            } else if (typeof col.cellClassName === "function") {
              const prev = col.cellClassName;
              col.cellClassName = (params) => {
                const result = prev(params);
                if (!result) return "dl-cell-medicine";
                if (
                  typeof result === "string" &&
                  result.indexOf("dl-cell-medicine") === -1
                ) {
                  return result + " dl-cell-medicine";
                }
                return result;
              };
            }
            col.__dlMedicineApplied = true;
          }
        }
        if (col.field === "__actions") return;
        enhanceFormatter(col);
      });
      return cols;
    })
    .setFinalizeDataGridProps((props) => {
      // Make sure our bulk bar exists in the DOM
      ensureBulkActionsBar();
      const nextProps = {
        ...props,
        disableColumnMenu: true,
        checkboxSelection: true,
        rowSelection: true,
        columnResizeMode:
          props && typeof props.columnResizeMode !== "undefined"
            ? props.columnResizeMode
            : "onChange",
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
      if (
        hasMedicineColumn &&
        typeof nextProps.getRowHeight !== "function" &&
        typeof nextProps.autoHeight === "undefined"
      ) {
        nextProps.getRowHeight = () => "auto";
      }
      return nextProps;
    });
};
