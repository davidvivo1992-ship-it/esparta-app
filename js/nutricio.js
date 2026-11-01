// Metabolisme Esparta · Nutricio: el pla, les receptes i que menjo avui
//
// L'Esparta hi tria quin plat es menja de cada apat i pot obrir la recepta
// per veure'n els ingredients i com es prepara.
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;
var TIPUS = { esmorzar:'Esmorzar', mig_mati:'Mig matí', dinar:'Dinar', berenar:'Berenar',
  sopar:'Sopar', recuperador:'Recuperador' };
var ORDRE_APAT = ['esmorzar','mig_mati','dinar','berenar','sopar','recuperador'];
var vista = { mode:'llista', id:null };

// Els grams dels ingredients son el TOTAL de la recepta, per a totes les
// racions. El que es menja l'Esparta es UNA racio: per aixo tot el que es
// pinta com a apat va dividit per racions.
function macrosDe(items, mapa, racions){
  var m = { kcal:0, prot:0, carb:0, greix:0 };
  (items || []).forEach(function(it){
    var a = mapa ? mapa[it.food_id] : it.aliment;
    if (!a) return;
    var g = (Number(it.grams) || 0) / 100;
    m.kcal  += (a.kcal_100  || 0) * g;
    m.prot  += (a.prot_100  || 0) * g;
    m.carb  += (a.carb_100  || 0) * g;
    m.greix += (a.greix_100 || 0) * g;
  });
  var r = Number(racions) > 0 ? Number(racions) : 1;
  return { kcal:Math.round(m.kcal / r), prot:Math.round(m.prot / r),
           carb:Math.round(m.carb / r), greix:Math.round(m.greix / r) };
}

// Des de qualsevol pantalla es pot obrir una recepta
E.obreRecepta = function(id){
  vista = { mode:'recepta', id:id };
  if ((location.hash || '').replace('#','') === 'nutricio') E.repinta();
  else E.vesA('nutricio');
};

E.seccions.push({
  id:'nutricio', etiqueta:'Nutrició', icona:'\u2696',
  pinta: function(cont){
    if (vista.mode === 'recepta') return recepta(cont);
    if (vista.mode === 'setmana') return setmana(cont);
    if (vista.mode === 'compra')  return compra(cont);
    cont.appendChild(E.capcalera('Nutrició', 'El teu pla i què menges avui'));
    var cos = E.cos();
    cos.appendChild(E.carregant());
    cont.appendChild(cos);
    if (!navigator.onLine){
      E.buida(cos);
      cos.appendChild(E.avis('Sense connexió. El pla de dieta es llegeix del servidor: '+
        'torna-hi quan tinguis internet.', C.ambre));
      return;
    }
    carrega(cos);
  }
});

function carrega(cos){
  Promise.all([
    E.sb.from('diet_assignments')
      .select('id,data_inici,pla:diet_plans(id,nom,kcal_obj,prot_obj,carb_obj,greix_obj,notes,'+
        'diet_plan_options(tipus_apat,recipe_id,'+
        'recepta:recipes(id,nom,racions,recipe_items(food_id,grams))))')
      .eq('athlete_id', E.atleta.id).eq('estat','actiu')
      .order('created_at',{ascending:false}).limit(1),
    E.sb.from('foods').select('id,kcal_100,prot_100,carb_100,greix_100'),
    E.sb.from('meal_logs').select('tipus_apat,recipe_id,fet')
      .eq('athlete_id', E.atleta.id).eq('data', E.avui())
  ]).then(function(rr){
    var r = rr[0], mapa = {};
    (rr[1].data || []).forEach(function(a){ mapa[a.id] = a; });
    E.buida(cos);
    if (r.error){ cos.appendChild(E.avis(r.error.message)); return; }
    var a = (r.data || [])[0];
    if (!a || !a.pla){
      cos.appendChild(E.buit('Encara no tens cap pla de dieta. '+
        'La nutricionista te n\'assignarà un ben aviat.'));
      return;
    }
    pinta(cos, a, mapa, rr[2].data || []);
  });
}

