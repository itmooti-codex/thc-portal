 Ontraport Coupon Validation – Decision Flow & Pseudocode
Objects:
- Coupon (meta object id: 123)
- CouponCode (meta object id: 124)
- CouponProduct (mapping: coupon_id ↔ product_id)
Goal: When a shopper enters a coupon code in the cart, validate and (if valid) compute the discount to apply.

0) Assumptions & Notes
Timestamps are epoch seconds (UTC). Convert to store timezone for display; keep comparisons in UTC.
status can be Valid | Expired | Not Valid | Reached Limit.
type can be personal | group.
discount_type can be flat | percent | trial.
issued = -1 implies unlimited issuance. Otherwise, remaining = issued - redeemed.
valid_start_date / valid_end_date may be 0/null (unset). Treat unset as open-ended.
Some coupons use timeframe windows: e.g. valid_type = "time" + valid_timeframe (hours). For personal codes, prefer anchoring timeframe to CouponCode.date (created); otherwise fall back to Coupon.date.
coupon_code on Coupon may represent a master/public code. CouponCode.code represents issued single-use (or controlled) codes. The cart input may match either; prefer CouponCode match first.
deleted may appear as 0/1, Yes/No, or null. Treat any truthy value as deleted.
recurring = 1 means the same contact may redeem this coupon multiple times (subject to other limits). If omitted/0, treat as one redemption per contact (when enforced via CouponCode).
Product targeting: product_selection = specific means only products in CouponProduct mapping are eligible. Otherwise, assume all cart items eligible.

1) Inputs
code_entered: string entered by shopper
contact_id: current logged-in contact (or 0/anon)
cart: array of line items { product_id, price, qty, is_subscription? }
now_utc: current epoch seconds (UTC)

2) Validation Flow (step-by-step)
Normalise & Fetch
code = trim(uppercase(code_entered))


Try find CouponCode by code. If found: cc = CouponCode and coupon = Coupon(cc.coupon_id)


Else try find Coupon by coupon_code == code. If found: coupon = Coupon and cc = null


If neither found → fail: INVALID_CODE
Deleted checks
If isDeleted(coupon) → fail: COUPON_DELETED


If cc && isDeleted(cc) → fail: CODE_DELETED
Status check (Coupon-level)
If coupon.status != "Valid" → fail: COUPON_STATUS_BLOCK (include actual status)
Date window – Coupon
If coupon.valid_start_date > 0 and now_utc < valid_start_date → fail: COUPON_NOT_STARTED


If coupon.valid_end_date > 0 and now_utc > valid_end_date → fail: COUPON_EXPIRED
Date window – Code (if cc exists)
If cc.expiration > 0 and now_utc > cc.expiration → fail: CODE_EXPIRED


If cc.date_redeemed > 0 → fail: CODE_ALREADY_REDEEMED
Timeframe window (if applicable)
If coupon.valid_type == "time" and coupon.valid_timeframe > 0 (in hours):
Anchor = cc?.date || coupon.date


If now_utc > Anchor + hoursToSecs(valid_timeframe) → fail: COUPON_TIMEFRAME_EXPIRED
Issued / Redeemed / Remaining (Coupon-level caps)
If coupon.issued > 0 and coupon.redeemed >= coupon.issued → fail: COUPON_REACHED_LIMIT


If coupon.remaining is tracked and coupon.remaining <= 0 → fail: COUPON_NO_REMAINING
Type rules (personal vs group)
If coupon.type == "personal":
If cc == null → fail: PERSONAL_CODE_REQUIRED


If cc.contact_id != contact_id → fail: NOT_CODE_OWNER
Per-contact recurrence policy
If coupon.recurring == 0 and contactHasRedeemed(coupon.id, contact_id) → fail: ALREADY_REDEEMED_BY_CONTACT
(Only apply if your business rules enforce per-contact single use beyond single-use CouponCode.)
Discount configuration sanity


If coupon.discount_type == "percent" and (discount_value <= 0 || discount_value > 100) → fail: BAD_PERCENT_VALUE


If coupon.discount_type == "flat" and discount_value <= 0 → fail: BAD_FLAT_VALUE


If coupon.discount_type == "trial" and !cartContainsTrialEligible(cart) → fail: TRIAL_NOT_ELIGIBLE
Product eligibility


