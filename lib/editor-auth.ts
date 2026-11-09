import {env} from 'cloudflare:workers';

// These identity headers are set by the hosting authentication gateway.
// The allowlist remains server-side and is never included in the browser bundle.
export function isEditor(headers:Pick<Headers,'get'>):boolean {
  const userId=headers.get('oai-authenticated-user-id');
  const email=headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if(!userId||!email)return false;
  const allowed=(env.CMS_EDITOR_EMAILS??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email);
}

export function editorAccessError(headers:Pick<Headers,'get'>):Response|null {
  if(!headers.get('oai-authenticated-user-id'))return Response.json({error:'Bitte für die Bearbeitung anmelden.'},{status:401,headers:{'Cache-Control':'no-store'}});
  if(!isEditor(headers))return Response.json({error:'Dieses Konto hat keine Redaktionsberechtigung.'},{status:403,headers:{'Cache-Control':'no-store'}});
  return null;
}