function pinta(cos, a, mapa, apats){
  var x = a.pla;

  var cap = h('div','margin-bottom:18px');
  cap.appendChild(E.titol(x.nom, 21));
  cap.appendChild(h('div','font-size:12px;color:'+C.apagat+';margin-top:5px',
    'Des del ' + E.data(a.data_inici)));
  cos.appendChild(cap);

  var g = h('div','display:grid;grid-template-columns:repeat(4,1fr);gap:1px;'+
    'background:'+C.vora+';margin-bottom:22px');
  [['Kcal',x.kcal_obj,C.oliva],['Proteïna',x.prot_obj?x.prot_obj+'g':'\u2014',C.or],
   ['Carbs',x.carb_obj?x.carb_obj+'g':'\u2014',C.pedra],
   ['Greix',x.greix_obj?x.greix_obj+'g':'\u2014',C.pedra]].forEach(function(d){
    var c = h('div','background:'+C.panell+';padding:12px 6px;text-align:center');
    c.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:17px;"+
      'color:'+d[2], String(d[1])));
    c.appendChild(h('div','font-size:9px;letter-spacing:.06em;text-transform:uppercase;'+
      'color:'+C.apagat+';margin-top:4px;font-weight:700', d[0]));
    g.appendChild(c);
  });
  cos.appendChild(g);

  if (x.notes) cos.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';line-height:1.6;'+
    'white-space:pre-wrap;background:'+C.panell+';border-left:3px solid '+C.or+';'+
    'padding:12px 15px;margin-bottom:22px', x.notes));

  // Planificar la setmana i la compra: dues pantalles seves, no un apartat mes
  // de la barra de sota, que ja va plena.
  var caixaP = h('div','display:grid;grid-template-columns:1fr 1fr;gap:9px;'+
    'margin-bottom:24px');
  var bSet = E.boto('La setmana', function(){ vista = { mode:'setmana' }; E.repinta(); },
    'buit');
  var bCom = E.boto('La compra', function(){ vista = { mode:'compra' }; E.repinta(); },
    'buit');
  [bSet, bCom].forEach(function(b){ b.style.minHeight = '46px'; b.style.fontSize = '12.5px'; });
  caixaP.appendChild(bSet); caixaP.appendChild(bCom);
  cos.appendChild(caixaP);

  var grups = {};
  (x.diet_plan_options || []).forEach(function(o){
    (grups[o.tipus_apat] = grups[o.tipus_apat] || []).push(o);
  });
  var llista = ORDRE_APAT.filter(function(t){ return grups[t]; });
  if (!llista.length){
    cos.appendChild(E.buit('Aquest pla encara no té receptes assignades per àpat.'));
    return;
  }

  var logs = {};
  (apats || []).forEach(function(l){ logs[l.tipus_apat] = l; });

  llista.forEach(function(t){
    var ops = grups[t];
    var lg = logs[t] || null;
    var marcat = !!(lg && lg.fet);
    var triat = { id: (lg && lg.recipe_id) || ops[0].recipe_id };

    var capA = h('div','display:flex;align-items:baseline;justify-content:space-between;'+
      'gap:10px;margin-bottom:8px');
    capA.appendChild(h('div','font-size:10px;letter-spacing:.14em;text-transform:uppercase;'+
      'font-weight:700;color:'+(marcat ? C.oliva : C.or),
      TIPUS[t] + (ops.length > 1 ? ' \u00b7 ' + ops.length + ' opcions' : '')));
    if (marcat) capA.appendChild(h('div','font-size:11px;color:'+C.oliva,'menjat'));
    cos.appendChild(capA);

    var l = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora+';'+
      'margin-bottom:9px');
    ops.forEach(function(o){
      var esTriat = o.recipe_id === triat.id;
      var mac = o.recepta
        ? macrosDe(o.recepta.recipe_items, mapa, o.recepta.racions) : null;
      var f = h('div','background:'+C.panell+';padding:13px 15px;display:flex;'+
        'align-items:center;gap:12px;cursor:pointer;-webkit-tap-highlight-color:transparent'+
        (esTriat && ops.length > 1 ? ';border-left:3px solid '+C.or : ''));
      var tx = h('div','flex:1;min-width:0');
      tx.appendChild(h('div','font-size:14.5px;color:'+C.os+';line-height:1.35',
        (o.recepta && o.recepta.nom) || 'Recepta'));
      tx.appendChild(h('div','font-size:11.5px;color:'+C.apagat+';margin-top:3px',
        mac ? mac.kcal + ' kcal \u00b7 ' + mac.prot + 'g proteïna' : 'Veure la recepta'));
      f.appendChild(tx);
      f.appendChild(h('div','flex-shrink:0;font-size:18px;color:'+C.apagat,'\u203A'));
      f.onclick = function(){ if (o.recepta) E.obreRecepta(o.recepta.id); };
      l.appendChild(f);
    });
    cos.appendChild(l);

    // Que menjo avui d'aquest apat
    var zona = h('div','margin-bottom:22px');
    var sel = null;
    if (ops.length > 1){
      sel = E.camp({ tipus:'select', valor:triat.id,
        opcions: ops.map(function(o){
          return { v:o.recipe_id, t:(o.recepta && o.recepta.nom) || 'Recepta' };
        }) });
      sel.style.marginBottom = '9px';
      zona.appendChild(sel);
    }
    var b = E.boto(marcat ? 'Fet \u2713 \u00b7 toca per desmarcar' : 'Avui menjo això',
      function(){
        b.disabled = true; b.textContent = 'Desant…';
        var id = sel ? sel.control.value : triat.id;
        E.escriuOp({ clau:'apat:'+E.avui()+':'+t, taula:'meal_logs', mena:'upsert',
          onConflict:'athlete_id,data,tipus_apat',
          dades:{ athlete_id:E.atleta.id, data:E.avui(), tipus_apat:t,
                  recipe_id:id, fet: !marcat } }).then(function(r){
          if (r && r.error){
            b.disabled = false;
            b.textContent = marcat ? 'Fet \u2713 \u00b7 toca per desmarcar' : 'Avui menjo això';
            zona.appendChild(E.avis(r.error.message));
            return;
          }
          E.desaCau('panell', null);
          E.repinta();
        });
      }, marcat ? 'buit' : null);
    b.style.width = '100%';
    b.style.minHeight = '46px';
    b.style.fontSize = '12.5px';
    if (marcat){ b.style.borderColor = C.oliva + '77'; b.style.color = C.oliva; }
    zona.appendChild(b);
    cos.appendChild(zona);
  });
}

