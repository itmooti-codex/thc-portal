import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { OfferEngine } from "./offer-engine.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors("*"));
app.use(express.json());

// Ontraport configuration
const ONTRAPORT_BASE_URL =
  process.env.ONTRAPORT_BASE_URL || "https://api.ontraport.com/1";
const ONTRAPORT_APP_ID = process.env.ONTRAPORT_APP_ID;
const ONTRAPORT_API_KEY = process.env.ONTRAPORT_API_KEY;
const DUMMY_GATEWAY_ID = process.env.DUMMY_GATEWAY_ID || "1";

// Initialize offer engine
const offerEngine = new OfferEngine();

// Helper function to make Ontraport API calls
const ontraportRequest = async (endpoint, options = {}) => {
  if (!ONTRAPORT_APP_ID || !ONTRAPORT_API_KEY) {
    throw new Error("Missing Ontraport credentials");
  }

  const url = `${ONTRAPORT_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "Api-Appid": ONTRAPORT_APP_ID,
    "Api-Key": ONTRAPORT_API_KEY,
    Accept: "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Ontraport API error: ${response.status} - ${JSON.stringify(data)}`
    );
  }

  return data;
};

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
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Contact save endpoint (updated to match requirements)
app.post("/api/contact/save", async (req, res) => {
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
    } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required" });
    }

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
      update_by: "email",
    };

    // If contactId provided, try to update existing contact
    if (contactId) {
      payload.id = contactId;
    }

    const data = await ontraportRequest("/Contacts/saveorupdate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(data);
    res.json({ contactId: data?.data?.id || data?.data?.attrs?.id || contactId });
  } catch (err) {
    handleError(err, req, res);
  }
});

// Coupon validation endpoint
app.post("/api/coupons/validate", async (req, res) => {
  try {
    const { contactId, codes, cartProductIds } = req.body || {};

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.json({ applied: null, reasons: {} });
    }

    // Step 1: Check existence
    const existenceFilter = {
      field: { field: "coupon_code" },
      op: "IN",
      value: { list: codes.map((c) => ({ value: c })) },
    };

    const existingCoupons = await ontraportRequest(
      "/CouponCodes?range=1&count=false",
      {
        method: "POST",
        body: JSON.stringify([existenceFilter]),
      }
    );

    const existingCodes = new Map();
    existingCoupons.data?.forEach((coupon) => {
      existingCodes.set(coupon.coupon_code, coupon);
    });

    const reasons = {};
    let appliedCoupon = null;

    // Check each code
    for (const code of codes) {
      if (!existingCodes.has(code)) {
        reasons[code] = "not_found";
        continue;
      }

      const coupon = existingCodes.get(code);

      // Step 2: Check validity/expiration
      const couponDetails = await ontraportRequest(
        `/CouponCode?id=${coupon.id}`
      );
      const expiration = couponDetails.expiration_date;

      if (expiration) {
        const expTime = expiration * 1000; // Convert to milliseconds
        if (expTime < Date.now()) {
          reasons[code] = "expired";
          continue;
        }
      }

      // Step 3: Check if already used by this contact
      if (contactId) {
        const purchases = await ontraportRequest(
          "/Purchases?range=50&sortDir=desc&count=false"
        );
        const usedByContact = purchases.data?.some(
          (purchase) =>
            purchase.contact_id === contactId &&
            purchase.coupon_id === coupon.id
        );

        if (usedByContact) {
          reasons[code] = "already_used";
          continue;
        }
      }

      // Step 4: Check product applicability
      if (coupon.product_selection === "specific") {
        const productFilter = {
          field: { field: "coupon_id" },
          op: "IN",
          value: { list: [{ value: coupon.id }] },
        };

        const couponProducts = await ontraportRequest(
          "/CouponProducts?range=50&count=false",
          {
            method: "POST",
            body: JSON.stringify([productFilter]),
          }
        );

        const applicableProductIds =
          couponProducts.data?.map((cp) => cp.product_id) || [];
        const hasApplicableProduct = cartProductIds.some((id) =>
          applicableProductIds.includes(id)
        );

        if (!hasApplicableProduct) {
          reasons[code] = "not_applicable";
          continue;
        }
      }

      // If we get here, the coupon is valid
      if (!appliedCoupon) {
        appliedCoupon = {
          id: coupon.id,
          coupon_code: coupon.coupon_code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          product_selection: coupon.product_selection,
          recurring: coupon.recurring,
        };
        reasons[code] = null;
      } else {
        reasons[code] = "not_applied_multiple";
      }
    }

    // Mark remaining codes as not applied
    codes.forEach((code) => {
      if (!(code in reasons)) {
        reasons[code] = "not_applied_multiple";
      }
    });

    res.json({ applied: appliedCoupon, reasons });
  } catch (err) {
    handleError(err, req, res);
  }
});

// Shipping types endpoint
app.get("/api/shipping/types", async (req, res) => {
  try {
    const { allowed } = req.query;

    const shippingTypes = await ontraportRequest(
      "/Shippingtypes?range=50&count=false"
    );

    let types = shippingTypes.data || [];

    if (allowed) {
      const allowedIds = allowed.split(",").map((id) => parseInt(id.trim()));
      types = types.filter((type) => allowedIds.includes(type.id));
    }

    res.json(types);
  } catch (err) {
    handleError(err, req, res);
  }
});

// Offer building endpoint
app.post("/api/offer/build", async (req, res) => {
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
app.post("/api/transaction/process", async (req, res) => {
  try {
    const {
      contactId,
      billing_address,
      payer,
      offer,
      external_order_id,
      invoice_template = 1,
      gateway_id = DUMMY_GATEWAY_ID,
      customer_note,
      internal_note,
    } = req.body || {};

    if (!contactId || !billing_address || !payer || !offer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const payload = {
      contact_id: contactId,
      chargeNow: "chargeNow",
      trans_date: Date.now(),
      invoice_template: parseInt(invoice_template),
      gateway_id: parseInt(gateway_id),
      offer,
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
app.post("/api/contacts/saveorupdate", async (req, res) => {
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
