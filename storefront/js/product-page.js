(() => {
  "use strict";

  try {
    const root = document.querySelector(".get-url");
    if (root?.dataset?.storefrontPage !== "product") return;
  } catch {
    return;
  }

  const {
    $, byId, clamp, money,
    showPageLoader: showPageLoaderFn,
    hidePageLoader: hidePageLoaderFn,
  } = window.StorefrontUtils || {};
  const showLoader =
    typeof showPageLoaderFn === "function"
      ? (message) => showPageLoaderFn(message)
      : () => {};
  const hideLoader =
    typeof hidePageLoaderFn === "function" ? hidePageLoaderFn : () => {};
  showLoader("Loading product…");
  const fallback$ = (sel, ctx = document) => ctx.querySelector(sel);
  const $use = $ || fallback$;

  const clampQty = (value) => (typeof clamp === "function" ? clamp(value, 1, 99) : Math.max(1, Math.min(99, parseInt(value || "1", 10) || 1)));
  const placeholderTokenRegex = /^\s*\[[^\]]*\]\s*$/;

  const normalizeRestrictionValue = (value) => {
    if (value == null) return "";
    const normalized = String(value).replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (placeholderTokenRegex.test(normalized)) return "";
    return normalized;
  };

  const parseBooleanish = (value) => {
    if (value == null) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
    return null;
  };

  const cardEl = $use(".product-card");
  const imageEl = document.getElementById("product_image");
  const imageFallbackEl = document.getElementById("product_image_fallback");
  const qtyInput = byId && byId("product_qty");
  const decBtn = $use(".product-qty-decr");
  const incBtn = $use(".product-qty-incr");
  const checkoutBtn = $use(".product-checkout-btn");
  const actionRow = $use(".product-action-row");
  const addToCartBtn = $use(".add-to-cart-btn");
  const warningEl = $use(".product-cant-dispense");
  const qtyWrapper = qtyInput ? qtyInput.closest(".input-wrapper") : null;
  const qtyControls = actionRow?.querySelector(".flex.items-center.gap-2");

  const isPlaceholderValue = (value) => {
    if (value === null || value === undefined) return true;
    const str = String(value).trim();
    if (!str) return true;
    if (placeholderTokenRegex.test(str)) return true;
    if (["null", "undefined"].includes(str.toLowerCase())) return true;
    return false;
  };

  const isMeaningfulImage = (value) => {
    if (value === null || value === undefined) return false;
    const str = String(value).trim();
    if (!str) return false;
    if (placeholderTokenRegex.test(str)) return false;
    if (["null", "undefined"].includes(str.toLowerCase())) return false;
    return true;
  };

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    if (typeof money === "function") {
      try {
        return money(amount);
      } catch {}
    }
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "AUD",
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const parseMoney = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const str = String(value).trim();
    if (!str) return null;
    const cleaned = str.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getQueryParam = (key) => {
    try {
      return new URLSearchParams(window.location.search).get(key);
    } catch {
      return null;
    }
  };

  const normaliseText = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const getProductInitial = () => {
    const candidates = [
      cardEl?.dataset?.productName,
      document.getElementById("product_name")?.textContent,
      cardEl?.dataset?.productBrand,
    ];
    for (const candidate of candidates) {
      const str = normaliseText(candidate);
      if (str) return str.charAt(0).toUpperCase();
    }
    return "•";
  };

  const showImageFallback = () => {
    if (imageFallbackEl) {
      imageFallbackEl.textContent = getProductInitial();
      imageFallbackEl.classList.remove("hidden");
    }
    if (imageEl) {
      imageEl.classList.add("hidden");
      imageEl.setAttribute("aria-hidden", "true");
    }
  };

  const hideImageFallback = () => {
    if (imageFallbackEl) {
      imageFallbackEl.classList.add("hidden");
    }
    if (imageEl) {
      imageEl.classList.remove("hidden");
      imageEl.removeAttribute("aria-hidden");
    }
  };

  const applyImageFallback = () => {
    if (!imageEl) return;
    const src = imageEl.getAttribute("src")?.trim() || "";
    if (!src || placeholderTokenRegex.test(src) || !isMeaningfulImage(src)) {
      showImageFallback();
    } else {
      hideImageFallback();
    }
    if (imageFallbackEl) {
      imageFallbackEl.textContent = getProductInitial();
    }
  };

  if (imageEl) {
    imageEl.addEventListener("error", () => {
      showImageFallback();
    });
    imageEl.addEventListener("load", () => {
      applyImageFallback();
    });
  }

  const setAriaDisabled = (el, disabled) => {
    if (!el) return;
    if (disabled) {
      el.setAttribute("aria-disabled", "true");
    } else {
      el.removeAttribute("aria-disabled");
    }
  };

  const setQuantityControlsEnabled = (enabled) => {
    const disabled = !enabled;
    [decBtn, incBtn].forEach((btn) => {
      if (!btn) return;
      btn.disabled = disabled;
      btn.classList.toggle("opacity-50", disabled);
      btn.classList.toggle("cursor-not-allowed", disabled);
      setAriaDisabled(btn, disabled);
    });

    if (qtyInput) {
      qtyInput.disabled = disabled;
      qtyInput.classList.toggle("text-gray-400", disabled);
      qtyInput.classList.toggle("cursor-not-allowed", disabled);
      setAriaDisabled(qtyInput, disabled);
    }

    if (qtyWrapper) {
      qtyWrapper.classList.toggle("opacity-60", disabled);
      qtyWrapper.classList.toggle("cursor-not-allowed", disabled);
    }
  };

  const hideElement = (el) => {
    if (!el) return;
    el.classList.add("hidden");
    if (!el.hasAttribute("hidden")) {
      el.setAttribute("hidden", "");
    }
  };

  const showElement = (el) => {
    if (!el) return;
    el.classList.remove("hidden");
    if (el.hasAttribute("hidden")) {
      el.removeAttribute("hidden");
    }
  };

  const applyDispenseRestrictionsFromUrl = () => {
    if (!cardEl) return;
    const params = new URLSearchParams(window.location.search);
    const scriptParam = params.get("script");
    const scriptIdParam = normalizeRestrictionValue(params.get("scriptId"));
    const cantDispenseParam = params.get("cantDispense");
    const reasonParam = normalizeRestrictionValue(
      params.get("cantDispenseReason")
    );
    const nextDispenseParam = normalizeRestrictionValue(
      params.get("nextDispenseDate")
    );

    if (
      cardEl &&
      scriptIdParam &&
      (isPlaceholderValue(cardEl.dataset.scriptId) || !cardEl.dataset.scriptId)
    ) {
      cardEl.dataset.scriptId = scriptIdParam;
    }

    const normalizedScriptParam =
      scriptParam == null ? "" : String(scriptParam).trim();
    const scriptFlag = parseBooleanish(scriptParam);
    const isScript =
      scriptFlag === true ||
      (scriptFlag === null && normalizedScriptParam.length > 0);
    const cantDispenseFlag = parseBooleanish(cantDispenseParam) === true;
    const hasRestrictionInfo = Boolean(reasonParam || nextDispenseParam);
    const blockDispense = isScript && (cantDispenseFlag || hasRestrictionInfo);

    setQuantityControlsEnabled(!isScript);
    if (isScript) {
      clampAndSyncInput("1");
    }

    if (qtyControls) {
      if (isScript) {
        hideElement(qtyControls);
      } else {
        showElement(qtyControls);
      }
    }

    if (!blockDispense) {
      showElement(actionRow);
      showElement(addToCartBtn);
      showElement(checkoutBtn);
      if (warningEl) {
        warningEl.textContent = "";
        hideElement(warningEl);
        warningEl.removeAttribute("role");
      }
      return;
    }

    hideElement(actionRow);
    hideElement(addToCartBtn);
    hideElement(checkoutBtn);

    if (cardEl?.dataset?.productId && window.Cart?.getItem) {
      const productId = cardEl.dataset.productId;
      const existing = window.Cart.getItem(productId);
      if (existing) {
        window.Cart.removeItem(existing.id || productId).catch((err) => {
          console.warn("Failed to remove non-dispensable script", err);
        });
      }
    }

    if (warningEl) {
      const fallbackReason = "This script is not ready to dispense.";
      warningEl.replaceChildren();

      const primaryLine = document.createElement("span");
      primaryLine.textContent = (reasonParam || fallbackReason).trim();
      warningEl.appendChild(primaryLine);

      if (nextDispenseParam) {
        warningEl.appendChild(document.createElement("br"));
        warningEl.appendChild(
          document.createTextNode(`Available From - ${nextDispenseParam}`)
        );
      }

      showElement(warningEl);
      warningEl.setAttribute("role", "alert");
    }
  };

  const applyProductSnapshot = () => {
    if (!cardEl || !window.Cart?.loadProductSnapshot) return null;
    let snapshot = null;
    try {
      snapshot = Cart.loadProductSnapshot?.() || null;
    } catch (err) {
      console.warn("Failed to load product snapshot", err);
    }
    if (!snapshot) return null;

    const urlProductId = normaliseText(getQueryParam("id"));
    const matchesUrl = (candidate) => {
      if (!urlProductId) return false;
      if (!candidate && candidate !== 0) return false;
      return normaliseText(candidate) === urlProductId;
    };

    const shouldApplyId =
      matchesUrl(snapshot.id) ||
      matchesUrl(snapshot.productId) ||
      isPlaceholderValue(cardEl.dataset.productId);

    if (shouldApplyId) {
      if (snapshot.id) {
        cardEl.dataset.productId = normaliseText(snapshot.id);
      }
      if (snapshot.productId) {
        cardEl.dataset.productPaymentId = normaliseText(snapshot.productId);
      }
    }

    const assignTextContent = (selector, value) => {
      if (!value) return;
      const el = selector ? $use(selector, cardEl) : null;
      if (el && (isPlaceholderValue(el.textContent) || !normaliseText(el.textContent))) {
        el.textContent = value;
      }
    };

    if (snapshot.name && isPlaceholderValue(cardEl.dataset.productName)) {
      cardEl.dataset.productName = snapshot.name;
    }
    assignTextContent(".product-name", snapshot.name);

    if (snapshot.brand && isPlaceholderValue(cardEl.dataset.productBrand)) {
      cardEl.dataset.productBrand = snapshot.brand;
    }
    assignTextContent(".product-brand", snapshot.brand);

    if (snapshot.description && isPlaceholderValue(cardEl.dataset.productDesc)) {
      cardEl.dataset.productDesc = snapshot.description;
    }
    assignTextContent(".product-desc", snapshot.description);

    const priceFromSnapshot =
      parseMoney(snapshot.price) ??
      parseMoney(snapshot.productPrice) ??
      parseMoney(snapshot.product_price);
    if (priceFromSnapshot !== null) {
      cardEl.dataset.productPrice = String(priceFromSnapshot);
      const priceEl = $use(".product-price", cardEl);
      if (priceEl) {
        priceEl.textContent = formatMoney(priceFromSnapshot);
      }
    }

    if (snapshot.image && isMeaningfulImage(snapshot.image)) {
      cardEl.dataset.productImage = snapshot.image;
      if (imageEl) {
        const currentSrc = imageEl.getAttribute("src")?.trim() || "";
        if (!currentSrc || placeholderTokenRegex.test(currentSrc)) {
          imageEl.setAttribute("src", snapshot.image);
        }
      }
    }

    if (imageEl) {
      const nameText = normaliseText(
        cardEl.dataset.productName || document.getElementById("product_name")?.textContent
      );
      if (nameText) {
        imageEl.setAttribute("alt", nameText);
      }
    }

    const scriptIdFromSnapshot = String(snapshot.scriptId || "").trim();
    if (scriptIdFromSnapshot) {
      cardEl.dataset.scriptId = scriptIdFromSnapshot;
    } else {
      delete cardEl.dataset.scriptId;
    }

    const dispenseIdFromSnapshot = String(snapshot.dispenseId || "").trim();
    if (dispenseIdFromSnapshot) {
      cardEl.dataset.dispenseId = dispenseIdFromSnapshot;
    } else {
      delete cardEl.dataset.dispenseId;
    }

    const dispenseStatusFromSnapshot = String(snapshot.dispenseStatus || "").trim();
    if (dispenseStatusFromSnapshot) {
      cardEl.dataset.dispenseStatus = dispenseStatusFromSnapshot;
    } else {
      delete cardEl.dataset.dispenseStatus;
    }

    const dispenseStatusIdFromSnapshot = String(snapshot.dispenseStatusId || "").trim();
    if (dispenseStatusIdFromSnapshot) {
      cardEl.dataset.dispenseStatusId = dispenseStatusIdFromSnapshot;
    } else {
      delete cardEl.dataset.dispenseStatusId;
    }

    const itemIdFromSnapshot =
      snapshot.dispenseItemId || snapshot.itemId || snapshot.productId || snapshot.id;
    const trimmedItemId = String(itemIdFromSnapshot || "").trim();
    if (trimmedItemId) {
      cardEl.dataset.itemId = trimmedItemId;
    } else {
      delete cardEl.dataset.itemId;
    }

    return snapshot;
  };

  const ensureProductIdFromUrl = () => {
    if (!cardEl) return;
    const urlProductId = normaliseText(getQueryParam("id"));
    if (
      urlProductId &&
      (isPlaceholderValue(cardEl.dataset.productId) || !cardEl.dataset.productId)
    ) {
      cardEl.dataset.productId = urlProductId;
    }
  };

  const getCheckoutUrl = () => {
    const candidate =
      window.StorefrontCartUI?.getCheckoutUrl?.() ||
      document.querySelector(".checkout-container")?.dataset?.checkoutUrl ||
      document.querySelector(".get-url")?.dataset?.checkoutUrl ||
      "checkout.html";
    try {
      return new URL(candidate, window.location.href).toString();
    } catch {
      return candidate;
    }
  };

  let cartInstance = null;
  let cartSubscriptionCleanup = null;

  const ensureCart = async () => {
    if (!window.Cart) return null;
    if (!cartInstance) {
      await Cart.init();
      cartInstance = Cart;
    }
    return cartInstance;
  };

  const setAddButtonVisualState = (added) => {
    if (!addToCartBtn) return;
    addToCartBtn.disabled = added;
    addToCartBtn.textContent = added ? "Added ✓" : "Add to cart";
    addToCartBtn.classList.toggle("bg-gray-300", added);
    addToCartBtn.classList.toggle("text-gray-700", added);
    addToCartBtn.classList.toggle("cursor-not-allowed", added);
    addToCartBtn.classList.toggle("bg-neutral-900", !added);
    addToCartBtn.classList.toggle("text-white", !added);
    if (added) {
      addToCartBtn.classList.remove("hover:bg-neutral-700", "hover:bg-neutral-800");
    } else {
      addToCartBtn.classList.add("hover:bg-neutral-700");
      addToCartBtn.classList.remove("hover:bg-neutral-800");
    }
  };

  const syncDetailAddButton = async () => {
    if (!addToCartBtn) return;
    const cart = await ensureCart();
    const productId = normaliseText(cardEl?.dataset?.productId);
    const paymentId = normaliseText(cardEl?.dataset?.productPaymentId);
    const scriptId = normaliseText(cardEl?.dataset?.scriptId);
    let added = false;
    if (cart) {
      const candidates = [productId, paymentId].filter(Boolean);
      if (!added && candidates.length && typeof cart.getItem === "function") {
        for (const id of candidates) {
          try {
            const existing = cart.getItem(id);
            if (existing) {
              added = true;
              break;
            }
          } catch (err) {
            console.warn("Failed to resolve cart item", err);
          }
        }
      }
      if (!added) {
        let items = [];
        try {
          const state = typeof cart.getState === "function" ? cart.getState() : null;
          if (state && Array.isArray(state.items)) items = state.items;
        } catch (err) {
          console.warn("Failed to read cart state", err);
        }
        added = items.some((item) => {
          if (!item) return false;
          const itemId = normaliseText(item.id);
          const itemProductId = normaliseText(item.productId);
          const itemScriptId = normaliseText(item.scriptId || item.script_id);
          if (productId && (itemId === productId || itemProductId === productId))
            return true;
          if (paymentId && (itemId === paymentId || itemProductId === paymentId))
            return true;
          if (scriptId && scriptId === itemScriptId) return true;
          return false;
        });
      }
    }
    if (!added) {
      try {
        const persisted = window.StorefrontCartUI?.getPersistentAdditions?.();
        if (persisted) {
          const memoryIds = new Set();
          const collected = []
            .concat(persisted.productIds || [])
            .concat(persisted.scriptIds || []);
          collected.forEach((value) => {
            const normalized = normaliseText(value);
            if (normalized) memoryIds.add(normalized);
          });
          if (
            (productId && memoryIds.has(productId)) ||
            (paymentId && memoryIds.has(paymentId)) ||
            (scriptId && memoryIds.has(scriptId))
          ) {
            added = true;
          }
        }
      } catch (err) {
        console.warn("Failed to read persisted cart additions", err);
      }
    }
    if (!added && parseBooleanish(getQueryParam("added")) === true) {
      added = true;
    }
    setAddButtonVisualState(added);
  };

  const syncCartQuantity = async (qty) => {
    const cart = await ensureCart();
    if (!cart || !cardEl) return;
    const productId = cardEl.dataset.productId;
    if (!productId || !cart.getItem) return;
    const existing = cart.getItem(productId);
    if (existing && existing.qty !== qty) {
      await cart.updateQuantity(productId, qty);
    }
  };

  const clampAndSyncInput = (rawValue, { syncCart = true } = {}) => {
    const next = clampQty(rawValue);
    if (qtyInput) qtyInput.value = String(next);
    if (syncCart) syncCartQuantity(next).catch((err) => console.error(err));
    return next;
  };

  const attachQuantityHandlers = () => {
    if (decBtn)
      decBtn.addEventListener("click", () => {
        clampAndSyncInput((parseInt(qtyInput?.value || "1", 10) || 1) - 1);
      });
    if (incBtn)
      incBtn.addEventListener("click", () => {
        clampAndSyncInput((parseInt(qtyInput?.value || "1", 10) || 1) + 1);
      });
    if (qtyInput)
      qtyInput.addEventListener("change", () => {
        clampAndSyncInput(qtyInput.value);
      });
  };

  const handleProceedToCheckout = () => {
    if (!checkoutBtn) return;
    checkoutBtn.addEventListener("click", async () => {
      const cart = await ensureCart();
      if (cart && cardEl) {
        const product = window.StorefrontCartUI?.extractProduct?.(cardEl);
        if (product && product.id) {
          const qty = clampAndSyncInput(qtyInput?.value || "1", {
            syncCart: false,
          });
          const existing = cart.getItem ? cart.getItem(product.id) : null;
          if (!existing) {
            await cart.addItem(product, qty);
          } else if (existing.qty !== qty) {
            await cart.updateQuantity(product.id, qty);
          }
        }
      }
      const url = getCheckoutUrl();
      try {
        window.location.assign(url);
      } catch {
        window.location.href = url;
      }
    });
  };

  const init = async () => {
    applyProductSnapshot();
    ensureProductIdFromUrl();
    await ensureCart();
    attachQuantityHandlers();
    handleProceedToCheckout();
    clampAndSyncInput(qtyInput?.value || "1", { syncCart: false });
    applyDispenseRestrictionsFromUrl();
    applyImageFallback();
    if (!cartSubscriptionCleanup && window.Cart?.subscribe) {
      try {
        cartSubscriptionCleanup = Cart.subscribe(() => {
          syncDetailAddButton().catch((err) => {
            console.error("Failed to sync product add button", err);
          });
        });
      } catch (err) {
        console.warn("Failed to subscribe to cart updates", err);
      }
    }
    window.StorefrontCartUI?.syncAddButtons?.();
    await syncDetailAddButton();
  };

  init()
    .catch((err) => {
      console.error("Product page init failed", err);
    })
    .finally(() => {
      hideLoader();
    });
})();
