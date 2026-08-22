"""Celle di terreno: opache, 32x32 logici, tre varianti per tipo."""
import random
from pixel import *


def _fondo(c, base, chiaro, scuro, rnd, densita=0.16):
    c.rect(0, 0, 32, 32, base)
    c.rumore(0, 0, 32, 32, [chiaro, scuro], densita, rnd)


def cenere(c, seme):
    rnd = random.Random(seme)
    _fondo(c, (46, 52, 42), (58, 64, 52), (36, 42, 33), rnd, 0.18)
    for _ in range(3):                                     # cumuli di cenere
        x, y = rnd.randrange(2, 26), rnd.randrange(2, 26)
        c.disco(x, y, rnd.randrange(2, 4), (54, 60, 48))
    for _ in range(6):
        c.p(rnd.randrange(32), rnd.randrange(32), (66, 72, 58))


def polvere(c, seme):
    rnd = random.Random(seme + 40)
    _fondo(c, (62, 54, 42), (76, 66, 50), (48, 42, 33), rnd, 0.20)
    for _ in range(4):                                     # dune sottili
        y = rnd.randrange(4, 28); x = rnd.randrange(0, 20)
        c.hline(x, y, rnd.randrange(6, 12), (84, 72, 54))
        c.hline(x, y + 1, rnd.randrange(4, 10), (54, 46, 36))


def macerie(c, seme):
    rnd = random.Random(seme + 80)
    _fondo(c, (58, 54, 46), (72, 66, 56), (42, 40, 34), rnd, 0.22)
    for _ in range(7):                                     # blocchi di cemento
        x, y = rnd.randrange(0, 26), rnd.randrange(0, 26)
        w, h = rnd.randrange(4, 9), rnd.randrange(3, 7)
        c.rect(x, y, w, h, METAL[1]); c.hline(x, y, w, METAL[2])
        c.bordo(x, y, w, h, (34, 38, 30))
    for _ in range(5):                                     # tondini arrugginiti
        x, y = rnd.randrange(2, 28), rnd.randrange(2, 28)
        if rnd.random() < 0.5: c.hline(x, y, rnd.randrange(3, 7), RUST[2])
        else: c.vline(x, y, rnd.randrange(3, 7), RUST[2])
    for _ in range(10):
        c.p(rnd.randrange(32), rnd.randrange(32), RUST[3])


def cratere(c, seme):
    rnd = random.Random(seme + 120)
    _fondo(c, (50, 50, 42), (62, 62, 52), (38, 38, 32), rnd, 0.14)
    cx, cy = 16, 16
    c.disco(cx, cy, 13, (46, 46, 38))                      # conca
    c.disco(cx, cy, 9, (40, 40, 33))
    c.disco(cx, cy, 5, (35, 35, 29))
    c.anello(cx, cy, 13, (70, 70, 58))                     # bordo illuminato
    c.anello(cx, cy, 9, (56, 56, 46))
    for _ in range(8):
        a = rnd.random() * 6.28; r = 13 + rnd.random() * 3
        import math
        c.p(cx + int(r * math.cos(a)), cy + int(r * math.sin(a)), (78, 78, 64))


def pozza(c, seme):
    rnd = random.Random(seme + 160)
    _fondo(c, (46, 52, 34), (58, 64, 42), (36, 42, 28), rnd, 0.14)
    c.disco(16, 16, 14, (34, 46, 24))                      # liquido
    c.disco(16, 16, 12, TOX[0])
    c.disco(15, 15, 8, TOX[1])
    c.anello(16, 16, 14, TOX[2])
    for _ in range(4):                                     # increspature
        x, y, r = rnd.randrange(8, 24), rnd.randrange(8, 24), rnd.randrange(2, 5)
        c.anello(x, y, r, TOX[2], 130)
    for _ in range(6):
        c.p(rnd.randrange(6, 26), rnd.randrange(6, 26), TOX[3])


def sperone(c, seme):
    rnd = random.Random(seme + 200)
    _fondo(c, (52, 52, 46), (64, 64, 56), (40, 40, 36), rnd, 0.16)
    for _ in range(3):                                     # guglie di roccia
        bx = rnd.randrange(3, 20); bh = rnd.randrange(12, 24); bw = rnd.randrange(7, 12)
        for j in range(bh):
            w = max(1, bw - (j * bw) // bh)
            x = bx + (bw - w) // 2
            c.rect(x, 28 - j, w, 1, (96, 96, 86) if j > bh * 0.6 else (74, 74, 66))
        c.vline(bx + bw // 2, 28 - bh, bh, (118, 118, 106))
        c.rect(bx, 27, bw, 2, (40, 40, 36))
    c.retino(0, 26, 32, 4, (34, 34, 30), 2, 90)


def calda(c, seme):
    rnd = random.Random(seme + 240)
    _fondo(c, (62, 48, 40), (78, 60, 48), (46, 36, 30), rnd, 0.18)
    for _ in range(4):                                     # crepe incandescenti
        x, y = rnd.randrange(2, 28), rnd.randrange(2, 28)
        for k in range(rnd.randrange(5, 11)):
            c.p(x, y, RED[3] if k % 2 else ENER[2])
            c.p(x, y + 1, RED[1])
            x += rnd.choice((-1, 0, 1, 1)); y += rnd.choice((-1, 0, 1))
    for _ in range(5):
        c.p(rnd.randrange(32), rnd.randrange(32), ENER[3])
    for _ in range(26):                                    # calore diffuso, non tratteggio
        c.p(rnd.randrange(32), rnd.randrange(32), RED[2], 70)


TIPI = {'ash': cenere, 'dust': polvere, 'rubble': macerie, 'crater': cratere,
        'pool': pozza, 'rock': sperone, 'hot': calda}
