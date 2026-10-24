// Metabolisme Esparta · cronometre guiat de cardio
//
// Converteix una sessio dissenyada (rondes x trams x series) en una
// llista plana de passos i els va cantant. El rellotge va per marques
// de temps reals, no acumulant intervals: si el mobil s'adorm o el
// navegador retarda el temporitzador, el compte segueix quadrant.
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;

// ── Els passos, un darrere l'altre ─────────────────────────────────
function fesPassos(rc, peces){
  var rondes = Math.max(1, rc.rondes || 1);
  var passos = [];
  for (var r = 1; r <= rondes; r++){
    peces.forEach(function(p, ip){
      var series = Math.max(1, p.series || 1);
      for (var s = 1; s <= series; s++){
        passos.push({
          mena: 'feina',
          nom: (p.exercici && p.exercici.nom) || 'Tram',
          detall: E.mesuraPeca(p),
          intensitat: p.intensitat || '',
          consignes: (p.exercici && p.exercici.consignes) || '',
          imatge: ((p.exercici && p.exercici.imatges) || [])[0] || null,
          manual: p.tipus_mesura !== 'temps',
          segons: p.tipus_mesura === 'temps' ? (p.temps_s || 0) : 0,
          serie: series > 1 ? s + ' de ' + series : '',
          ronda: r, rondes: rondes
        });
        if (p.descans_s && s < series)
          passos.push({ mena:'descans', nom:'Descans', segons:p.descans_s,
                        ronda:r, rondes:rondes });
      }
      if (p.descans_post_s && ip < peces.length - 1)
        passos.push({ mena:'descans', nom:'Descans', segons:p.descans_post_s,
                      ronda:r, rondes:rondes });
    });
    if (rc.descans_ronda_s && r < rondes)
      passos.push({ mena:'descans', nom:'Descans entre rondes',
                    segons:rc.descans_ronda_s, ronda:r, rondes:rondes });
  }
  return passos;
}

// ── Xiulet i vibracio ──────────────────────────────────────────────
var au = null;
function so(hz, ms){
  try {
    if (!au) au = new (window.AudioContext || window.webkitAudioContext)();
    if (au.state === 'suspended') au.resume();
    var o = au.createOscillator(), g = au.createGain();
    o.type = 'sine'; o.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, au.currentTime);
    g.gain.exponentialRampToValueAtTime(0.22, au.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, au.currentTime + ms/1000);
    o.connect(g); g.connect(au.destination);
    o.start(); o.stop(au.currentTime + ms/1000 + 0.02);
  } catch(e){}
}
function vibra(patro){
  try { if (navigator.vibrate) navigator.vibrate(patro); } catch(e){}
}

