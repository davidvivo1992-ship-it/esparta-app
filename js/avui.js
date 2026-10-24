// Metabolisme Esparta · Avui: panell del dia i setmana flexible
//
// L'Esparta veu que li toca avui, tota la setmana planificada i la dieta.
// Si avui no pot fer el que toca, obre qualsevol altre dia de la setmana i
// el fa: es registra amb la data d'avui, guardant quin dia del pla cobreix.
// Regla: UN entrenament al dia.
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;
var vista = { mode:'panell', dia:null };
var obert = null;        // routine_exercise_id desplegat
var missatge = null;     // avis d'un sol us al panell

var DIES_CURT = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];
var TIPUS = { esmorzar:'Esmorzar', mig_mati:'Mig matí', dinar:'Dinar', berenar:'Berenar',
  sopar:'Sopar', recuperador:'Recuperador' };
var ORDRE_APAT = ['esmorzar','mig_mati','dinar','berenar','sopar','recuperador'];

E.seccions.push({
  id:'avui', etiqueta:'Avui', icona:'\u2694',
  pinta: function(cont){
    var d = new Date();
    if (vista.mode === 'panell'){
      cont.appendChild(E.capcalera('Avui',
        E.DIES[E.diaSetmana(d)-1] + ', ' + d.getDate() + ' de ' + E.MESOS[d.getMonth()]));
    } else {
      var b = E.boto('Tornar', function(){
        vista = { mode:'panell', dia:null, tipus:null }; obert = null; E.repinta();
      }, 'buit');
      b.style.padding = '10px 15px'; b.style.minHeight = '42px'; b.style.fontSize = '12px';
      cont.appendChild(E.capcalera(E.DIES[(vista.dia || 1) - 1],
        vista.dia === E.diaSetmana() ? 'El que toca avui'
                                     : 'El fas avui, però compta com el dia planificat', [b]));
    }
    var cos = E.cos();
    cos.appendChild(E.carregant());
    cont.appendChild(cos);
    carrega(cos);
  }
});

// ── Dates de la setmana natural (dilluns a diumenge) ───────────────
function dataDelDia(dia, desp){
  var d = new Date(E.avui() + 'T00:00:00');
  d.setDate(d.getDate() - (E.diaSetmana(d) - 1) + (dia - 1) + (desp || 0) * 7);
  return d.toISOString().slice(0,10);
}

// ── Carrega ────────────────────────────────────────────────────────
function carrega(cos){
  E.carregaSetmana(function(D){ reparteix(cos, D); }, function(msg){
    E.buida(cos);
    cos.appendChild(E.avis(msg, C.ambre));
  });
}

// La setmana sencera: la fan servir Avui i l'Agenda. Es desa al mobil.
// desp: 0 = aquesta setmana, -1 = l'anterior, +1 = la següent.
// Nomes la setmana d'avui es desa al mobil; les altres necessiten xarxa.
E.carregaSetmana = function(ok, fail, desp){
  desp = desp || 0;
  if (!navigator.onLine){
    if (desp) return fail('Sense connexió: només pots consultar la setmana d\'avui.');
    var c = E.llegeixCau('panell');
    if (!c || c.data !== E.avui())
      return fail('Sense connexió, i la setmana no està desada al mòbil. '+
        'Obre l\'app un moment amb internet i quedarà guardada per entrenar sense cobertura.');
    return ok(c);
  }

  E.sb.from('plan_assignments')
    .select('id,data_inici,pla:training_plans(id,nom,setmanes)')
    .eq('athlete_id', E.atleta.id).eq('estat','actiu')
    .order('created_at',{ascending:false}).limit(1)
    .then(function(r){
      if (r.error) return fail(r.error.message);
      var a = (r.data || [])[0] || null;
      var pla = (a && a.pla) || null;
      var setmanes = (pla && pla.setmanes) || 1;
      var dl = dataDelDia(1, desp), dg = dataDelDia(7, desp);
      var setmana = 1;
      if (a){
        // Es compta des del dilluns de la setmana que es mira
        var passats = Math.floor((new Date(dl) - new Date(a.data_inici)) / 86400000);
        if (passats < 0) passats = 0;
        setmana = (Math.floor(passats / 7) % setmanes) + 1;
      }

      Promise.all([
        a ? E.sb.from('assignment_days')
              .select('dia_setmana,routine_id,cardio,cardio_routine_id,pesatge')
              .eq('assignment_id', a.id).eq('setmana', setmana)
          : Promise.resolve({ data:[] }),
        pla ? E.sb.from('plan_days')
                .select('dia_setmana,routine_id,cardio,cardio_routine_id,pesatge')
                .eq('plan_id', pla.id).eq('setmana', setmana)
            : Promise.resolve({ data:[] }),
        E.sb.from('workout_sessions').select('id,data,estat,rpe,routine_id,dia_previst')
          .eq('athlete_id', E.atleta.id).gte('data', dl).lte('data', dg),
        E.sb.from('cardio_logs')
          .select('data,tipus,minuts,distancia_km,fc_mitjana,dia_previst,routine_id')
          .eq('athlete_id', E.atleta.id).gte('data', dl).lte('data', dg),
        E.sb.from('diet_assignments')
          .select('data_inici,pla:diet_plans(nom,kcal_obj,prot_obj,carb_obj,greix_obj,notes,'+
            'diet_plan_options(tipus_apat,recipe_id,'+
            'recepta:recipes(nom,recipe_items(food_id,grams))))')
          .eq('athlete_id', E.atleta.id).eq('estat','actiu')
          .order('created_at',{ascending:false}).limit(1),
        E.sb.from('meal_logs').select('data,tipus_apat,recipe_id,fet')
          .eq('athlete_id', E.atleta.id).gte('data', dl).lte('data', dg),
        E.sb.from('foods').select('id,kcal_100'),
        E.sb.from('measurements')
          .select('data,pes_kg,foto_front,foto_perfil,foto_esquena')
          .eq('athlete_id', E.atleta.id).gte('data', dl).lte('data', dg)
      ]).then(function(rr){
        var dies = {};
        function fila(x){
          return { routine_id:x.routine_id, cardio:x.cardio,
                   cardio_routine_id:x.cardio_routine_id, pesatge:!!x.pesatge };
        }
        (rr[1].data || []).forEach(function(x){ dies[x.dia_setmana] = fila(x); });
        // El calendari propi de l'Esparta manda sobre la plantilla del pla
        (rr[0].data || []).forEach(function(x){ dies[x.dia_setmana] = fila(x); });

        // Les rutines de força i les sessions de cardio es llegeixen juntes
        var ids = [];
        Object.keys(dies).forEach(function(k){
          [dies[k].routine_id, dies[k].cardio_routine_id].forEach(function(id){
            if (id && ids.indexOf(id) === -1) ids.push(id);
          });
        });

        var seg = ids.length
          ? Promise.all([
              E.sb.from('routines')
                .select('id,nom,mena,tipus,notes,rondes,descans_ronda_s').in('id', ids),
              E.sb.from('routine_exercises')
                .select('*,exercici:exercises(nom,mena,grup_muscular,youtube_url,'+
                        'imatges,consignes)')
                .in('routine_id', ids).order('ordre')
            ])
          : Promise.resolve([{ data:[] }, { data:[] }]);

        seg.then(function(r2){
          if (r2[1] && r2[1].error)
            return fail('No es poden llegir els exercicis: ' + r2[1].error.message);
          var rutines = {};
          (r2[0].data || []).forEach(function(x){ rutines[x.id] = x; });
          var exercicis = {};
          (r2[1].data || []).forEach(function(x){
            (exercicis[x.routine_id] = exercicis[x.routine_id] || []).push(x);
          });
          var aliments = {};
          (rr[6].data || []).forEach(function(f){ aliments[f.id] = f; });

          var apatsTots = rr[5].data || [];
          var D = {
            data: E.avui(), desp: desp, dl: dl, dg: dg,
            setmana: setmana, setmanes: setmanes,
            plaNom: pla ? pla.nom : null, assigId: a ? a.id : null,
            dies: dies, rutines: rutines, exercicis: exercicis,
            sessions: rr[2].data || [], cardios: rr[3].data || [],
            dieta: (rr[4].data || [])[0] || null,
            apatsTots: apatsTots,
            apats: apatsTots.filter(function(x){ return x.data === E.avui(); }),
            aliments: aliments,
            pesatges: (rr[7] && rr[7].data) || []
          };
          if (!desp) E.desaCau('panell', D);
          ok(D);
        });
      });
    });
};

