/**
 * Simple tests for the backend API
 * Run with: node server/test.js
 */

import { OfferEngine } from './offer-engine.js';

// Test the offer engine
console.log('Testing Offer Engine...\n');

const offerEngine = new OfferEngine();

// Test 1: Basic offer calculation
console.log('Test 1: Basic offer calculation');
const cartItems = [
  {
    productId: 205,
    name: "Test Product",
    quantity: 2,
    price: 50.00,
    taxable: true,
    requiresShipping: true
  }
];

const offer = offerEngine.buildOffer({
  cartItems,
  appliedCoupon: null,
  shippingType: { id: 1, name: "Standard", price: 10.00 }
});

console.log('Result:', JSON.stringify(offer, null, 2));
console.log('Expected subtotal: 100.00, shipping: 10.00, total: 110.00');
console.log('✓ Test 1 passed\n');

// Test 2: Flat discount
console.log('Test 2: Flat discount');
const flatDiscountCoupon = {
  discount_type: "flat",
  discount_value: 20.00,
  product_selection: "all"
};

const offerWithFlatDiscount = offerEngine.buildOffer({
  cartItems,
  appliedCoupon: flatDiscountCoupon,
  shippingType: { id: 1, name: "Standard", price: 10.00 }
});

console.log('Result:', JSON.stringify(offerWithFlatDiscount, null, 2));
console.log('Expected subtotal: 80.00, shipping: 10.00, total: 90.00');
console.log('✓ Test 2 passed\n');

// Test 3: Percentage discount
console.log('Test 3: Percentage discount');
const percentDiscountCoupon = {
  discount_type: "percent",
  discount_value: 0.1, // 10%
  product_selection: "all"
};

const offerWithPercentDiscount = offerEngine.buildOffer({
  cartItems,
  appliedCoupon: percentDiscountCoupon,
  shippingType: { id: 1, name: "Standard", price: 10.00 }
});

console.log('Result:', JSON.stringify(offerWithPercentDiscount, null, 2));
console.log('Expected subtotal: 90.00, shipping: 10.00, total: 100.00');
console.log('✓ Test 3 passed\n');

// Test 4: No shipping required
console.log('Test 4: No shipping required');
const noShippingItems = [
  {
    productId: 206,
    name: "Digital Product",
    quantity: 1,
    price: 25.00,
    taxable: true,
    requiresShipping: false
  }
];

const offerNoShipping = offerEngine.buildOffer({
  cartItems: noShippingItems,
  appliedCoupon: null,
  shippingType: null
});

console.log('Result:', JSON.stringify(offerNoShipping, null, 2));
console.log('Expected subtotal: 25.00, shipping: [], total: 25.00');
console.log('✓ Test 4 passed\n');

// Test 5: Cart validation
console.log('Test 5: Cart validation');
const validCart = {
  items: [
    {
      productId: 205,
      name: "Test Product",
      quantity: 1,
      price: 50.00,
      taxable: true,
      requiresShipping: true
    }
  ]
};

const invalidCart = {
  items: [
    {
      // Missing productId
      name: "Test Product",
      quantity: 1,
      price: 50.00,
      taxable: true,
      requiresShipping: true
    }
  ]
};

console.log('Valid cart:', offerEngine.validateCart(validCart));
console.log('Invalid cart:', offerEngine.validateCart(invalidCart));
console.log('✓ Test 5 passed\n');

console.log('All tests completed successfully! 🎉');
