(function () {
  // --------- Safe getters ----------
  const $ = (id) => document.getElementById(id);

  // Guard: only run if the form exists
  if (!$("autocomplete") || !$("ship_addr1")) return;

  // --------- Field helpers ----------
  function clearShipFields() {
    ["ship_addr1", "ship_addr2", "ship_city", "ship_postal"].forEach((id) => {
      const el = $(id);
      if (el) el.value = "";
    });

    // State & Country are selects
    const stateSel = $("ship_state");
    if (stateSel) stateSel.value = "";

    const countrySel = $("ship_country");
    if (countrySel) {
      // default to Australia (first option) but clear first
      countrySel.value =
        [...countrySel.options].find((o) =>
          /^australia$/i.test(o.text || o.value)
        )?.value ??
        countrySel.options[0]?.value ??
        "";
    }
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
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

  // --------- Google Places Autocomplete ----------
  function initAutocomplete() {
    // Guard if Google isn't loaded
    if (!window.google || !google.maps || !google.maps.places) return;

    const input = $("autocomplete");
    const ac = new google.maps.places.Autocomplete(input, {
      types: ["geocode"],
      componentRestrictions: { country: "au" },
    });

    let lastToken = "";

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

  // --------- Boot ----------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutocomplete, {
      once: true,
    });
  } else {
    initAutocomplete();
  }
})();
