/* ================================================================
   SiX PDV — estoque.js
   ================================================================ */
"use strict";

const state = {
  produtos:  [],
  qf:        "all",
  sortField: "descricao",
  sortDir:   "asc",
  page:      1,
  perPage:   20,
  openId:    null,
  reqItems:  [],
  theme:     localStorage.getItem("six-theme") || "light",
};

// ── Load / filtros ────────────────────────────────────────────
async function load() {
  const p = new URLSearchParams({
    sort: state.sortField,
    dir:  state.sortDir,
  });
  const q   = document.getElementById("searchInput")?.value.trim();
  const cat = document.getElementById("catSel")?.value;
  const un  = document.getElementById("unSel")?.value;
  if (q)   p.set("q", q);
  if (cat) p.set("categoria", cat);
  if (un)  p.set("unidade", un);
  if (state.qf !== "all") p.set("status", state.qf);

  const tbody = document.getElementById("tableBody");
  if (tbody) tbody.style.opacity = ".4";
  try {
    const data = await apiFetch(`/api/produtos?${p}`);
    state.produtos = data.produtos;
    state.page = 1;
    updateKPIs(data.kpis);
    renderTable();
    updateResultBar(data.count, data.kpis);
  } catch (e) { toast(e.message, "error"); }
  finally { if (tbody) tbody.style.opacity = "1"; }
}

function updateKPIs(k) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("kpi-total",  k.total);
  set("kpi-normal", k.normal);
  set("kpi-baixo",  k.baixo);
  set("kpi-crit",   k.critico);
  set("b-all",    k.total);
  set("b-normal", k.normal);
  set("b-baixo",  k.baixo);
  set("b-crit",   k.critico);
  set("b-zero",   k.zero);
}

function updateResultBar(count, kpis) {
  const el = document.getElementById("r-count");
  const qt = document.getElementById("r-qty");
  const tm = document.getElementById("r-time");
  if (el) el.textContent = count;
  if (qt) qt.textContent = (kpis.qty_total || 0).toLocaleString("pt-BR");
  if (tm) tm.textContent = new Date().toLocaleTimeString("pt-BR");
}

// ── Sort ──────────────────────────────────────────────────────
function sortBy(field) {
  if (state.sortField === field) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortField = field; state.sortDir = "asc";
  }
  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.classList.remove("active-sort");
    th.querySelector(".sort-i").textContent = "↕";
  });
  const active = document.querySelector(`th[data-sort="${field}"]`);
  if (active) {
    active.classList.add("active-sort");
    active.querySelector(".sort-i").textContent = state.sortDir === "asc" ? "↑" : "↓";
  }
  load();
}

function quickFilter(qf, el) {
  state.qf = qf;
  document.querySelectorAll("[data-qf]").forEach(e => e.classList.remove("active"));
  el.classList.add("active");
  load();
}

function setCat(cat, el) {
  document.getElementById("catSel").value = cat === "all" ? "" : cat;
  document.querySelectorAll("[data-cat-nav]").forEach(e => e.classList.remove("active"));
  el.classList.add("active");
  load();
}

function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("catSel").value = "";
  document.getElementById("unSel").value  = "";
  state.qf = "all";
  document.querySelectorAll("[data-qf]").forEach(e => e.classList.remove("active"));
  document.querySelector("[data-qf='all']")?.classList.add("active");
  load();
}

