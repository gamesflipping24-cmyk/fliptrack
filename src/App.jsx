import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Package, Plus, TrendingUp, Wallet, ShoppingCart, Clock, X, ChevronRight, StickyNote, Tag, Boxes, BarChart2, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "";

async function fetchProducts() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Variabili VITE_SUPABASE_URL e VITE_SUPABASE_KEY mancanti su Vercel");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Errore Supabase: ${res.status} ${res.statusText}`);
  return res.json();
}

async function insertProduct(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Errore inserimento: ${res.status}`);
  return res.json();
}

function calcProfit(item) {
  if (item.status !== "sold") return null;
  return (item.sale_price||0) - (item.purchase_price||0) - (item.purchase_shipping||0) - (item.sale_shipping||0) - (item.fees||0);
}
function calcRoi(item) {
  const p = calcProfit(item);
  if (p === null) return null;
  const cost = (item.purchase_price||0) + (item.purchase_shipping||0);
  return cost ? Math.round((p/cost)*100) : null;
}

const platColors = { eBay:"#E53238", Vinted:"#09B191", Subito:"#FF6600", Marketplace:"#818cf8" };
const STATUS_LABELS = { sold:"Venduto", online:"Online", to_publish:"Da pubblicare" };
const STATUS_COLORS = { sold:"#22C55E", online:"#6C63FF", to_publish:"#F59E0B" };
const MONTHS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const NAV = [
  { id:"dashboard", label:"Dashboard", Icon:LayoutDashboard },
  { id:"acquisti",  label:"Acquisti",  Icon:ArrowDownLeft },
  { id:"vendite",   label:"Vendite",   Icon:ArrowUpRight },
  { id:"stock",     label:"Stock",     Icon:Package },
];

function monthlyProfit(items) {
  const map = {};
  items.filter(i=>i.status==="sold"&&i.sale_date).forEach(i=>{
    const m = new Date(i.sale_date).getMonth();
    map[m] = (map[m]||0) + (calcProfit(i)||0);
  });
  return Object.keys(map).sort((a,b)=>+a-+b).map(m=>({ month:MONTHS[m], profit:Math.round(map[m]*100)/100 }));
}
function avgDays(items) {
  const s = items.filter(i=>i.status==="sold"&&i.sale_date&&i.purchase_date);
  if (!s.length) return null;
  return Math.round(s.reduce((acc,i)=>(acc+(new Date(i.sale_date)-new Date(i.purchase_date))/(864e5)),0)/s.length);
}
function byCategory(items) {
  const map = {};
  items.filter(i=>i.status==="sold").forEach(i=>{
    const c=i.category||"Altro", p=calcProfit(i)||0, cost=(i.purchase_price||0)+(i.purchase_shipping||0);
    if(!map[c]) map[c]={profit:0,count:0,invested:0};
    map[c].profit+=p; map[c].count++; map[c].invested+=cost;
  });
  return Object.entries(map).map(([cat,v])=>({ cat, profit:Math.round(v.profit*100)/100, count:v.count, margin:v.invested?Math.round((v.profit/v.invested)*100):0 })).sort((a,b)=>b.profit-a.profit);
}

const s = {
  sidebar:{ width:240,minWidth:240,background:"#0F0F1A",borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",padding:"32px 0 24px",position:"sticky",top:0,height:"100vh" },
  logo:{ padding:"0 24px 28px",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:16 },
  logoTitle:{ fontSize:20,fontWeight:800,letterSpacing:-0.5,color:"#fff" },
  logoSub:{ fontSize:11,color:"#3a3a5a",marginTop:4 },
  nav:{ flex:1,padding:"0 12px" },
  navItem:(active)=>({ display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:500,color:active?"#A5A0FF":"#4a4a6a",background:active?"rgba(108,99,255,0.15)":"transparent",marginBottom:2,transition:"all 0.15s" }),
  navBadge:(active)=>({ marginLeft:"auto",fontSize:11,fontWeight:600,background:active?"rgba(108,99,255,0.2)":"rgba(255,255,255,0.05)",color:active?"#A5A0FF":"#4a4a6a",padding:"2px 8px",borderRadius:20 }),
  sidebarFooter:{ padding:"16px 12px 0",borderTop:"1px solid rgba(255,255,255,0.06)" },
  addBtn:{ width:"100%",background:"#6C63FF",color:"#fff",border:"none",borderRadius:10,padding:12,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" },
  main:{ flex:1,minWidth:0,padding:"40px 40px 80px" },
  pageHeader:{ marginBottom:32,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12 },
  pageTitle:{ fontSize:26,fontWeight:700,letterSpacing:-0.8,color:"#fff",display:"flex",alignItems:"center",gap:10 },
  pageSub:{ fontSize:13,color:"#3a3a5a",marginTop:4 },
  refreshBtn:{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#4a4a6a",borderRadius:8,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,fontFamily:"inherit" },
  stats:(cols)=>({ display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:14,marginBottom:28 }),
  stat:{ background:"#0F0F1A",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px 22px",position:"relative",overflow:"hidden" },
  statIcon:(color)=>({ width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,background:`${color}20` }),
  statLabel:{ fontSize:11,fontWeight:600,color:"#3a3a5a",textTransform:"uppercase",letterSpacing:0.7,marginBottom:8 },
  statVal:(color)=>({ fontSize:32,fontWeight:800,letterSpacing:-1.5,lineHeight:1,marginBottom:4,color }),
  statSub:{ fontSize:11,color:"#3a3a5a" },
  grid2:{ display:"grid",gridTemplateColumns:"1fr 320px",gap:16,marginBottom:16 },
  card:{ background:"#0F0F1A",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"22px 24px" },
  cardTitle:{ fontSize:12,fontWeight:600,color:"#4a4a6a",textTransform:"uppercase",letterSpacing:0.7,marginBottom:18,display:"flex",alignItems:"center",gap:6 },
  sectionLabel:{ fontSize:11,fontWeight:600,color:"#3a3a5a",textTransform:"uppercase",letterSpacing:0.7,marginBottom:12 },
  colHeader:{ display:"grid",gridTemplateColumns:"1fr 90px 90px 110px 95px 100px 24px",gap:10,padding:"0 16px 10px",fontSize:10,fontWeight:600,color:"#2a2a4a",textTransform:"uppercase",letterSpacing:0.7 },
  row:{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.055)",borderRadius:10,padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 90px 90px 110px 95px 100px 24px",alignItems:"center",gap:10,cursor:"pointer",marginBottom:5,position:"relative",overflow:"hidden" },
  rowName:{ fontSize:13,fontWeight:600,color:"#d0d0e8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingLeft:10 },
  rowSub:{ fontSize:10,color:"#2a2a4a",marginTop:2,paddingLeft:10,display:"flex",alignItems:"center",gap:4 },
  price:(color)=>({ fontSize:14,fontWeight:700,textAlign:"right",letterSpacing:-0.3,color }),
  profitCell:{ textAlign:"right" },
  profitMain:(color)=>({ fontSize:14,fontWeight:700,letterSpacing:-0.3,color }),
  roiTag:{ fontSize:10,color:"#2a2a4a",marginTop:1 },
  pill:(color)=>({ fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:20,textAlign:"center",whiteSpace:"nowrap",background:`${color}20`,color,border:`1px solid ${color}40` }),
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(16px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" },
  modal:{ background:"#0F0F1A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:36,width:500,maxWidth:"93vw",maxHeight:"92vh",overflowY:"auto",position:"relative" },
  modalClose:{ position:"absolute",top:18,right:18,background:"rgba(255,255,255,0.07)",border:"none",color:"#6060a0",width:32,height:32,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" },
  modalTitle:{ fontSize:19,fontWeight:700,color:"#fff",letterSpacing:-0.4,marginBottom:6,paddingRight:40,lineHeight:1.3 },
  modalCat:{ fontSize:11,color:"#3a3a5a",marginBottom:24,display:"flex",alignItems:"center",gap:5 },
  modalGrid:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 },
  modalBox:{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 16px" },
  modalBoxLabel:{ fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:0.7,color:"#3a3a5a",marginBottom:6,display:"flex",alignItems:"center",gap:5 },
  modalBoxVal:(color)=>({ fontSize:24,fontWeight:800,letterSpacing:-1,lineHeight:1,color }),
  modalBoxSub:{ fontSize:10,color:"#3a3a5a",marginTop:3 },
  modalInfo:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 },
  modalInfoItem:{ background:"rgba(255,255,255,0.025)",borderRadius:10,padding:"10px 12px" },
  modalInfoLabel:{ fontSize:10,fontWeight:600,color:"#2a2a4a",textTransform:"uppercase",letterSpacing:0.7,marginBottom:3 },
  modalInfoVal:{ fontSize:13,color:"#9090b0",fontWeight:500 },
  notesBox:{ background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 16px" },
  notesLabel:{ fontSize:10,fontWeight:600,color:"#3a3a5a",textTransform:"uppercase",letterSpacing:0.7,marginBottom:8,display:"flex",alignItems:"center",gap:5 },
  notesText:{ fontSize:13,color:"#7070a0",lineHeight:1.6 },
  field:{ marginBottom:13 },
  label:{ display:"block",fontSize:10,fontWeight:600,color:"#3a3a5a",textTransform:"uppercase",letterSpacing:0.7,marginBottom:6 },
  input:{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"11px 13px",color:"#e2e8f0",fontFamily:"inherit",fontSize:14,outline:"none" },
  textarea:{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"11px 13px",color:"#e2e8f0",fontFamily:"inherit",fontSize:13,outline:"none",resize:"vertical",minHeight:80,lineHeight:1.6 },
  col2:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 },
  col3:{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 },
  saveBtn:{ width:"100%",background:"#6C63FF",color:"#fff",border:"none",borderRadius:10,padding:13,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:8 },
  formSection:{ fontSize:10,fontWeight:600,color:"#3a3a5a",textTransform:"uppercase",letterSpacing:0.7,margin:"18px 0 12px",paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.05)" },
  errorBox:{ background:"rgba(244,63,94,0.08)",border:"1px solid rgba(244,63,94,0.2)",borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:10,color:"#f87171",fontSize:13,marginBottom:20 },
  loading:{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:14,color:"#3a3a5a" },
};

const Tooltip2 = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return <div style={{background:"#1a1a2e",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif"}}><div style={{color:"#6060a0",fontSize:10,marginBottom:2}}>{label}</div><div style={{color:"#fff",fontWeight:700,fontSize:14}}>+€{payload[0].value}</div></div>;
};

function Pill({ status }) {
  const color = STATUS_COLORS[status]||"#555";
  return <span style={s.pill(color)}>{STATUS_LABELS[status]||status}</span>;
}

function StatCard({ label, val, sub, color, Icon }) {
  return (
    <div style={s.stat}>
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 5% 90%, ${color}18, transparent 60%)`,pointerEvents:"none"}} />
      <div style={s.statIcon(color)}><Icon size={18} color={color} /></div>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statVal(color)}>{val}</div>
      <div style={s.statSub}>{sub}</div>
    </div>
  );
}

