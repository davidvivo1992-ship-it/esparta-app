// Metabolisme Esparta · nucli de l'aplicacio de l'Esparta (mobil)
var E = window.ESPARTA = {
  sb: null, perfil: null, atleta: null, seccions: [], actual: null,
  // Paleta del book visual: negre carbó, bronze envellit, sang fosca.
  C: {
    fons:'#0D0D0F', panell:'#16161A', panell2:'#1F2024',
    vora:'rgba(194,176,106,.16)', voraFort:'rgba(194,176,106,.4)',
    or:'#C2B06A', bronze:'#B08A5A', os:'#EAE7E1', pedra:'#A9A49B', apagat:'#8A8E95',
    carmesi:'#7A0F14', accio:'#A8231B', oliva:'#8FA04A', ambre:'#C99A2E'
  }
};

// La clau "anon public" es publica per disseny: el que protegeix les dades
// son els permisos de la base de dades, no el secret d'aquesta clau.
E.FIX = {
  url: 'https://qnmlrehtglppvgmegaem.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubWxyZWh0Z2xwcHZnbWVnYWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODI5ODgsImV4cCI6MjEwMTA1ODk4OH0.XeZ0KyuJ4W14GmesF5B5Lgzjf69zwFBBactdLqJXJfU'
};

// On viu cada aplicacio. Els enllacos dels correus han de tornar aqui.
E.URL_CONSOLA = 'https://pro.focusarchery.tech/';
E.URL_ATLETA  = 'https://app.focusarchery.tech/';

// Els errors de Supabase arriben en angles. Aqui es diuen en catala i
// s'explica que ha de fer qui els llegeix.
E.diuError = function(err){
  var m = String((err && err.message) || err || '').toLowerCase();
  if (m.indexOf('invalid login credentials') !== -1)
    return 'El correu o la contrasenya no són correctes. Demana al teu entrenador '
         + 'que te la torni a posar.';
  if (m.indexOf('email not confirmed') !== -1)
    return 'El teu compte encara no està confirmat. Parla amb el teu entrenador.';
  if (m.indexOf('rate limit') !== -1 || m.indexOf('too many') !== -1)
    return 'Massa intents seguits. Espera un minut i torna-ho a provar.';
  if (m.indexOf('failed to fetch') !== -1 || m.indexOf('networkerror') !== -1
      || m.indexOf('load failed') !== -1)
    return 'No hi ha manera d\'arribar al servidor. Comprova la connexió a internet.';
  if (m.indexOf('user not found') !== -1)
    return 'No hi ha cap compte amb aquest correu.';
  if (m.indexOf('expired') !== -1)
    return 'L\'enllaç del correu ja ha caducat. Demana\'n un de nou.';
  return (err && err.message) || 'Error desconegut.';
};

E.h = function(tag, style, text){
  var n = document.createElement(tag);
  if (style) n.setAttribute('style', style);
  if (text != null) n.textContent = text;
  return n;
};
E.buida = function(n){ while (n.firstChild) n.removeChild(n.firstChild); return n; };
E.ajudaEntrada = function(correu, contrasenya){
  correu.setAttribute('autocomplete','username');
  correu.setAttribute('inputmode','email');
  correu.setAttribute('autocapitalize','off');
  correu.setAttribute('autocorrect','off');
  correu.setAttribute('spellcheck','false');
  correu.setAttribute('name','correu');
  contrasenya.setAttribute('autocomplete','current-password');
  contrasenya.setAttribute('name','contrasenya');
};


E.camp = function(opts){
  var w = E.h('div','display:flex;flex-direction:column;gap:6px;min-width:0');
  if (opts.et) w.appendChild(E.h('div','font-size:10.5px;letter-spacing:.13em;'+
    'text-transform:uppercase;color:'+E.C.apagat+';font-weight:700', opts.et));
  var i;
  if (opts.tipus === 'select'){
    i = document.createElement('select');
    (opts.opcions || []).forEach(function(o){
      var op = document.createElement('option');
      op.value = o.v; op.textContent = o.t;
      if (opts.valor != null && String(opts.valor) === String(o.v)) op.selected = true;
      i.appendChild(op);
    });
  } else {
    i = document.createElement(opts.tipus === 'textarea' ? 'textarea' : 'input');
    if (opts.tipus === 'textarea') i.rows = opts.files || 3;
    else i.type = opts.tipus || 'text';
    if (opts.valor != null) i.value = opts.valor;
  }
  if (opts.pas) i.step = opts.pas;
  if (opts.marca) i.placeholder = opts.marca;
  i.setAttribute('style','width:100%;padding:14px;background:'+E.C.fons+';'+
    'border:1px solid rgba(194,176,106,.24);color:'+E.C.os+';font-size:16px;'+
    "font-family:'Barlow',sans-serif;border-radius:0");
  w.appendChild(i);
  w.control = i;
  return w;
};

