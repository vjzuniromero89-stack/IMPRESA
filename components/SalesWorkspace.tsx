'use client';
import {useRef,useState} from 'react';
import type {ReactNode,FormEvent} from 'react';
import type {Sale,Expense,Currency,PaymentMethod} from '../lib/db';
import {uid} from '../lib/db';
import ManagedSelect from './ManagedSelect';

type Setter<T>=(items:T[])=>void|Promise<void>;
type SalesProps={sales:Sale[];setSales:Setter<Sale>;month:string;rate:number;paymentMethods?:string[];addPaymentMethod?:(name:string)=>Promise<void>;removePaymentMethod?:(name:string)=>Promise<void>};
const today=()=>new Date().toISOString().slice(0,10);
const money=(n:number)=>'C$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const dual=(n:number,rate:number)=>`${money(n)} · US$${(rate>0?n/rate:0).toFixed(2)}`;
const paid=(sale:Sale)=>sale.paidAmount??(sale.status==='Pagada'?sale.amount:0);
const status=(total:number,value:number)=>value<=0?'Pendiente':value>=total?'Pagada':'Pago parcial';
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const convert=(value:string,currency:Currency,rate:number)=>round(Number(value)*(currency==='US$'?rate:1));
// Muestra el mensaje del error si trae uno útil (por ejemplo, avisando qué migración de Supabase falta correr); si no, el mensaje genérico.
const errMsg=(err:unknown,fallback:string)=>(err instanceof Error&&err.message)?err.message:fallback;
const DEFAULT_METHODS:PaymentMethod[]=['Transferencia','Efectivo'];
function Field({label,children}:{label:ReactNode;children:ReactNode}){return <label><span>{label}</span>{children}</label>}
function Method({value,onChange,methods,onAdd,onRemove,allowEmpty=false}:{value:string;onChange:(v:PaymentMethod)=>void;methods:string[];onAdd?:()=>void;onRemove?:(name:string)=>void|Promise<void>;allowEmpty?:boolean}){
 const label=onAdd?<>Método de pago <button type="button" className="addChip" onClick={onAdd} title="Agregar método de pago">+</button></>:'Método de pago';
 return <Field label={label}><ManagedSelect value={value} onChange={v=>onChange(v as PaymentMethod)} options={methods} emptyLabel={allowEmpty?'Selecciona un método':undefined} onRemove={onRemove} confirmMessage={(m:string)=>`¿Borrar "${m}" de tu lista de métodos de pago? Las ventas que ya tienen este método conservan el dato; solo deja de aparecer para ventas nuevas.`}/></Field>
}
function CurrencyField({value,onChange}:{value:Currency;onChange:(v:Currency)=>void}){return <Field label="Moneda"><select value={value} onChange={e=>onChange(e.target.value as Currency)}><option>C$</option><option>US$</option></select></Field>}
function GridTable({heads,children}:{heads:string[];children:ReactNode}){return <div className="tablewrap"><table><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
function Message({text,error}:{text:string;error:boolean}){return text?<p role={error?'alert':'status'} className={'inlineMessage'+(error?' error':'')}>{text}</p>:null}
function methodClass(method?:string){return !method?'unclassified':method==='Transferencia'?'transfer':method==='Efectivo'?'cash':'other'}
function MethodBadge({method}:{method?:string}){return <span className={'methodBadge '+methodClass(method)}>{method||'Sin clasificar'}</span>}

export function Sales({sales,setSales,month,rate,paymentMethods,addPaymentMethod,removePaymentMethod}:SalesProps){
 const methods=(paymentMethods&&paymentMethods.length)?paymentMethods:DEFAULT_METHODS;
 const empty=()=>({date:today(),client:'',description:'',amount:'',currency:'C$' as Currency,initialPayment:'',paymentMethod:'' as PaymentMethod|''});
 const [f,setF]=useState(empty),[editing,setEditing]=useState<Sale|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 const [paymentSale,setPaymentSale]=useState<string|null>(null),[paymentAmount,setPaymentAmount]=useState(''),[paymentMethod,setPaymentMethod]=useState<PaymentMethod>('Efectivo'),[paymentDate,setPaymentDate]=useState(today),[historyId,setHistoryId]=useState<string|null>(null);
 const editor=useRef<HTMLDivElement>(null),paymentEditor=useRef<HTMLDivElement>(null);
 const promptNewMethod=async():Promise<string|null>=>{
  const name=prompt('Nombre del nuevo método de pago:');
  if(!name||!name.trim())return null;
  if(!addPaymentMethod){alert('No se pudo guardar el nuevo método de pago.');return null}
  try{await addPaymentMethod(name.trim());return name.trim()}
  catch(err){console.error(err);alert(errMsg(err,'No se pudo guardar el nuevo método de pago en la nube. Inténtalo de nuevo.'));return null}
 };
 const handleAddMethod=async()=>{const name=await promptNewMethod();if(name)setF(prev=>({...prev,paymentMethod:name}))};
 const handleAddMethodForPayment=async()=>{const name=await promptNewMethod();if(name)setPaymentMethod(name)};
 const handleRemoveMethodItem=async(name:string)=>{
  if(!removePaymentMethod){alert('No se pudo borrar el método de pago.');return}
  try{
   await removePaymentMethod(name);
   setF(prev=>prev.paymentMethod===name?{...prev,paymentMethod:''}:prev);
   setPaymentMethod(prev=>prev===name?(methods.find(m=>m!==name)||'Efectivo'):prev);
  }catch(err){console.error(err);alert(errMsg(err,'No se pudo borrar el método de pago en la nube. Inténtalo de nuevo.'))}
 };
 const visible=sales.filter(s=>s.date.startsWith(month)).slice().sort((a,b)=>b.date.localeCompare(a.date));
 const originalEntered=editing?.enteredAmount??(editing?editing.amount/(editing.currency==='US$'?rate:1):0);
 // Preserve the stored conversion when editing only descriptive fields.
 const total=editing&&Number(f.amount)===originalEntered&&f.currency===(editing.currency||'C$')?editing.amount:convert(f.amount,f.currency,rate);
 const notify=(text:string,isError=false)=>{setMessage(text);setError(isError)};
 const reset=()=>{setEditing(null);setF(empty())};
 const edit=(sale:Sale)=>{setEditing(sale);setF({date:sale.date,client:sale.client,description:sale.description,amount:String(sale.enteredAmount??sale.amount/(sale.currency==='US$'?rate:1)),currency:sale.currency||'C$',initialPayment:'',paymentMethod:sale.paymentMethod||''});setMessage('');editor.current?.scrollIntoView({behavior:'smooth'});};
 const save=async(e:FormEvent)=>{e.preventDefault();if(busy)return;const initial=editing?paid(editing):convert(f.initialPayment||'0',f.currency,rate);
  if(!f.date||!f.client.trim()||!f.paymentMethod||!Number.isFinite(total)||total<=0||!Number.isFinite(rate)||rate<=0)return notify('Completa fecha, cliente, método y un importe válido mayor que cero.',true);
  if(!Number.isFinite(initial)||initial<0||initial>total)return notify(editing?'El total no puede ser menor que los pagos ya registrados.':'El pago inicial debe estar entre cero y el total.',true);
  const sale:Sale={...(editing||{id:uid()}),date:f.date,client:f.client.trim(),description:f.description.trim(),amount:total,currency:f.currency,enteredAmount:editing&&Number(f.amount)===originalEntered&&f.currency===(editing.currency||'C$')?editing.enteredAmount:Number(f.amount),paymentMethod:f.paymentMethod,status:editing&&total===editing.amount?editing.status:status(total,initial),paidAmount:initial,payments:editing?.payments||(initial>0?[{id:uid(),date:f.date,amount:initial,method:f.paymentMethod,note:'Pago inicial'}]:[])};
  setBusy(true);try{await setSales(editing?sales.map(s=>s.id===editing.id?sale:s):[...sales,sale]);notify(editing?'Venta actualizada.':'Venta registrada.');reset()}catch(err){notify(err instanceof Error?err.message:'No se pudo guardar. Revisa la conexión y vuelve a intentarlo.',true)}finally{setBusy(false)}
 };
 const addPayment=async(e:FormEvent)=>{e.preventDefault();const sale=sales.find(s=>s.id===paymentSale);if(!sale||busy)return;const amount=round(Number(paymentAmount)),balance=round(sale.amount-paid(sale));
  if(!paymentDate||!Number.isFinite(amount)||amount<=0||amount>balance)return notify('El abono debe ser mayor que cero y no superar el saldo pendiente.',true);
  const next=round(paid(sale)+amount);setBusy(true);try{await setSales(sales.map(s=>s.id===sale.id?{...s,paidAmount:next,status:status(s.amount,next),payments:[...(s.payments||[]),{id:uid(),date:paymentDate,amount,method:paymentMethod,note:'Abono'}]}:s));setPaymentSale(null);notify('Abono registrado.')}catch{notify('No se pudo guardar el abono.',true)}finally{setBusy(false)}
 };
 const remove=async(sale:Sale)=>{if(!confirm('¿Borrar esta venta y su historial de pagos?'))return;setBusy(true);try{await setSales(sales.filter(s=>s.id!==sale.id));if(editing?.id===sale.id)reset();notify('Venta eliminada.')}catch{notify('No se pudo borrar la venta.',true)}finally{setBusy(false)}};
 const history=sales.find(s=>s.id===historyId);
 return <>
 <div className="paymentSummary"><div className="card"><span>VENTAS DEL MES</span><strong>{dual(visible.reduce((n,s)=>n+s.amount,0),rate)}</strong></div><div className="card"><span>COBRADO</span><strong>{dual(visible.reduce((n,s)=>n+paid(s),0),rate)}</strong></div><div className="card"><span>POR COBRAR</span><strong>{dual(visible.reduce((n,s)=>n+Math.max(0,s.amount-paid(s)),0),rate)}</strong></div></div>
 <Message text={message} error={error}/>
 <div className="panel editForm" ref={editor}><h2>{editing?'Editar venta':'Registro de ventas'}</h2>{editing&&<p className="editorNotice">Los abonos y sus métodos se conservan. Cobrado: {money(paid(editing))}. Cambiar el método de la venta no cambia el de sus abonos.</p>}
 <form onSubmit={save}><fieldset disabled={busy} className="form grid">
 <Field label="Fecha"><input required type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field>
 <Field label="Cliente"><input required value={f.client} onChange={e=>setF({...f,client:e.target.value})}/></Field>
 <Field label="Trabajo / descripción"><input value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></Field>
 <Field label="Total"><input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field>
 <CurrencyField value={f.currency} onChange={currency=>setF({...f,currency})}/><Method value={f.paymentMethod} methods={methods} allowEmpty onChange={paymentMethod=>setF({...f,paymentMethod})} onAdd={handleAddMethod} onRemove={handleRemoveMethodItem}/>
 {!editing&&<Field label="Pago inicial"><input type="number" min="0" step="0.01" value={f.initialPayment} onChange={e=>setF({...f,initialPayment:e.target.value})}/></Field>}
 <div className="conversion"><span>Total en ambas monedas</span><b>{dual(Number.isFinite(total)?total:0,rate)}</b></div>
 <div className="actions"><button className="btn primary" type="submit">{busy?'Guardando…':editing?'Guardar cambios':'Registrar venta'}</button>{editing&&<button type="button" className="btn" onClick={reset}>Cancelar edición</button>}</div>
 </fieldset></form></div>
 <div className="panel" ref={paymentEditor}>{paymentSale&&<><h2>Registrar abono · {sales.find(s=>s.id===paymentSale)?.client}</h2><form onSubmit={addPayment}><fieldset className="form grid" disabled={busy}><Field label="Fecha del abono"><input required type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></Field><Field label="Abono en C$"><input required type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)}/></Field><Method value={paymentMethod} methods={methods} onChange={setPaymentMethod} onAdd={handleAddMethodForPayment} onRemove={handleRemoveMethodItem}/><button className="btn primary">Guardar abono</button><button type="button" className="btn" onClick={()=>setPaymentSale(null)}>Cancelar</button></fieldset></form></>}
 <h2>Ventas · {month}</h2><GridTable heads={['Fecha','Cliente','Trabajo','Método','Total','Pagado','Saldo','Estado','Acciones']}>{visible.map(s=><tr key={s.id} className={s.status==='Pendiente'?'saleUnpaid':s.status==='Pago parcial'?'salePending':''}><td>{s.date}</td><td>{s.client}</td><td>{s.description||'—'}</td><td><MethodBadge method={s.paymentMethod}/></td><td>{money(s.amount)}</td><td>{money(paid(s))}</td><td>{money(Math.max(0,s.amount-paid(s)))}</td><td><span className={'statusBadge '+(s.status==='Pagada'?'paid':s.status==='Pendiente'?'pending':'partial')}>{s.status}</span></td><td><div className="actions"><button className="small" disabled={busy} onClick={()=>edit(s)}>Editar</button><button className="small" disabled={busy||paid(s)>=s.amount} onClick={()=>{setPaymentSale(s.id);setPaymentAmount(String(round(s.amount-paid(s))));setPaymentMethod(s.paymentMethod||'Efectivo');setPaymentDate(today());paymentEditor.current?.scrollIntoView({behavior:'smooth'})}}>+ Abono</button><button className="small" onClick={()=>setHistoryId(historyId===s.id?null:s.id)}>Historial</button><button className="dangerSmall" disabled={busy} onClick={()=>remove(s)}>Borrar</button></div></td></tr>)}</GridTable>{!visible.length&&<p className="empty">No hay ventas en este mes.</p>}</div>
 {history&&<div className="panel"><h2>Historial de pagos · {history.client}</h2><GridTable heads={['Fecha','Método','Importe','Nota']}>{history.payments?.map(p=><tr key={p.id}><td>{p.date}</td><td>{p.method||'Sin clasificar'}</td><td>{money(p.amount)}</td><td>{p.note||'Pago'}</td></tr>)}</GridTable>{!history.payments?.length&&<p className="empty">Sin abonos detallados registrados.</p>}<button className="small" onClick={()=>setHistoryId(null)}>Cerrar historial</button></div>}
 </>;
}

