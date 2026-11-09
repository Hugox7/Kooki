import {supabase} from './supabase';
const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
function decodeBase64Url(value){const base64=value.replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64+'='.repeat((4-base64.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export function pushSupported(){return Boolean(publicKey&&window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window);}
export async function enablePush(){
 if(!pushSupported())throw Error('Push indisponible : vérifiez HTTPS, la clé publique VAPID et, sur iPhone, l’installation sur l’écran d’accueil.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Autorisation des notifications refusée.');
 const registration=await navigator.serviceWorker.ready;
 let subscription=await registration.pushManager.getSubscription();
 if(subscription){const current=subscription.options.applicationServerKey;const expected=decodeBase64Url(publicKey);if(current&&Array.from(new Uint8Array(current)).join(',')!==Array.from(expected).join(',')){await subscription.unsubscribe();subscription=null;}}
 if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64Url(publicKey)});
 const {error}=await supabase.functions.invoke('push-subscription',{body:{action:'subscribe',subscription:subscription.toJSON()}});
 if(error)throw error;return true;
}
export async function disablePush(){
 const registration=await navigator.serviceWorker.ready;const subscription=await registration.pushManager.getSubscription();
 if(subscription){const {error}=await supabase.functions.invoke('push-subscription',{body:{action:'unsubscribe',endpoint:subscription.endpoint}});if(error)throw error;await subscription.unsubscribe();}
 return true;
}
