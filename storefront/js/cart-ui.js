(() => {
  "use strict";

  /* ========= helpers ========= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const money = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(n || 0);
  const toNum = (s) => Number(String(s || "").replace(/[^0-9.\-]/g, "")) || 0;

  /* ========= cart overlay ========= */
  const overlayEl = $(".cart-overlay");
  const drawerEl = $(".cart-drawer");

  const openCart = () => {
    if (!overlayEl || !drawerEl) return;
    overlayEl.classList.remove("pointer-events-none");
    overlayEl.classList.add("opacity-100");
    drawerEl.classList.remove("translate-x-full");
  };

  const closeCart = () => {
    if (!overlayEl || !drawerEl) return;
    overlayEl.classList.add("pointer-events-none");
    overlayEl.classList.remove("opacity-100");
    drawerEl.classList.add("translate-x-full");
  };

  /* ========= product helpers ========= */
  const safeId = (el) => {
    if (!el) return "";
    const datasetId = el.dataset?.productId || el.closest(".product-card")?.dataset?.productId;
    if (datasetId && !datasetId.startsWith("[")) return String(datasetId);
    const card = el.closest(".product-card");
    const name = card?.querySelector(".product-name")?.textContent?.trim() || "";
    const brand = card?.querySelector(".product-brand")?.textContent?.trim() || "";
    const url = card?.querySelector(".view-product-link")?.getAttribute("href") || "";
    const generated = `n:${name}|b:${brand}|u:${url}`
      .toLowerCase()
      .replace(/\s+/g, "-")
      .slice(0, 140);
    if (card) card.dataset.productId = generated;
    if (el.dataset) el.dataset.productId = generated;
    return generated;
  };

  const extractProduct = (card) => {
    if (!card) return null;
    const priceAttr = card.dataset.productPrice;
    const product = {
      id: card.dataset.productId || safeId(card),
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
    return product;
  };

  /* ========= rendering ========= */
  const updateCount = (state) => {
    const count = state
      ? state.items.reduce((total, item) => total + (Number(item.qty) || 0), 0)
      : Cart?.getCount?.() || 0;
    const bubble = $(".cart-count");
    if (!bubble) return;
    bubble.textContent = count;
    bubble.classList.toggle("hidden", count === 0);
  };

  const updateCheckoutButton = (state) => {
    const checkoutBtn = $(".cart-checkout");
    if (!checkoutBtn) return;
    const disabled = !state.items.length;
    checkoutBtn.disabled = disabled;
    checkoutBtn.classList.toggle("opacity-50", disabled);
    checkoutBtn.classList.toggle("cursor-not-allowed", disabled);
  };

  const renderCart = (state) => {
    const wrap = $(".cart-items");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!state.items.length) {
      wrap.innerHTML =
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
          ${item.brand ? `<div class="text-sm text-gray-600">${item.brand}</div>` : ""}
          <div class="text-sm font-medium">${money(item.price)}</div>
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
        wrap.appendChild(row);
      });
    }
    const subtotal = state.items.reduce(
      (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );
    $(".cart-subtotal").textContent = money(subtotal);
    $(".cart-total").textContent = money(subtotal);
    updateCheckoutButton(state);
  };

  const syncAddButtons = () => {
    if (!window.Cart) return;
    const items = Cart.getState().items;
    const inCart = new Set(items.map((item) => String(item.id)));
    $$(".add-to-cart-btn").forEach((btn) => {
      const id = safeId(btn);
      const on = inCart.has(String(id));
      btn.disabled = on;
      btn.textContent = on ? "Added ✓" : "Add to Cart";
      btn.classList.toggle("bg-gray-300", on);
      btn.classList.toggle("text-gray-700", on);
      btn.classList.toggle("cursor-not-allowed", on);
      btn.classList.toggle("bg-neutral-900", !on);
      btn.classList.toggle("hover:bg-neutral-700", !on);
      btn.classList.toggle("text-white", !on);
    });
  };

  window.StorefrontCartUI = Object.assign(window.StorefrontCartUI || {}, {
    openCart,
    closeCart,
    extractProduct,
    safeId,
    renderCart,
    syncAddButtons,
  });

  /* ========= events ========= */
  document.addEventListener("click", async (event) => {
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
      if (item) Cart.updateQuantity(id, Math.max(0, item.qty - 1));
      return;
    }

    const incr = target.closest(".qty-incr");
    if (incr) {
      if (!hasCart) return;
      const id = incr.dataset.id;
      const item = Cart.getItem(id);
      if (item) Cart.updateQuantity(id, item.qty + 1);
      return;
    }

    const remove = target.closest(".remove-item");
    if (remove) {
      if (!hasCart) return;
      Cart.removeItem(remove.dataset.id);
      return;
    }

    if (target.closest(".clear-cart")) {
      if (!hasCart) return;
      Cart.clear();
      return;
    }

    if (target.closest(".cart-checkout")) {
      if (!hasCart) return;
      if (!Cart.getState().items.length) return;
      const alreadyOnCheckout = /checkout\.html$/i.test(
        window.location.pathname || ""
      );
      closeCart();
      if (!alreadyOnCheckout) window.location.href = "checkout.html";
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target.closest(".qty-input");
    if (!input || typeof Cart === "undefined") return;
    const id = input.dataset.id;
    const value = Math.max(0, parseInt(input.value || "0", 10) || 0);
    Cart.updateQuantity(id, value);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlayEl?.classList.contains("pointer-events-none")) {
      closeCart();
    }
  });

  /* ========= boot ========= */
  const init = async () => {
    if (!window.Cart) return;
    await Cart.init();
    const state = Cart.getState();
    renderCart(state);
    updateCount(state);
    syncAddButtons();

    Cart.subscribe((next) => {
      renderCart(next);
      updateCount(next);
      syncAddButtons();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