// ── Una recepta: ingredients i preparacio ──────────────────────────
function recepta(cont){
  var b = E.boto('Tornar', function(){
    vista = { mode:'llista', id:null }; E.repinta();
  }, 'buit');
  b.style.padding = '10px 15px'; b.style.minHeight = '42px'; b.style.fontSize = '12px';
  cont.appendChild(E.capcalera('Recepta', null, [b]));
  var cos = E.cos();
  cos.appendChild(E.carregant());
  cont.appendChild(cos);

  if (!navigator.onLine){
    E.buida(cos);
    cos.appendChild(E.avis('Sense connexió. Les receptes es llegeixen del servidor.', C.ambre));
    return;
  }

  E.sb.from('recipes')
    .select('id,nom,tipus_apat,racions,instruccions,'+
      'recipe_items(grams,aliment:foods(nom,categoria,kcal_100,prot_100,carb_100,greix_100))')
    .eq('id', vista.id).single()
    .then(function(r){
      E.buida(cos);
      if (r.error){ cos.appendChild(E.avis(r.error.message)); return; }
      var x = r.data;
      var items = x.recipe_items || [];
      var rac = Number(x.racions) > 0 ? Number(x.racions) : 1;
      // El que surt gros es el que es menja ell: una racio.
      var mac = macrosDe(items, null, rac);

      var cap = h('div','margin-bottom:16px');
      cap.appendChild(E.titol(x.nom, 22));
      var sub = [TIPUS[x.tipus_apat] || x.tipus_apat,
                 rac + (rac === 1 ? ' ració' : ' racions')].filter(Boolean).join(' \u00b7 ');
      cap.appendChild(h('div','font-size:12.5px;color:'+C.apagat+';margin-top:5px', sub));
      cos.appendChild(cap);

      var g = h('div','display:grid;grid-template-columns:repeat(4,1fr);gap:1px;'+
        'background:'+C.vora+';margin-bottom:20px');
      [['Kcal',mac.kcal,C.oliva],['Prot',mac.prot+'g',C.or],
       ['Carbs',mac.carb+'g',C.pedra],['Greix',mac.greix+'g',C.pedra]].forEach(function(d){
        var c = h('div','background:'+C.panell+';padding:12px 6px;text-align:center');
        c.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:17px;"+
          'color:'+d[2], String(d[1])));
        c.appendChild(h('div','font-size:9px;letter-spacing:.06em;text-transform:uppercase;'+
          'color:'+C.apagat+';margin-top:4px;font-weight:700', d[0]));
        g.appendChild(c);
      });
      cos.appendChild(g);
      if (rac > 1)
        cos.appendChild(h('div','font-size:12px;color:'+C.apagat+';margin:-12px 0 20px;'+
          'line-height:1.5', 'Per ració. La recepta en fa ' + rac + ': en total, ' +
          (mac.kcal * rac) + ' kcal. Els ingredients de sota són per a les ' +
          rac + ' racions.'));

      cos.appendChild(h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
        'font-weight:700;color:'+C.or+';margin-bottom:10px','Ingredients'));
      if (!items.length) cos.appendChild(E.buit('Aquesta recepta encara no té ingredients.'));
      else {
        var l = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora);
        items.forEach(function(it){
          var f = h('div','background:'+C.panell+';padding:13px 15px;display:flex;'+
            'justify-content:space-between;align-items:baseline;gap:12px');
          var tx = h('div','flex:1;min-width:0');
          tx.appendChild(h('div','font-size:14.5px;color:'+C.os+';line-height:1.35',
            (it.aliment && it.aliment.nom) || 'Aliment'));
          if (it.aliment && it.aliment.categoria)
            tx.appendChild(h('div','font-size:11px;color:'+C.apagat+';margin-top:3px',
              it.aliment.categoria));
          f.appendChild(tx);
          f.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:15px;"+
            'color:'+C.pedra+';flex-shrink:0', (it.grams || 0) + ' g'));
          l.appendChild(f);
        });
        cos.appendChild(l);
      }

      if (x.instruccions){
        cos.appendChild(h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
          'font-weight:700;color:'+C.or+';margin:24px 0 10px','Preparació'));
        cos.appendChild(h('div','font-size:14px;color:'+C.pedra+';line-height:1.65;'+
          'white-space:pre-wrap;background:'+C.panell+';padding:15px 16px;'+
          'border:1px solid '+C.vora, x.instruccions));
      }
    });
}

