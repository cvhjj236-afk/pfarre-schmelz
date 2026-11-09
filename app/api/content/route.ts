import {env} from 'cloudflare:workers';
import {contentSchema,seed} from '@/lib/content';
import {editorAccessError} from '@/lib/editor-auth';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request){
 const editorView=new URL(request.url).searchParams.get('editor')==='1';
 if(editorView){const error=editorAccessError(request.headers);if(error)return error;}
 try{
  const row=await env.DB!.prepare('SELECT version,payload,updated_at FROM revisions ORDER BY version DESC LIMIT 1').first<{version:number,payload:string,updated_at:string}>();
  const content=contentSchema.parse(row?JSON.parse(row.payload):seed);
  content.pages.legal=content.pages.legal.replace('Private Testversion eines möglichen neuen Internetauftritts.','Öffentliche Testversion eines möglichen neuen Internetauftritts.');
  content.pages.privacy=content.pages.privacy.replace('Diese private Testversion','Diese Testversion').replace('Der Zugang erfolgt über ChatGPT.','Die Website ist ohne Anmeldung zugänglich. Der geschützte Redaktionsbereich verwendet die Anmeldung über ChatGPT.');
  if(!editorView){content.events=content.events.filter(e=>e.published);content.news=content.news.filter(n=>n.published);}
  return json({version:row?.version??0,content,updatedAt:row?.updated_at??null});
 }catch{return json({error:'Die Inhalte konnten nicht geladen werden. Bitte erneut versuchen.'},503)}
}
export async function PUT(request:Request){
 const accessError=editorAccessError(request.headers);if(accessError)return accessError;
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'Unzulässiger Ursprung.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON erforderlich.'},415);
 const raw=await request.text();if(raw.length>1000000)return json({error:'Die Inhalte sind zu umfangreich.'},413);
 let input;try{input=JSON.parse(raw)}catch{return json({error:'Ungültige Eingabe.'},400)}
 const parsed=contentSchema.safeParse(input.content);if(!parsed.success)return json({error:'Bitte die Felder prüfen: '+parsed.error.issues.map(i=>i.path.join('.')+' '+i.message).join('; ')},400);
 if(!Number.isSafeInteger(input.version)||input.version<0)return json({error:'Ungültige Version.'},400);
 const ids=[...parsed.data.events,...parsed.data.news,...parsed.data.services].map(v=>v.id);if(new Set(ids).size!==ids.length)return json({error:'Doppelte Datensatzkennung.'},400);
 try{const version=input.version+1;const result=await env.DB!.prepare('INSERT INTO revisions (version,payload,updated_at,author) SELECT ?,?,?,? WHERE COALESCE((SELECT MAX(version) FROM revisions),0)=?').bind(version,JSON.stringify(parsed.data),new Date().toISOString(),request.headers.get('oai-authenticated-user-id'),input.version).run();if(!result.meta.changes)return json({error:'Die Inhalte wurden inzwischen geändert. Bitte deine Änderungen kopieren und die Seite neu laden.'},409);return json({version});}catch{return json({error:'Speichern fehlgeschlagen. Bitte erneut versuchen.'},503)}
}