function ItemRow({ item, onClick }) {
  const profit = calcProfit(item);
  const roi = calcRoi(item);
  const accent = STATUS_COLORS[item.status]||"#555";
  const pc = platColors[item.purchase_platform]||"#818cf8";
  return (
    <div style={{...s.row,"--accent":accent}} onClick={()=>onClick(item)}>
      <style>{`.ft-row-accent::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:2.5px;border-radius:0 2px 2px 0;background:${accent}}`}</style>
      <div className="ft-row-accent">
        <div style={s.rowName}>{item.product_name}</div>
        <div style={s.rowSub}><Tag size={9}/>{item.category} · {item.purchase_date}</div>
      </div>
      <div style={s.price("#F43F5E")}>€{item.purchase_price}</div>
      <div style={s.price(item.status==="sold"?"#22C55E":"#2a2a4a")}>{item.status==="sold"?`€${item.sale_price}`:"—"}</div>
      <div style={s.profitCell}>
        <div style={s.profitMain(profit!=null?(profit>=0?"#22C55E":"#F43F5E"):"#2a2a4a")}>{profit!=null?`${profit>=0?"+":""}€${profit.toFixed(2)}`:"—"}</div>
        {roi!=null&&<div style={s.roiTag}>{roi}% roi</div>}
      </div>
      <span style={s.pill(pc)}>{item.purchase_platform||"—"}</span>
      <Pill status={item.status}/>
      <div style={{color:"#2a2a4a",display:"flex",alignItems:"center",justifyContent:"flex-end"}}><ChevronRight size={16}/></div>
    </div>
  );
}

