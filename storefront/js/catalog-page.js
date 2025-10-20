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

  const hasRealProducts = () =>
    Array.from(document.querySelectorAll(".product-card")).some((card) => {
      const id = card.dataset?.productId || "";
      const name = card.querySelector(".product-name")?.textContent?.trim();
      return (
        (id && !/^[\[\]]/.test(id)) ||
        (name && !/\[[^\]]*\]/.test(name || ""))
      );
    });

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

  const parseCanDispense = (value) => {
    if (value == null) return true;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
    return true;
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
      const canDispense = parseCanDispense(card.dataset?.canDispense);
      const reason = card.dataset?.cantDispenseReason?.trim();
      const nextDispenseDate = card.dataset?.nextDispenseDate?.trim();

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

  const isRealProductCard = (card) => {
    if (!card) return false;
    const id = card.dataset?.productId?.trim() || "";
    if (id && !placeholderTokenRegex.test(id)) return true;
    const datasetName = card.dataset?.productName?.trim() || "";
    if (datasetName && !placeholderTokenRegex.test(datasetName)) return true;
    const nameText =
      card.querySelector(".product-name")?.textContent?.trim() || "";
    if (nameText && !placeholderTokenRegex.test(nameText)) return true;
    return false;
  };

  const ensureProductImages = () => {
    document.querySelectorAll(".product-card img").forEach((img) => {
      const card = img.closest(".product-card");
      if (!isRealProductCard(card)) return;
      const bindFallback = () => {
        if (img.getAttribute("src") !== PLACEHOLDER_IMAGE) {
          img.setAttribute("src", PLACEHOLDER_IMAGE);
        }
      };
      if (!img.dataset?.placeholderBound) {
        img.dataset.placeholderBound = "true";
        img.addEventListener("error", () => {
          bindFallback();
        });
      }
      const srcAttr = img.getAttribute("src")?.trim() || "";
      if (!srcAttr || placeholderTokenRegex.test(srcAttr)) {
        bindFallback();
      }
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
      if (searchEl) filterProducts(searchEl.value);
      maybeHideLoader();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  const grid = document.querySelector("[data-dynamic-list]");
  if (grid)
    observer.observe(grid, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  else
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

  const init = () => {
    scheduleSync();
    filterProducts(searchEl?.value || "");
    maybeHideLoader();
    ensureProductImages();
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
      const scriptId = card.dataset?.scriptId || card.dataset?.scriptID;
      if (scriptId) {
        url.searchParams.set("script", "1");
        const canDispenseAttr = card.dataset?.canDispense;
        const canDispense = parseCanDispense(canDispenseAttr);
        if (!canDispense) {
          url.searchParams.set("cantDispense", "1");
          const reason = card.dataset?.cantDispenseReason
            ? card.dataset.cantDispenseReason.trim()
            : "";
          const nextDispenseDate = card.dataset?.nextDispenseDate
            ? card.dataset.nextDispenseDate.trim()
            : "";
          if (reason) url.searchParams.set("cantDispenseReason", reason);
          if (nextDispenseDate)
            url.searchParams.set("nextDispenseDate", nextDispenseDate);
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
