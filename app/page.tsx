'use client';
import {useEffect,useRef,useState} from 'react';
import {supabaseConfigured} from '../lib/supabaseClient';
import Auth from '../components/Auth';
import ModuleIcon from '../components/ModuleIcon';
import Users from '../components/Users';
import ManagedSelect from '../components/ManagedSelect';
import {Sales,Expenses,SalesMethods} from '../components/SalesWorkspace';
import type {Payment,Sale,Expense,Account,InventoryItem,InventoryClose,DebtPayment,MonthClose,Quote,InitialBase,AppUser,Debt,DebtPaymentRecord,AccountBalanceEntry} from '../lib/db';
import {uid,ensureBusiness,fetchBusinessSettings,updateRateRemote,confirmInitialBaseRemote,useSalesCloud,useExpensesCloud,useAccountsCloud,useQuotesCloud,useMonthClosesCloud,useDebtsCloud,loadInventory,addInventoryItemRemote,addInventoryItemsBulkRemote,updateInventoryItemRemote,deleteInventoryItemRemote,deleteInventoryMonthRemote,logActivity,loadDebtPayments,addDebtPaymentRemote,removeDebtPaymentRemote,loadAccountBalanceHistory,addAccountBalanceHistoryRemote,removeAccountBalanceHistoryRemote,addInventoryCategoryRemote,addPaymentMethodRemote,addInventorySizeRemote,setInventoryBaselineMonthRemote,removeInventoryCategoryRemote,removePaymentMethodRemote,removeInventorySizeRemote,addExpenseCategoryRemote,removeExpenseCategoryRemote} from '../lib/db';

const CURRENT_USER_KEY='impresa_current_user';

const tabs=['Dashboard','Ventas','Gastos','Inventario','Banco y Efectivo','Contabilidad','Deudas','Cierre de mes','Cotizaciones','Usuarios','Reportes','Configuración'];
const today=()=>new Date().toISOString().slice(0,10);
const monthNow=()=>new Date().toISOString().slice(0,7);
// Muestra el mensaje del error si trae uno útil (por ejemplo, avisando qué migración de Supabase falta correr); si no, el mensaje genérico.
const errMsg=(err:unknown,fallback:string)=>(err instanceof Error&&err.message)?err.message:fallback;
const money=(n:number,c:'C$'|'US$'='C$')=>`${c}${new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0)}`;
const dual=(nio:number,rate:number)=>`${money(nio,'C$')} · ${money(rate>0?nio/rate:0,'US$')}`;
const toNio=(amount:number,currency:'C$'|'US$',rate:number)=>currency==='US$'?amount*rate:amount;
const fromNio=(nio:number,currency:'C$'|'US$'|undefined,rate:number)=>currency==='US$'?(rate>0?nio/rate:0):nio;

