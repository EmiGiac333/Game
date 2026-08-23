/* ============================================================
   NEXUS-7 :: engine.js
   Stato di gioco, generazione mappa, simulazione economica,
   costruzione/potenziamento, eventi, salvataggio.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DATA;
  var MAP_W = 28, MAP_H = 18;
  var SAVE_KEY = 'nexus7.save.v1';
  var SAVE_VER = 4;
  var CICLO_MS = 1000;

  /* ---- RNG deterministico (mulberry32) ---- */
  function rngFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var Engine = {
    state: null,
    rng: Math.random,
    listeners: {},

    /* ---------- eventi interni (pub/sub) ---------- */
    on: function (ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    emit: function (ev, payload) {
      var ls = this.listeners[ev] || [];
      for (var i = 0; i < ls.length; i++) ls[i](payload);
    },

    /* =========================================================
       GENERAZIONE MAPPA
       ========================================================= */
    generaMappa: function (seed) {
      var rnd = rngFrom(seed);
      var tiles = [];
      var cx = Math.floor(MAP_W / 2), cy = Math.floor(MAP_H / 2);

      for (var y = 0; y < MAP_H; y++) {
        for (var x = 0; x < MAP_W; x++) {
          var d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
          var r = rnd();
          var t;
          if (d <= 1) {
            t = 'ash';                              /* zona di atterraggio pulita */
          } else if (r < 0.20) {
            t = 'rubble';
          } else if (r < 0.28) {
            t = 'rock';
          } else if (r < 0.34) {
            t = 'pool';
          } else if (r < 0.40) {
            t = 'crater';
          } else if (r < 0.46 && d > 5) {
            t = 'hot';
          } else if (r < 0.70) {
            t = 'dust';
          } else {
            t = 'ash';
          }
          tiles.push({
            t: t,
            b: -1,      /* indice edificio che occupa la cella, -1 = vuota */
            cl: false   /* macerie sgomberate */
          });
        }
      }
      return tiles;
    },

    /* =========================================================
       NUOVA PARTITA
       ========================================================= */
    nuovaPartita: function (seed) {
      seed = seed || (Date.now() & 0x7fffffff);
      this.rng = rngFrom(seed ^ 0x9e3779b9);
      var st = {
        v: SAVE_VER,
        seed: seed,
        ciclo: 0,
        livello: 1,
        res: { rtm: 180, h2o: 60, bio: 60, leg: 0, dat: 0 },
        pop: 8,
        morale: 62,
        ctm: 4,
        tiles: this.generaMappa(seed),
        edifici: [],
        tech: {},
        log: [],
        nucleoUp: null,
        spedizioni: [], territori: [], intel: 0, predoniIndeboliti: 0,
        battaglia: null,
        prossimoEvento: 70,
        eventiAttivi: [],
        statistiche: { costruiti: 0, demoliti: 0, raidRespinti: 0, mortiTotali: 0, natiTotali: 0 },
        spedStat: { partite: 0, riuscite: 0, perduti: 0, bottino: 0 },
        battStat: { vinte: 0, perse: 0, trattate: 0, ritirate: 0 },
        lancioAvviato: false, lancioTimer: 0, vittoria: false, gameover: false
      };
      this.state = st;

      /* Il Nucleo di Comando al centro della mappa. */
      var cx = Math.floor(MAP_W / 2) - 1, cy = Math.floor(MAP_H / 2) - 1;
      this.piazza('nucleo', cx, cy, true);
      st.statistiche.costruiti = 0;

      if (global.Story) global.Story.init(st);
      if (global.Tutorial) global.Tutorial.init(st);
      if (global.Spedizioni) global.Spedizioni.generaTerritori(st, this.rng);
      if (global.Battaglia) global.Battaglia.init(st);

      this.logga('Modulo Arca atterrato nel Settore-7. Sei l Amministratore.', 'sys');
      this.logga('Sgombera le macerie e costruisci: rottami, acqua, cibo, energia.', 'sys');
      this.aggiorna(0);
      return st;
    },

    /* =========================================================
       ACCESSORI MAPPA
       ========================================================= */
    idx: function (x, y) { return y * MAP_W + x; },
    inMappa: function (x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; },
    tile: function (x, y) { return this.inMappa(x, y) ? this.state.tiles[this.idx(x, y)] : null; },
    get MAP_W() { return MAP_W; },
    get MAP_H() { return MAP_H; },

    /* Edificio che occupa la cella (o null). */
    edificioSu: function (x, y) {
      var t = this.tile(x, y);
      if (!t || t.b < 0) return null;
      return this.state.edifici[t.b] || null;
    },

    /* Raggio operativo autorizzato dal livello citta'. */
    raggio: function () { return D.LEVELS[this.state.livello - 1].raggio; },

    nelSettore: function (x, y, w, h) {
      var cx = Math.floor(MAP_W / 2), cy = Math.floor(MAP_H / 2), r = this.raggio();
      for (var j = 0; j < h; j++) {
        for (var i = 0; i < w; i++) {
          if (Math.max(Math.abs(x + i - cx), Math.abs(y + j - cy)) > r) return false;
        }
      }
      return true;
    },

    /* =========================================================
       COSTRUZIONE
       ========================================================= */

    /* Costo effettivo (le tecnologie possono scontarlo). */
    costoDi: function (def, lvl) {
      lvl = lvl || 1;
      var mult = lvl === 1 ? 1 : Math.pow(1.75, lvl - 1);
      var out = {};
      for (var k in def.cost) out[k] = Math.round(def.cost[k] * mult);
      return out;
    },

    puoPagare: function (costo) {
      for (var k in costo) { if ((this.state.res[k] || 0) < costo[k]) return false; }
      return true;
    },

    paga: function (costo) {
      for (var k in costo) this.state.res[k] -= costo[k];
    },

    /* Verifica se un edificio puo' essere piazzato: ritorna {ok, motivo}. */
    puoPiazzare: function (tipo, x, y) {
      var def = D.byId(tipo);
      if (!def) return { ok: false, motivo: 'STRUTTURA SCONOSCIUTA' };
      if (!this.sbloccato(def)) return { ok: false, motivo: 'NON ANCORA SBLOCCATO' };
      if (def.unique && this.contaTipo(tipo) > 0) return { ok: false, motivo: 'STRUTTURA UNICA GIA PRESENTE' };
      var lim = this.limiteDi(def), quante = this.contaTipo(tipo);
      if (quante >= lim) {
        return { ok: false, motivo: 'LIMITE RAGGIUNTO ' + quante + '/' + lim + ' -- POTENZIA IL NUCLEO' };
      }
      if (!this.inMappa(x, y) || !this.inMappa(x + def.w - 1, y + def.h - 1)) return { ok: false, motivo: 'FUORI MAPPA' };
      if (!this.nelSettore(x, y, def.w, def.h)) return { ok: false, motivo: 'SETTORE NON AUTORIZZATO -- SALI DI LIVELLO' };

      for (var j = 0; j < def.h; j++) {
        for (var i = 0; i < def.w; i++) {
          var t = this.tile(x + i, y + j);
          if (t.b >= 0) return { ok: false, motivo: 'CELLA GIA OCCUPATA' };
          var ter = D.TERRAIN[t.t];
          if (t.t === 'rubble' && !t.cl) return { ok: false, motivo: 'MACERIE DA SGOMBERARE' };
          if (!ter.build && !(t.t === 'rubble' && t.cl)) return { ok: false, motivo: 'TERRENO NON EDIFICABILE (' + ter.nome + ')' };
        }
      }
      if (def.richiedeVicino) {
        if (!this.haVicino(x, y, def.w, def.h, def.richiedeVicino)) {
          return { ok: false, motivo: 'RICHIEDE ADIACENZA A ' + D.TERRAIN[def.richiedeVicino].nome };
        }
      }
      if (!this.puoPagare(this.costoDi(def, 1))) return { ok: false, motivo: 'RISORSE INSUFFICIENTI' };
      return { ok: true };
    },

    haVicino: function (x, y, w, h, terreno) {
      for (var j = -1; j <= h; j++) {
        for (var i = -1; i <= w; i++) {
          if (i >= 0 && i < w && j >= 0 && j < h) continue;
          var t = this.tile(x + i, y + j);
          if (t && t.t === terreno) return true;
        }
      }
      return false;
    },

    piazza: function (tipo, x, y, gratis) {
      var def = D.byId(tipo);
      if (!gratis) {
        var chk = this.puoPiazzare(tipo, x, y);
        if (!chk.ok) return chk;
        this.paga(this.costoDi(def, 1));
      }
      var b = { tipo: tipo, x: x, y: y, lvl: 1, hp: 100, eff: 1, attivo: true };
      var id = this.state.edifici.push(b) - 1;
      for (var j = 0; j < def.h; j++) {
        for (var i = 0; i < def.w; i++) this.tile(x + i, y + j).b = id;
      }
      this.state.statistiche.costruiti++;
      this.aggiorna(0);
      this.emit('mappa');
      return { ok: true, id: id };
    },

    demolisci: function (b) {
      var def = D.byId(b.tipo);
      if (def.unique && b.tipo === 'nucleo') return { ok: false, motivo: 'IL NUCLEO NON PUO ESSERE DEMOLITO' };
      var id = this.state.edifici.indexOf(b);
      var costo = this.costoDi(def, 1), k;
      for (k in costo) {
        this.state.res[k] = Math.min(this.cap(k), (this.state.res[k] || 0) + Math.floor(costo[k] * 0.5));
      }
      for (var j = 0; j < def.h; j++) {
        for (var i = 0; i < def.w; i++) this.tile(b.x + i, b.y + j).b = -1;
      }
      /* rimuovo mantenendo validi gli indici salvati nelle celle */
      this.state.edifici.splice(id, 1);
      for (var c = 0; c < this.state.tiles.length; c++) {
        if (this.state.tiles[c].b > id) this.state.tiles[c].b--;
      }
      this.state.statistiche.demoliti++;
      this.logga('Demolita: ' + def.nome + ' (+50% materiali).', 'warn');
      this.aggiorna(0);
      this.emit('mappa');
      return { ok: true };
    },

    potenzia: function (b) {
      var def = D.byId(b.tipo);
      if (def.id === 'nucleo') return this.avviaPotenziamentoNucleo();
      var tetto = this.maxLvlDi(def);
      if (b.lvl >= def.maxLvl) return { ok: false, motivo: 'GRADO MASSIMO DELLA STRUTTURA' };
      if (b.lvl >= tetto) return { ok: false, motivo: 'IL NUCLEO E SOLO MK-' + this.state.livello + ': POTENZIALO PRIMA' };
      var costo = this.costoDi(def, b.lvl + 1);
      if (!this.puoPagare(costo)) return { ok: false, motivo: 'RISORSE INSUFFICIENTI' };
      this.paga(costo);
      b.lvl++;
      b.hp = Math.min(100, b.hp + 25);
      this.logga(def.nome + ' potenziata a MK-' + b.lvl + '.', 'good');
      this.aggiorna(0);
      this.emit('mappa');
      return { ok: true };
    },

    ripara: function (b) {
      var def = D.byId(b.tipo);
      if (b.hp >= 100) return { ok: false, motivo: 'STRUTTURA INTEGRA' };
      var mancante = 100 - b.hp;
      var base = this.costoDi(def, 1);
      var costo = { rtm: Math.max(4, Math.round((base.rtm || 20) * mancante / 100 * 0.4)) };
      if (base.leg) costo.leg = Math.max(1, Math.round(base.leg * mancante / 100 * 0.4));
      if (!this.puoPagare(costo)) return { ok: false, motivo: 'RISORSE INSUFFICIENTI (' + this.testoCosto(costo) + ')' };
      this.paga(costo);
      b.hp = 100;
      this.aggiorna(0);
      this.emit('mappa');
      return { ok: true };
    },

    sgombera: function (x, y) {
      var t = this.tile(x, y);
      if (!t || t.t !== 'rubble' || t.cl) return { ok: false, motivo: 'NIENTE DA SGOMBERARE' };
      t.cl = true;
      var bottino = 12 + Math.floor(this.rng() * 14);
      this.aggiungi('rtm', bottino);
      var msg = 'Macerie sgomberate: +' + bottino + ' RTM';
      if (this.rng() < 0.25) { var l = 2 + Math.floor(this.rng() * 4); this.aggiungi('leg', l); msg += ', +' + l + ' LEG'; }
      if (this.rng() < 0.12) { var dd = 1 + Math.floor(this.rng() * 3); this.aggiungi('dat', dd); msg += ', +' + dd + ' DAT'; }
      this.logga(msg + '.', 'good');
      this.emit('mappa');
      return { ok: true };
    },

    contaTipo: function (tipo) {
      var n = 0;
      for (var i = 0; i < this.state.edifici.length; i++) if (this.state.edifici[i].tipo === tipo) n++;
      return n;
    },

    sbloccato: function (def) {
      if (this.limiteDi(def) <= 0) return false;
      if (def.tech && !this.state.tech[def.tech]) return false;
      return true;
    },

    /* Quante strutture di questo tipo consente il grado attuale del Nucleo. */
    limiteDi: function (def) {
      if (!def.limiti) return 9999;
      return def.limiti[Math.max(0, Math.min(def.limiti.length - 1, this.state.livello - 1))];
    },

    /* Grado MK massimo: nessuna struttura puo' superare il grado del Nucleo. */
    maxLvlDi: function (def) {
      if (def.id === 'nucleo') return def.maxLvl;
      return Math.min(def.maxLvl, this.state.livello);
    },

    /* =========================================================
       RICERCA
       ========================================================= */
    techDisponibile: function (t) {
      if (this.state.tech[t.id]) return false;
      if (t.lvl > this.state.livello) return false;
      for (var i = 0; i < t.req.length; i++) if (!this.state.tech[t.req[i]]) return false;
      return true;
    },

    ricerca: function (id) {
      var t = D.techById(id);
      if (!t) return { ok: false, motivo: 'PROGETTO SCONOSCIUTO' };
      if (this.state.tech[id]) return { ok: false, motivo: 'GIA COMPLETATO' };
      if (!this.techDisponibile(t)) return { ok: false, motivo: 'PREREQUISITI MANCANTI' };
      if (this.state.res.dat < t.costo) return { ok: false, motivo: 'SERVONO ' + t.costo + ' DAT' };
      this.state.res.dat -= t.costo;
      this.state.tech[id] = true;
      this.logga('PROGETTO COMPLETATO: ' + t.nome + ' -- ' + t.eff, 'good');
      this.emit('tech', id);
      this.aggiorna(0);
      this.emit('mappa');
      return { ok: true };
    },

    /* =========================================================
       BONUS E MOLTIPLICATORI
       ========================================================= */

    /* Moltiplicatore da tecnologie per uno specifico edificio. */
    multTech: function (tipo) {
      var m = 1, T = this.state.tech;
      if (T.logistica) m *= 1.12;
      if (T.fotovoltaico && tipo === 'solare') m *= 1.30;
      if (T.riciclo && (tipo === 'raccoglitore' || tipo === 'officina')) m *= 1.30;
      if (T.idro2 && (tipo === 'idroponica' || tipo === 'micofarm')) m *= 1.35;
      return m;
    },

    /* Bonus di adiacenza: strade, terreni, sinergie. Ritorna un elenco leggibile. */
    bonusAdiacenza: function (b) {
      var def = D.byId(b.tipo), out = { mult: 1, voci: [] };
      if (def.road) return out;
      var vicini = this.viciniDi(b);

      if (vicini.tipiEdificio.strada) { out.mult += 0.15; out.voci.push({ n: 'TRACCIATO ADIACENTE', v: '+15%' }); }

      if (def.bonusVicino) {
        for (var ter in def.bonusVicino) {
          var n = vicini.terreni[ter] || 0;
          if (n > 0) {
            var bo = Math.min(def.bonusVicino[ter], n * def.bonusVicino[ter] / 3);
            out.mult += bo;
            out.voci.push({ n: D.TERRAIN[ter].nome + ' x' + n, v: '+' + Math.round(bo * 100) + '%' });
          }
        }
      }
      if (def.sinergia) {
        for (var sid in def.sinergia) {
          if (vicini.tipiEdificio[sid]) {
            out.mult += def.sinergia[sid];
            out.voci.push({ n: 'SINERGIA ' + D.byId(sid).nome, v: '+' + Math.round(def.sinergia[sid] * 100) + '%' });
          }
        }
      }
      return out;
    },

    /* Censisce terreni ed edifici nell anello attorno a un edificio. */
    viciniDi: function (b) {
      var def = D.byId(b.tipo), terreni = {}, tipiEdificio = {};
      for (var j = -1; j <= def.h; j++) {
        for (var i = -1; i <= def.w; i++) {
          if (i >= 0 && i < def.w && j >= 0 && j < def.h) continue;
          var t = this.tile(b.x + i, b.y + j);
          if (!t) continue;
          terreni[t.t] = (terreni[t.t] || 0) + 1;
          if (t.b >= 0) {
            var o = this.state.edifici[t.b];
            if (o && o !== b) tipiEdificio[o.tipo] = (tipiEdificio[o.tipo] || 0) + 1;
          }
        }
      }
      return { terreni: terreni, tipiEdificio: tipiEdificio };
    },

    /* Moltiplicatore di livello dell edificio (MK-n). */
    multLivello: function (lvl) { return 1 + 0.4 * (lvl - 1); },

    /* Fattore da integrita' struttura. */
    multHp: function (hp) { return hp >= 60 ? 1 : 0.35 + 0.65 * (hp / 60); },

    cap: function (k) {
      /* La capienza base cresce in modo geometrico con il grado del NUCLEO:
         i potenziamenti di fine partita costano decine di migliaia di unita'
         e senza questa curva non sarebbero mai accumulabili. */
      var c = (D.BASE_CAP[k] || 0) * Math.pow(1.6, this.state.livello - 1);
      for (var i = 0; i < this.state.edifici.length; i++) {
        var b = this.state.edifici[i], def = D.byId(b.tipo);
        if (def.storage && def.storage[k]) c += def.storage[k] * this.multLivello(b.lvl);
      }
      return Math.round(c);
    },

    aggiungi: function (k, n) {
      this.state.res[k] = Math.max(0, Math.min(this.cap(k), (this.state.res[k] || 0) + n));
    },

    /* =========================================================
       SIMULAZIONE -- un ciclo
       dt = frazione di ciclo (0 = solo ricalcolo statistiche)
       ========================================================= */
    aggiorna: function (dt) {
      var st = this.state, i, k, b, def;
      var eds = st.edifici;

      /* --- 1. posti di lavoro e forza lavoro --- */
      var lavori = 0;
      for (i = 0; i < eds.length; i++) {
        def = D.byId(eds[i].tipo);
        lavori += Math.round(def.jobs * (1 + 0.3 * (eds[i].lvl - 1)));
      }
      var forzaLavoro = Math.floor(st.pop * 0.65);
      /* I droni coprono un minimo del 30% anche senza personale: senza questo
         pavimento una carestia azzera la produzione di acqua e cibo e la
         colonia non ha piu' alcun modo di risollevarsi. */
      var ratioLavoro = lavori > 0 ? Math.max(0.30, Math.min(1, forzaLavoro / lavori)) : 1;

      /* --- 2. fattore morale e malus attivi --- */
      var fMorale = 0.70 + 0.30 * (st.morale / 100);
      var malusEnergia = 1, malusProd = 1;
      for (i = 0; i < st.eventiAttivi.length; i++) {
        var ev = st.eventiAttivi[i];
        if (ev.tipo === 'blackout') malusEnergia *= 0.5;
        if (ev.tipo === 'epidemia') malusProd *= 0.75;
      }

      /* --- 3. energia: prima i produttori (non dipendono dalla rete) --- */
      var nrgProd = 0, nrgCons = 0;
      var cantiere = !!st.nucleoUp;
      for (i = 0; i < eds.length; i++) {
        b = eds[i]; def = D.byId(b.tipo);
        var base = this.multLivello(b.lvl) * this.multHp(b.hp) * this.multTech(b.tipo) *
                   this.bonusAdiacenza(b).mult * fMorale * malusProd;
        /* Nucleo in ricostruzione: rende meta' e le sue difese sono smontate. */
        b.inCantiere = (def.id === 'nucleo' && cantiere);
        if (b.inCantiere) base *= 0.5;
        b._base = base;
        b._staff = def.jobs > 0 ? ratioLavoro : 1;
        if (def.produce && def.produce.nrg) nrgProd += def.produce.nrg * base * b._staff * malusEnergia;
        if (def.consume && def.consume.nrg) nrgCons += def.consume.nrg * this.multLivello(b.lvl);
      }
      var ratioEnergia = nrgCons > 0 ? Math.min(1, nrgProd / nrgCons) : 1;
      st.nrgProd = nrgProd; st.nrgCons = nrgCons; st.ratioEnergia = ratioEnergia;
      st.lavori = lavori; st.forzaLavoro = forzaLavoro; st.ratioLavoro = ratioLavoro;

      /* --- 4. produzione, consumi, contaminazione, difesa, alloggi --- */
      var prod = { rtm: 0, h2o: 0, bio: 0, leg: 0, dat: 0 };
      var cons = { rtm: 0, h2o: 0, bio: 0, leg: 0, dat: 0 };
      var alloggi = 0, difesa = 0, emissione = 0, assorbimento = 0, moraleEdifici = 0, cure = 0;

      for (i = 0; i < eds.length; i++) {
        b = eds[i]; def = D.byId(b.tipo);
        var eff = b._base * b._staff;
        var consumatore = !(def.produce && def.produce.nrg);
        if (consumatore && (def.consume && def.consume.nrg)) eff *= ratioEnergia;
        b.eff = eff;
        b.attivo = eff > 0.05;

        /* input richiesti disponibili? (es. fonderia senza rottami) */
        var inputOk = 1;
        for (k in (def.consume || {})) {
          if (k === 'nrg') continue;
          var richiesta = def.consume[k] * this.multLivello(b.lvl);
          if (st.res[k] < richiesta * 2) inputOk = Math.min(inputOk, st.res[k] / Math.max(0.001, richiesta * 2));
        }
        eff *= inputOk;
        b.eff = eff;

        for (k in (def.produce || {})) { if (k !== 'nrg') prod[k] += def.produce[k] * eff; }
        for (k in (def.consume || {})) { if (k !== 'nrg') cons[k] += def.consume[k] * this.multLivello(b.lvl) * (eff > 0 ? 1 : 0); }

        alloggi += def.housing * this.multLivello(b.lvl);
        if (!b.inCantiere) {
          difesa += def.difesa * this.multLivello(b.lvl) * (def.consume && def.consume.nrg ? ratioEnergia : 1) * this.multHp(b.hp);
        }
        emissione += (def.contamina || 0) * eff;
        assorbimento += (def.assorbe || 0) * eff;
        moraleEdifici += (def.morale || 0) * (def.id === 'medico' && st.tech.medicina ? 1.5 : 1) * (b.attivo ? 1 : 0.2);
        cure += (def.cura || 0) * (b.attivo ? 1 : 0);
      }
      if (st.tech.difesa) difesa *= 1.6;

      st.alloggi = Math.floor(alloggi);
      st.difesa = Math.round(difesa);
      st.prod = prod; st.cons = cons;
      st.cure = cures(cure, st.tech.medicina);

      /* --- 5. consumo dei coloni --- */
      var bisognoH2o = st.pop * 0.055;
      var bisognoBio = st.pop * 0.048;
      st.bisognoH2o = bisognoH2o; st.bisognoBio = bisognoBio;
      st.nettoH2o = prod.h2o - cons.h2o - bisognoH2o;
      st.nettoBio = prod.bio - cons.bio - bisognoBio;
      st.nettoRtm = prod.rtm - cons.rtm;
      st.nettoLeg = prod.leg - cons.leg;
      st.nettoDat = prod.dat - cons.dat;

      if (dt <= 0) return;   /* solo ricalcolo, nessuna applicazione */

      /* --- 6. applica i flussi allo stock --- */
      st.ciclo += dt;
      var sete = false, fame = false;
      ['rtm', 'h2o', 'bio', 'leg', 'dat'].forEach(function (r) {
        var netto = prod[r] - cons[r];
        if (r === 'h2o') netto -= bisognoH2o;
        if (r === 'bio') netto -= bisognoBio;
        var nuovo = st.res[r] + netto * dt;
        if (nuovo < 0) {
          if (r === 'h2o') sete = true;
          if (r === 'bio') fame = true;
          nuovo = 0;
        }
        st.res[r] = Math.min(Engine.cap(r), nuovo);
      });
      st.sete = sete; st.fame = fame;

      /* --- 7. contaminazione --- */
      var deltaCtm = (emissione * (st.tech.nanofiltri ? 0.65 : 1) - assorbimento) * 0.05;
      st.ctm = Math.max(0, Math.min(100, st.ctm + deltaCtm * dt));
      st.emissione = emissione; st.assorbimento = assorbimento;

      /* --- 8. morale --- */
      var mTarget = 50 + moraleEdifici;
      if (st.nettoBio > 0) mTarget += 8; else mTarget -= 14;
      if (st.nettoH2o > 0) mTarget += 6; else mTarget -= 12;
      if (fame) mTarget -= 25;
      if (sete) mTarget -= 22;
      if (ratioEnergia < 0.95) mTarget -= (1 - ratioEnergia) * 30;
      if (st.pop > st.alloggi) mTarget -= (st.pop - st.alloggi) * 1.5;
      mTarget -= st.ctm * 0.45;
      mTarget = Math.max(0, Math.min(100, mTarget));
      st.morale += (mTarget - st.morale) * Math.min(1, 0.06 * dt);
      st.moraleTarget = mTarget;

      /* --- 9. popolazione --- */
      var spazio = st.alloggi - st.pop;
      var crescita = 0;
      if (spazio > 0 && !fame && !sete && st.morale >= 45) {
        /* la crescita scala con la popolazione: un insediamento grande attira e genera di piu' */
        crescita = 0.03 * dt * (st.morale / 100) * Math.min(3, 1 + spazio / 25) * (1 + st.pop / 50);
      }
      var mortalita = 0;
      if (fame) mortalita += 0.02 * dt;
      if (sete) mortalita += 0.018 * dt;
      if (st.ctm > 55) mortalita += (st.ctm - 55) / 100 * 0.02 * dt;
      mortalita *= st.cure;
      st._fraz = (st._fraz || 0) + crescita - mortalita * st.pop * 0.35;
      while (st._fraz >= 1) { st.pop++; st._fraz -= 1; st.statistiche.natiTotali++; }
      while (st._fraz <= -1 && st.pop > 0) { st.pop--; st._fraz += 1; st.statistiche.mortiTotali++; }
      st.crescita = crescita;

      if (st.pop <= 0 && !st.gameover) {
        st.gameover = true;
        this.logga('IL SETTORE-7 E DESERTO. Nessun colono sopravvive. FINE.', 'bad');
        this.emit('gameover');
      }

      /* --- 10. eventi attivi con durata --- */
      for (i = st.eventiAttivi.length - 1; i >= 0; i--) {
        st.eventiAttivi[i].durata -= dt;
        if (st.eventiAttivi[i].durata <= 0) {
          this.logga('Rientrato: ' + st.eventiAttivi[i].nome + '.', 'sys');
          st.eventiAttivi.splice(i, 1);
        }
      }

      /* --- 11. eventi casuali --- */
      st.prossimoEvento -= dt;
      if (st.prossimoEvento <= 0) { this.scatenaEvento(); st.prossimoEvento = 60 + Math.floor(this.rng() * 70); }

      /* --- 12. lancio finale --- */
      if (st.lancioAvviato && !st.vittoria) {
        st.lancioTimer -= dt;
        if (st.lancioTimer <= 0) {
          st.vittoria = true;
          this.logga('LANCIO RIUSCITO. L Esodo e cominciato. VITTORIA.', 'good');
          this.emit('vittoria');
        }
      }

      /* --- 13. cantiere del Nucleo --- */
      this.avanzaCantiere(dt);

      /* --- 14. spedizioni in viaggio --- */
      if (global.Spedizioni) {
        var rapporti = global.Spedizioni.avanza(this, dt);
        for (i = 0; i < rapporti.length; i++) this.emit('spedizione', rapporti[i]);
        if (rapporti.length) this.emit('mappa');
      }

      /* --- 15. attacco in avvicinamento o in corso --- */
      if (global.Battaglia) {
        var cambio = global.Battaglia.avanza(this, dt);
        if (cambio) this.emit('battaglia', cambio);
      }
    },

    /* =========================================================
       LIVELLI
       ========================================================= */
    prossimoLivello: function () {
      return this.state.livello < D.LEVELS.length ? D.LEVELS[this.state.livello] : null;
    },

    nucleo: function () {
      var e = this.state.edifici;
      for (var i = 0; i < e.length; i++) if (e[i].tipo === 'nucleo') return e[i];
      return null;
    },

    /* Il potenziamento del Nucleo e' l'unico modo di far salire il settore. */
    puoPotenziareNucleo: function () {
      var next = this.prossimoLivello();
      if (!next) return { ok: false, motivo: 'IL NUCLEO E AL GRADO MASSIMO (MK-10)' };
      if (this.state.nucleoUp) return { ok: false, motivo: 'CANTIERE GIA APERTO' };
      if (!this.puoPagare(next.costo)) return { ok: false, motivo: 'SERVONO ' + this.testoCosto(next.costo) };
      return { ok: true, next: next };
    },

    avviaPotenziamentoNucleo: function () {
      var chk = this.puoPotenziareNucleo();
      if (!chk.ok) return chk;
      var next = chk.next;
      this.paga(next.costo);
      this.state.nucleoUp = { a: next.lvl, resta: next.tempo, totale: next.tempo };
      this.logga('CANTIERE APERTO: NUCLEO MK-' + next.lvl + ' (' + next.tempo + ' cicli). Il settore e vulnerabile.', 'warn');
      this.aggiorna(0);
      this.emit('mappa');
      return { ok: true };
    },

    /* Fa scorrere il cantiere del Nucleo di un ciclo. */
    avanzaCantiere: function (dt) {
      var st = this.state;
      if (!st.nucleoUp) return;
      st.nucleoUp.resta -= dt;
      if (st.nucleoUp.resta > 0) return;

      var lvl = st.nucleoUp.a;
      st.nucleoUp = null;
      st.livello = lvl;
      var n = this.nucleo();
      if (n) { n.lvl = lvl; n.hp = 100; }
      st.morale = Math.min(100, st.morale + 8);
      var info = D.LEVELS[lvl - 1];
      this.logga('=== NUCLEO MK-' + lvl + ' ATTIVO -- SETTORE-7 E ORA ' + info.nome + ' ===', 'good');
      this.logga('Perimetro esteso, magazzini ampliati, nuove strutture autorizzate.', 'good');
      this.aggiorna(0);
      this.emit('livello', info);
      this.emit('mappa');
    },

    /* =========================================================
       EVENTI
       ========================================================= */
    scatenaEvento: function () {
      var st = this.state;
      var pool = D.EVENTS.filter(function (e) { return e.minLvl <= st.livello; });
      var tot = pool.reduce(function (a, e) { return a + e.peso; }, 0);
      var r = this.rng() * tot, ev = pool[0];
      for (var i = 0; i < pool.length; i++) { r -= pool[i].peso; if (r <= 0) { ev = pool[i]; break; } }
      var L = st.livello, dettaglio = '';
      var evId = ev.id;   /* il ramo 'raid' riassegna ev: conservo l'id */

      switch (ev.id) {
        case 'tempesta': {
          var colpiti = this.danneggiaCasuali(2 + Math.floor(this.rng() * 3), 8 + Math.floor(this.rng() * 14));
          var persi = Math.floor(st.res.rtm * 0.06);
          st.res.rtm -= persi;
          dettaglio = colpiti + ' strutture corrose, -' + persi + ' RTM.';
          break;
        }
        case 'acida': {
          st.ctm = Math.min(100, st.ctm + 6 + this.rng() * 6);
          this.danneggiaCasuali(1 + Math.floor(this.rng() * 2), 6 + Math.floor(this.rng() * 10));
          dettaglio = 'Contaminazione in aumento.';
          break;
        }
        case 'blackout': {
          st.eventiAttivi.push({ nome: ev.nome, tipo: 'blackout', durata: 25 + Math.floor(this.rng() * 20) });
          dettaglio = 'Produzione energetica dimezzata temporaneamente.';
          break;
        }
        case 'epidemia': {
          st.eventiAttivi.push({ nome: ev.nome, tipo: 'epidemia', durata: 30 + Math.floor(this.rng() * 25) });
          var morti = Math.max(1, Math.floor(st.pop * 0.04 * (st.cure || 1)));
          st.pop = Math.max(0, st.pop - morti);
          st.statistiche.mortiTotali += morti;
          dettaglio = morti + ' coloni perduti, produzione -25% per un po.';
          break;
        }
        case 'raid': {
          /* Non si risolve piu' qui: l'attacco viene avvistato e la
             risposta la sceglie il giocatore (vedi battaglia.js). */
          var av = global.Battaglia ? global.Battaglia.avvista(this) : null;
          if (!av) { st.prossimoEvento = 30; return; }   /* scontro gia' in corso */
          dettaglio = 'Forza stimata ' + av.forza + '. Impatto fra ' + av.resta + ' cicli: preparati.';
          break;
        }
        case 'profughi': {
          var n = 2 + Math.floor(this.rng() * (3 + L));
          var spazio = Math.max(0, st.alloggi - st.pop);
          n = Math.min(n, Math.max(1, spazio));
          st.pop += n;
          dettaglio = '+' + n + ' coloni accolti.';
          break;
        }
        case 'relitto': {
          var r1 = 60 + L * 25, l1 = 8 + L * 5;
          this.aggiungi('rtm', r1); this.aggiungi('leg', l1);
          dettaglio = '+' + r1 + ' RTM, +' + l1 + ' LEG.';
          break;
        }
        case 'archivio': {
          var d1 = 15 + L * 8;
          this.aggiungi('dat', d1);
          dettaglio = '+' + d1 + ' DAT.';
          break;
        }
        case 'carovana': {
          var b1 = 25 + L * 10, r2 = 30 + L * 10;
          this.aggiungi('bio', b1); this.aggiungi('rtm', r2);
          st.morale = Math.min(100, st.morale + 4);
          dettaglio = '+' + b1 + ' BIO, +' + r2 + ' RTM, morale in salita.';
          break;
        }
        case 'falda': {
          var h1 = 40 + L * 15;
          this.aggiungi('h2o', h1);
          dettaglio = '+' + h1 + ' H2O.';
          break;
        }
      }
      var cls = ev.tipo === 'buono' ? 'good' : (ev.tipo === 'raid' ? 'warn' : 'bad');
      this.logga('[' + ev.nome + '] ' + ev.testo + ' ' + dettaglio, cls);
      this.emit('evento', { id: evId, nome: ev.nome, testo: ev.testo, dettaglio: dettaglio, cls: cls });
      this.emit('mappa');
    },

    danneggiaCasuali: function (quanti, entita) {
      var eds = this.state.edifici.filter(function (b) { return b.tipo !== 'nucleo' && b.tipo !== 'strada'; });
      var n = 0;
      for (var i = 0; i < quanti && eds.length; i++) {
        var b = eds[Math.floor(this.rng() * eds.length)];
        b.hp = Math.max(5, b.hp - entita);
        n++;
      }
      return n;
    },

    /* =========================================================
       LANCIO FINALE
       ========================================================= */
    avviaLancio: function () {
      var sp = null, eds = this.state.edifici;
      for (var i = 0; i < eds.length; i++) if (eds[i].tipo === 'spazioporto') sp = eds[i];
      if (!sp) return { ok: false, motivo: 'SPAZIOPORTO NON COSTRUITO' };
      if (this.state.lancioAvviato) return { ok: false, motivo: 'CONTO ALLA ROVESCIA GIA AVVIATO' };
      var costo = { rtm: 500, leg: 300, dat: 100 };
      if (!this.puoPagare(costo)) return { ok: false, motivo: 'CARBURANTE INSUFFICIENTE (' + this.testoCosto(costo) + ')' };
      this.paga(costo);
      this.state.lancioAvviato = true;
      this.state.lancioTimer = 60;
      this.logga('CONTO ALLA ROVESCIA AVVIATO: 60 cicli al lancio. Difendi lo spazioporto.', 'warn');
      return { ok: true };
    },

    /* =========================================================
       LOG E UTILITY
       ========================================================= */
    logga: function (testo, cls) {
      this.state.log.unshift({ c: Math.floor(this.state.ciclo), t: testo, k: cls || 'sys' });
      if (this.state.log.length > 120) this.state.log.pop();
      this.emit('log');
    },

    testoCosto: function (costo) {
      var parti = [];
      for (var k in costo) parti.push(costo[k] + ' ' + k.toUpperCase());
      return parti.join(' / ');
    },

    /* =========================================================
       SALVATAGGIO
       ========================================================= */
    salva: function () {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
        return true;
      } catch (e) { return false; }
    },

    carica: function () {
      try {
        var raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        var st = JSON.parse(raw);
        if (!st || !st.tiles || !st.v || st.v > SAVE_VER) return false;
        /* Migrazione: i salvataggi v1 non conoscono storia e tutorial. */
        if (st.v < SAVE_VER) {
          if (global.Story) global.Story.init(st);
          if (global.Tutorial) { global.Tutorial.init(st); st.tutorial.attivo = false; st.tutorial.completato = true; }
          /* v3: il livello del settore e' il grado del Nucleo. Allineo il
             Nucleo al livello raggiunto e riporto le altre strutture sotto
             il nuovo tetto MK, senza togliere niente al giocatore. */
          if (st.v < 3) {
            if (st.nucleoUp === undefined) st.nucleoUp = null;
            for (var q = 0; q < st.edifici.length; q++) {
              var eb = st.edifici[q], ed = D.byId(eb.tipo);
              if (!ed) continue;
              if (ed.id === 'nucleo') eb.lvl = Math.max(1, Math.min(ed.maxLvl, st.livello));
              else eb.lvl = Math.max(1, Math.min(ed.maxLvl, Math.min(eb.lvl, st.livello)));
            }
          }
          if (st.v < 4) {
            /* v4: spedizioni e scontri tattici. I territori vanno generati
               anche per una partita gia' in corso, altrimenti il Centro
               Spedizioni non avrebbe dove mandare nessuno. */
            if (global.Spedizioni) global.Spedizioni.generaTerritori(st, this.rng);
            if (global.Battaglia) global.Battaglia.init(st);
            if (typeof st.predoniIndeboliti !== 'number') st.predoniIndeboliti = 0;
          }
          st.v = SAVE_VER;
        }
        this.state = st;
        this.rng = rngFrom((st.seed ^ 0x9e3779b9) + Math.floor(st.ciclo));
        this.aggiorna(0);
        return true;
      } catch (e) { return false; }
    },

    cancellaSalvataggio: function () {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    },

    CICLO_MS: CICLO_MS
  };

  /* Fattore di mortalita' ridotto dai centri medici. */
  function cures(cure, techMedicina) {
    var f = 1 / (1 + cure * 0.5);
    if (techMedicina) f *= 0.6;
    return f;
  }

  global.Engine = Engine;
})(window);
