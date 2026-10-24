// Metabolisme Esparta · Xat amb l'entrenador i la nutricionista
//
// Un sol fil per Esparta. Sense connexio el missatge es desa al mobil i
// puja tot sol, com les series.
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;
var fil = null;
var esborrany = '';

E.seccions.push({
  id:'xat', etiqueta:'Xat', icona:'\u2709',
  pinta: function(cont){
    cont.appendChild(E.capcalera('El teu equip',
      'Parla amb el teu entrenador i la nutricionista'));
    var cos = E.cos();
    cont.appendChild(cos);

    cos.appendChild(compositor());

    var zona = h('div','margin-top:18px');
    zona.appendChild(E.carregant());
    cos.appendChild(zona);

    if (!navigator.onLine){
      E.buida(zona);
      if (E.pendents())
        zona.appendChild(E.avis('Sense connexió. Tens missatges esperant per enviar-se: '+
          'sortiran sols quan tornis a tenir internet.', C.ambre));
      else
        zona.appendChild(E.avis('Sense connexió. Pots escriure igualment: el missatge '+
          'es desarà al mòbil i s\'enviarà sol.', C.ambre));
      return;
    }
    carrega(zona);
  }
});

// ── El comptador del rètol de pestanyes ────────────────────────────
E.comptaNoLlegits = function(){
  if (!navigator.onLine || !E.sb || !E.atleta) return;
  E.sb.from('athlete_messages').select('id,autor_id,llegit_at')
    .eq('athlete_id', E.atleta.id).is('llegit_at', null)
    .then(function(r){
      var n = (r.data || []).filter(function(m){
        return m.autor_id !== E.perfil.id;
      }).length;
      if (n === E.noLlegits) return;
      E.noLlegits = n;
      if (n) E.repinta();
    });
};

function carrega(zona){
  E.sb.from('athlete_messages')
    .select('id,cos,created_at,llegit_at,autor_id,'+
            'autor:profiles!athlete_messages_autor_id_fkey(nom,cognoms,role)')
    .eq('athlete_id', E.atleta.id).order('created_at')
    .then(function(r){
      E.buida(zona);
      if (r.error){ zona.appendChild(E.avis(r.error.message)); return; }
      fil = r.data || [];
      pintaFil(zona);
      marcaLlegits();
      // El darrer missatge es el que importa
      setTimeout(function(){ window.scrollTo(0, document.body.scrollHeight); }, 30);
    });
}

function marcaLlegits(){
  var pendents = (fil || []).filter(function(m){
    return !m.llegit_at && m.autor_id !== E.perfil.id;
  }).map(function(m){ return m.id; });
  if (!pendents.length){
    if (E.noLlegits){ E.noLlegits = 0; }
    return;
  }
  E.sb.from('athlete_messages').update({ llegit_at: new Date().toISOString() })
    .in('id', pendents).then(function(){
      E.noLlegits = 0;
    });
}

function qui(m){
  if (m.autor_id === E.perfil.id) return 'Tu';
  var a = m.autor || {};
  if (a.role === 'coach') return 'Entrenador';
  if (a.role === 'nutritionist') return 'Nutricionista';
  return E.nomComplet(a) || 'El teu equip';
}

function hora(s){
  var d = new Date(s);
  var av = new Date();
  var mateix = d.toDateString() === av.toDateString();
  var hm = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  return mateix ? hm : E.data(s) + ' \u00b7 ' + hm;
}

function pintaFil(zona){
  if (!fil.length){
    zona.appendChild(E.buit('Encara no hi ha missatges. Escriu-ne el primer: '+
      'dubtes, molèsties, com et trobes.'));
    return;
  }
  var l = h('div','display:flex;flex-direction:column;gap:11px');
  fil.forEach(function(m){
    var meu = m.autor_id === E.perfil.id;
    var f = h('div','display:flex;'+(meu ? 'justify-content:flex-end' : ''));
    var b = h('div','max-width:84%;padding:12px 14px;background:'+
      (meu ? C.panell2 : C.panell)+';border:1px solid '+
      (meu ? 'rgba(194,176,106,.24)' : C.vora)+
      (meu ? '' : ';border-left:3px solid '+C.or));
    b.appendChild(h('div','font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;'+
      'font-weight:700;color:'+(meu ? C.apagat : C.or)+';margin-bottom:6px', qui(m)));
    b.appendChild(h('div','font-size:14px;color:'+C.os+';line-height:1.55;'+
      'white-space:pre-wrap;word-break:break-word', m.cos));
    b.appendChild(h('div','font-size:10.5px;color:'+C.apagat+';margin-top:7px;text-align:right',
      hora(m.created_at)));
    f.appendChild(b);
    l.appendChild(f);
  });
  zona.appendChild(l);
}

function compositor(){
  var box = h('div','position:sticky;top:0;z-index:20;background:'+C.fons+';'+
    'padding-bottom:12px');
  var ta = document.createElement('textarea');
  ta.rows = 2;
  ta.value = esborrany;
  ta.placeholder = 'Escriu al teu equip…';
  ta.setAttribute('style','width:100%;padding:13px;background:'+C.panell+';'+
    'border:1px solid rgba(194,176,106,.24);color:'+C.os+';font-size:16px;'+
    "font-family:'Barlow',sans-serif;resize:vertical");
  ta.oninput = function(){ esborrany = ta.value; };
  box.appendChild(ta);

  var miss = h('div','margin-top:9px');
  var b = E.boto('Enviar', function(){
    var text = ta.value.trim();
    E.buida(miss);
    if (!text){ miss.appendChild(E.avis('Escriu alguna cosa abans d\'enviar.')); return; }
    b.disabled = true; b.textContent = 'Enviant…';
    E.escriuOp({ taula:'athlete_messages', mena:'insert',
      dades:{ athlete_id:E.atleta.id, autor_id:E.perfil.id, cos:text }
    }).then(function(r){
      b.disabled = false; b.textContent = 'Enviar';
      if (r && r.error){ miss.appendChild(E.avis(r.error.message)); return; }
      esborrany = '';
      ta.value = '';
      if (E.avisaEquip) E.avisaEquip('Missatge de ' + (E.perfil.nom || 'l\'Espartà'), text);
      E.repinta();
    });
  });
  b.style.width = '100%';
  b.style.marginTop = '9px';
  box.appendChild(b);
  box.appendChild(miss);
  return box;
}
})();
