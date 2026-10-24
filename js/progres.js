// Metabolisme Esparta · Progres: rang, mides, fotos i historial
//
// El pesatge NO s'obre des d'aqui: es una activitat que l'entrenador
// marca a l'agenda. Aqui es consulta el que s'ha registrat.
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;
var mode = 'resum';

// Cada costat del cos te la seva mida
var MIDES = [
  ['pit_cm','Pit'], ['coll_cm','Coll'], ['espatlles_cm','Espatlles'],
  ['biceps_esq_cm','Bíceps esquerre'], ['biceps_dret_cm','Bíceps dret'],
  ['avantbrac_esq_cm','Avantbraç esquerre'], ['avantbrac_dret_cm','Avantbraç dret'],
  ['cintura_cm','Cintura'], ['maluc_cm','Maluc'],
  ['cuixa_esq_cm','Cuixa esquerra'], ['cuixa_dret_cm','Cuixa dreta'],
  ['bessons_esq_cm','Bessó esquerre'], ['bessons_dret_cm','Bessó dret']
];
// Mides d'abans que la mesura fos per costats: només es mostren si n'hi ha
var ANTIGUES = [['brac_cm','Braç'],['avantbrac_cm','Avantbraç'],
                ['cuixa_cm','Cuixa'],['bessons_cm','Bessons']];
var FOTOS = [['foto_front','Frontal'],['foto_perfil','Lateral'],['foto_esquena','Esquena']];

E.seccions.push({
  id:'progres', etiqueta:'Progrés', icona:'\u25C8',
  pinta: function(cont){
    if (mode === 'pesatge') return formMides(cont);
    if (mode === 'fotos') return formFotos(cont);
    return resum(cont);
  }
});

// L'Agenda obre aquestes pantalles el dia que ha marcat l'entrenador
function obre(m){
  mode = m;
  if ((location.hash || '').replace('#','') === 'progres') E.repinta();
  else E.vesA('progres');
}
E.obrePesatge = function(){ obre('pesatge'); };
E.obreFotos = function(){ obre('fotos'); };

function tornar(){
  var b = E.boto('Tornar', function(){ mode = 'resum'; E.repinta(); }, 'buit');
  b.style.padding = '10px 15px'; b.style.minHeight = '42px'; b.style.fontSize = '12px';
  return b;
}

// ══ Resum ════════════════════════════════════════════════════════
function resum(cont){
  cont.appendChild(E.capcalera('Progrés', 'El teu camí cap al rang de Rei'));
  var cos = E.cos();
  cos.appendChild(E.carregant());
  cont.appendChild(cos);

  var fa30 = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
  var peticio = navigator.onLine
    ? Promise.all([
        E.sb.from('measurements').select('*').eq('athlete_id', E.atleta.id)
          .order('data',{ascending:false}).limit(12),
        E.sb.from('workout_sessions').select('id,data,estat,rpe')
          .eq('athlete_id', E.atleta.id).gte('data', fa30).order('data',{ascending:false}),
        E.sb.from('cardio_logs').select('data,tipus,minuts,distancia_km,fc_mitjana')
          .eq('athlete_id', E.atleta.id).gte('data', fa30).order('data',{ascending:false}),
        E.sb.from('meal_logs').select('data,tipus_apat,fet')
          .eq('athlete_id', E.atleta.id).gte('data', fa30).order('data',{ascending:false}),
        E.sb.from('diet_assignments')
          .select('pla:diet_plans(nom,kcal_obj,diet_plan_options(tipus_apat))')
          .eq('athlete_id', E.atleta.id).eq('estat','actiu')
          .order('created_at',{ascending:false}).limit(1)
      ])
    : Promise.resolve([{ data:[] }, { data:[] }, { data:[] }, { data:[] }, { data:[] }]);

  peticio.then(function(r){
    E.buida(cos);
    var mes = r[0].data || [], ses = r[1].data || [], car = (r[2] && r[2].data) || [];
    var apats = (r[3] && r[3].data) || [];
    var dieta = ((r[4] && r[4].data) || [])[0] || null;

    if (!navigator.onLine){
      var av = E.avis('Sense connexió. L\'històric torna quan hi hagi internet.', C.ambre);
      av.style.marginBottom = '16px';
      cos.appendChild(av);
    } else if (E.pendents()){
      var av2 = E.avis('Tens ' + E.pendents() + ' registre(s) desats al mòbil pujant-se ara.',
        C.oliva);
      av2.style.marginBottom = '16px';
      cos.appendChild(av2);
    }

    rang(cos);
    xifres(cos, mes, ses, car);
    llistaDieta(cos, apats, dieta);
    llistaMides(cos, mes);
    galeria(cos, mes);
    llistaCardio(cos, car);
  });
}

