import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Pfarre Schmelz | Gemeinsam Glauben leben',description:'Private Testversion: Gottesdienste, Begegnungen und Termine auf der Schmelz in Wien.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="de-AT"><body>{children}</body></html>}