// ═══════════════════════════════════════
//  LA SETMANA D'APATS I LA LLISTA DE LA COMPRA
//
//  Les dues taules (meal_selections i shopping_list_items) existien a
//  l'esquema des del primer dia, amb permisos i tot, i no les feia servir
//  ningu. Aixo nomes hi posa pantalla.
//
//  La llista NO es guarda calculada: es torna a sumar cada cop a partir de
//  meal_selections. De shopping_list_items nomes en surt el "ja ho tinc", que
//  es l'unic que la suma no pot saber. Aixi no pot quedar desfasada quan es
//  canvia el que es menjara.
// ═══════════════════════════════════════

var diaTriat = null;

function setmanaISO(d){
  var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var dia = t.getUTCDay() || 7;            // dilluns 1 ... diumenge 7
  t.setUTCDate(t.getUTCDate() + 4 - dia);  // el dijous mana l'any de la setmana
  var any = t.getUTCFullYear();
  var cap = new Date(Date.UTC(any, 0, 1));
  var n = Math.ceil((((t - cap) / 86400000) + 1) / 7);
  return any + '-W' + (n < 10 ? '0' + n : String(n));
}

// Al super no es compren 243 g: es compren 250
function arrodoneix(g){
  if (g >= 100) return Math.round(g / 10) * 10;
  if (g >= 20)  return Math.round(g / 5) * 5;
  return Math.round(g);
}

