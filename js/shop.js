const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0);
const toNum = (s) => Number(String(s || '').replace(/[^0-9.\-]/g, '')) || 0;

const CART_KEY = 'tailwind_demo_cart_v1';
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] }; } catch { return { items: [] }; } };
const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

const state = { cart: loadCart(), steps: ['cart', 'details', 'payment', 'review'], stepIndex: 0 };

// Drawer
const openCart = () => { $('.cart-overlay').classList.remove('pointer-events-none'); $('.cart-overlay').classList.add('opacity-100'); $('.cart-drawer').classList.remove('translate-x-full'); renderCart(); renderStepper(); renderStep(); syncAddButtons(); };
const closeCart = () => { $('.cart-overlay').classList.add('pointer-events-none'); $('.cart-overlay').classList.remove('opacity-100'); $('.cart-drawer').classList.add('translate-x-full'); };

// Cart logic
const upsertItem = (product, qty = 1) => { const i = state.cart.items.findIndex(x => x.id === product.id); if (i >= 0) state.cart.items[i].qty += qty; else state.cart.items.push({ ...product, qty }); state.cart.items = state.cart.items.filter(x => x.qty > 0); saveCart(state.cart); updateCount(); renderCart(); syncAddButtons(); };
const removeItem = (id) => { state.cart.items = state.cart.items.filter(x => x.id !== id); saveCart(state.cart); updateCount(); renderCart(); syncAddButtons(); };
const setQty = (id, q) => { const it = state.cart.items.find(x => x.id === id); if (!it) return; it.qty = Math.max(0, q | 0); if (!it.qty) removeItem(id); else { saveCart(state.cart); updateCount(); renderCart(); } };
const subtotal = () => state.cart.items.reduce((s, i) => s + i.price * i.qty, 0);
const updateCount = () => { const c = state.cart.items.reduce((s, i) => s + i.qty, 0); const b = $('.cart-count'); if (b) { b.textContent = c; b.classList.toggle('hidden', c === 0); } };

const renderCart = () => {
    const wrap = $('.cart-items'); wrap.innerHTML = '';
    if (!state.cart.items.length) { wrap.innerHTML = '<div class="p-6 text-center text-gray-500">Your cart is empty.</div>'; }
    else {
        state.cart.items.forEach(item => {
            const row = document.createElement('div'); row.className = 'p-4 flex gap-3 items-center';
            row.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover"/>
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">${item.name}</div>
              <div class="text-sm text-gray-600">${item.brand || ''}</div>
              <div class="text-sm font-medium">${money(item.price)}</div>
              <div class="mt-2 inline-flex items-center gap-2">
                <button class="qty-decr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${item.id}">−</button>
                <input class="qty-input w-12 text-center rounded-lg border px-2 py-1" value="${item.qty}" data-id="${item.id}" inputmode="numeric"/>
                <button class="qty-incr w-8 h-8 rounded-lg border hover:bg-gray-100" data-id="${item.id}">+</button>
              </div>
            </div>
            <button class="remove-item w-9 h-9 rounded-lg hover:bg-gray-100" data-id="${item.id}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>`;
            wrap.appendChild(row);
        });
    }
    $('.cart-subtotal').textContent = money(subtotal());
    $('.cart-total').textContent = money(subtotal());
};

// Sync add buttons
const syncAddButtons = () => {
    const inCart = new Set(state.cart.items.map(i => i.id));
    $$('.add-to-cart-btn').forEach(btn => {
        const id = btn.dataset.productId;
        if (inCart.has(id)) {
            btn.disabled = true; btn.textContent = 'Added ✓';
            btn.classList.add('bg-gray-300', 'text-gray-700', 'cursor-not-allowed');
            btn.classList.remove('bg-neutral-900', 'hover:bg-neutral-700', 'text-white');
        } else {
            btn.disabled = false; btn.textContent = 'Add to Cart';
            btn.classList.remove('bg-gray-300', 'text-gray-700', 'cursor-not-allowed');
            btn.classList.add('bg-neutral-900', 'hover:bg-neutral-700', 'text-white');
        }
    });
};

// Stepper
const renderStepper = () => {
    const ol = $('.stepper'); ol.innerHTML = '';
    state.steps.forEach((s, idx) => {
        const li = document.createElement('li');
        const active = idx === state.stepIndex; const done = idx < state.stepIndex;
        const label = s.replace('_', ' ');
        li.className = 'flex items-center gap-2';
        li.innerHTML = `
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${done ? 'bg-green-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}">${done ? '✓' : idx + 1}</span>
          <span class="hidden sm:inline ${active ? 'text-gray-900 font-semibold' : 'text-gray-500'} capitalize">${label}</span>
          ${idx < state.steps.length - 1 ? '<span class="w-6 h-px bg-gray-300 mx-1"></span>' : ''}
        `;
        ol.appendChild(li);
    });
    $('.step-prev').disabled = state.stepIndex === 0;
    $('.step-next').classList.toggle('hidden', state.stepIndex >= state.steps.length - 1);
    $('.place-order').classList.toggle('hidden', state.stepIndex < state.steps.length - 1);
};

