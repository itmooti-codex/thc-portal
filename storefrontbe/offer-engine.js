/**
 * Server-side offer building engine for pricing, discounts, and shipping calculations
 * Implements the pricing logic as specified in the requirements
 */

const roundCurrency = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatCurrency = (value) => roundCurrency(value).toFixed(2);

export class OfferEngine {
  constructor() {
    this.currency = "AUD";
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
    // Validate inputs
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error("Cart items are required");
    }

    // Calculate line subtotals
    const baseProducts = cartItems.map((item) => {
      const unitPrice = Math.max(0, Number(item.price) || 0);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const total = roundCurrency(unitPrice * quantity);

      return {
        id: item.productId,
        quantity,
        unitPrice,
        total,
        taxable: Boolean(item.taxable),
        type: "one_time",
        shipping: Boolean(item.requiresShipping),
      };
    });

    // Calculate subtotal before discounts
    const subTotalBeforeDiscount = roundCurrency(
      baseProducts.reduce((sum, product) => sum + product.total, 0)
    );

    // Work out discount allocations per product (if any)
    const { amount: discountAmount, allocations } = this.calculateDiscount(
      baseProducts,
      appliedCoupon
    );

    // Calculate shipping
    const shipping = this.calculateShipping(baseProducts, shippingType);
    const shippingTotal = roundCurrency(
      shipping.reduce((sum, ship) => sum + (Number(ship.price) || 0), 0)
    );

    const adjustedProducts = baseProducts.map((product) => {
      const discountForProduct = allocations.get(product.id) || 0;
      const adjustedTotal = roundCurrency(
        Math.max(0, product.total - discountForProduct)
      );
      const unitAdjusted =
        product.quantity > 0
          ? roundCurrency(adjustedTotal / product.quantity)
          : adjustedTotal;
      const unitDiscount =
        product.quantity > 0
          ? roundCurrency(discountForProduct / product.quantity)
          : discountForProduct;

      return {
        id: product.id,
        quantity: product.quantity,
        total: formatCurrency(adjustedTotal),
        price: formatCurrency(unitAdjusted),
        amount: formatCurrency(unitAdjusted),
        price_each: formatCurrency(unitAdjusted),
        unit_price: formatCurrency(unitAdjusted),
        price_override: 1,
        override_product_price: 1,
        taxable: product.taxable,
        type: product.type,
        shipping: product.shipping,
        original_unit_price: formatCurrency(product.unitPrice),
        original_total: formatCurrency(product.total),
        discount_total: formatCurrency(discountForProduct),
        discount_unit: formatCurrency(unitDiscount),
      };
    });

    const subTotalAfterDiscount = roundCurrency(
      adjustedProducts.reduce(
        (sum, product) => sum + Number(product.total || 0),
        0
      )
    );

    const grandTotal = roundCurrency(subTotalAfterDiscount + shippingTotal);

    const discountFormatted = formatCurrency(discountAmount);
    const subTotalBeforeFormatted = formatCurrency(subTotalBeforeDiscount);
    const subTotalAfterFormatted = formatCurrency(subTotalAfterDiscount);
    const grandTotalFormatted = formatCurrency(grandTotal);

    const offer = {
      products: adjustedProducts,
      shipping,
      subTotal: subTotalBeforeFormatted,
      subTotalBeforeDiscount: subTotalBeforeFormatted,
      subTotalAfterDiscount: subTotalAfterFormatted,
      netSubtotal: subTotalAfterFormatted,
      grandTotal: grandTotalFormatted,
      discountTotal: discountFormatted,
      discount: discountFormatted,
      hasTaxes: false, // Not implemented in this version
      hasShipping: shipping.length > 0,
      currency_code: this.currency,
      shipping_charge_recurring_orders: false,
    };

    const couponCode =
      appliedCoupon?.code || appliedCoupon?.coupon_code || null;
    if (couponCode) {
      offer.coupon = {
        code: String(couponCode).trim(),
        discount_type: appliedCoupon?.discount_type,
        discount_value: appliedCoupon?.discount_value,
        amount: discountFormatted,
        discount_total: discountFormatted,
        applicable_products: appliedCoupon?.applicable_products,
        recurring: appliedCoupon?.recurring || false,
      };
    }

