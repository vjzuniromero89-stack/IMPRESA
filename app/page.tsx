'use client';
import {useEffect,useRef,useState} from 'react';
import {supabaseConfigured} from '../lib/supabaseClient';
import Auth from '../components/Auth';
import ModuleIcon from '../components/ModuleIcon';
import Users from '../components/Users';
import ManagedSelect from '../components/ManagedSelect';
import {Sales,Expenses,SalesMethods} from '../components/SalesWorkspace';
import type {Payment,Sale,Expense,Account,InventoryItem,InventoryClose,DebtPayment,MonthClose,Quote,InitialBase,AppUser,Debt,DebtPaymentRecord,AccountBalanceEntry} from '../lib/db';
import {uid,ensureBusiness,fetchBusinessSettings,updateRateRemote,confirmInitialBaseRemote,useSalesCloud,useExpensesCloud,useAccountsCloud,useQuotesCloud,useMonthClosesCloud,useDebtsCloud,loadInventory,addInventoryItemRemote,addInventoryItemsBulkRemote,updateInventoryItemRemote,deleteInventoryItemRemote,deleteInventoryMonthRemote,logActivity,loadDebtPayments,addDebtPaymentRemote,removeDebtPaymentRemote,loadAccountBalanceHistory,addAccountBalanceHistoryRemote,setInitialAccountBalanceRemote,addInventoryCategoryRemote,addPaymentMethodRemote,addInventorySizeRemote,setInventoryBaselineMonthRemote,removeInventoryCategoryRemote,removePaymentMethodRemote,removeInventorySizeRemote,addExpenseCategoryRemote,removeExpenseCategoryRemote,addExpensePaymentMethodRemote,removeExpensePaymentMethodRemote} from '../lib/db';

const CURRENT_USER_KEY='impresa_current_user';

const tabs=['Dashboard','Ventas','Gastos','Inventario','Banco y Efectivo','Control de dinero','Contabilidad','Deudas','Cierre de mes','Cotizaciones','Usuarios','Reportes','Configuración'];
const today=()=>new Date().toISOString().slice(0,10);
const monthNow=()=>new Date().toISOString().slice(0,7);
// Muestra el mensaje del error si trae uno útil (por ejemplo, avisando qué migración de Supabase falta correr); si no, el mensaje genérico.
const errMsg=(err:unknown,fallback:string)=>(err instanceof Error&&err.message)?err.message:fallback;
const money=(n:number,c:'C$'|'US$'='C$')=>`${c}${new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0)}`;
const dual=(nio:number,rate:number)=>`${money(nio,'C$')} · ${money(rate>0?nio/rate:0,'US$')}`;
const toNio=(amount:number,currency:'C$'|'US$',rate:number)=>currency==='US$'?amount*rate:amount;
const fromNio=(nio:number,currency:'C$'|'US$'|undefined,rate:number)=>currency==='US$'?(rate>0?nio/rate:0):nio;
const round=(n:number)=>Math.round((Number(n)+Number.EPSILON)*100)/100;

