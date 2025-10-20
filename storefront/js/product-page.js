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

  const parseBooleanish = (value) => {
    if (value == null) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
    return null;
  };

  const cardEl = $use(".product-card");
  const qtyInput = byId && byId("product_qty");
  const decBtn = $use(".product-qty-decr");
  const incBtn = $use(".product-qty-incr");
  const checkoutBtn = $use(".product-checkout-btn");
  const actionRow = $use(".product-action-row");
  const addToCartBtn = $use(".add-to-cart-btn");
  const warningEl = $use(".product-cant-dispense");

  const applyDispenseRestrictionsFromUrl = () => {
    if (!cardEl) return;
    const params = new URLSearchParams(window.location.search);
    const scriptParam = params.get("script");
    const cantDispenseParam = params.get("cantDispense");
    const reasonParam = params.get("cantDispenseReason") || "";
    const nextDispenseParam = params.get("nextDispenseDate") || "";

    const isScriptFlag = parseBooleanish(scriptParam) === true;
    const hasScriptParam = scriptParam != null && String(scriptParam).trim() !== "";
    const isScript = isScriptFlag || hasScriptParam;
    const cantDispenseFlag = parseBooleanish(cantDispenseParam) === true;
    const normalizedReason = reasonParam.replace(/\s+/g, " ").trim();
    const normalizedNextDispense = nextDispenseParam.trim();
    const hasRestrictionInfo = Boolean(normalizedReason || normalizedNextDispense);
    const blockDispense = isScript && (cantDispenseFlag || hasRestrictionInfo);

    if (!blockDispense) {
      if (actionRow) actionRow.classList.remove("hidden");
      if (addToCartBtn) addToCartBtn.classList.remove("hidden");
      if (checkoutBtn) checkoutBtn.classList.remove("hidden");
      if (warningEl) {
        warningEl.textContent = "";
        warningEl.classList.add("hidden");
        warningEl.removeAttribute("role");
      }
      return;
    }

    if (actionRow) actionRow.classList.add("hidden");
    if (addToCartBtn) addToCartBtn.classList.add("hidden");
    if (checkoutBtn) checkoutBtn.classList.add("hidden");

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
      const primaryMessage = normalizedReason || fallbackReason;
      warningEl.replaceChildren(document.createTextNode(primaryMessage));
      if (normalizedNextDispense) {
        warningEl.appendChild(document.createElement("br"));
        warningEl.appendChild(
          document.createTextNode(`Available From - ${normalizedNextDispense}`)
        );
      }
      warningEl.classList.remove("hidden");
      warningEl.setAttribute("role", "alert");
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
    applyDispenseRestrictionsFromUrl();
  };

  try {
    init();
  } finally {
    hideLoader();
  }
})();