    if (discountAmount > 0) {
      offer.discounts = adjustedProducts
        .map((product) => ({
          id: product.id,
          amount: product.discount_total,
        }))
        .filter((entry) => Number(entry.amount) > 0);
    }

    return offer;
  }

  /**
   * Calculate discount amount based on coupon type and product eligibility
   * @param {Array} products - Product lines (with totals)
   * @param {Object} coupon - Coupon details
   * @returns {{ amount: number, allocations: Map<string, number> }} Discount summary
   */
  calculateDiscount(products, coupon) {
    const allocations = new Map();
    if (!coupon) return { amount: 0, allocations };

    const discountType = coupon.discount_type || coupon.type;
    let discountValue =
      coupon.discount_value != null ? coupon.discount_value : coupon.value;
    if (discountType === "percent" && discountValue > 1) {
      discountValue = discountValue / 100;
    }
    if (!discountType || !discountValue) {
      return { amount: 0, allocations };
    }

    // Determine eligible products based on coupon product selection
    let eligibleProducts = products;
    if (coupon.product_selection === "specific") {
      const applicable = Array.isArray(coupon.applicable_products)
        ? coupon.applicable_products.map(String)
        : [];
      eligibleProducts = applicable.length
        ? products.filter((product) =>
            applicable.includes(String(product.id))
          )
        : [];
    }

    if (eligibleProducts.length === 0) {
      return { amount: 0, allocations };
    }

    const eligibleSubtotal = eligibleProducts.reduce(
      (sum, product) => sum + product.total,
      0
    );

    let discountAmount = 0;

    if (discountType === "flat" || discountType === "fixed") {
      discountAmount = Math.min(Number(discountValue) || 0, eligibleSubtotal);
      if (discountAmount > 0 && eligibleSubtotal > 0) {
        const discountRatio = discountAmount / eligibleSubtotal;
        eligibleProducts.forEach((product, index) => {
          const lineDiscount = roundCurrency(product.total * discountRatio);
          allocations.set(product.id, lineDiscount);
        });
        const allocatedTotal = Array.from(allocations.values()).reduce(
          (sum, value) => sum + value,
          0
        );
        const roundingDiff = roundCurrency(discountAmount - allocatedTotal);
        if (roundingDiff !== 0) {
          const lastEligible = eligibleProducts[eligibleProducts.length - 1];
          allocations.set(
            lastEligible.id,
            roundCurrency((allocations.get(lastEligible.id) || 0) + roundingDiff)
          );
        }
      }
    } else if (discountType === "percent") {
      const discountRate = Math.min(Number(discountValue) || 0, 1);
      eligibleProducts.forEach((product) => {
        const lineDiscount = roundCurrency(product.total * discountRate);
        if (lineDiscount > 0) {
          allocations.set(product.id, lineDiscount);
          discountAmount += lineDiscount;
        }
      });
    }

    discountAmount = Math.min(discountAmount, eligibleSubtotal);

    return { amount: roundCurrency(discountAmount), allocations };
  }

  /**
   * Calculate shipping based on products and selected shipping type
   * @param {Array} products - Product lines
   * @param {Object} shippingType - Selected shipping type
   * @returns {Array} Shipping options array
   */
  calculateShipping(products, shippingType) {
    // Check if any products require shipping
    const requiresShipping = products.some(product => product.shipping);
    
    if (!requiresShipping || !shippingType) {
      return [];
    }

    return [{
      id: shippingType.id,
      name: shippingType.name,
      price: Number(shippingType.price) || 0
    }];
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

    return cart.items.every(item => 
      item.productId && 
      typeof item.name === 'string' && 
      typeof item.quantity === 'number' && 
      typeof item.price === 'number' &&
      typeof item.taxable === 'boolean' &&
      typeof item.requiresShipping === 'boolean'
    );
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

    return cart.items.map(item => item.productId);
  }
}

export default OfferEngine;
