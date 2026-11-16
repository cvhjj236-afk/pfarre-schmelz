import {env} from 'cloudflare:workers';

// Authentifizierung über Cloudflare Access. Access schützt /redaktion und setzt das Cookie
// CF_Authorization (bzw. den Header Cf-Access-Jwt-Assertion). Das JWT wird hier immer selbst
// gegen die Access-Schlüssel geprüft; Identitäts-Header allein werden nie vertraut.
// Konfiguration (Worker-Variablen): CF_ACCESS_TEAM_DOMAIN (z. B. team.cloudflareaccess.com),
// CF_ACCESS_AUD (Application Audience Tag), CMS_EDITOR_EMAILS (Secret, kommagetrennt).
export type EditorIdentity={id:string;email:string};

type Jwk=JsonWebKey&{kid?:string};
let keyCache:{domain:string;at:number;keys:Jwk[]}|null=null;

const b64urlToBytes=(v:string)=>{const s=v.replace(/-/g,'+').replace(/_/g,'/');const bin=atob(s+'='.repeat((4-s.length%4)%4));return Uint8Array.from(bin,c=>c.charCodeAt(0));};

async function accessKeys(domain:string):Promise<Jwk[]>{
  if(keyCache&&keyCache.domain===domain&&Date.now()-keyCache.at<600_000)return keyCache.keys;
  const res=await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if(!res.ok)throw new Error('certs');
  const keys=((await res.json()) as {keys:Jwk[]}).keys;
  keyCache={domain,at:Date.now(),keys};
  return keys;
}

function readToken(headers:Pick<Headers,'get'>):string|null{
  const direct=headers.get('cf-access-jwt-assertion');
  if(direct)return direct;
  const cookie=headers.get('cookie')??'';
  const m=cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m?m[1]:null;
}

export async function getEditorIdentity(headers:Pick<Headers,'get'>):Promise<EditorIdentity|null>{
  const domain=(env.CF_ACCESS_TEAM_DOMAIN??'').trim();
  const aud=(env.CF_ACCESS_AUD??'').trim();
  const token=readToken(headers);
  if(!domain||!aud||!token)return null;
  try{
    const [h,p,s]=token.split('.');
    if(!h||!p||!s)return null;
    const header=JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
    if(header.alg!=='RS256')return null;
    const jwk=(await accessKeys(domain)).find(k=>k.kid===header.kid);
    if(!jwk)return null;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64urlToBytes(s),new TextEncoder().encode(`${h}.${p}`));
    if(!ok)return null;
    const payload=JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    const auds=Array.isArray(payload.aud)?payload.aud:[payload.aud];
    if(!auds.includes(aud))return null;
    if(payload.iss!==`https://${domain}`)return null;
    if(typeof payload.exp!=='number'||payload.exp*1000<=Date.now())return null;
    const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';
    if(!email||!payload.sub)return null;
    return {id:String(payload.sub),email};
  }catch{return null;}
}

export async function isEditor(headers:Pick<Headers,'get'>):Promise<boolean>{
  const who=await getEditorIdentity(headers);
  if(!who)return false;
  const allowed=(env.CMS_EDITOR_EMAILS??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(who.email);
}

export async function editorAccessError(headers:Pick<Headers,'get'>):Promise<Response|null>{
  if(!await getEditorIdentity(headers))return Response.json({error:'Bitte für die Bearbeitung anmelden.'},{status:401,headers:{'Cache-Control':'no-store'}});
  if(!await isEditor(headers))return Response.json({error:'Dieses Konto hat keine Redaktionsberechtigung.'},{status:403,headers:{'Cache-Control':'no-store'}});
  return null;
}