export default function Home(){
 const [businessId,setBusinessId]=useState<string|null>(null);
 const [bootError,setBootError]=useState('');
 const [settingsReady,setSettingsReady]=useState(false);
 const [tab,setTab]=useState('Dashboard'),[month,setMonth]=useState(monthNow());
 // "Ventas Transferencia Efectivo" y "Detalle de Inventario" ya no son pestañas aparte del menú:
 // ahora son una vista dentro de Ventas y de Inventario, con un selector chiquito en el encabezado.
 const [ventasView,setVentasView]=useState<'Ventas'|'Cobros por cuenta'>('Ventas');
 const [inventarioView,setInventarioView]=useState<'Inventario'|'Detalle de Inventario'>('Inventario');
 const [rate,setRateLocal]=useState(37);
 const [initialBase,setInitialBaseLocal]=useState<InitialBase>({confirmed:false,baseUSD:4100,baseC:0});
 const [inventoryCategories,setInventoryCategories]=useState<string[]>(['Camisas','Hilos','Tintas','Vinil','Sublimación','Empaque','Otros']);
 const [paymentMethods,setPaymentMethods]=useState<string[]>(['Transferencia','Efectivo']);
 const [inventorySizes,setInventorySizes]=useState<string[]>(['XS','S','M','L','XL','XXL','2','4','6','8','10','12','14','16']);
 const [expenseCategories,setExpenseCategories]=useState<string[]>(['Materiales','Operativo','Servicios','Transporte','Nómina','Publicidad','Equipos','Otro']);
 const [expensePaymentMethods,setExpensePaymentMethods]=useState<string[]>(['Efectivo','Transferencia / BAC']);
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
  fetchBusinessSettings(businessId).then(s=>{if(!cancelled){setRateLocal(s.rate);setInitialBaseLocal(s.initialBase);setInventoryCategories(s.inventoryCategories);setPaymentMethods(s.paymentMethods);setInventorySizes(s.inventorySizes);setExpenseCategories(s.expenseCategories);setExpensePaymentMethods(s.expensePaymentMethods);setInventoryBaselineMonthLocal(s.inventoryBaselineMonth);setSettingsReady(true)}}).catch(err=>{console.error('IMPRESA: no se pudo cargar la configuración',err);if(!cancelled)setSettingsReady(true)});
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
 const addExpensePaymentMethod=async(name:string)=>{if(!businessId)throw new Error('Todavía se está preparando tu negocio.');const next=await addExpensePaymentMethodRemote(businessId,name);setExpensePaymentMethods(next)};
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
 const removeExpensePaymentMethod=async(name:string)=>{if(!businessId)throw new Error('Todavía se está preparando tu negocio.');const next=await removeExpensePaymentMethodRemote(businessId,name);setExpensePaymentMethods(next)};

 const logCtx={userId:currentUser?.id,username:currentUser?.username||''};
 const [sales,setSales]=useSalesCloud(businessId,rate,logCtx);
 const [expenses,setExpenses]=useExpensesCloud(businessId,rate,logCtx);
 const [accounts,setAccounts,,reloadAccounts]=useAccountsCloud(businessId,logCtx);
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

 const props={sales,setSales,expenses,setExpenses,accounts,setAccounts,reloadAccounts,closes,businessId,reloadInventory,monthCloses,addMonthClose,initialBase,setInitialBase,quotes,setQuotes,debts,setDebts,debtPayments,reloadDebtPayments,accountHistory,reloadAccountHistory,month,rate,setRate,logCtx,inventoryCategories,addInventoryCategory,removeInventoryCategory,paymentMethods,addPaymentMethod,removePaymentMethod,inventorySizes,addInventorySize,removeInventorySize,expenseCategories,addExpenseCategory,removeExpenseCategory,expensePaymentMethods,addExpensePaymentMethod,removeExpensePaymentMethod,inventoryBaselineMonth,setInventoryBaselineMonth};

 if(!supabaseConfigured)return <Auth businessId={null} onLogin={()=>{}}/>;
 if(bootError)return <div className="loadingScreen">{bootError}</div>;
 if(!businessId||!settingsReady)return <div className="loadingScreen">Preparando tu negocio…</div>;
 if(!currentUser)return <Auth businessId={businessId} onLogin={handleLogin}/>;

 const headingLabel=tab==='Ventas'?ventasView:tab==='Inventario'?inventarioView:tab;
 return <div className="app"><aside><div className="brandWrap"><div className="brandMark">I</div><div><div className="brand">IMPRESA</div><div className="sub">Gestión del negocio</div></div></div><div className="workspace">OPERACIONES · NICARAGUA</div><nav aria-label="Módulos de IMPRESA">{tabs.map(x=><button key={x} className={tab===x?'active':''} aria-current={tab===x?'page':undefined} onClick={()=>setTab(x)}><span className="navIcon"><ModuleIcon name={x}/></span><span>{x}</span></button>)}</nav><div className="sessionFooter"><small>{currentUser.username}</small><button className="small" onClick={handleLogout}>Cerrar sesión</button></div></aside><main><header><div className="pageHeading"><span className="pageIcon"><ModuleIcon name={headingLabel}/></span><div><div className="eyebrow">IMPRESA / {month}</div><h1>{headingLabel}</h1><p>Centro administrativo y financiero del negocio</p></div></div>
 {tab==='Ventas'&&<div className="subTabs" role="tablist" aria-label="Vista de Ventas">{(['Ventas','Cobros por cuenta'] as const).map(v=><button key={v} type="button" role="tab" aria-selected={ventasView===v} className={ventasView===v?'active':''} onClick={()=>setVentasView(v)}>{v}</button>)}</div>}
 {tab==='Inventario'&&<div className="subTabs" role="tablist" aria-label="Vista de Inventario">{(['Inventario','Detalle de Inventario'] as const).map(v=><button key={v} type="button" role="tab" aria-selected={inventarioView===v} className={inventarioView===v?'active':''} onClick={()=>setInventarioView(v)}>{v}</button>)}</div>}
 <div className="actions"><label className="month"><span>Mes</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button className="btn" onClick={()=>setTab('Gastos')}>+ Gasto</button><button className="btn primary" onClick={()=>{setTab('Ventas');setVentasView('Ventas')}}>+ Venta</button></div></header>
 {tab==='Dashboard'?<Dashboard {...props}/>:tab==='Ventas'?(ventasView==='Ventas'?<Sales {...props}/>:<SalesMethods {...props}/>):tab==='Gastos'?<Expenses {...props}/>:tab==='Inventario'?(inventarioView==='Inventario'?<Inventory {...props}/>:<InventoryDetail {...props}/>):tab==='Banco y Efectivo'?<Accounts {...props}/>:tab==='Control de dinero'?<MoneyControl {...props}/>:tab==='Contabilidad'?<Accounting {...props}/>:tab==='Cierre de mes'?<MonthClosing {...props}/>:tab==='Deudas'?<Debts {...props}/>:tab==='Cotizaciones'?<Quotes {...props}/>:tab==='Usuarios'?<Users businessId={businessId} currentUser={currentUser}/>:tab==='Reportes'?<Reports {...props}/>:<Settings {...props}/>}
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
 <div className="kpis"><Kpi icon="🏦" t="Bancos y efectivo" v={dual(bankCash,rate)} sub="Saldo consolidado"/><Kpi icon="📦" t="Inventario" v={dual(inventory,rate)} sub={last?`Cierre ${last.month}`:'Sin cierre'}/><Kpi icon="📈" t="Ventas registradas" v={dual(salesM,rate)} sub={`${sm.length} movimientos · informativo`}/><Kpi icon="🧾" t="Gastos del mes" v={dual(expM,rate)} sub={`${em.length} movimientos`}/></div>
 <Panel title="Valor del Negocio Actual"><BusinessProgress currentC={patrimony} rate={rate} large/></Panel>
 <div className="dashboardGrid"><Panel title="Evolución del valor del negocio"><MiniLine data={trend} moneyMode/><div className="chartLegend"><span>Últimos cierres mensuales</span><b>{trend.length?dual(trend[trend.length-1].value,rate):'Sin cierres'}</b></div></Panel><Panel title="Distribución de gastos"><MiniBars data={expenseCats} rate={rate}/>{!expenseCats.length&&<Empty text="No hay gastos registrados este mes."/>}</Panel></div>
 <div className="dashboardGrid"><Panel title="Liquidez por cuenta">{accounts.map((x:Account)=>{const c=x.currency==='US$'?x.balance*rate:x.balance;return <div className="accountRow" key={x.id}><div><b>{x.name}</b><small>{x.currency} · actualizado {x.updated}</small></div><strong>{dual(c,rate)}</strong></div>})}</Panel><Panel title="Control del período"><div className="healthList"><Health label="Inventario mensual" ok={!!last} text={last?`Último cierre: ${last.month}`:'Pendiente de registrar'}/><Health label="Cierre contable" ok={monthCloses.some((x:MonthClose)=>x.month===month)} text={monthCloses.some((x:MonthClose)=>x.month===month)?'Mes cerrado':'Mes abierto'}/><Health label="Tipo de cambio" ok={rate>0} text={`C$${rate.toFixed(2)} = US$1`}/></div></Panel></div></>
}
function MoneyControl({sales,expenses,accounts,month,rate,accountHistory}:any){
 const currentC=round((accounts as Account[]).reduce((n,a)=>n+toNio(Number(a.balance)||0,a.currency,rate),0));
 const history=((accountHistory as AccountBalanceEntry[])||[]);
 const delta=(h:AccountBalanceEntry)=>round((Number(h.newBalance)||0)-(Number(h.previousBalance)||0));
 const hDate=(h:AccountBalanceEntry)=>h.transactionDate||String(h.at||'').slice(0,10);
 const hRate=(h:AccountBalanceEntry)=>{const raw=`${h.description||''} ${h.changedBy||''}`;const m=raw.match(/(?:TC|tipo\s+de\s+cambio)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);const n=m?Number(m[1]):0;return n>0?n:rate};
 const deltaC=(h:AccountBalanceEntry)=>round(h.currency==='US$'?delta(h)*hRate(h):delta(h));
 const isInitial=(h:AccountBalanceEntry)=>h.sourceType==='initial_balance'||/saldo inicial/i.test(`${h.description||''} ${h.changedBy||''}`);
 const isTransfer=(h:AccountBalanceEntry)=>h.sourceType==='transfer'||/transferencia (enviada|recibida)/i.test(`${h.description||''} ${h.changedBy||''}`);
 const movementType=(h:AccountBalanceEntry)=>isTransfer(h)?'Transferencia':isInitial(h)?'Saldo inicial':delta(h)>0?'Entrada':'Salida';
 const movementTypeNode=(h:AccountBalanceEntry)=>{const t=movementType(h);return t==='Entrada'?<span className="moneyFlowIn">Entrada</span>:t==='Salida'?<span className="moneyFlowOut">Salida</span>:t==='Transferencia'?<span className="moneyFlowTransfer">Transferencia</span>:t};
 const initialC=round(history.filter(isInitial).reduce((n,h)=>n+deltaC(h),0));
 const beforeMonthC=round(history.filter(h=>!isInitial(h)&&!isTransfer(h)&&hDate(h)<`${month}-01`).reduce((n,h)=>n+deltaC(h),0));
 const opening=round(initialC+beforeMonthC);
 const periodAll=history.filter(h=>!isInitial(h)&&hDate(h).startsWith(month)&&Math.abs(delta(h))>=0.005).sort((a,b)=>hDate(a).localeCompare(hDate(b))||String(a.at).localeCompare(String(b.at)));
 const period=periodAll.filter(h=>!isTransfer(h));
 const collectedC=round(period.filter(h=>delta(h)>0).reduce((n,h)=>n+deltaC(h),0));
 const expensesC=round(Math.abs(period.filter(h=>delta(h)<0).reduce((n,h)=>n+deltaC(h),0)));
 const expectedC=round(opening+collectedC-expensesC);
 const differenceC=round(currentC-expectedC),ok=Math.abs(differenceC)<0.01;
 const detail=(h:AccountBalanceEntry)=>h.description||((h.changedBy||'Movimiento').split(' · ').slice(1).join(' · ')||(h.changedBy||'Movimiento'));
 let running=opening;
 const flowRows:any[]=[[`${month}-01`,'Saldo inicial de Banco y Efectivo','Todas las cuentas','Saldo inicial','—','—',dual(opening,rate)]];
 for(const h of periodAll){const d=delta(h),c=deltaC(h),transfer=isTransfer(h);if(!transfer)running=round(running+c);const account=h.accountName||(accounts as Account[]).find(a=>a.id===h.accountId)?.name||'Cuenta';const amountLabel=h.currency==='US$'?`${money(Math.abs(d),'US$')} · ${money(Math.abs(c),'C$')}`:dual(Math.abs(c),rate);flowRows.push([hDate(h),detail(h),account,movementTypeNode(h),d>0?<span className="moneyFlowIn">{amountLabel}</span>:'—',d<0?<span className="moneyFlowOut">{amountLabel}</span>:'—',dual(running,rate)])}
 return <><div className="totalCircleWrap"><div className="totalCircle moneyControlCircle"><div className="circleInner"><span>DINERO REAL HOY</span><strong>{money(currentC,'C$')}</strong><b>{money(rate>0?currentC/rate:0,'US$')}</b><small>{accounts.length} cuentas sumadas</small></div></div><div className="circleBreakdown"><h3>Control del flujo del dinero</h3><div><span>Saldo inicial del mes</span><b>{dual(opening,rate)}</b></div><div><span>+ Entradas reales</span><b>{dual(collectedC,rate)}</b></div><div><span>− Salidas reales</span><b>{dual(expensesC,rate)}</b></div><div><span>= Dinero esperado</span><b>{dual(expectedC,rate)}</b></div><div><span>Dinero real en Banco y Efectivo</span><b>{dual(currentC,rate)}</b></div><div className={ok?'moneyMatch':'moneyMismatch'}><span>Diferencia</span><b>{differenceC>=0?'+':''}{dual(differenceC,rate)}</b></div><div className="circleFormula">El saldo inicial viene automáticamente de Banco y Efectivo. Ventas y abonos aumentan el dinero; gastos lo disminuyen. Las transferencias internas se muestran en el flujo para auditoría, pero no cambian el total ni se cuentan como entrada o salida del negocio.</div></div></div>
 <Panel title={`Flujo de dinero · ${month}`}><div className="kpis"><Kpi icon="↗" t="Entradas cobradas" v={dual(collectedC,rate)} sub={`${period.filter(h=>delta(h)>0).length} entradas del período`}/><Kpi icon="↘" t="Salidas pagadas" v={dual(expensesC,rate)} sub={`${period.filter(h=>delta(h)<0).length} salidas del período`}/><Kpi icon="=" t="Dinero esperado" v={dual(expectedC,rate)} sub="Inicial + entradas − salidas"/></div><div className="moneyFlowTable"><Table heads={['Fecha','Descripción','Cuenta','Tipo','Entrada','Salida','Saldo']} rows={flowRows}/></div><div className="note"><b>Conciliación automática.</b> Descripción y cuenta se muestran por separado para identificar con claridad qué ocurrió y dónde se movió el dinero. Cada línea conserva el saldo acumulado en C$ y su equivalente en US$. El saldo inicial se toma de las cuentas configuradas. Ventas, abonos, gastos y transferencias se reflejan aquí; las transferencias internas son informativas y mantienen el mismo saldo consolidado.</div></Panel></>;
}
function Accounts({accounts,setAccounts,rate,businessId,logCtx,accountHistory,reloadAccountHistory}:any){
 const [f,setF]=useState({name:'',currency:'C$'});
 const [historyAccountId,setHistoryAccountId]=useState<string|null>(null);
 const [showNewAccount,setShowNewAccount]=useState(false);
 const [transferFrom,setTransferFrom]=useState<Account|null>(null);
 const [transferTo,setTransferTo]=useState('');
 const [transferAmount,setTransferAmount]=useState('');
 const add=()=>{if(!f.name.trim())return;setAccounts([...accounts,{id:uid(),name:f.name.trim(),currency:f.currency as 'C$'|'US$',balance:0,updated:today()}]);setF({...f,name:''});setShowNewAccount(false)};
 const recordBalance=async(a:Account,newBalance:number,note='Transferencia',sourceId?:string)=>{if(!businessId)return;try{await addAccountBalanceHistoryRemote(businessId,{id:uid(),accountId:a.id,accountName:a.name,currency:a.currency,previousBalance:a.balance,newBalance,changedBy:`${logCtx?.username||'Sistema'} · ${note}`,description:note,sourceType:'transfer',sourceId,transactionDate:today()})}catch(err){console.error('IMPRESA: historial de transferencia',err)}};
 const beginTransfer=(a:Account)=>{setTransferFrom(a);setTransferTo((accounts as Account[]).find(x=>x.id!==a.id)?.id||'');setTransferAmount('')};
 const doTransfer=async()=>{if(!transferFrom)return;const dest=(accounts as Account[]).find(a=>a.id===transferTo);const amount=Number(transferAmount);if(!dest||!Number.isFinite(amount)||amount<=0)return alert('Selecciona la cuenta destino y escribe un monto válido.');if(amount>transferFrom.balance)return alert(`Saldo insuficiente en ${transferFrom.name}. Disponible: ${money(transferFrom.balance,transferFrom.currency)}.`);if(rate<=0)return alert('El tipo de cambio debe ser mayor que cero.');let received=amount;if(transferFrom.currency!==dest.currency)received=transferFrom.currency==='C$'?amount/rate:amount*rate;const sourceNew=round(transferFrom.balance-amount),destNew=round(dest.balance+received),transferId=uid();await Promise.all([recordBalance(transferFrom,sourceNew,`Transferencia enviada a ${dest.name}`,transferId),recordBalance(dest,destNew,`Transferencia recibida de ${transferFrom.name}`,transferId)]);await setAccounts((accounts as Account[]).map(a=>a.id===transferFrom.id?{...a,balance:sourceNew,updated:today()}:a.id===dest.id?{...a,balance:destNew,updated:today()}:a));reloadAccountHistory&&reloadAccountHistory();alert(`Transferencia realizada. Salieron ${money(amount,transferFrom.currency)} de ${transferFrom.name} y entraron ${money(received,dest.currency)} a ${dest.name}.`);setTransferFrom(null);setTransferAmount('')};
 const toggleHistory=(a:Account)=>setHistoryAccountId(historyAccountId===a.id?null:a.id);
 const accountOrder=(a:Account)=>{const n=a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');const isBac=n.includes('bac')||n.includes('banco');const isCash=n.includes('efectivo')||n.includes('caja');if(isBac&&a.currency==='US$')return 0;if(isBac&&a.currency==='C$')return 1;if(isCash&&a.currency==='US$')return 2;if(isCash&&a.currency==='C$')return 3;return 10};
 const orderedAccounts=[...(accounts as Account[])].sort((a,b)=>accountOrder(a)-accountOrder(b));
 const totalCordobas=orderedAccounts.filter(a=>a.currency==='C$').reduce((n,a)=>n+Number(a.balance||0),0);
 const totalDollars=orderedAccounts.filter(a=>a.currency==='US$').reduce((n,a)=>n+Number(a.balance||0),0);
 const totalC=round(totalCordobas+totalDollars*rate);
 const movementDelta=(h:AccountBalanceEntry)=>round(Number(h.newBalance)-Number(h.previousBalance));
 const movementDate=(h:AccountBalanceEntry)=>h.transactionDate||String(h.at||'').slice(0,10);
 const movementDetail=(h:AccountBalanceEntry)=>{if(h.description)return h.description;const raw=h.changedBy||'Movimiento';const parts=raw.split(' · ');return parts.length>1?parts.slice(1).join(' · '):raw};
 const sortHistory=(rows:AccountBalanceEntry[])=>[...rows].filter(h=>Math.abs(movementDelta(h))>=0.005).sort((x,y)=>movementDate(y).localeCompare(movementDate(x))||String(y.at).localeCompare(String(x.at)));
 // Si una cuenta ya tiene saldo pero versiones anteriores no guardaron su saldo inicial
 // en el libro bancario, calculamos ese saldo de apertura a partir del saldo actual
 // menos todos los movimientos reales conocidos. Así el historial individual y el
 // historial general nunca quedan vacíos cuando sí existe dinero en la cuenta.
 const ledgerHistory=(()=>{
  const rows=[...(((accountHistory as AccountBalanceEntry[])||[]))];
  for(const a of orderedAccounts){
   const mine=rows.filter(h=>h.accountId===a.id);
   const hasOpening=mine.some(h=>h.sourceType==='initial_balance'||/saldo inicial/i.test(h.description||h.changedBy||''));
   if(hasOpening)continue;
   const net=mine.reduce((n,h)=>n+movementDelta(h),0);
   const opening=round(Number(a.balance||0)-net);
   if(Math.abs(opening)<0.005)continue;
   const dates=mine.map(movementDate).filter(Boolean).sort();
   rows.push({id:`opening-${a.id}`,accountId:a.id,accountName:a.name,currency:a.currency,previousBalance:0,newBalance:opening,changedBy:'Sistema · Saldo inicial',description:'Saldo inicial',sourceType:'initial_balance',transactionDate:dates[0]||a.updated||today(),at:'1970-01-01T00:00:00.000Z'});
  }
  return rows;
 })();
 if(historyAccountId){
  const a=orderedAccounts.find(x=>x.id===historyAccountId);
  if(a){
   let running=round(Number(a.balance)||0);
   const rows=sortHistory(ledgerHistory.filter(h=>h.accountId===a.id)).map(h=>{const delta=movementDelta(h),ending=running;running=round(running-delta);return [movementDate(h),movementDetail(h),delta>0?money(delta,h.currency):'—',delta<0?money(Math.abs(delta),h.currency):'—',money(ending,h.currency)]});
   return <div className="accountStatementPage"><div className="accountStatementHead"><div><span>HISTORIAL DE CUENTA</span><h2>{a.name}</h2><p>{a.currency} · Estado de movimientos estilo bancario</p></div><div className="accountStatementBalance"><small>Saldo actual</small><strong>{money(a.balance,a.currency)}</strong></div><button className="btn" onClick={()=>setHistoryAccountId(null)}>← Volver a Banco y Efectivo</button></div><Panel title={`Movimientos · ${a.name}`}>{!rows.length?<Empty text="Esta cuenta todavía no tiene movimientos registrados."/>:<Table heads={['Fecha','Descripción','Depósitos / Créditos','Retiros / Débitos','Saldo final']} rows={rows}/>}<div className="note">El historial muestra solamente movimientos reales de dinero. Si una venta o un gasto se elimina, su movimiento desaparece del historial en lugar de crear una línea de reversión.</div></Panel></div>;
  }
 }
 const generalEntries=sortHistory(ledgerHistory);
 // El historial general funciona como un solo estado de cuenta. C$ es la moneda
 // contable base: cada movimiento US$ se convierte a C$ y modifica UN saldo final.
 // Partimos del total real actual y reconstruimos hacia atrás, igual que el
 // historial individual de cada banco. Esto evita mezclar C$ y US$ como si fueran
 // la misma unidad y mantiene el saldo final cuadrado con las cuentas actuales.
 let runningGeneralC=round(totalC);
 const historyRate=(h:AccountBalanceEntry)=>{
  const raw=`${h.description||''} ${h.changedBy||''}`;
  const m=raw.match(/(?:TC|tipo\s+de\s+cambio)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  const parsed=m?Number(m[1]):0;
  return parsed>0?parsed:rate;
 };
 const isInternalTransfer=(h:AccountBalanceEntry)=>h.sourceType==='transfer'||/transferencia (enviada|recibida)/i.test(`${h.description||''} ${h.changedBy||''}`);
 const generalMovementType=(h:AccountBalanceEntry)=>isInternalTransfer(h)?'Transferencia':isInitial(h)?'Saldo inicial':movementDelta(h)>0?'Entrada':'Salida';
 const generalMovementTypeNode=(h:AccountBalanceEntry)=>{const t=generalMovementType(h);return t==='Entrada'?<span className="moneyFlowIn">Entrada</span>:t==='Salida'?<span className="moneyFlowOut">Salida</span>:t==='Transferencia'?<span className="moneyFlowTransfer">Transferencia</span>:t};
 const generalRows=generalEntries.map(h=>{
  const delta=movementDelta(h);
  const usedRate=historyRate(h);
  // Una transferencia entre cuentas propias solo cambia dónde está el dinero.
  // Sus dos líneas se conservan para auditoría, pero NO modifican el saldo
  // consolidado del negocio. Por eso ambas muestran el mismo saldo final.
  const deltaC=isInternalTransfer(h)?0:round(h.currency==='US$'?delta*usedRate:delta);
  const endingC=runningGeneralC;
  runningGeneralC=round(runningGeneralC-deltaC);
  const accountName=h.accountName||orderedAccounts.find(a=>a.id===h.accountId)?.name||'Cuenta';
  const typeNode=generalMovementTypeNode(h);
  return [movementDate(h),<div className="generalMovementDescription" key={`desc-${h.id}`}><strong>{movementDetail(h)}</strong><span>{accountName} · {h.currency}{h.currency==='US$'?` · TC ${usedRate.toFixed(4)}`:''}</span></div>,typeNode,delta>0?money(delta,h.currency):'—',delta<0?money(Math.abs(delta),h.currency):'—',dual(endingC,rate)];
 });
 return <><div className="totalCircleWrap"><div className="totalCircle bankTotalCircle"><div className="circleInner"><span>TOTAL BANCOS + EFECTIVO</span><strong>{money(totalC,'C$')}</strong><b>{money(rate>0?totalC/rate:0,'US$')}</b><small>{accounts.length} {accounts.length===1?'cuenta sumada':'cuentas sumadas'}</small></div></div><div className="circleBreakdown"><h3>¿Qué está sumando?</h3>{orderedAccounts.map(a=><div key={a.id}><span>{a.name}</span><b>{money(a.balance,a.currency)}</b></div>)}{!accounts.length&&<p className="muted">Agrega una cuenta o caja y aparecerá aquí automáticamente.</p>}<div className="circleFormula">Las cuentas en C$ y US$ se mantienen separadas. El total consolidado convierte los dólares usando el tipo de cambio actual.</div></div></div><div className="accountToolbar"><button className="btn primary" onClick={()=>setShowNewAccount(true)}>+ Crear cuenta nueva</button><span>Las cuentas nuevas aparecerán automáticamente en ventas, gastos y transferencias.</span></div><div className="cards">{orderedAccounts.map((a:Account)=>{const nio=a.currency==='US$'?a.balance*rate:a.balance;return <div className="card account" key={a.id}><span>{a.name} · {a.currency}</span><strong>{money(a.balance,a.currency)}</strong><small>{dual(nio,rate)} · Actualizado {a.updated}</small><div className="actions"><button className="small transferBtn" onClick={()=>beginTransfer(a)}>Transferir</button><button className="small" onClick={()=>toggleHistory(a)}>Historial</button></div></div>})}</div>
 {transferFrom&&<Panel title={`Transferir desde · ${transferFrom.name}`}><div className="transferBox"><div className="transferSource"><span>Saldo disponible</span><strong>{money(transferFrom.balance,transferFrom.currency)}</strong></div><div className="form grid"><Input l={`Monto a transferir (${transferFrom.currency})`} v={transferAmount} s={setTransferAmount}/><label><span>Cuenta destino</span><select value={transferTo} onChange={e=>setTransferTo(e.target.value)}><option value="">Selecciona cuenta</option>{(accounts as Account[]).filter(a=>a.id!==transferFrom.id).map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency} · {money(a.balance,a.currency)}</option>)}</select></label></div>{(()=>{const d=(accounts as Account[]).find(a=>a.id===transferTo),n=Number(transferAmount)||0;if(!d)return null;const r=transferFrom.currency===d.currency?n:transferFrom.currency==='C$'?n/rate:n*rate;return <div className="conversionPreview"><span>{transferFrom.currency===d.currency?'Transferencia en la misma moneda':'Conversión automática al tipo de cambio actual'}</span><strong>{money(n,transferFrom.currency)} → {money(r,d.currency)}</strong>{transferFrom.currency!==d.currency&&<small>C${rate.toFixed(2)} = US$1.00</small>}</div>})()}<div className="actions"><button className="btn primary" onClick={doTransfer}>Confirmar transferencia</button><button className="btn" onClick={()=>setTransferFrom(null)}>Cancelar</button></div><div className="note">El sistema resta el monto de la cuenta de origen y lo suma a la cuenta destino. Si las monedas son diferentes, convierte automáticamente entre córdobas y dólares.</div></div></Panel>}
 <div className="generalStatementBlock"><div className="generalStatementHead"><div><span>HISTORIAL GENERAL</span><h2>Banco y Efectivo</h2><p>Todos los movimientos juntos, con el mismo formato de un estado de cuenta bancario.</p></div><div className="generalStatementTotal"><small>Total consolidado actual</small><strong>{money(totalC,'C$')}</strong><b>{money(rate>0?totalC/rate:0,'US$')}</b></div></div><div className="generalCurrencySummary"><div><span>Cuentas en córdobas</span><strong>{money(totalCordobas,'C$')}</strong></div><div><span>Cuentas en dólares</span><strong>{money(totalDollars,'US$')}</strong></div><div><span>Tipo de cambio</span><strong>C${rate.toFixed(2)} = US$1</strong></div></div><Panel title="Movimientos generales">{!generalRows.length?<Empty text="Todavía no hay movimientos registrados en las cuentas."/>:<Table heads={['Fecha','Descripción','Tipo','Entrada','Salida','Saldo final']} rows={generalRows}/>}<div className="note"><b>Mismo sistema que cada cuenta bancaria.</b> Entrada se muestra en verde y Salida en rojo. El tipo identifica si fue saldo inicial, entrada, salida o transferencia. El Saldo final es un único saldo general acumulado y se muestra en C$ y US$: los movimientos en US$ se convierten antes de sumarse o restarse. Las transferencias internas conservan sus dos líneas (salida y entrada) para auditoría, pero ambas mantienen el mismo Saldo final porque el dinero no salió del negocio. Cuando el movimiento conserva su TC, se usa esa tasa; en movimientos antiguos sin TC guardado se usa el tipo de cambio configurado actualmente.</div></Panel></div>
 {showNewAccount&&<div className="accountModalBackdrop" onMouseDown={()=>setShowNewAccount(false)}><div className="accountModal" onMouseDown={e=>e.stopPropagation()}><div className="accountModalHead"><div><span>NUEVA CUENTA</span><h3>Crear cuenta o caja</h3></div><button className="modalClose" onClick={()=>setShowNewAccount(false)}>×</button></div><div className="form grid"><Input l="Nombre de la cuenta" v={f.name} s={v=>setF({...f,name:v})}/><Select l="Moneda" v={f.currency} s={v=>setF({...f,currency:v})} opts={['C$','US$']}/></div><div className="note">La cuenta se crea con saldo C$0.00 o US$0.00. El saldo inicial y la opción de borrar la cuenta se administran únicamente desde Configuración.</div><div className="actions modalActions"><button className="btn" onClick={()=>setShowNewAccount(false)}>Cancelar</button><button className="btn primary" onClick={add}>Crear cuenta</button></div></div></div>}</>}
