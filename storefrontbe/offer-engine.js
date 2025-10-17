/**
 * Server-side offer building engine for pricing, discounts, and shipping calculations
 * Implements the pricing logic as specified in the requirements
 */

const CARD_FEE_PRODUCT_ID = "31";
const CARD_FEE_RATE = 0.018;
const DEFAULT_TAX_RATE = 0.1;

const roundCurrency = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatCurrency = (value) => roundCurrency(value).toFixed(2);

const normaliseCouponType = (input) => {
  const raw = String(input || "").toLowerCase();
  if (raw === "shipping" || raw === "free_shipping") return "shipping";
  if (["percent", "percentage", "percent_off"].includes(raw)) return "percent";
  if (["flat", "fixed", "amount", "dollar", "value"].includes(raw)) return "fixed";
  return raw;
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export class OfferEngine {
  constructor({ taxRate = DEFAULT_TAX_RATE } = {}) {
    this.currency = "AUD";
    this.taxRate = Number.isFinite(taxRate) ? taxRate : DEFAULT_TAX_RATE;
  }

  /**
   * Build an offer from cart items, applied coupon, and shipping type
   * @param {Object} params - The offer parameters
   * @param {Array} params.cartItems - Cart items with productId, name, quantity, price, taxable, requiresShipping
   * @param {Object} params.appliedCoupon - Applied coupon details (null if none)
   * @param {Object} params.shippingType - Selected shipping type (null if no shipping needed)
   * @returns {Object} Complete offer object
   */
  buildOffer({ cartItems = [], appliedCoupon = null, shippingType = null }) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error("Cart items are required");
    }

    const taxRate = Number.isFinite(this.taxRate) ? this.taxRate : DEFAULT_TAX_RATE;

    const preparedItems = cartItems.map((item) => {
      const quantityRaw = item.quantity ?? item.qty ?? 1;
      const quantity = Math.max(1, Math.round(toNumber(quantityRaw, 1)));
      const unitPrice = Math.max(0, toNumber(item.price, 0));
      const id = item.productId ?? item.id ?? item.product_id ?? null;
      const taxable = item.taxable !== undefined ? Boolean(item.taxable) : true;
      const requiresShipping =
        item.requiresShipping !== undefined
          ? Boolean(item.requiresShipping)
          : true;
      const totalEx = roundCurrency(unitPrice * quantity);
      const taxAmount = taxable ? roundCurrency(totalEx * taxRate) : 0;
      const totalIncl = roundCurrency(totalEx + taxAmount);

      return {
        id,
        quantity,
        unitPrice,
        totalEx,
        totalIncl,
        taxable,
        requiresShipping,
        taxAmount,
        isCardFee: id != null && String(id) === CARD_FEE_PRODUCT_ID,
      };
    });

    const productItems = preparedItems.filter((item) => !item.isCardFee);
    const cardFeeItems = preparedItems.filter((item) => item.isCardFee);

    const productSubtotalEx = roundCurrency(
      productItems.reduce((sum, item) => sum + item.totalEx, 0)
    );

    // Pre-GST discount on ex-GST components
    const couponType = normaliseCouponType(
      appliedCoupon?.discount_type || appliedCoupon?.type
    );
    const couponValue = toNumber(
      appliedCoupon?.discount_value ?? appliedCoupon?.value,
      0
    );

    const requiresShipping = preparedItems.some((item) => item.requiresShipping);
    let shippingEx = 0;
    let shippingName = shippingType?.name ?? "Shipping";
    let shippingId =
      shippingType?.id ??
      shippingType?.shipping_type_id ??
      shippingType?.code ??
      null;
    if (requiresShipping && shippingType && shippingType.price != null) {
      shippingEx = Math.max(0, toNumber(shippingType.price, 0));
    }

    const baseExBeforeDiscount = roundCurrency(productSubtotalEx + shippingEx);
    const percentValue =
      couponType === "percent"
        ? (couponValue > 1 ? couponValue / 100 : couponValue)
        : 0;
    let discountEx = 0;
    if (percentValue > 0) {
      discountEx = roundCurrency(baseExBeforeDiscount * percentValue);
    } else if (couponType === "fixed" && couponValue > 0) {
      discountEx = roundCurrency(Math.min(couponValue, baseExBeforeDiscount));
    }

    // Allocate discount proportionally
    const taxableEx = roundCurrency(
      productItems.filter((i) => i.taxable).reduce((s, i) => s + i.totalEx, 0)
    );
    const nonTaxableEx = roundCurrency(
      productItems.filter((i) => !i.taxable).reduce((s, i) => s + i.totalEx, 0)
    );
    const partsSum = roundCurrency(taxableEx + nonTaxableEx + shippingEx);
    const share = (x) => (partsSum > 0 ? roundCurrency((discountEx * x) / partsSum) : 0);
    const discountTaxableEx = share(taxableEx);
    const discountNonTaxableEx = share(nonTaxableEx);
    const discountShippingEx = share(shippingEx);

    const taxableExAfter = roundCurrency(Math.max(taxableEx - discountTaxableEx, 0));
    const nonTaxableExAfter = roundCurrency(Math.max(nonTaxableEx - discountNonTaxableEx, 0));
    const shippingExAfter = roundCurrency(Math.max(shippingEx - discountShippingEx, 0));

    const productTaxTotal = roundCurrency(taxableExAfter * taxRate);
    const shippingTax = shippingExAfter > 0 ? roundCurrency(shippingExAfter * taxRate) : 0;
    const productSubtotalIncl = roundCurrency(taxableExAfter + nonTaxableExAfter + productTaxTotal);
    const shippingIncl = roundCurrency(shippingExAfter + shippingTax);

    let cardFeeEx = roundCurrency(
      cardFeeItems.reduce((sum, item) => sum + item.totalEx, 0)
    );
    let cardFeeTax = roundCurrency(
      cardFeeItems.reduce((sum, item) => sum + item.taxAmount, 0)
    );
    // shippingEx/shippingIncl recomputed above after discount

    if (couponType === "shipping") {
      shippingEx = 0;
      shippingTax = 0;
      shippingIncl = 0;
    }
    const totalBeforeFees = roundCurrency(productSubtotalIncl + shippingIncl);

    if (cardFeeEx <= 0 && cardFeeTax <= 0) {
      cardFeeEx =
        totalBeforeFees > 0 ? roundCurrency(totalBeforeFees * CARD_FEE_RATE) : 0;
      cardFeeTax =
        cardFeeEx > 0 ? roundCurrency(cardFeeEx * taxRate) : 0;
    }
    const cardFeeIncl = roundCurrency(cardFeeEx + cardFeeTax);

    const totalBeforeDiscount = roundCurrency(totalBeforeFees + cardFeeIncl);

    const eligibleProductIds = new Set(
      Array.isArray(appliedCoupon?.applicable_products)
        ? appliedCoupon.applicable_products.map(String)
        : []
    );
    const hasSpecificProducts =
      appliedCoupon?.product_selection === "specific" &&
      eligibleProductIds.size > 0;

    const eligibleLines = hasSpecificProducts
      ? productItems.filter((item) => eligibleProductIds.has(String(item.id)))
      : productItems;

    const eligibleBaseIncl = roundCurrency(
      eligibleLines.reduce((sum, item) => sum + item.totalIncl, 0)
    );

    // Use pre-GST discount already computed
    let discountAmount = roundCurrency(discountEx);

    if (!hasSpecificProducts) {
      // When coupon applies to whole order, cap by total including card fee
      discountAmount = Math.min(discountAmount, totalBeforeDiscount);
    }

    discountAmount = Math.min(discountAmount, totalBeforeDiscount);
    const total = roundCurrency(Math.max(totalBeforeDiscount - discountAmount, 0));

    const productSubtotalAfterDiscount = roundCurrency(
      Math.max(
        productSubtotalIncl,
        0
      )
    );

    const taxTotal = roundCurrency(productTaxTotal + shippingTax + cardFeeTax);

    const formattedProducts = preparedItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      total: formatCurrency(item.totalEx),
      price: formatCurrency(item.unitPrice),
      amount: formatCurrency(item.unitPrice),
      price_each: formatCurrency(item.unitPrice),
      unit_price: formatCurrency(item.unitPrice),
      price_override: 1,
      override_product_price: 1,
      taxable: item.taxable,
      type: "one_time",
      shipping: item.requiresShipping,
      original_unit_price: formatCurrency(item.unitPrice),
      original_total: formatCurrency(item.totalEx),
      discount_total: formatCurrency(0),
      discount_unit: formatCurrency(0),
    }));

    const shippingEntries = [];
    if (requiresShipping && shippingType) {
      shippingEntries.push({
        id: shippingId,
        name: shippingName,
        price: formatCurrency(shippingEx),
        total: formatCurrency(shippingIncl),
      });
    }

    const offer = {
      products: formattedProducts,
      shipping: shippingEntries,
      subTotal: formatCurrency(productSubtotalIncl),
      subTotalBeforeDiscount: formatCurrency(productSubtotalIncl),
      subTotalAfterDiscount: formatCurrency(productSubtotalAfterDiscount),
      netSubtotal: formatCurrency(productSubtotalAfterDiscount),
      grandTotal: formatCurrency(total),
      discountTotal: formatCurrency(discountAmount),
      discount: formatCurrency(discountAmount),
      hasTaxes: taxTotal > 0,
      hasShipping: shippingEntries.length > 0,
      currency_code: this.currency,
      shipping_charge_recurring_orders: false,
      retailGstIncluded: true,
      cardFee: {
        base: formatCurrency(totalBeforeFees),
        exGst: formatCurrency(cardFeeEx),
        gst: formatCurrency(cardFeeTax),
        total: formatCurrency(cardFeeIncl),
      },
      totals: {
        productSubtotalEx: formatCurrency(productSubtotalEx),
        productSubtotalIncl: formatCurrency(productSubtotalIncl),
        shippingEx: formatCurrency(shippingEx),
        shippingIncl: formatCurrency(shippingIncl),
        cardFeeEx: formatCurrency(cardFeeEx),
        cardFeeIncl: formatCurrency(cardFeeIncl),
        taxTotal: formatCurrency(taxTotal),
      },
    };

    // Do not emit backend GST entry here; frontend adds/merges tax entry with correct form_id

    const couponCode =
      appliedCoupon?.code || appliedCoupon?.coupon_code || null;
    if (couponCode) {
      offer.coupon = {
        code: String(couponCode).trim(),
        discount_type: appliedCoupon?.discount_type,
        discount_value: appliedCoupon?.discount_value,
        amount: formatCurrency(discountAmount),
        discount_total: formatCurrency(discountAmount),
        applicable_products: appliedCoupon?.applicable_products,
        recurring: appliedCoupon?.recurring || false,
      };
    }

    return offer;
  }

  /**
   * Validate cart structure
   * @param {Object} cart - Cart object
   * @returns {boolean} True if valid
   */
  validateCart(cart) {
    if (!cart || !Array.isArray(cart.items)) {
      return false;
    }

    return cart.items.every((item) => item && (item.productId || item.id));
  }

  /**
   * Get cart product IDs for coupon validation
   * @param {Object} cart - Cart object
   * @returns {Array} Array of product IDs
   */
  getCartProductIds(cart) {
    if (!this.validateCart(cart)) {
      return [];
    }

    return cart.items.map((item) => item.productId || item.id);
  }
}

export default OfferEngine;
