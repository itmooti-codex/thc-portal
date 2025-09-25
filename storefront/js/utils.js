(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);
  const money = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(n || 0);
  const toNum = (s) => Number(String(s || "").replace(/[^0-9.\-]/g, "")) || 0;
  const clamp = (value, min = 1, max = 99) =>
    Math.max(min, Math.min(max, parseInt(value || String(min), 10) || min));

  window.StorefrontUtils = Object.assign(window.StorefrontUtils || {}, {
    $, $$, byId, money, toNum, clamp,
  });
})();


