#!/usr/bin/env node
/* ============================================================
   NEXUS-7 :: verifica_sprite.js
   Rigenera l'arte in una cartella temporanea e la confronta con
   quella committata, cosi' gli sprite non possono divergere dal
   codice che li produce.

   Il confronto e' sui pixel decompressi e non sui byte del file:
   versioni diverse di zlib comprimono in modo diverso a parita'
   di immagine, e un confronto binario darebbe falsi allarmi.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const os = require('os');

const RADICE = path.join(__dirname, '..');
const COMMITTATI = path.join(RADICE, 'sprites');

/* Estrae i dati grezzi (header + pixel decompressi) da un PNG. */
function pixel(file) {
  const b = fs.readFileSync(file);
  let i = 8, idat = [], header = null;
  while (i < b.length) {
    const len = b.readUInt32BE(i);
    const tipo = b.toString('ascii', i + 4, i + 8);
    const dati = b.slice(i + 8, i + 8 + len);
    if (tipo === 'IHDR') header = dati.toString('hex');
    if (tipo === 'IDAT') idat.push(dati);
    if (tipo === 'IEND') break;
    i += 12 + len;
  }
  return { header, dati: zlib.inflateSync(Buffer.concat(idat)) };
}

const temporanea = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus7-sprite-'));
try {
  execFileSync('python3', [path.join(RADICE, 'tools', 'genera_sprite.py'), temporanea],
               { stdio: ['ignore', 'pipe', 'inherit'] });

  const rigenerati = fs.readdirSync(temporanea).filter(f => f.endsWith('.png')).sort();
  const presenti = fs.readdirSync(COMMITTATI).filter(f => f.endsWith('.png')).sort();

  let errori = 0;
  const mancanti = rigenerati.filter(f => !presenti.includes(f));
  const superflui = presenti.filter(f => !rigenerati.includes(f));
  mancanti.forEach(f => { console.log('  MANCANTE   ' + f + ' (il generatore lo produce, il repo no)'); errori++; });
  superflui.forEach(f => { console.log('  SUPERFLUO  ' + f + ' (nel repo ma non piu' + ' prodotto)'); errori++; });

  rigenerati.filter(f => presenti.includes(f)).forEach(f => {
    const a = pixel(path.join(COMMITTATI, f));
    const b = pixel(path.join(temporanea, f));
    if (a.header !== b.header || !a.dati.equals(b.dati)) {
      console.log('  DIVERSO    ' + f + ' (rigenera con: python3 tools/genera_sprite.py)');
      errori++;
    }
  });

  console.log(`\n${rigenerati.length} sprite confrontati, ${errori} divergenti`);
  process.exit(errori ? 1 : 0);
} finally {
  fs.rmSync(temporanea, { recursive: true, force: true });
}
