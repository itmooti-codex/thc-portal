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
  const datasetRoot = document.querySelector(".get-url") || document.body;
  const dataset = (datasetRoot && datasetRoot.dataset) || {};

  const shouldUseHtmlFallbacks = (() => {
    try {
      const loc = window.location || {};
      const protocol = (loc.protocol || "").toLowerCase();
      if (protocol === "file:") return true;
      const pathname = loc.pathname || "";
      if (/\.html(?:$|[?#/])/i.test(pathname)) return true;
      const host = (loc.hostname || "").toLowerCase();
      if (!host) return true;
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.endsWith(".local")
      ) {
        return true;
      }
      return false;
    } catch {
      return true;
    }
  })();

  const SHOP_FALLBACK = shouldUseHtmlFallbacks ? "shop.html" : "/shop";
  const THANK_YOU_FALLBACK = shouldUseHtmlFallbacks
    ? "thank-you.html"
    : "/thank-you";

  const pickFirstValue = (...candidates) => {
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const value = String(candidate).trim();
      if (value) return value;
    }
    return "";
  };

  const normaliseUrl = (raw, fallbackPath) => {
    const fallback = (() => {
      try {
        return new URL(fallbackPath, window.location.href).toString();
      } catch {
        return fallbackPath;
      }
    })();
    if (!raw) return fallback;
    try {
      return new URL(raw, window.location.href).toString();
    } catch (err) {
      console.warn("Failed to normalise URL", raw, err);
      return fallback;
    }
  };

  const getShopUrl = () =>
    normaliseUrl(
      pickFirstValue(
        dataset.shopUrl,
        dataset.storeUrl,
        config.shopUrl,
        config.storeUrl,
        config.shopURL,
        config.storeURL
      ),
      SHOP_FALLBACK
    );

  const getThankYouUrl = () =>
    normaliseUrl(
      pickFirstValue(
        dataset.thankYouUrl,
        dataset.thankyouUrl,
        config.thankYouUrl,
        config.thankyouUrl,
        config.thankYouURL,
        config.thankyouURL
      ),
      THANK_YOU_FALLBACK
    );

  const withOrderRef = (url, orderRef) => {
    if (!orderRef) return url;
    try {
      const resolved = new URL(url);
      resolved.searchParams.set("order", orderRef);
      return resolved.toString();
    } catch {
      return url;
    }
  };
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
    showToast: showToastFn,
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

  const showToast =
    typeof showToastFn === "function"
      ? (message, options) => showToastFn(message, options)
      : (message) => {
          if (!message) return;
          try {
            alert(message);
          } catch {}
        };

  showLoader("Preparing checkout…");

  const debounce = (fn, delay = 150) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const debugLog = (...args) => {
    if (typeof window !== "undefined" && window.__CHECKOUT_DEBUG) {
      try {
        console.log("[Checkout]", ...args);
      } catch (err) {
        try {
          console.log("[Checkout] (log failed)", err);
        } catch {}
      }
    }
  };

  const stripCardDigits = (value) => {
    if (value === null || value === undefined) return "";
    const digits = String(value).replace(/\D/g, "");
    return digits;
  };

  const normalizeSavedCardId = (card) => {
    if (!card || typeof card !== "object") return "";
    const candidates = [card.id, card.card_id, card.cardId, card.cc_id, card.ccId];
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const value = String(candidate).trim();
      if (value) return value;
    }
    return "";
  };

  const summariseSavedCardForDebug = (card) => {
    if (!card || typeof card !== "object") return null;
    const id = normalizeSavedCardId(card);
    const last4 =
      card.last4 || card.card_last_four || card.card_last4 || "unknown";
    const expMonth =
      card.exp_month || card.card_expiration_month || card.expMonth || "";
    const expYear =
      card.exp_year || card.card_expiration_year || card.expYear || "";
    return {
      id,
      brand:
        card.type ||
        card.card_type ||
        card.cardType ||
        card.brand ||
        card.card_brand ||
        "",
      last4: stripCardDigits(last4).slice(-4) || last4,
      exp: expMonth && expYear ? `${expMonth}/${String(expYear).slice(-2)}` : "",
      nickname: card.nickname || "",
    };
  };

  const summarisePayerForDebug = (payer) => {
    if (!payer || typeof payer !== "object") return null;
    const cardDigits = stripCardDigits(payer.ccnumber || payer.number || "");
    return {
      name: payer.name || "",
      exp_month: payer.expire_month || payer.exp_month || "",
      exp_year: payer.expire_year || payer.exp_year || "",
      card_last4: cardDigits ? cardDigits.slice(-4) : "",
      has_code: !!(payer.code || payer.cvc || payer.cvv),
    };
  };

  const summariseOfferForDebug = (offer) => {
    if (!offer || typeof offer !== "object") return null;
    const summary = {};
    [
      "total",
      "subtotal",
      "tax",
      "shipping",
      "grand_total",
      "grandTotal",
    ].forEach((key) => {
      if (offer[key] !== undefined) summary[key] = offer[key];
    });
    if (Array.isArray(offer.items)) {
      summary.items = offer.items.map((item) => ({
        productId:
          item.productId ||
          item.id ||
          item.product_id ||
          item.payment_id ||
          "",
        quantity: item.quantity || item.qty || 0,
        price: item.price || item.unitPrice || 0,
      }));
    }
    return summary;
  };

  const summariseTransactionForDebug = (transactionData) => {
    if (!transactionData || typeof transactionData !== "object") return null;
    const summary = {
      contactId:
        transactionData.contact_id ||
        transactionData.contactId ||
        checkoutState.contactId,
      chargeNow: transactionData.chargeNow,
      gatewayId: transactionData.gateway_id,
      invoiceTemplate: transactionData.invoice_template,
      hasBillingAddress: !!transactionData.billing_address,
      billingCountry: transactionData.billing_address?.country || "",
      ccId: transactionData.cc_id || null,
      payer: summarisePayerForDebug(transactionData.payer),
      offer: summariseOfferForDebug(transactionData.offer),
    };
    return summary;
  };

  const summariseTransactionResultForDebug = (result) => {
    if (!result || typeof result !== "object") return result;
    const summary = {};
    [
      "order_id",
      "orderId",
      "transaction_id",
      "transactionId",
      "status",
      "state",
      "message",
    ].forEach((key) => {
      if (result[key] !== undefined) summary[key] = result[key];
    });
    if (result.errors) summary.errors = result.errors;
    if (result.missingFields) summary.missingFields = result.missingFields;
    return Object.keys(summary).length ? summary : result;
  };

  const sanitiseErrorDetailsForDebug = (details) => {
    if (!details || typeof details !== "object") return details;
    const allowedKeys = [
      "error",
      "message",
      "details",
      "missing",
      "missingFields",
      "fieldErrors",
      "errors",
      "missing_fields",
      "missing_fields_display",
      "validation",
    ];
    const sanitised = {};
    allowedKeys.forEach((key) => {
      if (details[key] !== undefined) {
        sanitised[key] = details[key];
      }
    });
    if (!Object.keys(sanitised).length) return details;
    return sanitised;
  };

  const pickFirstString = (...candidates) => {
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
    return "";
  };

  const extractMissingFields = (details) => {
    if (!details || typeof details !== "object") return [];
    const sources = [
      details.missingFields,
      details.missing_fields,
      details.missing,
      details.missing_fields_display,
      details?.details?.missingFields,
    ];
    for (const source of sources) {
      if (Array.isArray(source) && source.length) {
        return source.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof source === "string" && source.trim()) {
        return source
          .split(/[,;]/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  const getFriendlyCheckoutErrorMessage = (err) => {
    if (!err) return "";
    if (typeof err === "string") return err;
    const details =
      err.details && typeof err.details === "object" ? err.details : null;
    const missing = extractMissingFields(details);
    if (missing.length) {
      return `Missing required fields: ${missing.join(", ")}`;
    }
    const detailMessage = details
      ? pickFirstString(
          details.error,
          details.message,
          details.details,
          details.reason,
          Array.isArray(details.errors)
            ? details.errors.map((item) => String(item)).join(", ")
            : ""
        )
      : "";
    const errorMessage = pickFirstString(err.friendlyMessage, err.message);
    return pickFirstString(detailMessage, errorMessage, "");
  };

  const logCheckoutError = (label, err, context = {}) => {
    const payload = {
      message: err?.message,
      status: err?.status,
      friendly: getFriendlyCheckoutErrorMessage(err),
      details: err?.details
        ? sanitiseErrorDetailsForDebug(err.details)
        : null,
      context,
    };
    debugLog(label, payload);
    if (typeof window === "undefined" || !window.__CHECKOUT_DEBUG) {
      try {
        console.warn(`[Checkout] ${label}`, payload);
      } catch {}
    }
  };

  const getAddressFromForm = (
    prefix,
    { fallbackCountry = "Australia" } = {}
  ) => {
    const read = (suffix) => {
      const el = byId(`${prefix}_${suffix}`);
      if (!el || el.value == null) return "";
      return String(el.value).trim();
    };
    return {
      address: read("addr1"),
      address2: read("addr2"),
      city: read("city"),
      state: read("state"),
      zip: read("postal"),
      country: read("country") || fallbackCountry,
    };
  };

  const addressHasRequiredFields = (address) => {
    if (!address || typeof address !== "object") return false;
    return ["address", "city", "zip"].some((key) => {
      const value = address[key];
      return typeof value === "string" && value.trim().length > 0;
    });
  };

  const fillAddressWithFallback = (primary = {}, fallback = {}) => {
    const result = { ...primary };
    ["address", "address2", "city", "state", "zip", "country"].forEach(
      (key) => {
        if (
          (!result[key] || !String(result[key]).trim()) &&
          fallback[key] &&
          String(fallback[key]).trim()
        ) {
          result[key] = String(fallback[key]).trim();
        }
      }
    );
    return result;
  };

  const normaliseAddressForPayload = (
    address,
    fallbackCountry = "Australia"
  ) => {
    if (!address || typeof address !== "object") return null;
    const normalized = {};
    ["address", "address2", "city", "state", "zip", "country"].forEach(
      (key) => {
        if (address[key] === undefined || address[key] === null) return;
        const value =
          typeof address[key] === "string"
            ? address[key].trim()
            : address[key];
        if (typeof value === "string") {
          if (!value) return;
          normalized[key] = value;
        } else if (value !== undefined) {
          normalized[key] = value;
        }
      }
    );
    if (!normalized.country && fallbackCountry) {
      normalized.country = fallbackCountry;
    }
    return normalized;
  };

  const getApiBase = () => {
    // Priority: window.ENV.API_BASE > .get-url[data-api-base] > meta[name="api-base"]
    try {
      const winBase = window.ENV?.API_BASE;
      const dataBase = document.querySelector(".get-url")?.dataset?.apiBase;
      const metaBase = document.querySelector('meta[name="api-base"]')?.content;
      const base = winBase || dataBase || metaBase || "http://localhost:3001";
        console.log("Detected API base URL:", base, winBase, dataBase, metaBase);
      
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
    const fetchOptions = {
      headers: { "Content-Type": "application/json" },
      ...options,
    };
    const response = await fetch(url, fetchOptions);
    console.log(response);

    let responseData = null;
    let parsedJson = false;
    try {
      responseData = await response.clone().json();
      parsedJson = true;
    } catch {
      try {
        responseData = await response.clone().text();
      } catch {
        responseData = null;
      }
    }

    if (!response.ok) {
      let errorMessage = "Request failed";
      if (parsedJson && responseData && typeof responseData === "object") {
        errorMessage =
          responseData.error ||
          responseData.message ||
          responseData.details ||
          errorMessage;
      } else if (typeof responseData === "string" && responseData.trim()) {
        errorMessage = responseData.trim();
      }
      const error = new Error(`${errorMessage} (${response.status})`);
      console.log("err", error);
      error.status = response.status;
      error.endpoint = endpoint;
      error.details =
        parsedJson && responseData && typeof responseData === "object"
          ? responseData
          : typeof responseData === "string"
          ? { raw: responseData.slice(0, 500) }
          : null;
      debugLog("API call failed", {
        endpoint,
        status: response.status,
        message: errorMessage,
        details: error.details
          ? sanitiseErrorDetailsForDebug(error.details)
          : null,
      });
      throw error;
    }

    if (parsedJson) {
      return responseData;
    }
    if (typeof responseData === "string" && responseData.trim()) {
      try {
        return JSON.parse(responseData);
      } catch {
        return responseData;
      }
    }
    try {
      return await response.json();
    } catch {
      return {};
    }
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
    debugLog("Submitting transaction", summariseTransactionForDebug(transactionData));
    try {
      const result = await apiCall("/api-thc/transaction/process", {
        method: "POST",
        body: JSON.stringify(transactionData),
      });
      debugLog(
        "Transaction processed",
        summariseTransactionResultForDebug(result)
      );
      return result;
    } catch (err) {
      debugLog("Transaction failed", {
        message: err?.message,
        status: err?.status,
        details: err?.details ? sanitiseErrorDetailsForDebug(err.details) : null,
      });
      throw err;
    }
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
    shippingSelectionConfirmed: false,
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
        if (checkoutState.couponMeta) {
          const meta = checkoutState.couponMeta;
          const normalizedType = normaliseCouponType(
            meta.normalizedType || meta.type || meta.discount_type
          );
          const normalizedValue = normaliseCouponValue(
            meta.normalizedValue !== undefined && meta.normalizedValue !== null
              ? meta.normalizedValue
              : meta.value !== undefined && meta.value !== null
              ? meta.value
              : meta.discount_value
          );
          checkoutState.couponMeta.normalizedType = normalizedType;
          checkoutState.couponMeta.normalizedValue = normalizedValue;
          if (normalizedType === "shipping") {
            checkoutState.freeShipping = true;
          }
          debugLog("Loaded coupon from storage", checkoutState.couponMeta);
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

  const getDispenseService = () => {
    try {
      return window.DispenseService || null;
    } catch {
      return null;
    }
  };

  const DISPENSE_STATUS_IDS = Object.assign(
    {
      CANCELLED: "146",
      IN_CART: "149",
      PAID: "152",
    },
    getDispenseService()?.statusIds || {}
  );
  const DISPENSE_STATUS_LABELS = Object.assign(
    {
      "146": "Cancelled",
      "149": "In Cart",
      "152": "Paid",
    },
    getDispenseService()?.statusLabels || {}
  );

  const STARTRACK_MATCHER = /star\s*track/i;

  const getContactId = () => {
    if (checkoutState.contactId) {
      return String(checkoutState.contactId).trim();
    }
    try {
      const config = window.StorefrontConfig || {};
      const candidates = [
        config.loggedInContactId,
        config.contactId,
        config.customerId,
        config.userId,
        config.memberId,
      ];
      for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) {
          const value = String(candidate).trim();
          if (value) return value;
        }
      }
    } catch {}
    try {
      const root = document.querySelector(".get-url");
      const dataset = root?.dataset || {};
      const candidates = [
        dataset.contactId,
        dataset.contactid,
        dataset.contact,
        dataset.userId,
        dataset.userid,
      ];
      for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) {
          const value = String(candidate).trim();
          if (value) return value;
        }
      }
    } catch {}
    return null;
  };

  const isScriptCartItem = (item) =>
    !!(item && (item.isScript || item.scriptId));

  const getDispenseItemId = (item) => {
    if (!item) return null;
    const candidates = [
      item.dispenseItemId,
      item.productId,
      item.id,
    ];
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        const value = String(candidate).trim();
        if (value && !value.startsWith("sig:") && !/^\s*\[/.test(value)) {
          return value;
        }
      }
    }
    return null;
  };

  const resolveShippingCompanyId = () => {
    const shippingTypes = Array.isArray(checkoutState.shippingTypes)
      ? checkoutState.shippingTypes
      : [];
    const method = checkoutState.shippingMethod;
    if (!method) return null;
    const match =
      shippingTypes.find((type) => String(type.id) === String(method)) ||
      null;
    if (!match) return null;
    const name = String(match.name || match.label || "").trim();
    if (STARTRACK_MATCHER.test(name)) {
      return "328";
    }
    return null;
  };

  const resolveDispenseStatusId = (value) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (DISPENSE_STATUS_LABELS[raw]) return raw;
    const upper = raw.toUpperCase();
    if (DISPENSE_STATUS_IDS[upper]) return DISPENSE_STATUS_IDS[upper];
    const lower = raw.toLowerCase();
    const fromLabels = Object.entries(DISPENSE_STATUS_LABELS).find(
      ([, label]) => typeof label === "string" && label.toLowerCase() === lower
    );
    return fromLabels ? fromLabels[0] : null;
  };

  const shouldUpdateDispenses = () => {
    const service = getDispenseService();
    if (!service) return false;
    if (typeof Cart === "undefined") return false;
    try {
      if (typeof Cart.isAuthenticated === "function") {
        return Cart.isAuthenticated();
      }
    } catch {}
    const config = window.StorefrontConfig || {};
    const contactId = config.loggedInContactId;
    if (contactId === null || contactId === undefined) return false;
    return String(contactId).trim().length > 0;
  };

  const ensureScriptDispenseMetadata = async (item) => {
    if (!item || (!item.isScript && !item.scriptId)) return item;
    const service = getDispenseService();
    if (!service) return item;
    let next = { ...item };
    const needsLookup =
      !next.dispenseId || !next.dispenseStatusId || !next.dispenseStatus;
    if (needsLookup && next.scriptId) {
      try {
        const meta =
          typeof service.waitForScriptDispense === "function"
            ? await service.waitForScriptDispense(next.scriptId, {
                attempts: 5,
                delayMs: 800,
              })
            : await service.fetchScript(next.scriptId);
        if (meta) {
          if (meta.dispenseId) next.dispenseId = meta.dispenseId;
          if (meta.dispenseStatusId)
            next.dispenseStatusId = meta.dispenseStatusId;
          if (meta.dispenseStatusLabel)
            next.dispenseStatus = meta.dispenseStatusLabel;
          next.isScript = true;
          if (typeof Cart.updateItemMetadata === "function") {
            await Cart.updateItemMetadata(next.id || item.id, {
              isScript: true,
              scriptId: next.scriptId,
              dispenseId: next.dispenseId,
              dispenseStatusId: next.dispenseStatusId,
              dispenseStatus: next.dispenseStatus,
            });
          }
        }
      } catch (err) {
        console.error("Failed to refresh script metadata", err);
      }
    }
    return next;
  };

  const updateCartDispenses = async (statusKeyOrId) => {
    if (!shouldUpdateDispenses()) return;
    const service = getDispenseService();
    if (!service) return;
    const statusId =
      resolveDispenseStatusId(statusKeyOrId) ||
      resolveDispenseStatusId(service.statusIds?.[statusKeyOrId]);
    if (!statusId) return;
    const label =
      DISPENSE_STATUS_LABELS[statusId] ||
      (service.statusLabels && service.statusLabels[statusId]) ||
      null;
    const cartState = Cart.getState();
    const shippingCompany =
      statusId === resolveDispenseStatusId("PAID")
        ? resolveShippingCompanyId()
        : null;
    const contactId = getContactId();
    for (const item of cartState.items) {
      if (!item) continue;
      if (isScriptCartItem(item)) {
        const enriched = await ensureScriptDispenseMetadata(item);
        if (!enriched.dispenseId) continue;
        try {
          await service.updateDispenseStatus(enriched.dispenseId, statusId);
          if (typeof Cart.updateItemMetadata === "function") {
            await Cart.updateItemMetadata(enriched.id || item.id, {
              dispenseStatusId: statusId,
              dispenseStatus: label || enriched.dispenseStatus || "",
            });
          }
        } catch (err) {
          console.error("Failed to update script dispense status", err);
        }
        continue;
      }
      const itemId = getDispenseItemId(item);
      if (!itemId) continue;
      const quantity = Math.max(1, Number(item.qty) || 1);
      let dispenseId =
        item.dispenseId != null ? String(item.dispenseId).trim() : "";
      try {
        if (!dispenseId) {
          if (!contactId || typeof service.createItemDispense !== "function") {
            continue;
          }
          const response = await service.createItemDispense({
            itemId,
            contactId,
            quantity,
            retailPrice: item.price,
            retailGst: item.retailGst,
            wholesalePrice: item.wholesalePrice,
            statusId,
            shippingCompany,
          });
          const created = response?.dispense || response || {};
          dispenseId =
            created.id != null ? String(created.id).trim() : "";
          if (
            dispenseId &&
            typeof Cart.updateItemMetadata === "function"
          ) {
            await Cart.updateItemMetadata(item.id, {
              dispenseId,
              dispenseStatusId: statusId,
              dispenseStatus: label || created.statusLabel || "",
              dispenseItemId: item.dispenseItemId || itemId,
            });
          }
        } else if (typeof service.updateItemDispense === "function") {
          await service.updateItemDispense(dispenseId, {
            statusId,
            quantity,
            shippingCompany: shippingCompany || undefined,
            contactId,
            patientId: contactId,
          });
          if (typeof Cart.updateItemMetadata === "function") {
            await Cart.updateItemMetadata(item.id, {
              dispenseStatusId: statusId,
              dispenseStatus: label || item.dispenseStatus || "",
            });
          }
        } else {
          await service.updateDispenseStatus(dispenseId, statusId);
        }
      } catch (err) {
        console.error("Failed to synchronise item dispense", err);
      }
    }
    try {
      window.StorefrontCartUI?.clearItemDispenseQueues?.();
    } catch {}
  };

  const syncGuestItemDispenses = async (statusKeyOrId) => {
    const service = getDispenseService();
    if (!service?.createItemDispense) return;
    const statusId =
      resolveDispenseStatusId(statusKeyOrId) ||
      resolveDispenseStatusId(service.statusIds?.[statusKeyOrId]) ||
      DISPENSE_STATUS_IDS.PAID;
    const contactId = getContactId();
    if (!contactId) return;
    const shippingCompany =
      statusId === resolveDispenseStatusId("PAID")
        ? resolveShippingCompanyId()
        : null;
    const cartState = Cart.getState();
    for (const item of cartState.items) {
      if (!item || isScriptCartItem(item)) continue;
      const itemId = getDispenseItemId(item);
      if (!itemId) continue;
      const quantity = Math.max(1, Number(item.qty) || 1);
      try {
        await service.createItemDispense({
          itemId,
          contactId,
          quantity,
          retailPrice: item.price,
          retailGst: item.retailGst,
          wholesalePrice: item.wholesalePrice,
          statusId,
          shippingCompany,
        });
      } catch (err) {
        console.error("Failed to create guest item dispense", err);
      }
    }
    try {
      window.StorefrontCartUI?.clearItemDispenseQueues?.();
    } catch {}
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

  const CARD_FEE_RATE = 0.018;
  const CARD_FEE_FIXED = 0.3;
  const CARD_FEE_GST_RATE = 0.1;
  const SHIPPING_GST_RATE = 0.1;

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
    processing: $use(".summary-processing"),
    processingNote: $use(".summary-processing-note"),
    gst: $use(".summary-gst"),
    discount: $use(".summary-discount"),
    total: $use(".summary-total"),
  };

  const checkoutProductsSection = document.querySelector(
    "[data-checkout-products]"
  );
  const checkoutProductsGrid = checkoutProductsSection?.querySelector(
    "[data-checkout-products-grid]"
  );
  const checkoutSearchInput = byId("product_search");
  const checkoutSearchClear = byId("product_search_clear");
  const checkoutSearchEmpty = byId("search_empty");
  let checkoutSearchQuery = "";

  const filterCheckoutProducts = (query = "") => {
    if (!checkoutProductsGrid) return;
    checkoutSearchQuery = query;
    const q = query.trim().toLowerCase();
    let matches = 0;
    checkoutProductsGrid.querySelectorAll(".product-card").forEach((card) => {
      const name =
        card.querySelector(".product-name")?.textContent?.toLowerCase() || "";
      const brand =
        card.querySelector(".product-brand")?.textContent?.toLowerCase() || "";
      const show = !q || name.includes(q) || brand.includes(q);
      card.classList.toggle("hidden", !show);
      if (show) matches++;
    });
    if (checkoutSearchClear)
      checkoutSearchClear.classList.toggle("hidden", !q);
    if (checkoutSearchEmpty)
      checkoutSearchEmpty.classList.toggle("hidden", !!matches || !q);
  };

  const initCheckoutSearch = () => {
    if (!checkoutProductsGrid || !checkoutSearchInput) return;
    const runFilter = debounce((value) => filterCheckoutProducts(value), 120);
    filterCheckoutProducts(checkoutSearchInput.value || "");
    checkoutSearchInput.addEventListener("input", (event) => {
      runFilter(event.target.value || "");
    });
    if (checkoutSearchClear) {
      checkoutSearchClear.addEventListener("click", () => {
        checkoutSearchInput.value = "";
        filterCheckoutProducts("");
        checkoutSearchInput.focus();
      });
    }
    const observer = new MutationObserver(() => {
      filterCheckoutProducts(checkoutSearchQuery);
    });
    observer.observe(checkoutProductsGrid, {
      childList: true,
      subtree: true,
    });
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
        price: item.price,
        taxable: true, // Default to taxable
        requiresShipping: true, // Default to requiring shipping
      }));

      // Get selected shipping type
      let shippingType = getSelectedShippingType();
      if (shippingType && String(shippingType.id) === NONE_SHIPPING_ID) {
        shippingType = null;
      }

      // Build offer with backend
      debugLog("updateOffer request", {
        couponMeta: checkoutState.couponMeta,
        shippingType,
        cartItems,
      });
      const offer = await buildOffer(
        { items: cartItems },
        checkoutState.couponMeta,
        shippingType
      );

      checkoutState.currentOffer = offer;
      debugLog("updateOffer success", offer);
      try {
        localStorage.setItem("checkout:offer", JSON.stringify(offer));
      } catch {}
      renderSummary();
    } catch (err) {
      console.error("Failed to update offer:", err);
      debugLog("updateOffer fallback", {
        error: err?.message,
        couponMeta: checkoutState.couponMeta,
      });
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
    cartState.items.reduce(
      (total, item) =>
        total + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );

  const getCartItemTax = (cartState = Cart.getState()) =>
    cartState.items.reduce((total, item) => {
      const unitTax = Number(item.retailGst);
      const qty = Number(item.qty) || 0;
      if (!Number.isFinite(unitTax) || unitTax <= 0 || qty <= 0) return total;
      return total + unitTax * qty;
    }, 0);

  const normaliseCouponType = (input) => {
    const raw = String(input || "").toLowerCase();
    if (raw === "shipping" || raw === "free_shipping") return "shipping";
    if (["percent", "percentage", "percent_off"].includes(raw)) return "percent";
    if (
      [
        "fixed",
        "fixed_amount",
        "amount",
        "price",
        "dollar",
        "value",
      ].includes(raw)
    )
      return "fixed";
    return raw;
  };

  const normaliseMoneyValue = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const cleaned = value
        .replace(/[^0-9.,-]/g, "")
        .replace(/,/g, ".");
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normaliseCouponValue = normaliseMoneyValue;

  const interpretCouponMeta = (meta) => {
    if (!meta) return null;
    const type = normaliseCouponType(
      meta.normalizedType || meta.type || meta.discount_type
    );
    let rawValue = normaliseCouponValue(
      meta.normalizedValue !== undefined && meta.normalizedValue !== null
        ? meta.normalizedValue
        : meta.value !== undefined && meta.value !== null
        ? meta.value
        : meta.discount_value
    );
    const percentValue =
      type === "percent"
        ? rawValue > 1
          ? rawValue / 100
          : rawValue
        : 0;
    const percent = type === "percent" ? (rawValue > 1 ? rawValue / 100 : rawValue) : 0;
    return { type, rawValue, percent };
  };

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

  const roundCurrency = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

  const calcTotals = (cartState = Cart.getState()) => {
    let subtotal = roundCurrency(getCartSubtotal(cartState));
    const itemTax = roundCurrency(getCartItemTax(cartState));
    let baseShipping = 0;
    const selected = getSelectedShippingType();
    if (selected && String(selected.id) !== NONE_SHIPPING_ID) {
      baseShipping = Number(selected.price) || 0;
    } else if (!selected && checkoutState.shippingMethod) {
      baseShipping = shippingRates[checkoutState.shippingMethod] || 0;
    }

    let rawShipping = roundCurrency(
      checkoutState.freeShipping ? 0 : baseShipping
    );
    const hasSingleOption =
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.filter(Boolean).length <= 1;
    let shippingConfirmed =
      checkoutState.shippingSelectionConfirmed ||
      checkoutState.shippingMethod === NONE_SHIPPING_ID ||
      (checkoutState.shippingMethod && hasSingleOption);
    let shipping = shippingConfirmed ? rawShipping : 0;
    let discount = 0;
    let usedOffer = false;
    const meta = interpretCouponMeta(checkoutState.couponMeta);
    if (meta) {
      debugLog("calcTotals: applying coupon meta", {
        meta,
        subtotal,
        rawShipping,
        shippingConfirmed,
      });
      if (meta.type === "percent") {
        discount = subtotal * meta.percent;
      } else if (meta.type === "fixed") {
        discount = meta.rawValue;
      }
    }

    let offerSubTotal = null;
    let offerGrandTotal = null;
    const offer = checkoutState.currentOffer;
    if (offer) {
      offerSubTotal = normaliseMoneyValue(offer.subTotal);
      offerGrandTotal = normaliseMoneyValue(offer.grandTotal);
      const offerShippingTotal = Array.isArray(offer.shipping)
        ? offer.shipping.reduce(
            (sum, entry) => sum + normaliseMoneyValue(entry?.price),
            0
          )
        : 0;
      if (
        Number.isFinite(offerSubTotal) &&
        Number.isFinite(offerGrandTotal)
      ) {
        const offerDiscount = roundCurrency(
          Math.max(0, offerSubTotal + offerShippingTotal - offerGrandTotal)
        );
        subtotal = roundCurrency(offerSubTotal);
        rawShipping = roundCurrency(offerShippingTotal);
        shippingConfirmed = true;
        shipping = rawShipping;
        discount = roundCurrency(Math.max(offerDiscount, discount));
        usedOffer = true;
        debugLog("calcTotals: using offer overrides", {
          offerSubTotal: subtotal,
          offerGrandTotal,
          offerShippingTotal: rawShipping,
          offerDiscount: discount,
        });
      }
    }

    discount = roundCurrency(Math.min(Math.max(discount, 0), subtotal));

    const shippingTax =
      shippingConfirmed && shipping > 0
        ? roundCurrency(shipping * SHIPPING_GST_RATE)
        : 0;
    const shippingWithGst = roundCurrency(shipping + shippingTax);

    const totalBeforeFees = roundCurrency(
      subtotal + shipping + shippingTax - discount + itemTax
    );
    const cardFeeBase = Math.max(0, totalBeforeFees);
    const cardFeeExGst =
      cardFeeBase > 0
        ? roundCurrency(cardFeeBase * CARD_FEE_RATE + CARD_FEE_FIXED)
        : 0;
    const cardFeeGst =
      cardFeeExGst > 0 ? roundCurrency(cardFeeExGst * CARD_FEE_GST_RATE) : 0;
    const cardFeeTotal = roundCurrency(cardFeeExGst + cardFeeGst);
    const taxTotal = roundCurrency(itemTax + shippingTax + cardFeeGst);
    const total = roundCurrency(
      subtotal + shipping - discount + taxTotal + cardFeeExGst
    );

    debugLog("calcTotals result", {
      subtotal,
      shipping,
      rawShipping,
      shippingConfirmed,
      shippingTax,
      shippingWithGst,
      discount,
      itemTax,
      cardFeeExGst,
      cardFeeGst,
      cardFeeTotal,
      taxTotal,
      total,
      offerSubTotal,
      offerGrandTotal,
      usedOffer,
    });

    return {
      subtotal,
      shipping,
      rawShipping,
      shippingConfirmed,
      shippingTax,
      shippingWithGst,
      discount,
      itemTax,
      taxTotal,
      cardFeeBase,
      cardFeeExGst,
      cardFeeGst,
      cardFeeTotal,
      totalBeforeFees,
      total,
      usedOffer,
      offerSubTotal: offerSubTotal !== null ? roundCurrency(offerSubTotal) : null,
      offerGrandTotal: offerGrandTotal !== null ? roundCurrency(offerGrandTotal) : null,
    };
  };

  const renderSummary = () => {
    if (!summaryEls.list || typeof Cart === "undefined") return;
    const cartState = Cart.getState();
    const currentStep = checkoutState.steps[checkoutState.stepIndex] || "";
    const readOnly = currentStep === "review";
    summaryEls.list.innerHTML = "";

    if (!cartState.items.length) {
      summaryEls.list.innerHTML =
        '<div class="p-4 text-sm text-gray-500">Your cart is empty.</div>';
    } else {
      cartState.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "py-4 flex gap-3 items-start";
        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.price) || 0;
        const lineTotal = unitPrice * qty;
        const brandLine = item.brand
          ? `<div class="text-xs text-gray-500">${item.brand}</div>`
          : "";
        const qtyControls = readOnly
          ? `<div class="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Qty ${qty}</span>
              <span class="text-sm font-semibold text-gray-900">${money(lineTotal)}</span>
            </div>`
          : `<div class="mt-2 flex items-center gap-2">
              <button class="qty-decr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${item.id}" aria-label="Decrease quantity">−</button>
              <input class="qty-input w-12 text-center rounded-lg border px-2 py-1" value="${qty}" data-id="${item.id}" inputmode="numeric" aria-label="Quantity"/>
              <button class="qty-incr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${item.id}" aria-label="Increase quantity">+</button>
            </div>
            <div class="mt-2 text-sm font-semibold text-gray-900">${money(lineTotal)}</div>`;
        const removeButton = readOnly
          ? ""
          : `<button class="remove-item w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center mt-1" data-id="${item.id}" aria-label="Remove item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </button>`;
        row.innerHTML = `
          <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0"/>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm sm:text-base truncate">${item.name}</div>
            ${brandLine}
            <div class="text-xs text-gray-500">Unit price ${money(unitPrice)}</div>
            ${qtyControls}
          </div>
          ${removeButton}
        `;
        summaryEls.list.appendChild(row);
      });
    }

    const totals = calcTotals(cartState);
    checkoutState.financials = totals;

    if (summaryEls.subtotal)
      summaryEls.subtotal.textContent = money(totals.subtotal);

    let shippingLabel = "Select shipping";
    const shippingHasCharge =
      totals.shippingConfirmed && totals.shipping > 0;
    if (checkoutState.shippingMethod === NONE_SHIPPING_ID) {
      shippingLabel = "No shipping";
    } else if (checkoutState.freeShipping) {
      shippingLabel = "Free";
    } else if (shippingHasCharge) {
      const shippingAmount = Number.isFinite(totals.shippingWithGst)
        ? totals.shippingWithGst
        : totals.shipping;
      shippingLabel = `Shipping (GST incl) ${money(shippingAmount)}`;
    } else if (totals.shippingConfirmed) {
      shippingLabel = "Free";
    }
    if (summaryEls.shipping) summaryEls.shipping.textContent = shippingLabel;

    if (summaryEls.processing)
      summaryEls.processing.textContent = totals.cardFeeTotal
        ? money(totals.cardFeeTotal)
        : money(0);

    if (summaryEls.gst) summaryEls.gst.textContent = money(totals.taxTotal);

    const processingNote = totals.cardFeeTotal > 0
      ? `This transaction includes a credit card processing fee of 1.8% + A$0.30 per transaction. Credit card fee = ${money(totals.cardFeeExGst)} + 10% GST ${money(totals.cardFeeGst)} = ${money(totals.cardFeeTotal)}.`
      : "";

    if (summaryEls.processingNote) {
      if (processingNote) {
        summaryEls.processingNote.textContent = processingNote;
        summaryEls.processingNote.classList.remove("hidden");
      } else {
        summaryEls.processingNote.textContent = "";
        summaryEls.processingNote.classList.add("hidden");
      }
    }

    const discountDisplay =
      totals.discount > 0
        ? `-${money(totals.discount).replace(/^-/, "")}`
        : "-$0.00";

    if (summaryEls.discount) {
      summaryEls.discount.textContent = discountDisplay;
    }

    if (summaryEls.total) summaryEls.total.textContent = money(totals.total);

    window.__checkoutSummary = {
      totals,
      shippingLabel,
      discountDisplay,
      processingNote,
    };
    window.__checkoutTotals = totals;
    debugLog("renderSummary totals", {
      totals,
      shippingLabel,
      discountDisplay,
    });

    if (
      typeof window !== "undefined" &&
      window.StorefrontCartUI &&
      typeof window.StorefrontCartUI.renderCart === "function" &&
      typeof Cart !== "undefined"
    ) {
      try {
        window.StorefrontCartUI.renderCart(Cart.getState());
      } catch (err) {
        debugLog("renderSummary: renderCart refresh failed", err);
      }
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
        (card) => normalizeSavedCardId(card) === String(cardId)
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

    debugLog("Rendering saved cards", {
      count: cards.length,
      selected: checkoutState.selectedPaymentSource,
      cards: cards.map((card) => summariseSavedCardForDebug(card)),
    });

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
      const resolvedId = normalizeSavedCardId(card);
      if (!resolvedId) return;
      const value = `saved:${resolvedId}`;
      validValues.push(value);
      const label = document.createElement("label");
      label.className =
        "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-500";
      const last4 =
        card.last4 || card.card_last_four || card.card_last4 || "••••";
      const expMonth =
        card.exp_month || card.card_expiration_month || card.expMonth;
      const expYear =
        card.exp_year || card.card_expiration_year || card.expYear;
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
      debugLog("Loaded saved cards", Array.isArray(cards)
        ? cards.map((card) => summariseSavedCardForDebug(card))
        : cards);
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

  const setReviewMode = (on) => {
    const productsSection = document.querySelector("[data-checkout-products]");
    if (productsSection) productsSection.classList.toggle("hidden", on);
    if (checkoutSearchInput) {
      checkoutSearchInput.disabled = on;
      checkoutSearchInput.classList.toggle("opacity-50", on);
    }
    if (checkoutSearchClear) {
      checkoutSearchClear.disabled = on;
      if (on) checkoutSearchClear.classList.add("hidden");
      else if (checkoutSearchInput && checkoutSearchInput.value)
        checkoutSearchClear.classList.remove("hidden");
    }
    if (!on && checkoutProductsGrid) {
      filterCheckoutProducts(checkoutSearchInput?.value || "");
    }
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
    setReviewMode(current === "review");
    renderSummary();
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
    const financials = checkoutState.financials || calcTotals();
    if (financials.cardFeeTotal > 0) {
      paymentLines.push(
        `Card fee: ${money(financials.cardFeeTotal)} (incl GST ${money(financials.cardFeeGst)})`
      );
      paymentLines.push(
        `<span class="text-xs text-gray-500">This transaction includes a credit card processing fee of 1.8% + A$0.30 per transaction.</span>`
      );
      paymentLines.push(
        `<span class="text-xs text-gray-500">Credit card fee = ${money(financials.cardFeeExGst)} + 10% GST ${money(financials.cardFeeGst)} = ${money(financials.cardFeeTotal)}</span>`
      );
    }
    if (financials.taxTotal > 0) {
      paymentLines.push(`GST total: ${money(financials.taxTotal)}`);
    }
    $("#review_payment").innerHTML = paymentLines
      .filter(Boolean)
      .map((line) => `<div>${line}</div>`)
      .join("");
  };

  /* ========= coupon handling ========= */
  const couponInput = byId("coupon_code");
  const couponFeedback = byId("coupon_feedback");
  const couponInputWrapper = couponInput?.closest(".input-wrapper");

  const hydrateCouponUI = () => {
    if (!couponInput) return;
    const meta = checkoutState.couponMeta;
    if (meta) {
      couponInput.value = meta.code || "";
      setCouponButtonState({ applied: true });
    } else {
      if (!couponInput.value) couponInput.value = "";
      setCouponButtonState({ applied: false });
    }
  };

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
    saveCheckoutState();
    hydrateCouponUI();
  };

  const removeCoupon = async ({ message = "Coupon removed." } = {}) => {
    checkoutState.couponMeta = null;
    checkoutState.freeShipping = false;
    if (couponInput) couponInput.value = "";
    setCouponButtonState({ applied: false });
    setCouponVisualState("neutral", message);
    saveCheckoutState();
    hydrateCouponUI();
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

      debugLog("applyCoupon response", result);

      if (result.applied) {
        const normalizedType = normaliseCouponType(
          result.applied.discount_type
        );
        const rawValue = normaliseCouponValue(
          result.applied.discount_value
        );
        checkoutState.couponMeta = {
          code: result.applied.coupon_code,
          type: result.applied.discount_type,
          value: result.applied.discount_value,
          normalizedType,
          normalizedValue: rawValue,
          product_selection: result.applied.product_selection,
          applicable_products: Array.isArray(result.applied.applicable_products)
            ? result.applied.applicable_products.map(String)
            : undefined,
          recurring: result.applied.recurring,
        };
        checkoutState.freeShipping = normalizedType === "shipping";
        debugLog("applyCoupon normalized meta", checkoutState.couponMeta);
        setCouponVisualState(
          "success",
          result.applied.message || "Coupon applied successfully!"
        );
        setCouponButtonState({ applied: true });
        saveCheckoutState();
        hydrateCouponUI();
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
        saveCheckoutState();
        hydrateCouponUI();
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
      saveCheckoutState();
      hydrateCouponUI();
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

    const usingSavedCard = isUsingSavedCard();
    const manualBillingAddress = getAddressFromForm("bill");
    const shippingAddress = getAddressFromForm("ship");
    let resolvedBillingAddress = { ...manualBillingAddress };
    let billingAddressSource = addressHasRequiredFields(manualBillingAddress)
      ? "billing_form"
      : "unknown";

    let selectedSavedCardId = null;
    let payer = null;
    let selectedCard = null;
    const contactId = getContactId() || checkoutState.contactId;
    if (usingSavedCard) {
      selectedCard = getSelectedSavedCard();
      if (!selectedCard) {
        throw new Error(
          "Saved card could not be found. Please choose another payment method."
        );
      }
      const cardId = normalizeSavedCardId(selectedCard);
      if (!cardId) {
        throw new Error(
          "Saved card is missing an identifier. Please choose another payment method."
        );
      }
      selectedSavedCardId = Number(cardId) || cardId;
      payer = {
        cc_id: selectedSavedCardId,
        payment_method: "saved_card",
        use_saved_card: true,
        use_existing: true,
      };
      resolvedBillingAddress = fillAddressWithFallback(
        resolvedBillingAddress,
        shippingAddress
      );
      if (
        !addressHasRequiredFields(manualBillingAddress) &&
        addressHasRequiredFields(resolvedBillingAddress)
      ) {
        billingAddressSource = addressHasRequiredFields(shippingAddress)
          ? "shipping_fallback"
          : "unknown";
      }
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
      billingAddressSource = "billing_form";
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
      price: item.price,
      taxable: true,
      requiresShipping: true,
    }));

    const finalOffer = await buildOffer(
      { items: cartItems },
      checkoutState.couponMeta,
      shippingType
    );
    const appliedCouponCode =
      checkoutState.couponMeta?.code ||
      checkoutState.couponMeta?.coupon_code ||
      null;
    if (appliedCouponCode) {
      finalOffer.coupon = { code: String(appliedCouponCode).trim() };
    }

    const transactionContactId = contactId || checkoutState.contactId;
    if (transactionContactId && payer) {
      payer.contact_id = Number(transactionContactId) || transactionContactId;
    }

    if (!payer) {
      throw new Error(
        usingSavedCard
          ? "Saved payment method could not be resolved. Please choose another payment method."
          : "Payment details are required."
      );
    }

    if (!addressHasRequiredFields(resolvedBillingAddress)) {
      if (
        usingSavedCard &&
        addressHasRequiredFields(shippingAddress)
      ) {
        resolvedBillingAddress = fillAddressWithFallback(
          resolvedBillingAddress,
          shippingAddress
        );
        if (!billingAddressSource || billingAddressSource === "unknown") {
          billingAddressSource = "shipping_fallback";
        }
      }
    }

    const billing_address =
      normaliseAddressForPayload(resolvedBillingAddress) || {};

    const transactionData = {
      contactId: checkoutState.contactId,
      chargeNow: "chargeNow",
      offer: finalOffer,
      external_order_id: `WEB-${Date.now()}`,
      invoice_template: invoiceTemplateId,
      gateway_id: paymentGatewayId,
    };
    transactionData.billing_address = billing_address;
    transactionData.payer = payer;
    if (selectedSavedCardId) {
      transactionData.cc_id = selectedSavedCardId;
    }
    if (transactionContactId) {
      transactionData.contact_id =
        Number(transactionContactId) || transactionContactId;
    }

    debugLog("Prepared transaction payload", {
      contactId: transactionContactId,
      usingSavedCard,
      selectedSavedCardId,
      savedCard: summariseSavedCardForDebug(selectedCard),
      billingAddressSource,
      billingAddress: billing_address,
      shippingType: shippingType
        ? { id: shippingType.id, name: shippingType.name }
        : null,
      transactionSummary: summariseTransactionForDebug(transactionData),
    });

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

        const previousMethod = checkoutState.shippingMethod
          ? String(checkoutState.shippingMethod)
          : "";
        const nextMethod =
          preferred || (resolvedTypes[0] ? String(resolvedTypes[0].id) : "");
        checkoutState.shippingMethod = nextMethod;
        if (previousMethod && previousMethod !== nextMethod) {
          checkoutState.shippingSelectionConfirmed = false;
        }
        if (nextMethod === NONE_SHIPPING_ID) {
          checkoutState.shippingSelectionConfirmed = true;
        }
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
        .then(async (result) => {
          // Clear cart and state
          if (shouldUpdateDispenses()) {
            try {
              await updateCartDispenses("PAID");
            } catch (err) {
              console.error("Failed to mark dispenses as paid", err);
            }
          } else {
            try {
              await syncGuestItemDispenses("PAID");
            } catch (err) {
              console.error("Failed to create guest dispenses", err);
            }
          }
          await Cart.clear();
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(`${STORAGE_KEY}:form`);
          showToast("Payment successful! Redirecting…", {
            type: "success",
            duration: 2600,
          });
          const orderRef = result.order_id || result.transaction_id || "success";
          setTimeout(() => {
            const thankYouUrl = withOrderRef(getThankYouUrl(), orderRef);
            window.location.href = thankYouUrl;
          }, 1400);
        })
        .catch(async (err) => {
          if (shouldUpdateDispenses()) {
            try {
              await updateCartDispenses("PAYMENT_ISSUE");
            } catch (updateErr) {
              console.error("Failed to mark dispenses as payment issue", updateErr);
            }
          }
          logCheckoutError("Order processing failed", err, {
            usingSavedCard: isUsingSavedCard(),
            selectedPaymentSource: checkoutState.selectedPaymentSource,
          });
          const friendlyMessage = getFriendlyCheckoutErrorMessage(err);
          const message =
            friendlyMessage ||
            err?.message ||
            "Order processing failed. Please try again.";
          showToast(message, {
            type: "error",
            duration: friendlyMessage ? 8000 : 5000,
          });
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
      window.location.href = getShopUrl();
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
      checkoutState.shippingSelectionConfirmed = true;
      const couponType = checkoutState.couponMeta
        ? normaliseCouponType(
            checkoutState.couponMeta.normalizedType ||
              checkoutState.couponMeta.type ||
              checkoutState.couponMeta.discount_type
          )
        : "";
      if (
        checkoutState.shippingMethod !== NONE_SHIPPING_ID &&
        couponType !== "shipping"
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
      const selectedCard = isUsingSavedCard() ? getSelectedSavedCard() : null;
      debugLog("Payment source change", {
        selected: checkoutState.selectedPaymentSource,
        usingSavedCard: isUsingSavedCard(),
        savedCard: summariseSavedCardForDebug(selectedCard),
      });
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
        window.location.href = getShopUrl();
        return;
      }

      // Load saved state and form data
      loadCheckoutState();
      hydrateCouponUI();
      if (checkoutState.couponMeta) {
        setCouponVisualState("success", "Coupon applied.");
      } else {
        setCouponVisualState("neutral", "");
      }
      if (loggedInContactId) {
        checkoutState.contactId = loggedInContactId;
        saveCheckoutState();
      }
      applyPaymentSourceSelection({ save: false });
      loadFormData();
      debugLog("Init after form load", {
        couponMeta: checkoutState.couponMeta,
        shippingMethod: checkoutState.shippingMethod,
      });

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

      initCheckoutSearch();

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
