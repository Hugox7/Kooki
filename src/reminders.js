// Rappels locaux : évalués à l'ouverture / au retour dans Kooki.
// Pas de push serveur : une PWA fermée ne peut pas programmer ces rappels seule.
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dayDiff = (iso) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${localDate()}T12:00:00`)) / 86400000);
export function remindersFor(data, now = new Date()) {
  const settings = data.settings || {};
  const lead = Number.isFinite(Number(settings.reminderDays)) ? Math.max(0, Number(settings.reminderDays)) : 2;
  const expiry = (data.items || []).filter(x => x.quantity > 0 && x.expiry && dayDiff(x.expiry) <= lead);
  const last = settings.lastCheckup ? new Date(`${settings.lastCheckup}T12:00:00`) : null;
  const checkupDue = !last || (now - last) / 86400000 >= (Number(settings.checkupDays) || 7);
  const result = [];
  if (expiry.length) result.push({id:'expiry', title:`${expiry.length} aliment${expiry.length>1?'s':''} à vérifier`, body:expiry.slice(0,3).map(x=>x.name).join(', ') + (expiry.length>3?'…':'') + ' — consultez les dates dans Kooki.', target:'stock'});
  if (checkupDue && settings.checkupReminders !== false) result.push({id:'checkup', title:'Votre check-up de cuisine', body:'Prenez quelques minutes pour vérifier votre inventaire.', target:'checkup'});
  return result;
}
export async function requestRemindersPermission() {
  if (!('Notification' in window) || !window.isSecureContext) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}
export async function deliverLocalReminders(data, householdId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = localDate();
  const reminders = remindersFor(data);
  for (const reminder of reminders) {
    const key = `kooki-reminder:${householdId}:${today}:${reminder.id}`;
    if (localStorage.getItem(key)) continue;
    try {
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
      if (registration?.showNotification) await registration.showNotification(reminder.title, {body:reminder.body,tag:key,data:{target:reminder.target},icon:'/favicon.svg'});
      else new Notification(reminder.title,{body:reminder.body,tag:key});
      localStorage.setItem(key,'sent');
    } catch (error) { console.warn('Notification non envoyée', error); }
  }
}