// ── Renderização da tabela ────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  const total = state.produtos.length;
  const pages = Math.ceil(total / state.perPage);
  const start = (state.page - 1) * state.perPage;
  const slice = state.produtos.slice(start, start + state.perPage);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:48px;color:var(--text-3)">Nenhum produto encontrado</td></tr>`;
    renderPagination(0, 0);
    return;
  }

  tbody.innerHTML = slice.map(p => {
    const lfc = p.status === "normal" ? "fill-ok" : p.status === "baixo" ? "fill-warn" : "fill-crit";
    return `
    <tr>
      <td class="mono" style="font-size:12px;color:var(--text-3)">${p.codigo}</td>
      <td class="mono" style="font-size:11.5px;color:var(--text-3);letter-spacing:.02em">${p.ean || '<span style="opacity:.3">—</span>'}</td>
      <td style="font-weight:500;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.descricao}</td>
      <td style="color:var(--text-2);font-size:12.5px">${p.categoria}</td>
      <td><span class="pill pill-${p.status}"><span class="pill-dot"></span>${STATUS_LABEL[p.status]}</span></td>
      <td style="text-align:right;font-family:var(--mono);font-weight:600">${p.quantidade} <span style="color:var(--text-3);font-weight:400;font-size:11px">${p.unidade}</span></td>
      <td style="text-align:right;font-size:12px;color:var(--text-3);font-family:var(--mono)">${p.minimo} / ${p.maximo}</td>
      <td style="text-align:right;font-family:var(--mono);font-size:12.5px">${fmtBRL(p.preco_venda)}</td>
      <td>
        <div class="level-wrap">
          <div class="level-bar"><div class="level-fill ${lfc}" style="width:${p.percentual}%"></div></div>
          <span class="level-pct">${p.percentual}%</span>
        </div>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-icon btn-ghost" onclick="openDrawer(${p.id})" title="Detalhes">${ICONS.eye}</button>
          <button class="btn btn-sm btn-icon btn-ghost" onclick="openModal('produtoModal');fillModal(${p.id})" title="Editar">${ICONS.edit}</button>
          <button class="btn btn-sm btn-icon btn-ghost" onclick="addToReq(${p.id})" title="Adicionar à requisição" style="color:var(--accent)">${ICONS.req}</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  renderPagination(pages, total);
  const fc = document.getElementById("f-count");
  if (fc) fc.textContent = `${total} produto${total !== 1 ? "s" : ""}`;
}

function renderPagination(pages, total) {
  const pg = document.getElementById("pagination");
  if (!pg) return;
  if (pages <= 1) { pg.innerHTML = ""; return; }
  pg.innerHTML = Array.from({length: pages}, (_, i) => i + 1).map(n =>
    `<button class="page-btn${n === state.page ? " active" : ""}" onclick="goPage(${n})">${n}</button>`
  ).join("");
}

function goPage(n) { state.page = n; renderTable(); }

// ── Drawer ────────────────────────────────────────────────────
async function openDrawer(pid) {
  state.openId = pid;
  try {
    const p = await apiFetch(`/api/produtos/${pid}`);
    const lfc = p.status === "normal" ? "fill-ok" : p.status === "baixo" ? "fill-warn" : "fill-crit";
    const hist = Array.from({length: 9}, () => Math.floor(Math.random() * p.maximo));

    document.getElementById("d-eyebrow").textContent = p.codigo;
    document.getElementById("d-title").textContent   = p.descricao;
    document.getElementById("d-body").innerHTML = `
      <div class="metric-bar-wrap">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-2)">
          <span>Quantidade atual</span>
          <span style="font-weight:700;font-size:16px">${p.quantidade} <small style="font-weight:400;color:var(--text-3)">${p.unidade}</small></span>
        </div>
        <div class="metric-bar-track"><div class="metric-bar-fill ${lfc}" style="width:${p.percentual}%"></div></div>
        <div class="metric-bar-labels"><span>0</span><span>Mín ${p.minimo}</span><span>Máx ${p.maximo}</span></div>
      </div>
      <div class="field-grid">
        <div class="field"><div class="field-label">Status</div><span class="pill pill-${p.status}"><span class="pill-dot"></span>${STATUS_LABEL[p.status]}</span></div>
        <div class="field"><div class="field-label">Categoria</div><div class="field-value">${p.categoria}</div></div>
        <div class="field"><div class="field-label">Preço Custo</div><div class="field-value c-yellow">${fmtBRL(p.preco_custo)}</div></div>
        <div class="field"><div class="field-label">Preço Venda</div><div class="field-value c-green">${fmtBRL(p.preco_venda)}</div></div>
      </div>
      <div class="field-grid cols-1" style="margin-bottom:12px">
        <div class="field"><div class="field-label">EAN / Cód. Barras</div><div class="field-value mono">${p.ean || "—"}</div></div>
      </div>
      <div class="mini-chart">
        <div class="mini-chart-label">Histórico — últimos 9 dias</div>
        <div class="bars">${hist.map(v => `<div class="bar" style="height:${Math.max(3,Math.round((v/Math.max(p.maximo,1))*46))}px"></div>`).join("")}</div>
        <div class="bar-x"><span>-8d</span><span>-4d</span><span>Hoje</span></div>
      </div>
      ${p.movimentacoes?.length ? `
      <div>
        <div class="mini-chart-label" style="margin-bottom:8px">Últimas movimentações</div>
        ${p.movimentacoes.slice(0,5).map(m => `
          <div class="mov-row">
            <span class="mov-tipo mov-${m.tipo}">${m.tipo}</span>
            <span class="mono" style="font-weight:600">${m.quantidade}</span>
            <span style="color:var(--text-3);font-size:11.5px">${m.observacao || ""}</span>
            <span style="color:var(--text-3);font-size:11px;margin-left:auto">${m.criado_em?.slice(0,16)}</span>
          </div>`).join("")}
      </div>` : ""}
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">
        <button class="btn btn-sm" style="flex:1;justify-content:center" onclick="openMovModal(${p.id},'entrada')">↑ Entrada</button>
        <button class="btn btn-sm" style="flex:1;justify-content:center" onclick="openMovModal(${p.id},'saida')">↓ Saída</button>
        <button class="btn btn-sm" style="flex:1;justify-content:center" onclick="openMovModal(${p.id},'ajuste')">⇄ Ajuste</button>
      </div>`;

    document.getElementById("overlay").classList.add("open");
    document.getElementById("drawer").classList.add("open");
  } catch (e) { toast(e.message, "error"); }
}

function closeDrawer() {
  document.getElementById("overlay").classList.remove("open");
  document.getElementById("drawer").classList.remove("open");
  state.openId = null;
}

// ── Modal Produto ─────────────────────────────────────────────
function openModal(id) {
  if (id === "produtoModal") {
    ["produtoId","fCodigo","fEan","fDescricao"].forEach(f => {
      const el = document.getElementById(f); if (el) el.value = "";
    });
    ["fQuantidade","fMinimo","fMaximo","fPrecoCusto","fPrecoVenda"].forEach(f => {
      const el = document.getElementById(f); if (el) el.value = "0";
    });
    document.getElementById("fCategoria").value = "";
    document.getElementById("fUnidade").value   = "UN";
    document.getElementById("modalTitle").textContent = "Novo Produto";
  }
  document.getElementById(id)?.classList.add("open");
}

function fillModal(pid) {
  const p = state.produtos.find(x => x.id === pid);
  if (!p) return;
  document.getElementById("modalTitle").textContent    = "Editar Produto";
  document.getElementById("produtoId").value           = p.id;
  document.getElementById("fCodigo").value             = p.codigo;
  document.getElementById("fEan").value                = p.ean || "";
  document.getElementById("fDescricao").value          = p.descricao;
  document.getElementById("fCategoria").value          = p.categoria;
  document.getElementById("fUnidade").value            = p.unidade;
  document.getElementById("fQuantidade").value         = p.quantidade;
  document.getElementById("fMinimo").value             = p.minimo;
  document.getElementById("fMaximo").value             = p.maximo;
  document.getElementById("fPrecoCusto").value         = p.preco_custo;
  document.getElementById("fPrecoVenda").value         = p.preco_venda;
}

async function salvarProduto() {
  const pid = document.getElementById("produtoId").value;
  const body = {
    codigo:      document.getElementById("fCodigo").value.trim(),
    ean:         document.getElementById("fEan").value.trim(),
    descricao:   document.getElementById("fDescricao").value.trim(),
    categoria:   document.getElementById("fCategoria").value,
    unidade:     document.getElementById("fUnidade").value,
    quantidade:  Number(document.getElementById("fQuantidade").value),
    minimo:      Number(document.getElementById("fMinimo").value),
    maximo:      Number(document.getElementById("fMaximo").value),
    preco_custo: Number(document.getElementById("fPrecoCusto").value),
    preco_venda: Number(document.getElementById("fPrecoVenda").value),
  };
  if (!body.codigo || !body.descricao || !body.categoria) {
    toast("Preencha os campos obrigatórios.", "error"); return;
  }
  try {
    if (pid) {
      await apiFetch(`/api/produtos/${pid}`, { method:"PUT", body: JSON.stringify(body) });
      toast("Produto atualizado.");
    } else {
      await apiFetch("/api/produtos", { method:"POST", body: JSON.stringify(body) });
      toast("Produto criado.", "success");
    }
    closeModal("produtoModal");
    load();
    if (state.openId) openDrawer(state.openId);
  } catch (e) { toast(e.message, "error"); }
}

async function deletarProduto() {
  const pid = document.getElementById("produtoId").value;
  if (!pid || !confirm("Remover este produto?")) return;
  try {
    await apiFetch(`/api/produtos/${pid}`, { method:"DELETE" });
    toast("Produto removido.");
    closeModal("produtoModal");
    closeDrawer();
    load();
  } catch (e) { toast(e.message, "error"); }
}

// ── Movimentação ──────────────────────────────────────────────
function openMovModal(pid, tipo) {
  document.getElementById("movProdutoId").value = pid;
  document.getElementById("movTipo").value      = tipo;
  document.getElementById("movQty").value       = "";
  document.getElementById("movObs").value       = "";
  const lbl = { entrada:"Entrada de Estoque", saida:"Saída de Estoque", ajuste:"Ajuste de Estoque" };
  document.getElementById("movTipoLabel").textContent = lbl[tipo] || "Movimentação";
  openModal("movModal");
}

async function salvarMovimentacao() {
  const pid  = Number(document.getElementById("movProdutoId").value);
  const tipo = document.getElementById("movTipo").value;
  const qty  = Number(document.getElementById("movQty").value);
  const obs  = document.getElementById("movObs").value.trim();
  if (!qty || qty <= 0) { toast("Informe uma quantidade válida.", "error"); return; }
  try {
    await apiFetch("/api/movimentacoes", {
      method: "POST",
      body: JSON.stringify({ produto_id: pid, tipo, quantidade: qty, observacao: obs }),
    });
    toast("Movimentação registrada.", "success");
    closeModal("movModal");
    load();
    if (state.openId === pid) openDrawer(pid);
  } catch (e) { toast(e.message, "error"); }
}

// ── Requisição ────────────────────────────────────────────────
function addToReq(pid) {
  const p = state.produtos.find(x => x.id === pid);
  if (!p) return;
  const ex = state.reqItems.find(r => r.id === pid);
  if (ex) { ex.qtd++; } else { state.reqItems.push({ id:pid, codigo:p.codigo, descricao:p.descricao, unidade:p.unidade, qtd:1 }); }
  toast(`${p.descricao} adicionado à requisição.`);
}

function openReqModal() { renderReqItems(); openModal("reqModal"); }

function renderReqItems() {
  const wrap = document.getElementById("reqItemList");
  if (!wrap) return;
  if (!state.reqItems.length) {
    wrap.innerHTML = `<p style="color:var(--text-3);font-size:13px;padding:14px 0;text-align:center">Nenhum item.<br>Use o ícone na tabela.</p>`;
    return;
  }
  wrap.innerHTML = `
    <div class="req-items-head"><span>Código</span><span>Descrição</span><span>Qtd.</span><span></span></div>
    ${state.reqItems.map((r,i) => `
    <div class="req-item-row">
      <span class="mono" style="font-size:11.5px;color:var(--text-3)">${r.codigo}</span>
      <span style="font-size:13px;font-weight:500">${r.descricao}</span>
      <input class="form-input" type="number" min="1" value="${r.qtd}" style="height:28px;padding:0 7px;font-size:12px" onchange="updateReqQty(${i},this.value)">
      <button class="btn-remove" onclick="removeReqItem(${i})">${ICONS.x}</button>
    </div>`).join("")}`;
}

function updateReqQty(i, v) { state.reqItems[i].qtd = Math.max(1, parseInt(v) || 1); }
function removeReqItem(i)   { state.reqItems.splice(i,1); renderReqItems(); }
function clearReq()         { state.reqItems = []; renderReqItems(); }

async function imprimirRequisicao() {
  if (!state.reqItems.length) { toast("Adicione itens antes de imprimir.", "error"); return; }
  const solicitante = document.getElementById("reqSolicitante").value.trim() || "—";
  const setor       = document.getElementById("reqSetor").value.trim() || "—";
  const obs         = document.getElementById("reqObs").value.trim();
  const num         = `REQ-${Date.now().toString().slice(-6)}`;
  const dt          = new Date().toLocaleString("pt-BR");

  // Debitar estoque
  let erros = 0;
  for (const r of state.reqItems) {
    try {
      await apiFetch("/api/movimentacoes", {
        method: "POST",
        body: JSON.stringify({ produto_id:r.id, tipo:"saida", quantidade:r.qtd, observacao:`${num} — ${solicitante}/${setor}` }),
      });
    } catch { erros++; }
  }
  if (erros) toast(`${erros} item(s) não debitado(s).`, "error");
  else       toast(`${state.reqItems.length} item(s) debitados do estoque.`, "success");
  load();

  const rows = state.reqItems.map(r => `
    <tr>
      <td style="font-family:monospace;font-size:11px">${r.codigo}</td>
      <td>${r.descricao}</td>
      <td style="text-align:center">${r.unidade}</td>
      <td style="text-align:center;font-weight:600">${r.qtd}</td>
      <td style="text-align:center;color:#aaa">_______</td>
    </tr>`).join("");

  const win = window.open("","_blank","width=820,height=720");
  if (!win) { toast("Permita pop-ups para imprimir.","error"); return; }
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Requisição ${num}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px 40px}.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px}.logo{font-size:22px;font-weight:700;color:#1a56db}.sub{font-size:10px;color:#888;letter-spacing:.07em;text-transform:uppercase;margin-top:3px}.di{text-align:right;font-size:12px;color:#555;line-height:1.6}.di strong{display:block;font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:2px}.sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#999;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:12px}.mg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}.ml{font-size:10px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}.mv{font-size:14px;font-weight:500}table{width:100%;border-collapse:collapse;margin-bottom:28px}th{background:#f5f5f3;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#777;border-bottom:1px solid #ccc}td{padding:10px 12px;border-bottom:1px solid #eee}tr:last-child td{border-bottom:none}tr:nth-child(even)td{background:#fafaf8}.sigs{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px}.sl2{border-top:1px solid #999;padding-top:7px;font-size:11px;color:#777}.ft{margin-top:24px;padding-top:14px;border-top:1px solid #eee;font-size:10.5px;color:#bbb;text-align:center}@media print{body{padding:18px 24px}@page{margin:10mm}}</style></head>
  <body><div class="hd"><div><div class="logo">SiX PDV</div><div class="sub">Sistema de PDV</div></div><div class="di"><strong>Requisição de Materiais</strong>Nº ${num}<br>Emitido em: ${dt}</div></div>
  <div class="sl">Informações da Requisição</div><div class="mg"><div><div class="ml">Solicitante</div><div class="mv">${solicitante}</div></div><div><div class="ml">Setor</div><div class="mv">${setor}</div></div><div><div class="ml">Data</div><div class="mv">${new Date().toLocaleDateString("pt-BR")}</div></div></div>
  <div class="sl">Itens Solicitados</div><table><thead><tr><th style="width:80px">Código</th><th>Produto</th><th style="width:65px;text-align:center">Unid.</th><th style="width:85px;text-align:center">Qtd. Sol.</th><th style="width:95px;text-align:center">Qtd. Atend.</th></tr></thead><tbody>${rows}</tbody></table>
  ${obs ? `<div class="sl">Observações</div><p style="font-size:13px;margin-bottom:28px">${obs}</p>` : ""}
  <div class="sigs"><div><div class="sl2">Assinatura do Solicitante</div></div><div><div class="sl2">Assinatura do Responsável pelo Estoque</div></div></div>
  <div class="ft">Documento gerado automaticamente pelo SiX PDV · ${dt}</div>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
  clearReq(); closeModal("reqModal");
}

// ── Scanner ───────────────────────────────────────────────────
let scanStream = null, scanInterval = null;

function openScannerModal() {
  document.getElementById("scanInput").value = "";
  document.getElementById("scanResult").style.display   = "none";
  document.getElementById("scanNotFound").style.display = "none";
  openModal("scannerModal");
  setTimeout(() => document.getElementById("scanInput").focus(), 100);
}
function closeScanner() { stopCamera(); closeModal("scannerModal"); }

function toggleCamera() {
  if (scanStream) { stopCamera(); return; }
  if (!navigator.mediaDevices?.getUserMedia) { toast("Câmera não suportada neste navegador.", "error"); return; }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(stream => {
    scanStream = stream;
    const video = document.getElementById("scanVideo");
    video.srcObject = stream;
    document.getElementById("scanPreview").style.display = "block";
    document.getElementById("btnCamera").textContent = "Parar câmera";
    if (window.BarcodeDetector) {
      const bd = new BarcodeDetector({ formats: ["ean_13","ean_8","code_128","code_39","upc_a","upc_e"] });
      scanInterval = setInterval(async () => {
        try {
          const codes = await bd.detect(video);
          if (codes.length) {
            document.getElementById("scanInput").value = codes[0].rawValue;
            buscarPorEan(); stopCamera();
          }
        } catch {}
      }, 300);
    }
  }).catch(() => toast("Sem acesso à câmera.", "error"));
}

function stopCamera() {
  clearInterval(scanInterval); scanInterval = null;
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  document.getElementById("scanPreview").style.display = "none";
  const btn = document.getElementById("btnCamera");
  if (btn) btn.textContent = "Usar câmera";
}

async function buscarPorEan() {
  const ean = document.getElementById("scanInput").value.trim();
  if (!ean) return;
  document.getElementById("scanResult").style.display   = "none";
  document.getElementById("scanNotFound").style.display = "none";
  try {
    const data = await apiFetch(`/api/produtos?q=${encodeURIComponent(ean)}`);
    const p = data.produtos.find(x => x.ean === ean || x.codigo === ean);
    if (!p) { document.getElementById("scanNotFound").style.display = "block"; return; }
    document.getElementById("scanResultName").textContent = p.descricao;
    document.getElementById("scanResultInfo").innerHTML =
      `Código <b>${p.codigo}</b> · Qtd: <b>${p.quantidade} ${p.unidade}</b> · <span class="pill pill-${p.status}" style="font-size:11px;padding:1px 7px"><span class="pill-dot"></span>${STATUS_LABEL[p.status]}</span>`;
    document.getElementById("scanBtnDetalhes").onclick = () => { closeScanner(); openDrawer(p.id); };
    document.getElementById("scanBtnEntrada").onclick  = () => { closeScanner(); openMovModal(p.id,"entrada"); };
    document.getElementById("scanBtnSaida").onclick    = () => { closeScanner(); openMovModal(p.id,"saida"); };
    document.getElementById("scanResult").style.display = "block";
  } catch(e) { toast("Erro: " + e.message, "error"); }
}

// ── Exportar ──────────────────────────────────────────────────
function exportar() {
  const p = new URLSearchParams();
  const q   = document.getElementById("searchInput").value.trim();
  const cat = document.getElementById("catSel").value;
  if (q)   p.set("q", q);
  if (cat) p.set("categoria", cat);
  if (state.qf !== "all") p.set("status", state.qf);
  window.location.href = `/api/export/produtos?${p}`;
}

// ── Imprimir alertas ──────────────────────────────────────────
async function imprimirAlertas() {
  try {
    const data = await apiFetch("/api/dashboard");
    const alertas = data.criticos || [];
    if (!alertas.length) { toast("Nenhum produto em alerta.", ""); return; }
    const dt = new Date().toLocaleString("pt-BR");
    const SC = { normal:"#15803d",baixo:"#a16207",critico:"#b91c1c",zero:"#c2410c" };
    const rows = alertas.map(p => `<tr><td style="font-family:monospace;font-size:11px">${p.codigo}</td><td>${p.descricao}</td><td>${p.categoria}</td><td style="text-align:center;font-weight:700;color:${SC[p.status]}">${p.quantidade}</td><td style="text-align:center;color:#888">${p.minimo}</td><td style="text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${SC[p.status]}18;color:${SC[p.status]};text-transform:uppercase">${STATUS_LABEL[p.status]}</span></td></tr>`).join("");
    const win = window.open("","_blank","width=900,height=700");
    if (!win) { toast("Permita pop-ups.","error"); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Alertas</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px 40px}.hd{display:flex;justify-content:space-between;border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px}.logo{font-size:22px;font-weight:700;color:#1a56db}table{width:100%;border-collapse:collapse;margin-top:14px}th{background:#f5f5f3;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#777;border-bottom:1px solid #ccc}td{padding:10px 12px;border-bottom:1px solid #eee}tr:nth-child(even)td{background:#fafaf8}.ft{margin-top:24px;font-size:10.5px;color:#bbb;text-align:center;border-top:1px solid #eee;padding-top:14px}@media print{@page{margin:10mm}}</style></head>
    <body><div class="hd"><div><div class="logo">SiX PDV</div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.07em;margin-top:3px">Sistema de PDV</div></div><div style="text-align:right;font-size:12px;color:#555"><strong style="display:block;font-size:15px;font-weight:700;color:#1a1a1a">Relatório de Alertas</strong>${dt}</div></div>
    <table><thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th style="text-align:center">Qtd. Atual</th><th style="text-align:center">Mínimo</th><th style="text-align:center">Status</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="ft">SiX PDV · ${dt}</div><script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  } catch(e) { toast(e.message,"error"); }
}

// ── Usuários (admin) ──────────────────────────────────────────
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
        <td style="color:var(--text-3);font-size:12px">${u.ultimo_acesso?.slice(0,16)||'—'}</td>
        <td>
          <div class="td-actions">
            <button class="btn btn-sm btn-ghost" onclick="toggleAtivo(${u.id},${u.ativo})">${u.ativo?'Desativar':'Ativar'}</button>
          </div>
        </td>
      </tr>`).join("");
  } catch(e) { toast(e.message,"error"); }
}

