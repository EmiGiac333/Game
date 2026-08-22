/* ============================================================
   NEXUS-7 :: main.js -- avvio
   ============================================================ */
(function (global) {
  'use strict';
  var E = global.Engine, UI = global.UI;

  function avvia(continua) {
    if (!(continua && E.carica())) E.nuovaPartita();
    document.getElementById('boot').style.display = 'none';
    UI.init();
  }

  /* Gli sprite servono prima di poter disegnare la plancia: finche' non
     sono pronti i pulsanti restano disabilitati e la barra mostra i progressi. */
  function caricaGrafica(fine) {
    var prog = document.getElementById('boot-prog');
    global.Sprites.carica(function (fatti, totale) {
      var q = Math.round(fatti / totale * 20);
      prog.textContent = 'grafica  [' + new Array(q + 1).join('#') +
        new Array(20 - q + 1).join('-') + ']  ' + fatti + '/' + totale;
    }, function () {
      var mancanti = global.Sprites.mancanti.length;
      prog.textContent = mancanti
        ? mancanti + ' sprite non caricati: la partita usa segnaposto'
        : 'pronto';
      if (mancanti) prog.className = 'errore';
      fine();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var haSalvataggio = false;
    try { haSalvataggio = !!localStorage.getItem('nexus7.save.v1'); } catch (e) {}

    var bc = document.getElementById('boot-continua');
    var bn = document.getElementById('boot-nuova');
    if (!haSalvataggio) bc.classList.add('dis');
    bc.classList.add('dis'); bn.classList.add('dis');

    caricaGrafica(function () {
      if (haSalvataggio) bc.classList.remove('dis');
      bn.classList.remove('dis');
      bc.addEventListener('click', function () { avvia(haSalvataggio); });
      bn.addEventListener('click', function () {
        E.cancellaSalvataggio();
        avvia(false);
      });
    });

    /* Service worker: rende il gioco disponibile offline una volta caricato.
       Non funziona da file:// -- in quel caso si ignora silenziosamente. */
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  });
})(window);
