#!/usr/bin/env node
/* ============================================================
   NEXUS-7 :: simula.js
   Gioca partite intere senza browser con un giocatore automatico
   che segue una strategia ragionevole, e pretende che ognuna
   arrivi alla vittoria entro un tetto di cicli.

   Serve a impedire regressioni di bilanciamento: e' facile
   rendere il gioco impossibile senza accorgersene, perche' i
   collassi (blackout, contaminazione, carestia) si manifestano
   migliaia di cicli dopo la causa.

   Uso:  node test/simula.js [seme ...]
   ============================================================ */
'use strict';
const path = require('path');
const RADICE = path.join(__dirname, '..');
global.window = global;
['data', 'story', 'tutorial', 'spedizioni', 'battaglia', 'engine'].forEach(m => require(path.join(RADICE, 'js', m + '.js')));
const E = global.Engine, D = global.DATA;
const SPED = global.Spedizioni, BAT = global.Battaglia;

const SEMI = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [2024, 777, 31337, 555, 909];
const TETTO_CICLI = 16000;

function partita(seme) {
  E.nuovaPartita(seme);
  const st = E.state;

  const posti = t => E.contaTipo(t) < E.limiteDi(D.byId(t));

  function piazza(tipo) {
    for (let y = 0; y < E.MAP_H; y++)
      for (let x = 0; x < E.MAP_W; x++)
        if (E.puoPiazzare(tipo, x, y).ok) { E.piazza(tipo, x, y); return true; }
    return false;
  }

  function sgombera() {
    for (let y = 0; y < E.MAP_H; y++)
      for (let x = 0; x < E.MAP_W; x++) {
        const t = E.tile(x, y);
        if (t && t.t === 'rubble' && !t.cl && E.nelSettore(x, y, 1, 1)) { E.sgombera(x, y); return true; }
      }
    return false;
  }

  /* Strategia: il Nucleo per primo, poi il vincolo peggiore. */
  function turno() {
    const prossimo = E.prossimoLivello();
    if (prossimo && !st.nucleoUp && E.puoPotenziareNucleo().ok) { E.avviaPotenziamentoNucleo(); return; }

    if (st.forzaLavoro - st.lavori < 3 && (piazza('arcologia') || piazza('rifugio'))) return;
    if (st.nettoRtm < 8 && posti('raccoglitore') && piazza('raccoglitore')) return;
    if (st.nettoRtm < 15 && posti('officina') && piazza('officina')) return;
    if (st.res.rtm < 40) { sgombera(); return; }

    if (st.nrgProd - st.nrgCons < 10) return piazza('reattore') || piazza('eolica') || piazza('solare');
    if (st.nettoH2o < 0.8) return piazza('pozzo') || piazza('condensatore');
    if (st.nettoBio < 0.8) return piazza('idroponica') || piazza('micofarm');
    if (st.alloggi - st.pop < 5) return piazza('arcologia') || piazza('rifugio');
    if (st.ctm > 12) { if (piazza('rigeneratore') || piazza('filtro')) return; }
    if (st.difesa < 20 + st.livello * 14) return piazza('torretta') || piazza('muro');
    if (st.nettoLeg < 1.5) return piazza('fonderia');
    if (SPED.squadreMax(E) === 0 && posti('centro') && piazza('centro')) return;
    if (st.nettoDat < 2.5) return piazza('laboratorio') || piazza('antenna');
    if (prossimo && (prossimo.costo.rtm > E.cap('rtm') * 0.85 || st.res.rtm > E.cap('rtm') * 0.8)) {
      return piazza('deposito');
    }
    if (st.res.rtm > E.cap('rtm') * 0.35) {
      for (const t of ['officina', 'fonderia', 'laboratorio', 'raccoglitore', 'condensatore',
                       'idroponica', 'antenna', 'solare', 'eolica', 'deposito', 'medico',
                       'mercato', 'torretta', 'filtro', 'monumento']) {
        if (posti(t) && piazza(t)) return;
      }
    }
    return piazza('medico') || piazza('mercato') || piazza('monumento');
  }

  function potenziaQualcosa() {
    const priorita = ['deposito', 'arcologia', 'rifugio', 'idroponica', 'pozzo', 'reattore',
                      'officina', 'laboratorio', 'fonderia', 'solare', 'eolica'];
    const scelte = st.edifici
      .filter(b => b.tipo !== 'nucleo' && b.tipo !== 'strada' && b.lvl < E.maxLvlDi(D.byId(b.tipo)))
      .sort((a, b) => priorita.indexOf(a.tipo) - priorita.indexOf(b.tipo));
    for (const b of scelte) if (E.potenzia(b).ok) return;
  }

  /* Sceglie la tattica con la probabilita' migliore, e tratta se sta perdendo. */
  function rispondiAllAttacco() {
    const b = st.battaglia;
    if (!b || b.fase !== 'scelta') return;
    let migliore = null, best = -1;
    BAT.TATTICHE.forEach(t => {
      if (t.id === 'ritirata' || !t.disponibile(E)) return;
      const p = t.certa ? 0.55 : BAT.probabilita(E, t);   /* trattare vale una vittoria mediocre */
      if (p > best) { best = p; migliore = t; }
    });
    if (migliore) BAT.risolvi(E, migliore.id);
  }

  /* Manda in ricognizione il territorio piu' promettente fra quelli sicuri. */
  function mandaSpedizione() {
    if (!SPED.squadreMax(E) || st.spedizioni.length >= SPED.squadreMax(E)) return;
    const eq = st.res.leg > 200 ? SPED.equipById('pesante') : SPED.equipById('standard');
    let scelto = null, best = 0;
    st.territori.forEach(t => {
      if (!SPED.puoPartire(E, t, eq).ok) return;
      const p = SPED.probabilita(E, t, eq);
      const valore = p * (SPED.archeDi(t).pericolo + 1);   /* rischio ripagato */
      if (valore > best) { best = valore; scelto = t; }
    });
    if (scelto) SPED.parti(E, scelto, eq);
  }

  const tappe = {};
  let ultimo = 1, spazioporto = false;

  for (let c = 1; c <= TETTO_CICLI; c++) {
    E.aggiorna(1);
    if (c % 5 === 0) turno();
    if (c % 3 === 0) sgombera();
    if (c % 9 === 0 && !E.puoPotenziareNucleo().ok) potenziaQualcosa();
    rispondiAllAttacco();
    if (c % 11 === 0) mandaSpedizione();
    if (c % 20 === 0) D.TECHS.forEach(t => {
      if (E.techDisponibile(t) && st.res.dat >= t.costo) E.ricerca(t.id);
    });
    if (st.livello !== ultimo) { ultimo = st.livello; tappe['MK-' + st.livello] = c; }
    if (st.tech.esodo && !spazioporto && !E.contaTipo('spazioporto') && piazza('spazioporto')) spazioporto = true;
    if (spazioporto && !st.lancioAvviato) E.avviaLancio();
    if (st.vittoria) return { esito: 'vittoria', cicli: c, pop: st.pop, tappe,
                              tech: Object.keys(st.tech).length,
                              sped: st.spedStat, batt: st.battStat, intel: st.intel };
    if (st.gameover) return { esito: 'estinzione', cicli: c, pop: 0, tappe, tech: Object.keys(st.tech).length };
  }
  return { esito: 'incompiuta', cicli: TETTO_CICLI, pop: st.pop, livello: st.livello, tappe,
           tech: Object.keys(st.tech).length };
}