function DetailModal({ item, onClose }) {
  const profit = calcProfit(item);
  const roi = calcRoi(item);
  const totalCost = (item.purchase_price||0)+(item.purchase_shipping||0);
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e=>e.stopPropagation()}>
        <button style={s.modalClose} onClick={onClose}><X size={16}/></button>
        <div style={s.modalTitle}>{item.product_name}</div>
        <div style={s.modalCat}><Tag size={11}/>{item.category} · <Pill status={item.status}/></div>
        <div style={s.modalGrid}>
          {[
            {l:"Costo totale",   v:`€${totalCost.toFixed(2)}`,                                                                    c:"#F43F5E", I:ShoppingCart, sub:"acquisto + spedizione"},
            {l:"Ricavo netto",   v:item.status==="sold"?`€${((item.sale_price||0)-(item.sale_shipping||0)-(item.fees||0)).toFixed(2)}`:"—", c:"#22C55E", I:Wallet,       sub:"vendita - sped. - fee"},
            {l:"Profitto",       v:profit!=null?`${profit>=0?"+":""}€${profit.toFixed(2)}`:"—",                                   c:profit!=null?(profit>=0?"#22C55E":"#F43F5E"):"#2a2a4a", I:TrendingUp, sub:""},
            {l:"ROI",            v:roi!=null?`${roi}%`:"—",                                                                       c:roi!=null?"#F59E0B":"#2a2a4a", I:BarChart2, sub:""},
          ].map(({l,v,c,I,sub})=>(
            <div key={l} style={s.modalBox}>
              <div style={s.modalBoxLabel}><I size={11}/>{l}</div>
              <div style={s.modalBoxVal(c)}>{v}</div>
              {sub&&<div style={s.modalBoxSub}>{sub}</div>}
            </div>
          ))}
        </div>
        <div style={s.modalInfo}>
          {[["Acquistato su",item.purchase_platform||"—"],["Venduto su",item.sale_platform||"—"],["Data acquisto",item.purchase_date||"—"],["Data vendita",item.sale_date||"—"],["Prezzo acquisto",`€${item.purchase_price||0}`],["Prezzo vendita",item.sale_price?`€${item.sale_price}`:"—"],["Sped. acquisto",`€${item.purchase_shipping||0}`],["Sped. vendita",`€${item.sale_shipping||0}`],["Commissioni",`€${item.fees||0}`],["Prezzo listing",item.listing_price?`€${item.listing_price}`:"—"]].map(([k,v])=>(
            <div key={k} style={s.modalInfoItem}><div style={s.modalInfoLabel}>{k}</div><div style={s.modalInfoVal}>{v}</div></div>
          ))}
        </div>
        {item.notes&&<div style={s.notesBox}><div style={s.notesLabel}><StickyNote size={11}/>Note</div><div style={s.notesText}>{item.notes}</div></div>}
      </div>
    </div>
  );
}

