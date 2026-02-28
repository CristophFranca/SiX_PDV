/* ================================================================
   SiX PDV — caixa.js  |  PDV / Caixa
   ================================================================ */
"use strict";

const pdv = {
  caixa:     null,
  produtos:  [],
  cart:      [],
  pagamento: "dinheiro",
};

// ── Inicialização ─────────────────────────────────────────────
async function initCaixa() {
  await checkCaixa();
  await loadProdutos();
}

async function checkCaixa() {
  try {
    const d = await apiFetch("/api/caixa/status");
    pdv.caixa = d.caixa;
    renderCaixaState();
  } catch(e) { toast(e.message, "error"); }
}

function renderCaixaState() {
  const fechado = document.getElementById("caixaFechado");
  const aberto  = document.getElementById("caixaAberto");
  if (!fechado || !aberto) return;
  if (pdv.caixa) {
    fechado.style.display = "none";
    aberto.style.display  = "flex";
    renderCart();
  } else {
    fechado.style.display = "flex";
    aberto.style.display  = "none";
  }
}

// ── Abrir / Fechar caixa ──────────────────────────────────────
async function abrirCaixa() {
  const saldo = parseFloat(document.getElementById("saldoInicial").value) || 0;
  try {
    const d = await apiFetch("/api/caixa/abrir", {
      method: "POST", body: JSON.stringify({ saldo_inicial: saldo }),
    });
    pdv.caixa = d;
    closeModal("modalAbrirCaixa");
    toast("Caixa aberto!", "success");
    renderCaixaState();
  } catch(e) { toast(e.message, "error"); }
}

async function fecharCaixa() {
  if (!confirm("Fechar o caixa agora?")) return;
  try {
    const res = await apiFetch("/api/caixa/fechar", { method: "POST" });
    imprimirFechamento(res);
    pdv.caixa = null;
    pdv.cart  = [];
    renderCaixaState();
    toast("Caixa fechado.", "success");
  } catch(e) { toast(e.message, "error"); }
}

function imprimirFechamento(res) {
  const dt = new Date().toLocaleString("pt-BR");
  const win = window.open("","_blank","width=480,height=600");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fechamento de Caixa</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Courier New',monospace;font-size:13px;color:#111;padding:24px;max-width:380px}h2{font-size:16px;text-align:center;margin-bottom:4px}.sub{text-align:center;color:#555;font-size:11px;margin-bottom:20px}.sep{border:none;border-top:1px dashed #999;margin:14px 0}.row{display:flex;justify-content:space-between;padding:4px 0}.row.big{font-size:17px;font-weight:700;padding:8px 0}.ft{text-align:center;font-size:10px;color:#999;margin-top:20px;border-top:1px dashed #999;padding-top:12px}@media print{@page{margin:5mm}}</style></head>
  <body><h2>SiX PDV</h2><div class="sub">Relatório de Fechamento de Caixa<br>${dt}</div>
  <hr class="sep">
  <div class="row"><span>Saldo inicial</span><span>${fmtBRL(res.saldo_inicial)}</span></div>
  <div class="row"><span>Vendas (dinheiro)</span><span>${fmtBRL(res.dinheiro)}</span></div>
  <div class="row"><span>Vendas (PIX)</span><span>${fmtBRL(res.pix)}</span></div>
  <div class="row"><span>Vendas (cartão)</span><span>${fmtBRL(res.cartao)}</span></div>
  <hr class="sep">
  <div class="row"><span>Total de vendas</span><span>${fmtBRL(res.total_vendas)}</span></div>
  <div class="row"><span>Qtd. de vendas</span><span>${res.qtd_vendas}</span></div>
  <div class="row big"><span>Saldo final (cx)</span><span>${fmtBRL(res.saldo_final)}</span></div>
  <div class="ft">SiX PDV · Documento gerado automaticamente</div>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
}

// ── Produtos ──────────────────────────────────────────────────
async function loadProdutos(q = "") {
  try {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const d = await apiFetch(`/api/produtos?${p}`);
    pdv.produtos = d.produtos;
    renderProdutos();
  } catch(e) { toast(e.message, "error"); }
}

