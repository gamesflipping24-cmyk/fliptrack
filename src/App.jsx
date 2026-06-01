import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  LayoutDashboard, ArrowDownLeft, ArrowUpRight, Package,
  Plus, TrendingUp, Wallet, ShoppingCart, Clock, X,
  ChevronRight, StickyNote, Tag, Boxes, BarChart2, RefreshCw,
  AlertCircle, Loader2
} from "lucide-react";

// ─────────────────────────────────────────
// 🔧 CONFIGURA QUI LE TUE CREDENZIALI
// ─────────────────────────────────────────
const SUPABASE_URL  = "INSERISCI_IL_TUO_SUPABASE_URL";
const SUPABASE_KEY  = "INSERISCI_LA_TUA_ANON_KEY";
// ─────────────────────────────────────────

const TABLE = "products";

async function fetchProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=created_at.desc`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function insertProduct(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Insert error: ${res.status}`);
  return res.json();
}

// Calcola profitto reale da campi Supabase
function calcProfit(item) {
  if (item.status !== "sold") return null;
  return (item.sale_price || 0) - (item.purchase_price || 0) - (item.purchase_shipping || 0) - (item.sale_shipping || 0) - (item.fees || 0);
}

function calcRoi(item) {
  const p = calcProfit(item);
  if (p === null) return null;
  const cost = (item.purchase_price || 0) + (item.purchase_shipping || 0);
  if (!cost) return null;
  return Math.round((p / cost) * 100);
}

const platformColors = { eBay: "#E53238", Vinted: "#09B191", Subito: "#FF6600", Marketplace: "#818cf8" };
const ACCENT = "#6C63FF";
const GREEN  = "#22C55E";
const RED    = "#F43F5E";
const YELLOW = "#F59E0B";
const BLUE   = "#38BDF8";

const STATUS_LABELS = { sold: "Venduto", online: "Online", to_publish: "Da pubblicare" };
const STATUS_COLORS = { sold: GREEN, online: ACCENT, to_publish: YELLOW };

const monthNames = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

const NAV = [
  { id: "dashboard",   label: "Dashboard",    Icon: LayoutDashboard },
  { id: "acquisti",    label: "Acquisti",     Icon: ArrowDownLeft   },
  { id: "vendite",     label: "Vendite",      Icon: ArrowUpRight    },
  { id: "stock",       label: "Stock",        Icon: Package         },
];

function getMonthlyProfit(items) {
  const map = {};
  items.filter(i => i.status === "sold" && i.sale_date).forEach(i => {
    const m = new Date(i.sale_date).getMonth();
    const p = calcProfit(i) || 0;
    map[m] = (map[m] || 0) + p;
  });
  return Object.keys(map).sort((a,b)=>Number(a)-Number(b)).map(m => ({
    month: monthNames[m], profit: Math.round(map[m] * 100) / 100
  }));
}

function avgDays(items) {
  const sold = items.filter(i => i.status === "sold" && i.sale_date && i.purchase_date);
  if (!sold.length) return null;
  const avg = sold.reduce((s,i) => s + (new Date(i.sale_date)-new Date(i.purchase_date))/(1000*60*60*24), 0) / sold.length;
  return Math.round(avg);
}

