/* ================================================================
   SiX PDV — dashboard.js
   ================================================================ */
"use strict";

let charts = {};

async function loadDashboard() {
  try {
    const d = await apiFetch("/api/dashboard");
    renderKPIs(d.kpis, d.faturamento);
    renderStatusChart(d.status_dist, d.kpis.total);
    renderCatChart(d.por_categoria);
    renderMovChart(d.mov_14d);
    renderCritList(d.criticos);
    renderFeed(d.mov_recentes);
  } catch(e) { toast(e.message, "error"); }
}

// ── KPIs ──────────────────────────────────────────────────────
function renderKPIs(k, fat) {
  const s = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  s("kt-total",   k.total);
  s("kt-normal",  k.normal);
  s("kt-baixo",   k.baixo);
  s("kt-critico", k.critico);
  s("kt-zero",    k.zero);
  s("kt-fat",     fmtBRL(fat?.total_dia || 0));
  s("kt-vendas",  fat?.qtd_vendas || 0);
  s("fat-dinheiro", fmtBRL(fat?.dinheiro || 0));
  s("fat-pix",      fmtBRL(fat?.pix || 0));
  s("fat-cartao",   fmtBRL(fat?.cartao || 0));
}

// ── Charts ────────────────────────────────────────────────────
function chartDefaults() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    grid:   dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)",
    text:   dark ? "#9999a2" : "#a8a8a0",
    surface:dark ? "#1c1c1f" : "#ffffff",
  };
}

