import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'IMPRESA · PrintControl',description:'Administración para impresión y bordado en Nicaragua'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