function rang(cos){
  var xp = E.atleta.xp_total || 0;
  var r = E.rangDe(xp), seg = E.seguent(xp);
  var t = h('div','background:'+C.panell+';border:1px solid '+C.vora+';'+
    'border-top:3px solid '+C.or+';padding:20px;margin-bottom:16px;text-align:center');
  t.appendChild(h('div','font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;'+
    'font-weight:700;color:'+C.apagat+';margin-bottom:7px','El teu rang'));
  t.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:800;font-size:31px;"+
    'color:'+C.or+';line-height:1.05', r.nom));
  t.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';margin-top:7px',
    xp + ' punts d\'experiència'));
  if (seg){
    var ample = Math.round((xp - r.xp) / (seg.xp - r.xp) * 100);
    var barra = h('div','margin-top:15px;height:5px;background:'+C.panell2);
    barra.appendChild(h('div','height:5px;width:'+ample+'%;background:'+C.or));
    t.appendChild(barra);
    t.appendChild(h('div','font-size:12px;color:'+C.apagat+';margin-top:8px;line-height:1.4',
      (seg.xp - xp) + ' punts per arribar a ' + seg.nom));
  } else {
    t.appendChild(h('div','font-size:12.5px;color:'+C.or+';margin-top:13px;line-height:1.4',
      'Has arribat al rang més alt. Ara toca mantenir-lo.'));
  }
  cos.appendChild(t);
}

function xifres(cos, mes, ses, car){
  var fetes = ses.filter(function(s){ return s.estat === 'completada'; }).length;
  var saltades = ses.filter(function(s){ return s.estat === 'saltada'; }).length;
  var adher = (fetes + saltades) ? Math.round(fetes / (fetes + saltades) * 100) : null;
  var ambPes = mes.filter(function(m){ return m.pes_kg != null; });
  var ultim = ambPes[0], anterior = ambPes[1];
  var dif = (ultim && anterior) ? (ultim.pes_kg - anterior.pes_kg) : null;

  var g = h('div','display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px');
  function xifra(valor, et, color, nota){
    var c = h('div','background:'+C.panell+';border:1px solid '+C.vora+';'+
      'border-top:2px solid '+color+';padding:15px 16px');
    c.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:25px;"+
      'line-height:1;color:'+C.os, valor));
    c.appendChild(h('div','font-size:10px;letter-spacing:.11em;text-transform:uppercase;'+
      'font-weight:700;color:'+color+';margin-top:7px', et));
    if (nota) c.appendChild(h('div','font-size:11.5px;color:'+C.apagat+';margin-top:3px', nota));
    return c;
  }
  g.appendChild(xifra(String(fetes + car.length), 'Entrenaments · 30 dies', C.accio,
    car.length ? car.length + ' de cardio' : (saltades ? saltades + ' saltades' : null)));
  g.appendChild(xifra(adher == null ? '\u2014' : adher + '%', 'Constància',
    adher == null ? C.apagat : adher >= 80 ? C.oliva : adher >= 60 ? C.ambre : C.accio));
  g.appendChild(xifra(ultim ? ultim.pes_kg + ' kg' : '\u2014', 'Últim pes', C.or,
    ultim ? E.data(ultim.data) : 'sense pesatges'));
  g.appendChild(xifra(dif == null ? '\u2014' : (dif > 0 ? '+' : '') + dif.toFixed(1) + ' kg',
    "Des de l'anterior", dif == null ? C.apagat : C.pedra));
  cos.appendChild(g);
}

