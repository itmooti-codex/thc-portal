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

  const parseBooleanish = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return undefined;
      if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
    }
    return undefined;
  };

  const sumRetailGstForItems = (items = []) =>
    items.reduce((total, item) => {
      if (!item) return total;
      const taxable = parseBooleanish(item.taxable);
      if (taxable === false) return total;
      const unitTax = Number(item.retailGst);
      const qty = Number(item.qty) || 0;
      if (!Number.isFinite(unitTax) || unitTax <= 0 || qty <= 0) return total;
      return total + unitTax * qty;
    }, 0);

  const roundCurrency = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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

  const resolveOfferMoney = (offer, ...keys) => {
    if (!offer) return null;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(offer, key)) continue;
      const raw = offer[key];
      if (raw === null || raw === undefined || raw === "") continue;
      const value = normaliseMoneyValue(raw);
      if (Number.isFinite(value)) return value;
    }
    return null;
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

  const placeholderTokenRegex = /^\s*\[[^\]]*\]\s*$/;

  const isMeaningfulImage = (value) => {
    if (value === null || value === undefined) return false;
    const str = String(value).trim();
    if (!str) return false;
    if (placeholderTokenRegex.test(str)) return false;
    const lower = str.toLowerCase();
    if (lower === "null" || lower === "undefined") return false;
    return true;
  };

  const escapeHtml = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const getAvatarInitial = (name) => {
    if (name === null || name === undefined) return "•";
    const str = String(name).trim();
    return str ? str.charAt(0).toUpperCase() : "•";
  };

  const fallbackRenderAvatar = (
    image,
    name,
    {
      sizeClasses = "h-14 w-14 sm:h-16 sm:w-16",
      shapeClasses = "rounded-xl",
      imageClasses = "",
      fallbackClasses = "",
      fallbackTextClass = "text-base sm:text-lg",
    } = {}
  ) => {
    const baseClasses = [sizeClasses, shapeClasses].filter(Boolean).join(" ").trim();
    if (isMeaningfulImage(image)) {
      const src = escapeHtml(String(image).trim());
      const alt = escapeHtml(name || "Product");
      const classes = [
        baseClasses,
        "object-cover bg-gray-100",
        imageClasses,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      return `<img src="${src}" alt="${alt}" class="${classes}" />`;
    }
    const fallbackClass = [
      baseClasses,
      "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center font-semibold uppercase",
      fallbackTextClass,
      fallbackClasses,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const initial = escapeHtml(getAvatarInitial(name));
    return `<div class="${fallbackClass}" aria-hidden="true">${initial}</div>`;
  };

  const renderAvatarHtml = (image, name, options) => {
    const external = window.StorefrontCartUI?.renderAvatarHtml;
    if (typeof external === "function") {
      return external(image, name, options);
    }
    return fallbackRenderAvatar(image, name, options);
  };

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
  const shippingTaxId = (() => {
    const raw = config.shippingTaxId;
    if (raw === null || raw === undefined) return "";
    const str = String(raw).trim();
    return str;
  })();

  const shippingTaxDetailsState = { promise: null, data: undefined };
  let getShippingTaxDetails = async () => null;

  const getEffectiveTaxRate = () => {
    const configRate = normaliseTaxRate(
      window.StorefrontConfig?.shippingTaxRate ??
        window.StorefrontConfig?.shippingTaxPercentage
    );
    const detailRate = normaliseTaxRate(shippingTaxDetailsState.data?.rate);
    if (detailRate !== undefined) return detailRate;
    if (configRate !== undefined) return configRate;
    return DEFAULT_TAX_RATE;
  };

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

  const ensureOfferTaxEntry = async (offer) => {
    if (!offer || !shippingTaxId) return offer;

    const products = Array.isArray(offer.products) ? offer.products : [];
    const hasTaxableProducts = products.some((product) => {
      if (!product || typeof product !== "object") return false;
      const candidates = [
        product.taxable,
        product.tax,
        product.isTaxable,
        product.requiresTax,
      ];
      return candidates.some((value) => parseBooleanish(value) === true);
    });

    const shippingLines = Array.isArray(offer.shipping) ? offer.shipping : [];
    const hasShipping = shippingLines.length > 0;

    const cartState =
      typeof Cart !== "undefined" &&
      Cart &&
      typeof Cart.getState === "function"
        ? Cart.getState()
        : null;
    const itemGstTotal = cartState
      ? sumRetailGstForItems(cartState.items || [])
      : 0;
    const hasItemGst = Number.isFinite(itemGstTotal) && itemGstTotal > 0;

    if (!hasTaxableProducts && !hasShipping && !hasItemGst) {
      return offer;
    }

    const idStr = String(shippingTaxId).trim();
    if (!idStr) return offer;

    const taxDetails = await getShippingTaxDetails().catch((err) => {
      console.warn("Failed to resolve shipping tax details", err);
      return null;
    });

    const taxesSource = Array.isArray(offer.taxes) ? offer.taxes : [];
    const taxes = taxesSource
      .map((entry) =>
        entry && typeof entry === "object" ? { ...entry } : null
      )
      .filter(Boolean);

    const matchesId = (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() === idStr;

    const existingIndex = taxes.findIndex((tax) => {
      if (!tax) return false;
      const candidates = [tax.id, tax.form_id, tax.formId, tax.tax_id, tax.taxId];
      return candidates.some(matchesId);
    });

    const existing = existingIndex >= 0 ? taxes[existingIndex] : {};
    const resolveNumber = (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    };

    const resolvedRate =
      resolveNumber(existing.rate) ??
      resolveNumber(existing.tax_rate) ??
      resolveNumber(existing.percentage);

    const resolvedTotal =
      resolveNumber(existing.taxTotal) ??
      resolveNumber(existing.tax_total) ??
      resolveNumber(existing.total) ??
      resolveNumber(existing.amount);

    const taxEntry = {
      ...existing,
      id: idStr,
      form_id:
        existing.form_id ??
        existing.formId ??
        existing.tax_id ??
        existing.taxId ??
        idStr,
      taxShipping: hasShipping,
    };

    if (taxDetails?.name) {
      const ensureName = (key) => {
        const current = taxEntry[key];
        if (
          current === undefined ||
          current === null ||
          (typeof current === "string" && !current.trim())
        ) {
          taxEntry[key] = taxDetails.name;
        }
      };
      ensureName("name");
      ensureName("tax_name");
      ensureName("label");
      ensureName("taxLabel");
      ensureName("description");
    }

    if (resolvedRate !== undefined) {
      taxEntry.rate = resolvedRate;
    } else if (taxDetails?.rate !== undefined) {
      taxEntry.rate = taxDetails.rate;
    } else if (taxEntry.rate === undefined) {
      taxEntry.rate = 0;
    }

    if (resolvedTotal !== undefined) {
      taxEntry.taxTotal = resolvedTotal;
    } else {
      // Derive tax total from current cart totals to ensure GST is represented
      const currentTotals = calcTotals(Cart.getState());
      if (Number.isFinite(currentTotals?.taxTotal) && currentTotals.taxTotal > 0) {
        taxEntry.taxTotal = currentTotals.taxTotal;
      } else {
        // No tax to report; do not add an empty GST row
        return offer;
      }
    }

    taxes[existingIndex >= 0 ? existingIndex : taxes.length] = taxEntry;
    offer.taxes = taxes;
    offer.hasTaxes = true;
    return offer;
  };

  const applyRetailGstToOffer = (offer, cartState = Cart.getState()) => {
    if (!offer || typeof offer !== "object") return offer;
    if (offer.retailGstIncluded) return offer;
    const items =
      cartState && Array.isArray(cartState.items) ? cartState.items : [];
    const gstTotalRaw = sumRetailGstForItems(items);
    const gstTotal = roundCurrency(gstTotalRaw);
    if (!Number.isFinite(gstTotal) || gstTotal <= 0) return offer;

    const subTotalBase = normaliseMoneyValue(offer.subTotal);
    if (Number.isFinite(subTotalBase)) {
      offer.subTotal = roundCurrency(subTotalBase + gstTotal);
    }

    const grandTotalBase = normaliseMoneyValue(offer.grandTotal);
    if (Number.isFinite(grandTotalBase)) {
      offer.grandTotal = roundCurrency(grandTotalBase + gstTotal);
    }

    const taxesSource = Array.isArray(offer.taxes) ? offer.taxes : [];
    const taxes = taxesSource
      .map((entry) =>
        entry && typeof entry === "object" ? { ...entry } : null
      )
      .filter(Boolean);
    const idStr = String(shippingTaxId || "").trim();
    if (idStr) {
      const matchesId = (value) =>
        value !== undefined && value !== null && String(value).trim() === idStr;
      let index = taxes.findIndex((tax) => {
        if (!tax) return false;
        const candidates = [tax.id, tax.tax_id, tax.taxId, tax.form_id, tax.formId];
        return candidates.some(matchesId);
      });
      if (index < 0) {
        taxes.push({
          id: idStr,
          form_id: idStr,
          taxTotal: 0,
        });
        index = taxes.length - 1;
      }
      const entry = { ...taxes[index] };
      const currentTotal = normaliseMoneyValue(entry.taxTotal);
      entry.taxTotal = roundCurrency(currentTotal + gstTotal);
      entry.form_id =
        entry.form_id ?? entry.formId ?? entry.tax_id ?? entry.taxId ?? idStr;
      entry.id = entry.id ?? idStr;
      taxes[index] = entry;
      offer.taxes = taxes;
      offer.hasTaxes = true;
    } else if (taxes.length) {
      offer.taxes = taxes;
      offer.hasTaxes = true;
    }

    return offer;
  };

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

  const formatMoney = (value) =>
    typeof money === "function"
      ? money(value)
      : `$${(Number(value) || 0).toFixed(2)}`;

  const formatCardFeeNote = (exGst, gst, rate) => {
    if (!Number.isFinite(exGst) || exGst <= 0) return "";
    const gstAmount = Number.isFinite(gst) ? gst : 0;
    const effectiveRate = Number.isFinite(rate) ? rate : getEffectiveTaxRate();
    const percentLabel = formatTaxPercent(effectiveRate);
    const gstLabel = percentLabel ? `${percentLabel}% GST` : "GST";
    const total = roundCurrency(exGst + gstAmount);
    return `This transaction includes a credit card processing fee of 1.8% of the order amount (products and shipping). Credit card fee = ${formatMoney(exGst)} + ${gstLabel} ${formatMoney(gstAmount)} = ${formatMoney(total)}.`;
  };

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
  getShippingTaxDetails().catch(() => {});

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

  const coerceSavedCardIdForPayload = (cardId) => {
    if (cardId === null || cardId === undefined) return "";
    const trimmed = String(cardId).trim();
    if (!trimmed) return "";
    if (/^\d+$/.test(trimmed) && !/^0\d+/.test(trimmed)) {
      const asNumber = Number(trimmed);
      if (Number.isSafeInteger(asNumber)) {
        return asNumber;
      }
    }
    return trimmed;
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

  const GATEWAY_RESULT_CODE_MESSAGES = {
    2: "We couldn't process this card with our payment terminal. Please try a different card or contact support.",
    3: "Card declined. Please check the details or use another card.",
    4: "The card was declined by the issuer. Please try a different payment method.",
  };

  const GATEWAY_FRIENDLY_KEYWORDS = [
    /insufficient/i,
    /do not honor/i,
    /do not honour/i,
    /declined/i,
    /denied/i,
    /invalid/i,
    /incorrect/i,
    /expired/i,
    /security code/i,
    /cvv/i,
    /cvc/i,
    /zip/i,
    /postal/i,
    /balance/i,
    /limit/i,
  ];

  const GATEWAY_TECHNICAL_PATTERNS = [
    /terminal/i,
    /processor/i,
    /gateway/i,
    /merchant/i,
    /function/i,
    /integration/i,
    /configuration/i,
    /syntax/i,
    /ontraport/i,
    /json/i,
    /{.*}/,
    /https?:\/\//i,
  ];

  const parseJsonSafe = (value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const normaliseMessage = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value && typeof value.message === "string") {
      return value.message.trim();
    }
    return "";
  };

  const isLikelyFriendlyGatewayMessage = (message) => {
    if (!message || typeof message !== "string") return false;
    const trimmed = message.trim();
    if (!trimmed) return false;
    if (trimmed.length < 4) return false;
    if (trimmed.startsWith("{") || trimmed.endsWith("}")) return false;
    if (/^[A-Z0-9\s]+$/.test(trimmed) && trimmed.length > 24) return false;
    if (/^\d+$/.test(trimmed)) return false;
    if (GATEWAY_TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      return false;
    }
    return true;
  };

  const mapGatewayResultCode = (resultCode) => {
    if (resultCode === null || resultCode === undefined) return "";
    const key = Number(resultCode);
    if (!Number.isFinite(key)) return "";
    return GATEWAY_RESULT_CODE_MESSAGES[key] || "";
  };

  const extractChargeResultCandidates = (err) => {
    const candidates = [];
    const pushCandidate = (candidate) => {
      if (!candidate) return;
      if (typeof candidate === "string") {
        const parsed = parseJsonSafe(candidate);
        if (parsed && typeof parsed === "object") {
          pushCandidate(parsed);
        } else if (candidate.trim()) {
          candidates.push({ message: candidate.trim() });
        }
        return;
      }
      if (candidate.chargeResult && typeof candidate.chargeResult === "object") {
        const cr = candidate.chargeResult;
        candidates.push({
          message:
            normaliseMessage(cr) ||
            normaliseMessage(cr.details) ||
            normaliseMessage(cr.reason) ||
            "",
          resultCode:
            cr.result_code ??
            cr.resultCode ??
            cr.code ??
            cr.status ??
            null,
        });
      }
      const messageCandidate =
        candidate.message ||
        candidate.error ||
        candidate.details ||
        candidate.reason;
      if (messageCandidate) {
        candidates.push({
          message: normaliseMessage(messageCandidate),
          resultCode:
            candidate.result_code ??
            candidate.resultCode ??
            candidate.code ??
            candidate.status ??
            null,
        });
      }
      if (candidate.details && candidate.details !== candidate) {
        pushCandidate(candidate.details);
      }
      if (candidate.data && candidate.data !== candidate) {
        pushCandidate(candidate.data);
      }
      if (
        typeof candidate.raw === "string" &&
        candidate.raw.trim()
      ) {
        pushCandidate(candidate.raw);
      }
    };
    pushCandidate(err?.details);
    pushCandidate(err?.details?.details);
    pushCandidate(err?.details?.data);
    pushCandidate(err?.message);
    pushCandidate(err);
    return candidates;
  };

  const resolveGatewayFriendlyMessage = (err) => {
    const candidates = extractChargeResultCandidates(err);
    for (const candidate of candidates) {
      if (!candidate || !candidate.message) continue;
      const override = mapGatewayResultCode(candidate.resultCode);
      if (override) return override;
      const direct = candidate.message.trim();
      if (!direct) continue;
      if (
        GATEWAY_FRIENDLY_KEYWORDS.some((pattern) => pattern.test(direct)) &&
        !GATEWAY_TECHNICAL_PATTERNS.some((pattern) => pattern.test(direct))
      ) {
        return direct;
      }
      if (isLikelyFriendlyGatewayMessage(direct)) {
        return direct;
      }
    }
    return "";
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
    const gatewayMessage = resolveGatewayFriendlyMessage(err);
    if (gatewayMessage) {
      return gatewayMessage;
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
    const errorMessage = pickFirstString(err.friendlyMessage);
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

  getShippingTaxDetails = async () => {
    if (!shippingTaxId) return null;

    if (shippingTaxDetailsState.data !== undefined) {
      return shippingTaxDetailsState.data;
    }

    if (!shippingTaxDetailsState.promise) {
      shippingTaxDetailsState.promise = (async () => {
        try {
          const response = await apiCall(
            `/api-thc/taxes/${encodeURIComponent(shippingTaxId)}`
          );
          const tax = response?.tax ?? response;
          if (!tax || typeof tax !== "object") {
            shippingTaxDetailsState.data = null;
            return null;
          }

          const normaliseName = (value) => {
            if (value === null || value === undefined) return undefined;
            const str = String(value).trim();
            return str || undefined;
          };

          const normaliseRate = (value) => {
            if (value === null || value === undefined || value === "") {
              return undefined;
            }
            const num = Number(value);
            return Number.isFinite(num) ? num : undefined;
          };

          const resolvedId = (() => {
            const candidates = [
              tax.id,
              tax.tax_id,
              tax.taxId,
              tax.form_id,
              tax.formId,
            ];
            for (const candidate of candidates) {
              if (candidate === undefined || candidate === null) continue;
              const str = String(candidate).trim();
              if (str) return str;
            }
            return shippingTaxId;
          })();

          shippingTaxDetailsState.data = {
            id: resolvedId,
            name:
              normaliseName(
                tax.name ??
                  tax.tax_name ??
                  tax.label ??
                  tax.description ??
                  tax.taxLabel
              ) || undefined,
            rate: normaliseRate(
              tax.rate ?? tax.tax_rate ?? tax.percentage ?? tax.amount
            ),
          };
          return shippingTaxDetailsState.data;
        } catch (err) {
          console.warn("Failed to fetch shipping tax metadata", err);
          shippingTaxDetailsState.data = null;
          return null;
        }
      })();

      shippingTaxDetailsState.promise.finally(() => {
        shippingTaxDetailsState.promise = null;
      });
    }

    return await shippingTaxDetailsState.promise;
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
  const billingSameWrapper = byId("billing_same_wrapper");
  const billingAddressSection = byId("billing_address_section");
  const billSameCheckbox = byId("bill_same");
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
  const billingRequiredFieldIds = [
    "bill_addr1",
    "bill_city",
    "bill_state",
    "bill_postal",
    "bill_country",
  ];
  const billingRequiredFields = billingRequiredFieldIds
    .map((id) => byId(id))
    .filter((el) => el);
  const billingOptionalFields = ["bill_addr2", "bill_autocomplete"]
    .map((id) => byId(id))
    .filter((el) => el);
  const allBillingFields = [...billingRequiredFields, ...billingOptionalFields];

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
  const CHECKOUT_STORAGE_PATTERNS = [
    /^checkout:/i,
    /^checkout/i,
    /^thc_portal_/i,
  ];

  const shouldClearCheckoutKey = (key) => {
    if (!key) return false;
    if (key === STORAGE_KEY || key === `${STORAGE_KEY}:form`) return true;
    return CHECKOUT_STORAGE_PATTERNS.some((pattern) => pattern.test(key));
  };

  const wipeCheckoutStorageNamespace = (storage) => {
    if (!storage) return;
    const keys = [];
    for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
    keys.forEach((key) => {
      if (!shouldClearCheckoutKey(key)) return;
      try {
        storage.removeItem(key);
      } catch (err) {
        console.warn("Failed to clear checkout storage key", key, err);
      }
    });
  };

  const clearCheckoutArtifacts = async () => {
    try {
      await Cart.clear();
    } catch (err) {
      console.warn("Cart clear failed", err);
    }

    try {
      wipeCheckoutStorageNamespace(window.localStorage);
      wipeCheckoutStorageNamespace(window.sessionStorage);
    } catch (err) {
      console.warn("Checkout storage wipe failed", err);
    }
  };

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
        if (checkoutState.shippingMethod === "none") {
          checkoutState.shippingMethod = "";
          checkoutState.shippingSelectionConfirmed = false;
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
    const paidStatusId = resolveDispenseStatusId("PAID");
    const contactId = getContactId();
    for (const item of cartState.items) {
      if (!item) continue;
      if (isScriptCartItem(item)) {
        const enriched = await ensureScriptDispenseMetadata(item);
        try {
          const scriptId = enriched.scriptId || item.scriptId;
          const shouldMarkScript =
            paidStatusId &&
            statusId === paidStatusId &&
            scriptId &&
            typeof service.markScriptDispensed === "function";
          if (shouldMarkScript) {
            await service.markScriptDispensed(scriptId);
          }
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
          if (el) {
            el.value = value;
            if (isCountrySelect(el)) {
              forceAustraliaSelection(el);
            }
          }
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
  const CARD_FEE_PRODUCT_ID = "31";
  const CARD_FEE_PRODUCT_NAME = "Credit Card Fee";
  const DEFAULT_TAX_RATE = 0.1;

  const normaliseTaxRate = (value) => {
    if (value === null || value === undefined || value === "") return undefined;
    const num = Number(value);
    if (!Number.isFinite(num)) return undefined;
    if (num > 1) return num / 100;
    if (num < 0) return undefined;
    return num;
  };

  const formatTaxPercent = (rate) => {
    if (!Number.isFinite(rate)) return "";
    const percent = rate * 100;
    if (!Number.isFinite(percent)) return "";
    return percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2);
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
    subtotalBreakdown: $use(".summary-subtotal-breakdown"),
    shipping: $use(".summary-shipping"),
    processing: $use(".summary-processing"),
    processingNote: $use(".summary-processing-note"),
    gst: $use(".summary-gst"),
    discount: $use(".summary-discount"),
    total: $use(".summary-total"),
  };

  const renderSubtotalBreakdown = (container, breakdown) => {
    if (!container) return;
    container.innerHTML = "";
    const items = Array.isArray(breakdown)
      ? breakdown.filter((item) => item && Number.isFinite(item.lineTotal))
      : [];
    if (!items.length) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "flex items-start justify-between gap-2";
      const label = document.createElement("span");
      label.className = "truncate";
      const quantity = Number(item.quantity) || 0;
      const qtyLabel = quantity > 1 ? ` ×${quantity}` : "";
      const taxAmount = Number.isFinite(item.taxAmount)
        ? item.taxAmount
        : Number.isFinite(item.lineTax)
        ? item.lineTax
        : 0;
      const name = item.name ? String(item.name).trim() : "Item";
      label.textContent = `${name}${qtyLabel} (Incl ${formatMoney(
        taxAmount
      )} GST)`;
      const value = document.createElement("span");
      value.className = "font-medium text-gray-900";
      const lineTotal = Number.isFinite(item.lineTotalBeforeDiscount)
        ? item.lineTotalBeforeDiscount
        : Number.isFinite(item.lineTotal)
        ? item.lineTotal
        : Number.isFinite(item.totalIncl)
        ? item.totalIncl
        : Number.isFinite(item.lineTotalIncl)
        ? item.lineTotalIncl
        : 0;
      value.textContent = formatMoney(lineTotal);
      row.appendChild(label);
      row.appendChild(value);
      container.appendChild(row);
    });
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
      const totalsForFee = calcTotals(cartState, { ignoreOffer: true });
      const cartItems = await buildBackendCartItems(cartState, totalsForFee);

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

      await ensureOfferTaxEntry(offer);
      applyRetailGstToOffer(offer, cartState);

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
        subTotal:
          totals.subtotalWithItemTax !== undefined
            ? totals.subtotalWithItemTax
            : totals.subtotal,
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

  const getCartItemTax = (cartState = Cart.getState()) => {
    const items =
      cartState && Array.isArray(cartState.items) ? cartState.items : [];
    return sumRetailGstForItems(items);
  };

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
        "flat",
      ].includes(raw)
    )
      return "fixed";
    return raw;
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
    const basePrice = Number(price) || 0;
    const displayPrice =
      String(id) === "1"
        ? roundCurrency(basePrice * (1 + getEffectiveTaxRate()))
        : basePrice;
    return {
      ...type,
      id: id !== undefined && id !== null ? String(id) : "",
      price: basePrice,
      displayPrice,
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

  const applyShippingRules = (types) => {
    const cartState = Cart.getState();
    const subtotal = getCartSubtotal(cartState);
    const baseList = (Array.isArray(types) ? types : [])
      .map((type) => normaliseShippingType(type))
      .filter((type) => type && type.id);

    if (subtotal > FREE_SHIPPING_THRESHOLD) {
      const existing = baseList.find((type) => type.id === FREE_SHIPPING_ID);
      const freeOption = existing
        ? { ...existing, price: 0, displayPrice: 0 }
        : normaliseShippingType({
            id: FREE_SHIPPING_ID,
            name: "Free shipping",
            description: "Complimentary shipping on orders over $200",
            price: 0,
          });
      return freeOption ? [freeOption] : [];
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
        if (special) return [special];
        const fallback = normaliseShippingType({
          id: "2",
          name: "Special shipping",
          description: "Required for this item",
          price: 0,
        });
        return fallback ? [fallback] : [];
      }
      const standardOnly = baseList.filter((type) => type.id === "1");
      if (standardOnly.length) return standardOnly;
      return baseList.filter((type) => type.id !== "2");
    }

    return baseList;
  };

  const calcTotals = (cartState = Cart.getState(), { ignoreOffer = false, forceShippingType = null } = {}) => {
    const items = Array.isArray(cartState?.items) ? cartState.items : [];
    const taxRate = getEffectiveTaxRate();

    const subtotal = roundCurrency(getCartSubtotal(cartState));

    let baseShipping = 0;
    const selected = forceShippingType || getSelectedShippingType();
    const selectedId = selected ? String(selected.id) : "";
    if (selected && selectedId !== NONE_SHIPPING_ID && selectedId) {
      baseShipping = Number(selected.price) || 0;
    } else if (!selected) {
      const methodId = checkoutState.shippingMethod;
      if (methodId && methodId !== NONE_SHIPPING_ID) {
        baseShipping = shippingRates[methodId] || 0;
      }
    }

    let rawShipping = roundCurrency(
      checkoutState.freeShipping ? 0 : baseShipping
    );
    const hasSingleOption =
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.filter(Boolean).length <= 1;
    const hasSelectedMethod =
      checkoutState.shippingMethod &&
      checkoutState.shippingMethod !== NONE_SHIPPING_ID;
    let shippingConfirmed =
      forceShippingType != null ||
      checkoutState.shippingSelectionConfirmed ||
      (hasSelectedMethod && hasSingleOption);
    let shipping = shippingConfirmed ? rawShipping : 0;

    // Split subtotal into taxable and non-taxable ex-GST
    let taxableSubtotalRaw = 0;
    let nonTaxableSubtotalRaw = 0;
    items.forEach((item) => {
      if (!item) return;
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      if (price <= 0 || qty <= 0) return;
      const lineEx = price * qty;
      if (parseBooleanish(item.taxable) === true) {
        taxableSubtotalRaw += lineEx;
      } else {
        nonTaxableSubtotalRaw += lineEx;
      }
    });

    const taxableSubtotalRounded = roundCurrency(taxableSubtotalRaw);

    // Apply discount PRE-GST against the ex-GST base (items + shipping)
    const baseExBeforeDiscount = roundCurrency(subtotal + (shippingConfirmed ? shipping : 0));

    let discount = 0;
    const meta = interpretCouponMeta(checkoutState.couponMeta);
    if (meta) {
      if (meta.type === "percent") {
        discount = baseExBeforeDiscount * meta.percent;
      } else if (meta.type === "fixed") {
        discount = meta.rawValue;
      }
    }

    const offer = checkoutState.currentOffer;
    if (!meta && offer && !ignoreOffer) {
      const offerDiscount = resolveOfferMoney(
        offer,
        "discountTotal",
        "discount",
        "couponAmount",
        "couponTotal",
        "totalDiscount"
      );
      if (Number.isFinite(offerDiscount)) {
        discount = roundCurrency(Math.max(discount, offerDiscount));
      }
    }

    discount = roundCurrency(Math.max(0, Math.min(discount, baseExBeforeDiscount)));

    // Allocate discount proportionally across taxable, non-taxable, and shipping (all ex-GST)
    const parts = {
      itemsTaxable: taxableSubtotalRounded,
      itemsNonTaxable: roundCurrency(nonTaxableSubtotalRaw),
      shippingEx: shippingConfirmed ? shipping : 0,
    };
    const partsSum = roundCurrency(parts.itemsTaxable + parts.itemsNonTaxable + parts.shippingEx);
    const share = (x) => (partsSum > 0 ? roundCurrency((discount * x) / partsSum) : 0);
    const discountOnTaxableEx = share(parts.itemsTaxable);
    const discountOnNonTaxableEx = share(parts.itemsNonTaxable);
    const discountOnShippingEx = share(parts.shippingEx);

    const taxableExAfterDiscount = roundCurrency(Math.max(parts.itemsTaxable - discountOnTaxableEx, 0));
    const nonTaxableExAfterDiscount = roundCurrency(
      Math.max(parts.itemsNonTaxable - discountOnNonTaxableEx, 0)
    );
    const shippingExAfterDiscount = roundCurrency(Math.max(parts.shippingEx - discountOnShippingEx, 0));

    // Compute GST after discount
    const itemTaxBase = roundCurrency(taxableExAfterDiscount * taxRate);
    const shippingTax =
      shippingConfirmed && shippingExAfterDiscount > 0
        ? roundCurrency(shippingExAfterDiscount * taxRate)
        : 0;
    const allocateDiscountAcrossItems = (entries, totalDiscount) => {
      const allocations = entries.map(() => 0);
      if (!entries.length || !Number.isFinite(totalDiscount) || totalDiscount <= 0)
        return allocations;
      let remainingDiscount = roundCurrency(totalDiscount);
      let remainingBase = roundCurrency(
        entries.reduce((sum, entry) => sum + entry.lineEx, 0)
      );
      entries.forEach((entry, index) => {
        if (remainingDiscount <= 0) return;
        const base = roundCurrency(entry.lineEx);
        if (base <= 0) return;
        const isLast = index === entries.length - 1;
        let shareAmount = 0;
        if (remainingBase > 0) {
          shareAmount = roundCurrency((remainingDiscount * base) / remainingBase);
        }
        shareAmount = Math.min(shareAmount, base, remainingDiscount);
        if (isLast) {
          shareAmount = Math.min(roundCurrency(remainingDiscount), base);
        }
        allocations[index] = shareAmount;
        remainingDiscount = roundCurrency(remainingDiscount - shareAmount);
        remainingBase = roundCurrency(Math.max(remainingBase - base, 0));
      });
      return allocations;
    };

    const adjustGroupExTotals = (entries, targetTotal) => {
      if (!entries.length || !Number.isFinite(targetTotal)) return;
      const target = roundCurrency(targetTotal);
      let computed = roundCurrency(
        entries.reduce((sum, entry) => sum + (entry.lineExAfterDiscount || 0), 0)
      );
      const diff = roundCurrency(target - computed);
      if (diff === 0) return;
      const last = entries[entries.length - 1];
      if (!last) return;
      last.lineExAfterDiscount = roundCurrency(
        Math.max((last.lineExAfterDiscount || 0) + diff, 0)
      );
    };

    const adjustGroupTaxTotals = (entries, targetTax) => {
      if (!entries.length || !Number.isFinite(targetTax)) return;
      const target = roundCurrency(targetTax);
      let computed = roundCurrency(
        entries.reduce((sum, entry) => sum + (entry.lineTax || 0), 0)
      );
      const diff = roundCurrency(target - computed);
      if (diff === 0) return;
      const last = entries[entries.length - 1];
      if (!last) return;
      last.lineTax = roundCurrency(Math.max((last.lineTax || 0) + diff, 0));
    };

    const breakdownSeed = [];
    items.forEach((item, index) => {
      if (!item) return;
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      if (price <= 0 || qty <= 0) return;
      const lineEx = roundCurrency(price * qty);
      if (lineEx <= 0) return;
      const taxable = parseBooleanish(item.taxable) === true;
      breakdownSeed.push({
        id: item.id,
        name: item.name,
        quantity: qty,
        lineEx,
        taxable,
        index,
      });
    });

    const taxableEntries = breakdownSeed.filter((entry) => entry.taxable);
    const nonTaxableEntries = breakdownSeed.filter((entry) => !entry.taxable);

    const taxableAllocations = allocateDiscountAcrossItems(
      taxableEntries,
      discountOnTaxableEx
    );
    taxableEntries.forEach((entry, idx) => {
      const discountShare = Math.min(
        Number(taxableAllocations[idx]) || 0,
        entry.lineEx
      );
      entry.lineDiscount = roundCurrency(discountShare);
      entry.lineExAfterDiscount = roundCurrency(
        Math.max(entry.lineEx - entry.lineDiscount, 0)
      );
    });

    const nonTaxableAllocations = allocateDiscountAcrossItems(
      nonTaxableEntries,
      discountOnNonTaxableEx
    );
    nonTaxableEntries.forEach((entry, idx) => {
      const discountShare = Math.min(
        Number(nonTaxableAllocations[idx]) || 0,
        entry.lineEx
      );
      entry.lineDiscount = roundCurrency(discountShare);
      entry.lineExAfterDiscount = roundCurrency(
        Math.max(entry.lineEx - entry.lineDiscount, 0)
      );
    });

    adjustGroupExTotals(taxableEntries, taxableExAfterDiscount);
    adjustGroupExTotals(nonTaxableEntries, nonTaxableExAfterDiscount);

    taxableEntries.forEach((entry) => {
      entry.lineDiscount = roundCurrency(
        Math.max(entry.lineEx - (entry.lineExAfterDiscount || 0), 0)
      );
      entry.lineTax = roundCurrency(
        (entry.lineExAfterDiscount || 0) * taxRate
      );
      entry.lineTotal = roundCurrency(
        (entry.lineExAfterDiscount || 0) + (entry.lineTax || 0)
      );
    });

    adjustGroupTaxTotals(taxableEntries, itemTaxBase);

    taxableEntries.forEach((entry) => {
      entry.lineTotal = roundCurrency(
        (entry.lineExAfterDiscount || 0) + (entry.lineTax || 0)
      );
    });

    nonTaxableEntries.forEach((entry) => {
      entry.lineDiscount = roundCurrency(
        Math.max(entry.lineEx - (entry.lineExAfterDiscount || 0), 0)
      );
      entry.lineTax = 0;
      entry.lineTotal = roundCurrency(entry.lineExAfterDiscount || 0);
    });

    const itemBreakdown = breakdownSeed
      .map((entry) => {
        const lineDiscount = entry.lineDiscount || 0;
        const lineExBase = Number(entry.lineEx) || 0;
        const lineExAfterDiscount =
          entry.lineExAfterDiscount ?? lineExBase;
        const taxAmount = entry.lineTax || 0;
        const lineTotal = entry.lineTotal ?? lineExBase;
        const lineTaxBeforeDiscount = entry.taxable
          ? roundCurrency(lineExBase * taxRate)
          : 0;
        const lineTotalBeforeDiscount = roundCurrency(
          lineExBase + lineTaxBeforeDiscount
        );
        return {
          id: entry.id,
          name: entry.name,
          quantity: entry.quantity,
          taxable: entry.taxable,
          lineEx: lineExBase,
          lineDiscount,
          lineExAfterDiscount,
          taxAmount,
          lineTotal,
          lineTaxBeforeDiscount,
          lineTotalBeforeDiscount,
          index: entry.index,
        };
      })
      .sort((a, b) => a.index - b.index);
    const subtotalAfterDiscountEx = roundCurrency(
      taxableExAfterDiscount + nonTaxableExAfterDiscount
    );
    const subtotalWithItemTax = roundCurrency(subtotalAfterDiscountEx + itemTaxBase);
    const shippingWithGst = roundCurrency(shippingExAfterDiscount + shippingTax);

    const totalBeforeFees = roundCurrency(subtotalWithItemTax + shippingWithGst);

    // Card fee calculated on total incl GST
    const cardFeeBase = Math.max(0, totalBeforeFees);
    const cardFeeExGst =
      cardFeeBase > 0 ? roundCurrency(cardFeeBase * CARD_FEE_RATE) : 0;
    const cardFeeGst =
      cardFeeExGst > 0 ? roundCurrency(cardFeeExGst * taxRate) : 0;
    const cardFeeTotal = roundCurrency(cardFeeExGst + cardFeeGst);

    const totalBeforeDiscount = roundCurrency(totalBeforeFees + cardFeeTotal);
    const total = totalBeforeDiscount; // discount already applied to ex-GST components above

    const subtotalAfterDiscount = roundCurrency(
      Math.max(subtotalWithItemTax, 0)
    );

    const taxTotal = roundCurrency(itemTaxBase + shippingTax + cardFeeGst);

    debugLog("calcTotals result", {
      subtotal,
      subtotalAfterDiscount,
      shipping,
      rawShipping,
      shippingConfirmed,
      shippingTax,
      shippingWithGst,
      discount,
      taxableSubtotal: taxableSubtotalRounded,
      itemTaxBeforeDiscount: itemTaxBase,
      itemTax: itemTaxBase,
      taxRate,
      taxTotal,
      cardFeeBase,
      cardFeeExGst,
      cardFeeGst,
      cardFeeTotal,
      cardFeeTaxRate: taxRate,
      totalBeforeDiscount,
      totalBeforeFees,
      total,
    });

    return {
      subtotal,
      subtotalAfterDiscount,
      subtotalWithItemTax,
      shipping,
      rawShipping,
      shippingConfirmed,
      shippingTax,
      shippingWithGst,
      discount,
      discountTaxableShare: discountOnTaxableEx,
      discountNonTaxableShare: discountOnNonTaxableEx,
      taxableSubtotal: taxableSubtotalRounded,
      taxableAfterDiscount: taxableExAfterDiscount,
      itemTaxBeforeDiscount: null,
      itemTax: itemTaxBase,
      taxRate,
      taxTotal,
      itemBreakdown,
      cardFeeBase,
      cardFeeExGst,
      cardFeeGst,
      cardFeeTotal,
      cardFeeTaxRate: taxRate,
      totalBeforeDiscount,
      totalBeforeFees,
      total,
      usedOffer: Boolean(offer && !ignoreOffer),
      offerSubTotal: null,
      offerGrandTotal: null,
    };
  };

  const resolveTaxDetailsForPayload = async () => {
    try {
      const details = await getShippingTaxDetails();
      if (details) return details;
    } catch (err) {
      debugLog("resolveTaxDetailsForPayload failed", err);
    }
    if (shippingTaxDetailsState.data) return shippingTaxDetailsState.data;
    const fallbackId = String(shippingTaxId || "").trim();
    if (fallbackId) {
      return {
        id: fallbackId,
        name: shippingTaxDetailsState.data?.name,
        rate:
          shippingTaxDetailsState.data?.rate ??
          (window.StorefrontConfig?.shippingTaxRate ??
            window.StorefrontConfig?.shippingTaxPercentage),
      };
    }
    return null;
  };

  const applyTaxMetadataToItem = (target, taxDetails) => {
    if (!target || !taxDetails) return;
    const id = taxDetails.id ? String(taxDetails.id).trim() : "";
    const name = taxDetails.name ? String(taxDetails.name).trim() : "";
    if (id) {
      target.tax_id = id;
      target.taxId = id;
      target.tax_form_id = id;
      target.form_id = target.form_id ?? id;
    }
    if (name) {
      target.tax_name = name;
      target.taxName = name;
      target.tax_label = name;
      target.taxLabel = name;
    }
    if (taxDetails.rate !== undefined) {
      target.tax_rate = taxDetails.rate;
      target.taxRate = taxDetails.rate;
    }
  };

  const buildBackendCartItems = async (
    cartState,
    totals,
    { includeCardFee = true } = {}
  ) => {
    const items = Array.isArray(cartState?.items) ? cartState.items : [];
    const taxDetails = await resolveTaxDetailsForPayload();
    const payloadItems = items.map((item) => {
      const requiresShipping = parseBooleanish(item?.requiresShipping);
      const payload = {
        productId: item.productId || item.id,
        name: item.name,
        quantity: item.qty,
        price: item.price,
        requiresShipping:
          requiresShipping === undefined || requiresShipping === null
            ? true
            : requiresShipping === true,
      };
      const taxableFlag = parseBooleanish(item?.taxable);
      if (taxableFlag === true) {
        payload.taxable = true;
        applyTaxMetadataToItem(payload, taxDetails);
      } else {
        // Explicitly send false when not taxable or unknown
        payload.taxable = false;
      }
      return payload;
    });

    if (includeCardFee && totals?.cardFeeExGst > 0) {
      const feeItem = {
        productId: CARD_FEE_PRODUCT_ID,
        name: CARD_FEE_PRODUCT_NAME,
        quantity: 1,
        price: roundCurrency(totals.cardFeeExGst),
        taxable: true,
        requiresShipping: false,
      };
      applyTaxMetadataToItem(feeItem, taxDetails);
      payloadItems.push(feeItem);
    }

    return payloadItems;
  };

  const renderSummary = () => {
    if (!summaryEls.list || typeof Cart === "undefined") return;
    const cartState = Cart.getState();
    const currentStep = checkoutState.steps[checkoutState.stepIndex] || "";
    const readOnly = currentStep === "review";
    summaryEls.list.innerHTML = "";

    let forceType = null;
    try {
      const checked = document.querySelector('input[name="shipping_method"]:checked');
      if (checked && Array.isArray(checkoutState.shippingTypes)) {
        forceType = checkoutState.shippingTypes.find(
          (st) => st && String(st.id) === String(checked.value)
        ) || null;
      }
    } catch {}
    const totals = calcTotals(cartState, { forceShippingType: forceType });
    checkoutState.financials = totals;

    const breakdownMap = new Map();
    if (Array.isArray(totals.itemBreakdown)) {
      totals.itemBreakdown.forEach((entry) => {
        if (!entry || entry.id === undefined || entry.id === null) return;
        breakdownMap.set(String(entry.id), entry);
      });
    }

    let breakdownForDisplay = totals.itemBreakdown;

    if (!cartState.items.length) {
      summaryEls.list.innerHTML =
        '<div class="p-4 text-sm text-gray-500">Your cart is empty.</div>';
      breakdownForDisplay = [];
    } else {
      cartState.items.forEach((item) => {
        if (!item) return;
        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.price) || 0;
        const breakdown = breakdownMap.get(String(item.id));
        const breakdownLineTotal = Number.isFinite(
          breakdown?.lineTotalBeforeDiscount
        )
          ? breakdown.lineTotalBeforeDiscount
          : Number.isFinite(breakdown?.lineTotal)
          ? breakdown.lineTotal
          : null;
        const lineTotal = Number.isFinite(breakdownLineTotal)
          ? breakdownLineTotal
          : roundCurrency(unitPrice * qty);
        const taxAmount = Number.isFinite(breakdown?.taxAmount)
          ? breakdown.taxAmount
          : 0;
        const gstLabel =
          taxAmount > 0 ? `Incl ${formatMoney(taxAmount)} GST` : "GST exempt";
        const imageHtml = renderAvatarHtml(item.image, item.name, {
          sizeClasses: "h-14 w-14 sm:h-16 sm:w-16",
          shapeClasses: "rounded-xl",
          fallbackTextClass: "text-base sm:text-lg",
        });
        const itemName = item.name ? String(item.name).trim() : "Item";
        const brandLine = item.brand
          ? `<div class="text-xs text-gray-500 truncate">${item.brand}</div>`
          : "";
        const scriptLine = isScriptCartItem(item);
        let infoBody = `
          <div class="font-semibold text-sm sm:text-base text-gray-900 truncate">${itemName}</div>
          ${brandLine}
          <div class="text-xs text-gray-500">Unit price ${formatMoney(unitPrice)}</div>
        `;
        if (readOnly || scriptLine) {
          infoBody += `
            <div class="text-xs text-gray-500 mt-2">Qty ${qty} · ${gstLabel}</div>
          `;
        } else {
          infoBody += `
            <div class="mt-3 flex items-center gap-2">
              <button class="qty-decr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${item.id}" aria-label="Decrease quantity">−</button>
              <input class="qty-input w-12 text-center rounded-lg border px-2 py-1" value="${qty}" data-id="${item.id}" inputmode="numeric" aria-label="Quantity"/>
              <button class="qty-incr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${item.id}" aria-label="Increase quantity">+</button>
            </div>
            <div class="text-xs text-gray-500 mt-2">${gstLabel}</div>
          `;
        }

        let actionColumn = `
          <div class="text-sm font-semibold text-gray-900 text-right">${formatMoney(lineTotal)}</div>
        `;
        if (!readOnly) {
          actionColumn = `
            <div class="flex flex-col items-end gap-2">
              <button class="remove-item w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" data-id="${item.id}" aria-label="Remove item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
              <div class="text-sm font-semibold text-gray-900">${formatMoney(lineTotal)}</div>
            </div>
          `;
        }

        const row = document.createElement("div");
        row.className =
          "grid grid-cols-[56px_1fr_auto] sm:grid-cols-[64px_1fr_auto] gap-4 items-start p-4";
        row.innerHTML = `
          <div class="flex-shrink-0">${imageHtml}</div>
          <div class="min-w-0">${infoBody}</div>
          ${actionColumn}
        `;
        summaryEls.list.appendChild(row);
      });
    }

    renderSubtotalBreakdown(summaryEls.subtotalBreakdown, breakdownForDisplay);

    const subtotalDisplay =
      totals.subtotalWithItemTax !== undefined
        ? totals.subtotalWithItemTax
        : totals.subtotal;
    if (summaryEls.subtotal)
      summaryEls.subtotal.textContent = formatMoney(subtotalDisplay);

    let shippingLabel = "Select shipping";
    const shippingHasCharge =
      totals.shippingConfirmed && totals.shipping > 0;
    const noShippingOptions =
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.length === 0;
    if (noShippingOptions && totals.shippingConfirmed) {
      shippingLabel = "No shipping required";
    } else if (checkoutState.freeShipping) {
      shippingLabel = "Free";
    } else if (shippingHasCharge) {
      const shippingAmount = Number.isFinite(totals.shippingWithGst)
        ? totals.shippingWithGst
        : totals.shipping;
      shippingLabel = formatMoney(shippingAmount);
    } else if (totals.shippingConfirmed) {
      shippingLabel = "Free";
    }
    if (summaryEls.shipping) summaryEls.shipping.textContent = shippingLabel;

    if (summaryEls.processing)
      summaryEls.processing.textContent = formatMoney(totals.cardFeeTotal);

    if (summaryEls.gst) summaryEls.gst.textContent = formatMoney(totals.taxTotal);

    const processingNote = formatCardFeeNote(
      totals.cardFeeExGst,
      totals.cardFeeGst,
      totals.cardFeeTaxRate
    );

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
        ? `-${formatMoney(totals.discount).replace(/^-/, "")}`
        : "-$0.00";

    if (summaryEls.discount) {
      summaryEls.discount.textContent = discountDisplay;
    }
    // Force drawer to pick up updated summary immediately
    window.__checkoutSummary = {
      totals,
      shippingLabel,
      discountDisplay,
      processingNote,
    };

    if (summaryEls.total) summaryEls.total.textContent = formatMoney(totals.total);

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

  const toggleBillingSection = (show) => {
    if (billingAddressSection)
      billingAddressSection.classList.toggle("hidden", show === false);
    setRequiredForFields(billingRequiredFields, show !== false);
    const manageFieldState = (field) => {
      if (!field) return;
      if (show === false) {
        if (!field.dataset.savedCardPrevDisabled) {
          field.dataset.savedCardPrevDisabled = field.disabled ? "true" : "false";
        }
        if (!field.disabled) {
          field.disabled = true;
          field.classList?.add("bg-gray-100");
        }
      } else {
        if (field.dataset.savedCardPrevDisabled === "false") {
          field.disabled = false;
          field.classList?.remove("bg-gray-100");
        }
        delete field.dataset.savedCardPrevDisabled;
      }
    };
    allBillingFields.forEach(manageFieldState);
    if (billSameCheckbox) {
      if (show === false) {
        if (!billSameCheckbox.dataset.savedCardPrevDisabled) {
          billSameCheckbox.dataset.savedCardPrevDisabled = billSameCheckbox.disabled
            ? "true"
            : "false";
        }
        billSameCheckbox.disabled = true;
      } else {
        if (billSameCheckbox.dataset.savedCardPrevDisabled === "false") {
          billSameCheckbox.disabled = false;
        }
        delete billSameCheckbox.dataset.savedCardPrevDisabled;
      }
      const wrapper = billSameCheckbox.closest("label");
      if (wrapper) {
        if (show === false) {
          if (!wrapper.dataset.savedCardPrevOpacity) {
            wrapper.dataset.savedCardPrevOpacity = wrapper.classList.contains(
              "opacity-50"
            )
              ? "true"
              : "false";
          }
          wrapper.classList.add("opacity-50");
        } else {
          if (wrapper.dataset.savedCardPrevOpacity === "false") {
            wrapper.classList.remove("opacity-50");
          }
          delete wrapper.dataset.savedCardPrevOpacity;
        }
      }
    }
    if (show === false && billingAddressSection) {
      clearErrors(billingAddressSection);
    }
  };

  const applyPaymentSourceSelection = ({ save = true } = {}) => {
    if (isUsingSavedCard() && !getSelectedSavedCard()) {
      checkoutState.selectedPaymentSource = "new";
    }

    const usingSavedCard = isUsingSavedCard();
    toggleNewCardSection(!usingSavedCard);
    setCardFieldsRequired(!usingSavedCard);
    toggleBillingSection(!usingSavedCard);

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

  const AUSTRALIA_LABEL = "Australia";

  const isCountrySelect = (el) =>
    el && el.tagName === "SELECT" && /country$/i.test(el.id || "");

  const forceAustraliaSelection = (el) => {
    if (!el) return;
    const options = Array.from(el.options || []);
    const match =
      options.find((option) =>
        /^australia$/i.test(option.text || option.value)
      ) || options[0];
    if (match) {
      el.value = match.value || AUSTRALIA_LABEL;
    } else {
      el.value = AUSTRALIA_LABEL;
    }
  };

  const setFieldValue = (id, value, opts = {}) => {
    const el = byId(id);
    if (!el) return;
    if (isCountrySelect(el)) {
      forceAustraliaSelection(el);
      return;
    }
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

    if (billingSameWrapper) {
      billingSameWrapper.classList.toggle("hidden", mode !== "home");
    }

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
        const billSearch = byId("bill_autocomplete");
        if (billSearch) {
          billSearch.disabled = false;
          billSearch.classList?.remove("bg-gray-100");
        }
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
    const getValue = (id) => (byId(id)?.value || "").trim();
    const setLines = (selector, lines, emptyMessage) => {
      const el = document.querySelector(selector);
      if (!el) return;
      if (lines.length) {
        el.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
      } else {
        el.innerHTML = `<div class="text-gray-500">${emptyMessage}</div>`;
      }
    };

    const contactLines = [];
    const name = [getValue("cust_first"), getValue("cust_last")]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (name) contactLines.push(name);
    const email = getValue("cust_email");
    if (email) contactLines.push(email);
    const phone = getValue("cust_phone");
    if (phone) contactLines.push(phone);
    setLines("#review_contact", contactLines, "No contact details provided.");

    const shippingLines = [];
    const shippingValue = shippingOptionSelect?.value || "";
    let shippingOptionLabel = "";
    if (shippingOptionSelect && shippingOptionSelect.selectedIndex >= 0) {
      const opt =
        shippingOptionSelect.options[shippingOptionSelect.selectedIndex];
      shippingOptionLabel = opt?.textContent?.trim() || "";
    }
    const selectedShippingType = getSelectedShippingType();
    if (selectedShippingType?.name) {
      shippingLines.push(selectedShippingType.name);
    } else if (
      !checkoutState.shippingMethod &&
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.length
    ) {
      shippingLines.push("Shipping method not selected");
    } else if (
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.length === 0
    ) {
      shippingLines.push("Shipping not required");
    }
    if (shippingOptionLabel) shippingLines.push(shippingOptionLabel);

    if (shippingValue === PARCEL_SHIPPING_OPTION) {
      const parcelValue = (id) => (byId(id)?.value || "").trim();
      const parcelStateEl = byId("parcel_state");
      let parcelStateLabel = "";
      if (parcelStateEl && parcelStateEl.value) {
        const opt = parcelStateEl.options[parcelStateEl.selectedIndex || 0];
        parcelStateLabel = opt?.textContent?.trim() || "";
      }
      const lockerLine = [
        parcelValue("parcel_number"),
        parcelValue("parcel_street"),
      ]
        .filter(Boolean)
        .join(", ");
      if (lockerLine) shippingLines.push(lockerLine);
      const cityStateLine = [parcelValue("parcel_city"), parcelStateLabel]
        .filter(Boolean)
        .join(" ");
      const postal = parcelValue("parcel_postal");
      const cityPostalLine = [cityStateLine, postal]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (cityPostalLine) shippingLines.push(cityPostalLine);
    } else if (shippingValue === HOME_SHIPPING_OPTION) {
      const addressLines = [];
      const addr1 = getValue("ship_addr1");
      if (addr1) addressLines.push(addr1);
      const addr2 = getValue("ship_addr2");
      if (addr2) addressLines.push(addr2);
      const cityState = [getValue("ship_city"), getValue("ship_state")]
        .filter(Boolean)
        .join(" ");
      const postal = getValue("ship_postal");
      const cityPostal = [cityState, postal]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (cityPostal) addressLines.push(cityPostal);
      const country = getValue("ship_country");
      if (country) addressLines.push(country);
      shippingLines.push(...addressLines);
    }
    setLines("#review_shipping", shippingLines, "Select a shipping option.");

    const billingLines = [];
    const billAddr1 = getValue("bill_addr1");
    if (billAddr1) billingLines.push(billAddr1);
    const billAddr2 = getValue("bill_addr2");
    if (billAddr2) billingLines.push(billAddr2);
    const billCityState = [getValue("bill_city"), getValue("bill_state")]
      .filter(Boolean)
      .join(" ");
    const billPostal = getValue("bill_postal");
    const billCityPostal = [billCityState, billPostal]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (billCityPostal) billingLines.push(billCityPostal);
    const billCountry = getValue("bill_country");
    if (billCountry) billingLines.push(billCountry);
    setLines(
      "#review_billing",
      billingLines,
      "Add a billing address to continue."
    );

    const financials = checkoutState.financials || calcTotals();
    const paymentLines = [];
    if (isUsingSavedCard()) {
      const card = getSelectedSavedCard();
      const last4Source =
        card?.last4 ||
        card?.card_last_four ||
        card?.card_last4 ||
        card?.card_lastfour ||
        "";
      const last4Display = String(last4Source || "").trim().slice(-4) || "••••";
      const expMonth = card?.exp_month || card?.card_expiration_month;
      const expYear = card?.exp_year || card?.card_expiration_year;
      const expLabel =
        expMonth && expYear
          ? `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`
          : "";
      const typeLabel = getCardTypeLabel(card);
      const descriptor = typeLabel
        ? `${typeLabel} ending in ${last4Display}`
        : `Card ending in ${last4Display}`;
      paymentLines.push(
        expLabel ? `${descriptor} · Expires ${expLabel}` : descriptor
      );
    } else {
      const ccValue = getValue("cc_number").replace(/\s+/g, "");
      const last4 = ccValue.slice(-4);
      if (last4) {
        paymentLines.push(`Card ending in ${last4}`);
      } else {
        paymentLines.push("New card");
      }
      const cardName = getValue("cc_name");
      if (cardName) paymentLines.push(cardName);
    }
    if (selectedShippingType?.name) {
      paymentLines.push(`Shipping method: ${selectedShippingType.name}`);
    } else if (
      !checkoutState.shippingMethod &&
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.length
    ) {
      paymentLines.push("Shipping method: Not selected");
    } else if (
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.length === 0
    ) {
      paymentLines.push("Shipping method: Not required");
    }
    const meta = checkoutState.couponMeta;
    if (meta?.code) paymentLines.push(`Coupon applied: ${meta.code}`);
    if (financials.cardFeeTotal > 0) {
      paymentLines.push(
        `Card fee: ${formatMoney(financials.cardFeeTotal)} (incl GST ${formatMoney(
          financials.cardFeeGst
        )})`
      );
    }
    setLines("#review_payment", paymentLines, "Add payment details to continue.");

    const cartState =
      typeof Cart !== "undefined" &&
      Cart &&
      typeof Cart.getState === "function"
        ? Cart.getState()
        : { items: [] };
    const reviewItemsContainer = document.querySelector("#review_items");
    if (reviewItemsContainer) {
      reviewItemsContainer.innerHTML = "";
      const items = Array.isArray(cartState.items) ? cartState.items : [];
      const breakdownMap = new Map();
      if (financials && Array.isArray(financials.itemBreakdown)) {
        financials.itemBreakdown.forEach((entry) => {
          if (!entry || entry.id === undefined || entry.id === null) return;
          breakdownMap.set(String(entry.id), entry);
        });
      }
      if (!items.length) {
        reviewItemsContainer.innerHTML =
          '<div class="p-4 text-sm text-gray-500">Your cart is empty.</div>';
      } else {
        items.forEach((item) => {
          if (!item) return;
          const qty = Number(item.qty) || 0;
          const breakdown = breakdownMap.get(String(item.id));
          const unitPrice = Number(item.price) || 0;
          const breakdownLineTotal = Number.isFinite(
            breakdown?.lineTotalBeforeDiscount
          )
            ? breakdown.lineTotalBeforeDiscount
            : Number.isFinite(breakdown?.lineTotal)
            ? breakdown.lineTotal
            : null;
          const lineTotal = Number.isFinite(breakdownLineTotal)
            ? breakdownLineTotal
            : roundCurrency(unitPrice * qty);
          const taxAmount = Number.isFinite(breakdown?.taxAmount)
            ? breakdown.taxAmount
            : 0;
          const gstLabel =
            taxAmount > 0
              ? `Incl ${formatMoney(taxAmount)} GST`
              : "GST exempt";
          const imageHtml = renderAvatarHtml(item.image, item.name, {
            sizeClasses: "h-14 w-14 sm:h-16 sm:w-16",
            shapeClasses: "rounded-xl",
            fallbackTextClass: "text-base sm:text-lg",
          });
          const infoLines = [];
          const nameLine = item.name ? String(item.name).trim() : "Item";
          infoLines.push(
            `<div class="font-semibold text-sm sm:text-base text-gray-900 truncate">${nameLine}</div>`
          );
          if (item.brand) {
            infoLines.push(
              `<div class="text-xs text-gray-500 truncate">${item.brand}</div>`
            );
          }
          infoLines.push(
            `<div class="text-xs text-gray-500">Unit price ${formatMoney(unitPrice)}</div>`
          );
          infoLines.push(
            `<div class="text-xs text-gray-500">Qty ${qty} · ${gstLabel}</div>`
          );
          const row = document.createElement("div");
          row.className =
            "grid grid-cols-[56px_1fr_auto] sm:grid-cols-[64px_1fr_auto] gap-4 items-start p-4 text-sm text-gray-700";
          row.innerHTML = `
            <div class="flex-shrink-0">${imageHtml}</div>
            <div class="min-w-0 space-y-2">
              ${infoLines.join("")}
            </div>
            <div class="text-right text-sm font-semibold text-gray-900">
              ${formatMoney(lineTotal)}
            </div>
          `;
          reviewItemsContainer.appendChild(row);
        });
      }
    }

    const subtotalDisplay =
      financials.subtotalWithItemTax !== undefined
        ? financials.subtotalWithItemTax
        : financials.subtotal;
    const subtotalEl = document.querySelector("#review_subtotal");
    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotalDisplay);

    let shippingLabel = "Select shipping";
    const shippingHasCharge =
      financials.shippingConfirmed && financials.shipping > 0;
    const noShippingOptions =
      Array.isArray(checkoutState.shippingTypes) &&
      checkoutState.shippingTypes.length === 0;
    if (noShippingOptions && financials.shippingConfirmed) {
      shippingLabel = "No shipping required";
    } else if (checkoutState.freeShipping) {
      shippingLabel = "Free";
    } else if (shippingHasCharge) {
      const shippingAmount = Number.isFinite(financials.shippingWithGst)
        ? financials.shippingWithGst
        : financials.shipping;
      shippingLabel = formatMoney(shippingAmount);
    } else if (financials.shippingConfirmed) {
      shippingLabel = "Free";
    }
    const shippingTotalEl = document.querySelector("#review_shipping_total");
    if (shippingTotalEl) shippingTotalEl.textContent = shippingLabel;

    const cardFeeEl = document.querySelector("#review_card_fee");
    if (cardFeeEl) cardFeeEl.textContent = formatMoney(financials.cardFeeTotal);

    const gstEl = document.querySelector("#review_gst_total");
    if (gstEl) gstEl.textContent = formatMoney(financials.taxTotal);

    const discountEl = document.querySelector("#review_discount");
    if (discountEl) {
      const discountValue =
        financials.discount > 0
          ? `-${formatMoney(financials.discount).replace(/^-/, "")}`
          : "-$0.00";
      discountEl.textContent = discountValue;
    }

    const totalEl = document.querySelector("#review_total");
    if (totalEl) totalEl.textContent = formatMoney(financials.total);

    const feeNote = formatCardFeeNote(
      financials.cardFeeExGst,
      financials.cardFeeGst,
      financials.cardFeeTaxRate
    );
    const feeNoteEl = document.querySelector("#review_card_fee_note");
    if (feeNoteEl) {
      if (feeNote) {
        feeNoteEl.textContent = feeNote;
        feeNoteEl.classList.remove("hidden");
      } else {
        feeNoteEl.textContent = "";
        feeNoteEl.classList.add("hidden");
      }
    }
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
    renderSummary();
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
      selectedSavedCardId = coerceSavedCardIdForPayload(cardId);
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
    const totalsForFee = calcTotals(cartState, { ignoreOffer: true, forceShippingType: shippingType });
    const cartItems = await buildBackendCartItems(cartState, totalsForFee);

    const finalOffer = await buildOffer(
      { items: cartItems },
      checkoutState.couponMeta,
      shippingType
    );
    await ensureOfferTaxEntry(finalOffer);
    applyRetailGstToOffer(finalOffer, cartState);
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
        checkoutState.shippingSelectionConfirmed = true;
        return;
      }

      const rawShippingTypes = await getShippingTypes(shippingOptions);
      const resolvedTypes = applyShippingRules(rawShippingTypes);
      checkoutState.shippingTypes = resolvedTypes;

      // Update shipping UI with dynamic options
      const shippingContainer = document.getElementById("shipping_methods");
      if (shippingContainer) {
        shippingContainer.innerHTML = "";
        const currentMethodRaw = checkoutState.shippingMethod
          ? String(checkoutState.shippingMethod)
          : "";
        const currentMethod =
          currentMethodRaw === NONE_SHIPPING_ID ? "" : currentMethodRaw;
        const hasCurrentSelection =
          currentMethod &&
          resolvedTypes.some((type) => String(type.id) === currentMethod);
        const autoSelectId =
          !hasCurrentSelection && resolvedTypes.length === 1
            ? String(resolvedTypes[0].id)
            : "";
        const selectionId = hasCurrentSelection ? currentMethod : autoSelectId;

        resolvedTypes.forEach((type) => {
          if (!type) return;
          const label = document.createElement("label");
          label.className =
            "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-500";
          const value = String(type.id);
          const priceValue = Number.isFinite(type.displayPrice)
            ? type.displayPrice
            : Number(type.price) || 0;
          const priceLabel = priceValue > 0 ? formatMoney(priceValue) : "Free";
          label.innerHTML = `
            <div class="flex items-center gap-3">
              <input type="radio" name="shipping_method" value="${value}" ${
                value === selectionId ? "checked" : ""
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
        const nextMethod = selectionId || "";
        checkoutState.shippingMethod = nextMethod;
        if (resolvedTypes.length === 0) {
          checkoutState.shippingSelectionConfirmed = true;
        } else if (resolvedTypes.length === 1 && nextMethod) {
          checkoutState.shippingSelectionConfirmed = true;
        } else if (previousMethod !== nextMethod) {
          checkoutState.shippingSelectionConfirmed = false;
        } else if (!nextMethod && resolvedTypes.length > 0) {
          checkoutState.shippingSelectionConfirmed = false;
        }
        await updateOffer();
        renderSummary();
      }
    } catch (err) {
      console.error("Failed to load shipping types:", err);
    }
  };

  /* ========= events ========= */
  document.addEventListener("click", (event) => {
    const target = event.target;
    const editTrigger = target.closest("[data-edit-step]");
    if (editTrigger) {
      const stepName = editTrigger.getAttribute("data-edit-step");
      if (stepName) {
        const index = checkoutState.steps.indexOf(stepName);
        if (index >= 0) {
          checkoutState.stepIndex = index;
          renderStepper();
          renderStep();
          const stepper = document.querySelector(".stepper");
          stepper?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      return;
    }
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
          await clearCheckoutArtifacts();
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
            friendlyMessage || "Something went wrong. Please try again.";
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
      const billSearch = byId("bill_autocomplete");
      if (billSearch) {
        if (on) {
          const shipSearch = byId("autocomplete");
          if (shipSearch) billSearch.value = shipSearch.value;
        }
        billSearch.disabled = on;
        billSearch.classList.toggle("bg-gray-100", on);
      }
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
      const selectedValue = target.value || "";
      checkoutState.shippingMethod =
        selectedValue === NONE_SHIPPING_ID ? "" : selectedValue;
      checkoutState.shippingSelectionConfirmed = true;
      const couponType = checkoutState.couponMeta
        ? normaliseCouponType(
            checkoutState.couponMeta.normalizedType ||
              checkoutState.couponMeta.type ||
              checkoutState.couponMeta.discount_type
          )
        : "";
      if (checkoutState.shippingMethod && couponType !== "shipping") {
        checkoutState.freeShipping = false;
      }
      saveCheckoutState();
      renderSummary();
      if (checkoutState.steps[checkoutState.stepIndex] === "review")
        buildReview();
      updateOffer();
      renderSummary();
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
        if (el) forceAustraliaSelection(el);
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