function FormModal({ onClose, onSaved }) {
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState(null);
  const [f,setF]=useState({product_name:"",category:"videogame",purchase_platform:"Subito",purchase_price:"",purchase_shipping:"0",purchase_date:"",sale_platform:"",sale_price:"",sale_shipping:"0",fees:"0",sale_date:"",listing_date:"",listing_price:"",status:"online",notes:""});
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const save=async()=>{
    if(!f.product_name||!f.purchase_price||!f.purchase_date){setErr("Compila nome, prezzo e data acquisto.");return;}
    setSaving(true);setErr(null);
    try{
      await insertProduct({product_name:f.product_name,category:f.category,purchase_platform:f.purchase_platform,purchase_price:parseFloat(f.purchase_price)||0,purchase_shipping:parseFloat(f.purchase_shipping)||0,purchase_date:f.purchase_date||null,sale_platform:f.sale_platform||null,sale_price:parseFloat(f.sale_price)||0,sale_shipping:parseFloat(f.sale_shipping)||0,fees:parseFloat(f.fees)||0,sale_date:f.sale_date||null,listing_date:f.listing_date||null,listing_price:parseFloat(f.listing_price)||0,status:f.status,notes:f.notes||null,profit:0});
      onSaved();onClose();
    }catch(e){setErr(e.message);}
    finally{setSaving(false);}
  };
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e=>e.stopPropagation()}>
        <button style={s.modalClose} onClick={onClose}><X size={16}/></button>
        <div style={s.modalTitle}>Nuovo articolo</div>
        {err&&<div style={s.errorBox}><AlertCircle size={16}/>{err}</div>}
        <div style={s.field}><label style={s.label}>Nome *</label><input style={s.input} placeholder="es. Nintendo 3DS XL" value={f.product_name} onChange={e=>set("product_name",e.target.value)}/></div>
        <div style={s.col2}>
          <div style={s.field}><label style={s.label}>Categoria</label><select style={s.input} value={f.category} onChange={e=>set("category",e.target.value)}><option value="videogame">Videogioco</option><option value="console">Console</option><option value="accessory">Accessorio</option></select></div>
          <div style={s.field}><label style={s.label}>Stato</label><select style={s.input} value={f.status} onChange={e=>set("status",e.target.value)}><option value="online">Online</option><option value="to_publish">Da pubblicare</option><option value="sold">Venduto</option></select></div>
        </div>
        <div style={s.formSection}>📥 Acquisto</div>
        <div style={s.col3}>
          <div style={s.field}><label style={s.label}>Prezzo (€) *</label><input style={s.input} type="number" placeholder="0.00" value={f.purchase_price} onChange={e=>set("purchase_price",e.target.value)}/></div>
          <div style={s.field}><label style={s.label}>Spedizione (€)</label><input style={s.input} type="number" placeholder="0.00" value={f.purchase_shipping} onChange={e=>set("purchase_shipping",e.target.value)}/></div>
          <div style={s.field}><label style={s.label}>Piattaforma</label><select style={s.input} value={f.purchase_platform} onChange={e=>set("purchase_platform",e.target.value)}><option>Subito</option><option>Vinted</option><option>eBay</option><option>Marketplace</option><option>Altra</option></select></div>
        </div>
        <div style={s.field}><label style={s.label}>Data acquisto *</label><input style={s.input} type="date" value={f.purchase_date} onChange={e=>set("purchase_date",e.target.value)}/></div>
        <div style={s.formSection}>📤 Vendita (opzionale)</div>
        <div style={s.col3}>
          <div style={s.field}><label style={s.label}>Prezzo (€)</label><input style={s.input} type="number" placeholder="0.00" value={f.sale_price} onChange={e=>set("sale_price",e.target.value)}/></div>
          <div style={s.field}><label style={s.label}>Spedizione (€)</label><input style={s.input} type="number" placeholder="0.00" value={f.sale_shipping} onChange={e=>set("sale_shipping",e.target.value)}/></div>
          <div style={s.field}><label style={s.label}>Commissioni (€)</label><input style={s.input} type="number" placeholder="0.00" value={f.fees} onChange={e=>set("fees",e.target.value)}/></div>
        </div>
        <div style={s.col2}>
          <div style={s.field}><label style={s.label}>Piattaforma vendita</label><select style={s.input} value={f.sale_platform} onChange={e=>set("sale_platform",e.target.value)}><option value="">— nessuna —</option><option>eBay</option><option>Vinted</option><option>Subito</option><option>Altra</option></select></div>
          <div style={s.field}><label style={s.label}>Data vendita</label><input style={s.input} type="date" value={f.sale_date} onChange={e=>set("sale_date",e.target.value)}/></div>
        </div>
        <div style={s.formSection}>🏷️ Listing (opzionale)</div>
        <div style={s.col2}>
          <div style={s.field}><label style={s.label}>Prezzo listing (€)</label><input style={s.input} type="number" placeholder="0.00" value={f.listing_price} onChange={e=>set("listing_price",e.target.value)}/></div>
          <div style={s.field}><label style={s.label}>Data listing</label><input style={s.input} type="date" value={f.listing_date} onChange={e=>set("listing_date",e.target.value)}/></div>
        </div>
        <div style={s.field}><label style={s.label}>Note</label><textarea style={s.textarea} placeholder="Dove l'hai trovato, prezzo obiettivo..." value={f.notes} onChange={e=>set("notes",e.target.value)}/></div>
        <button style={{...s.saveBtn,opacity:saving?0.6:1}} onClick={save} disabled={saving}><Plus size={16}/>{saving?"Salvataggio...":"Salva articolo"}</button>
      </div>
    </div>
  );
}