function reparteix(cos, D){
  E.buida(cos);
  if (vista.mode === 'sessio' && vista.dia) return pantallaDia(cos, D, vista.dia);
  return panell(cos, D);
}

// ── Lectures sobre les dades ───────────────────────────────────────
function diaDe(x){
  return x.dia_previst || E.diaSetmana(new Date(x.data + 'T00:00:00'));
}
function sessioDelDia(D, dia){
  var t = null;
  (D.sessions || []).forEach(function(s){ if (diaDe(s) === dia) t = s; });
  return t;
}
// Un dia pot portar cardio lliure (un text) o una sessió dissenyada
function teCardio(p){ return !!(p && (p.cardio_routine_id || p.cardio)); }
function rutCardio(D, p){
  return (p && p.cardio_routine_id && D.rutines[p.cardio_routine_id]) || null;
}
function nomCardio(D, p){
  var r = rutCardio(D, p);
  if (r) return r.nom;
  if (p && p.cardio_routine_id) return 'Cardio programat';
  return (p && p.cardio) || 'Cardio';
}
// L'Agenda les fa servir per pintar els mateixos dies
E.diaTeCardio  = teCardio;
E.diaRutCardio = rutCardio;
E.diaNomCardio = nomCardio;

function cardioDelDia(D, dia){
  var t = null;
  (D.cardios || []).forEach(function(x){ if (diaDe(x) === dia) t = x; });
  return t;
}
function sessioAvui(D){
  var t = null;
  (D.sessions || []).forEach(function(s){ if (s.data === E.avui()) t = s; });
  return t;
}
function cardioAvui(D){
  var t = null;
  (D.cardios || []).forEach(function(x){ if (x.data === E.avui()) t = x; });
  return t;
}
// El que s'ha registrat al mobil i encara no ha pujat
function localDelDia(dia){
  var l = E.llegeixCau('series');
  if (l && l.data === E.avui() && l.dia === dia) return l;
  var c = E.llegeixCau('cardio');
  if (c && c.data === E.avui() && c.dia === dia) return { tancada:true, cardio:c };
  return null;
}
function acabat(D, dia){
  var s = sessioDelDia(D, dia);
  if (s && s.estat === 'completada') return true;
  if (cardioDelDia(D, dia)) return true;
  var l = localDelDia(dia);
  return !!(l && l.tancada);
}
function jaEntrenatAvui(D){
  if (sessioAvui(D) || cardioAvui(D)) return true;
  var l = E.llegeixCau('series');
  if (l && l.data === E.avui() && (l.tancada || Object.keys(l.fetes || {}).length)) return true;
  var c = E.llegeixCau('cardio');
  return !!(c && c.data === E.avui());
}

// ── Panell ─────────────────────────────────────────────────────────
function panell(cos, D){
  if (missatge){
    var av = E.avis(missatge, C.ambre);
    av.style.marginBottom = '18px';
    cos.appendChild(av);
    missatge = null;
  }
  blocAvui(cos, D);
  blocDieta(cos, D);
  enllacAgenda(cos);
}

// La setmana sencera viu a l'Agenda: aqui nomes s'hi enllaca.
function enllacAgenda(cos){
  var b = E.boto('Veure tota la setmana', function(){ E.vesA('agenda'); }, 'buit');
  b.style.width = '100%';
  b.style.marginTop = '22px';
  cos.appendChild(b);
}

function encapcalament(text){
  return h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
    'font-weight:700;color:'+C.or+';margin-bottom:11px', text);
}

function blocAvui(cos, D){
  var dia = E.diaSetmana();
  var p = D.dies[dia] || {};
  var box = h('div','margin-bottom:24px;display:flex;flex-direction:column;gap:11px');
  cos.appendChild(box);

  var quantes = 0;
  if (p.routine_id){ box.appendChild(fitxaPesos(D, dia, p)); quantes++; }
  if (teCardio(p)){ box.appendChild(fitxaCardio(D, dia, p)); quantes++; }
  if (!quantes) box.appendChild(fitxaDescans());
}

