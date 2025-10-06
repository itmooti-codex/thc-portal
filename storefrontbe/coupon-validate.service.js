import { ontraportRequest } from "./utils.js";

export async function validateCouponExistence(codes) {
  const existenceFilter = {
    field: { field: "coupon_code" },
    op: "IN",
    value: { list: codes.map((c) => ({ value: c })) },
  };

  const existingCoupons = await ontraportRequest(
    `/Coupons?condition=${JSON.stringify([existenceFilter])}`,
    {
      method: "GET",
    }
  );
  const existingCodes = new Map();
  existingCoupons?.data?.forEach((coupon) => {
    existingCodes.set(coupon.coupon_code, coupon);
  });

  return existingCodes;
}

export async function isExpired(coupon) {
  const expiration = Number(coupon.valid_end_date);

  if (expiration && !isNaN(expiration)) {
    const expTime = expiration * 1000; // Convert to milliseconds
    if (expTime < Date.now()) {
      return true;
    }
  }
  return false;
}

export async function isCouponUsed(contactId, couponId) {
  const filterQuery = [{
    "field": { "field": "contact_id" },
    "op": "=",
    "value": { "value": `${contactId}` }
  },
  "AND",
  {
    "field": { "field": "coupon_id" },
    "op": "=",
    "value": {"value": `${couponId}`}
  }]

  const data = await ontraportRequest(
    `/Purchases?condition=${JSON.stringify(filterQuery)}`
  );

  if(!data.data || !data.data.length) return false
  return true;
}

export async function applyCoupons(couponCodeMap, codes, contactId) {

    const reasons = {};
    let appliedCoupon = null;
      // Check each code
      for (const code of codes) {
        if (!couponCodeMap.has(code)) {
          reasons[code] = "not_found";
          continue;
        }
  
        const coupon = couponCodeMap.get(code);
  
        // Step 2: Check validity/expiration
        if(await isExpired(coupon)) {
          reasons[code] = 'Coupon Expired'
          continue;
        }
  
        // Step 3: Check if already used by this contact
        if (contactId) {
          const usedByContact = await isCouponUsed(contactId, coupon.id);
          if (usedByContact) {
            reasons[code] = "already_used";
            continue;
          }
        }

        // Step 4: Calulate Discount based on coupon type
        // if(coupon.type === "specific") {

        // } else {

        // }

  
      }

      return {reasons, appliedCoupon}
}
