/* ================================================================
   SiX PDV — core.js  |  Utilitários globais: API, toast, tema, relógio
   ================================================================ */
"use strict";

// ── Tema ──────────────────────────────────────────────────────
const Theme = (() => {
  let current = localStorage.getItem("six-theme") || "light";

  function apply(t) {
    current = t;
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("six-theme", t);
    document.querySelectorAll(".theme-btn").forEach(btn => {
      btn.innerHTML = t === "dark" ? ICONS.sun : ICONS.moon;
      btn.title     = t === "dark" ? "Modo claro" : "Modo escuro";
    });
  }

  function toggle() { apply(current === "dark" ? "light" : "dark"); }
  function get()    { return current; }
  function init()   { apply(current); }

  return { apply, toggle, get, init };
})();

// ── API fetch ─────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ erro: r.statusText }));
    throw new Error(err.erro || "Erro desconhecido");
  }
  return r.json();
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = "") {
  let c = document.getElementById("toastContainer");
  if (!c) { c = document.createElement("div"); c.id = "toastContainer"; c.className = "toast-container"; document.body.appendChild(c); }
  const t = document.createElement("div");
  t.className = `toast${type ? " " + type : ""}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── Logout ────────────────────────────────────────────────────
async function doLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  location.href = "/login";
}

// ── Formatação ────────────────────────────────────────────────
function fmtBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtQty(v, unidade = "") {
  return `${Number(v).toLocaleString("pt-BR")}${unidade ? " " + unidade : ""}`;
}

// ── Relógio ───────────────────────────────────────────────────
function startClock(id = "sb-clock") {
  const el = document.getElementById(id);
  if (!el) return;
  const tick = () => el.textContent = new Date().toLocaleTimeString("pt-BR");
  tick(); setInterval(tick, 1000);
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add("open"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

// ── SVG Icons ─────────────────────────────────────────────────
const ICONS = {
  sun:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  x:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
  eye:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  req:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  trash:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  cart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  cash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
};

// ── Status label / cor ────────────────────────────────────────
const STATUS_LABEL = { normal:"Normal", baixo:"Estoque Baixo", critico:"Crítico", zero:"Zerado" };
const STATUS_COLOR = { normal:"var(--green)", baixo:"var(--yellow)", critico:"var(--red)", zero:"var(--orange)" };

// ── Init automático ───────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  Theme.init();
  startClock("sb-clock");

  // Botões de tema
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => Theme.toggle());
  });
});
