import {env} from 'cloudflare:workers';
import {editorAccessError} from '@/lib/editor-auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const accessError=editorAccessError(req.headers);if(accessError)return accessError;
 const version=new URL(req.url).searchParams.get('version');
 if(version){if(!/^\d+$/.test(version))return Response.json({error:'Ungültige Version'},{status:400});const row=await env.DB!.prepare('SELECT payload FROM revisions WHERE version=?').bind(Number(version)).first<{payload:string}>();return row?Response.json({content:JSON.parse(row.payload)},{headers:{'Cache-Control':'no-store'}}):Response.json({error:'Nicht gefunden'},{status:404});}
 const rows=await env.DB!.prepare('SELECT version,updated_at FROM revisions ORDER BY version DESC LIMIT 50').all();return Response.json(rows.results,{headers:{'Cache-Control':'no-store'}});
}
