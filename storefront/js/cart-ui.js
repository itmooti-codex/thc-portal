(() => {
  "use strict";

  const CART_TEMPLATE = `
<div class="storefront-cart-root">
  <div class="cart-overlay fixed inset-0 z-[9990] bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200"></div>
  <aside
    class="cart-drawer fixed inset-y-0 right-0 h-[100dvh] w-full max-w-md bg-white shadow-2xl translate-x-full transition-transform duration-300 flex flex-col z-[9991]">
    <header class="flex items-center justify-between p-4 border-b">
      <div>
        <h2 class="text-xl font-semibold">Shopping cart</h2>
        <p class="text-sm text-gray-500">Review your items before checkout</p>
      </div>
      <button class="close-cart inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100"
        aria-label="Close cart">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" class="w-5 h-5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </header>

    <section class="flex-1 overflow-y-auto">
      <div class="cart-items divide-y">
        <div class="p-6 text-center text-gray-500">Your cart is empty.</div>
      </div>
    </section>

    <footer class="border-t p-4 space-y-4">
      <div class="space-y-1">
        <div class="flex justify-between text-sm"><span>Subtotal (incl GST)</span><span class="cart-subtotal">$0.00</span></div>
        <div class="cart-subtotal-breakdown mt-1 space-y-1 text-xs text-gray-500 hidden"></div>
      </div>
      <div class="flex justify-between text-sm"><span>Shipping (incl GST)</span><span class="cart-shipping font-medium">Select shipping</span></div>
      <div class="flex justify-between text-sm"><span>Credit card fee (incl GST)</span><span class="cart-processing font-medium">$0.00</span></div>
      <div class="flex justify-between text-sm"><span>GST Only Total</span><span class="cart-gst font-medium">$0.00</span></div>
      <div class="flex justify-between text-sm"><span>Discount</span><span class="cart-discount font-medium text-emerald-600">-$0.00</span></div>
      <div class="flex justify-between text-base font-bold"><span>Total (incl GST)</span><span class="cart-total">$0.00</span></div>
      <p class="cart-processing-note text-xs text-gray-500 leading-snug hidden"></p>
      <div class="flex items-center justify-between gap-3">
        <button class="clear-cart px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100">Clear Cart</button>
        <button class="cart-checkout px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Proceed to checkout</button>
      </div>
    </footer>
  </aside>
</div>`;

  /* ========= helpers ========= */
  const { $, $$, money, toNum } = window.StorefrontUtils || {};
  const fallback$ = (sel, ctx = document) => ctx.querySelector(sel);
  const fallback$$ = (sel, ctx = document) =>
    Array.from(ctx.querySelectorAll(sel));
  const $use = $ || fallback$;
  const $$use = $$ || fallback$$;

  const initialConfig =
    (window.StorefrontCartUI && window.StorefrontCartUI.config) ||
    window.StorefrontCartConfig ||
    {};

const config = Object.assign(
  {
    checkoutUrl:
      document.querySelector(".get-url")?.dataset?.checkoutUrl ||
      document.body?.dataset?.checkoutUrl ||
      initialConfig.checkoutUrl ||
      "checkout.html",
  },
  initialConfig
);

// Debug flag (enable via ?sfDebug=1 or <body data-sf-debug="1">)
const DEBUG = (() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("sfDebug") === "1") return true;
    } catch {}
    try {
      const root = document.querySelector(".get-url");
      return root?.dataset?.sfDebug === "1";
    } catch {
      return false;
    }
})();

