/*
 * Shared cart-state manager for THC portal pages.
 * Handles guest persistence via localStorage and provides hooks
 * where server-backed cart APIs can integrate for authenticated users.
 */
(function () {
  const GUEST_CART_KEY = "thc_portal_cart_guest_v1";
  const AUTH_CART_KEY = "thc_portal_cart_auth_v1";
  const PRODUCT_CACHE_KEY = "thc_portal_last_product_v1";
  const STORAGE_TTL_MS = 60 * 1000; // 1 minute guest cache window to avoid stale data
  const PRODUCT_CACHE_TTL_MS = 60 * 1000;

  const defaultState = () => ({ items: [], currency: "AUD" });

  const listeners = new Set();
  let state = defaultState();
  let initialized = false;

  const isBrowser = typeof window !== "undefined";

  const isAuthenticated = () => {
    if (!isBrowser) return false;
    try {
      const root = document.querySelector(".get-url");
      if (root?.dataset?.auth === "true") return true;
      const contactAttr =
        root?.dataset?.contactId ||
        root?.dataset?.contactid ||
        root?.dataset?.contact ||
        root?.dataset?.userId;
      if (contactAttr != null && String(contactAttr).trim().length) {
        return true;
      }
    } catch {}
    try {
      const config = window.StorefrontConfig || {};
      const contactId =
        config.loggedInContactId ??
        config.contactId ??
        config.customerId ??
        config.userId ??
        config.memberId;
      if (contactId != null && String(contactId).trim().length) {
        return true;
      }
    } catch {}
    return false;
  };

  const cloneState = (src = state) => ({
    currency: src.currency,
    items: src.items.map((item) => ({ ...item })),
  });

  const clearStorageKey = (storage, key) => {
    if (!storage || typeof storage.removeItem !== "function") return;
    try {
      storage.removeItem(key);
    } catch (err) {
      console.warn("Cart storage cleanup failed", key, err);
    }
  };

  const persistSnapshotToStorage = (storage, key, snapshot) => {
    if (!storage || typeof storage.setItem !== "function") return;
    try {
      const payload = {
        currency: snapshot?.currency || "AUD",
        items: Array.isArray(snapshot?.items)
          ? snapshot.items.map((item) => ({ ...item }))
          : [],
        savedAt: Date.now(),
      };
      storage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn("Cart storage persist failed", key, err);
    }
  };

  const clearGuestPersistence = () => {
    if (!isBrowser) return;
    clearStorageKey(localStorage, GUEST_CART_KEY);
  };

  const clearAuthPersistence = () => {
    if (!isBrowser) return;
    clearStorageKey(sessionStorage, AUTH_CART_KEY);
  };

  const clearAllPersistence = () => {
    clearGuestPersistence();
    clearAuthPersistence();
  };

  const loadFromStorage = () => {
    if (!isBrowser) return defaultState();
    // Read BOTH storages to guard against mismatched auth flags across pages
    const readKey = (storage, key) => {
      if (!storage || typeof storage.getItem !== "function") return null;
      try {
        const parsed = JSON.parse(storage.getItem(key) || "null");
        if (parsed && typeof parsed === "object") {
          const savedAt = Number(parsed.savedAt) || 0;
          const expired =
            !savedAt || Date.now() - savedAt > STORAGE_TTL_MS;
          if (expired) {
            storage.removeItem(key);
            return null;
          }
        }
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

    if (isAuthenticated()) {
      if (guest && !auth) {
        persistSnapshotToStorage(sessionStorage, AUTH_CART_KEY, guest);
      }
      if (guest) {
        clearGuestPersistence();
      }
      return auth || guest || defaultState();
    }

    // Merge any leftover authenticated cart into the guest cart so the user keeps
    // their selections after logging out, but prefer the guest snapshot.
    const primary = guest;
    const secondary = auth;

    if (!primary && !secondary) return defaultState();

    const merged = {
      currency: primary?.currency || secondary?.currency || "AUD",
      items: [],
    };
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
          if (existing.scriptId == null && it.scriptId != null) {
            existing.scriptId = it.scriptId;
          }
          if (existing.isScript == null && it.isScript != null) {
            existing.isScript = it.isScript;
          } else if (existing.isScript !== true && existing.scriptId) {
            existing.isScript = true;
          }
          if (!existing.dispenseId && it.dispenseId) {
            existing.dispenseId = it.dispenseId;
          }
          if (!existing.dispenseStatus && it.dispenseStatus) {
            existing.dispenseStatus = it.dispenseStatus;
          }
          if (!existing.dispenseStatusId && it.dispenseStatusId) {
            existing.dispenseStatusId = it.dispenseStatusId;
          }
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
    const snapshot = cloneState();
    if (isAuthenticated()) {
      persistSnapshotToStorage(sessionStorage, AUTH_CART_KEY, snapshot);
      clearGuestPersistence();
      return;
    }
    persistSnapshotToStorage(localStorage, GUEST_CART_KEY, snapshot);
    clearAuthPersistence();
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

  const parseBooleanish = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return undefined;
      if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
    }
    return undefined;
  };

  const ensureInit = async () => {
    if (initialized) return cloneState();
    state = loadFromStorage();
    initialized = true;
    // Normalize persistence to the current auth store so future reads are consistent
    persist();
    notify();
    return cloneState();
  };

  const normaliseProduct = (product) => {
    if (!product || !product.id) throw new Error("Product requires an id");
    const normalised = {
      id: String(product.id),
      productId: String(product.productId || product.id), // Store payment ID separately
      name: product.name || "Untitled",
      price: Number(product.price) || 0,
      image: product.image || "",
      brand: product.brand || "",
      description: product.description || "",
      url: product.url || "",
    };
    const optionalKeys = [
      "scriptId",
      "dispenseId",
      "dispenseStatus",
      "dispenseStatusId",
      "dispenseStatusLabel",
      "retailGst",
      "wholesalePrice",
      "requiresShipping",
      "dispenseItemId",
      "itemId",
    ];
    optionalKeys.forEach((key) => {
      if (product[key] !== undefined) {
        normalised[key] = product[key];
      }
    });
    if (product.taxable !== undefined) {
      const taxable = parseBooleanish(product.taxable);
      if (taxable === null) {
        normalised.taxable = null;
      } else if (taxable !== undefined) {
        normalised.taxable = taxable;
      }
    }
    if (
      normalised.dispenseItemId === undefined ||
      normalised.dispenseItemId === null
    ) {
      normalised.dispenseItemId = normalised.productId || normalised.id;
    }
    if (product.isScript !== undefined) {
      normalised.isScript = Boolean(product.isScript);
    } else if (product.scriptId) {
      normalised.isScript = true;
    }
    if (!normalised.dispenseStatus && product.dispenseStatusLabel) {
      normalised.dispenseStatus = product.dispenseStatusLabel;
    }
    return normalised;
  };

  const findIndex = (id) => state.items.findIndex((item) => item.id === id);

  const addItem = async (product, qty = 1) => {
    await ensureInit();
    const item = normaliseProduct(product);
    const count = Number(qty) || 1;
    const idx = findIndex(item.id);
    if (idx >= 0) {
      state.items[idx].qty = Math.max(1, (state.items[idx].qty || 0) + count);
    } else {
      state.items.push({ ...item, qty: Math.max(1, count) });
    }
    persist();
    notify();
    return cloneState();
  };

  const updateQuantity = async (id, qty) => {
    await ensureInit();
    const idx = findIndex(String(id));
    if (idx < 0) return cloneState();
    const nextQty = Math.max(0, Number(qty) || 0);
    if (nextQty === 0) {
      state.items.splice(idx, 1);
    } else {
      state.items[idx].qty = nextQty;
    }
    persist();
    notify();
    return cloneState();
  };

  const removeItem = async (id) => updateQuantity(id, 0);

  const updateItemMetadata = async (id, patch = {}) => {
    await ensureInit();
    const targetId = String(id);
    const idx = findIndex(targetId);
    if (idx < 0 || !patch || typeof patch !== "object") {
      return cloneState();
    }
    const current = state.items[idx] || {};
    const next = { ...current };
    let changed = false;

    const assign = (key, value) => {
      if (value === undefined) return;
      if (value === null) {
        if (next[key] !== undefined) {
          delete next[key];
          changed = true;
        }
        return;
      }
      if (next[key] !== value) {
        next[key] = value;
        changed = true;
      }
    };

    if (patch.isScript !== undefined) {
      assign("isScript", Boolean(patch.isScript));
    }

    if (patch.scriptId !== undefined) {
      const scriptId = patch.scriptId === null
        ? null
        : String(patch.scriptId).trim() || null;
      assign("scriptId", scriptId);
      if (scriptId && next.isScript !== true) {
        assign("isScript", true);
      }
    }

    if (patch.dispenseId !== undefined) {
      const dispenseId =
        patch.dispenseId === null
          ? null
          : String(patch.dispenseId).trim() || null;
      assign("dispenseId", dispenseId);
    }

    if (patch.dispenseStatusId !== undefined) {
      const statusId =
        patch.dispenseStatusId === null
          ? null
          : String(patch.dispenseStatusId).trim() || null;
      assign("dispenseStatusId", statusId);
    }

    if (patch.dispenseStatus !== undefined) {
      const status =
        patch.dispenseStatus === null
          ? null
          : String(patch.dispenseStatus).trim() || null;
      assign("dispenseStatus", status);
    }

    if (patch.dispenseStatusLabel !== undefined) {
      const statusLabel =
        patch.dispenseStatusLabel === null
          ? null
          : String(patch.dispenseStatusLabel).trim() || null;
      assign("dispenseStatusLabel", statusLabel);
    }

    const passthroughKeys = [
      "retailGst",
      "wholesalePrice",
      "requiresShipping",
      "productId",
      "price",
      "name",
      "brand",
      "image",
      "description",
      "url",
      "dispenseItemId",
      "itemId",
    ];
    passthroughKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        assign(key, patch[key]);
      }
    });
    if (patch.taxable !== undefined) {
      const taxable = parseBooleanish(patch.taxable);
      if (taxable === null) {
        assign("taxable", null);
      } else if (taxable !== undefined) {
        assign("taxable", taxable);
      }
    }

    if (!next.productId) next.productId = next.id || targetId;

    if (changed) {
      state.items[idx] = next;
      persist();
      notify();
    }
    return cloneState();
  };

  const clear = async () => {
    await ensureInit();
    state = defaultState();
    if (isAuthenticated()) {
      clearAllPersistence();
    }
    persist();
    notify();
    return cloneState();
  };

  const getCount = () =>
    state.items.reduce((total, item) => total + (Number(item.qty) || 0), 0);

  const getSubtotal = () =>
    state.items.reduce(
      (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );

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
    state = {
      currency: nextState?.currency || "AUD",
      items: Array.isArray(nextState?.items)
        ? nextState.items.map((item) => ({ 
            ...item,
            productId: item.productId || item.id // Ensure productId is set
          }))
        : [],
    };
    persist();
    notify();
    return cloneState();
  };

  const saveProductSnapshot = (product) => {
    if (!isBrowser) return;
    if (isAuthenticated()) {
      clearProductSnapshot();
      return;
    }
    try {
      const payload = {
        savedAt: Date.now(),
        data: normaliseProduct(product),
      };
      localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Product cache failed", err);
    }
  };

  const loadProductSnapshot = () => {
    if (!isBrowser) return null;
    if (isAuthenticated()) {
      clearProductSnapshot();
      return null;
    }
    try {
      const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const savedAt = Number(parsed?.savedAt) || 0;
      const expired = !savedAt || Date.now() - savedAt > PRODUCT_CACHE_TTL_MS;
      if (expired) {
        clearProductSnapshot();
        return null;
      }
      return parsed?.data || null;
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
    updateItemMetadata,
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
  }
})();