function renderProdutos() {
  const grid = document.getElementById("prodGrid");
  if (!grid) return;
  const filtro = document.getElementById("pdvSearch")?.value.toLowerCase() || "";
  const cat    = document.getElementById("pdvCat")?.value || "";

  const lista = pdv.produtos.filter(p => {
    const matchQ   = !filtro || p.descricao.toLowerCase().includes(filtro) || p.codigo.toLowerCase().includes(filtro);
    const matchCat = !cat || p.categoria === cat;
    return matchQ && matchCat;
  });

  if (!lista.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:40px;font-size:13px">Nenhum produto encontrado</div>`;
    return;
  }

  grid.innerHTML = lista.map(p => `
    <div class="prod-card${p.quantidade === 0 ? " esgotado" : ""}" onclick="addToCart(${p.id})" title="${p.quantidade === 0 ? 'Sem estoque' : ''}">
      <div class="prod-cat">${p.categoria}</div>
      <div class="prod-nome">${p.descricao}</div>
      <div class="prod-preco">${fmtBRL(p.preco_venda)}</div>
      <div class="prod-qty">${p.quantidade === 0 ? "Esgotado" : `${p.quantidade} ${p.unidade} em estoque`}</div>
    </div>`).join("");
}

// ── Carrinho ──────────────────────────────────────────────────
function addToCart(pid) {
  if (!pdv.caixa) { toast("Abra o caixa antes de vender.", "error"); return; }
  const p = pdv.produtos.find(x => x.id === pid);
  if (!p || p.quantidade === 0) return;
  const ex = pdv.cart.find(x => x.id === pid);
  if (ex) {
    if (ex.qty >= p.quantidade) { toast("Estoque insuficiente.", "error"); return; }
    ex.qty++;
  } else {
    pdv.cart.push({ id: pid, nome: p.descricao, preco: p.preco_venda, qty: 1, unidade: p.unidade });
  }
  renderCart();
}

function changeQty(idx, delta) {
  const item = pdv.cart[idx];
  const prod = pdv.produtos.find(x => x.id === item.id);
  const max  = prod ? prod.quantidade : Infinity;
  const nova = Math.max(1, item.qty + delta);
  if (nova > max) {
    toast(`Máximo disponível: ${max} ${item.unidade}.`, "error");
    return;
  }
  item.qty = nova;
  renderCart();
}

function removeItem(idx) {
  pdv.cart.splice(idx, 1);
  renderCart();
}

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartEmpty = document.getElementById("cartEmpty");
  if (!cartItems) return;

  const count = document.getElementById("cartCount");
  if (count) count.textContent = pdv.cart.length ? `${pdv.cart.reduce((a,x)=>a+x.qty,0)} itens` : "";

  if (!pdv.cart.length) {
    cartItems.innerHTML = "";
    if (cartEmpty) cartEmpty.style.display = "flex";
    updateTotals();
    return;
  }
  if (cartEmpty) cartEmpty.style.display = "none";

  cartItems.innerHTML = pdv.cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-nome">${item.nome}</div>
        <div class="cart-item-preco">${fmtBRL(item.preco)} / ${item.unidade}</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${i},+1)">+</button>
      </div>
      <div class="cart-item-sub">${fmtBRL(item.preco * item.qty)}</div>
      <button class="cart-item-rm" onclick="removeItem(${i})">${ICONS.x}</button>
    </div>`).join("");

  updateTotals();
}

function updateTotals() {
  const subtotal = pdv.cart.reduce((a, x) => a + x.preco * x.qty, 0);
  const desconto = parseFloat(document.getElementById("descontoInput")?.value) || 0;
  const total    = Math.max(0, subtotal - desconto);
  const pago     = parseFloat(document.getElementById("trocoInput")?.value) || 0;
  const troco    = pdv.pagamento === "dinheiro" ? Math.max(0, pago - total) : 0;

  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s("subtotalVal", fmtBRL(subtotal));
  s("descontoVal", desconto > 0 ? `- ${fmtBRL(desconto)}` : "—");
  s("totalVal",    fmtBRL(total));
  s("trocoVal",    troco > 0 ? fmtBRL(troco) : "—");
}

function setPagamento(tipo) {
  pdv.pagamento = tipo;
  document.querySelectorAll(".pgto-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.pgto-btn[data-pgto="${tipo}"]`)?.classList.add("active");
  const trocoRow = document.getElementById("trocoRow");
  if (trocoRow) trocoRow.style.display = tipo === "dinheiro" ? "flex" : "none";
  updateTotals();
}

