const loggedInContactIdFromOp = "526";
const paymentGatewayIdFromOp = 1;
const invoiceTemplateIdFromOp = 1;
const shippingTypeIdsFromOp = [1, 2];
const pharmacyToDispenseIdFromOp = "123";


(() => {
  const defaults = {
    /**
     * Set to the Ontraport contact ID for the logged in user. Leave empty for guests.
     */
    loggedInContactId: loggedInContactIdFromOp,
    /**
     * Ontraport gateway ID to charge transactions against.
     */
    paymentGatewayId: paymentGatewayIdFromOp,
    /**
     * Ontraport invoice template ID used for generated invoices.
     */
    invoiceTemplateId: invoiceTemplateIdFromOp,
    /**
     * Restrict shipping types to these Ontraport IDs. Leave empty to allow all.
     */
    shippingTypeIds: shippingTypeIdsFromOp,
  };

  const existing = window.StorefrontConfig || {};
  window.StorefrontConfig = Object.assign({}, defaults, existing);
})();
