import { ontraportRequest } from "./utils.js";

// Fetch coupons that exist by their public/master codes
export async function validateCouponExistence(codes) {
  // Build a single IN filter that includes original, upper, and lower variants
  const originals = Array.from(new Set(codes.map((c) => String(c || ""))));
  const uppers = originals.map((c) => c.toUpperCase());
  const lowers = originals.map((c) => c.toLowerCase());
  const allVariants = Array.from(new Set([...originals, ...uppers, ...lowers]));

  const existenceFilter = {
    field: { field: "coupon_code" },
    op: "IN",
    value: { list: allVariants.map((c) => ({ value: c })) },
  };

  const existingCoupons = await ontraportRequest(
    `/Coupons?condition=${JSON.stringify([existenceFilter])}`,
    { method: "GET" }
  );
  console.log('[CV] existence query', { codes: originals, variants: allVariants, count: existingCoupons?.data?.length });

  // Index found coupons by lowercase for flexible matching
  const byLower = new Map();
  (existingCoupons?.data || []).forEach((coupon) => {
    const code = coupon?.coupon_code;
    if (typeof code === "string" && code.length > 0) {
      const key = code.toLowerCase();
      if (!byLower.has(key)) byLower.set(key, coupon);
    }
  });

  // Return a Map keyed by the original requested codes with the resolved coupon (if any)
  const resolved = new Map();
  originals.forEach((requested) => {
    const exact = (existingCoupons?.data || []).find((c) => c?.coupon_code === requested);
    if (exact) {
      resolved.set(requested, exact);
      return;
    }
    const lower = requested.toLowerCase();
    if (byLower.has(lower)) {
      resolved.set(requested, byLower.get(lower));
    }
  });
  console.log('[CV] resolved map', Object.fromEntries(resolved.entries()));

  return resolved;
}

const isTruthy = (v) => v === 1 || v === true || v === "1" || v === "Yes" || v === "yes";

export async function isExpired(coupon, now = Date.now()) {
  const expiration = Number(coupon?.valid_end_date);
  if (expiration && !isNaN(expiration)) {
    const expTimeMs = expiration * 1000; // epoch seconds → ms
    if (expTimeMs < now) return true;
  }
  return false;
}

export async function isCouponUsed(contactId, couponId) {
  if (!contactId || !couponId) return false;
  const filterQuery = [
    { field: { field: "contact_id" }, op: "=", value: { value: String(contactId) } },
    "AND",
    { field: { field: "coupon_id" }, op: "=", value: { value: String(couponId) } },
  ];

  const data = await ontraportRequest(
    `/Purchases?condition=${JSON.stringify(filterQuery)}`
  );
  return Array.isArray(data?.data) && data.data.length > 0;
}

async function fetchApplicableProducts(couponId) {
  try {
    if (!couponId) return [];
    const condition = [
      { field: { field: "coupon_id" }, op: "=", value: { value: String(couponId) } },
    ];
    const mapping = await ontraportRequest(
      `/CouponProducts?condition=${JSON.stringify(condition)}`,
      { method: "GET" }
    );
    const rows = Array.isArray(mapping?.data) ? mapping.data : [];
    const ids = rows
      .map((r) => r?.product_id)
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v));
    return Array.from(new Set(ids));
  } catch (err) {
    // If mapping fetch fails, return empty to avoid blocking checkout
    return [];
  }
}

// Translate Ontraport Product ids → their payment ids (Product_ID_Payment)
async function translateToPaymentIds(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) return [];
  try {
    const unique = Array.from(new Set(productIds.map(String)));
    const condition = [{
      field: { field: "id" },
      op: "IN",
      value: { list: unique.map((id) => ({ value: id })) }
    }];
    const resp = await ontraportRequest(
      `/Products?condition=${JSON.stringify(condition)}`,
      { method: "GET" }
    );
    const rows = Array.isArray(resp?.data) ? resp.data : [];
    const paymentIds = rows
      .map((p) => p?.Product_ID_Payment || p?.product_id_payment || p?.payment_id)
      .filter((v) => v !== null && v !== undefined && String(v).length > 0)
      .map((v) => String(v));
    return Array.from(new Set(paymentIds));
  } catch (err) {
    return [];
  }
}

