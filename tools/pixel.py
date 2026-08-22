"""NEXUS-7 :: motore di disegno per pixel art.

L'arte e' autorata a 32 px logici per cella di mappa e poi ingrandita
per interi (nearest neighbour) fino alla dimensione di esportazione:
una struttura 1x1 esce a 512x512, una 2x2 a 1024x1024, e cosi' via.
512 e' un multiplo esatto di 32, quindi il gioco puo' rimpicciolire
gli sprite a 64, 32, 16 e 8 px per cella senza mai perdere un pixel.
"""
import zlib, struct, random

TILE = 32          # px logici per cella di mappa
SCALE = 16         # fattore di esportazione: 32 * 16 = 512

# ---------------------------------------------------------------- palette
DARK   = (11, 13, 10);   SHADOW = (22, 26, 18);   NIGHT  = (30, 36, 26)
METAL  = [(42,48,38), (74,83,68), (110,120,100), (154,168,144), (201,214,192)]
RUST   = [(58,36,22), (107,74,42), (138,95,56), (181,138,90), (217,180,131)]
ENER   = [(74,58,16), (122,100,32), (201,162,39), (240,201,74), (255,232,154)]
WAT    = [(18,42,54), (30,74,90), (45,127,150), (79,168,192), (143,216,232)]
VEG    = [(26,46,26), (42,74,42), (63,107,52), (110,194,110), (168,220,149)]
DAT    = [(26,40,74), (34,64,107), (63,111,168), (125,184,255), (184,218,255)]
TOX    = [(40,58,20), (63,90,30), (107,154,42), (143,209,79), (196,232,138)]
RED    = [(58,26,22), (90,36,32), (138,58,48), (224,92,77), (255,157,143)]
PUR    = [(46,26,46), (74,42,72), (122,74,118), (197,138,192), (232,189,228)]
SAND   = [(46,40,30), (74,64,46), (107,92,66), (140,122,90), (176,156,120)]


class Canvas(object):
    """Griglia di pixel RGBA in coordinate logiche."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[(0, 0, 0, 0)] * w for _ in range(h)]

    # ---- primitive ----
    def p(self, x, y, c, a=255):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            if len(c) > 3: a = c[3]        # colore gia' con alfa: rispettalo
            self.px[y][x] = (c[0], c[1], c[2], a)

    def rect(self, x, y, w, h, c, a=255):
        for j in range(int(h)):
            for i in range(int(w)):
                self.p(x + i, y + j, c, a)

    def bordo(self, x, y, w, h, c, a=255):
        for i in range(int(w)):
            self.p(x + i, y, c, a); self.p(x + i, y + h - 1, c, a)
        for j in range(int(h)):
            self.p(x, y + j, c, a); self.p(x + w - 1, y + j, c, a)

    def hline(self, x, y, w, c, a=255):
        for i in range(int(w)): self.p(x + i, y, c, a)

    def vline(self, x, y, h, c, a=255):
        for j in range(int(h)): self.p(x, y + j, c, a)

    def line(self, x0, y0, x1, y1, c, a=255):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.p(x0, y0, c, a)
            if x0 == x1 and y0 == y1: break
            e2 = 2 * err
            if e2 >= dy: err += dy; x0 += sx
            if e2 <= dx: err += dx; y0 += sy

    def disco(self, cx, cy, r, c, a=255):
        for j in range(int(cy - r), int(cy + r + 1)):
            for i in range(int(cx - r), int(cx + r + 1)):
                if (i - cx) ** 2 + (j - cy) ** 2 <= r * r: self.p(i, j, c, a)

    def anello(self, cx, cy, r, c, a=255):
        for j in range(int(cy - r), int(cy + r + 1)):
            for i in range(int(cx - r), int(cx + r + 1)):
                d = (i - cx) ** 2 + (j - cy) ** 2
                if (r - 0.8) ** 2 <= d <= (r + 0.4) ** 2: self.p(i, j, c, a)

    def retino(self, x, y, w, h, c, passo=2, a=255):
        """Mezzatinta a scacchiera: sfuma senza uscire dalla palette."""
        for j in range(int(h)):
            for i in range(int(w)):
                if (i + j) % passo == 0: self.p(x + i, y + j, c, a)

    def rumore(self, x, y, w, h, colori, densita, rnd):
        for j in range(int(h)):
            for i in range(int(w)):
                if rnd.random() < densita: self.p(x + i, y + j, rnd.choice(colori))

    # ---- blocchi compositi ----
    def blocco(self, x, y, w, h, pal, tetto=4):
        """Volume in vista dall'alto a tre quarti: tetto, facciata, spigoli."""
        self.rect(x, y, w, tetto, pal[3])                  # tetto illuminato
        self.rect(x, y + tetto, w, h - tetto, pal[2])      # facciata
        self.rect(x + w - 2, y + tetto, 2, h - tetto, pal[1])   # lato in ombra
        self.hline(x, y + tetto, w, pal[4])                # bordo del tetto
        self.bordo(x, y, w, h, pal[0])
        self.rect(x, y + h - 1, w, 1, DARK)

    def ombra(self, x, y, w, h):
        """Ombra portata: ellisse morbida, non una banda a scacchiera."""
        cx, cy = x + w / 2.0, y + h / 2.0
        rx, ry = w / 2.0, h / 2.0
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)):
                d = ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2
                if d <= 0.45:
                    self.p(i, j, DARK, 96)
                elif d <= 1.0 and (i + j) % 2 == 0:
                    self.p(i, j, DARK, 64)

    def finestre(self, x, y, w, h, passo, col, dw=2, dh=2):
        j = 0
        while j + dh <= h:
            i = 0
            while i + dw <= w:
                self.rect(x + i, y + j, dw, dh, col)
                i += dw + passo
            j += dh + passo


# ---------------------------------------------------------------- PNG
def salva(canvas, percorso, scale=SCALE):
    """Esporta ingrandendo per interi: i pixel restano quadrati e netti."""
    w, h = canvas.w * scale, canvas.h * scale
    righe = bytearray()
    for y in range(h):
        righe.append(0)
        sorgente = canvas.px[y // scale]
        for x in range(w):
            r, g, b, a = sorgente[x // scale]
            righe += bytes((r, g, b, a))

    def blocco(tipo, dati):
        c = tipo + dati
        return struct.pack('>I', len(dati)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    png = (b'\x89PNG\r\n\x1a\n'
           + blocco(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
           + blocco(b'IDAT', zlib.compress(bytes(righe), 9))
           + blocco(b'IEND', b''))
    with open(percorso, 'wb') as f:
        f.write(png)
    return len(png)
