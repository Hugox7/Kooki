import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,service);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')||'mailto:contact@trameworks.com',Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
function dayDiff(a:string,b:string){return Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000)}
Deno.serve(async req=>{
 const secret=Deno.env.get('KOOKI_CRON_SECRET');if(!secret||req.headers.get('x-cron-secret')!==secret)return new Response('Unauthorized',{status:401});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 // Daily UTC date; reminders are evaluated once daily, not at each user's local hour.
 const today=new Date().toISOString().slice(0,10);
 const {data:rows,error}=await db.from('household_data').select('household_id,payload');if(error)throw error;
 let sent=0,failed=0;
 for(const row of rows||[]){
  const p=row.payload||{},settings=p.settings||{},lead=Number(settings.reminderDays??2);
  const exp=(p.items||[]).filter((x:any)=>Number(x.quantity)>0&&x.expiry&&dayDiff(x.expiry,today)<=lead);
  const checkup=settings.checkupReminders!==false&&(!settings.lastCheckup||dayDiff(today,settings.lastCheckup)>=Number(settings.checkupDays||7));
  const notices=[];
  if(exp.length)notices.push({kind:'expiry',title:`${exp.length} aliment(s) à vérifier`,body:exp.slice(0,3).map((x:any)=>x.name).join(', '),target:'stock'});
  if(checkup)notices.push({kind:'checkup',title:'Check-up de votre cuisine',body:'Prenez quelques minutes pour vérifier votre inventaire.',target:'checkup'});
  if(!notices.length)continue;
  const {data:members}=await db.from('household_members').select('user_id').eq('household_id',row.household_id);
  for(const member of members||[]){
   const {data:subs}=await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',member.user_id);
   for(const sub of subs||[])for(const n of notices){
    const {data:claim,error:claimError}=await db.from('push_deliveries').upsert({subscription_id:sub.id,household_id:row.household_id,kind:n.kind,delivery_date:today},{onConflict:'subscription_id,household_id,kind,delivery_date',ignoreDuplicates:true}).select('id').maybeSingle();
    if(claimError||!claim)continue;
    try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({...n,tag:`kooki-${n.kind}-${today}`}));sent++;}
    catch(e){failed++;if(e.statusCode===404||e.statusCode===410)await db.from('push_subscriptions').delete().eq('id',sub.id);else {await db.from('push_deliveries').delete().eq('id',claim.id);console.error('Push failed',e.statusCode||String(e));}}
   }
  }
 }
 return Response.json({sent,failed});
});
