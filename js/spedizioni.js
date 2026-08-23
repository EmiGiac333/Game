/* ============================================================
   NEXUS-7 :: spedizioni.js
   Ricognizioni oltre il perimetro: si sceglie un territorio e un
   equipaggiamento, si spendono coloni e scorte, e dopo un viaggio
   di andata e ritorno la squadra torna con bottino, informazioni
   o con meno gente di quanta ne sia partita.

   Le informazioni (INTEL) sono la moneta della guerra: sbloccano
   l'imboscata e migliorano le probabilita' negli scontri.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------
     ARCHETIPI DI TERRITORIO
     pericolo 1..5, viaggio in cicli (andata e ritorno)
     --------------------------------------------------------- */
  var ARCHETIPI = [
    { id: 'rovine', nome: 'ROVINE URBANE', pericolo: 2, viaggio: 60, minLvl: 3,
      bottino: { rtm: [180, 320], leg: [0, 15] },
      testo: 'Isolati di cemento sventrati. Sotto le macerie c\'e\' ancora mezza citta\' da smontare.' },
    { id: 'serre', nome: 'SERRE ABBANDONATE', pericolo: 1, viaggio: 45, minLvl: 3,
      bottino: { bio: [140, 260], h2o: [60, 120] },
      testo: 'Vetri opachi e vasche secche. Qualche ceppo e\' sopravvissuto al buio.' },
    { id: 'falda', nome: 'FALDA PROFONDA', pericolo: 1, viaggio: 50, minLvl: 3,
      bottino: { h2o: [200, 380] },
      testo: 'Una sacca d\'acqua sotto trecento metri di roccia. Serve solo qualcuno che scenda.' },
    { id: 'archivio', nome: 'ARCHIVIO SEPOLTO', pericolo: 2, viaggio: 70, minLvl: 4,
      bottino: { dat: [40, 90], rtm: [40, 90] }, frammento: true,
      testo: 'Un piano interrato ancora alimentato. Dentro, memoria di un mondo che sapeva scrivere.' },
    { id: 'deposito', nome: 'DEPOSITO MILITARE', pericolo: 3, viaggio: 85, minLvl: 4,
      bottino: { leg: [70, 160], rtm: [100, 200] }, intel: 1,
      testo: 'Bunker con la porta saldata dall\'interno. Chi l\'ha chiusa non e\' piu\' uscito.' },
    { id: 'carovana', nome: 'CAROVANA DISPERSA', pericolo: 2, viaggio: 55, minLvl: 4,
      bottino: { rtm: [80, 160], bio: [80, 160], leg: [0, 25] }, coloni: [1, 4],
      testo: 'Mezzi fermi in fila sulla statale, portelli aperti. Qualcuno potrebbe essere ancora vivo.' },
    { id: 'relitto', nome: 'RELITTO ORBITALE', pericolo: 4, viaggio: 100, minLvl: 5,
      bottino: { leg: [140, 300], dat: [50, 120] },
      testo: 'Un modulo rientrato male, sparso su due chilometri di cratere. Leghe che qui nessuno sa piu\' fare.' },
    { id: 'accampamento', nome: 'ACCAMPAMENTO PREDONI', pericolo: 4, viaggio: 75, minLvl: 5,
      bottino: { rtm: [150, 300] }, intel: 2, indeboliscePredoni: true,
      testo: 'Fuochi e motori in un anfiteatro di lamiere. Colpirli a casa loro li tiene lontani per un pezzo.' },
    { id: 'avamposto', nome: 'AVAMPOSTO DI SETTORE', pericolo: 4, viaggio: 120, minLvl: 6,
      bottino: { dat: [120, 240], leg: [60, 140] }, intel: 1, frammento: true,
      testo: 'Un altro settore, spento all\'ora esatta in cui si e\' spento il nostro.' },
    { id: 'sciame', nome: 'FRONTIERA DELLO SCIAME', pericolo: 5, viaggio: 140, minLvl: 7,
      bottino: { dat: [200, 400] }, intel: 3, frammento: true,
      testo: 'Il bordo netto dove la cenere smette di essere cenere. Avvicinarsi e\' un modo lento di morire.' }
  ];

  var LUOGHI = ['DI VALDARNO', 'DI PORTO NERO', 'DEL CRINALE SUD', 'DI CASE ROTTE',
                'DEL PASSO ALTO', 'DI FONTE AMARA', 'DELLA PIANA GRIGIA', 'DI TORRE UNDICI',
                'DEL QUADRANTE OVEST', 'DI CAVA PROFONDA', 'DELLE SETTE ANTENNE', 'DI COLLE MORTO'];

  /* ---------------------------------------------------------
     EQUIPAGGIAMENTI
     --------------------------------------------------------- */
  var EQUIPAGGIAMENTI = [
    { id: 'leggero', nome: 'LEGGERO', coloni: 2, costo: { bio: 25, h2o: 25 },
      velocita: 1.35, bonus: -0.10, resa: 0.75,
      desc: 'Due esploratori a piedi. Rapidi ed economici, ma senza margine se qualcosa va storto.' },
    { id: 'standard', nome: 'STANDARD', coloni: 4, costo: { bio: 55, h2o: 55, rtm: 40 },
      velocita: 1.0, bonus: 0, resa: 1.0,
      desc: 'Squadra completa con mezzo e scorte. Il compromesso ragionevole.' },
    { id: 'pesante', nome: 'PESANTE', coloni: 7, costo: { bio: 110, h2o: 110, rtm: 90, leg: 25 },
      velocita: 0.75, bonus: 0.16, resa: 1.4,
      desc: 'Convoglio scortato e blindato. Lento e costoso, ma torna quasi sempre, e carico.' }
  ];

  /* Esiti possibili, dal migliore al peggiore. */
  var ESITI = {
    trionfo:  { nome: 'TRIONFO',  resa: 1.7, perdite: 0.00, cls: 'good' },
    riuscita: { nome: 'RIUSCITA', resa: 1.0, perdite: 0.10, cls: 'good' },
    parziale: { nome: 'PARZIALE', resa: 0.4, perdite: 0.35, cls: 'warn' },
    disastro: { nome: 'DISASTRO', resa: 0.1, perdite: 0.75, cls: 'bad' }
  };

  /* Le informazioni invecchiano: oltre questa soglia non servono a nulla
     e continuare ad accumularle sarebbe solo un numero che cresce. */
  var INTEL_MAX = 12;

  var Spedizioni = {
    INTEL_MAX: INTEL_MAX,
    ARCHETIPI: ARCHETIPI,
    EQUIPAGGIAMENTI: EQUIPAGGIAMENTI,
    ESITI: ESITI,

    init: function (st) {
      if (!st.spedizioni) st.spedizioni = [];
      if (!st.territori) st.territori = [];
      if (typeof st.intel !== 'number') st.intel = 0;
      if (!st.spedStat) st.spedStat = { partite: 0, riuscite: 0, perduti: 0, bottino: 0 };
      return st;
    },

    equipById: function (id) {
      for (var i = 0; i < EQUIPAGGIAMENTI.length; i++) if (EQUIPAGGIAMENTI[i].id === id) return EQUIPAGGIAMENTI[i];
      return EQUIPAGGIAMENTI[1];
    },

    /* Genera la mappa dei territori raggiungibili, una volta per partita. */
    generaTerritori: function (st, rnd) {
      this.init(st);
      if (st.territori.length) return st.territori;
      var luoghi = LUOGHI.slice();
      ARCHETIPI.forEach(function (a, i) {
        var k = Math.floor(rnd() * luoghi.length);
        var luogo = luoghi.splice(k, 1)[0] || '';
        st.territori.push({
          id: a.id + '_' + i,
          arche: a.id,
          nome: a.nome + ' ' + luogo,
          distanza: Math.round(a.viaggio * (0.85 + rnd() * 0.3)),
          visite: 0
        });
      });
      return st.territori;
    },

    archeDi: function (t) {
      for (var i = 0; i < ARCHETIPI.length; i++) if (ARCHETIPI[i].id === t.arche) return ARCHETIPI[i];
      return ARCHETIPI[0];
    },

    /* Quante squadre puo' gestire il Centro Spedizioni al suo grado attuale. */
    squadreMax: function (E) {
      var max = 0;
      E.state.edifici.forEach(function (b) {
        if (b.tipo === 'centro' && b.attivo) max += 1 + Math.floor((b.lvl - 1) / 2);
      });
      return max;
    },

    gradoCentro: function (E) {
      var g = 0;
      E.state.edifici.forEach(function (b) { if (b.tipo === 'centro') g = Math.max(g, b.lvl); });
      return g;
    },

    /* Probabilita' di riuscita, mostrata al giocatore prima di partire. */
    probabilita: function (E, territorio, equip) {
      var a = this.archeDi(territorio);
      var p = 0.66 + equip.bonus - a.pericolo * 0.075 + (this.gradoCentro(E) - 1) * 0.05
              + Math.min(0.10, E.state.intel * 0.02)
              + Math.min(0.06, territorio.visite * 0.02);   /* strada gia' battuta */
      return Math.max(0.12, Math.min(0.95, p));
    },

    /* Verifica se una spedizione puo' partire: ritorna {ok, motivo}. */
    puoPartire: function (E, territorio, equip) {
      var st = E.state;
      if (!this.squadreMax(E)) return { ok: false, motivo: 'SERVE UN CENTRO SPEDIZIONI ATTIVO' };
      if (st.spedizioni.length >= this.squadreMax(E)) {
        return { ok: false, motivo: 'SQUADRE TUTTE IMPEGNATE (' + st.spedizioni.length + '/' + this.squadreMax(E) + ')' };
      }
      var a = this.archeDi(territorio);
      if (a.minLvl > st.livello) return { ok: false, motivo: 'RICHIEDE NUCLEO MK-' + a.minLvl };
      if (st.pop - this.coloniImpegnati(st) < equip.coloni + 4) {
        return { ok: false, motivo: 'SERVONO ' + equip.coloni + ' COLONI E QUALCUNO DEVE RESTARE' };
      }
      if (!E.puoPagare(equip.costo)) return { ok: false, motivo: 'SCORTE INSUFFICIENTI: ' + E.testoCosto(equip.costo) };
      return { ok: true };
    },

    coloniImpegnati: function (st) {
      var n = 0;
      (st.spedizioni || []).forEach(function (s) { n += s.coloni; });
      return n;
    },

    parti: function (E, territorio, equip) {
      var chk = this.puoPartire(E, territorio, equip);
      if (!chk.ok) return chk;
      var st = E.state;
      E.paga(equip.costo);
      st.pop -= equip.coloni;
      var durata = Math.round(territorio.distanza / equip.velocita);
      st.spedizioni.push({
        terr: territorio.id, equip: equip.id, coloni: equip.coloni,
        resta: durata, totale: durata,
        prob: this.probabilita(E, territorio, equip)
      });
      st.spedStat.partite++;
      E.logga('Spedizione partita per ' + territorio.nome + ' (' + equip.nome + ', ' + durata + ' cicli).', 'sys');
      return { ok: true };
    },

    territorioById: function (st, id) {
      for (var i = 0; i < st.territori.length; i++) if (st.territori[i].id === id) return st.territori[i];
      return null;
    },

    /* Fa avanzare le squadre in viaggio. Ritorna i rapporti di rientro. */
    avanza: function (E, dt) {
      var st = E.state, rapporti = [];
      this.init(st);
      for (var i = st.spedizioni.length - 1; i >= 0; i--) {
        var s = st.spedizioni[i];
        s.resta -= dt;
        if (s.resta > 0) continue;
        st.spedizioni.splice(i, 1);
        rapporti.push(this.rientro(E, s));
      }
      return rapporti;
    },

    rientro: function (E, s) {
      var st = E.state;
      var terr = this.territorioById(st, s.terr);
      var a = this.archeDi(terr);
      var equip = this.equipById(s.equip);
      var r = E.rng();

      var esito;
      if (r < s.prob * 0.32) esito = 'trionfo';
      else if (r < s.prob) esito = 'riuscita';
      else if (r < s.prob + (1 - s.prob) * 0.62) esito = 'parziale';
      else esito = 'disastro';
      var E_ = ESITI[esito];

      /* perdite: peggiorano con il pericolo del territorio */
      var perse = Math.round(s.coloni * E_.perdite * (0.7 + a.pericolo * 0.12));
      perse = Math.max(0, Math.min(s.coloni, perse));
      var tornati = s.coloni - perse;
      st.pop += tornati;
      st.statistiche.mortiTotali += perse;
      st.spedStat.perduti += perse;
      if (esito === 'trionfo' || esito === 'riuscita') st.spedStat.riuscite++;

      var moltiplicatore = E_.resa * equip.resa * (1 - Math.min(0.4, terr.visite * 0.08));
      var bottino = {}, totale = 0;
      for (var k in a.bottino) {
        var min = a.bottino[k][0], max = a.bottino[k][1];
        var v = Math.round((min + E.rng() * (max - min)) * moltiplicatore);
        if (v > 0) { bottino[k] = v; E.aggiungi(k, v); totale += v; }
      }
      st.spedStat.bottino += totale;

      var intel = 0;
      if (a.intel && esito !== 'disastro') {
        intel = esito === 'trionfo' ? a.intel + 1 : a.intel;
        intel = Math.min(intel, INTEL_MAX - st.intel);
        st.intel = Math.min(INTEL_MAX, st.intel + intel);
      }
      var nuoviColoni = 0;
      if (a.coloni && (esito === 'trionfo' || esito === 'riuscita')) {
        nuoviColoni = a.coloni[0] + Math.floor(E.rng() * (a.coloni[1] - a.coloni[0] + 1));
        st.pop += nuoviColoni;
        st.statistiche.natiTotali += nuoviColoni;
      }
      if (a.indeboliscePredoni && esito !== 'disastro') {
        st.predoniIndeboliti = (st.predoniIndeboliti || 0) + 220;
      }
      terr.visite++;

      var rapporto = {
        territorio: terr.nome, esito: esito, nomeEsito: E_.nome, cls: E_.cls,
        bottino: bottino, intel: intel, perse: perse, tornati: tornati,
        nuoviColoni: nuoviColoni, frammento: a.frammento && esito !== 'disastro',
        arche: a.id
      };
      E.logga('[' + terr.nome + '] ' + E_.nome + ': ' + this.testoBottino(rapporto), E_.cls);
      return rapporto;
    },

    testoBottino: function (r) {
      var parti = [];
      for (var k in r.bottino) parti.push('+' + r.bottino[k] + ' ' + k.toUpperCase());
      if (r.intel) parti.push('+' + r.intel + ' INTEL');
      if (r.nuoviColoni) parti.push('+' + r.nuoviColoni + ' coloni');
      if (r.perse) parti.push(r.perse + ' perduti');
      return parti.length ? parti.join(', ') : 'niente di recuperabile';
    }
  };

  global.Spedizioni = Spedizioni;
})(window);