function profitByCategory(items) {
  const map = {};
  items.filter(i => i.status === "sold").forEach(i => {
    const cat = i.category || "Altro";
    const p   = calcProfit(i) || 0;
    const cost = (i.purchase_price||0)+(i.purchase_shipping||0);
    if (!map[cat]) map[cat] = { profit:0, count:0, invested:0 };
    map[cat].profit   += p;
    map[cat].count    += 1;
    map[cat].invested += cost;
  });
  return Object.entries(map).map(([cat,v]) => ({
    cat, profit: Math.round(v.profit*100)/100, count: v.count,
    margin: v.invested ? Math.round((v.profit/v.invested)*100) : 0
  })).sort((a,b)=>b.profit-a.profit);
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#0A0A0F; }

  .ft { display:flex; min-height:100vh; background:#0A0A0F; font-family:'Inter',sans-serif; color:#E2E8F0; font-size:14px; }

  /* SIDEBAR */
  .ft-sidebar { width:240px; min-width:240px; background:#0F0F1A; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; padding:32px 0 24px; position:sticky; top:0; height:100vh; }
  .ft-logo { padding:0 24px 28px; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:16px; }
  .ft-logo-title { font-size:20px; font-weight:800; letter-spacing:-0.5px; color:#fff; }
  .ft-logo-title span { color:${ACCENT}; }
  .ft-logo-sub { font-size:11px; color:#3a3a5a; margin-top:4px; }
  .ft-nav { flex:1; padding:0 12px; }
  .ft-nav-item { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:10px; cursor:pointer; font-size:14px; font-weight:500; color:#4a4a6a; transition:all 0.15s; margin-bottom:2px; }
  .ft-nav-item:hover { color:#9090b0; background:rgba(255,255,255,0.04); }
  .ft-nav-item.active { background:rgba(108,99,255,0.15); color:#A5A0FF; }
  .ft-nav-item.active svg { color:#A5A0FF !important; }
  .ft-nav-item svg { color:#4a4a6a; transition:color 0.15s; flex-shrink:0; }
  .ft-nav-item:hover svg { color:#9090b0; }
  .ft-nav-badge { margin-left:auto; font-size:11px; font-weight:600; background:rgba(255,255,255,0.05); color:#4a4a6a; padding:2px 8px; border-radius:20px; }
  .ft-nav-item.active .ft-nav-badge { background:rgba(108,99,255,0.2); color:#A5A0FF; }
  .ft-sidebar-footer { padding:16px 12px 0; border-top:1px solid rgba(255,255,255,0.06); }
  .ft-add-btn { width:100%; background:${ACCENT}; color:#fff; border:none; border-radius:10px; padding:12px; font-weight:600; font-size:14px; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .ft-add-btn:hover { background:#7C75FF; transform:translateY(-1px); box-shadow:0 6px 20px rgba(108,99,255,0.3); }

  /* MAIN */
  .ft-main { flex:1; min-width:0; padding:40px 40px 80px; }
  .ft-page-header { margin-bottom:32px; display:flex; align-items:flex-start; justify-content:space-between; }
  .ft-page-title { font-size:26px; font-weight:700; letter-spacing:-0.8px; color:#fff; display:flex; align-items:center; gap:10px; }
  .ft-page-title svg { color:${ACCENT}; opacity:0.8; }
  .ft-page-sub { font-size:13px; color:#3a3a5a; margin-top:4px; }
  .ft-refresh-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#4a4a6a; border-radius:8px; padding:8px 12px; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:12px; font-family:'Inter',sans-serif; transition:all 0.15s; }
  .ft-refresh-btn:hover { color:#9090b0; border-color:rgba(255,255,255,0.15); }

  /* STATES */
  .ft-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 0; gap:14px; color:#3a3a5a; }
  .ft-loading svg { animation:spin 1s linear infinite; }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .ft-error { background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.2); border-radius:12px; padding:16px 20px; display:flex; align-items:center; gap:10px; color:#f87171; font-size:13px; margin-bottom:20px; }

  /* STATS */
  .ft-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
  .ft-stat { background:#0F0F1A; border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:20px 22px; position:relative; overflow:hidden; transition:border-color 0.2s, transform 0.2s; }
  .ft-stat:hover { border-color:rgba(255,255,255,0.13); transform:translateY(-2px); }
  .ft-stat-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:14px; }
  .ft-stat-label { font-size:11px; font-weight:600; color:#3a3a5a; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:8px; }
  .ft-stat-val { font-size:32px; font-weight:800; letter-spacing:-1.5px; line-height:1; margin-bottom:4px; }
  .ft-stat-sub { font-size:11px; color:#3a3a5a; }

  /* LAYOUT */
  .ft-grid-2 { display:grid; grid-template-columns:1fr 320px; gap:16px; margin-bottom:16px; }
  .ft-card { background:#0F0F1A; border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:22px 24px; }
  .ft-card-title { font-size:12px; font-weight:600; color:#4a4a6a; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:18px; display:flex; align-items:center; gap:6px; }
  .ft-card-title svg { color:#4a4a6a; }

  /* CATEGORY BARS */
  .ft-cat-item { margin-bottom:16px; }
  .ft-cat-item:last-child { margin-bottom:0; }
  .ft-cat-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
  .ft-cat-name { font-size:13px; font-weight:600; color:#c0c0e0; display:flex; align-items:center; gap:6px; }
  .ft-cat-val { font-size:13px; font-weight:700; color:#fff; }
  .ft-cat-bar-bg { height:5px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden; }
  .ft-cat-bar-fill { height:100%; border-radius:10px; transition:width 0.6s cubic-bezier(0.16,1,0.3,1); }
  .ft-cat-meta { font-size:10px; color:#3a3a5a; margin-top:4px; }

  /* CHART */
  .ft-tooltip { background:#1a1a2e; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:8px 12px; font-size:12px; font-family:'Inter',sans-serif; }
  .ft-tooltip-label { color:#6060a0; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; }
  .ft-tooltip-val { color:#fff; font-weight:700; font-size:14px; }

  /* TABLE */
  .ft-section-label { font-size:11px; font-weight:600; color:#3a3a5a; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:12px; }
  .ft-col-header { display:grid; grid-template-columns:1fr 90px 90px 110px 95px 100px 24px; gap:10px; padding:0 16px 10px; font-size:10px; font-weight:600; color:#2a2a4a; text-transform:uppercase; letter-spacing:0.7px; }
  .ft-col-r { text-align:right; }
  .ft-list { display:flex; flex-direction:column; gap:5px; }

  .ft-row { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.055); border-radius:10px; padding:14px 16px; display:grid; grid-template-columns:1fr 90px 90px 110px 95px 100px 24px; align-items:center; gap:10px; cursor:pointer; transition:all 0.15s; position:relative; overflow:hidden; }
  .ft-row::before { content:''; position:absolute; left:0; top:20%; bottom:20%; width:2.5px; border-radius:0 2px 2px 0; background:var(--accent,#333); opacity:0.9; }
  .ft-row:hover { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1); transform:translateX(2px); }

  .ft-row-name { font-size:13px; font-weight:600; color:#d0d0e8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-left:10px; }
  .ft-row-sub { font-size:10px; color:#2a2a4a; margin-top:2px; padding-left:10px; display:flex; align-items:center; gap:4px; }
  .ft-price { font-size:14px; font-weight:700; text-align:right; letter-spacing:-0.3px; }
  .ft-profit-cell { text-align:right; }
  .ft-profit-main { font-size:14px; font-weight:700; letter-spacing:-0.3px; }
  .ft-roi-tag { font-size:10px; color:#2a2a4a; margin-top:1px; }
  .ft-platform-pill { font-size:10px; font-weight:600; padding:4px 10px; border-radius:20px; text-align:center; white-space:nowrap; }
  .ft-status-pill { font-size:10px; font-weight:600; padding:4px 10px; border-radius:20px; text-align:center; white-space:nowrap; }
  .ft-arrow { color:#2a2a4a; display:flex; align-items:center; justify-content:flex-end; }

  /* MODAL */
  .ft-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(16px); z-index:100; display:flex; align-items:center; justify-content:center; animation:ftFade 0.18s ease; }
  @keyframes ftFade { from{opacity:0} to{opacity:1} }
  .ft-modal { background:#0F0F1A; border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:36px; width:500px; max-width:93vw; max-height:92vh; overflow-y:auto; position:relative; animation:ftUp 0.22s cubic-bezier(0.16,1,0.3,1); }
  @keyframes ftUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
  .ft-modal-close { position:absolute; top:18px; right:18px; background:rgba(255,255,255,0.07); border:none; color:#6060a0; width:32px; height:32px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .ft-modal-close:hover { background:rgba(255,255,255,0.12); color:#fff; }
  .ft-modal-title { font-size:19px; font-weight:700; color:#fff; letter-spacing:-0.4px; margin-bottom:6px; padding-right:40px; line-height:1.3; }
  .ft-modal-cat { font-size:11px; color:#3a3a5a; margin-bottom:24px; display:flex; align-items:center; gap:5px; }
  .ft-modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
  .ft-modal-box { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px 16px; }
  .ft-modal-box-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.7px; color:#3a3a5a; margin-bottom:6px; display:flex; align-items:center; gap:5px; }
  .ft-modal-box-val { font-size:24px; font-weight:800; letter-spacing:-1px; line-height:1; }
  .ft-modal-box-sub { font-size:10px; color:#3a3a5a; margin-top:3px; }
  .ft-modal-info { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
  .ft-modal-info-item { background:rgba(255,255,255,0.025); border-radius:10px; padding:10px 12px; }
  .ft-modal-info-label { font-size:10px; font-weight:600; color:#2a2a4a; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:3px; }
  .ft-modal-info-val { font-size:13px; color:#9090b0; font-weight:500; }
  .ft-notes-box { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px 16px; }
  .ft-notes-label { font-size:10px; font-weight:600; color:#3a3a5a; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:8px; display:flex; align-items:center; gap:5px; }
  .ft-notes-text { font-size:13px; color:#7070a0; line-height:1.6; }
  .ft-notes-empty { font-size:13px; color:#2a2a4a; font-style:italic; }

  /* FORM */
  .ft-field { margin-bottom:13px; }
  .ft-label { display:block; font-size:10px; font-weight:600; color:#3a3a5a; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:6px; }
  .ft-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:11px 13px; color:#e2e8f0; font-family:'Inter',sans-serif; font-size:14px; outline:none; transition:border-color 0.2s; }
  .ft-input:focus { border-color:rgba(108,99,255,0.5); background:rgba(255,255,255,0.05); }
  .ft-input::placeholder { color:#2a2a4a; }
  .ft-textarea { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:11px 13px; color:#e2e8f0; font-family:'Inter',sans-serif; font-size:13px; outline:none; transition:border-color 0.2s; resize:vertical; min-height:80px; line-height:1.6; }
  .ft-textarea:focus { border-color:rgba(108,99,255,0.5); }
  .ft-textarea::placeholder { color:#2a2a4a; }
  .ft-2col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .ft-3col { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .ft-save-btn { width:100%; background:${ACCENT}; color:#fff; border:none; border-radius:10px; padding:13px; font-weight:600; font-size:14px; cursor:pointer; font-family:'Inter',sans-serif; margin-top:4px; transition:all 0.15s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .ft-save-btn:hover { background:#7C75FF; }
  .ft-save-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .ft-form-section { font-size:10px; font-weight:600; color:#3a3a5a; text-transform:uppercase; letter-spacing:0.7px; margin:18px 0 12px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.05); }

  /* MOBILE */
  .ft-mobile-nav { display:none; position:fixed; bottom:0; left:0; right:0; background:rgba(10,10,15,0.97); backdrop-filter:blur(20px); border-top:1px solid rgba(255,255,255,0.07); padding:10px 0 20px; z-index:90; justify-content:space-around; }
  .ft-mobile-nav-item { display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; padding:4px 16px; }
  .ft-mobile-nav-item svg { color:#3a3a5a; transition:color 0.15s; }
  .ft-mobile-label { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:0.7px; color:#3a3a5a; transition:color 0.15s; }
  .ft-mobile-nav-item.active svg { color:${ACCENT}; }
  .ft-mobile-nav-item.active .ft-mobile-label { color:${ACCENT}; }
  .ft-fab { display:none; position:fixed; bottom:84px; right:18px; background:${ACCENT}; color:#fff; border:none; border-radius:50%; width:52px; height:52px; cursor:pointer; box-shadow:0 8px 24px rgba(108,99,255,0.4); z-index:91; align-items:center; justify-content:center; }

  @media (max-width:960px) {
    .ft-sidebar { display:none; }
    .ft-mobile-nav { display:flex; }
    .ft-fab { display:flex; }
    .ft-main { padding:24px 16px 110px; }
    .ft-stats { grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
    .ft-stat { padding:16px 18px; }
    .ft-stat-val { font-size:26px; }
    .ft-page-title { font-size:22px; }
    .ft-grid-2 { grid-template-columns:1fr; }
    .ft-col-header { display:none; }
    .ft-row { grid-template-columns:1fr auto; padding:13px 14px; }
    .ft-price,.ft-profit-cell,.ft-platform-pill,.ft-status-pill,.ft-arrow { display:none; }
    .ft-mobile-prices { display:flex !important; }
    .ft-2col,.ft-3col { grid-template-columns:1fr; }
    .ft-page-header { flex-direction:column; gap:12px; }
  }
`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="ft-tooltip">
      <div className="ft-tooltip-label">{label}</div>
      <div className="ft-tooltip-val">+€{payload[0].value}</div>
    </div>
  );
};

function StatCard({ label, val, sub, color, Icon }) {
  return (
    <div className="ft-stat">
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 5% 90%, ${color}0d 0%, transparent 60%)`, pointerEvents:"none" }} />
      <div className="ft-stat-icon" style={{ background:`${color}15` }}>
        <Icon size={18} color={color} />
      </div>
      <div className="ft-stat-label">{label}</div>
      <div className="ft-stat-val" style={{ color }}>{val}</div>
      <div className="ft-stat-sub">{sub}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] || "#555";
  const label = STATUS_LABELS[status] || status;
  return (
    <span className="ft-status-pill" style={{ background:`${color}15`, color, border:`1px solid ${color}28` }}>
      {label}
    </span>
  );
}

function ItemRow({ item, onClick }) {
  const profit = calcProfit(item);
  const roi    = calcRoi(item);
  const accent = STATUS_COLORS[item.status] || "#555";
  const buyPlatColor = platformColors[item.purchase_platform] || "#818cf8";
  const salePlatColor = platformColors[item.sale_platform] || "#818cf8";

  return (
    <div className="ft-row" style={{ "--accent": accent }} onClick={() => onClick(item)}>
      <div>
        <div className="ft-row-name">{item.product_name}</div>
        <div className="ft-row-sub">
          <Tag size={9} />{item.category} · {item.purchase_date}
        </div>
        {/* Mobile prices */}
        <div className="ft-mobile-prices" style={{ display:"none", gap:8, alignItems:"center", marginTop:6, paddingLeft:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:RED }}>€{item.purchase_price}</span>
          {item.status==="sold" && <><span style={{ color:"#2a2a4a", fontSize:11 }}>→</span><span style={{ fontSize:13, fontWeight:700, color:GREEN }}>€{item.sale_price}</span></>}
          {profit!=null && <span style={{ fontSize:11, fontWeight:600, color:profit>=0?GREEN:RED }}>{profit>=0?"+":""}€{profit.toFixed(2)}</span>}
          <StatusPill status={item.status} />
        </div>
      </div>
      <div className="ft-price" style={{ color:RED }}>€{item.purchase_price}</div>
      <div className="ft-price" style={{ color:item.status==="sold"?GREEN:"#2a2a4a" }}>
        {item.status==="sold"?`€${item.sale_price}`:"—"}
      </div>
      <div className="ft-profit-cell">
        <div className="ft-profit-main" style={{ color:profit!=null?(profit>=0?GREEN:RED):"#2a2a4a" }}>
          {profit!=null?`${profit>=0?"+":""}€${profit.toFixed(2)}`:"—"}
        </div>
        {roi!=null && <div className="ft-roi-tag">{roi}% roi</div>}
      </div>
      <span className="ft-platform-pill" style={{ background:`${buyPlatColor}18`, color:buyPlatColor, border:`1px solid ${buyPlatColor}28` }}>
        {item.purchase_platform||"—"}
      </span>
      <StatusPill status={item.status} />
      <div className="ft-arrow"><ChevronRight size={16} /></div>
    </div>
  );
}

function DetailModal({ item, onClose }) {
  const profit = calcProfit(item);
  const roi    = calcRoi(item);
  const totalCost = (item.purchase_price||0) + (item.purchase_shipping||0);
  const salePlatColor = platformColors[item.sale_platform] || "#818cf8";
  const buyPlatColor  = platformColors[item.purchase_platform] || "#818cf8";

  return (
    <div className="ft-overlay" onClick={onClose}>
      <div className="ft-modal" onClick={e=>e.stopPropagation()}>
        <button className="ft-modal-close" onClick={onClose}><X size={16} /></button>
        <div className="ft-modal-title">{item.product_name}</div>
        <div className="ft-modal-cat">
          <Tag size={11} />{item.category} · <StatusPill status={item.status} />
        </div>

        <div className="ft-modal-grid">
          <div className="ft-modal-box">
            <div className="ft-modal-box-label"><ShoppingCart size={11} />Costo totale</div>
            <div className="ft-modal-box-val" style={{color:RED}}>€{totalCost.toFixed(2)}</div>
            <div className="ft-modal-box-sub">acquisto + spedizione in</div>
          </div>
          <div className="ft-modal-box">
            <div className="ft-modal-box-label"><Wallet size={11} />Ricavo netto</div>
            <div className="ft-modal-box-val" style={{color:item.status==="sold"?GREEN:"#2a2a4a"}}>
              {item.status==="sold"?`€${((item.sale_price||0)-(item.sale_shipping||0)-(item.fees||0)).toFixed(2)}`:"—"}
            </div>
            <div className="ft-modal-box-sub">vendita - sped. - commissioni</div>
          </div>
          <div className="ft-modal-box">
            <div className="ft-modal-box-label"><TrendingUp size={11} />Profitto</div>
            <div className="ft-modal-box-val" style={{color:profit!=null?(profit>=0?GREEN:RED):"#2a2a4a"}}>
              {profit!=null?`${profit>=0?"+":""}€${profit.toFixed(2)}`:"—"}
            </div>
          </div>
          <div className="ft-modal-box">
            <div className="ft-modal-box-label"><BarChart2 size={11} />ROI</div>
            <div className="ft-modal-box-val" style={{color:roi!=null?YELLOW:"#2a2a4a"}}>
              {roi!=null?`${roi}%`:"—"}
            </div>
          </div>
        </div>

        <div className="ft-modal-info">
          {[
            ["Acquistato su", item.purchase_platform||"—"],
            ["Venduto su",    item.sale_platform||"—"],
            ["Data acquisto", item.purchase_date||"—"],
            ["Data vendita",  item.sale_date||"—"],
            ["Prezzo acquisto", `€${item.purchase_price||0}`],
            ["Prezzo vendita",  item.sale_price?`€${item.sale_price}`:"—"],
            ["Sped. acquisto",  `€${item.purchase_shipping||0}`],
            ["Sped. vendita",   `€${item.sale_shipping||0}`],
            ["Commissioni",     `€${item.fees||0}`],
            ["Prezzo listing",  item.listing_price?`€${item.listing_price}`:"—"],
          ].map(([k,v])=>(
            <div className="ft-modal-info-item" key={k}>
              <div className="ft-modal-info-label">{k}</div>
              <div className="ft-modal-info-val">{v}</div>
            </div>
          ))}
        </div>

        {item.notes && (
          <div className="ft-notes-box">
            <div className="ft-notes-label"><StickyNote size={11} />Note</div>
            <div className="ft-notes-text">{item.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormModal({ onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const [form, setForm] = useState({
    product_name:"", category:"videogame", purchase_platform:"Subito",
    purchase_price:"", purchase_shipping:"0", purchase_date:"",
    sale_platform:"", sale_price:"", sale_shipping:"0", fees:"0",
    sale_date:"", listing_date:"", listing_price:"", status:"online", notes:""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.product_name || !form.purchase_price || !form.purchase_date) {
      setError("Compila almeno: nome, prezzo acquisto e data acquisto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        product_name:        form.product_name,
        category:            form.category,
        purchase_platform:   form.purchase_platform,
        purchase_price:      parseFloat(form.purchase_price)||0,
        purchase_shipping:   parseFloat(form.purchase_shipping)||0,
        purchase_date:       form.purchase_date||null,
        sale_platform:       form.sale_platform||null,
        sale_price:          parseFloat(form.sale_price)||0,
        sale_shipping:       parseFloat(form.sale_shipping)||0,
        fees:                parseFloat(form.fees)||0,
        sale_date:           form.sale_date||null,
        listing_date:        form.listing_date||null,
        listing_price:       parseFloat(form.listing_price)||0,
        status:              form.status,
        notes:               form.notes||null,
        profit:              0,
      };
      await insertProduct(payload);
      onSaved();
      onClose();
    } catch(e) {
      setError("Errore nel salvataggio. Controlla le credenziali Supabase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ft-overlay" onClick={onClose}>
      <div className="ft-modal" onClick={e=>e.stopPropagation()}>
        <button className="ft-modal-close" onClick={onClose}><X size={16} /></button>
        <div className="ft-modal-title">Nuovo articolo</div>

        {error && <div className="ft-error"><AlertCircle size={16} />{error}</div>}

        <div className="ft-field">
          <label className="ft-label">Nome articolo *</label>
          <input className="ft-input" placeholder="es. Nintendo 3DS XL Animal Crossing" value={form.product_name} onChange={e=>set("product_name",e.target.value)} />
        </div>

        <div className="ft-2col">
          <div className="ft-field">
            <label className="ft-label">Categoria</label>
            <select className="ft-input" style={{appearance:"none"}} value={form.category} onChange={e=>set("category",e.target.value)}>
              <option value="videogame">Videogioco</option>
              <option value="console">Console</option>
              <option value="accessory">Accessorio</option>
            </select>
          </div>
          <div className="ft-field">
            <label className="ft-label">Stato</label>
            <select className="ft-input" style={{appearance:"none"}} value={form.status} onChange={e=>set("status",e.target.value)}>
              <option value="online">Online</option>
              <option value="to_publish">Da pubblicare</option>
              <option value="sold">Venduto</option>
            </select>
          </div>
        </div>

        <div className="ft-form-section">📥 Acquisto</div>
        <div className="ft-3col">
          <div className="ft-field">
            <label className="ft-label">Prezzo (€) *</label>
            <input className="ft-input" type="number" placeholder="0.00" value={form.purchase_price} onChange={e=>set("purchase_price",e.target.value)} />
          </div>
          <div className="ft-field">
            <label className="ft-label">Spedizione (€)</label>
            <input className="ft-input" type="number" placeholder="0.00" value={form.purchase_shipping} onChange={e=>set("purchase_shipping",e.target.value)} />
          </div>
          <div className="ft-field">
            <label className="ft-label">Piattaforma</label>
            <select className="ft-input" style={{appearance:"none"}} value={form.purchase_platform} onChange={e=>set("purchase_platform",e.target.value)}>
              <option>Subito</option><option>Vinted</option><option>eBay</option><option>Marketplace</option><option>Altra</option>
            </select>
          </div>
        </div>
        <div className="ft-field">
          <label className="ft-label">Data acquisto *</label>
          <input className="ft-input" type="date" value={form.purchase_date} onChange={e=>set("purchase_date",e.target.value)} />
        </div>

        <div className="ft-form-section">📤 Vendita (opzionale)</div>
        <div className="ft-3col">
          <div className="ft-field">
            <label className="ft-label">Prezzo (€)</label>
            <input className="ft-input" type="number" placeholder="0.00" value={form.sale_price} onChange={e=>set("sale_price",e.target.value)} />
          </div>
          <div className="ft-field">
            <label className="ft-label">Spedizione (€)</label>
            <input className="ft-input" type="number" placeholder="0.00" value={form.sale_shipping} onChange={e=>set("sale_shipping",e.target.value)} />
          </div>
          <div className="ft-field">
            <label className="ft-label">Commissioni (€)</label>
            <input className="ft-input" type="number" placeholder="0.00" value={form.fees} onChange={e=>set("fees",e.target.value)} />
          </div>
        </div>
        <div className="ft-2col">
          <div className="ft-field">
            <label className="ft-label">Piattaforma vendita</label>
            <select className="ft-input" style={{appearance:"none"}} value={form.sale_platform} onChange={e=>set("sale_platform",e.target.value)}>
              <option value="">— nessuna —</option>
              <option>eBay</option><option>Vinted</option><option>Subito</option><option>Altra</option>
            </select>
          </div>
          <div className="ft-field">
            <label className="ft-label">Data vendita</label>
            <input className="ft-input" type="date" value={form.sale_date} onChange={e=>set("sale_date",e.target.value)} />
          </div>
        </div>

        <div className="ft-form-section">🏷️ Listing (opzionale)</div>
        <div className="ft-2col">
          <div className="ft-field">
            <label className="ft-label">Prezzo listing (€)</label>
            <input className="ft-input" type="number" placeholder="0.00" value={form.listing_price} onChange={e=>set("listing_price",e.target.value)} />
          </div>
          <div className="ft-field">
            <label className="ft-label">Data listing</label>
            <input className="ft-input" type="date" value={form.listing_date} onChange={e=>set("listing_date",e.target.value)} />
          </div>
        </div>

        <div className="ft-field">
          <label className="ft-label">Note</label>
          <textarea className="ft-textarea" placeholder="Dove l'hai trovato, prezzo obiettivo, dettagli..." value={form.notes} onChange={e=>set("notes",e.target.value)} />
        </div>

        <button className="ft-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={16} style={{animation:"spin 1s linear infinite"}} />Salvataggio...</> : <><Plus size={16} />Salva articolo</>}
        </button>
      </div>
    </div>
  );
}

function RowList({ items, onSelect }) {
  if (!items.length) return <div style={{ color:"#2a2a4a", fontSize:13, textAlign:"center", padding:"40px 0" }}>Nessun articolo trovato.</div>;
  return (
    <>
      <div className="ft-col-header">
        <div style={{paddingLeft:10}}>Articolo</div>
        <div className="ft-col-r">Acquisto</div>
        <div className="ft-col-r">Vendita</div>
        <div className="ft-col-r">Profitto</div>
        <div>Comprato su</div>
        <div>Stato</div>
        <div></div>
      </div>
      <div className="ft-list">
        {items.map(item => <ItemRow key={item.id} item={item} onClick={onSelect} />)}
      </div>
    </>
  );
}

function PageDashboard({ items, onSelect }) {
  const sold        = items.filter(i=>i.status==="sold");
  const totalInv    = items.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0);
  const totalProfit = sold.reduce((s,i)=>s+(calcProfit(i)||0),0);
  const totalRev    = sold.reduce((s,i)=>s+(i.sale_price||0),0);
  const inStock     = items.filter(i=>i.status==="online"||i.status==="to_publish").length;
  const days        = avgDays(items);
  const avgRoi      = sold.length ? Math.round((totalProfit/sold.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0))*100) : 0;
  const monthlyData = getMonthlyProfit(items);
  const cats        = profitByCategory(items);
  const maxProfit   = cats.length ? cats[0].profit : 1;

  return (
    <>
      <div className="ft-stats">
        <StatCard label="Profitto netto"   val={`+€${totalProfit.toFixed(2)}`} sub={`ROI medio ${avgRoi}%`}       color={GREEN}  Icon={TrendingUp}   />
        <StatCard label="Capitale invest." val={`€${totalInv.toFixed(2)}`}     sub={`${items.length} articoli`}   color={RED}    Icon={ShoppingCart} />
        <StatCard label="Incassato"        val={`€${totalRev.toFixed(2)}`}     sub={`${sold.length} vendite`}     color={ACCENT} Icon={Wallet}       />
        <StatCard label="Tempo medio"      val={days!=null?`${days}gg`:"—"}    sub="giorni per vendere"           color={YELLOW} Icon={Clock}        />
      </div>

      <div className="ft-grid-2">
        <div className="ft-card">
          <div className="ft-card-title"><BarChart2 size={13} />Profitti mensili</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData} barSize={26}>
                <XAxis dataKey="month" tick={{ fill:"#3a3a5a", fontSize:11, fontFamily:"Inter" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#3a3a5a", fontSize:10, fontFamily:"Inter" }} axisLine={false} tickLine={false} tickFormatter={v=>`€${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:"rgba(255,255,255,0.03)" }} />
                <Bar dataKey="profit" radius={[6,6,0,0]}>
                  {monthlyData.map((_,i)=>(
                    <Cell key={i} fill={ACCENT} fillOpacity={i===monthlyData.length-1?1:0.55} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color:"#2a2a4a", fontSize:13, textAlign:"center", padding:"40px 0" }}>Nessuna vendita ancora</div>
          )}
        </div>
        <div className="ft-card">
          <div className="ft-card-title"><Boxes size={13} />Categorie più profittevoli</div>
          {cats.length ? cats.map(c=>(
            <div className="ft-cat-item" key={c.cat}>
              <div className="ft-cat-row">
                <span className="ft-cat-name"><Tag size={11}/>{c.cat}</span>
                <span className="ft-cat-val">+€{c.profit.toFixed(2)}</span>
              </div>
              <div className="ft-cat-bar-bg">
                <div className="ft-cat-bar-fill" style={{ width:`${Math.round((c.profit/maxProfit)*100)}%`, background:ACCENT }} />
              </div>
              <div className="ft-cat-meta">Margine {c.margin}% · {c.count} venduti</div>
            </div>
          )) : <div style={{color:"#2a2a4a",fontSize:13}}>Nessuna vendita ancora</div>}
        </div>
      </div>

      <div className="ft-section-label" style={{marginTop:16}}>Attività recente</div>
      <RowList items={items.slice(0,6)} onSelect={onSelect} />
    </>
  );
}

function PageAcquisti({ items, onSelect }) {
  const total = items.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0);
  const avg   = items.length ? Math.round((total/items.length)*100)/100 : 0;
  return (
    <>
      <div className="ft-stats" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
        <StatCard label="Totale investito" val={`€${total.toFixed(2)}`} sub={`${items.length} acquisti`} color={RED}    Icon={ShoppingCart} />
        <StatCard label="Spesa media"      val={`€${avg}`}             sub="per articolo"               color={ACCENT} Icon={Wallet}       />
      </div>
      <div className="ft-section-label">Tutti gli acquisti</div>
      <RowList items={items} onSelect={onSelect} />
    </>
  );
}

function PageVendite({ items, onSelect }) {
  const sold   = items.filter(i=>i.status==="sold");
  const profit = sold.reduce((s,i)=>s+(calcProfit(i)||0),0);
  const avgRoi = sold.length ? Math.round((profit/sold.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0))*100) : 0;
  return (
    <>
      <div className="ft-stats" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        <StatCard label="Articoli venduti" val={sold.length}              sub="completati"           color={GREEN}  Icon={ArrowUpRight} />
        <StatCard label="Incassato"        val={`€${sold.reduce((s,i)=>s+(i.sale_price||0),0).toFixed(2)}`} sub="totale" color={GREEN} Icon={Wallet} />
        <StatCard label="Profitto totale"  val={`+€${profit.toFixed(2)}`} sub={`ROI medio ${avgRoi}%`} color={YELLOW} Icon={TrendingUp} />
      </div>
      <div className="ft-section-label">Vendite completate</div>
      <RowList items={sold} onSelect={onSelect} />
    </>
  );
}

function PageStock({ items, onSelect }) {
  const stock  = items.filter(i=>i.status==="online"||i.status==="to_publish");
  const online = items.filter(i=>i.status==="online");
  const toPub  = items.filter(i=>i.status==="to_publish");
  const inv    = stock.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0);
  return (
    <>
      <div className="ft-stats" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        <StatCard label="In stock"          val={stock.length}           sub="totale"               color={YELLOW} Icon={Package}      />
        <StatCard label="Online"            val={online.length}          sub="già in vendita"        color={ACCENT} Icon={ArrowUpRight} />
        <StatCard label="Capitale bloccato" val={`€${inv.toFixed(2)}`}  sub="da recuperare"         color={RED}    Icon={ShoppingCart} />
      </div>
      <div className="ft-section-label">Articoli in stock</div>
      <RowList items={stock} onSelect={onSelect} />
    </>
  );
}

const pageMeta = {
  dashboard: { title:"Dashboard", sub:"Panoramica della tua attività",  Icon:LayoutDashboard },
  acquisti:  { title:"Acquisti",  sub:"Tutto quello che hai comprato",  Icon:ArrowDownLeft   },
  vendite:   { title:"Vendite",   sub:"Articoli venduti e profitti",    Icon:ArrowUpRight    },
  stock:     { title:"Stock",     sub:"Articoli online e da pubblicare",Icon:Package         },
};
const pageComponents = { dashboard:PageDashboard, acquisti:PageAcquisti, vendite:PageVendite, stock:PageStock };

export default function App() {
  const [page,     setPage]     = useState("dashboard");
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchProducts();
      setItems(data);
    } catch(e) {
      setError("Impossibile connettersi a Supabase. Controlla URL e chiave API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setTimeout(()=>setMounted(true),60); load(); }, []);

  const badges = {
    dashboard: items.length,
    acquisti:  items.length,
    vendite:   items.filter(i=>i.status==="sold").length,
    stock:     items.filter(i=>i.status==="online"||i.status==="to_publish").length,
  };

  const PageComponent          = pageComponents[page];
  const { title, sub, Icon: PageIcon } = pageMeta[page];

  return (
    <>
      <style>{css}</style>
      <div className="ft" style={{ opacity:mounted?1:0, transition:"opacity 0.3s" }}>

        <aside className="ft-sidebar">
          <div className="ft-logo">
            <div className="ft-logo-title">Flip<span>Track</span></div>
            <div className="ft-logo-sub">videogiochi & console</div>
          </div>
          <nav className="ft-nav">
            {NAV.map(({id,label,Icon})=>(
              <div key={id} className={`ft-nav-item${page===id?" active":""}`} onClick={()=>setPage(id)}>
                <Icon size={18} />{label}
                <span className="ft-nav-badge">{badges[id]}</span>
              </div>
            ))}
          </nav>
          <div className="ft-sidebar-footer">
            <button className="ft-add-btn" onClick={()=>setShowForm(true)}>
              <Plus size={16} />Nuovo articolo
            </button>
          </div>
        </aside>

        <main className="ft-main">
          <div className="ft-page-header">
            <div>
              <div className="ft-page-title"><PageIcon size={24} />{title}</div>
              <div className="ft-page-sub">{sub}</div>
            </div>
            <button className="ft-refresh-btn" onClick={load}>
              <RefreshCw size={13} />Aggiorna
            </button>
          </div>

          {error && <div className="ft-error"><AlertCircle size={16}/>{error}</div>}

          {loading ? (
            <div className="ft-loading">
              <Loader2 size={32} color={ACCENT} />
              <span>Caricamento dati da Supabase...</span>
            </div>
          ) : (
            <PageComponent items={items} onSelect={setSelected} />
          )}
        </main>

        <nav className="ft-mobile-nav">
          {NAV.map(({id,label,Icon})=>(
            <div key={id} className={`ft-mobile-nav-item${page===id?" active":""}`} onClick={()=>setPage(id)}>
              <Icon size={22}/><span className="ft-mobile-label">{label}</span>
            </div>
          ))}
        </nav>
        <button className="ft-fab" onClick={()=>setShowForm(true)}><Plus size={22}/></button>

        {selected && <DetailModal item={selected} onClose={()=>setSelected(null)} />}
        {showForm  && <FormModal onClose={()=>setShowForm(false)} onSaved={load} />}
      </div>
    </>
  );
}