async function criarUsuario() {
  const body = {
    nome:   document.getElementById("uNome").value.trim(),
    email:  document.getElementById("uEmail").value.trim(),
    senha:  document.getElementById("uSenha").value,
    perfil: document.getElementById("uPerfil").value,
  };
  if (!body.nome || !body.email || !body.senha) { toast("Preencha todos os campos.","error"); return; }
  try {
    await apiFetch("/api/usuarios", { method:"POST", body: JSON.stringify(body) });
    toast("Usuário criado.", "success");
    ["uNome","uEmail","uSenha"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
    carregarUsuarios();
  } catch(e) { toast(e.message,"error"); }
}

async function toggleAtivo(uid, ativo) {
  try {
    await apiFetch(`/api/usuarios/${uid}`, { method:"PUT", body: JSON.stringify({ ativo: !ativo }) });
    toast(ativo ? "Usuário desativado." : "Usuário ativado.");
    carregarUsuarios();
  } catch(e) { toast(e.message,"error"); }
}

function openUsuariosModal() { carregarUsuarios(); openModal("usuariosModal"); }

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  load();

  let st;
  document.getElementById("searchInput")?.addEventListener("input", () => { clearTimeout(st); st = setTimeout(load, 280); });
  document.getElementById("catSel")?.addEventListener("change", load);
  document.getElementById("unSel")?.addEventListener("change", load);
  document.getElementById("scanInput")?.addEventListener("keydown", e => { if(e.key==="Enter") buscarPorEan(); });
});
