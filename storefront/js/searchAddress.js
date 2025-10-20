(function () {
  // --------- Safe getters ----------
  const $ = (id) => document.getElementById(id);

  const hasAddressFields = () => $("autocomplete") && $("ship_addr1");
  let initialized = false;

  const AUSTRALIA_LABEL = "Australia";

  const isCountrySelect = (el) =>
    el && el.tagName === "SELECT" && /country$/i.test(el.id || "");

  const forceAustraliaSelection = (el) => {
    if (!el) return;
    const options = Array.from(el.options || []);
    const match =
      options.find((option) =>
        /^australia$/i.test(option.text || option.value)
      ) || options[0];
    if (match) {
      el.value = match.value || AUSTRALIA_LABEL;
    } else {
      el.value = AUSTRALIA_LABEL;
    }
  };

  const GOOGLE_READY_FLAG = "__thcGooglePlacesReady";
  if (typeof window !== "undefined" && window[GOOGLE_READY_FLAG] === undefined) {
    window[GOOGLE_READY_FLAG] = false;
  }

  // --------- Field helpers ----------
  function clearShipFields() {
    ["ship_addr1", "ship_addr2", "ship_city", "ship_postal"].forEach((id) => {
      const el = $(id);
      if (el) el.value = "";
    });

    // State & Country are selects
    const stateSel = $("ship_state");
    if (stateSel) stateSel.value = "";

    forceAustraliaSelection($("ship_country"));
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    if (isCountrySelect(selectEl)) {
      forceAustraliaSelection(selectEl);
      return;
    }
    const target = String(value || "")
      .trim()
      .toUpperCase();
    // Match by value or visible text (case-insensitive)
    const match = [...selectEl.options].find(
      (o) =>
        (o.value || "").toUpperCase() === target ||
        (o.text || "").toUpperCase() === target
    );
    if (match) selectEl.value = match.value;
  }

  function onDomReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  // --------- Google Places Autocomplete ----------
  function setupAutocomplete() {
    const input = $("autocomplete");
    if (!input) return;

    const ac = new google.maps.places.Autocomplete(input, {
      types: ["geocode"],
      componentRestrictions: { country: "au" },
    });

    ac.addListener("place_changed", () => {
      input.blur();
      clearShipFields();

      const place = ac.getPlace();
      if (!place || !place.address_components) return;

      // Extract components
      let streetNumber = "";
      let route = "";
      let subpremise = ""; // unit/apt
      let locality = "";
      let stateShort = "";
      let postalCode = "";
      let countryLong = "";

      for (const c of place.address_components) {
        const t = c.types;
        if (t.includes("street_number")) streetNumber = c.long_name;
        else if (t.includes("route")) route = c.long_name;
        else if (t.includes("subpremise")) subpremise = c.long_name;
        else if (t.includes("locality")) locality = c.long_name;
        else if (t.includes("administrative_area_level_1"))
          stateShort = c.short_name; // e.g. NSW
        else if (t.includes("postal_code")) postalCode = c.long_name;
        else if (t.includes("country")) countryLong = c.long_name;
      }

      const addr1 = [streetNumber, route].filter(Boolean).join(" ").trim();
      const addr2 = subpremise; // keep simple (no lot/property name as requested)

      // Populate fields
      if ($("ship_addr1")) $("ship_addr1").value = addr1;
      if ($("ship_addr2")) $("ship_addr2").value = addr2;
      if ($("ship_city")) $("ship_city").value = locality;
      if ($("ship_postal")) $("ship_postal").value = postalCode;

      setSelectValue($("ship_state"), stateShort || "");
      setSelectValue($("ship_country"), countryLong || "Australia");

      // Optional: scroll next required field into view if addr1 is empty
      if (!addr1 && $("ship_addr1")) $("ship_addr1").focus();
    });

    // Small UX: prevent Enter from submitting the whole form while choosing a suggestion
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });
  }

  function tryInitAutocomplete() {
    if (initialized) return;
    if (!hasAddressFields()) return;
    if (!window.google || !google.maps || !google.maps.places) return;

    setupAutocomplete();
    initialized = true;
  }

  const triggerInit = () => {
    onDomReady(tryInitAutocomplete);
  };

  // Try immediately (covers cached API loads) and again if the flag was set
  triggerInit();
  if (window[GOOGLE_READY_FLAG]) {
    triggerInit();
  }

  window.initAutocomplete = () => {
    window[GOOGLE_READY_FLAG] = true;
    triggerInit();
  };
})();