function RowList({ items, onSelect }) {
  if (!items.length) return <div style={{color:"#2a2a4a",fontSize:13,textAlign:"center",padding:"40px 0"}}>Nessun articolo.</div>;
  return (
    <>
      <div style={s.colHeader}>
        <div style={{paddingLeft:10}}>Articolo</div>
        <div style={{textAlign:"right"}}>Acquisto</div>
        <div style={{textAlign:"right"}}>Vendita</div>
        <div style={{textAlign:"right"}}>Profitto</div>
        <div>Comprato su</div><div>Stato</div><div/>
      </div>
      {items.map(item=><ItemRow key={item.id} item={item} onClick={onSelect}/>)}
    </>
  );
}

function PageDashboard({ items, onSelect }) {
  const sold=items.filter(i=>i.status==="sold");
  const inv=items.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0);
  const profit=sold.reduce((s,i)=>s+(calcProfit(i)||0),0);
  const rev=sold.reduce((s,i)=>s+(i.sale_price||0),0);
  const days=avgDays(items);
  const roi=sold.length?Math.round((profit/sold.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0))*100):0;
  const mData=monthlyProfit(items);
  const cats=byCategory(items);
  const maxP=cats.length?cats[0].profit:1;
  return (
    <>
      <div style={s.stats(4)}>
        <StatCard label="Profitto netto"   val={`+€${profit.toFixed(2)}`} sub={`ROI medio ${roi}%`}       color="#22C55E" Icon={TrendingUp}/>
        <StatCard label="Capitale invest." val={`€${inv.toFixed(2)}`}     sub={`${items.length} articoli`} color="#F43F5E" Icon={ShoppingCart}/>
        <StatCard label="Incassato"        val={`€${rev.toFixed(2)}`}     sub={`${sold.length} vendite`}   color="#6C63FF" Icon={Wallet}/>
        <StatCard label="Tempo medio"      val={days!=null?`${days}gg`:"—"} sub="giorni per vendere"       color="#F59E0B" Icon={Clock}/>
      </div>
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}><BarChart2 size={13}/>Profitti mensili</div>
          {mData.length>0?(
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={mData} barSize={26}>
                <XAxis dataKey="month" tick={{fill:"#3a3a5a",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#3a3a5a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`€${v}`}/>
                <Tooltip content={<Tooltip2/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                <Bar dataKey="profit" radius={[6,6,0,0]}>
                  {mData.map((_,i)=><Cell key={i} fill="#6C63FF" fillOpacity={i===mData.length-1?1:0.55}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ):<div style={{color:"#2a2a4a",fontSize:13,textAlign:"center",padding:"40px 0"}}>Nessuna vendita ancora</div>}
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}><Boxes size={13}/>Categorie più profittevoli</div>
          {cats.map(c=>(
            <div key={c.cat} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600,color:"#c0c0e0",display:"flex",alignItems:"center",gap:6}}><Tag size={11}/>{c.cat}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>+€{c.profit.toFixed(2)}</span>
              </div>
              <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:10,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:10,width:`${Math.round((c.profit/maxP)*100)}%`,background:"#6C63FF"}}/>
              </div>
              <div style={{fontSize:10,color:"#3a3a5a",marginTop:4}}>Margine {c.margin}% · {c.count} venduti</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{...s.sectionLabel,marginTop:16}}>Attività recente</div>
      <RowList items={items.slice(0,6)} onSelect={onSelect}/>
    </>
  );
}

