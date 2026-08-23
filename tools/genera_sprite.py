#!/usr/bin/env python3
"""Genera tutti gli sprite del gioco in sprites/.

Una cella di mappa e' 32 px logici, esportati a 512 px: una struttura 1x1
esce a 512x512, una 2x1 a 1024x512, una 2x2 a 1024x1024, una 3x2 a 1536x1024.
512 e' multiplo esatto di 32, quindi il gioco puo' rimpicciolire gli sprite
a 64, 32, 16 e 8 px per cella senza mai spezzare un pixel.

Uso:  python3 tools/genera_sprite.py [cartella_destinazione]

Senza argomenti scrive in sprites/. La destinazione alternativa serve alla
verifica automatica: si rigenera altrove e si confronta con quanto committato.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import Canvas, salva
import edifici_1x1 as U
import edifici_grandi as G
import terreni as T

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sprites')

# id -> (larghezza, altezza, funzione di disegno)
EDIFICI = {
    'rifugio': (1, 1, U.rifugio),          'solare': (1, 1, U.solare),
    'eolica': (1, 1, U.eolica),            'condensatore': (1, 1, U.condensatore),
    'raccoglitore': (1, 1, U.raccoglitore), 'micofarm': (1, 1, U.micofarm),
    'antenna': (1, 1, U.antenna),          'torretta': (1, 1, U.torretta),
    'muro': (1, 1, U.muro),                'filtro': (1, 1, U.filtro),
    'monumento': (1, 1, U.monumento),      'deposito': (1, 1, U.deposito),
    'idroponica': (2, 1, G.idroponica),    'fonderia': (2, 1, G.fonderia),
    'pozzo': (2, 1, G.pozzo),              'laboratorio': (2, 1, G.laboratorio),
    'officina': (2, 1, G.officina),        'mercato': (2, 1, G.mercato),
    'medico': (2, 1, G.medico),            'centro': (2, 1, G.centro),
    'nucleo': (2, 2, G.nucleo),
    'reattore': (2, 2, G.reattore),        'arcologia': (2, 2, G.arcologia),
    'rigeneratore': (2, 2, G.rigeneratore), 'spazioporto': (3, 2, G.spazioporto),
}

VARIANTI_TERRENO = 3


def main(dest=None):
    dest = dest or DEST
    os.makedirs(dest, exist_ok=True)
    totale = 0
    n = 0

    for nome, (w, h, disegna) in sorted(EDIFICI.items()):
        c = Canvas(32 * w, 32 * h)
        disegna(c)
        totale += salva(c, os.path.join(dest, 'ed_%s.png' % nome))
        n += 1

    # I tracciati si collegano ai vicini: una variante per ogni combinazione
    # N/S/E/O, indicizzata dai 4 bit  N=1  S=2  E=4  O=8.
    for m in range(16):
        c = Canvas(32, 32)
        U.strada(c, m & 1, (m >> 1) & 1, (m >> 2) & 1, (m >> 3) & 1)
        totale += salva(c, os.path.join(dest, 'ed_strada_%d.png' % m))
        n += 1

    for tipo, disegna in T.TIPI.items():
        for v in range(VARIANTI_TERRENO):
            c = Canvas(32, 32)
            disegna(c, v * 17 + 3)
            totale += salva(c, os.path.join(dest, 'te_%s_%d.png' % (tipo, v)))
            n += 1

    # elenco per il service worker: cosi' la cache offline resta allineata
    import json
    files = sorted(f for f in os.listdir(dest) if f.endswith('.png'))
    with open(os.path.join(dest, 'elenco.json'), 'w') as f:
        json.dump(files, f)

    print('%d sprite generati, %.1f KB totali' % (n, totale / 1024.0))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
