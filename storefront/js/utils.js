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
        "fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-200 opacity-0 pointer-events-none";
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

  let toastHost = null;

  const extractToastMessage = (payload) => {
    if (!payload || typeof payload !== "object") return "";
    const candidateKeys = [
      "message",
      "error",
      "details",
      "detail",
      "description",
      "friendlyMessage",
      "statusText",
    ];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    if (Array.isArray(payload.errors)) {
      const joined = payload.errors
        .map((item) => {
          if (typeof item === "string" && item.trim()) return item.trim();
          if (item && typeof item === "object") {
            const msg =
              (typeof item.message === "string" && item.message.trim()) ||
              (typeof item.details === "string" && item.details.trim()) ||
              "";
            return msg;
          }
          return "";
        })
        .filter(Boolean)
        .join(", ");
      if (joined) return joined;
    }
    return "";
  };

  const normaliseToastMessage = (message) => {
    if (message === null || message === undefined) return "";
    if (typeof message === "string") return message.trim();
    if (message instanceof Error) {
      return message.message ? message.message.trim() : "";
    }
    if (typeof message === "number" || typeof message === "boolean") {
      return String(message);
    }
    if (typeof message === "object") {
      const extracted =
        extractToastMessage(message) ||
        extractToastMessage(message.data) ||
        extractToastMessage(message.response);
      if (extracted && extracted.trim()) return extracted.trim();
      if (
        typeof message.toString === "function" &&
        message.toString !== Object.prototype.toString
      ) {
        const asString = message.toString();
        if (
          typeof asString === "string" &&
          asString.trim() &&
          asString.trim() !== "[object Object]"
        ) {
          return asString.trim();
        }
      }
      return "";
    }
    return String(message);
  };

  const ensureToastHost = () => {
    if (toastHost) return toastHost;
    toastHost = document.createElement("div");
    toastHost.className =
      "fixed inset-x-0 bottom-4 z-[10000] flex flex-col items-center gap-2";
    document.body.appendChild(toastHost);
    return toastHost;
  };

  const showToast = (message, options = {}) => {
    const resolvedMessage = normaliseToastMessage(message);
    if (!resolvedMessage) return null;
    const host = ensureToastHost();
    const {
      type = "info",
      duration = 4000,
    } = options;
    const baseClasses =
      "pointer-events-auto max-w-md w-auto px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition transform duration-150 flex items-center gap-3";
    const typeClasses = {
      success: "bg-emerald-600/95 text-white border-emerald-500",
      error: "bg-red-600/95 text-white border-red-500",
      warning: "bg-amber-500/95 text-white border-amber-400",
      info: "bg-neutral-900/95 text-white border-neutral-800",
    };
    const toast = document.createElement("div");
    toast.className = `${baseClasses} ${typeClasses[type] || typeClasses.info} opacity-0 translate-y-2`;
    toast.textContent = resolvedMessage;
    host.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove("opacity-0", "translate-y-2");
      toast.classList.add("opacity-100", "translate-y-0");
    });
    const timeout = Number(duration) > 0 ? Number(duration) : 4000;
    const remove = () => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "-translate-y-1");
      setTimeout(() => {
        toast.remove();
      }, 180);
    };
    const timer = setTimeout(remove, timeout);
    toast.addEventListener("click", () => {
      clearTimeout(timer);
      remove();
    });
    return toast;
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
        panel.classList.toggle("catalog-panel-hidden", !isActive);
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
    showToast,
  });
})();
