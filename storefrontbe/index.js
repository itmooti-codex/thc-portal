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
      success: true,
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
        value: { value: String(id) },
      },
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

app.get("/api-thc/taxes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const resolvedId = typeof id === "string" ? id.trim() : "";
    if (!resolvedId) {
      return res.status(400).json({ error: "Tax ID is required" });
    }

    const response = await ontraportRequest(
      "/Taxtypes?range=50&count=false"
    );

    const taxes = Array.isArray(response?.data) ? response.data : [];
    const matchesId = (value) => {
      if (value === undefined || value === null) return false;
      return String(value).trim() === resolvedId;
    };

    const tax = taxes.find((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const candidates = [
        entry.id,
        entry.tax_id,
        entry.taxId,
        entry.form_id,
        entry.formId,
      ];
      return candidates.some(matchesId);
    });

    if (!tax) {
      return res.status(404).json({ error: "Tax not found" });
    }

    res.json({ tax });
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

const DISPENSE_STATUS_LABELS = {
  146: "Cancelled",
  147: "In Transit",
  148: "Confirmed - In Progress",
  149: "In Cart",
  151: "Payment Processing",
  152: "Paid",
  326: "Sent – Awaiting Confirmation",
  327: "Payment Issue",
  605: "Tracking Added",
  675: "On Hold",
  677: "Fulfilled",
};
const DISPENSE_STATUS_BY_NAME = Object.entries(DISPENSE_STATUS_LABELS).reduce(
  (map, [id, label]) => {
    if (label) map[label.toLowerCase()] = id;
    return map;
  },
  {}
);

const normaliseDispenseRecord = (record) => {
  if (!record) return null;
  const rawId =
    record.id ??
    record.ID ??
    record.dispense_id ??
    record.Dispense_ID ??
    record.unique_id ??
    record.uniqueId;
  const id = rawId != null ? String(rawId).trim() : "";
  if (!id) return null;
  const rawItemId =
    record.f3183 ??
    record.item_id ??
    record.Item_ID ??
    record.itemId ??
    record.ItemId;
  const itemId =
    rawItemId != null && String(rawItemId).trim()
      ? String(rawItemId).trim()
      : null;
  const statusIdCandidates = [
    record.f2261,
    record.dispense_status_id,
    record.dispenseStatusId,
    record.statusId,
  ]
    .map((value) => (value == null ? "" : String(value).trim()))
    .filter(Boolean);
  let statusId =
    statusIdCandidates.find((value) => DISPENSE_STATUS_LABELS[value]) || null;
  let statusLabel = null;
  if (!statusId && statusIdCandidates.length) {
    statusId = statusIdCandidates[0];
  }
  const statusLabelCandidates = [
    record.dispense_status,
    record.dispenseStatus,
    record.dispense_status_label,
    record.dispenseStatusLabel,
    record.status,
    record.Status,
  ]
    .map((value) => (value == null ? "" : String(value).trim()))
    .filter(Boolean);
  statusLabel =
    statusLabelCandidates[0] ||
    (statusId ? DISPENSE_STATUS_LABELS[statusId] : null) ||
    null;
  if (!statusId && statusLabel) {
    statusId = DISPENSE_STATUS_BY_NAME[statusLabel.toLowerCase()] || null;
  } else if (statusId && !statusLabel) {
    statusLabel = DISPENSE_STATUS_LABELS[statusId] || null;
  }
  const quantityRaw = record.f2838 ?? record.quantity ?? record.qty;
  const retailPriceRaw = record.f2302 ?? record.retail_price ?? record.price;
  const retailGstRaw = record.f2806 ?? record.retail_gst ?? record.gst;
  const wholesalePriceRaw = record.f2303 ?? record.wholesale_price;
  const patientIdRaw =
    record.f2787 ??
    record.patient_id ??
    record.patientId ??
    record.contact_id ??
    record.contactId;
  const shippingCompanyRaw = record.f2708 ?? record.shipping_company;
  const updatedRaw = record.dlm ?? record.date ?? record.updated_at;
  return {
    id,
    itemId,
    statusId: statusId || null,
    statusLabel: statusLabel || null,
    quantity:
      quantityRaw !== undefined && quantityRaw !== null
        ? Number(quantityRaw) || 0
        : null,
    retailPrice:
      retailPriceRaw !== undefined && retailPriceRaw !== null
        ? Number(retailPriceRaw) || 0
        : null,
    retailGst:
      retailGstRaw !== undefined && retailGstRaw !== null
        ? Number(retailGstRaw) || 0
        : null,
    wholesalePrice:
      wholesalePriceRaw !== undefined && wholesalePriceRaw !== null
        ? Number(wholesalePriceRaw) || 0
        : null,
    patientId:
      patientIdRaw !== undefined && patientIdRaw !== null
        ? String(patientIdRaw).trim() || null
        : null,
    shippingCompany:
      shippingCompanyRaw !== undefined && shippingCompanyRaw !== null
        ? String(shippingCompanyRaw).trim() || null
        : null,
    updated:
      updatedRaw !== undefined && updatedRaw !== null
        ? Number(updatedRaw) || null
        : null,
    raw: record,
  };
};

const unwrapDispenseResponse = (payload) => {
  if (!payload) return null;
  if (payload.data) {
    if (Array.isArray(payload.data) && payload.data.length) {
      const record =
        payload.data.find((entry) => entry && typeof entry === "object") ||
        payload.data[0];
      return normaliseDispenseRecord(record);
    }
    if (typeof payload.data === "object") {
      return normaliseDispenseRecord(payload.data);
    }
  }
  if (Array.isArray(payload) && payload.length) {
    const record =
      payload.find((entry) => entry && typeof entry === "object") || payload[0];
    return normaliseDispenseRecord(record);
  }
  if (typeof payload === "object") {
    return normaliseDispenseRecord(payload);
  }
  return null;
};

const buildConditionPayload = (filters = []) => {
  const sequence = [];
  filters.forEach((filter, index) => {
    if (!filter || typeof filter !== "object") return;
    if (index > 0) sequence.push("AND");
    sequence.push(filter);
  });
  return JSON.stringify(sequence);
};

const normaliseScriptRecord = (record, fallbackId) => {
  if (!record) return null;
  const scriptId =
    String(
      record.id ??
        record.ID ??
        record.script_id ??
        record.Script_ID ??
        record.f2790 ??
        fallbackId ??
        ""
    ).trim() || null;

  const dispenseIdCandidates = [
    record.dispenseID,
    record.dispenseId,
    record.Dispense_ID,
    record.DispenseId,
    record.dispense_id,
    record.current_dispense_id,
    record.f2791,
    record.f2792,
  ];
  const dispenseId =
    dispenseIdCandidates
      .map((value) => (value == null ? "" : String(value).trim()))
      .find((value) => value.length) || null;

  const statusTextCandidates = [
    record.dispenseStatus,
    record.Dispense_Status,
    record.dispense_status,
    record.current_dispense_status,
  ];
  let statusLabel =
    statusTextCandidates
      .map((value) => (value == null ? "" : String(value).trim()))
      .find((value) => value.length) || null;

  const statusIdCandidates = [
    record.dispenseStatusId,
    record.dispense_status_id,
    record.f2261,
    record.F2261,
  ]
    .map((value) => (value == null ? "" : String(value).trim()))
    .filter((value) => value.length);

  let statusId =
    statusIdCandidates.find((value) => DISPENSE_STATUS_LABELS[value]) || null;
  if (!statusId && statusLabel) {
    statusId = DISPENSE_STATUS_BY_NAME[statusLabel.toLowerCase()] || null;
  } else if (!statusLabel && statusId) {
    statusLabel = DISPENSE_STATUS_LABELS[statusId] || null;
  }

  return {
    id: scriptId,
    dispenseId,
    dispenseStatusId: statusId,
    dispenseStatusLabel: statusLabel,
    raw: record,
  };
};

const fetchScriptRecord = async (scriptId) => {
  if (!scriptId) return null;
  const id = String(scriptId).trim();
  if (!id) return null;

  const query = new URLSearchParams({ id });
  const response = await ontraportRequest(`/Scripts?${query.toString()}`);
  const data = response?.data ?? response;
  const record = Array.isArray(data) ? data[0] : data;
  return normaliseScriptRecord(record, id);
};

const resolveDispenseStatusId = (input) => {
  if (!input && input !== 0) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  if (DISPENSE_STATUS_LABELS[raw]) return raw;
  const lower = raw.toLowerCase();
  return DISPENSE_STATUS_BY_NAME[lower] || null;
};

app.get("/api-thc/dispenses", async (req, res) => {
  try {
    const {
      contactId,
      statusId,
      statusIds,
      limit = 100,
      offset = 0,
    } = req.query || {};
    const patientId = contactId != null ? String(contactId).trim() : "";
    if (!patientId) {
      return res.status(400).json({ error: "contactId is required" });
    }
    const filters = [
      {
        field: { field: "f2787" },
        op: "=",
        value: { value: patientId },
      },
    ];
    const statusList = [];
    if (statusId != null && String(statusId).trim()) {
      statusList.push(String(statusId).trim());
    }
    if (statusIds) {
      const ids = Array.isArray(statusIds)
        ? statusIds
        : String(statusIds)
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
      statusList.push(...ids);
    }
    const resolvedStatusIds = Array.from(
      new Set(
        statusList
          .map((value) => resolveDispenseStatusId(value))
          .filter(Boolean)
      )
    );
    if (resolvedStatusIds.length === 1) {
      filters.push({
        field: { field: "f2261" },
        op: "=",
        value: { value: resolvedStatusIds[0] },
      });
    } else if (resolvedStatusIds.length > 1) {
      filters.push({
        field: { field: "f2261" },
        op: "IN",
        value: { value: resolvedStatusIds },
      });
    }
    const query = new URLSearchParams({
      range: String(Math.max(1, Math.min(200, Number(limit) || 100))),
      start: String(Math.max(0, Number(offset) || 0)),
      count: "false",
      condition: buildConditionPayload(filters),
    });
    const response = await ontraportRequest(`/Dispenses?${query.toString()}`);
    const rawData = Array.isArray(response?.data) ? response.data : [];
    const dispenses = rawData
      .map((record) => normaliseDispenseRecord(record))
      .filter(
        (entry) =>
          entry &&
          entry.itemId &&
          entry.itemId !== "0" &&
          entry.itemId.toLowerCase() !== "null"
      )
      .sort((a, b) => {
        const aTime = a.updated || 0;
        const bTime = b.updated || 0;
        return bTime - aTime;
      });
    res.json({ dispenses });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.post("/api-thc/dispenses", async (req, res) => {
  try {
    const {
      itemId,
      contactId,
      statusId,
      status,
      quantity,
      retailPrice,
      retailGst,
      wholesalePrice,
      shippingCompany,
    } = req.body || {};
    const resolvedItemId = itemId != null ? String(itemId).trim() : "";
    if (!resolvedItemId) {
      return res.status(400).json({ error: "itemId is required" });
    }
    const patientId = contactId != null ? String(contactId).trim() : "";
    if (!patientId) {
      return res.status(400).json({ error: "contactId is required" });
    }
    const resolvedStatusId =
      resolveDispenseStatusId(statusId) ||
      resolveDispenseStatusId(status) ||
      "149";
    const payload = {
      f3183: resolvedItemId,
      f2787: patientId,
      f2261: resolvedStatusId,
    };
    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (Number.isFinite(qty) && qty > 0) {
        payload.f2838 = qty;
      }
    }
    if (retailPrice !== undefined) {
      const price = Number(retailPrice);
      if (Number.isFinite(price)) {
        payload.f2302 = price.toFixed(2);
      }
    }
    if (retailGst !== undefined) {
      const gst = Number(retailGst);
      if (Number.isFinite(gst)) {
        payload.f2806 = gst.toFixed(2);
      }
    }
    if (wholesalePrice !== undefined) {
      const wholesale = Number(wholesalePrice);
      if (Number.isFinite(wholesale)) {
        payload.f2303 = wholesale.toFixed(2);
      }
    }
    if (shippingCompany !== undefined && shippingCompany !== null) {
      const shippingId = String(shippingCompany).trim();
      if (shippingId) {
        payload.f2708 = shippingId;
      }
    }
    const response = await ontraportRequest("/Dispenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const dispense = unwrapDispenseResponse(response);
    res.json({
      success: true,
      dispense,
    });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.patch("/api-thc/dispenses/:dispenseId", async (req, res) => {
  try {
    const dispenseId = String(req.params.dispenseId || "").trim();
    if (!dispenseId) {
      return res.status(400).json({ error: "dispenseId is required" });
    }
    const {
      status,
      statusId,
      quantity,
      retailPrice,
      retailGst,
      wholesalePrice,
      shippingCompany,
      contactId,
      patientId,
    } = req.body || {};
    const payload = { id: dispenseId };
    const resolvedStatusId =
      resolveDispenseStatusId(statusId) || resolveDispenseStatusId(status);
    if (resolvedStatusId) {
      payload.f2261 = resolvedStatusId;
    }
    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (Number.isFinite(qty) && qty >= 0) {
        payload.f2838 = qty;
      }
    }
    if (retailPrice !== undefined) {
      const price = Number(retailPrice);
      if (Number.isFinite(price)) {
        payload.f2302 = price.toFixed(2);
      } else if (retailPrice === null) {
        payload.f2302 = "";
      }
    }
    if (retailGst !== undefined) {
      const gst = Number(retailGst);
      if (Number.isFinite(gst)) {
        payload.f2806 = gst.toFixed(2);
      } else if (retailGst === null) {
        payload.f2806 = "";
      }
    }
    if (wholesalePrice !== undefined) {
      const wholesale = Number(wholesalePrice);
      if (Number.isFinite(wholesale)) {
        payload.f2303 = wholesale.toFixed(2);
      } else if (wholesalePrice === null) {
        payload.f2303 = "";
      }
    }
    if (shippingCompany !== undefined) {
      const shippingId =
        shippingCompany === null ? "" : String(shippingCompany).trim();
      payload.f2708 = shippingId;
    }
    const patientValue =
      patientId != null
        ? String(patientId).trim()
        : contactId != null
        ? String(contactId).trim()
        : "";
    if (patientValue) {
      payload.f2787 = patientValue;
    }
    const response = await ontraportRequest("/Dispenses", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const dispense = unwrapDispenseResponse(response) || {
      id: dispenseId,
      statusId: payload.f2261 || null,
    };
    res.json({
      success: true,
      dispense,
    });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.get("/api-thc/scripts/:scriptId", async (req, res) => {
  try {
    const scriptId = String(req.params.scriptId || "").trim();
    if (!scriptId) {
      return res.status(400).json({ error: "scriptId is required" });
    }

    const script = await fetchScriptRecord(scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    res.json({ success: true, script });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.post("/api-thc/scripts/:scriptId/dispense", async (req, res) => {
  try {
    const scriptId = String(req.params.scriptId || "").trim();
    if (!scriptId) {
      return res.status(400).json({ error: "scriptId is required" });
    }

    const body = new URLSearchParams({ id: scriptId, f3163: "1" }).toString();
    await ontraportRequest("/Scripts", {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    let script = null;
    try {
      script = await fetchScriptRecord(scriptId);
    } catch (innerErr) {
      console.warn("[Dispense] fetch after trigger failed", innerErr);
    }

    res.json({ success: true, script });
  } catch (err) {
    handleError(err, req, res);
  }
});

app.put("/api-thc/dispenses/:dispenseId/status", async (req, res) => {
  try {
    const dispenseId = String(req.params.dispenseId || "").trim();
    if (!dispenseId) {
      return res.status(400).json({ error: "dispenseId is required" });
    }

    const { status, statusId } = req.body || {};
    const resolvedStatusId =
      resolveDispenseStatusId(statusId) || resolveDispenseStatusId(status);

    if (!resolvedStatusId) {
      return res
        .status(400)
        .json({ error: "A valid dispense status is required" });
    }

    const body = new URLSearchParams({
      id: dispenseId,
      f2261: resolvedStatusId,
    }).toString();
    await ontraportRequest("/Dispenses", {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    res.json({
      success: true,
      statusId: resolvedStatusId,
      statusLabel: DISPENSE_STATUS_LABELS[resolvedStatusId] || null,
    });
  } catch (err) {
    handleError(err, req, res);
  }
});

const STARTRACK_MATCHER = /star\s*track/i;
const STARTRACK_OPTION_ID = "328";

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
        ? offer.shipping
            .map((s) => {
              if (!s) return null;
              const rawPrice = Number(s.price) || 0;
              const price = Math.max(
                0,
                Math.round(rawPrice * 100) / 100
              );
              const resolvedId = (() => {
                const candidates = [
                  s.id,
                  s.shipping_type_id,
                  s.shippingTypeId,
                  s.shipping_type,
                  s.shippingId,
                  s.code,
                ];
                for (const candidate of candidates) {
                  if (
                    candidate !== undefined &&
                    candidate !== null &&
                    String(candidate).trim() !== ""
                  ) {
                    const num = Number(candidate);
                    if (Number.isFinite(num)) return num;
                    return String(candidate);
                  }
                }
                return null;
              })();
              if (
                resolvedId === null ||
                resolvedId === undefined ||
                resolvedId === ""
              ) {
                return null;
              }
              return {
                ...s,
                id: resolvedId,
                price,
              };
            })
            .filter(Boolean)
        : [];
      const taxes = Array.isArray(offer.taxes)
        ? offer.taxes
            .map((t) => {
              if (!t) return null;
              const resolvedId = (() => {
                const candidates = [
                  t.id,
                  t.tax_id,
                  t.taxId,
                  t.form_id,
                  t.formId,
                ];
                for (const candidate of candidates) {
                  if (
                    candidate !== undefined &&
                    candidate !== null &&
                    String(candidate).trim() !== ""
                  ) {
                    const str = String(candidate).trim();
                    const num = Number(str);
                    if (Number.isFinite(num)) return num;
                    return str;
                  }
                }
                return null;
              })();
              if (
                resolvedId === null ||
                resolvedId === undefined ||
                resolvedId === ""
              ) {
                return null;
              }
              const resolveNumber = (value) => {
                if (value === null || value === undefined || value === "") {
                  return undefined;
                }
                const num = Number(value);
                return Number.isFinite(num) ? num : undefined;
              };
              const rate =
                resolveNumber(t.rate) ??
                resolveNumber(t.tax_rate) ??
                resolveNumber(t.percentage);
              const taxTotal =
                resolveNumber(t.taxTotal) ??
                resolveNumber(t.tax_total) ??
                resolveNumber(t.total) ??
                resolveNumber(t.amount) ??
                0;
              const name = (() => {
                const raw =
                  t.name ??
                  t.tax_name ??
                  t.label ??
                  t.description ??
                  t.taxLabel;
                if (raw === undefined || raw === null) return undefined;
                const str = String(raw);
                return str;
              })();
              const formIdRaw =
                t.form_id ??
                t.formId ??
                t.tax_id ??
                t.taxId ??
                resolvedId;
              const formId = (() => {
                if (formIdRaw === null || formIdRaw === undefined || formIdRaw === "") {
                  return resolvedId;
                }
                const str = String(formIdRaw).trim();
                if (!str) return resolvedId;
                const num = Number(str);
                if (Number.isFinite(num)) return num;
                return str;
              })();
              const taxShippingRaw =
                t.taxShipping ??
                t.tax_shipping ??
                t.apply_to_shipping ??
                t.applyShipping ??
                t.taxOnShipping ??
                t.shipping;
              const taxShipping = (() => {
                if (taxShippingRaw === null || taxShippingRaw === undefined) {
                  return false;
                }
                if (typeof taxShippingRaw === "string") {
                  const normalized = taxShippingRaw.trim().toLowerCase();
                  if (!normalized) return false;
                  return ["1", "true", "yes", "y", "on"].includes(normalized);
                }
                return Boolean(taxShippingRaw);
              })();
              return {
                ...t,
                id: resolvedId,
                form_id: formId,
                rate: rate ?? 0,
                taxTotal: Number.isFinite(taxTotal) ? taxTotal : 0,
                name,
                taxShipping,
              };
            })
            .filter(Boolean)
        : [];
      const subTotal = Math.max(
        0,
        Math.round(
          (Number(offer.subTotal) ||
            products.reduce((sum, p) => sum + (Number(p.total) || 0), 0)) * 100
        ) / 100
      );
      const subTotalBeforeDiscount = Math.max(
        0,
        Math.round(
          (Number(offer.subTotalBeforeDiscount) || Number(offer.subTotal) ||
            subTotal) * 100
        ) / 100
      );
      const shippingTotal = shipping.reduce(
        (sum, s) => sum + (Number(s.price) || 0),
        0
      );
      const discountTotal = Math.max(
        0,
        Math.round(
          (Number(offer.discountTotal) ||
            Number(offer.discount) ||
            (subTotalBeforeDiscount - subTotal)) * 100
        ) / 100
      );
      const subTotalAfterDiscount = Math.max(
        0,
        Math.round(
          (Number(offer.subTotalAfterDiscount) ||
            Number(offer.netSubtotal) ||
            (subTotalBeforeDiscount - discountTotal)) * 100
        ) / 100
      );
      const grandTotal = Math.max(
        0,
        Math.round(
          (Number(offer.grandTotal) ||
            subTotalAfterDiscount + shippingTotal) * 100
        ) / 100
      );
      return {
        ...offer,
        products,
        shipping,
        taxes,
        subTotal: subTotalBeforeDiscount.toFixed(2),
        subTotalBeforeDiscount: subTotalBeforeDiscount.toFixed(2),
        subTotalAfterDiscount: subTotalAfterDiscount.toFixed(2),
        netSubtotal: subTotalAfterDiscount.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        discount: discountTotal.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        hasTaxes: taxes.length > 0,
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
      trans_date: Date.now(),
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