If coupon.product_selection == "specific":
eligible_products = getCouponProducts(coupon.id)


eligible_items = cart.items where product_id in eligible_products


If eligible_items is empty → fail: NO_ELIGIBLE_ITEMS
Compute provisional discount


For percent: sum over eligible_items → sum(price * qty) * (discount_value / 100)


For flat: apply to eligible items up to their subtotal (do not exceed eligible subtotal)


For trial: set first-cycle amount(s) of eligible subscription item(s) to 0 (or per business rule)


If computed discount ≤ 0 → fail: ZERO_DISCOUNT
Stacking / exclusivity (optional, if your cart forbids stacking)


If other promos applied and coupon cannot stack → fail: STACKING_NOT_ALLOWED
Success → return application plan


Return a structured payload describing:
coupon_id, coupon_code_id, code


discount_type, discount_value, description


applies_to (list of {line_id/product_id, amount} or instructions for trial)


display_message for the UI

3) Pseudocode (language-agnostic)
function validateAndPriceCoupon(code_entered, contact_id, cart, now_utc):
  code = normalize(code_entered)

  cc = findCouponCodeByCode(code)             // returns null if not found
  if cc != null:
    coupon = findCouponById(cc.coupon_id)
  else:
    coupon = findCouponByMasterCode(code)     // match Coupon.coupon_code

  if coupon == null:
    return fail("INVALID_CODE")

  if isDeleted(coupon):
    return fail("COUPON_DELETED")
  if cc != null and isDeleted(cc):
    return fail("CODE_DELETED")

  if coupon.status != "Valid":
    return fail("COUPON_STATUS_BLOCK", meta={status: coupon.status})

  if coupon.valid_start_date > 0 and now_utc < coupon.valid_start_date:
    return fail("COUPON_NOT_STARTED")
  if coupon.valid_end_date > 0 and now_utc > coupon.valid_end_date:
    return fail("COUPON_EXPIRED")

  if cc != null and cc.expiration > 0 and now_utc > cc.expiration:
    return fail("CODE_EXPIRED")
  if cc != null and cc.date_redeemed > 0:
    return fail("CODE_ALREADY_REDEEMED")

  if coupon.valid_type == "time" and coupon.valid_timeframe > 0:
    anchor = (cc != null && cc.date > 0) ? cc.date : coupon.date
    if now_utc > anchor + hoursToSecs(coupon.valid_timeframe):
      return fail("COUPON_TIMEFRAME_EXPIRED")

  if coupon.issued > 0 and coupon.redeemed >= coupon.issued:
    return fail("COUPON_REACHED_LIMIT")
  if hasField(coupon, 'remaining') and coupon.remaining <= 0:
    return fail("COUPON_NO_REMAINING")

  if coupon.type == "personal":
    if cc == null:
      return fail("PERSONAL_CODE_REQUIRED")
    if toInt(cc.contact_id) != toInt(contact_id):
      return fail("NOT_CODE_OWNER")

  if coupon.recurring == 0 and contactHasRedeemed(coupon.id, contact_id):
    return fail("ALREADY_REDEEMED_BY_CONTACT")

  // discount sanity
  if coupon.discount_type == "percent":
    if coupon.discount_value <= 0 or coupon.discount_value > 100:
      return fail("BAD_PERCENT_VALUE")
  else if coupon.discount_type == "flat":
    if coupon.discount_value <= 0:
      return fail("BAD_FLAT_VALUE")
  else if coupon.discount_type == "trial":
    if !cartContainsTrialEligible(cart):
      return fail("TRIAL_NOT_ELIGIBLE")

  // product eligibility
  eligible_items = cart.items
  if coupon.product_selection == "specific":
    eligible_ids = getCouponProductIds(coupon.id)
    eligible_items = filter(cart.items, item => item.product_id in eligible_ids)
    if eligible_items is empty:
      return fail("NO_ELIGIBLE_ITEMS")

  // compute discount
  if coupon.discount_type == "percent":
    eligible_subtotal = sum(item.price * item.qty for item in eligible_items)
    discount_amount = round(eligible_subtotal * (coupon.discount_value / 100), 2)
  else if coupon.discount_type == "flat":
    eligible_subtotal = sum(item.price * item.qty for item in eligible_items)
    discount_amount = min(coupon.discount_value, eligible_subtotal)
  else if coupon.discount_type == "trial":
    discount_amount = computeTrialDiscount(eligible_items)  // often sets first-cycle price(s) to 0

  if discount_amount <= 0 and coupon.discount_type != "trial":
    return fail("ZERO_DISCOUNT")

  return success({
    coupon_id: coupon.id,
    coupon_code_id: cc?.id,
    code: code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    description: coupon.discount_description,
    applies_to: buildApplicationPlan(eligible_items, coupon, discount_amount),
    display_message: buildDisplayMessage(coupon)
  })

