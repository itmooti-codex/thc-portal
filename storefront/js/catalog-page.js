(function () {
  const root = document.querySelector(".get-url");
  const page = root?.dataset?.storefrontPage;
  const isCatalogPage = page === "catalog";
  if (!isCatalogPage && page !== "checkout") return;

  const utils = window.StorefrontUtils || {};
  const showLoader =
    isCatalogPage && typeof utils.showPageLoader === "function"
      ? (msg) => utils.showPageLoader(msg)
      : () => {};
  const hideLoader =
    isCatalogPage && typeof utils.hidePageLoader === "function"
      ? () => utils.hidePageLoader()
      : () => {};

  showLoader("Loading products…");

  const searchEl = document.getElementById("product_search");
  const clearEl = document.getElementById("product_search_clear");
  const emptyEl = document.getElementById("search_empty");

  const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Helvetica, Arial, sans-serif' font-size='24' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
  const placeholderTokenRegex = /^\s*\[[^\]]*\]\s*$/;

  const sanitizeRestrictionValue = (value) => {
    if (value == null) return "";
    const normalized = String(value).replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (placeholderTokenRegex.test(normalized)) return "";
    return normalized;
  };

  const normaliseText = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const getProductInitial = (card) => {
    if (!card) return "•";
    const candidates = [
      card.dataset?.productName,
      card.querySelector(".product-name")?.textContent,
      card.dataset?.productBrand,
      card.querySelector(".product-brand")?.textContent,
    ];
    for (const candidate of candidates) {
      const normalized = normaliseText(candidate);
      if (normalized) return normalized.charAt(0).toUpperCase();
    }
    return "•";
  };

  const BOOLEAN_TRUE_TOKENS = ["true", "1", "yes", "y", "on"];
  const BOOLEAN_FALSE_TOKENS = ["false", "0", "no", "n", "off", "blocked", "denied"];

  const parseBooleanish = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (Number.isNaN(value)) return null;
      return value !== 0;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return null;
      if (BOOLEAN_TRUE_TOKENS.includes(normalized)) return true;
      if (BOOLEAN_FALSE_TOKENS.includes(normalized)) return false;
      return null;
    }
    return null;
  };

  const tryParseJson = (value) => {
    if (value == null) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^[[{]/.test(trimmed)) return null;
    try {
      return JSON.parse(trimmed);
    } catch (err) {
      console.warn("Failed to parse dispense metadata", err);
      return null;
    }
  };

  const walkPayload = (payload, visitor) => {
    const queue = [];
    if (Array.isArray(payload)) queue.push(...payload);
    else if (payload !== null && payload !== undefined) queue.push(payload);
    const seen = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (current === null || current === undefined) continue;
      if (typeof current === "object") {
        if (seen.has(current)) continue;
        seen.add(current);
        if (visitor(current) === true) return;
        Object.values(current).forEach((value) => {
          if (value && typeof value === "object") queue.push(value);
          else if (value !== null && value !== undefined) queue.push(value);
        });
      } else {
        if (visitor(current) === true) return;
      }
    }
  };

  const extractBooleanFromPayload = (payload, keys) => {
    let result = null;
    if (!payload) return result;
    walkPayload(payload, (node) => {
      if (typeof node === "object" && !Array.isArray(node)) {
        for (const key of keys) {
          if (key in node) {
            const bool = parseBooleanish(node[key]);
            if (bool !== null) {
              result = bool;
              return true;
            }
          }
        }
      } else {
        const bool = parseBooleanish(node);
        if (bool !== null) {
          result = bool;
          return true;
        }
      }
      return false;
    });
    return result;
  };

  const extractTextFromPayload = (payload, keys) => {
    let result = "";
    if (!payload) return result;
    walkPayload(payload, (node) => {
      if (typeof node === "object" && !Array.isArray(node)) {
        for (const key of keys) {
          if (key in node) {
            const value = node[key];
            if (typeof value === "string") {
              const sanitized = sanitizeRestrictionValue(value);
              if (sanitized) {
                result = sanitized;
                return true;
              }
            } else if (value !== null && value !== undefined) {
              const nested = extractTextFromPayload(value, keys);
              if (nested) {
                result = nested;
                return true;
              }
            }
          }
        }
      } else if (typeof node === "string") {
        const sanitized = sanitizeRestrictionValue(node);
        if (sanitized) {
          result = sanitized;
          return true;
        }
      }
      return false;
    });
    return result;
  };

  const parseCanDispense = (value, payloadHint) => {
    const payload = payloadHint ?? tryParseJson(value);
    const payloadBoolean = extractBooleanFromPayload(payload, [
      "canDispense",
      "can_dispense",
      "dispensable",
      "isDispensable",
      "allowed",
      "available",
      "value",
      "status",
    ]);
    if (payloadBoolean !== null) return payloadBoolean;
    const fallback = parseBooleanish(value);
    if (fallback !== null) return fallback;
    return true;
  };

  const resolveScriptRestriction = (card) => {
    if (!card) {
      return {
        canDispense: true,
        reason: "",
        nextDispenseDate: "",
      };
    }

    const dataset = card.dataset || {};
    const payload = tryParseJson(dataset?.canDispense);

    const reasonFromDataset =
      sanitizeRestrictionValue(dataset?.cantDispenseReason) ||
      sanitizeRestrictionValue(dataset?.reasonCantDispense);
    const reasonFromPayload = extractTextFromPayload(payload, [
      "cantDispenseReason",
      "reasonCantDispense",
      "reason",
      "message",
      "note",
      "details",
    ]);

    const nextDispenseFromDataset = sanitizeRestrictionValue(
      dataset?.nextDispenseDate
    );
    const nextDispenseFromPayload = extractTextFromPayload(payload, [
      "nextDispenseDate",
      "nextDispense",
      "availableFrom",
      "availableAt",
    ]);

    const canDispense = parseCanDispense(dataset?.canDispense, payload);

    return {
      canDispense,
      reason: reasonFromDataset || reasonFromPayload,
      nextDispenseDate: nextDispenseFromDataset || nextDispenseFromPayload,
    };
  };

  const filterProducts = (query) => {
    const q = (query || "").trim().toLowerCase();
    let matches = 0;
    document.querySelectorAll(".product-card").forEach((card) => {
      const name =
        card.querySelector(".product-name")?.textContent?.toLowerCase() || "";
      const brand =
        card.querySelector(".product-brand")?.textContent?.toLowerCase() || "";
      const show = !q || name.includes(q) || brand.includes(q);
      card.classList.toggle("hidden", !show);
      if (show) matches++;
    });
    if (clearEl) clearEl.classList.toggle("hidden", !q);
    if (emptyEl) emptyEl.classList.toggle("hidden", !!matches || !q);
  };

  if (searchEl)
    searchEl.addEventListener(
      "input",
      debounce((e) => filterProducts(e.target.value), 120)
    );

  if (clearEl)
    clearEl.addEventListener("click", () => {
      if (searchEl) searchEl.value = "";
      filterProducts("");
      searchEl?.focus();
    });

  const isRealProductCard = (card) => {
    if (!card) return false;
    const id = card.dataset?.productId?.trim() || "";
    if (id && !/^[\[\]]/.test(id)) return true;
    const datasetName = card.dataset?.productName?.trim() || "";
    if (datasetName && !/\[[^\]]*\]/.test(datasetName)) return true;
    const nameText =
      card.querySelector(".product-name")?.textContent?.trim() || "";
    if (nameText && !/\[[^\]]*\]/.test(nameText)) return true;
    return false;
  };

  const hasRealProducts = () =>
    Array.from(document.querySelectorAll(".product-card")).some(
      isRealProductCard
    );

  const hasRealScripts = () => {
    const scriptsGrid = document.getElementById("catalog-scripts-grid");
    if (!scriptsGrid) return false;
    return Array.from(scriptsGrid.querySelectorAll(".product-card")).some(
      isRealProductCard
    );
  };

  const syncScriptsTabVisibility = () => {
    const scriptTab = document.getElementById("catalog-tab-scripts");
    if (!scriptTab) return;
    const itemsTab = document.getElementById("catalog-tab-items");
    const hasScripts = hasRealScripts();
    const wasActive = scriptTab.getAttribute("aria-selected") === "true";

    if (hasScripts) {
      scriptTab.removeAttribute("hidden");
      scriptTab.classList.remove("hidden");
      scriptTab.removeAttribute("aria-hidden");
      scriptTab.removeAttribute("tabindex");
      return;
    }

    scriptTab.setAttribute("aria-selected", "false");
    scriptTab.setAttribute("aria-hidden", "true");
    scriptTab.setAttribute("tabindex", "-1");
    scriptTab.classList.add("hidden");
    scriptTab.setAttribute("hidden", "true");

    if (wasActive && itemsTab) {
      itemsTab.click();
    }
  };

  const maybeHideLoader = () => {
    if (!isCatalogPage) return;
    if (hasRealProducts()) hideLoader();
  };

  const ensureReasonElement = (actions) => {
    if (!actions) return null;
    let msg = actions.querySelector(".cant-dispense-msg");
    if (!msg) {
      msg = document.createElement("p");
      msg.className =
        "cant-dispense-msg text-[12px] font-semibold text-red-600 leading-snug w-full";
      msg.style.display = "none";
      actions.appendChild(msg);
    }
    return msg;
  };

  const applyDispensableLayout = (actions, viewBtn) => {
    if (!actions) return;
    actions.classList.add("flex");
    actions.classList.remove("flex-col", "items-stretch", "items-start");
    actions.classList.add("items-center");
    if (viewBtn) viewBtn.classList.remove("w-full");
  };

  const applyNonDispensableLayout = (actions, viewBtn) => {
    if (!actions) return;
    actions.classList.add("flex", "flex-col", "items-stretch", "items-start");
    actions.classList.remove("items-center");
    if (viewBtn) viewBtn.classList.add("w-full");
  };

  const syncScriptDispenseState = () => {
    const scriptsGrid = document.getElementById("catalog-scripts-grid");
    if (!scriptsGrid) return;
    scriptsGrid.querySelectorAll(".product-card").forEach((card) => {
      const { canDispense, reason, nextDispenseDate } =
        resolveScriptRestriction(card);

      const viewBtn = card.querySelector(".view-product-btn");
      const addBtn = card.querySelector(".add-to-cart-btn");
      const actions =
        viewBtn?.parentElement === addBtn?.parentElement
          ? viewBtn?.parentElement
          : viewBtn?.parentElement || addBtn?.parentElement;
      const reasonEl = ensureReasonElement(actions);

      if (!actions || !reasonEl) return;

      if (canDispense) {
        if (viewBtn) viewBtn.classList.remove("hidden");
        if (addBtn) addBtn.classList.remove("hidden");
        applyDispensableLayout(actions, viewBtn);
        reasonEl.replaceChildren();
        reasonEl.textContent = "";
        reasonEl.style.display = "none";
      } else {
        if (viewBtn) viewBtn.classList.remove("hidden");
        if (addBtn) addBtn.classList.add("hidden");
        applyNonDispensableLayout(actions, viewBtn);
        const fallbackReason = "This script is not ready to dispense.";

        const primaryLine = document.createElement("span");
        primaryLine.textContent = (reason || fallbackReason).trim();

        reasonEl.replaceChildren(primaryLine);

        if (nextDispenseDate) {
          reasonEl.appendChild(document.createElement("br"));
          const nextLine = document.createElement("span");
          nextLine.textContent = `Available From - ${nextDispenseDate}`.trim();
          reasonEl.appendChild(nextLine);
        }

        reasonEl.style.display = "";
        const productId = card.dataset?.productId?.trim();
        if (productId && window.Cart?.getItem) {
          const existing = window.Cart.getItem(productId);
          if (existing) {
            window.Cart.removeItem(existing.id || productId).catch((err) => {
              console.warn("Failed to remove non-dispensable script", err);
            });
          }
        }
      }
    });
  };

  const ensureProductImages = () => {
    document.querySelectorAll(".product-card img").forEach((img) => {
      const card = img.closest(".product-card");
      if (!isRealProductCard(card)) return;
      const wrapper = img.closest(".view-product-link") || img.parentElement;
      if (!wrapper) return;
      wrapper.classList.add(
        "relative",
        "overflow-hidden",
        "rounded-2xl",
        "bg-gray-100"
      );
      let fallback = wrapper.querySelector(".product-image-fallback");
      if (!fallback) {
        fallback = document.createElement("div");
        fallback.className =
          "product-image-fallback absolute inset-0 hidden flex items-center justify-center text-2xl font-semibold uppercase text-indigo-600 bg-gradient-to-br from-indigo-50 to-indigo-100";
        fallback.setAttribute("aria-hidden", "true");
        wrapper.appendChild(fallback);
      }

      const updateFallback = () => {
        fallback.textContent = getProductInitial(card);
      };

      const showFallback = () => {
        updateFallback();
        fallback.classList.remove("hidden");
        img.classList.add("opacity-0");
        img.setAttribute("aria-hidden", "true");
      };

      const hideFallback = () => {
        fallback.classList.add("hidden");
        img.classList.remove("opacity-0");
        img.removeAttribute("aria-hidden");
      };

      const evaluateImage = () => {
        updateFallback();
        const srcAttr = img.getAttribute("src")?.trim() || "";
        if (!srcAttr || placeholderTokenRegex.test(srcAttr)) {
          if (img.getAttribute("src") !== PLACEHOLDER_IMAGE) {
            img.setAttribute("src", PLACEHOLDER_IMAGE);
          }
          showFallback();
        } else {
          hideFallback();
        }
      };

      if (!img.dataset?.placeholderBound) {
        img.dataset.placeholderBound = "true";
        img.addEventListener("error", () => {
          showFallback();
        });
        img.addEventListener("load", () => {
          evaluateImage();
        });
      }

      evaluateImage();
    });
  };

  let mutationScheduled = false;
  const scheduleSync = () => {
    if (mutationScheduled) return;
    mutationScheduled = true;
    requestAnimationFrame(() => {
      mutationScheduled = false;
      window.StorefrontCartUI?.syncAddButtons?.();
      syncScriptDispenseState();
      ensureProductImages();
      syncScriptsTabVisibility();
      if (searchEl) filterProducts(searchEl.value);
      maybeHideLoader();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  const grid = document.querySelector("[data-dynamic-list]");
  const scriptsGrid = document.getElementById("catalog-scripts-grid");
  if (grid)
    observer.observe(grid, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  if (scriptsGrid && scriptsGrid !== grid)
    observer.observe(scriptsGrid, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  if (!grid && !scriptsGrid)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

  const init = () => {
    scheduleSync();
    filterProducts(searchEl?.value || "");
    maybeHideLoader();
    ensureProductImages();
    syncScriptsTabVisibility();
    if (isCatalogPage) setTimeout(() => hideLoader(), 6000);
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();

  window.addEventListener("load", () => {
    scheduleSync();
    maybeHideLoader();
  }, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleSync();
      maybeHideLoader();
    }
  });
  window.addEventListener("pageshow", () => {
    scheduleSync();
    maybeHideLoader();
  });

  const resolveProductDetailUrl = (view, productId) => {
    const rawHref =
      (typeof view?.getAttribute === "function" && view.getAttribute("href")) ||
      (typeof view?.dataset?.href === "string" ? view.dataset.href : "");

    const buildUrl = (base) => {
      try {
        return new URL(base, window.location.href);
      } catch {
        try {
          return new URL(base, window.location.origin);
        } catch {
          return null;
        }
      }
    };

    let url = null;
    if (rawHref) {
      url = buildUrl(rawHref);
    }

    if (!url) {
      url = buildUrl("product.html");
    }

    if (!url) return null;

    const productIdStr = productId != null ? String(productId) : "";
    const pathSegments = url.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      });
    const pathAlreadyHasId =
      productIdStr && pathSegments.includes(productIdStr);

    if (productIdStr && !pathAlreadyHasId) {
      const isHtmlPath = /product\.html?$/i.test(url.pathname);
      if (isHtmlPath) {
        if (!url.searchParams.has("id")) {
          url.searchParams.set("id", productIdStr);
        }
      } else if (/product-detail\/?$/i.test(url.pathname)) {
        url.pathname = `${url.pathname.replace(/\/?$/, "/")}${encodeURIComponent(
          productIdStr
        )}`;
      } else if (url.pathname.endsWith("/")) {
        url.pathname = `${url.pathname}${encodeURIComponent(productIdStr)}`;
      } else if (!url.searchParams.has("id")) {
        url.searchParams.set("id", productIdStr);
      }
    }

    return url;
  };

  document.addEventListener("click", (event) => {
    const view = event.target.closest(".view-product-btn, .view-product-link");
    if (!view) return;
    const card = view.closest(".product-card");
    if (!card) return;
    const product = window.StorefrontCartUI?.extractProduct?.(card);
    if (product && window.Cart?.saveProductSnapshot) {
      Cart.saveProductSnapshot(product);
    }

    if (product && product.id) {
      const url = resolveProductDetailUrl(view, product.id);
      if (!url) return;
      event.preventDefault();
      const scriptIdRaw = card.dataset?.scriptId || card.dataset?.scriptID;
      const scriptId = scriptIdRaw ? String(scriptIdRaw).trim() : "";
      if (scriptId) {
        url.searchParams.set("script", "1");
        url.searchParams.set("scriptId", scriptId);
        const { canDispense, reason, nextDispenseDate } =
          resolveScriptRestriction(card);
        if (!canDispense) {
          url.searchParams.set("cantDispense", "1");
          if (reason) url.searchParams.set("cantDispenseReason", reason);
          if (nextDispenseDate)
            url.searchParams.set("nextDispenseDate", nextDispenseDate);
        }
        let scriptInCart = false;
        if (window.Cart?.getItem) {
          try {
            scriptInCart = !!Cart.getItem(product.id);
          } catch (err) {
            console.warn("Failed to resolve script cart match", err);
          }
        }
        if (!scriptInCart && window.Cart?.getState) {
          try {
            const state = Cart.getState();
            if (state && Array.isArray(state.items)) {
              scriptInCart = state.items.some((item) => {
                if (!item) return false;
                const candidate = String(item.scriptId || item.script_id || "").trim();
                return candidate && candidate === scriptId;
              });
            }
          } catch (err) {
            console.warn("Failed to inspect cart state for script", err);
          }
        }
        if (scriptInCart) {
          url.searchParams.set("added", "1");
        }
      }

      if (typeof view?.setAttribute === "function") {
        try {
          view.setAttribute("href", url.toString());
        } catch {
          /* ignore */
        }
      }

      window.location.href = url.toString();
    }
  });
})();
