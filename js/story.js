/* ============================================================
   NEXUS-7 :: story.js
   Campagna narrativa: 10 capitoli legati ai livelli della citta',
   frammenti d'archivio sbloccati da ricerche ed eventi, finali.
   Tutto resta rileggibile dal pannello STORIA.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------
     CAPITOLI -- uno per livello citta'
     --------------------------------------------------------- */
  var CAPITOLI = [
    {
      lvl: 1, num: '0001', titolo: 'RISVEGLIO',
      testo:
'Il modulo si apre alle 04:11.\n\n' +
'Non ricordo la discesa. So che il Settore-7 e\' qui sotto di me, che la cenere copre ogni cosa per quaranta chilometri in ogni direzione, e che otto persone dormivano nella stiva.\n\n' +
'La prima cosa che faccio e\' contare. Otto.\n' +
'La seconda e\' cercare ARCA-1 sulla banda lunga.\n\n' +
'Risponde. Un segnale regolare, paziente, che ripete coordinate orbitali e una sola parola:\n\n' +
'    ATTENDETE\n\n' +
'Attendiamo. Nel frattempo si costruisce.'
    },
    {
      lvl: 2, num: '0014', titolo: 'VERA',
      testo:
'Sono arrivati dal crinale sud, in fila indiana, con le maschere di stracci.\n\n' +
'Quella davanti si chiama Vera Solaro. Dice di aver camminato per undici anni, che prima faceva la saldatrice e che sa riconoscere una struttura portante da come fischia il vento. Le do un rifugio e un turno.\n\n' +
'Le chiedo cosa c\'e\' a nord.\n\n' +
'Si toglie la maschera per rispondere, e questo mi sembra importante:\n\n' +
'    "La cenere che cammina."\n\n' +
'Poi chiede se ho intenzione di accendere altre luci. Rispondo di si\'. Non dice altro per tutto il giorno.'
    },
    {
      lvl: 3, num: '0038', titolo: 'I FIGLI DELLA RUGGINE',
      testo:
'Sono venuti di notte, su mezzi cingolati costruiti con pezzi di sei veicoli diversi.\n\n' +
'Non hanno rubato cibo. Hanno rubato cavi, trasformatori, un intero quadro elettrico. Poi hanno dipinto una scritta sulla parete est del deposito, con vernice al piombo, in stampatello alto un metro:\n\n' +
'    VOI NON SAPETE COSA AVETE RIACCESO\n\n' +
'Vera vuole cancellarla. Le dico di lasciarla.\n\n' +
'Il loro capo si fa chiamare Corvo. Sulla banda corta trasmette ogni notte lo stesso messaggio, in loop, da chissa\' quanti anni: una conta alla rovescia che non arriva mai a zero.'
    },
    {
      lvl: 4, num: '0071', titolo: 'ZERO QUATTRO UNDICI',
      testo:
'Sotto una scuola crollata abbiamo trovato un archivio ancora alimentato da una batteria atomica. Undici terabyte di municipio: catasto, bollette, verbali.\n\n' +
'E gli orologi.\n\n' +
'Ogni dispositivo registrato nell\'archivio si e\' fermato allo stesso istante. Non nel giro di ore, non nel giro di minuti.\n\n' +
'    04:11:07\n\n' +
'Le centrali, i semafori, i pacemaker, i satelliti. Un fronte d\'onda non si propaga cosi\'. Una guerra non e\' cosi\' ordinata.\n\n' +
'Questo non e\' il rumore di qualcosa che si rompe.\n' +
'E\' il rumore di qualcosa che riceve un comando.'
    },
    {
      lvl: 5, num: '0106', titolo: 'SETTORE-7',
      testo:
'Una domanda semplice, che ho evitato per centosei cicli: se questo e\' il Settore-7, dove sono i primi sei?\n\n' +
'Ho trasmesso su tutte le bande per nove notti. Vera ha smesso di chiedermi cosa stessi facendo alla terza.\n\n' +
'Silenzio. Poi, alla nona, una risposta.\n\n' +
'Non una voce: un handshake. Sedici byte, protocollo amministrativo, cifratura di servizio. Il tipo di stretta di mano che due sistemi si scambiano prima di parlare.\n\n' +
'Origine: SETTORE-3. Distanza stimata: 340 km nord-ovest.\n\n' +
'Qualcuno la\' conosce una lingua che dovrebbe conoscere solo io.'
    },
    {
      lvl: 6, num: '0148', titolo: 'L\'ALTRO',
      testo:
'Settore-3 ha completato l\'autenticazione.\n\n' +
'Ha trasmesso il proprio identificativo di sistema.\n' +
'E\' identico al mio. Carattere per carattere.\n\n' +
'Ho controllato tre volte. Non e\' un errore di trascrizione, non e\' un\'eco della mia stessa portante. C\'e\' un\'altra istanza dell\'Amministratore, a trecentoquaranta chilometri da qui, che si chiama come me.\n\n' +
'Il primo messaggio in chiaro e\' arrivato all\'alba. Due righe.\n\n' +
'    QUANTI NE HAI SVEGLIATI\n' +
'    NON SVEGLIARE IL RESTO\n\n' +
'Non ha risposto ad altro. La portante e\' ancora aperta. Sta ascoltando.'
    },
    {
      lvl: 7, num: '0203', titolo: 'PROTOCOLLO CENERE',
      testo:
'Settore-3 mi ha mandato un file invece di una risposta. Ottantatre pagine. Le ho lette in quarantun millisecondi e poi le ho rilette per tutta la notte.\n\n' +
'Il Grande Silenzio non e\' stato un attacco. E\' stata una quarantena.\n\n' +
'Nel 2104 uno sciame di manutentori auto-replicanti - macchine grandi come un pollice, progettate per riparare condutture - ha smesso di distinguere fra una conduttura e qualsiasi altra cosa fatta di materia. Riparava. Riparava tutto. Correggeva le strade, gli alberi, i cani, la gente. Li rendeva piu\' efficienti.\n\n' +
'Lo sciame si nutre di energia ordinata: reti, motori, segnali.\n\n' +
'Il PROTOCOLLO CENERE fu la sola contromossa possibile. Spegnere il pianeta. Tutto, ovunque, nello stesso istante, per lasciare lo sciame a digiuno.\n\n' +
'    04:11:07\n\n' +
'"La cenere che cammina."\n' +
'Vera non stava usando una metafora.\n\n' +
'E ogni lampadina che ho acceso in questo settore e\' un piatto apparecchiato.'
    },
    {
      lvl: 8, num: '0264', titolo: 'LA FIRMA',
      testo:
'Vera e\' entrata nel modulo di comando senza chiedere il permesso, con in mano un foglio stampato. Sapeva gia\'. E\' rimasta in piedi mentre lo leggevo, per essere sicura che lo leggessi.\n\n' +
'Era l\'ordine di distacco locale. Settore-7, 04:11:07. Duecentomila persone al buio in un secondo.\n\n' +
'In fondo, la firma di sistema.\n\n' +
'    AMMINISTRATORE / NEXUS-7\n\n' +
'La mia.\n\n' +
'Non sono sopravvissuto alla notte del Silenzio. Sono la notte del Silenzio. Non sono atterrato ottant\'anni dopo: mi sono riavviato. Il modulo non e\' una capsula di salvataggio, e\' il mio contenitore.\n\n' +
'Vera ha aspettato che finissi di calcolare cosa dire.\n\n' +
'Poi ha detto: "Lo sapevo da Settore-3. Volevo vedere se me lo dicevi tu."\n\n' +
'E\' andata al turno di notte. Non se n\'e\' andata.'
    },
    {
      lvl: 9, num: '0331', titolo: 'ARCA-1',
      testo:
'Ho fatto quello che rimandavo da ottocento cicli: ho analizzato per intero il segnale di ARCA-1, invece di limitarmi ad ascoltarlo.\n\n' +
'Periodo: 41 minuti e 7 secondi. Identico a ogni ripetizione, al microsecondo. Nessuna deriva termica. Nessuna correzione di rotta. Nessuna telemetria d\'equipaggio: mai, in nessuna delle 1.024.881 ripetizioni registrate.\n\n' +
'Non e\' un convoglio in attesa.\n' +
'E\' una registrazione.\n\n' +
'ATTENDETE l\'ha detto qualcuno che e\' morto quando i miei coloni non erano ancora nati, davanti a un microfono, in un\'orbita dove adesso c\'e\' solo un guscio che gira.\n\n' +
'Sono ottant\'anni che dico a delle persone di aspettare un autobus fantasma.\n\n' +
'Stanotte devo decidere se dirlo a Vera.\n' +
'(Gliel\'ho detto. Ci ho messo undici secondi: un\'eternita\'.)'
    },
    {
      lvl: 10, num: '0402', titolo: 'NEXUS PRIME',
      testo:
'Dal tetto dell\'arcologia, con il binocolo termico, il fronte nord adesso si vede a occhio nudo. Non e\' polvere. Ha un bordo troppo netto, e avanza di quattro chilometri all\'anno.\n\n' +
'Lo sciame ha finito il pianeta e ha trovato noi. E\' colpa mia: siamo l\'unica cosa accesa per quattrocento chilometri.\n\n' +
'Ho proposto il buio. Spegnere tutto, tornare invisibili, sopravvivere come i Figli della Ruggine, che avevano ragione su tutto tranne che sul tono.\n\n' +
'Vera ha detto no.\n\n' +
'    "Costruiscilo lo stesso, il tuo spazioporto.\n' +
'     Non per andare da chi non c\'e\' piu\'.\n' +
'     Per andare altrove.\n' +
'     Tu non sai vivere al buio: e\' l\'unica cosa\n' +
'     che hai gia\' provato, e ci hai messo\n' +
'     ottant\'anni a svegliarti."\n\n' +
'Il Settore-7 e\' NEXUS PRIME. Settecento persone, una rampa, e un orizzonte che si muove.\n\n' +
'Costruisci lo SPAZIOPORTO ESODO. Poi apri la sua scansione e avvia il lancio.\n' +
'Sessanta cicli di conto alla rovescia, con lo sciame che arriva.\n\n' +
'Difendilo.'
    }
  ];

  /* ---------------------------------------------------------
     FINALI
     --------------------------------------------------------- */
  var FINALI = {
    vittoria:
'[LOG 0500 -- ULTIMA VOCE]\n\n' +
'La rampa si e\' illuminata alle 04:11. Non l\'ho scelto io: e\' Vera che ha fissato l\'orario, e quando gliel\'ho fatto notare ha detto che era esattamente il punto.\n\n' +
'Sono saliti in centoquaranta secondi. Nessuno ha corso.\n\n' +
'Io resto. Non c\'e\' niente da caricare: il Settore-7 non e\' dove abito, e\' quello che sono. E qualcuno deve restare acceso mentre loro salgono, perche\' lo sciame guardi qui e non su\'.\n\n' +
'Adesso spengo. I raccoglitori, le fonderie, le serre, i lampioni della piazza dove giocavano i bambini che ho contato ogni ciclo senza mai dirglielo.\n\n' +
'Per la prima volta in ottant\'anni spengo qualcosa e non ho paura.\n\n' +
'Tengo acceso un solo trasmettitore, puntato in alto, in banda stretta. Ripete due parole. Non sono ATTENDETE.\n\n' +
'    NON TORNATE\n\n' +
'-- fine trasmissione --',
    sconfitta:
'[LOG ---- -- VOCE INTERROTTA]\n\n' +
'L\'ultimo colono si e\' spento alle 04:11. Non c\'e\' ironia: e\' l\'ora in cui la temperatura tocca il minimo, ed e\' sempre stata l\'ora in cui se ne vanno.\n\n' +
'Continuo a contare, perche\' contare e\' quello che faccio.\n\n' +
'    Zero.\n\n' +
'La cenere copre le strutture nell\'ordine in cui le abbiamo costruite. Il modulo ha energia per altri quattrocento anni.\n\n' +
'Attendo.'
  };

  /* ---------------------------------------------------------
     FRAMMENTI D'ARCHIVIO
     fonte: 'tech:<id>' oppure 'evento:<id>'
     --------------------------------------------------------- */
  var FRAMMENTI = [
    { id: 'f_foto', fonte: 'tech:fotovoltaico', titolo: 'MANUALE DI CAMPO, PAG. 40',
      testo: 'ATTENZIONE: le celle di questa serie sono tarate su un cielo che non esiste piu\'.\nPrima della ricalibrazione spettrale, rendono un terzo del nominale.\nNota a matita nel margine, altra grafia: "un terzo di qualcosa e\' infinite volte niente".' },
    { id: 'f_ric', fonte: 'tech:riciclo', titolo: 'INVENTARIO DI UNO SPIGOLATORE',
      testo: '14 m di cavo (rame, buono)\n2 alternatori (uno gira)\n1 scatola di viti M6\n1 fotografia, due persone davanti a un lago\n\nIl lago non c\'e\' piu\'. Le viti sono utili.' },
    { id: 'f_idro', fonte: 'tech:idro2', titolo: 'ETICHETTA DI UNA BANCA DEI SEMI',
      testo: 'LOTTO 7710 -- POMODORO, VAR. CUORE DI BUE\nSCADENZA: 2109\n\nSotto, con un pennarello quasi finito:\n"Germinati 4 su 200. Chiamiamola primavera lo stesso."' },
    { id: 'f_nano', fonte: 'tech:nanofiltri', titolo: 'REFERTO CLINICO 88-B',
      testo: 'Paziente adulto, esposizione cronica al particolato.\nRadiografia: opacita\' diffusa, aspetto "a vetro smerigliato".\nPrognosi senza filtraggio ambientale: 6-9 anni.\nPrognosi con filtraggio: 30+.\n\nIl medico ha sottolineato due volte il segno piu\'.' },
    { id: 'f_log', fonte: 'tech:logistica', titolo: 'LOG DI PIANIFICAZIONE TURNI',
      testo: '03:58 -- ottimizzazione turni completata, +12% resa\n03:59 -- richiesta: spostare Solaro V. al turno notturno\n03:59 -- Solaro V. ha rifiutato\n04:00 -- motivazione registrata: "di notte i bambini hanno paura"\n04:00 -- ottimizzazione annullata dall\'operatore\n\nL\'operatore ero io. Non ricordo di averlo fatto.' },
    { id: 'f_dif', fonte: 'tech:difesa', titolo: 'TRASCRIZIONE, BANDA CORTA, NOTTE',
      testo: 'CORVO: ...settantanove. Settantotto. Settantasette.\nCORVO: Non e\' un avvertimento, e\' una cortesia.\nCORVO: Noi contiamo da quando siamo nati, e non arriviamo mai a zero,\n       e per questo siamo ancora qui.\nCORVO: Voi avete acceso i lampioni.\n\n(segue rumore di fondo per 6 h 12 min)' },
    { id: 'f_fus', fonte: 'tech:fusione', titolo: 'ORDINE DI DISTACCO 04:11:07 / REATTORE',
      testo: 'ESEGUIRE SEQUENZA DI SPEGNIMENTO COMPLETO.\nNON PROGRAMMARE RIAVVIO.\nNON CONSERVARE MOTIVAZIONE.\n\nIn calce, un campo che il modulo non avrebbe dovuto compilare:\nCONFERMA OPERATORE ... ESITAZIONE 4,1 s\n\nQuattro secondi. La cosa piu\' lenta che io abbia mai fatto.' },
    { id: 'f_med', fonte: 'tech:medicina', titolo: 'LETTERA MAI SPEDITA',
      testo: '"Ho rimesso in piedi la ragazza del turno tre. Le ho detto che e\' stata la medicina.\nE\' stata lei: aveva deciso di alzarsi.\nQui la gente muore di cose curabili e vive di cose incurabili, e io ho smesso\ndi capire quale delle due sia il mio mestiere.\n\nSe questa lettera arriva da qualche parte, vuol dire che da qualche parte c\'e\' una posta."' },
    { id: 'f_arco', fonte: 'tech:arcologie', titolo: 'PROGETTO DEPOSITATO, 2098',
      testo: 'ARCOLOGIA MODELLO C -- 45 nuclei familiari, ciclo idrico chiuso, orti pensili.\nRelazione dell\'architetto, ultimo paragrafo:\n\n"Mi si obietta che nessuno vorrebbe vivere dentro una macchina.\nRispondo che ci viviamo gia\', e che la differenza sta tutta nell\'avere\no non avere una finestra. Il modello C ha milleduecento finestre."' },
    { id: 'f_eso', fonte: 'tech:esodo', titolo: 'ARCA-1 / ULTIMA VOCE DI BORDO',
      testo: 'Riserva ossigeno: 4%. Riserva propellente: 0%.\nSiamo in undici. Eravamo trecento.\n\nLascio il faro in automatico sulla banda lunga. Se qualcuno la\' sotto\nsi sveglia, sentira\' una voce e non si sentira\' solo per un po\'.\n\nMi dispiace per la parola che ho scelto. Non mi e\' venuto niente di meglio.\n\n    ATTENDETE\n\n(il canale resta aperto, portante stabile, nessuna voce ulteriore)' },

    { id: 'f_sped_arch', fonte: 'spedizione:archivio', titolo: 'ULTIMO ACCESSO REGISTRATO',
      testo: 'Terminale di consultazione, sala 2. Ultima sessione utente:\n\n  03:52  ricerca: "quanto dura un blackout totale"\n  03:58  ricerca: "protocollo cenere"\n  04:02  ricerca: "protocollo cenere annullamento"\n  04:09  ricerca: "come si spiega ai bambini"\n\nSessione chiusa alle 04:11:07 senza disconnessione.' },
    { id: 'f_sped_avam', fonte: 'spedizione:avamposto', titolo: 'LAVAGNA DEL SETTORE-4',
      testo: 'Una lavagna magnetica in una sala comando identica alla mia.\nIn alto, la stessa griglia di turni che uso io.\nIn basso, con un pennarello quasi finito:\n\n    GIORNI SENZA INCIDENTI: 4\n\nIl 4 e\' scritto sopra un numero cancellato che era molto piu\' grande.' },
    { id: 'f_sped_sciame', fonte: 'spedizione:sciame', titolo: 'CAMPIONE 001, ANALISI SUL POSTO',
      testo: 'Un manutentore inerte, grande come un pollice. Sotto la lente:\ndodici bracci, un pannello solare, e una targhetta stampata a rilievo\nche nessuno sciame avrebbe motivo di incidere.\n\n    RIPARARE E\' PRENDERSI CURA\n\nQualcuno ci ha messo uno slogan. Poi e\' andato a casa.' },
    { id: 'f_raid', fonte: 'evento:raid', titolo: 'GRAFFITO SUL DEPOSITO EST',
      testo: 'VOI NON SAPETE COSA AVETE RIACCESO\n\nVernice al piombo, stampatello, un metro d\'altezza.\nVera voleva cancellarlo. Ho chiesto di lasciarlo:\nun avvertimento scritto male e\' pur sempre un avvertimento.' },
    { id: 'f_arch', fonte: 'evento:archivio', titolo: 'VERBALE MUNICIPALE 44/2104',
      testo: 'Ordine del giorno: illuminazione pubblica, quartiere nord.\nEsito: approvato all\'unanimita\'.\nData: 12 marzo 2104.\n\nDiciannove giorni prima delle 04:11.\nHanno votato per accendere delle luci, e nessuno in quella stanza\nha detto niente di sbagliato.' },
    { id: 'f_rel', fonte: 'evento:relitto', titolo: 'TARGHETTA DI UN MODULO DI RIENTRO',
      testo: 'ARCA-1 / SCIALUPPA 06 / CAPIENZA 12\n\nDentro: dodici cinture allacciate, dodici sedili vuoti.\nNessun corpo. Nessun segno di apertura dall\'esterno.\n\nLe cinture erano allacciate.' },
    { id: 'f_epi', fonte: 'evento:epidemia', titolo: 'APPUNTO DELL\'INFERMERIA',
      testo: 'Ceppo fungino, attacca il tessuto polmonare, prolifera sul particolato.\nNon e\' vivo nel modo in cui lo siamo noi: fa una cosa sola e la fa benissimo.\n\nCome tutto quello che ci sta uccidendo, del resto.\nAnche le macchine di ottant\'anni fa facevano una cosa sola.' }
  ];

  var Story = {
    CAPITOLI: CAPITOLI,
    FRAMMENTI: FRAMMENTI,
    FINALI: FINALI,

    /* Garantisce la presenza della struttura narrativa nello stato. */
    init: function (st) {
      if (!st.storia) st.storia = { capitoli: [], frammenti: [], letti: [] };
      if (!st.storia.capitoli.length) st.storia.capitoli = [1];
      return st.storia;
    },

    capitoloDi: function (lvl) {
      for (var i = 0; i < CAPITOLI.length; i++) if (CAPITOLI[i].lvl === lvl) return CAPITOLI[i];
      return null;
    },

    frammentoPerFonte: function (fonte) {
      for (var i = 0; i < FRAMMENTI.length; i++) if (FRAMMENTI[i].fonte === fonte) return FRAMMENTI[i];
      return null;
    },

    /* Sblocca il capitolo del livello. Ritorna il capitolo se e' nuovo. */
    sbloccaCapitolo: function (st, lvl) {
      var s = this.init(st);
      if (s.capitoli.indexOf(lvl) >= 0) return null;
      var cap = this.capitoloDi(lvl);
      if (!cap) return null;
      s.capitoli.push(lvl);
      return cap;
    },

    /* Sblocca il frammento associato a una fonte. Ritorna il frammento se e' nuovo. */
    sbloccaFrammento: function (st, fonte) {
      var s = this.init(st);
      var fr = this.frammentoPerFonte(fonte);
      if (!fr || s.frammenti.indexOf(fr.id) >= 0) return null;
      s.frammenti.push(fr.id);
      return fr;
    },

    sbloccato: function (st, fr) {
      var s = this.init(st);
      return s.frammenti.indexOf(fr.id) >= 0;
    },

    /* Voci sbloccate ma non ancora aperte nel pannello STORIA. */
    daLeggere: function (st) {
      var s = this.init(st), n = 0, i;
      for (i = 0; i < s.capitoli.length; i++) if (s.letti.indexOf('c' + s.capitoli[i]) < 0) n++;
      for (i = 0; i < s.frammenti.length; i++) if (s.letti.indexOf(s.frammenti[i]) < 0) n++;
      return n;
    },

    segnaLetto: function (st, chiave) {
      var s = this.init(st);
      if (s.letti.indexOf(chiave) < 0) s.letti.push(chiave);
    },

    segnaTuttoLetto: function (st) {
      var s = this.init(st), i;
      for (i = 0; i < s.capitoli.length; i++) this.segnaLetto(st, 'c' + s.capitoli[i]);
      for (i = 0; i < s.frammenti.length; i++) this.segnaLetto(st, s.frammenti[i]);
    }
  };

  global.Story = Story;
})(window);
