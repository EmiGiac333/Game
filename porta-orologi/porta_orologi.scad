// =====================================================================
//  PORTA OROLOGI "WORLD TIME" - stile Wall Street
//  Modello parametrico OpenSCAD per stampa 3D
//
//  Struttura modulare: 1 modulo = 1 orologio. I moduli si affiancano e
//  si uniscono con viti M3 attraverso le pareti laterali, cosi' ogni pezzo
//  entra in un piatto di stampa standard (220 x 220 mm).
//
//  Dimensionato per inserti al quarzo "fit-up" da 90 mm
//  (foro di montaggio 78 mm, profondita' corpo ~15 mm).
//  Se compri inserti diversi cambia solo i parametri qui sotto.
//
//  Uso:  part = "modulo" | "targhetta" | "assemblato"
//        es. openscad -D 'part="targhetta"' -D 'citta="TOKYO"' -o tokyo.stl porta_orologi.scad
// =====================================================================

/* [Cosa generare] */
part  = "assemblato";   // [modulo, targhetta, assemblato]
citta = "NEW YORK";      // testo della targhetta (solo per part="targhetta")

/* [Inserto orologio] */
foro_orologio   = 78;    // diametro del foro richiesto dall'inserto (mm)
gioco_foro      = 0.4;   // tolleranza: aumenta se entra troppo stretto
diam_cornice    = 90;    // diametro esterno della cornice dell'inserto
prof_corpo      = 15;    // profondita' del corpo dietro la cornice

/* [Modulo] */
larghezza  = 115;   // passo tra un orologio e l'altro
altezza    = 150;   // altezza totale del pannello
profondita = 25;    // spessore totale (deve essere > prof_corpo + 3)
sp_fronte  = 4;     // spessore pannello frontale
sp_pareti  = 3;     // spessore pareti perimetrali
margine_sup = 57.5; // distanza bordo superiore -> centro orologio

/* [Targhetta citta'] */
targa_l    = 90;    // lunghezza targhetta
targa_h    = 18;    // altezza targhetta
targa_sp   = 2.4;   // spessore base targhetta
sede_prof  = 1.6;   // profondita' della sede nel pannello
testo_h    = 8;     // altezza caratteri
testo_rilievo = 0.8;
font       = "Liberation Sans:style=Bold";
dist_targa = 15;    // distanza bordo inferiore cornice -> centro targhetta

/* [Unione e fissaggio] */
foro_vite     = 3.4;  // M3 passante
foro_dado     = 6.6;  // dado M3 (esagono, tra gli spigoli)
smusso        = 1.2;  // smusso bordi frontali sopra/sotto

/* [Anteprima assemblato] */
n_orologi = 4;
nomi = ["NEW YORK", "LONDON", "TOKYO", "SYDNEY"];

$fn = 120;
eps = 0.01;

cy = altezza - margine_sup;                      // centro orologio (y)
ty = cy - diam_cornice/2 - dist_targa;           // centro targhetta (y)

// ---------------------------------------------------------------------
// Corpo esterno con smusso sui bordi frontali superiore/inferiore
module guscio() {
    hull() {
        translate([0, smusso, 0]) cube([larghezza, altezza - 2*smusso, eps]);
        translate([0, 0, smusso]) cube([larghezza, altezza, profondita - smusso]);
    }
}

// Pareti + fronte (scatola aperta sul retro)
module scatola() {
    difference() {
        guscio();
        translate([sp_pareti, sp_pareti, sp_fronte])
            cube([larghezza - 2*sp_pareti, altezza - 2*sp_pareti, profondita]);
    }
}

// Manicotto che guida e sostiene il corpo dell'inserto
module manicotto() {
    r_in = (foro_orologio + gioco_foro)/2;
    translate([larghezza/2, cy, 0])
        difference() {
            cylinder(r = r_in + 2.4, h = min(prof_corpo + 2, profondita - 2));
            translate([0,0,-eps]) cylinder(r = r_in, h = profondita);
        }
}