// Objectius de toc de 44px minim: es fa servir amb guants i amb pressa.
E.boto = function(text, accio, mena){
  var b = document.createElement('button');
  b.textContent = text;
  var base = 'min-height:48px;padding:14px 22px;font-size:14px;font-weight:700;'+
    "letter-spacing:.07em;text-transform:uppercase;cursor:pointer;"+
    "font-family:'Barlow',sans-serif;border-radius:0;-webkit-tap-highlight-color:transparent;";
  if (mena === 'buit') b.setAttribute('style', base+'background:transparent;'+
    'border:1px solid rgba(194,176,106,.32);color:'+E.C.pedra);
  else b.setAttribute('style', base+'background:linear-gradient(180deg,'+E.C.accio+
    ' 0%,'+E.C.carmesi+' 100%);border:1px solid rgba(194,176,106,.45);color:#F6EFE4;'+
    'box-shadow:inset 0 1px 0 rgba(255,255,255,.09)');
  b.onclick = accio;
  return b;
};


E.ICONES = {
  casc:      ['M5 14v-2a7 7 0 0114 0v2c0 2.1-1.1 3.7-2.8 4.5v2.6h-3.3v-2.9h-1.8v2.9H7.8v-2.6C6.1 17.7 5 16.1 5 14z','M7.6 6.6C9.1 3.9 10.5 2.6 12 2.2c1.5.4 2.9 1.7 4.4 4.4','M8.6 12.4h2.2','M13.2 12.4h2.2','M12 13.4v3'],
  calendari: ['M4 6h16v15H4z','M4 11h16','M8 3v4','M16 3v4'],
  balanca:   ['M12 4v16','M7.5 20h9','M5 8h14','M5 8l-2.5 5h5z','M19 8l-2.5 5h5z'],
  grafic:    ['M3.5 21h17','M6 18v-6','M12 18V5','M18 18v-9'],
  sobre:     ['M3 6h18v13H3z','M3.5 7l8.5 6.5L20.5 7'],
  escut:     ['M12 2.5l8.5 3v6.2c0 5.4-3.6 8.6-8.5 9.8-4.9-1.2-8.5-4.4-8.5-9.8V5.5z','M9.5 12l2.5 2.5 3.5-4'],
  manuelles: ['M3 9.5v5','M6.5 7v10','M17.5 7v10','M21 9.5v5','M6.5 12h11'],
  llista:    ['M5 3.5h14v17H5z','M8.5 9h7','M8.5 13h7','M8.5 17h4'],
  diana:     ['M20.5 12a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0z','M15 12a3 3 0 11-6 0 3 3 0 016 0z','M12 3.5v3','M12 17.5v3','M3.5 12h3','M17.5 12h3'],
  espiga:    ['M12 21V8.5','M12 13.5L8.5 11','M12 13.5L15.5 11','M12 17.5L8.5 15','M12 17.5L15.5 15','M12 9.5L9 6','M12 9.5L15 6'],
  morter:    ['M4.5 10.5h15a7.5 7.5 0 01-15 0z','M12 18v3','M9 21h6','M16.5 3.5l-4 4.5'],
  llorer:    ['M12 21V9','M12 21c-4.5-2-6.5-6-6.5-10.5','M12 21c4.5-2 6.5-6 6.5-10.5','M14 3a2 2 0 11-4 0 2 2 0 014 0z'],
  persona:   ['M16 7a4 4 0 11-8 0 4 4 0 018 0z','M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7'],
  tauler:    ['M4 4h6.5v7H4z','M13.5 4h6.5v4h-6.5z','M13.5 10.5h6.5v9.5h-6.5z','M4 13.5h6.5v6.5H4z']
};

