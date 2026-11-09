self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const target = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (target) { await target.focus(); target.postMessage({type:'KOOKI_REMINDER_OPEN',target:event.notification.data?.target}); }
    else await self.clients.openWindow('/');
  })());
});
self.addEventListener('push', event => {
  let payload={title:'Kooki',body:'Vous avez un rappel alimentaire.',target:'stock'};
  try { if(event.data) payload={...payload,...event.data.json()}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(payload.title,{body:payload.body,icon:'/favicon.svg',badge:'/favicon.svg',tag:payload.tag||'kooki-reminder',data:{target:payload.target}}));
});
