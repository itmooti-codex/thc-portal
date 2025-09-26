Prompt for Cursor — Vanilla JS Frontend + Node.js Backend (Express)

Role: You are a senior full-stack engineer. Connect an existing vanilla JS frontend checkout to a Node.js (Express) backend that talks to Ontraport. Implement robust validation, clear error handling, and accurate pricing/discount logic. Keep secrets server-side. Provide minimal but meaningful tests for core logic and routes.

Goals

Save contact (basic + shipping) once after all forms are complete (not on first “Next”).

Do not save billing address on the contact; it’s only sent during the transaction.

Coupons: validate in order — existence → validity/expiry → already used by this contact → product applicability.

Transaction: call POST https://api.ontraport.com/1/transaction/processManual with correct payload.

Shipping UI: hide shipping options if all items are “Item Not Shipped”.

Local state: persist all form inputs and cart details so returning to checkout pre-fills everything.

UX: actionable errors, disabled buttons while loading, success redirects to a Thank You page.

Assumptions & Constraints

Frontend is vanilla JS (no frameworks). Keep using the existing forms/steps and call the backend via fetch.

Backend is Express using Axios for Ontraport calls.

Environment variables (server):

ONTRAPORT_APP_ID

ONTRAPORT_API_KEY

ONTRAPORT_BASE_URL=https://api.ontraport.com/1

DUMMY_GATEWAY_ID=1 (use env but default to 1)

Headers for all Ontraport requests:

Api-Appid: <env>

Api-Key: <env>

Content-Type: application/json

Accept: application/json

Never expose keys to the browser. All Ontraport traffic goes through the backend.

Data Contracts (used between frontend ⇄ backend)
Contact (saved once after forms complete)
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string?",
  "address": "string?",
  "address2": "string?",
  "city": "string?",
  "state": "string?",
  "zip": "string?",
  "country": "string?"
}


These address fields are shipping and do go into the contact. Billing does not.

Billing & Payment (transaction only)
{
  "billing_address": {
    "address": "string",
    "address2": "string?",
    "city": "string",
    "state": "string",
    "zip": "string",
    "country": "string"
  },
  "payer": {
    // choose one path:
    // raw card
    "ccnumber": "string",
    "code": "string?",
    "expire_month": 1,
    "expire_year": 2030
    // OR tokenized card
    // "cctoken": { "token": { "card_id": "card_...", "customer_id": "cus_..." }, "card_type": "visa|mastercard|amex|discover|diners", "last4": "string" },
    // "expire_month": 1,
    // "expire_year": 2030
  }
}

Cart (frontend holds; backend uses to build offer)
{
  "items": [
    {
      "productId": 205,           // from data-product-payment-id on the product card
      "name": "string",
      "quantity": 1,
      "price": 59.0,              // display-only; final computed in backend offer
      "taxable": true,
      "requiresShipping": true     // false if “Item Not Shipped”
    }
  ],
  "shippingTypeId": 1,
  "couponCodes": ["50OFFVolcano"],
  "currency_code": "USD"
}

Backend API — Define These Routes
POST /api/contact/save

Body: contact fields above, optionally { contactId?: number }
Behavior: Create or update the Ontraport contact once after all forms are complete (from Review/Place Order step). Return { contactId }.

POST /api/coupons/validate

Body: { contactId: number, codes: string[], cartProductIds: number[] }
Pipeline (run in this exact order):

Existence
GET /1/CouponCodes?range=1&count=false with filter:

[
  { "field": { "field": "coupon_code" }, "op": "IN",
    "value": { "list": codes.map(c => ({ "value": c })) } }
]


The API returns only existing codes. Any user-entered code missing from response → mark not_found.

Validity / Expiration
For each returned coupon: GET /1/CouponCode?id=<coupon_code_id> → check expiration (normalize seconds vs ms) > now.

Already used by this contact
GET /1/Purchases?range=50&sortDir=desc&count=false → filter locally by contact_id. If any purchase has matching coupon_id, mark already_used.

Product applicability
If coupon product_selection === "specific", fetch:
GET /1/CouponProducts?range=50&count=false with filter:

[{ "field": { "field": "coupon_id" }, "op": "IN", "value": { "list": [{ "value": <coupon_id> }] } }]


Coupon applies only if any product_id appears in cartProductIds. Otherwise mark not_applicable.

Result:
Return only the first valid coupon (no stacking).

{
  "applied": {
    "id": 8,
    "coupon_code": "50OFFVolcano",
    "discount_type": "flat",
    "discount_value": 50.0,
    "product_selection": "specific|all",
    "recurring": "0|1"
  },
  "reasons": {
    "50OFFVolcano": null,
    "ANOTHER": "not_found|expired|already_used|not_applicable|not_applied_multiple"
  }
}


All non-applied but existing codes receive "not_applied_multiple".

GET /api/shipping/types?allowed=1,2

Proxies GET /1/Shippingtypes?range=50&count=false.
If allowed query exists, filter to those ids.
Frontend doesn’t call this if every cart item has requiresShipping=false.

POST /api/transaction/process

Body:

{
  "contactId": 235,
  "billing_address": { ... },
  "payer": { ... },
  "offer": { ... },                 // built server-side (see Offer section)
  "external_order_id": "WEB-123?",
  "invoice_template": 1,
  "gateway_id": 1,
  "customer_note": "string?",
  "internal_note": "string?"
}


Behavior:
Post to /1/transaction/processManual with:

