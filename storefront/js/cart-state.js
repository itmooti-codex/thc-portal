/*
 * Shared cart-state manager for THC portal pages.
 * Handles guest persistence via localStorage and provides hooks
 * where server-backed cart APIs can integrate for authenticated users.
 */
(function () {
  const GUEST_CART_KEY = "thc_portal_cart_guest_v1";
  const AUTH_CART_KEY = "thc_portal_cart_auth_v1";
  const PRODUCT_CACHE_KEY = "thc_portal_last_product_v1";

  const defaultState = () => ({ items: [], currency: "USD" });

  const listeners = new Set();
  let state = defaultState();
  let initialized = false;

  const isBrowser = typeof window !== "undefined";

  const isAuthenticated = () =>
    isBrowser && document.body?.dataset?.auth === "true";

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
            currency: parsed.currency || "USD",
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

    const merged = { currency: (primary?.currency || secondary?.currency || "USD"), items: [] };
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
    return {
      id: String(product.id),
      name: product.name || "Untitled",
      price: Number(product.price) || 0,
      image: product.image || "",
      brand: product.brand || "",
      description: product.description || "",
      url: product.url || "",
    };
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

  const clear = async () => {
    await ensureInit();
    state = defaultState();
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
      currency: nextState?.currency || "USD",
      items: Array.isArray(nextState?.items)
        ? nextState.items.map((item) => ({ ...item }))
        : [],
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
  }
})();
