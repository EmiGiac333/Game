"""Sprite delle strutture su piu' celle. 32 px logici per cella."""
import random
from pixel import *


# ============================================================ 2x1 (64x32)
def idroponica(c):
    c.ombra(3, 25, 58, 6)
    c.rect(3, 23, 58, 6, METAL[1]); c.hline(3, 23, 58, METAL[3])
    for j in range(11):                                     # tetto a volta
        w = 54 - j * 2
        c.rect(5 + j, 22 - j, w, 1, WAT[1] if j % 2 else WAT[0])
    c.bordo(5, 12, 54, 12, METAL[2])
    for i in range(7):                                      # montanti
        c.vline(9 + i * 7, 13, 10, METAL[3])
    for r in range(3):                                      # filari di colture
        y = 15 + r * 3
        for i in range(12):
            c.p(8 + i * 4, y, VEG[3]); c.p(9 + i * 4, y, VEG[4])
            c.p(8 + i * 4, y + 1, VEG[2])
    c.rect(6, 8, 6, 4, ENER[3]); c.rect(52, 8, 6, 4, ENER[3])   # lampade
    c.retino(6, 6, 52, 2, ENER[4], 3, 70)
    c.rect(28, 24, 8, 5, METAL[0]); c.rect(29, 25, 6, 3, METAL[2])


def fonderia(c):
    c.ombra(2, 25, 60, 6)
    c.rect(2, 24, 60, 6, METAL[0])
    c.blocco(6, 12, 52, 14, RUST, tetto=4)
    for cx in (14, 26):                                     # ciminiere
        c.rect(cx, 2, 7, 12, METAL[2]); c.rect(cx, 2, 2, 12, METAL[3])
        c.rect(cx - 1, 1, 9, 2, METAL[1])
        c.retino(cx - 2, -2, 11, 4, METAL[3], 3, 80)
    c.rect(38, 16, 18, 9, DARK)                             # bocca di colata
    c.rect(39, 17, 16, 7, RED[1])
    c.rect(40, 19, 14, 4, RED[3]); c.rect(41, 20, 12, 2, ENER[3])
    c.hline(39, 24, 16, ENER[4])
    for i in range(5): c.p(42 + i * 3, 26, ENER[2])         # scintille
    c.rect(8, 18, 10, 6, METAL[0]); c.rect(9, 19, 8, 4, ENER[1])
    for i in range(9): c.vline(7 + i * 6, 12, 3, RUST[1])


def pozzo(c):
    c.ombra(4, 24, 56, 7)
    c.disco(46, 24, 11, WAT[0]); c.disco(46, 24, 9, WAT[1])  # pozza
    c.disco(45, 23, 5, WAT[2]); c.anello(46, 24, 9, TOX[1])
    c.rect(4, 22, 34, 7, METAL[1]); c.hline(4, 22, 34, METAL[3])
    for j in range(18):                                      # torre di trivellazione
        w = 22 - j
        x = 10 + j // 2
        c.p(x, 22 - j, METAL[3]); c.p(x + w, 22 - j, METAL[3])
        if j % 3 == 0: c.hline(x, 22 - j, w, METAL[2])
    c.line(11, 22, 32, 5, METAL[1]); c.line(32, 22, 11, 5, METAL[1])
    c.rect(19, 2, 6, 4, METAL[3]); c.rect(20, 6, 4, 16, METAL[2])
    c.rect(36, 16, 16, 3, METAL[2]); c.rect(36, 16, 16, 1, METAL[3])  # condotta
    c.rect(50, 17, 3, 6, METAL[1])
    c.p(50, 24, WAT[4]); c.p(51, 26, WAT[3])


def laboratorio(c):
    c.ombra(3, 25, 58, 6)
    c.rect(3, 24, 58, 5, METAL[0])
    c.blocco(5, 10, 54, 16, METAL, tetto=4)
    for j in range(7):                                       # cupola
        w = 16 - j * 2
        c.rect(12 + j, 10 - j, w, 1, DAT[1] if j % 2 else DAT[0])
    c.anello(20, 8, 8, DAT[2])
    c.rect(34, 4, 4, 7, METAL[2]); c.disco(36, 3, 2, DAT[3])
    for i in range(6):                                       # schermi
        c.rect(9 + i * 8, 16, 6, 5, DAT[0])
        c.rect(10 + i * 8, 17, 4, 3, DAT[2] if i % 2 else DAT[3])
    c.rect(24, 21, 12, 5, METAL[0]); c.rect(25, 22, 10, 3, DAT[1])
    c.hline(5, 14, 54, DAT[3])


