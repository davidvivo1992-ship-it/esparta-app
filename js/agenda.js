// Metabolisme Esparta · Agenda: la setmana dia a dia
//
// Cada dia es una llista d'activitats: entrenament, cardio, dieta i, si
// l'entrenador ho ha marcat, pesatge. Es tria el dia a dalt i s'hi entra.
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;
var DIES_C = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];
var trit = null;      // dia seleccionat
var avis = null;      // avis d'un sol us
var desp = 0;         // 0 = aquesta setmana, -1 l'anterior, +1 la següent

function dataDelDia(dia, d0){
  var d = new Date(E.avui() + 'T00:00:00');
  d.setDate(d.getDate() - (E.diaSetmana(d) - 1) + (dia - 1) + (d0 === undefined ? desp : d0) * 7);
  return d;
}
function esAquestaSetmana(){ return desp === 0; }
function iso(d){ return d.toISOString().slice(0,10); }

E.seccions.push({
  id:'agenda', etiqueta:'Agenda', icona:'\u25A6',
  pinta: function(cont){
    if (!trit) trit = E.diaSetmana();
    var d1 = dataDelDia(1), d7 = dataDelDia(7);
    var rang = 'Del ' + d1.getDate() +
      (d1.getMonth() === d7.getMonth() ? '' : ' de ' + E.MESOS[d1.getMonth()]) +
      ' al ' + d7.getDate() + ' de ' + E.MESOS[d7.getMonth()];
    cont.appendChild(E.capcalera('Agenda',
      desp === 0 ? rang : rang + (desp < 0 ? ' \u00b7 setmana passada' : ' \u00b7 pròxima setmana')));
    var cos = E.cos();
    cos.appendChild(E.carregant());
    cont.appendChild(cos);
    E.carregaSetmana(function(D){
      E.buida(cos);
      pinta(cos, D);
    }, function(msg){
      E.buida(cos);
      cos.appendChild(fletxes());
      cos.appendChild(E.avis(msg, C.ambre));
    }, desp);
  }
});

// ── Anar d'una setmana a l'altra ───────────────────────────────────
function fletxes(){
  var f = h('div','display:flex;align-items:center;gap:8px;margin-bottom:16px');
  function fletxa(text, salt){
    var b = E.boto(text, function(){
      desp += salt;
      trit = desp === 0 ? E.diaSetmana() : 1;
      avis = null;
      E.repinta();
    }, 'buit');
    b.style.padding = '11px 14px';
    b.style.minHeight = '44px';
    b.style.fontSize = '12px';
    return b;
  }
  f.appendChild(fletxa('\u2039  Anterior', -1));
  if (desp !== 0){
    var b = E.boto('Aquesta setmana', function(){
      desp = 0; trit = E.diaSetmana(); avis = null; E.repinta();
    }, 'buit');
    b.style.flex = '1';
    b.style.minHeight = '44px';
    b.style.padding = '11px 10px';
    b.style.fontSize = '12px';
    b.style.borderColor = C.accio + '77';
    b.style.color = C.accio;
    f.appendChild(b);
  } else {
    f.appendChild(h('div','flex:1'));
  }
  f.appendChild(fletxa('Següent  \u203A', 1));
  return f;
}

function pinta(cos, D){
  cos.appendChild(fletxes());
  if (D.plaNom || D.setmanes > 1)
    cos.appendChild(h('div','font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;'+
      'font-weight:700;color:'+C.or+';margin-bottom:11px',
      (D.plaNom || 'Pla') + (D.setmanes > 1 ? ' \u00b7 setmana ' + D.setmana + ' de ' +
        D.setmanes : '')));

  pintaDies(cos, D);

  if (avis){
    var a = E.avis(avis, C.ambre);
    a.style.margin = '0 0 16px';
    cos.appendChild(a);
    avis = null;
  }

  var zona = h('div','display:flex;flex-direction:column;gap:9px');
  cos.appendChild(zona);
  activitats(zona, D, trit);
}

