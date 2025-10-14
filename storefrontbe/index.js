import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { OfferEngine } from "./offer-engine.js";
import { ontraportRequest } from "./utils.js";
import {
  applyCoupons,
  validateCouponExistence,
} from "./coupon-validate.service.js";

// Ensure we load .env from the same directory as this file (storefrontbe/.env),
// regardless of the current working directory when starting the server.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors("*"));
app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const reqId = Math.random().toString(36).slice(2, 8);
  console.log(`[REQ ${reqId}] ${method} ${originalUrl}`);
  if (req.method !== "GET") {
    try {
      console.log(`[REQ ${reqId}] body:`, JSON.stringify(req.body));
    } catch {}
  }
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `[RES ${reqId}] ${method} ${originalUrl} -> ${res.statusCode} (${ms}ms)`
    );
  });
  next();
});

// Ontraport configuration

// Initialize offer engine
const offerEngine = new OfferEngine();

// Error handling middleware
const handleError = (err, req, res, next) => {
  console.log("API Error:", err.message, err.data, err.details);

  if (err.message.includes("Ontraport API error")) {
    const status = err.message.includes("401")
      ? 401
      : err.message.includes("403")
      ? 403
      : err.message.includes("400")
      ? 400
      : 500;
    return res.status(status).json(err.message);
  }

  res.status(500).json({ error: "Internal server error" });
};

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toQuantity = (value, fallback = 1) => {
  const qty = Math.round(toNumber(value, fallback));
  return qty > 0 ? qty : fallback;
};

const formatPrice = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return (Math.round(num * 100) / 100).toFixed(2);
};

const parsePriceToNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num * 100) / 100;
};

const pickString = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === "object") {
      const nested = pickString(
        value.value,
        value.label,
        value.name,
        value.title,
        value.display
      );
      if (nested) return nested;
    }
  }
  return "";
};

const normalizeDispenseRow = (row = {}) => {
  const dispenseId = safeString(row.id);
  const productId = pickString(
    row.f2790,
    row.f2301,
    row.productId,
    row.product_id,
    row.productID,
    row.product
  );
  const itemId = safeString(productId || dispenseId);
  if (!itemId) return null;
  const qty = toQuantity(
    row.f2838 ?? row.quantity ?? row.qty ?? row.count ?? 1,
    1
  );
  const retailPrice = parsePriceToNumber(row.f2302 ?? row.retailPrice ?? row.price);
  const retailGst = parsePriceToNumber(row.f2806 ?? row.retailGst ?? row.gst);
  const wholesalePrice = parsePriceToNumber(
    row.f2303 ?? row.wholesalePrice ?? row.wholesale_price
  );
  const name = pickString(
    row.name,
    row.f2301_name,
    row.f2301_label,
    row.f2301,
    row.product_name,
    row.item_name,
    row.title,
    row.unique_id
  );
  const brand = pickString(row.brand, row.product_brand);
  const scriptId = pickString(row.f2251, row.scriptId);

  return {
    id: itemId,
    productId: productId || itemId,
    name: name || `Dispense #${dispenseId || itemId}`,
    qty,
    price: retailPrice ?? 0,
    retailGst: retailGst ?? 0,
    wholesalePrice: wholesalePrice ?? 0,
    brand,
    dispenseId: dispenseId || itemId,
    scriptId: scriptId || null,
    paymentId: productId || null,
  };
};

