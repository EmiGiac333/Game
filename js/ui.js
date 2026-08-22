/* ============================================================
   NEXUS-7 :: ui.js
   HUD, pannelli, input touch, ciclo di gioco.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DATA, E = global.Engine, R = global.Render;
  var ST = global.Story, TU = global.Tutorial;
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
    mosso: false,                                  /* il giocatore ha mosso il cursore */
    visto: { scansione: false, ricerca: false },   /* pannelli gia' aperti almeno una volta */
    storiaAperta: null,                            /* voce espansa nel pannello STORIA */
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

      /* Narrativa: le ricerche e alcuni eventi recuperano frammenti d'archivio. */
      E.on('tech', function (id) { self.sbloccaFrammento('tech:' + id); });
      E.on('evento', function (ev) { if (ev && ev.id) self.sbloccaFrammento('evento:' + ev.id); });

      ST.init(E.state); TU.init(E.state);

      this.applicaZoom();
      this.disegnaMappa();
      this.aggiornaHud();
      this.aggiornaCtx();
      this.aggiornaTutorial();
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
      this.mosso = true;   /* qualunque tocco sulla mappa conta come interazione */
      var stessaCella = (R.cursore.x === tx && R.cursore.y === ty);
      R.cursore.x = tx; R.cursore.y = ty;
      /* secondo tap sulla stessa cella = conferma (costruisci / scansiona) */
      if (stessaCella) this.confermaCella();
      else this.dopoSpostamento();
    },

    dopoSpostamento: function () {
      var b = E.edificioSu(R.cursore.x, R.cursore.y);
      this.selezione = b;
      this.mosso = true;
      this.disegnaMappa();
      this.aggiornaCtx();
      this.verificaTutorial();
    },

    confermaCella: function () {
      if (R.tipoDaCostruire) { this.azione('costruisci-qui'); return; }
      var b = E.edificioSu(R.cursore.x, R.cursore.y);
      if (b) { this.selezione = b; this.apri('scansione'); return; }
      var t = E.tile(R.cursore.x, R.cursore.y);
      if (t && t.t === 'rubble' && !t.cl) { this.azione('sgombera'); return; }
      this.verificaTutorial();
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

        case 'potenzia-nucleo':
          r = E.avviaPotenziamentoNucleo();
          this.toast(r.ok ? 'Cantiere aperto sul Nucleo.' : r.motivo, r.ok ? 'good' : 'bad');
          if (this.pannello) this.apri(this.pannello);
          this.aggiornaHud();
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

        case 'tut-riprendi':
          TU.riprendi(E.state); this.chiudi(); this.aggiornaTutorial();
          this.toast('Tutorial riavviato dal primo passo.', 'good');
          break;
        case 'tut-continua':
          TU.riprendi(E.state); this.chiudi(); this.aggiornaTutorial();
          this.toast('Tutorial ripreso.', 'good');
          break;
        case 'tut-salta':
          TU.salta(E.state); this.aggiornaTutorial();
          this.toast('Tutorial nascosto. Lo ritrovi nel MENU.', 'sys');
          break;
        case 'tut-chiudi':
          TU.chiudi(E.state); this.aggiornaTutorial();
          break;
        case 'storia-voce':
          this.storiaAperta = (this.storiaAperta === arg) ? null : arg;
          this.apri('storia');
          break;

        case 'salva':
          this.toast(E.salva() ? 'Partita salvata.' : 'Salvataggio non riuscito.', E.salva() ? 'good' : 'bad');
          break;
        case 'carica':
          if (E.carica()) { this.selezione = null; R.tipoDaCostruire = null; this.chiudi();
            ST.init(E.state); TU.init(E.state); this.aggiornaTutorial();
            this.disegnaMappa(); this.aggiornaHud(); this.aggiornaCtx(); this.toast('Partita caricata.', 'good'); }
          else this.toast('Nessun salvataggio trovato.', 'bad');
          break;
        case 'nuova':
          if (!this._confNuova) { this._confNuova = true; this.toast('Premi di nuovo per abbandonare il settore attuale.', 'warn'); break; }
          this._confNuova = false;
          E.cancellaSalvataggio(); E.nuovaPartita();
          this.selezione = null; R.tipoDaCostruire = null; this.chiudi();
          this.mosso = false; this.visto = { scansione: false, ricerca: false }; this.storiaAperta = null;
          document.querySelectorAll('#toasts .overlay').forEach(function (o) { o.remove(); });
          this.aggiornaTutorial();
          R.cursore.x = Math.floor(E.MAP_W / 2); R.cursore.y = Math.floor(E.MAP_H / 2);
          this.disegnaMappa(); this.aggiornaHud(); this.aggiornaCtx(); this.centraSuCursore();
          break;
      }
      if (az !== 'demolisci') this._confDem = false;
      if (az !== 'nuova') this._confNuova = false;
      if (az.indexOf('tut-') !== 0) this.verificaTutorial();
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

      var cant = st.nucleoUp;
      $('#hud-top').innerHTML =
        '<span class="tit">NEXUS-7</span>' +
        '<span class="liv">NUCLEO MK-' + st.livello + '</span>' +
        '<span class="nomeliv">' + liv.nome + '</span>' +
        (cant
          ? '<span class="cantiere">MK-' + cant.a + ' ' +
            R.barra(1 - cant.resta / cant.totale, 5) + ' ' + Math.ceil(cant.resta) + 'c</span>'
          : '<span class="ciclo">CICLO ' + Math.floor(st.ciclo) + '</span>') +
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

      /* asterisco sulla tab STORIA quando ci sono voci non ancora lette */
      var tabStoria = document.querySelector('#tabs [data-arg="storia"]');
      if (tabStoria) tabStoria.classList.toggle('nuovo', ST.daLeggere(st) > 0);
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
       TUTORIAL
       ========================================================= */

    /* Valuta l'obiettivo corrente e avanza se raggiunto. */
    verificaTutorial: function () {
      if (!TU.attivo(E.state)) { this.aggiornaTutorial(); return; }
      var fatto = TU.controlla(E.state, E, this);
      if (fatto) {
        this.toast('OBIETTIVO COMPLETATO: ' + fatto.azione, 'good');
        /* un passo puo' sbloccarne subito un altro gia' soddisfatto */
        while (TU.controlla(E.state, E, this)) { /* avanza */ }
      }
      this.aggiornaTutorial();
    },

    aggiornaTutorial: function () {
      var el = $('#tut');
      if (!el) return;
      if (!TU.attivo(E.state)) { el.className = ''; el.innerHTML = ''; return; }
      var t = TU.stato(E.state), p = TU.passoCorrente(E.state);
      if (!p) { el.className = ''; el.innerHTML = ''; return; }
      var ultimo = TU.ultimo(E.state);
      el.className = 'aperto';
      el.innerHTML =
        '<div class="tut-h"><b>TUTORIAL ' + (t.passo + 1) + '/' + TU.PASSI.length + '</b> ' +
        '<span class="tut-t">' + esc(p.titolo) + '</span>' +
        '<span class="btn mini" data-az="' + (ultimo ? 'tut-chiudi' : 'tut-salta') + '">' +
        (ultimo ? '[FINE]' : '[SALTA]') + '</span></div>' +
        '<div class="tut-o">&gt; ' + esc(p.azione) + '</div>' +
        '<div class="tut-b"><span class="btn mini" data-az="pannello" data-arg="manuale">DETTAGLI</span>' +
        (p.suggerimento ? '<span class="tut-s">' + esc(p.suggerimento) + '</span>' : '') + '</div>';
    },

    /* =========================================================
       NARRATIVA
       ========================================================= */
    sbloccaFrammento: function (fonte) {
      var fr = ST.sbloccaFrammento(E.state, fonte);
      if (!fr) return;
      E.logga('Frammento d archivio recuperato: ' + fr.titolo, 'good');
      this.toast('ARCHIVIO: ' + fr.titolo + ' -- leggilo in STORIA', 'good');
      this.aggiornaHud();
    },

    /* =========================================================
       PANNELLI
       ========================================================= */
    apri: function (nome) {
      this.pannello = nome;
      if (nome === 'scansione') this.visto.scansione = true;
      if (nome === 'ricerca') this.visto.ricerca = true;
      if (nome === 'storia') ST.segnaTuttoLetto(E.state);
      var corpo = '';
      if (nome === 'costruisci') corpo = this.pCostruisci();
      else if (nome === 'scansione') corpo = this.pScansione();
      else if (nome === 'ricerca') corpo = this.pRicerca();
      else if (nome === 'citta') corpo = this.pCitta();
      else if (nome === 'diario') corpo = this.pDiario();
      else if (nome === 'storia') corpo = this.pStoria();
      else if (nome === 'manuale') corpo = this.pManuale();
      else if (nome === 'menu') corpo = this.pMenu();
      $('#panel').innerHTML = corpo;
      $('#panel').classList.add('aperto');
      this.verificaTutorial();
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
          var lim = E.limiteDi(def), quante = E.contaTipo(def.id);
          var pieno = sbl && quante >= lim;
          var motivo = '';
          if (!sbl) {
            motivo = def.tech && !st.tech[def.tech]
              ? 'RICHIEDE PROGETTO: ' + D.techById(def.tech).nome
              : 'RICHIEDE NUCLEO MK-' + def.unlock;
          } else if (pieno) {
            motivo = 'LIMITE RAGGIUNTO -- POTENZIA IL NUCLEO';
          }
          var righe = [];
          for (var k in def.produce) righe.push('+' + n1(def.produce[k]) + ' ' + k.toUpperCase());
          for (var k2 in def.consume) righe.push('-' + n1(def.consume[k2]) + ' ' + k2.toUpperCase());
          if (def.housing) righe.push('+' + def.housing + ' ALLOGGI');
          if (def.difesa) righe.push('+' + def.difesa + ' DIF');
          if (def.assorbe) righe.push('-' + def.assorbe + ' CTM');
          if (def.morale) righe.push('+' + def.morale + ' MOR');
          if (def.jobs) righe.push(def.jobs + ' ADDETTI');

          h += '<div class="voce ' + (sbl ? (pieno ? 'bloccata' : (pago ? '' : 'nopay')) : 'bloccata') + '" ' +
               (sbl && pago && !pieno ? 'data-az="scegli" data-arg="' + def.id + '"' : '') + '>' +
               '<div class="v-a"><span class="v-g c-' + def.color + '">' + esc(def.glyph) + '</span>' +
               '<b>' + def.nome + '</b> <span class="dim">' + def.w + 'x' + def.h + '</span>' +
               (sbl ? '<span class="conta ' + (pieno ? 'no' : '') + '">' + quante + '/' + lim + '</span>' : '') +
               '</div>' +
               '<div class="v-b">' + (sbl && !pieno ? esc(E.testoCosto(costo)) : '<span class="no">' + motivo + '</span>') + '</div>' +
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
      var tettoMk = E.maxLvlDi(def);
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
      if (def.id === 'nucleo') {
        /* Il Nucleo e' il motore della progressione: ha un cantiere proprio. */
        var next = E.prossimoLivello();
        if (st.nucleoUp) {
          h += '<span class="btn dis">CANTIERE MK-' + st.nucleoUp.a + ' IN CORSO<u>' +
               R.barra(1 - st.nucleoUp.resta / st.nucleoUp.totale, 10) + ' ' + Math.ceil(st.nucleoUp.resta) + ' cicli</u></span>';
        } else if (next) {
          var pn = E.puoPotenziareNucleo();
          h += '<span class="btn ' + (pn.ok ? 'ok' : 'dis') + '" data-az="potenzia">POTENZIA A MK-' + next.lvl +
               '<u>' + esc(E.testoCosto(next.costo)) + ' -- ' + next.tempo + ' cicli</u></span>';
        } else {
          h += '<span class="btn dis">NUCLEO AL GRADO MASSIMO</span>';
        }
      } else if (b.lvl >= def.maxLvl) {
        h += '<span class="btn dis">GRADO MASSIMO DELLA STRUTTURA</span>';
      } else if (b.lvl >= tettoMk) {
        h += '<span class="btn dis">SERVE NUCLEO MK-' + (b.lvl + 1) + '<u>il Nucleo e MK-' + st.livello + '</u></span>';
      } else {
        var cp = E.costoDi(def, b.lvl + 1);
        h += '<span class="btn ' + (E.puoPagare(cp) ? 'ok' : 'dis') + '" data-az="potenzia">POTENZIA MK-' + (b.lvl + 1) + '<u>' + esc(E.testoCosto(cp)) + '</u></span>';
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

    /* Riga per valori lunghi: etichetta sopra, testo a capo sotto. */
    rigaLunga: function (a, b, cls) {
      return '<div class="r lunga"><span>' + a + '</span><span class="' + (cls || '') + '">' + b + '</span></div>';
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

      h += '<div class="cat">-- NUCLEO DI COMANDO --</div><div class="tab">';
      h += this.riga('GRADO ATTUALE', 'MK-' + st.livello + ' / MK-' + D.LEVELS.length);
      if (st.nucleoUp) {
        var fr = 1 - st.nucleoUp.resta / st.nucleoUp.totale;
        h += this.riga('CANTIERE MK-' + st.nucleoUp.a, R.barra(fr, 10) + ' ' + Math.ceil(st.nucleoUp.resta) + ' cicli', 'ok');
        h += '<div class="dim pad">Durante i lavori il Nucleo rende meta e le sue difese sono smontate: e il momento peggiore per un raid.</div>';
      } else if (next) {
        h += this.riga('PROSSIMO GRADO', 'MK-' + next.lvl + ' -- ' + next.nome);
        for (var k in next.costo) {
          var ho = st.res[k] || 0, serve = next.costo[k];
          h += this.riga(k.toUpperCase(), n1(ho) + ' / ' + serve, ho >= serve ? 'ok' : 'no');
        }
        h += this.riga('DURATA LAVORI', next.tempo + ' cicli');
      } else {
        h += this.riga('GRADO MASSIMO', 'NEXUS PRIME', 'ok');
      }
      h += '</div>';

      if (!st.nucleoUp && next) {
        /* Cosa cambia con il grado successivo: e' la bussola della partita. */
        var nuove = [], ampliate = [];
        D.BUILDINGS.forEach(function (def) {
          if (!def.limiti) return;
          var ora = def.limiti[st.livello - 1], poi = def.limiti[next.lvl - 1];
          if (ora === 0 && poi > 0) nuove.push(def.nome);
          else if (poi > ora) ampliate.push(def.nome + ' ' + ora + '>' + poi);
        });
        h += '<div class="cat">-- COSA SBLOCCA MK-' + next.lvl + ' --</div><div class="tab">';
        if (nuove.length) h += this.rigaLunga('NUOVE STRUTTURE', nuove.join(', '), 'ok');
        h += this.riga('PERIMETRO', 'raggio ' + D.LEVELS[st.livello - 1].raggio + ' > ' + next.raggio, 'ok');
        h += this.riga('MAGAZZINI', '+60% su ogni risorsa', 'ok');
        h += this.riga('TETTO POTENZIAMENTI', 'strutture fino a MK-' + Math.min(5, next.lvl), 'ok');
        if (ampliate.length) h += this.rigaLunga('PIU POSTI PER', ampliate.slice(0, 6).join(', ') + (ampliate.length > 6 ? '...' : ''), 'ok');
        h += '</div>';
        var pn2 = E.puoPotenziareNucleo();
        h += '<div class="azioni"><span class="btn ' + (pn2.ok ? 'ok' : 'dis') + '" data-az="potenzia-nucleo">' +
             'POTENZIA IL NUCLEO A MK-' + next.lvl + '<u>' + (pn2.ok ? esc(E.testoCosto(next.costo)) + ' -- ' + next.tempo + ' cicli' : esc(pn2.motivo)) + '</u></span></div>';
      }
      if (!next && !st.nucleoUp) {
        h += '<div class="dim pad">Costruisci lo SPAZIOPORTO ESODO e avvia il lancio per completare la partita.</div>';
      }

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

    /* ---------- STORIA ---------- */
    pStoria: function () {
      var st = E.state, sto = ST.init(st), self = this;
      var h = this.testata('ARCHIVIO',
        sto.capitoli.length + '/' + ST.CAPITOLI.length + ' CAP -- ' +
        sto.frammenti.length + '/' + ST.FRAMMENTI.length + ' FRAM');
      h += '<div class="scroll">';
      h += '<p class="dim">Registro dell Amministratore: una voce a ogni promozione del settore. I frammenti si recuperano completando ricerche e attraversando certi eventi.</p>';

      h += '<div class="cat">-- REGISTRO DELL AMMINISTRATORE --</div>';
      ST.CAPITOLI.forEach(function (c) {
        var aperto = sto.capitoli.indexOf(c.lvl) >= 0;
        var chiave = 'c' + c.lvl;
        var espanso = self.storiaAperta === chiave;
        if (!aperto) {
          h += '<div class="voce bloccata"><div class="v-a"><b>LIV.' + c.lvl + ' -- ???</b></div>' +
               '<div class="v-c dim">VOCE NON ANCORA REGISTRATA</div></div>';
          return;
        }
        h += '<div class="voce ' + (espanso ? 'fatta' : '') + '" data-az="storia-voce" data-arg="' + chiave + '">' +
             '<div class="v-a"><b>[LOG ' + c.num + '] ' + esc(c.titolo) + '</b></div>' +
             '<div class="v-c dim">LIVELLO ' + c.lvl + ' -- ' + (espanso ? 'tocca per chiudere' : 'tocca per leggere') + '</div>' +
             '</div>';
        if (espanso) h += '<pre class="racconto">' + esc(c.testo) + '</pre>';
      });

      h += '<div class="cat">-- FRAMMENTI D ARCHIVIO --</div>';
      ST.FRAMMENTI.forEach(function (f) {
        var aperto = ST.sbloccato(st, f);
        var espanso = self.storiaAperta === f.id;
        if (!aperto) {
          h += '<div class="voce bloccata"><div class="v-a"><b>??? -- FRAMMENTO NON RECUPERATO</b></div>' +
               '<div class="v-c dim">' + (f.fonte.indexOf('tech:') === 0 ? 'si recupera completando una ricerca' : 'si recupera vivendo un evento') + '</div></div>';
          return;
        }
        h += '<div class="voce ' + (espanso ? 'fatta' : '') + '" data-az="storia-voce" data-arg="' + f.id + '">' +
             '<div class="v-a"><b>' + esc(f.titolo) + '</b></div>' +
             '<div class="v-c dim">' + (espanso ? 'tocca per chiudere' : 'tocca per leggere') + '</div></div>';
        if (espanso) h += '<pre class="racconto">' + esc(f.testo) + '</pre>';
      });

      if (st.vittoria || st.gameover) {
        h += '<div class="cat">-- EPILOGO --</div>';
        h += '<pre class="racconto">' + esc(st.vittoria ? ST.FINALI.vittoria : ST.FINALI.sconfitta) + '</pre>';
      }
      h += '</div>';
      return h;
    },

    /* ---------- MANUALE ---------- */
    pManuale: function () {
      var h = this.testata('MANUALE DELL AMMINISTRATORE', 'SEMPRE DISPONIBILE NEL MENU');
      h += '<div class="scroll aiuto">';

      h += '<div class="cat">-- 1. OBIETTIVO --</div>' +
        '<p>Portare il <b>NUCLEO DI COMANDO</b> dal grado MK-1 a MK-10 (<b>NEXUS PRIME</b>), completare la ricerca <b>PROTOCOLLO ESODO</b>, costruire lo <b>SPAZIOPORTO ESODO</b> e avviare il lancio. Il conto alla rovescia dura 60 cicli: vanno difesi.</p>' +
        '<p>Si perde in un modo solo: restare senza coloni.</p>';

      h += '<div class="cat">-- 2. IL NUCLEO DI COMANDO --</div>' +
        '<p>E il cuore della progressione: il <b>grado del Nucleo e il livello del settore</b>. Non sale da solo, lo potenzi tu, pagando risorse e aspettando che i lavori finiscano.</p>' +
        '<p>Ogni grado del Nucleo:<br>' +
        '-- estende il <b>perimetro edificabile</b>;<br>' +
        '-- alza del <b>60%</b> il tetto di ogni magazzino;<br>' +
        '-- <b>sblocca nuove strutture</b>;<br>' +
        '-- aumenta <b>quante</b> strutture di ogni tipo puoi possedere;<br>' +
        '-- alza il <b>tetto dei potenziamenti</b>: nessuna struttura puo superare il grado del Nucleo.</p>' +
        '<p>Il pannello CITTA mostra sempre costo, durata e cosa sblocca il grado successivo. <b>Mentre il cantiere e aperto il Nucleo rende meta e le sue difese sono smontate</b>: non aprirlo con i predoni alle porte e le torrette scariche.</p>' +
        '<p class="dim">Il collo di bottiglia non e mai il terreno libero: sono i limiti per grado. Se non puoi piu costruire quello che ti serve, la risposta e quasi sempre potenziare il Nucleo.</p>';

      h += '<div class="cat">-- 3. COMANDI --</div>' +
        '<p><b>Spostarsi:</b> trascina la mappa con un dito.<br>' +
        '<b>Selezionare:</b> tocca una cella.<br>' +
        '<b>Confermare:</b> tocca <i>di nuovo</i> la stessa cella (scansiona un edificio, conferma una costruzione, sgombera macerie).<br>' +
        '<b>Zoom:</b> i tasti [-] e [+] in basso a destra. Sotto il minimo si passa alla <b>mappa tattica</b>, che mostra tutto il settore in un colpo d occhio con un carattere per cella.<br>' +
        '<b>Velocita:</b> il tasto in alto a destra cicla fra pausa, x1, x2 e x4.</p>' +
        '<p class="dim">Con una tastiera collegata: frecce per il cursore, Invio conferma, Esc annulla, + e - per lo zoom.</p>';

      h += '<div class="cat">-- 4. RISORSE --</div>' +
        '<p><b>RTM rottami</b> -- materiale base di ogni costruzione.<br>' +
        '<b>H2O acqua</b> -- consumata dai coloni a ogni ciclo.<br>' +
        '<b>BIO biomassa</b> -- il cibo, consumato dai coloni.<br>' +
        '<b>LEG leghe</b> -- raffinate dalla fonderia, servono alle strutture avanzate.<br>' +
        '<b>DAT dati</b> -- alimentano la ricerca.</p>' +
        '<p>Ogni risorsa ha un <b>tetto di stoccaggio</b>: quello che produci oltre il tetto va perso. Il tetto cresce del 60% a ogni grado del Nucleo, e i DEPOSITI CORAZZATI lo alzano ancora. I potenziamenti di fine partita costano decine di migliaia di unita: senza depositi non riuscirai ad accumularli.</p>';

      h += '<div class="cat">-- 5. ENERGIA --</div>' +
        '<p>L energia <b>non si accumula</b>. E un bilancio istantaneo fra produzione e richiesta, mostrato come NRG nella barra in alto.</p>' +
        '<p>Se la richiesta supera la produzione, <b>tutte</b> le strutture consumatrici rendono in proporzione: al 50% di copertura, meta resa ovunque. Tieni sempre un margine, e ricorda che le torrette senza corrente non sparano.</p>';

      h += '<div class="cat">-- 6. COLONI E ADDETTI --</div>' +
        '<p>Il <b>65%</b> dei coloni costituisce la forza lavoro. La barra in alto mostra <b>LAV posti/forza</b>: se i posti di lavoro superano la forza disponibile, la resa cala ovunque in proporzione.</p>' +
        '<p>I coloni crescono da soli se ci sono alloggi liberi, saldo positivo di acqua e cibo e morale almeno 45. La crescita e proporzionale alla popolazione: piu la citta e grande, piu accelera.</p>' +
        '<p>Il <b>morale</b> sale con cibo e acqua in eccesso, monumenti, centri medici e mercati; scende con carenze, blackout, sovraffollamento e contaminazione. Il morale moltiplica la resa di tutto (da x0,70 a x1,00).</p>';

      h += '<div class="cat">-- 7. TERRENO E ADIACENZE --</div>' +
        '<p>Le <b>macerie</b> vanno sgomberate prima di costruire, e danno rottami. <b>Speroni</b> e <b>pozze tossiche</b> non sono edificabili, ma le pozze servono: il POZZO PROFONDO va costruito adiacente a una.</p>' +
        '<p>Bonus di posizione:<br>' +
        '-- <b>TRACCIATO</b> adiacente: +15% a qualsiasi struttura;<br>' +
        '-- <b>RACCOGLITORE</b> vicino alle macerie: fino a +90%;<br>' +
        '-- <b>SERRA IDROPONICA</b> vicino a condensatore (+15%) o pozzo (+20%).</p>' +
        '<p>Il pannello SCANSIONE elenca sempre i bonus attivi su quella struttura.</p>';

      h += '<div class="cat">-- 8. POTENZIAMENTI --</div>' +
        '<p>Ogni struttura sale fino a <b>MK-5</b>: +40% di resa per grado, fino a x2,6, sullo stesso spazio. Salgono anche alloggi, difesa e capienza dei depositi. Il costo cresce del 75% a ogni grado.</p>' +
        '<p><b>Tetto:</b> nessuna struttura puo superare il grado del Nucleo. Con il Nucleo a MK-3 tutto il resto si ferma a MK-3, per quante risorse tu abbia.</p>' +
        '<p>Quando il terreno e i limiti finiscono, potenziare e l unico modo di crescere: e la strategia prevista per gli ultimi gradi.</p>';

      h += '<div class="cat">-- 9. DIFESA E INCURSIONI --</div>' +
        '<p>I predoni attaccano ogni 60-130 cicli e la loro forza cresce con il livello della citta (circa 10 + 14 per livello). Il pannello CITTA mostra la stima del prossimo raid accanto alla tua difesa.</p>' +
        '<p>Se la difesa regge, il raid viene respinto e recuperi bottino. Se non regge, perdi rottami, strutture danneggiate e coloni. Torrette, barriere e il progetto RETE DI PUNTAMENTO (+60%) sono la risposta.</p>';

      h += '<div class="cat">-- 10. CONTAMINAZIONE --</div>' +
        '<p>Fonderie, reattori, officine e raccoglitori emettono contaminazione; TORRI DI FILTRAGGIO e RIGENERATORI ATMOSFERICI la assorbono. Oltre il <b>55%</b> i coloni cominciano a morire, e il morale scende comunque in proporzione.</p>';

      h += '<div class="cat">-- 11. RICERCA --</div>' +
        '<p>Dieci progetti in albero: alcuni richiedono un progetto precedente, tutti richiedono un livello citta minimo. Sbloccano bonus permanenti e tre strutture chiave (reattore, arcologia, spazioporto).</p>' +
        '<p>Ogni progetto completato recupera anche un <b>frammento d archivio</b>: la storia del Settore-7 si legge nel pannello STORIA.</p>';

      h += '<div class="cat">-- 12. STRATEGIA D APERTURA --</div>' +
        '<p>Un ordine che funziona:</p>' +
        '<p>1. Sgombera due o tre celle di macerie vicine al Nucleo.<br>' +
        '2. Un RACCOGLITORE adiacente alle macerie rimaste.<br>' +
        '3. Un ARRAY FOTOVOLTAICO (non richiede addetti).<br>' +
        '4. Un CONDENSATORE e una MICO-FARM: acqua e cibo in positivo.<br>' +
        '5. Due RIFUGI: piu coloni, quindi piu addetti.<br>' +
        '6. Tracciati fra le strutture per il +15%.<br>' +
        '7. Un RELE DATI appena la rete regge: senza dati non c e ricerca.<br>' +
        '8. Appena hai 250 RTM da parte, apri il cantiere del NUCLEO MK-2.</p>' +
        '<p class="dim">Regola generale: risolvi sempre per primo il vincolo peggiore. Se NRG e rosso costruisci energia, se LAV e in deficit costruisci alloggi, se H2O o BIO sono negativi costruisci acqua o cibo. Tutto il resto puo aspettare.</p>';

      h += '<div class="cat">-- 13. SALVATAGGIO --</div>' +
        '<p>La partita si salva da sola ogni 15 cicli, quando esci e quando metti l app in secondo piano. Il salvataggio resta su questo dispositivo. Dal MENU puoi salvare e caricare a mano.</p>';

      h += '</div>';
      return h;
    },

    /* ---------- MENU ---------- */
    pMenu: function () {
      var st = E.state, t = TU.stato(st), sto = ST.init(st);
      var h = this.testata('TERMINALE AMMINISTRATORE');
      h += '<div class="scroll">';

      h += '<div class="cat">-- GUIDA --</div>';
      h += '<div class="azioni">' +
        '<span class="btn ok" data-az="pannello" data-arg="manuale">MANUALE COMPLETO<u>12 sezioni, sempre qui</u></span>' +
        (TU.attivo(st)
          ? '<span class="btn" data-az="tut-salta">NASCONDI TUTORIAL<u>passo ' + (t.passo + 1) + '/' + TU.PASSI.length + '</u></span>'
          : (t.completato
              ? '<span class="btn" data-az="tut-riprendi">RIFAI IL TUTORIAL<u>completato</u></span>'
              : '<span class="btn ok" data-az="tut-continua">RIPRENDI TUTORIAL<u>passo ' + (t.passo + 1) + '/' + TU.PASSI.length + '</u></span>')) +
        '<span class="btn" data-az="pannello" data-arg="storia">ARCHIVIO E STORIA<u>' +
          sto.capitoli.length + '/' + ST.CAPITOLI.length + ' capitoli, ' +
          sto.frammenti.length + '/' + ST.FRAMMENTI.length + ' frammenti</u></span>' +
        '</div>';

      h += '<div class="cat">-- PARTITA --</div>';
      h += '<div class="azioni">' +
        '<span class="btn ok" data-az="salva">SALVA PARTITA</span>' +
        '<span class="btn" data-az="carica">CARICA PARTITA</span>' +
        '<span class="btn no" data-az="nuova">NUOVA PARTITA</span>' +
        '</div>';

      h += '<div class="cat">-- IN BREVE --</div><div class="aiuto">' +
        '<p><b>Tocca due volte</b> la stessa cella per confermare: scansiona un edificio, conferma una costruzione, sgombera macerie.</p>' +
        '<p><b>Risolvi sempre il vincolo peggiore.</b> NRG rosso: costruisci energia. LAV in deficit: costruisci alloggi. H2O o BIO negativi: costruisci acqua o cibo.</p>' +
        '<p><b>Quando lo spazio finisce</b>, potenzia invece di espanderti: MK-5 vale 2,6 volte MK-1.</p>' +
        '<p class="dim">Tutto il resto e nel MANUALE COMPLETO qui sopra. Salvataggio automatico ogni 15 cicli.</p>' +
        '</div>';

      h += '</div>';
      return h;
    },

    /* =========================================================
       NOTIFICHE
       ========================================================= */
    toast: function (testo, cls) {
      var cont = $('#toasts');
      /* Tetto di notifiche visibili: una raffica (obiettivi, evento, promozione)
         non deve coprire lo schermo. Le piu' vecchie escono per prime. */
      var vecchi = cont.querySelectorAll('.toast');
      for (var i = 0; i <= vecchi.length - 3; i++) vecchi[i].remove();
      var t = document.createElement('div');
      t.className = 'toast ' + (cls || 'sys');
      t.textContent = testo;
      cont.appendChild(t);
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
      /* La promozione sblocca il capitolo del registro dell'Amministratore. */
      var cap = ST.sbloccaCapitolo(E.state, l.lvl);
      if (cap) {
        testo += '\n\n   NUOVA VOCE NEL REGISTRO:\n   [LOG ' + cap.num + '] ' + cap.titolo;
        E.logga('Nuova voce nel registro: [LOG ' + cap.num + '] ' + cap.titolo, 'good');
        this.overlay(testo, 'good',
          '<span class="btn ok" data-az="pannello" data-arg="storia">LEGGI</span>' +
          '<span class="btn">CHIUDI</span>');
      } else {
        this.overlay(testo, 'good');
      }
      this.aggiornaHud();
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
      this.overlay(testo, vinto ? 'good' : 'bad',
        '<span class="btn ok" data-az="pannello" data-arg="storia">LEGGI L EPILOGO</span>' +
        '<span class="btn no" data-az="nuova">NUOVA PARTITA</span>');
    },

    /* bottoni: HTML dei pulsanti; se presenti l'overlay non si chiude da solo */
    overlay: function (testo, cls, bottoni) {
      var o = document.createElement('div');
      o.className = 'overlay ' + cls;
      o.innerHTML = '<pre>' + esc(testo) + '</pre>' +
        (bottoni ? '<div class="azioni">' + bottoni + '</div>' : '');
      $('#toasts').appendChild(o);
      o.addEventListener('click', function (e) {
        if (!e.target.closest('[data-az]')) o.remove();
      });
      if (!bottoni) setTimeout(function () { if (o.parentNode) o.remove(); }, 4200);
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
          self.verificaTutorial();
          self.disegnaMappa();
        }
      }, 250);
    }
  };

  global.UI = UI;
})(window);