function marc(){
  var t = h('div','background:'+C.panell+';border:1px solid '+C.vora+';'+
    'border-top:3px solid '+C.accio+';padding:19px 20px');
  t.appendChild(h('div','font-size:10px;letter-spacing:.16em;text-transform:uppercase;'+
    'font-weight:700;color:'+C.accio+';margin-bottom:10px','Avui'));
  return t;
}

function fitxaPesos(D, dia, p){
  var rut = D.rutines[p.routine_id];
  var ses = sessioAvui(D);
  var loc = E.llegeixCau('series');
  if (loc && loc.data !== E.avui()) loc = null;
  var t = marc();
  t.appendChild(E.titol((rut && rut.nom) || 'Entrenament', 22));

  var completada = (ses && ses.estat === 'completada') || (loc && loc.tancada);
  if (completada){
    var m = h('div','display:flex;gap:9px;align-items:center;margin-top:10px;flex-wrap:wrap');
    m.appendChild(E.etiqueta('Completat', C.oliva));
    var fetDia = ses ? diaDe(ses) : (loc ? loc.dia : dia);
    if (fetDia && fetDia !== dia)
      m.appendChild(h('div','font-size:12.5px;color:'+C.or,
        'entreno de ' + E.DIES[fetDia-1].toLowerCase()));
    t.appendChild(m);
    var rpe = ses ? ses.rpe : (loc ? loc.rpe : null);
    t.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';line-height:1.6;margin-top:10px',
      rpe ? 'Esforç percebut: ' + rpe + ' de 10' : 'Ben fet.'));
    if (E.pendents())
      t.appendChild(h('div','font-size:12.5px;color:'+C.ambre+';margin-top:9px;line-height:1.5',
        'Pujarà sol quan tornis a tenir connexió.'));
    return t;
  }

  var encurs = ses || (loc && Object.keys(loc.fetes || {}).length);
  var meta = h('div','display:flex;gap:9px;align-items:center;margin-top:9px;flex-wrap:wrap');
  if (rut && rut.tipus) meta.appendChild(E.etiqueta(rut.tipus, C.or));
  var nex = (D.exercicis[p.routine_id] || []).length;
  meta.appendChild(h('div','font-size:12.5px;color:'+C.apagat,
    nex + (nex === 1 ? ' exercici' : ' exercicis')));
  t.appendChild(meta);
  if (encurs) t.appendChild(h('div','font-size:13.5px;color:'+C.apagat+';line-height:1.55;'+
    'margin-top:9px','Sessió començada. Continua on ho havies deixat.'));
  var b = E.boto(encurs ? 'Continuar' : 'Començar l\'entrenament', function(){
    var d = ses ? diaDe(ses) : (loc && loc.dia) || dia;
    obreDia(D, d, 'pesos');
  });
  b.style.width = '100%'; b.style.marginTop = '16px';
  t.appendChild(b);
  return t;
}

function fitxaCardio(D, dia, p){
  var car = cardioAvui(D);
  var loc = E.llegeixCau('cardio');
  if (!car && loc && loc.data === E.avui()) car = loc;
  var rc = rutCardio(D, p);
  var t = marc();
  t.appendChild(E.titol(nomCardio(D, p), 22));
  if (rc){
    var mc = h('div','display:flex;gap:9px;align-items:center;margin-top:9px;flex-wrap:wrap');
    if (rc.tipus) mc.appendChild(E.etiqueta(rc.tipus, C.oliva));
    var pc = (D.exercicis[rc.id] || []).length;
    var sc = [pc + (pc === 1 ? ' tram' : ' trams')];
    if (rc.rondes > 1) sc.push(rc.rondes + ' rondes');
    sc.push('\u2248 ' + E.duradaCardio(rc, D.exercicis[rc.id] || []) + ' min');
    mc.appendChild(h('div','font-size:12.5px;color:'+C.apagat, sc.join(' \u00b7 ')));
    t.appendChild(mc);
  }
  if (car){
    var dades = [car.minuts ? car.minuts + ' min' : null,
      car.distancia_km ? car.distancia_km + ' km' : null,
      car.fc_mitjana ? car.fc_mitjana + ' ppm' : null].filter(Boolean).join(' \u00b7 ');
    var m = h('div','display:flex;gap:9px;align-items:center;margin-top:10px;flex-wrap:wrap');
    m.appendChild(E.etiqueta('Registrat', C.oliva));
    t.appendChild(m);
    t.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';line-height:1.6;margin-top:10px',
      dades || 'Fet.'));
    return t;
  }
  t.appendChild(h('div','font-size:13.5px;color:'+C.apagat+';line-height:1.55;margin-top:8px',
    rc ? 'Obre-la per veure els trams i registrar-la quan acabis.'
       : 'Registra la sessió quan acabis.'));
  var b = E.boto(rc ? 'Obrir la sessió' : 'Registrar el cardio',
    function(){ obreDia(D, dia, 'cardio'); });
  b.style.width = '100%'; b.style.marginTop = '16px';
  t.appendChild(b);
  return t;
}

function fitxaDescans(){
  var t = marc();
  t.appendChild(E.titol('Dia de descans', 22));
  t.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';line-height:1.6;margin-top:8px',
    'El descans forma part de l\'entrenament. Si tens ganes, pots avançar '+
    'un entreno de la setmana des de l\'Agenda.'));
  return t;
}

// Un entrenament al dia: si avui ja s'ha entrenat, no se n'obre un altre.
function obreDia(D, dia, tipus){
  var avui = E.diaSetmana();
  // Fer avui l'entreno d'un altre dia: nomes un al dia
  if (dia !== avui && jaEntrenatAvui(D)){
    missatge = 'Avui ja has entrenat. Un entrenament al dia: demà podràs fer '+
      'el de ' + E.DIES[dia-1].toLowerCase() + '.';
    E.repinta();
    return;
  }
  vista = { mode:'sessio', dia:dia, tipus:tipus || null };
  obert = null;
  if ((location.hash || '').replace('#','') === 'avui') E.repinta();
  else E.vesA('avui');
}