let falliti = 0;
console.log(`Partite complete su ${SEMI.length} semi (tetto ${TETTO_CICLI} cicli)\n`);
SEMI.forEach(seme => {
  const r = partita(seme);
  const buono = r.esito === 'vittoria';
  if (!buono) falliti++;
  console.log(`  seme ${String(seme).padStart(6)}  ${buono ? 'VITTORIA ' : 'FALLITA  '}` +
              `ciclo ${String(r.cicli).padStart(5)}  coloni ${String(r.pop).padStart(4)}  ` +
              `ricerche ${r.tech}/10` + (buono ? '' : `  (${r.esito}${r.livello ? ', fermo a MK-' + r.livello : ''})`));
  if (buono) console.log(`                   spedizioni ${r.sped.riuscite}/${r.sped.partite} riuscite, ` +
                         `${r.sped.perduti} perduti  |  scontri ${r.batt.vinte}V ${r.batt.perse}P ` +
                         `${r.batt.trattate}T  |  intel ${r.intel}`);
  if (!buono) console.log('    tappe: ' + JSON.stringify(r.tappe));
});

console.log(`\n${SEMI.length - falliti}/${SEMI.length} partite completate`);
if (falliti) console.log('Una partita che non arriva in fondo indica uno squilibrio, non sfortuna: controlla energia, contaminazione e manodopera per grado.');
process.exit(falliti ? 1 : 0);