// Quin emblema li toca a cada categoria
E.EMB = {
  avui:'casc', agenda:'calendari', nutricio:'balanca', progres:'grafic',
  xat:'sobre', perfil:'escut',
  panell:'tauler', espartans:'persona', exercicis:'manuelles', rutines:'llista',
  plans:'calendari', pesatges:'diana', aliments:'espiga', receptes:'morter',
  dietes:'llorer'
};

E.emblema = function(id, mida, color){
  var d = E.ICONES[id] || E.ICONES.escut;
  mida = mida || 22;
  var s = document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 24 24');
  s.setAttribute('width', mida);
  s.setAttribute('height', mida);
  s.setAttribute('fill','none');
  s.setAttribute('stroke', color || E.C.or);
  s.setAttribute('stroke-width','1.5');
  s.setAttribute('stroke-linecap','round');
  s.setAttribute('stroke-linejoin','round');
  s.setAttribute('style','display:block;flex-shrink:0');
  d.forEach(function(p){
    var n = document.createElementNS('http://www.w3.org/2000/svg','path');
    n.setAttribute('d', p);
    s.appendChild(n);
  });
  return s;
};

// El segell dins un cercle de bronze: la marca, sempre igual
E.marca = function(mida){
  mida = mida || 34;
  var w = E.h('div','width:'+mida+'px;height:'+mida+'px;flex-shrink:0;border-radius:50%;'+
    'overflow:hidden;background:#0D0D0F;border:1px solid rgba(194,176,106,.45);'+
    'box-shadow:0 0 0 1px rgba(13,13,15,.9), 0 2px 12px rgba(0,0,0,.5)');
  var i = document.createElement('img');
  i.src = './logo.png';
  i.alt = 'Metabolisme Espartà';
  i.setAttribute('style','width:100%;height:100%;display:block;object-fit:cover');
  w.appendChild(i);
  return w;
};

E.idYoutube = function(url){
  if (!url) return null;
  var m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

E.urlExercici = function(cami){
  if (!cami) return null;
  var r = E.sb.storage.from('exercicis').getPublicUrl(cami);
  return (r && r.data && r.data.publicUrl) || null;
};

E.duradaCardio = function(rutina, peces){
  var rondes = rutina && rutina.rondes ? rutina.rondes : 1;
  var seg = 0;
  (peces || []).forEach(function(p){
    var feina = p.tipus_mesura === 'temps' ? (p.temps_s || 0) : 45;
    seg += (p.series || 1) * (feina + (p.descans_s || 0));
    seg += p.descans_post_s || 0;
  });
  seg = seg * rondes + (rondes - 1) * ((rutina && rutina.descans_ronda_s) || 0);
  return Math.max(1, Math.round(seg / 60));
};

E.mesuraPeca = function(p){
  if (p.tipus_mesura === 'temps') return (p.temps_s || 0) + ' s';
  if (p.tipus_mesura === 'distancia') return (p.distancia_m || 0) + ' m';
  return (p.reps || '\u2014') + ' reps';
};

E.titol = function(text, mida){
  return E.h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:"+(mida||19)+'px;'+
    'color:'+E.C.os+';letter-spacing:.02em', text);
};

E.etiqueta = function(text, color){
  return E.h('div','display:inline-block;padding:4px 10px;font-size:10px;font-weight:700;'+
    'letter-spacing:.1em;text-transform:uppercase;color:'+color+';'+
    'border:1px solid '+color+'55', text);
};

E.buit = function(text){
  return E.h('div','padding:34px 20px;text-align:center;color:'+E.C.apagat+';font-size:14px;'+
    'line-height:1.55;border:1px dashed rgba(194,176,106,.22)', text);
};

E.avis = function(text, color){
  return E.h('div','padding:13px 15px;background:'+(color||E.C.carmesi)+'22;'+
    'border-left:3px solid '+(color||E.C.carmesi)+';color:'+E.C.os+';font-size:13.5px;'+
    'line-height:1.5;word-break:break-word', text);
};

E.carregant = function(text){
  return E.h('div','padding:34px 20px;color:'+E.C.apagat+';font-size:14px;text-align:center',
    text || 'Carregant…');
};