// ── La dieta d'avui ────────────────────────────────────────────────
function blocDieta(cos, D){
  cos.appendChild(encapcalament('La dieta d\'avui'));
  if (!D.dieta || !D.dieta.pla){
    cos.appendChild(E.buit('Encara no tens pla de dieta. '+
      'La nutricionista te n\'assignarà un.'));
    return;
  }
  var pla = D.dieta.pla;
  var apats = {};
  (pla.diet_plan_options || []).forEach(function(o){ apats[o.tipus_apat] = true; });
  var total = Object.keys(apats).length;
  var marcats = (D.apats || []).filter(function(x){ return x.fet; }).length;

  var t = h('div','background:'+C.panell+';border:1px solid '+C.vora+';padding:16px 17px');
  var f = h('div','display:flex;align-items:baseline;justify-content:space-between;gap:12px');
  var esq = h('div','flex:1;min-width:0');
  esq.appendChild(h('div','font-size:15px;font-weight:600;color:'+C.os+';line-height:1.3',
    pla.nom));
  esq.appendChild(h('div','font-size:12px;color:'+C.apagat+';margin-top:4px',
    pla.kcal_obj + ' kcal objectiu' +
    (pla.prot_obj ? ' \u00b7 ' + pla.prot_obj + 'g proteïna' : '')));
  f.appendChild(esq);
  if (total) f.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:18px;"+
    'color:'+(marcats ? C.oliva : C.apagat)+';flex-shrink:0', marcats + '/' + total));
  t.appendChild(f);
  var b = E.boto(marcats ? 'Continuar amb la dieta' : 'Què hi ha per menjar?',
    function(){ E.vesA('nutricio'); });
  b.style.width = '100%'; b.style.marginTop = '15px';
  b.style.minHeight = '46px'; b.style.fontSize = '12.5px';
  t.appendChild(b);
  cos.appendChild(t);
}

// ── Pantalla d'un dia ──────────────────────────────────────────────
function pantallaDia(cos, D, dia){
  var p = D.dies[dia] || {};
  // Un dia pot tenir pesos i cardio: es respecta el que s'ha triat
  if (vista.tipus === 'cardio' && teCardio(p)) return cardioDia(cos, D, dia);
  if (p.routine_id){
    var rut = D.rutines[p.routine_id];
    if (!rut){ cos.appendChild(E.avis('No es troba la rutina d\'aquest dia.')); return; }
    return mostraSessio(cos, D, dia, rut, D.exercicis[p.routine_id] || []);
  }
  if (teCardio(p)) return cardioDia(cos, D, dia);
  cos.appendChild(E.buit('Aquest dia és de descans.'));
}

// ── Cardio ─────────────────────────────────────────────────────────
function cardioDia(cos, D, dia){
  var fet = cardioDelDia(D, dia);
  var loc = E.llegeixCau('cardio');
  if (!fet && loc && loc.data === E.avui() && loc.dia === dia) fet = loc;
  if (fet){
    var t = E.targeta();
    t.style.borderColor = C.oliva + '55';
    t.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:20px;"+
      'color:'+C.oliva+';margin-bottom:9px','Cardio registrat'));
    var dades = [];
    if (fet.minuts) dades.push(fet.minuts + ' min');
    if (fet.distancia_km) dades.push(fet.distancia_km + ' km');
    if (fet.fc_mitjana) dades.push(fet.fc_mitjana + ' ppm');
    t.appendChild(h('div','font-size:14px;color:'+C.pedra+';line-height:1.6',
      (fet.tipus ? fet.tipus + ' \u00b7 ' : '') + (dades.join(' \u00b7 ') || 'Fet')));
    if (fet.local)
      t.appendChild(h('div','font-size:12.5px;color:'+C.ambre+';margin-top:9px;line-height:1.5',
        'Desat al mòbil. Pujarà sol quan tornis a tenir connexió.'));
    cos.appendChild(t);
    return;
  }

  var p = D.dies[dia] || {};
  var rc = rutCardio(D, p);
  var peces = rc ? (D.exercicis[rc.id] || []) : [];

  if (rc) cos.appendChild(planCardio(rc, peces, function(mins){
    // En acabar el cronòmetre, els minuts reals ja venen escrits
    if (mins) min.control.value = mins;
  }));

  var t2 = E.targeta();
  t2.appendChild(E.titol(rc ? 'Com t\'ha anat' : (p.cardio || 'Cardio'), 21));
  t2.appendChild(h('div','font-size:13.5px;color:'+C.apagat+';line-height:1.55;margin-top:8px',
    rc ? 'Apunta els minuts reals i, si en tens, la distància i les pulsacions.'
       : 'Registra la sessió quan acabis.'));

  var min = E.camp({ et:'Minuts', tipus:'number', marca:'40',
    valor: rc ? E.duradaCardio(rc, peces) : '' });
  var km  = E.camp({ et:'Distància (km)', tipus:'number', pas:'0.01' });
  var fc  = E.camp({ et:'Pulsació mitjana', tipus:'number', marca:'138' });
  var g = h('div','display:grid;grid-template-columns:1fr 1fr;gap:11px;margin:16px 0 14px');
  g.appendChild(min); g.appendChild(km); g.appendChild(fc);
  t2.appendChild(g);
  [min,km,fc].forEach(function(c){ c.control.onfocus = function(){ c.control.select(); }; });

  var miss = h('div','margin-bottom:12px');
  t2.appendChild(miss);

  var b = E.boto('Registrar el cardio', function(){
    E.buida(miss);
    if (!min.control.value){ miss.appendChild(E.avis('Escriu els minuts.')); return; }
    b.disabled = true; b.textContent = 'Desant…';
    var reg = {
      athlete_id: E.atleta.id, data: E.avui(), dia_previst: dia,
      tipus: rc ? rc.nom : (p.cardio || 'Cardio'),
      routine_id: rc ? rc.id : null,
      minuts: min.control.value,
      distancia_km: km.control.value || null,
      fc_mitjana: fc.control.value || null
    };
    E.escriuOp({ clau:'cardio:'+E.avui(), taula:'cardio_logs', mena:'insert', dades:reg })
      .then(function(r){
        b.disabled = false; b.textContent = 'Registrar el cardio';
        if (r.local){
          reg.local = true; reg.dia = dia;
          E.desaCau('cardio', reg);
          E.encua({ clau:'xp:cardio:'+E.avui(), mena:'xp', delta:25 });
          E.atleta.xp_total = (E.atleta.xp_total || 0) + 25;
          vista = { mode:'panell', dia:null };
          E.repinta();
          return;
        }
        if (r.error){ miss.appendChild(E.avis(r.error.message)); return; }
        // El cardio també és entrenament: compta experiència
        E.sb.from('athletes').update({ xp_total: (E.atleta.xp_total || 0) + 25 })
          .eq('id', E.atleta.id).then(function(){
            E.atleta.xp_total = (E.atleta.xp_total || 0) + 25;
            E.desaCau('cardio', null);
            vista = { mode:'panell', dia:null, tipus:null };
            E.repinta();
          });
      });
  });
  b.style.width = '100%';
  t2.appendChild(b);
  cos.appendChild(t2);
}

