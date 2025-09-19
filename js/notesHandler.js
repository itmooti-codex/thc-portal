  document.addEventListener("click", (evt) => {
    const header = evt.target.closest(".js-acc-header");
    if (!header) return;
    if (!header.closest("#clinical-notes-list")) return;
    const acc = header.closest(".js-accordion");
    const panel = acc && acc.querySelector(".js-acc-panel");
    const chev = header.querySelector("[data-chevron]") || acc.querySelector("[data-chevron]");
    if (!panel) return;

    panel.classList.toggle("hidden");
    if (chev) chev.classList.toggle("rotate-180");
  });
  const toDash = (txt) => {
    const t = (txt || "").trim();
    if (!t || t === "null" || t === "undefined" || t === "{}") return "—";
    return t;
  };
  const sanitize = (root = document) => {
    root.querySelectorAll(".js-null-to-dash, .js-empty-dash").forEach((el) => {
      el.textContent = toDash(el.textContent);
    });
  };
  const allowedStyleProps = new Set([
    "font-weight",
    "font-style",
    "text-decoration",
    "color",
    "background-color",
    "font-size",
    "font-family",
    "letter-spacing",
    "text-transform",
    "line-height",
    "text-align"
  ]);
  const sanitizeInlineStyle = (value = "") =>
    value
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [property, ...rest] = part.split(":");
        if (!property || !rest.length) return "";
        const name = property.trim().toLowerCase();
        if (!allowedStyleProps.has(name)) return "";
        const rawVal = rest.join(":").trim();
        if (!rawVal) return "";
        const lowerVal = rawVal.toLowerCase();
        if (/url\s*\(/.test(lowerVal) || /expression\s*\(/.test(lowerVal)) return "";
        if (lowerVal.includes("javascript:")) return "";
        return `${name}: ${rawVal}`;
      })
      .filter(Boolean)
      .join("; ");
  const sanitizeRichHtml = (raw) => {
    if (!raw) return "";
    const temp = document.createElement("div");
    temp.innerHTML = raw;
    const allowedTags = new Set([
      "B",
      "STRONG",
      "I",
      "EM",
      "U",
      "A",
      "IMG",
      "BR",
      "P",
      "DIV",
      "SPAN",
      "CODE",
      "BLOCKQUOTE",
      "UL",
      "OL",
      "LI",
      "DL",
      "DT",
      "DD",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "TABLE",
      "THEAD",
      "TBODY",
      "TR",
      "TD",
      "TH",
      "SUP",
      "SUB",
      "HR",
      "PRE"
    ]);
    const allowedAttrs = {
      A: new Set(["href", "title", "target", "rel"]),
      TD: new Set(["colspan", "rowspan", "headers", "scope", "abbr"]),
      TH: new Set(["colspan", "rowspan", "headers", "scope", "abbr"]),
      TABLE: new Set(["summary"]),
      IMG: new Set(["src", "alt", "title"])
    };
    const globalAttrs = new Set(["style"]);
    Array.from(temp.querySelectorAll("*"))
      .reverse()
      .forEach((node) => {
      if (!allowedTags.has(node.tagName)) {
        const parent = node.parentNode;
        if (!parent) {
          node.remove();
          return;
        }
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        node.remove();
        return;
      }
      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const tagSpecific = allowedAttrs[node.tagName] || new Set();
        if (!(tagSpecific.has(name) || globalAttrs.has(name))) {
          node.removeAttribute(attr.name);
          return;
        }
        const value = attr.value.trim();
        if (name === "style") {
          const cleaned = sanitizeInlineStyle(value);
          if (cleaned) {
            node.setAttribute("style", cleaned);
          } else {
            node.removeAttribute(attr.name);
          }
          return;
        }
        if ((name === "href" || name === "src") && /^javascript:/i.test(value)) {
          node.removeAttribute(attr.name);
          return;
        }
        if (name === "target") {
          const targetValue = value.toLowerCase();
          if (targetValue === "_blank" && !node.getAttribute("rel")) {
            node.setAttribute("rel", "noopener noreferrer");
          } else if (!["_self", "_blank", "_parent", "_top"].includes(targetValue)) {
            node.setAttribute("target", "_self");
          }
          return;
        }
        if (name === "rel" && node.getAttribute("target") === "_blank") {
          if (!/noopener|noreferrer/i.test(value)) {
            node.setAttribute("rel", "noopener noreferrer");
          }
        }
      });
    });
    return temp.innerHTML;
  };
  const renderRichContent = (root = document) => {
    root.querySelectorAll(".js-rich-content").forEach((el) => {
      const hasElementChildren = Array.from(el.childNodes).some((n) => n.nodeType === 1);
      if (hasElementChildren) return;
      const raw = el.textContent;
      if (!raw || raw.trim() === "") return;
      if (!raw.includes("<")) return;
      const safe = sanitizeRichHtml(raw);
      el.innerHTML = safe;
    });
  };
  const ensureStyles = () => {
    if (document.getElementById("clinical-notes-styles")) return;
    const style = document.createElement("style");
    style.id = "clinical-notes-styles";
    style.textContent = `
#clinical-notes-list .js-script-grid {
display: grid;
gap: 0.75rem;
grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media (min-width: 640px) {
#clinical-notes-list .js-script-grid {
grid-template-columns: repeat(2, minmax(0, 1fr));
}
}
@media (min-width: 1024px) {
#clinical-notes-list .js-script-grid {
grid-template-columns: repeat(3, minmax(0, 1fr));
}
}
@media (min-width: 1280px) {
#clinical-notes-list .js-script-grid {
grid-template-columns: repeat(4, minmax(0, 1fr));
}
}
`;
    const target = document.head || document.body;
    if (target) target.appendChild(style);
  };
  function normalizeText(value) {
    return (value == null ? "" : String(value)).replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isCancelledScript(card) {
    if (!card) return false;
    const statusSpan = card.querySelector('.body-text .js-empty-dash, .body-text .js-null-to-dash')
      || card.querySelector('[data-script-status]');
    let statusText = statusSpan ? statusSpan.textContent : '';
    if (!statusText) {
      const text = card.textContent || '';
      const match = text.match(/status\s*:\s*([^\n]+)/i);
      statusText = match ? match[1] : text;
    }
    const norm = normalizeText(statusText);
    if (!norm) return false;
    return /\bcancel(?:led|ed)\b/.test(norm);
  }

  const markScriptCards = (panel) => {
    const cards = new Set(panel.querySelectorAll('.js-script-card'));
    panel.querySelectorAll("[data-script-uid]").forEach((node) => {
      const card = node.closest(".js-script-card") || node.closest(".border.rounded.bg-white");
      if (!card) return;
      card.classList.add("js-script-card");
      if (!card.dataset.scriptUid) {
        const scriptUid = node.dataset.scriptUid;
        if (scriptUid) card.dataset.scriptUid = scriptUid;
      }
      cards.add(card);
    });
    cards.forEach((card) => {
      if (isCancelledScript(card)) {
        card.remove();
      }
    });
  };
  const ensureScriptGrid = (panel) => {
    if (!panel) return null;
    let grid = panel.querySelector(".js-script-grid");
    if (grid) return grid;
    const cards = Array.from(panel.querySelectorAll(".js-script-card"));
    if (!cards.length) return null;
    grid = document.createElement("div");
    grid.className = "js-script-grid";
    const reference = cards[0];
    reference.parentNode.insertBefore(grid, reference);
    cards.forEach((card) => {
      grid.appendChild(card);
    });
    return grid;
  };
  const wrap = document.getElementById("clinical-notes-list");
  const defaults = window.THCPortalDefaults || {};
  const API_ENDPOINT = defaults.apiEndpoint;
  const API_KEY = defaults.apiKey;
  const UPDATE_MUTATION = `mutation updateClinicalNote(
  $id: ThcClinicalNoteID
  $payload: ClinicalNoteUpdateInput = null
) {
  updateClinicalNote(
    query: [{ where: { id: $id } }]
    payload: $payload
  ) {
    content
  }
}`;
  const noteEditorStates = new WeakMap();

  function getAppointmentUidRaw(node) {
    if (!node) return "";
    if (node.getAttribute) {
      const typoAttr = node.getAttribute("data-appointemnt-uid");
      if (typoAttr != null) return typoAttr;
      const properAttr = node.getAttribute("data-appointment-uid");
      if (properAttr != null) return properAttr;
    }
    if (node.dataset) {
      if (node.dataset.appointemntUid != null) return node.dataset.appointemntUid;
      if (node.dataset.appointmentUid != null) return node.dataset.appointmentUid;
    }
    return "";
  }

  function canonicalAppointmentUidValue(value) {
    if (value == null) return "";
    const trimmed = String(value).trim();
    if (!trimmed) return "";
    if (/^(null|undefined|n\/?.?a|none|no|false|0)$/i.test(trimmed)) return "";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) return "";
    return trimmed.toLowerCase();
  }

  function hasAppointmentUid(node) {
    const allowedUid = canonicalAppointmentUidValue(defaults.appointmentUid);
    if (!allowedUid) return false;
    const noteUid = canonicalAppointmentUidValue(getAppointmentUidRaw(node));
    if (!noteUid) return false;
    return noteUid === allowedUid;
  }

  function toIdMaybeNum(v) {
    if (v == null) return v;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (!trimmed) return trimmed;
      if (/^\d+$/.test(trimmed)) return Number(trimmed);
      return trimmed;
    }
    return v;
  }

  function cleanHtml(html) {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    temp.querySelectorAll("script,style").forEach((node) => node.remove());
    return temp.innerHTML.trim();
  }

  function decodeHtmlEntities(html) {
    if (html == null) return "";
    const str = String(html);
    if (!/[&<]/.test(str)) return str;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = str;
    return textarea.value;
  }

  function ensureStatusEl(contentEl, editorRoot) {
    if (!contentEl || !contentEl.parentElement) return null;
    let status = contentEl.parentElement.querySelector(".js-note-status");
    if (!status) {
      status = document.createElement("div");
      status.className = "text-xs text-slate-500 mt-2 js-note-status";
      status.hidden = true;
    }
    if (editorRoot && editorRoot.parentElement) {
      if (status.parentElement !== editorRoot.parentElement || status.previousElementSibling !== editorRoot) {
        editorRoot.insertAdjacentElement("afterend", status);
      }
    } else if (!status.parentElement) {
      contentEl.insertAdjacentElement("afterend", status);
    }
    return status;
  }

  function updateStatus(statusEl, text, timeoutMs) {
    if (!statusEl) return;
    if (!text) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusEl.removeAttribute("data-status-token");
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = text;
    if (timeoutMs && timeoutMs > 0) {
      const token = String(Date.now());
      statusEl.dataset.statusToken = token;
      window.setTimeout(() => {
        if (statusEl.dataset.statusToken === token) {
          statusEl.hidden = true;
          statusEl.textContent = "";
          statusEl.removeAttribute("data-status-token");
        }
      }, timeoutMs);
    } else {
      statusEl.dataset.statusToken = "active";
    }
  }

  async function sendUpdate(noteId, content) {
    if (!API_ENDPOINT || !API_KEY) {
      throw new Error("API endpoint or key not configured.");
    }
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": API_KEY
      },
      body: JSON.stringify({
        query: UPDATE_MUTATION,
        variables: {
          id: toIdMaybeNum(noteId),
          payload: { content }
        }
      })
    });
    const json = await res.json();
    if (json.errors) {
      const message = (json.errors[0] && json.errors[0].message) || "GraphQL error";
      const err = new Error(message);
      err.details = json.errors;
      throw err;
    }
    return json.data;
  }

  const EditorConstructor = (window.CKEDITOR && window.CKEDITOR.ClassicEditor)
    ? window.CKEDITOR.ClassicEditor
    : window.ClassicEditor;

  function queueSave(state) {
    if (!state || !state.editor) return;
    const raw = state.editor.getData();
    const cleaned = cleanHtml(raw);
    if (cleaned === state.lastSaved) {
      updateStatus(state.statusEl, "");
      return;
    }
    if (state.saving) {
      state.nextContent = cleaned;
      return;
    }
    saveContent(state, cleaned);
  }

  function saveContent(state, cleaned) {
    state.saving = true;
    updateStatus(state.statusEl, "Saving…");
    sendUpdate(state.noteId, cleaned)
      .then(() => {
        state.lastSaved = cleaned;
        updateStatus(state.statusEl, "Saved", 2000);
      })
      .catch((err) => {
        console.error("Failed to update clinical note", err);
        updateStatus(state.statusEl, "Failed to save");
      })
      .finally(() => {
        state.saving = false;
        if (state.nextContent != null) {
          const pendingData = state.nextContent;
          state.nextContent = null;
          const latestFromEditor = cleanHtml(state.editor.getData());
          const nextData = pendingData != null ? pendingData : latestFromEditor;
          if (nextData !== state.lastSaved) {
            saveContent(state, nextData);
          } else {
            updateStatus(state.statusEl, "");
          }
        }
      });
  }

  function initEditableNotes(root = wrap) {
    if (!root) return;
    if (!EditorConstructor) return;
    if (!API_ENDPOINT || !API_KEY) return;
    const accordions = Array.from(root.querySelectorAll(".js-accordion"));
    accordions.forEach((acc) => {
      if (!hasAppointmentUid(acc)) return;
      if (noteEditorStates.has(acc)) return;
      const contentEl = acc.querySelector(".note-content");
      if (!contentEl) return;
      if (contentEl.dataset.editorInit === "pending" || contentEl.dataset.editorInit === "ready") return;
      const noteIdRaw = acc.getAttribute("data-id");
      const noteId = noteIdRaw ? noteIdRaw.trim() : "";
      if (!noteId) return;
      contentEl.dataset.editorInit = "pending";
      contentEl.classList.remove("js-rich-content");
      const initialRaw = contentEl.innerHTML;
      const decodedInitial = decodeHtmlEntities(initialRaw);
      const sanitizedInitial = sanitizeRichHtml(decodedInitial);
      const initialHtml = sanitizedInitial || decodedInitial || "";
      if (initialHtml !== initialRaw) {
        contentEl.innerHTML = initialHtml;
      }
      EditorConstructor
        .create(contentEl, {
          toolbar: {
            items: ["bold", "italic", "underline", "link", "bulletedList", "|", "alignment"],
            shouldNotGroupWhenFull: true
          },
          alignment: {
            options: ["left", "center", "right", "justify"]
          },
          removePlugins: [
            "CKBox",
            "CKFinder",
            "EasyImage",
            "RealTimeCollaborativeComments",
            "RealTimeCollaborativeTrackChanges",
            "RealTimeCollaborativeRevisionHistory",
            "PresenceList",
            "Comments",
            "TrackChanges",
            "TrackChangesData",
            "RevisionHistory",
            "Pagination",
            "WProofreader",
            "MathType",
            "SlashCommand",
            "Template",
            "DocumentOutline",
            "FormatPainter",
            "GrammarChecker",
            "AIAssistant",
            "CaseChange",
            "ExportPdf",
            "ExportWord",
            "Title",
            "MultiLevelList",
            "TableOfContents",
            "PasteFromOfficeEnhanced"
          ],
          heading: {
            options: [{ model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" }]
          }
        })
        .then((editor) => {
          contentEl.dataset.editorInit = "ready";
          editor.setData(initialHtml);
          let editorRoot = null;
          if (contentEl.parentElement) {
            const siblings = Array.from(contentEl.parentElement.children);
            editorRoot = siblings.find((el) => el && el.classList && el.classList.contains("ck-editor")) || null;
          }
          const statusEl = ensureStatusEl(contentEl, editorRoot);
          const state = {
            editor,
            noteId,
            statusEl,
            saving: false,
            nextContent: null,
            lastSaved: cleanHtml(initialHtml)
          };
          noteEditorStates.set(acc, state);
          editor.model.document.on("change:data", () => {
            updateStatus(state.statusEl, "");
          });
          editor.ui.focusTracker.on("change:isFocused", (evt, name, isFocused) => {
            if (!isFocused) {
              queueSave(state);
            }
          });
        })
        .catch((err) => {
          contentEl.dataset.editorInit = "";
          console.error("Failed to initialize editor for existing note", err);
        });
    });
  }

  const consolidateClinicalNotes = () => {
    if (!wrap) return;
    const notes = Array.from(wrap.querySelectorAll(".js-accordion"));
    const grouped = new Map();
    notes.forEach((note) => {
      const uid = note.getAttribute("data-clinical-uid") || note.dataset.uid;
      if (!uid) return;
      const panel = note.querySelector(".js-acc-panel");
      if (!panel) return;
      markScriptCards(panel);
      const existing = grouped.get(uid);
      if (!existing) {
        const grid = ensureScriptGrid(panel);
        const scriptUids = new Set();
        if (grid) {
          grid.querySelectorAll(".js-script-card").forEach((card) => {
            if (card.dataset.scriptUid) scriptUids.add(card.dataset.scriptUid);
          });
        }
        grouped.set(uid, { note, grid, scriptUids });
        return;
      }
      const targetPanel = existing.note.querySelector(".js-acc-panel");
      const targetGrid = existing.grid || ensureScriptGrid(targetPanel);
      if (targetGrid) existing.grid = targetGrid;
      Array.from(panel.querySelectorAll(".js-script-card")).forEach((card) => {
        const infoNode = card.querySelector("[data-script-uid]");
        const scriptUid = card.dataset.scriptUid || (infoNode && infoNode.dataset.scriptUid);
        if (scriptUid && existing.scriptUids.has(scriptUid)) return;
        if (scriptUid) existing.scriptUids.add(scriptUid);
        if (targetGrid) {
          targetGrid.appendChild(card);
        } else if (targetPanel) {
          targetPanel.appendChild(card);
        }
      });
      note.remove();
    });
  };
  sanitize();
  renderRichContent();
  ensureStyles();
  consolidateClinicalNotes();
  initEditableNotes();
  if (wrap && "MutationObserver" in window) {
    const mo = new MutationObserver((muts) => {
      let needsConsolidation = false;
      let needsEditors = false;
      for (const m of muts) {
        if (m.type === "characterData") {
          const parent = m.target.parentElement;
          if (parent) {
            sanitize(parent);
            renderRichContent(parent);
          }
          continue;
        }
        if (m.type === "attributes" && (m.attributeName === "data-appointemnt-uid" || m.attributeName === "data-appointment-uid")) {
          needsEditors = true;
        }
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            sanitize(n);
            renderRichContent(n);
            needsConsolidation = true;
            needsEditors = true;
          }
        });
      }
      if (needsConsolidation) consolidateClinicalNotes();
      if (needsConsolidation || needsEditors) initEditableNotes();
    });
    mo.observe(wrap, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-appointemnt-uid", "data-appointment-uid"]
    });
  }
