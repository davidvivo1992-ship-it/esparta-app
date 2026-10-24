// Metabolisme Esparta · acces i barra de pestanyes
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;
var arrel = document.getElementById('root');

function pantalla(){
  E.buida(arrel);
  var w = h('div','min-height:100vh;padding:36px 22px 30px;display:flex;'+
    'flex-direction:column;justify-content:center');
  var col = h('div','width:100%;max-width:400px;margin:0 auto');
  var cap = h('div','text-align:center;margin-bottom:28px');
  var segell = h('div','display:flex;justify-content:center;margin-bottom:15px');
  segell.appendChild(E.marca(96));
  cap.appendChild(segell);
  cap.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:14px;"+
    'letter-spacing:.2em;color:'+C.or,'METABOLISME ESPARTÀ'));
  cap.appendChild(h('div','font-size:10px;letter-spacing:.34em;color:'+C.bronze+';'+
    'margin-top:7px;font-weight:600','ΜΟΛΩΝ ΛΑΒΕ'));
  col.appendChild(cap);
  var card = h('div','background:'+C.panell+';border:1px solid '+C.vora+';'+
    'border-top:3px solid '+C.accio+';padding:22px 20px');
  col.appendChild(card);
  w.appendChild(col);
  arrel.appendChild(w);
  return card;
}

function acces(msg){
  var c = pantalla();
  c.appendChild(E.titol('Salve, Espartà', 20));
  c.appendChild(h('div','font-size:13.5px;color:'+C.apagat+';line-height:1.5;margin:7px 0 18px',
    'Entra amb el correu que et va donar el teu entrenador.'));

  var e = E.camp({ tipus:'email', marca:'El teu correu' });
  var p = E.camp({ tipus:'password', marca:'Contrasenya' });
  E.ajudaEntrada(e.control, p.control);
  var box = h('div','display:flex;flex-direction:column;gap:10px;margin-bottom:16px');
  box.appendChild(e); box.appendChild(p);
  c.appendChild(box);

  if (msg){ c.appendChild(E.avis(msg)); c.appendChild(h('div','height:14px')); }

  var b = E.boto('Entrar', function(){
    var correu = e.control.value.trim().toLowerCase();
    if (!correu || !p.control.value)
      return acces('Cal escriure el correu i la contrasenya.');
    b.disabled = true; b.textContent = 'Entrant…';
    E.sb.auth.signInWithPassword({ email:correu, password:p.control.value })
      .then(function(r){
        if (r.error) return acces(E.diuError(r.error));
        carregaPerfil();
      })
      .catch(function(err){ acces(E.diuError(err)); });
  });
  b.style.width = '100%';
  c.appendChild(b);
  p.control.onkeydown = function(ev){ if (ev.key === 'Enter') b.click(); };

  var o = h('div','margin-top:16px;text-align:center');
  var a = document.createElement('a');
  a.textContent = 'He oblidat la contrasenya';
  a.href = '#';
  a.setAttribute('style','font-size:13px;color:'+C.apagat+';text-decoration:none;'+
    'border-bottom:1px solid '+C.vora+';padding-bottom:2px');
  a.onclick = function(ev){
    ev.preventDefault();
    var correu = e.control.value.trim();
    if (!correu) return acces('Escriu primer el teu correu.');
    E.sb.auth.resetPasswordForEmail(correu.toLowerCase(),
      { redirectTo: E.URL_ATLETA })
      .then(function(r){
        if (r && r.error) return acces("No s'ha pogut enviar el correu: "
          + E.diuError(r.error));
        acces("Correu enviat a " + correu + ". Mira també la carpeta de correu brossa. "
          + "Si no arriba, demana-li la contrasenya al teu entrenador.");
      })
      .catch(function(err){
        acces("No s'ha pogut enviar el correu: " + E.diuError(err));
      });
  };
  o.appendChild(a);
  c.appendChild(o);
}

function novaContrasenya(msg){
  var c = pantalla();
  c.appendChild(E.titol('Nova contrasenya', 20));
  c.appendChild(h('div','font-size:13.5px;color:'+C.apagat+';line-height:1.5;margin:7px 0 18px',
    "Tria una contrasenya nova per entrar a partir d'ara."));
  var p1 = E.camp({ tipus:'password', marca:'Contrasenya nova' });
  var p2 = E.camp({ tipus:'password', marca:"Repeteix-la" });
  p1.control.setAttribute('autocomplete','new-password');
  p2.control.setAttribute('autocomplete','new-password');
  var box = h('div','display:flex;flex-direction:column;gap:10px;margin-bottom:16px');
  box.appendChild(p1); box.appendChild(p2);
  c.appendChild(box);
  if (msg){ c.appendChild(E.avis(msg)); c.appendChild(h('div','height:14px')); }
  var b = E.boto('Desar contrasenya', function(){
    if (p1.control.value.length < 6) { novaContrasenya('Mínim 6 caràcters.'); return; }
    if (p1.control.value !== p2.control.value) { novaContrasenya('Les contrasenyes no coincideixen.'); return; }
    b.disabled = true; b.textContent = 'Desant…';
    E.sb.auth.updateUser({ password: p1.control.value }).then(function(r){
      if (r.error){ novaContrasenya(r.error.message); return; }
      history.replaceState(null, '', location.pathname + location.search);
      carregaPerfil();
    });
  });
  b.style.width = '100%';
  c.appendChild(b);
}

