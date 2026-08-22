/* ============================================================
   NEXUS-7 :: sprites.js
   Carica gli sprite 512-per-cella e ne prepara una copia per ogni
   livello di zoom. Gli originali vengono poi rilasciati: tenerli
   tutti decodificati in memoria costerebbe ~50 MB su un telefono.
   Le dimensioni di zoom dividono 512 per un intero, quindi il
   ridimensionamento non spezza mai un pixel dell'arte.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DATA;
  var BASE = 'sprites/';
  var PX_SORGENTE = 512;                 /* px di sprite per cella di mappa */
  var ZOOM_PX = [16, 32, 64];            /* tutti divisori esatti di 512 */
  var VARIANTI_TERRENO = 3;

  function ridimensiona(img, w, h, px) {
    var cv = document.createElement('canvas');
    cv.width = w * px; cv.height = h * px;
    var g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;     /* nearest: i pixel restano netti */
    g.drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  }

  function segnaposto(w, h, px) {
    var cv = document.createElement('canvas');
    cv.width = w * px; cv.height = h * px;
    var g = cv.getContext('2d');
    g.fillStyle = '#8a3a30'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#e05c4d'; g.fillRect(1, 1, cv.width - 2, cv.height - 2);
    return cv;
  }

  var Sprites = {
    ZOOM_PX: ZOOM_PX,
    cache: {},          /* cache[nome][px] = canvas pronto al disegno */
    pronto: false,
    mancanti: [],

    /* Elenco di tutto cio' che va caricato: {nome, file, w, h}. */
    elenco: function () {
      var out = [], i, k, v;
      for (i = 0; i < D.BUILDINGS.length; i++) {
        var def = D.BUILDINGS[i];
        if (def.road) continue;          /* i tracciati hanno 16 varianti */
        out.push({ nome: 'ed_' + def.id, file: 'ed_' + def.id + '.png', w: def.w, h: def.h });
      }
      for (i = 0; i < 16; i++) {
        out.push({ nome: 'strada_' + i, file: 'ed_strada_' + i + '.png', w: 1, h: 1 });
      }
      for (k in D.TERRAIN) {
        for (v = 0; v < VARIANTI_TERRENO; v++) {
          out.push({ nome: 'te_' + k + '_' + v, file: 'te_' + k + '_' + v + '.png', w: 1, h: 1 });
        }
      }
      return out;
    },

    url: function (nomeFile) { return BASE + nomeFile; },

    /* URL dello sprite di un edificio, per il pannello di scansione. */
    urlEdificio: function (tipo, maschera) {
      if (tipo === 'strada') return BASE + 'ed_strada_' + (maschera || 0) + '.png';
      return BASE + 'ed_' + tipo + '.png';
    },

    /* Carica tutto in sequenza controllata e costruisce le cache. */
    carica: function (avanzamento, fine) {
      var self = this;
      var voci = this.elenco();
      var totale = voci.length, fatti = 0, indice = 0;
      var PARALLELE = 6;

      function prossima() {
        if (indice >= voci.length) return;
        var v = voci[indice++];
        var img = new Image();
        img.decoding = 'async';
        var chiuso = false;

        function completa(ok) {
          if (chiuso) return;            /* onload/onerror scattano una volta sola */
          chiuso = true;
          var c = self.cache[v.nome] = {};
          for (var z = 0; z < ZOOM_PX.length; z++) {
            var px = ZOOM_PX[z];
            c[px] = ok ? ridimensiona(img, v.w, v.h, px) : segnaposto(v.w, v.h, px);
          }
          if (!ok) self.mancanti.push(v.file);
          /* Niente img.src = '': azzerare src fa partire una richiesta verso
             l'URL della pagina e rientra qui dentro. Basta perdere il
             riferimento, al resto pensa il garbage collector. */
          img.onload = img.onerror = null;
          img = null;
          fatti++;
          if (avanzamento) avanzamento(fatti, totale);
          if (fatti >= totale) { self.pronto = true; if (fine) fine(); }
          else prossima();
        }

        img.onload = function () { completa(true); };
        img.onerror = function () { completa(false); };
        img.src = BASE + v.file;
      }

      if (!totale) { this.pronto = true; if (fine) fine(); return; }
      for (var p = 0; p < PARALLELE; p++) prossima();
    },

    /* Canvas gia' scalato, pronto per drawImage. */
    prendi: function (nome, px) {
      var c = this.cache[nome];
      return c ? c[px] : null;
    },

    /* Variante di terreno scelta in modo deterministico dalla posizione:
       stessa cella, stessa variante a ogni ridisegno. */
    varianteTerreno: function (x, y) {
      var n = (x * 73856093) ^ (y * 19349663);
      return Math.abs(n) % VARIANTI_TERRENO;
    }
  };

  global.Sprites = Sprites;
})(window);