function titolSeccio(text){
  return h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
    'font-weight:700;color:'+C.or+';margin-bottom:11px', text);
}

// ── Mides: cada pesatge s'obre i mostra tot el que s'hi va prendre ─
function llistaMides(cos, mes){
  cos.appendChild(titolSeccio('Les teves mides'));
  var ambDades = mes.filter(function(m){ return m.pes_kg != null || teMides(m); });
  if (!ambDades.length){
    cos.appendChild(E.buit(navigator.onLine
      ? 'Encara no tens mides. El dia que el teu entrenador et demani un pesatge, '+
        'el trobaràs a l\'Agenda.'
      : 'L\'històric necessita connexió.'));
    return;
  }
  var l = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora);
  ambDades.forEach(function(m){
    var w = h('div','background:'+C.panell);
    var f = h('div','padding:14px 16px;display:flex;justify-content:space-between;'+
      'align-items:center;gap:12px;cursor:pointer;-webkit-tap-highlight-color:transparent');
    var esq = h('div','min-width:0');
    esq.appendChild(h('div','font-size:13px;color:'+C.pedra, E.data(m.data)));
    var n = totes(m).length;
    esq.appendChild(h('div','font-size:11px;color:'+C.apagat+';margin-top:3px',
      n ? n + (n === 1 ? ' mida' : ' mides') : 'només pes'));
    f.appendChild(esq);
    var dr = h('div','display:flex;gap:12px;align-items:baseline;flex-shrink:0');
    dr.appendChild(h('div','font-size:16px;font-weight:600;color:'+C.os,
      m.pes_kg != null ? m.pes_kg + ' kg' : '\u2014'));
    if (m.greix_pct != null) dr.appendChild(h('div','font-size:12.5px;color:'+C.apagat,
      m.greix_pct + '%'));
    dr.appendChild(h('div','font-size:13px;color:'+C.apagat,'\u25BE'));
    f.appendChild(dr);
    w.appendChild(f);

    var det = h('div','display:none;padding:0 16px 15px');
    f.onclick = function(){
      var obert = det.style.display === 'block';
      det.style.display = obert ? 'none' : 'block';
      if (!obert && !det.firstChild) detall(det, m);
    };
    w.appendChild(det);
    l.appendChild(w);
  });
  cos.appendChild(l);
}

function totes(m){
  return MIDES.concat(ANTIGUES).filter(function(p){ return m[p[0]] != null; });
}
function teMides(m){ return totes(m).length > 0; }

function detall(det, m){
  var camps = totes(m);
  if (camps.length){
    var g = h('div','display:grid;grid-template-columns:1fr 1fr;gap:1px;background:'+C.vora);
    camps.forEach(function(p){
      var c = h('div','background:'+C.panell2+';padding:10px 12px');
      c.appendChild(h('div','font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;'+
        'font-weight:700;color:'+C.apagat, p[1]));
      c.appendChild(h('div','font-size:14px;color:'+C.os+';font-weight:600;margin-top:3px',
        m[p[0]] + ' cm'));
      g.appendChild(c);
    });
    det.appendChild(g);
  }
  [['notes_entrenador','Entrenador',C.or],
   ['notes_nutricionista','Nutricionista',C.oliva]].forEach(function(n){
    if (!m[n[0]]) return;
    var nb = h('div','margin-top:11px;background:'+C.panell2+';'+
      'border-left:3px solid '+n[2]+';padding:10px 12px');
    nb.appendChild(h('div','font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;'+
      'font-weight:700;color:'+n[2]+';margin-bottom:5px', n[1]));
    nb.appendChild(h('div','font-size:13px;color:'+C.pedra+';line-height:1.55;'+
      'white-space:pre-wrap', m[n[0]]));
    det.appendChild(nb);
  });
  if (!camps.length && !m.notes_entrenador && !m.notes_nutricionista)
    det.appendChild(h('div','font-size:12.5px;color:'+C.apagat+';line-height:1.5',
      'Aquell dia només es va registrar el pes.'));
}