const updateDispenses = async (updates = [], { status, contactId } = {}) => {
  if (!Array.isArray(updates) || !updates.length) return;
  const requests = updates
    .map((update) => {
      const id = safeString(update?.id);
      if (!id) return null;
      const payload = { id };
      if (status) payload.f2261 = safeString(status);
      if (contactId) payload.f2787 = safeString(contactId);
      if (update.quantity !== undefined)
        payload.f2838 = String(toQuantity(update.quantity, 1));
      if (update.retailPrice !== undefined)
        payload.f2302 = formatPrice(update.retailPrice);
      if (update.retailGst !== undefined)
        payload.f2806 = formatPrice(update.retailGst);
      if (update.wholesalePrice !== undefined)
        payload.f2303 = formatPrice(update.wholesalePrice);
      if (update.scriptId !== undefined && update.scriptId !== null) {
        const script = safeString(update.scriptId);
        if (script) payload.f2251 = script;
      }
      if (update.pharmacyId) payload.f2290 = safeString(update.pharmacyId);
      return ontraportRequest("/Dispenses", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    })
    .filter(Boolean);
  if (!requests.length) return;
  await Promise.allSettled(requests);
};

// Health check
app.get("/api-thc/health", (_req, res) => {
  res.json({ ok: true });
});

// Contact save endpoint (updated to match requirements)
app.post("/api-thc/contact/save", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      address2,
      city,
      state,
      zip,
      country,
      contactId,
      f3099,
      default_shipping_option,
      f3094,
      f3095,
      f3096,
      f3097,
      f3098,
      parcel_number,
      parcel_street,
      parcel_city,
      parcel_state,
      parcel_postal,
    } = req.body;

    // 1. Email validation
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required" });
    }

    // 2. Prepare payload - always use email as the update identifier
    const payload = {
      firstname: first_name || "",
      lastname: last_name || "",
      email,
      sms_number: phone || "",
      address: address || "",
      address2: address2 || "",
      city: city || "",
      state: state || "",
      zip: zip || "",
      country: country || "",
      update_by: "email", // This ensures Ontraport uses email for matching
    };

    if (contactId) payload.id = contactId;

    const shippingOption = f3099 || default_shipping_option || "";
    if (shippingOption) payload.f3099 = shippingOption;

    const lockerFields = {
      f3094: typeof f3094 !== "undefined" ? f3094 : parcel_number,
      f3095: typeof f3095 !== "undefined" ? f3095 : parcel_street,
      f3096: typeof f3096 !== "undefined" ? f3096 : parcel_city,
      f3097: typeof f3097 !== "undefined" ? f3097 : parcel_state,
      f3098: typeof f3098 !== "undefined" ? f3098 : parcel_postal,
    };

    Object.entries(lockerFields).forEach(([key, value]) => {
      if (typeof value !== "undefined") {
        payload[key] = value === null ? "" : String(value ?? "");
      }
    });

    // 3. Save or update using email as identifier
    const data = await ontraportRequest("/Contacts/saveorupdate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // 4. Return the contact ID from the response
    res.json({
      contactId: data?.data?.id || data?.data?.attrs?.id,
      success: true
    });

  } catch (err) {
    console.log("Contact save error:", err);
    handleError(err, req, res);
  }
});