// Blocchetto con asola a buco di serratura per appendere a una vite
module blocco_aggancio(x, y) {
    translate([x - 9, y - 12, 0]) cube([18, 24, profondita]);
}
module asola_aggancio(x, y) {
    // collo stretto (testa vite scorre dietro) + cavita' per la testa
    translate([x, y, profondita - 2 - eps]) {
        hull() { cylinder(d = 4.6, h = 3); translate([0, -8, 0]) cylinder(d = 4.6, h = 3); }
        translate([0, -8, 0]) cylinder(d = 9.5, h = 3);
    }
    translate([x, y, profondita - 6.5]) {
        hull() { cylinder(d = 9.5, h = 4.5 + eps); translate([0, -8, 0]) cylinder(d = 9.5, h = 4.5 + eps); }
    }
}

// Rinforzi orizzontali sotto/sopra il manicotto
module nervature() {
    for (yy = [cy - foro_orologio/2 - 8, altezza - sp_pareti - 6])
        translate([sp_pareti, yy, 0]) cube([larghezza - 2*sp_pareti, 2.4, 10]);
}

// Fori laterali per viti M3 di unione (2 per lato), con boccola
pos_viti = [[altezza*0.25], [altezza*0.8]];
module boccole_viti() {
    for (p = pos_viti)
        for (x = [sp_pareti - eps, larghezza - sp_pareti - 6 + eps])
            translate([x, p[0] - 6, 0]) cube([6, 12, profondita/2 + 6]);
}
module fori_viti() {
    for (p = pos_viti) {
        for (x = [-1, larghezza - sp_pareti - 6 - 1])
            translate([x, p[0], profondita/2]) rotate([0, 90, 0]) cylinder(d = foro_vite, h = sp_pareti + 6 + 2, $fn = 32);
        // sede esagonale per dado sul lato destro
        translate([larghezza - sp_pareti - 6 - eps, p[0], profondita/2])
            rotate([0, 90, 0]) cylinder(d = foro_dado, h = 3, $fn = 6);
    }
}

module modulo() {
    r_in = (foro_orologio + gioco_foro)/2;
    difference() {
        union() {
            scatola();
            manicotto();
            difference() { nervature(); translate([larghezza/2, cy, -1]) cylinder(r = r_in + 1, h = 20); }
            for (x = [14, larghezza - 14]) blocco_aggancio(x, altezza - 20);
            boccole_viti();
        }
        // foro orologio passante
        translate([larghezza/2, cy, -1]) cylinder(r = r_in, h = profondita + 2);
        // sede targhetta (incassata nel fronte)
        translate([larghezza/2 - (targa_l + 0.6)/2, ty - (targa_h + 0.6)/2, -eps])
            cube([targa_l + 0.6, targa_h + 0.6, sede_prof]);
        for (x = [14, larghezza - 14]) asola_aggancio(x, altezza - 14);
        fori_viti();
    }
}

module targhetta(testo) {
    color("black") cube([targa_l, targa_h, targa_sp]);
    color("white") translate([targa_l/2, targa_h/2, targa_sp - eps])
        linear_extrude(testo_rilievo)
            text(testo, size = testo_h, font = font, halign = "center", valign = "center");
}

// Disco che simula l'inserto (solo anteprima)
module finto_orologio() {
    color("silver") cylinder(d = diam_cornice, h = 3);
    color("black") translate([0,0,3]) cylinder(d = diam_cornice - 8, h = 0.4);
    color("white") for (a = [0:30:330]) rotate(a) translate([diam_cornice/2 - 9, 0, 3.6]) cube([6, 1.6, 0.4], center = true);
    color("white") { translate([0,0,3.6]) rotate(60) translate([0,-1.5,0]) cube([22,3,0.4]);
                     translate([0,0,3.8]) rotate(-30) translate([0,-1,0]) cube([32,2,0.4]); }
}

if (part == "modulo") {
    modulo();                       // stampa col fronte appoggiato al piatto
} else if (part == "targhetta") {
    targhetta(citta);
} else {
    // Anteprima: fronte del pannello a z=0, rivolto verso -z
    for (i = [0 : n_orologi - 1]) translate([i * larghezza, 0, 0]) {
        color("gainsboro") modulo();
        translate([larghezza/2, cy, 0]) mirror([0,0,1]) finto_orologio();
        translate([larghezza/2 + targa_l/2, ty - targa_h/2, sede_prof])
            mirror([1,0,0]) mirror([0,0,1]) targhetta(nomi[n_orologi - 1 - i]);
    }
}
