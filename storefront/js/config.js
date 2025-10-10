(() => {
  const defaults = {
    /**
     * Set to the Ontraport contact ID for the logged in user. Leave empty for guests.
     */
    loggedInContactId: "546",
    /**
     * Ontraport gateway ID to charge transactions against.
     */
    paymentGatewayId: 1,
    /**
     * Ontraport invoice template ID used for generated invoices.
     */
    invoiceTemplateId: 1,
    /**
     * Restrict shipping types to these Ontraport IDs. Leave empty to allow all.
     */
    shippingTypeIds: [1, 2],
  };

  const existing = window.StorefrontConfig || {};
  window.StorefrontConfig = Object.assign({}, defaults, existing);
})();