// Ensenya la sessió de cardio tal com l'ha dissenyada l'entrenador:
// els trams en ordre, amb el temps, la intensitat i el descans de cada un.
function planCardio(rc, peces, quanAcabi){
  var w = h('div','margin-bottom:18px');

  var cap = E.targeta();
  cap.style.borderTopColor = C.oliva;
  cap.style.borderTopWidth = '3px';
  cap.style.borderTopStyle = 'solid';
  cap.appendChild(E.titol(rc.nom, 22));
  var meta = h('div','display:flex;gap:9px;align-items:center;margin-top:10px;flex-wrap:wrap');
  if (rc.tipus) meta.appendChild(E.etiqueta(rc.tipus, C.oliva));
  var s = [peces.length + (peces.length === 1 ? ' tram' : ' trams')];
  if (rc.rondes > 1) s.push(rc.rondes + ' rondes');
  s.push('\u2248 ' + E.duradaCardio(rc, peces) + ' min');
  meta.appendChild(h('div','font-size:12.5px;color:'+C.apagat, s.join(' \u00b7 ')));
  cap.appendChild(meta);
  if (rc.notes) cap.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';line-height:1.6;'+
    'margin-top:12px;white-space:pre-wrap', rc.notes));

  // El cronòmetre canta els trams: no cal mirar el rellotge
  if (peces.length && E.cronoCardio){
    var bg = E.boto('Començar la sessió guiada', function(){
      E.cronoCardio(rc, peces, function(mins){ if (quanAcabi) quanAcabi(mins); });
    });
    bg.style.width = '100%';
    bg.style.marginTop = '16px';
    bg.style.minHeight = '54px';
    cap.appendChild(bg);
    cap.appendChild(h('div','font-size:12px;color:'+C.apagat+';line-height:1.5;margin-top:9px;'+
      'text-align:center','Va cantant els temps i els descansos. Pots pausar-la o '+
      'saltar un tram quan vulguis.'));
  }
  w.appendChild(cap);

  if (!peces.length){
    w.appendChild(E.buit('Aquesta sessió encara no té trams. Avisa el teu entrenador.'));
    return w;
  }

  if (rc.rondes > 1)
    w.appendChild(h('div','margin-top:14px;padding:12px 15px;background:'+C.panell2+';'+
      'border-left:3px solid '+C.or+';font-size:13px;color:'+C.os+';line-height:1.55',
      'Tot el que ve a sota, ' + rc.rondes + ' vegades' +
      (rc.descans_ronda_s ? ' \u00b7 ' + rc.descans_ronda_s + ' s de descans entre rondes' : '')));

  var bloc = null;
  var llista = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora+';'+
    'margin-top:14px');
  peces.forEach(function(e, i){
    if (e.bloc && e.bloc !== bloc){
      bloc = e.bloc;
      llista.appendChild(h('div','background:'+C.panell2+';padding:9px 15px;font-size:10px;'+
        'letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:'+C.or, e.bloc));
    }
    var seg = peces[i+1];
    var f = h('div','background:'+C.panell+';padding:13px 15px;display:flex;gap:13px;'+
      'align-items:flex-start'+(e.superserie ? ';border-left:3px solid '+C.or : ''));

    var imgs = (e.exercici && e.exercici.imatges) || [];
    if (imgs.length){
      var im = document.createElement('img');
      im.src = E.urlExercici(imgs[0]);
      im.alt = '';
      im.setAttribute('style','width:58px;height:58px;object-fit:cover;flex-shrink:0;'+
        'border:1px solid '+C.vora);
      f.appendChild(im);
    } else {
      f.appendChild(h('div',"width:26px;flex-shrink:0;font-family:'Cinzel',serif;"+
        'font-weight:700;font-size:16px;color:'+C.apagat+';padding-top:2px', String(i+1)));
    }

    var t = h('div','flex:1;min-width:0');
    t.appendChild(h('div','font-size:15px;font-weight:600;color:'+C.os+';line-height:1.3',
      (e.exercici && e.exercici.nom) || 'Tram'));
    var gran = h('div','display:flex;gap:10px;align-items:baseline;margin-top:5px;flex-wrap:wrap');
    gran.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:17px;"+
      'color:'+C.oliva, (e.series > 1 ? e.series + ' \u00d7 ' : '') + E.mesuraPeca(e)));
    if (e.descans_s) gran.appendChild(h('div','font-size:12px;color:'+C.apagat,
      e.descans_s + ' s de descans'));
    t.appendChild(gran);
    if (e.intensitat) t.appendChild(h('div','font-size:12.5px;color:'+C.or+';margin-top:4px;'+
      'font-weight:600', e.intensitat));
    if (e.exercici && e.exercici.consignes)
      t.appendChild(h('div','font-size:12.5px;color:'+C.apagat+';line-height:1.55;margin-top:5px;'+
        'white-space:pre-wrap', e.exercici.consignes));
    if (e.notes) t.appendChild(h('div','font-size:12.5px;color:'+C.pedra+';line-height:1.55;'+
      'margin-top:4px', e.notes));

    var vid = E.idYoutube && E.idYoutube(e.exercici && e.exercici.youtube_url);
    if (vid || imgs.length > 1){
      var acc = h('div','display:flex;gap:8px;margin-top:8px;flex-wrap:wrap');
      if (vid){
        var en = document.createElement('a');
        en.href = e.exercici.youtube_url;
        en.target = '_blank'; en.rel = 'noopener';
        en.textContent = 'Veure el vídeo';
        en.setAttribute('style','font-size:12px;color:'+C.pedra+';text-decoration:none;'+
          'border:1px solid '+C.vora+';padding:8px 12px;min-height:36px;display:flex;'+
          'align-items:center');
        acc.appendChild(en);
      }
      if (imgs.length > 1){
        var bg = document.createElement('button');
        bg.textContent = 'Veure les ' + imgs.length + ' imatges';
        bg.setAttribute('style','font-size:12px;color:'+C.pedra+';background:transparent;'+
          'border:1px solid '+C.vora+';padding:8px 12px;min-height:36px;cursor:pointer;'+
          "font-family:'Barlow',sans-serif");
        var tira = h('div','display:none;gap:7px;margin-top:8px;overflow-x:auto;padding-bottom:4px');
        imgs.forEach(function(cami){
          var m = document.createElement('img');
          m.src = E.urlExercici(cami);
          m.alt = '';
          m.setAttribute('style','height:150px;flex-shrink:0;object-fit:cover;'+
            'border:1px solid '+C.vora);
          tira.appendChild(m);
        });
        bg.onclick = function(){
          var obert = tira.style.display !== 'none';
          tira.style.display = obert ? 'none' : 'flex';
          bg.textContent = obert ? 'Veure les ' + imgs.length + ' imatges' : 'Amagar-les';
        };
        acc.appendChild(bg);
        t.appendChild(acc);
        t.appendChild(tira);
      } else {
        t.appendChild(acc);
      }
    }
    f.appendChild(t);
    llista.appendChild(f);

    if (e.descans_post_s && seg)
      llista.appendChild(h('div','background:'+C.fons+';padding:7px 15px;font-size:11.5px;'+
        'color:'+C.apagat, '\u00b7 ' + e.descans_post_s + ' s abans del següent \u00b7'));
  });
  w.appendChild(llista);
  return w;
}

