/* ============================================================
   NEXUS-7 :: tutorial.js
   Tutorial interattivo a obiettivi. Ogni passo si completa da solo
   quando lo stato di gioco soddisfa la condizione.
   Puo' essere saltato e ripreso in qualsiasi momento dal MENU.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DATA;

  function conta(E, tipo) { return E.contaTipo(tipo); }

  /* ---------------------------------------------------------
     PASSI
     fatto(E)  -> true quando l'obiettivo e' raggiunto
     azione    -> etichetta breve dell'obiettivo
     --------------------------------------------------------- */
  var PASSI = [
    {
      id: 'benvenuto', titolo: 'IL SETTORE-7',
      testo: 'Sei l\'Amministratore. Al centro della mappa c\'e\' il NUCLEO DI COMANDO: da li\' parte tutto.\n\nTrascina la mappa con un dito per guardarti intorno, poi tocca una cella per selezionarla.',
      azione: 'Sposta il cursore su una cella qualsiasi',
      suggerimento: 'Un tocco seleziona. Un secondo tocco sulla STESSA cella conferma l\'azione.',
      fatto: function (E, ui) { return ui.mosso === true; }
    },
    {
      id: 'sgombero', titolo: 'MACERIE',
      testo: 'Le celle di MACERIE - blocchi di cemento e tondini arrugginiti - non sono edificabili: prima vanno sgomberate. In cambio ottieni rottami, a volte leghe o dati.',
      azione: 'Sgombera una cella di macerie',
      suggerimento: 'Tocca una cella di macerie dentro il perimetro, poi premi SGOMBERA MACERIE nella barra sotto la mappa.',
      fatto: function (E) {
        var t = E.state.tiles;
        for (var i = 0; i < t.length; i++) if (t[i].cl) return true;
        return false;
      }
    },
    {
      id: 'raccoglitore', titolo: 'ROTTAMI',
      testo: 'I ROTTAMI (RTM) sono il materiale base di ogni costruzione. Il RACCOGLITORE li estrae dalle rovine, e rende molto di piu\' se costruito vicino alle macerie.',
      azione: 'Costruisci un RACCOGLITORE DI ROTTAMI',
      suggerimento: 'Premi COSTRUISCI in basso, scegli la struttura, tocca una cella libera e conferma.',
      fatto: function (E) { return conta(E, 'raccoglitore') >= 1; }
    },
    {
      id: 'energia', titolo: 'LA RETE ELETTRICA',
      testo: 'L\'energia NON si accumula: e\' un bilancio istantaneo. Se la richiesta supera la produzione, TUTTE le strutture rendono meno, in proporzione.\n\nGuarda il valore NRG nella barra in alto: tieni sempre un margine.',
      azione: 'Costruisci un ARRAY FOTOVOLTAICO',
      suggerimento: 'I pannelli non richiedono addetti: sono il modo piu\' economico di allargare la rete all\'inizio.',
      fatto: function (E) { return conta(E, 'solare') >= 1; }
    },
    {
      id: 'acqua', titolo: 'ACQUA',
      testo: 'Ogni colono consuma acqua a ogni ciclo. Se finisce, il morale crolla e la gente muore.\n\nIl CONDENSATORE ATMOSFERICO distilla l\'umidita\' della nebbia.',
      azione: 'Costruisci un CONDENSATORE ATMOSFERICO',
      suggerimento: 'Nella barra in alto, il numero verde o rosso accanto a H2O e\' il saldo per ciclo: deve restare positivo.',
      fatto: function (E) { return conta(E, 'condensatore') >= 1; }
    },
    {
      id: 'cibo', titolo: 'CIBO',
      testo: 'Stessa storia per la BIOMASSA (BIO). La MICO-FARM coltiva funghi che digeriscono idrocarburi: poco appetitosi, molto affidabili.',
      azione: 'Costruisci una MICO-FARM',
      suggerimento: 'Con acqua e cibo in saldo positivo e morale sopra 45, la popolazione comincia a crescere da sola.',
      fatto: function (E) { return conta(E, 'micofarm') >= 1; }
    },
    {
      id: 'alloggi', titolo: 'COLONI E ADDETTI',
      testo: 'Il 65% dei coloni lavora. Se i posti di lavoro superano la forza lavoro, la resa cala OVUNQUE.\n\nPiu\' alloggi significa piu\' coloni, quindi piu\' braccia. Controlla POP e LAV nella barra in alto.',
      azione: 'Costruisci un RIFUGIO PRESSURIZZATO',
      suggerimento: 'POP mostra coloni/alloggi. Se i coloni pareggiano gli alloggi, la crescita si ferma.',
      fatto: function (E) { return conta(E, 'rifugio') >= 1; }
    },
    {
      id: 'strada', titolo: 'ADIACENZE',
      testo: 'La posizione conta. Un TRACCIATO adiacente da\' +15% a una struttura. I raccoglitori rendono di piu\' vicino alle macerie, il POZZO PROFONDO va costruito accanto a una pozza tossica, le serre guadagnano vicino all\'acqua.',
      azione: 'Costruisci un TRACCIATO accanto a una struttura',
      suggerimento: 'I tracciati costano 5 RTM e si collegano da soli fra loro.',
      fatto: function (E) { return conta(E, 'strada') >= 1; }
    },
    {
      id: 'scansione', titolo: 'SCANSIONE',
      testo: 'Il pannello SCANSIONE e\' lo zoom su una struttura: sprite a piena risoluzione, descrizione e TUTTI i moltiplicatori che compongono la sua resa (livello, integrita\', addetti, rete, morale, tecnologie, adiacenze).\n\nE\' il posto dove capire perche\' un edificio rende poco.',
      azione: 'Apri la SCANSIONE di un edificio',
      suggerimento: 'Tocca un edificio e premi SCANSIONE, oppure toccalo due volte.',
      alEntrare: function (ui) { ui.visto.scansione = false; },
      fatto: function (E, ui) { return ui.visto.scansione === true; }
    },
    {
      id: 'livello', titolo: 'IL NUCLEO COMANDA TUTTO',
      testo: 'Il settore non cresce da solo: cresce quando potenzi il NUCLEO DI COMANDO.\n\nOgni grado del Nucleo estende il perimetro, alza i magazzini del 60%, sblocca nuove strutture e aumenta QUANTE ne puoi avere di ciascun tipo. Nessuna struttura puo\' superare il grado del Nucleo.\n\nI lavori costano risorse e richiedono tempo: mentre il cantiere e\' aperto il Nucleo rende meta\' e le sue difese sono smontate.',
      azione: 'Porta il NUCLEO a MK-2',
      suggerimento: 'Apri il pannello CITTA, oppure scansiona il Nucleo: servono 250 RTM e 20 cicli di lavori.',
      fatto: function (E) { return E.state.livello >= 2; }
    },
    {
      id: 'potenzia', titolo: 'POTENZIAMENTI',
      testo: 'Ogni struttura sale fino a MK-5: alla quinta rende 2,6 volte tanto, con lo stesso spazio occupato.\n\nAttenzione al tetto: nessuna struttura puo\' superare il grado del NUCLEO. Con il Nucleo a MK-3, tutto il resto si ferma a MK-3.',
      azione: 'Potenzia una struttura a MK-2',
      suggerimento: 'Ora che il Nucleo e\' MK-2 il tetto si e\' alzato. Il pulsante POTENZIA e\' in fondo al pannello SCANSIONE.',
      fatto: function (E) {
        var e = E.state.edifici;
        for (var i = 0; i < e.length; i++) if (e[i].lvl >= 2 && e[i].tipo !== 'nucleo') return true;
        return false;
      }
    },
    {
      id: 'ricerca', titolo: 'RICERCA',
      testo: 'I DATI (DAT) arrivano dai RELE\' e dai LABORATORI, e si spendono in progetti che sbloccano strutture e bonus permanenti.\n\nOgni progetto completato recupera anche un frammento d\'archivio: la storia di questo posto si legge nel pannello STORIA.',
      azione: 'Apri il pannello RICERCA',
      suggerimento: 'Alcuni progetti richiedono un livello citta\' minimo, oltre ai DAT.',
      alEntrare: function (ui) { ui.visto.ricerca = false; },
      fatto: function (E, ui) { return ui.visto.ricerca === true; }
    },
    {
      id: 'difesa', titolo: 'I FIGLI DELLA RUGGINE',
      testo: 'I predoni attaccano periodicamente e diventano piu\' forti a ogni livello. Se la tua DIFESA e\' sotto la loro forza perdi risorse, strutture e coloni.\n\nIl pannello CITTA\' stima la forza del prossimo raid.',
      azione: 'Costruisci una TORRETTA AUTOMATICA',
      suggerimento: 'Le torrette consumano energia: senza rete sono pali inerti.',
      fatto: function (E) { return conta(E, 'torretta') >= 1; }
    },
    {
      id: 'fine', titolo: 'IL RESTO E\' TUO',
      testo: 'Sai il necessario.\n\nDieci livelli di citta\', venticinque strutture, dieci progetti di ricerca. In fondo alla strada c\'e\' lo SPAZIOPORTO ESODO, e una domanda a cui l\'Amministratore non ha ancora risposto.\n\nIl MANUALE resta nel MENU, sempre disponibile. Anche questo tutorial.',
      azione: 'Tutorial completato',
      suggerimento: '',
      fatto: function () { return false; }   /* ultimo passo: si chiude a mano */
    }
  ];

  var Tutorial = {
    PASSI: PASSI,

    init: function (st) {
      if (!st.tutorial) st.tutorial = { attivo: true, passo: 0, completato: false };
      return st.tutorial;
    },

    stato: function (st) { return this.init(st); },
    passoCorrente: function (st) { return PASSI[this.init(st).passo] || null; },
    attivo: function (st) { var t = this.init(st); return t.attivo && !t.completato; },
    ultimo: function (st) { return this.init(st).passo >= PASSI.length - 1; },

    /* Verifica il passo corrente. Ritorna il passo appena completato, o null. */
    controlla: function (st, E, ui) {
      var t = this.init(st);
      if (!t.attivo || t.completato) return null;
      var p = PASSI[t.passo];
      if (!p || !p.fatto(E, ui)) return null;
      t.passo++;
      if (t.passo >= PASSI.length) { t.passo = PASSI.length - 1; t.completato = true; }
      var nuovo = PASSI[t.passo];
      if (nuovo && nuovo.alEntrare) nuovo.alEntrare(ui);
      return p;
    },

    salta: function (st) { var t = this.init(st); t.attivo = false; },

    riprendi: function (st) {
      var t = this.init(st);
      t.attivo = true;
      if (t.completato) { t.completato = false; t.passo = 0; }
    },

    chiudi: function (st) { var t = this.init(st); t.attivo = false; t.completato = true; }
  };

  global.Tutorial = Tutorial;
})(window);
