"""Sprite delle strutture che occupano una sola cella (32x32 logici)."""
import random
from pixel import *


def nucleo_mast(c, x, y, h, pal=METAL):
    c.vline(x, y, h, pal[3]); c.vline(x + 1, y, h, pal[1])


def rifugio(c):
    c.ombra(5, 25, 24, 5)
    c.rect(4, 22, 24, 7, METAL[1])                    # basamento
    c.blocco(5, 10, 22, 17, RUST, tetto=5)            # container
    c.hline(5, 10, 22, RUST[4])
    for i in range(3):                                 # nervature
        c.vline(9 + i * 6, 15, 12, RUST[1])
    c.rect(13, 18, 6, 9, METAL[0])                    # portello
    c.rect(14, 19, 4, 7, METAL[2]); c.p(17, 23, ENER[3])
    c.rect(7, 15, 4, 3, WAT[2]); c.rect(21, 15, 4, 3, WAT[2])   # oblo'
    c.rect(7, 15, 4, 1, WAT[4]); c.rect(21, 15, 4, 1, WAT[4])
    c.rect(23, 5, 3, 6, METAL[2]); c.rect(23, 4, 3, 1, METAL[3])  # sfiato
    c.retino(23, 2, 3, 3, METAL[3], 2, 90)


def solare(c):
    c.ombra(6, 24, 21, 4)
    c.rect(14, 20, 4, 8, METAL[1]); c.rect(11, 27, 10, 2, METAL[0])   # palo
    for j in range(9):                                                 # pannello inclinato
        y = 6 + j
        x0 = 4 + j // 3
        w = 24 - (j // 3) * 2
        c.rect(x0, y, w, 1, DAT[1] if j % 2 else DAT[0])
    c.bordo(4, 6, 24, 9, METAL[2])
    for i in range(5):
        c.vline(6 + i * 5, 7, 7, DAT[2])
    c.line(6, 12, 12, 7, DAT[4])                       # riflesso
    c.line(7, 13, 13, 8, DAT[3])


def eolica(c):
    c.ombra(11, 26, 11, 4)
    c.rect(14, 12, 4, 16, METAL[2])                    # torre
    c.rect(14, 12, 1, 16, METAL[3]); c.rect(17, 12, 1, 16, METAL[1])
    c.rect(12, 27, 8, 2, METAL[1])
    c.disco(16, 11, 3, METAL[3]); c.disco(16, 11, 1, ENER[3])
    c.line(16, 11, 16, 2, METAL[4]); c.line(15, 11, 15, 3, METAL[2])   # pale
    c.line(16, 11, 25, 17, METAL[4]); c.line(16, 12, 24, 18, METAL[2])
    c.line(16, 11, 7, 17, METAL[4]); c.line(16, 12, 8, 18, METAL[2])


def condensatore(c):
    c.ombra(6, 25, 21, 4)
    c.rect(6, 24, 21, 4, METAL[1])
    c.blocco(8, 9, 17, 17, METAL, tetto=4)             # cilindro
    for j in range(3):                                  # serpentine
        c.hline(9, 15 + j * 3, 15, WAT[2])
        c.hline(9, 16 + j * 3, 15, WAT[1])
    c.rect(11, 5, 11, 5, METAL[3]); c.bordo(11, 5, 11, 5, METAL[1])
    c.rect(13, 6, 7, 2, WAT[3])
    c.p(16, 27, WAT[4]); c.p(16, 29, WAT[3])           # goccia
    c.retino(9, 3, 15, 3, WAT[4], 3, 110)


def raccoglitore(c):
    c.ombra(4, 24, 25, 5)
    c.rect(4, 22, 24, 6, METAL[0])                     # cingoli
    for i in range(6): c.rect(5 + i * 4, 23, 2, 4, METAL[2])
    c.blocco(7, 12, 15, 11, RUST, tetto=3)             # cabina
    c.rect(9, 16, 5, 4, WAT[2]); c.rect(9, 16, 5, 1, WAT[4])
    c.line(21, 14, 27, 8, METAL[3])                    # braccio
    c.line(22, 15, 28, 9, METAL[1])
    c.rect(25, 6, 5, 4, ENER[2]); c.bordo(25, 6, 5, 4, ENER[0])
    c.rect(23, 4, 6, 2, RUST[3])                       # rottami sospesi
    c.p(24, 3, RUST[4]); c.p(27, 3, RUST[2])


def micofarm(c):
    c.ombra(4, 24, 25, 5)
    c.rect(4, 23, 24, 5, SAND[1])
    for j in range(9):                                  # cupola
        w = 24 - j * 2
        c.rect(4 + j, 23 - j - 1, w, 1, VEG[2] if j % 2 else VEG[1])
    c.bordo(4, 14, 24, 10, VEG[0])
    for fx, fy, r in ((10, 17, 3), (17, 15, 4), (23, 18, 2)):   # funghi
        c.disco(fx, fy, r, TOX[2]); c.disco(fx, fy - 1, r - 1, TOX[3])
        c.rect(fx - 1, fy, 2, r + 2, VEG[4])
    c.retino(6, 12, 20, 3, TOX[3], 3, 90)              # spore


def antenna(c):
    c.ombra(9, 25, 15, 4)
    c.rect(11, 22, 10, 6, METAL[1]); c.hline(11, 22, 10, METAL[3])
    nucleo_mast(c, 15, 8, 15)
    c.line(16, 22, 9, 27, METAL[2]); c.line(16, 22, 23, 27, METAL[2])   # tiranti
    for j in range(7):                                  # parabola
        w = 3 + j
        c.rect(16 - w // 2 - 2, 4 + j, w + 2, 1, DAT[2] if j % 2 else DAT[1])
    c.bordo(10, 4, 13, 8, DAT[0])
    c.rect(15, 9, 2, 4, METAL[4])
    c.p(16, 2, ENER[4]); c.p(16, 3, ENER[2])


def torretta(c):
    c.ombra(6, 25, 21, 4)
    c.rect(6, 23, 20, 6, METAL[0])
    for i in range(4): c.rect(7 + i * 5, 24, 3, 4, METAL[2])
    c.blocco(9, 14, 14, 10, METAL, tetto=3)            # torretta
    c.rect(11, 18, 10, 3, RED[1]); c.rect(11, 18, 10, 1, RED[3])
    c.disco(16, 13, 4, METAL[3]); c.anello(16, 13, 4, METAL[1])
    c.rect(15, 4, 3, 9, METAL[4]); c.rect(15, 4, 1, 9, METAL[2])   # canna
    c.rect(14, 8, 5, 2, METAL[1])
    c.p(16, 3, RED[3]); c.p(16, 2, RED[4])


def muro(c):
    c.ombra(0, 26, 32, 5)
    for j in range(3):                                  # filari sfalsati
        y = 12 + j * 6
        off = 0 if j % 2 == 0 else 4
        for i in range(-1, 5):
            x = off + i * 8
            c.rect(x, y, 7, 5, METAL[2])
            c.hline(x, y, 7, METAL[3])
            c.bordo(x, y, 7, 5, METAL[0])
    c.rect(0, 28, 32, 2, METAL[0])
    c.retino(0, 10, 32, 2, RUST[2], 3, 120)


def filtro(c):
    c.ombra(8, 25, 17, 4)
    c.rect(7, 24, 18, 5, METAL[1])
    c.blocco(9, 8, 14, 17, TOX, tetto=3)               # colonna
    for j in range(4):
        c.hline(9, 12 + j * 3, 14, TOX[0])
        c.hline(9, 13 + j * 3, 14, TOX[3])
    c.rect(12, 4, 8, 5, METAL[2]); c.bordo(12, 4, 8, 5, METAL[0])
    c.rect(13, 5, 6, 2, TOX[3])
    c.retino(10, 0, 14, 5, TOX[4], 3, 100)             # vapore
    c.rect(6, 16, 3, 3, METAL[3]); c.rect(23, 19, 3, 3, METAL[3])


def monumento(c):
    c.ombra(9, 25, 15, 4)
    c.rect(6, 24, 20, 5, METAL[1]); c.hline(6, 24, 20, METAL[3])
    c.rect(8, 26, 16, 3, METAL[0])
    for j in range(20):                                 # obelisco
        w = 10 - j // 5
        c.rect(16 - w // 2, 24 - j, w, 1, NIGHT if j % 2 else SHADOW)
    c.vline(12, 6, 18, METAL[2])
    for j in range(6):                                  # nomi incisi
        c.hline(14, 9 + j * 2, 5, ENER[1])
    c.p(16, 3, ENER[4]); c.disco(16, 4, 1, ENER[3])
    c.retino(12, 2, 9, 3, ENER[2], 3, 90)


def deposito(c):
    c.ombra(4, 25, 25, 4)
    c.blocco(4, 9, 24, 19, METAL, tetto=5)
    c.rect(10, 15, 12, 13, METAL[0])                   # portellone
    c.rect(11, 16, 10, 11, METAL[1])
    for i in range(5): c.vline(12 + i * 2, 17, 9, METAL[2])
    for i in range(4):                                  # strisce di pericolo
        c.line(5 + i * 6, 27, 9 + i * 6, 23, ENER[3])
        c.line(6 + i * 6, 27, 10 + i * 6, 23, DARK)
    c.rect(6, 11, 5, 3, DAT[2]); c.rect(6, 11, 5, 1, DAT[4])
    c.rect(23, 12, 3, 3, RED[3])


def strada(c, n, s, e, w):
    """Lastre di cemento; i bracci si disegnano solo verso i vicini collegati."""
    rnd = random.Random(7)
    cx = cy = 16
    largh = 14
    corpo = SAND[2]; bordo = SAND[1]; luce = SAND[3]

    def braccio(x, y, w, h):
        c.rect(x, y, w, h, corpo)
        c.rumore(x, y, w, h, [SAND[1], SAND[3]], 0.10, rnd)

    braccio(cx - largh // 2, cy - largh // 2, largh, largh)         # incrocio
    if n: braccio(cx - largh // 2, 0, largh, cy)
    if s: braccio(cx - largh // 2, cy, largh, 32 - cy)
    if w: braccio(0, cy - largh // 2, cx, largh)
    if e: braccio(cx, cy - largh // 2, 32 - cx, largh)
    if not (n or s or e or w):
        c.disco(16, 16, 6, corpo); c.anello(16, 16, 6, bordo)

    # bordi chiari lungo i lati liberi
    x0, y0, x1, y1 = cx - largh // 2, cy - largh // 2, cx + largh // 2 - 1, cy + largh // 2 - 1
    if not n: c.hline(x0, y0, largh, luce)
    if not s: c.hline(x0, y1, largh, bordo)
    if not w: c.vline(x0, y0, largh, luce)
    if not e: c.vline(x1, y0, largh, bordo)
    for i in range(4):                                              # giunti fra le lastre
        if e or w: c.p(6 + i * 7, cy, bordo)
        if n or s: c.p(cx, 6 + i * 7, bordo)
