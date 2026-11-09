const cfg=()=>globalThis.OX_PUBLIC_CONFIG || {};
let token='';
let expiresAt=0;
let passwordSetupToken='';
const url=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'');
const headers=()=>({'Content-Type':'application/json',apikey:cfg().publishableKey});
export function configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg().supabaseUrl||'') && /^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg().publishableKey||'');}
export function loggedIn(){return Boolean(token) && Date.now()<expiresAt-10000;}
export function signOut(){token='';expiresAt=0;}
export async function signIn(email,password){
  if(!configured())throw new Error('Supabase ainda não configurado para a publicação.');
  if(!/^\S+@\S+\.\S+$/.test(email||''))throw new Error('Informe um e-mail válido.');
  const res=await fetch(url()+'/auth/v1/token?grant_type=password',{method:'POST',headers:headers(),body:JSON.stringify({email,password})});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok||!payload.access_token)throw new Error('Login não autorizado. Confira as credenciais e se a conta foi convidada.');
  token=payload.access_token;
  expiresAt=Date.now()+Math.min(Number(payload.expires_in)||3600,3600)*1000;
  return true;
}
export function readAuthLink(hash){
  const params=new URLSearchParams(String(hash||'').replace(/^#/,''));
  const type=params.get('type'),accessToken=params.get('access_token');
  if(!['invite','recovery'].includes(type)||!accessToken||accessToken.length>4096||!accessToken.includes('.'))return null;
  return {type,accessToken};
}
export function beginPasswordSetup(hash){
  const link=readAuthLink(hash);
  if(!link)return false;
  passwordSetupToken=link.accessToken;
  return true;
}
export async function requestPasswordReset(email){
  if(!configured())throw new Error('API de autenticação não configurada.');
  if(!/^\S+@\S+\.\S+$/.test(email||''))throw new Error('Informe um e-mail válido.');
  const redirectTo='https://oxprojetos.github.io/';
  const res=await fetch(url()+'/auth/v1/recover?redirect_to='+encodeURIComponent(redirectTo),
    {method:'POST',headers:headers(),body:JSON.stringify({email})});
  if(!res.ok)throw new Error('Não foi possível solicitar o link. Confira o e-mail ou tente novamente.');
  return true;
}
export async function updatePassword(newPassword){
  if(!configured())throw new Error('API de autenticação não configurada.');
  if(!passwordSetupToken)throw new Error('Link de convite/recuperação ausente ou expirado. Solicite outro.');
  if(typeof newPassword!=='string'||newPassword.length<12||newPassword.length>128)throw new Error('Use uma senha de 12 a 128 caracteres.');
  const res=await fetch(url()+'/auth/v1/user',{method:'PUT',
    headers:{...headers(),Authorization:'Bearer '+passwordSetupToken},
    body:JSON.stringify({password:newPassword})});
  if(!res.ok)throw new Error('Não foi possível definir a senha. O link pode ter expirado; solicite outro.');
  passwordSetupToken='';
  return true;
}
export async function apiFetch(path,options={}){
  if(!configured())throw new Error('API não configurada.');
  if(!loggedIn()){signOut();throw new Error('Sessão expirada. Entre novamente.');}
  if(!/^\/api\/[a-zA-Z0-9/_?=&%.,+-]+$/.test(path)||path.includes('..'))throw new Error('Rota inválida.');
  const base=url()+'/functions/v1/ox-research';
  return fetch(base+'?path='+encodeURIComponent(path),{...options,headers:{...options.headers,apikey:cfg().publishableKey,Authorization:'Bearer '+token}});
}