// ── Sessio de pesos ────────────────────────────────────────────────
function mostraSessio(cos, D, dia, rut, ex){
  ex = ex || [];
  if (dia !== E.diaSetmana()){
    var nota = E.avis('Ho fas avui, però compta com l\'entreno de ' +
      E.DIES[dia-1].toLowerCase() + '. Aquell dia quedarà lliure.', C.or);
    nota.style.marginBottom = '16px';
    cos.appendChild(nota);
  }

  var cap = h('div','margin-bottom:18px');
  cap.appendChild(E.titol(rut.nom, 23));
  var meta = h('div','display:flex;gap:9px;align-items:center;margin-top:9px;flex-wrap:wrap');
  if (rut.tipus) meta.appendChild(E.etiqueta(rut.tipus, C.or));
  meta.appendChild(h('div','font-size:12.5px;color:'+C.apagat,
    ex.length + (ex.length === 1 ? ' exercici' : ' exercicis')));
  cap.appendChild(meta);
  if (rut.notes) cap.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';'+
    'line-height:1.6;margin-top:12px;white-space:pre-wrap', rut.notes));
  cos.appendChild(cap);

  if (!ex.length){
    cos.appendChild(E.buit('Aquesta rutina encara no té exercicis.'));
    return;
  }

  var loc = E.llegeixCau('series');
  if (!loc || loc.data !== E.avui() || loc.dia !== dia)
    loc = { data:E.avui(), dia:dia, rutNom:rut.nom, sesId:null, fetes:{}, tancada:false };

  var ses = sessioAvui(D);
  var estatSes = { id: ses ? ses.id : loc.sesId };
  if (!ses && loc.tancada) ses = { estat:'completada', rpe:loc.rpe || null };
  if (ses && ses.estat === 'completada') meta.appendChild(E.etiqueta('Completada', C.oliva));

  function desaLocal(){ loc.sesId = estatSes.id; E.desaCau('series', loc); }
  function esLocal(id){ return !id || String(id).indexOf('local:') === 0; }

  function assegura(){
    if (estatSes.id) return Promise.resolve(estatSes.id);
    var caps = { routine_id:rut.id, assignment_id:D.assigId, estat:'en_curs',
      dia_previst:dia, setmana:D.setmana };
    if (!navigator.onLine){
      estatSes.id = 'local:sessio:' + E.avui();
      E.encua({ clau:'sessio:'+E.avui(), taula:'workout_sessions', mena:'natural',
        natural:{ athlete_id:E.atleta.id, data:E.avui() }, dades:caps,
        localId: estatSes.id });
      desaLocal();
      return Promise.resolve(estatSes.id);
    }
    var files = { athlete_id:E.atleta.id, data:E.avui() };
    Object.keys(caps).forEach(function(k){ files[k] = caps[k]; });
    return E.sb.from('workout_sessions').insert(files).select('id').single().then(function(r){
      if (r.error) throw new Error(r.error.message);
      estatSes.id = r.data.id;
      desaLocal();
      return r.data.id;
    });
  }

  var fetes = {};
  var carregaSeries = (!esLocal(estatSes.id) && navigator.onLine)
    ? E.sb.from('set_logs').select('*').eq('session_id', estatSes.id)
    : Promise.resolve({ data:[] });

  carregaSeries.then(function(sl){
    (sl.data || []).forEach(function(x){
      fetes[x.routine_exercise_id + ':' + x.serie] = x;
    });
    Object.keys(loc.fetes || {}).forEach(function(k){ fetes[k] = loc.fetes[k]; });

    var llista = h('div','display:flex;flex-direction:column;gap:10px');
    cos.appendChild(llista);
    var X = { fetes:fetes, assegura:assegura, estatSes:estatSes, loc:loc,
              desaLocal:desaLocal, esLocal:esLocal, dia:dia };
    pintaExercicis(llista, ex, X);

    var final = h('div','margin-top:24px');
    cos.appendChild(final);
    pintaFinal(final, ex, X, ses);

  });
}