const dlog = (...args) => {
  if (!DEBUG) return;
  try {
    console.debug("[SF-CartUI]", ...args);
  } catch {}
};

  const debugLog = (...args) => {
    if (typeof window !== "undefined" && window.__CHECKOUT_DEBUG) {
      try {
        console.log("[CartUI]", ...args);
      } catch {}
    }
  };

  const getDispenseService = () => {
    try {
      return window.DispenseService || null;
    } catch {
      return null;
    }
  };

  const DEFAULT_DISPENSE_STATUS_IDS = {
    CANCELLED: "146",
    IN_CART: "149",
    PAID: "152",
  };
  const DEFAULT_DISPENSE_STATUS_LABELS = {
    "146": "Cancelled",
    "149": "In Cart",
    "152": "Paid",
  };

  const suppressedScriptIds = new Set();
  const seededItemDispenseIds = new Set();
  const pendingItemDispenseSeeds = [];

  const parseCanDispenseFlag = (value) => {
    if (value == null) return true;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return true;
    return !["false", "0", "no", "n"].includes(normalized);
  };

  const placeholderTokenRegex = /^\s*\[[^\]]*\]\s*$/;
  const isMeaningfulText = (value) =>
    typeof value === "string" &&
    value.trim() !== "" &&
    !placeholderTokenRegex.test(value);
  const isMeaningfulImage = (value) =>
    typeof value === "string" &&
    value.trim() !== "" &&
    !placeholderTokenRegex.test(value);

  const CARD_FEE_RATE = 0.018;
  const DEFAULT_TAX_RATE = 0.1;

  const normaliseTaxRate = (value) => {
    if (value === null || value === undefined || value === "") return undefined;
    const num = Number(value);
    if (!Number.isFinite(num)) return undefined;
    if (num > 1) return num / 100;
    if (num < 0) return undefined;
    return num;
  };

  const roundCurrency = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

  const formatMoney = (value) =>
    typeof money === "function"
      ? money(value)
      : `$${(Number(value) || 0).toFixed(2)}`;

  const formatTaxPercent = (rate) => {
    if (!Number.isFinite(rate)) return "";
    const percent = rate * 100;
    if (!Number.isFinite(percent)) return "";
    return percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2);
  };

  const getCartTaxRate = () => {
    const summaryRate = normaliseTaxRate(
      window.__checkoutTotals?.cardFeeTaxRate ??
        window.__checkoutTotals?.taxRate
    );
    if (summaryRate !== undefined) return summaryRate;
    const configRate = normaliseTaxRate(
      window.StorefrontConfig?.shippingTaxRate ??
        window.StorefrontConfig?.shippingTaxPercentage
    );
    if (configRate !== undefined) return configRate;
    return DEFAULT_TAX_RATE;
  };

  const formatCardFeeNote = (exGst, gst, rate) => {
    if (!Number.isFinite(exGst) || exGst <= 0) return "";
    const gstAmount = Number.isFinite(gst) ? gst : 0;
    const effectiveRate = Number.isFinite(rate) ? rate : getCartTaxRate();
    const percentLabel = formatTaxPercent(effectiveRate);
    const gstLabel = percentLabel ? `${percentLabel}% GST` : "GST";
    const total = roundCurrency(exGst + gstAmount);
    return `This transaction includes a credit card processing fee of 1.8% of the order amount (products and shipping). Credit card fee = ${formatMoney(exGst)} + ${gstLabel} ${formatMoney(gstAmount)} = ${formatMoney(total)}.`;
  };

  const escapeHtml = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const getAvatarInitial = (name) => {
    if (name === null || name === undefined) return "•";
    const str = String(name).trim();
    return str ? str.charAt(0).toUpperCase() : "•";
  };

  const renderAvatarHtml = (
    image,
    name,
    {
      sizeClasses = "w-16 h-16",
      shapeClasses = "rounded-xl",
      imageClasses = "",
      fallbackClasses = "",
      fallbackTextClass = "text-lg",
    } = {}
  ) => {
    const baseClasses = [sizeClasses, shapeClasses].filter(Boolean).join(" ").trim();
    const alt = escapeHtml(name || "Product");
    if (isMeaningfulImage(image)) {
      const src = escapeHtml(String(image).trim());
      const imgClass = [
        baseClasses,
        "object-cover bg-gray-100",
        imageClasses,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      return `<img src="${src}" alt="${alt}" class="${imgClass}" />`;
    }
    const fallbackClass = [
      baseClasses,
      "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center font-semibold uppercase",
      fallbackTextClass,
      fallbackClasses,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const initial = escapeHtml(getAvatarInitial(name));
    return `<div class="${fallbackClass}" aria-hidden="true">${initial}</div>`;
  };

  const renderSubtotalBreakdown = (container, breakdown) => {
    if (!container) return;
    container.innerHTML = "";
    const items = Array.isArray(breakdown)
      ? breakdown.filter((item) => item && Number.isFinite(item.lineTotal))
      : [];
    if (!items.length) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "flex items-start justify-between gap-2";
      const label = document.createElement("span");
      label.className = "truncate";
      const quantity = Number(item.quantity) || 0;
      const qtyLabel = quantity > 1 ? ` ×${quantity}` : "";
      const taxAmount = Number.isFinite(item.taxAmount)
        ? item.taxAmount
        : Number.isFinite(item.lineTax)
        ? item.lineTax
        : 0;
      const name = item.name ? String(item.name).trim() : "Item";
      label.textContent = `${name}${qtyLabel} (Incl ${formatMoney(
        taxAmount
      )} GST)`;
      const value = document.createElement("span");
      value.className = "font-medium text-gray-900";
      const lineTotal = Number.isFinite(item.lineTotalBeforeDiscount)
        ? item.lineTotalBeforeDiscount
        : Number.isFinite(item.lineTotal)
        ? item.lineTotal
        : Number.isFinite(item.totalIncl)
        ? item.totalIncl
        : Number.isFinite(item.lineTotalIncl)
        ? item.lineTotalIncl
        : 0;
      value.textContent = formatMoney(lineTotal);
      row.appendChild(label);
      row.appendChild(value);
      container.appendChild(row);
    });
  };

  const buildFallbackItemBreakdown = (items = [], taxRate, targetTax) => {
    const rate = Number.isFinite(taxRate) ? taxRate : getCartTaxRate();
    const breakdown = [];
    items.forEach((item, index) => {
      if (!item) return;
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      if (price <= 0 || qty <= 0) return;
      const lineEx = roundCurrency(price * qty);
      if (lineEx <= 0) return;
      const taxable = parseBooleanish(item.taxable) === true;
      const entry = {
        id: item.id,
        name: item.name,
        quantity: qty,
        taxable,
        lineEx,
        lineDiscount: 0,
        lineExAfterDiscount: lineEx,
        taxAmount: taxable ? roundCurrency(lineEx * rate) : 0,
        index,
      };
      entry.lineTotal = roundCurrency(entry.lineExAfterDiscount + entry.taxAmount);
      entry.lineTaxBeforeDiscount = entry.taxAmount;
      entry.lineTotalBeforeDiscount = entry.lineTotal;
      breakdown.push(entry);
    });
    const taxableEntries = breakdown.filter((entry) => entry.taxable);
    const target = Number.isFinite(targetTax)
      ? roundCurrency(targetTax)
      : roundCurrency(
          taxableEntries.reduce((sum, entry) => sum + entry.lineExAfterDiscount, 0) *
            rate
        );
    const current = roundCurrency(
      taxableEntries.reduce((sum, entry) => sum + entry.taxAmount, 0)
    );
    const diff = roundCurrency(target - current);
    if (diff !== 0 && taxableEntries.length) {
      const last = taxableEntries[taxableEntries.length - 1];
      last.taxAmount = roundCurrency(Math.max(last.taxAmount + diff, 0));
      last.lineTotal = roundCurrency(last.lineExAfterDiscount + last.taxAmount);
    }
    return breakdown
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        quantity: entry.quantity,
        taxable: entry.taxable,
        lineEx: entry.lineEx,
        lineDiscount: entry.lineDiscount,
        lineExAfterDiscount: entry.lineExAfterDiscount,
        taxAmount: entry.taxAmount,
        lineTotal: entry.lineTotal,
        lineTaxBeforeDiscount: entry.lineTaxBeforeDiscount,
        lineTotalBeforeDiscount: entry.lineTotalBeforeDiscount,
        index: entry.index,
      }))
      .sort((a, b) => a.index - b.index);
  };

  const computeDrawerFallbackTotals = (state) => {
    const items = Array.isArray(state?.items) ? state.items : [];
    const subtotal = roundCurrency(
      items.reduce(
        (total, item) =>
          total + (Number(item.price) || 0) * (Number(item.qty) || 0),
        0
      )
    );
    const taxRate = getCartTaxRate();
    let taxableSubtotalRaw = 0;
    items.forEach((item) => {
      if (!item || parseBooleanish(item.taxable) !== true) return;
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      if (price <= 0 || qty <= 0) return;
      taxableSubtotalRaw += price * qty;
    });
    const itemTaxBase = roundCurrency(taxableSubtotalRaw * taxRate);
    const subtotalWithItemTax = roundCurrency(subtotal + itemTaxBase);
    const shippingWithGst = 0;
    const cardFeeBase = subtotalWithItemTax + shippingWithGst;
    const cardFeeExGst =
      cardFeeBase > 0 ? roundCurrency(cardFeeBase * CARD_FEE_RATE) : 0;
    const cardFeeGst = cardFeeExGst > 0 ? roundCurrency(cardFeeExGst * taxRate) : 0;
    const cardFeeTotal = roundCurrency(cardFeeExGst + cardFeeGst);
    const taxTotal = roundCurrency(itemTaxBase + cardFeeGst);
    const totalBeforeDiscount = roundCurrency(
      subtotalWithItemTax + shippingWithGst + cardFeeTotal
    );
    const total = totalBeforeDiscount;
    const itemBreakdown = buildFallbackItemBreakdown(items, taxRate, itemTaxBase);
    return {
      subtotal,
      subtotalWithItemTax,
      shippingLabel: "Select shipping",
      cardFeeExGst,
      cardFeeGst,
      cardFeeTotal,
      taxTotal,
      total,
      totalBeforeDiscount,
      discountDisplay: "-$0.00",
      processingNote: formatCardFeeNote(cardFeeExGst, cardFeeGst, taxRate),
      cardFeeTaxRate: taxRate,
      itemBreakdown,
    };
  };

  const getContactId = () => {
    try {
      const config = window.StorefrontConfig || {};
      const candidates = [
        config.loggedInContactId,
        config.contactId,
        config.customerId,
        config.userId,
        config.memberId,
      ];
      for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) {
          const value = String(candidate).trim();
          if (value) return value;
        }
      }
    } catch {}
    try {
      const root = document.querySelector(".get-url");
      const dataset = root?.dataset || {};
      const candidates = [
        dataset.contactId,
        dataset.contactid,
        dataset.contact,
        dataset.userId,
        dataset.userid,
      ];
      for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) {
          const value = String(candidate).trim();
          if (value) return value;
        }
      }
    } catch {}
    return null;
  };

  const resolveDispenseStatusId = (value) => {
    const service = getDispenseService();
    const statusIds = Object.assign(
      {},
      DEFAULT_DISPENSE_STATUS_IDS,
      service?.statusIds || {}
    );
    const statusLabels = Object.assign(
      {},
      DEFAULT_DISPENSE_STATUS_LABELS,
      service?.statusLabels || {}
    );
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (statusLabels[raw]) return raw;
    const upper = raw.toUpperCase();
    if (statusIds[upper]) return statusIds[upper];
    const lower = raw.toLowerCase();
    const fromLabels = Object.entries(statusLabels).find(
      ([, label]) => typeof label === "string" && label.toLowerCase() === lower
    );
    if (fromLabels) return fromLabels[0];
    return null;
  };

  const getDispenseStatusLabel = (statusIdOrLabel) => {
    const service = getDispenseService();
    const statusLabels = Object.assign(
      {},
      DEFAULT_DISPENSE_STATUS_LABELS,
      service?.statusLabels || {}
    );
    if (!statusIdOrLabel && statusIdOrLabel !== 0) return null;
    const raw = String(statusIdOrLabel).trim();
    if (!raw) return null;
    if (statusLabels[raw]) return statusLabels[raw];
    const lower = raw.toLowerCase();
    const match = Object.entries(statusLabels).find(
      ([, label]) => typeof label === "string" && label.toLowerCase() === lower
    );
    return match ? match[1] : null;
  };

  const cssEscape = (value) => {
    const str = String(value);
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      try {
        return CSS.escape(str);
      } catch {
        return str.replace(/["\\]/g, "\\$&");
      }
    }
    return str.replace(/["\\]/g, "\\$&");
  };

  const findProductCardByItemId = (itemId) => {
    if (itemId === null || itemId === undefined) return null;
    const raw = String(itemId).trim();
    if (!raw) return null;
    const escaped = cssEscape(raw);
    const selectors = [
      `.product-card[data-item-id="${escaped}"]`,
      `.product-card[data-product-id="${escaped}"]`,
      `.product-card[data-product-payment-id="${escaped}"]`,
      `[data-item-id="${escaped}"]`,
      `[data-product-id="${escaped}"]`,
      `[data-product-payment-id="${escaped}"]`,
    ];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const card = node.closest(".product-card");
      if (card) return card;
    }
    return null;
  };

  const updateProductCardDataset = (productIds, patch = {}, options = {}) => {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    let updated = false;
    ids.forEach((id) => {
      if (!id && id !== 0) return;
      const canonicalId = String(id);
      const scriptIdFromPatch = Object.prototype.hasOwnProperty.call(
        patch,
        "scriptId"
      )
        ? patch.scriptId
        : undefined;
      if (Object.prototype.hasOwnProperty.call(patch, "suppressAutoSeed")) {
        if (patch.suppressAutoSeed) {
          suppressedScriptIds.add(canonicalId);
          if (scriptIdFromPatch != null && scriptIdFromPatch !== "") {
            suppressedScriptIds.add(String(scriptIdFromPatch));
          }
        } else {
          suppressedScriptIds.delete(canonicalId);
          if (scriptIdFromPatch != null && scriptIdFromPatch !== "") {
            suppressedScriptIds.delete(String(scriptIdFromPatch));
          }
        }
      }
      const selector = `.product-card[data-product-id="${cssEscape(id)}"]`;
      const cards = $$use(selector);
      if (!cards.length) return;
      cards.forEach((card) => {
        if (!card.dataset.scriptId && !patch.force) return;
        if (Object.prototype.hasOwnProperty.call(patch, "dispenseStatus")) {
          const status = patch.dispenseStatus;
          if (status === null || status === undefined || status === "") {
            delete card.dataset.dispenseStatus;
          } else {
            card.dataset.dispenseStatus = String(status);
          }
          updated = true;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "dispenseStatusId")) {
          const statusId = patch.dispenseStatusId;
          if (statusId === null || statusId === undefined || statusId === "") {
            delete card.dataset.dispenseStatusId;
          } else {
            card.dataset.dispenseStatusId = String(statusId);
          }
          updated = true;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "dispenseId")) {
          const dispId = patch.dispenseId;
          if (dispId === null || dispId === undefined || dispId === "") {
            delete card.dataset.dispenseId;
          } else {
            card.dataset.dispenseId = String(dispId);
          }
          updated = true;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "dispenseItemId")) {
          const itemId = patch.dispenseItemId;
          if (itemId === null || itemId === undefined || itemId === "") {
            delete card.dataset.itemId;
          } else {
            card.dataset.itemId = String(itemId);
          }
          updated = true;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "suppressAutoSeed")) {
          if (patch.suppressAutoSeed) {
            card.dataset.dispenseSuppressed = "true";
            if (card.dataset.scriptId) {
              suppressedScriptIds.add(String(card.dataset.scriptId));
            }
          } else {
            delete card.dataset.dispenseSuppressed;
            if (card.dataset.scriptId) {
              suppressedScriptIds.delete(String(card.dataset.scriptId));
            }
          }
          updated = true;
        }
      });
    });
    if (updated && options.syncButtons) {
      setTimeout(() => {
        try {
          syncAddButtons();
        } catch (err) {
          console.error("syncAddButtons failed after dataset update", err);
        }
      }, 0);
    }
  };

  const isCartAuthenticated = () => {
    let authed = false;
    if (typeof window.Cart?.isAuthenticated === "function") {
      try {
        authed = Boolean(window.Cart.isAuthenticated());
      } catch {
        authed = false;
      }
    }
    if (authed) return true;
    try {
      const root = document.querySelector(".get-url");
      if (root?.dataset?.auth === "true") return true;
      const contactAttr =
        root?.dataset?.contactId ||
        root?.dataset?.contactid ||
        root?.dataset?.contact ||
        root?.dataset?.userId;
      if (contactAttr != null && String(contactAttr).trim().length) {
        return true;
      }
    } catch {}
    const cfg = window.StorefrontConfig || {};
    const contactId =
      cfg.loggedInContactId ??
      cfg.contactId ??
      cfg.customerId ??
      cfg.userId ??
      cfg.memberId;
    if (contactId === null || contactId === undefined) return false;
    return String(contactId).trim().length > 0;
  };

  let overlayEl;
  let drawerEl;
  let itemsContainer;
  let subtotalEl;
  let subtotalBreakdownEl;
  let shippingEl;
  let processingEl;
  let gstEl;
  let discountEl;
  let totalEl;
  let processingNoteEl;
  let checkoutBtn;

  const ensureDrawer = () => {
    if (overlayEl && drawerEl && itemsContainer) return;

    overlayEl = document.querySelector(".cart-overlay");
    drawerEl = document.querySelector(".cart-drawer");

    if (!overlayEl || !drawerEl) {
      document.body.insertAdjacentHTML("afterbegin", CART_TEMPLATE);
      overlayEl = document.querySelector(".cart-overlay");
      drawerEl = document.querySelector(".cart-drawer");
    }

    itemsContainer = document.querySelector(".cart-items");
    subtotalEl = document.querySelector(".cart-subtotal");
    subtotalBreakdownEl = document.querySelector(".cart-subtotal-breakdown");
    shippingEl = document.querySelector(".cart-shipping");
    processingEl = document.querySelector(".cart-processing");
    gstEl = document.querySelector(".cart-gst");
    discountEl = document.querySelector(".cart-discount");
    totalEl = document.querySelector(".cart-total");
    processingNoteEl = document.querySelector(".cart-processing-note");
    checkoutBtn = document.querySelector(".cart-checkout");
    dlog("ensureDrawer: elements", {
      hasOverlay: !!overlayEl,
      hasDrawer: !!drawerEl,
    });
  };

  const openCart = () => {
    ensureDrawer();
    if (!overlayEl || !drawerEl) return;
    overlayEl.classList.remove("pointer-events-none");
    overlayEl.classList.add("opacity-100");
    drawerEl.classList.remove("translate-x-full");
  };

  const closeCart = () => {
    ensureDrawer();
    if (!overlayEl || !drawerEl) return;
    overlayEl.classList.add("pointer-events-none");
    overlayEl.classList.remove("opacity-100");
    drawerEl.classList.add("translate-x-full");
  };

  /* ========= product helpers ========= */
  const getProductSignature = (card) => {
    if (!card) return "";
    const name = card.querySelector(".product-name")?.textContent?.trim() || "";
    const brand =
      card.querySelector(".product-brand")?.textContent?.trim() || "";
    const price =
      card.querySelector(".product-price")?.textContent?.trim() || "";
    return `${name}|${brand}|${price}`.trim();
  };

  const generateIdFromSignature = (signature) => {
    const cleaned = signature
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 140);
    return cleaned
      ? `sig:${cleaned}`
      : `sig:${Math.random().toString(36).slice(2, 10)}`;
  };

  const safeId = (el) => {
    if (!el) return "";
    const card = el.classList?.contains("product-card")
      ? el
      : el.closest(".product-card");
    const currentSignature = getProductSignature(card);
    let datasetId = el.dataset?.productId || card?.dataset?.productId;
    const previousSignature = card?.dataset?.productSignature || "";

    const placeholderId = datasetId && datasetId.startsWith("[");
    const signatureChanged =
      currentSignature &&
      previousSignature &&
      previousSignature !== currentSignature;
    const signatureUnavailable =
      currentSignature && currentSignature.includes("[");
    const missingId = !datasetId;

    if (
      missingId ||
      placeholderId ||
      signatureChanged ||
      signatureUnavailable
    ) {
      const generated = generateIdFromSignature(
        currentSignature || datasetId || ""
      );
      if (card) {
        card.dataset.productId = generated;
        if (currentSignature) {
          card.dataset.productSignature = currentSignature;
        }
      }
      if (el.dataset) el.dataset.productId = generated;
      datasetId = generated;
    } else if (card && currentSignature) {
      card.dataset.productSignature = currentSignature;
    }

    return String(datasetId || "");
  };

  const parseBooleanish = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return undefined;
      if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
    }
    return undefined;
  };

  const extractProduct = (card) => {
    if (!card) return null;
    const priceAttr = card.dataset.productPrice;
    const product = {
      id: card.dataset.productId || safeId(card),
      productId:
        card.dataset.productPaymentId || card.dataset.productId || safeId(card), // Use payment ID for backend
      name:
        card.dataset.productName ||
        card.querySelector(".product-name")?.textContent?.trim() ||
        "Untitled",
      brand:
        card.dataset.productBrand ||
        card.querySelector(".product-brand")?.textContent?.trim() ||
        "",
      description:
        card.dataset.productDesc ||
        card.querySelector(".product-desc")?.textContent?.trim() ||
        "",
      image:
        card.dataset.productImage ||
        card.querySelector("img")?.getAttribute("src") ||
        "",
      url:
        card.querySelector(".view-product-link")?.getAttribute("href") ||
        "product.html",
    };
    const parsedPrice = Number(priceAttr);
    product.price = Number.isFinite(parsedPrice)
      ? parsedPrice
      : toNum(card.querySelector(".product-price")?.textContent || 0);

    const explicitItemId = card.dataset.itemId;
    if (explicitItemId && !/^\s*\[/.test(explicitItemId)) {
      const trimmed = String(explicitItemId).trim();
      if (trimmed) {
        product.dispenseItemId = trimmed;
        product.itemId = trimmed;
      }
    } else {
      const fallbackItemId = card.dataset.productId;
      if (
        fallbackItemId &&
        !fallbackItemId.startsWith("sig:") &&
        !/^\s*\[/.test(fallbackItemId)
      ) {
        const trimmed = String(fallbackItemId).trim();
        product.dispenseItemId = trimmed;
      }
    }

    const retailGstRaw =
      card.dataset.retailGst ||
      card.dataset.retailgst ||
      card.dataset.retailGstValue ||
      "";
    if (retailGstRaw !== undefined && retailGstRaw !== null && retailGstRaw !== "") {
      const gst = Number(retailGstRaw);
      if (Number.isFinite(gst)) product.retailGst = gst;
    }

    const wholesaleRaw =
      card.dataset.wholesalePrice || card.dataset.wholesaleprice || "";
    if (wholesaleRaw !== undefined && wholesaleRaw !== null && wholesaleRaw !== "") {
      const wholesale = Number(wholesaleRaw);
      if (Number.isFinite(wholesale)) product.wholesalePrice = wholesale;
    }

    const taxableAttr =
      card.dataset.taxable || card.dataset.productTaxable || undefined;
    const taxable = parseBooleanish(taxableAttr);
    if (taxable === true || taxable === false) {
      product.taxable = taxable;
    }

    const scriptIdRaw = card.dataset.scriptId || card.dataset.scriptID;
    if (scriptIdRaw) {
      const scriptId = String(scriptIdRaw).trim();
      if (scriptId) {
        product.isScript = true;
        product.scriptId = scriptId;
        const dispenseIdRaw =
          card.dataset.dispenseId ||
          card.dataset.dispenseID ||
          card.dataset.dispenseid;
        if (dispenseIdRaw != null) {
          const dispenseId = String(dispenseIdRaw).trim();
          if (dispenseId) product.dispenseId = dispenseId;
        }
        const dispenseStatusRaw =
          card.dataset.dispenseStatus ||
          card.dataset.dispensestatus ||
          card.dataset.dispenseStatusLabel;
        if (dispenseStatusRaw != null) {
          const dispenseStatus = String(dispenseStatusRaw).trim();
          if (dispenseStatus) {
            product.dispenseStatus = dispenseStatus;
            const statusIdFromText = resolveDispenseStatusId(dispenseStatus);
            if (statusIdFromText) {
              product.dispenseStatusId = statusIdFromText;
            }
          }
        }
        const dispenseStatusIdAttr =
          card.dataset.dispenseStatusId || card.dataset.dispensestatusid;
        if (dispenseStatusIdAttr != null) {
          const statusId = resolveDispenseStatusId(dispenseStatusIdAttr);
          if (statusId) {
            product.dispenseStatusId = statusId;
            if (!product.dispenseStatus) {
              product.dispenseStatus = getDispenseStatusLabel(statusId);
            }
          }
        }
      }
    }
    return product;
  };

  const resolveTaxableFlag = (product, fallback, card) => {
    const candidates = [];
    if (product && Object.prototype.hasOwnProperty.call(product, "taxable")) {
      candidates.push(product.taxable);
    }
    if (fallback && Object.prototype.hasOwnProperty.call(fallback, "taxable")) {
      candidates.push(fallback.taxable);
    }
    if (card) {
      const data = card.dataset || {};
      candidates.push(data.taxable);
      candidates.push(data.productTaxable);
      candidates.push(data.producttaxable);
    }
    for (const candidate of candidates) {
      const parsed = parseBooleanish(candidate);
      if (parsed === true || parsed === false) return parsed;
    }
    return undefined;
  };

  const shouldManageDispenses = () => !!getDispenseService();

  const updateCartItemMetadata = async (id, patch) => {
    if (!id || !patch || typeof window.Cart?.updateItemMetadata !== "function")
      return null;
    try {
      return await window.Cart.updateItemMetadata(String(id), patch);
    } catch (err) {
      dlog("updateItemMetadata failed", err);
      return null;
    }
  };

  const attachScriptMetadata = (source, patch = {}) => {
    if (!source || typeof source !== "object") return patch;
    if (source.scriptId || source.script_id) {
      patch.isScript = true;
      patch.scriptId = String(source.scriptId || source.script_id).trim();
    }
    if (source.dispenseId || source.dispense_id) {
      const val = String(source.dispenseId || source.dispense_id || "").trim();
      if (val) patch.dispenseId = val;
    }
    if (source.dispenseStatusId || source.dispense_status_id) {
      const statusId = resolveDispenseStatusId(
        source.dispenseStatusId || source.dispense_status_id
      );
      if (statusId) {
        patch.dispenseStatusId = statusId;
        if (!patch.dispenseStatus) {
          patch.dispenseStatus = getDispenseStatusLabel(statusId);
        }
      }
    }
    if (source.dispenseStatus || source.dispense_status) {
      const statusLabel = String(
        source.dispenseStatus || source.dispense_status || ""
      ).trim();
      if (statusLabel) {
        patch.dispenseStatus = statusLabel;
        const statusId = resolveDispenseStatusId(statusLabel);
        if (statusId) patch.dispenseStatusId = statusId;
      }
    }
    if (source.dispenseStatusLabel) {
      const statusLabel = String(source.dispenseStatusLabel || "").trim();
      if (statusLabel) {
        patch.dispenseStatus = statusLabel;
        const statusId = resolveDispenseStatusId(statusLabel);
        if (statusId) patch.dispenseStatusId = statusId;
      }
    }
    if (source.taxable !== undefined) {
      const taxable = parseBooleanish(source.taxable);
      if (taxable === null) {
        patch.taxable = null;
      } else if (taxable !== undefined) {
        patch.taxable = taxable;
      }
    } else if (source.isTaxable !== undefined) {
      const taxable = parseBooleanish(source.isTaxable);
      if (taxable !== undefined) patch.taxable = taxable === null ? null : taxable;
    } else if (source.tax !== undefined) {
      const taxable = parseBooleanish(source.tax);
      if (taxable !== undefined) patch.taxable = taxable === null ? null : taxable;
    }
    return patch;
  };

  const fetchScriptMeta = async (scriptId, options = {}) => {
    const service = getDispenseService();
    if (!service || !scriptId) return null;
    const id = String(scriptId).trim();
    if (!id) return null;
    const attemptOptions = {
      attempts: options.attempts ?? 4,
      delayMs: options.delayMs ?? 700,
    };
    try {
      if (typeof service.waitForScriptDispense === "function") {
        return await service.waitForScriptDispense(id, attemptOptions);
      }
      if (typeof service.fetchScript === "function") {
        const response = await service.fetchScript(id);
        return response?.script || response || null;
      }
    } catch (err) {
      dlog("fetchScriptMeta failed", err);
    }
    return null;
  };

  const ITEM_DISPENSE_STATUS = {
    IN_CART: DEFAULT_DISPENSE_STATUS_IDS.IN_CART || "149",
    CANCELLED: DEFAULT_DISPENSE_STATUS_IDS.CANCELLED || "146",
    PAID: DEFAULT_DISPENSE_STATUS_IDS.PAID || "152",
  };

  const shouldHandleItemDispenses = () =>
    shouldManageDispenses() && !!getContactId();

  const isScriptCartItem = (item) =>
    !!(item && (item.isScript || item.scriptId));

  const isItemDispenseCandidate = (item) =>
    !!item && !isScriptCartItem(item);

  const getDispenseItemId = (entity) => {
    if (!entity) return null;
    const candidates = [
      entity.dispenseItemId,
      entity.itemId,
      entity.productId,
      entity.id,
    ];
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        const value = String(candidate).trim();
        if (value && !value.startsWith("sig:") && !/^\s*\[/.test(value)) {
          return value;
        }
      }
    }
    return null;
  };

  const syncScriptMetadataFromDom = async () => {
    if (!window.Cart) return;
    const cards = $$use(".product-card[data-script-id]");
    if (!cards.length) return;
    await Promise.all(
      cards.map(async (card) => {
        const product = extractProduct(card);
        if (!product || !product.id) return;
        const existing = window.Cart.getItem
          ? window.Cart.getItem(product.id)
          : null;
        if (!existing) return;
        const patch = attachScriptMetadata(product, { id: existing.id });
        if (!patch || Object.keys(patch).length <= 1) return; // id + maybe script metadata
        await updateCartItemMetadata(existing.id, patch);
      })
    );
  };

  const seedScriptsFromDom = async () => {
    if (!window.Cart || !shouldManageDispenses()) return;
    const cards = $$use(
      '.product-card[data-script-id][data-dispense-status]'
    );
    if (!cards.length) return;
    for (const card of cards) {
      const product = extractProduct(card);
      if (!product || !product.id || !product.isScript) continue;
      const canDispense = parseCanDispenseFlag(card.dataset?.canDispense);
      if (!canDispense) {
        const existing = window.Cart.getItem
          ? window.Cart.getItem(product.id)
          : null;
        if (existing) {
          try {
            await window.Cart.removeItem(existing.id || product.id);
          } catch (err) {
            dlog("seed removeItem failed", err);
          }
        }
        updateProductCardDataset(
          [product.id, product.productId],
          {
            dispenseStatus: "Cancelled",
            dispenseStatusId: null,
            dispenseId: null,
            scriptId: product.scriptId,
            suppressAutoSeed: true,
          },
          { syncButtons: true }
        );
        continue;
      }
      const status = String(product.dispenseStatus || "").toLowerCase();
      if (status !== "in cart") continue;
      const existing = window.Cart.getItem
        ? window.Cart.getItem(product.id)
        : null;
      if (!existing) {
        try {
          await window.Cart.addItem(product, 1);
        } catch (err) {
          dlog("seed addItem failed", err);
        }
      }
      const targetId = existing?.id || product.id;
      const patch = attachScriptMetadata(product, { id: targetId });
      await updateCartItemMetadata(targetId, patch);
    }
  };

  const clearScriptCartMetadata = async (item) => {
    if (!item) return;
    try {
      if (item.id) {
        await updateCartItemMetadata(item.id, {
          dispenseStatusId: null,
          dispenseStatus: null,
          dispenseId: null,
        });
      }
    } catch (err) {
      dlog("Failed to clear script metadata", err);
    }
  };

  const syncItemDispenseForCartItem = async (
    cartItem,
    product = null,
    options = {}
  ) => {
    if (!shouldHandleItemDispenses()) return;
    if (!cartItem || isScriptCartItem(cartItem)) return;
    const service = getDispenseService();
    if (!service?.createItemDispense) return;
    const contactId = getContactId();
    if (!contactId) return;
    const itemId =
      getDispenseItemId(cartItem) ||
      getDispenseItemId(product) ||
      null;
    if (!itemId) return;
    const quantity = Math.max(1, Number(cartItem.qty) || 1);
    const metadataPatch = {
      dispenseItemId: itemId,
      itemId,
      contactId: getContactId(),
    };
    if (product?.retailGst !== undefined) {
      metadataPatch.retailGst = product.retailGst;
    }
    if (product?.wholesalePrice !== undefined) {
      metadataPatch.wholesalePrice = product.wholesalePrice;
    }
    if (product?.price !== undefined) {
      metadataPatch.price = product.price;
    }
    if (cartItem.dispenseId) {
      try {
        await service.updateItemDispense(cartItem.dispenseId, {
          quantity,
          contactId,
          patientId: contactId,
        });
      } catch (err) {
        console.error("Item dispense quantity update failed", err);
      }
      await updateCartItemMetadata(cartItem.id, metadataPatch);
      return;
    }
    if (options.skipCreate) {
      await updateCartItemMetadata(cartItem.id, metadataPatch);
      return;
    }
    try {
      const response = await service.createItemDispense({
        itemId,
        contactId,
        quantity,
        retailPrice:
          product?.price !== undefined ? product.price : cartItem.price,
        retailGst:
          product?.retailGst !== undefined
            ? product.retailGst
            : cartItem.retailGst,
        wholesalePrice:
          product?.wholesalePrice !== undefined
            ? product.wholesalePrice
            : cartItem.wholesalePrice,
      });
      const dispense = response?.dispense || response || {};
      const newDispenseId =
        dispense.id != null ? String(dispense.id).trim() : null;
      const statusId =
        dispense.statusId ||
        ITEM_DISPENSE_STATUS.IN_CART;
      const statusLabel =
        dispense.statusLabel ||
        getDispenseStatusLabel(statusId) ||
        "In Cart";
      await updateCartItemMetadata(cartItem.id, {
        ...metadataPatch,
        dispenseId: newDispenseId,
        dispenseStatusId: statusId,
        dispenseStatus: statusLabel,
      });
      updateProductCardDataset(
        [cartItem.id, cartItem.productId, itemId],
        {
          force: true,
          dispenseId: newDispenseId,
          dispenseStatusId: statusId,
          dispenseStatus: statusLabel,
          dispenseItemId: itemId,
        },
        { syncButtons: true }
      );
      if (newDispenseId) {
        seededItemDispenseIds.add(newDispenseId);
      }
    } catch (err) {
      console.error("Item dispense create failed", err);
    }
  };

  const updateItemDispenseQuantity = async (cartItem) => {
    if (!shouldHandleItemDispenses()) return;
    if (!cartItem || isScriptCartItem(cartItem)) return;
    const service = getDispenseService();
    if (!service?.updateItemDispense) return;
    const quantity = Math.max(1, Number(cartItem.qty) || 1);
    if (!cartItem.dispenseId) {
      await syncItemDispenseForCartItem(cartItem);
      return;
    }
    try {
      await service.updateItemDispense(cartItem.dispenseId, {
        quantity,
        contactId: getContactId(),
        patientId: getContactId(),
      });
    } catch (err) {
      console.error("Item dispense quantity update failed", err);
    }
  };

  const cancelItemDispense = async (cartItem) => {
    if (!shouldHandleItemDispenses()) return;
    if (!cartItem?.dispenseId) return;
    const service = getDispenseService();
    if (!service?.updateDispenseStatus) return;
    const cancelStatus =
      service.statusIds?.CANCELLED ||
      ITEM_DISPENSE_STATUS.CANCELLED;
    try {
      await service.updateDispenseStatus(cartItem.dispenseId, cancelStatus);
    } catch (err) {
      console.error("Cancel item dispense failed", err);
    }
    const itemKey = getDispenseItemId(cartItem);
    updateProductCardDataset(
      [cartItem.id, cartItem.productId, itemKey],
      {
        force: true,
        dispenseStatusId: null,
        dispenseStatus: null,
        dispenseId: null,
        dispenseItemId: itemKey,
      },
      { syncButtons: true }
    );
    seededItemDispenseIds.delete(cartItem.dispenseId);
  };

  const enqueueItemDispenseSeed = (dispense) => {
    if (!dispense || !dispense.id || !dispense.itemId) return;
    if (dispense.itemId === "0" || dispense.itemId === 0) return;
    if (seededItemDispenseIds.has(dispense.id)) return;
    if (
      pendingItemDispenseSeeds.some((entry) => entry.id === dispense.id)
    )
      return;
    pendingItemDispenseSeeds.push(dispense);
  };

  const processItemDispenseSeeds = async () => {
    if (!pendingItemDispenseSeeds.length) return;
    if (!window.Cart) return;
    const remaining = [];
    const cartSnapshot = window.Cart.getState ? window.Cart.getState().items || [] : [];
    for (const dispense of pendingItemDispenseSeeds) {
      const itemId = dispense.itemId;
      if (!itemId || itemId === "0") continue;
      const normalizedItemId = String(itemId).trim();
      const card = findProductCardByItemId(itemId);
      let product = null;
      const fallbackCartItem =
        cartSnapshot.find((entry) => {
          if (!entry) return false;
          const key = getDispenseItemId(entry);
          if (key && String(key).trim() === normalizedItemId) return true;
          if (entry.itemId && String(entry.itemId).trim() === normalizedItemId)
            return true;
          if (entry.productId && String(entry.productId).trim() === normalizedItemId)
            return true;
          return false;
        }) || window.Cart.getItem?.(normalizedItemId);
      const quantity = Math.max(1, Number(dispense.quantity) || 1);
      const existingByDispense = cartSnapshot.find((entry) => {
        if (!entry) return false;
        const key = getDispenseItemId(entry);
        if (key && String(key).trim() === normalizedItemId) return true;
        if (entry.itemId && String(entry.itemId).trim() === normalizedItemId)
          return true;
        if (entry.productId && String(entry.productId).trim() === normalizedItemId)
          return true;
        return false;
      });
      if (card) {
        product = extractProduct(card);
      }
      if (!product) {
        if (fallbackCartItem) {
          product = {
            ...fallbackCartItem,
            id: fallbackCartItem.id,
            productId: fallbackCartItem.productId || fallbackCartItem.id,
            dispenseItemId:
              fallbackCartItem.dispenseItemId ||
              getDispenseItemId(fallbackCartItem) ||
              normalizedItemId,
            itemId:
              fallbackCartItem.itemId ||
              fallbackCartItem.dispenseItemId ||
              normalizedItemId,
            dispenseId: dispense.id,
            dispenseStatus:
              dispense.statusLabel ||
              getDispenseStatusLabel(
                dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART
              ) ||
              fallbackCartItem.dispenseStatus,
            dispenseStatusId:
              dispense.statusId ||
              fallbackCartItem.dispenseStatusId ||
              ITEM_DISPENSE_STATUS.IN_CART,
          };
          if (!product.image) {
            const fallbackCard = findProductCardByItemId(product.dispenseItemId);
            if (fallbackCard) {
              const img = fallbackCard.querySelector("img");
              if (img?.src) product.image = img.src;
            }
          }
        } else {
          const fallbackName =
            dispense.raw?.["f2251//f2232//f2225"] ||
            dispense.raw?.name ||
            `Item ${itemId}`;
          product = {
            id: normalizedItemId,
            productId: normalizedItemId,
            name: fallbackName,
            brand: "",
            description: "",
            image: (card?.querySelector("img") || {}).src || "",
            url: "product.html",
            price:
              dispense.retailPrice !== undefined
                ? dispense.retailPrice
                : 0,
            retailGst:
              dispense.retailGst !== undefined ? dispense.retailGst : 0,
            wholesalePrice:
              dispense.wholesalePrice !== undefined
                ? dispense.wholesalePrice
                : 0,
            dispenseItemId: normalizedItemId,
            itemId: normalizedItemId,
            dispenseId: dispense.id,
            dispenseStatusId:
              dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART,
            dispenseStatus:
              dispense.statusLabel ||
              getDispenseStatusLabel(
                dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART
              ) ||
              "In Cart",
          };
        }
      }
      const resolvedTaxable = resolveTaxableFlag(
        product,
        fallbackCartItem || existingByDispense,
        card
      );
      if (resolvedTaxable !== undefined && product) {
        product.taxable = resolvedTaxable;
      }

      if (product && !product.itemId && product.dispenseItemId) {
        product.itemId = product.dispenseItemId;
      }
      if (existingByDispense) {
        product.id = existingByDispense.id;
        product.productId = existingByDispense.productId || existingByDispense.id;
        if (!product.name || /^Item\s+/i.test(product.name)) {
          product.name = existingByDispense.name || product.name;
        }
        if (!product.image) {
          product.image = existingByDispense.image || product.image;
          if (!product.image) {
            const fallbackCard = findProductCardByItemId(product.dispenseItemId);
            const img = fallbackCard?.querySelector("img");
            if (img?.src) product.image = img.src;
          }
        }
        if (!product.brand) {
          product.brand = existingByDispense.brand || product.brand;
        }
        if (!product.description) {
          product.description = existingByDispense.description || product.description;
        }
        if (!product.url) {
          product.url = existingByDispense.url || product.url;
        }
        if (existingByDispense.price != null && product.price === undefined) {
          product.price = existingByDispense.price;
        }
        if (existingByDispense.retailGst != null && product.retailGst === undefined) {
          product.retailGst = existingByDispense.retailGst;
        }
        if (existingByDispense.wholesalePrice != null && product.wholesalePrice === undefined) {
          product.wholesalePrice = existingByDispense.wholesalePrice;
        }
        if (!product.dispenseItemId) {
          product.dispenseItemId = getDispenseItemId(existingByDispense) || product.itemId;
        }
        if (!product.itemId && product.dispenseItemId) {
          product.itemId = product.dispenseItemId;
        }
      }
      if (existingByDispense) {
        const targetId = existingByDispense.id;
        if (Number(existingByDispense.qty) !== quantity) {
          try {
            await window.Cart.updateQuantity(targetId, quantity);
          } catch (err) {
            console.error("Failed to sync quantity for existing dispense", err);
          }
        }
        const metadataPatch = {
          dispenseId: dispense.id,
          dispenseStatusId:
            dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART,
          dispenseStatus:
            dispense.statusLabel ||
            getDispenseStatusLabel(
              dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART
            ) ||
            "In Cart",
          dispenseItemId: normalizedItemId,
          itemId: normalizedItemId,
          retailGst:
            dispense.retailGst !== undefined
              ? dispense.retailGst
              : existingByDispense.retailGst,
          wholesalePrice:
            dispense.wholesalePrice !== undefined
              ? dispense.wholesalePrice
              : existingByDispense.wholesalePrice,
          price:
            dispense.retailPrice !== undefined
              ? dispense.retailPrice
              : existingByDispense.price,
        };
        if (resolvedTaxable !== undefined) {
          metadataPatch.taxable = resolvedTaxable;
        }
        await updateCartItemMetadata(targetId, metadataPatch);
        updateProductCardDataset(
          [targetId, existingByDispense.productId, normalizedItemId],
          {
            force: true,
            dispenseId: dispense.id,
            dispenseStatusId:
              dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART,
            dispenseStatus:
              dispense.statusLabel ||
              getDispenseStatusLabel(
                dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART
              ) ||
              "In Cart",
            dispenseItemId: normalizedItemId,
          },
          { syncButtons: true }
        );
        seededItemDispenseIds.add(dispense.id);
        continue;
      }

      if (!product) {
        remaining.push(dispense);
        continue;
      }
      // Ensure we have at least some display metadata
      product.name =
        product.name ||
        findProductCardByItemId(product.dispenseItemId || normalizedItemId)
          ?.querySelector(".product-name")
          ?.textContent?.trim() ||
        `Item ${normalizedItemId}`;
      if (!product.image) {
        const cardSource =
          card ||
          findProductCardByItemId(product.dispenseItemId || normalizedItemId);
        product.image =
          cardSource?.querySelector("img")?.getAttribute("src") ||
          product.image ||
          "";
      }
      product.dispenseId = dispense.id;
      product.dispenseStatus =
        dispense.statusLabel ||
        getDispenseStatusLabel(
          dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART
        ) ||
        "In Cart";
      product.dispenseStatusId =
        dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART;
      product.dispenseItemId = dispense.itemId || product.dispenseItemId;
      if (dispense.retailPrice !== undefined) {
        product.price = dispense.retailPrice;
      }
      if (dispense.retailGst !== undefined) {
        product.retailGst = dispense.retailGst;
      }
      if (dispense.wholesalePrice !== undefined) {
        product.wholesalePrice = dispense.wholesalePrice;
      }
      try {
        const existing = window.Cart.getItem
          ? window.Cart.getItem(product.id)
          : null;
        if (!existing) {
          await window.Cart.addItem(product, quantity);
          const snapshotItem = window.Cart.getItem
            ? window.Cart.getItem(product.id)
            : null;
          if (snapshotItem) cartSnapshot.push(snapshotItem);
        } else if (existing.qty !== quantity) {
          await window.Cart.updateQuantity(existing.id || product.id, quantity);
        }
        const latest = window.Cart.getItem
          ? window.Cart.getItem(product.id)
          : null;
        const targetId = latest?.id || product.id;
        const metadataPatchNew = {
          dispenseId: dispense.id,
          dispenseStatusId:
            dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART,
          dispenseStatus: product.dispenseStatus,
          dispenseItemId: product.dispenseItemId,
          itemId: product.dispenseItemId,
          retailGst: product.retailGst,
          wholesalePrice: product.wholesalePrice,
          price: product.price,
        };
        if (resolvedTaxable !== undefined) {
          metadataPatchNew.taxable = resolvedTaxable;
        }
        await updateCartItemMetadata(targetId, metadataPatchNew);
        updateProductCardDataset(
          [product.id, product.productId, product.dispenseItemId],
          {
            force: true,
            dispenseId: dispense.id,
            dispenseStatusId:
              dispense.statusId || ITEM_DISPENSE_STATUS.IN_CART,
            dispenseStatus: product.dispenseStatus,
            dispenseItemId: product.dispenseItemId,
          },
          { syncButtons: true }
        );
        seededItemDispenseIds.add(dispense.id);
      } catch (err) {
        console.error("Failed to seed item dispense", err);
        remaining.push(dispense);
      }
    }
    pendingItemDispenseSeeds.length = 0;
    pendingItemDispenseSeeds.push(...remaining);
  };

  const loadExistingItemDispenses = async () => {
    if (!shouldHandleItemDispenses()) return;
    const service = getDispenseService();
    if (!service?.fetchItemDispenses) return;
    const contactId = getContactId();
    if (!contactId) return;
    try {
      const result = await service.fetchItemDispenses({
        contactId,
        statusIds: ITEM_DISPENSE_STATUS.IN_CART,
        limit: 200,
      });
      const dispenses = Array.isArray(result?.dispenses)
        ? result.dispenses
        : [];
      const latestByItem = new Map();
      dispenses.forEach((dispense) => {
        if (!dispense || !dispense.itemId || dispense.itemId === "0") return;
        if (latestByItem.has(dispense.itemId)) return;
        latestByItem.set(dispense.itemId, dispense);
      });
      latestByItem.forEach((dispense) => enqueueItemDispenseSeed(dispense));
      await processItemDispenseSeeds();
      await pruneNonDispensableScripts();
    } catch (err) {
      console.error("Failed to fetch existing dispenses", err);
    }
  };

  const pruneNonDispensableScripts = async () => {
    if (!shouldManageDispenses() || !window.Cart) return;
    const items = Cart.getState().items.filter((item) =>
      isScriptCartItem(item)
    );
    if (!items.length) return;
    await Promise.all(
      items.map(async (item) => {
        const scriptId = item.scriptId || item.productId || item.id;
        if (!scriptId) return;
        const selectors = [
          `.product-card[data-script-id="${cssEscape(scriptId)}"]`,
          `.product-card[data-product-id="${cssEscape(scriptId)}"]`,
        ];
        const card =
          document.querySelector(selectors[0]) ||
          document.querySelector(selectors[1]);
        const canDispense = card
          ? parseCanDispenseFlag(card.dataset?.canDispense)
          : true;
        if (!canDispense) {
          try {
            await Cart.removeItem(item.id);
          } catch (err) {
            console.error("Failed to remove blocked script", err);
          }
          updateProductCardDataset(
            [item.id, item.productId, scriptId],
            {
              dispenseStatus: "Cancelled",
              dispenseStatusId: null,
              dispenseId: null,
              scriptId: item.scriptId,
              suppressAutoSeed: true,
            },
            { syncButtons: true }
          );
        }
      })
    );
  };

  const clearItemDispenseQueues = () => {
    pendingItemDispenseSeeds.length = 0;
    seededItemDispenseIds.clear();
  };

  const hydrateCartItemsFromDom = async () => {
    if (!window.Cart) return;
    const items = window.Cart.getState().items;
    await Promise.all(
      items.map(async (item) => {
        if (!item || isScriptCartItem(item)) return;
        const itemKey = getDispenseItemId(item) || item.productId || item.id;
        if (!itemKey) return;
        const card = findProductCardByItemId(itemKey);
        if (!card) return;
        const product = extractProduct(card);
        if (!product) return;
        const patch = {};
        if (isMeaningfulText(product.name) && product.name !== item.name) {
          patch.name = product.name;
        }
        if (isMeaningfulText(product.brand) && product.brand !== item.brand) {
          patch.brand = product.brand;
        }
        const cardImage =
          product.image || card.querySelector("img")?.getAttribute("src") || "";
        if (isMeaningfulImage(cardImage) && cardImage !== item.image) {
          patch.image = cardImage;
        }
        if (isMeaningfulText(product.description) && product.description !== item.description) {
          patch.description = product.description;
        }
        if (
          product.price !== undefined &&
          !Number.isNaN(Number(product.price)) &&
          product.price !== item.price
        ) {
          patch.price = Number(product.price);
        }
        if (
          product.retailGst !== undefined &&
          !Number.isNaN(Number(product.retailGst)) &&
          Number(product.retailGst) !== Number(item.retailGst)
        ) {
          patch.retailGst = Number(product.retailGst);
        }
        if (
          product.wholesalePrice !== undefined &&
          !Number.isNaN(Number(product.wholesalePrice)) &&
          Number(product.wholesalePrice) !== Number(item.wholesalePrice)
        ) {
          patch.wholesalePrice = Number(product.wholesalePrice);
        }
        const cardTaxable = resolveTaxableFlag(product, item, card);
        if (cardTaxable === true || cardTaxable === false) {
          const currentTaxable = parseBooleanish(item.taxable);
          if (currentTaxable !== cardTaxable) {
            patch.taxable = cardTaxable;
          }
        }
        if (Object.keys(patch).length) {
          await updateCartItemMetadata(item.id, patch);
        }
      })
    );
  };

/* ========= rendering ========= */
  const updateCount = (state) => {
    const count = state
      ? state.items.reduce((total, item) => total + (Number(item.qty) || 0), 0)
      : Cart?.getCount?.() || 0;
    const bubble = $use(".cart-count");
    if (!bubble) return;
    bubble.textContent = count;
    bubble.classList.toggle("hidden", count === 0);
    dlog("updateCount:", count);
  };

  const updateCheckoutButton = (state) => {
    ensureDrawer();
    if (!checkoutBtn) return;
    const disabled = !state.items.length;
    checkoutBtn.disabled = disabled;
    checkoutBtn.classList.toggle("opacity-50", disabled);
    checkoutBtn.classList.toggle("cursor-not-allowed", disabled);
  };

  const renderCart = (state) => {
    ensureDrawer();
    if (!itemsContainer) return;
    itemsContainer.innerHTML = "";
    if (!state.items.length) {
      itemsContainer.innerHTML =
        '<div class="p-6 text-center text-gray-500">Your cart is empty.</div>';
    } else {
      state.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "p-4 flex gap-3 items-start";
        const scriptLine = isScriptCartItem(item);
        const qtyValue = scriptLine
          ? 1
          : Math.max(1, Number(item.qty) || 1);
        if (
          scriptLine &&
          typeof Cart?.updateQuantity === "function" &&
          Number(item.qty) !== 1
        ) {
          Promise.resolve().then(() => {
            try {
              const result = Cart.updateQuantity(item.id, 1);
              if (result && typeof result.catch === "function") {
                result.catch((err) => {
                  dlog("Failed to normalise script quantity", err);
                });
              }
            } catch (err) {
              dlog("Failed to normalise script quantity", err);
            }
          });
        }
        const quantityControlsHtml = scriptLine
          ? `<div class="mt-2 text-xs text-gray-500">Qty ${qtyValue}</div>`
          : `
            <div class="mt-2 inline-flex items-center gap-2">
              <button class="qty-decr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${
                item.id
              }" aria-label="Decrease quantity">−</button>
              <input class="qty-input w-12 text-center rounded-lg border px-2 py-1" value="${
                qtyValue
              }" data-id="${item.id}" inputmode="numeric" aria-label="Quantity"/>
              <button class="qty-incr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${
                item.id
              }" aria-label="Increase quantity">+</button>
            </div>
          `;
        const avatarHtml = renderAvatarHtml(item.image, item.name, {
          sizeClasses: "w-16 h-16",
          shapeClasses: "rounded-xl",
          fallbackTextClass: "text-lg",
        });
        row.innerHTML = `
        <div class="flex-shrink-0">${avatarHtml}</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold truncate">${item.name}</div>
          ${
            item.brand
              ? `<div class="text-sm text-gray-600">${item.brand}</div>`
              : ""
          }
          <div class="text-sm font-medium">${formatMoney(item.price)}</div>
          ${quantityControlsHtml}
        </div>
        <button class="remove-item w-9 h-9 rounded-lg hover:bg-gray-100" data-id="${
          item.id
        }" aria-label="Remove item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>`;
        itemsContainer.appendChild(row);
      });
    }
    const summaryContext = window.__checkoutSummary;
    let subtotalBreakdownData = [];
    if (summaryContext && summaryContext.totals) {
      const { totals, shippingLabel, discountDisplay, processingNote } = summaryContext;
      debugLog("renderCart using checkoutSummary", {
        totals,
        shippingLabel,
        discountDisplay,
      });
      const subtotalDisplay =
        totals.subtotalWithItemTax !== undefined
          ? totals.subtotalWithItemTax
          : totals.subtotal;
      if (subtotalEl) subtotalEl.textContent = formatMoney(subtotalDisplay);
      subtotalBreakdownData = Array.isArray(totals.itemBreakdown)
        ? totals.itemBreakdown
        : [];
      const fallbackShippingText = (() => {
        if (!totals.shippingConfirmed) return "Select shipping";
        if (totals.shipping <= 0) return "Free";
        const amount = Number.isFinite(totals.shippingWithGst)
          ? totals.shippingWithGst
          : totals.shipping;
        return formatMoney(amount);
      })();
      if (shippingEl)
        shippingEl.textContent = shippingLabel || fallbackShippingText;
      if (processingEl)
        processingEl.textContent = formatMoney(totals.cardFeeTotal);
      if (gstEl) gstEl.textContent = formatMoney(totals.taxTotal);
      if (discountEl)
        discountEl.textContent =
          discountDisplay ||
          (totals.discount > 0
            ? `-${formatMoney(totals.discount).replace(/^-/, "")}`
            : "-$0.00");
      if (totalEl) totalEl.textContent = formatMoney(totals.total);
      if (processingNoteEl) {
        if (processingNote) {
          processingNoteEl.textContent = processingNote;
          processingNoteEl.classList.remove("hidden");
        } else {
          processingNoteEl.textContent = "";
          processingNoteEl.classList.add("hidden");
        }
      }
    } else {
      const fallback = computeDrawerFallbackTotals(state);
      debugLog("renderCart fallback totals", fallback);
      const fallbackSubtotal =
        fallback.subtotalWithItemTax !== undefined
          ? fallback.subtotalWithItemTax
          : fallback.subtotal;
      if (subtotalEl) subtotalEl.textContent = formatMoney(fallbackSubtotal);
      subtotalBreakdownData = Array.isArray(fallback.itemBreakdown)
        ? fallback.itemBreakdown
        : [];
      if (shippingEl) shippingEl.textContent = fallback.shippingLabel;
      if (processingEl)
        processingEl.textContent = formatMoney(fallback.cardFeeTotal);
      if (gstEl) gstEl.textContent = formatMoney(fallback.taxTotal);
      if (discountEl) discountEl.textContent = fallback.discountDisplay;
      if (totalEl) totalEl.textContent = formatMoney(fallback.total);
      if (processingNoteEl) {
        if (fallback.processingNote) {
          processingNoteEl.textContent = fallback.processingNote;
          processingNoteEl.classList.remove("hidden");
        } else {
          processingNoteEl.textContent = "";
          processingNoteEl.classList.add("hidden");
        }
      }
    }
    if (!state.items.length) subtotalBreakdownData = [];
    renderSubtotalBreakdown(subtotalBreakdownEl, subtotalBreakdownData);
    updateCheckoutButton(state);
    dlog(
      "renderCart: items",
      state.items.length,
      state.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty }))
    );
  };

  const syncAddButtons = () => {
    if (!window.Cart) return;
    processItemDispenseSeeds().catch((err) => {
      dlog("processItemDispenseSeeds error", err);
    });
    pruneNonDispensableScripts().catch((err) => {
      dlog("pruneNonDispensableScripts error", err);
    });
    hydrateCartItemsFromDom().catch((err) => {
      dlog("hydrateCartItemsFromDom error", err);
    });
    const items = Cart.getState().items;
    const inCart = new Set();
    const toSignature = (name = "", brand = "", priceText = "") => {
      const signature = `${String(name).trim()}|${String(
        brand
      ).trim()}|${String(priceText).trim()}`;
      return generateIdFromSignature(signature);
    };
    items.forEach((item) => {
      const id = String(item.id);
      inCart.add(id);
      const itemKey = getDispenseItemId(item);
      if (itemKey) inCart.add(String(itemKey));
      inCart.add(
        toSignature(
          item.name || "",
          item.brand || "",
          typeof item.price === "number"
            ? new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: "AUD",
              }).format(item.price)
            : String(item.price || "")
        )
      );
    });
    const buttons = $$use(".add-to-cart-btn");
    const seedQueue = [];
    let matched = 0;
    buttons.forEach((btn) => {
      const card = btn.closest(".product-card");
      // Prefer explicit dataset id if present; only fallback to signature-derived ids if the id starts with sig:
      const explicitId =
        btn.dataset?.productId ||
        card?.dataset?.productId ||
        card?.dataset?.itemId ||
        "";
      const computedId = explicitId || safeId(btn);
      const idStr = String(computedId);
      let on = inCart.has(idStr);
      if (!on && idStr.startsWith("sig:")) {
        const name =
          card?.querySelector(".product-name")?.textContent?.trim() || "";
        const brand =
          card?.querySelector(".product-brand")?.textContent?.trim() || "";
        const price =
          card?.querySelector(".product-price")?.textContent?.trim() || "";
        const sig = toSignature(name, brand, price);
        on = inCart.has(sig);
      }
      if (card) {
        const scriptKey = card.dataset?.scriptId
          ? String(card.dataset.scriptId)
          : null;
        if (
          suppressedScriptIds.has(idStr) ||
          (scriptKey && suppressedScriptIds.has(scriptKey))
        ) {
          card.dataset.dispenseSuppressed = "true";
        }
        if (
          suppressedScriptIds.has(idStr) ||
          (scriptKey && suppressedScriptIds.has(scriptKey))
        ) {
          on = false;
        }
      }
      const canDispense =
        card ? parseCanDispenseFlag(card.dataset?.canDispense) : true;
      if (!on && canDispense) {
        const status =
          card?.dataset?.dispenseStatus ||
          card?.dataset?.dispensestatus ||
          "";
        const suppressed = card?.dataset?.dispenseSuppressed === "true";
        if (!suppressed && typeof status === "string" && status.trim()) {
          const lower = status.trim().toLowerCase();
          if (lower === "in cart" || lower === "in-cart") {
            on = true;
            if (card && window.Cart) {
              const product = extractProduct(card);
              if (
                product &&
                product.id &&
                !inCart.has(String(product.id)) &&
                !inCart.has(
                  toSignature(
                    product.name,
                    product.brand,
                    typeof product.price === "number"
                      ? String(product.price)
                      : product.price || ""
                  )
                )
              ) {
                seedQueue.push(product);
              }
            }
          }
        }
      }
      btn.disabled = on;
      btn.textContent = on ? "Added ✓" : "Add to Cart";
      btn.classList.toggle("bg-gray-300", on);
      btn.classList.toggle("text-gray-700", on);
      btn.classList.toggle("cursor-not-allowed", on);
      btn.classList.toggle("bg-neutral-900", !on);
      btn.classList.toggle("hover:bg-neutral-700", !on);
      btn.classList.toggle("text-white", !on);
      if (on) matched++;
    });
    dlog("syncAddButtons:", {
      cartItemCount: items.length,
      buttonCount: buttons.length,
      matched,
    });
    if (seedQueue.length && window.Cart) {
      Promise.resolve().then(async () => {
        for (const product of seedQueue) {
          try {
            await Cart.addItem(product, 1);
            const patch = attachScriptMetadata(product, { id: product.id });
            await updateCartItemMetadata(product.id, patch);
            updateProductCardDataset(
              [product.id, product.productId],
              {
                dispenseStatus: product.dispenseStatus || "In Cart",
                dispenseStatusId: product.dispenseStatusId,
                dispenseId: product.dispenseId,
                scriptId: product.scriptId,
                suppressAutoSeed: false,
              },
              { syncButtons: true }
            );
          } catch (err) {
            console.error("Failed to seed script item into cart", err);
          }
        }
      });
    }
    if (shouldManageDispenses()) {
      try {
        syncScriptMetadataFromDom();
      } catch (err) {
        dlog("syncScriptMetadataFromDom errored", err);
      }
    }
  };

  const getCheckoutUrl = () => {
    const target = config.checkoutUrl || "checkout.html";
    try {
      // Always resolve to absolute URL against current location
      return new URL(target, window.location.href).toString();
    } catch (err) {
      console.warn("checkout url resolve failed", target, err);
      return target;
    }
  };

  const isOnCheckout = () => {
    const checkoutUrl = getCheckoutUrl();
    if (!checkoutUrl) return false;
    if (/^https?:/i.test(checkoutUrl)) {
      try {
        const target = new URL(checkoutUrl, window.location.origin);
        return (
          window.location.origin === target.origin &&
          window.location.pathname.replace(/\/+$/, "") ===
            target.pathname.replace(/\/+$/, "")
        );
      } catch (err) {
        console.warn("Invalid checkout URL", checkoutUrl, err);
        return false;
      }
    }
    const normalized = checkoutUrl.replace(/^\//, "");
    const currentPath = window.location.pathname.replace(/^\//, "");
    return currentPath === normalized || currentPath.endsWith(`/${normalized}`);
  };

  window.StorefrontCartUI = Object.assign(window.StorefrontCartUI || {}, {
    openCart,
    closeCart,
    extractProduct,
    safeId,
    renderCart,
    renderAvatarHtml,
    syncAddButtons,
    ensureDrawer,
    config,
    getCheckoutUrl,
    isOnCheckout,
    forceSync() {
      dlog("forceSync called");
      syncAddButtons();
    },
    setConfig(next) {
      if (!next) return config;
      Object.assign(config, next);
      return config;
    },
    clearItemDispenseQueues,
  });

  /* ========= events ========= */
  document.addEventListener("click", async (event) => {
    ensureDrawer();
    const target = event.target;
    const hasCart = typeof Cart !== "undefined";
    const addBtn = target.closest(".add-to-cart-btn");
    if (addBtn) {
      if (!hasCart || addBtn.disabled) return;
      const card = addBtn.closest(".product-card");
      const product = extractProduct(card);
      if (!product) return;
      const qtyInput = card?.querySelector(".product-qty-input");
      let qty = Math.max(1, parseInt(qtyInput?.value || "1", 10) || 1);
      if (product.isScript) {
        qty = 1;
        if (qtyInput) {
          qtyInput.value = "1";
          qtyInput.setAttribute("readonly", "true");
          qtyInput.setAttribute("aria-readonly", "true");
        }
        const decBtn = card?.querySelector(".product-qty-decr");
        const incBtn = card?.querySelector(".product-qty-incr");
        [decBtn, incBtn].forEach((btn) => {
          if (!btn) return;
          btn.setAttribute("disabled", "true");
          btn.setAttribute("aria-disabled", "true");
          btn.classList.add("opacity-50", "cursor-not-allowed");
        });
      }
      addBtn.disabled = true;
      const originalLabel = addBtn.textContent;
      addBtn.textContent = "Adding…";
      try {
        await Cart.addItem(product, qty);
        const cartItem = Cart.getItem ? Cart.getItem(product.id) : null;
        if (!product.isScript && cartItem) {
          await syncItemDispenseForCartItem(cartItem, product, {
            skipCreate:
              cartItem.dispenseId &&
              seededItemDispenseIds.has(cartItem.dispenseId),
          });
          const itemKey = getDispenseItemId(cartItem);
      updateProductCardDataset(
        [cartItem.id, cartItem.productId, itemKey],
        {
          force: true,
          dispenseStatus: cartItem.dispenseStatus || "In Cart",
          dispenseStatusId:
            cartItem.dispenseStatusId ||
            ITEM_DISPENSE_STATUS.IN_CART,
          dispenseId: cartItem.dispenseId || null,
          dispenseItemId: itemKey,
        },
        { syncButtons: true }
      );
        }
        if (product.isScript) {
          updateProductCardDataset(
            [product.id, product.productId],
            {
              dispenseStatus: product.dispenseStatus || "In Cart",
              dispenseStatusId: product.dispenseStatusId,
              dispenseId: product.dispenseId,
              scriptId: product.scriptId,
              suppressAutoSeed: false,
            },
            { syncButtons: true }
          );
          const patch = attachScriptMetadata(product, { id: product.id });
          updateCartItemMetadata(product.id, patch);
          if (shouldManageDispenses() && product.scriptId) {
            fetchScriptMeta(product.scriptId)
              .then((meta) => {
                if (!meta) return;
                const metaPatch = attachScriptMetadata(
                  {
                    scriptId: product.scriptId,
                    dispenseId: meta.dispenseId,
                    dispenseStatusId: meta.dispenseStatusId,
                    dispenseStatusLabel: meta.dispenseStatusLabel,
                  },
                  { id: product.id }
                );
                updateCartItemMetadata(product.id, metaPatch);
                updateProductCardDataset(
                  [product.id, product.productId],
                  {
                    dispenseStatus: meta.dispenseStatusLabel || "In Cart",
                    dispenseStatusId: meta.dispenseStatusId,
                    dispenseId: meta.dispenseId,
                    scriptId: product.scriptId,
                    suppressAutoSeed: false,
                  },
                  { syncButtons: true }
                );
              })
              .catch((err) => {
                console.error("Script dispense create failed", err);
              });
          }
        }
        if (qtyInput) qtyInput.value = "1";
        openCart();
      } catch (err) {
        console.error("Add to cart failed", err);
        addBtn.disabled = false;
        addBtn.textContent = originalLabel;
        alert("Unable to add item to cart. Please try again.");
        return;
      }
      return;
    }

    if (target.closest(".cart-btn")) {
      if (!hasCart) return;
      openCart();
      return;
    }

    if (target.closest(".close-cart") || target === overlayEl) {
      closeCart();
      return;
    }

    const decr = target.closest(".qty-decr");
    if (decr) {
      if (!hasCart) return;
      const id = decr.dataset.id;
      const item = Cart.getItem(id);
      if (!item) return;
      if (isScriptCartItem(item)) {
        return;
      }
      const nextQty = Math.max(0, (Number(item.qty) || 0) - 1);
      if (nextQty === 0 && shouldHandleItemDispenses()) {
        await cancelItemDispense(item);
      }
      await Cart.updateQuantity(id, nextQty);
      if (nextQty > 0 && shouldHandleItemDispenses()) {
        const updated = Cart.getItem(id);
        if (updated) await updateItemDispenseQuantity(updated);
      }
      return;
    }

    const incr = target.closest(".qty-incr");
    if (incr) {
      if (!hasCart) return;
      const id = incr.dataset.id;
      const item = Cart.getItem(id);
      if (!item) return;
      if (isScriptCartItem(item)) {
        return;
      }
      const nextQty = (Number(item.qty) || 0) + 1;
      await Cart.updateQuantity(id, nextQty);
      if (shouldHandleItemDispenses()) {
        const updated = Cart.getItem(id);
        if (updated) await updateItemDispenseQuantity(updated);
      }
      return;
    }

    const remove = target.closest(".remove-item");
    if (remove) {
      if (!hasCart) return;
      const id = remove.dataset.id;
      const item = Cart.getItem(id);
        if (item && isScriptCartItem(item)) {
          updateProductCardDataset(
            [id, item.productId],
            {
              dispenseStatus: "Cancelled",
              dispenseStatusId: null,
              dispenseId: null,
              scriptId: item.scriptId,
              suppressAutoSeed: true,
            },
            { syncButtons: true }
          );
          clearScriptCartMetadata(item).catch((err) => {
            console.error("Failed to clear script metadata", err);
          });
        } else if (item && shouldHandleItemDispenses()) {
          await cancelItemDispense(item);
        }
      await Cart.removeItem(id);
      return;
    }

    if (target.closest(".clear-cart")) {
      if (!hasCart) return;
      const manage = shouldManageDispenses();
      const state = Cart.getState();
      state.items.forEach((item) => {
        if (!item) return;
        if (item.isScript || item.scriptId) {
          updateProductCardDataset(
            [item.id, item.productId],
            {
              dispenseStatus: "Cancelled",
              dispenseStatusId: null,
              dispenseId: null,
              scriptId: item.scriptId,
              suppressAutoSeed: true,
            },
            { syncButtons: true }
          );
          if (manage) {
            clearScriptCartMetadata(item).catch((err) => {
              console.error("Failed to clear script metadata", err);
            });
          }
        } else if (shouldHandleItemDispenses()) {
          cancelItemDispense(item).catch((err) => {
            console.error("Cancel item dispense failed", err);
          });
        }
      });
      await Cart.clear();
      return;
    }

    if (target.closest(".cart-checkout")) {
      if (!hasCart) return;
      if (!Cart.getState().items.length) return;
      const alreadyOnCheckout = isOnCheckout();
      closeCart();
      if (!alreadyOnCheckout) {
        const url = getCheckoutUrl();
        try {
          event.preventDefault();
        } catch {}
        try {
          window.location.assign(url);
        } catch (err) {
          console.error("checkout navigation failed", err);
          window.location.href = url;
        }
      }
      return;
    }
  });

  document.addEventListener("change", async (event) => {
    ensureDrawer();
    const input = event.target.closest(".qty-input");
    if (!input || typeof Cart === "undefined") return;
    const id = input.dataset.id;
    const item = Cart.getItem(id);
    if (!item) return;
    if (isScriptCartItem(item)) {
      input.value = "1";
      if (Number(item.qty) !== 1) {
        await Cart.updateQuantity(id, 1);
      }
      return;
    }
    const value = Math.max(0, parseInt(input.value || "0", 10) || 0);
    if (value === 0 && shouldHandleItemDispenses()) {
      await cancelItemDispense(item);
    }
    await Cart.updateQuantity(id, value);
    if (value > 0 && shouldHandleItemDispenses()) {
      const updated = Cart.getItem(id);
      if (updated) await updateItemDispenseQuantity(updated);
    }
  });

  document.addEventListener("keydown", (event) => {
    ensureDrawer();
    if (
      event.key === "Escape" &&
      !overlayEl?.classList.contains("pointer-events-none")
    ) {
      closeCart();
    }
  });

  /* ========= boot ========= */
  const init = async () => {
    ensureDrawer();
    if (!window.Cart) return;
    await Cart.init();
    if (shouldHandleItemDispenses()) {
      await loadExistingItemDispenses();
    }
    if (shouldManageDispenses()) {
      try {
        await seedScriptsFromDom();
        await syncScriptMetadataFromDom();
        await pruneNonDispensableScripts();
      } catch (err) {
        dlog("Initial script sync failed", err);
      }
    }
    const state = Cart.getState();
    renderCart(state);
    updateCount(state);
    syncAddButtons();
    processItemDispenseSeeds().catch((err) => dlog("seed process error", err));
    // Retry syncing buttons to catch late-rendered product cards
    const scheduleSyncPass = (delay) =>
      setTimeout(() => {
        syncAddButtons();
        processItemDispenseSeeds().catch((err) =>
          dlog("delayed seed error", err)
        );
      }, delay);
    scheduleSyncPass(120);
    scheduleSyncPass(300);
    scheduleSyncPass(800);

    // Observe dynamic additions of product cards globally
    const syncObserver = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        syncAddButtons();
        processItemDispenseSeeds().catch((err) =>
          dlog("observer process error", err)
        );
      });
    });
    syncObserver.observe(document.body, { childList: true, subtree: true });

    // Re-sync on bfcache restore and visibility changes
    window.addEventListener("pageshow", () => {
      syncAddButtons();
      processItemDispenseSeeds().catch((err) =>
        dlog("pageshow seed error", err)
      );
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncAddButtons();
        processItemDispenseSeeds().catch((err) =>
          dlog("visibility seed error", err)
        );
      }
    });

    Cart.subscribe((next) => {
      renderCart(next);
      updateCount(next);
      syncAddButtons();
      processItemDispenseSeeds().catch((err) =>
        dlog("subscription seed error", err)
      );
      if (!next.items.length) {
        suppressedScriptIds.clear();
        clearItemDispenseQueues();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