{
  "contact_id": 235,
  "chargeNow": "chargeNow",
  "trans_date": 1751260000000,
  "invoice_template": 1,
  "gateway_id": 1,
  "offer": { ... },
  "billing_address": { ... },
  "payer": { ... },
  "external_order_id": "WEB-123",
  "customer_note": "string?",
  "internal_note": "string?"
}


Return success (e.g., invoice/order identifiers) or normalized error.

Offer Building (server-side pricing/discount engine)

Input: cart, appliedCoupon, optional shipping type (id, name, price).
Rules:

Compute line subtotals: line = unitPrice * quantity.

Flat discount: apply to eligible lines proportionally by subtotal; clamp lines at >= 0.

Percent discount: multiply eligible lines by (1 - rate).

Eligibility depends on coupon product_selection and (if specific) product id mapping from CouponProducts.

Output:

{
  "products": [
    { "id": 205, "quantity": 1, "total": 59.00, "taxable": true, "type": "one_time", "shipping": true }
  ],
  "shipping": [{ "id": 1, "name": "STARTRACK", "price": 15.00 }],
  "subTotal": 59.00,
  "grandTotal": 74.00,
  "hasTaxes": false,
  "hasShipping": true,
  "currency_code": "USD",
  "shipping_charge_recurring_orders": false
}


Never allow negative totals.

Return a breakdown (per-line before/after, discount applied) to help frontend display.

Frontend Integration (use existing vanilla UI)

Persist local state for all fields and cart to localStorage (e.g., key checkout:v1) on every change.

On Review:

If any item requiresShipping=true, fetch shipping types and display choices.

“Apply Coupon” → call /api/coupons/validate with contactId? (if known), codes, cartProductIds.

On Place Order:

Call /api/contact/save once to upsert contact; store returned contactId.

Re-validate coupon quickly (use cached result if < 5 minutes; otherwise re-call).

Send /api/transaction/process with contactId, billing_address, payer, and server-built offer.

On success → navigate to Thank You page with details.

On error → show inline errors; keep field focus on the first invalid input.

Client-side validation: email format, required shipping fields when needed, numeric zip, Luhn for card number, expiry in the future.

Ontraport Reference (sample payloads)

Coupon existence (multi):

[
  { "field":{"field":"coupon_code"}, "op":"IN",
    "value":{"list":[{"value":"50OFFVolcano"},{"value":"123XXX"}]} }
]


Coupon validity:
GET /1/CouponCode?id=8 → compare expiration with Date.now() (normalize seconds vs ms).

Transaction example:

{
  "contact_id": 235,
  "chargeNow": "chargeNow",
  "trans_date": 1751260000000,
  "invoice_template": 1,
  "gateway_id": 1,
  "offer": {
    "products": [
      { "id": 205, "quantity": 1, "total": 59.00, "taxable": true, "type": "one_time", "shipping": true }
    ],
    "shipping": [{ "id": 1, "name": "STARTRACK", "price": 15.00 }],
    "subTotal": 59.00,
    "grandTotal": 74.00,
    "hasTaxes": false,
    "hasShipping": true,
    "currency_code": "USD"
  },
  "billing_address": {
    "address": "123 Main St",
    "address2": "Apt 5B",
    "city": "Austin",
    "state": "TX",
    "zip": "73301",
    "country": "US"
  },
  "payer": { "ccnumber": "4111111111111111", "code": "123", "expire_month": 12, "expire_year": 2030 },
  "external_order_id": "WEB-ORDER-123"
}


Shipping types:
GET /1/Shippingtypes?range=50&count=false → list (e.g., STARTRACK, Pick Up, etc.).
Frontend hides this section if all cart items are non-shipping.

Error Handling & Security

Normalize Ontraport errors to friendly messages:

400/422 → list of invalid fields

401/403 → “Authorization error – check API keys”

500 → “Service unavailable – try again”

Rate-limit backend routes.

Never log full PAN; mask all but last4.

Validate all inputs server-side (mirror client checks).

HTTPS in production only; CORS limited to our domain(s).

Tests (light but useful)

Unit tests for the offer/discount engine (flat/percent, multiple lines, clamp to zero, specific/all products).

Route tests with supertest:

/api/coupons/validate branches (not_found, expired, already_used, not_applicable, success).

/api/transaction/process happy path + failure normalization.

Acceptance Criteria (must all pass)

Contact (with shipping) saved once after forms; { contactId } returned and reused.

Billing address not saved to contact; used only in transaction.

Coupon pipeline in exact order; non-returned codes instantly flagged invalid.

Product specificity respected; discount applies only to eligible items.

Shipping UI hidden when every item is non-shipping.

Transaction uses gateway_id=1 (env-driven) and correct offer totals.

Local state persists; fields prefill when returning.

Clear success page; robust failure messaging.

Core tests pass.




















{
    "contact": {
        "firstname": "",
        "lastname": "",
        "email": "",
        "sms_number": ""
    },
    "delivery_address": {
        "address": "",
        "address2": "",
        "city": "",
        "state": "",
        "zip": "",
        "country": ""
    },
    "billing_address": {
        "address": "",
        "address2": "",
        "city": "",
        "state": "",
        "zip": "",
        "country": ""
    },
    "payment": {
        "name_on_card": "",
        "card_number": "",
        "card_code": "",
        "card_expiry_month": "",
        "card_expiry_year": ""
    },
    "shipping_method": "",
    "items": [
        {
            "product_id": "",
            "quantity": "",
            "price": ""
        }
    ],
    "coupon_codes": [
        ""
    ]
}