function PageAcquisti({ items, onSelect }) {
  const total=items.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0);
  const avg=items.length?Math.round((total/items.length)*100)/100:0;
  return (<><div style={s.stats(2)}><StatCard label="Totale investito" val={`€${total.toFixed(2)}`} sub={`${items.length} acquisti`} color="#F43F5E" Icon={ShoppingCart}/><StatCard label="Spesa media" val={`€${avg}`} sub="per articolo" color="#6C63FF" Icon={Wallet}/></div><div style={s.sectionLabel}>Tutti gli acquisti</div><RowList items={items} onSelect={onSelect}/></>);
}

function PageVendite({ items, onSelect }) {
  const sold=items.filter(i=>i.status==="sold");
  const profit=sold.reduce((s,i)=>s+(calcProfit(i)||0),0);
  const roi=sold.length?Math.round((profit/sold.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0))*100):0;
  return (<><div style={s.stats(3)}><StatCard label="Venduti" val={sold.length} sub="completati" color="#22C55E" Icon={ArrowUpRight}/><StatCard label="Incassato" val={`€${sold.reduce((s,i)=>s+(i.sale_price||0),0).toFixed(2)}`} sub="totale" color="#22C55E" Icon={Wallet}/><StatCard label="Profitto" val={`+€${profit.toFixed(2)}`} sub={`ROI medio ${roi}%`} color="#F59E0B" Icon={TrendingUp}/></div><div style={s.sectionLabel}>Vendite completate</div><RowList items={sold} onSelect={onSelect}/></>);
}

