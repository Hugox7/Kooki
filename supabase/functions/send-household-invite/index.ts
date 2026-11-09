import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode interdite'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
  if(!token)return reply({error:'Connexion requise'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient=createClient(url,anon);
  const {data:{user},error:authError}=await userClient.auth.getUser(token);
  if(authError||!user)return reply({error:'Session invalide'},401);
  const {household_id,email}=await req.json();
  if(typeof household_id!=='string'||! /^[0-9a-f-]{36}$/i.test(household_id)||typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))return reply({error:'Données invalides'},400);
  const apiKey=Deno.env.get('RESEND_API_KEY'),sender=Deno.env.get('KOOKI_EMAIL_FROM');
  if(!apiKey||!sender)return reply({error:'Envoi d’e-mails non configuré'},503);
  const admin=createClient(url,service);
  const {data:membership,error:memberError}=await admin.from('household_members').select('role').eq('household_id',household_id).eq('user_id',user.id).maybeSingle();
  if(memberError)throw memberError;
  if(!membership)return reply({error:'Accès refusé'},403);
  const since=new Date(Date.now()-3600000).toISOString();
  const {count,error:countError}=await admin.from('household_invite_email_attempts').select('id',{count:'exact',head:true}).eq('household_id',household_id).gte('created_at',since);
  if(countError)throw countError;
  if((count||0)>=5)return reply({error:'Limite de 5 invitations par heure atteinte'},429);
  // Claim attempt before sending. This is a basic rate limit, not a fully atomic quota.
  const {error:claimError}=await admin.from('household_invite_email_attempts').insert({household_id,sender_id:user.id});if(claimError)throw claimError;
  const {data:house,error:houseError}=await admin.from('households').select('name,invite_code,invite_code_expires_at').eq('id',household_id).single();if(houseError)throw houseError;
  if(!house.invite_code_expires_at||new Date(house.invite_code_expires_at).getTime()<=Date.now())return reply({error:'Code expiré : actualisez-le dans Kooki'},409);
  const expiry=new Date(house.invite_code_expires_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'long',timeStyle:'short'});
  const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const name=escape(house.name),code=escape(house.invite_code),date=escape(expiry);
  const appUrl=Deno.env.get('KOOKI_APP_URL')||'https://kooki.trameworks.com';
  const joinUrl=new URL(appUrl);joinUrl.searchParams.set('invite',house.invite_code);
  const safeJoinUrl=escape(joinUrl.toString());
  const html=`<div style="background:#f7f5ff;padding:36px 16px;font-family:Arial,sans-serif;color:#332b4d"><div style="max-width:480px;margin:auto;background:white;border-radius:22px;padding:32px;text-align:center"><div style="font-size:30px;font-weight:bold;color:#6c50b9">🥑 Kooki</div><h1 style="font-size:24px">Une petite place t'attend dans le frigo !</h1><p>Tu es invité(e) à rejoindre le foyer <strong>${name}</strong> sur Kooki.</p><div style="background:#f3efff;border-radius:12px;padding:18px;font-size:23px;font-weight:bold;letter-spacing:2px">${code}</div><p>Code valable jusqu'au ${date} (heure de Paris).</p><p style="margin:28px 0"><a href="${safeJoinUrl}" style="display:inline-block;background:#6c50b9;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold">Rejoindre le foyer</a></p><p>Connecte-toi ou crée ton compte, puis confirme ton arrivée dans le foyer. Tu peux aussi saisir le code manuellement.</p><small>Si tu n'attendais pas cette invitation, ignore ce message.</small></div></div>`;
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:sender,to:[email.trim()],subject:'🥑 Une invitation à rejoindre un foyer Kooki',html})});
  if(!res.ok){const body=await res.text();console.error('Resend error',res.status,body);return reply({error:'Le service e-mail a refusé l’envoi'},502)}
  return reply({ok:true});
 }catch(e){console.error('Invite email error',e);return reply({error:'Erreur serveur'},500)}
});
