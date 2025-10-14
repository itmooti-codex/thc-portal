// const loggedInContactIdFromOp = "546";
// const paymentGatewayIdFromOp = 1;
// const invoiceTemplateIdFromOp = 1;
// const shippingTypeIdsFromOp = [1, 2];
// const patientToPayIdFromOp = "546";
// const pharmacyToDispenseIdFromOp = "123";

(() => {
  const defaults = {
    /**
     * Set to the Ontraport contact ID for the logged in user. Leave empty for guests.
     */
    loggedInContactId: loggedInContactIdFromOp,
    /**
     * Patient to Pay (f2787) identifier used when creating dispenses.
     * Falls back to loggedInContactId if not provided explicitly.
     */
    patientToPayId: patientToPayIdFromOp,
    /**
     * Pharmacy to Dispense (f2290) identifier sent with dispense payloads.
     */
    dispensePharmacyId: pharmacyToDispenseIdFromOp,
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
