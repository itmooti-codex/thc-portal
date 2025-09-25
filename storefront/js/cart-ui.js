(() => {
  "use strict";

  const CART_TEMPLATE = `
<div class="storefront-cart-root">
  <div class="cart-overlay fixed inset-0 z-[9990] bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200"></div>
  <aside
    class="cart-drawer fixed inset-y-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl translate-x-full transition-transform duration-300 flex flex-col z-[9991]">
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
      <div class="flex justify-between text-sm"><span>Shipping</span><span class="font-medium">Calculated at checkout</span></div>
      <div class="flex justify-between text-base font-bold"><span>Total</span><span class="cart-total">$0.00</span></div>
      <div class="flex items-center justify-between gap-3">
        <button class="clear-cart px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100">Clear Cart</button>
        <button class="cart-checkout px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Proceed to checkout</button>
      </div>
    </footer>
  </aside>
</div>`;

  /* ========= helpers ========= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const money = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(n || 0);
  const toNum = (s) => Number(String(s || "").replace(/[^0-9.\-]/g, "")) || 0;

  let overlayEl;
  let drawerEl;
  let itemsContainer;
  let subtotalEl;
  let totalEl;
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
    totalEl = document.querySelector(".cart-total");
    checkoutBtn = document.querySelector(".cart-checkout");
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
        itemsContainer.appendChild(row);
      });
    }
    const subtotal = state.items.reduce(
      (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (totalEl) totalEl.textContent = money(subtotal);
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
    ensureDrawer,
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
      if (!alreadyOnCheckout) window.location.href = "https://app.thehappy.clinic/storefront/checkout";
    }
  });

  document.addEventListener("change", (event) => {
    ensureDrawer();
    const input = event.target.closest(".qty-input");
    if (!input || typeof Cart === "undefined") return;
    const id = input.dataset.id;
    const value = Math.max(0, parseInt(input.value || "0", 10) || 0);
    Cart.updateQuantity(id, value);
  });

  document.addEventListener("keydown", (event) => {
    ensureDrawer();
    if (event.key === "Escape" && !overlayEl?.classList.contains("pointer-events-none")) {
      closeCart();
    }
  });

  /* ========= boot ========= */
  const init = async () => {
    ensureDrawer();
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
