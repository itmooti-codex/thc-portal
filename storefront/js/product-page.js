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
    attachQuantityHandlers();
    handleProceedToCheckout();
    clampAndSyncInput(qtyInput?.value || "1", { syncCart: false });
  };

  try {
    init();
  } finally {
    hideLoader();
  }
})();