function renderStatusChart(dist, total) {
  const canvas = document.getElementById("statusChart");
  if (!canvas) return;
  if (charts.status) { charts.status.destroy(); }
  const cd = chartDefaults();
  const filtered = dist.filter(d => d.value > 0);
  charts.status = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: filtered.map(d => d.label),
      datasets: [{ data: filtered.map(d => d.value), backgroundColor: filtered.map(d => d.color), borderWidth: 2, borderColor: cd.surface }],
    },
    options: {
      cutout: "70%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } } },
      onClick: (_, els) => { if (els.length) { const l = filtered[els[0].index].label.toLowerCase().replace("é","e"); document.getElementById("catSel") && (document.getElementById("catSel").value = ""); } },
    },
  });
  const ctr = document.getElementById("donutCenter");
  if (ctr) { ctr.innerHTML = `<div class="donut-val">${total}</div><div class="donut-lbl">SKUs</div>`; }

  const leg = document.getElementById("donutLegend");
  if (leg) {
    leg.innerHTML = dist.map(d => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${d.color}"></div>
        <span>${d.label}</span>
        <span class="legend-pct">${total ? Math.round(d.value/total*100) : 0}%</span>
      </div>`).join("");
  }
}

function renderCatChart(cats) {
  const canvas = document.getElementById("catChart");
  if (!canvas) return;
  if (charts.cat) charts.cat.destroy();
  const cd = chartDefaults();
  charts.cat = new Chart(canvas, {
    type: "bar",
    data: {
      labels: cats.map(c => c.categoria),
      datasets: [{
        label: "Itens",
        data: cats.map(c => c.total),
        backgroundColor: cats.map(c => c.alertas > 0 ? "rgba(185,28,28,.7)" : "rgba(26,86,219,.7)"),
        borderRadius: 4, borderSkipped: false,
      }],
    },
    options: {
      indexAxis: "y", plugins: { legend: { display: false } },
      scales: { x: { grid: { color: cd.grid }, ticks: { color: cd.text } }, y: { grid: { display: false }, ticks: { color: cd.text } } },
    },
  });
}

function renderMovChart(days) {
  const canvas = document.getElementById("movChart");
  if (!canvas) return;
  if (charts.mov) charts.mov.destroy();
  const cd = chartDefaults();
  charts.mov = new Chart(canvas, {
    type: "line",
    data: {
      labels: days.map(d => d.dia.slice(5)),
      datasets: [
        { label:"Entradas", data: days.map(d => d.entradas), borderColor:"#15803d", backgroundColor:"rgba(21,128,61,.12)", fill:true, tension:.4, pointRadius:3 },
        { label:"Saídas",   data: days.map(d => d.saidas),   borderColor:"#b91c1c", backgroundColor:"rgba(185,28,28,.08)", fill:true, tension:.4, pointRadius:3 },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: cd.text, usePointStyle: true } } },
      scales: { x: { grid: { color: cd.grid }, ticks: { color: cd.text } }, y: { grid: { color: cd.grid }, ticks: { color: cd.text } } },
    },
  });
}

// ── Listas ────────────────────────────────────────────────────
function renderCritList(criticos) {
  const el = document.getElementById("critList");
  if (!el) return;
  if (!criticos.length) { el.innerHTML = `<p style="color:var(--text-3);font-size:13px;text-align:center;padding:24px 0">Nenhum produto em alerta</p>`; return; }
  el.innerHTML = criticos.map(p => {
    const pct = p.maximo > 0 ? Math.round(p.quantidade/p.maximo*100) : 0;
    return `<div class="crit-row">
      <span style="flex:1;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${p.descricao}">${p.descricao}</span>
      <div class="crit-bar"><div class="crit-fill" style="width:${pct}%"></div></div>
      <span class="crit-qty">${p.quantidade}</span>
    </div>`;
  }).join("");
}

function renderFeed(movs) {
  const el = document.getElementById("feedList");
  if (!el) return;
  if (!movs.length) { el.innerHTML = `<p style="color:var(--text-3);font-size:13px;text-align:center;padding:24px 0">Nenhuma movimentação</p>`; return; }
  el.innerHTML = movs.map(m => `
    <div class="feed-row">
      <span class="feed-tipo feed-${m.tipo}">${m.tipo}</span>
      <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.produto}</span>
      <span class="mono" style="font-size:12px">${m.quantidade} ${m.unidade}</span>
      <span class="feed-time">${m.criado_em?.slice(11,16)}</span>
    </div>`).join("");
}

// ── Imprimir alertas ──────────────────────────────────────────
async function imprimirAlertas() {
  try {
    const data = await apiFetch("/api/dashboard");
    const alertas = data.criticos || [];
    if (!alertas.length) { toast("Nenhum produto em alerta."); return; }
    const dt = new Date().toLocaleString("pt-BR");
    const SC = { normal:"#15803d",baixo:"#a16207",critico:"#b91c1c",zero:"#c2410c" };
    const SL = { normal:"Normal",baixo:"Estoque Baixo",critico:"Crítico",zero:"Zerado" };
    const rows = alertas.map(p => `<tr><td style="font-family:monospace;font-size:11px">${p.codigo}</td><td>${p.descricao}</td><td>${p.categoria}</td><td style="text-align:center;font-weight:700;color:${SC[p.status]}">${p.quantidade}</td><td style="text-align:center;color:#888">${p.minimo}</td><td style="text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${SC[p.status]}18;color:${SC[p.status]};text-transform:uppercase">${SL[p.status]}</span></td></tr>`).join("");
    const win = window.open("","_blank","width=900,height=700");
    if (!win) { toast("Permita pop-ups.","error"); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Alertas</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px 40px}.hd{display:flex;justify-content:space-between;border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px}.logo{font-size:22px;font-weight:700;color:#1a56db}table{width:100%;border-collapse:collapse;margin-top:14px}th{background:#f5f5f3;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#777;border-bottom:1px solid #ccc}td{padding:10px 12px;border-bottom:1px solid #eee}tr:nth-child(even)td{background:#fafaf8}.ft{margin-top:24px;font-size:10.5px;color:#bbb;text-align:center;border-top:1px solid #eee;padding-top:14px}@media print{@page{margin:10mm}}</style></head><body>
    <div class="hd"><div><div class="logo">SiX PDV</div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.07em;margin-top:3px">Sistema de PDV</div></div><div style="text-align:right;font-size:12px;color:#555"><strong style="display:block;font-size:15px;font-weight:700;color:#1a1a1a">Relatório de Alertas</strong>${dt}</div></div>
    <table><thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th style="text-align:center">Qtd. Atual</th><th style="text-align:center">Mínimo</th><th style="text-align:center">Status</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="ft">SiX PDV · ${dt}</div><script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  } catch(e) { toast(e.message,"error"); }
}

// ── Usuários ──────────────────────────────────────────────────
async function carregarUsuarios() {
  try {
    const rows = await apiFetch("/api/usuarios");
    const tb = document.getElementById("usuariosTableBody");
    if (!tb) return;
    tb.innerHTML = rows.map(u => `
      <tr>
        <td style="font-weight:500">${u.nome}</td>
        <td style="color:var(--text-2)">${u.email}</td>
        <td><span class="pill ${u.perfil==='admin'?'pill-normal':'pill-zero'}">${u.perfil}</span></td>
        <td><span class="pill ${u.ativo?'pill-normal':'pill-critico'}">${u.ativo?'Ativo':'Inativo'}</span></td>
        <td><div class="td-actions"><button class="btn btn-sm btn-ghost" onclick="toggleAtivo(${u.id},${u.ativo})">${u.ativo?'Desativar':'Ativar'}</button></div></td>
      </tr>`).join("");
  } catch(e) { toast(e.message,"error"); }
}

async function criarUsuario() {
  const body = { nome: document.getElementById("uNome").value.trim(), email: document.getElementById("uEmail").value.trim(), senha: document.getElementById("uSenha").value, perfil: document.getElementById("uPerfil").value };
  try { await apiFetch("/api/usuarios", { method:"POST", body:JSON.stringify(body) }); toast("Usuário criado.","success"); ["uNome","uEmail","uSenha"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";}); carregarUsuarios(); } catch(e) { toast(e.message,"error"); }
}

async function toggleAtivo(uid, ativo) {
  try { await apiFetch(`/api/usuarios/${uid}`, { method:"PUT", body:JSON.stringify({ativo:!ativo}) }); carregarUsuarios(); } catch(e) { toast(e.message,"error"); }
}

function openUsuariosModal() { carregarUsuarios(); openModal("usuariosModal"); }

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  setInterval(loadDashboard, 60000);
});