export default function Home(){
 const [businessId,setBusinessId]=useState<string|null>(null);
 const [bootError,setBootError]=useState('');
 const [settingsReady,setSettingsReady]=useState(false);
 const [tab,setTab]=useState('Dashboard'),[month,setMonth]=useState(monthNow());
 // "Ventas Transferencia Efectivo" y "Detalle de Inventario" ya no son pestañas aparte del menú:
 // ahora son una vista dentro de Ventas y de Inventario, con un selector chiquito en el encabezado.
 const [ventasView,setVentasView]=useState<'Ventas'|'Ventas Transferencia Efectivo'>('Ventas');
 const [inventarioView,setInventarioView]=useState<'Inventario'|'Detalle de Inventario'>('Inventario');
 const [rate,setRateLocal]=useState(37);
 const [initialBase,setInitialBaseLocal]=useState<InitialBase>({confirmed:false,baseUSD:4100,baseC:0});
 const [inventoryCategories,setInventoryCategories]=useState<string[]>(['Camisas','Hilos','Tintas','Vinil','Sublimación','Empaque','Otros']);
 const [paymentMethods,setPaymentMethods]=useState<string[]>(['Transferencia','Efectivo']);
 const [inventorySizes,setInventorySizes]=useState<string[]>(['XS','S','M','L','XL','XXL','2','4','6','8','10','12','14','16']);
 const [expenseCategories,setExpenseCategories]=useState<string[]>(['Materiales','Operativo','Servicios','Transporte','Nómina','Publicidad','Equipos','Otro']);
 const [inventoryBaselineMonth,setInventoryBaselineMonthLocal]=useState<string|null>(null);

 // Inicio de sesión con usuario y contraseña (pestaña Usuarios). Una vez
 // que alguien entra, este navegador lo recuerda (no hay que volver a
 // escribir la contraseña cada vez) hasta que presione "Cerrar sesión".
 const [currentUser,setCurrentUserState]=useState<AppUser|null>(null);
 useEffect(()=>{
  try{const raw=localStorage.getItem(CURRENT_USER_KEY);if(raw)setCurrentUserState(JSON.parse(raw))}catch{}
 },[]);
 const handleLogin=(u:AppUser)=>{setCurrentUserState(u);try{localStorage.setItem(CURRENT_USER_KEY,JSON.stringify(u))}catch{}};
 const handleLogout=()=>{setCurrentUserState(null);try{localStorage.removeItem(CURRENT_USER_KEY)}catch{}};

 useEffect(()=>{
  if(!supabaseConfigured)return;
  let cancelled=false;
  ensureBusiness().then(id=>{if(!cancelled)setBusinessId(id)}).catch(err=>{console.error('IMPRESA: no se pudo preparar el negocio',err);if(!cancelled)setBootError(err?.message||'No se pudo preparar tu negocio.')});
  return ()=>{cancelled=true}
 },[]);

 useEffect(()=>{
  if(!businessId)return;
  let cancelled=false;
  fetchBusinessSettings(businessId).then(s=>{if(!cancelled){setRateLocal(s.rate);setInitialBaseLocal(s.initialBase);setInventoryCategories(s.inventoryCategories);setPaymentMethods(s.paymentMethods);setInventorySizes(s.inventorySizes);setExpenseCategories(s.expenseCategories);setInventoryBaselineMonthLocal(s.inventoryBaselineMonth);setSettingsReady(true)}}).catch(err=>{console.error('IMPRESA: no se pudo cargar la configuración',err);if(!cancelled)setSettingsReady(true)});
  return ()=>{cancelled=true}
 },[businessId]);

 const setRate=(v:number)=>{setRateLocal(v);if(businessId)updateRateRemote(businessId,v).catch(err=>{console.error(err);alert('No se pudo guardar el tipo de cambio en la nube.')})};
 const setInitialBase=(v:InitialBase)=>{setInitialBaseLocal(v);if(businessId&&v.confirmed)confirmInitialBaseRemote(businessId,v.baseC).catch(err=>{console.error(err);alert('No se pudo confirmar la situación inicial en la nube.')})};
 const addInventoryCategory=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await addInventoryCategoryRemote(businessId,name);
  setInventoryCategories(next);
 };
 const addPaymentMethod=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await addPaymentMethodRemote(businessId,name);
  setPaymentMethods(next);
 };
 const addInventorySize=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await addInventorySizeRemote(businessId,name);
  setInventorySizes(next);
  return next;
 };
 const addExpenseCategory=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await addExpenseCategoryRemote(businessId,name);
  setExpenseCategories(next);
 };
 const setInventoryBaselineMonth=async(m:string|null)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  await setInventoryBaselineMonthRemote(businessId,m);
  setInventoryBaselineMonthLocal(m);
 };
 const removeInventoryCategory=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await removeInventoryCategoryRemote(businessId,name);
  setInventoryCategories(next);
 };
 const removePaymentMethod=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await removePaymentMethodRemote(businessId,name);
  setPaymentMethods(next);
 };
 const removeInventorySize=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await removeInventorySizeRemote(businessId,name);
  setInventorySizes(next);
 };
 const removeExpenseCategory=async(name:string)=>{
  if(!businessId)throw new Error('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const next=await removeExpenseCategoryRemote(businessId,name);
  setExpenseCategories(next);
 };

 const logCtx={userId:currentUser?.id,username:currentUser?.username||''};
 const [sales,setSales]=useSalesCloud(businessId,rate,logCtx);
 const [expenses,setExpenses]=useExpensesCloud(businessId,rate,logCtx);
 const [accounts,setAccounts]=useAccountsCloud(businessId,logCtx);
 const [quotes,setQuotes]=useQuotesCloud(businessId,rate,logCtx);
 const [monthCloses,addMonthClose]=useMonthClosesCloud(businessId,logCtx);
 const [debts,setDebts]=useDebtsCloud(businessId,rate,logCtx);
 const [closes,setClosesLocal]=useState<InventoryClose[]>([]);
 useEffect(()=>{
  if(!businessId){setClosesLocal([]);return}
  let cancelled=false;
  loadInventory(businessId).then(rows=>{if(!cancelled)setClosesLocal(rows)}).catch(err=>console.error('IMPRESA: no se pudo cargar el inventario',err));
  return ()=>{cancelled=true}
 },[businessId]);
 const reloadInventory=()=>{if(businessId)loadInventory(businessId).then(setClosesLocal).catch(err=>console.error(err))};

 const [debtPayments,setDebtPaymentsLocal]=useState<DebtPaymentRecord[]>([]);
 useEffect(()=>{
  if(!businessId){setDebtPaymentsLocal([]);return}
  let cancelled=false;
  loadDebtPayments(businessId).then(rows=>{if(!cancelled)setDebtPaymentsLocal(rows)}).catch(err=>console.error('IMPRESA: no se pudo cargar los pagos de deudas',err));
  return ()=>{cancelled=true}
 },[businessId]);
 const reloadDebtPayments=()=>{if(businessId)loadDebtPayments(businessId).then(setDebtPaymentsLocal).catch(err=>console.error(err))};

 const [accountHistory,setAccountHistoryLocal]=useState<AccountBalanceEntry[]>([]);
 useEffect(()=>{
  if(!businessId){setAccountHistoryLocal([]);return}
  let cancelled=false;
  loadAccountBalanceHistory(businessId).then(rows=>{if(!cancelled)setAccountHistoryLocal(rows)}).catch(err=>console.error('IMPRESA: no se pudo cargar el historial de saldos',err));
  return ()=>{cancelled=true}
 },[businessId]);
 const reloadAccountHistory=()=>{if(businessId)loadAccountBalanceHistory(businessId).then(setAccountHistoryLocal).catch(err=>console.error(err))};

 const props={sales,setSales,expenses,setExpenses,accounts,setAccounts,closes,businessId,reloadInventory,monthCloses,addMonthClose,initialBase,setInitialBase,quotes,setQuotes,debts,setDebts,debtPayments,reloadDebtPayments,accountHistory,reloadAccountHistory,month,rate,setRate,logCtx,inventoryCategories,addInventoryCategory,removeInventoryCategory,paymentMethods,addPaymentMethod,removePaymentMethod,inventorySizes,addInventorySize,removeInventorySize,expenseCategories,addExpenseCategory,removeExpenseCategory,inventoryBaselineMonth,setInventoryBaselineMonth};

 if(!supabaseConfigured)return <Auth businessId={null} onLogin={()=>{}}/>;
 if(bootError)return <div className="loadingScreen">{bootError}</div>;
 if(!businessId||!settingsReady)return <div className="loadingScreen">Preparando tu negocio…</div>;
 if(!currentUser)return <Auth businessId={businessId} onLogin={handleLogin}/>;

 const headingLabel=tab==='Ventas'?ventasView:tab==='Inventario'?inventarioView:tab;
 return <div className="app"><aside><div className="brandWrap"><div className="brandMark">I</div><div><div className="brand">IMPRESA</div><div className="sub">Gestión del negocio</div></div></div><div className="workspace">OPERACIONES · NICARAGUA</div><nav aria-label="Módulos de IMPRESA">{tabs.map(x=><button key={x} className={tab===x?'active':''} aria-current={tab===x?'page':undefined} onClick={()=>setTab(x)}><span className="navIcon"><ModuleIcon name={x}/></span><span>{x}</span></button>)}</nav><div className="sessionFooter"><small>{currentUser.username}</small><button className="small" onClick={handleLogout}>Cerrar sesión</button></div></aside><main><header><div className="pageHeading"><span className="pageIcon"><ModuleIcon name={headingLabel}/></span><div><div className="eyebrow">IMPRESA / {month}</div><h1>{headingLabel}</h1><p>Centro administrativo y financiero del negocio</p></div></div>
 {tab==='Ventas'&&<div className="subTabs" role="tablist" aria-label="Vista de Ventas">{(['Ventas','Ventas Transferencia Efectivo'] as const).map(v=><button key={v} type="button" role="tab" aria-selected={ventasView===v} className={ventasView===v?'active':''} onClick={()=>setVentasView(v)}>{v}</button>)}</div>}
 {tab==='Inventario'&&<div className="subTabs" role="tablist" aria-label="Vista de Inventario">{(['Inventario','Detalle de Inventario'] as const).map(v=><button key={v} type="button" role="tab" aria-selected={inventarioView===v} className={inventarioView===v?'active':''} onClick={()=>setInventarioView(v)}>{v}</button>)}</div>}
 <div className="actions"><label className="month"><span>Mes</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button className="btn" onClick={()=>setTab('Gastos')}>+ Gasto</button><button className="btn primary" onClick={()=>{setTab('Ventas');setVentasView('Ventas')}}>+ Venta</button></div></header>
 {tab==='Dashboard'?<Dashboard {...props}/>:tab==='Ventas'?(ventasView==='Ventas'?<Sales {...props}/>:<SalesMethods {...props}/>):tab==='Gastos'?<Expenses {...props}/>:tab==='Inventario'?(inventarioView==='Inventario'?<Inventory {...props}/>:<InventoryDetail {...props}/>):tab==='Banco y Efectivo'?<Accounts {...props}/>:tab==='Contabilidad'?<Accounting {...props}/>:tab==='Cierre de mes'?<MonthClosing {...props}/>:tab==='Deudas'?<Debts {...props}/>:tab==='Cotizaciones'?<Quotes {...props}/>:tab==='Usuarios'?<Users businessId={businessId} currentUser={currentUser}/>:tab==='Reportes'?<Reports {...props}/>:<Settings {...props}/>}
 </main></div>
}
function Dashboard({sales,expenses,accounts,closes,monthCloses,month,rate}:any){
 const sm=sales.filter((x:Sale)=>x.date.startsWith(month)),em=expenses.filter((x:Expense)=>x.date.startsWith(month));
 const last=[...closes].sort((a:InventoryClose,b:InventoryClose)=>b.month.localeCompare(a.month))[0];
 const inventory=last?.total||0,bankCash=accounts.reduce((n:number,x:Account)=>n+(x.currency==='US$'?x.balance*rate:x.balance),0);
 const salesM=sm.reduce((n:number,x:Sale)=>n+x.amount,0),expM=em.reduce((n:number,x:Expense)=>n+x.amount,0),patrimony=inventory+bankCash;
 const expenseCats=Object.entries(em.reduce((o:any,x:Expense)=>(o[x.category]=(o[x.category]||0)+x.amount,o),{})).map(([label,value])=>({label,value:Number(value)}));
 const trend=[...monthCloses].sort((a:MonthClose,b:MonthClose)=>a.month.localeCompare(b.month)).slice(-6).map((x:MonthClose)=>({label:x.month.slice(5),value:x.currentValueC}));
 return <><section className="hero"><div><div className="eyebrow light">RESUMEN EJECUTIVO · {month}</div><h2>Estado general del negocio</h2><p>Vista consolidada de liquidez, inventario y actividad operativa.</p></div><div className="heroValue"><span>Patrimonio operativo</span><strong>{dual(patrimony,rate)}</strong></div></section>
 <div className="kpis"><Kpi icon="🏦" t="Bancos y caja" v={dual(bankCash,rate)} sub="Saldo consolidado"/><Kpi icon="📦" t="Inventario" v={dual(inventory,rate)} sub={last?`Cierre ${last.month}`:'Sin cierre'}/><Kpi icon="📈" t="Ventas registradas" v={dual(salesM,rate)} sub={`${sm.length} movimientos · informativo`}/><Kpi icon="🧾" t="Gastos del mes" v={dual(expM,rate)} sub={`${em.length} movimientos`}/></div>
 <Panel title="Valor del Negocio Actual"><BusinessProgress currentC={patrimony} rate={rate} large/></Panel>
 <div className="dashboardGrid"><Panel title="Evolución del valor del negocio"><MiniLine data={trend} moneyMode/><div className="chartLegend"><span>Últimos cierres mensuales</span><b>{trend.length?dual(trend[trend.length-1].value,rate):'Sin cierres'}</b></div></Panel><Panel title="Distribución de gastos"><MiniBars data={expenseCats} rate={rate}/>{!expenseCats.length&&<Empty text="No hay gastos registrados este mes."/>}</Panel></div>
 <div className="dashboardGrid"><Panel title="Liquidez por cuenta">{accounts.map((x:Account)=>{const c=x.currency==='US$'?x.balance*rate:x.balance;return <div className="accountRow" key={x.id}><div><b>{x.name}</b><small>{x.currency} · actualizado {x.updated}</small></div><strong>{dual(c,rate)}</strong></div>})}</Panel><Panel title="Control del período"><div className="healthList"><Health label="Inventario mensual" ok={!!last} text={last?`Último cierre: ${last.month}`:'Pendiente de registrar'}/><Health label="Cierre contable" ok={monthCloses.some((x:MonthClose)=>x.month===month)} text={monthCloses.some((x:MonthClose)=>x.month===month)?'Mes cerrado':'Mes abierto'}/><Health label="Tipo de cambio" ok={rate>0} text={`C$${rate.toFixed(2)} = US$1`}/></div></Panel></div></>
}
function Accounts({accounts,setAccounts,rate,businessId,logCtx,accountHistory,reloadAccountHistory}:any){
 const [f,setF]=useState({name:'',currency:'C$'});
 const [historyAccountId,setHistoryAccountId]=useState<string|null>(null);
 const add=()=>{if(!f.name)return;setAccounts([...accounts,{id:uid(),name:f.name,currency:f.currency as 'C$'|'US$',balance:0,updated:today()}]);setF({...f,name:''})};
 const update=async(a:Account)=>{
  const x=prompt(`Saldo actual de ${a.name} (${a.currency})`,String(a.balance));
  if(x===null||isNaN(+x))return;
  const newBalance=+x;
  if(newBalance===a.balance)return;
  if(businessId){
   try{
    await addAccountBalanceHistoryRemote(businessId,{id:uid(),accountId:a.id,accountName:a.name,currency:a.currency,previousBalance:a.balance,newBalance,changedBy:logCtx?.username});
    reloadAccountHistory&&reloadAccountHistory();
   }catch(err){console.error('IMPRESA: no se pudo registrar el historial de saldo',err);alert('No se pudo guardar el historial de este cambio de saldo en la nube, pero el saldo sí se va a actualizar.')}
  }
  setAccounts(accounts.map((z:Account)=>z.id===a.id?{...z,balance:newBalance,updated:today()}:z));
 };
 const toggleHistory=(a:Account)=>setHistoryAccountId(historyAccountId===a.id?null:a.id);
 const removeHistoryEntry=async(h:AccountBalanceEntry)=>{
  if(!confirm(`¿Borrar esta línea del historial (${money(h.previousBalance,h.currency)} → ${money(h.newBalance,h.currency)})? Esto solo borra el registro, no cambia el saldo actual de la cuenta.`))return;
  try{
   await removeAccountBalanceHistoryRemote(h.id);
   reloadAccountHistory&&reloadAccountHistory();
  }catch(err){console.error('IMPRESA: no se pudo borrar la línea del historial',err);alert('No se pudo borrar en la nube. Revisa que ya corriste la migración 008 e inténtalo de nuevo.')}
 };
 return <><div className="cards">{accounts.map((a:Account)=>{const nio=a.currency==='US$'?a.balance*rate:a.balance;return <div className="card account" key={a.id}><span>{a.name} · {a.currency}</span><strong>{money(a.balance,a.currency)}</strong><small>{dual(nio,rate)} · Actualizado {a.updated}</small><div className="actions"><button className="small" onClick={()=>update(a)}>Actualizar saldo</button><button className="small" onClick={()=>toggleHistory(a)}>{historyAccountId===a.id?'Cerrar':'Historial'}</button><button className="dangerSmall" onClick={()=>{if(confirm(`¿Borrar la cuenta ${a.name}?`))setAccounts(accounts.filter((z:Account)=>z.id!==a.id))}}>Borrar</button></div></div>})}</div>
 {historyAccountId&&(()=>{
  const a=(accounts as Account[]).find(x=>x.id===historyAccountId);
  if(!a)return null;
  const entries=((accountHistory as AccountBalanceEntry[])||[]).filter(h=>h.accountId===a.id);
  return <Panel title={`Historial de saldo · ${a.name}`}>
   {!entries.length?<Empty text="Esta cuenta todavía no tiene cambios de saldo registrados."/>:<Table heads={['Fecha','Saldo anterior','Saldo nuevo','Usuario','Acción']} rows={entries.map(h=>[String(h.at).slice(0,16).replace('T',' '),money(h.previousBalance,h.currency),money(h.newBalance,h.currency),h.changedBy||'—',<button className="dangerSmall" onClick={()=>removeHistoryEntry(h)}>Borrar</button>])}/>}
  </Panel>
 })()}
 <Panel title="Agregar cuenta o caja"><div className="form inline"><Input l="Nombre (ej. BAC Dólares)" v={f.name} s={v=>setF({...f,name:v})}/><Select l="Moneda" v={f.currency} s={v=>setF({...f,currency:v})} opts={['C$','US$']}/><button className="btn primary" onClick={add}>Agregar cuenta</button></div><div className="note">Tipo de cambio actual del sistema: C${rate.toFixed(2)} = US$1.00. El resumen convierte automáticamente todas las cuentas. Cada vez que actualizas el saldo de una cuenta, el saldo anterior queda guardado en su "Historial".</div></Panel></>}