function pintaExercicis(llista, ex, X){
  var fetes = X.fetes;
  E.buida(llista);
  var blocActual = null;

  ex.forEach(function(e, i){
    if (e.bloc && e.bloc !== blocActual){
      blocActual = e.bloc;
      llista.appendChild(h('div','font-size:10px;letter-spacing:.14em;text-transform:uppercase;'+
        'font-weight:700;color:'+C.or+';margin-top:'+(i ? '12px' : '0')+';margin-bottom:2px',
        e.bloc));
    }

    var totes = 0;
    for (var s = 1; s <= e.series; s++) if (fetes[e.id + ':' + s]) totes++;
    var completat = totes >= e.series;

    var t = h('div','background:'+C.panell+';border:1px solid '+
      (completat ? C.oliva+'55' : C.vora)+';padding:15px 16px'+
      (e.superserie ? ';border-left:3px solid '+C.or : ''));

    var cap = h('div','display:flex;align-items:flex-start;gap:12px;cursor:pointer');
    cap.onclick = function(){
      obert = obert === e.id ? null : e.id;
      pintaExercicis(llista, ex, X);
    };

    var num = h('div','width:30px;height:30px;flex-shrink:0;background:'+
      (completat ? C.oliva : C.panell2)+';border:1px solid '+
      (completat ? C.oliva : C.vora)+";display:flex;align-items:center;justify-content:center;"+
      "font-family:'Cinzel',serif;font-weight:700;font-size:13px;color:"+
      (completat ? '#0D0D0F' : C.pedra), completat ? '\u2713' : String(i+1));
    cap.appendChild(num);

    var tx = h('div','flex:1;min-width:0');
    tx.appendChild(h('div','font-size:16px;font-weight:600;color:'+C.os+';line-height:1.3',
      (e.exercici && e.exercici.nom) || 'Exercici'));
    var sub = [e.series + ' \u00d7 ' + (e.reps || '?')];
    if (e.superserie) sub.push('supersèrie ' + e.superserie);
    if (e.tempo) sub.push('tempo ' + e.tempo);
    if (e.rir != null) sub.push('RIR ' + e.rir);
    tx.appendChild(h('div','font-size:12.5px;color:'+C.apagat+';margin-top:4px;line-height:1.4',
      sub.join(' \u00b7 ')));
    cap.appendChild(tx);

    cap.appendChild(h('div','flex-shrink:0;font-size:13px;color:'+C.apagat+';padding-top:6px',
      obert === e.id ? '\u25B4' : '\u25BE'));
    t.appendChild(cap);

    if (obert === e.id){
      var det = h('div','margin-top:15px;padding-top:15px;border-top:1px solid '+C.vora);

      if (e.exercici && e.exercici.youtube_url){
        var a = document.createElement('a');
        a.href = e.exercici.youtube_url;
        a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Veure el vídeo de tècnica';
        a.setAttribute('style','display:block;padding:13px;margin-bottom:14px;'+
          'background:'+C.panell2+';border:1px solid '+C.vora+';color:'+C.or+';'+
          'font-size:13.5px;font-weight:600;text-align:center;text-decoration:none');
        det.appendChild(a);
      }
      if (e.exercici && e.exercici.consignes)
        det.appendChild(h('div','font-size:13px;color:'+C.pedra+';line-height:1.6;'+
          'margin-bottom:14px;white-space:pre-wrap', e.exercici.consignes));
      if (e.notes) det.appendChild(E.avis(e.notes, C.or));

      var info = [];
      if (e.descans_s) info.push('Descans entre sèries: ' + e.descans_s + 's');
      if (e.descans_post_s) info.push('Descans en acabar: ' + e.descans_post_s + 's');
      if (info.length)
        det.appendChild(h('div','font-size:12px;color:'+C.apagat+';line-height:1.5;'+
          'margin:12px 0 14px', info.join(' \u00b7 ')));

      det.appendChild(h('div','font-size:10px;letter-spacing:.13em;text-transform:uppercase;'+
        'font-weight:700;color:'+C.apagat+';margin-bottom:9px','Sèries'));
      var gs = h('div','display:flex;flex-direction:column;gap:8px');
      for (var s2 = 1; s2 <= e.series; s2++) (function(serie){
        var reg = fetes[e.id + ':' + serie];
        var f = h('div','display:flex;align-items:center;gap:9px');
        f.appendChild(h('div','width:26px;flex-shrink:0;font-size:12.5px;font-weight:700;'+
          'color:'+C.apagat, String(serie)));

        var iR = document.createElement('input');
        iR.type = 'number'; iR.placeholder = e.reps || 'reps';
        iR.inputMode = 'numeric';
        if (reg && reg.reps != null) iR.value = reg.reps;
        var iP = document.createElement('input');
        iP.type = 'number'; iP.step = '0.5'; iP.placeholder = 'kg';
        iP.inputMode = 'decimal';
        if (reg && reg.pes_kg != null) iP.value = reg.pes_kg;
        [iR,iP].forEach(function(x){
          x.setAttribute('style','flex:1;min-width:0;min-height:46px;padding:11px;'+
            'background:'+C.fons+';border:1px solid '+(reg ? C.oliva+'55' : 'rgba(194,176,106,.24)')+';'+
            "color:"+C.os+";font-size:16px;font-family:'Barlow',sans-serif;text-align:center");
          x.onfocus = function(){ x.select(); };
        });
        f.appendChild(iR); f.appendChild(iP);

        var b = document.createElement('button');
        b.textContent = reg ? '\u2713' : 'OK';
        b.setAttribute('style','width:52px;min-height:46px;flex-shrink:0;background:'+
          (reg ? C.oliva : C.accio)+';border:none;color:'+(reg ? '#0D0D0F' : '#fff')+';'+
          "font-size:14px;font-weight:700;cursor:pointer;font-family:'Barlow',sans-serif;"+
          '-webkit-tap-highlight-color:transparent');
        b.onclick = function(){
          if (!iR.value && !iP.value) return;
          b.disabled = true; b.textContent = '…';
          X.assegura().then(function(sid){
            var dades = {
              exercise_id: e.exercise_id,
              reps: iR.value === '' ? null : parseInt(iR.value, 10),
              pes_kg: iP.value === '' ? null : iP.value,
              device_ts: new Date().toISOString()
            };
            if (!navigator.onLine || X.esLocal(sid)){
              E.encua({ clau:'serie:'+e.id+':'+serie, taula:'set_logs', mena:'natural',
                natural:{ session_id:sid, routine_exercise_id:e.id, serie:serie },
                dades: dades });
              fetes[e.id + ':' + serie] = { local:true, serie:serie,
                routine_exercise_id:e.id, reps:dades.reps, pes_kg:dades.pes_kg };
              X.loc.fetes = fetes;
              X.desaLocal();
              b.disabled = false;
              pintaExercicis(llista, ex, X);
              return;
            }
            var reg2 = fetes[e.id + ':' + serie];
            var plenes = { session_id: sid, routine_exercise_id: e.id, serie: serie };
            Object.keys(dades).forEach(function(k){ plenes[k] = dades[k]; });
            var p = (reg2 && reg2.id)
              ? E.sb.from('set_logs').update(plenes).eq('id', reg2.id).select('*').single()
              : E.sb.from('set_logs').insert(plenes).select('*').single();
            return p.then(function(r){
              b.disabled = false;
              if (r.error){ b.textContent = '!'; return; }
              fetes[e.id + ':' + serie] = r.data;
              X.loc.fetes = fetes;
              X.desaLocal();
              pintaExercicis(llista, ex, X);
            });
          }).catch(function(){ b.disabled = false; b.textContent = '!'; });
        };
        f.appendChild(b);
        gs.appendChild(f);
      })(s2);
      det.appendChild(gs);
      t.appendChild(det);
    }

    if (totes && !completat && obert !== e.id)
      t.appendChild(h('div','margin-top:11px;font-size:11.5px;color:'+C.ambre,
        totes + ' de ' + e.series + ' sèries fetes'));

    llista.appendChild(t);
  });
}