function normalizeCouponForOffer(coupon, applicableProducts) {
  const typeRaw = String(coupon?.discount_type || "").toLowerCase();
  const selection = String(coupon?.product_selection || "all").toLowerCase();
  let discountType = typeRaw === "percent" ? "percent" : typeRaw === "flat" ? "flat" : null;
  if (!discountType) return null;
  let discountValue = Number(coupon?.discount_value) || 0;
  if (discountType === "percent") {
    // Convert 10 → 0.10; if already fraction, keep it but cap at 1
    discountValue = discountValue > 1 ? discountValue / 100 : discountValue;
    discountValue = Math.min(Math.max(discountValue, 0), 1);
  } else {
    discountValue = Math.max(discountValue, 0);
  }
  return {
    coupon_code: coupon.coupon_code,
    discount_type: discountType,
    discount_value: discountValue,
    product_selection: selection === "specific" ? "specific" : "all",
    applicable_products: selection === "specific" ? (applicableProducts || []) : undefined,
    recurring: Number(coupon?.recurring) === 1,
  };
}

function checkProductEligibility(selection, applicableProducts, cartProductIds) {
  if (selection !== "specific") return true; // applies to all
  if (!Array.isArray(applicableProducts) || applicableProducts.length === 0) return false;
  if (!Array.isArray(cartProductIds) || cartProductIds.length === 0) return false;
  const set = new Set(applicableProducts.map(String));
  return cartProductIds.some((id) => set.has(String(id)));
}

export async function applyCoupons(couponCodeMap, codes, contactId, cartProductIds = []) {
  const reasons = {};
  let applied = null;

  const now = Date.now();
  for (const rawCode of codes) {
    const code = String(rawCode || "");

    if (!couponCodeMap.has(code)) {
      reasons[code] = "not_found";
      continue;
    }

    if (applied) {
      // Only one coupon can be applied
      reasons[code] = "not_applied_multiple";
      continue;
    }

    const coupon = couponCodeMap.get(code);

    // Deleted or inactive status
    if (isTruthy(coupon?.deleted)) {
      reasons[code] = "not_found"; // treat as not found/deleted
      continue;
    }
    if (coupon?.status && String(coupon.status) !== "Valid") {
      reasons[code] = "expired"; // status not active; map to generic rejection
      continue;
    }

    // Start/end dates
    const start = Number(coupon?.valid_start_date);
    if (start && !isNaN(start)) {
      const startMs = start * 1000;
      if (now < startMs) {
        reasons[code] = "expired"; // not started; unify message client-side
        continue;
      }
    }
    if (await isExpired(coupon, now)) {
      reasons[code] = "expired";
      continue;
    }

    // Issued/redeemed caps
    const issued = Number(coupon?.issued) || 0;
    const redeemed = Number(coupon?.redeemed) || 0;
    if (issued > 0 && redeemed >= issued) {
      reasons[code] = "expired"; // reached limit
      continue;
    }

    // Per-contact redemption policy (best-effort)
    if (contactId) {
      const usedByContact = await isCouponUsed(contactId, coupon?.id);
      if (usedByContact) {
        reasons[code] = "already_used";
        continue;
      }
    }

    // Product eligibility (fetch mapping when specific)
    const selection = String(coupon?.product_selection || "all").toLowerCase();
    let applicableProducts = [];
    if (selection === "specific") {
      const mappedProductIds = await fetchApplicableProducts(coupon?.id);
      console.log('[CV] mapping for coupon', code, { mappedProductIds });
      const paymentIds = await translateToPaymentIds(mappedProductIds);
      console.log('[CV] payment ids for coupon', code, { paymentIds });
      // Build a superset: accept either payment ids or raw product ids
      applicableProducts = Array.from(new Set([...(paymentIds || []), ...(mappedProductIds || [])])).map(String);
      const ok = checkProductEligibility("specific", applicableProducts, cartProductIds);
      console.log('[CV] eligibility check', { code, applicableProducts, cartProductIds, ok });
      if (!ok) {
        reasons[code] = "not_applicable";
        continue;
      }
    }

    // Discount configuration sanity and constrain applicable products per README rules
    const offerCoupon = normalizeCouponForOffer({
      ...coupon,
      product_selection: selection,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    }, applicableProducts);
    if (!offerCoupon) {
      reasons[code] = "not_found"; // unsupported config
      continue;
    }

    // Success: apply this coupon
    applied = offerCoupon;
  }

  return { applied, reasons };
}