function mmss(s){
  s = Math.max(0, Math.ceil(s));
  var m = Math.floor(s / 60);
  var r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

// ── El cronometre ──────────────────────────────────────────────────
// onAcabat(minutsReals) es crida en acabar o en sortir a mitges.
E.cronoCardio = function(rc, peces, onAcabat){
  var passos = fesPassos(rc, peces);
  if (!passos.length) return null;

  var i = 0;
  var acabaA = 0;          // marca de temps on s'acaba el pas actual
  var restaPausa = 0;      // segons que quedaven quan s'ha pausat
  var pausat = true;
  var comencat = Date.now();
  var tic = null;
  var ultimAvis = -1;
  var pany = null;

  var w = h('div','position:fixed;inset:0;z-index:60;background:'+C.fons+';'+
    'display:flex;flex-direction:column;overflow-y:auto;'+
    '-webkit-overflow-scrolling:touch');

  // Capçalera: on som
  var dalt = h('div','padding:calc(13px + env(safe-area-inset-top)) 20px 13px;'+
    'border-bottom:1px solid '+C.vora+';display:flex;align-items:center;gap:12px;'+
    'flex-shrink:0');
  var etRonda = h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
    'font-weight:700;color:'+C.or+';flex:1;min-width:0');
  dalt.appendChild(etRonda);
  var bSurt = document.createElement('button');
  bSurt.textContent = 'Sortir';
  bSurt.setAttribute('style','background:transparent;border:1px solid '+C.vora+';'+
    'color:'+C.pedra+';padding:9px 15px;min-height:44px;font-size:12px;cursor:pointer;'+
    "font-family:'Barlow',sans-serif");
  bSurt.onclick = function(){ tanca(true); };
  dalt.appendChild(bSurt);
  w.appendChild(dalt);

  // Barra de progrés de tota la sessió
  var barra = h('div','height:3px;background:'+C.panell2+';flex-shrink:0');
  var ple = h('div','height:100%;width:0%;background:'+C.oliva+';transition:width .3s');
  barra.appendChild(ple);
  w.appendChild(barra);

  var cos = h('div','flex:1;display:flex;flex-direction:column;align-items:center;'+
    'justify-content:center;padding:26px 22px;text-align:center;min-height:0');
  w.appendChild(cos);

  var etMena = h('div','font-size:11px;letter-spacing:.18em;text-transform:uppercase;'+
    'font-weight:700;margin-bottom:11px');
  cos.appendChild(etMena);

  var etNom = h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:30px;"+
    'line-height:1.15;color:'+C.os+';margin-bottom:7px');
  cos.appendChild(etNom);

  var etSub = h('div','font-size:14px;color:'+C.pedra+';line-height:1.5;margin-bottom:5px');
  cos.appendChild(etSub);

  var etInt = h('div','font-size:14px;font-weight:700;color:'+C.or+';margin-bottom:18px');
  cos.appendChild(etInt);

  var rellotge = h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:78px;"+
    'line-height:1;letter-spacing:.02em');
  cos.appendChild(rellotge);

  var etCons = h('div','font-size:13px;color:'+C.apagat+';line-height:1.55;margin-top:18px;'+
    'max-width:420px;white-space:pre-wrap');
  cos.appendChild(etCons);

  var foto = h('div','margin-top:18px;display:none');
  var imgF = document.createElement('img');
  imgF.alt = '';
  imgF.setAttribute('style','max-width:230px;max-height:170px;object-fit:cover;'+
    'border:1px solid '+C.vora);
  foto.appendChild(imgF);
  cos.appendChild(foto);

  var etSeg = h('div','font-size:12.5px;color:'+C.apagat+';margin-top:22px;line-height:1.5');
  cos.appendChild(etSeg);

  // Comandaments
  var baix = h('div','padding:16px 20px calc(20px + env(safe-area-inset-bottom));'+
    'border-top:1px solid '+C.vora+';display:flex;gap:10px;flex-shrink:0;'+
    'background:'+C.panell);
  var bAra = E.boto('Començar', function(){ pausat ? arrenca() : pausa(); });
  bAra.style.flex = '2';
  bAra.style.minHeight = '54px';
  var bSalta = E.boto('Següent', function(){ seguent(true); }, 'buit');
  bSalta.style.flex = '1';
  bSalta.style.minHeight = '54px';
  baix.appendChild(bAra);
  baix.appendChild(bSalta);
  w.appendChild(baix);

  function pas(){ return passos[i] || null; }

  function pinta(){
    var p = pas();
    if (!p) return;
    var descans = p.mena === 'descans';
    etMena.textContent = descans ? 'Descans' : 'Ara toca';
    etMena.style.color = descans ? C.bronze : C.accio;
    etNom.textContent = p.nom;
    etNom.style.color = descans ? C.pedra : C.os;

    var sub = [];
    if (!descans){
      sub.push(p.detall);
      if (p.serie) sub.push('sèrie ' + p.serie);
    }
    etSub.textContent = sub.join('  ·  ');
    etSub.style.display = sub.length ? 'block' : 'none';

    etInt.textContent = p.intensitat || '';
    etInt.style.display = p.intensitat ? 'block' : 'none';

    etCons.textContent = descans ? '' : (p.consignes || '');
    etCons.style.display = (!descans && p.consignes) ? 'block' : 'none';

    if (!descans && p.imatge){
      imgF.src = E.urlExercici(p.imatge);
      foto.style.display = 'block';
    } else {
      foto.style.display = 'none';
    }

    etRonda.textContent = p.rondes > 1
      ? 'Ronda ' + p.ronda + ' de ' + p.rondes
      : (rc.nom || 'Sessió de cardio');

    var q = passos[i+1];
    etSeg.textContent = q
      ? 'Després: ' + q.nom + (q.mena === 'descans' ? ' · ' + q.segons + ' s' : '')
      : 'Últim tram de la sessió';

    ple.style.width = Math.round(i / passos.length * 100) + '%';

    // Els trams de reps o metres no es poden comptar: els tanca l'Espartà
    if (p.manual){
      rellotge.textContent = p.detall;
      rellotge.style.color = C.oliva;
      rellotge.style.fontSize = '46px';
      bAra.textContent = 'Fet, següent';
      bSalta.style.display = 'none';
      return;
    }
    rellotge.style.fontSize = '78px';
    bSalta.style.display = 'block';
    bSalta.textContent = 'Següent';
    bAra.textContent = pausat ? (i === 0 && restaPausa === 0 ? 'Començar' : 'Continuar')
                              : 'Pausa';
    mostraTemps(pausat ? (restaPausa || p.segons) : (acabaA - Date.now())/1000);
  }

  function mostraTemps(seg){
    var p = pas();
    rellotge.textContent = mmss(seg);
    rellotge.style.color = p && p.mena === 'descans'
      ? C.bronze
      : (seg <= 3.5 ? C.accio : C.os);
  }

  function arrenca(){
    var p = pas();
    if (!p) return;
    if (p.manual){ seguent(false); return; }
    pausat = false;
    acabaA = Date.now() + (restaPausa || p.segons) * 1000;
    restaPausa = 0;
    ultimAvis = -1;
    so(760, 90); vibra(40);
    demanaPany();
    corre();
    pinta();
  }

  function pausa(){
    pausat = true;
    restaPausa = Math.max(0, (acabaA - Date.now()) / 1000);
    if (tic){ clearInterval(tic); tic = null; }
    alliberaPany();
    pinta();
  }

  function corre(){
    if (tic) clearInterval(tic);
    tic = setInterval(function(){
      var resta = (acabaA - Date.now()) / 1000;
      // Compte enrere dels tres últims segons
      var sencer = Math.ceil(resta);
      if (sencer <= 3 && sencer >= 1 && sencer !== ultimAvis){
        ultimAvis = sencer;
        so(620, 70); vibra(30);
      }
      if (resta <= 0){
        clearInterval(tic); tic = null;
        so(980, 260); vibra([60,60,60]);
        seguent(false);
        return;
      }
      mostraTemps(resta);
    }, 200);
  }

  function seguent(salta){
    if (tic){ clearInterval(tic); tic = null; }
    i++;
    restaPausa = 0;
    if (i >= passos.length) return acaba();
    if (salta) pausat = true;
    if (!pausat){
      var p = pas();
      if (p.manual){ pausat = true; pinta(); return; }
      acabaA = Date.now() + p.segons * 1000;
      ultimAvis = -1;
      corre();
    }
    pinta();
  }

  function acaba(){
    alliberaPany();
    E.buida(cos);
    ple.style.width = '100%';
    bSalta.style.display = 'none';
    etRonda.textContent = 'Sessió acabada';
    var mins = Math.max(1, Math.round((Date.now() - comencat) / 60000));
    cos.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:34px;"+
      'color:'+C.oliva+';line-height:1.15;margin-bottom:12px','Sessió completada'));
    cos.appendChild(h('div','font-size:15px;color:'+C.pedra+';line-height:1.6;max-width:380px',
      'Has estat ' + mins + (mins === 1 ? ' minut' : ' minuts') + ' en marxa. '+
      'Ara només queda registrar-la.'));
    bAra.textContent = 'Registrar la sessió';
    bAra.onclick = function(){ tanca(false, mins); };
    so(980, 200);
    setTimeout(function(){ so(1240, 320); }, 220);
    vibra([80,70,80,70,140]);
  }

  // Que la pantalla no s'apagui a mitja sessió
  function demanaPany(){
    try {
      if (!navigator.wakeLock || pany) return;
      navigator.wakeLock.request('screen').then(function(p){ pany = p; }, function(){});
    } catch(e){}
  }
  function alliberaPany(){
    try { if (pany){ pany.release(); pany = null; } } catch(e){}
  }

  function tanca(aMitges, mins){
    if (tic){ clearInterval(tic); tic = null; }
    alliberaPany();
    document.removeEventListener('visibilitychange', quanTorna);
    if (w.parentNode) w.parentNode.removeChild(w);
    if (onAcabat) onAcabat(aMitges ? null :
      (mins || Math.max(1, Math.round((Date.now() - comencat) / 60000))));
  }

  // Si el mobil s'ha adormit, el rellotge es recalcula sol en tornar
  function quanTorna(){
    if (document.hidden || pausat || !tic) return;
    var resta = (acabaA - Date.now()) / 1000;
    if (resta <= 0) seguent(false);
    else mostraTemps(resta);
  }
  document.addEventListener('visibilitychange', quanTorna);

  pinta();
  document.body.appendChild(w);
  return w;
};
})();
