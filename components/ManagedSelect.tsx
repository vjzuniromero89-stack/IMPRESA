'use client';
import {useEffect,useRef,useState} from 'react';

// Selector tipo "select" pero con lista propia: al abrir la flechita, cada
// opción de la lista trae su propia "×" roja para borrarla ahí mismo (con
// confirmación), en vez de tener que elegirla primero para poder borrarla.
// Se usa en los campos que manejan una lista guardada en la nube (Categoría
// y Talla en Inventario, Método de pago en Ventas).
export default function ManagedSelect({value,onChange,options,onRemove,emptyLabel,confirmMessage,placeholder='Selecciona…'}:{
 value:string;
 onChange:(v:string)=>void;
 options:string[];
 onRemove?:(v:string)=>void|Promise<void>;
 emptyLabel?:string;
 confirmMessage?:(v:string)=>string;
 placeholder?:string;
}){
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const onDocClick=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
  document.addEventListener('mousedown',onDocClick);
  document.addEventListener('keydown',onKey);
  return ()=>{document.removeEventListener('mousedown',onDocClick);document.removeEventListener('keydown',onKey)};
 },[]);
 const list=emptyLabel!==undefined?['',...options]:options;
 const displayText=value||emptyLabel||placeholder;
 const handleRemove=async(v:string,e:React.MouseEvent)=>{
  e.stopPropagation();
  if(!onRemove)return;
  if(!confirm(confirmMessage?confirmMessage(v):`¿Borrar "${v}" de esta lista?`))return;
  await onRemove(v);
 };
 return <div className="managedSelect" ref={ref}>
  <button type="button" className="managedSelectButton" onClick={()=>setOpen(o=>!o)} aria-haspopup="listbox" aria-expanded={open}>
   <span className={value?'':'managedSelectPlaceholder'}>{displayText}</span>
   <span className="managedSelectArrow" aria-hidden="true">▾</span>
  </button>
  {open&&<ul className="managedSelectList" role="listbox">
   {list.map(opt=><li key={opt||'—'} role="option" aria-selected={opt===value} className={'managedSelectRow'+(opt===value?' active':'')}>
    <button type="button" className="managedSelectOption" onClick={()=>{onChange(opt);setOpen(false)}}>{opt||emptyLabel}</button>
    {onRemove&&opt&&<button type="button" className="removeChip" title={`Borrar "${opt}" de la lista`} onClick={e=>handleRemove(opt,e)}>×</button>}
   </li>)}
   {!list.length&&<li className="managedSelectEmpty">Sin opciones guardadas todavía.</li>}
  </ul>}
 </div>;
}