function error(msg){
  var c = pantalla();
  c.appendChild(h('div','color:'+C.accio+';font-weight:700;font-size:15px;margin-bottom:8px',
    'No es pot connectar'));
  c.appendChild(h('div','font-size:13.5px;color:'+C.apagat+';line-height:1.55;'+
    'margin-bottom:18px;word-break:break-word', msg));
  var b = E.boto('Tornar a provar', function(){ arrenca(); }, 'buit');
  b.style.width = '100%';
  c.appendChild(b);
}

// ── Marc amb barra de pestanyes ────────────────────────────────────
function marc(){
  E.buida(arrel);
  var w = h('div','min-height:100vh;display:flex;flex-direction:column;'+
    'padding-bottom:calc(72px + env(safe-area-inset-bottom))');

  var franja = h('div','display:flex;align-items:center;gap:10px;'+
    'padding:calc(10px + env(safe-area-inset-top)) 20px 10px;'+
    'background:'+C.panell+';border-bottom:1px solid '+C.vora);
  franja.appendChild(E.marca(28));
  franja.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:10px;"+
    'letter-spacing:.22em;color:'+C.or,'METABOLISME ESPARTÀ'));
  w.appendChild(franja);

  var principal = h('main','flex:1;min-width:0');
  w.appendChild(principal);

  var barra = h('nav','position:fixed;left:0;right:0;bottom:0;z-index:30;'+
    'background:'+C.panell+';border-top:1px solid '+C.vora+';display:flex;'+
    'padding-bottom:env(safe-area-inset-bottom)');
  E.seccions.forEach(function(s){
    var sel = s.id === E.actual;
    var b = document.createElement('button');
    b.setAttribute('style','flex:1;min-height:60px;background:transparent;border:none;'+
      'border-top:2px solid '+(sel ? C.accio : 'transparent')+';cursor:pointer;'+
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;'+
      'padding:9px 4px;-webkit-tap-highlight-color:transparent');
    var ic = h('div','position:relative;line-height:1;display:flex');
    ic.appendChild(E.emblema(E.EMB[s.id], 21, sel ? C.accio : C.apagat));
    // Punt carmesi: hi ha missatges sense llegir
    if (s.id === 'xat' && E.noLlegits)
      ic.appendChild(h('div','position:absolute;top:-2px;right:-7px;width:8px;height:8px;'+
        'background:'+C.accio));
    b.appendChild(ic);
    b.appendChild(h('div','font-size:10px;letter-spacing:.06em;font-weight:'+
      (sel ? '700' : '500')+';color:'+(sel ? C.os : C.apagat), s.etiqueta));
    b.onclick = function(){ location.hash = s.id; };
    barra.appendChild(b);
  });
  w.appendChild(barra);

  arrel.appendChild(w);
  return principal;
}

E.capcalera = function(titol, subtitol, accions){
  var cap = h('div','padding:22px 20px 16px;border-bottom:1px solid '+C.vora);
  var f = h('div','display:flex;align-items:flex-start;justify-content:space-between;gap:14px');

  var esq = h('div','display:flex;align-items:flex-start;gap:13px;min-width:0;flex:1');
  var marc2 = h('div','width:42px;height:42px;flex-shrink:0;background:'+C.panell2+';'+
    'border:1px solid '+C.voraFort+';display:flex;align-items:center;justify-content:center');
  marc2.appendChild(E.emblema(E.EMB[E.actual], 22, C.or));
  esq.appendChild(marc2);
  var t = h('div','min-width:0');
  t.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:22px;"+
    'color:'+C.os+';line-height:1.15', titol));
  if (subtitol) t.appendChild(h('div','font-size:12.5px;color:'+C.apagat+';margin-top:4px;'+
    'line-height:1.4', subtitol));
  esq.appendChild(t);
  f.appendChild(esq);
  if (accions){
    var a = h('div','display:flex;gap:8px;flex-shrink:0');
    accions.forEach(function(x){ a.appendChild(x); });
    f.appendChild(a);
  }
  cap.appendChild(f);
  return cap;
};

E.cos = function(){ return h('div','padding:20px'); };
E.vesA = function(id){ location.hash = id; };