// unitat_ref es text lliure de la consola, del tipus "1 ou ~ 55 g". Si te
// aquesta forma, la llista pot parlar d'ous en lloc de grams. Si no, grams.
function unitatDe(txt){
  if (!txt) return null;
  var m = String(txt).match(/^\s*1\s+(.+?)\s*[\u2248=~]\s*(\d+(?:[.,]\d+)?)\s*g/i);
  if (!m) return null;
  var g = parseFloat(m[2].replace(',', '.'));
  if (!(g > 0)) return null;
  return { nom:m[1].trim(), grams:g };
}

function tornar(){
  var b = E.boto('Tornar', function(){
    vista = { mode:'llista', id:null }; E.repinta();
  }, 'buit');
  b.style.padding = '10px 15px'; b.style.minHeight = '42px'; b.style.fontSize = '12px';
  return b;
}

function senseConnexio(cos, que){
  E.buida(cos);
  cos.appendChild(E.avis('Sense connexi\u00f3. ' + que + ' es llegeix del servidor: ' +
    'torna-hi quan tinguis internet.', C.ambre));
}

// -- Planificar la setmana -----------------------------------------
function setmana(cont){
  cont.appendChild(E.capcalera('La setmana', 'Tria qu\u00e8 menjar\u00e0s cada dia', [tornar()]));
  var cos = E.cos();
  cos.appendChild(E.carregant());
  cont.appendChild(cos);
  if (!navigator.onLine) return senseConnexio(cos, 'El pla de dieta');

  Promise.all([
    E.sb.from('diet_assignments')
      .select('pla:diet_plans(kcal_obj,diet_plan_options(tipus_apat,recipe_id,' +
        'recepta:recipes(id,nom,racions,recipe_items(food_id,grams))))')
      .eq('athlete_id', E.atleta.id).eq('estat','actiu')
      .order('created_at',{ascending:false}).limit(1),
    E.sb.from('meal_selections').select('dia_setmana,tipus_apat,recipe_id')
      .eq('athlete_id', E.atleta.id),
    E.sb.from('foods').select('id,kcal_100,prot_100,carb_100,greix_100')
  ]).then(function(rr){
    E.buida(cos);
    if (rr[0].error){ cos.appendChild(E.avis(rr[0].error.message)); return; }
    var a = (rr[0].data || [])[0];
    var pla = a && a.pla;
    if (!pla || !(pla.diet_plan_options || []).length){
      cos.appendChild(E.buit('Encara no tens cap pla de dieta amb receptes. ' +
        'La nutricionista te n\'assignar\u00e0 un ben aviat.'));
      return;
    }
    var mapa = {};
    (rr[2].data || []).forEach(function(f){ mapa[f.id] = f; });

    var grups = {};
    (pla.diet_plan_options || []).forEach(function(o){
      (grups[o.tipus_apat] = grups[o.tipus_apat] || []).push(o);
    });
    var apats = ORDRE_APAT.filter(function(t){ return grups[t]; });

    var tria = {};
    (rr[1].data || []).forEach(function(x){
      tria[x.dia_setmana + ':' + x.tipus_apat] = x.recipe_id;
    });

    if (!diaTriat) diaTriat = E.diaSetmana();
    pintaSetmana(cos, apats, grups, tria, mapa, pla);
  });
}

