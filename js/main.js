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

  document.addEventListener('DOMContentLoaded', function () {
    var haSalvataggio = false;
    try { haSalvataggio = !!localStorage.getItem('nexus7.save.v1'); } catch (e) {}

    var bc = document.getElementById('boot-continua');
    if (!haSalvataggio) bc.classList.add('dis');
    bc.addEventListener('click', function () { avvia(haSalvataggio); });
    document.getElementById('boot-nuova').addEventListener('click', function () {
      E.cancellaSalvataggio();
      avvia(false);
    });

    /* Service worker: rende il gioco disponibile offline una volta caricato.
       Non funziona da file:// -- in quel caso si ignora silenziosamente. */
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  });
})(window);