const DEFAULT_EXPENSE_CATEGORIES=['Materiales','Operativo','Servicios','Transporte','Nómina','Publicidad','Equipos','Otro'];
export function Expenses({expenses,setExpenses,month,rate,expenseCategories,addExpenseCategory,removeExpenseCategory}:{expenses:Expense[];setExpenses:Setter<Expense>;month:string;rate:number;expenseCategories?:string[];addExpenseCategory?:(name:string)=>Promise<void>;removeExpenseCategory?:(name:string)=>Promise<void>}){
 const categories=(expenseCategories&&expenseCategories.length)?expenseCategories:DEFAULT_EXPENSE_CATEGORIES;
 const empty=()=>({date:today(),category:categories[0]||'Operativo',description:'',amount:'',currency:'C$' as Currency});
 const [f,setF]=useState(empty),[editing,setEditing]=useState<Expense|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);const editor=useRef<HTMLDivElement>(null);
 const reset=()=>{setEditing(null);setF(empty())};
 const edit=(x:Expense)=>{setEditing(x);setF({date:x.date,category:x.category,description:x.description,amount:String(x.enteredAmount??x.amount/(x.currency==='US$'?rate:1)),currency:x.currency||'C$'});setMessage('');editor.current?.scrollIntoView({behavior:'smooth'})};
 const handleAddCategory=async()=>{
  const name=prompt('Nombre de la nueva categoría de gasto:');
  if(!name||!name.trim())return;
  if(!addExpenseCategory){alert('No se pudo guardar la nueva categoría.');return}
  try{await addExpenseCategory(name.trim());setF(prev=>({...prev,category:name.trim()}))}
  catch(err){console.error(err);alert(errMsg(err,'No se pudo guardar la nueva categoría en la nube. Inténtalo de nuevo.'))}
 };
 const handleRemoveCategoryItem=async(name:string)=>{
  if(!removeExpenseCategory){alert('No se pudo borrar la categoría.');return}
  try{
   await removeExpenseCategory(name);
   setF(prev=>prev.category===name?{...prev,category:categories.filter(c=>c!==name)[0]||''}:prev);
  }catch(err){console.error(err);alert(errMsg(err,'No se pudo borrar la categoría en la nube. Inténtalo de nuevo.'))}
 };
 const save=async(e:FormEvent)=>{e.preventDefault();if(busy)return;const original=editing?.enteredAmount??(editing?editing.amount/(editing.currency==='US$'?rate:1):0);const amount=editing&&Number(f.amount)===original&&f.currency===(editing.currency||'C$')?editing.amount:convert(f.amount,f.currency,rate);
  if(!f.description.trim()||!f.date||!Number.isFinite(amount)||amount<=0||rate<=0){setError(true);setMessage('Completa fecha, descripción y un importe válido mayor que cero.');return}
  const row:Expense={id:editing?.id||uid(),...f,description:f.description.trim(),amount,enteredAmount:Number(f.amount)};setBusy(true);try{await setExpenses(editing?expenses.map(x=>x.id===editing.id?row:x):[...expenses,row]);setError(false);setMessage(editing?'Gasto actualizado.':'Gasto registrado.');reset()}catch{setError(true);setMessage('No se pudo guardar el gasto.')}finally{setBusy(false)}
 };
 const remove=async(id:string)=>{if(!confirm('¿Borrar este gasto?'))return;setBusy(true);try{await setExpenses(expenses.filter(x=>x.id!==id));if(editing?.id===id)reset();setError(false);setMessage('Gasto eliminado.')}catch{setError(true);setMessage('No se pudo borrar el gasto.')}finally{setBusy(false)}};
 const visible=expenses.filter(x=>x.date.startsWith(month)).slice().reverse();
 return <><Message text={message} error={error}/><div className="panel editForm" ref={editor}><h2>{editing?'Editar gasto':'Registro de gastos'}</h2><form onSubmit={save}><fieldset disabled={busy} className="form grid"><Field label="Fecha"><input required type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field><label><span>Categoría <button type="button" className="addChip" onClick={handleAddCategory} title="Agregar categoría">+</button></span><ManagedSelect value={f.category} onChange={v=>setF({...f,category:v})} options={categories} onRemove={handleRemoveCategoryItem} confirmMessage={(c:string)=>`¿Borrar la categoría "${c}" de tu lista? Los gastos que ya la tienen la conservan igual — solo deja de aparecer para gastos nuevos.`}/></label><Field label="Descripción"><input required value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></Field><Field label="Monto"><input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field><CurrencyField value={f.currency} onChange={currency=>setF({...f,currency})}/><div className="actions"><button type="submit" className="btn primary">{busy?'Guardando…':editing?'Guardar cambios':'Guardar gasto'}</button>{editing&&<button type="button" className="btn" onClick={reset}>Cancelar edición</button>}</div></fieldset></form></div><div className="panel"><h2>Gastos · {month}</h2><GridTable heads={['Fecha','Categoría','Descripción','Importe','Acciones']}>{visible.map(x=><tr key={x.id}><td>{x.date}</td><td>{x.category}</td><td>{x.description}</td><td>{dual(x.amount,rate)}</td><td><div className="actions"><button className="small" disabled={busy} onClick={()=>edit(x)}>Editar</button><button className="dangerSmall" disabled={busy} onClick={()=>remove(x.id)}>Borrar</button></div></td></tr>)}</GridTable>{!visible.length&&<p className="empty">No hay gastos en este mes.</p>}</div></>;
}