function pintaSetmana(cos, apats, grups, tria, mapa, pla){
  // Quants apats te triats cada dia: es veu d'un cop d'ull que falta
  function fetsDe(d){
    var n = 0;
    apats.forEach(function(t){ if (tria[d + ':' + t]) n++; });
    return n;
  }

  var tira = h('div','display:grid;grid-template-columns:repeat(7,1fr);gap:4px;' +
    'margin-bottom:20px');
  for (var d = 1; d <= 7; d++) (function(dia){
    var sel = dia === diaTriat;
    var n = fetsDe(dia);
    var b = document.createElement('button');
    b.setAttribute('style','min-height:58px;background:' + (sel ? C.panell2 : 'transparent') +
      ';border:1px solid ' + (sel ? C.or : C.vora) + ';cursor:pointer;display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:3px;' +
      "padding:6px 2px;font-family:'Barlow',sans-serif;" +
      '-webkit-tap-highlight-color:transparent');
    b.appendChild(h('div','font-size:10.5px;font-weight:700;letter-spacing:.04em;' +
      'color:' + (sel ? C.os : C.apagat), E.DIES[dia-1].slice(0,2).toUpperCase()));
    b.appendChild(h('div','font-size:10px;color:' +
      (n === apats.length ? C.oliva : n ? C.ambre : C.apagat),
      n + '/' + apats.length));
    b.onclick = function(){ diaTriat = dia; E.repinta(); };
    tira.appendChild(b);
  })(d);
  cos.appendChild(tira);

  cos.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:20px;" +
    'color:' + C.os + ';margin-bottom:4px', E.DIES[diaTriat-1]));

  // Les kcal del dia, sumant UNA racio de cada recepta triada
  var kcal = 0, totes = true;
  apats.forEach(function(t){
    var id = tria[diaTriat + ':' + t];
    if (!id){ totes = false; return; }
    var o = grups[t].filter(function(x){ return x.recipe_id === id; })[0];
    if (o && o.recepta)
      kcal += macrosDe(o.recepta.recipe_items, mapa, o.recepta.racions).kcal;
  });
  cos.appendChild(h('div','font-size:12.5px;color:' + C.apagat + ';margin-bottom:18px;' +
    'line-height:1.5', kcal
      ? kcal + ' kcal' + (pla.kcal_obj ? ' de ' + pla.kcal_obj + ' d\'objectiu' : '') +
        (totes ? '' : ' \u00b7 encara falten \u00e0pats per triar')
      : 'Encara no has triat res per aquest dia.'));

  apats.forEach(function(t){
    var ops = grups[t];
    var triat = tria[diaTriat + ':' + t] || '';

    cos.appendChild(h('div','font-size:10px;letter-spacing:.14em;text-transform:uppercase;' +
      'font-weight:700;color:' + (triat ? C.oliva : C.or) + ';margin-bottom:7px', TIPUS[t]));

    var sel = E.camp({ tipus:'select', valor:triat,
      opcions:[{ v:'', t:'Encara no ho s\u00e9\u2026' }].concat(ops.map(function(o){
        var m = o.recepta ? macrosDe(o.recepta.recipe_items, mapa, o.recepta.racions) : null;
        return { v:o.recipe_id, t:((o.recepta && o.recepta.nom) || 'Recepta') +
          (m ? '  \u00b7  ' + m.kcal + ' kcal' : '') };
      })) });
    sel.style.marginBottom = '16px';
    sel.control.onchange = function(){
      var id = sel.control.value || null;
      tria[diaTriat + ':' + t] = id;
      E.escriuOp({ clau:'setmana:' + diaTriat + ':' + t, taula:'meal_selections',
        mena:'upsert', onConflict:'athlete_id,dia_setmana,tipus_apat',
        dades:{ athlete_id:E.atleta.id, dia_setmana:diaTriat, tipus_apat:t,
                recipe_id:id } }).then(function(r){
        if (r && r.error){ cos.appendChild(E.avis(r.error.message)); return; }
        E.repinta();
      });
    };
    cos.appendChild(sel);
  });

  var b = E.boto('Veure la llista de la compra', function(){
    vista = { mode:'compra' }; E.repinta();
  });
  b.style.width = '100%'; b.style.marginTop = '8px'; b.style.minHeight = '48px';
  cos.appendChild(b);
}