// ── Galeria: l'evolucio es veu millor amb els ulls ────────────────
function galeria(cos, mes){
  var ambFoto = mes.filter(function(m){
    return m.foto_front || m.foto_perfil || m.foto_esquena;
  });
  if (!ambFoto.length) return;
  cos.appendChild(h('div','height:24px'));
  cos.appendChild(titolSeccio('Les teves fotos'));
  var l = h('div','display:flex;flex-direction:column;gap:14px');
  ambFoto.forEach(function(m){
    var w = h('div','background:'+C.panell+';border:1px solid '+C.vora+';padding:13px 14px');
    w.appendChild(h('div','font-size:12px;color:'+C.pedra+';margin-bottom:10px', E.data(m.data)));
    var g = h('div','display:grid;grid-template-columns:repeat(3,1fr);gap:8px');
    FOTOS.forEach(function(p){
      var c = h('div');
      c.appendChild(h('div','font-size:9px;letter-spacing:.1em;text-transform:uppercase;'+
        'font-weight:700;color:'+C.apagat+';margin-bottom:5px', p[1]));
      var marc = h('div','background:'+C.fons+';min-height:110px;display:flex;'+
        'align-items:center;justify-content:center');
      if (!m[p[0]]) marc.appendChild(h('div','font-size:10.5px;color:'+C.apagat,'\u2014'));
      else {
        marc.appendChild(h('div','font-size:10.5px;color:'+C.apagat,'carregant…'));
        E.sb.storage.from('pesatges').createSignedUrl(m[p[0]], 3600).then(function(r){
          E.buida(marc);
          if (r.error || !r.data){
            marc.appendChild(h('div','font-size:10.5px;color:'+C.apagat,'no disponible'));
            return;
          }
          var a = document.createElement('a');
          a.href = r.data.signedUrl; a.target = '_blank'; a.rel = 'noopener';
          a.setAttribute('style','display:block;width:100%');
          var im = document.createElement('img');
          im.src = r.data.signedUrl;
          im.setAttribute('style','width:100%;display:block;max-height:190px;object-fit:cover');
          a.appendChild(im);
          marc.appendChild(a);
        });
      }
      c.appendChild(marc);
      g.appendChild(c);
    });
    w.appendChild(g);
    l.appendChild(w);
  });
  cos.appendChild(l);
}

