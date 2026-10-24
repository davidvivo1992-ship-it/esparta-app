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

function macrosDe(items, mapa){
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
  return { kcal:Math.round(m.kcal), prot:Math.round(m.prot),
           carb:Math.round(m.carb), greix:Math.round(m.greix) };
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
      var mac = o.recepta ? macrosDe(o.recepta.recipe_items, mapa) : null;
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
      var mac = macrosDe(items, null);
      var rac = x.racions || 1;

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
          'line-height:1.5', 'Total de la recepta. Per ració: ' +
          Math.round(mac.kcal / rac) + ' kcal.'));

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
})();
