(() => {
  "use strict";

  if (document.body?.dataset?.storefrontPage !== "product") return;

  const { $, byId, money, clamp } = window.StorefrontUtils || {};
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
      document.body?.dataset?.checkoutUrl ||
      "checkout.html";
    try {
      return new URL(candidate, window.location.href).toString();
    } catch {
      return candidate;
    }
  };

  const populateProduct = (product) => {
    if (!cardEl || !product) return;
    cardEl.dataset.productId =
      product.id || cardEl.dataset.productId || "demo-product";
    cardEl.dataset.productName =
      product.name || cardEl.dataset.productName || "Demo product";
    cardEl.dataset.productBrand =
      product.brand || cardEl.dataset.productBrand || "Demo brand";
    if (typeof product.price !== "undefined")
      cardEl.dataset.productPrice = String(product.price);
    cardEl.dataset.productDesc =
      product.description || cardEl.dataset.productDesc || "";
    cardEl.dataset.productImage =
      product.image || cardEl.dataset.productImage || "";
    cardEl.dataset.productPack =
      product.pack || cardEl.dataset.productPack || "";
    cardEl.dataset.productCategory =
      product.category || cardEl.dataset.productCategory || "";
    cardEl.dataset.productSchedule =
      product.schedule || cardEl.dataset.productSchedule || "";
    cardEl.dataset.productThc = product.thc || cardEl.dataset.productThc || "";
    cardEl.dataset.productCbd = product.cbd || cardEl.dataset.productCbd || "";
    cardEl.dataset.productOrigin =
      product.origin || cardEl.dataset.productOrigin || "";
    cardEl.dataset.productCultivar =
      product.cultivar || cardEl.dataset.productCultivar || "";
    cardEl.dataset.productTerpenes =
      product.terpenes || cardEl.dataset.productTerpenes || "";
    cardEl.dataset.productNotice =
      product.notice || cardEl.dataset.productNotice || "";

    const setText = (selector, value) => {
      if (!value && value !== 0) return;
      const el = $use(selector);
      if (el) el.textContent = value;
    };

    setText(".product-brand", cardEl.dataset.productBrand);
    setText("#product_name", cardEl.dataset.productName);
    setText(".product-desc", cardEl.dataset.productDesc);
    setText(
      "#product_price",
      money(Number(cardEl.dataset.productPrice) || product.price || 0)
    );
    setText("#product_pack", cardEl.dataset.productPack);
    setText("#product_category", cardEl.dataset.productCategory);
    setText("#product_schedule", cardEl.dataset.productSchedule);
    setText("#product_thc", cardEl.dataset.productThc);
    setText("#product_cbd", cardEl.dataset.productCbd);
    setText("#product_origin", cardEl.dataset.productOrigin);
    setText("#product_cultivar", cardEl.dataset.productCultivar);
    setText("#product_terpenes", cardEl.dataset.productTerpenes);

    const imgEl = $use("#product_image");
    const fallbackEl = $use("#product_image_fallback");
    if (imgEl) {
      if (cardEl.dataset.productImage) {
        imgEl.src = cardEl.dataset.productImage;
        imgEl.alt = product.name || imgEl.alt || "Product image";
        imgEl.classList.remove("hidden");
        fallbackEl?.classList.add("hidden");
      } else {
        imgEl.classList.add("hidden");
        if (fallbackEl) fallbackEl.classList.remove("hidden");
      }
    }

    const notice = $use("#product_notice");
    if (notice && cardEl.dataset.productNotice)
      notice.textContent = cardEl.dataset.productNotice;

    window.StorefrontCartUI?.safeId?.(cardEl);
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

  const initialProductFromDataset = () => {
    if (!cardEl) return null;
    return {
      id: cardEl.dataset.productId,
      name: cardEl.dataset.productName,
      brand: cardEl.dataset.productBrand,
      price: Number(cardEl.dataset.productPrice) || 0,
      description: cardEl.dataset.productDesc,
      image: cardEl.dataset.productImage,
      pack: cardEl.dataset.productPack,
      category: cardEl.dataset.productCategory,
      schedule: cardEl.dataset.productSchedule,
      thc: cardEl.dataset.productThc,
      cbd: cardEl.dataset.productCbd,
      origin: cardEl.dataset.productOrigin,
      cultivar: cardEl.dataset.productCultivar,
      terpenes: cardEl.dataset.productTerpenes,
      notice: cardEl.dataset.productNotice,
    };
  };

  const productIdFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      return id ? String(id) : null;
    } catch (err) {
      return null;
    }
  };

  const syncButtonState = () => {
    window.StorefrontCartUI?.syncAddButtons?.();
  };

  const loadProduct = async () => {
    const cart = await ensureCart();
    let product = cart?.loadProductSnapshot ? cart.loadProductSnapshot() : null;
    // Prefer URL id if present to avoid id drift across pages
    const urlId = productIdFromUrl();
    if (urlId) {
      product = Object.assign({}, product || {}, { id: urlId });
    }
    if (!product || !product.id) product = initialProductFromDataset();
    if (product) populateProduct(product);
    if (cart && product?.id && cart.getItem) {
      const existing = cart.getItem(product.id);
      if (existing?.qty) clampAndSyncInput(existing.qty, { syncCart: false });
    }
    syncButtonState();
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
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadProduct, {
        once: true,
      });
    } else {
      loadProduct();
    }
  };

  init();
})();
