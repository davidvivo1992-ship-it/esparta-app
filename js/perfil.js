// Metabolisme Esparta · Perfil de l'Esparta
(function(){
var E = window.ESPARTA, h = E.h, C = E.C;

var OBJECTIUS = {
  perdre_greix:'Perdre greix', guanyar_muscul:'Guanyar múscul',
  rendiment:'Rendiment', salut:'Salut', recomposicio:'Recomposició'
};
var NIVELLS = { recluta:'Recluta', intermedi:'Intermedi', avancat:'Avançat' };

E.seccions.push({
  id:'perfil', etiqueta:'Perfil', icona:'\u25CB',
  pinta: function(cont){
    cont.appendChild(E.capcalera('El teu perfil'));
    var cos = E.cos();

    var xp = E.atleta.xp_total || 0;
    var rang = E.rangDe(xp);

    var cap = h('div','display:flex;align-items:center;gap:15px;margin-bottom:22px');
    cap.appendChild(h('div','width:58px;height:58px;flex-shrink:0;background:'+C.carmesi+';'+
      'border:1px solid '+C.or+";display:flex;align-items:center;justify-content:center;"+
      "font-family:'Cinzel',serif;font-weight:700;font-size:21px;color:#F0E4C8",
      ((E.perfil.nom||'?')[0] + (E.perfil.cognoms ? E.perfil.cognoms[0] : '')).toUpperCase()));
    var t = h('div','min-width:0');
    t.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:20px;"+
      'color:'+C.os+';line-height:1.2', E.nomComplet(E.perfil)));
    t.appendChild(h('div','font-size:11px;letter-spacing:.13em;text-transform:uppercase;'+
      'font-weight:700;color:'+C.or+';margin-top:4px', rang.nom));
    cap.appendChild(t);
    cos.appendChild(cap);

    var dades = [
      ['Correu', E.perfil.email || '\u2014'],
      ['Objectiu', OBJECTIUS[E.atleta.objectiu] || 'sense definir'],
      ['Nivell', NIVELLS[E.atleta.nivell] || E.atleta.nivell],
      ['Alçada', E.atleta.altura_cm ? E.atleta.altura_cm + ' cm' : '\u2014'],
      ['Experiència', xp + ' punts'],
      ['Alta', E.data(E.atleta.created_at)]
    ];
    var g = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora+';'+
      'margin-bottom:22px');
    dades.forEach(function(d){
      var f = h('div','background:'+C.panell+';padding:13px 16px;display:flex;'+
        'justify-content:space-between;align-items:baseline;gap:12px');
      f.appendChild(h('div','font-size:12.5px;color:'+C.apagat, d[0]));
      f.appendChild(h('div','font-size:13.5px;color:'+C.os+';font-weight:500;text-align:right',
        d[1]));
      g.appendChild(f);
    });
    cos.appendChild(g);

    cos.appendChild(h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
      'font-weight:700;color:'+C.or+';margin-bottom:11px','Els rangs'));
    var lr = h('div','display:flex;flex-direction:column;gap:1px;background:'+C.vora+';'+
      'margin-bottom:24px');
    E.RANGS.forEach(function(r){
      var assolit = xp >= r.xp;
      var actual = r.id === rang.id;
      var f = h('div','background:'+(actual ? C.panell2 : C.panell)+';padding:12px 16px;'+
        'display:flex;justify-content:space-between;align-items:center;gap:12px'+
        (actual ? ';border-left:3px solid '+C.or : ''));
      var esq = h('div','display:flex;gap:10px;align-items:center;min-width:0');
      esq.appendChild(h('div','width:18px;flex-shrink:0;font-size:13px;color:'+
        (assolit ? C.oliva : C.apagat), assolit ? '\u2713' : '\u25CB'));
      esq.appendChild(h('div',"font-family:'Cinzel',serif;font-weight:700;font-size:14.5px;"+
        'color:'+(assolit ? C.os : C.apagat), r.nom));
      f.appendChild(esq);
      f.appendChild(h('div','font-size:11.5px;color:'+C.apagat+';flex-shrink:0',
        r.xp + ' punts'));
      lr.appendChild(f);
    });
    cos.appendChild(lr);

    // ── Avisos al mòbil ─────────────────────────────────────────
    cos.appendChild(h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
      'font-weight:700;color:'+C.or+';margin:26px 0 11px','Avisos al mòbil'));
    var av = h('div','background:'+C.panell+';border:1px solid '+C.vora+';padding:15px 16px;'+
      'margin-bottom:22px');
    cos.appendChild(av);
    pintaAvisos(av);

    // ── Contrasenya ─────────────────────────────────────────────
    cos.appendChild(h('div','font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;'+
      'font-weight:700;color:'+C.or+';margin:26px 0 11px','Contrasenya'));
    var cp = h('div','background:'+C.panell+';border:1px solid '+C.vora+';padding:15px 16px;'+
      'margin-bottom:22px');
    cos.appendChild(cp);
    pintaContrasenya(cp);

    var b = E.boto('Tancar sessió', function(){ E.sortir(); }, 'buit');
    b.style.width = '100%';
    cos.appendChild(b);

    cos.appendChild(h('div','margin-top:18px;font-size:11.5px;color:'+C.apagat+';'+
      'line-height:1.55;text-align:center',
      'Les teves dades de salut només les veuen el teu entrenador i la nutricionista.'));

    // Serveix per saber si el mobil ja té l'última versió
    cos.appendChild(h('div','margin-top:14px;font-size:10.5px;color:'+C.apagat+';'+
      'text-align:center;letter-spacing:.1em','VERSIÓ 20'));

    cont.appendChild(cos);
  }
});
// Tancat per defecte: la majoria de vegades que s'obre el perfil no es
// per canviar la contrasenya.
function pintaContrasenya(cp){
  E.buida(cp);
  cp.appendChild(h('div','font-size:13px;color:'+C.pedra+';line-height:1.55',
    'La que fas servir per entrar. Si te la canvies, l\'hauràs de fer servir '+
    'a tots els aparells.'));
  var b = E.boto('Canviar la contrasenya', function(){
    E.buida(cp);
    cp.appendChild(h('div','font-size:13px;color:'+C.pedra+';line-height:1.55;'+
      'margin-bottom:13px', 'Escriu la d\'ara i la nova dues vegades.'));
    cp.appendChild(E.formContrasenya());
    var t = E.boto('Deixar-ho estar', function(){ pintaContrasenya(cp); }, 'buit');
    t.style.width = '100%'; t.style.marginTop = '9px';
    cp.appendChild(t);
  }, 'buit');
  b.style.width = '100%';
  b.style.marginTop = '13px';
  cp.appendChild(b);
}