const renderStep = () => {
    const current = state.steps[state.stepIndex];
    const isCart = current === 'cart';
    $('#cart_section')?.classList.toggle('hidden', !isCart);
    $$('.step').forEach(el => el.classList.add('hidden'));
    if (!isCart) { $(`.step[data-step="${current}"]`)?.classList.remove('hidden'); }
    if (current === 'review') { buildReview(); }
};

// --- NEW: tiny utils so wrappers/selects "just work"
const getFieldContainer = (el) => el.closest('.input-wrapper') ?? el; // select won't have wrapper
const getErrorEl = (el) => {
    const wrapper = el.closest('.input-wrapper');
    // Case A: <div.input-wrapper>...</div><p.form-error>...</p>
    if (wrapper && wrapper.nextElementSibling?.classList?.contains('form-error')) {
        return wrapper.nextElementSibling;
    }
    // Case B: <p.form-error> immediately after input/select (no wrapper)
    if (el.nextElementSibling?.classList?.contains('form-error')) {
        return el.nextElementSibling;
    }
    // Case C: (edge) error placed inside wrapper
    if (wrapper) {
        const inner = wrapper.querySelector('.form-error');
        if (inner) return inner;
    }
    return null;
};

// --- REPLACE: clearErrors (works for inputs/selects + their wrappers)
const clearErrors = (container) => {
    // hide all error texts in this container
    Array.from(container.querySelectorAll('.form-error')).forEach((e) => {
        e.textContent = '';
        e.classList.add('hidden');
    });
    // remove error styles from wrappers or fields (for selects)
    Array.from(container.querySelectorAll('input[data-req], select[data-req]')).forEach((el) => {
        const c = getFieldContainer(el);
        c.classList?.remove('ring-2', 'ring-red-500', 'border-red-500');
    });
};

// --- REPLACE: showError (applies style on wrapper, not the input)
const showError = (el, message) => {
    const c = getFieldContainer(el);
    c.classList?.add('ring-2', 'ring-red-500', 'border-red-500');

    const err = getErrorEl(el);
    if (err) {
        err.textContent = message;
        err.classList.remove('hidden');
    }
};

// --- REPLACE: validateContainer (respects wrappers, handles card expiry future)
const validateContainer = (container) => {
    clearErrors(container);

    let firstBad = null;
    let ok = true;

    const required = Array.from(container.querySelectorAll('input[data-req], select[data-req]'));
    required.forEach((el) => {
        const val = (el.value || '').trim();
        if (!val) {
            ok = false;
            showError(el, `${el.dataset.label || 'This field'} is required`);
            if (!firstBad) firstBad = getFieldContainer(el);
        }
    });

    // Extra: credit card expiry must be in the future (only when on payment form)
    if (container.id === 'payment_form') {
        const exp = document.getElementById('cc_exp');
        if (exp) {
            const v = (exp.value || '').trim();
            const m = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
            if (!m) {
                ok = false;
                showError(exp, 'Use MM/YY');
            } else {
                const mm = parseInt(m[1], 10);
                const yy = 2000 + parseInt(m[2], 10);
                const lastDay = new Date(yy, mm, 0).getDate();
                const expDate = new Date(yy, mm - 1, lastDay, 23, 59, 59);
                if (expDate <= new Date()) {
                    ok = false;
                    showError(exp, 'Card expired');
                }
            }
        }
    }

    if (firstBad) {
        firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
};


const buildReview = () => {
    const t = (id) => (byId(id)?.value || '').trim();
    $('#review_contact').textContent = `${t('cust_first')} ${t('cust_last')} · ${t('cust_email')}`;
    $('#review_shipping').textContent = `${t('ship_addr1')}, ${t('ship_city')}, ${t('ship_state')} ${t('ship_postal')}, ${t('ship_country')}`;
    $('#review_billing').textContent = `${t('bill_addr1')}, ${t('bill_city')}, ${t('bill_state')} ${t('bill_postal')}, ${t('bill_country')}`;
};

// Reset all (cart + forms + UI)
const resetAll = () => {
    // Cart
    state.cart.items = [];
    saveCart(state.cart);
    updateCount();
    renderCart();
    syncAddButtons();
    // Forms
    $$('input').forEach(i => { if (i.type === 'checkbox') i.checked = false; else i.value = ''; i.disabled = false; i.classList.remove('bg-gray-100'); });
    // Defaults: countries to Australia; states to placeholder
    ['ship_country', 'bill_country'].forEach(id => { const el = byId(id); if (el) el.value = 'Australia'; });
    ['ship_state', 'bill_state'].forEach(id => { const el = byId(id); if (el) el.value = ''; });
    // Clear errors and review
    clearErrors(document);
    $('#review_contact').textContent = '';
    $('#review_shipping').textContent = '';
    $('#review_billing').textContent = '';
    // Stepper back to Cart
    state.stepIndex = 0;
    renderStepper();
    renderStep();
};

// Events
document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
        if (addBtn.disabled) return;
        const card = addBtn.closest('.p-4.bg-white');
        const name = $('.product-name', card)?.textContent?.trim() || 'Item';
        const price = toNum($('.product-price', card)?.textContent || '$0');
        const image = $('img', card)?.getAttribute('src') || '';
        const brand = $('.product-brand', card)?.textContent?.trim() || '';
        const id = addBtn.dataset.productId || name;
        upsertItem({ id, name, price, image, brand }, 1);
        openCart();
        return;
    }

    if (e.target.closest('.cart-btn')) { openCart(); }
    if (e.target.closest('.close-cart') || e.target.classList.contains('cart-overlay')) { closeCart(); }

    const decr = e.target.closest('.qty-decr'); if (decr) { const id = decr.dataset.id; const it = state.cart.items.find(i => i.id === id); if (it) setQty(id, it.qty - 1); }
    const incr = e.target.closest('.qty-incr'); if (incr) { const id = incr.dataset.id; const it = state.cart.items.find(i => i.id === id); if (it) setQty(id, it.qty + 1); }
    const remove = e.target.closest('.remove-item'); if (remove) { removeItem(remove.dataset.id); }

    // Clear all
    if (e.target.closest('.clear-cart')) { resetAll(); return; }

    // Stepper nav
    if (e.target.closest('.step-prev')) { state.stepIndex = Math.max(0, state.stepIndex - 1); renderStepper(); renderStep(); }
    if (e.target.closest('.step-next')) {
        if (state.steps[state.stepIndex] === 'cart' && !state.cart.items.length) { return; }
        const current = state.steps[state.stepIndex];
        if (current === 'details') { if (!validateContainer($('[data-step="details"]'))) return; }
        if (current === 'payment') { if (!validateContainer($('#payment_form'))) return; }
        state.stepIndex = Math.min(state.steps.length - 1, state.stepIndex + 1); renderStepper(); renderStep();
    }

    if (e.target.closest('.place-order')) {
        const current = state.steps[state.stepIndex];
        if (current === 'payment' && !validateContainer($('#payment_form'))) return;
        alert('Demo checkout complete. Integrate your server/payment processor here.');
        resetAll();
    }
});