def officina(c):
    c.ombra(2, 25, 60, 6)
    c.rect(2, 24, 60, 6, METAL[0])
    c.blocco(4, 11, 56, 15, METAL, tetto=4)
    c.rect(10, 15, 26, 11, DARK)                             # portellone aperto
    c.rect(11, 16, 24, 9, NIGHT)
    for i in range(6): c.vline(12 + i * 4, 16, 9, METAL[1])
    c.rect(12, 11, 22, 3, ENER[2]); c.rect(12, 11, 22, 1, ENER[4])
    for dx, dy in ((40, 6), (48, 9), (54, 5)):               # droni in volo
        c.rect(dx, dy, 5, 3, METAL[3]); c.rect(dx + 1, dy + 1, 3, 1, DAT[3])
        c.p(dx - 1, dy + 1, METAL[2]); c.p(dx + 5, dy + 1, METAL[2])
        c.retino(dx, dy + 4, 5, 2, DARK, 2, 60)
    c.rect(40, 16, 16, 9, RUST[1]); c.hline(40, 16, 16, RUST[3])
    for i in range(4): c.rect(41 + i * 4, 18, 3, 5, RUST[2])


def mercato(c):
    c.ombra(2, 25, 60, 6)
    c.rect(2, 25, 60, 4, SAND[1])
    for k, (x, pal) in enumerate(((4, RED), (24, ENER), (44, PUR))):   # tendoni
        for j in range(5):
            c.rect(x + j, 8 + j, 18 - j * 2, 1, pal[2] if j % 2 else pal[1])
        c.hline(x, 13, 18, pal[4])
        c.vline(x + 1, 13, 12, METAL[2]); c.vline(x + 16, 13, 12, METAL[2])
        for i in range(3):                                   # casse
            c.rect(x + 2 + i * 5, 19, 4, 6, RUST[2])
            c.hline(x + 2 + i * 5, 19, 4, RUST[3])
            c.bordo(x + 2 + i * 5, 19, 4, 6, RUST[0])
    c.rect(28, 2, 8, 5, ENER[2]); c.bordo(28, 2, 8, 5, DARK)
    c.rect(30, 3, 4, 3, DARK)


def medico(c):
    c.ombra(3, 25, 58, 6)
    c.rect(3, 24, 58, 5, METAL[0])
    c.blocco(5, 9, 54, 17, METAL, tetto=5)
    c.rect(24, 13, 16, 12, METAL[4])                         # croce
    c.rect(28, 11, 8, 16, RED[3]); c.rect(22, 17, 20, 4, RED[3])
    c.rect(29, 12, 6, 14, RED[4]); c.rect(23, 18, 18, 2, RED[4])
    for i in range(3):                                       # finestre
        c.rect(8 + i * 5, 15, 4, 4, WAT[2]); c.rect(8 + i * 5, 15, 4, 1, WAT[4])
        c.rect(45 + i * 5, 15, 4, 4, WAT[2]); c.rect(45 + i * 5, 15, 4, 1, WAT[4])
    c.rect(8, 21, 12, 5, METAL[1]); c.rect(44, 21, 12, 5, METAL[1])
    c.rect(30, 4, 4, 5, METAL[2]); c.disco(32, 3, 2, RED[3])


