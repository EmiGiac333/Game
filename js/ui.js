/* ============================================================
   NEXUS-7 :: ui.js
   HUD, pannelli, input touch, ciclo di gioco.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DATA, E = global.Engine, R = global.Render;
  var $ = function (s) { return document.querySelector(s); };

  /* Passi di zoom: indice 0 = mappa tattica, 1..5 = dettaglio. */
  var ZOOM = [
    { modo: 'tattica',   font: 17, nome: 'TATTICA' },
    { modo: 'dettaglio', font: 7,  nome: 'x1' },
    { modo: 'dettaglio', font: 9,  nome: 'x2' },
    { modo: 'dettaglio', font: 11, nome: 'x3' },
    { modo: 'dettaglio', font: 14, nome: 'x4' },
    { modo: 'dettaglio', font: 18, nome: 'x5' }
  ];
  var VELOCITA = [0, 1, 2, 4];

  function n1(v) {
    if (v === undefined || v === null || isNaN(v)) return '0';
    var a = Math.abs(v);
    if (a >= 10000) return (v / 1000).toFixed(1) + 'k';
    if (a >= 100) return String(Math.round(v));
    if (a >= 10) return v.toFixed(1);
    return v.toFixed(2).replace(/0$/, '');
  }
  function segno(v) { return (v >= 0 ? '+' : '') + n1(v); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var UI = {
    zoom: 3,
    velocita: 1,
    selezione: null,      /* edificio selezionato */
    pannello: null,
    accumulo: 0,
    ultimoTick: 0,

    /* =========================================================
       AVVIO
       ========================================================= */
    init: function () {
      var self = this;
      this.mappa = $('#map');
      this.wrap = $('#mapwrap');

      R.cursore.x = Math.floor(E.MAP_W / 2);
      R.cursore.y = Math.floor(E.MAP_H / 2);

      this.collegaEventi();
      E.on('mappa', function () { self.disegnaMappa(); });
      E.on('log', function () { if (self.pannello === 'diario') self.apri('diario'); });
      E.on('evento', function (ev) { self.toast('[' + ev.nome + '] ' + ev.dettaglio, ev.cls); });
      E.on('livello', function (l) { self.bannerLivello(l); });
      E.on('vittoria', function () { self.finale(true); });
      E.on('gameover', function () { self.finale(false); });

      this.applicaZoom();
      this.disegnaMappa();
      this.aggiornaHud();
      this.aggiornaCtx();
      this.centraSuCursore();
      this.avviaCiclo();
    },

    /* =========================================================
       INPUT
       ========================================================= */
    collegaEventi: function () {
      var self = this, giu = null;

      /* tap sulla mappa (distinto dal trascinamento per lo scorrimento) */
      this.mappa.addEventListener('pointerdown', function (e) {
        giu = { x: e.clientX, y: e.clientY, t: Date.now() };
      });
      this.mappa.addEventListener('pointerup', function (e) {
        if (!giu) return;
        var dx = Math.abs(e.clientX - giu.x), dy = Math.abs(e.clientY - giu.y);
        var dt = Date.now() - giu.t;
        giu = null;
        if (dx > 12 || dy > 12 || dt > 700) return;   /* era una panoramica */
        self.tapMappa(e.clientX, e.clientY);
      });

      document.addEventListener('click', function (e) {
        var t = e.target.closest('[data-az]');
        if (!t) return;
        e.preventDefault();
        self.azione(t.getAttribute('data-az'), t.getAttribute('data-arg'));
      });

      /* tastiera: comodo su desktop e su tastiere bluetooth Android */
      document.addEventListener('keydown', function (e) {
        var c = R.cursore, m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
        if (m) {
          c.x = Math.max(0, Math.min(E.MAP_W - 1, c.x + m[0]));
          c.y = Math.max(0, Math.min(E.MAP_H - 1, c.y + m[1]));
          self.dopoSpostamento(); e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
          self.confermaCella(); e.preventDefault();
        } else if (e.key === 'Escape') {
          if (self.pannello) self.chiudi(); else self.azione('annulla');
        } else if (e.key === '+') { self.azione('zoom', '1'); }
        else if (e.key === '-') { self.azione('zoom', '-1'); }
      });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) E.salva();
      });
      window.addEventListener('beforeunload', function () { E.salva(); });
    },

    tapMappa: function (cx, cy) {
      var r = this.mappa.getBoundingClientRect();
      var z = ZOOM[this.zoom];
      var cols = z.modo === 'tattica' ? E.MAP_W : E.MAP_W * D.TILE_W;
      var rows = z.modo === 'tattica' ? E.MAP_H : E.MAP_H * D.TILE_H;
      var cw = r.width / cols, chh = r.height / rows;
      var col = Math.floor((cx - r.left) / cw), row = Math.floor((cy - r.top) / chh);
      var tx = z.modo === 'tattica' ? col : Math.floor(col / D.TILE_W);
      var ty = z.modo === 'tattica' ? row : Math.floor(row / D.TILE_H);
      if (!E.inMappa(tx, ty)) return;
      var stessaCella = (R.cursore.x === tx && R.cursore.y === ty);
      R.cursore.x = tx; R.cursore.y = ty;
      /* secondo tap sulla stessa cella = conferma (costruisci / scansiona) */
      if (stessaCella) this.confermaCella();
      else this.dopoSpostamento();
    },

    dopoSpostamento: function () {
      var b = E.edificioSu(R.cursore.x, R.cursore.y);
      this.selezione = b;
      this.disegnaMappa();
      this.aggiornaCtx();
    },

    confermaCella: function () {
      if (R.tipoDaCostruire) { this.azione('costruisci-qui'); return; }
      var b = E.edificioSu(R.cursore.x, R.cursore.y);
      if (b) { this.selezione = b; this.apri('scansione'); return; }
      var t = E.tile(R.cursore.x, R.cursore.y);
      if (t && t.t === 'rubble' && !t.cl) this.azione('sgombera');
    },

    /* =========================================================
       AZIONI
       ========================================================= */
    azione: function (az, arg) {
      var r;
      switch (az) {
        case 'zoom':
          this.zoom = Math.max(0, Math.min(ZOOM.length - 1, this.zoom + parseInt(arg, 10)));
          this.applicaZoom(); this.disegnaMappa(); this.centraSuCursore();
          break;
        case 'velocita':
          this.velocita = (this.velocita + 1) % VELOCITA.length;
          this.aggiornaHud();
          break;
        case 'pannello':
          this.pannello === arg ? this.chiudi() : this.apri(arg);
          break;
        case 'chiudi': this.chiudi(); break;

        case 'scegli':                                   /* scelta struttura da costruire */
          R.tipoDaCostruire = arg;
          this.chiudi(); this.disegnaMappa(); this.aggiornaCtx();
          this.toast('Scegli dove costruire, poi CONFERMA.', 'sys');
          break;
        case 'annulla':
          R.tipoDaCostruire = null; this.disegnaMappa(); this.aggiornaCtx();
          break;
        case 'costruisci-qui':
          if (!R.tipoDaCostruire) break;
          r = E.piazza(R.tipoDaCostruire, R.cursore.x, R.cursore.y);
          if (!r.ok) { this.toast(r.motivo, 'bad'); }
          else {
            var def = D.byId(R.tipoDaCostruire);
            this.toast(def.nome + ' costruita.', 'good');
            if (!E.puoPagare(E.costoDi(def, 1))) R.tipoDaCostruire = null;   /* finiti i materiali */
          }
          this.disegnaMappa(); this.aggiornaCtx(); this.aggiornaHud();
          break;
        case 'sgombera':
          r = E.sgombera(R.cursore.x, R.cursore.y);
          if (!r.ok) this.toast(r.motivo, 'bad');
          this.aggiornaCtx(); this.aggiornaHud();
          break;

        case 'potenzia':
          r = E.potenzia(this.selezione);
          this.toast(r.ok ? 'Potenziamento completato.' : r.motivo, r.ok ? 'good' : 'bad');
          if (this.pannello === 'scansione') this.apri('scansione');
          this.aggiornaHud();
          break;
        case 'ripara':
          r = E.ripara(this.selezione);
          this.toast(r.ok ? 'Struttura riparata.' : r.motivo, r.ok ? 'good' : 'bad');
          if (this.pannello === 'scansione') this.apri('scansione');
          this.aggiornaHud();
          break;
        case 'demolisci':
          if (!this._confDem) { this._confDem = true; this.toast('Premi di nuovo DEMOLISCI per confermare.', 'warn'); break; }
          this._confDem = false;
          r = E.demolisci(this.selezione);
          if (!r.ok) this.toast(r.motivo, 'bad');
          else { this.selezione = null; this.chiudi(); }
          this.aggiornaCtx(); this.aggiornaHud();
          break;

        case 'ricerca':
          r = E.ricerca(arg);
          this.toast(r.ok ? 'Progetto completato.' : r.motivo, r.ok ? 'good' : 'bad');
          this.apri('ricerca'); this.aggiornaHud();
          break;

        case 'lancio':
          r = E.avviaLancio();
          this.toast(r.ok ? 'CONTO ALLA ROVESCIA AVVIATO.' : r.motivo, r.ok ? 'good' : 'bad');
          if (this.pannello === 'scansione') this.apri('scansione');
          break;

        case 'salva':
          this.toast(E.salva() ? 'Partita salvata.' : 'Salvataggio non riuscito.', E.salva() ? 'good' : 'bad');
          break;
        case 'carica':
          if (E.carica()) { this.selezione = null; R.tipoDaCostruire = null; this.chiudi();
            this.disegnaMappa(); this.aggiornaHud(); this.aggiornaCtx(); this.toast('Partita caricata.', 'good'); }
          else this.toast('Nessun salvataggio trovato.', 'bad');
          break;
        case 'nuova':
          if (!this._confNuova) { this._confNuova = true; this.toast('Premi di nuovo per abbandonare il settore attuale.', 'warn'); break; }
          this._confNuova = false;
          E.cancellaSalvataggio(); E.nuovaPartita();
          this.selezione = null; R.tipoDaCostruire = null; this.chiudi();
          R.cursore.x = Math.floor(E.MAP_W / 2); R.cursore.y = Math.floor(E.MAP_H / 2);
          this.disegnaMappa(); this.aggiornaHud(); this.aggiornaCtx(); this.centraSuCursore();
          break;
      }
      if (az !== 'demolisci') this._confDem = false;
      if (az !== 'nuova') this._confNuova = false;
    },

    /* =========================================================
       MAPPA
       ========================================================= */
    applicaZoom: function () {
      var z = ZOOM[this.zoom];
      R.modo = z.modo;
      this.mappa.style.fontSize = z.font + 'px';
      /* in tattica la mappa sta tutta nello schermo: la centro.
         In dettaglio no, altrimenti lo scorrimento non raggiunge il bordo sinistro. */
      this.wrap.classList.toggle('tattica', z.modo === 'tattica');
      var l = $('#zoomlab'); if (l) l.textContent = z.nome;
    },

    disegnaMappa: function () {
      this.mappa.innerHTML = R.disegna();
    },

    centraSuCursore: function () {
      var z = ZOOM[this.zoom];
      var cols = z.modo === 'tattica' ? E.MAP_W : E.MAP_W * D.TILE_W;
      var rows = z.modo === 'tattica' ? E.MAP_H : E.MAP_H * D.TILE_H;
      var r = this.mappa.getBoundingClientRect();
      var cw = r.width / cols, chh = r.height / rows;
      var px = (R.cursore.x * (z.modo === 'tattica' ? 1 : D.TILE_W)) * cw;
      var py = (R.cursore.y * (z.modo === 'tattica' ? 1 : D.TILE_H)) * chh;
      this.wrap.scrollLeft = px - this.wrap.clientWidth / 2;
      this.wrap.scrollTop = py - this.wrap.clientHeight / 2;
    },

    /* =========================================================
       HUD
       ========================================================= */
    aggiornaHud: function () {
      var st = E.state;
      var liv = D.LEVELS[st.livello - 1];
      var netti = { rtm: st.nettoRtm, h2o: st.nettoH2o, bio: st.nettoBio, leg: st.nettoLeg, dat: st.nettoDat };

      var chips = D.RESOURCES.map(function (r) {
        var v = st.res[r.id], cap = E.cap(r.id), net = netti[r.id] || 0;
        var pieno = v >= cap * 0.98 ? ' pieno' : '';
        return '<span class="chip c-' + r.color + pieno + '" data-az="pannello" data-arg="citta">' +
          '<b>' + r.sigla + '</b> ' + n1(v) + '<u>/' + n1(cap) + '</u> ' +
          '<em class="' + (net >= 0 ? 'su' : 'giu') + '">' + segno(net) + '</em></span>';
      }).join('');

      var vel = VELOCITA[this.velocita];
      var etichettaVel = vel === 0 ? '||' : 'x' + vel;

      $('#hud-top').innerHTML =
        '<span class="tit">NEXUS-7</span>' +
        '<span class="liv">LIV.' + st.livello + ' ' + liv.nome + '</span>' +
        '<span class="ciclo">CICLO ' + Math.floor(st.ciclo) + '</span>' +
        '<span class="btn mini" data-az="velocita">' + etichettaVel + '</span>';

      $('#hud-res').innerHTML = chips;

      var nrgOk = st.ratioEnergia >= 0.999;
      $('#hud-stat').innerHTML =
        '<span class="st"><b>POP</b> ' + st.pop + '/' + st.alloggi + '</span>' +
        '<span class="st"><b>LAV</b> ' + st.lavori + '/' + st.forzaLavoro + '</span>' +
        '<span class="st ' + (nrgOk ? '' : 'allarme') + '"><b>NRG</b> ' + n1(st.nrgProd) + '/' + n1(st.nrgCons) + '</span>' +
        '<span class="st"><b>MOR</b> ' + R.barra(st.morale / 100, 6) + '</span>' +
        '<span class="st ' + (st.ctm > 50 ? 'allarme' : '') + '"><b>CTM</b> ' + R.barra(st.ctm / 100, 6) + '</span>' +
        '<span class="st"><b>DIF</b> ' + st.difesa + '</span>';
    },

    /* Barra contestuale sotto la mappa. */
    aggiornaCtx: function () {
      var c = R.cursore, t = E.tile(c.x, c.y), b = E.edificioSu(c.x, c.y);
      var out = '';

      if (R.tipoDaCostruire) {
        var def = D.byId(R.tipoDaCostruire);
        var chk = E.puoPiazzare(R.tipoDaCostruire, c.x, c.y);
        out = '<div class="ctx-r"><b>' + def.nome + '</b> ' + def.w + 'x' + def.h +
              ' -- ' + E.testoCosto(E.costoDi(def, 1)) + '</div>' +
              '<div class="ctx-r ' + (chk.ok ? 'ok' : 'no') + '">' +
              (chk.ok ? '[' + c.x + ',' + c.y + '] POSIZIONE VALIDA' : esc(chk.motivo)) + '</div>' +
              '<div class="ctx-b">' +
              (chk.ok ? '<span class="btn ok" data-az="costruisci-qui">CONFERMA</span>' : '') +
              /* vicolo cieco tipico: cella di macerie scelta in modalita' costruzione */
              (!chk.ok && t && t.t === 'rubble' && !t.cl && E.nelSettore(c.x, c.y, 1, 1)
                 ? '<span class="btn ok" data-az="sgombera">SGOMBERA QUI</span>' : '') +
              '<span class="btn" data-az="annulla">ANNULLA</span></div>';
      } else if (b) {
        var d2 = D.byId(b.tipo);
        out = '<div class="ctx-r"><b class="c-' + d2.color + '">' + d2.nome + '</b> MK-' + b.lvl +
              ' <span class="dim">' + d2.cat + '</span></div>' +
              '<div class="ctx-r dim">INTEGRITA ' + R.barra(b.hp / 100, 6) + ' ' + Math.round(b.hp) + '%' +
              '  RESA ' + Math.round((b.eff || 0) * 100) + '%</div>' +
              '<div class="ctx-b"><span class="btn ok" data-az="pannello" data-arg="scansione">SCANSIONE</span>' +
              '<span class="btn" data-az="pannello" data-arg="costruisci">COSTRUISCI</span></div>';
      } else if (t) {
        var ter = D.TERRAIN[t.t];
        var stato = t.cl ? 'SGOMBERATO' : (ter.build ? 'EDIFICABILE' : 'NON EDIFICABILE');
        var fuori = !E.nelSettore(c.x, c.y, 1, 1);
        out = '<div class="ctx-r"><b>[' + c.x + ',' + c.y + '] ' + ter.nome + '</b> ' +
              '<span class="dim">' + (fuori ? 'FUORI SETTORE' : stato) + '</span></div>' +
              '<div class="ctx-b">' +
              (t.t === 'rubble' && !t.cl && !fuori ? '<span class="btn ok" data-az="sgombera">SGOMBERA MACERIE</span>' : '') +
              '<span class="btn" data-az="pannello" data-arg="costruisci">COSTRUISCI</span></div>';
      }
      $('#ctx').innerHTML = out;
    },

    /* =========================================================
       PANNELLI
       ========================================================= */
    apri: function (nome) {
      this.pannello = nome;
      var corpo = '';
      if (nome === 'costruisci') corpo = this.pCostruisci();
      else if (nome === 'scansione') corpo = this.pScansione();
      else if (nome === 'ricerca') corpo = this.pRicerca();
      else if (nome === 'citta') corpo = this.pCitta();
      else if (nome === 'diario') corpo = this.pDiario();
      else if (nome === 'menu') corpo = this.pMenu();
      $('#panel').innerHTML = corpo;
      $('#panel').classList.add('aperto');
      document.querySelectorAll('#tabs .btn').forEach(function (b) {
        b.classList.toggle('attivo', b.getAttribute('data-arg') === nome);
      });
    },

    chiudi: function () {
      this.pannello = null;
      $('#panel').classList.remove('aperto');
      $('#panel').innerHTML = '';
      document.querySelectorAll('#tabs .btn').forEach(function (b) { b.classList.remove('attivo'); });
    },

    testata: function (titolo, extra) {
      return '<div class="ph"><span class="ph-t">== ' + titolo + ' ==</span>' +
             (extra ? '<span class="ph-x">' + extra + '</span>' : '') +
             '<span class="btn mini" data-az="chiudi">[X]</span></div>';
    },

    /* ---------- COSTRUISCI ---------- */
    pCostruisci: function () {
      var st = E.state, cat = {}, ordine = [];
      D.BUILDINGS.forEach(function (def) {
        if (def.id === 'nucleo') return;
        if (!cat[def.cat]) { cat[def.cat] = []; ordine.push(def.cat); }
        cat[def.cat].push(def);
      });

      var h = this.testata('OFFICINA COSTRUZIONI', 'LIV.' + st.livello);
      h += '<div class="scroll">';
      ordine.forEach(function (c) {
        h += '<div class="cat">-- ' + c + ' --</div>';
        cat[c].forEach(function (def) {
          var sbl = E.sbloccato(def);
          var costo = E.costoDi(def, 1);
          var pago = E.puoPagare(costo);
          var motivo = '';
          if (!sbl) {
            motivo = def.tech && !st.tech[def.tech]
              ? 'RICHIEDE PROGETTO: ' + D.techById(def.tech).nome
              : 'RICHIEDE LIVELLO ' + def.unlock;
          }
          var righe = [];
          for (var k in def.produce) righe.push('+' + n1(def.produce[k]) + ' ' + k.toUpperCase());
          for (var k2 in def.consume) righe.push('-' + n1(def.consume[k2]) + ' ' + k2.toUpperCase());
          if (def.housing) righe.push('+' + def.housing + ' ALLOGGI');
          if (def.difesa) righe.push('+' + def.difesa + ' DIF');
          if (def.assorbe) righe.push('-' + def.assorbe + ' CTM');
          if (def.morale) righe.push('+' + def.morale + ' MOR');
          if (def.jobs) righe.push(def.jobs + ' ADDETTI');

          h += '<div class="voce ' + (sbl ? (pago ? '' : 'nopay') : 'bloccata') + '" ' +
               (sbl && pago ? 'data-az="scegli" data-arg="' + def.id + '"' : '') + '>' +
               '<div class="v-a"><span class="v-g c-' + def.color + '">' + esc(def.glyph) + '</span>' +
               '<b>' + def.nome + '</b> <span class="dim">' + def.w + 'x' + def.h + '</span></div>' +
               '<div class="v-b">' + (sbl ? esc(E.testoCosto(costo)) : '<span class="no">' + motivo + '</span>') + '</div>' +
               '<div class="v-c dim">' + righe.join('  ') + '</div>' +
               '</div>';
        });
      });
      h += '</div>';
      return h;
    },

    /* ---------- SCANSIONE (zoom sull edificio) ---------- */
    pScansione: function () {
      var b = this.selezione;
      if (!b) return this.testata('SCANSIONE') + '<div class="scroll"><p class="dim">Nessuna struttura selezionata. Tocca un edificio sulla mappa.</p></div>';
      var def = D.byId(b.tipo), st = E.state;

      /* arte ingrandita, incorniciata in ASCII */
      /* Zoom tipografico: l arte resta identica e le scritte interne
         ([NEXUS], LAB, MEDICO...) restano leggibili. Duplicare i caratteri
         le renderebbe illeggibili. */
      var arte = def.road ? R.arteStrada(b.x, b.y) : def.art;
      var larg = arte && arte.length ? arte[0].length : 10;
      var cornice = '+' + new Array(larg + 3).join('-') + '+';
      var telaio = [cornice].concat((arte || []).map(function (r) { return '| ' + r + ' |'; })).concat([cornice]);

      var bon = E.bonusAdiacenza(b);
      var mult = E.multTech(b.tipo);
      var staff = def.jobs > 0 ? (st.ratioLavoro || 1) : 1;
      var pot = (def.consume && def.consume.nrg && !(def.produce && def.produce.nrg)) ? (st.ratioEnergia || 1) : 1;

      var h = this.testata('SCANSIONE STRUTTURA', 'MK-' + b.lvl + '/' + def.maxLvl);
      h += '<div class="scroll">';
      h += '<pre class="artebig c-' + def.color + '">' + esc(telaio.join('\n')) + '</pre>';
      h += '<div class="s-nome c-' + def.color + '">' + def.nome + '</div>';
      h += '<div class="s-sub dim">' + def.cat + ' -- SETTORE [' + b.x + ',' + b.y + '] -- ' + def.w + 'x' + def.h + '</div>';
      h += '<p class="lore">' + esc(def.desc) + '</p>';

      /* --- caratteristiche --- */
      h += '<div class="cat">-- STATO --</div><div class="tab">';
      h += this.riga('INTEGRITA', R.barra(b.hp / 100, 10) + ' ' + Math.round(b.hp) + '%', b.hp < 60 ? 'no' : '');
      h += this.riga('RESA TOTALE', R.barra(Math.min(1, b.eff || 0), 10) + ' ' + Math.round((b.eff || 0) * 100) + '%');
      h += this.riga('OPERATIVA', b.attivo ? 'SI' : 'NO -- FERMA', b.attivo ? '' : 'no');
      h += '</div>';

      h += '<div class="cat">-- PRODUZIONE EFFETTIVA / CICLO --</div><div class="tab">';
      var nulla = true;
      for (var k in (def.produce || {})) {
        var v = def.produce[k] * (k === 'nrg' ? (b._base || 1) * staff : (b.eff || 0));
        h += this.riga('+ ' + k.toUpperCase(), n1(v) + ' <span class="dim">(base ' + n1(def.produce[k]) + ')</span>', 'ok');
        nulla = false;
      }
      for (var k2 in (def.consume || {})) {
        h += this.riga('- ' + k2.toUpperCase(), n1(def.consume[k2] * E.multLivello(b.lvl)), 'no');
        nulla = false;
      }
      if (def.housing) { h += this.riga('ALLOGGI', Math.floor(def.housing * E.multLivello(b.lvl)), 'ok'); nulla = false; }
      if (def.difesa) { h += this.riga('DIFESA', Math.round(def.difesa * E.multLivello(b.lvl)), 'ok'); nulla = false; }
      if (def.assorbe) { h += this.riga('CONTAMINAZIONE', '-' + n1(def.assorbe * (b.eff || 0)), 'ok'); nulla = false; }
      if (def.contamina) { h += this.riga('CONTAMINAZIONE', '+' + n1(def.contamina * (b.eff || 0)), 'no'); nulla = false; }
      if (def.morale) { h += this.riga('MORALE', '+' + def.morale, 'ok'); nulla = false; }
      if (nulla) h += '<div class="dim pad">Nessun flusso diretto.</div>';
      h += '</div>';

      h += '<div class="cat">-- MOLTIPLICATORI --</div><div class="tab">';
      h += this.riga('LIVELLO MK-' + b.lvl, 'x' + E.multLivello(b.lvl).toFixed(2));
      h += this.riga('INTEGRITA', 'x' + E.multHp(b.hp).toFixed(2), b.hp < 60 ? 'no' : '');
      if (def.jobs) h += this.riga('ADDETTI ' + Math.round(def.jobs * (1 + 0.3 * (b.lvl - 1))), 'x' + staff.toFixed(2), staff < 1 ? 'no' : '');
      if (def.consume && def.consume.nrg) h += this.riga('RETE ELETTRICA', 'x' + pot.toFixed(2), pot < 1 ? 'no' : '');
      h += this.riga('MORALE SETTORE', 'x' + (0.7 + 0.3 * (st.morale / 100)).toFixed(2));
      if (mult !== 1) h += this.riga('TECNOLOGIE', 'x' + mult.toFixed(2), 'ok');
      bon.voci.forEach(function (v) { h += UI.riga(v.n, v.v, 'ok'); });
      if (!bon.voci.length) h += '<div class="dim pad">Nessun bonus di adiacenza. Prova con un TRACCIATO accanto.</div>';
      h += '</div>';

      /* --- azioni --- */
      h += '<div class="azioni">';
      if (b.lvl < def.maxLvl) {
        var cp = E.costoDi(def, b.lvl + 1);
        h += '<span class="btn ' + (E.puoPagare(cp) ? 'ok' : 'dis') + '" data-az="potenzia">POTENZIA MK-' + (b.lvl + 1) + '<u>' + esc(E.testoCosto(cp)) + '</u></span>';
      } else {
        h += '<span class="btn dis">MK MASSIMO</span>';
      }
      if (b.hp < 100) h += '<span class="btn" data-az="ripara">RIPARA</span>';
      if (b.tipo === 'spazioporto' && !st.lancioAvviato) h += '<span class="btn ok" data-az="lancio">AVVIA LANCIO<u>500 RTM / 300 LEG / 100 DAT</u></span>';
      if (b.tipo !== 'nucleo') h += '<span class="btn no" data-az="demolisci">DEMOLISCI</span>';
      h += '</div></div>';
      return h;
    },

    riga: function (a, b, cls) {
      return '<div class="r"><span>' + a + '</span><span class="' + (cls || '') + '">' + b + '</span></div>';
    },

    /* ---------- RICERCA ---------- */
    pRicerca: function () {
      var st = E.state;
      var h = this.testata('ARCHIVIO RICERCA', 'DAT ' + n1(st.res.dat) + '/' + n1(E.cap('dat')));
      h += '<div class="scroll">';
      D.TECHS.forEach(function (t) {
        var fatta = !!st.tech[t.id];
        var disp = E.techDisponibile(t);
        var pago = st.res.dat >= t.costo;
        var stato = fatta ? 'COMPLETATO' : (disp ? (pago ? 'DISPONIBILE' : 'DAT INSUFFICIENTI') : 'BLOCCATO');
        var req = t.req.map(function (r) { return D.techById(r).nome; }).join(' + ');
        h += '<div class="voce ' + (fatta ? 'fatta' : (disp && pago ? '' : 'bloccata')) + '" ' +
             (!fatta && disp && pago ? 'data-az="ricerca" data-arg="' + t.id + '"' : '') + '>' +
             '<div class="v-a"><b>' + t.nome + '</b></div>' +
             '<div class="v-b">' + t.costo + ' DAT -- <span class="' + (fatta ? 'ok' : (disp && pago ? 'ok' : 'no')) + '">' + stato + '</span></div>' +
             '<div class="v-c dim">' + esc(t.desc) + '</div>' +
             '<div class="v-c"><span class="tag">' + t.eff + '</span>' +
             (req ? '<span class="tag req">RICHIEDE: ' + req + '</span>' : '') +
             (t.lvl > st.livello ? '<span class="tag req">LIVELLO ' + t.lvl + '</span>' : '') + '</div>' +
             '</div>';
      });
      h += '</div>';
      return h;
    },

    /* ---------- CITTA ---------- */
    pCitta: function () {
      var st = E.state, liv = D.LEVELS[st.livello - 1], next = E.prossimoLivello();
      var h = this.testata('RAPPORTO DI SETTORE', 'LIV.' + st.livello);
      h += '<div class="scroll">';
      h += '<div class="s-nome c-core">' + liv.nome + '</div>';
      h += '<div class="s-sub dim">SETTORE-7 -- CICLO ' + Math.floor(st.ciclo) + ' -- RAGGIO OPERATIVO ' + liv.raggio + '</div>';

      h += '<div class="cat">-- AVANZAMENTO --</div><div class="tab">';
      if (next) {
        var pp = Math.min(1, st.pop / next.pop), pe = Math.min(1, st.edifici.length / next.edifici);
        h += this.riga('PROSSIMO: ' + next.nome, '');
        h += this.riga('COLONI', R.barra(pp, 10) + ' ' + st.pop + '/' + next.pop, pp >= 1 ? 'ok' : '');
        h += this.riga('STRUTTURE', R.barra(pe, 10) + ' ' + st.edifici.length + '/' + next.edifici, pe >= 1 ? 'ok' : '');
      } else {
        h += this.riga('LIVELLO MASSIMO', 'NEXUS PRIME', 'ok');
        h += '<div class="dim pad">Costruisci lo SPAZIOPORTO ESODO e avvia il lancio per completare la partita.</div>';
      }
      h += '</div>';

      h += '<div class="cat">-- POPOLAZIONE --</div><div class="tab">';
      h += this.riga('COLONI', st.pop);
      h += this.riga('ALLOGGI', st.alloggi, st.pop > st.alloggi ? 'no' : 'ok');
      h += this.riga('FORZA LAVORO', st.forzaLavoro + ' su ' + st.lavori + ' posti', st.ratioLavoro < 1 ? 'no' : 'ok');
      h += this.riga('MORALE', R.barra(st.morale / 100, 10) + ' ' + Math.round(st.morale) + '%');
      h += this.riga('CRESCITA', st.crescita > 0 ? '+' + n1(st.crescita) + '/ciclo' : 'FERMA', st.crescita > 0 ? 'ok' : 'no');
      h += this.riga('NATI / MORTI', st.statistiche.natiTotali + ' / ' + st.statistiche.mortiTotali);
      h += '</div>';

      h += '<div class="cat">-- RETE E AMBIENTE --</div><div class="tab">';
      h += this.riga('ENERGIA', n1(st.nrgProd) + ' prodotta / ' + n1(st.nrgCons) + ' richiesta', st.ratioEnergia < 1 ? 'no' : 'ok');
      h += this.riga('COPERTURA RETE', Math.round(st.ratioEnergia * 100) + '%', st.ratioEnergia < 1 ? 'no' : 'ok');
      h += this.riga('CONTAMINAZIONE', R.barra(st.ctm / 100, 10) + ' ' + Math.round(st.ctm) + '%', st.ctm > 40 ? 'no' : 'ok');
      h += this.riga('EMESSA / ASSORBITA', n1(st.emissione) + ' / ' + n1(st.assorbimento));
      h += this.riga('DIFESA', st.difesa + ' -- raid stimato ' + (10 + st.livello * 14), st.difesa < 10 + st.livello * 14 ? 'no' : 'ok');
      h += this.riga('RAID RESPINTI', st.statistiche.raidRespinti);
      h += '</div>';

      h += '<div class="cat">-- BILANCIO RISORSE / CICLO --</div><div class="tab">';
      var netti = { rtm: st.nettoRtm, h2o: st.nettoH2o, bio: st.nettoBio, leg: st.nettoLeg, dat: st.nettoDat };
      D.RESOURCES.forEach(function (r) {
        var net = netti[r.id] || 0;
        h += UI.riga(r.nome, n1(st.res[r.id]) + '/' + n1(E.cap(r.id)) + '  <b>' + segno(net) + '</b>', net >= 0 ? 'ok' : 'no');
      });
      h += this.riga('CONSUMO COLONI', n1(st.bisognoH2o) + ' H2O + ' + n1(st.bisognoBio) + ' BIO');
      h += '</div>';

      /* riepilogo strutture */
      var conte = {};
      st.edifici.forEach(function (b) { conte[b.tipo] = (conte[b.tipo] || 0) + 1; });
      h += '<div class="cat">-- STRUTTURE (' + st.edifici.length + ') --</div><div class="tab">';
      Object.keys(conte).forEach(function (k) {
        h += UI.riga(D.byId(k).nome, 'x' + conte[k]);
      });
      h += '</div></div>';
      return h;
    },

    /* ---------- DIARIO ---------- */
    pDiario: function () {
      var st = E.state;
      var h = this.testata('DIARIO DI BORDO', st.log.length + ' VOCI');
      h += '<div class="scroll log">';
      if (!st.log.length) h += '<p class="dim">Nessuna voce.</p>';
      st.log.forEach(function (l) {
        h += '<div class="lg ' + l.k + '"><span class="lc">c' + l.c + '</span>' + esc(l.t) + '</div>';
      });
      h += '</div>';
      return h;
    },

    /* ---------- MENU ---------- */
    pMenu: function () {
      var h = this.testata('TERMINALE AMMINISTRATORE');
      h += '<div class="scroll">';
      h += '<div class="azioni">' +
        '<span class="btn ok" data-az="salva">SALVA PARTITA</span>' +
        '<span class="btn" data-az="carica">CARICA PARTITA</span>' +
        '<span class="btn no" data-az="nuova">NUOVA PARTITA</span>' +
        '</div>';
      h += '<div class="cat">-- COME SI GIOCA --</div><div class="aiuto">' +
        '<p><b>OBIETTIVO.</b> Far crescere il Settore-7 da avamposto a NEXUS PRIME (livello 10), poi costruire lo SPAZIOPORTO ESODO e avviare il lancio.</p>' +
        '<p><b>MAPPA.</b> Trascina per spostarti. Tocca una cella per selezionarla, toccala di nuovo per confermare (scansione o costruzione). Usa [-] e [+] per lo zoom: al minimo passi alla MAPPA TATTICA.</p>' +
        '<p><b>MACERIE.</b> Le celle di macerie non sono edificabili: sgomberale prima, ottieni rottami in cambio.</p>' +
        '<p><b>ENERGIA.</b> Non si accumula: se la richiesta supera la produzione, tutte le strutture rendono meno. Tieni sempre un margine.</p>' +
        '<p><b>ADDETTI.</b> Il 65% dei coloni lavora. Se i posti superano la forza lavoro, la resa cala ovunque: costruisci alloggi.</p>' +
        '<p><b>ACQUA E CIBO.</b> Ogni colono consuma H2O e BIO ogni ciclo. In carenza il morale crolla e la gente muore.</p>' +
        '<p><b>ADIACENZE.</b> Un TRACCIATO accanto a una struttura da +15%. I raccoglitori rendono di piu vicino alle macerie, il pozzo va costruito accanto a una pozza tossica, le serre vicino all acqua.</p>' +
        '<p><b>POTENZIAMENTI.</b> Ogni struttura sale fino a MK-5: piu resa, piu alloggi, piu difesa. Nel tardo gioco conviene potenziare invece di espandersi.</p>' +
        '<p><b>DIFESA.</b> I predoni attaccano periodicamente e diventano piu forti a ogni livello. Se la difesa e sotto la loro forza, perdi risorse, strutture e coloni.</p>' +
        '<p><b>CONTAMINAZIONE.</b> Fonderie e reattori inquinano. Filtri e rigeneratori ripuliscono. Oltre il 55% i coloni iniziano a morire.</p>' +
        '<p class="dim">Il salvataggio e automatico ogni 15 cicli e alla chiusura.</p>' +
        '</div>';
      h += '</div>';
      return h;
    },

    /* =========================================================
       NOTIFICHE
       ========================================================= */
    toast: function (testo, cls) {
      var t = document.createElement('div');
      t.className = 'toast ' + (cls || 'sys');
      t.textContent = testo;
      $('#toasts').appendChild(t);
      setTimeout(function () { t.classList.add('via'); }, 3200);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3800);
    },

    bannerLivello: function (l) {
      var testo = [
        '+==========================================+',
        '|          SETTORE-7 PROMOSSO              |',
        '|                                          |',
        '|   LIVELLO ' + String(l.lvl).padEnd(2) + '  ' + l.nome.padEnd(24) + ' |',
        '|                                          |',
        '|   perimetro esteso -- nuove strutture     |',
        '+==========================================+'
      ].join('\n');
      this.overlay(testo, 'good');
    },

    finale: function (vinto) {
      var st = E.state;
      var testo = vinto ? [
        '+==========================================+',
        '|              E S O D O                   |',
        '+==========================================+',
        '',
        '   La rampa si illumina. Il convoglio sale',
        '   oltre le nubi di cenere e il Settore-7',
        '   diventa il primo porto di un mondo che',
        '   ricomincia.',
        '',
        '   COLONI SALVATI ...... ' + st.pop,
        '   CICLI ............... ' + Math.floor(st.ciclo),
        '   STRUTTURE ........... ' + st.edifici.length,
        '   RAID RESPINTI ....... ' + st.statistiche.raidRespinti,
        '',
        '            V I T T O R I A'
      ].join('\n') : [
        '+==========================================+',
        '|          S I L E N Z I O                 |',
        '+==========================================+',
        '',
        '   L ultimo colono si e spento.',
        '   La cenere copre le strutture vuote.',
        '',
        '   CICLI SOPRAVVISSUTI .. ' + Math.floor(st.ciclo),
        '   MORTI ............... ' + st.statistiche.mortiTotali,
        '',
        '        F I N E   P A R T I T A'
      ].join('\n');
      this.overlay(testo, vinto ? 'good' : 'bad', true);
    },

    overlay: function (testo, cls, permanente) {
      var o = document.createElement('div');
      o.className = 'overlay ' + cls;
      o.innerHTML = '<pre>' + esc(testo) + '</pre>' +
        (permanente ? '<div class="azioni"><span class="btn ok" data-az="nuova">NUOVA PARTITA</span></div>' : '');
      $('#toasts').appendChild(o);
      o.addEventListener('click', function (e) {
        if (!e.target.closest('[data-az]')) o.remove();
      });
      if (!permanente) setTimeout(function () { if (o.parentNode) o.remove(); }, 4200);
    },

    /* =========================================================
       CICLO DI GIOCO
       ========================================================= */
    avviaCiclo: function () {
      var self = this;
      this.ultimoTick = Date.now();
      setInterval(function () {
        var ora = Date.now();
        var dtReale = Math.min(2000, ora - self.ultimoTick);
        self.ultimoTick = ora;
        var v = VELOCITA[self.velocita];
        if (v === 0 || E.state.gameover || E.state.vittoria) { self.aggiornaHud(); return; }

        self.accumulo += (dtReale / E.CICLO_MS) * v;
        if (self.accumulo >= 0.25) {
          E.aggiorna(self.accumulo);
          self.accumulo = 0;
          self.aggiornaHud();
          if (self.pannello === 'citta' || self.pannello === 'scansione') self.apri(self.pannello);
          else self.aggiornaCtx();
          if (Math.floor(E.state.ciclo) % 15 === 0) E.salva();
          self.disegnaMappa();
        }
      }, 250);
    }
  };

  global.UI = UI;
})(window);
