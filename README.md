```
  _   _ _____ _  _ _   _ ___    ___
 | \ | | ____| \/ | | | / __|  |__ \
 |  \| |  _| |    | | | \__ \    / /
 | |\  | |___| /\ | |_| |___/   |_|
 |_| \_|_____|_||_|\___/|___|   (_)

      C I T Y   B U I L D E R
     ascii post-apocalittico
```

# NEXUS-7

City builder con **sprite pixelati**, ambientato in un futuro post-apocalittico.

Anno 2187. Otto persone si svegliano in un modulo di atterraggio, in mezzo a
quaranta chilometri di cenere. In orbita, un segnale ripete una sola parola:
*ATTENDETE*. Tu sei l'Amministratore del Settore-7 e devi ricostruire una città —
ma più cresce, più diventa difficile ignorare la domanda che nessuno ha ancora
posto: **cos'è successo, ottant'anni fa, alle 04:11?**

Gira nel browser, **è pensato per Android** (touch, schermo verticale, offline),
non richiede installazione né connessione dopo la prima apertura.

---

## Giocare su Android

**Opzione 1 — GitHub Pages (consigliata).**

1. Su GitHub: *Settings → Pages → Source: Deploy from a branch*, scegli il branch
   `claude/ascii-city-builder-game-iyi897` e cartella `/ (root)`, poi *Save*.
2. Apri l'indirizzo pubblicato (`https://<utente>.github.io/<repo>/`) con Chrome su Android.
3. Menu di Chrome → **Aggiungi a schermata Home**: il gioco si apre a schermo intero
   come un'app e funziona anche **offline** (service worker).

**Opzione 2 — server locale.**

```bash
cd Game && python3 -m http.server 8000
```
Poi apri `http://<ip-del-pc>:8000` dal telefono sulla stessa rete Wi-Fi.

**Opzione 3 — file locale.** Copia la cartella sul telefono e apri `index.html`.
Funziona, ma da `file://` il salvataggio offline via service worker resta disattivato.

I salvataggi usano `localStorage` del browser: restano sul dispositivo.
I salvataggi creati prima dell'aggiunta della campagna vengono migrati
automaticamente, senza perdere la partita in corso.

---

## Tutorial e manuale

Una nuova partita comincia con un **tutorial interattivo in 14 passi**: ogni passo
spiega una meccanica e propone un obiettivo, che si completa da solo quando lo
esegui davvero in gioco. Si può nascondere in qualsiasi momento e **riprendere o
rifare dal MENU**.