document.addEventListener('input', (e) => {
    const inp = e.target.closest('.qty-input'); if (inp) { const id = inp.dataset.id; const v = Math.max(0, parseInt(inp.value || '0', 10) || 0); setQty(id, v); }
    const finput = e.target.closest('input, select');
    if (finput && finput.matches('[data-req]')) {
        if ((finput.value || '').trim()) {
            finput.classList.remove('border-red-500', 'ring-2', 'ring-red-500');
            const err = finput.nextElementSibling?.classList.contains('form-error') ? finput.nextElementSibling : null;
            if (err) err.classList.add('hidden');
        }
    }
});

// Same-as-shipping for billing
document.addEventListener('change', (e) => {
    if (e.target.id === 'bill_same') {
        const on = e.target.checked; const fields = ['addr1', 'city', 'state', 'postal', 'country'];
        fields.forEach(k => {
            const sEl = byId(`ship_${k}`); const bEl = byId(`bill_${k}`);
            if (sEl && bEl) { bEl.value = on ? sEl.value : bEl.value; bEl.disabled = on; bEl.classList.toggle('bg-gray-100', on); }
        });
        if (on) { // clear errors
            ['bill_addr1', 'bill_city', 'bill_state', 'bill_postal', 'bill_country'].forEach(id => { const i = byId(id); if (!i) return; i.classList.remove('border-red-500', 'ring-2', 'ring-red-500'); const err = i.nextElementSibling?.classList.contains('form-error') ? i.nextElementSibling : null; if (err) err.classList.add('hidden'); });
        }
    }
});

// Init defaults
['ship_country', 'bill_country'].forEach(id => { const el = byId(id); if (el) el.value = 'Australia'; });
updateCount(); renderCart(); renderStepper(); renderStep(); syncAddButtons();

document.addEventListener('input', (e) => {
    // qty input logic (unchanged) ...
    const finput = e.target.closest('input, select');
    if (finput && finput.matches('[data-req]')) {
        if ((finput.value || '').trim()) {
            const c = getFieldContainer(finput);
            c.classList?.remove('ring-2', 'ring-red-500', 'border-red-500');
            const err = getErrorEl(finput);
            if (err) err.classList.add('hidden');
        }
    }
});

if (on) {
    ['bill_addr1', 'bill_city', 'bill_state', 'bill_postal', 'bill_country'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const c = getFieldContainer(el);
        c.classList?.remove('ring-2', 'ring-red-500', 'border-red-500');
        const err = getErrorEl(el);
        if (err) err.classList.add('hidden');
    });
}

// after you reset values/disabled flags:
document.querySelectorAll('.input-wrapper').forEach((w) => {
    w.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
});
document.querySelectorAll('.form-error').forEach((e) => {
    e.textContent = '';
    e.classList.add('hidden');
});
