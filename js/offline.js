// Metabolisme Esparta · mode sense connexio
//
// Regla: NOMES es desa al mobil el que l'Esparta escriu (series, cardio,
// pesatges). Les dades que venen del servidor no es guarden mai mes enlla
// de la sessio del dia: una fitxa de salut antiga es pitjor que cap fitxa.
//
// Cada operacio pendent te una CLAU. Si es torna a fer la mateixa cosa
// (canviar les reps d'una serie), substitueix la pendent en lloc d'apilar-se.
(function(){
var E = window.ESPARTA;

function nom(n){ return 'esparta:' + n + ':' + (E.atleta ? E.atleta.id : 'anon'); }
function llegeix(n, buit){
  try { return JSON.parse(localStorage.getItem(nom(n)) || buit); } catch(e){ return JSON.parse(buit); }
}
function desa(n, v){ try { localStorage.setItem(nom(n), JSON.stringify(v)); } catch(e){} }

// ── Memoria de la sessio del dia ───────────────────────────────────
E.llegeixCau = function(n){ return llegeix('cau:'+n, 'null'); };
E.desaCau    = function(n, v){ desa('cau:'+n, v); };

// ── Sessio d'acces, per poder obrir l'app sense xarxa ──────────────
E.desaSessio = function(perfil, atleta){
  try { localStorage.setItem('esparta:sessio',
    JSON.stringify({ perfil:perfil, atleta:atleta })); } catch(e){}
};
E.llegeixSessio = function(){
  try { return JSON.parse(localStorage.getItem('esparta:sessio') || 'null'); }
  catch(e){ return null; }
};

// ── Magatzem de fotos pendents ─────────────────────────────────────
// Les fotos no caben a localStorage: van a IndexedDB fins que pugen.
function bd(){
  return new Promise(function(ok, fail){
    var p = indexedDB.open('esparta-fotos', 1);
    p.onupgradeneeded = function(){ p.result.createObjectStore('fotos'); };
    p.onsuccess = function(){ ok(p.result); };
    p.onerror = function(){ fail(p.error || new Error('IndexedDB no disponible')); };
  });
}
function ambBd(mode, fn){
  return bd().then(function(db){
    return new Promise(function(ok, fail){
      var t = db.transaction('fotos', mode);
      var p = fn(t.objectStore('fotos'));
      t.oncomplete = function(){ ok(p && p.result); };
      t.onerror = function(){ fail(t.error); };
    });
  });
}
E.desaFoto    = function(clau, blob){ return ambBd('readwrite', function(s){ return s.put(blob, clau); }); };
E.llegeixFoto = function(clau){ return ambBd('readonly', function(s){ return s.get(clau); }); };
E.esborraFoto = function(clau){ return ambBd('readwrite', function(s){ return s.delete(clau); }); };

// ── Cua de pujada ──────────────────────────────────────────────────
function cua(){ return llegeix('cua', '[]'); }
function desaCua(c){ desa('cua', c); }
E.pendents = function(){ return cua().length; };

E.encua = function(op){
  var c = cua(), i = -1;
  op.t = Date.now();
  if (op.clau) for (var j = 0; j < c.length; j++) if (c[j].clau === op.clau) i = j;
  if (i >= 0){
    if (op.mena === 'xp') op.delta = (c[i].delta || 0) + (op.delta || 0);
    c[i] = op;
  } else c.push(op);
  desaCua(c);
  E.mostraEstat();
};

function equival(){ return llegeix('equiv', '{}'); }
function desaEquival(s){ desa('equiv', s); }

// Els identificadors provisionals ("local:...") es canvien pels reals
// a mesura que la cua puja.
function resol(op, s){
  ['dades','natural','filtre'].forEach(function(k){
    var o = op[k]; if (!o) return;
    Object.keys(o).forEach(function(c){
      var v = o[c];
      if (typeof v === 'string' && v.indexOf('local:') === 0 && s[v]) o[c] = s[v];
    });
  });
  return op;
}

function executa(op){
  if (op.mena === 'xp'){
    return E.sb.from('athletes').select('xp_total').eq('id', E.atleta.id).single()
      .then(function(r){
        if (r.error) return r;
        return E.sb.from('athletes')
          .update({ xp_total: (r.data.xp_total || 0) + (op.delta || 0) })
          .eq('id', E.atleta.id);
      });
  }
  if (op.mena === 'insert'){
    var q = E.sb.from(op.taula).insert(op.dades);
    return op.localId ? q.select('id').single() : q;
  }
  if (op.mena === 'foto'){
    var claus = Object.keys(op.fotos || {});
    var reg = { athlete_id: op.athlete_id, data: op.data };
    return Promise.all(claus.map(function(k){
      var f = op.fotos[k];
      return E.llegeixFoto(f.c).then(function(blob){
        if (!blob) return null;
        var ruta = op.athlete_id + '/' + op.data + '-' + k.replace('foto_','') + '.' + f.e;
        return E.sb.storage.from('pesatges').upload(ruta, blob, { upsert:true })
          .then(function(r){
            if (r.error) throw new Error(r.error.message);
            reg[k] = ruta;
          });
      });
    })).then(function(){
      // Si aquell dia ja hi ha pesatge, s'hi afegeixen; si no, es crea la fila
      return E.sb.from('measurements').select('id')
        .eq('athlete_id', op.athlete_id).eq('data', op.data).limit(1)
        .then(function(r){
          if (r.error) return r;
          var ja = (r.data || [])[0];
          if (ja) return E.sb.from('measurements').update(reg).eq('id', ja.id);
          reg.autor_id = op.autor_id;
          return E.sb.from('measurements').insert(reg);
        });
    }).then(function(r){
      claus.forEach(function(k){ E.esborraFoto(op.fotos[k].c).catch(function(){}); });
      return r;
    });
  }
  if (op.mena === 'upsert')
    return E.sb.from(op.taula).upsert(op.dades, { onConflict: op.onConflict });
  if (op.mena === 'natural'){
    // Busca la fila per la seva clau natural i decideix inserir o actualitzar.
    var b = E.sb.from(op.taula).select('id');
    Object.keys(op.natural).forEach(function(c){ b = b.eq(c, op.natural[c]); });
    return b.limit(1).then(function(r){
      if (r.error) return r;
      var ja = (r.data || [])[0];
      if (ja) return E.sb.from(op.taula).update(op.dades).eq('id', ja.id).select('id').single();
      var d = {};
      Object.keys(op.natural).forEach(function(c){ d[c] = op.natural[c]; });
      Object.keys(op.dades).forEach(function(c){ d[c] = op.dades[c]; });
      return E.sb.from(op.taula).insert(d).select('id').single();
    });
  }
  return Promise.resolve({ error:{ message:'Operació desconeguda' } });
}

var pujant = false;
E.buidaCua = function(){
  if (pujant || !navigator.onLine || !E.sb || !E.atleta) return Promise.resolve(0);
  if (!cua().length) return Promise.resolve(0);
  pujant = true;
  var s = equival(), fets = 0;
  E.mostraEstat();

  function seguent(){
    var c = cua();
    if (!c.length){ pujant = false; E.mostraEstat(); return fets; }
    var op = resol(c[0], s);
    return Promise.resolve(executa(op)).then(function(r){
      if (r && r.error) throw new Error(r.error.message);
      if (op.localId && r && r.data && r.data.id){
        s[op.localId] = r.data.id;
        desaEquival(s);
      }
      var q = cua();
      q.shift();
      desaCua(q);
      fets++;
      return seguent();
    });
  }

  return seguent().catch(function(){
    pujant = false;
    E.mostraEstat();
    return fets;
  });
};

// Escriu ara si hi ha xarxa; si no, ho desa al mobil.
function deXarxa(err){
  var m = ((err && err.message) || '').toLowerCase();
  return m.indexOf('fetch') !== -1 || m.indexOf('network') !== -1 ||
         m.indexOf('failed') !== -1 || m.indexOf('load') !== -1;
}
E.escriuOp = function(op){
  if (!navigator.onLine){ E.encua(op); return Promise.resolve({ local:true }); }
  return Promise.resolve(executa(op)).then(function(r){
    if (r && r.error && deXarxa(r.error)){ E.encua(op); return { local:true }; }
    return r;
  }, function(){ E.encua(op); return { local:true }; });
};

// ── Avis a dalt de la pantalla ─────────────────────────────────────
E.mostraEstat = function(){
  var n = E.pendents();
  var b = document.getElementById('esparta-estat');
  if (navigator.onLine && !n){
    if (b) b.parentNode.removeChild(b);
    document.body.style.paddingTop = '';
    return;
  }
  if (!b){
    b = document.createElement('div');
    b.id = 'esparta-estat';
    document.body.appendChild(b);
  }
  var fora = !navigator.onLine;
  b.setAttribute('style','position:fixed;left:0;right:0;top:0;z-index:60;'+
    'padding:9px 14px;text-align:center;font-size:12px;font-weight:700;'+
    "letter-spacing:.04em;font-family:'Barlow',sans-serif;color:#0D0D0F;"+
    'background:'+(fora ? E.C.ambre : E.C.oliva));
  b.textContent = fora
    ? (n ? 'Sense connexió · ' + n + (n === 1 ? ' registre desat al mòbil'
                                              : ' registres desats al mòbil')
         : 'Sense connexió · el que registris es desarà al mòbil')
    : 'Pujant ' + n + (n === 1 ? ' registre…' : ' registres…');
  document.body.style.paddingTop = '34px';
};

window.addEventListener('offline', function(){ E.mostraEstat(); });
window.addEventListener('online', function(){
  E.mostraEstat();
  E.buidaCua().then(function(fets){ if (fets) E.repinta(); });
});
})();
