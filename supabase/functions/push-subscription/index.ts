import {createClient} from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
 try{
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))throw Error('Authentification requise');
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await client.auth.getUser(auth.slice(7));if(userError||!user)throw Error('Session invalide');
  const body=await req.json();
  if(body.action==='subscribe'){
   const s=body.subscription;if(!s?.endpoint?.startsWith('https://')||s.endpoint.length>2048||!s.keys?.p256dh||!s.keys?.auth)throw Error('Abonnement invalide');
   const {error}=await client.from('push_subscriptions').upsert({user_id:user.id,endpoint:s.endpoint,p256dh:s.keys.p256dh,auth:s.keys.auth},{onConflict:'endpoint'});if(error)throw error;
  }else if(body.action==='unsubscribe'){
   const {error}=await client.from('push_subscriptions').delete().eq('user_id',user.id).eq('endpoint',body.endpoint);if(error)throw error;
  }else throw Error('Action inconnue');
  return Response.json({ok:true},{headers:cors});
 }catch(e){return Response.json({error:String(e.message||e)},{status:400,headers:cors});}
});
