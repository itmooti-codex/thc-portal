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
      <div class="flex justify-between text-sm"><span>Subtotal</span><span class="cart-subtotal">$0.00</span></div>
      <div class="flex justify-between text-sm"><span>Shipping</span><span class="cart-shipping font-medium">Select shipping</span></div>
      <div class="flex justify-between text-sm"><span>Card fee (incl GST)</span><span class="cart-processing font-medium">$0.00</span></div>
      <div class="flex justify-between text-sm"><span>GST total</span><span class="cart-gst font-medium">$0.00</span></div>
      <div class="flex justify-between text-sm"><span>Discount</span><span class="cart-discount font-medium text-emerald-600">-$0.00</span></div>
      <div class="flex justify-between text-base font-bold"><span>Total</span><span class="cart-total">$0.00</span></div>
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

  const CARD_FEE_RATE = 0.018;
  const CARD_FEE_FIXED = 0.3;
  const CARD_FEE_GST_RATE = 0.1;

  const roundCurrency = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

  const formatMoney = (value) =>
    typeof money === "function"
      ? money(value)
      : `$${(Number(value) || 0).toFixed(2)}`;

  const getCartItemTaxValue = (items = []) =>
    items.reduce((total, item) => {
      const unitTax = Number(item.retailGst);
      const qty = Number(item.qty) || 0;
      if (!Number.isFinite(unitTax) || unitTax <= 0 || qty <= 0) return total;
      return total + unitTax * qty;
    }, 0);

  const computeDrawerFallbackTotals = (state) => {
    const items = Array.isArray(state?.items) ? state.items : [];
    const subtotal = roundCurrency(
      items.reduce(
        (total, item) =>
          total + (Number(item.price) || 0) * (Number(item.qty) || 0),
        0
      )
    );
    const itemTax = roundCurrency(getCartItemTaxValue(items));
    const totalBeforeFees = roundCurrency(subtotal + itemTax);
    const cardFeeExGst =
      totalBeforeFees > 0
        ? roundCurrency(totalBeforeFees * CARD_FEE_RATE + CARD_FEE_FIXED)
        : 0;
    const cardFeeGst = cardFeeExGst > 0 ? roundCurrency(cardFeeExGst * CARD_FEE_GST_RATE) : 0;
    const cardFeeTotal = roundCurrency(cardFeeExGst + cardFeeGst);
    const taxTotal = roundCurrency(itemTax + cardFeeGst);
    const total = roundCurrency(subtotal + taxTotal + cardFeeExGst);
    return {
      subtotal,
      shippingLabel: "Select shipping",
      cardFeeExGst,
      cardFeeGst,
      cardFeeTotal,
      taxTotal,
      total,
      discountDisplay: "-$0.00",
      processingNote:
        cardFeeTotal > 0
          ? `This transaction includes a credit card processing fee of 1.8% + A$0.30 per transaction. Credit card fee = ${formatMoney(cardFeeExGst)} + 10% GST ${formatMoney(cardFeeGst)} = ${formatMoney(cardFeeTotal)}.`
          : "",
    };
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
      if (options.awaitCreation && typeof service.ensureScriptDispense === "function") {
        const result = await service.ensureScriptDispense(id, attemptOptions);
        if (result) return result;
      }
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

  const ensureScriptMetadata = async (target, { triggerCreation = false } = {}) => {
    if (!shouldManageDispenses()) return null;
    if (!target || typeof target !== "object") return null;
    const scriptId = target.scriptId || target.script_id;
    if (!scriptId) return null;
    const meta = await fetchScriptMeta(scriptId, {
      awaitCreation: triggerCreation,
    });
    if (!meta) return null;
    const patch = attachScriptMetadata(
      {
        scriptId,
        dispenseId: meta.dispenseId,
        dispenseStatusId: meta.dispenseStatusId,
        dispenseStatusLabel: meta.dispenseStatusLabel,
      },
      {}
    );
    if (target.id) {
      patch.id = target.id;
      await updateCartItemMetadata(target.id, patch);
    }
    return patch;
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

  const ensureDispenseStatusForItem = async (item, { triggerCreation = false } = {}) => {
    if (!item || !item.id) return item;
    if (!item.isScript && !item.scriptId) return item;
    const current = Object.assign({}, item);
    if (!current.dispenseId || !current.dispenseStatusId || !current.dispenseStatus) {
      const patch = await ensureScriptMetadata(current, { triggerCreation });
      if (patch) {
        Object.assign(current, patch);
      }
    }
    return current;
  };

  const updateDispenseStatusForItem = async (item, statusKeyOrId) => {
    if (!shouldManageDispenses()) return;
    const service = getDispenseService();
    if (!service) return;
    const updatedItem = await ensureDispenseStatusForItem(item, {
      triggerCreation: false,
    });
    const dispenseId = updatedItem?.dispenseId;
    if (!dispenseId) {
      throw new Error("Unable to resolve dispense for script");
    }
    const statusId =
      resolveDispenseStatusId(statusKeyOrId) ||
      resolveDispenseStatusId(
        service.statusIds?.[statusKeyOrId]
          ? service.statusIds[statusKeyOrId]
          : statusKeyOrId
      ) ||
      resolveDispenseStatusId(statusKeyOrId);
    if (!statusId) {
      throw new Error("Unsupported dispense status");
    }
    await service.updateDispenseStatus(dispenseId, statusId);
    await updateCartItemMetadata(item.id, {
      dispenseStatusId: statusId,
      dispenseStatus: getDispenseStatusLabel(statusId),
    });
    updateProductCardDataset(
      [item.id, item.productId],
      {
        dispenseStatusId: statusId,
        dispenseStatus: getDispenseStatusLabel(statusId),
        dispenseId,
        scriptId: item.scriptId,
        suppressAutoSeed: String(statusId) === DEFAULT_DISPENSE_STATUS_IDS.CANCELLED,
      },
      { syncButtons: true }
    );
  };

  const cancelScriptDispense = async (item) => {
    if (!shouldManageDispenses()) return;
    const statusId =
      getDispenseService()?.statusIds?.CANCELLED ||
      resolveDispenseStatusId("Cancelled") ||
      DEFAULT_DISPENSE_STATUS_IDS.CANCELLED;
    await updateDispenseStatusForItem(item, statusId);
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
        row.className = "p-4 flex gap-3 items-center";
        row.innerHTML = `
        <img src="${item.image}" alt="${
          item.name
        }" class="w-16 h-16 rounded-lg object-cover"/>
        <div class="flex-1 min-w-0">
          <div class="font-semibold truncate">${item.name}</div>
          ${
            item.brand
              ? `<div class="text-sm text-gray-600">${item.brand}</div>`
              : ""
          }
          <div class="text-sm font-medium">${formatMoney(item.price)}</div>
          <div class="mt-2 inline-flex items-center gap-2">
            <button class="qty-decr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${
              item.id
            }" aria-label="Decrease quantity">−</button>
            <input class="qty-input w-12 text-center rounded-lg border px-2 py-1" value="${
              item.qty
            }" data-id="${item.id}" inputmode="numeric" aria-label="Quantity"/>
            <button class="qty-incr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${
              item.id
            }" aria-label="Increase quantity">+</button>
          </div>
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
    if (summaryContext && summaryContext.totals) {
      const { totals, shippingLabel, discountDisplay, processingNote } = summaryContext;
      debugLog("renderCart using checkoutSummary", {
        totals,
        shippingLabel,
        discountDisplay,
      });
      if (subtotalEl) subtotalEl.textContent = formatMoney(totals.subtotal);
      if (shippingEl)
        shippingEl.textContent =
          shippingLabel ||
          (totals.shippingConfirmed
            ? totals.rawShipping > 0
              ? formatMoney(totals.rawShipping)
              : "Free"
            : "Select shipping");
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
      if (subtotalEl) subtotalEl.textContent = formatMoney(fallback.subtotal);
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
    updateCheckoutButton(state);
    dlog(
      "renderCart: items",
      state.items.length,
      state.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty }))
    );
  };

  const syncAddButtons = () => {
    if (!window.Cart) return;
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
      if (!on) {
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
      const qty = Math.max(1, parseInt(qtyInput?.value || "1", 10) || 1);
      addBtn.disabled = true;
      const originalLabel = addBtn.textContent;
      addBtn.textContent = "Adding…";
      try {
        await Cart.addItem(product, qty);
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
            fetchScriptMeta(product.scriptId, {
              awaitCreation: !product.dispenseId,
            })
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
      if (item) {
        const nextQty = Math.max(0, (Number(item.qty) || 0) - 1);
        await Cart.updateQuantity(id, nextQty);
        if (nextQty === 0 && (item.isScript || item.scriptId)) {
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
          if (shouldManageDispenses()) {
            cancelScriptDispense(item).catch((err) => {
              console.error("Cancel dispense failed", err);
            });
          }
        }
      }
      return;
    }

    const incr = target.closest(".qty-incr");
    if (incr) {
      if (!hasCart) return;
      const id = incr.dataset.id;
      const item = Cart.getItem(id);
      if (item) await Cart.updateQuantity(id, item.qty + 1);
      return;
    }

    const remove = target.closest(".remove-item");
    if (remove) {
      if (!hasCart) return;
      const id = remove.dataset.id;
      const item = Cart.getItem(id);
      if (item && (item.isScript || item.scriptId)) {
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
        if (shouldManageDispenses()) {
          cancelScriptDispense(item).catch((err) => {
            console.error("Cancel dispense failed", err);
          });
        }
      }
      await Cart.removeItem(id);
      return;
    }

    if (target.closest(".clear-cart")) {
      if (!hasCart) return;
      const manage = shouldManageDispenses();
      const state = Cart.getState();
      state.items
        .filter((item) => item && (item.isScript || item.scriptId))
        .forEach((item) => {
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
            cancelScriptDispense(item).catch((err) => {
              console.error("Cancel dispense failed", err);
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
    const value = Math.max(0, parseInt(input.value || "0", 10) || 0);
    const item = Cart.getItem(id);
    if (value === 0 && item && (item.isScript || item.scriptId)) {
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
      if (shouldManageDispenses()) {
        cancelScriptDispense(item).catch((err) => {
          console.error("Cancel dispense failed", err);
        });
      }
    }
    await Cart.updateQuantity(id, value);
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
    if (shouldManageDispenses()) {
      try {
        await seedScriptsFromDom();
        await syncScriptMetadataFromDom();
      } catch (err) {
        dlog("Initial script sync failed", err);
      }
    }
    const state = Cart.getState();
    renderCart(state);
    updateCount(state);
    syncAddButtons();
    // Retry syncing buttons to catch late-rendered product cards
    setTimeout(syncAddButtons, 120);
    setTimeout(syncAddButtons, 300);
    setTimeout(syncAddButtons, 800);

    // Observe dynamic additions of product cards globally
    const syncObserver = new MutationObserver(() => {
      window.requestAnimationFrame(() => syncAddButtons());
    });
    syncObserver.observe(document.body, { childList: true, subtree: true });

    // Re-sync on bfcache restore and visibility changes
    window.addEventListener("pageshow", () => syncAddButtons());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncAddButtons();
    });

    Cart.subscribe((next) => {
      renderCart(next);
      updateCount(next);
      syncAddButtons();
      if (!next.items.length) {
        suppressedScriptIds.clear();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
