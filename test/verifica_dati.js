#!/usr/bin/env node
/* ============================================================
   NEXUS-7 :: verifica_dati.js
   Invarianti che non richiedono un browser: coerenza dei dati,
   presenza e dimensione degli sprite, sostenibilita' di ogni
   grado del Nucleo, albero di ricerca, storia e tutorial.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
global.window = global;
['data', 'story', 'tutorial', 'spedizioni', 'battaglia', 'engine'].forEach(m => require(path.join(RADICE, 'js', m + '.js')));
const D = global.DATA, ST = global.Story, TU = global.Tutorial;

let errori = 0, controlli = 0;
function ok(cond, messaggio) {
  controlli++;
  if (!cond) { errori++; console.log('  FALLITO  ' + messaggio); }
}
function sezione(nome) { console.log('\n== ' + nome + ' =='); }

/* Legge larghezza e altezza dall'header IHDR di un PNG. */
function dimensioniPng(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/* ---------------------------------------------------------- edifici */
sezione('EDIFICI');
const glifi = {};
D.BUILDINGS.forEach(b => {
  ok(typeof b.nome === 'string' && b.nome.length > 0, `${b.id}: nome mancante`);
  ok(!glifi[b.glyph], `glifo duplicato '${b.glyph}': ${glifi[b.glyph]} e ${b.id}`);
  glifi[b.glyph] = b.id;
  if (b.tech) ok(!!D.techById(b.tech), `${b.id}: richiede la ricerca inesistente '${b.tech}'`);
  if (b.id === 'nucleo') return;

  ok(Array.isArray(b.limiti) && b.limiti.length === 10, `${b.id}: servono 10 limiti, uno per grado`);
  if (!Array.isArray(b.limiti)) return;
  for (let i = 1; i < 10; i++) {
    ok(b.limiti[i] >= b.limiti[i - 1], `${b.id}: il limite cala fra il grado ${i} e ${i + 1}`);
  }
  const primo = b.limiti.findIndex(v => v > 0) + 1;
  ok(primo === b.unlock, `${b.id}: i limiti sbloccano al grado ${primo} ma unlock dice ${b.unlock}`);
});
console.log(`  ${D.BUILDINGS.length} strutture, ${Object.keys(glifi).length} glifi distinti`);

/* ---------------------------------------------------------- sprite */
sezione('SPRITE');
const DIR = path.join(RADICE, 'sprites');
const PX_CELLA = 512;
let attesi = [];

D.BUILDINGS.forEach(b => {
  if (b.road) return;
  attesi.push({ file: `ed_${b.id}.png`, w: b.w * PX_CELLA, h: b.h * PX_CELLA });
});
for (let m = 0; m < 16; m++) attesi.push({ file: `ed_strada_${m}.png`, w: PX_CELLA, h: PX_CELLA });
Object.keys(D.TERRAIN).forEach(t => {
  for (let v = 0; v < 3; v++) attesi.push({ file: `te_${t}_${v}.png`, w: PX_CELLA, h: PX_CELLA });
});

attesi.forEach(a => {
  const f = path.join(DIR, a.file);
  if (!fs.existsSync(f)) { ok(false, `sprite mancante: ${a.file}`); return; }
  const d = dimensioniPng(f);
  ok(d && d.w === a.w && d.h === a.h,
     `${a.file}: attesi ${a.w}x${a.h}, trovati ${d ? d.w + 'x' + d.h : 'illeggibile'}`);
});

const elencoFile = path.join(DIR, 'elenco.json');
ok(fs.existsSync(elencoFile), 'manca sprites/elenco.json (serve alla cache offline)');
if (fs.existsSync(elencoFile)) {
  const elenco = JSON.parse(fs.readFileSync(elencoFile, 'utf8'));
  const suDisco = fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort();
  ok(elenco.length === suDisco.length && elenco.every((f, i) => f === suDisco[i]),
     `elenco.json non corrisponde ai file su disco (${elenco.length} contro ${suDisco.length})`);
  ok(elenco.length === attesi.length,
     `elenco.json ha ${elenco.length} voci, ne servono ${attesi.length}`);
}
console.log(`  ${attesi.length} sprite verificati (1x1 = ${PX_CELLA}x${PX_CELLA})`);

/* ------------------------------------------- sostenibilita' per grado */
sezione('SOSTENIBILITA DI OGNI GRADO');
for (let L = 1; L <= 10; L++) {
  let prod = 18, cons = 0, alloggi = 10, posti = 0;   /* il Nucleo */
  D.BUILDINGS.forEach(b => {
    const n = b.limiti ? b.limiti[L - 1] : 0;
    if (!n) return;
    prod += ((b.produce && b.produce.nrg) || 0) * n;
    cons += ((b.consume && b.consume.nrg) || 0) * n;
    alloggi += (b.housing || 0) * n;
    posti += (b.jobs || 0) * n;
  });
  const forza = Math.floor(alloggi * 0.65);
  ok(prod >= cons,
     `grado ${L}: costruendo fino ai limiti la rete va in deficit (${prod.toFixed(0)} contro ${cons.toFixed(0)})`);
  ok(forza >= posti,
     `grado ${L}: i posti di lavoro (${posti}) superano la manodopera (${forza})`);
}

/* ----------------------------------------- contaminazione per grado */
sezione('CONTAMINAZIONE');
for (let L = 2; L <= 10; L++) {
  let emesso = 0, assorbito = 0;
  D.BUILDINGS.forEach(b => {
    const n = b.limiti ? b.limiti[L - 1] : 0;
    if (!n) return;
    emesso += (b.contamina || 0) * n;
    assorbito += (b.assorbe || 0) * n;
  });
  ok(assorbito >= emesso,
     `grado ${L}: la contaminazione non e' contrastabile (emessa ${emesso.toFixed(1)}, assorbibile ${assorbito.toFixed(1)})`);
}

/* --------------------------------- costi del Nucleo contro magazzini */
sezione('COSTI DEL NUCLEO');
D.LEVELS.forEach((L, i) => {
  if (i === 0) return;
  Object.keys(L.costo).forEach(k => {
    /* tetto base al grado precedente, senza contare i depositi */
    const tetto = Math.round((D.BASE_CAP[k] || 0) * Math.pow(1.6, i - 1));
    ok(L.costo[k] <= tetto,
       `grado ${L.lvl}: costa ${L.costo[k]} ${k.toUpperCase()} ma al grado precedente il tetto base e' ${tetto}`);
  });
  ok(L.tempo > 0, `grado ${L.lvl}: durata dei lavori non impostata`);
});

/* --------------------------------------------------------- ricerca */
sezione('ALBERO DI RICERCA');
D.TECHS.forEach(t => {
  ok(t.costo > 0, `${t.id}: costo non valido`);
  ok(t.lvl >= 1 && t.lvl <= 10, `${t.id}: livello richiesto fuori scala`);
  t.req.forEach(r => {
    const p = D.techById(r);
    ok(!!p, `${t.id}: prerequisito inesistente '${r}'`);
    if (p) ok(p.lvl <= t.lvl, `${t.id}: il prerequisito '${r}' si sblocca dopo`);
  });
  /* il costo deve stare nel tetto DAT del livello in cui diventa disponibile */
  const tetto = Math.round(D.BASE_CAP.dat * Math.pow(1.6, t.lvl - 1));
  ok(t.costo <= tetto, `${t.id}: costa ${t.costo} DAT ma al grado ${t.lvl} il tetto base e' ${tetto}`);
});

/* ---------------------------------------------------------- storia */
sezione('STORIA');
ok(ST.CAPITOLI.length === D.LEVELS.length,
   `capitoli ${ST.CAPITOLI.length}, gradi ${D.LEVELS.length}: devono coincidere`);
ST.CAPITOLI.forEach((c, i) => {
  ok(c.lvl === i + 1, `capitolo ${i}: livello ${c.lvl} fuori sequenza`);
  ok(c.testo && c.testo.length > 100, `capitolo ${c.lvl}: testo troppo breve`);
});
const fonti = {
  tech: D.TECHS.map(t => t.id),
  evento: D.EVENTS.map(e => e.id),
  spedizione: global.Spedizioni.ARCHETIPI.map(a => a.id)
};
ST.FRAMMENTI.forEach(f => {
  const [tipo, val] = f.fonte.split(':');
  ok(fonti[tipo] && fonti[tipo].includes(val), `frammento ${f.id}: fonte '${f.fonte}' non esiste`);
});
/* ogni archetipo che promette un archivio deve avere davvero un frammento */
global.Spedizioni.ARCHETIPI.filter(a => a.frammento).forEach(a => {
  ok(ST.FRAMMENTI.some(f => f.fonte === 'spedizione:' + a.id),
     `l'archetipo ${a.id} promette un frammento ma non ne esiste uno con fonte 'spedizione:${a.id}'`);
});
ok(!!ST.FINALI.vittoria && !!ST.FINALI.sconfitta, 'manca uno dei due epiloghi');

/* -------------------------------------------------------- tutorial */
sezione('TUTORIAL');
const idPassi = TU.PASSI.map(p => p.id);
ok(new Set(idPassi).size === idPassi.length, 'ci sono passi con lo stesso id');
TU.PASSI.forEach(p => {
  ok(p.titolo && p.testo && p.azione, `passo ${p.id}: campi mancanti`);
  ok(typeof p.fatto === 'function', `passo ${p.id}: manca la condizione di completamento`);
});
ok(idPassi.indexOf('livello') < idPassi.indexOf('potenzia'),
   'il passo sul Nucleo deve venire prima di quello sui potenziamenti: con il tetto MK legato al Nucleo, l ordine inverso e ingiocabile');

/* ------------------------------------------------------------ esito */
console.log(`\n${controlli} controlli, ${errori} falliti`);
process.exit(errori ? 1 : 0);