function pinta(){
  if (!E.perfil) return;
  var id = (location.hash || '').replace('#','') || E.seccions[0].id;
  var sec = E.seccions.filter(function(s){ return s.id === id; })[0] || E.seccions[0];
  E.actual = sec.id;
  var principal = marc();
  window.scrollTo(0, 0);
  try { sec.pinta(principal); }
  catch (err){
    principal.appendChild(E.capcalera(sec.etiqueta));
    var c = E.cos();
    c.appendChild(E.avis('Error en aquesta pantalla: ' + err.message));
    principal.appendChild(c);
  }
}
E.repinta = pinta;
window.addEventListener('hashchange', pinta);

E.sortir = function(){
  E.sb.auth.signOut().then(function(){
    E.perfil = null; E.atleta = null;
    try { localStorage.removeItem('esparta:sessio'); } catch(e){}
    arrenca();
  });
};

// L'entrenador l'ha donat de baixa. La base de dades ja no li deixa
// llegir res seu (migracio 18); aqui nomes se li diu per que, i es neteja
// la copia desada al mobil perque no torni a obrir-se sense cobertura.
E.tancatPerBaixa = function(){
  E.perfil = null; E.atleta = null;
  try { localStorage.removeItem('esparta:sessio'); } catch(e){}
  if (E.sb) E.sb.auth.signOut();
  acces("El teu accés està tancat. Si creus que és un error, parla amb el teu entrenador.");
};

function carregaPerfil(){
  // Sense xarxa: s'obre amb el perfil desat al mobil de l'ultima vegada.
  if (!navigator.onLine){
    var g = E.llegeixSessio && E.llegeixSessio();
    if (g && g.perfil && g.atleta){
      // Una baixa desada al mobil tambe tanca: si no, sense cobertura
      // s'obriria la copia de l'ultim dia que va entrar.
      if (g.atleta.estat === 'baixa') return E.tancatPerBaixa();
      E.perfil = g.perfil; E.atleta = g.atleta;
      E.mostraEstat();
      pinta();
      return;
    }
    return error('Sense connexió. La primera vegada cal entrar amb internet.');
  }
  E.sb.auth.getUser().then(function(u){
    if (!u.data || !u.data.user) return acces();
    E.sb.from('profiles').select('id,email,nom,cognoms,role')
      .eq('id', u.data.user.id).single()
      .then(function(r){
        if (r.error){
          // Sense tancar la sessio, aixo es un bucle del qual no se'n surt.
          E.sb.auth.signOut();
          return acces('Has entrat, però el teu compte no té perfil a la base de '
            + 'dades. Parla amb el teu entrenador. Detall: ' + r.error.message);
        }
        E.perfil = r.data;
        if (r.data.role !== 'athlete'){
          E.sb.auth.signOut();
          return acces('Aquest compte és de professional, no d\'Espartà. Entra des de '
            + 'la consola d\'escriptori: ' + E.URL_CONSOLA);
        }
        E.sb.from('athletes').select('*').eq('user_id', r.data.id).single()
          .then(function(a){
            if (a.error){
              return acces('El teu compte encara no té fitxa d\'Espartà. '+
                'Parla amb el teu entrenador.');
            }
            if (a.data.estat === 'baixa') return E.tancatPerBaixa();
            E.atleta = a.data;
            E.desaSessio(E.perfil, E.atleta);
            E.mostraEstat();
            E.buidaCua().then(function(fets){ if (fets) pinta(); });
            if (E.comptaNoLlegits) E.comptaNoLlegits();
            pinta();
          });
      });
  });
}

function arrenca(){
  if (typeof supabase === 'undefined')
    return error('No s\'ha pogut carregar la connexió. Comprova internet i torna a provar.');
  E.sb = supabase.createClient(E.FIX.url, E.FIX.key,
    { auth:{ persistSession:true, autoRefreshToken:true } });

  E.buida(arrel);
  arrel.appendChild(E.carregant());

  var hash = location.hash || '';
  if (hash.indexOf('error') !== -1){
    history.replaceState(null, '', location.pathname);
    return acces("L'enllaç del correu ja no serveix: ha caducat o ja s'ha fet servir. "
      + "Demana'n un de nou amb «He oblidat la contrasenya».");
  }
  E.sb.auth.onAuthStateChange(function(event){
    if (event === 'PASSWORD_RECOVERY') novaContrasenya();
  });
  if (hash.indexOf('type=recovery') !== -1){
    // Xarxa de seguretat: si l'esdeveniment no arriba, abans es quedava
    // per sempre a «Carregant...» i no hi havia manera de saber per que.
    setTimeout(function(){
      if (!E.perfil && !document.querySelector('input[type=password]'))
        acces("No s'ha pogut obrir l'enllaç del correu. Demana'n un de nou.");
    }, 6000);
    return;
  }

  E.sb.auth.getSession().then(function(s){
    if (s.data.session) carregaPerfil(); else acces();
  }, function(){
    // Ni tan sols es pot preguntar: prova el perfil desat al mobil
    carregaPerfil();
  });
}

E.arrenca = arrenca;
})();
