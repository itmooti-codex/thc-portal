# Storefront & Storefront Backend Overview

This document captures the current structure and data flow of the THC portal storefront (`/storefront`) and its companion backend service (`/storefrontbe`). It is intended as an onboarding reference for engineers who need to work in either area.

## Storefront (Front-end)

The `storefront` directory hosts a static, multi-page storefront experience implemented with vanilla JavaScript modules that attach to DOM nodes rendered by the HTML templates (`shop.html`, `product.html`, `checkout.html`, `thank-you.html`, and `checkout.html`). The JavaScript lives under `storefront/js` and is split by concern:

### Shared Utilities
- **`utils.js`** – Provides helper selectors (`$`, `$$`), money-formatting, numeric parsing, and a small DOM helper set used across pages.
- **`cart-state.js`** – Implements a global `Cart` singleton that keeps cart state in memory with localStorage/sessionStorage persistence. It exposes methods such as `init`, `addItem`, `updateQuantity`, `removeItem`, `clear`, and `subscribe`. It automatically chooses guest vs. authenticated storage and normalises product payloads for downstream APIs.

### Cart Drawer UI (`cart-ui.js`)
- Renders the slide-in cart drawer, maintains the cart bubble badge, and synchronises "Add to cart" buttons across product cards.
- Hooks into `Cart.subscribe(...)` to react to state changes, re-render the cart contents, and recompute subtotal/total figures.
- Persists an "offer" snapshot from checkout (`localStorage['checkout:offer']`) to keep totals aligned with backend-calculated discounts and shipping rates.
- Normalises product identifiers, supports direct navigation to checkout, and exposes a global `StorefrontCartUI` helper with functions like `openCart`, `syncAddButtons`, `extractProduct`, and `getCheckoutUrl`.

### Page Scripts
- **`catalog-page.js`** – Handles in-grid search filtering and product-card interactions on the main `shop.html` page. It debounces search input, hides non-matching cards, and intercepts "View product" clicks to persist a product snapshot for deep-linking to the detail page.
- **`product-page.js`** – Restores the snapshot saved by the catalog page when the detail page loads and wires up add-to-cart from the product hero section (see file for full logic).
- **`checkout-page.js`** – The most complex script. It:
  - Detects the checkout context via DOM markers.
  - Persists checkout wizard state and form field values in `localStorage`.
  - Calls backend APIs for contacts, coupon validation, shipping type lookup, offer building, and transaction processing.
  - Manages a step-based UI (contact → address → payment → review) and synchronises the cart summary with backend-calculated offers.
  - Keeps shipping options filtered, enforces coupon validation rules, and submits the final order payload.
- **`searchAddress.js`** – Provides address auto-complete wiring (via Google Places) for the checkout shipping form when the integration key is present.

### Data Flow
1. Product cards use `data-` attributes to expose product metadata. `cart-ui.js` converts these into normalized product objects and adds them to the `Cart` state.
2. Checkout reads the `Cart` state, enriches it with customer inputs, and calls backend endpoints to validate coupons and build an offer.
3. The resulting offer (products, shipping, totals) is cached locally and displayed in the UI while also feeding the final `/transaction/process` request.

## Storefront Backend (`storefrontbe`)

The backend is an Express application that proxies and enriches interactions with the Ontraport API.

### Entry Point (`index.js`)
- Loads environment configuration from `storefrontbe/.env` and starts an Express server (default port `3001`).
- Applies permissive CORS and JSON middleware plus a request logger.
- Exposes the following REST endpoints under the `/api-thc` prefix:
  - `GET /health` – Simple health probe.
  - `POST /contact/save` – Saves or updates a contact in Ontraport using email as the unique identifier.
  - `POST /coupons/validate` – Validates one or more coupon codes for a contact and cart contents using the coupon service (see below).
  - `GET /shipping/types` – Fetches shipping methods from Ontraport and optionally filters by an `allowed` query parameter.
  - `POST /offer/build` – Runs the server-side `OfferEngine` to generate a pricing offer for the cart (products, discounts, shipping).
  - `POST /transaction/process` – Normalises a checkout payload, maps product payment IDs to Ontraport product IDs, and submits a purchase/transaction request to Ontraport.
- Centralises error handling to translate Ontraport failures into HTTP responses and logs timing for each request.

### Offer Engine (`offer-engine.js`)
- Validates cart payloads and calculates offers. Responsibilities include:
  - Recomputing product line totals and unit prices.
  - Applying coupon discounts (flat or percent) proportionally across eligible products.
  - Adding shipping lines based on the selected shipping type and whether items require shipping.
  - Producing a normalized offer structure with `products`, `shipping`, `subTotal`, and `grandTotal` for downstream processing.

### Coupon Validation Service (`coupon-validate.service.js`)
- Looks up coupon records in Ontraport, accounting for case variations.
- Applies business rules (active status, date windows, usage caps, per-contact usage, product eligibility) before approving a coupon.
- Returns a structured response noting the applied coupon (if any) and reasons for each rejected code.

### Utilities (`utils.js`)
- Provides the `ontraportRequest` helper that attaches credentials and logs calls to the Ontraport API. Credentials are sourced from environment variables (`ONTRAPORT_APP_ID`, `ONTRAPORT_API_KEY`, etc.).

### Supporting Files
- **`backend-setup.md`** and **`README_BACKEND.md`** – Operational notes for running the backend locally, including environment variable expectations and workflow steps.
- **`test.js`** – Simple script scaffolding for manual backend testing (fetching coupons, etc.).

## Frontend ↔ Backend Integration Points

1. **Contact Creation** – Checkout calls `POST /api-thc/contact/save` before attempting to validate coupons or build an offer so the backend has a `contactId` for Ontraport.
2. **Coupon Validation** – Checkout submits the cart’s product payment IDs and entered codes to `POST /api-thc/coupons/validate`; the backend responds with the accepted coupon (if any) plus rejection reasons, which drive UI messaging.
3. **Offer Building** – Checkout sends the cart snapshot, coupon, and selected shipping method to `POST /api-thc/offer/build` to calculate authoritative totals. The response is cached for rendering and used to populate the payment step.
4. **Transaction Processing** – On final submission the frontend composes billing/shipping/contact data, the active offer, and payment details into a `POST /api-thc/transaction/process` call. The backend maps product identifiers to Ontraport expectations and posts to their Transactions API.

## Key Takeaways for Developers
- The cart state is entirely client-driven until checkout, where the backend becomes the source of truth for totals and coupon validation.
- Product identifiers exist in both storefront (UI) form and Ontraport payment IDs; the backend performs necessary translations.
- Environment variables in `storefrontbe/.env` are critical for real API interaction. In development, the frontend expects the backend on `http://localhost:3001` unless overridden via DOM data attributes or `window.ENV` globals.
- When extending checkout functionality, update both the cart snapshot persisted by the frontend and the offer-building logic on the backend to keep totals consistent.

