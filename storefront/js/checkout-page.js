(() => {
  "use strict";

  const pageHint = document.querySelector(".get-url")?.dataset?.storefrontPage;
  const isCheckoutPage =
    pageHint === "checkout" ||
    !!document.querySelector(".checkout-summary") ||
    !!document.querySelector("[data-checkout-page]");

  if (!isCheckoutPage) return;
  const toNumberOr = (value, fallback) => {
    const num =
      typeof value === "number"
        ? value
        : value === null || value === undefined
        ? NaN
        : Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const config = window.StorefrontConfig || {};
  const loggedInContactId = (() => {
    const raw = config.loggedInContactId;
    if (raw === null || raw === undefined) return "";
    const str = String(raw).trim();
    return str.length ? str : "";
  })();
  const invoiceTemplateId = toNumberOr(config.invoiceTemplateId, 1);
  const paymentGatewayId = toNumberOr(config.paymentGatewayId, 1);

  // Shipping options filter (ids). Overrideable via window.shippingOptions
  let shippingOptions = Array.isArray(config.shippingTypeIds)
    ? config.shippingTypeIds
    : Array.isArray(window.shippingOptions)
    ? window.shippingOptions
    : [1, 2];
  if (Array.isArray(shippingOptions)) {
    shippingOptions = shippingOptions
      .map((id) => {
        if (id === null || id === undefined) return "";
        const str = String(id).trim();
        return str;
      })
      .filter(Boolean);
  }

  window.StorefrontCartUI?.ensureDrawer?.();

  /* ========= helpers ========= */
  const {
    $, $$, byId, money,
    showPageLoader: showPageLoaderFn,
    hidePageLoader: hidePageLoaderFn,
    setPageLoaderMessage: setPageLoaderMessageFn,
  } = window.StorefrontUtils || {};
  const fallback$ = (sel, ctx = document) => ctx.querySelector(sel);
  const fallback$$ = (sel, ctx = document) =>
    Array.from(ctx.querySelectorAll(sel));
  const $use = $ || fallback$;
  const $$use = $$ || fallback$$;

  const showLoader =
    typeof showPageLoaderFn === "function"
      ? (message) => showPageLoaderFn(message)
      : () => {};
  const hideLoader =
    typeof hidePageLoaderFn === "function" ? hidePageLoaderFn : () => {};
  const setLoaderMessage =
    typeof setPageLoaderMessageFn === "function"
      ? (message) => setPageLoaderMessageFn(message)
      : () => {};

  showLoader("Preparing checkout…");

  const getApiBase = () => {
    // Priority: window.ENV.API_BASE > .get-url[data-api-base] > meta[name="api-base"]
    try {
      const winBase = window.ENV?.API_BASE;
      const dataBase = document.querySelector(".get-url")?.dataset?.apiBase;
      const metaBase = document.querySelector('meta[name="api-base"]')?.content;
      const base = winBase || dataBase || metaBase || "http://localhost:3001";
      return base
        ? new URL(base, window.location.href).toString().replace(/\/$/, "")
        : "http://localhost:3001";
    } catch {
      return "http://localhost:3001";
    }
  };

  const getSaveOrUpdateUrl = () => {
    // Priority: window.ENV.SAVE_OR_UPDATE_URL > .get-url[data-api-url] > `${API_BASE}/api-thc/contacts/saveorupdate`
    try {
      const explicit =
        window.ENV?.SAVE_OR_UPDATE_URL ||
        document.querySelector(".get-url")?.dataset?.apiUrl;
      if (explicit) return new URL(explicit, window.location.href).toString();
    } catch {}
    const base = getApiBase();
    const fallback = "/api-thc/contacts/saveorupdate";
    return base
      ? `${base}${fallback}`
      : new URL(fallback, window.location.origin).toString();
  };

  // API functions
  const apiCall = async (endpoint, options = {}) => {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = "Request failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {}
      throw new Error(`${errorMessage} (${response.status})`);
    }

    return await response.json();
  };

  const saveContact = async (contactData) => {
    return await apiCall("/api-thc/contact/save", {
      method: "POST",
      body: JSON.stringify(contactData),
    });
  };

  const validateCoupons = async (contactId, codes, cartProductIds) => {
    return await apiCall("/api-thc/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ contactId, codes, cartProductIds }),
    });
  };

  const getShippingTypes = async (allowedIds) => {
    const params = allowedIds ? `?allowed=${allowedIds.join(",")}` : "";
    return await apiCall(`/api-thc/shipping/types${params}`);
  };

  const buildOffer = async (cart, appliedCoupon, shippingType) => {
    return await apiCall("/api-thc/offer/build", {
      method: "POST",
      body: JSON.stringify({ cart, appliedCoupon, shippingType }),
    });
  };

  const processTransaction = async (transactionData) => {
    return await apiCall("/api-thc/transaction/process", {
      method: "POST",
      body: JSON.stringify(transactionData),
    });
  };

  const fetchContactDetails = async (contactId) => {
    if (!contactId) return null;
    try {
      const result = await apiCall(`/api-thc/contact/${encodeURIComponent(contactId)}`);
      return result?.contact || null;
    } catch (err) {
      console.error("Failed to fetch contact", err);
      throw err;
    }
  };

  const fetchSavedCards = async (contactId) => {
    if (!contactId) return [];
    try {
      const result = await apiCall(
        `/api-thc/contact/${encodeURIComponent(contactId)}/credit-cards`
      );
      return Array.isArray(result?.cards) ? result.cards : [];
    } catch (err) {
      console.error("Failed to fetch saved cards", err);
      throw err;
    }
  };

  const shippingOptionSelect = byId("default_shipping_option");
  const HOME_SHIPPING_OPTION = "691";
  const PARCEL_SHIPPING_OPTION = "690";
  const homeAddressSection = byId("home_address_section");
  const parcelLockerSection = byId("parcel_locker_section");
  const homeRequiredFields = Array.from(
    document.querySelectorAll("[data-home-req]")
  );
  const parcelRequiredFields = Array.from(
    document.querySelectorAll("[data-parcel-req]")
  );
  const paymentSourceSelector = byId("payment_source_selector");
  const savedCardsListEl = byId("saved_cards_list");
  const newCardSection = byId("new_card_section");
  const newCardRadio = paymentSourceSelector?.querySelector(
    'input[name="payment_source"][value="new"]'
  );
  const cardFieldIds = ["cc_number", "cc_exp", "cc_cvc", "cc_name"];
  const cardFields = cardFieldIds
    .map((id) => byId(id))
    .filter((el) => el);

  const CARD_TYPE_LABELS = {
    "1": "Visa",
    "2": "Mastercard",
    "3": "AMEX",
    "4": "Discover",
    "6": "Other",
  };

  const getCardTypeLabel = (card) => {
    if (!card) return "";
    const raw =
      card.type ??
      card.card_type ??
      card.cardType ??
      card.brand ??
      card.card_brand ??
      "";
    const key = String(raw ?? "").trim();
    if (CARD_TYPE_LABELS[key]) return CARD_TYPE_LABELS[key];
    const directMatch = Object.values(CARD_TYPE_LABELS).find(
      (label) => label.toLowerCase() === key.toLowerCase()
    );
    if (directMatch) return directMatch;
    return key;
  };

  const serialiseContactPayload = (payload) => {
    if (!payload || typeof payload !== "object") return "";
    const normalised = {};
    Object.keys(payload)
      .sort()
      .forEach((key) => {
        const value = payload[key];
        if (value === undefined || value === null) return;
        const normalisedValue =
          typeof value === "string" ? value.trim() : value;
        if (
          typeof normalisedValue === "string" &&
          normalisedValue.trim() === ""
        ) {
          return;
        }
        normalised[key] = normalisedValue;
      });
    return JSON.stringify(normalised);
  };

  // Legacy function for backward compatibility
  const saveOrUpdateContact = async () => {
    const firstname = byId("cust_first")?.value?.trim() || "";
    const lastname = byId("cust_last")?.value?.trim() || "";
    const email = byId("cust_email")?.value?.trim() || "";
    const sms_number = byId("cust_phone")?.value?.trim() || "";
    const endpoint = getSaveOrUpdateUrl();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstname, lastname, email, sms_number }),
    });
    if (!res.ok) {
      let details = "";
      try {
        const data = await res.json();
        details = data?.details
          ? JSON.stringify(data.details)
          : data?.error || "";
      } catch {}
      throw new Error("Contact save failed. " + details);
    }
    return await res.json().catch(() => ({}));
  };

  /* ========= checkout state ========= */
  const STORAGE_KEY = "checkout:v1";

  const checkoutState = {
    steps: ["contact", "address", "payment", "review"],
    stepIndex: 0,
    shippingMethod: "",
    coupon: null,
    couponMeta: null,
    freeShipping: false,
    contactId: null,
    contactEmail: "",
    shippingTypes: [],
    currentOffer: null,
    shippingPreference: "",
    savedCards: [],
    selectedPaymentSource: "new",
    lastSavedContactPayload: null,
  };

  // Load state from localStorage
  const loadCheckoutState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(checkoutState, parsed);
        if (!checkoutState.selectedPaymentSource) {
          checkoutState.selectedPaymentSource = "new";
        }
      }
    } catch (err) {
      console.warn("Failed to load checkout state:", err);
    }
  };

  // Save state to localStorage
  const saveCheckoutState = () => {
    try {
      const { savedCards, lastSavedContactPayload, ...persistable } =
        checkoutState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch (err) {
      console.warn("Failed to save checkout state:", err);
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
      console.warn("Failed to load form data:", err);
    }
  };

  // Save form data to localStorage
  const saveFormData = () => {
    try {
      const formData = {};
      const inputs = document.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        if (input.id && input.value) {
          formData[input.id] = input.value;
        }
      });
      localStorage.setItem(`${STORAGE_KEY}:form`, JSON.stringify(formData));
    } catch (err) {
      console.warn("Failed to save form data:", err);
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

  const cartEmptyNotice = document.querySelector("[data-cart-empty-notice]");

  const updateStepControlsForCart = () => {
    if (typeof Cart === "undefined") return;
    const cartState = Cart.getState();
    const empty = !cartState.items.length;
    const nextBtn = document.querySelector(".step-next");
    const placeBtn = document.querySelector(".place-order");
    if (nextBtn) nextBtn.disabled = empty;
    if (placeBtn) placeBtn.disabled = empty;
    if (cartEmptyNotice)
      cartEmptyNotice.classList.toggle("hidden", !empty);
  };

  // Update offer from backend
  const updateOffer = async () => {
    try {
      const cartState = Cart.getState();
      if (!cartState.items.length) {
        checkoutState.currentOffer = null;
        try {
          localStorage.removeItem("checkout:offer");
        } catch {}
        renderSummary();
        return;
      }

      // Convert cart items to backend format
      const cartItems = cartState.items.map((item) => ({
        productId: item.productId || item.id, // productId now contains the payment ID
        name: item.name,
        quantity: item.qty,
        price:
          (Number(item.price) || 0) + (Number(item.retailGst) || 0),
        taxable: true, // Default to taxable
        requiresShipping: item.requiresShipping !== false, // Default to requiring shipping
      }));

      // Get selected shipping type
      let shippingType = getSelectedShippingType();
      if (shippingType && String(shippingType.id) === NONE_SHIPPING_ID) {
        shippingType = null;
      }

      // Build offer with backend
      const offer = await buildOffer(
        { items: cartItems },
        checkoutState.couponMeta,
        shippingType
      );

      checkoutState.currentOffer = offer;
      try {
        localStorage.setItem("checkout:offer", JSON.stringify(offer));
      } catch {}
      renderSummary();
    } catch (err) {
      console.error("Failed to update offer:", err);
      // Fallback to client-side calculation
      const cartState = Cart.getState();
      const totals = calcTotals(cartState);
      checkoutState.currentOffer = {
        subTotal: totals.subtotal,
        grandTotal: totals.total,
        hasShipping: totals.shipping > 0,
        currency_code: "AUD",
      };
      try {
        localStorage.setItem(
          "checkout:offer",
          JSON.stringify(checkoutState.currentOffer)
        );
      } catch {}
      renderSummary();
    }
  };

  const SPECIAL_PRODUCT_ID = "296";
  const FREE_SHIPPING_ID = "3";
  const NONE_SHIPPING_ID = "none";
  const FREE_SHIPPING_THRESHOLD = 200;

  const getCartSubtotal = (cartState = Cart.getState()) =>
    cartState.items.reduce((total, item) => {
      const unit =
        (Number(item.price) || 0) + (Number(item.retailGst) || 0);
      return total + unit * (Number(item.qty) || 0);
    }, 0);

  const normaliseShippingType = (type) => {
    if (!type) return null;
    const id =
      type.id ??
      type.shipping_type_id ??
      type.shippingTypeId ??
      type.shipping_type ??
      type.code ??
      type.ID;
    const price =
      type.price ?? type.amount ?? type.total ?? type.fee ?? type.cost ?? 0;
    return {
      ...type,
      id: id !== undefined && id !== null ? String(id) : "",
      price: Number(price) || 0,
      name: type.name || type.title || "Shipping",
      description: type.description || type.subtitle || "",
    };
  };

  const getSelectedShippingType = () => {
    if (!checkoutState.shippingTypes || !checkoutState.shippingTypes.length)
      return null;
    const match = checkoutState.shippingTypes.find(
      (st) => st && String(st.id) === String(checkoutState.shippingMethod)
    );
    return match || null;
  };

  const ensureNoneOption = (types) => {
    const list = Array.isArray(types) ? [...types] : [];
    const hasOption = list.some((type) => String(type.id) === NONE_SHIPPING_ID);
    if (list.length <= 1 && !hasOption) {
      list.push({
        id: NONE_SHIPPING_ID,
        name: "No shipping",
        description: "Do not add shipping to this order",
        price: 0,
        _isNone: true,
      });
    }
    if (!list.length) {
      list.push({
        id: NONE_SHIPPING_ID,
        name: "No shipping",
        description: "Do not add shipping to this order",
        price: 0,
        _isNone: true,
      });
    }
    return list;
  };

  const applyShippingRules = (types) => {
    const cartState = Cart.getState();
    const subtotal = getCartSubtotal(cartState);
    const baseList = (Array.isArray(types) ? types : [])
      .map((type) => normaliseShippingType(type))
      .filter(Boolean);

    if (subtotal > FREE_SHIPPING_THRESHOLD) {
      const existing = baseList.find((type) => type.id === FREE_SHIPPING_ID);
      const freeOption = existing
        ? { ...existing, price: 0 }
        : {
            id: FREE_SHIPPING_ID,
            name: "Free shipping",
            description: "Complimentary shipping on orders over $200",
            price: 0,
          };
      return ensureNoneOption([freeOption]);
    }

    const hasSpecial = cartState.items.some((item) => {
      const pid = item.productId || item.id;
      return String(pid) === SPECIAL_PRODUCT_ID;
    });
    const hasOtherItems = cartState.items.some((item) => {
      const pid = item.productId || item.id;
      return String(pid) !== SPECIAL_PRODUCT_ID;
    });

    if (hasSpecial) {
      if (!hasOtherItems) {
        const special = baseList.find((type) => type.id === "2");
        if (special) return ensureNoneOption([special]);
        return ensureNoneOption([
          {
            id: "2",
            name: "Special shipping",
            description: "Required for this item",
            price: 0,
          },
        ]);
      }
      const standardOnly = baseList.filter((type) => type.id === "1");
      if (standardOnly.length) return ensureNoneOption(standardOnly);
      return ensureNoneOption(baseList.filter((type) => type.id !== "2"));
    }

    return ensureNoneOption(baseList);
  };

  const calcTotals = (cartState) => {
    const subtotal = getCartSubtotal(cartState);
    let baseShipping = 0;
    const selected = getSelectedShippingType();
    if (selected && String(selected.id) !== NONE_SHIPPING_ID) {
      baseShipping = Number(selected.price) || 0;
    } else if (!selected && checkoutState.shippingMethod) {
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
          <div class="font-semibold text-sm sm:text-base truncate">${
            item.name
          }</div>
          ${
            item.brand
              ? `<div class=\"text-xs text-gray-500\">${item.brand}</div>`
              : ""
          }
          <div class="text-sm font-medium text-gray-900">${money(
            (Number(item.price) || 0) + (Number(item.retailGst) || 0)
          )}</div>
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
      const shippingPrice =
        offer.shipping && offer.shipping.length > 0
          ? Number(offer.shipping[0].price) || 0
          : null;
      summaryEls.shipping.textContent = offer.hasShipping
        ? shippingPrice !== null
          ? shippingPrice > 0
            ? money(shippingPrice)
            : "Free"
          : "Calculated at checkout"
        : "Free";
      summaryEls.discount.textContent = money(
        offer.subTotal -
          (offer.grandTotal -
            (offer.shipping && offer.shipping.length > 0
              ? offer.shipping[0].price
              : 0))
      );
      summaryEls.total.textContent = money(offer.grandTotal);
    } else {
      const totals = calcTotals(cartState);
      summaryEls.subtotal.textContent = money(totals.subtotal);
      summaryEls.shipping.textContent =
        totals.shipping > 0 ? money(totals.shipping) : "Free";
      summaryEls.discount.textContent = money(-totals.discount);
      summaryEls.total.textContent = money(Math.max(totals.total, 0));
    }

    updateStepControlsForCart();
  };

  /* ========= validation ========= */
  const getFieldContainer = (el) => el.closest(".input-wrapper") ?? el;
  const getErrorEl = (el) => {
    const wrapper = el.closest(".input-wrapper");
    if (
      wrapper &&
      wrapper.nextElementSibling?.classList?.contains("form-error")
    )
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

  const resetFieldState = (el) => {
    if (!el) return;
    const c = getFieldContainer(el);
    c?.classList?.remove("ring-2", "ring-red-500", "border-red-500");
    const err = getErrorEl(el);
    if (err) err.classList.add("hidden");
  };

  const isUsingSavedCard = () =>
    typeof checkoutState.selectedPaymentSource === "string" &&
    checkoutState.selectedPaymentSource.startsWith("saved:");

  const getSelectedSavedCard = () => {
    if (!Array.isArray(checkoutState.savedCards) || !isUsingSavedCard()) {
      return null;
    }
    const [, cardId] = checkoutState.selectedPaymentSource.split(":");
    if (!cardId) return null;
    return (
      checkoutState.savedCards.find(
        (card) => String(card?.id ?? "") === String(cardId)
      ) || null
    );
  };

  const setCardFieldsRequired = (required) => {
    cardFields.forEach((field) => {
      if (!field) return;
      if (required) {
        field.setAttribute("data-req", "true");
        field.disabled = false;
      } else {
        field.removeAttribute("data-req");
        field.disabled = true;
        resetFieldState(field);
      }
    });
  };

  const toggleNewCardSection = (show) => {
    if (newCardSection)
      newCardSection.classList.toggle("hidden", show === false);
    cardFields.forEach((field) => {
      if (!field) return;
      field.disabled = show === false;
    });
  };

  const applyPaymentSourceSelection = ({ save = true } = {}) => {
    if (isUsingSavedCard() && !getSelectedSavedCard()) {
      checkoutState.selectedPaymentSource = "new";
    }

    const usingSavedCard = isUsingSavedCard();
    toggleNewCardSection(!usingSavedCard);
    setCardFieldsRequired(!usingSavedCard);

    if (paymentSourceSelector) {
      const radios = paymentSourceSelector.querySelectorAll(
        'input[name="payment_source"]'
      );
      radios.forEach((radio) => {
        radio.checked = radio.value === checkoutState.selectedPaymentSource;
      });
      if (
        usingSavedCard &&
        !Array.from(radios).some((radio) => radio.checked)
      ) {
        checkoutState.selectedPaymentSource = "new";
        toggleNewCardSection(true);
        setCardFieldsRequired(true);
        radios.forEach((radio) => {
          radio.checked = radio.value === "new";
        });
      }
    }

    if (usingSavedCard) {
      cardFields.forEach((field) => resetFieldState(field));
    }

    if (save) saveCheckoutState();
    if (checkoutState.steps[checkoutState.stepIndex] === "review") {
      buildReview();
    }
  };

  const renderSavedCards = () => {
    if (!paymentSourceSelector || !savedCardsListEl) {
      applyPaymentSourceSelection({ save: false });
      return;
    }

    savedCardsListEl.innerHTML = "";
    const cards = Array.isArray(checkoutState.savedCards)
      ? checkoutState.savedCards
      : [];

    if (!cards.length) {
      paymentSourceSelector.classList.add("hidden");
      checkoutState.selectedPaymentSource = "new";
      if (newCardRadio) newCardRadio.checked = true;
      applyPaymentSourceSelection();
      return;
    }

    paymentSourceSelector.classList.remove("hidden");
    const fragment = document.createDocumentFragment();
    const validValues = [];

    cards.forEach((card) => {
      if (!card) return;
      const value = `saved:${card.id}`;
      validValues.push(value);
      const label = document.createElement("label");
      label.className =
        "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-500";
      const last4 = card.last4 || card.card_last_four || "••••";
      const expMonth = card.exp_month || card.card_expiration_month;
      const expYear = card.exp_year || card.card_expiration_year;
      const expDisplay = expMonth && expYear
        ? `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`
        : "";
      const nameLine = [card.firstname, card.lastname]
        .filter(Boolean)
        .join(" ");
      const typeLabel = getCardTypeLabel(card);
      const heading = `${
        typeLabel ? `${typeLabel} card` : "Card"
      } ending in ${last4}`;
      label.innerHTML = `
        <div class="flex items-center gap-3">
          <input type="radio" name="payment_source" value="${value}" class="text-blue-600 focus:ring-blue-500" />
          <div>
            <div class="font-semibold">${heading}</div>
            <div class="text-xs text-gray-500">${
              expDisplay ? `Expires ${expDisplay}` : "Stored payment method"
            }</div>
          </div>
        </div>
        <span class="text-xs text-gray-500">${
          nameLine || card.nickname || "Saved card"
        }</span>
      `;
      fragment.appendChild(label);
    });

    savedCardsListEl.appendChild(fragment);

    let selection = checkoutState.selectedPaymentSource;
    if (!selection || selection === "new") {
      selection = validValues[0] || "new";
    } else if (!validValues.includes(selection)) {
      selection = validValues[0] || "new";
    }
    checkoutState.selectedPaymentSource = selection || "new";

    applyPaymentSourceSelection();
  };

  const formatValue = (value, { uppercase = false } = {}) => {
    if (value === null || value === undefined) return "";
    let str = String(value);
    if (uppercase) {
      str = str.trim().toUpperCase();
    } else {
      str = str.trim();
    }
    return str;
  };

  const setFieldValue = (id, value, opts = {}) => {
    const el = byId(id);
    if (!el) return;
    const str = formatValue(value, opts);
    if (el.value !== str) {
      el.value = str;
    }
  };

  const getContactValue = (contact, keys, opts = {}) => {
    if (!contact) return "";
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      if (
        Object.prototype.hasOwnProperty.call(contact, key) &&
        contact[key] !== null &&
        contact[key] !== undefined
      ) {
        const raw = contact[key];
        const str = formatValue(raw, opts);
        if (str) return str;
      }
    }
    return "";
  };

  const applyContactToForm = (contact) => {
    if (!contact) return;

    setFieldValue("cust_first", getContactValue(contact, ["firstname", "first_name", "First_Name"]));
    setFieldValue("cust_last", getContactValue(contact, ["lastname", "last_name", "Last_Name"]));
    const emailValue = getContactValue(contact, ["email", "Email", "contact_email"]);
    setFieldValue("cust_email", emailValue);
    setFieldValue(
      "cust_phone",
      getContactValue(contact, ["sms_number", "phone", "Phone"])
    );

    const shippingOption = getContactValue(contact, [
      "f3099",
      "default_shipping_option",
      "shipping_option",
    ]);

    if (shippingOptionSelect && shippingOption) {
      shippingOptionSelect.value = shippingOption;
      checkoutState.shippingPreference = shippingOption;
      updateShippingOptionUI(shippingOption);
    }

    const shippingValues = {
      addr1: getContactValue(contact, ["address", "address1", "addr1", "Address"]),
      addr2: getContactValue(contact, ["address2", "addr2", "Address2"]),
      city: getContactValue(contact, ["city", "City"]),
      state: getContactValue(contact, ["state", "State"], { uppercase: true }),
      postal: getContactValue(contact, ["zip", "postal_code", "Postal", "postcode"]),
      country: getContactValue(contact, ["country", "Country"], {
        uppercase: true,
      }),
    };

    setFieldValue("ship_addr1", shippingValues.addr1);
    setFieldValue("ship_addr2", shippingValues.addr2);
    setFieldValue("ship_city", shippingValues.city);
    setFieldValue("ship_state", shippingValues.state, { uppercase: true });
    setFieldValue("ship_postal", shippingValues.postal);
    setFieldValue("ship_country", shippingValues.country || "Australia");

    const parcelValues = {
      number: getContactValue(contact, ["f3094", "parcel_number"]),
      street: getContactValue(contact, ["f3095", "parcel_street"]),
      city: getContactValue(contact, ["f3096", "parcel_city"]),
      state: getContactValue(contact, ["f3097", "parcel_state"], {
        uppercase: true,
      }),
      postal: getContactValue(contact, ["f3098", "parcel_postal"]),
    };

    setFieldValue("parcel_number", parcelValues.number);
    setFieldValue("parcel_street", parcelValues.street);
    setFieldValue("parcel_city", parcelValues.city);
    setFieldValue("parcel_state", parcelValues.state, { uppercase: true });
    setFieldValue("parcel_postal", parcelValues.postal);

    const billingValues = {
      addr1: getContactValue(contact, ["bill_addr1", "billing_address", "billing_addr1"]),
      addr2: getContactValue(contact, ["bill_addr2", "billing_address2", "billing_addr2"]),
      city: getContactValue(contact, ["bill_city", "billing_city"]),
      state: getContactValue(contact, ["bill_state", "billing_state"], {
        uppercase: true,
      }),
      postal: getContactValue(contact, ["bill_postal", "billing_postal", "billing_zip"]),
      country: getContactValue(contact, ["bill_country", "billing_country"], {
        uppercase: true,
      }),
    };

    setFieldValue("bill_addr1", billingValues.addr1 || shippingValues.addr1);
    setFieldValue("bill_addr2", billingValues.addr2 || shippingValues.addr2);
    setFieldValue("bill_city", billingValues.city || shippingValues.city);
    setFieldValue("bill_state", billingValues.state || shippingValues.state, {
      uppercase: true,
    });
    setFieldValue("bill_postal", billingValues.postal || shippingValues.postal);
    setFieldValue(
      "bill_country",
      billingValues.country || shippingValues.country || "Australia"
    );

    if (emailValue) {
      checkoutState.contactEmail = emailValue.trim();
    } else {
      checkoutState.contactEmail = "";
    }
  };

  const hydrateLoggedInContact = async (contactId) => {
    if (!contactId) return;

    try {
      const contact = await fetchContactDetails(contactId);
      if (contact) {
        applyContactToForm(contact);
        checkoutState.contactId = String(contact.id || contactId);
        if (checkoutState.contactEmail) {
          checkoutState.contactEmail = checkoutState.contactEmail.trim();
        }
        saveCheckoutState();
        saveFormData();
      }
    } catch (err) {
      console.error("Failed to prefill contact", err);
    }

    try {
      const cards = await fetchSavedCards(contactId);
      checkoutState.savedCards = cards;
    } catch (err) {
      console.error("Failed to load saved cards", err);
      checkoutState.savedCards = [];
    }
    renderSavedCards();
  };

  const setRequiredForFields = (fields, required) => {
    fields.forEach((el) => {
      if (!el) return;
      if (required) {
        el.setAttribute("data-req", "true");
      } else {
        el.removeAttribute("data-req");
        resetFieldState(el);
      }
    });
  };

  const toggleSectionVisibility = (section, show) => {
    if (!section) return;
    section.classList.toggle("hidden", !show);
  };

  const updateShippingOptionUI = (value = "") => {
    const mode =
      value === HOME_SHIPPING_OPTION
        ? "home"
        : value === PARCEL_SHIPPING_OPTION
        ? "parcel"
        : "";

    toggleSectionVisibility(homeAddressSection, mode === "home");
    toggleSectionVisibility(parcelLockerSection, mode === "parcel");

    setRequiredForFields(homeRequiredFields, mode === "home");
    setRequiredForFields(parcelRequiredFields, mode === "parcel");

    if (mode !== "home" && homeAddressSection) clearErrors(homeAddressSection);
    if (mode !== "parcel" && parcelLockerSection)
      clearErrors(parcelLockerSection);

    const billSame = byId("bill_same");
    if (billSame && mode !== "home") {
      if (billSame.checked) {
        billSame.checked = false;
        billSame.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        ["addr1", "addr2", "city", "state", "postal", "country"].forEach(
          (key) => {
            const el = byId(`bill_${key}`);
            if (!el) return;
            el.disabled = false;
            el.classList?.remove("bg-gray-100");
          }
        );
      }
    }
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

    if (container.id === "payment_form" && !isUsingSavedCard()) {
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
    updateStepControlsForCart();
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
    const shippingValue = shippingOptionSelect?.value || "";
    let shippingOptionLabel = "";
    if (shippingValue && shippingOptionSelect) {
      const opt =
        shippingOptionSelect.options[
          shippingOptionSelect.selectedIndex || 0
        ];
      shippingOptionLabel = opt?.textContent?.trim() || "";
    }

    const shippingLines = [];
    const selectedShippingType = getSelectedShippingType();
    if (selectedShippingType && selectedShippingType.name) {
      shippingLines.push(selectedShippingType.name);
    } else if (
      checkoutState.shippingMethod &&
      checkoutState.shippingMethod === NONE_SHIPPING_ID
    ) {
      shippingLines.push("No shipping selected");
    }
    if (shippingOptionLabel) shippingLines.push(shippingOptionLabel);

    if (shippingValue === PARCEL_SHIPPING_OPTION) {
      const parcelValue = (id) => (byId(id)?.value || "").trim();
      const parcelStateEl = byId("parcel_state");
      let parcelStateLabel = "";
      if (parcelStateEl && parcelStateEl.value) {
        const opt =
          parcelStateEl.options[parcelStateEl.selectedIndex || 0];
        parcelStateLabel = opt?.textContent?.trim() || "";
      }
      const lockerLine = [
        parcelValue("parcel_number"),
        parcelValue("parcel_street"),
      ]
        .filter(Boolean)
        .join(", ");
      const cityStateLine = [parcelValue("parcel_city"), parcelStateLabel]
        .filter(Boolean)
        .join(" ");
      const postal = parcelValue("parcel_postal");
      if (lockerLine) shippingLines.push(lockerLine);
      const secondLine = [cityStateLine, postal]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (secondLine) shippingLines.push(secondLine);
      $("#review_shipping").innerHTML =
        shippingLines.length > 0
          ? shippingLines.map((line) => `<div>${line}</div>`).join("")
          : "—";
      $("#review_billing").textContent = "Not required for Parcel Locker";
    } else if (shippingValue === HOME_SHIPPING_OPTION) {
      const shippingAddress = `${t("ship_addr1")}${
        t("ship_addr2") ? " " + t("ship_addr2") : ""
      }, ${t("ship_city")}, ${t("ship_state")} ${t("ship_postal")}, ${t(
        "ship_country"
      )}`.trim();
      if (shippingAddress) shippingLines.push(shippingAddress);
      $("#review_shipping").innerHTML =
        shippingLines.length > 0
          ? shippingLines.map((line) => `<div>${line}</div>`).join("")
          : "—";
      const billingAddress = `${t("bill_addr1")}${
        t("bill_addr2") ? " " + t("bill_addr2") : ""
      }, ${t("bill_city")}, ${t("bill_state")} ${t("bill_postal")}, ${t(
        "bill_country"
      )}`.trim();
      $("#review_billing").textContent = billingAddress || "—";
    } else {
      $("#review_shipping").textContent = "—";
      $("#review_billing").textContent = "—";
    }

    const meta = checkoutState.couponMeta;
    const paymentLines = [];
    if (isUsingSavedCard()) {
      const card = getSelectedSavedCard();
      const last4 = card?.last4 || card?.card_last_four || "••••";
      const expMonth = card?.exp_month || card?.card_expiration_month;
      const expYear = card?.exp_year || card?.card_expiration_year;
      const expLabel =
        expMonth && expYear
          ? `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`
          : "";
      const typeLabel = getCardTypeLabel(card);
      const descriptor = typeLabel ? `${typeLabel} card` : "Saved card";
      paymentLines.push(
        `${descriptor} ending in ${last4}${
          expLabel ? ` · Expires ${expLabel}` : ""
        }`
      );
    } else {
      const ccValue = t("cc_number");
      const last4 = ccValue.slice(-4) || "••••";
      paymentLines.push(`Card ending in ${last4}`);
    }
    if (selectedShippingType && selectedShippingType.name) {
      const label = selectedShippingType.name;
      paymentLines.push(`Shipping: ${label}`);
    } else if (checkoutState.shippingMethod === NONE_SHIPPING_ID) {
      paymentLines.push("Shipping: No shipping selected");
    }
    if (meta) paymentLines.push(`Coupon: ${meta.code}`);
    $("#review_payment").innerHTML = paymentLines
      .filter(Boolean)
      .map((line) => `<div>${line}</div>`)
      .join("");
  };

  /* ========= coupon handling ========= */
  const couponInput = byId("coupon_code");
  const couponFeedback = byId("coupon_feedback");
  const couponInputWrapper = couponInput?.closest(".input-wrapper");

  const getCouponButton = () =>
    document.querySelector(".apply-coupon");

  const setCouponVisualState = (state = "neutral", message = "") => {
    if (couponFeedback) {
      couponFeedback.textContent = message || "";
      couponFeedback.classList.remove(
        "text-gray-500",
        "text-red-600",
        "text-emerald-600"
      );
      if (state === "error") {
        couponFeedback.classList.add("text-red-600");
      } else if (state === "success") {
        couponFeedback.classList.add("text-emerald-600");
      } else {
        couponFeedback.classList.add("text-gray-500");
      }
    }
    if (couponInputWrapper) {
      couponInputWrapper.classList.remove(
        "ring-2",
        "ring-red-500",
        "border-red-500",
        "ring-emerald-500",
        "border-emerald-500"
      );
      if (state === "error") {
        couponInputWrapper.classList.add(
          "ring-2",
          "ring-red-500",
          "border-red-500"
        );
      } else if (state === "success") {
        couponInputWrapper.classList.add(
          "ring-2",
          "ring-emerald-500",
          "border-emerald-500"
        );
      }
    }
  };

  const setCouponButtonState = ({ loading = false, applied = false } = {}) => {
    const button = getCouponButton();
    if (!button) return;
    button.disabled = loading;
    button.style.pointerEvents = loading ? "none" : "";
    button.style.opacity = loading ? "0.6" : "";
    if (loading) {
      button.textContent = "Applying…";
    } else if (applied) {
      button.textContent = "Remove";
    } else {
      button.textContent = "Apply";
    }
  };

  const clearCouponState = ({ message = "" } = {}) => {
    checkoutState.couponMeta = null;
    checkoutState.freeShipping = false;
    setCouponButtonState({ applied: false });
    setCouponVisualState("neutral", message);
  };

  const removeCoupon = async ({ message = "Coupon removed." } = {}) => {
    checkoutState.couponMeta = null;
    checkoutState.freeShipping = false;
    if (couponInput) couponInput.value = "";
    setCouponButtonState({ applied: false });
    setCouponVisualState("neutral", message);
    await updateOffer();
  };

  const applyCoupon = async () => {
    if (!couponInput) return;
    const code = (couponInput.value || "").trim();

    if (!code) {
      clearCouponState({ message: "Enter a code to apply a discount." });
      await updateOffer();
      return;
    }

    setCouponButtonState({ loading: true, applied: false });
    setCouponVisualState("neutral", "Validating coupon…");

    try {
      // Get cart product IDs for validation (use payment IDs)
      const cartState = Cart.getState();
      const cartProductIds = cartState.items.map(
        (item) => item.productId || item.id
      );

      // Validate coupon with backend
      const result = await validateCoupons(
        checkoutState.contactId,
        [code],
        cartProductIds
      );

      if (result.applied) {
        checkoutState.couponMeta = {
          code: result.applied.coupon_code,
          type: result.applied.discount_type,
          value: result.applied.discount_value,
          product_selection: result.applied.product_selection,
          applicable_products: Array.isArray(result.applied.applicable_products)
            ? result.applied.applicable_products.map(String)
            : undefined,
          recurring: result.applied.recurring,
        };
        checkoutState.freeShipping =
          result.applied.discount_type === "shipping";
        setCouponVisualState(
          "success",
          result.applied.message || "Coupon applied successfully!"
        );
        setCouponButtonState({ applied: true });
      } else {
        const reason = result.reasons[code];
        let message = "Invalid coupon code";
        switch (reason) {
          case "not_found":
            message = "Coupon code not found";
            break;
          case "expired":
            message = "Coupon has expired";
            break;
          case "already_used":
            message = "Coupon already used";
            break;
          case "not_applicable":
            message = "Coupon not applicable to cart items";
            break;
          case "not_applied_multiple":
            message = "Only one coupon can be applied";
            break;
        }
        checkoutState.couponMeta = null;
        checkoutState.freeShipping = false;
        setCouponButtonState({ applied: false });
        setCouponVisualState("error", message);
      }
    } catch (err) {
      console.error("Coupon validation failed:", err);
      checkoutState.couponMeta = null;
      checkoutState.freeShipping = false;
      setCouponButtonState({ applied: false });
      setCouponVisualState(
        "error",
        "Failed to validate coupon. Please try again."
      );
    } finally {
      setCouponButtonState({
        loading: false,
        applied: !!checkoutState.couponMeta,
      });
    }

    await updateOffer();
  };

  // Process the complete order
  const processOrder = async () => {
    if (!checkoutState.contactId) {
      throw new Error("Contact not saved. Please complete the contact step.");
    }

    if (!checkoutState.currentOffer) {
      throw new Error("Offer not calculated. Please try again.");
    }

    // Get billing address
    const billing_address = {
      address: byId("bill_addr1")?.value?.trim() || "",
      address2: byId("bill_addr2")?.value?.trim() || "",
      city: byId("bill_city")?.value?.trim() || "",
      state: byId("bill_state")?.value?.trim() || "",
      zip: byId("bill_postal")?.value?.trim() || "",
      country: byId("bill_country")?.value?.trim() || "Australia",
    };

    const usingSavedCard = isUsingSavedCard();
    let payer;
    if (usingSavedCard) {
      const selectedCard = getSelectedSavedCard();
      if (!selectedCard) {
        throw new Error(
          "Saved card could not be found. Please choose another payment method."
        );
      }
      const cardId = selectedCard.id;
      payer = {
        card_id: Number(cardId) || cardId,
      };
    } else {
      const expRaw = byId("cc_exp")?.value || "";
      const [expMonthRaw, expYearRaw] = expRaw.split("/");
      const expMonth = parseInt(expMonthRaw || "0", 10);
      const expYear = 2000 + parseInt(expYearRaw || "0", 10);
      payer = {
        ccnumber: byId("cc_number")?.value?.replace(/\s/g, "") || "",
        code: byId("cc_cvc")?.value?.trim() || "",
        expire_month: expMonth,
        expire_year: expYear,
        name: byId("cc_name")?.value?.trim() || "",
      };
    }

    // Get selected shipping type
    const selectedShipping = document.querySelector(
      'input[name="shipping_method"]:checked'
    );
    let shippingType = null;
    if (selectedShipping) {
      shippingType = checkoutState.shippingTypes.find(
        (st) => String(st.id) === selectedShipping.value
      );
    } else {
      shippingType = getSelectedShippingType();
    }
    if (shippingType && String(shippingType.id) === NONE_SHIPPING_ID) {
      shippingType = null;
    }

    // Build final offer with current shipping selection
    const cartState = Cart.getState();
    const cartItems = cartState.items.map((item) => ({
      productId: item.productId || item.id, // Use payment ID for backend
      name: item.name,
      quantity: item.qty,
      price:
        (Number(item.price) || 0) + (Number(item.retailGst) || 0),
      taxable: true,
      requiresShipping: item.requiresShipping !== false,
    }));

    const dispenseMeta = cartState.items.map((item) => ({
      productId: item.productId || item.id,
      productUniqueId: item.id,
      dispenseId: item.dispenseId || null,
      quantity: item.qty,
      retailPrice: Number(item.price) || 0,
      retailGst: Number(item.retailGst) || 0,
      wholesalePrice: Number(item.wholesalePrice) || 0,
      scriptId: item.scriptId || null,
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
      invoice_template: invoiceTemplateId,
      gateway_id: paymentGatewayId,
      dispenses: dispenseMeta,
    };

    return await processTransaction(transactionData);
  };

  // Load shipping types from backend
  const loadShippingTypes = async () => {
    try {
      const cartState = Cart.getState();
      const requiresShipping = cartState.items.some(
        (item) => item.requiresShipping !== false
      );

      if (!requiresShipping) {
        // Hide shipping section if no items require shipping
        const shippingFieldset = document.querySelector("fieldset");
        if (shippingFieldset) {
          shippingFieldset.style.display = "none";
        }
        checkoutState.shippingTypes = [];
        checkoutState.shippingMethod = "";
        return;
      }

      const rawShippingTypes = await getShippingTypes(shippingOptions);
      const resolvedTypes = applyShippingRules(rawShippingTypes);
      checkoutState.shippingTypes = resolvedTypes;

      // Update shipping UI with dynamic options
      const shippingContainer = document.getElementById("shipping_methods");
      if (shippingContainer) {
        shippingContainer.innerHTML = "";
        const preferred = (() => {
          const current = checkoutState.shippingMethod
            ? String(checkoutState.shippingMethod)
            : "";
          if (
            current &&
            resolvedTypes.some((type) => String(type.id) === current)
          ) {
            return current;
          }
          return resolvedTypes[0] ? String(resolvedTypes[0].id) : "";
        })();

        resolvedTypes.forEach((type, index) => {
          if (!type) return;
          const label = document.createElement("label");
          label.className =
            "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-500";
          const value = String(type.id);
          const priceValue = Number(type.price) || 0;
          const priceLabel = priceValue > 0 ? money(priceValue) : "Free";
          label.innerHTML = `
            <div class="flex items-center gap-3">
              <input type="radio" name="shipping_method" value="${value}" ${
                preferred
                  ? value === preferred
                    ? "checked"
                    : ""
                  : index === 0
                  ? "checked"
                  : ""
              }
                class="text-blue-600 focus:ring-blue-500" />
              <div>
                <div class="font-semibold">${type.name}</div>
                <div class="text-xs text-gray-500">${
                  type.description || "Standard delivery"
                }</div>
              </div>
            </div>
            <span class="text-sm font-semibold">${priceLabel}</span>
          `;
          shippingContainer.appendChild(label);
        });

        checkoutState.shippingMethod = preferred ||
          (resolvedTypes[0] ? String(resolvedTypes[0].id) : "");
        await updateOffer();
      }
    } catch (err) {
      console.error("Failed to load shipping types:", err);
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
      if (!Cart.getState().items.length) {
        updateStepControlsForCart();
        return;
      }
      const current = checkoutState.steps[checkoutState.stepIndex];
      if (current === "contact") {
        if (!validateContainer($("[data-step='contact']"))) return;
        const btn = target.closest(".step-next");
        const original = btn?.textContent;
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Saving…";
        }

        // Save contact with new API
        const contactData = {
          first_name: byId("cust_first")?.value?.trim() || "",
          last_name: byId("cust_last")?.value?.trim() || "",
          email: byId("cust_email")?.value?.trim() || "",
          phone: byId("cust_phone")?.value?.trim() || "",
        };
        const serialized = serialiseContactPayload(contactData);
        const proceed = () => {
          checkoutState.contactEmail = contactData.email;
          saveCheckoutState();
          checkoutState.stepIndex = Math.min(
            checkoutState.steps.length - 1,
            checkoutState.stepIndex + 1
          );
          renderStepper();
          renderStep();
          loadShippingTypes();
        };
        const restoreButton = () => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = original;
          }
        };

        if (
          serialized &&
          checkoutState.lastSavedContactPayload === serialized
        ) {
          proceed();
          restoreButton();
          return;
        }

        saveContact(contactData)
          .then((result) => {
            checkoutState.contactId = result?.contactId || null;
            checkoutState.contactEmail = contactData.email;
            if (serialized) {
              checkoutState.lastSavedContactPayload = serialized;
            }
            saveCheckoutState();
            proceed();
          })
          .catch((err) => {
            alert(err?.message || "Unable to save contact.");
          })
          .finally(() => {
            restoreButton();
          });
        return;
      }
      if (current === "address") {
        const addressForm = $("[data-step='address']");
        if (!validateContainer(addressForm)) return;
        const btn = target.closest(".step-next");
        const original = btn?.textContent;
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Saving…";
        }

        const shippingValue = shippingOptionSelect?.value || "";
        const contactData = {
          first_name: byId("cust_first")?.value?.trim() || "",
          last_name: byId("cust_last")?.value?.trim() || "",
          email: byId("cust_email")?.value?.trim() || "",
          phone: byId("cust_phone")?.value?.trim() || "",
        };
        if (shippingValue) {
          contactData.f3099 = shippingValue;
          contactData.default_shipping_option = shippingValue;
        }
        const assign = (key, value) => {
          if (value === null || value === undefined) return;
          const str = typeof value === "string" ? value.trim() : value;
          if (typeof str === "string" && str === "") return;
          contactData[key] = str;
        };

        if (shippingValue === HOME_SHIPPING_OPTION) {
          assign("address", byId("ship_addr1")?.value);
          assign("address2", byId("ship_addr2")?.value);
          assign("city", byId("ship_city")?.value);
          assign("state", byId("ship_state")?.value);
          assign("zip", byId("ship_postal")?.value);
          assign("country", byId("ship_country")?.value || "Australia");
        } else if (shippingValue === PARCEL_SHIPPING_OPTION) {
          assign("f3094", byId("parcel_number")?.value);
          assign("f3095", byId("parcel_street")?.value);
          assign("f3096", byId("parcel_city")?.value);
          assign("f3097", byId("parcel_state")?.value);
          assign("f3098", byId("parcel_postal")?.value);
        }

        const serialized = serialiseContactPayload(contactData);
        const proceed = () => {
          checkoutState.contactEmail = contactData.email;
          saveCheckoutState();
          checkoutState.stepIndex = Math.min(
            checkoutState.steps.length - 1,
            checkoutState.stepIndex + 1
          );
          renderStepper();
          renderStep();
        };
        const restoreButton = () => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = original;
          }
        };

        if (
          serialized &&
          checkoutState.lastSavedContactPayload === serialized
        ) {
          proceed();
          restoreButton();
          return;
        }

        saveContact(contactData)
          .then((result) => {
            if (result?.contactId) {
              checkoutState.contactId = result.contactId;
            } else {
              checkoutState.contactId = null;
            }
            checkoutState.contactEmail = contactData.email;
            if (serialized) {
              checkoutState.lastSavedContactPayload = serialized;
            }
            saveCheckoutState();
            proceed();
          })
          .catch((err) => {
            alert(err?.message || "Unable to save address.");
          })
          .finally(() => {
            restoreButton();
          });
        return;
      }
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
      if (!Cart.getState().items.length) {
        updateStepControlsForCart();
        return;
      }
      if (!validateContainer($("#payment_form"))) return;
      buildReview();

      const btn = target.closest(".place-order");
      const original = btn?.textContent;
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Processing…";
      }

      processOrder()
        .then((result) => {
          // Clear cart and state
          Cart.clear();
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(`${STORAGE_KEY}:form`);

          // Redirect to success page
          window.location.href = `https://app.thehappy.clinic/shop/thank-you?order=${
            result.order_id || result.transaction_id || "success"
          }`;
        })
        .catch((err) => {
          alert(err?.message || "Order processing failed. Please try again.");
        })
        .finally(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = original;
          }
        });
      return;
    }
    if (target.closest(".apply-coupon")) {
      if (checkoutState.couponMeta) {
        removeCoupon().catch((err) =>
          console.error("Failed to remove coupon", err)
        );
      } else {
        applyCoupon();
      }
      return;
    }
    if (target.closest(".return-to-shop")) {
      window.location.href = "https://app.thehappy.clinic/shop";
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "default_shipping_option") {
      checkoutState.shippingPreference = target.value || "";
      updateShippingOptionUI(target.value || "");
      saveCheckoutState();
      if (checkoutState.steps[checkoutState.stepIndex] === "review")
        buildReview();
      return;
    }
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
      checkoutState.shippingMethod = target.value || "";
      if (
        checkoutState.shippingMethod !== NONE_SHIPPING_ID &&
        (!checkoutState.couponMeta ||
          checkoutState.couponMeta.type !== "shipping")
      ) {
        checkoutState.freeShipping = false;
      }
      saveCheckoutState();
      renderSummary();
      if (checkoutState.steps[checkoutState.stepIndex] === "review")
        buildReview();
      updateOffer();
      return;
    }
    if (target.name === "payment_source") {
      checkoutState.selectedPaymentSource = target.value || "new";
      applyPaymentSourceSelection();
    }
  });

  const init = async () => {
    try {
      if (typeof Cart === "undefined") {
        hideLoader();
        return;
      }
      setLoaderMessage("Loading your cart…");
      await Cart.init();
      const cartState = Cart.getState();
      if (!cartState.items.length) {
        hideLoader();
        window.location.href = "https://app.thehappy.clinic/shop";
        return;
      }

      // Load saved state and form data
      loadCheckoutState();
      if (loggedInContactId) {
        checkoutState.contactId = loggedInContactId;
        saveCheckoutState();
      }
      applyPaymentSourceSelection({ save: false });
      loadFormData();

      const prefValue =
        shippingOptionSelect?.value || checkoutState.shippingPreference || "";
      if (shippingOptionSelect && !shippingOptionSelect.value && prefValue) {
        shippingOptionSelect.value = prefValue;
      }
      checkoutState.shippingPreference = prefValue;
      updateShippingOptionUI(prefValue);

      ["ship_country", "bill_country"].forEach((id) => {
        const el = byId(id);
        if (el && !el.value) el.value = "Australia";
      });

      // Set up form change listeners for persistence
      const inputs = document.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        input.addEventListener("change", saveFormData);
        input.addEventListener("input", saveFormData);
      });

      const emailInput = byId("cust_email");
      if (emailInput) {
        const syncEmailState = () => {
          const raw = emailInput.value || "";
          const trimmed = raw.trim();
          const normalizedStored = (checkoutState.contactEmail || "")
            .trim()
            .toLowerCase();
          const normalizedCurrent = trimmed.toLowerCase();
          if (normalizedCurrent !== normalizedStored || !trimmed) {
            if (trimmed) {
              checkoutState.contactEmail = trimmed;
            } else {
              checkoutState.contactEmail = "";
            }
            checkoutState.contactId = null;
            saveCheckoutState();
          }
        };
        emailInput.addEventListener("change", syncEmailState);
        emailInput.addEventListener("blur", syncEmailState);

        if (!checkoutState.contactEmail && emailInput.value) {
          checkoutState.contactEmail = emailInput.value.trim();
          saveCheckoutState();
        }
      }

      if (loggedInContactId) {
        setLoaderMessage("Fetching your details…");
        await hydrateLoggedInContact(loggedInContactId);
      } else {
        checkoutState.savedCards = [];
        applyPaymentSourceSelection({ save: false });
      }

      // Clear static shipping options and load dynamic ones; do this regardless of contact state
      const shippingContainer = document.getElementById("shipping_methods");
      if (shippingContainer) shippingContainer.innerHTML = "";
      setLoaderMessage("Updating shipping options…");
      await loadShippingTypes();

      // Update offer with current state
      await updateOffer();

      renderSummary();
      renderStepper();
      renderStep();
      updateStepControlsForCart();

      Cart.subscribe(() => {
        renderSummary();
        updateStepControlsForCart();
        if (checkoutState.steps[checkoutState.stepIndex] === "review")
          buildReview();
        updateOffer(); // Update offer when cart changes
        loadShippingTypes().catch((err) =>
          console.error("Failed to refresh shipping types", err)
        );
      });

      if (couponInput)
        couponInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyCoupon();
          }
        });

      if (couponInput)
        couponInput.addEventListener("input", () => {
          if (!checkoutState.couponMeta) {
            setCouponVisualState("neutral", "");
            return;
          }
          const typed = (couponInput.value || "").trim().toUpperCase();
          const current = String(checkoutState.couponMeta.code || "")
            .trim()
            .toUpperCase();
          if (typed !== current) {
            checkoutState.couponMeta = null;
            checkoutState.freeShipping = false;
            setCouponButtonState({ applied: false });
            setCouponVisualState("neutral", "");
          }
        });
    } catch (err) {
      console.error("Checkout initialization failed", err);
    } finally {
      hideLoader();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();


(() => {
  const cc   = document.getElementById("cc_number");
  const exp  = document.getElementById("cc_exp");
  const cvc  = document.getElementById("cc_cvc");

  // --- Card number: group every 4 digits ---
  if (cc) {
    const formatCC = (v) =>
      v.replace(/\D/g, "").slice(0, 16)               // keep up to 16 digits
       .replace(/(\d{4})(?=\d)/g, "$1 ")              // 1234 5678 9012 3456
       .trim();

    const reformatCCKeepingCaret = () => {
      const prev = cc.value;
      const start = cc.selectionStart ?? prev.length;
      // number of digits before caret in the raw input
      const digitsBeforeCaret = prev.slice(0, start).replace(/\D/g, "").length;

      cc.value = formatCC(prev);

      // place caret after the same count of digits in the new, spaced value
      let seen = 0, newPos = 0;
      for (const ch of cc.value) {
        newPos++;
        if (/\d/.test(ch)) seen++;
        if (seen === digitsBeforeCaret) break;
      }
      cc.setSelectionRange(newPos, newPos);
    };

    cc.addEventListener("input", reformatCCKeepingCaret);
    cc.addEventListener("paste", () => setTimeout(reformatCCKeepingCaret, 0));
  }

  // --- Expiry: MM/YY, auto-slash, mobile-friendly ---
  if (exp) {
    const formatExp = (raw) => {
      let d = raw.replace(/\D/g, "").slice(0, 4); // keep up to 4 digits (MMYY)

      // Auto-prepend 0 if first digit is 2–9 (so "3" -> "03")
      if (d.length >= 1 && d[0] > "1") d = "0" + d;

      if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2);
      if (d.length >= 2) return d.slice(0, 2) + "/";
      return d;
    };

    const reformatExp = () => {
      exp.value = formatExp(exp.value);
      // keep caret at end (simple + reliable across mobile keyboards)
      const len = exp.value.length;
      exp.setSelectionRange(len, len);
    };

    // Users don't need to type '/', we insert it
    exp.addEventListener("keydown", (e) => {
      if (e.key === "/" || e.code === "Slash") e.preventDefault();
    });
    exp.addEventListener("input", reformatExp);
    exp.addEventListener("paste", () => setTimeout(reformatExp, 0));
  }

  // --- CVC: digits only, up to 4 ---
  if (cvc) {
    const clampCVC = () => {
      cvc.value = cvc.value.replace(/\D/g, "").slice(0, 4);
    };
    cvc.addEventListener("input", clampCVC);
    cvc.addEventListener("paste", () => setTimeout(clampCVC, 0));
  }
})();
