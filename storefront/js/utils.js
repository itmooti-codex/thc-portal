(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);
  const money = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "AUD",
    }).format(n || 0);
  const toNum = (s) => Number(String(s || "").replace(/[^0-9.\-]/g, "")) || 0;
  const clamp = (value, min = 1, max = 99) =>
    Math.max(min, Math.min(max, parseInt(value || String(min), 10) || min));

  const getRootEl = () =>
    document.querySelector(".get-url") ||
    document.body ||
    document.documentElement;
  const getRootData = () => getRootEl()?.dataset || {};

  let pageLoaderEl = null;
  const ensurePageLoader = () => {
    if (pageLoaderEl) return pageLoaderEl;
    pageLoaderEl = document.querySelector("[data-page-loader]");
    if (!pageLoaderEl) {
      pageLoaderEl = document.createElement("div");
      pageLoaderEl.dataset.pageLoader = "true";
      pageLoaderEl.className =
        "fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 transition-opacity duration-200 opacity-0 pointer-events-none";
      pageLoaderEl.innerHTML = `
        <div class="flex flex-col items-center gap-3 text-gray-700">
          <svg class="h-10 w-10 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <p data-loader-text class="text-sm font-medium text-gray-600">Loading…</p>
        </div>
      `;
      document.body.appendChild(pageLoaderEl);
    }
    return pageLoaderEl;
  };

  const setPageLoaderMessage = (message) => {
    const el = ensurePageLoader();
    const text = el.querySelector("[data-loader-text]");
    if (text) text.textContent = message || "Loading…";
  };

  const showPageLoader = (message = "Loading…") => {
    const el = ensurePageLoader();
    setPageLoaderMessage(message);
    el.classList.remove("opacity-0", "pointer-events-none");
    el.classList.add("opacity-100");
  };

  const hidePageLoader = () => {
    if (!pageLoaderEl) return;
    pageLoaderEl.classList.add("pointer-events-none");
    pageLoaderEl.classList.add("opacity-0");
    pageLoaderEl.classList.remove("opacity-100");
  };

  const withPageLoader = async (task, message) => {
    if (typeof task !== "function") return Promise.resolve();
    showPageLoader(message);
    try {
      return await task();
    } finally {
      hidePageLoader();
    }
  };

  const initCatalogTabs = () => {
    const tabButtons = $$(".catalog-tab-btn");
    const panels = $$("[data-catalog-panel]");
    if (!tabButtons.length || !panels.length) return;
    const ACTIVE_CLASSES = [
      "bg-neutral-900",
      "text-white",
      "border-neutral-900",
      "hover:bg-neutral-800",
    ];
    const INACTIVE_CLASSES = [
      "bg-white",
      "text-gray-700",
      "border-gray-300",
      "hover:bg-gray-100",
    ];
    const setActiveTab = (target) => {
      if (!target) return;
      const hasTarget = panels.some(
        (panel) => panel.dataset.catalogPanel === target
      );
      if (!hasTarget) return;
      panels.forEach((panel) => {
        const isActive = panel.dataset.catalogPanel === target;
        panel.setAttribute("aria-hidden", String(!isActive));
        panel.hidden = !isActive;
        panel.classList.toggle("hidden", !isActive);
        if (isActive) {
          panel.removeAttribute("tabindex");
          panel.style.removeProperty("display");
        } else {
          panel.setAttribute("tabindex", "-1");
          panel.style.setProperty("display", "none", "important");
        }
      });
      tabButtons.forEach((btn) => {
        const isActive = btn.dataset.catalogTab === target;
        btn.setAttribute("aria-selected", String(isActive));
        ACTIVE_CLASSES.forEach((cls) => btn.classList.toggle(cls, isActive));
        INACTIVE_CLASSES.forEach((cls) => btn.classList.toggle(cls, !isActive));
      });
    };
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.catalogTab));
    });
    const initialTab =
      tabButtons.find((btn) => btn.getAttribute("aria-selected") === "true") ||
      tabButtons[0];
    setActiveTab(initialTab?.dataset.catalogTab);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCatalogTabs);
  } else {
    initCatalogTabs();
  }
  window.StorefrontUtils = Object.assign(window.StorefrontUtils || {}, {
    $,
    $$,
    byId,
    money,
    toNum,
    clamp,
    getRootEl,
    getRootData,
    showPageLoader,
    hidePageLoader,
    withPageLoader,
    setPageLoaderMessage,
  });
})();