function PageStock({ items, onSelect }) {
  const stock=items.filter(i=>i.status==="online"||i.status==="to_publish");
  const online=items.filter(i=>i.status==="online");
  const inv=stock.reduce((s,i)=>s+(i.purchase_price||0)+(i.purchase_shipping||0),0);
  return (<><div style={s.stats(3)}><StatCard label="In stock" val={stock.length} sub="totale" color="#F59E0B" Icon={Package}/><StatCard label="Online" val={online.length} sub="già in vendita" color="#6C63FF" Icon={ArrowUpRight}/><StatCard label="Capitale bloccato" val={`€${inv.toFixed(2)}`} sub="da recuperare" color="#F43F5E" Icon={ShoppingCart}/></div><div style={s.sectionLabel}>Articoli in stock</div><RowList items={stock} onSelect={onSelect}/></>);
}

const pageMeta = {
  dashboard:{ title:"Dashboard", sub:"Panoramica della tua attività",   Icon:LayoutDashboard },
  acquisti: { title:"Acquisti",  sub:"Tutto quello che hai comprato",   Icon:ArrowDownLeft },
  vendite:  { title:"Vendite",   sub:"Articoli venduti e profitti",     Icon:ArrowUpRight },
  stock:    { title:"Stock",     sub:"Articoli online e da pubblicare", Icon:Package },
};
const pages = { dashboard:PageDashboard, acquisti:PageAcquisti, vendite:PageVendite, stock:PageStock };