// ── La dieta: quants apats marca cada dia ─────────────────────────
function llistaDieta(cos, apats, dieta){
  if (!apats.length && !dieta) return;
  cos.appendChild(h('div','height:24px'));
  cos.appendChild(titolSeccio('La teva dieta'));

  var perDia = (dieta && dieta.pla)
    ? Object.keys(((dieta.pla.diet_plan_options || []).reduce(function(m, o){
        m[o.tipus_apat] = 1; return m;
      }, {}))).length
    : 0;

  var dies = {};
  apats.forEach(function(x){
    if (!x.fet) return;
    dies[x.data] = (dies[x.data] || 0) + 1;
  });
  var claus = Object.keys(dies).sort().reverse();

  if (!claus.length){
    cos.appendChild(E.buit('Encara no has marcat cap àpat. Fes-ho a Nutrició '+
      'i aquí veuràs la teva constància.'));
    return;
  }

  // Constancia dels ultims 14 dies amb pla
  if (perDia){
    var fa14 = new Date(Date.now() - 13*86400000).toISOString().slice(0,10);
    var marcats = 0;
    claus.forEach(function(d){ if (d >= fa14) marcats += Math.min(dies[d], perDia); });
    var pct = Math.round(marcats / (perDia * 14) * 100);
    var t = h('div','background:'+C.panell+';border:1px solid '+C.vora+';'+
      'border-top:2px solid '+(pct >= 80 ? C.oliva : pct >= 50 ? C.ambre : C.accio)+';'+
      'padding:15px 16px;margin-bottom:11px');
    t.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:25px;"+
      'line-height:1;color:'+C.os, pct + '%'));
    t.appendChild(h('div','font-size:10px;letter-spacing:.11em;text-transform:uppercase;'+
      'font-weight:700;color:'+C.or+';margin-top:7px','Constància · 14 dies'));
    t.appendChild(h('div','font-size:11.5px;color:'+C.apagat+';margin-top:3px',
      marcats + ' de ' + (perDia * 14) + ' àpats marcats'));
    cos.appendChild(t);
  }

  var l = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora);
  claus.slice(0, 14).forEach(function(d){
    var n = dies[d];
    var complet = perDia && n >= perDia;
    var f = h('div','background:'+C.panell+';padding:12px 16px;display:flex;'+
      'justify-content:space-between;align-items:center;gap:12px');
    f.appendChild(h('div','font-size:13px;color:'+C.pedra, E.data(d)));
    f.appendChild(h('div','font-size:13px;font-weight:600;color:'+
      (complet ? C.oliva : C.pedra),
      perDia ? n + ' de ' + perDia : n + (n === 1 ? ' àpat' : ' àpats')));
    l.appendChild(f);
  });
  cos.appendChild(l);
}

function llistaCardio(cos, car){
  if (!car.length) return;
  cos.appendChild(h('div','height:24px'));
  cos.appendChild(titolSeccio('El teu cardio'));
  var l = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora);
  car.forEach(function(c){
    var f = h('div','background:'+C.panell+';padding:13px 16px;display:flex;'+
      'justify-content:space-between;align-items:center;gap:12px');
    var esq = h('div','min-width:0');
    esq.appendChild(h('div','font-size:13px;color:'+C.pedra, E.data(c.data)));
    esq.appendChild(h('div','font-size:11.5px;color:'+C.apagat+';margin-top:3px',
      c.tipus || 'Cardio'));
    f.appendChild(esq);
    var dr = h('div','display:flex;gap:11px;align-items:baseline;flex-shrink:0');
    dr.appendChild(h('div','font-size:15px;font-weight:600;color:'+C.os,
      (c.minuts || '\u2014') + ' min'));
    if (c.distancia_km) dr.appendChild(h('div','font-size:12.5px;color:'+C.apagat,
      c.distancia_km + ' km'));
    if (c.fc_mitjana) dr.appendChild(h('div','font-size:12.5px;color:'+C.apagat,
      c.fc_mitjana + ' ppm'));
    f.appendChild(dr);
    l.appendChild(f);
  });
  cos.appendChild(l);
}

