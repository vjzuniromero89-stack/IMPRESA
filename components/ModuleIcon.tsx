const paths: Record<string, string> = {
 Dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 Ventas:'M3 4h2l3 12h11l2-8H6 M9 21h.01 M18 21h.01',
 'Ventas Transferencia Efectivo':'M3 7h17l-4-4 M21 17H4l4 4',
 Gastos:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
 Inventario:'m12 3 9 5v9l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v9 M7 5l10 6',
 'Detalle de Inventario':'M9 3h6v4H9z M5 5h14v16H5z M8 11h8 M8 15h5 M8 19h3',
 'Banco y Efectivo':'m3 8 9-5 9 5z M5 10v8 M10 10v8 M14 10v8 M19 10v8 M3 21h18',
 'Control de dinero':'M12 2v20 M17 6.5c0-2-2.2-3.5-5-3.5S7 4.2 7 6.5 9.2 9 17 8 17 12s-2.2 5-5 5-5-1.5-5-3.5',
 Contabilidad:'M5 3h14v18H5z M8 7h8 M8 11h1 M15 11h1 M8 15h1 M15 15h1 M8 18h1 M15 18h1',
 'Cierre de mes':'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 15l3 3 5-5',
 Deudas:'M5 4h14v16H5z M8 8h8 M8 12h4 M14 16h2',
 Cotizaciones:'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6',
 Usuarios:'M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3 M9.5 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M21 21v-3a4 4 0 0 0-3-4',
 Reportes:'M3 3v18h18 M7 16v-5 M12 16V7 M17 16v-8',
 Configuración:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
};
export default function ModuleIcon({name}:{name:string}) {
 return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]||paths.Reportes}/></svg>;
}
