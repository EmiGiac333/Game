/* ============================================================
   NEXUS-7 :: battaglia.js
   Gli scontri non si risolvono piu' da soli confrontando due numeri.
   L'attacco viene avvistato in anticipo, lascia il tempo di prepararsi
   e poi chiede una decisione: ogni tattica pesa in modo diverso le
   difese, i coloni, le informazioni e le scorte, e le probabilita'
   sono mostrate prima di scegliere.

   Se il giocatore non decide entro il tempo di grazia, il settore si
   difende come puo': difesa statica.
   ============================================================ */
(function (global) {
  'use strict';

  var AVVISTAMENTO = 30;    /* cicli di preavviso, per prepararsi */
  var GRAZIA = 20;          /* cicli per decidere, poi si difende da soli */

  var NEMICI = {
    predoni: {
      nome: 'FIGLI DELLA RUGGINE', tratta: true,
      testo: 'Motori sul crinale e fari schermati. Vogliono cavi, trasformatori e tutto cio\' che porta corrente.'
    },
    sciame: {
      nome: 'SCIAME', tratta: false,
      testo: 'Il fronte nord si muove piu' + ' in fretta del solito. Non chiede niente e non si ferma: ripara.'
    }
  };

  /* ---------------------------------------------------------
     TATTICHE
     Ognuna dichiara cosa richiede, quanto costa e come pesa le
     risorse del settore: e' qui che sta la scelta.
     --------------------------------------------------------- */
  var TATTICHE = [
    {
      id: 'statica', nome: 'DIFESA STATICA', chiave: 'difese',
      desc: 'Tutti dentro il perimetro, torrette in linea. Nessun rischio aggiuntivo, nessun guadagno.',
      disponibile: function () { return true; },
      costo: function () { return {}; },
      forzaNostra: function (E) { return E.state.difesa; }
    },
    {
      id: 'sortita', nome: 'SORTITA', chiave: 'coloni',
      desc: 'Si esce a colpirli in campo aperto. Servono braccia e fegato: se regge si recupera molto, se cede si pagano vite.',
      disponibile: function (E) { return E.state.pop >= 25; },
      motivo: 'SERVONO ALMENO 25 COLONI',
      costo: function () { return {}; },
      forzaNostra: function (E) { return E.state.difesa * 0.55 + E.state.pop * 0.75 * (E.state.morale / 100); }
    },
    {
      id: 'imboscata', nome: 'IMBOSCATA', chiave: 'informazioni',
      desc: 'Le ricognizioni sanno da dove arrivano. Si sceglie il terreno e si aspetta: la tattica migliore, se hai fatto i compiti.',
      disponibile: function (E) { return E.state.intel >= 1; },
      motivo: 'SERVE ALMENO 1 INTEL DALLE SPEDIZIONI',
      costo: function () { return {}; },
      consumaIntel: 1,
      forzaNostra: function (E) { return E.state.difesa * 1.45 + Math.min(6, E.state.intel) * 14; }
    },
    {
      id: 'trattativa', nome: 'TRATTATIVA', chiave: 'scorte',
      desc: 'Si paga il pedaggio e se ne vanno. Nessun morto, nessun danno, ma la voce gira e il morale ne risente.',
      disponibile: function (E) {
        var b = E.state.battaglia;
        return !!b && NEMICI[b.nemico].tratta && E.puoPagare(this.costo(E));
      },
      motivo: 'LO SCIAME NON TRATTA, O NON HAI DI CHE PAGARE',
      costo: function (E) {
        var f = E.state.battaglia ? E.state.battaglia.forza : 0;
        return { rtm: Math.round(f * 9), bio: Math.round(f * 2.5) };
      },
      certa: true
    },
    {
      id: 'ritirata', nome: 'RITIRATA ORDINATA', chiave: 'niente',
      desc: 'Si sgombera la fascia esterna e si lascia che saccheggino. Le persone si salvano tutte, i magazzini no.',
      disponibile: function () { return true; },
      costo: function () { return {}; },
      certa: true
    }
  ];

  var Battaglia = {
    TATTICHE: TATTICHE,
    NEMICI: NEMICI,
    AVVISTAMENTO: AVVISTAMENTO,
    GRAZIA: GRAZIA,

    init: function (st) {
      if (st.battaglia === undefined) st.battaglia = null;
      if (!st.battStat) st.battStat = { vinte: 0, perse: 0, trattate: 0, ritirate: 0 };
      return st;
    },

    tatticaById: function (id) {
      for (var i = 0; i < TATTICHE.length; i++) if (TATTICHE[i].id === id) return TATTICHE[i];
      return TATTICHE[0];
    },

    /* Forza dell'attacco, mitigata se le spedizioni hanno colpito i predoni. */
    forzaAttacco: function (E) {
      var st = E.state;
      var base = 12 + st.livello * 16 + Math.floor(E.rng() * 14);
      if (st.predoniIndeboliti > 0) base = Math.round(base * 0.6);
      return base;
    },

    /* Un attacco compare all'orizzonte: nessun danno ancora. */
    avvista: function (E) {
      var st = E.state;
      this.init(st);
      if (st.battaglia) return null;                    /* uno per volta */
      var nemico = (st.livello >= 8 && E.rng() < 0.4) ? 'sciame' : 'predoni';
      var forza = this.forzaAttacco(E);
      if (nemico === 'sciame') forza = Math.round(forza * 1.35);
      st.battaglia = { fase: 'avvistata', nemico: nemico, forza: forza, resta: AVVISTAMENTO, totale: AVVISTAMENTO };
      E.logga('AVVISTAMENTO: ' + NEMICI[nemico].nome + ' in avvicinamento, forza stimata ' + forza +
              '. Impatto fra ' + AVVISTAMENTO + ' cicli.', 'warn');
      return st.battaglia;
    },

    /* Probabilita' di successo di una tattica, 0..1. */
    probabilita: function (E, tattica) {
      var b = E.state.battaglia;
      if (!b) return 0;
      if (tattica.certa) return 1;
      var nostra = tattica.forzaNostra(E);
      return Math.max(0.05, Math.min(0.97, nostra / (nostra + b.forza * 1.05)));
    },

    /* Fa scorrere preavviso e tempo di grazia. Ritorna un evento se cambia fase. */
    avanza: function (E, dt) {
      var st = E.state;
      this.init(st);
      if (st.predoniIndeboliti > 0) st.predoniIndeboliti = Math.max(0, st.predoniIndeboliti - dt);
      var b = st.battaglia;
      if (!b) return null;
      b.resta -= dt;
      if (b.resta > 0) return null;

      if (b.fase === 'avvistata') {
        b.fase = 'scelta';
        b.resta = GRAZIA; b.totale = GRAZIA;
        E.logga('IMPATTO. Scegli come rispondere: hai ' + GRAZIA + ' cicli.', 'bad');
        return { tipo: 'scelta' };
      }
      /* tempo scaduto: il settore si difende come puo' */
      var r = this.risolvi(E, 'statica', true);
      return { tipo: 'auto', rapporto: r };
    },

    /* Applica la tattica scelta e ritorna il rapporto di scontro. */
    risolvi: function (E, idTattica, automatica) {
      var st = E.state;
      var b = st.battaglia;
      if (!b) return null;
      var t = this.tatticaById(idTattica);
      var nemico = NEMICI[b.nemico];
      var rapporto = { tattica: t.nome, nemico: nemico.nome, forza: b.forza, automatica: !!automatica, voci: [] };

      function voce(testo) { rapporto.voci.push(testo); }

      if (t.id === 'trattativa') {
        var costo = t.costo(E);
        E.paga(costo);
        st.morale = Math.max(0, st.morale - 9);
        st.battStat.trattate++;
        rapporto.esito = 'trattato';
        rapporto.cls = 'warn';
        voce('Pedaggio pagato: ' + E.testoCosto(costo));
        voce('Nessuna vittima, nessun danno alle strutture');
        voce('Morale -9: la voce che ci si compra gira in fretta');

      } else if (t.id === 'ritirata') {
        var persi = Math.floor(st.res.rtm * 0.3) + 20;
        var persiBio = Math.floor(st.res.bio * 0.2);
        st.res.rtm = Math.max(0, st.res.rtm - persi);
        st.res.bio = Math.max(0, st.res.bio - persiBio);
        st.morale = Math.max(0, st.morale - 5);
        st.battStat.ritirate++;
        rapporto.esito = 'ritirato';
        rapporto.cls = 'warn';
        voce('Fascia esterna sgomberata prima dell impatto');
        voce('Saccheggio: -' + persi + ' RTM, -' + persiBio + ' BIO');
        voce('Nessuna vittima, nessuna struttura perduta');

      } else {
        var prob = this.probabilita(E, t);
        var vinta = E.rng() < prob;
        if (t.consumaIntel) st.intel = Math.max(0, st.intel - t.consumaIntel);
        rapporto.probabilita = prob;

        if (vinta) {
          st.battStat.vinte++;
          st.statistiche.raidRespinti++;
          rapporto.esito = 'respinto';
          rapporto.cls = 'good';
          var bottino = Math.round(b.forza * (t.id === 'sortita' ? 5.5 : t.id === 'imboscata' ? 7 : 3));
          E.aggiungi('rtm', bottino);
          voce('Attacco respinto (probabilita ' + Math.round(prob * 100) + '%)');
          voce('Recuperato dal campo: +' + bottino + ' RTM');
          if (t.id === 'sortita') {
            st.morale = Math.min(100, st.morale + 7);
            voce('Morale +7: si e uscito e si e vinto');
          }
          if (t.id === 'imboscata') {
            st.intel = Math.min(global.Spedizioni ? global.Spedizioni.INTEL_MAX : 12, st.intel + 1);
            st.predoniIndeboliti = (st.predoniIndeboliti || 0) + 180;
            voce('+1 INTEL dai prigionieri, e per un pezzo non torneranno');
          }
        } else {
          st.battStat.perse++;
          rapporto.esito = 'sfondato';
          rapporto.cls = 'bad';
          var gravita = t.id === 'sortita' ? 1.5 : 1;
          var rubati = Math.floor(st.res.rtm * 0.22 * gravita) + 15;
          st.res.rtm = Math.max(0, st.res.rtm - rubati);
          var colpite = E.danneggiaCasuali(2 + Math.floor(E.rng() * 3), 18 + Math.floor(E.rng() * 20));
          var vittime = Math.max(1, Math.floor(st.pop * 0.035 * gravita));
          st.pop = Math.max(0, st.pop - vittime);
          st.statistiche.mortiTotali += vittime;
          st.morale = Math.max(0, st.morale - 6);
          voce('Perimetro sfondato (probabilita di tenuta ' + Math.round(prob * 100) + '%)');
          voce('-' + rubati + ' RTM saccheggiati');
          voce(colpite + ' strutture danneggiate');
          voce(vittime + ' vittime fra i coloni');
        }
      }

      st.battaglia = null;
      E.logga('[' + rapporto.nemico + '] ' + t.nome + ' -> ' + rapporto.esito.toUpperCase() +
              (automatica ? ' (risposta automatica)' : ''), rapporto.cls);
      return rapporto;
    }
  };

  global.Battaglia = Battaglia;
})(window);