export function SalesMethods({sales,month,rate,paymentMethods}:SalesProps){
 const [all,setAll]=useState(false);const visible=sales.filter(s=>all||s.date.startsWith(month));
 const methods=(paymentMethods&&paymentMethods.length)?paymentMethods:DEFAULT_METHODS;
 const groups=[...methods,'Sin clasificar'];
 const payments=sales.flatMap(s=>(s.payments||[]).map(p=>({...p,client:s.client,saleId:s.id}))).filter(p=>all||p.date.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date));
 return <><div className="panel"><h2>Ventas Transferencia Efectivo</h2><p className="muted">Este historial usa las mismas ventas y abonos de la pestaña Ventas. Se actualiza al registrar, editar o borrar. Los cobros se agrupan por la fecha y el método de cada pago.</p><Field label="Período del historial"><select value={all?'all':'month'} onChange={e=>setAll(e.target.value==='all')}><option value="month">Mes seleccionado: {month}</option><option value="all">Todo el historial</option></select></Field></div>
 <div className="paymentSummary">{groups.map(method=><div className="card" key={method}><span>{method}</span><strong>{dual(visible.filter(s=>(s.paymentMethod||'Sin clasificar')===method).reduce((n,s)=>n+s.amount,0),rate)}</strong><small>Total de ventas registradas</small><strong>{dual(payments.filter(p=>(p.method||'Sin clasificar')===method).reduce((n,p)=>n+p.amount,0),rate)}</strong><small>Cobros con detalle de pago en el período</small></div>)}</div>
 {groups.map(method=>{const rows=visible.filter(s=>(s.paymentMethod||'Sin clasificar')===method).slice().sort((a,b)=>b.date.localeCompare(a.date));return <section className={'panel historySection methodSection '+(method==='Sin clasificar'?'unclassified':methodClass(method))} key={method}><h2>{method} · {rows.length} ventas</h2>{method==='Sin clasificar'&&<p className="muted">Los registros antiguos conservan sus datos. Puedes asignar el método de la venta desde Editar en Ventas. Los abonos antiguos sin método permanecen sin clasificar.</p>}<GridTable heads={['Fecha de venta','Cliente','Trabajo','Total de venta','Cobrado (todos los métodos)','Saldo','Estado']}>{rows.map(s=><tr key={s.id}><td>{s.date}</td><td>{s.client}</td><td>{s.description||'—'}</td><td>{dual(s.amount,rate)}</td><td>{money(paid(s))}</td><td>{money(Math.max(0,s.amount-paid(s)))}</td><td><span className={'statusBadge '+(s.status==='Pagada'?'paid':s.status==='Pendiente'?'pending':'partial')}>{s.status}</span></td></tr>)}</GridTable>{!rows.length&&<p className="empty">No hay ventas en este grupo.</p>}</section>})}</>;
}

