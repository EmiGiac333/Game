/* ============================================================
   NEXUS-7 :: render.js
   Disegna la plancia su canvas: terreno, perimetro del settore,
   strutture, stato e cursore. Nessuna interpolazione: gli sprite
   restano pixelati a qualunque livello di zoom.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DATA, E = global.Engine, S = global.Sprites;

  var Render = {
    px: 32,                     /* lato di una cella, in pixel */
    canvas: null,
    ctx: null,
    cursore: { x: 0, y: 0 },
    tipoDaCostruire: null,

    get modo() { return this.px <= 8 ? 'tattica' : 'dettaglio'; },

    imposta: function (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
    },

    dimensiona: function () {
      if (!this.canvas) return;
      this.canvas.width = E.MAP_W * this.px;
      this.canvas.height = E.MAP_H * this.px;
      this.ctx.imageSmoothingEnabled = false;
    },

    /* Maschera dei tracciati adiacenti: N=1 S=2 E=4 O=8. */
    bitStrada: function (x, y) {
      function road(xx, yy) {
        var b = E.edificioSu(xx, yy);
        return b && b.tipo === 'strada' ? 1 : 0;
      }
      return road(x, y - 1) | (road(x, y + 1) << 1) | (road(x + 1, y) << 2) | (road(x - 1, y) << 3);
    },

    /* =========================================================
       DISEGNO COMPLETO
       ========================================================= */
    disegna: function () {
      if (!this.ctx || !S.pronto) return;
      var g = this.ctx, px = this.px, st = E.state;
      var x, y, b, def;

      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, this.canvas.width, this.canvas.height);

      /* --- terreno --- */
      for (y = 0; y < E.MAP_H; y++) {
        for (x = 0; x < E.MAP_W; x++) {
          var t = E.tile(x, y);
          var tipo = (t.t === 'rubble' && t.cl) ? 'ash' : t.t;
          var img = S.prendi('te_' + tipo + '_' + S.varianteTerreno(x, y), px);
          if (img) g.drawImage(img, x * px, y * px);
        }
      }

      /* --- fuori dal perimetro autorizzato --- */
      g.fillStyle = 'rgba(4,6,4,0.62)';
      for (y = 0; y < E.MAP_H; y++) {
        for (x = 0; x < E.MAP_W; x++) {
          if (!E.nelSettore(x, y, 1, 1)) g.fillRect(x * px, y * px, px, px);
        }
      }

      /* --- griglia discreta, solo dentro il perimetro --- */
      if (px >= 32) {
        var cx = Math.floor(E.MAP_W / 2), cy = Math.floor(E.MAP_H / 2), r = E.raggio();
        var gx0 = Math.max(0, cx - r), gy0 = Math.max(0, cy - r);
        var gx1 = Math.min(E.MAP_W, cx + r + 1), gy1 = Math.min(E.MAP_H, cy + r + 1);
        g.strokeStyle = 'rgba(170,190,160,0.045)';
        g.lineWidth = 1;
        g.beginPath();
        for (x = gx0; x <= gx1; x++) { g.moveTo(x * px + 0.5, gy0 * px); g.lineTo(x * px + 0.5, gy1 * px); }
        for (y = gy0; y <= gy1; y++) { g.moveTo(gx0 * px, y * px + 0.5); g.lineTo(gx1 * px, y * px + 0.5); }
        g.stroke();
      }

      this.perimetro(g, px);

      /* --- strutture --- */
      for (var i = 0; i < st.edifici.length; i++) {
        b = st.edifici[i]; def = D.byId(b.tipo);
        var nome = def.road ? 'strada_' + this.bitStrada(b.x, b.y) : 'ed_' + b.tipo;
        var sp = S.prendi(nome, px);
        if (!sp) continue;
        var spento = !b.attivo || b.hp < 60 || b.inCantiere;
        if (spento) g.globalAlpha = 0.55;
        g.drawImage(sp, b.x * px, b.y * px);
        g.globalAlpha = 1;
        if (!def.road && px >= 16) this.stato(g, b, def, px);
      }

      this.cursoreDisegna(g, px);
    },

    /* Cornice tratteggiata sul confine del settore autorizzato. */
    perimetro: function (g, px) {
      var cx = Math.floor(E.MAP_W / 2), cy = Math.floor(E.MAP_H / 2), r = E.raggio();
      var x0 = Math.max(0, cx - r), y0 = Math.max(0, cy - r);
      var x1 = Math.min(E.MAP_W - 1, cx + r), y1 = Math.min(E.MAP_H - 1, cy + r);
      if (x0 === 0 && y0 === 0 && x1 === E.MAP_W - 1 && y1 === E.MAP_H - 1) return;
      var sp = Math.max(2, Math.round(px / 4));
      g.save();
      g.strokeStyle = 'rgba(224,168,60,0.75)';
      g.lineWidth = Math.max(1, Math.round(px / 16));
      g.setLineDash([sp, sp]);
      g.strokeRect(x0 * px + 0.5, y0 * px + 0.5, (x1 - x0 + 1) * px - 1, (y1 - y0 + 1) * px - 1);
      g.restore();
    },

    /* Pastiglia di allarme su strutture ferme o danneggiate. */
    stato: function (g, b, def, px) {
      var d = Math.max(4, Math.round(px / 5));
      var x = b.x * px + 2, y = b.y * px + 2;
      var col = null;
      if (b.inCantiere) col = '#e0a83c';
      else if (b.hp < 60) col = '#e05c4d';
      else if (!b.attivo) col = '#c9a227';
      if (!col) return;
      g.fillStyle = 'rgba(11,13,10,0.85)';
      g.fillRect(x, y, d, d);
      g.fillStyle = col;
      g.fillRect(x + 1, y + 1, d - 2, d - 2);
      if (d >= 7) {
        g.fillStyle = '#0b0d0a';
        g.fillRect(x + Math.floor(d / 2), y + 2, 1, d - 5);
        g.fillRect(x + Math.floor(d / 2), y + d - 3, 1, 1);
      }
    },

    /* Cursore e anteprima di costruzione. */
    cursoreDisegna: function (g, px) {
      var c = this.cursore, w = 1, h = 1, valido = true;
      if (this.tipoDaCostruire) {
        var def = D.byId(this.tipoDaCostruire);
        w = def.w; h = def.h;
        valido = E.puoPiazzare(this.tipoDaCostruire, c.x, c.y).ok;
        var nome = def.road ? 'strada_' + this.bitStrada(c.x, c.y) : 'ed_' + def.id;
        var sp = S.prendi(nome, px);
        if (sp) {
          g.globalAlpha = 0.6;
          g.drawImage(sp, c.x * px, c.y * px);
          g.globalAlpha = 1;
        }
      }
      var col = this.tipoDaCostruire ? (valido ? '#8fd14f' : '#e05c4d') : '#e6f0dc';
      var X = c.x * px, Y = c.y * px, W = w * px, H = h * px;
      var l = Math.max(3, Math.round(px / 3));           /* lunghezza delle staffe */
      var s = Math.max(1, Math.round(px / 16));

      if (this.tipoDaCostruire && !valido) {
        g.fillStyle = 'rgba(224,92,77,0.22)';
        g.fillRect(X, Y, W, H);
      }
      g.fillStyle = col;
      /* quattro staffe angolari, leggibili anche su fondo chiaro */
      [[X, Y, 1, 1], [X + W - l, Y, -1, 1], [X, Y + H - s, 1, -1], [X + W - l, Y + H - s, -1, -1]]
        .forEach(function (a, k) {
          var bx = k % 2 === 0 ? X : X + W - l;
          var by = k < 2 ? Y : Y + H - s;
          g.fillRect(bx, by, l, s);
        });
      [[X, Y], [X + W - s, Y], [X, Y + H - l], [X + W - s, Y + H - l]].forEach(function (p) {
        g.fillRect(p[0], p[1], s, l);
      });
    },

    /* Barra di avanzamento ASCII, usata dai pannelli testuali. */
    barra: function (frazione, larghezza) {
      larghezza = larghezza || 10;
      var n = Math.max(0, Math.min(larghezza, Math.round(frazione * larghezza)));
      return '[' + new Array(n + 1).join('#') + new Array(larghezza - n + 1).join('-') + ']';
    }
  };

  global.Render = Render;
})(window);
