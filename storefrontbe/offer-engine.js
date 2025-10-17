/**
 * Server-side offer building engine for pricing, discounts, and shipping calculations
 * Implements the pricing logic as specified in the requirements
 */

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
    const products = cartItems.map(item => {
      const unitPrice = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const total = unitPrice * quantity;
      
      return {
        id: item.productId,
        quantity,
        total: Math.max(0, total), // Ensure non-negative
        price: Math.max(0, unitPrice), // Keep per-unit price for downstream processors
        taxable: Boolean(item.taxable),
        type: "one_time",
        shipping: Boolean(item.requiresShipping)
      };
    });

    // Calculate subtotal
    const subTotal = products.reduce((sum, product) => sum + product.total, 0);

    // Apply coupon discount if applicable
    let discountAmount = 0;
    if (appliedCoupon) {
      discountAmount = this.calculateDiscount(products, appliedCoupon);
    }

    // Calculate shipping
    const shipping = this.calculateShipping(products, shippingType);
    const shippingTotal = shipping.reduce((sum, ship) => sum + (Number(ship.price) || 0), 0);

    // Recompute unit prices from updated totals after discount so the gateway can charge adjusted amounts
    products.forEach((p) => {
      const q = p.quantity || 1;
      const unit = q > 0 ? p.total / q : p.total;
      const unitRounded = Math.max(0, Math.round(unit * 100) / 100);
      const unitStr = unitRounded.toFixed(2);
      // Provide both numeric and string forms, and an override flag for gateways that require it
      p.price = unitStr;
      p.amount = unitStr;
      p.price_override = true;
      // Also normalize total to string for consistency
      p.total = (Math.max(0, Math.round((p.total || 0) * 100) / 100)).toFixed(2);
    });

    // Calculate final totals
    const grandTotal = Math.max(0, subTotal + shippingTotal - discountAmount);

    const offer = {
      products,
      shipping,
      subTotal: Math.max(0, Math.round(subTotal * 100) / 100),
      grandTotal: Math.max(0, Math.round(grandTotal * 100) / 100),
      hasTaxes: false, // Not implemented in this version
      hasShipping: shipping.length > 0,
      currency_code: this.currency,
      shipping_charge_recurring_orders: false
    };

    const couponCode =
      appliedCoupon?.code || appliedCoupon?.coupon_code || null;
    if (couponCode) {
      offer.coupon = { code: String(couponCode).trim() };
    }

    return offer;
  }

  /**
   * Calculate discount amount based on coupon type and product eligibility
   * @param {Array} products - Product lines
   * @param {Object} coupon - Coupon details
   * @returns {number} Discount amount
   */
  calculateDiscount(products, coupon) {
    if (!coupon) return 0;
    const discountType = coupon.discount_type || coupon.type;
    let discountValue = coupon.discount_value != null ? coupon.discount_value : coupon.value;
    if (discountType === "percent" && discountValue > 1) {
      discountValue = discountValue / 100;
    }
    if (!discountType || !discountValue) {
      return 0;
    }

    // Determine eligible products based on coupon product selection
    let eligibleProducts = products;
    if (coupon.product_selection === "specific") {
      const applicable = Array.isArray(coupon.applicable_products) ? coupon.applicable_products.map(String) : [];
      eligibleProducts = applicable.length ? products.filter(product => applicable.includes(String(product.id))) : [];
    }

    if (eligibleProducts.length === 0) {
      return 0;
    }

    const eligibleSubtotal = eligibleProducts.reduce((sum, product) => sum + product.total, 0);

    let discountAmount = 0;

    if (discountType === "flat" || discountType === "fixed") {
      // Flat discount - apply to eligible lines proportionally
      discountAmount = Math.min(Number(discountValue) || 0, eligibleSubtotal);
      
      // Apply discount proportionally to each eligible line
      if (discountAmount > 0 && eligibleSubtotal > 0) {
        const discountRatio = discountAmount / eligibleSubtotal;
        eligibleProducts.forEach(product => {
          const lineDiscount = product.total * discountRatio;
          product.total = Math.max(0, product.total - lineDiscount);
        });
      }
    } else if (discountType === "percent") {
      // Percentage discount
      const discountRate = Math.min(Number(discountValue) || 0, 1); // Cap at 100%
      discountAmount = eligibleSubtotal * discountRate;
      
      // Apply discount to each eligible line
      eligibleProducts.forEach(product => {
        product.total = Math.max(0, product.total * (1 - discountRate));
      });
    }

    return Math.max(0, discountAmount);
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