4) Helper Functions
function isDeleted(obj):
  v = obj.deleted
  return (v == 1 or v == true or v == "Yes" or v == "yes")

function hoursToSecs(h):
  return toInt(h) * 3600

function cartContainsTrialEligible(cart):
  // Business rule: typically subscriptions or specific SKUs
  return any(item.is_subscription or isTrialSKU(item.product_id) for item in cart.items)

function getCouponProductIds(coupon_id):
  return select product_id from CouponProduct where coupon_id = coupon_id and !isDeleted(row)

function contactHasRedeemed(coupon_id, contact_id):
  // Implement via order history / redemptions table or CouponCode lookups
  return exists Redemption where Redemption.coupon_id = coupon_id and Redemption.contact_id = contact_id

function buildApplicationPlan(items, coupon, discount_amount):
  if coupon.discount_type == "flat":
    // allocate flat discount across eligible items proportionally by line subtotal
    subtotal = sum(i.price * i.qty for i in items)
    return [{ line_id: i.line_id, amount: round(discount_amount * ((i.price*i.qty)/subtotal), 2) } for i in items]
  else if coupon.discount_type == "percent":
    return [{ line_id: i.line_id, percent: coupon.discount_value } for i in items]
  else if coupon.discount_type == "trial":
    return buildTrialPlan(items)

5) Error Codes & Suggested Messages
INVALID_CODE → “That coupon code isn’t recognised.”
COUPON_DELETED → “This coupon is no longer available.”
CODE_DELETED → “This coupon code is no longer valid.”
COUPON_STATUS_BLOCK → “This coupon isn’t active (status: {status}).”
COUPON_NOT_STARTED → “This coupon isn’t active yet.”
COUPON_EXPIRED / CODE_EXPIRED / COUPON_TIMEFRAME_EXPIRED → “This coupon has expired.”
CODE_ALREADY_REDEEMED → “This code has already been used.”
COUPON_REACHED_LIMIT / COUPON_NO_REMAINING → “This coupon has reached its limit.”
PERSONAL_CODE_REQUIRED → “Please use your personal code for this offer.”
NOT_CODE_OWNER → “This code is assigned to a different account.”
ALREADY_REDEEMED_BY_CONTACT → “You’ve already used this offer.”
BAD_PERCENT_VALUE / BAD_FLAT_VALUE → “This coupon is misconfigured.”
TRIAL_NOT_ELIGIBLE → “This offer applies to trial-eligible items only.”
NO_ELIGIBLE_ITEMS → “This coupon doesn’t apply to items in your cart.”
ZERO_DISCOUNT → “This coupon doesn’t reduce your total.”
STACKING_NOT_ALLOWED → “This coupon can’t be combined with other discounts.”

6) Test Scenarios (quick list)
Valid personal, code owner, within date, specific product present → success


Valid group, no mapping (all items eligible), percent 100 → free item(s)


Master coupon code (no CouponCode), within start/end dates → success


Code exists but expired → fail CODE_EXPIRED


Coupon status = Expired though code not expired → fail COUPON_EXPIRED


valid_type=time, timeframe passed from CouponCode.date → fail COUPON_TIMEFRAME_EXPIRED


issued=100, redeemed=100 → fail COUPON_REACHED_LIMIT


Personal code but different contact → fail NOT_CODE_OWNER


product_selection=specific and cart doesn’t include mapped SKU → fail NO_ELIGIBLE_ITEMS


discount_type=flat greater than eligible subtotal → discount capped at eligible subtotal


recurring=0 and contact already redeemed in the past → fail ALREADY_REDEEMED_BY_CONTACT


Stacking with an existing auto-discount when not allowed → fail STACKING_NOT_ALLOWED

Implementation tip: Log all failures with reason_code, code_entered, contact_id, and key coupon/code IDs to simplify support and analytics.