function limparCarrinho() {
  if (!pdv.cart.length) return;
  if (!confirm("Limpar o carrinho?")) return;
  pdv.cart = [];
  renderCart();
}

// ── Finalizar venda ───────────────────────────────────────────
async function finalizarVenda() {
  if (!pdv.cart.length) { toast("Carrinho vazio.", "error"); return; }
  if (!pdv.caixa) { toast("Abra o caixa antes.", "error"); return; }

  const desconto  = parseFloat(document.getElementById("descontoInput")?.value) || 0;
  const valor_pago = parseFloat(document.getElementById("trocoInput")?.value) || 0;
  const subtotal  = pdv.cart.reduce((a, x) => a + x.preco * x.qty, 0);
  const total     = Math.max(0, subtotal - desconto);

  // Checar estoque atualizado antes de enviar
  for (const item of pdv.cart) {
    const prod = pdv.produtos.find(x => x.id === item.id);
    if (!prod || prod.quantidade <= 0) {
      toast(`"${item.nome}" está sem estoque. Remova do carrinho.`, "error"); return;
    }
    if (item.qty > prod.quantidade) {
      toast(`Estoque insuficiente para "${item.nome}". Disponível: ${prod.quantidade} ${item.unidade}.`, "error"); return;
    }
  }

  if (pdv.pagamento === "dinheiro" && valor_pago < total) {
    toast("Valor pago insuficiente.", "error"); return;
  }

  const body = {
    itens: pdv.cart.map(x => ({ produto_id: x.id, quantidade: x.qty, preco_unit: x.preco })),
    pagamento:  pdv.pagamento,
    desconto,
    valor_pago: pdv.pagamento === "dinheiro" ? valor_pago : total,
    obs: "",
  };

  try {
    const res = await apiFetch("/api/caixa/venda", { method:"POST", body: JSON.stringify(body) });
    toast(`Venda #${res.venda_id} registrada!`, "success");
    imprimirCupom(res);
    pdv.cart = [];
    if (document.getElementById("descontoInput")) document.getElementById("descontoInput").value = "";
    if (document.getElementById("trocoInput"))    document.getElementById("trocoInput").value = "";
    await loadProdutos(); // atualiza estoque
    renderCart();
  } catch(e) { toast(e.message, "error"); }
}

function imprimirCupom(venda) {
  const dt  = new Date().toLocaleString("pt-BR");
  const PGTO = { dinheiro:"Dinheiro", pix:"PIX", cartao_debito:"Cartão Débito", cartao_credito:"Cartão Crédito" };
  const rows = venda.itens.map(i => `
    <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px">
      <span>${i.descricao} x${i.quantidade}</span>
      <span>${fmtBRL(i.subtotal)}</span>
    </div>`).join("");

  const win = window.open("","_blank","width=400,height=560");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cupom #${venda.venda_id}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Courier New',monospace;font-size:13px;color:#111;padding:20px;max-width:340px}h2{font-size:15px;text-align:center;margin-bottom:4px}.sub{text-align:center;color:#555;font-size:11px;margin-bottom:16px}.sep{border:none;border-top:1px dashed #999;margin:10px 0}.row{display:flex;justify-content:space-between;padding:4px 0}.row.big{font-size:16px;font-weight:700;padding:8px 0}.troco{color:#15803d;font-weight:700}.ft{text-align:center;font-size:10px;color:#999;margin-top:16px;padding-top:10px;border-top:1px dashed #999}@media print{@page{margin:3mm}}</style></head>
  <body><h2>SiX PDV</h2><div class="sub">Cupom de Venda Nº ${venda.venda_id}<br>${dt}</div>
  <hr class="sep">${rows}<hr class="sep">
  ${venda.desconto > 0 ? `<div class="row"><span>Desconto</span><span>- ${fmtBRL(venda.desconto)}</span></div>` : ""}
  <div class="row big"><span>TOTAL</span><span>${fmtBRL(venda.total)}</span></div>
  <div class="row"><span>Pagamento</span><span>${PGTO[venda.pagamento]||venda.pagamento}</span></div>
  ${venda.troco > 0 ? `<div class="row troco"><span>Troco</span><span>${fmtBRL(venda.troco)}</span></div>` : ""}
  <div class="ft">Obrigado pela preferência!<br>SiX PDV · Documento gerado automaticamente</div>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
}

