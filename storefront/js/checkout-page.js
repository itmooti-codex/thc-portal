(() => {
  "use strict";

  const pageHint = document.body?.dataset?.storefrontPage;
  const isCheckoutPage =
    pageHint === "checkout" ||
    !!document.querySelector(".checkout-summary") ||
    !!document.querySelector("[data-checkout-page]");

  if (!isCheckoutPage) return;

  window.StorefrontCartUI?.ensureDrawer?.();

  /* ========= helpers ========= */
  const { $, $$, byId, money } = window.StorefrontUtils || {};
  const fallback$ = (sel, ctx = document) => ctx.querySelector(sel);
  const fallback$$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const $use = $ || fallback$;
  const $$use = $$ || fallback$$;

  /* ========= checkout state ========= */
  const checkoutState = {
    steps: ["contact", "address", "payment", "review"],
    stepIndex: 0,
    shippingMethod: "standard",
    coupon: null,
    couponMeta: null,
    freeShipping: false,
  };

  const shippingRates = {
    standard: 0,
    express: 14.95,
  };

  const knownCoupons = {
    SAVE10: {
      type: "percent",
      value: 0.1,
      message: "10% off applied",
    },
    WELCOME20: {
      type: "fixed",
      value: 20,
      message: "$20 discount applied",
    },
    FREESHIP: {
      type: "shipping",
      value: 0,
      message: "Free shipping unlocked",
    },
  };

  /* ========= order summary ========= */
  const summaryEls = {
    list: $use(".checkout-summary"),
    subtotal: $use(".summary-subtotal"),
    shipping: $use(".summary-shipping"),
    discount: $use(".summary-discount"),
    total: $use(".summary-total"),
  };

  const calcTotals = (cartState) => {
    const subtotal = cartState.items.reduce(
      (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );
    const baseShipping = shippingRates[checkoutState.shippingMethod] || 0;
    const shipping = checkoutState.freeShipping ? 0 : baseShipping;
    let discount = 0;
    const meta = checkoutState.couponMeta;
    if (meta) {
      if (meta.type === "percent") discount = subtotal * meta.value;
      if (meta.type === "fixed") discount = meta.value;
    }
    discount = Math.min(discount, subtotal);
    const total = subtotal + shipping - discount;
    return { subtotal, shipping, discount, total };
  };

  const renderSummary = () => {
    if (!summaryEls.list || typeof Cart === "undefined") return;
    const cartState = Cart.getState();
    summaryEls.list.innerHTML = "";
    if (!cartState.items.length) {
      summaryEls.list.innerHTML =
        '<div class="p-4 text-sm text-gray-500">Your cart is empty.</div>';
    } else {
      cartState.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "py-4 flex gap-3 items-center";
        row.innerHTML = `
        <img src="${item.image}" alt="${
        item.name
      }" class="w-16 h-16 rounded-lg object-cover"/>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm sm:text-base truncate">${item.name}</div>
          ${
            item.brand
              ? `<div class=\"text-xs text-gray-500\">${item.brand}</div>`
              : ""
          }
          <div class="text-sm font-medium text-gray-900">${money(item.price)}</div>
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
        summaryEls.list.appendChild(row);
      });
    }
    const totals = calcTotals(cartState);
    summaryEls.subtotal.textContent = money(totals.subtotal);
    summaryEls.shipping.textContent = totals.shipping > 0 ? money(totals.shipping) : "Free";
    summaryEls.discount.textContent = money(-totals.discount);
    summaryEls.total.textContent = money(Math.max(totals.total, 0));
  };

  /* ========= validation ========= */
  const getFieldContainer = (el) => el.closest(".input-wrapper") ?? el;
  const getErrorEl = (el) => {
    const wrapper = el.closest(".input-wrapper");
    if (wrapper && wrapper.nextElementSibling?.classList?.contains("form-error"))
      return wrapper.nextElementSibling;
    if (el.nextElementSibling?.classList?.contains("form-error"))
      return el.nextElementSibling;
    if (wrapper) {
      const inner = wrapper.querySelector(".form-error");
      if (inner) return inner;
    }
    return null;
  };

  const clearErrors = (container) => {
    Array.from(container.querySelectorAll(".form-error")).forEach((e) => {
      e.textContent = "";
      e.classList.add("hidden");
    });
    Array.from(
      container.querySelectorAll("input[data-req], select[data-req]")
    ).forEach((el) => {
      const c = getFieldContainer(el);
      c.classList?.remove("ring-2", "ring-red-500", "border-red-500");
    });
  };

  const showError = (el, message) => {
    const c = getFieldContainer(el);
    c.classList?.add("ring-2", "ring-red-500", "border-red-500");
    const err = getErrorEl(el);
    if (err) {
      err.textContent = message;
      err.classList.remove("hidden");
    }
  };

  const validateContainer = (container) => {
    clearErrors(container);
    let firstBad = null;
    let ok = true;
    const required = Array.from(
      container.querySelectorAll("input[data-req], select[data-req]")
    );
    required.forEach((el) => {
      const val = (el.value || "").trim();
      if (!val) {
        ok = false;
        showError(el, `${el.dataset.label || "This field"} is required`);
        if (!firstBad) firstBad = getFieldContainer(el);
      }
    });

    if (container.id === "payment_form") {
      const exp = byId("cc_exp");
      if (exp) {
        const v = (exp.value || "").trim();
        const m = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
        if (!m) {
          ok = false;
          showError(exp, "Use MM/YY");
          if (!firstBad) firstBad = getFieldContainer(exp);
        } else {
          const mm = parseInt(m[1], 10);
          const yy = 2000 + parseInt(m[2], 10);
          const lastDay = new Date(yy, mm, 0).getDate();
          const expDate = new Date(yy, mm - 1, lastDay, 23, 59, 59);
          if (expDate <= new Date()) {
            ok = false;
            showError(exp, "Card expired");
            if (!firstBad) firstBad = getFieldContainer(exp);
          }
        }
      }
    }

    if (firstBad)
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  };

  /* ========= stepper ========= */
  const renderStepper = () => {
    const ol = $use(".stepper");
    if (!ol) return;
    ol.innerHTML = "";
    checkoutState.steps.forEach((step, idx) => {
      const li = document.createElement("li");
      const active = idx === checkoutState.stepIndex;
      const done = idx < checkoutState.stepIndex;
      li.className = "flex items-center gap-2";
      li.innerHTML = `
      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
        done
          ? "bg-green-600 text-white"
          : active
          ? "bg-blue-600 text-white"
          : "bg-gray-200 text-gray-700"
      }">${done ? "✓" : idx + 1}</span>
      <span class="hidden sm:inline ${
        active ? "text-gray-900 font-semibold" : "text-gray-500"
      } capitalize">${step}</span>
      ${
        idx < checkoutState.steps.length - 1
          ? '<span class="w-6 h-px bg-gray-300 mx-1"></span>'
          : ""
      }
    `;
      ol.appendChild(li);
    });
  };

  const renderStep = () => {
    const current = checkoutState.steps[checkoutState.stepIndex];
    $$use(".step").forEach((el) => el.classList.add("hidden"));
    const active = $use(`.step[data-step="${current}"]`);
    if (active) active.classList.remove("hidden");
    $(".step-prev").disabled = checkoutState.stepIndex === 0;
    $(".step-next").classList.toggle(
      "hidden",
      checkoutState.stepIndex >= checkoutState.steps.length - 1
    );
    $(".place-order").classList.toggle(
      "hidden",
      checkoutState.stepIndex < checkoutState.steps.length - 1
    );
    if (current === "review") buildReview();
  };

  const buildReview = () => {
    const t = (id) => (byId(id)?.value || "").trim();
    const contact = `${t("cust_first")} ${t("cust_last")} · ${t("cust_email")}`;
    $("#review_contact").textContent = contact.trim();
    $("#review_shipping").textContent = `${t("ship_addr1")}${
      t("ship_addr2") ? " " + t("ship_addr2") : ""
    }, ${t("ship_city")}, ${t("ship_state")} ${t("ship_postal")}, ${t(
      "ship_country"
    )}`;
    $("#review_billing").textContent = `${t("bill_addr1")}${
      t("bill_addr2") ? " " + t("bill_addr2") : ""
    }, ${t("bill_city")}, ${t("bill_state")} ${t("bill_postal")}, ${t(
      "bill_country"
    )}`;

    const meta = checkoutState.couponMeta;
    const shippingLabel =
      checkoutState.shippingMethod === "express" ? "Express" : "Standard";
    const paymentLines = [];
    paymentLines.push(`Card ending in ${t("cc_number").slice(-4) || "••••"}`);
    paymentLines.push(`Shipping: ${shippingLabel}`);
    if (meta) paymentLines.push(`Coupon: ${meta.code}`);
    $("#review_payment").innerHTML = paymentLines
      .filter(Boolean)
      .map((line) => `<div>${line}</div>`)
      .join("");
  };

  /* ========= coupon handling ========= */
  const couponInput = byId("coupon_code");
  const couponFeedback = byId("coupon_feedback");

  const applyCoupon = () => {
    if (!couponInput) return;
    const code = (couponInput.value || "").trim().toUpperCase();
    if (!code) {
      checkoutState.couponMeta = null;
      checkoutState.freeShipping = false;
      if (couponFeedback)
        couponFeedback.textContent = "Enter a code to apply a discount.";
      renderSummary();
      return;
    }
    const known = knownCoupons[code];
    if (known) {
      checkoutState.couponMeta = { code, ...known };
      checkoutState.freeShipping = known.type === "shipping";
      if (couponFeedback) couponFeedback.textContent = known.message;
    } else {
      checkoutState.couponMeta = { code, type: "pending", value: 0 };
      checkoutState.freeShipping = false;
      if (couponFeedback)
        couponFeedback.textContent =
          "We'll validate this code with the payment gateway.";
    }
    renderSummary();
  };

  /* ========= events ========= */
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.closest(".step-prev")) {
      checkoutState.stepIndex = Math.max(0, checkoutState.stepIndex - 1);
      renderStepper();
      renderStep();
      return;
    }
    if (target.closest(".step-next")) {
      const current = checkoutState.steps[checkoutState.stepIndex];
      if (current === "contact" && !validateContainer($("[data-step='contact']")))
        return;
      if (current === "address" && !validateContainer($("[data-step='address']")))
        return;
      if (current === "payment" && !validateContainer($("#payment_form")))
        return;
      checkoutState.stepIndex = Math.min(
        checkoutState.steps.length - 1,
        checkoutState.stepIndex + 1
      );
      renderStepper();
      renderStep();
      return;
    }
    if (target.closest(".place-order")) {
      if (!validateContainer($("#payment_form"))) return;
      buildReview();
      alert("Demo checkout complete. Implement server-side order placement next.");
      Cart.clear();
      window.location.href = "shop.html";
      return;
    }
    if (target.closest(".apply-coupon")) {
      applyCoupon();
      return;
    }
    if (target.closest(".return-to-shop")) {
      window.location.href = "shop.html";
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "bill_same") {
      const on = target.checked;
      const fields = ["addr1", "addr2", "city", "state", "postal", "country"];
      fields.forEach((key) => {
        const sEl = byId(`ship_${key}`);
        const bEl = byId(`bill_${key}`);
        if (!sEl || !bEl) return;
        if (on) bEl.value = sEl.value;
        bEl.disabled = on;
        bEl.classList.toggle("bg-gray-100", on);
      });
      if (on) {
        [
          "bill_addr1",
          "bill_city",
          "bill_state",
          "bill_postal",
          "bill_country",
        ].forEach((id) => {
          const el = byId(id);
          if (!el) return;
          const c = getFieldContainer(el);
          c.classList?.remove("ring-2", "ring-red-500", "border-red-500");
          const err = getErrorEl(el);
          if (err) err.classList.add("hidden");
        });
      }
      return;
    }
    if (target.name === "shipping_method") {
      checkoutState.shippingMethod = target.value || "standard";
      renderSummary();
      if (checkoutState.steps[checkoutState.stepIndex] === "review") buildReview();
    }
  });

  const init = async () => {
    if (typeof Cart === "undefined") return;
    await Cart.init();
    const cartState = Cart.getState();
    if (!cartState.items.length) {
      window.location.href = "https://app.thehappy.clinic/shop";
      return;
    }

    ["ship_country", "bill_country"].forEach((id) => {
      const el = byId(id);
      if (el) el.value = "Australia";
    });

    renderSummary();
    renderStepper();
    renderStep();

    Cart.subscribe(() => {
      renderSummary();
      if (checkoutState.steps[checkoutState.stepIndex] === "review") buildReview();
    });

    if (couponInput)
      couponInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          applyCoupon();
        }
      });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