Il **MANUALE COMPLETO** (13 sezioni: il Nucleo, risorse, energia, addetti, adiacenze,
potenziamenti, difesa, contaminazione, ricerca, strategia d'apertura…) è sempre
raggiungibile dal MENU, anche a partita avanzata.

---

## La storia

La campagna si svela mentre giochi, e resta tutta rileggibile nel pannello **STORIA**.

- **10 capitoli** del registro dell'Amministratore, uno per ogni promozione della città;
- **14 frammenti d'archivio** — referti, verbali, trascrizioni radio, lettere mai
  spedite — recuperati completando ricerche e attraversando certi eventi;
- **2 epiloghi**, a seconda di come finisce.

Le voci non ancora ottenute restano visibili ma oscurate, così sai sempre quanto
manca. Un asterisco sulla tab STORIA segnala che c'è qualcosa di nuovo da leggere.

> *«Voi non sapete cosa avete riacceso.»*
> — graffito sulla parete est del deposito

---

## Comandi

| Azione | Come |
|---|---|
| Spostarsi sulla mappa | trascina con un dito |
| Selezionare una cella | tocca |
| Confermare (scansiona / costruisci / sgombera) | tocca **di nuovo** la stessa cella |
| Zoom | `[-]` `[+]` in basso a destra — al minimo la **vista tattica** adatta tutto il settore allo schermo |
| Velocità | il pulsante `x1` in alto a destra cicla `|| → x1 → x2 → x4` |
| Pannelli | barra in basso: COSTRUISCI, SCANSIONE, RICERCA, CITTÀ, STORIA, DIARIO, MENU |

Con tastiera collegata: frecce per il cursore, `Invio` conferma, `Esc` annulla, `+`/`-` zoom.

---

## Meccaniche

**Risorse.** ROTTAMI (RTM), ACQUA (H2O), BIOMASSA (BIO), LEGHE (LEG), DATI (DAT).
Ogni risorsa ha un tetto di stoccaggio, che cresce con il livello della città e con i Depositi:
la produzione oltre il tetto va persa.

**Energia.** Non si accumula. È un bilancio istantaneo fra produzione e richiesta:
se la richiesta supera la produzione, *tutte* le strutture consumatrici rendono in
proporzione. Tieni sempre un margine.

**Addetti.** Il 65% dei coloni lavora. Se i posti di lavoro superano la forza lavoro
disponibile, la resa cala ovunque: servono più alloggi.

**Coloni.** Consumano acqua e biomassa a ogni ciclo. In carenza il morale crolla e si muore.
La crescita è proporzionale alla popolazione: più la città è grande, più accelera.

**Contaminazione.** Fonderie e reattori inquinano; filtri e rigeneratori ripuliscono.
Oltre il 55% i coloni cominciano a morire.

**Adiacenze.** Un TRACCIATO adiacente dà +15% a una struttura. I raccoglitori rendono
di più vicino alle macerie, il Pozzo Profondo *deve* essere costruito accanto a una pozza
tossica, le serre guadagnano vicino alle fonti d'acqua.

**Macerie.** Non sono edificabili: vanno sgomberate prima, e in cambio danno rottami
(a volte leghe o dati).

**Potenziamenti.** Ogni struttura sale fino a **MK-5**: ×2,6 su resa, alloggi e difesa,
ma mai oltre il grado del Nucleo. Quando spazio e limiti finiscono, si cresce in verticale.

**Difesa e incursioni.** I predoni attaccano periodicamente e diventano più forti a ogni
livello. Se la difesa è sotto la loro forza perdi risorse, strutture e coloni.

**Eventi.** Dieci eventi casuali: tempeste di ruggine, piogge acide, blackout, epidemie,
incursioni, ma anche profughi, relitti orbitali, archivi intatti, carovane e falde acquifere.

---

## Progressione — il Nucleo comanda tutto

Come nei builder alla *Clash of Clans*, **il livello del settore è il grado del NUCLEO DI COMANDO**.
Non sale da solo: lo potenzi tu, paghi risorse e aspetti che finiscano i lavori.

Ogni grado del Nucleo:

- estende il **perimetro edificabile**;
- alza del **60%** il tetto di ogni magazzino;
- **sblocca nuove strutture**;
- aumenta **quante** strutture di ogni tipo puoi possedere (`3/5` accanto a ogni voce del menu di costruzione);
- alza il **tetto dei potenziamenti**: nessuna struttura può superare il grado del Nucleo — con il Nucleo a MK-3, tutto il resto si ferma a MK-3.

**Mentre il cantiere è aperto il Nucleo rende metà e le sue difese sono smontate**: aprirlo con
i predoni in arrivo è un modo rapido per perdere una città.

| Grado | Nome | Costo | Lavori |
|---|---|---|---|
| MK-1 | AVAMPOSTO | — | — |
| MK-2 | INSEDIAMENTO | 250 RTM | 20 cicli |
| MK-3 | BORGO DI FERRO | 800 RTM | 35 cicli |
| MK-4 | DISTRETTO | 1.300 RTM · 200 LEG | 55 cicli |
| MK-5 | CITTADELLA | 2.100 RTM · 500 LEG | 80 cicli |
| MK-6 | NEXO URBANO | 3.400 RTM · 900 LEG · 100 DAT | 110 cicli |
| MK-7 | METROPOLI DI CENERE | 5.400 RTM · 1.500 LEG · 250 DAT | 150 cicli |
| MK-8 | CONURBAZIONE | 8.600 RTM · 2.500 LEG · 450 DAT | 200 cicli |
| MK-9 | ARCOPOLI | 13.800 RTM · 4.000 LEG · 700 DAT | 260 cicli |
| MK-10 | NEXUS PRIME | 22.000 RTM · 6.500 LEG · 1.100 DAT | 340 cicli |

Il pannello **CITTÀ** mostra sempre costo, durata e cosa sblocca il grado successivo.

**25 strutture** su 8 categorie e **10 progetti di ricerca** in albero tecnologico
(dal Fotovoltaico Spettrale al Protocollo Esodo).

**Vittoria:** porta il Nucleo a **MK-10**, ricerca PROTOCOLLO ESODO, costruisci lo
SPAZIOPORTO ESODO, apri la sua SCANSIONE e avvia il lancio. Sessanta cicli di conto
alla rovescia — e difendilo.

**Sconfitta:** restare senza coloni. Anche questo ha il suo epilogo.

---

## Scansione degli edifici

Il pannello **SCANSIONE** è lo zoom sulla singola struttura: lo sprite a piena
risoluzione (fino a 1536×1024), descrizione, e tutte le caratteristiche in chiaro —

- integrità, resa totale, stato operativo;
- produzione e consumi effettivi per ciclo (con valore base a confronto);
- **tutti i moltiplicatori** che compongono la resa: livello MK, integrità, copertura
  addetti, copertura della rete elettrica, morale, tecnologie e ogni bonus di adiacenza;
- azioni: potenzia, ripara, demolisci.

---

## Struttura del progetto

```
index.html              shell dell'app
css/style.css           tema terminale CRT, layout mobile-first
js/data.js              risorse, terreni, 25 edifici, tecnologie, livelli, eventi
js/sprites.js           caricamento sprite e cache per livello di zoom
js/story.js             10 capitoli, 14 frammenti d'archivio, 2 epiloghi
js/tutorial.js          14 passi guidati con obiettivi verificati sullo stato di gioco
js/engine.js            stato, generazione mappa, simulazione economica, eventi, salvataggio
js/render.js            renderer su canvas: terreno, perimetro, strutture, cursore
js/ui.js                HUD, pannelli, input touch, ciclo di gioco
js/main.js              avvio e registrazione service worker
sprites/                61 sprite PNG + elenco.json per la cache offline
tools/                  generatore della pixel art (pixel.py, edifici_*.py, terreni.py)
sw.js                   cache offline (codice + sprite)
manifest.webmanifest    installazione come app Android
```

Nessuna dipendenza, nessun passo di build: sono file statici.

### Grafica

Gli sprite sono **pixel art generata da codice**, non immagini disegnate a mano:
`tools/` contiene il motore di disegno e le definizioni di ogni struttura, quindi
l'arte è riproducibile e modificabile.

```bash
python3 tools/genera_sprite.py     # rigenera i 61 sprite in sprites/
```

L'arte è autorata a **32 pixel logici per cella di mappa** ed esportata ingrandita
×16: una struttura 1×1 esce a **512×512**, una 2×1 a 1024×512, una 2×2 a 1024×1024,
lo Spazioporto 3×2 a 1536×1024. In tutto 61 file per 344 KB.

512 è un multiplo esatto di 32, e i tre livelli di zoom (16, 32 e 64 px per cella)
sono tutti divisori esatti di 512: il ridimensionamento non spezza mai un pixel e
l'arte resta netta a ogni scala, con `image-rendering: pixelated` e
`imageSmoothingEnabled = false`.

All'avvio il gioco costruisce una copia in cache per ogni livello di zoom e poi
**rilascia gli originali da 512**: tenerli tutti decodificati costerebbe circa
50 MB, troppi per un telefono. Le copie in cache stanno in poche centinaia di KB.

La plancia è disegnata su `<canvas>`: terreno (7 tipi × 3 varianti), perimetro
del settore, griglia, strutture con indicatore di stato e cursore. I tracciati
hanno 16 varianti e si collegano da soli ai vicini.

L'interfaccia resta volutamente un **terminale testuale** — pannelli, barre e
diario in monospazio — perché è l'identità del gioco: sono le *grafiche* a essere
diventate sprite, non la plancia di comando.
