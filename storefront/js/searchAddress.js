(function () {
  // --------- Safe getters ----------
  const $ = (id) => document.getElementById(id);

  const AUTOCOMPLETE_SELECTOR = "[data-address-autocomplete]";

  const getGroups = () =>
    Array.from(document.querySelectorAll(AUTOCOMPLETE_SELECTOR))
      .map((input) => {
        const prefix = (input.dataset.addressAutocomplete || "").trim();
        if (!prefix) return null;
        const field = (suffix) => $(`${prefix}_${suffix}`);
        const group = {
          input,
          prefix,
          fields: {
            addr1: field("addr1"),
            addr2: field("addr2"),
            city: field("city"),
            state: field("state"),
            postal: field("postal"),
            country: field("country"),
          },
        };
        return group.fields.addr1 ? group : null;
      })
      .filter(Boolean);

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
  function clearGroupFields(group) {
    if (!group) return;

    ["addr1", "addr2", "city", "postal"].forEach((key) => {
      const el = group.fields[key];
      if (el) el.value = "";
    });

    const stateSel = group.fields.state;
    if (stateSel) stateSel.value = "";

    forceAustraliaSelection(group.fields.country);
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
  function setupAutocomplete(group) {
    if (!group || !group.input) return;

    const ac = new google.maps.places.Autocomplete(group.input, {
      types: ["geocode"],
      componentRestrictions: { country: "au" },
    });

    ac.addListener("place_changed", () => {
      group.input.blur();
      clearGroupFields(group);

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

      const { fields } = group;
      if (fields.addr1) fields.addr1.value = addr1;
      if (fields.addr2) fields.addr2.value = addr2;
      if (fields.city) fields.city.value = locality;
      if (fields.postal) fields.postal.value = postalCode;

      setSelectValue(fields.state, stateShort || "");
      setSelectValue(fields.country, countryLong || "Australia");

      if (!addr1 && fields.addr1) fields.addr1.focus();
    });

    // Small UX: prevent Enter from submitting the whole form while choosing a suggestion
    group.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });

    group.input.__thcAutocomplete = ac;
  }

  function tryInitAutocomplete() {
    if (initialized) return;
    const groups = getGroups();
    if (!groups.length) return;
    if (!window.google || !google.maps || !google.maps.places) return;

    groups.forEach((group) => setupAutocomplete(group));
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
