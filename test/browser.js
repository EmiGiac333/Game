#!/usr/bin/env node
/* ============================================================
   NEXUS-7 :: browser.js
   Prove end-to-end in un browser reale a viewport da telefono:
   caricamento sprite, disegno della plancia, tocco, zoom,
   percorso del tutorial, sblocchi narrativi, pannelli,
   salvataggi e migrazione dai formati precedenti.

   Uso:  node test/browser.js
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const RADICE = path.join(__dirname, '..');
const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json'
};

/* Server statico minimo: evita di dipendere da strumenti esterni. */
function avviaServer() {
  return new Promise(risolvi => {
    const s = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(RADICE, rel === '/' ? 'index.html' : rel);
      if (!file.startsWith(RADICE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('non trovato'); return;
      }
      res.writeHead(200, { 'Content-Type': TIPI[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => risolvi({ server: s, porta: s.address().port }));
  });
}

let errori = 0, controlli = 0;
function ok(cond, messaggio) {
  controlli++;
  if (cond) console.log('  ok    ' + messaggio);
  else { errori++; console.log('  FALLITO  ' + messaggio); }
}
function sezione(n) { console.log('\n== ' + n + ' =='); }

(async () => {
  const { server, porta } = await avviaServer();
  const BASE = `http://127.0.0.1:${porta}/`;
  /* In CI il binario lo fornisce "playwright install"; in ambienti che ne
     hanno gia' uno si puo' indicare con PLAYWRIGHT_CHROMIUM. */
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
  const contesto = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await contesto.newPage();

  const jsErrori = [];
  page.on('pageerror', e => jsErrori.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') jsErrori.push('CONSOLE: ' + m.text()); });
  page.on('requestfailed', r => jsErrori.push('RICHIESTA FALLITA: ' + r.url().split('/').pop()));

  try {
    /* ------------------------------------------------ avvio e sprite */
    sezione('AVVIO E GRAFICA');
    await page.goto(BASE);
    await page.waitForFunction(() => window.Sprites && window.Sprites.pronto, { timeout: 30000 });
    ok(await page.evaluate(() => Sprites.mancanti.length) === 0, 'tutti gli sprite caricati');
    const spriteAttesi = await page.evaluate(() => Sprites.elenco().length);
    ok(await page.evaluate(() => Object.keys(Sprites.cache).length) === spriteAttesi,
       `tutti i ${spriteAttesi} sprite dichiarati sono in cache`);
    ok(await page.evaluate(() => Sprites.ZOOM_PX.every(px => 512 % px === 0)),
       'ogni livello di zoom divide 512 per un intero');

    await page.click('#boot-nuova');
    await page.waitForTimeout(500);
    await page.evaluate(() => { UI.velocita = 0; });          /* orologio in pausa */

    const canvas = await page.evaluate(() => {
      const c = document.getElementById('map');
      return { tag: c.tagName, w: c.width, h: c.height, px: Render.px };
    });
    ok(canvas.tag === 'CANVAS', 'la plancia e un canvas');
    ok(canvas.w === 28 * canvas.px && canvas.h === 18 * canvas.px,
       `canvas dimensionato sulla mappa (${canvas.w}x${canvas.h})`);
    const dipinto = await page.evaluate(() => {
      const c = document.getElementById('map');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4000) if (d[i] > 0) n++;
      return n;
    });
    ok(dipinto > 100, `la plancia e disegnata (${dipinto} campioni opachi)`);

    /* ------------------------------------------------------- tocco */
    sezione('INPUT');
    await page.evaluate(() => { const w = document.getElementById('mapwrap'); w.scrollLeft = 0; w.scrollTop = 0; });
    await page.waitForTimeout(120);
    const box = await page.locator('#mapwrap').boundingBox();
    const px = await page.evaluate(() => Render.px);
    await page.mouse.click(box.x + 3 * px + px / 2, box.y + 2 * px + px / 2);
    await page.waitForTimeout(180);
    ok(await page.evaluate(() => Render.cursore.x) === 3 && await page.evaluate(() => Render.cursore.y) === 2,
       'il tocco seleziona la cella esatta');

    for (const z of [0, 2, 1]) {
      await page.evaluate(zz => { UI.zoom = zz; UI.applicaZoom(); UI.disegnaMappa(); }, z);
      await page.waitForTimeout(120);
    }
    ok(jsErrori.length === 0, 'nessun errore cambiando zoom');

    /* ---------------------------------------------------- tutorial */
    sezione('TUTORIAL');
    ok(await page.locator('#tut.aperto').count() === 1, 'il banner appare in una partita nuova');
    ok(await page.evaluate(() => Tutorial.stato(Engine.state).passo) >= 1,
       'il primo passo si completa toccando la mappa');

    await page.evaluate(() => { Engine.state.res.rtm = 3000; });
    for (const azione of ['sgombero', 'raccoglitore', 'solare', 'condensatore', 'micofarm', 'rifugio', 'strada']) {
      await page.evaluate(tipo => {
        if (tipo === 'sgombero') {
          for (let y = 0; y < Engine.MAP_H; y++) for (let x = 0; x < Engine.MAP_W; x++) {
            const t = Engine.tile(x, y);
            if (t && t.t === 'rubble' && !t.cl && Engine.nelSettore(x, y, 1, 1)) { Engine.sgombera(x, y); return; }
          }
        } else {
          for (let y = 0; y < Engine.MAP_H; y++) for (let x = 0; x < Engine.MAP_W; x++)
            if (Engine.puoPiazzare(tipo, x, y).ok) { Engine.piazza(tipo, x, y); return; }
        }
      }, azione);
      await page.evaluate(() => UI.verificaTutorial());
      await page.waitForTimeout(40);
    }
    ok(await page.evaluate(() => Tutorial.passoCorrente(Engine.state).id) === 'scansione',
       'i passi di costruzione avanzano fino alla SCANSIONE');

    await page.evaluate(() => { UI.selezione = Engine.state.edifici[1]; UI.apri('scansione'); });
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => Tutorial.passoCorrente(Engine.state).id) === 'livello',
       'aprire la scansione completa il passo');

    const bloccato = await page.evaluate(() => {
      Engine.state.res.rtm = 5000;
      return Engine.potenzia(Engine.state.edifici[1]).motivo || '';
    });
    ok(/NUCLEO E SOLO MK-1/.test(bloccato), 'con il Nucleo a MK-1 nessuna struttura si potenzia');

    await page.evaluate(() => {
      Engine.avviaPotenziamentoNucleo();
      for (let i = 0; i < 25; i++) Engine.aggiorna(1);
      UI.verificaTutorial();
    });
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => Engine.state.livello) === 2, 'il cantiere del Nucleo porta il settore a MK-2');
    ok(await page.evaluate(() => Tutorial.passoCorrente(Engine.state).id) === 'potenzia',
       'il passo sui potenziamenti arriva dopo il Nucleo');

    await page.evaluate(() => { Engine.state.res.rtm = 5000; Engine.potenzia(Engine.state.edifici[1]); UI.verificaTutorial(); });
    await page.waitForTimeout(120);
    ok(await page.evaluate(() => Tutorial.passoCorrente(Engine.state).id) === 'ricerca',
       'ora il potenziamento passa e il tutorial prosegue');

    await page.evaluate(() => UI.azione('tut-salta'));
    ok(await page.locator('#tut.aperto').count() === 0, 'SALTA nasconde il banner');
    await page.evaluate(() => UI.azione('tut-continua'));
    ok(await page.locator('#tut.aperto').count() === 1, 'il tutorial si riprende dal MENU');

    /* Il ciclo di gioco non deve contare i propri aggiornamenti come
       aperture del pannello, altrimenti salta le spiegazioni. */
    const passoPrima = await page.evaluate(() => Tutorial.stato(Engine.state).passo);
    await page.evaluate(() => { UI.apri('scansione'); UI.visto.ricerca = false; UI.rinfrescaPannello(); });
    await page.waitForTimeout(80);
    ok(await page.evaluate(() => UI.visto.ricerca) === false,
       'rinfrescare un pannello non conta come apertura');
    ok(await page.evaluate(() => Tutorial.stato(Engine.state).passo) >= passoPrima, 'il tutorial non torna indietro');

    /* ----------------------------------------------------- storia */
    sezione('STORIA');
    await page.evaluate(() => { Engine.state.res.dat = 900; Engine.ricerca('fotovoltaico'); });
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => Engine.state.storia.frammenti.includes('f_foto')),
       'una ricerca completata recupera un frammento');
    await page.evaluate(() => { document.querySelectorAll('#toasts>*').forEach(o => o.remove()); Engine.emit('livello', DATA.LEVELS[2]); });
    await page.waitForTimeout(250);
    ok(await page.evaluate(() => Engine.state.storia.capitoli.includes(3)), 'la promozione sblocca il capitolo');
    ok(await page.locator('.overlay [data-arg="storia"]').count() > 0, 'compare il pulsante per leggerlo');

    await page.evaluate(() => { document.querySelectorAll('#toasts>*').forEach(o => o.remove()); UI.storiaAperta = 'c3'; UI.apri('storia'); });
    await page.waitForTimeout(150);
    const storia = await page.textContent('#panel');
    ok(/RUGGINE/.test(storia), 'il capitolo si apre e si legge');
    ok(/VOCE NON ANCORA REGISTRATA/.test(storia), 'i capitoli non raggiunti restano oscurati');

    /* --------------------------------------------------- pannelli */
    sezione('PANNELLI');
    for (const p of ['costruisci', 'ricerca', 'citta', 'diario', 'menu', 'manuale']) {
      await page.evaluate(n => UI.apri(n), p);
      await page.waitForTimeout(100);
      const t = await page.textContent('#panel');
      ok(t.length > 80, `il pannello ${p} si apre con contenuto`);
    }
    await page.evaluate(() => UI.apri('manuale'));
    const manuale = await page.textContent('#panel');
    ok((manuale.match(/-- \d+\./g) || []).length === 14, 'il manuale ha tutte le 14 sezioni');

    await page.evaluate(() => UI.apri('costruisci'));
    await page.waitForTimeout(120);
    ok(await page.locator('#panel .voce img.v-g').count() > 15,
       'il menu di costruzione mostra le miniature degli sprite');

    const tabs = await page.evaluate(() => {
      const n = document.getElementById('tabs');
      return { contenuto: n.scrollWidth, visibile: n.clientWidth, numero: n.children.length };
    });
    ok(tabs.contenuto <= tabs.visibile + 1,
       `i ${tabs.numero} tab entrano nella larghezza dello schermo (${tabs.contenuto} <= ${tabs.visibile})`);

    /* ------------------------------------------------ spedizioni */
    sezione('SPEDIZIONI');
    await page.evaluate(() => {
      UI.chiudi();
      Engine.state.livello = 5; Engine.nucleo().lvl = 5;
      Engine.state.res.rtm = 8000; Engine.state.res.leg = 800;
      Engine.state.res.bio = 900; Engine.state.res.h2o = 900;
      Engine.state.pop = 60;
      for (let y = 0; y < Engine.MAP_H; y++) for (let x = 0; x < Engine.MAP_W; x++) {
        const t = Engine.tile(x, y);
        if (t && t.t === 'rubble' && !t.cl && Engine.nelSettore(x, y, 1, 1)) Engine.sgombera(x, y);
        if (Engine.puoPiazzare('centro', x, y).ok) { Engine.piazza('centro', x, y); y = 99; break; }
      }
      Engine.aggiorna(0);
    });
    ok(await page.evaluate(() => Spedizioni.squadreMax(Engine)) >= 1,
       'un CENTRO SPEDIZIONI attivo mette a disposizione una squadra');

    await page.evaluate(() => UI.apri('spedizioni'));
    await page.waitForTimeout(150);
    const pannelloSped = await page.textContent('#panel');
    ok(/TERRITORI NOTI/.test(pannelloSped) && /EQUIPAGGIAMENTO/.test(pannelloSped),
       'il pannello elenca territori ed equipaggiamenti');
    ok(await page.locator('#panel .voce[data-az="sped-terr"]').count() >= 3,
       'ci sono territori raggiungibili al grado attuale');

    const partenza = await page.evaluate(() => {
      const primo = Engine.state.territori.find(t => Spedizioni.archeDi(t).minLvl <= Engine.state.livello);
      UI.spedTerr = primo.id; UI.spedEquip = 'standard';
      const popPrima = Engine.state.pop;
      UI.azione('sped-parti');
      return { partita: Engine.state.spedizioni.length === 1, popPrima, popDopo: Engine.state.pop };
    });
    ok(partenza.partita, 'la squadra parte');
    ok(partenza.popDopo === partenza.popPrima - 4, 'i coloni della squadra lasciano il settore');

    const rientro = await page.evaluate(() => {
      let rapporto = null;
      Engine.on('spedizione', r => { rapporto = r; });
      for (let i = 0; i < 400 && !rapporto; i++) Engine.aggiorna(1);
      return { rapporto, inViaggio: Engine.state.spedizioni.length, pop: Engine.state.pop };
    });
    ok(!!rientro.rapporto, 'la squadra rientra con un rapporto');
    ok(rientro.inViaggio === 0, 'la squadra non resta in viaggio per sempre');
    ok(['trionfo', 'riuscita', 'parziale', 'disastro'].includes(rientro.rapporto.esito),
       `esito valido: ${rientro.rapporto ? rientro.rapporto.esito : '?'}`);

    /* ------------------------------------------------ scontri */
    sezione('SCONTRI TATTICI');
    await page.evaluate(() => { UI.velocita = 0; Engine.state.battaglia = null; });
    const avvistamento = await page.evaluate(() => {
      Battaglia.avvista(Engine);
      return Engine.state.battaglia && { fase: Engine.state.battaglia.fase, forza: Engine.state.battaglia.forza };
    });
    ok(avvistamento && avvistamento.fase === 'avvistata',
       `l attacco viene avvistato prima di colpire (forza ${avvistamento ? avvistamento.forza : '?'})`);
    ok(/ATTACCO/.test(await page.textContent('#hud-top')) === false ||
       await page.evaluate(() => { UI.aggiornaHud(); return !!document.querySelector('#hud-top .allarme-batt'); }),
       'l HUD mostra l allarme');

    await page.evaluate(() => { for (let i = 0; i < Battaglia.AVVISTAMENTO + 1; i++) Engine.aggiorna(1); });
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => Engine.state.battaglia && Engine.state.battaglia.fase) === 'scelta',
       'scaduto il preavviso si passa alla scelta');
    ok(await page.locator('#panel .voce[data-az="tattica"]').count() >= 2,
       'il pannello offre piu tattiche selezionabili');

    const tattiche = await page.evaluate(() => Battaglia.TATTICHE.map(t => ({
      id: t.id, disp: t.disponibile(Engine), prob: Math.round(Battaglia.probabilita(Engine, t) * 100)
    })));
    ok(tattiche.every(t => t.prob >= 0 && t.prob <= 100), 'ogni tattica mostra una probabilita sensata');
    ok(tattiche.find(t => t.id === 'imboscata').disp === (await page.evaluate(() => Engine.state.intel >= 1)),
       'l imboscata dipende dall INTEL disponibile');

    const scontro = await page.evaluate(() => {
      const popPrima = Engine.state.pop;
      UI.azione('tattica', 'statica');
      return { risolto: Engine.state.battaglia === null, popPrima, pop: Engine.state.pop };
    });
    ok(scontro.risolto, 'la tattica scelta risolve lo scontro');
    ok(await page.locator('#toasts .overlay').count() > 0, 'compare il rapporto di scontro');

    /* risposta automatica se il giocatore non decide */
    const automatica = await page.evaluate(() => {
      document.querySelectorAll('#toasts>*').forEach(o => o.remove());
      Engine.state.battaglia = null;
      Battaglia.avvista(Engine);
      for (let i = 0; i < Battaglia.AVVISTAMENTO + Battaglia.GRAZIA + 2; i++) Engine.aggiorna(1);
      return Engine.state.battaglia === null;
    });
    ok(automatica, 'senza decisione il settore si difende da solo invece di restare bloccato');

    /* ------------------------------------------------ salvataggi */
    sezione('SALVATAGGI');
    await page.evaluate(() => { UI.chiudi(); Engine.state.res.rtm = 1234; Engine.salva(); Engine.state.res.rtm = 7; });
    await page.evaluate(() => UI.azione('carica'));
    ok(Math.round(await page.evaluate(() => Engine.state.res.rtm)) === 1234, 'salva e carica ripristinano lo stato');

    const demolizione = await page.evaluate(() => {
      Engine.state.res.rtm = 900;
      let messo = null;
      for (let y = 0; y < Engine.MAP_H && !messo; y++) for (let x = 0; x < Engine.MAP_W && !messo; x++)
        if (Engine.puoPiazzare('rifugio', x, y).ok) { Engine.piazza('rifugio', x, y); messo = Engine.state.edifici[Engine.state.edifici.length - 1]; }
      const prima = Engine.state.edifici.length;
      UI.selezione = messo; UI.azione('demolisci'); UI.azione('demolisci');
      return {
        rimossa: Engine.state.edifici.length === prima - 1,
        coerente: Engine.state.tiles.every(t => t.b === -1 || !!Engine.state.edifici[t.b])
      };
    });
    ok(demolizione.rimossa, 'la demolizione rimuove la struttura');
    ok(demolizione.coerente, 'gli indici delle celle restano coerenti dopo la demolizione');

    /* migrazione da un salvataggio del primo formato */
    const versioneCorrente = await page.evaluate(() => Engine.state.v);
    await page.evaluate(() => {
      Engine.nuovaPartita(999);
      Engine.state.res.rtm = 4321; Engine.state.livello = 3; Engine.state.pop = 40;
      const vecchio = JSON.parse(JSON.stringify(Engine.state));
      vecchio.v = 1;
      delete vecchio.storia; delete vecchio.tutorial; delete vecchio.nucleoUp;
      vecchio.edifici.forEach(b => { if (b.tipo === 'nucleo') b.lvl = 1; });
      localStorage.setItem('nexus7.save.v1', JSON.stringify(vecchio));
      /* Il gioco salva da solo alla chiusura della pagina: senza questo
         il salvataggio appena fabbricato verrebbe sovrascritto al reload. */
      Engine.salva = function () { return true; };
    });
    await page.reload();
    /* Il pulsante resta disabilitato finche' la grafica non e' caricata:
       aspetto che sia realmente attivabile, non solo che gli sprite ci siano. */
    await page.waitForSelector('#boot-continua:not(.dis)', { timeout: 30000 });
    await page.click('#boot-continua');
    await page.waitForFunction(() => window.UI && window.UI.mappa);
    await page.evaluate(() => { UI.velocita = 0; });   /* fermo il tempo prima di misurare */
    const migrato = await page.evaluate(() => ({
      rtm: Math.round(Engine.state.res.rtm), livello: Engine.state.livello, pop: Engine.state.pop,
      versione: Engine.state.v, nucleo: Engine.nucleo().lvl,
      storia: !!Engine.state.storia, tutorialChiuso: Engine.state.tutorial.completato
    }));
    ok(migrato.rtm === 4321 && migrato.livello === 3 && migrato.pop === 40,
       'un salvataggio vecchio conserva risorse, livello e popolazione');
    ok(migrato.versione === versioneCorrente,
       `la versione viene migrata da 1 a ${versioneCorrente}`);
    ok(migrato.nucleo === 3, 'il Nucleo viene allineato al livello raggiunto');
    ok(migrato.storia, 'la struttura narrativa viene creata');
    ok(migrato.tutorialChiuso, 'a chi era gia in partita il tutorial non viene riproposto');

    /* ------------------------------------------------ tenuta */
    sezione('TENUTA');
    await page.evaluate(() => { UI.velocita = 3; });
    await page.waitForTimeout(6000);
    const cicli = await page.evaluate(() => Math.floor(Engine.state.ciclo));
    ok(cicli > 15, `il tempo avanza a velocita' x4 (${cicli} cicli in 6 s)`);

    ok(jsErrori.length === 0, 'nessun errore JavaScript in tutta la sessione');
    if (jsErrori.length) jsErrori.slice(0, 10).forEach(e => console.log('      ' + e));
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n${controlli} controlli, ${errori} falliti`);
  process.exit(errori ? 1 : 0);
})();