// ══ Formulari de mides ═══════════════════════════════════════════
function formMides(cont){
  cont.appendChild(E.capcalera('Mètriques personals',
    'En dejú i a la mateixa hora. Amb cinta, sense apretar.', [tornar()]));
  var cos = E.cos();
  cont.appendChild(cos);

  var t = E.targeta();
  var pes = E.camp({ et:'Pes corporal (kg)', tipus:'number', pas:'0.1', marca:'78.4' });
  var gr  = E.camp({ et:'Greix corporal (%)', tipus:'number', pas:'0.1', marca:'14.2' });
  var g = h('div','display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:18px');
  g.appendChild(pes); g.appendChild(gr);
  t.appendChild(g);

  t.appendChild(h('div','font-size:10px;letter-spacing:.13em;text-transform:uppercase;'+
    'font-weight:700;color:'+C.or+';margin-bottom:4px','Mides (cm)'));
  t.appendChild(h('div','font-size:12px;color:'+C.apagat+';line-height:1.5;margin-bottom:12px',
    'Esquerra i dreta per separat. El que no prenguis, deixa-ho buit.'));
  var camps = {};
  var g2 = h('div','display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px');
  MIDES.forEach(function(p){
    var c = E.camp({ et:p[1], tipus:'number', pas:'0.1' });
    c.control.onfocus = function(){ c.control.select(); };
    camps[p[0]] = c;
    g2.appendChild(c);
  });
  t.appendChild(g2);

  var miss = h('div','margin-bottom:13px');
  t.appendChild(miss);

  var b = E.boto('Desar les mètriques', function(){
    E.buida(miss);
    if (!pes.control.value){ miss.appendChild(E.avis('Escriu com a mínim el pes.')); return; }
    b.disabled = true; b.textContent = 'Desant…';
    var reg = {
      athlete_id: E.atleta.id, data: E.avui(),
      pes_kg: pes.control.value,
      greix_pct: gr.control.value || null,
      autor_id: E.perfil.id
    };
    MIDES.forEach(function(p){ reg[p[0]] = camps[p[0]].control.value || null; });
    E.escriuOp({ clau:'pesatge:'+E.avui(), taula:'measurements', mena:'upsert',
      onConflict:'athlete_id,data', dades:reg }).then(function(r){
      if (r && r.error){
        b.disabled = false; b.textContent = 'Desar les mètriques';
        miss.appendChild(E.avis(r.error.message)); return;
      }
      E.desaCau('panell', null);
      if (r && r.local){
        E.encua({ clau:'xp:pesatge:'+E.avui(), mena:'xp', delta:25 });
        E.atleta.xp_total = (E.atleta.xp_total || 0) + 25;
        mode = 'resum'; E.repinta();
        return;
      }
      return E.sb.from('athletes')
        .update({ xp_total: (E.atleta.xp_total || 0) + 25 }).eq('id', E.atleta.id)
        .then(function(){
          E.atleta.xp_total = (E.atleta.xp_total || 0) + 25;
          mode = 'resum'; E.repinta();
        });
    });
  });
  b.style.width = '100%';
  t.appendChild(b);
  cos.appendChild(t);
}

