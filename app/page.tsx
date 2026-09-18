'use client';
import {useEffect,useState} from 'react';
import {supabaseConfigured} from '../lib/supabaseClient';
import Auth from '../components/Auth';
import Users from '../components/Users';
import type {Payment,Sale,Expense,Account,InventoryItem,InventoryClose,DebtPayment,MonthClose,Quote,InitialBase,AppUser,Debt,DebtPaymentRecord} from '../lib/db';
import {uid,ensureBusiness,fetchBusinessSettings,updateRateRemote,confirmInitialBaseRemote,useSalesCloud,useExpensesCloud,useAccountsCloud,useQuotesCloud,useMonthClosesCloud,useDebtsCloud,loadInventory,addInventoryItemRemote,deleteInventoryItemRemote,deleteInventoryMonthRemote,logActivity,loadDebtPayments,addDebtPaymentRemote} from '../lib/db';

const CURRENT_USER_KEY='impresa_current_user';

const tabs=['Dashboard','Ventas','Gastos','Inventario','Banco y Efectivo','Contabilidad','Cierre de mes','Deudas','Cotizaciones','Usuarios','Reportes','Configuración'];
const today=()=>new Date().toISOString().slice(0,10);
const monthNow=()=>new Date().toISOString().slice(0,7);
const money=(n:number,c:'C$'|'US$'='C$')=>`${c}${new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0)}`;
const dual=(nio:number,rate:number)=>`${money(nio,'C$')} · ${money(rate>0?nio/rate:0,'US$')}`;
const toNio=(amount:number,currency:'C$'|'US$',rate:number)=>currency==='US$'?amount*rate:amount;
const fromNio=(nio:number,currency:'C$'|'US$'|undefined,rate:number)=>currency==='US$'?(rate>0?nio/rate:0):nio;

