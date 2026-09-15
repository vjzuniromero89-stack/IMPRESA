'use client';

import { useEffect, useMemo, useState } from 'react';

type Sale={id:string;date:string;client:string;description:string;total:number;paid:number;account:string;status:string};
type Expense={id:string;date:string;category:string;description:string;amount:number;account:string};
type Product={id:string;sku:string;name:string;stock:number;cost:number;price:number;min:number};
type Movement={id:string;date:string;type:'Ingreso'|'Salida';description:string;amount:number;account:string};
type Client={id:string;name:string;phone:string;email:string};

const sections=['Dashboard','Ventas','Cotizaciones','Producción','Clientes','Inventario','Compras','Gastos','Bancos y Caja','Por Cobrar','Por Pagar','Contabilidad','Reportes','Configuración'];
const money=(n:number,c='USD')=>new Intl.NumberFormat('es-NI',{style:'currency',currency:c}).format(n||0);
const today=()=>new Date().toISOString().slice(0,10);
const uid=(p:string)=>`${p}-${Date.now().toString().slice(-7)}`;
const seedProducts:Product[]=[
 {id:'1',sku:'G5000-BLK-L',name:'Gildan 5000 · Negro · L',stock:48,cost:4.20,price:8,min:12},
 {id:'2',sku:'G5000-WHT-M',name:'Gildan 5000 · Blanco · M',stock:62,cost:3.85,price:7.50,min:12}
];

export default function Home(){
 const [tab,setTab]=useState('Dashboard');
 const [currency,setCurrency]=useState<'USD'|'NIO'>('USD');
 const [sales,setSales]=useState<Sale[]>([]);
 const [expenses,setExpenses]=useState<Expense[]>([]);
 const [products,setProducts]=useState<Product[]>(seedProducts);
 const [moves,setMoves]=useState<Movement[]>([]);
 const [clients,setClients]=useState<Client[]>([]);
 const rate=36.8, cv=(v:number)=>currency==='USD'?v:v*rate;

 useEffect(()=>{try{
   setSales(JSON.parse(localStorage.getItem('impresa-sales')||'[]'));
   setExpenses(JSON.parse(localStorage.getItem('impresa-expenses')||'[]'));
   setProducts(JSON.parse(localStorage.getItem('impresa-products')||JSON.stringify(seedProducts)));
   setMoves(JSON.parse(localStorage.getItem('impresa-moves')||'[]'));
   setClients(JSON.parse(localStorage.getItem('impresa-clients')||'[]'));
 }catch{}},[]);
 useEffect(()=>{
   localStorage.setItem('impresa-sales',JSON.stringify(sales));
   localStorage.setItem('impresa-expenses',JSON.stringify(expenses));
   localStorage.setItem('impresa-products',JSON.stringify(products));
   localStorage.setItem('impresa-moves',JSON.stringify(moves));
   localStorage.setItem('impresa-clients',JSON.stringify(clients));
 },[sales,expenses,products,moves,clients]);

 return <div className="app">
   <aside className="side">
    <div className="brand">IMPRESA</div><div className="sub">PrintControl · Nicaragua</div>
    <div className="nav">{sections.map(s=><button key={s} className={tab===s?'active':''} onClick={()=>setTab(s)}>{s}</button>)}</div>
   </aside>
   <main className="main">
    <div className="top">
     <div className="title"><h1>{tab}</h1><p>Impresión, bordado, ventas, inventario y contabilidad.</p></div>
     <div className="actions">
      <div className="money-toggle"><button className={currency==='NIO'?'on':''} onClick={()=>setCurrency('NIO')}>C$</button><button className={currency==='USD'?'on':''} onClick={()=>setCurrency('USD')}>US$</button></div>
      <button className="btn" onClick={()=>setTab('Gastos')}>+ Gasto</button><button className="btn primary" onClick={()=>setTab('Ventas')}>+ Nueva venta</button>
     </div>
    </div>
    {tab==='Dashboard'?<Dashboard currency={currency} cv={cv} sales={sales} expenses={expenses} products={products}/>:
     tab==='Ventas'?<Sales sales={sales} setSales={setSales} setMoves={setMoves}/>:
     tab==='Gastos'?<Expenses expenses={expenses} setExpenses={setExpenses} setMoves={setMoves}/>:
     tab==='Inventario'?<Inventory products={products} setProducts={setProducts}/>:
     tab==='Bancos y Caja'?<Cash moves={moves}/>:
     tab==='Por Cobrar'?<Receivables sales={sales}/>:
     tab==='Clientes'?<Clients clients={clients} setClients={setClients}/>:
     tab==='Contabilidad'?<Accounting sales={sales} expenses={expenses} products={products}/>:
     tab==='Reportes'?<Reports sales={sales} expenses={expenses} products={products}/>:
     tab==='Configuración'?<Setup/>:<Module name={tab}/>}
   </main>
 </div>
}