// ── Tira de dies ───────────────────────────────────────────────────
function pintaDies(cos, D){
  var g = h('div','display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:20px');
  for (var d = 1; d <= 7; d++) (function(dia){
    var p = D.dies[dia] || {};
    var avui = E.diaSetmana();
    var sel = dia === trit;
    var c = h('div','background:'+(sel ? C.panell2 : C.panell)+';cursor:pointer;'+
      'border:1px solid '+(sel ? C.accio : C.vora)+';padding:9px 2px 8px;text-align:center;'+
      '-webkit-tap-highlight-color:transparent');
    c.appendChild(h('div','font-size:9.5px;letter-spacing:.06em;font-weight:700;'+
      'text-transform:uppercase;color:'+(sel ? C.accio : C.apagat), DIES_C[dia-1]));
    c.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:16px;"+
      'line-height:1.1;margin-top:3px;color:'+(dia === avui ? C.os : C.pedra),
      String(dataDelDia(dia).getDate())));

    // Punts: una activitat, un punt
    var pendent = esAquestaSetmana() && dia < avui &&
      (p.routine_id || E.diaTeCardio(p)) && !E.acabatDia(D, dia);
    if (pendent) c.style.borderColor = C.ambre + '77';
    var punts = h('div','display:flex;gap:3px;justify-content:center;margin-top:6px;height:5px');
    var colors = [];
    if (p.routine_id) colors.push(C.accio);
    if (E.diaTeCardio(p)) colors.push(C.bronze);
    if (D.dieta && D.dieta.pla) colors.push(C.or);
    if (p.pesatge) colors.push(C.oliva);
    colors.slice(0,4).forEach(function(col){
      punts.appendChild(h('div','width:5px;height:5px;background:'+col));
    });
    c.appendChild(punts);

    c.onclick = function(){ trit = dia; avis = null; E.repinta(); };
    g.appendChild(c);
  })(d);
  cos.appendChild(g);
}

// ── Fila d'activitat ───────────────────────────────────────────────
function fila(o){
  var f = h('div','display:flex;align-items:center;gap:14px;background:'+C.panell+';'+
    'border:1px solid '+(o.fet ? C.oliva+'55' : C.vora)+';padding:15px 16px'+
    (o.accio ? ';cursor:pointer' : '')+';-webkit-tap-highlight-color:transparent');
  f.appendChild(h('div','width:42px;height:42px;flex-shrink:0;background:'+o.color+';'+
    'display:flex;align-items:center;justify-content:center;font-size:19px;'+
    'color:#0D0D0F;font-weight:700', o.icona));
  var t = h('div','flex:1;min-width:0');
  var lin = h('div','display:flex;align-items:center;gap:8px;flex-wrap:wrap');
  lin.appendChild(h('div','font-size:15.5px;font-weight:600;line-height:1.3;'+
    'color:'+(o.fet ? C.oliva : C.os), o.titol));
  if (o.marca) lin.appendChild(h('div','padding:2px 7px;font-size:9px;font-weight:700;'+
    'letter-spacing:.11em;text-transform:uppercase;color:'+o.marca.c+';'+
    'border:1px solid '+o.marca.c+'66', o.marca.t));
  t.appendChild(lin);
  if (o.sub) t.appendChild(h('div','font-size:12.5px;color:'+C.apagat+';margin-top:4px;'+
    'line-height:1.4', o.sub));
  f.appendChild(t);
  if (o.accio){
    f.appendChild(h('div','flex-shrink:0;font-size:19px;color:'+C.apagat,'\u203A'));
    f.onclick = o.accio;
  }
  return f;
}

