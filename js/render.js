/* ============================================================
   NEXUS-7 :: render.js
   Disegna la mappa come griglia di caratteri ASCII.
   Due modalita': TATTICA (1 carattere per cella) e DETTAGLIO
   (5x3 caratteri per cella, con l arte degli edifici).
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DATA, E = global.Engine;

  function esc(c) {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    return c;
  }

  var Render = {
    modo: 'dettaglio',      /* 'dettaglio' | 'tattica' */
    cursore: { x: 0, y: 0 },
    tipoDaCostruire: null,

    /* Griglia di lavoro: caratteri + classi colore. */
    _griglia: function (w, h) {
      var ch = [], cl = [];
      for (var y = 0; y < h; y++) {
        ch.push(new Array(w).fill(' '));
        cl.push(new Array(w).fill('t-ash'));
      }
      return { ch: ch, cl: cl, w: w, h: h };
    },

    /* ---------------------------------------------------------
       Arte dinamica dei tracciati: si collegano ai vicini.
       --------------------------------------------------------- */
    arteStrada: function (x, y) {
      var g = [[' ', ' ', ' ', ' ', ' '], [' ', ' ', ' ', ' ', ' '], [' ', ' ', ' ', ' ', ' ']];
      function road(xx, yy) {
        var b = E.edificioSu(xx, yy);
        return !!(b && b.tipo === 'strada');
      }
      var N = road(x, y - 1), S = road(x, y + 1), W = road(x - 1, y), Ee = road(x + 1, y);
      if (N) g[0][2] = '|';
      if (S) g[2][2] = '|';
      if (W) { g[1][0] = '-'; g[1][1] = '-'; }
      if (Ee) { g[1][3] = '-'; g[1][4] = '-'; }
      var c = '+';
      if ((N || S) && !(W || Ee)) c = '|';
      else if ((W || Ee) && !(N || S)) c = '-';
      else if (!N && !S && !W && !Ee) c = 'o';
      g[1][2] = c;
      return [g[0].join(''), g[1].join(''), g[2].join('')];
    },

    /* ---------------------------------------------------------
       DISEGNO PRINCIPALE -> stringa HTML per il <pre>
       --------------------------------------------------------- */
    disegna: function () {
      return this.modo === 'tattica' ? this.disegnaTattica() : this.disegnaDettaglio();
    },

    disegnaDettaglio: function () {
      var st = E.state, TW = D.TILE_W, TH = D.TILE_H;
      var G = this._griglia(E.MAP_W * TW, E.MAP_H * TH);
      var x, y, i, j;

      /* --- livello terreno --- */
      for (y = 0; y < E.MAP_H; y++) {
        for (x = 0; x < E.MAP_W; x++) {
          var t = E.tile(x, y);
          var ter = D.TERRAIN[t.t];
          var fuori = !E.nelSettore(x, y, 1, 1);
          var cls = 't-' + (t.cl ? 'ash' : ter.color) + (fuori ? ' fuori' : '');
          for (j = 0; j < TH; j++) {
            for (i = 0; i < TW; i++) {
              G.ch[y * TH + j][x * TW + i] = t.p[j].charAt(i);
              G.cl[y * TH + j][x * TW + i] = cls;
            }
          }
          /* confine del settore autorizzato */
          if (fuori && !E.nelSettore(x, y, 1, 1)) {
            var dentroVicino = E.nelSettore(x, y - 1, 1, 1) || E.nelSettore(x, y + 1, 1, 1) ||
                               E.nelSettore(x - 1, y, 1, 1) || E.nelSettore(x + 1, y, 1, 1);
            if (dentroVicino) {
              for (i = 0; i < TW; i++) {
                if (G.ch[y * TH][x * TW + i] === ' ') { G.ch[y * TH][x * TW + i] = '.'; G.cl[y * TH][x * TW + i] = 't-confine'; }
              }
            }
          }
        }
      }

      /* --- livello edifici --- */
      for (var b = 0; b < st.edifici.length; b++) {
        var ed = st.edifici[b], def = D.byId(ed.tipo);
        var arte = def.road ? this.arteStrada(ed.x, ed.y) : def.art;
        if (!arte) continue;
        var colore = 'b-' + def.color;
        var spento = !ed.attivo || ed.hp < 60;
        for (j = 0; j < arte.length; j++) {
          for (i = 0; i < arte[j].length; i++) {
            var c = arte[j].charAt(i);
            if (c === ' ') continue;              /* trasparente: si vede il terreno */
            var gy = ed.y * TH + j, gx = ed.x * TW + i;
            if (gy >= G.h || gx >= G.w) continue;
            G.ch[gy][gx] = c;
            G.cl[gy][gx] = colore + (spento ? ' spento' : '');
          }
        }
        /* indicatore di stato in alto a sinistra della struttura */
        if (!def.road) {
          var sy = ed.y * TH, sx = ed.x * TW;
          if (ed.hp < 60) { G.ch[sy][sx] = '!'; G.cl[sy][sx] = 'b-allarme'; }
          else if (!ed.attivo) { G.ch[sy][sx] = 'x'; G.cl[sy][sx] = 'b-allarme'; }
        }
      }

      /* --- livello cursore / anteprima costruzione --- */
      this._cursore(G, TW, TH);
      return this._html(G);
    },

    disegnaTattica: function () {
      var st = E.state;
      var G = this._griglia(E.MAP_W, E.MAP_H);
      var x, y;
      for (y = 0; y < E.MAP_H; y++) {
        for (x = 0; x < E.MAP_W; x++) {
          var t = E.tile(x, y), ter = D.TERRAIN[t.t];
          var fuori = !E.nelSettore(x, y, 1, 1);
          var ch = t.cl ? '.' : ter.chars.charAt(0);
          var cls = 't-' + (t.cl ? 'ash' : ter.color) + (fuori ? ' fuori' : '');
          var ed = E.edificioSu(x, y);
          if (ed) {
            var def = D.byId(ed.tipo);
            ch = def.glyph;
            cls = 'b-' + def.color + ((!ed.attivo || ed.hp < 60) ? ' spento' : '');
          }
          G.ch[y][x] = ch;
          G.cl[y][x] = cls;
        }
      }
      this._cursore(G, 1, 1);
      return this._html(G);
    },

    /* Evidenzia il cursore e, in modalita' costruzione, l ingombro previsto. */
    _cursore: function (G, TW, TH) {
      var cur = this.cursore, w = 1, h = 1, valido = true;
      if (this.tipoDaCostruire) {
        var def = D.byId(this.tipoDaCostruire);
        w = def.w; h = def.h;
        valido = E.puoPiazzare(this.tipoDaCostruire, cur.x, cur.y).ok;
      }
      var cls = this.tipoDaCostruire ? (valido ? 'cur-ok' : 'cur-no') : 'cur';
      for (var j = 0; j < h * TH; j++) {
        for (var i = 0; i < w * TW; i++) {
          var gy = cur.y * TH + j, gx = cur.x * TW + i;
          if (gy < 0 || gx < 0 || gy >= G.h || gx >= G.w) continue;
          /* in anteprima costruzione mostro l arte dell edificio */
          if (this.tipoDaCostruire) {
            var d2 = D.byId(this.tipoDaCostruire);
            var arte = d2.road ? ['     ', '  o  ', '     '] : d2.art;
            if (TW > 1 && arte && arte[j] && arte[j].charAt(i) !== ' ') G.ch[gy][gx] = arte[j].charAt(i);
            else if (TW === 1) G.ch[gy][gx] = d2.glyph;
          }
          G.cl[gy][gx] = cls;
        }
      }
    },

    /* Converte la griglia in HTML unendo i caratteri con la stessa classe. */
    _html: function (G) {
      var out = [];
      for (var y = 0; y < G.h; y++) {
        var riga = '', run = '', cls = null;
        for (var x = 0; x < G.w; x++) {
          var c = G.cl[y][x];
          if (c !== cls) {
            if (run) riga += '<i class="' + cls + '">' + run + '</i>';
            run = ''; cls = c;
          }
          run += esc(G.ch[y][x]);
        }
        if (run) riga += '<i class="' + cls + '">' + run + '</i>';
        out.push(riga);
      }
      return out.join('\n');
    },

    /* Barra di avanzamento ASCII: [####------] */
    barra: function (frazione, larghezza) {
      larghezza = larghezza || 10;
      var n = Math.max(0, Math.min(larghezza, Math.round(frazione * larghezza)));
      return '[' + new Array(n + 1).join('#') + new Array(larghezza - n + 1).join('-') + ']';
    }
  };

  global.Render = Render;
})(window);
