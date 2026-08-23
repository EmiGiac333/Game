/* ============================================================
   NEXUS-7 :: CITY BUILDER ASCII POST-APOCALITTICO
   data.js -- definizioni statiche: risorse, terreni, edifici,
   tecnologie, livelli citta', eventi.
   Tutta la grafica usa SOLO caratteri ASCII stampabili (32-126).
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------
     RISORSE
     --------------------------------------------------------- */
  var RESOURCES = [
    { id: 'rtm', sigla: 'RTM', nome: 'ROTTAMI',  glyph: '#', color: 'scrap', desc: 'Metallo recuperato dalle rovine. Materiale base per ogni costruzione.' },
    { id: 'h2o', sigla: 'H2O', nome: 'ACQUA',    glyph: '~', color: 'water', desc: 'Acqua distillata dalle nebbie tossiche. Consumata dai coloni.' },
    { id: 'bio', sigla: 'BIO', nome: 'BIOMASSA', glyph: 'v', color: 'food',  desc: 'Nutrimento sintetico e colture ipogee. Consumata dai coloni.' },
    { id: 'leg', sigla: 'LEG', nome: 'LEGHE',    glyph: '=', color: 'alloy', desc: 'Leghe composite raffinate. Necessarie per le strutture avanzate.' },
    { id: 'dat', sigla: 'DAT', nome: 'DATI',     glyph: '?', color: 'data',  desc: 'Frammenti di archivi pre-Silenzio. Alimentano la ricerca.' }
  ];

  /* Capienza magazzino iniziale (il Nucleo la fornisce). */
  var BASE_CAP = { rtm: 600, h2o: 300, bio: 300, leg: 250, dat: 200 };

  /* ---------------------------------------------------------
     TERRENI
     Ogni tipo ha tre varianti grafiche in sprites/te_<tipo>_<n>.png
     --------------------------------------------------------- */
  var TERRAIN = {
    ash:    { nome: 'CENERE', color: 'ash',    build: true,  clear: false },
    dust:   { nome: 'POLVERE ROSSA', color: 'dust',   build: true,  clear: false },
    rubble: { nome: 'MACERIE', color: 'scrap',  build: false, clear: true  },
    crater: { nome: 'CRATERE', color: 'dim',    build: true,  clear: false },
    pool:   { nome: 'POZZA TOSSICA', color: 'toxic',  build: false, clear: false },
    rock:   { nome: 'SPERONE', color: 'rock',   build: false, clear: false },
    hot:    { nome: 'ZONA CALDA', color: 'danger', build: true,  clear: false }
  };

  /* ---------------------------------------------------------
     EDIFICI
     produce/consuma sono valori PER CICLO al livello 1.
     --------------------------------------------------------- */
  var BUILDINGS = [
    {
      id: 'nucleo', nome: 'NUCLEO DI COMANDO', cat: 'COMANDO', glyph: '@',
      w: 2, h: 2, color: 'core', maxLvl: 10, unique: true,
      unlock: 0, cost: { rtm: 0 },
      jobs: 0, housing: 10, produce: { rtm: 0.6, nrg: 18 }, consume: {},
      storage: { rtm: 0, h2o: 0, bio: 0, leg: 0, dat: 0 },
      contamina: 0, morale: 2, difesa: 6,
      desc: 'Modulo di atterraggio della Missione Arca. Il reattore ausiliario alimenta i primi moduli e i droni recuperano rottami in autonomia. Se cade, cade il settore.'
    },
    {
      id: 'strada', nome: 'TRACCIATO', cat: 'LOGISTICA', glyph: '+',
      w: 1, h: 1, color: 'road', maxLvl: 1, road: true,
      limiti: [20, 40, 60, 80, 100, 120, 140, 160, 180, 220],
      unlock: 1, cost: { rtm: 5 },
      jobs: 0, housing: 0, produce: {}, consume: {},
      contamina: 0, morale: 0, difesa: 0,
      desc: 'Lastre di cemento riciclato. Ogni struttura adiacente a un tracciato lavora al +15% grazie alla logistica dei droni da trasporto.'
    },
    {
      id: 'rifugio', nome: 'RIFUGIO PRESSURIZZATO', cat: 'ABITATIVO', glyph: 'n',
      w: 1, h: 1, color: 'house', maxLvl: 5,
      limiti: [5, 8, 12, 17, 27, 30, 34, 38, 42, 46],
      unlock: 1, cost: { rtm: 30 },
      jobs: 0, housing: 6, produce: {}, consume: { nrg: 1 },
      contamina: 0, morale: 0, difesa: 0,
      desc: 'Container corazzato con filtro d aria a carboni attivi. Sei cuccette, un riciclatore d urina, zero privacy. Per molti e piu di quanto avessero prima.'
    },
    {
      id: 'solare', nome: 'ARRAY FOTOVOLTAICO', cat: 'ENERGIA', glyph: 's',
      w: 1, h: 1, color: 'energy', maxLvl: 5,
      limiti: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
      unlock: 1, cost: { rtm: 45 },
      jobs: 0, housing: 0, produce: { nrg: 10 }, consume: {},
      contamina: 0, morale: 0, difesa: 0,
      desc: 'Pannelli recuperati e ricalibrati. Il cielo e coperto di ceneri: rendono un terzo del nominale, ma non chiedono carburante.'
    },
    {
      id: 'raccoglitore', nome: 'RACCOGLITORE DI ROTTAMI', cat: 'INDUSTRIA', glyph: 'r',
      w: 1, h: 1, color: 'scrap', maxLvl: 5,
      limiti: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      unlock: 1, cost: { rtm: 25 },
      jobs: 1, housing: 0, produce: { rtm: 1.2 }, consume: { nrg: 3 },
      contamina: 0.4, morale: 0, difesa: 0,
      bonusVicino: { rubble: 0.9 },
      desc: 'Braccio magnetico su cingoli. Setaccia le rovine cercando acciaio, rame e ossa. Rende molto di piu se costruito accanto a un campo di macerie.'
    },
    {
      id: 'condensatore', nome: 'CONDENSATORE ATMOSFERICO', cat: 'ACQUA', glyph: 'c',
      w: 1, h: 1, color: 'water', maxLvl: 5,
      limiti: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      unlock: 1, cost: { rtm: 35 },
      jobs: 1, housing: 0, produce: { h2o: 1.0 }, consume: { nrg: 3 },
      contamina: 0, morale: 0, difesa: 0,
      desc: 'Strizza la nebbia. Il condotto criogenico raccoglie umidita notturna e la filtra tre volte prima di dichiararla potabile.'
    },
    {
      id: 'micofarm', nome: 'MICO-FARM', cat: 'CIBO', glyph: 'm',
      w: 1, h: 1, color: 'food', maxLvl: 5,
      limiti: [2, 3, 4, 5, 6, 7, 8, 8, 8, 8],
      unlock: 1, cost: { rtm: 30 },
      jobs: 1, housing: 0, produce: { bio: 0.8 }, consume: { nrg: 2, h2o: 0.2 },
      contamina: 0, morale: 0, difesa: 0,
      desc: 'Funghi ingegnerizzati che digeriscono idrocarburi. Sapore di terra bagnata e metallo. Nessuno chiede la ricetta.'
    },
    {
      id: 'deposito', nome: 'DEPOSITO CORAZZATO', cat: 'LOGISTICA', glyph: 'd',
      w: 1, h: 1, color: 'struct', maxLvl: 5,
      limiti: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      unlock: 1, cost: { rtm: 70 },
      jobs: 0, housing: 0, produce: {}, consume: { nrg: 1 },
      storage: { rtm: 400, h2o: 200, bio: 200, leg: 150, dat: 100 },
      contamina: 0, morale: 0, difesa: 1,
      desc: 'Silos sigillato con serrature meccaniche. Aumenta la capienza di stoccaggio del settore: senza spazio, ogni eccedenza va perduta.'
    },
    {
      id: 'eolica', nome: 'TURBINA EOLICA', cat: 'ENERGIA', glyph: 'w',
      w: 1, h: 1, color: 'energy', maxLvl: 5,
      limiti: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27],
      unlock: 2, cost: { rtm: 70 },
      jobs: 0, housing: 0, produce: { nrg: 16 }, consume: {},
      contamina: 0, morale: 0, difesa: 0,
      desc: 'I venti di cenere non si fermano mai. La pala e in fibra riciclata e ulula di notte: i coloni la chiamano la Vedova.'
    },
    {
      id: 'pozzo', nome: 'POZZO PROFONDO', cat: 'ACQUA', glyph: 'p',
      w: 2, h: 1, color: 'water', maxLvl: 5,
      limiti: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      unlock: 2, cost: { rtm: 110, leg: 5 },
      jobs: 2, housing: 0, produce: { h2o: 3.6 }, consume: { nrg: 7 },
      contamina: 0.2, morale: 0, difesa: 0,
      richiedeVicino: 'pool',
      desc: 'Trivella fino alla falda pre-Silenzio e la depura. Deve essere costruito accanto a una pozza tossica: la contaminazione superficiale indica acqua sotto.'
    },
    {
      id: 'idroponica', nome: 'SERRA IDROPONICA', cat: 'CIBO', glyph: 'h',
      w: 2, h: 1, color: 'food', maxLvl: 5,
      limiti: [0, 1, 2, 3, 4, 6, 8, 10, 12, 14],
      unlock: 2, cost: { rtm: 120, leg: 10 },
      jobs: 3, housing: 0, produce: { bio: 3.2 }, consume: { nrg: 9, h2o: 1.0 },
      contamina: 0, morale: 1, difesa: 0,
      sinergia: { condensatore: 0.15, pozzo: 0.2 },
      desc: 'Vasche a ciclo chiuso sotto lampade al sodio. Verdure vere, per la prima volta da ottant anni. Rende di piu vicino a una fonte d acqua.'
    },
    {
      id: 'antenna', nome: 'RELE DATI', cat: 'SCIENZA', glyph: 'y',
      w: 1, h: 1, color: 'data', maxLvl: 5,
      limiti: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      unlock: 2, cost: { rtm: 90, leg: 8 },
      jobs: 1, housing: 0, produce: { dat: 0.16 }, consume: { nrg: 5 },
      contamina: 0, morale: 0, difesa: 0,
      desc: 'Intercetta i satelliti morti in orbita bassa e ne scarica i frammenti di memoria. Ogni tanto trasmette voci che nessuno ha registrato.'
    },
    {
      id: 'torretta', nome: 'TORRETTA AUTOMATICA', cat: 'DIFESA', glyph: 't',
      w: 1, h: 1, color: 'danger', maxLvl: 5,
      limiti: [0, 2, 3, 4, 6, 8, 10, 12, 14, 16],
      unlock: 2, cost: { rtm: 80, leg: 15 },
      jobs: 1, housing: 0, produce: {}, consume: { nrg: 4 },
      contamina: 0, morale: 0, difesa: 12,
      desc: 'Cannone a rotaia su torretta girevole, mirino IR. Difende il settore dalle incursioni dei predoni. Senza energia e solo un palo.'
    },
    {
      id: 'muro', nome: 'BARRIERA BLINDATA', cat: 'DIFESA', glyph: '=',
      w: 1, h: 1, color: 'struct', maxLvl: 3,
      limiti: [0, 10, 20, 30, 45, 60, 75, 90, 105, 125],
      unlock: 2, cost: { rtm: 20 },
      jobs: 0, housing: 0, produce: {}, consume: {},
      contamina: 0, morale: 0, difesa: 3,
      desc: 'Lamiere saldate e cemento armato. Non ferma un blindato, ma rallenta abbastanza da far parlare le torrette.'
    },
    {
      id: 'centro', nome: 'CENTRO SPEDIZIONI', cat: 'LOGISTICA', glyph: 'E',
      w: 2, h: 1, color: 'gold', maxLvl: 5,
      limiti: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4],
      unlock: 3, cost: { rtm: 200, leg: 30 },
      jobs: 3, housing: 0, produce: {}, consume: { nrg: 8, bio: 0.4 },
      contamina: 0, morale: 2, difesa: 2,
      desc: 'Rimessa, officina e sala mappe. Da qui partono le squadre che vanno a vedere cosa c e oltre il perimetro: ogni grado permette di tenerne in viaggio una in piu ogni due. Le informazioni che riportano valgono quanto il bottino.'
    },
    {
      id: 'officina', nome: 'OFFICINA DRONI', cat: 'INDUSTRIA', glyph: 'o',
      w: 2, h: 1, color: 'scrap', maxLvl: 5,
      limiti: [0, 0, 1, 2, 3, 4, 5, 6, 7, 8],
      unlock: 3, cost: { rtm: 140, leg: 20 },
      jobs: 3, housing: 0, produce: { rtm: 3.6 }, consume: { nrg: 9 },
      contamina: 0.8, morale: 0, difesa: 0,
      desc: 'Sciami di droni raccoglitori partono all alba e tornano carichi al tramonto. Alcuni non tornano: la Zona Morta comincia due chilometri a nord.'
    },
    {
      id: 'fonderia', nome: 'FONDERIA A ARCO', cat: 'INDUSTRIA', glyph: 'f',
      w: 2, h: 1, color: 'alloy', maxLvl: 5,
      limiti: [0, 0, 1, 2, 3, 4, 5, 6, 7, 8],
      unlock: 3, cost: { rtm: 160 },
      jobs: 4, housing: 0, produce: { leg: 0.85 }, consume: { nrg: 12, rtm: 2.2 },
      contamina: 2.2, morale: 0, difesa: 0,
      desc: 'Trasforma i rottami in leghe composite a 1600 gradi. Il fumo che esce dai camini e la ragione per cui esistono i filtri.'
    },
    {
      id: 'laboratorio', nome: 'LABORATORIO XENO', cat: 'SCIENZA', glyph: 'l',
      w: 2, h: 1, color: 'data', maxLvl: 5,
      limiti: [0, 0, 1, 2, 3, 4, 5, 6, 7, 8],
      unlock: 3, cost: { rtm: 190, leg: 25 },
      jobs: 4, housing: 0, produce: { dat: 0.55 }, consume: { nrg: 13, h2o: 0.3 },
      contamina: 0.4, morale: 0, difesa: 0,
      sinergia: { antenna: 0.15 },
      desc: 'Ricostruisce la scienza perduta partendo da manuali bruciati. Ogni progetto completato e un pezzo di mondo che torna indietro.'
    },
    {
      id: 'filtro', nome: 'TORRE DI FILTRAGGIO', cat: 'AMBIENTE', glyph: 'F',
      w: 1, h: 1, color: 'toxic', maxLvl: 5,
      limiti: [0, 1, 2, 3, 5, 7, 9, 11, 13, 15],
      unlock: 2, cost: { rtm: 110 },
      jobs: 1, housing: 0, produce: {}, consume: { nrg: 6 },
      assorbe: 4.0, contamina: 0, morale: 1, difesa: 0,
      desc: 'Colonne di zeoliti che catturano particolato e isotopi. Riduce la contaminazione del settore, che avvelena morale e coloni.'
    },
    {
      id: 'mercato', nome: 'MERCATO NERO', cat: 'LOGISTICA', glyph: '$',
      w: 2, h: 1, color: 'gold', maxLvl: 5,
      limiti: [0, 0, 0, 1, 2, 2, 3, 3, 4, 4],
      unlock: 4, cost: { rtm: 150, leg: 15 },
      jobs: 2, housing: 0, produce: { rtm: 2.6, bio: 0.4 }, consume: { nrg: 6 },
      contamina: 0, morale: 3, difesa: 0,
      desc: 'Carovane, contrabbandieri e gente senza nome. Nessuno chiede da dove viene la merce. Porta beni e un po di allegria illegale.'
    },
    {
      id: 'medico', nome: 'CENTRO MEDICO', cat: 'ABITATIVO', glyph: 'C',
      w: 2, h: 1, color: 'house', maxLvl: 5,
      limiti: [0, 0, 0, 1, 2, 3, 4, 5, 6, 7],
      unlock: 4, cost: { rtm: 170, leg: 20 },
      jobs: 3, housing: 0, produce: {}, consume: { nrg: 10, h2o: 0.6 },
      cura: 1, contamina: 0, morale: 8, difesa: 0,
      desc: 'Tre lettini, un autoclave e un chirurgo che dorme in piedi. Dimezza le morti da carestia e radiazioni e alza il morale del settore.'
    },
    {
      id: 'monumento', nome: 'MONOLITE DELLA MEMORIA', cat: 'AMBIENTE', glyph: 'A',
      w: 1, h: 1, color: 'gold', maxLvl: 3,
      limiti: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3],
      unlock: 5, cost: { rtm: 220, leg: 45 },
      jobs: 0, housing: 0, produce: {}, consume: {},
      contamina: 0, morale: 12, difesa: 0,
      desc: 'Acciaio nero inciso con i nomi di chi non ce l ha fatta fino al Settore-7. I coloni ci lasciano davanti razioni che non mangeranno.'
    },
    {
      id: 'reattore', nome: 'REATTORE A FUSIONE', cat: 'ENERGIA', glyph: 'R',
      w: 2, h: 2, color: 'energy', maxLvl: 5,
      limiti: [0, 0, 0, 0, 1, 2, 3, 5, 7, 9],
      unlock: 5, tech: 'fusione', cost: { rtm: 420, leg: 130 },
      jobs: 6, housing: 0, produce: { nrg: 120 }, consume: { h2o: 1.2 },
      contamina: 3.5, morale: 0, difesa: 0,
      desc: 'Toroide al deuterio riportato in linea dopo ottant anni. Alimenta un distretto intero. Il pannello di controllo e ancora in una lingua che nessuno legge.'
    },
    {
      id: 'arcologia', nome: 'ARCOLOGIA', cat: 'ABITATIVO', glyph: 'H',
      w: 2, h: 2, color: 'house', maxLvl: 5,
      limiti: [0, 0, 0, 0, 0, 2, 4, 6, 8, 12],
      unlock: 6, tech: 'arcologie', cost: { rtm: 620, leg: 210 },
      jobs: 2, housing: 45, produce: {}, consume: { nrg: 26, h2o: 2.0 },
      contamina: 0, morale: 5, difesa: 2,
      desc: 'Una citta verticale autosufficiente: orti pensili, cisterne, corridoi pressurizzati. Quarantacinque persone che finalmente hanno una porta da chiudere.'
    },
    {
      id: 'rigeneratore', nome: 'RIGENERATORE ATMOSFERICO', cat: 'AMBIENTE', glyph: 'O',
      w: 2, h: 2, color: 'toxic', maxLvl: 5,
      limiti: [0, 0, 0, 0, 0, 0, 1, 2, 3, 4],
      unlock: 7, tech: 'nanofiltri', cost: { rtm: 540, leg: 170 },
      jobs: 5, housing: 0, produce: {}, consume: { nrg: 32, h2o: 1.0 },
      assorbe: 16, contamina: 0, morale: 6, difesa: 0,
      desc: 'Scrubber industriale a scala di quartiere. Nel raggio di un chilometro la cenere smette di cadere e si vede il cielo. Grigio, ma cielo.'
    },
    {
      id: 'spazioporto', nome: 'SPAZIOPORTO ESODO', cat: 'COMANDO', glyph: 'X',
      w: 3, h: 2, color: 'core', maxLvl: 1, unique: true,
      limiti: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      unlock: 10, tech: 'esodo', cost: { rtm: 18000, leg: 4500, dat: 900 },
      jobs: 20, housing: 0, produce: {}, consume: { nrg: 90, h2o: 3, leg: 1.5 },
      contamina: 2, morale: 15, difesa: 0,
      desc: 'Richiede il NUCLEO al grado massimo MK-10. La rampa punta alle stelle. Completala, riempi i serbatoi e il Settore-7 non sara piu un rifugio ma un punto di partenza. VITTORIA: avvia il lancio dal pannello di scansione.'
    }
  ];

  /* ---------------------------------------------------------
     TECNOLOGIE  (costo in DAT)
     --------------------------------------------------------- */
  var TECHS = [
    { id: 'fotovoltaico', nome: 'FOTOVOLTAICO SPETTRALE', costo: 40,  req: [],              lvl: 2,
      desc: 'Celle sensibili all infrarosso: +30% energia dagli array fotovoltaici.', eff: '+30% ARRAY FOTOVOLTAICO' },
    { id: 'riciclo',      nome: 'RICICLO MOLECOLARE',     costo: 60,  req: [],              lvl: 2,
      desc: 'Separazione atomica dei rottami: +30% da raccoglitori e officine.',      eff: '+30% RACCOLTA ROTTAMI' },
    { id: 'idro2',        nome: 'IDROPONICA GEN-2',        costo: 90,  req: [],              lvl: 3,
      desc: 'Ceppi vegetali resistenti alle radiazioni: +35% biomassa.',              eff: '+35% PRODUZIONE CIBO' },
    { id: 'nanofiltri',   nome: 'NANO-FILTRI',             costo: 130, req: ['riciclo'],     lvl: 3,
      desc: 'Membrane a scala nanometrica: -35% contaminazione emessa, sblocca il Rigeneratore.', eff: '-35% CONTAMINAZIONE' },
    { id: 'logistica',    nome: 'IA LOGISTICA',            costo: 180, req: ['riciclo'],     lvl: 4,
      desc: 'Un intelligenza gestisce turni e trasporti: +12% a TUTTA la produzione.', eff: '+12% PRODUZIONE GLOBALE' },
    { id: 'difesa',       nome: 'RETE DI PUNTAMENTO',      costo: 200, req: [],              lvl: 4,
      desc: 'Le torrette condividono il tracciamento bersagli: +60% difesa.',          eff: '+60% DIFESA' },
    { id: 'fusione',      nome: 'CONFINAMENTO A FUSIONE',  costo: 280, req: ['logistica'],   lvl: 5,
      desc: 'Riavvia i toroidi al deuterio. Sblocca il REATTORE A FUSIONE.',           eff: 'SBLOCCA REATTORE' },
    { id: 'medicina',     nome: 'MEDICINA RIGENERATIVA',   costo: 320, req: ['idro2'],       lvl: 5,
      desc: 'Cloni cellulari e antirad: +50% morale dai centri medici, meno morti.',   eff: 'MENO MORTI, +MORALE' },
    { id: 'arcologie',    nome: 'INGEGNERIA ARCOLOGICA',   costo: 420, req: ['fusione'],     lvl: 6,
      desc: 'Strutture autoportanti da 200 metri. Sblocca l ARCOLOGIA.',               eff: 'SBLOCCA ARCOLOGIA' },
    { id: 'esodo',        nome: 'PROTOCOLLO ESODO',        costo: 700, req: ['arcologie', 'medicina'], lvl: 9,
      desc: 'Le coordinate del convoglio orbitale. Sblocca lo SPAZIOPORTO.',           eff: 'SBLOCCA SPAZIOPORTO' }
  ];

  /* ---------------------------------------------------------
     LIVELLI CITTA'
     --------------------------------------------------------- */
  var LEVELS = [
    { lvl: 1,  nome: 'AVAMPOSTO',           raggio: 4,  costo: {},                                      tempo: 0   },
    { lvl: 2,  nome: 'INSEDIAMENTO',        raggio: 5,  costo: { rtm: 250 },                            tempo: 20  },
    { lvl: 3,  nome: 'BORGO DI FERRO',      raggio: 6,  costo: { rtm: 800 },                            tempo: 35  },
    { lvl: 4,  nome: 'DISTRETTO',           raggio: 7,  costo: { rtm: 1300, leg: 200 },                 tempo: 55  },
    { lvl: 5,  nome: 'CITTADELLA',          raggio: 8,  costo: { rtm: 2100, leg: 500 },                 tempo: 80  },
    { lvl: 6,  nome: 'NEXO URBANO',         raggio: 9,  costo: { rtm: 3400, leg: 900,  dat: 100 },      tempo: 110 },
    { lvl: 7,  nome: 'METROPOLI DI CENERE', raggio: 11, costo: { rtm: 5400, leg: 1500, dat: 250 },      tempo: 150 },
    { lvl: 8,  nome: 'CONURBAZIONE',        raggio: 13, costo: { rtm: 8600, leg: 2500, dat: 450 },      tempo: 200 },
    { lvl: 9,  nome: 'ARCOPOLI',            raggio: 15, costo: { rtm: 13800, leg: 4000, dat: 700 },     tempo: 260 },
    { lvl: 10, nome: 'NEXUS PRIME',         raggio: 24, costo: { rtm: 22000, leg: 6500, dat: 1100 },    tempo: 340 }
  ];

  /* ---------------------------------------------------------
     EVENTI CASUALI
     tipo: buono | cattivo | raid
     --------------------------------------------------------- */
  var EVENTS = [
    { id: 'tempesta',  nome: 'TEMPESTA DI RUGGINE', tipo: 'cattivo', peso: 14, minLvl: 1,
      testo: 'Un fronte di polvere ferrosa investe il settore. Le strutture esposte si corrodono.' },
    { id: 'acida',     nome: 'PIOGGIA ACIDA',       tipo: 'cattivo', peso: 12, minLvl: 2,
      testo: 'Piove qualcosa che scioglie la vernice. I filtri lavorano al massimo.' },
    { id: 'blackout',  nome: 'SOVRACCARICO',        tipo: 'cattivo', peso: 10, minLvl: 2,
      testo: 'Un picco di corrente manda in protezione meta della rete elettrica.' },
    { id: 'raid',      nome: 'INCURSIONE PREDONI',  tipo: 'raid',    peso: 16, minLvl: 2,
      testo: 'Motori in lontananza. I Figli della Ruggine hanno visto le nostre luci.' },
    { id: 'epidemia',  nome: 'FEBBRE DELLE CENERI', tipo: 'cattivo', peso: 8,  minLvl: 3,
      testo: 'Un ceppo fungino attacca i polmoni dei coloni. L infermeria e piena.' },
    { id: 'profughi',  nome: 'CONVOGLIO DI PROFUGHI', tipo: 'buono', peso: 15, minLvl: 1,
      testo: 'Sagome all orizzonte: sopravvissuti che chiedono asilo. Hanno mani da lavoro.' },
    { id: 'relitto',   nome: 'RELITTO ORBITALE',    tipo: 'buono',   peso: 12, minLvl: 1,
      testo: 'Un modulo di rientro precipita a nord. Le squadre lo spolpano prima dell alba.' },
    { id: 'archivio',  nome: 'ARCHIVIO INTATTO',    tipo: 'buono',   peso: 10, minLvl: 3,
      testo: 'Sotto una scuola crollata, un server ancora alimentato da una batteria atomica.' },
    { id: 'carovana',  nome: 'CAROVANA MERCANTE',   tipo: 'buono',   peso: 12, minLvl: 2,
      testo: 'Un mezzo cingolato scarica merce sulla piazza e riparte senza salutare.' },
    { id: 'falda',     nome: 'FALDA SCOPERTA',      tipo: 'buono',   peso: 9,  minLvl: 2,
      testo: 'Le trivelle bucano una sacca d acqua pulita. Le cisterne si riempiono da sole.' }
  ];

  global.DATA = {
    RESOURCES: RESOURCES,
    BASE_CAP: BASE_CAP,
    TERRAIN: TERRAIN,
    BUILDINGS: BUILDINGS,
    TECHS: TECHS,
    LEVELS: LEVELS,
    EVENTS: EVENTS,
    byId: function (id) {
      for (var i = 0; i < BUILDINGS.length; i++) { if (BUILDINGS[i].id === id) return BUILDINGS[i]; }
      return null;
    },
    techById: function (id) {
      for (var i = 0; i < TECHS.length; i++) { if (TECHS[i].id === id) return TECHS[i]; }
      return null;
    }
  };
})(window);
