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

    const condition = encodeURIComponent(
      JSON.stringify([{ field: "contact_id", op: "=", value: String(id) }])
    );
    const response = await ontraportRequest(
      `/CreditCards?range=50&count=false&condition=${condition}`
    );

    const cards = Array.isArray(response?.data) ? response.data : [];
    res.json({ cards });
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
