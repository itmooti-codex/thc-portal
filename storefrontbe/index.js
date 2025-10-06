import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import dotenv from "dotenv";
import { OfferEngine } from "./offer-engine.js";
import { ontraportRequest } from "./utils.js";
import { applyCoupons, validateCouponExistence } from "./coupon-validate.service.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;


// CORS configuration
app.use(cors("*"));
app.use(express.json());

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
app.post("/api-thc/coupons/validate", async (req, res) => {
  try {
    const { contactId, codes, cartProductIds } = req.body || {};

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.json({ applied: null, reasons: {} });
    }
    // Step 1: Check existence

    const existingCodes = await validateCouponExistence(codes);

    const response = await applyCoupons(existingCodes, codes, contactId)



    res.json(response);
  } catch (err) {
    console.log("error is ", err)
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
      const allowedIds = allowed.split(",").map((id) => parseInt(id.trim()));
      types = types.filter((type) => allowedIds.includes(type.id));
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


// [{
//   "field":{"field":"id"},
//   "op":"IN",
//   "value":{"list":[{"value":"123XXX"},{"value":"50VOL"}]}
//   }]