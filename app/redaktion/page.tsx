import Parish from '../parish';
import {headers} from 'next/headers';
import {getEditorIdentity,isEditor} from '@/lib/editor-auth';
export const dynamic='force-dynamic';
export default async function Admin(){
 const h=await headers();
 const user=await getEditorIdentity(h);
 if(!user)return <main className="admin-login"><a href="/" className="text-link">← Zur Website</a><div className="admin-login-card"><p className="eyebrow">PFARRE SCHMELZ · REDAKTION</p><h1>Willkommen<br/>im CMS.</h1><p>Hier verwaltest du Termine, Neuigkeiten und die Inhalte der Pfarrwebsite. Melde dich mit einem freigegebenen Redaktionskonto an.</p><a className="button primary" href="/redaktion" target="_top">Anmelden →</a><small>Besucher können die Website ohne Anmeldung nutzen.</small></div></main>;
 if(!await isEditor(h))return <main className="admin-login"><div className="admin-login-card"><p className="eyebrow">REDAKTIONSZUGANG</p><h1>Kein Zugriff.</h1><p>Du bist angemeldet. Dieses Konto ist jedoch nicht für die Redaktion freigeschaltet.</p><a className="button primary" href="/cdn-cgi/access/logout" target="_top">Konto wechseln</a><a className="text-link" href="/">Zur Website</a></div></main>;
 return <Parish admin/>;
}