// -- La llista de la compra ----------------------------------------
function compra(cont){
  var set = setmanaISO(new Date());
  cont.appendChild(E.capcalera('La compra', 'Tot el que et fa falta aquesta setmana',
    [tornar()]));
  var cos = E.cos();
  cos.appendChild(E.carregant());
  cont.appendChild(cos);
  if (!navigator.onLine) return senseConnexio(cos, 'La llista');

  E.sb.from('meal_selections').select('recipe_id')
    .eq('athlete_id', E.atleta.id).not('recipe_id','is',null)
    .then(function(rs){
      if (rs.error){ E.buida(cos); cos.appendChild(E.avis(rs.error.message)); return; }
      var ids = [], quants = {};
      // Quantes vegades surt cada recepta a la setmana: dos dinars iguals
      // son el doble d'ingredients.
      (rs.data || []).forEach(function(x){
        if (!x.recipe_id) return;
        if (ids.indexOf(x.recipe_id) === -1) ids.push(x.recipe_id);
        quants[x.recipe_id] = (quants[x.recipe_id] || 0) + 1;
      });
      if (!ids.length){
        E.buida(cos);
        cos.appendChild(E.buit('Encara no has triat qu\u00e8 menjar\u00e0s. Planifica la ' +
          'setmana i aqu\u00ed hi sortir\u00e0 tot el que has de comprar.'));
        var bp = E.boto('Planificar la setmana', function(){
          vista = { mode:'setmana' }; E.repinta();
        });
        bp.style.width = '100%'; bp.style.marginTop = '16px';
        cos.appendChild(bp);
        return;
      }
      return Promise.all([
        E.sb.from('recipes').select('id,racions,recipe_items(food_id,grams)').in('id', ids),
        E.sb.from('foods').select('id,nom,categoria,unitat_ref'),
        E.sb.from('shopping_list_items').select('food_id,comprat')
          .eq('athlete_id', E.atleta.id).eq('setmana_iso', set)
      ]).then(function(rr){
        E.buida(cos);
        if (rr[0].error){ cos.appendChild(E.avis(rr[0].error.message)); return; }
        var mapa = {};
        (rr[1].data || []).forEach(function(f){ mapa[f.id] = f; });
        var comprat = {};
        (rr[2].data || []).forEach(function(x){ comprat[x.food_id] = !!x.comprat; });

        var total = {};
        (rr[0].data || []).forEach(function(rec){
          var rac = Number(rec.racions) > 0 ? Number(rec.racions) : 1;
          var cops = quants[rec.id] || 1;
          (rec.recipe_items || []).forEach(function(it){
            total[it.food_id] = (total[it.food_id] || 0) +
              (Number(it.grams) || 0) / rac * cops;
          });
        });
        pintaCompra(cos, total, mapa, comprat, set);
      });
    });
}