// ── Activitats del dia triat ───────────────────────────────────────
function activitats(zona, D, dia){
  var p = D.dies[dia] || {};
  var avui = E.diaSetmana();
  var esAvui = dia === avui && esAquestaSetmana();
  // Nomes es registra a la setmana d'avui: el passat i el futur es consulten
  var potFer = esAquestaSetmana();
  // Un dia ja passat d'aquesta setmana encara es pot recuperar avui
  function recuperable(fet){
    return potFer && !fet && dia < avui ? { t:'Recuperable', c:C.ambre } : null;
  }
  var n = 0;

  // Entrenament de pesos
  if (p.routine_id){
    var rut = D.rutines[p.routine_id];
    var fet = E.acabatDia(D, dia);
    var nex = (D.exercicis[p.routine_id] || []).length;
    zona.appendChild(fila({
      icona:'\u2694', color: fet ? C.oliva : C.accio, fet: fet,
      titol: (rut && rut.nom) || 'Entrenament',
      marca: recuperable(fet),
      sub: fet ? 'Completat'
               : [rut && rut.tipus, nex + (nex === 1 ? ' exercici' : ' exercicis')]
                   .filter(Boolean).join(' \u00b7 '),
      accio: (fet || !potFer) ? null : function(){ vesAEntreno(D, dia, 'pesos'); }
    }));
    n++;
  }

  // Cardio
  if (E.diaTeCardio(p)){
    var rc = E.diaRutCardio(D, p);
    var car = null;
    (D.cardios || []).forEach(function(x){
      var dc = x.dia_previst || E.diaSetmana(new Date(x.data + 'T00:00:00'));
      if (dc === dia) car = x;
    });
    var detall = car
      ? [car.minuts ? car.minuts + ' min' : null,
         car.distancia_km ? car.distancia_km + ' km' : null].filter(Boolean).join(' \u00b7 ')
      : 'Registra-ho quan acabis';
    zona.appendChild(fila({
      icona:'\u2661', color: car ? C.oliva : C.bronze, fet: !!car,
      titol: E.diaNomCardio(D, p),
      marca: recuperable(!!car),
      sub: car ? (detall || 'Registrat')
               : (rc ? [rc.tipus, rc.rondes > 1 ? rc.rondes + ' rondes' : null,
                        '\u2248 ' + E.duradaCardio(rc, D.exercicis[rc.id] || []) + ' min']
                       .filter(Boolean).join(' \u00b7 ')
                     : detall),
      accio: (car || !potFer) ? null : function(){ vesAEntreno(D, dia, 'cardio'); }
    }));
    n++;
  }

  // Pesatge: nomes el dia que ha marcat l'entrenador. Dues coses per fer.
  if (p.pesatge){
    var reg = null;
    (D.pesatges || []).forEach(function(m){
      if (m.data === iso(dataDelDia(dia))) reg = m;
    });
    var fetM = !!(reg && reg.pes_kg != null);
    var fetF = !!(reg && (reg.foto_front || reg.foto_perfil || reg.foto_esquena));

    zona.appendChild(fila({
      icona:'\u25C8', color: fetM ? C.oliva : C.or, fet: fetM,
      titol:'Mètriques personals',
      sub: fetM ? 'Registrades \u00b7 ' + reg.pes_kg + ' kg'
                : (esAvui ? 'Pes, greix i mides'
                          : 'Toca ' + E.DIES[dia-1].toLowerCase() +
                            ' \u00b7 pots fer-ho ara'),
      accio: potFer ? function(){ E.obrePesatge(); } : null
    }));

    zona.appendChild(fila({
      icona:'\u25A3', color: fetF ? C.oliva : C.bronze, fet: fetF,
      titol:'Imatge de progrés',
      sub: fetF ? 'Fotos pujades \u00b7 toca per canviar-les'
                : (esAvui ? 'Frontal, lateral i esquena'
                          : 'Toca ' + E.DIES[dia-1].toLowerCase() +
                            ' \u00b7 pots fer-ho ara'),
      accio: potFer ? function(){ E.obreFotos(); } : null
    }));
    n += 2;
  }

  // Dieta
  if (D.dieta && D.dieta.pla){
    var pla = D.dieta.pla;
    var dData = iso(dataDelDia(dia));
    var marcats = (D.apatsTots || D.apats || []).filter(function(x){
      return x.fet && (x.data ? x.data === dData : esAvui);
    }).length;
    zona.appendChild(fila({
      icona:'\u2696', color: C.or,
      titol: pla.nom,
      sub: marcats
        ? marcats + (marcats === 1 ? ' àpat marcat' : ' àpats marcats') +
          ' \u00b7 ' + pla.kcal_obj + ' kcal'
        : (esAvui ? 'Què hi ha per menjar? \u00b7 ' + pla.kcal_obj + ' kcal'
                  : pla.kcal_obj + ' kcal objectiu'),
      accio: esAvui ? function(){ E.vesA('nutricio'); } : null
    }));
    n++;
  }

  if (!n) zona.appendChild(E.buit(esAvui
    ? 'Avui descanses. Si tens ganes, pots avançar un entreno d\'un altre dia.'
    : 'Dia de descans.'));
  else if (!potFer)
    zona.appendChild(h('div','font-size:11.5px;color:'+C.apagat+';line-height:1.5;'+
      'margin-top:4px', desp < 0
        ? 'Setmana passada: només per consultar.'
        : 'Encara no ha arribat. Torna-hi aquella setmana per registrar-ho.'));
}

function vesAEntreno(D, dia, tipus){
  if (dia !== E.diaSetmana() && E.jaEntrenatAvui(D)){
    avis = 'Avui ja has entrenat. Un entrenament al dia: demà podràs fer '+
      'el de ' + E.DIES[dia-1].toLowerCase() + '.';
    E.repinta();
    return;
  }
  E.obreDia(D, dia, tipus);
}
})();