function pintaAvisos(av){
  E.buida(av);
  if (!E.avisosPossibles || !E.avisosPossibles()){
    av.appendChild(h('div','font-size:13px;color:'+C.apagat+';line-height:1.55',
      'Aquest mòbil no admet avisos. Si has obert l\'app dins el navegador, '+
      'afegeix-la a la pantalla d\'inici i tornaran a estar disponibles.'));
    return;
  }
  var estat = E.avisosEstat();
  var miss = h('div','margin-top:11px');

  if (estat === 'denied'){
    av.appendChild(h('div','font-size:13px;color:'+C.pedra+';line-height:1.55',
      'Els avisos estan blocats per al mòbil. Obre els ajustos del telèfon, '+
      'busca aquesta app i permet-li les notificacions.'));
    return;
  }

  av.appendChild(h('div','font-size:13px;color:'+C.pedra+';line-height:1.55;margin-bottom:4px',
    estat === 'granted'
      ? 'Rebràs avís quan el teu entrenador et canviï el pla, la nutricionista '+
        'et canviï la dieta o t\'escriguin.'
      : 'Activa\'ls i sabràs de seguida quan tinguis pla nou, dieta nova o un missatge.'));

  var b = E.boto(estat === 'granted' ? 'Deixar de rebre avisos' : 'Activar els avisos',
    function(){
      b.disabled = true;
      b.textContent = estat === 'granted' ? 'Desactivant…' : 'Activant…';
      var p = estat === 'granted' ? E.avisosDesactiva() : E.avisosActiva();
      p.then(function(){
        pintaAvisos(av);
      }, function(err){
        b.disabled = false;
        b.textContent = estat === 'granted' ? 'Deixar de rebre avisos' : 'Activar els avisos';
        E.buida(miss);
        miss.appendChild(E.avis(err.message));
      });
    }, estat === 'granted' ? 'buit' : null);
  b.style.width = '100%';
  b.style.marginTop = '13px';
  av.appendChild(b);
  av.appendChild(miss);
}
})();