function Inventory({closes,sales,businessId,reloadInventory,monthCloses,month,rate,logCtx,inventoryCategories,addInventoryCategory,removeInventoryCategory,inventorySizes,addInventorySize,removeInventorySize,inventoryBaselineMonth,setInventoryBaselineMonth}:any){
 const existing=[...closes].reverse().find((x:InventoryClose)=>x.month===month);
 const items=existing?.items||[];
 const categories:string[]=(inventoryCategories&&inventoryCategories.length)?inventoryCategories:['Camisas','Hilos','Tintas','Vinil','Sublimación','Empaque','Otros'];
 const sizes:string[]=(inventorySizes&&inventorySizes.length)?inventorySizes:['XS','S','M','L','XL','XXL','2','4','6','8','10','12','14','16'];
 const [f,setF]=useState({sku:'',name:'',category:categories[0]||'Camisas',talla:'',color:'',qty:'',unitValue:'',currency:'C$'});
 const [editingId,setEditingId]=useState<string|null>(null);
 // La talla se elige de la lista guardada (igual que la categoría), para que nadie la escriba mal por error.
 const sizeOptions=Array.from(new Set([...sizes,...(f.talla?[f.talla]:[])]));
 const total=items.reduce((a:number,x:InventoryItem)=>a+x.qty*x.unitValue,0),entered=+f.unitValue||0,unitNio=toNio(entered,f.currency as 'C$'|'US$',rate),closed=monthCloses.some((x:MonthClose)=>x.month===month);
 const soldById:Record<string,number>={}; (sales||[]).filter((s:Sale)=>s.date.startsWith(month)).forEach((s:Sale)=>{const ls=s.lineItems?.length?s.lineItems:(s.inventoryItemId?[{inventoryItemId:s.inventoryItemId,quantity:s.quantity||0}]:[] as any[]);ls.forEach((l:any)=>{if(l.inventoryItemId)soldById[l.inventoryItemId]=(soldById[l.inventoryItemId]||0)+(Number(l.quantity)||0)})});
 const soldUnits=Object.values(soldById).reduce((a:number,b:number)=>a+b,0);
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
 const cancelEdit=()=>{setEditingId(null);setF(prev=>({...prev,sku:'',name:'',talla:'',color:'',qty:'',unitValue:''}))};
 const editItem=(item:InventoryItem)=>{
  setEditingId(item.id);
  setF({sku:item.sku||'',name:item.name,category:item.category||categories[0]||'Camisas',talla:item.talla||'',color:item.color||'',qty:String(item.qty),unitValue:String(item.enteredUnitValue??(item.currency==='US$'&&rate>0?item.unitValue/rate:item.unitValue)),currency:item.currency||'C$'});
 };
 const save=async()=>{
  if(closed)return alert('Este mes ya está cerrado.');
  const qtyNum=f.qty===''?NaN:+f.qty;
  if(!f.name||!Number.isFinite(qtyNum)||qtyNum<0)return alert('Completa detalle y cantidad (puede ser 0 si no tienes existencias).');
  const nextSku=Math.max(0,...items.map((x:InventoryItem)=>Number(String(x.sku||'').match(/(\d+)$/)?.[1]||0)))+1;
  const autoSku=f.sku.trim()||`IMP-${String(nextSku).padStart(4,'0')}`;
  const item:InventoryItem={id:editingId||uid(),sku:autoSku.toUpperCase(),name:f.name,category:f.category,talla:f.talla.trim(),color:f.color.trim(),qty:qtyNum,unitValue:unitNio,currency:f.currency as 'C$'|'US$',enteredUnitValue:entered};
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
   let name=iName>=0?String(arr[iName]??'').trim():'';
   let color=iColor>=0?String(arr[iColor]??'').trim():'';
   // Algunos Excel dejan "Detalle" en blanco en varias filas seguidas (por
   // ejemplo, un grupo de Landyard donde solo se llenó Color con el nombre
   // completo del producto: "LANDYARD ROJO", "LANDYARD GRIS"...). En vez de
   // descartar esas filas como si no tuvieran producto, se usa lo que haya
   // en Color como nombre — así no se pierden productos por una columna que
   // quedó vacía por error de captura.
   if(!name&&color){name=color;color=''}
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
   parsed.push({id:uid(),name,category:'',talla:iTalla>=0?String(arr[iTalla]??'').trim():'',color,qty,unitValue:0,enteredUnitValue:Number.isFinite(price)?price:0,note:noteParts.join(' · ')});
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

 return <><div className="totalCircleWrap inventoryTotalWrap"><div className="totalCircle inventoryTotalCircle"><div className="circleInner"><span>VALOR TOTAL INVENTARIO</span><strong>{money(total,'C$')}</strong><b>{money(rate>0?total/rate:0,'US$')}</b><small>{items.length} {items.length===1?'producto registrado':'productos registrados'}</small></div></div><div className="circleBreakdown"><h3>Total actual del inventario</h3><div><span>Valor en córdobas</span><b>{money(total,'C$')}</b></div><div><span>Equivalente en dólares</span><b>{money(rate>0?total/rate:0,'US$')}</b></div><div className="circleFormula">Suma cantidad × precio de cada producto disponible en este inventario.</div></div></div><Panel title={`Inventario · ${month}`}>{closed?<div className="closedBanner">✓ Este mes está CERRADO.</div>:<>{editingId&&<p className="editorNotice">Editando "{f.name || 'producto'}". Los cambios se guardan al presionar "Guardar cambios".</p>}<div className="form grid">
 <Input l="Código / SKU" v={f.sku} s={v=>setF({...f,sku:v})}/><Input l="Detalle" v={f.name} s={v=>setF({...f,name:v})}/>
 <label><span>Categoría <button type="button" className="addChip" onClick={handleAddCategory} title="Agregar categoría">+</button></span><ManagedSelect value={f.category} onChange={v=>setF({...f,category:v})} options={categories} onRemove={handleRemoveCategoryItem} confirmMessage={(c:string)=>`¿Borrar la categoría "${c}" de tu lista? Los productos que ya la tienen la conservan igual — solo deja de aparecer para productos nuevos.`}/></label>
 <label><span>Talla <button type="button" className="addChip" onClick={handleAddSize} title="Agregar talla">+</button></span><ManagedSelect value={f.talla} onChange={v=>setF({...f,talla:v})} options={sizeOptions} emptyLabel="(Sin talla)" onRemove={handleRemoveSizeItem} confirmMessage={(s:string)=>`¿Borrar la talla "${s}" de tu lista? Los productos que ya la tienen la conservan igual — solo deja de aparecer para productos nuevos.`}/></label>
 <Input l="Color" v={f.color} s={v=>setF({...f,color:v})}/>
 <Input l="Cantidad" v={f.qty} s={v=>setF({...f,qty:v})} type="number"/>
 <MoneyInput l="Precio" v={f.unitValue} s={v=>setF({...f,unitValue:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/>
 <div className="conversion"><span>Precio convertido</span><b>{dual(unitNio,rate)}</b></div>
 <div className="actions"><button className="btn primary" onClick={save}>{editingId?'Guardar cambios':'+ Agregar al conteo'}</button>{editingId&&<button className="btn" onClick={cancelEdit}>Cancelar edición</button>}</div>
 </div><div className="note">{editingId?'Al guardar los cambios, se actualiza este producto en la nube.':'Al presionar “Agregar al conteo”, el producto queda registrado y guardado automáticamente en la nube. No necesitas guardar el inventario otra vez.'}</div></>}
 <Table heads={['Código','Detalle','Categoría','Talla','Color','Cantidad','Precio C$','Precio US$','Total C$','Total US$','Acción']} rows={items.map((x:InventoryItem)=>[<b>{x.sku||'—'}</b>,<span>{x.name}{x.note&&<span className="noteDot" title={x.note}> ⓘ</span>}</span>,x.category,x.talla||'—',x.color||'—',x.qty,money(x.unitValue,'C$'),money(rate>0?x.unitValue/rate:0,'US$'),money(x.qty*x.unitValue,'C$'),money(rate>0?x.qty*x.unitValue/rate:0,'US$'),<div className="actions"><button className="small" onClick={()=>editItem(x)}>Editar</button><button className="dangerSmall" onClick={()=>removeItem(x.id,x.name)}>Borrar</button></div>])}/>
 <div className="cards"><div className="card"><span>LÍNEAS CONTADAS</span><strong>{items.length}</strong></div><div className="card"><span>VALOR INVENTARIO</span><strong>{dual(total,rate)}</strong></div></div></Panel>
 <Panel title="Control contable de existencias"><p className="muted">Este cuadro conecta Inventario con Ventas. <b>Existencia inicial</b> = lo que había antes de las ventas registradas del mes; <b>Vendido</b> sale de las ventas enlazadas al producto; <b>Existencia actual</b> es lo que queda físicamente. El valor actual es el que usa el total del inventario.</p><div className="cards"><div className="card"><span>UNIDADES VENDIDAS</span><strong>{soldUnits}</strong></div><div className="card"><span>VALOR ACTUAL</span><strong>{dual(total,rate)}</strong></div></div><Table heads={['Código','Producto','Talla','Color','Existencia inicial','Vendido','Existencia actual','Valor actual C$']} rows={items.map((x:InventoryItem)=>{const sold=soldById[x.id]||0;return [x.sku||'—',x.name,x.talla||'—',x.color||'—',x.qty+sold,<b>{sold}</b>,<b>{x.qty}</b>,money(x.qty*x.unitValue,'C$')]})}/></Panel>
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
function Settings({rate,setRate,initialBase,accounts,setAccounts,reloadAccounts,businessId,logCtx,reloadAccountHistory}:any){
 const [initialBalances,setInitialBalances]=useState<Record<string,string>>({});
 const saveInitialBalance=async(a:Account)=>{
  const raw=initialBalances[a.id]; const amount=Number(raw);
  if(raw==null||raw.trim()===''||!Number.isFinite(amount)||amount<0)return alert('Escribe un saldo inicial válido.');
  if(a.balance!==0&&!confirm(`${a.name} ya tiene ${money(a.balance,a.currency)}. ¿Quieres reemplazarlo por el saldo inicial de ${money(amount,a.currency)}?`))return;
  try{
   if(!businessId)throw new Error('Todavía se está preparando tu negocio.');
   await setInitialAccountBalanceRemote(businessId,a.id,amount,`${logCtx?.username||'Sistema'} · Saldo inicial`);
   await reloadAccounts?.();
   await reloadAccountHistory?.();
   setInitialBalances(prev=>({...prev,[a.id]:''}));
   alert(`Saldo inicial guardado en ${a.name}: ${money(amount,a.currency)}.`);
  }catch(err){console.error(err);alert(errMsg(err,'No se pudo guardar el saldo inicial.'))}
 };
 const deleteAccount=async(a:Account)=>{const warning=a.balance!==0?`La cuenta ${a.name} tiene ${money(a.balance,a.currency)}. Si la borras también desaparecerá su historial bancario. ¿Continuar?`:`¿Borrar la cuenta ${a.name}? También se borrará su historial bancario.`;if(!confirm(warning))return;try{await setAccounts((accounts as Account[]).filter(x=>x.id!==a.id));reloadAccountHistory&&reloadAccountHistory()}catch(err){console.error(err);alert(errMsg(err,'No se pudo borrar la cuenta.'))}};
 return <><div className="cards settingsAccountCards">{(accounts as Account[]).map(a=>{const nio=a.currency==='US$'?a.balance*rate:a.balance;return <div className="card account" key={a.id}><span>{a.name} · {a.currency}</span><strong>{money(a.balance,a.currency)}</strong><small>{dual(nio,rate)} · Actualizado {a.updated}</small><label className="initialBalanceField"><span>Saldo inicial</span><input type="number" min="0" step="0.01" value={initialBalances[a.id]||''} onChange={e=>setInitialBalances(prev=>({...prev,[a.id]:e.target.value}))} placeholder={`Saldo inicial en ${a.currency}`}/></label><div className="actions"><button className="btn primary" onClick={()=>saveInitialBalance(a)}>Agregar saldo inicial</button><button className="dangerSmall" onClick={()=>deleteAccount(a)}>Borrar cuenta</button></div></div>})}</div><div className="note">Los mismos bancos y cajas de “Banco y Efectivo” aparecen aquí automáticamente. Al agregar el saldo inicial, el saldo se actualiza directamente en esa cuenta y queda disponible para Ventas, Gastos, Transferencias y Control de dinero.</div><div className="cols"><Panel title="Regla del seguimiento mensual"><div className="equation">Inventario + Bancos + Efectivo = Valor real del negocio</div><div className="equation second">Valor actual − Base/Apertura = Ganancia o Pérdida</div><p className="muted">El capital histórico es US$4,100. Durante la carga inicial no se muestra pérdida. Al confirmar la situación inicial se compara el valor real registrado contra US$4,100. Después, cada cierre definitivo pasa como apertura del siguiente mes.</p></Panel><Panel title="Configuración"><Input l="Tipo de cambio: C$ por US$1" v={String(rate)} s={v=>setRate(+v||0)} type="number"/><Stat l="Capital inicial histórico" v="US$4,100.00"/><Stat l="Situación inicial" v={initialBase?.confirmed?'Confirmada':'Pendiente de confirmar'}/><Stat l="Moneda principal" v="C$"/></Panel></div></>
}
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