function Inventory({closes,businessId,reloadInventory,monthCloses,month,rate,logCtx,inventoryCategories,addInventoryCategory,removeInventoryCategory,inventorySizes,addInventorySize,removeInventorySize,inventoryBaselineMonth,setInventoryBaselineMonth}:any){
 const existing=[...closes].reverse().find((x:InventoryClose)=>x.month===month);
 const items=existing?.items||[];
 const categories:string[]=(inventoryCategories&&inventoryCategories.length)?inventoryCategories:['Camisas','Hilos','Tintas','Vinil','Sublimación','Empaque','Otros'];
 const sizes:string[]=(inventorySizes&&inventorySizes.length)?inventorySizes:['XS','S','M','L','XL','XXL','2','4','6','8','10','12','14','16'];
 const [f,setF]=useState({name:'',category:categories[0]||'Camisas',talla:'',color:'',qty:'',unitValue:'',currency:'C$'});
 const [editingId,setEditingId]=useState<string|null>(null);
 // La talla se elige de la lista guardada (igual que la categoría), para que nadie la escriba mal por error.
 const sizeOptions=Array.from(new Set([...sizes,...(f.talla?[f.talla]:[])]));
 const total=items.reduce((a:number,x:InventoryItem)=>a+x.qty*x.unitValue,0),entered=+f.unitValue||0,unitNio=toNio(entered,f.currency as 'C$'|'US$',rate),closed=monthCloses.some((x:MonthClose)=>x.month===month);
 const handleAddCategory=async()=>{
  const name=prompt('Nombre de la nueva categoría de inventario:');
  if(!name||!name.trim())return;
  try{await addInventoryCategory(name.trim());setF(prev=>({...prev,category:name.trim()}))}
  catch(err){console.error(err);alert(errMsg(err,'No se pudo guardar la nueva categoría en la nube. Inténtalo de nuevo.'))}
 };
 const handleAddSize=async()=>{
  const name=prompt('Nueva talla (por ejemplo S, M, L, 8, 10…):');
  if(!name||!name.trim())return;
  try{await addInventorySize(name.trim());setF(prev=>({...prev,talla:name.trim()}))}
  catch(err){console.error(err);alert(errMsg(err,'No se pudo guardar la nueva talla en la nube. Inténtalo de nuevo.'))}
 };
 const handleRemoveCategoryItem=async(name:string)=>{
  try{await removeInventoryCategory(name);setF(prev=>prev.category===name?{...prev,category:categories.filter((c:string)=>c!==name)[0]||''}:prev)}
  catch(err){console.error(err);alert(errMsg(err,'No se pudo borrar la categoría en la nube. Inténtalo de nuevo.'))}
 };
 const handleRemoveSizeItem=async(name:string)=>{
  try{await removeInventorySize(name);setF(prev=>prev.talla===name?{...prev,talla:''}:prev)}
  catch(err){console.error(err);alert(errMsg(err,'No se pudo borrar la talla en la nube. Inténtalo de nuevo.'))}
 };
 const cancelEdit=()=>{setEditingId(null);setF(prev=>({...prev,name:'',talla:'',color:'',qty:'',unitValue:''}))};
 const editItem=(item:InventoryItem)=>{
  setEditingId(item.id);
  setF({name:item.name,category:item.category||categories[0]||'Camisas',talla:item.talla||'',color:item.color||'',qty:String(item.qty),unitValue:String(item.enteredUnitValue??(item.currency==='US$'&&rate>0?item.unitValue/rate:item.unitValue)),currency:item.currency||'C$'});
 };
 const save=async()=>{
  if(closed)return alert('Este mes ya está cerrado.');
  const qtyNum=f.qty===''?NaN:+f.qty;
  if(!f.name||!Number.isFinite(qtyNum)||qtyNum<0)return alert('Completa detalle y cantidad (puede ser 0 si no tienes existencias).');
  const item:InventoryItem={id:editingId||uid(),name:f.name,category:f.category,talla:f.talla.trim(),color:f.color.trim(),qty:qtyNum,unitValue:unitNio,currency:f.currency as 'C$'|'US$',enteredUnitValue:entered};
  try{
   if(editingId){
    await updateInventoryItemRemote(editingId,item);
    reloadInventory();
    if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'updated','monthly_inventory',`Editó "${item.name}" en el inventario de ${month}`);
   }else{
    await addInventoryItemRemote(businessId,month,item);
    reloadInventory();
    if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'created','monthly_inventory',`Agregó "${item.name}" al inventario de ${month}`);
   }
   cancelEdit();
  }catch(err){console.error(err);alert(errMsg(err,editingId?'No se pudo guardar los cambios en la nube. Inténtalo de nuevo.':'No se pudo guardar el producto en la nube.'))}
 };
 const removeItem=async(id:string,name?:string)=>{try{await deleteInventoryItemRemote(id);reloadInventory();if(editingId===id)cancelEdit();if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'deleted','monthly_inventory',`Eliminó "${name||'un producto'}" del inventario de ${month}`)}catch(err){console.error(err);alert('No se pudo borrar el producto.')}};
 const removeMonth=async(m:string)=>{try{await deleteInventoryMonthRemote(businessId,m);reloadInventory();if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'deleted','monthly_inventory',`Eliminó el inventario del mes ${m}`)}catch(err){console.error(err);alert('No se pudo borrar el inventario de ese mes.')}};

 // ---- Importar inventario desde un archivo de Excel/CSV (Detalle, Talla, Color, Cantidad, Precio) ----
 const [importBusy,setImportBusy]=useState(false);
 const [importPreview,setImportPreview]=useState<InventoryItem[]|null>(null);
 const [importCurrency,setImportCurrency]=useState<'C$'|'US$'>('C$');
 const [importMessage,setImportMessage]=useState('');
 const fileRef=useRef<HTMLInputElement>(null);
 const toNum=(v:any):number=>{if(typeof v==='number')return v;const s=String(v??'').replace(/[^0-9.\-]/g,'');return s?Number(s):NaN};
 const norm=(s:string)=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
 const NAME_HEADERS=['detalle','producto','producto / material','producto/material','nombre','descripcion'];
 const TALLA_HEADERS=['talla','size'];
 const COLOR_HEADERS=['color'];
 const QTY_HEADERS=['cantidad','qty','cant'];
 const PRICE_HEADERS=['precio','precio unitario','valor unitario','unitario'];
 const DATE_HEADERS=['fecha','date'];
 const MISSING_HEADERS=['faltante','falta','diferencia'];
 const ALL_HINTS=[...NAME_HEADERS,...TALLA_HEADERS,...COLOR_HEADERS,...QTY_HEADERS,...PRICE_HEADERS];
 // Extrae los productos de una hoja: busca la fila de encabezados entre las
 // primeras filas (muchos Excel traen un título o un logo arriba, como
 // "INVENTARIO", antes de la fila con "Detalle/Talla/Color/Cantidad/Precio").
 const extractFromSheet=(XLSX:any,sheet:any):InventoryItem[]=>{
  const raw:any[][]=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
  let headerRowIdx=-1,bestHits=0;
  for(let i=0;i<Math.min(raw.length,20);i++){
   const hits=(raw[i]||[]).filter((cell:any)=>ALL_HINTS.includes(norm(String(cell)))).length;
   if(hits>bestHits){bestHits=hits;headerRowIdx=i}
  }
  if(headerRowIdx===-1||bestHits<2)return [];
  const headerRow=(raw[headerRowIdx]||[]).map((h:any)=>String(h||'').trim());
  const findFirstMatch=(names:string[])=>{for(let idx=0;idx<headerRow.length;idx++)if(names.includes(norm(headerRow[idx])))return idx;return -1};
  const iName=findFirstMatch(NAME_HEADERS),iTalla=findFirstMatch(TALLA_HEADERS),iColor=findFirstMatch(COLOR_HEADERS),iQty=findFirstMatch(QTY_HEADERS),iPrice=findFirstMatch(PRICE_HEADERS);
  const iDate=findFirstMatch(DATE_HEADERS),iMissing=findFirstMatch(MISSING_HEADERS);
  const parsed:InventoryItem[]=[];
  for(const arr of raw.slice(headerRowIdx+1)){
   const name=iName>=0?String(arr[iName]??'').trim():'';
   const qty=iQty>=0?toNum(arr[iQty]):NaN;
   const price=iPrice>=0?toNum(arr[iPrice]):NaN;
   if(!name||!Number.isFinite(qty)||qty<0)continue;
   // Columnas extra del Excel que la tabla de la app no muestra (Fecha,
   // Faltante) se guardan en una nota, para no perder esa información.
   const noteParts:string[]=[];
   const dateVal=iDate>=0?String(arr[iDate]??'').trim():'';
   const missingVal=iMissing>=0?String(arr[iMissing]??'').trim():'';
   if(dateVal)noteParts.push(`Fecha: ${dateVal}`);
   if(missingVal)noteParts.push(`Faltante: ${missingVal}`);
   parsed.push({id:uid(),name,category:'',talla:iTalla>=0?String(arr[iTalla]??'').trim():'',color:iColor>=0?String(arr[iColor]??'').trim():'',qty,unitValue:0,enteredUnitValue:Number.isFinite(price)?price:0,note:noteParts.join(' · ')});
  }
  return parsed;
 };
 const parseFile=async(file:File)=>{
  setImportMessage('');setImportPreview(null);
  if(closed){setImportMessage('Este mes ya está cerrado, no se puede importar.');return}
  setImportBusy(true);
  try{
   const XLSX=await import('xlsx');
   const isCsv=/\.csv$/i.test(file.name);
   const wb=isCsv?XLSX.read(await file.text(),{type:'string'}):XLSX.read(await file.arrayBuffer(),{type:'array'});
   let parsed:InventoryItem[]=[];
   for(const sheetName of wb.SheetNames){
    const found=extractFromSheet(XLSX,wb.Sheets[sheetName]);
    if(found.length>parsed.length)parsed=found;
   }
   if(!parsed.length){setImportMessage('No se encontraron filas válidas. Revisa que el archivo tenga una fila de encabezados con Detalle, Cantidad y Precio (Talla y Color son opcionales) y al menos una fila de datos debajo.')}
   else{setImportPreview(parsed);setImportMessage(`Se leyeron ${parsed.length} productos del archivo. Revisa la vista previa y confirma para guardarlos.`)}
  }catch(err){console.error(err);setImportMessage('No se pudo leer el archivo. Asegúrate de que sea un Excel (.xlsx) o CSV válido.')}
  finally{setImportBusy(false)}
 };
 const cancelImport=()=>{setImportPreview(null);setImportMessage('');if(fileRef.current)fileRef.current.value=''};
 // Tallas que vinieron en el archivo pero no están en la lista guardada — se avisa para no dejarlas mal escritas sin revisar.
 const normSize=(s:string)=>s.trim().toLowerCase();
 const unknownImportSizes=importPreview?Array.from(new Set(importPreview.map(p=>(p.talla||'').trim()).filter(t=>t&&!sizes.some(s=>normSize(s)===normSize(t))))):[];
 const addUnknownSizes=async()=>{
  try{for(const s of unknownImportSizes)await addInventorySize(s)}
  catch(err){console.error(err);alert(errMsg(err,'No se pudieron guardar todas las tallas nuevas. Inténtalo de nuevo.'))}
 };
 const confirmImport=async()=>{
  if(!importPreview||!importPreview.length||!businessId)return;
  if(closed)return alert('Este mes ya está cerrado.');
  setImportBusy(true);
  try{
   const rows=importPreview.map(p=>({...p,category:f.category,currency:importCurrency,unitValue:toNio(p.enteredUnitValue||0,importCurrency as 'C$'|'US$',rate)}));
   await addInventoryItemsBulkRemote(businessId,month,rows);
   reloadInventory();
   if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'created','monthly_inventory',`Importó ${rows.length} productos desde Excel al inventario de ${month}`);
   setImportMessage(`Se importaron ${rows.length} productos.`);
   setImportPreview(null);
   if(fileRef.current)fileRef.current.value='';
  }catch(err){console.error(err);setImportMessage('No se pudo guardar la importación en la nube. Inténtalo de nuevo.')}
  finally{setImportBusy(false)}
 };

 return <><Panel title={`Inventario · ${month}`}>{closed?<div className="closedBanner">✓ Este mes está CERRADO.</div>:<>{editingId&&<p className="editorNotice">Editando "{f.name || 'producto'}". Los cambios se guardan al presionar "Guardar cambios".</p>}<div className="form grid">
 <Input l="Detalle" v={f.name} s={v=>setF({...f,name:v})}/>
 <label><span>Categoría <button type="button" className="addChip" onClick={handleAddCategory} title="Agregar categoría">+</button></span><ManagedSelect value={f.category} onChange={v=>setF({...f,category:v})} options={categories} onRemove={handleRemoveCategoryItem} confirmMessage={(c:string)=>`¿Borrar la categoría "${c}" de tu lista? Los productos que ya la tienen la conservan igual — solo deja de aparecer para productos nuevos.`}/></label>
 <label><span>Talla <button type="button" className="addChip" onClick={handleAddSize} title="Agregar talla">+</button></span><ManagedSelect value={f.talla} onChange={v=>setF({...f,talla:v})} options={sizeOptions} emptyLabel="(Sin talla)" onRemove={handleRemoveSizeItem} confirmMessage={(s:string)=>`¿Borrar la talla "${s}" de tu lista? Los productos que ya la tienen la conservan igual — solo deja de aparecer para productos nuevos.`}/></label>
 <Input l="Color" v={f.color} s={v=>setF({...f,color:v})}/>
 <Input l="Cantidad" v={f.qty} s={v=>setF({...f,qty:v})} type="number"/>
 <MoneyInput l="Precio" v={f.unitValue} s={v=>setF({...f,unitValue:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/>
 <div className="conversion"><span>Precio convertido</span><b>{dual(unitNio,rate)}</b></div>
 <div className="actions"><button className="btn primary" onClick={save}>{editingId?'Guardar cambios':'+ Agregar al conteo'}</button>{editingId&&<button className="btn" onClick={cancelEdit}>Cancelar edición</button>}</div>
 </div><div className="note">{editingId?'Al guardar los cambios, se actualiza este producto en la nube.':'Al presionar “Agregar al conteo”, el producto queda registrado y guardado automáticamente en la nube. No necesitas guardar el inventario otra vez.'}</div></>}
 <Table heads={['Detalle','Categoría','Talla','Color','Cantidad','Precio C$','Precio US$','Total C$','Total US$','Acción']} rows={items.map((x:InventoryItem)=>[<span>{x.name}{x.note&&<span className="noteDot" title={x.note}> ⓘ</span>}</span>,x.category,x.talla||'—',x.color||'—',x.qty,money(x.unitValue,'C$'),money(rate>0?x.unitValue/rate:0,'US$'),money(x.qty*x.unitValue,'C$'),money(rate>0?x.qty*x.unitValue/rate:0,'US$'),<div className="actions"><button className="small" onClick={()=>editItem(x)}>Editar</button><button className="dangerSmall" onClick={()=>removeItem(x.id,x.name)}>Borrar</button></div>])}/>
 <div className="cards"><div className="card"><span>LÍNEAS CONTADAS</span><strong>{items.length}</strong></div><div className="card"><span>VALOR INVENTARIO</span><strong>{dual(total,rate)}</strong></div></div></Panel>
 <Panel title="Importar inventario desde Excel">
 <p className="muted">Sube tu Excel (.xlsx) o CSV con las columnas Detalle, Talla, Color, Cantidad y Precio — igual como lo llevas tú. La categoría de todo el archivo es la que tengas elegida arriba en "Categoría", y el precio se toma en la moneda que elijas aquí.</p>
 {closed?<p className="empty">Este mes ya está cerrado, no se puede importar.</p>:<>
 <div className="form inline">
  <label><span>Moneda del archivo</span><select value={importCurrency} onChange={e=>setImportCurrency(e.target.value as 'C$'|'US$')}><option value="C$">C$</option><option value="US$">US$</option></select></label>
  <label><span>Archivo (.xlsx o .csv)</span><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" disabled={importBusy} onChange={e=>{const file=e.target.files?.[0];if(file)parseFile(file)}}/></label>
 </div>
 {importMessage&&<p className={importPreview?.length?'note':'empty'}>{importMessage}</p>}
 {!!importPreview?.length&&<>
  {!!unknownImportSizes.length&&<p className="warning">Estas tallas del archivo no están en tu lista guardada: <b>{unknownImportSizes.join(', ')}</b>. Se importarán tal como vienen, pero revisa que no estén mal escritas — si están bien, agrégalas a tu lista para poder elegirlas después. <button type="button" className="small" onClick={addUnknownSizes}>Agregar {unknownImportSizes.length>1?'estas tallas':'esta talla'} a mi lista</button></p>}
  <Table heads={['Detalle','Talla','Color','Cantidad','Precio','Nota']} rows={importPreview.slice(0,20).map(p=>[p.name,p.talla||'—',p.color||'—',p.qty,money(p.enteredUnitValue||0,importCurrency),p.note||'—'])} rowClasses={importPreview.slice(0,20).map(p=>p.talla&&unknownImportSizes.includes(p.talla.trim())?'importUnknownSize':'')}/>
  {importPreview.length>20&&<p className="muted">Mostrando los primeros 20 de {importPreview.length} productos.</p>}
  <div className="actions"><button className="btn primary" disabled={importBusy} onClick={confirmImport}>{importBusy?'Guardando…':`Confirmar importación de ${importPreview.length} productos`}</button><button className="btn" onClick={cancelImport}>Cancelar</button></div>
 </>}
 </>}
 </Panel>
 <Panel title="Historial de inventarios">
  <p className="muted">El <b>Inventario Inicial</b> es tu punto de partida (el mes desde el cual quieres empezar a comparar). Marca un mes como inicial una sola vez — desde ahí, "Detalle de Inventario" te muestra cuánto ha bajado cada producto entre ese inventario inicial y tu conteo más reciente.</p>
  <Table heads={['Mes','Fecha','Productos/materiales','Total C$','Total US$','Notas','Inventario Inicial','Acción']} rows={[...closes].sort((a:InventoryClose,b:InventoryClose)=>b.month.localeCompare(a.month)).map((x:InventoryClose)=>[x.month,x.date,x.items.length,money(x.total,'C$'),money(rate>0?x.total/rate:0,'US$'),x.notes,
   x.month===inventoryBaselineMonth?<span className="baselineBadge">★ Inicial</span>:<button className="small" onClick={async()=>{try{await setInventoryBaselineMonth(x.month)}catch(err){console.error(err);alert(errMsg(err,'No se pudo guardar el inventario inicial en la nube.'))}}}>Marcar como inicial</button>,
   <div className="actions">{x.month===inventoryBaselineMonth&&<button className="small" onClick={async()=>{try{await setInventoryBaselineMonth(null)}catch(err){console.error(err);alert(errMsg(err,'No se pudo quitar el inventario inicial en la nube.'))}}}>Quitar inicial</button>}<button className="dangerSmall" onClick={()=>{if(confirm(`¿Borrar el inventario de ${x.month}?`))removeMonth(x.month)}}>Borrar</button></div>])}/>
 </Panel></>
}
const MONTH_LABELS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function inventoryProductKey(x:{name:string;talla?:string;color?:string}){return [x.name,x.talla||'',x.color||''].map(v=>v.trim().toLowerCase()).join('|')}
function InventoryDetail({closes,monthCloses,inventoryBaselineMonth}:any){
 const allMonths=Array.from(new Set((closes as InventoryClose[]).map(x=>x.month))).sort();
 const closeByMonthAll:Record<string,InventoryClose>={};
 (closes as InventoryClose[]).forEach(c=>{closeByMonthAll[c.month]=c});
 const closedMonthSetAll=new Set(((monthCloses||[]) as MonthClose[]).map(x=>x.month));
 const baselineMonth=(inventoryBaselineMonth&&closeByMonthAll[inventoryBaselineMonth])?inventoryBaselineMonth:null;
 const compareCandidates=allMonths.filter(m=>m!==baselineMonth);
 const [compareMonthSel,setCompareMonthSel]=useState('');
 const compareMonth=(compareMonthSel&&closeByMonthAll[compareMonthSel])?compareMonthSel:(compareCandidates[compareCandidates.length-1]||allMonths[allMonths.length-1]||'');
 const baselineItems=baselineMonth?closeByMonthAll[baselineMonth].items:[];
 const compareItems=compareMonth?closeByMonthAll[compareMonth].items:[];
 const baselineQty:Record<string,number>={},compareQty:Record<string,number>={},compareMeta:Record<string,{name:string;talla:string;color:string}>={};
 baselineItems.forEach(it=>{const k=inventoryProductKey(it);baselineQty[k]=(baselineQty[k]||0)+it.qty;if(!compareMeta[k])compareMeta[k]={name:it.name,talla:it.talla||'',color:it.color||''}});
 compareItems.forEach(it=>{const k=inventoryProductKey(it);compareQty[k]=(compareQty[k]||0)+it.qty;if(!compareMeta[k])compareMeta[k]={name:it.name,talla:it.talla||'',color:it.color||''}});
 const compareKeys=Object.keys(compareMeta).sort((a,b)=>compareMeta[a].name.localeCompare(compareMeta[b].name)||compareMeta[a].talla.localeCompare(compareMeta[b].talla)||compareMeta[a].color.localeCompare(compareMeta[b].color));
 const compareRows=compareKeys.map(k=>{const before=baselineQty[k]||0,after=compareQty[k]||0;return {...compareMeta[k],before,after,diff:before-after}});
 const years=Array.from(new Set(allMonths.map(m=>m.slice(0,4)))).sort().reverse();
 const currentYear=String(new Date().getFullYear());
 const [year,setYear]=useState(years[0]||currentYear);
 const yearOptions=years.includes(year)?years:[year,...years];
 const monthsInYear=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
 // Un mes puede tener más de un registro de cierre guardado; si pasa, se usa el más reciente (igual que en el resto de la app).
 const closeByMonth:Record<string,InventoryClose>={};
 (closes as InventoryClose[]).forEach(c=>{closeByMonth[c.month]=c});
 const qtyByProductMonth:Record<string,Record<string,number>>={};
 const productMeta:Record<string,{name:string;talla:string;color:string}>={};
 monthsInYear.forEach(m=>{
  const c=closeByMonth[m];
  if(!c)return;
  c.items.forEach(item=>{
   const k=inventoryProductKey(item);
   if(!productMeta[k])productMeta[k]={name:item.name,talla:item.talla||'',color:item.color||''};
   qtyByProductMonth[k]=qtyByProductMonth[k]||{};
   qtyByProductMonth[k][m]=(qtyByProductMonth[k][m]||0)+item.qty;
  });
 });
 // Si ya hiciste el "Cierre de mes" de un mes (el recuento completo quedó definitivo) y un producto que
 // sí tenías registrado en un mes anterior ya no aparece en el conteo de ese mes cerrado, se asume que
 // quedó en 0 (no que "no se sabe") — así el sistema sí puede avisar que faltó por completo. Antes de
 // que cierres el mes no se asume nada, porque puede que todavía no hayas terminado de recontar todo.
 const closedMonthSet=new Set(((monthCloses||[]) as MonthClose[]).map(x=>x.month));
 Object.keys(productMeta).forEach(k=>{
  const firstIdx=monthsInYear.findIndex(m=>qtyByProductMonth[k]?.[m]!==undefined);
  if(firstIdx===-1)return;
  for(let idx=firstIdx+1;idx<monthsInYear.length;idx++){
   const m=monthsInYear[idx];
   if(closedMonthSet.has(m)&&qtyByProductMonth[k][m]===undefined)qtyByProductMonth[k][m]=0;
  }
 });
 const products=Object.keys(productMeta).sort((a,b)=>productMeta[a].name.localeCompare(productMeta[b].name)||productMeta[a].talla.localeCompare(productMeta[b].talla)||productMeta[a].color.localeCompare(productMeta[b].color));
 const prevWithData=(k:string,idx:number):number|undefined=>{for(let j=idx-1;j>=0;j--){const v=qtyByProductMonth[k]?.[monthsInYear[j]];if(v!==undefined)return v}return undefined};
 type Faltante={name:string;talla:string;color:string;from:string;to:string;before:number;after:number;diff:number};
 const faltantes:Faltante[]=[];
 products.forEach(k=>{
  monthsInYear.forEach((m,idx)=>{
   const qty=qtyByProductMonth[k]?.[m];
   if(qty===undefined)return;
   const prevIdx=(()=>{for(let j=idx-1;j>=0;j--){if(qtyByProductMonth[k]?.[monthsInYear[j]]!==undefined)return j}return -1})();
   if(prevIdx===-1)return;
   const before=qtyByProductMonth[k][monthsInYear[prevIdx]];
   if(qty<before)faltantes.push({name:productMeta[k].name,talla:productMeta[k].talla,color:productMeta[k].color,from:monthsInYear[prevIdx],to:m,before,after:qty,diff:before-qty});
  });
 });
 return <>
 <Panel title="Inventario Inicial vs. Inventario Actual">
  {!baselineMonth?<Empty text={'Todavía no has marcado un Inventario Inicial. Ve a Inventario → Historial de inventarios y presiona "Marcar como inicial" en el mes que quieras usar como punto de partida.'}/>:<>
  <p className="muted">Compara tu <b>Inventario Inicial</b> ({baselineMonth}) contra el conteo que elijas abajo como <b>Inventario Actual</b>. Importante: esta diferencia es el movimiento total del producto desde el inicio — incluye lo que ya vendiste normalmente, porque las ventas no quedan ligadas a un producto/talla/color específico del inventario. Úsala junto con lo que tú sabes que vendiste de cada producto para decidir si de verdad falta algo, o si es solo lo que ya se vendió.</p>
  <div className="form inline"><label><span>Inventario actual (comparar con)</span><select value={compareMonth} onChange={e=>setCompareMonthSel(e.target.value)}>{compareCandidates.map(m=><option key={m} value={m}>{m}{closedMonthSetAll.has(m)?' — cerrado':''}</option>)}</select></label></div>
  {!compareRows.length?<Empty text="No hay productos para comparar todavía."/>:
  <Table heads={['Producto','Talla','Color','Inventario Inicial','Inventario Actual','Total (diferencia)']} rowClasses={compareRows.map(r=>r.diff>0?'invDeficit':'')} rows={compareRows.map(r=>[r.name,r.talla||'—',r.color||'—',r.before,r.after,r.diff>0?`−${r.diff}`:r.diff<0?`+${-r.diff}`:'0'])}/>}
  </>}
 </Panel>
 <Panel title={`Detalle de inventario por producto · ${year}`}>
  <p className="muted">Compara, mes a mes, la cantidad contada de cada producto durante el año. Si un producto baja de un mes a otro, la casilla se marca en rojo con la diferencia — así puedes ver de un vistazo si algo faltó al actualizar el inventario. Importante: esta comparación solo se activa para un mes después de que le des <b>"Cierre de mes"</b> (Cierre de mes) — mientras el mes sigue abierto, un producto que todavía no has vuelto a contar simplemente se ve en blanco (no se supone que le faltó nada, porque puede que aún no termines el reconteo). En cuanto cierras el mes, cualquier producto que tenías registrado antes y no aparezca en el conteo nuevo de ese mes se toma como que se quedó en 0, y si antes tenías más, se marca como faltante.</p>
  <div className="form inline"><label><span>Año</span><select value={year} onChange={e=>setYear(e.target.value)}>{yearOptions.map(y=><option key={y} value={y}>{y}</option>)}</select></label></div>
  {!products.length?<Empty text="Todavía no hay conteos de inventario registrados en este año."/>:
  <div className="tablewrap"><table><thead><tr><th>Detalle</th><th>Talla</th><th>Color</th>{monthsInYear.map((m,i)=><th key={m}>{MONTH_LABELS[i]}</th>)}</tr></thead><tbody>
   {products.map(k=><tr key={k}><td>{productMeta[k].name}</td><td>{productMeta[k].talla||'—'}</td><td>{productMeta[k].color||'—'}</td>
    {monthsInYear.map((m,idx)=>{
     const qty=qtyByProductMonth[k]?.[m];
     const before=prevWithData(k,idx);
     const short=qty!==undefined&&before!==undefined&&qty<before;
     return <td key={m} className={short?'invShort':''}>{qty===undefined?'—':qty}{short&&<small className="invDiff">−{before-qty}</small>}</td>;
    })}
   </tr>)}
  </tbody></table></div>}
 </Panel>
 <Panel title="Posibles faltantes detectados">
  {!faltantes.length?<Empty text="No se detectaron bajadas de cantidad entre meses contados este año."/>:
  <Table heads={['Producto','Talla','Color','De','A','Antes','Ahora','Faltante']} rows={faltantes.map(f=>[f.name,f.talla||'—',f.color||'—',MONTH_LABELS[+f.from.slice(5,7)-1],MONTH_LABELS[+f.to.slice(5,7)-1],f.before,f.after,f.diff])}/>}
 </Panel>
 </>;
}
function MonthClosing({closes,monthCloses,addMonthClose,sales,expenses,accounts,month,rate,debts,debtPayments}:any){
 const inv=[...closes].reverse().find((x:InventoryClose)=>x.month===month),closed=monthCloses.find((x:MonthClose)=>x.month===month),previous=[...monthCloses].filter((x:MonthClose)=>x.month<month).sort((a:MonthClose,b:MonthClose)=>b.month.localeCompare(a.month))[0];
 const inventoryC=inv?.total||0,bankRows=accounts.map((a:Account)=>({name:a.name,currency:a.currency,balance:a.balance,equivalentC:a.currency==='US$'?a.balance*rate:a.balance})),bankCashC=bankRows.reduce((n:number,a:any)=>n+a.equivalentC,0),expensesC=expenses.filter((x:Expense)=>x.date.startsWith(month)).reduce((n:number,x:Expense)=>n+x.amount,0),salesC=sales.filter((x:Sale)=>x.date.startsWith(month)).reduce((n:number,x:Sale)=>n+x.amount,0);
 const currentValueC=inventoryC+bankCashC,openingC=previous?(previous.carryForwardC??previous.currentValueC):0,resultC=previous?currentValueC-openingC:0;
 // Los pagos de deudas ya no se "guardan aparte" para descontarlos al
 // cerrar: se registran y se descuentan de su cuenta al momento, desde la
 // pestaña "Deudas". Aquí solo se muestran, a modo informativo, los que
 // quedaron anotados con este mes.
 const monthDebtPayments=((debtPayments as DebtPaymentRecord[])||[]).filter(p=>p.month===month);
 const debtPaymentsC=monthDebtPayments.reduce((n,p)=>n+p.equivalentC,0);
 const close=async()=>{
  if(closed)return alert('Este mes ya está cerrado.');
  if(!inv)return alert('Primero guarda el inventario del mes.');
  if(!confirm(`¿Cerrar definitivamente ${month}? Este es el ÚLTIMO PASO y bloqueará el período.`))return;
  try{
   const debtNotes=monthDebtPayments.map(p=>{const d=(debts as Debt[]).find(x=>x.id===p.debtId);return `${d?.description||p.accountName||'Pago'}: ${money(p.amount,p.currency)}${p.note?' · '+p.note:''}`}).join(' | ');
   const debtPaymentDetails=monthDebtPayments.map(p=>{const d=(debts as Debt[]).find(x=>x.id===p.debtId);return {id:p.id,accountId:p.accountId,accountName:p.accountName,currency:p.currency,amount:p.amount,equivalentC:p.equivalentC,note:p.note,debtId:p.debtId,debtDescription:d?.description}});
   await addMonthClose({id:uid(),month,closedAt:today(),rate,inventoryC,accounts:bankRows,bankCashC,expensesC,salesC,currentValueC,baseC:openingC,resultC,notes:inv.notes||'',openingC,debtPaymentsC,carryForwardC:currentValueC,debtNotes,preCloseC:currentValueC,debtPaymentDetails});
   alert(`${month} cerrado definitivamente. ${dual(currentValueC,rate)} entra al siguiente mes.`)
  }catch(err){console.error(err);alert('No se pudo guardar el cierre en la nube. Revisa tu conexión e inténtalo de nuevo.')}
 };
 return <><Panel title={`Preparación del cierre · ${month}`}>
  <Stat l="Apertura del período" v={previous?dual(openingC,rate):'C$0.00 · US$0.00 (primer período)'}/>
  <Stat l="Inventario guardado" v={inv?dual(inventoryC,rate):'Pendiente'}/>
  <Stat l="Bancos + caja" v={dual(bankCashC,rate)}/>
  <Stat l="Pagos de deudas registrados este mes" v={dual(debtPaymentsC,rate)}/>
  <Stat l="Valor actual del negocio" v={dual(currentValueC,rate)}/>
  {monthDebtPayments.length>0&&<div className="note">Estos pagos ya se descontaron de su cuenta cuando los registraste en la pestaña "Deudas": {monthDebtPayments.map(p=>{const d=(debts as Debt[]).find(x=>x.id===p.debtId);return `${d?.description||'Deuda'} (${money(p.amount,p.currency)} desde ${p.accountName})`}).join(', ')}.</div>}
 </Panel>
 {closed?<Panel title={`${month} · Cierre definitivo`}><div className="closedBanner">✓ Mes CERRADO.</div><Stat l="Pagos de deudas del mes" v={dual(closed.debtPaymentsC||0,closed.rate||rate)}/><Stat l="Cierre definitivo / próxima apertura" v={dual(closed.carryForwardC??closed.currentValueC,closed.rate||rate)}/></Panel>:<Panel title="ÚLTIMO PASO · Cerrar mes"><p className="muted">Revisa el inventario y los saldos de tus cuentas. Los pagos de deudas que hagas en la pestaña "Deudas" ya se descuentan de su cuenta al momento — el cierre solo guarda el resultado final y lo pasa como apertura del siguiente mes.</p><Stat l="Resultado final para cerrar" v={dual(currentValueC,rate)}/><Stat l="Cambio contra apertura" v={previous?`${resultC>=0?'+':''}${dual(resultC,rate)}`:'Primer período · establece la base real'}/><button className="btn primary wide" disabled={!inv} onClick={close}>Cerrar definitivamente {month}</button></Panel>}
 <Panel title="Historial de cierres"><Table heads={['Mes','Apertura','Pago deudas','Cierre final / siguiente mes']} rows={[...monthCloses].sort((a:MonthClose,b:MonthClose)=>b.month.localeCompare(a.month)).map((x:MonthClose)=>[x.month,dual(x.openingC??x.baseC??0,x.rate||rate),dual(x.debtPaymentsC||0,x.rate||rate),dual(x.carryForwardC??x.currentValueC,x.rate||rate)])}/></Panel></>
}
function Debts({debts,setDebts,debtPayments,rate,businessId,logCtx,reloadDebtPayments,accounts,setAccounts,reloadAccountHistory,month}:any){
 const [f,setF]=useState({description:'',amount:'',currency:'C$',initialPaid:'',affects:false});
 const hasAccounts=!!(accounts&&accounts.length);
 const [payingDebtId,setPayingDebtId]=useState<string|null>(null);
 const [payAccountId,setPayAccountId]=useState('');
 const [payAmount,setPayAmount]=useState('');
 const [payNote,setPayNote]=useState('');
 useEffect(()=>{if(!payAccountId&&hasAccounts)setPayAccountId(accounts[0].id)},[accounts,payAccountId,hasAccounts]);
 const paidFor=(debtId:string)=>(debtPayments as DebtPaymentRecord[]).filter(p=>p.debtId===debtId).reduce((n,p)=>n+p.equivalentC,0);
 const historyFor=(debtId:string)=>(debtPayments as DebtPaymentRecord[]).filter(p=>p.debtId===debtId).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
 const togglePay=(d:Debt)=>{
  if(payingDebtId===d.id){setPayingDebtId(null);return}
  setPayingDebtId(d.id);setPayAmount('');setPayNote('');
  if(!payAccountId&&hasAccounts)setPayAccountId(accounts[0].id);
 };
 const registerPayment=async(debt:Debt)=>{
  const account=(accounts as Account[]).find(a=>a.id===payAccountId);
  const amount=+payAmount||0;
  if(!account)return alert('Selecciona de cuál cuenta va a salir el pago.');
  if(amount<=0)return alert('Ingresa un monto válido.');
  if(amount>account.balance)return alert(`Saldo insuficiente en ${account.name}. Disponible: ${money(account.balance,account.currency)}`);
  if(!businessId)return alert('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  const equivalentC=toNio(amount,account.currency,rate);
  const newBalance=account.balance-amount;
  try{
   await addDebtPaymentRemote(businessId,debt.id,{id:uid(),accountId:account.id,accountName:account.name,currency:account.currency,amount,equivalentC,note:payNote.trim(),month});
   if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'payment','debts',`Registró un pago de ${money(amount,account.currency)} a "${debt.description}" desde ${account.name}`);
  }catch(err){console.error(err);return alert('No se pudo registrar el pago en la nube. Inténtalo de nuevo.')}
  try{
   await addAccountBalanceHistoryRemote(businessId,{id:uid(),accountId:account.id,accountName:account.name,currency:account.currency,previousBalance:account.balance,newBalance,changedBy:logCtx?.username});
   reloadAccountHistory&&reloadAccountHistory();
  }catch(err){console.error('IMPRESA: no se pudo registrar el historial de saldo',err)}
  setAccounts((accounts as Account[]).map(a=>a.id===account.id?{...a,balance:newBalance,updated:today()}:a));
  reloadDebtPayments&&reloadDebtPayments();
  setPayAmount('');setPayNote('');
 };
 const removePayment=async(debt:Debt,p:DebtPaymentRecord)=>{
  const account=p.accountId?(accounts as Account[]).find(a=>a.id===p.accountId):undefined;
  const msg=account
   ?`¿Borrar este pago de ${money(p.amount,p.currency)} a "${debt.description}"? El dinero se le va a devolver a ${account.name}.`
   :`¿Borrar este pago de ${money(p.amount,p.currency)} a "${debt.description}"? No se le va a devolver dinero a ninguna cuenta porque este pago no quedó ligado a una.`;
  if(!confirm(msg))return;
  if(!businessId)return alert('Todavía se está preparando tu negocio, intenta de nuevo en un momento.');
  try{
   await removeDebtPaymentRemote(p.id);
  }catch(err){console.error(err);return alert('No se pudo borrar el pago en la nube. Inténtalo de nuevo.')}
  if(account){
   const newBalance=account.balance+p.amount;
   try{
    await addAccountBalanceHistoryRemote(businessId,{id:uid(),accountId:account.id,accountName:account.name,currency:account.currency,previousBalance:account.balance,newBalance,changedBy:logCtx?.username});
    reloadAccountHistory&&reloadAccountHistory();
   }catch(err){console.error('IMPRESA: no se pudo registrar la devolución en el historial de saldo',err)}
   setAccounts((accounts as Account[]).map(a=>a.id===account.id?{...a,balance:newBalance,updated:today()}:a));
  }
  if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'deleted','debts',`Borró un pago de ${money(p.amount,p.currency)} a "${debt.description}"${account?` (se le devolvió a ${account.name})`:''}`);
  reloadDebtPayments&&reloadDebtPayments();
 };
 const add=async()=>{
  if(!f.description||!(+f.amount))return alert('Completa descripción y monto total.');
  const entered=+f.amount,nio=toNio(entered,f.currency as 'C$'|'US$',rate);
  const debt:Debt={id:uid(),description:f.description,totalAmount:nio,currency:f.currency as 'C$'|'US$',enteredTotal:entered,affectsPercent:f.affects,createdAt:today()};
  setDebts([...debts,debt]);
  const initial=+f.initialPaid||0;
  if(initial>0&&businessId){
   const initialNio=toNio(initial,f.currency as 'C$'|'US$',rate);
   try{
    await addDebtPaymentRemote(businessId,debt.id,{id:uid(),accountId:null,accountName:'Registro inicial',currency:f.currency as 'C$'|'US$',amount:initialNio,equivalentC:initialNio,note:'Pago inicial (antes de usar esta pestaña)'});
    if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'payment','debts',`Registró un pago inicial de ${money(initialNio,'C$')} para "${debt.description}"`);
    reloadDebtPayments&&reloadDebtPayments();
   }catch(err){console.error(err);alert('La deuda se guardó, pero no se pudo registrar el pago inicial. Puedes registrarlo luego desde "Registrar pago a una deuda", aquí mismo en Deudas.')}
  }
  setF({description:'',amount:'',currency:'C$',initialPaid:'',affects:false});
 };
 const remove=(d:Debt)=>{if(confirm(`¿Borrar la deuda "${d.description}"? También se borra su historial de pagos.`))setDebts(debts.filter((x:Debt)=>x.id!==d.id))};
 const totalC=debts.reduce((n:number,d:Debt)=>n+d.totalAmount,0);
 const paidC=debts.reduce((n:number,d:Debt)=>n+paidFor(d.id),0);
 const remainingC=Math.max(0,totalC-paidC);
 return <>
  <div className="cards">
   <div className="card"><span>DEUDA TOTAL</span><strong>{dual(totalC,rate)}</strong></div>
   <div className="card"><span>PAGADO</span><strong>{dual(paidC,rate)}</strong></div>
   <div className="card"><span>RESTANTE</span><strong>{dual(remainingC,rate)}</strong></div>
  </div>
  <Panel title="Lista de deudas">
   <Table heads={['Descripción','Total','Pagado','Restante','% Pagado','Afecta %','Acción']} rows={debts.map((d:Debt)=>{
    const paid=paidFor(d.id),remaining=Math.max(0,d.totalAmount-paid),pct=d.totalAmount>0?Math.min(100,paid/d.totalAmount*100):0;
    return [
     d.description,
     money(fromNio(d.totalAmount,d.currency,rate),d.currency||'C$'),
     money(fromNio(paid,d.currency,rate),d.currency||'C$'),
     money(fromNio(remaining,d.currency,rate),d.currency||'C$'),
     <div className="debtBarWrap"><div className="debtBar"><span className="debtBarFill" style={{width:`${pct}%`}}/></div><span>{pct.toFixed(1)}%</span></div>,
     <span className={`pill ${d.affectsPercent?'yes':'no'}`}>{d.affectsPercent?'Sí':'No'}</span>,
     <div className="actions"><button className="small" onClick={()=>togglePay(d)}>{payingDebtId===d.id?'Cerrar':'Registrar pago'}</button><button className="dangerSmall" onClick={()=>remove(d)}>Borrar</button></div>
    ];
   })}/>
   {!debts.length&&<Empty text="No hay deudas registradas todavía."/>}
  </Panel>
  {payingDebtId&&(()=>{
   const d=(debts as Debt[]).find((x:Debt)=>x.id===payingDebtId);
   if(!d)return null;
   const entries=historyFor(d.id),paid=paidFor(d.id),remaining=Math.max(0,d.totalAmount-paid);
   return <Panel title={`Registrar pago · ${d.description}`}>
    {!hasAccounts?<Empty text="Primero crea una cuenta en 'Banco y Efectivo' para poder pagar desde ahí."/>:<div className="form grid">
     <Select l="Pagar desde" v={payAccountId} s={setPayAccountId} opts={(accounts as Account[]).map((a:Account)=>a.id)} labels={(accounts as Account[]).map((a:Account)=>`${a.name} · ${a.currency} · disponible ${money(a.balance,a.currency)}`)}/>
     <Input l="Monto" v={payAmount} s={setPayAmount} type="number"/>
     <Input l="Nota (opcional)" v={payNote} s={setPayNote}/>
     <button className="btn primary" onClick={()=>registerPayment(d)}>+ Registrar pago</button>
    </div>}
    <div className="note">Pagado: {money(fromNio(paid,d.currency,rate),d.currency||'C$')} · Restante: {money(fromNio(remaining,d.currency,rate),d.currency||'C$')}</div>
    <h3 style={{marginTop:'20px'}}>Historial de pagos</h3>
    {!entries.length?<Empty text="Esta deuda todavía no tiene pagos registrados."/>:<Table heads={['Fecha','Cuenta','Monto','Nota','Acción']} rows={entries.map(p=>[`${String(p.at||'').slice(0,10)}${p.month?' · mes '+p.month:''}`,p.accountName||'—',money(fromNio(p.equivalentC,d.currency,rate),d.currency||'C$'),p.note||'—',<button className="dangerSmall" onClick={()=>removePayment(d,p)}>Borrar</button>])}/>}
   </Panel>
  })()}
  <Panel title="Agregar deuda">
   <p className="muted">Registra aquí cada deuda (máquinas, préstamos, liquidaciones, etc.). Luego, usa "Registrar pago" junto a esa deuda para irla pagando; cada pago se descuenta al momento de la cuenta que elijas.</p>
   <div className="form grid">
    <Input l="Descripción" v={f.description} s={v=>setF({...f,description:v})}/>
    <MoneyInput l="Total de la deuda" v={f.amount} s={v=>setF({...f,amount:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/>
    <Input l="Ya pagado antes (opcional)" v={f.initialPaid} s={v=>setF({...f,initialPaid:v})} type="number"/>
    <Select l="¿Afecta el % del negocio?" v={f.affects?'Sí':'No'} s={v=>setF({...f,affects:v==='Sí'})} opts={['No','Sí']}/>
    <button className="btn primary" onClick={add}>+ Agregar deuda</button>
   </div>
  </Panel>
 </>
}
function Accounting({sales,expenses,accounts,closes,monthCloses,month,rate,initialBase,setInitialBase}:any){
 const selected=monthCloses.find((x:MonthClose)=>x.month===month);
 const inv=[...closes].reverse().find((x:InventoryClose)=>x.month===month)||[...closes].sort((a:InventoryClose,b:InventoryClose)=>b.month.localeCompare(a.month))[0];
 const useRate=selected?.rate??rate;
 const inventory=selected?.inventoryC??inv?.total??0;
 const liquidity=selected?.bankCashC??accounts.reduce((n:number,a:Account)=>n+(a.currency==='US$'?a.balance*useRate:a.balance),0);
 const salesInfo=selected?.salesC??sales.filter((x:Sale)=>x.date.startsWith(month)).reduce((n:number,x:Sale)=>n+x.amount,0);
 const expensesInfo=selected?.expensesC??expenses.filter((x:Expense)=>x.date.startsWith(month)).reduce((n:number,x:Expense)=>n+x.amount,0);
 const currentValue=inventory+liquidity;
 const previous=[...monthCloses].filter((x:MonthClose)=>x.month<month).sort((a:MonthClose,b:MonthClose)=>b.month.localeCompare(a.month))[0];
 const historicalBaseC=initialBase?.baseC>0?initialBase.baseC:4100*useRate;
 const openingC=selected?.openingC??(previous?(previous.carryForwardC??previous.currentValueC):(initialBase?.confirmed?historicalBaseC:0));
 const hasBase=!!previous||!!initialBase?.confirmed; const gainLossC=hasBase?currentValue-openingC:0; const gainLossUSD=useRate>0?gainLossC/useRate:0; const pct=hasBase&&openingC>0?gainLossC/openingC*100:0;
 const confirmInitial=()=>{if(currentValue<=0)return alert('Primero registra Inventario, Bancos y/o Efectivo.');if(!confirm(`Confirmar situación inicial con capital histórico de US$4,100.00?\n\nValor registrado actualmente: ${dual(currentValue,useRate)}\n\nDespués de confirmar, el sistema calculará ganancia o pérdida contra los US$4,100.`))return;setInitialBase({confirmed:true,baseUSD:4100,baseC:4100*useRate,confirmedAt:today()})};
 const history=[...monthCloses].sort((a:MonthClose,b:MonthClose)=>a.month.localeCompare(b.month)).slice(-8).map((x:MonthClose)=>({label:x.month.slice(5),value:x.inventoryC+x.bankCashC}));
 const expenseCats=Object.entries(expenses.filter((x:Expense)=>x.date.startsWith(month)).reduce((o:any,x:Expense)=>(o[x.category]=(o[x.category]||0)+x.amount,o),{})).map(([label,value])=>({label,value:Number(value)}));
 return <><div className="accountingHead"><div><div className="eyebrow">CENTRO FINANCIERO</div><h2>Contabilidad del negocio</h2><p>El valor real se calcula únicamente con Inventario + Bancos + Efectivo.</p></div><span className={`statusPill ${selected?'closed':'open'}`}>{selected?'● PERÍODO CERRADO':'● PERÍODO ABIERTO'}</span></div>
 <div className="kpis finance"><Kpi icon="📦" t="Inventario" v={dual(inventory,useRate)} sub="Inventario guardado"/><Kpi icon="●" t="Bancos + Efectivo" v={dual(liquidity,useRate)} sub="Liquidez real"/><Kpi icon="◆" t="Valor actual del negocio" v={dual(currentValue,useRate)} sub="Inventario + Bancos + Efectivo"/><Kpi icon={gainLossC>=0?'↗':'↘'} t="Ganancia / Pérdida" v={`${gainLossC>=0?'+':''}${dual(gainLossC,useRate)}`} sub={hasBase?`${pct>=0?'+':''}${pct.toFixed(1)}% vs. ${previous?'apertura del mes':'capital inicial US$4,100'}`:'Pendiente de confirmar situación inicial'}/></div>
 {!previous&&!initialBase?.confirmed&&<Panel title="Situación inicial del negocio"><p className="muted">La base histórica es US$4,100.00. Mientras cargas Inventario, BAC Dólares, BAC Córdobas y Efectivo no se mostrará pérdida. Cuando termines, confirma la situación inicial para comenzar la comparación.</p><div className="equationPro"><span>US$4,100.00 <small>Capital histórico</small></span><b>↔</b><span>{dual(currentValue,useRate)} <small>Activos registrados</small></span></div><button className="btn primary wide" disabled={currentValue<=0} onClick={confirmInitial}>Confirmar situación inicial</button></Panel>}
 <div className="statementGrid"><Panel title="Ejercicio de ganancia / pérdida"><div className="capitalCompare"><div><span>Apertura del período</span><strong>{dual(openingC,useRate)}</strong><small>{previous?'Saldo trasladado del cierre anterior':initialBase?.confirmed?'Capital histórico confirmado · US$4,100':'Pendiente de confirmar situación inicial'}</small></div><b>→</b><div><span>Valor actual del negocio</span><strong>{money(useRate?currentValue/useRate:0,'US$')}</strong><small>{money(currentValue,'C$')}</small></div></div><div className={`bigResult ${gainLossC<0?'loss':''}`}><span>{!hasBase?'SITUACIÓN INICIAL PENDIENTE':gainLossC>0?'AUMENTO DEL PERÍODO':gainLossC<0?'DISMINUCIÓN DEL PERÍODO':'SIN CAMBIO EN EL PERÍODO'}</span><strong>{gainLossC>=0?'+':''}{money(gainLossC,'C$')} · {gainLossUSD>=0?'+':''}{money(gainLossUSD,'US$')}</strong><small>{hasBase?`${pct>=0?'+':''}${pct.toFixed(1)}% respecto a ${previous?'la apertura':'US$4,100 de capital inicial'}`:'Registra Inventario + Bancos + Efectivo y confirma la situación inicial'}</small></div><div className="equationPro"><span>{dual(inventory,useRate)} <small>Inventario</small></span><b>+</b><span>{dual(liquidity,useRate)} <small>Bancos + Efectivo</small></span><b>=</b><span>{dual(currentValue,useRate)} <small>Valor actual</small></span></div></Panel>
 <Panel title="Progreso del valor actual"><BusinessProgress currentC={currentValue} rate={useRate}/></Panel></div>
 <div className="dashboardGrid"><Panel title="Evolución del valor del negocio"><MiniLine data={history} moneyMode/><div className="chartLegend"><span>Apertura del período: {dual(openingC,useRate)}</span><b>Actual: {dual(currentValue,useRate)}</b></div>{!history.length&&<Empty text="El gráfico histórico aparecerá después del primer cierre mensual."/>}</Panel><Panel title="Registros informativos del mes"><div className="recordCards"><div><span>Ventas registradas</span><b>{dual(salesInfo,useRate)}</b><small>No modifica el valor del negocio</small></div><div><span>Gastos registrados</span><b>{dual(expensesInfo,useRate)}</b><small>No modifica el valor del negocio</small></div></div><p className="muted">Ventas y gastos permanecen disponibles para consulta y reportes, pero quedan fuera del cálculo de ganancia/pérdida solicitado.</p></Panel></div>
 <div className="statementGrid"><Panel title="Estado de situación del negocio"><div className="statement"><div className="statementTitle">VALOR REAL</div><Stat l="Bancos + Efectivo" v={dual(liquidity,useRate)}/><Stat l="Inventario" v={dual(inventory,useRate)}/><div className="statementTotal"><span>Valor actual total</span><b>{dual(currentValue,useRate)}</b></div><div className="statementTitle gap">CAPITAL Y RESULTADO</div><Stat l="Apertura del período" v={dual(openingC,useRate)}/><div className={`statementTotal result ${gainLossC<0?'loss':''}`}><span>Cambio del período</span><b>{gainLossC>=0?'+':''}{dual(gainLossC,useRate)}</b></div></div></Panel><Panel title="Fórmula oficial de IMPRESA"><div className="formulaOfficial"><b>Inventario + Bancos + Efectivo</b><span>= Valor actual del negocio</span><hr/><b>Valor actual − Apertura del período</b><span>= Cambio del período</span></div><div className="infoStrip">Ventas y gastos son registros informativos. No entran en estas dos fórmulas.</div></Panel></div>
 <Panel title="Historial contable mensual"><Table heads={['Período','Apertura','Valor al cierre','Pago deudas','Traslado siguiente mes','Cambio del período']} rows={[...monthCloses].sort((a:MonthClose,b:MonthClose)=>b.month.localeCompare(a.month)).map((x:MonthClose)=>{const r=x.rate||useRate,total=x.currentValueC??(x.inventoryC+x.bankCashC),open=x.openingC??x.baseC??0,diff=open?total-open:0;return [x.month,dual(open,r),dual(total,r),dual(x.debtPaymentsC||0,r),dual(x.carryForwardC??total,r),open?`${diff>=0?'+':''}${dual(diff,r)}`:'Sin base previa']})}/></Panel></>
}
function Quotes({quotes,setQuotes,rate}:any){const [f,setF]=useState({client:'',description:'',amount:'',currency:'C$'});const entered=+f.amount||0,nio=toNio(entered,f.currency as 'C$'|'US$',rate);const add=()=>{if(!f.client||!entered)return;setQuotes([...quotes,{id:uid(),date:today(),client:f.client,description:f.description,amount:nio,currency:f.currency as 'C$'|'US$',enteredAmount:entered,status:'Borrador'}]);setF({client:'',description:'',amount:'',currency:'C$'})};const approve=(q:Quote)=>{setQuotes(quotes.map((x:Quote)=>x.id===q.id?{...x,status:'Aprobada'}:x))};return <Panel title="Cotizaciones"><div className="form grid"><Input l="Cliente" v={f.client} s={v=>setF({...f,client:v})}/><Input l="Trabajo" v={f.description} s={v=>setF({...f,description:v})}/><MoneyInput l="Total" v={f.amount} s={v=>setF({...f,amount:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/><div className="conversion"><span>Conversión automática</span><b>{dual(nio,rate)}</b></div><button className="btn primary" onClick={add}>Crear cotización</button></div><Table heads={['Nº','Cliente','Trabajo','C$','US$','Estado','Acción']} rows={quotes.slice().reverse().map((q:Quote)=>[q.id,q.client,q.description,money(q.amount,'C$'),money(rate>0?q.amount/rate:0,'US$'),q.status,<div className="actions">{q.status==='Borrador'?<button className="small" onClick={()=>approve(q)}>Aprobar</button>:null}<button className="dangerSmall" onClick={()=>{if(confirm('¿Borrar esta cotización?'))setQuotes(quotes.filter((z:Quote)=>z.id!==q.id))}}>Borrar</button></div>])}/></Panel>}
function Reports({sales,expenses,closes,accounts,rate}:any){const months=Array.from(new Set([...sales.map((x:Sale)=>x.date.slice(0,7)),...expenses.map((x:Expense)=>x.date.slice(0,7)),...closes.map((x:InventoryClose)=>x.month)])).sort().reverse();return <Panel title="Resumen por mes"><Table heads={['Mes','Ventas','Gastos','Diferencia','Inventario cierre']} rows={months.map((m:any)=>{const s=sales.filter((x:Sale)=>x.date.startsWith(m)).reduce((a:number,x:Sale)=>a+x.amount,0),e=expenses.filter((x:Expense)=>x.date.startsWith(m)).reduce((a:number,x:Expense)=>a+x.amount,0),i=[...closes].reverse().find((x:InventoryClose)=>x.month===m);return [m,money(s),money(e),money(s-e),money(i?.total||0)]})}/></Panel>}
function Settings({rate,setRate,initialBase}:any){return <div className="cols"><Panel title="Regla del seguimiento mensual"><div className="equation">Inventario + Bancos + Efectivo = Valor real del negocio</div><div className="equation second">Valor actual − Base/Apertura = Ganancia o Pérdida</div><p className="muted">El capital histórico es US$4,100. Durante la carga inicial no se muestra pérdida. Al confirmar la situación inicial se compara el valor real registrado contra US$4,100. Después, cada cierre definitivo pasa como apertura del siguiente mes.</p></Panel><Panel title="Configuración"><Input l="Tipo de cambio: C$ por US$1" v={String(rate)} s={v=>setRate(+v||0)} type="number"/><Stat l="Capital inicial histórico" v="US$4,100.00"/><Stat l="Situación inicial" v={initialBase?.confirmed?'Confirmada':'Pendiente de confirmar'}/><Stat l="Moneda principal" v="C$"/></Panel></div>}
function Kpi({icon,t,v,sub}:any){return <div className="kpi"><div className="kpiIcon">{icon}</div><div><span>{t}</span><strong>{v}</strong><small>{sub}</small></div></div>}
function Health({label,ok,text}:any){return <div className="health"><i className={ok?'ok':'wait'}>{ok?'✓':'!'}</i><div><b>{label}</b><span>{text}</span></div></div>}
function MiniLine({data,moneyMode}:any){if(!data?.length)return null;const max=Math.max(...data.map((x:any)=>x.value),1),min=Math.min(...data.map((x:any)=>x.value),0),range=Math.max(max-min,1);const pts=data.map((x:any,i:number)=>`${data.length===1?50:i/(data.length-1)*100},${92-((x.value-min)/range)*72}`).join(' ');return <div className="lineChart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".22"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${pts} 100,100`} fill="url(#area)"/><polyline points={pts} fill="none" vectorEffect="non-scaling-stroke"/></svg><div className="chartLabels">{data.map((x:any)=><span key={x.label}>{x.label}</span>)}</div></div>}
function MiniBars({data,rate}:any){if(!data?.length)return null;const max=Math.max(...data.map((x:any)=>x.value),1);return <div className="barChart">{data.slice(0,6).map((x:any)=><div className="barRow" key={x.label}><span>{x.label}</span><div><i style={{width:`${Math.max(3,x.value/max*100)}%`}}/></div><b>{rate?dual(x.value,rate):money(x.value,'C$')}</b></div>)}</div>}
function BusinessProgress({currentC,rate,compact=false,large=false}:any){
 const baseUSD=4100,currentUSD=rate>0?currentC/rate:0,pct=baseUSD>0?currentUSD/baseUSD*100:0,diff=currentUSD-baseUSD;
 const ringPct=Math.min(100,Math.max(0,pct));
 return <div className={`businessProgress ${compact?'compact':''} ${large?'large':''}`}><div className="progressRing" style={{background:`conic-gradient(#3157d5 0 ${ringPct}%, #e8edf5 ${ringPct}% 100%)`}}><div><strong>{money(currentUSD,'US$')}</strong><span>Valor actual</span><b>{pct.toFixed(1)}%</b></div></div><div className="progressDetails"><div className="progressMeta"><div><span>Base inicial</span><strong>US$4,100.00</strong></div><div><span>{diff>=0?'Sobre la base':'Falta para la base'}</span><strong className={diff>=0?'positive':'negative'}>{diff>=0?'+':''}{money(diff,'US$')}</strong></div></div><div className="progressScale"><span>US$0</span><b>Meta inicial · US$4,100</b><span>{pct>100?`${pct.toFixed(1)}%`:'100%'}</span></div>{pct>100&&<p className="progressExceeded">✓ El negocio superó la base inicial por {money(diff,'US$')}.</p>}</div></div>
}
function Donut({a,b}:any){const total=a+b,p=total?a/total*100:0;return <div className="donutWrap"><div className="donut" style={{background:`conic-gradient(#3157d5 0 ${p}%, #12a594 ${p}% 100%)`}}><div><strong>{money(total,'C$')}</strong><span>Activos</span></div></div></div>}

function Card({t,v}:{t:string;v:string}){return <div className="card"><span>{t}</span><strong>{v}</strong></div>}
function Panel({title,children}:{title:string;children:any}){return <div className="panel"><h2>{title}</h2>{children}</div>}
function Stat({l,v}:{l:string;v:string}){return <div className="stat"><span>{l}</span><b>{v}</b></div>}
function Input({l,v,s,type='text'}:{l:string;v:string;s:(v:string)=>void;type?:string}){return <label><span>{l}</span><input type={type} value={v} onChange={e=>s(e.target.value)}/></label>}
function MoneyInput({l,v,s,c,sc}:{l:string;v:string;s:(v:string)=>void;c:'C$'|'US$';sc:(c:'C$'|'US$')=>void}){return <label><span>{l}</span><div className="moneyField"><input type="number" value={v} onChange={e=>s(e.target.value)} placeholder="0.00"/><select value={c} onChange={e=>sc(e.target.value as 'C$'|'US$')}><option value="C$">C$</option><option value="US$">US$</option></select></div></label>}
function Select({l,v,s,opts,labels}:{l:string;v:string;s:(v:string)=>void;opts:string[];labels?:string[]}){return <label><span>{l}</span><select value={v} onChange={e=>s(e.target.value)}>{opts.map((x,i)=><option value={x} key={x}>{labels?.[i]??x}</option>)}</select></label>}
function Table({heads,rows,rowClasses=[]}:{heads:string[];rows:any[][];rowClasses?:string[]}){return <div className="tablewrap"><table><thead><tr>{heads.map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className={rowClasses[i]||''}>{r.map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div>}
function Empty({text='No hay registros.'}:{text?:string}){return <div className="empty">{text}</div>}