// ── Histórico de vendas ───────────────────────────────────────
async function verHistorico() {
  const data = document.getElementById("filtroData")?.value || "";
  try {
    const vendas = await apiFetch(`/api/caixa/vendas${data ? `?data=${data}` : ""}`);
    const tb = document.getElementById("historicoBody");
    if (!tb) return;
    const PGTO = { dinheiro:"Dinheiro", pix:"PIX", cartao_debito:"Débito", cartao_credito:"Crédito" };
    tb.innerHTML = !vendas.length
      ? `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-3)">Nenhuma venda encontrada</td></tr>`
      : vendas.map(v => `
        <tr onclick="verDetalheVenda(${v.id})" style="cursor:pointer">
          <td class="mono" style="color:var(--text-3)">#${v.id}</td>
          <td>${v.criado_em?.slice(0,16)}</td>
          <td><span class="pill pill-normal">${PGTO[v.pagamento]||v.pagamento}</span></td>
          <td class="mono" style="font-weight:700;text-align:right">${fmtBRL(v.total)}</td>
          <td style="color:var(--text-3);font-size:12px">${v.itens?.length || 0} item(s)</td>
        </tr>`).join("");
    openModal("historicoModal");
  } catch(e) { toast(e.message, "error"); }
}

async function verDetalheVenda(vid) {
  try {
    const v = await apiFetch(`/api/caixa/vendas/${vid}`);
    const PGTO = { dinheiro:"Dinheiro", pix:"PIX", cartao_debito:"Débito", cartao_credito:"Crédito" };
    const rows = v.itens.map(i => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
        <span>${i.descricao} × ${i.quantidade}</span>
        <span class="mono">${fmtBRL(i.subtotal)}</span>
      </div>`).join("");
    const detalhe = document.getElementById("detalheVendaContent");
    if (detalhe) {
      detalhe.innerHTML = `
        <div style="font-size:12px;color:var(--text-3);margin-bottom:12px">Venda #${v.id} · ${v.criado_em?.slice(0,16)} · ${PGTO[v.pagamento]||v.pagamento}</div>
        ${rows}
        <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:15px;font-weight:700;border-top:1px solid var(--border);margin-top:8px">
          <span>Total</span><span class="mono">${fmtBRL(v.total)}</span>
        </div>
        ${v.troco > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--green)"><span>Troco</span><span class="mono">${fmtBRL(v.troco)}</span></div>` : ""}`;
    }
    openModal("detalheVendaModal");
  } catch(e) { toast(e.message, "error"); }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initCaixa();
  setPagamento("dinheiro");

  let st;
  document.getElementById("pdvSearch")?.addEventListener("input", () => { clearTimeout(st); st = setTimeout(renderProdutos, 250); });
  document.getElementById("pdvCat")?.addEventListener("change", renderProdutos);
  document.getElementById("descontoInput")?.addEventListener("input", updateTotals);
  document.getElementById("trocoInput")?.addEventListener("input", updateTotals);
});