function pintaCompra(cos, total, mapa, comprat, set){
  var ids = Object.keys(total).filter(function(id){ return total[id] > 0; });
  if (!ids.length){
    cos.appendChild(E.buit('Les receptes que has triat no tenen ingredients apuntats.'));
    return;
  }

  var cats = {};
  ids.forEach(function(id){
    var f = mapa[id];
    var c = (f && f.categoria) || 'Altres';
    (cats[c] = cats[c] || []).push(id);
  });
  var ordre = Object.keys(cats).sort(function(a,b){ return a.localeCompare(b,'ca'); });

  var fets = ids.filter(function(id){ return comprat[id]; }).length;
  cos.appendChild(h('div','font-size:12.5px;color:' + C.apagat + ';line-height:1.5;' +
    'margin-bottom:18px', 'Setmana ' + set + ' \u00b7 ' + ids.length +
    (ids.length === 1 ? ' aliment' : ' aliments') +
    (fets ? ' \u00b7 ' + fets + ' ja al cistell' : '')));

  ordre.forEach(function(c){
    cos.appendChild(h('div','font-size:10px;letter-spacing:.14em;text-transform:uppercase;' +
      'font-weight:700;color:' + C.or + ';margin-bottom:8px', c));
    var l = h('div','display:flex;flex-direction:column;gap:1px;background:' + C.vora + ';' +
      'margin-bottom:20px');
    cats[c].sort(function(a,b){
      return ((mapa[a] && mapa[a].nom) || '').localeCompare(
             (mapa[b] && mapa[b].nom) || '', 'ca');
    }).forEach(function(id){
      l.appendChild(filaCompra(id, total[id], mapa[id], comprat, set));
    });
    cos.appendChild(l);
  });

  cos.appendChild(h('div','font-size:11.5px;color:' + C.apagat + ';line-height:1.5',
    'Les quantitats surten de les receptes que has triat a \u00abLa setmana\u00bb, ' +
    'arrodonides a mides de s\u00faper. El que marquis es desa per a aquesta setmana.'));
}

function filaCompra(id, grams, aliment, comprat, set){
  var ja = !!comprat[id];
  var f = h('div','background:' + C.panell + ';padding:13px 15px;display:flex;' +
    'align-items:center;gap:13px;cursor:pointer;-webkit-tap-highlight-color:transparent');

  f.appendChild(h('div','width:22px;height:22px;flex-shrink:0;border:1px solid ' +
    (ja ? C.oliva : C.voraFort) + ';background:' + (ja ? C.oliva : 'transparent') + ';' +
    'display:flex;align-items:center;justify-content:center;font-size:13px;' +
    'font-weight:700;color:#0D0D0F', ja ? '\u2713' : ''));

  var tx = h('div','flex:1;min-width:0');
  tx.appendChild(h('div','font-size:14.5px;line-height:1.35;color:' +
    (ja ? C.apagat : C.os) + (ja ? ';text-decoration:line-through' : ''),
    (aliment && aliment.nom) || 'Aliment'));
  var g = arrodoneix(grams);
  var u = unitatDe(aliment && aliment.unitat_ref);
  if (u){
    var n = Math.max(1, Math.round(grams / u.grams));
    tx.appendChild(h('div','font-size:11.5px;color:' + C.apagat + ';margin-top:3px',
      n + ' ' + u.nom + (n === 1 ? '' : 's') + '  \u00b7  ' + g + ' g'));
  }
  f.appendChild(tx);

  f.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:15px;" +
    'flex-shrink:0;color:' + (ja ? C.apagat : C.pedra), g + ' g'));

  f.onclick = function(){
    comprat[id] = !ja;
    E.escriuOp({ clau:'compra:' + set + ':' + id, taula:'shopping_list_items',
      mena:'upsert', onConflict:'athlete_id,setmana_iso,food_id',
      dades:{ athlete_id:E.atleta.id, setmana_iso:set, food_id:id,
              grams:Math.round(grams * 10) / 10, comprat:!ja } }).then(function(r){
      if (r && r.error) comprat[id] = ja;
      E.repinta();
    });
  };
  return f;
}

})();
