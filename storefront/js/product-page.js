(() => {
  "use strict";

  try {
    const root = document.querySelector(".get-url");
    if (root?.dataset?.storefrontPage !== "product") return;
  } catch {
    return;
  }

  const {
    $, byId, clamp,
    showPageLoader: showPageLoaderFn,
    hidePageLoader: hidePageLoaderFn,
    money: moneyFn,
    toNum: toNumFn,
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

  const formatMoney =
    typeof moneyFn === "function"
      ? (value) => moneyFn(value)
      : (value) => {
          const num = Number(value);
          return `$${Number.isFinite(num) ? num.toFixed(2) : "0.00"}`;
        };

  const toNumber =
    typeof toNumFn === "function"
      ? (value) => toNumFn(value)
      : (value) => {
          const num = Number(value);
          return Number.isFinite(num) ? num : 0;
        };

  const clampQty = (value) => (typeof clamp === "function" ? clamp(value, 1, 99) : Math.max(1, Math.min(99, parseInt(value || "1", 10) || 1)));

  const cardEl = $use(".product-card");
  const qtyInput = byId && byId("product_qty");
  const decBtn = $use(".product-qty-decr");
  const incBtn = $use(".product-qty-incr");
  const checkoutBtn = $use(".product-checkout-btn");

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

  const PLACEHOLDER_PATTERN = /\[[^\]]*\]/;

  const shouldReplaceValue = (value, { allowZero = false } = {}) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "number") return false;
    const str = String(value);
    if (!str.length) return true;
    const trimmed = str.trim();
    if (!trimmed.length) return true;
    const lower = trimmed.toLowerCase();
    if (lower === "undefined" || lower === "null" || lower === "nan")
      return true;
    if (PLACEHOLDER_PATTERN.test(trimmed)) return true;
    if (allowZero && /^0+(?:\.0+)?$/.test(trimmed)) return false;
    return false;
  };

  const applyProductSnapshot = (snapshot) => {
    if (!snapshot || !cardEl) return;

    const assignDataset = (key, value) => {
      if (!cardEl.dataset) return;
      if (value === undefined || value === null) return;
      const current = cardEl.dataset[key];
      if (shouldReplaceValue(current, { allowZero: true })) {
        cardEl.dataset[key] = String(value);
      }
    };

    assignDataset("productId", snapshot.id || snapshot.productId);
    assignDataset(
      "productPaymentId",
      snapshot.productId || snapshot.paymentId || snapshot.id
    );
    assignDataset("productName", snapshot.name);
    assignDataset("productBrand", snapshot.brand);
    assignDataset("productDesc", snapshot.description);
    assignDataset("productImage", snapshot.image);
    assignDataset("productPrice", snapshot.price);
    assignDataset("retailGst", snapshot.retailGst);
    assignDataset("wholesalePrice", snapshot.wholesalePrice);
    assignDataset("scriptId", snapshot.scriptId ?? "");

    const setTextContent = (selector, value) => {
      if (!value) return;
      const el = $use(selector, cardEl);
      if (!el) return;
      if (shouldReplaceValue(el.textContent)) {
        el.textContent = String(value);
      }
    };

    setTextContent(".product-name", snapshot.name);
    setTextContent(".product-brand", snapshot.brand);
    setTextContent(".product-desc", snapshot.description);

    const priceEl = $use(".product-price", cardEl);
    if (priceEl) {
      const totalPrice = toNumber(snapshot.price) + toNumber(snapshot.retailGst);
      if (shouldReplaceValue(priceEl.textContent)) {
        priceEl.textContent = formatMoney(totalPrice);
      }
    }

    const imageEl = cardEl.querySelector("img");
    if (imageEl && snapshot.image) {
      const currentSrc = imageEl.getAttribute("src");
      if (shouldReplaceValue(currentSrc)) {
        imageEl.setAttribute("src", snapshot.image);
      }
    }
  };

  const applySnapshotIfAvailable = () => {
    if (!window.Cart || typeof window.Cart.loadProductSnapshot !== "function") {
      return null;
    }
    let snapshot = null;
    try {
      snapshot = window.Cart.loadProductSnapshot();
    } catch (err) {
      console.warn("Failed to load product snapshot", err);
      snapshot = null;
    }
    if (!snapshot) return null;
    applyProductSnapshot(snapshot);
    if (window.StorefrontCartUI?.syncAddButtons) {
      try {
        window.StorefrontCartUI.syncAddButtons();
      } catch (err) {
        console.warn("Cart button sync failed", err);
      }
    }
    if (typeof window.Cart.clearProductSnapshot === "function") {
      try {
        window.Cart.clearProductSnapshot();
      } catch (err) {
        console.warn("Failed to clear product snapshot", err);
      }
    }
    return snapshot;
  };

  const ensureCart = async () => {
    if (!window.Cart) return null;
    if (!cartInstance) {
      await Cart.init();
      cartInstance = Cart;
    }
    return cartInstance;
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

  const init = () => {
    applySnapshotIfAvailable();
    attachQuantityHandlers();
    handleProceedToCheckout();
    clampAndSyncInput(qtyInput?.value || "1", { syncCart: false });
    if (window.StorefrontCartUI?.syncAddButtons) {
      try {
        window.StorefrontCartUI.syncAddButtons();
      } catch (err) {
        console.warn("Cart button sync failed", err);
      }
    }
  };

  try {
    init();
  } finally {
    hideLoader();
  }
})();