// ══ Fotos de control ═════════════════════════════════════════════
function formFotos(cont){
  cont.appendChild(E.capcalera('Imatge de progrés',
    'Tres fotos: frontal, lateral i d\'esquena', [tornar()]));
  var cos = E.cos();
  cont.appendChild(cos);

  if (!navigator.onLine){
    var avOff = E.avis('Sense connexió. Fes-te les fotos igualment: es desaran al mòbil '+
      'i pujaran soles quan tornis a tenir internet.', C.ambre);
    avOff.style.marginBottom = '15px';
    cos.appendChild(avOff);
  }

  var t = E.targeta();
  t.appendChild(h('div','font-size:12.5px;color:'+C.pedra+';line-height:1.6;margin-bottom:15px',
    'Sempre al mateix lloc, amb la mateixa llum i la mateixa roba. '+
    'Es guarden privades: només les veus tu, el teu entrenador i la nutricionista.'));

  var fitxers = {};
  var g = h('div','display:flex;flex-direction:column;gap:13px;margin-bottom:17px');
  FOTOS.forEach(function(p){
    var w = h('div','background:'+C.panell2+';padding:12px 13px');
    w.appendChild(h('div','font-size:10px;letter-spacing:.13em;text-transform:uppercase;'+
      'font-weight:700;color:'+C.or+';margin-bottom:9px', p[1]));

    var marc = h('div','background:'+C.fons+';border:1px dashed rgba(194,176,106,.32);'+
      'min-height:110px;display:flex;align-items:center;justify-content:center;'+
      'text-align:center;padding:12px');
    marc.appendChild(h('div','font-size:11.5px;color:'+C.apagat+';line-height:1.45',
      'Encara sense foto'));
    w.appendChild(marc);

    function posa(f){
      if (!f) return;
      fitxers[p[0]] = f;
      E.buida(marc);
      var im = document.createElement('img');
      im.src = URL.createObjectURL(f);
      im.setAttribute('style','width:100%;max-height:210px;object-fit:cover;display:block');
      marc.appendChild(im);
      marc.style.borderStyle = 'solid';
      marc.style.borderColor = C.oliva + '77';
    }

    // Dues portes: la camera del mobil o una foto que ja te
    var botons = h('div','display:flex;gap:8px;margin-top:10px');
    [['Fer la foto', true], ['Del mòbil', false]].forEach(function(o){
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      if (o[1]) inp.setAttribute('capture','environment');
      inp.setAttribute('style','display:none');
      inp.onchange = function(){ posa(inp.files && inp.files[0]); };
      var b = E.boto(o[0], function(){ inp.click(); }, 'buit');
      b.style.flex = '1';
      b.style.minHeight = '46px';
      b.style.padding = '12px 8px';
      b.style.fontSize = '11px';
      botons.appendChild(b);
      botons.appendChild(inp);
    });
    w.appendChild(botons);
    g.appendChild(w);
  });
  t.appendChild(g);

  var miss = h('div','margin-bottom:13px');
  t.appendChild(miss);

  function ext(f){ return ((f.name || '').split('.').pop() || 'jpg').toLowerCase(); }

  // Sense xarxa: les fotos van a la memoria del mobil i pugen amb la cua
  function alMobil(claus){
    var fotos = {};
    return Promise.all(claus.map(function(k){
      var clau = E.atleta.id + ':' + E.avui() + ':' + k;
      fotos[k] = { c: clau, e: ext(fitxers[k]) };
      return E.desaFoto(clau, fitxers[k]);
    })).then(function(){
      E.encua({ clau:'fotos:'+E.avui(), mena:'foto', athlete_id:E.atleta.id,
        data:E.avui(), autor_id:E.perfil.id, fotos:fotos });
      E.desaCau('panell', null);
      mode = 'resum';
      E.repinta();
    });
  }

  var b = E.boto('Pujar les fotos', function(){
    E.buida(miss);
    var claus = Object.keys(fitxers);
    if (!claus.length){ miss.appendChild(E.avis('Tria com a mínim una foto.')); return; }
    b.disabled = true; b.textContent = navigator.onLine ? 'Pujant…' : 'Desant…';

    if (!navigator.onLine)
      return alMobil(claus).catch(function(err){
        b.disabled = false; b.textContent = 'Pujar les fotos';
        miss.appendChild(E.avis('No s\'han pogut desar al mòbil: ' + err.message));
      });

    var reg = { athlete_id:E.atleta.id, data:E.avui() };
    Promise.all(claus.map(function(k){
      var f = fitxers[k];
      var ruta = E.atleta.id + '/' + reg.data + '-' + k.replace('foto_','') + '.' + ext(f);
      return E.sb.storage.from('pesatges').upload(ruta, f, { upsert:true })
        .then(function(r){
          if (r.error) throw new Error(r.error.message);
          reg[k] = ruta;
        });
    })).then(function(){
      // Si avui ja hi ha pesatge, s'hi afegeixen; si no, es crea la fila
      return E.sb.from('measurements').select('id')
        .eq('athlete_id', E.atleta.id).eq('data', reg.data).limit(1)
        .then(function(r){
          if (r.error) throw new Error(r.error.message);
          var ja = (r.data || [])[0];
          if (ja) return E.sb.from('measurements').update(reg).eq('id', ja.id);
          reg.autor_id = E.perfil.id;
          return E.sb.from('measurements').insert(reg);
        });
    }).then(function(r){
      if (r && r.error) throw new Error(r.error.message);
      E.desaCau('panell', null);
      mode = 'resum';
      E.repinta();
    }).catch(function(err){
      // Si ha caigut la xarxa a mitja pujada, no es perd res
      if (!navigator.onLine) return alMobil(claus).catch(function(){});
      b.disabled = false; b.textContent = 'Pujar les fotos';
      miss.appendChild(E.avis(err.message));
    });
  });
  b.style.width = '100%';
  t.appendChild(b);
  cos.appendChild(t);
}
})();