export default function Home(){
 const [businessId,setBusinessId]=useState<string|null>(null);
 const [bootError,setBootError]=useState('');
 const [settingsReady,setSettingsReady]=useState(false);
 const [tab,setTab]=useState('Dashboard'),[month,setMonth]=useState(monthNow());
 const [rate,setRateLocal]=useState(37);
 const [initialBase,setInitialBaseLocal]=useState<InitialBase>({confirmed:false,baseUSD:4100,baseC:0});

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
  fetchBusinessSettings(businessId).then(s=>{if(!cancelled){setRateLocal(s.rate);setInitialBaseLocal(s.initialBase);setSettingsReady(true)}}).catch(err=>{console.error('IMPRESA: no se pudo cargar la configuración',err);if(!cancelled)setSettingsReady(true)});
  return ()=>{cancelled=true}
 },[businessId]);

 const setRate=(v:number)=>{setRateLocal(v);if(businessId)updateRateRemote(businessId,v).catch(err=>{console.error(err);alert('No se pudo guardar el tipo de cambio en la nube.')})};
 const setInitialBase=(v:InitialBase)=>{setInitialBaseLocal(v);if(businessId&&v.confirmed)confirmInitialBaseRemote(businessId,v.baseC).catch(err=>{console.error(err);alert('No se pudo confirmar la situación inicial en la nube.')})};

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

 const props={sales,setSales,expenses,setExpenses,accounts,setAccounts,closes,businessId,reloadInventory,monthCloses,addMonthClose,initialBase,setInitialBase,quotes,setQuotes,debts,setDebts,debtPayments,reloadDebtPayments,month,rate,setRate,logCtx};

 if(!supabaseConfigured)return <Auth businessId={null} onLogin={()=>{}}/>;
 if(bootError)return <div className="loadingScreen">{bootError}</div>;
 if(!businessId||!settingsReady)return <div className="loadingScreen">Preparando tu negocio…</div>;
 if(!currentUser)return <Auth businessId={businessId} onLogin={handleLogin}/>;

 return <div className="app"><aside><div className="brandWrap"><div className="brandMark">I</div><div><div className="brand">IMPRESA</div><div className="sub">Business Management</div></div></div><div className="workspace">OPERACIONES · NICARAGUA</div><nav>{tabs.map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</nav><div className="sessionFooter"><small>{currentUser.username}</small><button className="small" onClick={handleLogout}>Cerrar sesión</button></div></aside><main><header><div><div className="eyebrow">IMPRESA / {month}</div><h1>{tab}</h1><p>Centro administrativo y financiero del negocio</p></div><div className="actions"><label className="month"><span>Mes</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button className="btn" onClick={()=>setTab('Gastos')}>+ Gasto</button><button className="btn primary" onClick={()=>setTab('Ventas')}>+ Venta</button></div></header>
 {tab==='Dashboard'?<Dashboard {...props}/>:tab==='Ventas'?<Sales {...props}/>:tab==='Gastos'?<Expenses {...props}/>:tab==='Inventario'?<Inventory {...props}/>:tab==='Banco y Efectivo'?<Accounts {...props}/>:tab==='Contabilidad'?<Accounting {...props}/>:tab==='Cierre de mes'?<MonthClosing {...props}/>:tab==='Deudas'?<Debts {...props}/>:tab==='Cotizaciones'?<Quotes {...props}/>:tab==='Usuarios'?<Users businessId={businessId} currentUser={currentUser}/>:tab==='Reportes'?<Reports {...props}/>:<Settings {...props}/>}
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
 <div className="dashboardGrid"><Panel title="Progreso del valor del negocio"><BusinessProgress currentC={patrimony} rate={rate}/></Panel><Panel title="Distribución de gastos"><MiniBars data={expenseCats} rate={rate}/>{!expenseCats.length&&<Empty text="No hay gastos registrados este mes."/>}</Panel></div>
 <div className="dashboardGrid"><Panel title="Evolución del valor del negocio"><MiniLine data={trend} moneyMode/><div className="chartLegend"><span>Últimos cierres mensuales</span><b>{trend.length?dual(trend[trend.length-1].value,rate):'Sin cierres'}</b></div></Panel><Panel title="Meta inicial"><BusinessProgress currentC={patrimony} rate={rate} compact/></Panel></div>
 <div className="dashboardGrid"><Panel title="Liquidez por cuenta">{accounts.map((x:Account)=>{const c=x.currency==='US$'?x.balance*rate:x.balance;return <div className="accountRow" key={x.id}><div><b>{x.name}</b><small>{x.currency} · actualizado {x.updated}</small></div><strong>{dual(c,rate)}</strong></div>})}</Panel><Panel title="Control del período"><div className="healthList"><Health label="Inventario mensual" ok={!!last} text={last?`Último cierre: ${last.month}`:'Pendiente de registrar'}/><Health label="Cierre contable" ok={monthCloses.some((x:MonthClose)=>x.month===month)} text={monthCloses.some((x:MonthClose)=>x.month===month)?'Mes cerrado':'Mes abierto'}/><Health label="Tipo de cambio" ok={rate>0} text={`C$${rate.toFixed(2)} = US$1`}/></div></Panel></div></>
}
function Sales({sales,setSales,month,rate}:any){
 const [f,setF]=useState({date:today(),client:'',description:'',amount:'',currency:'C$',initialPayment:''});
 const entered=+f.amount||0,nio=toNio(entered,f.currency as 'C$'|'US$',rate),initialEntered=Math.max(0,+f.initialPayment||0),initialNio=Math.min(nio,toNio(initialEntered,f.currency as 'C$'|'US$',rate));
 const paid=(x:Sale)=>x.paidAmount!==undefined?x.paidAmount:(x.status==='Pagada'?x.amount:0);
 const statusFor=(total:number,p:number)=>p<=0?'Pendiente':p>=total?'Pagada':'Pago parcial';
 const add=()=>{if(!f.client||!entered)return alert('Completa cliente y monto.');if(initialEntered>entered)return alert('El pago inicial no puede ser mayor que el total de la venta.');const status=statusFor(nio,initialNio);const payments:Payment[]=initialNio>0?[{id:uid(),date:f.date,amount:initialNio,note:'Pago inicial'}]:[];setSales([...sales,{id:uid(),date:f.date,client:f.client,description:f.description,amount:nio,currency:f.currency as 'C$'|'US$',enteredAmount:entered,status,paidAmount:initialNio,payments}]);setF({...f,client:'',description:'',amount:'',initialPayment:''})};
 const abonar=(x:Sale)=>{const current=paid(x),balance=Math.max(0,x.amount-current);if(balance<=0)return alert('Esta venta ya está pagada.');const raw=prompt(`Saldo pendiente: ${dual(balance,rate)}\nMonto del nuevo abono en C$:`,String(balance));if(raw===null)return;const amount=+raw;if(!amount||amount<=0)return alert('Ingresa un abono válido.');if(amount>balance)return alert('El abono no puede ser mayor que el saldo pendiente.');const next=current+amount;const payment:Payment={id:uid(),date:today(),amount,note:'Abono'};setSales(sales.map((z:Sale)=>z.id===x.id?{...z,paidAmount:next,status:statusFor(z.amount,next),payments:[...(z.payments||[]),payment]}:z))};
 const history=(x:Sale)=>{const ps=x.payments||[];if(!ps.length)return alert('Esta venta todavía no tiene abonos registrados.');alert(`Historial de pagos · ${x.id}\n\n`+ps.map(p=>`${p.date} — ${money(p.amount,'C$')} — ${p.note||'Pago'}`).join('\n')+`\n\nPagado: ${money(paid(x),'C$')}\nSaldo: ${money(Math.max(0,x.amount-paid(x)),'C$')}`)};
 const visible=sales.filter((x:Sale)=>x.date.startsWith(month)).slice().reverse();
 const pending=visible.reduce((n:number,x:Sale)=>n+Math.max(0,x.amount-paid(x)),0);
 return <><div className="cards"><div className="card"><span>VENTAS DEL MES</span><strong>{dual(visible.reduce((n:number,x:Sale)=>n+x.amount,0),rate)}</strong></div><div className="card"><span>COBRADO</span><strong>{dual(visible.reduce((n:number,x:Sale)=>n+paid(x),0),rate)}</strong></div><div className="card"><span>CUENTAS POR COBRAR</span><strong>{dual(pending,rate)}</strong><small>Ventas pendientes y pagos parciales</small></div></div><Panel title="Registro de ventas"><div className="form grid"><Input l="Fecha" v={f.date} s={v=>setF({...f,date:v})} type="date"/><Input l="Cliente" v={f.client} s={v=>setF({...f,client:v})}/><Input l="Trabajo / descripción" v={f.description} s={v=>setF({...f,description:v})}/><MoneyInput l="Total" v={f.amount} s={v=>setF({...f,amount:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/><MoneyInput l="Pago inicial" v={f.initialPayment} s={v=>setF({...f,initialPayment:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/><div className="conversion"><span>Estado automático</span><b>{statusFor(nio,initialNio)} · Saldo {dual(Math.max(0,nio-initialNio),rate)}</b></div><button className="btn primary" onClick={add}>Registrar venta</button></div><Table heads={['Fecha','Cliente','Trabajo','Total','Pagado','Saldo','Estado','Acciones']} rowClasses={visible.map((x:Sale)=>Math.max(0,x.amount-paid(x))>0?'salePending':'')} rows={visible.map((x:Sale)=>{const p=paid(x),bal=Math.max(0,x.amount-p);return [x.date,x.client,x.description||'—',money(x.amount,'C$'),money(p,'C$'),money(bal,'C$'),x.status,<div className="actions"><button className="small" disabled={bal<=0} onClick={()=>abonar(x)}>+ Abono</button><button className="small" onClick={()=>history(x)}>Historial</button><button className="dangerSmall" onClick={()=>{if(confirm('¿Borrar esta venta y su historial de pagos?'))setSales(sales.filter((z:Sale)=>z.id!==x.id))}}>Borrar</button></div>]})}/><div className="note">El estado ya no se selecciona manualmente: 0 pagado = Pendiente; un abono menor al total = Pago parcial; saldo C$0 = Pagada. Los abonos quedan guardados con la venta.</div></Panel></>}

function Expenses({expenses,setExpenses,month,rate}:any){const [f,setF]=useState({date:today(),category:'Operativo',description:'',amount:'',currency:'C$'});const entered=+f.amount||0,nio=toNio(entered,f.currency as 'C$'|'US$',rate);const add=()=>{if(!f.description||!entered)return alert('Completa descripción y monto.');setExpenses([...expenses,{id:uid(),date:f.date,category:f.category,description:f.description,amount:nio,currency:f.currency as 'C$'|'US$',enteredAmount:entered}]);setF({...f,description:'',amount:''})};return <Panel title="Registro de gastos"><div className="form grid"><Input l="Fecha" v={f.date} s={v=>setF({...f,date:v})} type="date"/><Select l="Categoría" v={f.category} s={v=>setF({...f,category:v})} opts={['Materiales','Operativo','Servicios','Transporte','Nómina','Publicidad','Equipos','Otro']}/><Input l="Descripción" v={f.description} s={v=>setF({...f,description:v})}/><MoneyInput l="Monto" v={f.amount} s={v=>setF({...f,amount:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/><div className="conversion"><span>Conversión automática</span><b>{dual(nio,rate)}</b></div><button className="btn primary" onClick={add}>Guardar gasto</button></div><Table heads={['Fecha','Categoría','Descripción','C$','US$','Acción']} rows={expenses.filter((x:Expense)=>x.date.startsWith(month)).slice().reverse().map((x:Expense)=>[x.date,x.category,x.description,money(x.amount,'C$'),money(rate>0?x.amount/rate:0,'US$'),<button className="dangerSmall" onClick={()=>{if(confirm('¿Borrar este gasto?'))setExpenses(expenses.filter((z:Expense)=>z.id!==x.id))}}>Borrar</button>])}/></Panel>}
function Accounts({accounts,setAccounts,rate}:any){const [f,setF]=useState({name:'',currency:'C$'});const add=()=>{if(!f.name)return;setAccounts([...accounts,{id:uid(),name:f.name,currency:f.currency as 'C$'|'US$',balance:0,updated:today()}]);setF({...f,name:''})};const update=(a:Account)=>{const x=prompt(`Saldo actual de ${a.name} (${a.currency})`,String(a.balance));if(x===null||isNaN(+x))return;setAccounts(accounts.map((z:Account)=>z.id===a.id?{...z,balance:+x,updated:today()}:z))};return <><div className="cards">{accounts.map((a:Account)=>{const nio=a.currency==='US$'?a.balance*rate:a.balance;return <div className="card account" key={a.id}><span>{a.name} · {a.currency}</span><strong>{money(a.balance,a.currency)}</strong><small>{dual(nio,rate)} · Actualizado {a.updated}</small><div className="actions"><button className="small" onClick={()=>update(a)}>Actualizar saldo</button><button className="dangerSmall" onClick={()=>{if(confirm(`¿Borrar la cuenta ${a.name}?`))setAccounts(accounts.filter((z:Account)=>z.id!==a.id))}}>Borrar</button></div></div>})}</div><Panel title="Agregar cuenta o caja"><div className="form inline"><Input l="Nombre (ej. BAC Dólares)" v={f.name} s={v=>setF({...f,name:v})}/><Select l="Moneda" v={f.currency} s={v=>setF({...f,currency:v})} opts={['C$','US$']}/><button className="btn primary" onClick={add}>Agregar cuenta</button></div><div className="note">Tipo de cambio actual del sistema: C${rate.toFixed(2)} = US$1.00. El resumen convierte automáticamente todas las cuentas.</div></Panel></>}
function Inventory({closes,businessId,reloadInventory,monthCloses,month,rate,logCtx}:any){
 const existing=[...closes].reverse().find((x:InventoryClose)=>x.month===month);
 const items=existing?.items||[];
 const [f,setF]=useState({name:'',category:'Camisas',qty:'',unitValue:'',currency:'C$'});
 const total=items.reduce((a:number,x:InventoryItem)=>a+x.qty*x.unitValue,0),entered=+f.unitValue||0,unitNio=toNio(entered,f.currency as 'C$'|'US$',rate),closed=monthCloses.some((x:MonthClose)=>x.month===month);
 const add=async()=>{if(closed)return alert('Este mes ya está cerrado.');if(!f.name||!+f.qty)return alert('Completa producto/material y cantidad.');const item:InventoryItem={id:uid(),name:f.name,category:f.category,qty:+f.qty,unitValue:unitNio,currency:f.currency as 'C$'|'US$',enteredUnitValue:entered};try{await addInventoryItemRemote(businessId,month,item);reloadInventory();if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'created','monthly_inventory',`Agregó "${item.name}" al inventario de ${month}`);setF({...f,name:'',qty:'',unitValue:''})}catch(err){console.error(err);alert('No se pudo guardar el producto en la nube.')}};
 const removeItem=async(id:string,name?:string)=>{try{await deleteInventoryItemRemote(id);reloadInventory();if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'deleted','monthly_inventory',`Eliminó "${name||'un producto'}" del inventario de ${month}`)}catch(err){console.error(err);alert('No se pudo borrar el producto.')}};
 const removeMonth=async(m:string)=>{try{await deleteInventoryMonthRemote(businessId,m);reloadInventory();if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'deleted','monthly_inventory',`Eliminó el inventario del mes ${m}`)}catch(err){console.error(err);alert('No se pudo borrar el inventario de ese mes.')}};
 return <><Panel title={`Inventario · ${month}`}>{closed?<div className="closedBanner">✓ Este mes está CERRADO.</div>:<><div className="form grid"><Input l="Producto / material" v={f.name} s={v=>setF({...f,name:v})}/><Select l="Categoría" v={f.category} s={v=>setF({...f,category:v})} opts={['Camisas','Hilos','Tintas','Vinil','Sublimación','Empaque','Otros']}/><Input l="Cantidad física" v={f.qty} s={v=>setF({...f,qty:v})} type="number"/><MoneyInput l="Valor unitario" v={f.unitValue} s={v=>setF({...f,unitValue:v})} c={f.currency as 'C$'|'US$'} sc={c=>setF({...f,currency:c})}/><div className="conversion"><span>Valor unitario convertido</span><b>{dual(unitNio,rate)}</b></div><button className="btn primary" onClick={add}>+ Agregar al conteo</button></div><div className="note">Al presionar “Agregar al conteo”, el producto queda registrado y guardado automáticamente en la nube. No necesitas guardar el inventario otra vez.</div><Table heads={['Producto/material','Categoría','Cantidad','Unit. C$','Unit. US$','Total C$','Total US$','Acción']} rows={items.map((x:InventoryItem)=>[x.name,x.category,x.qty,money(x.unitValue,'C$'),money(rate>0?x.unitValue/rate:0,'US$'),money(x.qty*x.unitValue,'C$'),money(rate>0?x.qty*x.unitValue/rate:0,'US$'),<button className="dangerSmall" onClick={()=>removeItem(x.id,x.name)}>Borrar</button>])}/><div className="cards"><div className="card"><span>LÍNEAS CONTADAS</span><strong>{items.length}</strong></div><div className="card"><span>VALOR INVENTARIO</span><strong>{dual(total,rate)}</strong></div></div></>}</Panel><Panel title="Historial de inventarios"><Table heads={['Mes','Fecha','Productos/materiales','Total C$','Total US$','Notas','Acción']} rows={[...closes].sort((a:InventoryClose,b:InventoryClose)=>b.month.localeCompare(a.month)).map((x:InventoryClose)=>[x.month,x.date,x.items.length,money(x.total,'C$'),money(rate>0?x.total/rate:0,'US$'),x.notes,<button className="dangerSmall" onClick={()=>{if(confirm(`¿Borrar el inventario de ${x.month}?`))removeMonth(x.month)}}>Borrar</button>])}/></Panel></>
}
function MonthClosing({closes,monthCloses,addMonthClose,sales,expenses,accounts,setAccounts,month,rate,debts,businessId,reloadDebtPayments,logCtx}:any){
 const inv=[...closes].reverse().find((x:InventoryClose)=>x.month===month),closed=monthCloses.find((x:MonthClose)=>x.month===month),previous=[...monthCloses].filter((x:MonthClose)=>x.month<month).sort((a:MonthClose,b:MonthClose)=>b.month.localeCompare(a.month))[0];
 const [payAccount,setPayAccount]=useState(accounts[0]?.id||''); const [payDebtId,setPayDebtId]=useState(''); const [payAmount,setPayAmount]=useState(''); const [payNote,setPayNote]=useState(''); const [debtPayments,setDebtPayments]=useState<DebtPayment[]>([]);
 useEffect(()=>{if(!payAccount&&accounts[0])setPayAccount(accounts[0].id)},[accounts,payAccount]);
 useEffect(()=>{if(!payDebtId&&debts&&debts[0])setPayDebtId(debts[0].id)},[debts,payDebtId]);
 const inventoryC=inv?.total||0,rawBankRows=accounts.map((a:Account)=>({name:a.name,currency:a.currency,balance:a.balance,equivalentC:a.currency==='US$'?a.balance*rate:a.balance})),rawBankCashC=rawBankRows.reduce((n:number,a:any)=>n+a.equivalentC,0),expensesC=expenses.filter((x:Expense)=>x.date.startsWith(month)).reduce((n:number,x:Expense)=>n+x.amount,0),salesC=sales.filter((x:Sale)=>x.date.startsWith(month)).reduce((n:number,x:Sale)=>n+x.amount,0);
 const preCloseC=inventoryC+rawBankCashC,openingC=previous?(previous.carryForwardC??previous.currentValueC):0,debtPaymentsC=debtPayments.reduce((n,x)=>n+x.equivalentC,0),finalValueC=preCloseC-debtPaymentsC,resultC=previous?finalValueC-openingC:0;
 const stagedFor=(id:string)=>debtPayments.filter(x=>x.accountId===id).reduce((n,x)=>n+x.amount,0);
 const hasDebts=!!(debts&&debts.length);
 const addDebtPayment=()=>{const a=accounts.find((x:Account)=>x.id===payAccount);const amount=+payAmount||0;if(!a)return alert('Selecciona la cuenta de donde saldrá el pago.');if(amount<=0)return alert('Ingresa un monto válido.');const available=a.balance-stagedFor(a.id);if(amount>available)return alert(`Saldo insuficiente en ${a.name}. Disponible: ${money(available,a.currency)}`);const equivalentC=a.currency==='US$'?amount*rate:amount;const debt=hasDebts?(debts as Debt[]).find(d=>d.id===payDebtId):undefined;setDebtPayments([...debtPayments,{id:uid(),accountId:a.id,accountName:a.name,currency:a.currency,amount,equivalentC,note:payNote.trim(),debtId:debt?.id,debtDescription:debt?.description}]);setPayAmount('');setPayNote('')};
 const removeDebt=(id:string)=>setDebtPayments(debtPayments.filter(x=>x.id!==id));
 const close=async()=>{if(closed)return alert('Este mes ya está cerrado.');if(!inv)return alert('Primero guarda el inventario del mes.');for(const a of accounts as Account[]){const used=stagedFor(a.id);if(used>a.balance)return alert(`Saldo insuficiente en ${a.name}. Revisa los pagos antes de cerrar.`)}if(!confirm(`¿Cerrar definitivamente ${month}? Este es el ÚLTIMO PASO y bloqueará el período.`))return;
  const updatedAccounts=(accounts as Account[]).map(a=>{const used=stagedFor(a.id);return used?{...a,balance:a.balance-used,updated:today()}:a});
  const finalBankRows=updatedAccounts.map(a=>({name:a.name,currency:a.currency,balance:a.balance,equivalentC:a.currency==='US$'?a.balance*rate:a.balance}));const finalBankCashC=finalBankRows.reduce((n,a)=>n+a.equivalentC,0);const finalC=inventoryC+finalBankCashC;
  setAccounts(updatedAccounts);
  try{
   await addMonthClose({id:uid(),month,closedAt:today(),rate,inventoryC,accounts:finalBankRows,bankCashC:finalBankCashC,expensesC,salesC,currentValueC:finalC,baseC:openingC,resultC:previous?finalC-openingC:0,notes:inv.notes||'',openingC,debtPaymentsC,carryForwardC:finalC,debtNotes:debtPayments.map(x=>`${x.debtDescription||x.accountName}: ${money(x.amount,x.currency)}${x.note?' · '+x.note:''}`).join(' | '),preCloseC,debtPaymentDetails:debtPayments});
   if(businessId){
    for(const p of debtPayments){
     if(!p.debtId)continue;
     try{
      await addDebtPaymentRemote(businessId,p.debtId,{id:uid(),accountId:p.accountId,accountName:p.accountName,currency:p.currency,amount:p.amount,equivalentC:p.equivalentC,note:p.note,month});
      if(logCtx)logActivity(businessId,logCtx.userId,logCtx.username,'payment','debts',`Registró un pago de ${money(p.amount,p.currency)} a "${p.debtDescription}" (cierre de ${month})`);
     }catch(err){console.error('IMPRESA: no se pudo enlazar el pago a la deuda',err)}
    }
    reloadDebtPayments&&reloadDebtPayments();
   }
   alert(`${month} cerrado definitivamente. ${dual(finalC,rate)} entra al siguiente mes.`)
  }catch(err){console.error(err);alert('No se pudo guardar el cierre en la nube. Revisa tu conexión, verifica tus cuentas y vuelve a intentar el cierre.')}};
 return <><div className="cols"><Panel title={`Preparación del cierre · ${month}`}><Stat l="Apertura del período" v={previous?dual(openingC,rate):'C$0.00 · US$0.00 (primer período)'}/><Stat l="Inventario guardado" v={inv?dual(inventoryC,rate):'Pendiente'}/><Stat l="Bancos + caja antes de ajustes" v={dual(rawBankCashC,rate)}/><Stat l="Valor antes de pagos" v={dual(preCloseC,rate)}/></Panel><Panel title="Pagos y ajustes antes del cierre">{closed?<><div className="closedBanner">✓ Mes CERRADO. Los pagos ya fueron descontados de sus cuentas.</div><Stat l="Valor antes de pagos" v={dual(closed.preCloseC??(closed.currentValueC+(closed.debtPaymentsC||0)),closed.rate||rate)}/><Stat l="Pagos de deudas" v={dual(closed.debtPaymentsC||0,closed.rate||rate)}/><Stat l="Cierre definitivo / próxima apertura" v={dual(closed.carryForwardC??closed.currentValueC,closed.rate||rate)}/></>:<><p className="muted">Registra primero todos los pagos de deuda. Cada pago debe indicar la cuenta de origen y, si corresponde, a qué deuda de la pestaña “Deudas” pertenece; el descuento se aplica automáticamente al cerrar el mes y el pago queda anotado en esa deuda.</p><div className="form grid"><Select l="Pagar desde" v={payAccount} s={setPayAccount} opts={(accounts as Account[]).map(a=>a.id)} labels={(accounts as Account[]).map(a=>`${a.name} · ${a.currency} · disponible ${money(a.balance-stagedFor(a.id),a.currency)}`)}/>{hasDebts?<Select l="Deuda a pagar" v={payDebtId} s={setPayDebtId} opts={(debts as Debt[]).map(d=>d.id)} labels={(debts as Debt[]).map(d=>d.description)}/>:<div className="conversion"><span>Deuda a pagar</span><b>Aún no tienes deudas registradas. Ve a la pestaña “Deudas” para crear una (opcional).</b></div>}<Input l="Monto" v={payAmount} s={setPayAmount} type="number"/><Input l="Nota (opcional)" v={payNote} s={setPayNote}/><button className="btn" onClick={addDebtPayment}>+ Registrar pago</button></div>{debtPayments.length>0&&<Table heads={['Cuenta origen','Deuda','Monto','Equiv. C$','Nota','Acción']} rows={debtPayments.map(x=>[x.accountName,x.debtDescription||'— (sin deuda)',money(x.amount,x.currency),money(x.equivalentC,'C$'),x.note||'—',<button className="dangerSmall" onClick={()=>removeDebt(x.id)}>Quitar</button>])}/>}<div className="equationPro"><span>{dual(preCloseC,rate)} <small>Antes de pagos</small></span><b>−</b><span>{dual(debtPaymentsC,rate)} <small>Deudas</small></span><b>=</b><span>{dual(finalValueC,rate)} <small>Cierre final</small></span></div></>}</Panel></div>{!closed&&<Panel title="ÚLTIMO PASO · Cerrar mes"><p className="muted">Revisa inventario, cuentas y pagos. Al cerrar, los pagos se descuentan de BAC Dólares, BAC Córdobas, Efectivo o la cuenta seleccionada; el resultado final se guarda y pasa como apertura del siguiente mes.</p><Stat l="Resultado final para cerrar" v={dual(finalValueC,rate)}/><Stat l="Cambio contra apertura" v={previous?`${resultC>=0?'+':''}${dual(resultC,rate)}`:'Primer período · establece la base real'}/><button className="btn primary wide" disabled={!inv} onClick={close}>Cerrar definitivamente {month}</button></Panel>}<Panel title="Historial de cierres"><Table heads={['Mes','Apertura','Antes de pagos','Pago deudas','Cierre final / siguiente mes']} rows={[...monthCloses].sort((a:MonthClose,b:MonthClose)=>b.month.localeCompare(a.month)).map((x:MonthClose)=>[x.month,dual(x.openingC??x.baseC??0,x.rate||rate),dual(x.preCloseC??(x.currentValueC+(x.debtPaymentsC||0)),x.rate||rate),dual(x.debtPaymentsC||0,x.rate||rate),dual(x.carryForwardC??x.currentValueC,x.rate||rate)])}/></Panel></>
}
function Debts({debts,setDebts,debtPayments,rate,businessId,logCtx,reloadDebtPayments}:any){
 const [f,setF]=useState({description:'',amount:'',currency:'C$',initialPaid:'',affects:false});
 const paidFor=(debtId:string)=>(debtPayments as DebtPaymentRecord[]).filter(p=>p.debtId===debtId).reduce((n,p)=>n+p.equivalentC,0);
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
   }catch(err){console.error(err);alert('La deuda se guardó, pero no se pudo registrar el pago inicial. Puedes registrarlo luego desde Cierre de mes.')}
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
     <button className="dangerSmall" onClick={()=>remove(d)}>Borrar</button>
    ];
   })}/>
   {!debts.length&&<Empty text="No hay deudas registradas todavía."/>}
  </Panel>
  <Panel title="Agregar deuda">
   <p className="muted">Registra aquí cada deuda (máquinas, préstamos, liquidaciones, etc.). Luego, cuando registres un pago en “Cierre de mes”, selecciona esta deuda y el pago se descuenta automáticamente de lo que falta.</p>
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
function BusinessProgress({currentC,rate,compact=false}:any){
 const baseUSD=4100,currentUSD=rate>0?currentC/rate:0,pct=baseUSD>0?currentUSD/baseUSD*100:0,diff=currentUSD-baseUSD;
 const ringPct=Math.min(100,Math.max(0,pct));
 return <div className={`businessProgress ${compact?'compact':''}`}><div className="progressRing" style={{background:`conic-gradient(#3157d5 0 ${ringPct}%, #e8edf5 ${ringPct}% 100%)`}}><div><strong>{money(currentUSD,'US$')}</strong><span>Valor actual</span><b>{pct.toFixed(1)}%</b></div></div><div className="progressMeta"><div><span>Base inicial</span><strong>US$4,100.00</strong></div><div><span>{diff>=0?'Sobre la base':'Falta para la base'}</span><strong className={diff>=0?'positive':'negative'}>{diff>=0?'+':''}{money(diff,'US$')}</strong></div></div><div className="progressScale"><span>US$0</span><b>Meta inicial · US$4,100</b><span>{pct>100?`${pct.toFixed(1)}%`:'100%'}</span></div>{pct>100&&<p className="progressExceeded">✓ El negocio superó la base inicial por {money(diff,'US$')}.</p>}</div>
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
