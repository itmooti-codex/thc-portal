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
  const markScriptCards = (panel) => {
    panel.querySelectorAll("[data-script-uid]").forEach((node) => {
      const card = node.closest(".js-script-card") || node.closest(".border.rounded.bg-white");
      if (!card) return;
      card.classList.add("js-script-card");
      if (!card.dataset.scriptUid) {
        const scriptUid = node.dataset.scriptUid;
        if (scriptUid) card.dataset.scriptUid = scriptUid;
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
  if (wrap && "MutationObserver" in window) {
    const mo = new MutationObserver((muts) => {
      let needsConsolidation = false;
      for (const m of muts) {
        if (m.type === "characterData") {
          const parent = m.target.parentElement;
          if (parent) {
            sanitize(parent);
            renderRichContent(parent);
          }
          continue;
        }
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            sanitize(n);
            renderRichContent(n);
            needsConsolidation = true;
          }
        });
      }
      if (needsConsolidation) consolidateClinicalNotes();
    });
    mo.observe(wrap, { childList: true, subtree: true, characterData: true });
  }