# ============================================================ 2x2 (64x64)
def nucleo(c):
    c.ombra(4, 48, 56, 14)
    for j in range(6):                                       # piedi di atterraggio
        c.line(12 - j, 58, 20, 44, METAL[1])
        c.line(52 + j, 58, 44, 44, METAL[1])
    c.rect(6, 56, 14, 4, METAL[0]); c.rect(44, 56, 14, 4, METAL[0])
    c.blocco(10, 24, 44, 30, METAL, tetto=6)                 # corpo
    for j in range(10):                                      # ogiva
        w = 40 - j * 3
        c.rect(32 - w // 2, 24 - j, w, 1, METAL[3] if j % 2 else METAL[2])
    c.bordo(10, 24, 44, 30, METAL[0])
    c.rect(14, 34, 36, 14, DARK)                             # sala comando
    c.rect(15, 35, 34, 12, NIGHT)
    for i in range(8):
        c.rect(16 + i * 4, 37, 3, 3, DAT[3] if i % 3 else ENER[3])
        c.rect(16 + i * 4, 42, 3, 3, DAT[2])
    c.disco(32, 20, 7, ENER[1]); c.disco(32, 20, 5, ENER[3]); c.disco(32, 20, 3, ENER[4])
    c.anello(32, 20, 8, METAL[3])
    c.rect(30, 2, 4, 12, METAL[2]); c.rect(30, 2, 1, 12, METAL[4])   # antenna
    c.p(32, 1, ENER[4])
    for i in range(4): c.rect(12 + i * 12, 50, 8, 4, ENER[2])
    c.retino(8, 58, 48, 4, ENER[1], 3, 70)


def reattore(c):
    c.ombra(4, 46, 56, 14)
    c.rect(6, 46, 52, 12, METAL[0]); c.hline(6, 46, 52, METAL[2])
    c.disco(32, 30, 22, METAL[1])                            # toroide
    c.disco(32, 30, 19, METAL[2])
    c.anello(32, 30, 22, METAL[3]); c.anello(32, 30, 19, METAL[0])
    c.disco(32, 30, 13, ENER[0]); c.disco(32, 30, 10, ENER[2])
    c.disco(32, 30, 6, ENER[3]); c.disco(32, 30, 3, ENER[4])
    c.anello(32, 30, 16, ENER[1])
    for a in range(8):                                       # bobine
        import math
        ang = a * math.pi / 4
        x = 32 + int(19 * math.cos(ang)); y = 30 + int(19 * math.sin(ang))
        c.rect(x - 3, y - 3, 6, 6, METAL[3]); c.bordo(x - 3, y - 3, 6, 6, METAL[0])
    for tx in (8, 48):                                       # torri di raffreddamento
        c.rect(tx, 12, 8, 34, METAL[2]); c.rect(tx, 12, 2, 34, METAL[3])
        c.rect(tx - 1, 10, 10, 3, METAL[1])
        c.retino(tx - 2, 4, 12, 6, METAL[3], 3, 70)
    c.rect(26, 56, 12, 6, METAL[1]); c.rect(27, 57, 10, 4, ENER[2])


def arcologia(c):
    c.ombra(6, 50, 52, 12)
    c.rect(6, 52, 52, 8, METAL[0]); c.hline(6, 52, 52, METAL[2])
    livelli = ((10, 40, 44, 12), (14, 28, 36, 12), (18, 16, 28, 12), (23, 6, 18, 10))
    for (x, y, w, h) in livelli:                             # terrazze a gradoni
        c.blocco(x, y, w, h, PUR, tetto=3)
        for i in range((w - 4) // 5):                        # finestre
            c.rect(x + 3 + i * 5, y + 5, 3, 4, ENER[3] if (i + y) % 3 else DAT[3])
        c.hline(x, y + h - 1, w, VEG[2])                     # verde pensile
        for i in range(0, w, 4):
            c.p(x + i, y + h - 2, VEG[3]); c.p(x + i + 1, y + h - 2, VEG[4])
    c.rect(30, 0, 4, 7, METAL[2]); c.p(32, 0, RED[3])
    c.rect(26, 52, 12, 8, DARK); c.rect(27, 53, 10, 6, METAL[1])
    c.rect(29, 55, 6, 4, ENER[2])


def rigeneratore(c):
    c.ombra(5, 48, 54, 13)
    c.rect(5, 48, 54, 11, METAL[0]); c.hline(5, 48, 54, METAL[2])
    c.blocco(10, 26, 44, 24, TOX, tetto=5)                   # corpo scrubber
    for j in range(4):
        c.hline(10, 32 + j * 4, 44, TOX[0]); c.hline(10, 33 + j * 4, 44, TOX[3])
    c.disco(32, 20, 12, METAL[1])                            # ventola
    c.disco(32, 20, 10, METAL[0])
    import math
    for a in range(6):
        ang = a * math.pi / 3
        c.line(32, 20, 32 + int(9 * math.cos(ang)), 20 + int(9 * math.sin(ang)), METAL[3])
    c.disco(32, 20, 3, METAL[4]); c.anello(32, 20, 12, METAL[3])
    for r, al in ((16, 90), (20, 60), (24, 40)):             # anelli di vapore
        c.anello(32, 18, r, TOX[4], al)
    for sx in (6, 52):
        c.rect(sx, 30, 6, 20, METAL[2]); c.rect(sx, 30, 2, 20, METAL[3])
    c.rect(24, 50, 16, 8, METAL[1]); c.rect(26, 52, 12, 4, TOX[3])


# ============================================================ 3x2 (96x64)
def spazioporto(c):
    rnd = random.Random(11)
    c.ombra(4, 46, 88, 16)
    c.rect(4, 44, 88, 16, METAL[0])                          # piazzale
    c.rect(6, 46, 84, 12, SAND[1])
    c.rumore(6, 46, 84, 12, [SAND[0], SAND[2]], 0.14, rnd)
    for i in range(7):                                       # strisce di sicurezza
        c.line(10 + i * 12, 57, 16 + i * 12, 47, ENER[3])
        c.line(11 + i * 12, 57, 17 + i * 12, 47, DARK)
    c.disco(48, 50, 20, METAL[1]); c.anello(48, 50, 20, ENER[2])
    c.anello(48, 50, 16, METAL[3])
    # razzo
    c.rect(43, 14, 10, 34, METAL[3])
    c.rect(43, 14, 3, 34, METAL[4]); c.rect(51, 14, 2, 34, METAL[1])
    for j in range(8):                                       # ogiva
        w = 10 - j
        c.rect(48 - w // 2, 14 - j, w, 1, RED[3] if j < 4 else METAL[4])
    c.rect(41, 38, 3, 10, METAL[2]); c.rect(52, 38, 3, 10, METAL[2])   # pinne
    c.line(41, 48, 38, 48, METAL[1]); c.line(55, 48, 58, 48, METAL[1])
    c.rect(44, 24, 8, 4, DAT[0]); c.rect(45, 25, 6, 2, DAT[3])
    c.rect(44, 32, 8, 3, RED[2])
    # torre di servizio
    for j in range(36):
        c.p(26, 46 - j, METAL[2]); c.p(34, 46 - j, METAL[2])
        if j % 4 == 0: c.hline(26, 46 - j, 9, METAL[1])
    c.rect(24, 8, 13, 4, METAL[3])
    c.rect(35, 20, 8, 3, METAL[2]); c.rect(35, 30, 8, 3, METAL[2])     # bracci
    c.rect(20, 30, 6, 16, METAL[1])
    # serbatoi
    for tx in (66, 78):
        c.rect(tx, 26, 10, 20, METAL[2]); c.rect(tx, 26, 3, 20, METAL[3])
        c.rect(tx - 1, 24, 12, 3, METAL[1]); c.hline(tx, 34, 10, ENER[2])
    c.rect(64, 46, 26, 3, METAL[1])
    c.rect(4, 24, 14, 22, METAL[2]); c.blocco(4, 24, 14, 22, METAL, tetto=4)   # controllo
    for i in range(3): c.rect(6 + i * 4, 30, 3, 4, DAT[3])
    c.retino(40, 50, 16, 12, ENER[3], 2, 90)                 # bagliore alla base
    c.retino(38, 56, 20, 6, RED[2], 3, 70)


def centro(c):
    """Centro spedizioni: rimessa aperta, mezzo pronto, sala mappe."""
    c.ombra(2, 25, 60, 6)
    c.rect(2, 24, 60, 6, METAL[0])
    c.blocco(4, 11, 34, 15, RUST, tetto=4)                   # rimessa
    c.rect(8, 15, 26, 11, DARK)                              # portellone aperto
    c.rect(9, 16, 24, 9, NIGHT)
    c.rect(9, 11, 24, 3, ENER[2]); c.rect(9, 11, 24, 1, ENER[4])
    # mezzo cingolato pronto a partire
    c.rect(12, 18, 18, 6, METAL[2]); c.hline(12, 18, 18, METAL[3])
    c.rect(14, 15, 8, 4, METAL[3]); c.rect(15, 16, 5, 2, WAT[3])
    c.rect(11, 24, 20, 3, METAL[0])
    for i in range(5): c.rect(12 + i * 4, 25, 2, 2, METAL[2])
    c.rect(28, 16, 4, 3, ENER[3])                            # fari
    # sala mappe con tabellone e antenna
    c.blocco(40, 14, 20, 12, METAL, tetto=3)
    c.rect(43, 18, 14, 7, DAT[0]); c.bordo(43, 18, 14, 7, METAL[1])
    for i in range(4):                                        # rotte tracciate
        c.line(44 + i * 3, 24, 46 + i * 4, 19, DAT[3])
        c.p(46 + i * 4, 19, ENER[3])
    c.vline(50, 6, 9, METAL[3]); c.vline(51, 6, 9, METAL[1])
    c.line(50, 6, 46, 10, METAL[2]); c.line(51, 6, 55, 10, METAL[2])
    c.p(50, 5, ENER[4])
    c.rect(38, 20, 3, 6, RUST[2])                            # casse pronte
    c.rect(37, 22, 2, 4, RUST[3])
