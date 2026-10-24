// Metabolisme Esparta · avisos push al mobil de l'Esparta
//
// L'Esparta dona permis una vegada des del seu Perfil. A partir d'aqui
// rep avis quan hi ha pla nou, dieta nova o missatge de l'equip.
(function(){
var E = window.ESPARTA;

// Clau publica VAPID. Es publica per disseny: la privada viu al servidor.
E.VAPID = 'BPewH7GsQX_kAP6sPuBKmZgObQWIXuledmJhTMrjyD-Z5CnR_94stEdXdMyhz-kaai65XJ4qzmeKB8DzjfBAEm4';

function aBytes(base64){
  var s = (base64 + '='.repeat((4 - base64.length % 4) % 4))
    .replace(/-/g,'+').replace(/_/g,'/');
  var cru = atob(s);
  var b = new Uint8Array(cru.length);
  for (var i = 0; i < cru.length; i++) b[i] = cru.charCodeAt(i);
  return b;
}
function b64(buf){
  var b = new Uint8Array(buf), s = '';
  for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

E.avisosPossibles = function(){
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};
E.avisosEstat = function(){
  if (!E.avisosPossibles()) return 'no';
  return Notification.permission;     // 'default' | 'granted' | 'denied'
};

// Demana permis i registra aquest mobil
E.avisosActiva = function(){
  if (!E.avisosPossibles()) return Promise.reject(new Error('Aquest mòbil no els admet.'));
  return Notification.requestPermission().then(function(p){
    if (p !== 'granted') throw new Error('No has donat permís per als avisos.');
    return navigator.serviceWorker.ready;
  }).then(function(reg){
    return reg.pushManager.getSubscription().then(function(ja){
      if (ja) return ja;
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: aBytes(E.VAPID)
      });
    });
  }).then(function(sub){
    var s = sub.toJSON();
    return E.sb.from('push_subscriptions').upsert({
      user_id: E.perfil.id,
      endpoint: sub.endpoint,
      p256dh: s.keys ? s.keys.p256dh : b64(sub.getKey('p256dh')),
      auth: s.keys ? s.keys.auth : b64(sub.getKey('auth')),
      plataforma: navigator.userAgent.slice(0, 120)
    }, { onConflict:'endpoint' }).then(function(r){
      if (r.error) throw new Error(r.error.message);
      return true;
    });
  });
};

E.avisosDesactiva = function(){
  return navigator.serviceWorker.ready.then(function(reg){
    return reg.pushManager.getSubscription();
  }).then(function(sub){
    if (!sub) return true;
    var punt = sub.endpoint;
    return sub.unsubscribe().then(function(){
      return E.sb.from('push_subscriptions').delete().eq('endpoint', punt);
    }).then(function(){ return true; });
  });
};

// Avisa l'equip que l'Esparta ha escrit
E.avisaEquip = function(titol, cos){
  if (!navigator.onLine || !E.sb || !E.atleta) return Promise.resolve();
  return E.sb.functions.invoke('avisa', {
    body: { athlete_id:E.atleta.id, mena:'a_equip', titol:titol, cos:cos, ruta:'espartans' }
  }).catch(function(){});
};
})();
