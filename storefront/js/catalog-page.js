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

  let mutationScheduled = false;
  const scheduleSync = () => {
    if (mutationScheduled) return;
    mutationScheduled = true;
    requestAnimationFrame(() => {
      mutationScheduled = false;
      window.StorefrontCartUI?.syncAddButtons?.();
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
      event.preventDefault();
      const url = new URL("product.html", window.location.origin);
      url.searchParams.set("id", String(product.id));
      window.location.href = url.toString();
    }
  });
})();
