(() => {
  "use strict";

  const STATUS_IDS = {
    CANCELLED: "146",
    IN_TRANSIT: "147",
    CONFIRMED: "148",
    IN_CART: "149",
    PAYMENT_PROCESSING: "151",
    PAID: "152",
    SENT_AWAITING_CONFIRMATION: "326",
    PAYMENT_ISSUE: "327",
    TRACKING_ADDED: "605",
    ON_HOLD: "675",
    FULFILLED: "677",
  };

  const STATUS_LABELS = {
    "146": "Cancelled",
    "147": "In Transit",
    "148": "Confirmed - In Progress",
    "149": "In Cart",
    "151": "Payment Processing",
    "152": "Paid",
    "326": "Sent – Awaiting Confirmation",
    "327": "Payment Issue",
    "605": "Tracking Added",
    "675": "On Hold",
    "677": "Fulfilled",
  };

  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, Math.max(0, ms || 0)));

  const getRootEl = () => {
    try {
      return (
        document.querySelector(".get-url") ||
        document.body ||
        document.documentElement
      );
    } catch {
      return null;
    }
  };

  const getApiBase = () => {
    try {
      const envBase = window.ENV?.API_BASE;
      const dataBase = getRootEl()?.dataset?.apiBase;
      const metaBase = document
        .querySelector('meta[name="api-base"]')
        ?.getAttribute("content");
      const fallback = "http://localhost:3001";
      const candidate = envBase || dataBase || metaBase || fallback;
      const resolved = new URL(candidate, window.location.href).toString();
      return resolved.replace(/\/+$/, "");
    } catch {
      return "http://localhost:3001";
    }
  };

  const collectHeaders = (headers = {}, hasBody = false) => {
    const next = new Headers(headers);
    if (hasBody && !next.has("Content-Type")) {
      next.set("Content-Type", "application/json");
    }
    return next;
  };

  const apiCall = async (endpoint, options = {}) => {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const hasBody =
      options.body !== undefined && options.body !== null && options.body !== "";
    const response = await fetch(url, {
      method: options.method || "GET",
      credentials: options.credentials || "same-origin",
      ...options,
      headers: collectHeaders(options.headers, hasBody),
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!response.ok) {
      const message =
        (data && typeof data === "object" && data.error) ||
        `Request failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  };

  const fetchScript = async (scriptId) => {
    if (!scriptId) return null;
    const id = String(scriptId).trim();
    if (!id) return null;
    const result = await apiCall(
      `/api-thc/scripts/${encodeURIComponent(id)}`
    ).catch((err) => {
      console.error("[DispenseService] fetchScript failed", err);
      throw err;
    });
    return result?.script || result || null;
  };

  const waitForScriptDispense = async (scriptId, options = {}) => {
    const attempts = Math.max(1, parseInt(options.attempts || 5, 10) || 5);
    const delayMs = Math.max(150, parseInt(options.delayMs || 750, 10) || 750);
    let latest = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
      latest = await fetchScript(scriptId).catch(() => null);
      if (latest && latest.dispenseId) {
        return latest;
      }
      if (attempt < attempts - 1) {
        await sleep(delayMs);
      }
    }
    return latest;
  };

  const ensureScriptDispense = async (scriptId, options = {}) => {
    if (!scriptId) {
      throw new Error("scriptId is required");
    }
    const id = String(scriptId).trim();
    if (!id) {
      throw new Error("scriptId is required");
    }
    await apiCall(`/api-thc/scripts/${encodeURIComponent(id)}/dispense`, {
      method: "POST",
    });
    return await waitForScriptDispense(id, options);
  };

  const updateDispenseStatus = async (dispenseId, status) => {
    if (!dispenseId) throw new Error("dispenseId is required");
    const id = String(dispenseId).trim();
    if (!id) throw new Error("dispenseId is required");
    const payload =
      typeof status === "object"
        ? status
        : {
            status,
          };
    return await apiCall(
      `/api-thc/dispenses/${encodeURIComponent(id)}/status`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  };

  const service = {
    statusIds: STATUS_IDS,
    statusLabels: STATUS_LABELS,
    getApiBase,
    apiCall,
    fetchScript,
    ensureScriptDispense,
    waitForScriptDispense,
    updateDispenseStatus,
  };

  window.DispenseService = Object.assign(
    window.DispenseService || {},
    service
  );
})();