// Canviar-se la contrasenya un mateix. Demana l'actual a proposit: aquesta
// sessio es queda oberta al mobil durant setmanes, i qui agafi el telefon no
// ha de poder canviar la contrasenya nomes per tenir-lo a la ma.
E.formContrasenya = function(){
  var b = E.h('div');
  var actual = E.camp({ et:'Contrasenya actual', tipus:'password' });
  var nova   = E.camp({ et:'Contrasenya nova', tipus:'password' });
  var rep    = E.camp({ et:'Repeteix la nova', tipus:'password' });
  actual.control.setAttribute('autocomplete','current-password');
  nova.control.setAttribute('autocomplete','new-password');
  rep.control.setAttribute('autocomplete','new-password');

  var caixa = E.h('div','display:flex;flex-direction:column;gap:11px;margin-bottom:13px');
  caixa.appendChild(actual); caixa.appendChild(nova); caixa.appendChild(rep);
  b.appendChild(caixa);

  var miss = E.h('div','margin-bottom:12px');
  b.appendChild(miss);

  function atura(text){
    E.buida(miss);
    miss.appendChild(E.avis(text));
    boto.disabled = false; boto.textContent = 'Desar la contrasenya';
  }

  var boto = E.boto('Desar la contrasenya', function(){
    E.buida(miss);
    boto.disabled = true; boto.textContent = 'Desant\u2026';
    if (!actual.control.value) return atura('Escriu la contrasenya d\'ara.');
    if (nova.control.value.length < 8) return atura('La nova ha de tenir 8 car\u00e0cters com a m\u00ednim.');
    if (nova.control.value !== rep.control.value) return atura('Les dues contrasenyes noves no coincideixen.');
    if (nova.control.value === actual.control.value) return atura('La nova ha de ser diferent de l\'actual.');

    E.sb.auth.signInWithPassword({ email: E.perfil.email, password: actual.control.value })
      .then(function(r){
        if (r.error) throw new Error('__ACTUAL__');
        return E.sb.auth.updateUser({ password: nova.control.value });
      })
      .then(function(r){
        boto.disabled = false; boto.textContent = 'Desar la contrasenya';
        if (r.error){ miss.appendChild(E.avis(E.diuError(r.error))); return; }
        actual.control.value = ''; nova.control.value = ''; rep.control.value = '';
        miss.appendChild(E.avis('Contrasenya canviada. La propera vegada entra amb la nova.',
          E.C.oliva));
      })
      .catch(function(err){
        boto.disabled = false; boto.textContent = 'Desar la contrasenya';
        miss.appendChild(E.avis(err && err.message === '__ACTUAL__'
          ? 'La contrasenya d\'ara no \u00e9s correcta.'
          : E.diuError(err)));
      });
  });
  boto.style.width = '100%';
  b.appendChild(boto);
  return b;
};

E.targeta = function(){
  return E.h('div','background:'+E.C.panell+';border:1px solid '+E.C.vora+';padding:17px 18px');
};

// ── Rangs de gamificacio ───────────────────────────────────────────
E.RANGS = [
  { id:'recluta',  nom:'Recluta',  xp:0 },
  { id:'hoplita',  nom:'Hoplita',  xp:500 },
  { id:'guerrer',  nom:'Guerrer',  xp:1500 },
  { id:'capita',   nom:'Capità',   xp:3500 },
  { id:'rei',      nom:'Rei',      xp:7000 }
];
E.rangDe = function(xp){
  xp = xp || 0;
  var r = E.RANGS[0];
  for (var i = 0; i < E.RANGS.length; i++) if (xp >= E.RANGS[i].xp) r = E.RANGS[i];
  return r;
};
E.seguent = function(xp){
  xp = xp || 0;
  for (var i = 0; i < E.RANGS.length; i++) if (xp < E.RANGS[i].xp) return E.RANGS[i];
  return null;
};

E.DIES = ['Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte','Diumenge'];
E.MESOS = ['gener','febrer','març','abril','maig','juny','juliol',
           'agost','setembre','octubre','novembre','desembre'];

E.nomComplet = function(p){
  if (!p) return '';
  return (p.nom||'') + (p.cognoms ? ' '+p.cognoms : '');
};
E.data = function(s){
  if (!s) return '\u2014';
  var d = new Date(s);
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+
         '/'+d.getFullYear();
};
E.avui = function(){ return new Date().toISOString().slice(0,10); };
// Dilluns = 1, diumenge = 7
E.diaSetmana = function(d){ var n = (d || new Date()).getDay(); return n === 0 ? 7 : n; };