export default function App() {
  const [page,setPage]=useState("dashboard");
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [selected,setSelected]=useState(null);
  const [showForm,setShowForm]=useState(false);

  const load=async()=>{
    setLoading(true);setError(null);
    try{ const data=await fetchProducts(); setItems(data); }
    catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{load();},[]);

  const badges={ dashboard:items.length, acquisti:items.length, vendite:items.filter(i=>i.status==="sold").length, stock:items.filter(i=>i.status==="online"||i.status==="to_publish").length };
  const { title, sub, Icon:PageIcon } = pageMeta[page];
  const PageComp = pages[page];

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#0A0A0F",fontFamily:"Inter,-apple-system,sans-serif",color:"#E2E8F0",fontSize:14}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0} body{background:#0A0A0F} .ft-row-accent::before{position:absolute;left:0;top:20%;bottom:20%;width:2.5px;border-radius:0 2px 2px 0} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite} @media(max-width:960px){.sidebar{display:none!important}.mobnav{display:flex!important}.fab{display:flex!important}.main-pad{padding:24px 16px 110px!important}.stats4{grid-template-columns:1fr 1fr!important}.grid2r{grid-template-columns:1fr!important}.colheader{display:none!important}.rowgrid{grid-template-columns:1fr auto!important}.hidemd{display:none!important}}`}</style>

      <aside className="sidebar" style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoTitle}>Flip<span style={{color:"#6C63FF"}}>Track</span></div>
          <div style={s.logoSub}>videogiochi & console</div>
        </div>
        <nav style={s.nav}>
          {NAV.map(({id,label,Icon})=>(
            <div key={id} style={s.navItem(page===id)} onClick={()=>setPage(id)}>
              <Icon size={18} color={page===id?"#A5A0FF":"#4a4a6a"}/>{label}
              <span style={s.navBadge(page===id)}>{badges[id]}</span>
            </div>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <button style={s.addBtn} onClick={()=>setShowForm(true)}><Plus size={16}/>Nuovo articolo</button>
        </div>
      </aside>

      <main className="main-pad" style={s.main}>
        <div style={s.pageHeader}>
          <div>
            <div style={s.pageTitle}><PageIcon size={24} color="#6C63FF"/>{title}</div>
            <div style={s.pageSub}>{sub}</div>
          </div>
          <button style={s.refreshBtn} onClick={load}><RefreshCw size={13}/>Aggiorna</button>
        </div>
        {error&&<div style={s.errorBox}><AlertCircle size={16}/>{error}</div>}
        {loading
          ? <div style={s.loading}><Loader2 size={32} color="#6C63FF" className="spin"/><span>Caricamento...</span></div>
          : <PageComp items={items} onSelect={setSelected}/>
        }
      </main>

      <nav className="mobnav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:"rgba(10,10,15,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.07)",padding:"10px 0 20px",zIndex:90,justifyContent:"space-around"}}>
        {NAV.map(({id,label,Icon})=>(
          <div key={id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",padding:"4px 16px"}} onClick={()=>setPage(id)}>
            <Icon size={22} color={page===id?"#6C63FF":"#3a3a5a"}/>
            <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:0.7,color:page===id?"#6C63FF":"#3a3a5a"}}>{label}</span>
          </div>
        ))}
      </nav>

      <button className="fab" style={{display:"none",position:"fixed",bottom:84,right:18,background:"#6C63FF",color:"#fff",border:"none",borderRadius:"50%",width:52,height:52,cursor:"pointer",boxShadow:"0 8px 24px rgba(108,99,255,0.4)",zIndex:91,alignItems:"center",justifyContent:"center"}} onClick={()=>setShowForm(true)}><Plus size={22}/></button>

      {selected&&<DetailModal item={selected} onClose={()=>setSelected(null)}/>}
      {showForm&&<FormModal onClose={()=>setShowForm(false)} onSaved={load}/>}
    </div>
  );
}