app.get("/api-thc/contact/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "contact id is required" });
    }

    const response = await ontraportRequest(
      `/Contact?id=${encodeURIComponent(id)}`
    );

    let contact = null;
    const raw = response?.data;
    if (raw) {
      if (raw?.attrs && typeof raw.attrs === "object") {
        contact = { id: raw.id || raw.attrs?.id || String(id), ...raw.attrs };
      } else if (Array.isArray(raw)) {
        const first = raw[0];
        if (first) contact = first;
      } else if (typeof raw === "object") {
        contact = raw;
      }
    }

    if (contact && !contact.id) {
      contact.id = String(id);
    }

    res.json({ contact });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.get("/api-thc/contact/:id/credit-cards", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "contact id is required" });
    }

    const conditionFilter = [
      {
        field: { field: "contact_id" },
        op: "=",
        value: { value: String(id) }
      }
    ];
    const condition = encodeURIComponent(JSON.stringify(conditionFilter));
    const response = await ontraportRequest(
      `/CreditCards?range=50&count=false&condition=${condition}`
    );

    const cards = Array.isArray(response?.data) ? response.data : [];
    res.json({ cards });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.get("/api-thc/dispenses", async (req, res) => {
  try {
    const { contactId, status } = req.query || {};
    if (!contactId) {
      return res.status(400).json({ error: "contactId is required" });
    }

    const condition = [
      {
        field: { field: "f2787" },
        op: "=",
        value: { value: safeString(contactId) }
      }
    ];

    const statusId = safeString(status || DISPENSE_STATUS_IN_CART);
    if (statusId) {
      condition.push("AND");
      condition.push({
        field: { field: "f2261" },
        op: "=",
        value: { value: statusId }
      });
    }

    const encoded = encodeURIComponent(JSON.stringify(condition));
    const response = await ontraportRequest(
      `/Dispenses?range=200&count=false&condition=${encoded}`
    );
    const rows = Array.isArray(response?.data) ? response.data : [];
    const items = rows.map((row) => normalizeDispenseRow(row)).filter(Boolean);
    res.json({ items });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.post("/api-thc/dispenses", async (req, res) => {
  try {
    const {
      contactId,
      productId,
      paymentId,
      quantity,
      retailPrice,
      retailGst,
      wholesalePrice,
      scriptId,
      pharmacyId,
    } = req.body || {};

    if (!contactId) {
      return res.status(400).json({ error: "contactId is required" });
    }
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const payload = {
      f2787: safeString(contactId),
      f2290: safeString(pharmacyId),
      f2261: DISPENSE_STATUS_IN_CART,
      f2838: String(toQuantity(quantity, 1)),
      f2302: formatPrice(retailPrice),
      f2806: formatPrice(retailGst),
      f2303: formatPrice(wholesalePrice),
      f2251: safeString(scriptId) || undefined,
      f2301: safeString(productId),
      f2790: safeString(paymentId || productId),
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === "") {
        delete payload[key];
      }
    });

    const response = await ontraportRequest("/Dispenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const createdId =
      response?.data?.id ||
      response?.data?.attrs?.id ||
      (Array.isArray(response?.data) && response.data[0]?.id) ||
      response?.id ||
      null;
    const rawItem =
      response?.data?.attrs ||
      (Array.isArray(response?.data) ? response.data[0] : null);
    const item = normalizeDispenseRow(rawItem || { ...payload, id: createdId });

    res.json({
      success: true,
      dispenseId: createdId ? safeString(createdId) : null,
      item,
    });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.put("/api-thc/dispenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "dispense id is required" });
    }

    const {
      quantity,
      status,
      retailPrice,
      retailGst,
      wholesalePrice,
      scriptId,
      contactId,
      pharmacyId,
    } = req.body || {};

    const payload = { id: safeString(id) };
    if (quantity !== undefined) payload.f2838 = String(toQuantity(quantity, 1));
    if (status) payload.f2261 = safeString(status);
    if (retailPrice !== undefined) payload.f2302 = formatPrice(retailPrice);
    if (retailGst !== undefined) payload.f2806 = formatPrice(retailGst);
    if (wholesalePrice !== undefined)
      payload.f2303 = formatPrice(wholesalePrice);
    if (scriptId !== undefined && scriptId !== null) {
      const script = safeString(scriptId);
      if (script) payload.f2251 = script;
    }
    if (contactId) payload.f2787 = safeString(contactId);
    if (pharmacyId) payload.f2290 = safeString(pharmacyId);

    const response = await ontraportRequest("/Dispenses", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const rawItem =
      response?.data?.attrs ||
      (Array.isArray(response?.data) ? response.data[0] : null);
    const item = normalizeDispenseRow(rawItem || { ...payload });
    res.json({ success: true, item });
  } catch (err) {
    handleError(err, req, res);
  }
});

// Coupon validation endpoint
app.post("/api-thc/coupons/validate", async (req, res) => {
  try {
    const { contactId, codes, cartProductIds } = req.body || {};

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.json({ applied: null, reasons: {} });
    }
    // Keep original case for case-sensitive matching
    const rawCodes = codes.map((c) => String(c || ""));
    // Step 1: Check existence
    const existingCodes = await validateCouponExistence(rawCodes);
    // Step 2: Validate and apply
    const response = await applyCoupons(
      existingCodes,
      rawCodes,
      contactId,
      Array.isArray(cartProductIds) ? cartProductIds : []
    );
    res.json(response);
  } catch (err) {
    console.log("error is ", err);
    handleError(err, req, res);
  }
});

// Shipping types endpoint
app.get("/api-thc/shipping/types", async (req, res) => {
  try {
    const { allowed } = req.query;

    const shippingTypes = await ontraportRequest(
      "/Shippingtypes?range=50&count=false"
    );

    let types = shippingTypes.data || [];

    if (allowed) {
      const allowedIds = allowed.split(",").map((id) => String(id.trim()));
      types = types.filter((type) => allowedIds.includes(String(type.id)));
    }

    res.json(types);
  } catch (err) {
    handleError(err, req, res);
  }
});

// Offer building endpoint
app.post("/api-thc/offer/build", async (req, res) => {
  try {
    const { cart, appliedCoupon, shippingType } = req.body || {};

    if (!cart || !Array.isArray(cart.items)) {
      return res.status(400).json({ error: "Cart items are required" });
    }

    // Validate cart structure
    if (!offerEngine.validateCart(cart)) {
      return res.status(400).json({ error: "Invalid cart structure" });
    }

    // Build the offer
    const offer = offerEngine.buildOffer({
      cartItems: cart.items,
      appliedCoupon,
      shippingType,
    });

    res.json(offer);
  } catch (err) {
    handleError(err, req, res);
  }
});

const STARTRACK_MATCHER = /star\s*track/i;
const STARTRACK_OPTION_ID = "328";
const DISPENSE_STATUS_IN_CART = "149";
const DISPENSE_STATUS_CANCELLED = "146";
const DISPENSE_STATUS_PAID = "152";

const createDispenses = async ({ contactId, offer }) => {
  if (!contactId) return;
  const products = Array.isArray(offer?.products) ? offer.products : [];
  if (!products.length) return;

  const shippingOptions = Array.isArray(offer?.shipping) ? offer.shipping : [];
  const hasStartrack = shippingOptions.some((option) => {
    if (!option) return false;
    if (option.option_id) {
      const id = String(option.option_id).trim();
      if (id === STARTRACK_OPTION_ID) return true;
    }
    if (option.id) {
      const id = String(option.id).trim();
      if (id === STARTRACK_OPTION_ID) return true;
    }
    const name = String(option.name || "");
    return STARTRACK_MATCHER.test(name);
  });

  const basePayload = {
    f2261: DISPENSE_STATUS_PAID,
    f2787: String(contactId),
  };

  if (hasStartrack) {
    basePayload.f2708 = STARTRACK_OPTION_ID;
  }

  const payloads = products
    .map((product) => {
      if (!product) return null;
      const productId = String(
        product.original_product_id ||
          product.product_id ||
          product.id ||
          ""
      ).trim();
      if (!productId) return null;

      const quantityRaw = Number(product.quantity);
      const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;

      const priceCandidate = [
        product.original_price,
        product.unit_price,
        product.price,
        product.amount,
        product.total,
      ].find((value) => {
        const num = Number(value);
        return Number.isFinite(num);
      });
      const unitPrice = Number(priceCandidate);
      const formattedPrice = Number.isFinite(unitPrice)
        ? (Math.round(unitPrice * 100) / 100).toFixed(2)
        : undefined;

      const payload = {
        ...basePayload,
        f2301: productId,
        f2790: productId,
        f2838: quantity,
      };

      if (formattedPrice !== undefined) {
        payload.f2302 = formattedPrice;
      }

      return payload;
    })
    .filter(Boolean);

  if (!payloads.length) return;

  const requests = payloads.map((payload) =>
    ontraportRequest("/Dispenses", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  );

  await Promise.allSettled(requests);
};


// Transaction processing endpoint
app.post("/api-thc/transaction/process", async (req, res) => {
  try {
    const {
      contactId,
      billing_address,
      payer,
      offer,
      external_order_id,
      invoice_template = 1,
      gateway_id = process.env.DUMMY_GATEWAY_ID || 1,
      customer_note,
      internal_note,
    } = req.body || {};

    if (!contactId || !billing_address || !payer || !offer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const offerForDispense = JSON.parse(JSON.stringify(offer || {}));

    // Helper: translate payment ids to Ontraport product ids when possible
    const translatePaymentToProductIds = async (lineItems = []) => {
      try {
        const paymentIds = Array.from(
          new Set(lineItems.map((p) => String(p.id)))
        );
        if (!paymentIds.length) return new Map();
        const map = new Map();
        // Load static mapping from env if provided: PRODUCT_PAYMENT_TO_ONTRAPORT='{"205":"1234"}'
        try {
          const envMapRaw = process.env.PRODUCT_PAYMENT_TO_ONTRAPORT;
          if (envMapRaw) {
            const envMap = JSON.parse(envMapRaw);
            paymentIds.forEach((pid) => {
              const mapped = envMap[pid];
              if (mapped) map.set(String(pid), String(mapped));
            });
          }
        } catch {}
        // Try Product_ID_Payment
        try {
          const cond1 = [
            {
              field: { field: "Product_ID_Payment" },
              op: "IN",
              value: { list: paymentIds.map((v) => ({ value: v })) },
            },
          ];
          const r1 = await ontraportRequest(
            `/Products?condition=${JSON.stringify(cond1)}`
          );
          (r1?.data || []).forEach((row) => {
            if (row && row.Product_ID_Payment != null && row.id != null) {
              map.set(String(row.Product_ID_Payment), String(row.id));
            }
          });
        } catch {}
        // Try product_id_payment
        try {
          const cond2 = [
            {
              field: { field: "product_id_payment" },
              op: "IN",
              value: { list: paymentIds.map((v) => ({ value: v })) },
            },
          ];
          const r2 = await ontraportRequest(
            `/Products?condition=${JSON.stringify(cond2)}`
          );
          (r2?.data || []).forEach((row) => {
            const key = row?.product_id_payment ?? row?.Product_ID_Payment;
            if (key != null && row.id != null) {
              map.set(String(key), String(row.id));
            }
          });
        } catch {}
        return map;
      } catch {
        return new Map();
      }
    };

    // Normalize offer numbers to 2 decimals and ensure consistency
    const normalizedOffer = (() => {
      if (!offer || !Array.isArray(offer.products)) return offer;
      const products = offer.products.map((p) => {
        const qty = Number(p.quantity) || 0;
        const totalNum = Math.max(
          0,
          Math.round(
            (typeof p.total === "string"
              ? Number(p.total)
              : Number(p.total) || 0) * 100
          ) / 100
        );
        const priceNum = Math.max(
          0,
          Math.round(
            (typeof p.price === "string"
              ? Number(p.price)
              : Number(p.price) || (qty ? totalNum / qty : 0)) * 100
          ) / 100
        );
        const amountNum = priceNum;
        return {
          ...p,
          total: totalNum.toFixed(2),
          price: priceNum.toFixed(2),
          amount: amountNum.toFixed(2),
          price_each: priceNum.toFixed(2),
          unit_price: priceNum.toFixed(2),
          price_override: 1,
          override_product_price: 1,
        };
      });
      const shipping = Array.isArray(offer.shipping)
        ? offer.shipping.map((s) => ({
            ...s,
            price: Math.max(0, Math.round((Number(s.price) || 0) * 100) / 100),
          }))
        : [];
      const subTotal = Math.max(
        0,
        Math.round(
          (Number(offer.subTotal) ||
            products.reduce((sum, p) => sum + p.total, 0)) * 100
        ) / 100
      );
      const shippingTotal = shipping.reduce(
        (sum, s) => sum + (Number(s.price) || 0),
        0
      );
      const grandTotal = Math.max(
        0,
        Math.round(
          (Number(offer.grandTotal) || subTotal + shippingTotal) * 100
        ) / 100
      );
      return {
        ...offer,
        products,
        shipping,
        subTotal: subTotal.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      };
    })();

    // Attempt to replace Product_ID_Payment ids with Ontraport product ids
    if (
      normalizedOffer &&
      Array.isArray(normalizedOffer.products) &&
      normalizedOffer.products.length
    ) {
      const map = await translatePaymentToProductIds(normalizedOffer.products);
      let priceIdMap = {};
      try {
        priceIdMap = JSON.parse(process.env.PRODUCT_PRICE_ID_MAP || "{}");
      } catch {}
      normalizedOffer.products = normalizedOffer.products.map((p) => {
        const paymentId = p.id ? String(p.id) : undefined;
        const ontraportProductId =
          map.get(paymentId || "") || p.product_id || p.id;
        const unitPrice =
          Number(p.price) || Number(p.amount) || Number(p.total) || 0;
        const priceId =
          priceIdMap[paymentId || ontraportProductId] ||
          priceIdMap[ontraportProductId] ||
          priceIdMap[paymentId || ""] ||
          undefined;
        const priceArray = [
          {
            price: unitPrice,
            payment_count: 0,
            unit: "month",
            id: priceId ? Number(priceId) : undefined,
          },
        ];
        const next = {
          ...p,
          id: String(ontraportProductId),
          product_id: String(ontraportProductId),
          // Ontraport expects `price` as an array of price objects
          price: priceArray,
          // keep flags
          shipping: Boolean(p.shipping),
          tax: Boolean(p.taxable),
        };
        return next;
      });
      console.log("[TX] normalized products", normalizedOffer.products);
    }

    const payload = {
      contact_id: contactId,
      chargeNow: "chargeNow",
      trans_date: Math.floor(Date.now() / 1000),
      invoice_template: parseInt(invoice_template),
      gateway_id: parseInt(gateway_id),
      offer: normalizedOffer || offer,
      billing_address,
      payer,
      external_order_id: external_order_id || `WEB-${Date.now()}`,
      customer_note: customer_note || "",
      internal_note: internal_note || "",
    };

    const data = await ontraportRequest("/transaction/processManual", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const dispenseContactId = [
      contactId,
      data?.contact_id,
      data?.order?.contact_id,
      data?.order?.contactId,
      data?.order?.contact?.id,
      data?.order?.contact?.ID,
      data?.order?.contact?.contact_id,
      data?.order?.payer?.id,
      data?.order?.payer?.ID,
      data?.payer_id,
      data?.payer?.id,
      data?.payer?.ID,
      payer?.contact_id,
      payer?.id,
      payer?.ID,
      payer?.contact?.id,
      payer?.contact?.ID,
      payer?.contactId,
    ].find((value) => value != null && value !== "");

    const dispensesMeta = Array.isArray(req.body?.dispenses)
      ? req.body.dispenses
      : [];

    const updates = [];
    const productsWithExistingDispense = new Set();

    dispensesMeta.forEach((entry) => {
      if (!entry) return;
      const dispenseId = safeString(entry.dispenseId);
      const productKey = safeString(
        entry.productUniqueId || entry.productId || entry.product_id || entry.id
      );
      if (dispenseId) {
        updates.push({
          id: dispenseId,
          quantity: entry.quantity,
          retailPrice: entry.retailPrice,
          retailGst: entry.retailGst,
          wholesalePrice: entry.wholesalePrice,
          scriptId: entry.scriptId,
          pharmacyId: entry.pharmacyId,
        });
        if (productKey) productsWithExistingDispense.add(productKey);
      }
    });

    if (updates.length) {
      try {
        await updateDispenses(updates, {
          status: DISPENSE_STATUS_PAID,
          contactId: dispenseContactId,
        });
      } catch (err) {
        console.error("[Dispense] update failed", err);
      }
    }

    const productsForCreation = Array.isArray(offerForDispense?.products)
      ? offerForDispense.products.filter((product) => {
          const key = safeString(
            product.original_product_id ||
              product.product_id ||
              product.id ||
              product.payment_id ||
              product.Payment_ID
          );
          if (!key) return true;
          return !productsWithExistingDispense.has(key);
        })
      : [];

    if (productsForCreation.length) {
      createDispenses({
        contactId: dispenseContactId,
        offer: { ...offerForDispense, products: productsForCreation },
      }).catch((err) => {
        console.error("[Dispense] creation failed", err);
      });
    }
    
    res.json({
      success: true,
      transaction_id: data.transaction_id,
      invoice_id: data.invoice_id,
      order_id: data.order_id,
    });
  } catch (err) {
    handleError(err, req, res);
  }
});

// Legacy endpoint for backward compatibility
app.post("/api-thc/contacts/saveorupdate", async (req, res) => {
  try {
    const { firstname, lastname, email, sms_number } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required" });
    }

    const payload = {
      firstname: firstname || "",
      lastname: lastname || "",
      email,
      sms_number: sms_number || "",
      update_by: "email",
    };

    const data = await ontraportRequest("/Contacts/saveorupdate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    res.json(data);
  } catch (err) {
    handleError(err, req, res);
  }
});

// Error handling middleware
app.use(handleError);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
