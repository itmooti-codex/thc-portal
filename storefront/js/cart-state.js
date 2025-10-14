/*
 * Shared cart-state manager for THC portal pages.
 * Handles guest persistence via localStorage and provides hooks
 * where server-backed cart APIs can integrate for authenticated users.
 */
(function () {
  const GUEST_CART_KEY = "thc_portal_cart_guest_v1";
  const AUTH_CART_KEY = "thc_portal_cart_auth_v1";
  const PRODUCT_CACHE_KEY = "thc_portal_last_product_v1";

  const defaultState = () => ({ items: [], currency: "AUD" });

  const CANCELLED_CACHE_KEY = "thc_portal_cancelled_dispenses_v1";
  const CANCELLED_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

  let cancelledDispensesCache = null;

  const nowMs = () => Date.now();

  const readCancelledDispenses = () => {
    if (!isBrowser) return {};
    if (cancelledDispensesCache) return cancelledDispensesCache;
    try {
      const raw = sessionStorage.getItem(CANCELLED_CACHE_KEY);
      if (!raw) {
        cancelledDispensesCache = {};
        return cancelledDispensesCache;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        cancelledDispensesCache = parsed;
        return cancelledDispensesCache;
      }
    } catch (err) {
      console.warn("Cancelled dispense cache parse failed", err);
    }
    cancelledDispensesCache = {};
    return cancelledDispensesCache;
  };

  const writeCancelledDispenses = (cache) => {
    if (!isBrowser) return;
    cancelledDispensesCache = cache;
    try {
      sessionStorage.setItem(CANCELLED_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn("Cancelled dispense cache persist failed", err);
    }
  };

  const pruneCancelledDispenses = () => {
    const cache = readCancelledDispenses();
    const cutoff = nowMs() - CANCELLED_CACHE_MAX_AGE;
    let changed = false;
    Object.keys(cache).forEach((key) => {
      const ts = Number(cache[key]) || 0;
      if (!ts || ts < cutoff) {
        delete cache[key];
        changed = true;
      }
    });
    if (changed) writeCancelledDispenses({ ...cache });
    return cache;
  };

  const markDispenseCancelled = (dispenseId) => {
    if (!dispenseId) return;
    const cache = pruneCancelledDispenses();
    cache[String(dispenseId)] = nowMs();
    writeCancelledDispenses({ ...cache });
  };

  const unmarkDispenseCancelled = (dispenseId) => {
    if (!dispenseId) return;
    const cache = pruneCancelledDispenses();
    if (cache[String(dispenseId)]) {
      delete cache[String(dispenseId)];
      writeCancelledDispenses({ ...cache });
    }
  };

  const isDispenseMarkedCancelled = (dispenseId) => {
    if (!dispenseId) return false;
    const cache = pruneCancelledDispenses();
    const ts = Number(cache[String(dispenseId)]) || 0;
    if (!ts) return false;
    if (nowMs() - ts > CANCELLED_CACHE_MAX_AGE) {
      delete cache[String(dispenseId)];
      writeCancelledDispenses({ ...cache });
      return false;
    }
    return true;
  };

  const listeners = new Set();
  let state = defaultState();
  let initialized = false;

  const isBrowser = typeof window !== "undefined";

  const safeString = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const PLACEHOLDER_RE = /^\[[^\]]*\]$/;

  const cleanedString = (value) => {
    const str = safeString(value);
    if (!str) return "";
    if (PLACEHOLDER_RE.test(str)) return "";
    return str;
  };

  const getConfig = () => {
    if (!isBrowser) return {};
    try {
      return window.StorefrontConfig || {};
    } catch {
      return {};
    }
  };

  const getRoot = () => {
    if (!isBrowser) return null;
    try {
      return document.querySelector(".get-url");
    } catch {
      return null;
    }
  };

  const datasetPatientId = () => {
    if (!isBrowser) return "";
    const keys = [
      "patientToPayId",
      "patientToPayID",
      "patientId",
      "patientID",
      "patientid",
      "patientUid",
      "patientUID",
      "patientuid",
      "varPatientuid",
      "loggedInContactId",
      "contactId",
      "contactID",
      "contactid",
    ];
    const selectors = [
      ".get-url",
      "[data-patient-to-pay-id]",
      "[data-patient-id]",
      "[data-patientid]",
      "[data-patient_uid]",
      "[data-patientuid]",
      "[data-var-patientuid]",
      "[data-logged-in-contact-id]",
      "[data-contact-id]",
      "[data-contactid]",
    ];
    for (const selector of selectors) {
      let el = null;
      if (selector === ".get-url") {
        el = getRoot();
      } else {
        try {
          el = document.querySelector(selector);
        } catch {
          el = null;
        }
      }
      if (!el || !el.dataset) continue;
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(el.dataset, key)) {
          const value = cleanedString(el.dataset[key]);
          if (value) return value;
        }
      }
    }
    return "";
  };

  const envPatientId = () => {
    if (!isBrowser) return "";
    try {
      const candidates = [
        window.ENV?.patientToPayId,
        window.ENV?.patientId,
        window.patientToPayId,
        window.patientId,
        window.loggedInContactId,
      ];
      for (const candidate of candidates) {
        const value = cleanedString(candidate);
        if (value) return value;
      }
    } catch {
      return "";
    }
    return "";
  };

  const getPatientToPayId = () => {
    const config = getConfig();
    const rawConfig =
      config.patientToPayId !== undefined && config.patientToPayId !== null
        ? config.patientToPayId
        : config.loggedInContactId;
    const fromConfig = cleanedString(rawConfig);
    if (fromConfig) return fromConfig;
    const fromEnv = envPatientId();
    if (fromEnv) return fromEnv;
    return datasetPatientId();
  };

  const datasetContactId = () => {
    if (!isBrowser) return "";
    const selectors = [
      ".get-url",
      "[data-logged-in-contact-id]",
      "[data-contact-id]",
      "[data-contactid]",
    ];
    const keys = ["loggedInContactId", "contactId", "contactID", "contactid"];
    for (const selector of selectors) {
      let el = null;
      if (selector === ".get-url") {
        el = getRoot();
      } else {
        try {
          el = document.querySelector(selector);
        } catch {
          el = null;
        }
      }
      if (!el?.dataset) continue;
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(el.dataset, key)) {
          const value = cleanedString(el.dataset[key]);
          if (value) return value;
        }
      }
    }
    return "";
  };

  const envContactId = () => {
    if (!isBrowser) return "";
    try {
      const candidates = [
        window.ENV?.loggedInContactId,
        window.ENV?.contactId,
        window.loggedInContactId,
        window.contactId,
      ];
      for (const candidate of candidates) {
        const value = cleanedString(candidate);
        if (value) return value;
      }
    } catch {
      return "";
    }
    return "";
  };

  const getDispenseContactId = () => {
    const config = getConfig();
    const fromConfig = cleanedString(config.loggedInContactId);
    if (fromConfig) return fromConfig;
    const fromEnv = envContactId();
    if (fromEnv) return fromEnv;
    const fromDataset = datasetContactId();
    if (fromDataset) return fromDataset;
    const patient = getPatientToPayId();
    if (patient) return patient;
    return "";
  };

  const getPharmacyToDispenseId = () => {
    const config = getConfig();
    return cleanedString(config.dispensePharmacyId);
  };

  const DISPENSE_STATUS = {
    IN_CART: "149",
    CANCELLED: "146",
    PAID: "152",
  };

  const getApiBase = () => {
    if (!isBrowser) return "";
    try {
      const winBase = window.ENV?.API_BASE;
      const dataBase = getRoot()?.dataset?.apiBase;
      const metaBase = document
        .querySelector('meta[name="api-base"]')
        ?.getAttribute("content");
      const base = winBase || dataBase || metaBase || "http://localhost:3001";
      return new URL(base, window.location.href).toString().replace(/\/$/, "");
    } catch {
      return "http://localhost:3001";
    }
  };

  const callDispenseApi = async (endpoint, options = {}) => {
    if (!isBrowser) throw new Error("Dispense API unavailable in this context");
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const data = await response.json();
        if (data?.error) message = `${data.error} (${response.status})`;
      } catch {}
      throw new Error(message);
    }
    try {
      return await response.json();
    } catch {
      return null;
    }
  };

  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const toQuantity = (value, fallback = 1) => {
    const qty = Math.round(toNumber(value, fallback));
    return qty > 0 ? qty : fallback;
  };

  const isDispenseSyncEnabled = () =>
    isAuthenticated() && !!getPatientToPayId();

  let remoteSyncPromise = null;

  const isAuthenticated = () => {
    if (!isBrowser) return false;
    const patientId = getPatientToPayId();
    if (patientId) return true;
    try {
      const root = getRoot();
      return root?.dataset?.auth === "true";
    } catch {
      return false;
    }
  };

  const cloneState = (src = state) => ({
    currency: src.currency,
    items: src.items.map((item) => ({ ...item })),
  });

  const loadFromStorage = () => {
    if (!isBrowser) return defaultState();
    // Read BOTH storages to guard against mismatched auth flags across pages
    const readKey = (storage, key) => {
      try {
        const parsed = JSON.parse(storage.getItem(key) || "null");
        if (parsed && Array.isArray(parsed.items)) {
          return {
            currency: parsed.currency || "AUD",
            items: parsed.items.map((item) => ({ ...item })),
          };
        }
      } catch (err) {
        console.warn("Cart storage parse failed", key, err);
      }
      return null;
    };

    const guest = readKey(localStorage, GUEST_CART_KEY);
    const auth = readKey(sessionStorage, AUTH_CART_KEY);

    // Choose active store based on current auth, but merge items from the other store if present
    const preferAuth = isAuthenticated();
    const primary = preferAuth ? auth : guest;
    const secondary = preferAuth ? guest : auth;

    if (!primary && !secondary) return defaultState();

    const merged = { currency: (primary?.currency || secondary?.currency || "AUD"), items: [] };
    const byId = new Map();
    const pushAll = (src) => {
      if (!src) return;
      src.items.forEach((it) => {
        const id = String(it.id);
        const existing = byId.get(id);
        if (existing) {
          existing.qty = Math.max(Number(existing.qty) || 0, Number(it.qty) || 0) || 1;
          existing.price = Number(existing.price) || Number(it.price) || 0;
          existing.name = existing.name || it.name;
          existing.brand = existing.brand || it.brand;
          existing.image = existing.image || it.image;
          existing.description = existing.description || it.description;
          existing.url = existing.url || it.url;
          existing.productId = existing.productId || it.productId;
        } else {
          byId.set(id, { ...it, id });
        }
      });
    };
    pushAll(primary);
    pushAll(secondary);
    merged.items = Array.from(byId.values());
    return merged;
  };

  const persist = () => {
    if (!isBrowser) return;
    const key = isAuthenticated() ? AUTH_CART_KEY : GUEST_CART_KEY;
    const storage = isAuthenticated() ? sessionStorage : localStorage;
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn("Cart storage persist failed", err);
    }
  };

  const notify = () => {
    const snapshot = cloneState();
    listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error("Cart listener error", err);
      }
    });
  };

  const ensureInit = async () => {
    if (!initialized) {
      state = loadFromStorage();
      initialized = true;
      if (!isDispenseSyncEnabled()) {
        persist();
        notify();
      }
    }
    if (isDispenseSyncEnabled()) {
      const before = JSON.stringify(sortItems(state.items));
      await syncRemoteState({ force: true });
      const after = JSON.stringify(sortItems(state.items));
      if (before === after) {
        persist();
        notify();
      }
    }
    return cloneState();
  };

  const normaliseProduct = (product) => {
    if (!product || !product.id) throw new Error("Product requires an id");
    const result = {
      id: String(product.id),
      productId: String(product.productId || product.id), // Store payment ID separately
      name: product.name || "Untitled",
      price: toNumber(product.price, 0),
      image: product.image || "",
      brand: product.brand || "",
      description: product.description || "",
      url: product.url || "",
    };
    const paymentId = cleanedString(product.paymentId);
    if (paymentId) result.paymentId = paymentId;
    const dispenseId = cleanedString(product.dispenseId);
    if (dispenseId) result.dispenseId = dispenseId;
    const scriptId = cleanedString(product.scriptId);
    if (scriptId) result.scriptId = scriptId;
    result.retailGst = toNumber(product.retailGst, 0);
    result.wholesalePrice = toNumber(product.wholesalePrice, 0);
    if (product.requiresShipping === false) result.requiresShipping = false;
    const paymentProductId = cleanedString(product.paymentProductId);
    if (paymentProductId) result.paymentProductId = paymentProductId;
    const status = cleanedString(product.status);
    if (status) result.status = status;
    const statusLabel = cleanedString(product.statusLabel);
    if (statusLabel) result.statusLabel = statusLabel;
    const uniqueId = cleanedString(product.uniqueId);
    if (uniqueId) result.uniqueId = uniqueId;
    return result;
  };

  const findIndex = (id) => state.items.findIndex((item) => item.id === id);

  const normaliseRemoteItem = (remote) => {
    if (!remote) return null;
    try {
      const idCandidate =
        remote.id || remote.cartId || remote.productId || remote.dispenseId;
      const productIdCandidate =
        remote.productId || remote.paymentId || remote.id || idCandidate;
      const base = normaliseProduct({
        id: idCandidate || productIdCandidate || remote.dispenseId,
        productId: productIdCandidate || idCandidate,
        name: remote.name,
        price: remote.price,
        image: remote.image,
        brand: remote.brand,
        description: remote.description,
        url: remote.url,
        dispenseId: remote.dispenseId || remote.id,
        scriptId: remote.scriptId,
        retailGst: remote.retailGst,
        wholesalePrice: remote.wholesalePrice,
        paymentId: remote.paymentId || remote.payment_id,
        paymentProductId: remote.paymentProductId,
        status: remote.status,
        statusLabel: remote.statusLabel,
        uniqueId: remote.uniqueId,
      });
      base.qty = toQuantity(remote.qty ?? remote.quantity ?? remote.count ?? 1, 1);
      if (remote.requiresShipping === false) base.requiresShipping = false;
      if (remote.currency) base.currency = remote.currency;
      if (!base.id) base.id = base.productId;
      if (remote.status) base.status = safeString(remote.status);
      if (remote.statusLabel)
        base.statusLabel = safeString(remote.statusLabel);
      if (remote.uniqueId) base.uniqueId = safeString(remote.uniqueId);
      return base;
    } catch (err) {
      console.warn("Remote item normalisation failed", err, remote);
      return null;
    }
  };

  const sortItems = (items) =>
    Array.isArray(items)
      ? [...items].sort((a, b) =>
          String(a?.id || a?.dispenseId || "").localeCompare(
            String(b?.id || b?.dispenseId || "")
          )
        )
      : [];

  const itemsEqual = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      const ia = a[i];
      const ib = b[i];
      const keys = new Set([...Object.keys(ia), ...Object.keys(ib)]);
      for (const key of keys) {
        const va = ia[key];
        const vb = ib[key];
        if (typeof va === "number" && typeof vb === "number") {
          if (Math.abs(va - vb) > 0.0001) return false;
        } else if (String(va ?? "") !== String(vb ?? "")) {
          return false;
        }
      }
    }
    return true;
  };

  const syncRemoteState = async ({ force = false } = {}) => {
    if (!isDispenseSyncEnabled()) return cloneState();
    if (remoteSyncPromise && !force) return remoteSyncPromise;
    remoteSyncPromise = (async () => {
      try {
        const patientId = getPatientToPayId();
        if (!patientId) return cloneState();
        const params = [`contactId=${encodeURIComponent(patientId)}`];
        if (DISPENSE_STATUS.IN_CART) {
          params.push(
            `status=${encodeURIComponent(DISPENSE_STATUS.IN_CART)}`
          );
        }
        const response = await callDispenseApi(
          `/api-thc/dispenses?${params.join("&")}`
        );
        const remoteItemsRaw = Array.isArray(response?.items)
          ? response.items
          : [];
        const remoteItems = sortItems(
          remoteItemsRaw
            .map((item) => normaliseRemoteItem(item))
            .filter((item) => {
              if (!item) return false;
              if (item.dispenseId) {
                // Drop dispenses we recently cancelled even if the API still returns them
                if (isDispenseMarkedCancelled(item.dispenseId)) {
                  return false;
                }
              }
              if (item.status) {
                if (item.status !== DISPENSE_STATUS.IN_CART) {
                  return false;
                }
              }
              return true;
            })
        );
        remoteItems.forEach((item) => {
          if (item?.dispenseId) unmarkDispenseCancelled(item.dispenseId);
        });
        const currentItems = sortItems(cloneState().items);
        const changed = !itemsEqual(currentItems, remoteItems);
        if (changed) {
          state = {
            ...state,
            items: remoteItems,
          };
          persist();
          notify();
        }
        return cloneState();
      } catch (err) {
        console.warn("Dispense sync failed", err);
        return cloneState();
      } finally {
        remoteSyncPromise = null;
      }
    })();
    return remoteSyncPromise;
  };

  const createRemoteDispense = async (product, qty) => {
    const patientId = getPatientToPayId();
    if (!patientId) throw new Error("Missing patient id for dispense creation");
    const contactId = getDispenseContactId();
    if (!contactId) throw new Error("Missing contact id for dispense creation");
    const productId = cleanedString(
      product.productId || product.paymentId || product.id
    );
    if (!productId) throw new Error("Missing product id for dispense creation");
    const paymentId = cleanedString(product.paymentId) || productId;
    const payload = {
      contactId,
      productId,
      paymentId,
      quantity: toQuantity(qty, 1),
      retailPrice: toNumber(product.price, 0),
      retailGst: toNumber(product.retailGst, 0),
      wholesalePrice: toNumber(product.wholesalePrice, 0),
      scriptId: cleanedString(product.scriptId || "") || undefined,
      pharmacyId: getPharmacyToDispenseId() || undefined,
    };
    const response = await callDispenseApi("/api-thc/dispenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (response?.item) {
      return { ...response, item: normaliseRemoteItem(response.item) };
    }
    return response || {};
  };

  const updateRemoteDispense = async (dispenseId, updates = {}) => {
    if (!dispenseId) throw new Error("Missing dispense id for update");
    const payload = {};
    if (updates.quantity !== undefined)
      payload.quantity = toQuantity(updates.quantity, 1);
    if (updates.status) payload.status = String(updates.status);
    if (updates.retailPrice !== undefined)
      payload.retailPrice = toNumber(updates.retailPrice, 0);
    if (updates.retailGst !== undefined)
      payload.retailGst = toNumber(updates.retailGst, 0);
    if (updates.wholesalePrice !== undefined)
      payload.wholesalePrice = toNumber(updates.wholesalePrice, 0);
    if (updates.scriptId !== undefined)
      payload.scriptId = cleanedString(updates.scriptId) || undefined;
    const contactId = getDispenseContactId();
    if (contactId) payload.contactId = contactId;
    const pharmacyId = getPharmacyToDispenseId();
    if (pharmacyId) payload.pharmacyId = pharmacyId;
    const response = await callDispenseApi(
      `/api-thc/dispenses/${encodeURIComponent(dispenseId)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    if (response?.item) {
      return { ...response, item: normaliseRemoteItem(response.item) };
    }
    return response || {};
  };

  const updateRemoteQuantity = async (item, qty, baseProduct) => {
    const targetQty = toQuantity(qty, 1);
    const productData = baseProduct ? normaliseProduct(baseProduct) : item;
    await updateRemoteDispense(item.dispenseId, {
      quantity: targetQty,
      retailPrice: productData.price,
      retailGst: productData.retailGst,
      wholesalePrice: productData.wholesalePrice,
      scriptId: productData.scriptId,
    });
    return targetQty;
  };

  const cancelRemoteDispense = async (item) => {
    await updateRemoteDispense(item.dispenseId, {
      status: DISPENSE_STATUS.CANCELLED,
    });
    markDispenseCancelled(item.dispenseId);
  };

  const addItem = async (product, qty = 1) => {
    await ensureInit();
    const item = normaliseProduct(product);
    const count = toQuantity(qty, 1);
    const idx = findIndex(item.id);

    if (isDispenseSyncEnabled()) {
      if (idx >= 0) {
        const existing = state.items[idx];
        const nextQty = toQuantity((existing.qty || 0) + count, count);
        if (existing.dispenseId) {
          await updateRemoteQuantity(existing, nextQty, { ...existing, ...item });
          state.items[idx] = {
            ...existing,
            ...item,
            qty: nextQty,
            dispenseId: existing.dispenseId,
          };
        } else {
          const created = await createRemoteDispense({ ...existing, ...item }, nextQty);
          const remoteItem = created?.item || null;
          const merged = {
            ...existing,
            ...item,
            ...(remoteItem || {}),
            qty: remoteItem?.qty ?? nextQty,
          };
          if (!merged.dispenseId && created?.dispenseId)
            merged.dispenseId = created.dispenseId;
          if (merged.dispenseId) unmarkDispenseCancelled(merged.dispenseId);
          state.items[idx] = merged;
        }
      } else {
        const created = await createRemoteDispense(item, count);
        const remoteItem = created?.item || null;
        const merged = {
          ...item,
          ...(remoteItem || {}),
          qty: remoteItem?.qty ?? count,
        };
        if (!merged.dispenseId && created?.dispenseId)
          merged.dispenseId = created.dispenseId;
        if (merged.dispenseId) unmarkDispenseCancelled(merged.dispenseId);
        state.items.push(merged);
      }
    } else {
      if (idx >= 0) {
        const existing = state.items[idx];
        const nextQty = Math.max(1, (existing.qty || 0) + count);
        state.items[idx] = { ...existing, ...item, qty: nextQty };
      } else {
        state.items.push({ ...item, qty: Math.max(1, count) });
      }
    }

    persist();
    notify();
    return cloneState();
  };

  const updateQuantity = async (id, qty) => {
    await ensureInit();
    const idx = findIndex(String(id));
    if (idx < 0) return cloneState();
    const rawQty = Number(qty);
    const nextQty = rawQty <= 0 ? 0 : toQuantity(rawQty, 1);
    const item = state.items[idx];

    if (isDispenseSyncEnabled()) {
      if (nextQty === 0) {
        if (item.dispenseId) {
          await cancelRemoteDispense(item);
        }
        state.items.splice(idx, 1);
      } else {
        if (item.dispenseId) {
          await updateRemoteQuantity(item, nextQty, item);
        }
        state.items[idx] = { ...item, qty: nextQty };
        if (item.dispenseId) unmarkDispenseCancelled(item.dispenseId);
      }
    } else {
      if (nextQty === 0) {
        state.items.splice(idx, 1);
      } else {
        state.items[idx] = { ...item, qty: nextQty };
      }
    }

    persist();
    notify();
    return cloneState();
  };

  const removeItem = async (id) => updateQuantity(id, 0);

  const clear = async () => {
    await ensureInit();
    if (isDispenseSyncEnabled()) {
      const cancellable = state.items.filter((item) => item.dispenseId);
      await Promise.allSettled(
        cancellable.map((item) => cancelRemoteDispense(item))
      );
    }
    state = defaultState();
    persist();
    notify();
    return cloneState();
  };

  const getCount = () =>
    state.items.reduce((total, item) => total + (Number(item.qty) || 0), 0);

  const getSubtotal = () =>
    state.items.reduce((total, item) => {
      const unitPrice = toNumber(item.price, 0) + toNumber(item.retailGst, 0);
      return total + unitPrice * (Number(item.qty) || 0);
    }, 0);

  const getItem = (id) => {
    const idx = findIndex(String(id));
    return idx >= 0 ? { ...state.items[idx] } : null;
  };

  const subscribe = (fn) => {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const setState = (nextState) => {
    const items = Array.isArray(nextState?.items)
      ? nextState.items
          .map((item) => {
            try {
              const idCandidate =
                item.id || item.productId || item.dispenseId || item.paymentId;
              const base = normaliseProduct({
                ...item,
                id: idCandidate,
                productId: item.productId || idCandidate,
                dispenseId: item.dispenseId,
                scriptId: item.scriptId,
                retailGst: item.retailGst,
                wholesalePrice: item.wholesalePrice,
              });
              base.qty = toQuantity(item.qty, 1);
              if (item.requiresShipping === false)
                base.requiresShipping = false;
              if (item.dispenseId) base.dispenseId = safeString(item.dispenseId);
              return base;
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      : [];
    state = {
      currency: nextState?.currency || "AUD",
      items,
    };
    persist();
    notify();
    return cloneState();
  };

  const saveProductSnapshot = (product) => {
    if (!isBrowser) return;
    try {
      const payload = normaliseProduct(product);
      localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Product cache failed", err);
    }
  };

  const loadProductSnapshot = () => {
    if (!isBrowser) return null;
    try {
      const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("Product cache parse failed", err);
      return null;
    }
  };

  const clearProductSnapshot = () => {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(PRODUCT_CACHE_KEY);
    } catch (err) {
      console.warn("Product cache clear failed", err);
    }
  };

  const cartInterface = {
    init: ensureInit,
    setState,
    subscribe,
    addItem,
    updateQuantity,
    removeItem,
    clear,
    getState: () => cloneState(),
    getItem,
    getCount,
    getSubtotal,
    isAuthenticated,
    saveProductSnapshot,
    loadProductSnapshot,
    clearProductSnapshot,
  };

  Object.defineProperty(cartInterface, "items", {
    get() {
      return cloneState().items;
    },
  });

  if (isBrowser) {
    window.Cart = cartInterface;

    const triggerInit = () =>
      ensureInit().catch((err) =>
        console.warn("Initial cart sync failed", err)
      );

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", triggerInit, { once: true });
    } else {
      triggerInit();
    }

    if (!isDispenseSyncEnabled()) {
      let retries = 0;
      const interval = window.setInterval(() => {
        if (isDispenseSyncEnabled()) {
          window.clearInterval(interval);
          triggerInit();
        } else if (retries >= 10) {
          window.clearInterval(interval);
        }
        retries += 1;
      }, 300);
    }
  }
})();