function pintaFinal(cont, ex, X, ses){
  var fetes = X.fetes;
  E.buida(cont);
  if (ses && ses.estat === 'completada'){
    var ok = E.targeta();
    ok.style.borderColor = C.oliva + '55';
    ok.style.textAlign = 'center';
    ok.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:19px;"+
      'color:'+C.oliva+';margin-bottom:6px','Sessió completada'));
    ok.appendChild(h('div','font-size:13.5px;color:'+C.pedra+';line-height:1.55',
      ses.rpe ? 'Esforç percebut: ' + ses.rpe + ' de 10' : 'Ben fet.'));
    if (E.pendents())
      ok.appendChild(h('div','font-size:12.5px;color:'+C.ambre+';margin-top:9px;line-height:1.5',
        'Queda per pujar quan tornis a tenir connexió.'));
    cont.appendChild(ok);
    return;
  }

  var totalSeries = 0, totalFetes = 0;
  ex.forEach(function(e){
    totalSeries += e.series;
    for (var s = 1; s <= e.series; s++) if (fetes[e.id + ':' + s]) totalFetes++;
  });

  var t = E.targeta();
  t.appendChild(E.titol('Tancar la sessió', 17));
  t.appendChild(h('div','font-size:13px;color:'+C.apagat+';line-height:1.55;margin:6px 0 15px',
    totalFetes + ' de ' + totalSeries + ' sèries registrades.'));

  t.appendChild(h('div','font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;'+
    'font-weight:700;color:'+C.apagat+';margin-bottom:9px','Com de dur ha estat? (1 a 10)'));
  var rpe = { v:null };
  var gr = h('div','display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:16px');
  for (var n = 1; n <= 10; n++) (function(v){
    var b = document.createElement('button');
    b.textContent = String(v);
    b.setAttribute('style','min-height:46px;background:transparent;border:1px solid '+C.vora+';'+
      'color:'+C.pedra+";font-size:15px;font-weight:600;cursor:pointer;"+
      "font-family:'Barlow',sans-serif;-webkit-tap-highlight-color:transparent");
    b.onclick = function(){
      rpe.v = v;
      var tots = gr.querySelectorAll('button');
      for (var i=0;i<tots.length;i++){
        var sel = i + 1 === v;
        tots[i].style.background = sel ? C.accio : 'transparent';
        tots[i].style.borderColor = sel ? C.accio : C.vora;
        tots[i].style.color = sel ? '#fff' : C.pedra;
      }
    };
    gr.appendChild(b);
  })(n);
  t.appendChild(gr);

  var nt = E.camp({ et:'Notes per a l\'entrenador', tipus:'textarea', files:2,
    marca:'Opcional: molèsties, sensacions…' });
  t.appendChild(nt);

  var miss = h('div','margin:13px 0');
  t.appendChild(miss);

  var b = E.boto('Sessió completada', function(){
    E.buida(miss);
    if (!totalFetes){
      miss.appendChild(E.avis('Registra com a mínim una sèrie abans de tancar.'));
      return;
    }
    b.disabled = true; b.textContent = 'Desant…';
    X.assegura().then(function(sid){
      var tanca = { estat:'completada', rpe:rpe.v, notes:nt.control.value.trim() || null,
        dia_previst:X.dia };

      if (!navigator.onLine || X.esLocal(sid)){
        E.encua({ clau:'tancar:'+E.avui(), taula:'workout_sessions', mena:'natural',
          natural:{ athlete_id:E.atleta.id, data:E.avui() }, dades:tanca });
        E.encua({ clau:'xp:'+E.avui(), mena:'xp', delta: totalFetes * 10 });
        E.atleta.xp_total = (E.atleta.xp_total || 0) + totalFetes * 10;
        X.loc.tancada = true; X.loc.rpe = rpe.v;
        X.desaLocal();
        vista = { mode:'panell', dia:null, tipus:null };
        E.repinta();
        return;
      }

      return E.sb.from('workout_sessions').update(tanca).eq('id', sid)
        .then(function(r){
          if (r.error) throw new Error(r.error.message);
          return E.sb.from('athletes')
            .update({ xp_total: (E.atleta.xp_total || 0) + totalFetes * 10 })
            .eq('id', E.atleta.id);
        })
        .then(function(){
          E.atleta.xp_total = (E.atleta.xp_total || 0) + totalFetes * 10;
          X.loc.tancada = true; X.loc.rpe = rpe.v;
          X.desaLocal();
          vista = { mode:'panell', dia:null };
          E.repinta();
        });
    }).catch(function(err){
      b.disabled = false; b.textContent = 'Sessió completada';
      miss.appendChild(E.avis(err.message));
    });
  });
  b.style.width = '100%';
  t.appendChild(b);
  cont.appendChild(t);
}

// Ho fa servir l'Agenda
E.obreDia = obreDia;
E.jaEntrenatAvui = jaEntrenatAvui;
E.acabatDia = acabat;

})();