function Dashboard({currency,cv,sales,expenses,products}:{currency:string;cv:(v:number)=>number;sales:Sale[];expenses:Expense[];products:Product[]}){
 const total=sales.reduce((a,b)=>a+b.total,0), paid=sales.reduce((a,b)=>a+b.paid,0), exp=expenses.reduce((a,b)=>a+b.amount,0), inv=products.reduce((a,b)=>a+b.stock*b.cost,0), due=sales.reduce((a,b)=>a+Math.max(0,b.total-b.paid),0);
 return <><div className="cards">
  <Card l="Ventas" v={cv(total)} c={currency} h={`${sales.length} órdenes`}/><Card l="Cobrado" v={cv(paid)} c={currency} h="Pagos recibidos"/><Card l="Flujo neto" v={cv(paid-exp)} c={currency} h="Cobros − gastos"/><Card l="Inventario" v={cv(inv)} c={currency} h="Valor al costo"/><Card l="Por cobrar" v={cv(due)} c={currency} h="Saldo de clientes"/><Card l="Gastos" v={cv(exp)} c={currency} h={`${expenses.length} movimientos`}/><Card l="Capital original" v={cv(4100)} c={currency} h="Aporte inicial US$4,100"/>
 </div><div className="grid2">
  <div className="panel"><h2>Ventas recientes</h2>{sales.length?<div className="tablewrap"><table className="table"><thead><tr><th>Orden</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>{sales.slice(-6).reverse().map(s=><tr key={s.id}><td>{s.id}</td><td>{s.client}</td><td>{money(cv(s.total),currency)}</td><td><span className="badge">{s.status}</span></td></tr>)}</tbody></table></div>:<Empty text="Aún no hay ventas registradas."/>}</div>
  <div><div className="panel"><h2>Alertas de inventario</h2>{products.filter(p=>p.stock<=p.min).length?products.filter(p=>p.stock<=p.min).map(p=><div className="notice" key={p.id}>{p.name}: quedan {p.stock} unidades.</div>):<Empty text="Inventario sin alertas."/ >}</div><div className="panel"><h2>Resultado operativo</h2><Row a="Ventas" b={money(cv(total),currency)}/><Row a="Gastos" b={money(cv(exp),currency)}/><Row a="Resultado" b={money(cv(total-exp),currency)}/></div></div>
 </div></>
}
function Card({l,v,c,h}:{l:string;v:number;c:string;h:string}){return <div className="card"><div className="label">{l}</div><div className="value">{money(v,c)}</div><div className="hint">{h}</div></div>}
function Row({a,b}:{a:string;b:string}){return <div className="row"><span>{a}</span><b>{b}</b></div>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
function Field({label,value,onChange,type='text'}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return <div className="field"><label>{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} /></div>}

function Sales({sales,setSales,setMoves}:{sales:Sale[];setSales:React.Dispatch<React.SetStateAction<Sale[]>>;setMoves:React.Dispatch<React.SetStateAction<Movement[]>>}){
 const [f,setF]=useState({client:'',description:'',total:'',paid:'',account:'Banco USD'});
 const save=()=>{const total=Number(f.total),paid=Number(f.paid||0);if(!f.client||total<=0)return alert('Escribe el cliente y un total válido.');const s:Sale={id:uid('V'),date:today(),client:f.client,description:f.description,total,paid,account:f.account,status:paid>=total?'Pagada':paid>0?'Pago parcial':'Pendiente'};setSales(x=>[...x,s]);if(paid>0)setMoves(x=>[...x,{id:uid('M'),date:today(),type:'Ingreso',description:`Cobro ${s.id} · ${s.client}`,amount:paid,account:f.account}]);setF({client:'',description:'',total:'',paid:'',account:'Banco USD'})};
 return <div className="panel space"><h2>Nueva venta</h2><div className="formgrid"><Field label="Cliente" value={f.client} onChange={v=>setF({...f,client:v})}/><Field label="Trabajo / descripción" value={f.description} onChange={v=>setF({...f,description:v})}/><Field label="Total US$" value={f.total} onChange={v=>setF({...f,total:v})} type="number"/><Field label="Pago recibido US$" value={f.paid} onChange={v=>setF({...f,paid:v})} type="number"/><div className="field"><label>Cuenta de cobro</label><select value={f.account} onChange={e=>setF({...f,account:e.target.value})}><option>Banco USD</option><option>Banco NIO</option><option>Caja USD</option><option>Caja NIO</option></select></div></div><button className="btn primary mt" onClick={save}>Registrar venta</button><h2 className="sectionTitle">Historial de ventas</h2><div className="tablewrap"><table className="table"><thead><tr><th>Orden</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>{sales.slice().reverse().map(s=><tr key={s.id}><td>{s.id}</td><td>{s.date}</td><td>{s.client}</td><td>{money(s.total)}</td><td>{money(s.paid)}</td><td>{money(s.total-s.paid)}</td><td><span className="badge">{s.status}</span></td></tr>)}</tbody></table></div></div>
}
function Expenses({expenses,setExpenses,setMoves}:{expenses:Expense[];setExpenses:React.Dispatch<React.SetStateAction<Expense[]>>;setMoves:React.Dispatch<React.SetStateAction<Movement[]>>}){
 const [f,setF]=useState({category:'Operativo',description:'',amount:'',account:'Caja USD'});
 const save=()=>{const amount=Number(f.amount);if(!f.description||amount<=0)return alert('Escribe una descripción y monto válido.');const e:Expense={id:uid('G'),date:today(),category:f.category,description:f.description,amount,account:f.account};setExpenses(x=>[...x,e]);setMoves(x=>[...x,{id:uid('M'),date:today(),type:'Salida',description:e.description,amount:-amount,account:e.account}]);setF({...f,description:'',amount:''})};
 return <div className="panel space"><h2>Registrar gasto</h2><div className="formgrid"><div className="field"><label>Categoría</label><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}><option>Operativo</option><option>Servicios</option><option>Transporte</option><option>Publicidad</option><option>Nómina</option><option>Otro</option></select></div><Field label="Descripción" value={f.description} onChange={v=>setF({...f,description:v})}/><Field label="Monto US$" value={f.amount} onChange={v=>setF({...f,amount:v})} type="number"/><div className="field"><label>Cuenta</label><select value={f.account} onChange={e=>setF({...f,account:e.target.value})}><option>Caja USD</option><option>Banco USD</option><option>Caja NIO</option><option>Banco NIO</option></select></div></div><button className="btn primary mt" onClick={save}>Guardar gasto</button><h2 className="sectionTitle">Gastos registrados</h2><div className="tablewrap"><table className="table"><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Cuenta</th><th>Monto</th></tr></thead><tbody>{expenses.slice().reverse().map(e=><tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.description}</td><td>{e.account}</td><td>{money(e.amount)}</td></tr>)}</tbody></table></div></div>
}
function Inventory({products,setProducts}:{products:Product[];setProducts:React.Dispatch<React.SetStateAction<Product[]>>}){
 const [f,setF]=useState({sku:'',name:'',stock:'',cost:'',price:'',min:'5'});
 const save=()=>{if(!f.sku||!f.name)return alert('SKU y producto son requeridos.');setProducts(x=>[...x,{id:uid('P'),sku:f.sku,name:f.name,stock:Number(f.stock),cost:Number(f.cost),price:Number(f.price),min:Number(f.min)}]);setF({sku:'',name:'',stock:'',cost:'',price:'',min:'5'})};
 return <div className="panel space"><h2>Inventario</h2><div className="formgrid"><Field label="SKU" value={f.sku} onChange={v=>setF({...f,sku:v})}/><Field label="Producto" value={f.name} onChange={v=>setF({...f,name:v})}/><Field label="Existencia" value={f.stock} onChange={v=>setF({...f,stock:v})} type="number"/><Field label="Costo US$" value={f.cost} onChange={v=>setF({...f,cost:v})} type="number"/><Field label="Precio US$" value={f.price} onChange={v=>setF({...f,price:v})} type="number"/><Field label="Stock mínimo" value={f.min} onChange={v=>setF({...f,min:v})} type="number"/></div><button className="btn primary mt" onClick={save}>Agregar producto</button><div className="tablewrap sectionTitle"><table className="table"><thead><tr><th>SKU</th><th>Producto</th><th>Existencia</th><th>Costo</th><th>Precio</th><th>Valor</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{p.stock<=p.min?'⚠️ ':''}{p.stock}</td><td>{money(p.cost)}</td><td>{money(p.price)}</td><td>{money(p.stock*p.cost)}</td></tr>)}</tbody></table></div></div>
}
function Cash({moves}:{moves:Movement[]}){const accounts=['Banco USD','Banco NIO','Caja USD','Caja NIO'];return <><div className="cards space">{accounts.map(a=><Card key={a} l={a} v={moves.filter(m=>m.account===a).reduce((x,m)=>x+m.amount,0)} c={a.includes('NIO')?'NIO':'USD'} h="Saldo según movimientos"/>)}</div><div className="panel"><h2>Libro de movimientos</h2><div className="tablewrap"><table className="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cuenta</th><th>Monto</th></tr></thead><tbody>{moves.slice().reverse().map(m=><tr key={m.id}><td>{m.date}</td><td>{m.type}</td><td>{m.description}</td><td>{m.account}</td><td>{money(m.amount,m.account.includes('NIO')?'NIO':'USD')}</td></tr>)}</tbody></table></div></div></>}
function Receivables({sales}:{sales:Sale[]}){const rows=sales.filter(s=>s.total>s.paid);return <div className="panel space"><h2>Cuentas por cobrar</h2><div className="tablewrap"><table className="table"><thead><tr><th>Orden</th><th>Cliente</th><th>Total</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>{rows.map(s=><tr key={s.id}><td>{s.id}</td><td>{s.client}</td><td>{money(s.total)}</td><td>{money(s.paid)}</td><td><b>{money(s.total-s.paid)}</b></td></tr>)}</tbody></table></div></div>}
function Clients({clients,setClients}:{clients:Client[];setClients:React.Dispatch<React.SetStateAction<Client[]>>}){const [f,setF]=useState({name:'',phone:'',email:''});const save=()=>{if(!f.name)return;setClients(x=>[...x,{id:uid('C'),...f}]);setF({name:'',phone:'',email:''})};return <div className="panel space"><h2>Clientes</h2><div className="formgrid"><Field label="Nombre" value={f.name} onChange={v=>setF({...f,name:v})}/><Field label="Teléfono" value={f.phone} onChange={v=>setF({...f,phone:v})}/><Field label="Correo" value={f.email} onChange={v=>setF({...f,email:v})}/></div><button className="btn primary mt" onClick={save}>Agregar cliente</button><div className="tablewrap sectionTitle"><table className="table"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Correo</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.phone}</td><td>{c.email}</td></tr>)}</tbody></table></div></div>}
function Accounting({sales,expenses,products}:{sales:Sale[];expenses:Expense[];products:Product[]}){const revenue=sales.reduce((a,s)=>a+s.total,0),exp=expenses.reduce((a,e)=>a+e.amount,0),inv=products.reduce((a,p)=>a+p.stock*p.cost,0),ar=sales.reduce((a,s)=>a+Math.max(0,s.total-s.paid),0);return <div className="grid2 space"><div className="panel"><h2>Estado de resultados</h2><Row a="Ingresos por ventas" b={money(revenue)}/><Row a="Gastos registrados" b={money(exp)}/><Row a="Resultado operativo" b={money(revenue-exp)}/></div><div className="panel"><h2>Posición del negocio</h2><Row a="Capital aportado originalmente" b={money(4100)}/><Row a="Inventario al costo" b={money(inv)}/><Row a="Cuentas por cobrar" b={money(ar)}/><div className="notice">Los US$4,100 son el capital histórico aportado. No se suman automáticamente al efectivo porque parte ya fue usada para comprar inventario y activos.</div></div></div>}
function Reports({sales,expenses,products}:{sales:Sale[];expenses:Expense[];products:Product[]}){const rev=sales.reduce((a,s)=>a+s.total,0),exp=expenses.reduce((a,e)=>a+e.amount,0),inv=products.reduce((a,p)=>a+p.stock*p.cost,0);return <div className="cards space"><Card l="Ventas acumuladas" v={rev} c="USD" h={`${sales.length} ventas`}/><Card l="Gastos acumulados" v={exp} c="USD" h={`${expenses.length} gastos`}/><Card l="Resultado" v={rev-exp} c="USD" h="Ventas − gastos"/><Card l="Inventario al costo" v={inv} c="USD" h={`${products.length} productos`}/></div>}
function Module({name}:{name:string}){return <div className="panel space"><h2>{name}</h2><Empty text="Módulo preparado para la siguiente etapa de operaciones y base de datos."/></div>}
function Setup(){return <div className="grid2 space"><div className="panel"><h2>Balance inicial</h2><div className="notice">Capital original: <b>US$4,100.00</b>. No representa el saldo bancario actual.</div><div className="formgrid mt">{['Banco USD','Banco NIO','Caja USD','Caja NIO','Inventario','Equipos','Cuentas por cobrar','Cuentas por pagar'].map(x=><div className="field" key={x}><label>{x}</label><input placeholder="0.00" type="number"/></div>)}</div><button className="btn primary mt">Guardar balance inicial</button></div><div className="panel"><h2>Empresa</h2><div className="field"><label>País</label><input value="Nicaragua" readOnly/></div><div className="field mt"><label>Moneda contable</label><select defaultValue="USD"><option value="USD">Dólar (USD)</option><option value="NIO">Córdoba (NIO)</option></select></div><div className="field mt"><label>Tipo de cambio de referencia</label><input defaultValue="36.80"/></div></div></div>}
