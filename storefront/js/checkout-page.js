(() => {
  "use strict";

  const pageHint = document.querySelector(".get-url")?.dataset?.storefrontPage;
  const isCheckoutPage =
    pageHint === "checkout" ||
    !!document.querySelector(".checkout-summary") ||
    !!document.querySelector("[data-checkout-page]");

  if (!isCheckoutPage) return;
  // Shipping options filter (ids). Overrideable via window.shippingOptions
  let shippingOptions = Array.isArray(window.shippingOptions) ? window.shippingOptions : [1, 2];


  window.StorefrontCartUI?.ensureDrawer?.();

  /* ========= helpers ========= */
  const { $, $$, byId, money } = window.StorefrontUtils || {};
  const fallback$ = (sel, ctx = document) => ctx.querySelector(sel);
  const fallback$$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const $use = $ || fallback$;
  const $$use = $$ || fallback$$;

  const getApiBase = () => {
    // Priority: window.ENV.API_BASE > .get-url[data-api-base] > meta[name="api-base"]
    try {
      const winBase = window.ENV?.API_BASE;
      const dataBase = document.querySelector('.get-url')?.dataset?.apiBase;
      const metaBase = document.querySelector('meta[name="api-base"]')?.content;
      const base = winBase || dataBase || metaBase || 'http://localhost:3001';
      return base ? new URL(base, window.location.href).toString().replace(/\/$/, '') : 'http://localhost:3001';
    } catch {
      return 'http://localhost:3001';
    }
  };

  const getSaveOrUpdateUrl = () => {
    // Priority: window.ENV.SAVE_OR_UPDATE_URL > .get-url[data-api-url] > `${API_BASE}/api-thc/contacts/saveorupdate`
    try {
      const explicit = window.ENV?.SAVE_OR_UPDATE_URL || document.querySelector('.get-url')?.dataset?.apiUrl;
      if (explicit) return new URL(explicit, window.location.href).toString();
    } catch {}
    const base = getApiBase();
    const fallback = '/api-thc/contacts/saveorupdate';
    return base ? `${base}${fallback}` : new URL(fallback, window.location.origin).toString();
  };

  // API functions
  const apiCall = async (endpoint, options = {}) => {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    
    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {}
      throw new Error(`${errorMessage} (${response.status})`);
    }
    
    return await response.json();
  };

  const saveContact = async (contactData) => {
    return await apiCall('/api-thc/contact/save', {
      method: 'POST',
      body: JSON.stringify(contactData)
    });
  };

  const validateCoupons = async (contactId, codes, cartProductIds) => {
    return await apiCall('/api-thc/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ contactId, codes, cartProductIds })
    });
  };

  const getShippingTypes = async (allowedIds) => {
    const params = allowedIds ? `?allowed=${allowedIds.join(',')}` : '';
    return await apiCall(`/api-thc/shipping/types${params}`);
  };

  const buildOffer = async (cart, appliedCoupon, shippingType) => {
    return await apiCall('/api-thc/offer/build', {
      method: 'POST',
      body: JSON.stringify({ cart, appliedCoupon, shippingType })
    });
  };

  const processTransaction = async (transactionData) => {
    return await apiCall('/api-thc/transaction/process', {
      method: 'POST',
      body: JSON.stringify(transactionData)
    });
  };

  // Legacy function for backward compatibility
  const saveOrUpdateContact = async () => {
    const firstname = byId('cust_first')?.value?.trim() || '';
    const lastname = byId('cust_last')?.value?.trim() || '';
    const email = byId('cust_email')?.value?.trim() || '';
    const sms_number = byId('cust_phone')?.value?.trim() || '';
    const endpoint = getSaveOrUpdateUrl();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstname, lastname, email, sms_number }),
    });
    if (!res.ok) {
      let details = '';
      try { const data = await res.json(); details = data?.details ? JSON.stringify(data.details) : (data?.error || ''); } catch {}
      throw new Error('Contact save failed. ' + details);
    }
    return await res.json().catch(() => ({}));
  };

  /* ========= checkout state ========= */
  const STORAGE_KEY = 'checkout:v1';
  
  const checkoutState = {
    steps: ["contact", "address", "payment", "review"],
    stepIndex: 0,
    shippingMethod: "standard",
    coupon: null,
    couponMeta: null,
    freeShipping: false,
    contactId: null,
    shippingTypes: [],
    currentOffer: null
  };

  // Load state from localStorage
  const loadCheckoutState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(checkoutState, parsed);
      }
    } catch (err) {
      console.warn('Failed to load checkout state:', err);
    }
  };

  // Save state to localStorage
  const saveCheckoutState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkoutState));
    } catch (err) {
      console.warn('Failed to save checkout state:', err);
    }
  };

  // Load form data from localStorage
  const loadFormData = () => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}:form`);
      if (saved) {
        const formData = JSON.parse(saved);
        Object.entries(formData).forEach(([id, value]) => {
          const el = byId(id);
          if (el) el.value = value;
        });
      }
    } catch (err) {
      console.warn('Failed to load form data:', err);
    }
  };

  // Save form data to localStorage
  const saveFormData = () => {
    try {
      const formData = {};
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.id && input.value) {
          formData[input.id] = input.value;
        }
      });
      localStorage.setItem(`${STORAGE_KEY}:form`, JSON.stringify(formData));
    } catch (err) {
      console.warn('Failed to save form data:', err);
    }
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

  // Update offer from backend
  const updateOffer = async () => {
    try {
      const cartState = Cart.getState();
      if (!cartState.items.length) {
        checkoutState.currentOffer = null;
        try { localStorage.removeItem('checkout:offer'); } catch {}
        renderSummary();
        return;
      }

      // Convert cart items to backend format
      const cartItems = cartState.items.map(item => ({
        productId: item.productId || item.id, // productId now contains the payment ID
        name: item.name,
        quantity: item.qty,
        price: item.price,
        taxable: true, // Default to taxable
        requiresShipping: true // Default to requiring shipping
      }));

      // Get selected shipping type
      let shippingType = null;
      if (checkoutState.shippingTypes.length > 0) {
        const selectedMethod = checkoutState.shippingMethod;
        shippingType = checkoutState.shippingTypes.find(st => 
          st.name.toLowerCase().includes(selectedMethod) || 
          st.id.toString() === selectedMethod
        );
      }

      // Build offer with backend
      const offer = await buildOffer(
        { items: cartItems },
        checkoutState.couponMeta,
        shippingType
      );

      checkoutState.currentOffer = offer;
      try { localStorage.setItem('checkout:offer', JSON.stringify(offer)); } catch {}
      renderSummary();
    } catch (err) {
      console.error('Failed to update offer:', err);
      // Fallback to client-side calculation
      const cartState = Cart.getState();
      const totals = calcTotals(cartState);
      checkoutState.currentOffer = {
        subTotal: totals.subtotal,
        grandTotal: totals.total,
        hasShipping: totals.shipping > 0,
        currency_code: 'USD'
      };
      try { localStorage.setItem('checkout:offer', JSON.stringify(checkoutState.currentOffer)); } catch {}
      renderSummary();
    }
  };

  const calcTotals = (cartState) => {
    const subtotal = cartState.items.reduce(
      (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );
    // Prefer dynamic shipping types if loaded
    let baseShipping = 0;
    if (checkoutState.shippingTypes && checkoutState.shippingTypes.length && checkoutState.shippingMethod) {
      const selected = checkoutState.shippingTypes.find(st => st.id.toString() === checkoutState.shippingMethod);
      baseShipping = selected ? (Number(selected.price) || 0) : 0;
    } else {
      baseShipping = shippingRates[checkoutState.shippingMethod] || 0;
    }
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
    
    // Use backend offer if available, otherwise fallback to client calculation
    if (checkoutState.currentOffer) {
      const offer = checkoutState.currentOffer;
      summaryEls.subtotal.textContent = money(offer.subTotal);
      summaryEls.shipping.textContent = offer.hasShipping ? 
        (offer.shipping && offer.shipping.length > 0 ? money(offer.shipping[0].price) : "Calculated at checkout") : 
        "Free";
      summaryEls.discount.textContent = money(offer.subTotal - (offer.grandTotal - (offer.shipping && offer.shipping.length > 0 ? offer.shipping[0].price : 0)));
      summaryEls.total.textContent = money(offer.grandTotal);
    } else {
      const totals = calcTotals(cartState);
      summaryEls.subtotal.textContent = money(totals.subtotal);
      summaryEls.shipping.textContent = totals.shipping > 0 ? money(totals.shipping) : "Free";
      summaryEls.discount.textContent = money(-totals.discount);
      summaryEls.total.textContent = money(Math.max(totals.total, 0));
    }
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

  const applyCoupon = async () => {
    if (!couponInput) return;
    const code = (couponInput.value || "").trim();
    
    if (!code) {
      checkoutState.couponMeta = null;
      checkoutState.freeShipping = false;
      if (couponFeedback)
        couponFeedback.textContent = "Enter a code to apply a discount.";
      await updateOffer();
      return;
    }

    try {
      // Get cart product IDs for validation (use payment IDs)
      const cartState = Cart.getState();
      const cartProductIds = cartState.items.map(item => item.productId || item.id);
      
      // Validate coupon with backend
      const result = await validateCoupons(checkoutState.contactId, [code], cartProductIds);
      
      if (result.applied) {
        checkoutState.couponMeta = {
          code: result.applied.coupon_code,
          type: result.applied.discount_type,
          value: result.applied.discount_value,
          product_selection: result.applied.product_selection,
          applicable_products: Array.isArray(result.applied.applicable_products) ? result.applied.applicable_products.map(String) : undefined,
          recurring: result.applied.recurring
        };
        checkoutState.freeShipping = false; // Will be handled by offer engine
        if (couponFeedback) couponFeedback.textContent = "Coupon applied successfully!";
      } else {
        const reason = result.reasons[code];
        let message = "Invalid coupon code";
        switch (reason) {
          case "not_found": message = "Coupon code not found"; break;
          case "expired": message = "Coupon has expired"; break;
          case "already_used": message = "Coupon already used"; break;
          case "not_applicable": message = "Coupon not applicable to cart items"; break;
          case "not_applied_multiple": message = "Only one coupon can be applied"; break;
        }
        checkoutState.couponMeta = null;
        checkoutState.freeShipping = false;
        if (couponFeedback) couponFeedback.textContent = message;
      }
    } catch (err) {
      console.error('Coupon validation failed:', err);
      checkoutState.couponMeta = null;
      checkoutState.freeShipping = false;
      if (couponFeedback) couponFeedback.textContent = "Failed to validate coupon. Please try again.";
    }
    
    await updateOffer();
  };

  // Process the complete order
  const processOrder = async () => {
    if (!checkoutState.contactId) {
      throw new Error('Contact not saved. Please complete the contact step.');
    }

    if (!checkoutState.currentOffer) {
      throw new Error('Offer not calculated. Please try again.');
    }

    // Get billing address
    const billing_address = {
      address: byId('bill_addr1')?.value?.trim() || '',
      address2: byId('bill_addr2')?.value?.trim() || '',
      city: byId('bill_city')?.value?.trim() || '',
      state: byId('bill_state')?.value?.trim() || '',
      zip: byId('bill_postal')?.value?.trim() || '',
      country: byId('bill_country')?.value?.trim() || 'Australia'
    };

    // Get payment details
    const payer = {
      ccnumber: byId('cc_number')?.value?.replace(/\s/g, '') || '',
      code: byId('cc_cvc')?.value?.trim() || '',
      expire_month: parseInt(byId('cc_exp')?.value?.split('/')[0] || '0'),
      expire_year: 2000 + parseInt(byId('cc_exp')?.value?.split('/')[1] || '0')
    };

    // Get selected shipping type
    const selectedShipping = document.querySelector('input[name="shipping_method"]:checked');
    const shippingType = selectedShipping ? 
      checkoutState.shippingTypes.find(st => st.id.toString() === selectedShipping.value) : 
      null;

    // Build final offer with current shipping selection
    const cartState = Cart.getState();
    const cartItems = cartState.items.map(item => ({
      productId: item.productId || item.id, // Use payment ID for backend
      name: item.name,
      quantity: item.qty,
      price: item.price,
      taxable: true,
      requiresShipping: true
    }));

    const finalOffer = await buildOffer(
      { items: cartItems },
      checkoutState.couponMeta,
      shippingType
    );

    // Process transaction
    const transactionData = {
      contactId: checkoutState.contactId,
      billing_address,
      payer,
      offer: finalOffer,
      external_order_id: `WEB-${Date.now()}`,
      invoice_template: 1,
      gateway_id: 1
    };

    return await processTransaction(transactionData);
  };

  // Load shipping types from backend
  const loadShippingTypes = async () => {
    try {
      const cartState = Cart.getState();
      const requiresShipping = cartState.items.some(item => item.requiresShipping !== false);
      
      if (!requiresShipping) {
        // Hide shipping section if no items require shipping
        const shippingFieldset = document.querySelector('fieldset');
        if (shippingFieldset) {
          shippingFieldset.style.display = 'none';
        }
        return;
      }

      const shippingTypes = await getShippingTypes(shippingOptions);
      checkoutState.shippingTypes = shippingTypes;
      
      // Update shipping UI with dynamic options
      const shippingContainer = document.getElementById('shipping_methods');
      if (shippingContainer && shippingTypes.length > 0) {
        shippingContainer.innerHTML = '';
        shippingTypes.forEach((type, index) => {
          const label = document.createElement('label');
          label.className = 'flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-500';
          label.innerHTML = `
            <div class="flex items-center gap-3">
              <input type="radio" name="shipping_method" value="${type.id}" ${index === 0 ? 'checked' : ''}
                class="text-blue-600 focus:ring-blue-500" />
              <div>
                <div class="font-semibold">${type.name}</div>
                <div class="text-xs text-gray-500">${type.description || 'Standard delivery'}</div>
              </div>
            </div>
            <span class="text-sm font-semibold">${money(type.price || 0)}</span>
          `;
          shippingContainer.appendChild(label);
        });
        // Set default selection to first id
        checkoutState.shippingMethod = String(shippingTypes[0].id);
        await updateOffer();
      }
    } catch (err) {
      console.error('Failed to load shipping types:', err);
    }
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
      if (current === "contact") {
        if (!validateContainer($("[data-step='contact']"))) return;
        const btn = target.closest('.step-next');
        const original = btn?.textContent;
        if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
        
        // Save contact with new API
        const contactData = {
          first_name: byId('cust_first')?.value?.trim() || '',
          last_name: byId('cust_last')?.value?.trim() || '',
          email: byId('cust_email')?.value?.trim() || '',
          phone: byId('cust_phone')?.value?.trim() || '',
          contactId: checkoutState.contactId
        };
        
        saveContact(contactData)
          .then((result) => {
            checkoutState.contactId = result.contactId;
            saveCheckoutState();
            checkoutState.stepIndex = Math.min(
              checkoutState.steps.length - 1,
              checkoutState.stepIndex + 1
            );
            renderStepper();
            renderStep();
            loadShippingTypes();
          })
          .catch((err) => {
            alert(err?.message || 'Unable to save contact.');
          })
          .finally(() => {
            if (btn) { btn.disabled = false; btn.textContent = original; }
          });
        return;
      }
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
      
      const btn = target.closest('.place-order');
      const original = btn?.textContent;
      if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
      
      processOrder()
        .then((result) => {
          // Clear cart and state
          Cart.clear();
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(`${STORAGE_KEY}:form`);
          
          // Redirect to success page
          window.location.href = `https://app.thehappy.clinic/shop/thank-you?order=${result.order_id || result.transaction_id || 'success'}`;
        })
        .catch((err) => {
          alert(err?.message || 'Order processing failed. Please try again.');
        })
        .finally(() => {
          if (btn) { btn.disabled = false; btn.textContent = original; }
        });
      return;
    }
    if (target.closest(".apply-coupon")) {
      applyCoupon();
      return;
    }
    if (target.closest(".return-to-shop")) {
      window.location.href = "https://app.thehappy.clinic/shop";
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
      updateOffer();
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

    // Load saved state and form data
    loadCheckoutState();
    loadFormData();

    ["ship_country", "bill_country"].forEach((id) => {
      const el = byId(id);
      if (el && !el.value) el.value = "Australia";
    });

    // Set up form change listeners for persistence
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('change', saveFormData);
      input.addEventListener('input', saveFormData);
    });

    // Clear static shipping options and load dynamic ones; do this regardless of contact state
    const shippingContainer = document.getElementById('shipping_methods');
    if (shippingContainer) shippingContainer.innerHTML = '';
    await loadShippingTypes();

    // Update offer with current state
    await updateOffer();

    renderSummary();
    renderStepper();
    renderStep();

    Cart.subscribe(() => {
      renderSummary();
      if (checkoutState.steps[checkoutState.stepIndex] === "review") buildReview();
      updateOffer(); // Update offer when cart changes
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
