/**
 * Structure de la base : copie exacte des ordres CREATE de master.db
 * (tables, triggers), sans la table historique « catalogues » que l'appli
 * desktop ignore déjà. Une base créée ici s'ouvre donc dans l'appli Python,
 * et inversement.
 */
import { CEPAGES_DEFAUT } from '@/domain/cepages'

export const ORDRES_CREATE: readonly string[] = [
  `CREATE TABLE vignerons (
    id_vigneron     INTEGER PRIMARY KEY AUTOINCREMENT,
    prenom          TEXT,
    nom             TEXT NOT NULL,
    adresse         TEXT,
    cp              TEXT,
    departement     TEXT,
    region          TEXT,
    pays            TEXT
, ville TEXT, mail TEXT)`,

  `CREATE TABLE vins (
    id_vin          INTEGER PRIMARY KEY AUTOINCREMENT,
    id_vigneron     INTEGER REFERENCES vignerons(id_vigneron) ON DELETE RESTRICT,
    domaine         TEXT NOT NULL,
    cepage          TEXT,
    millesime       INTEGER,
    appellation     TEXT,
    couleur         TEXT,
    volume_alcool   REAL,
    format          TEXT
, cru TEXT, cuvee TEXT, prix REAL)`,

  `CREATE TABLE avis (
    id_avis         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_vin          INTEGER NOT NULL REFERENCES vins(id_vin) ON DELETE CASCADE,
    note            REAL,
    categorie       TEXT
)`,

  `CREATE TABLE stock (
    id_stock        INTEGER PRIMARY KEY AUTOINCREMENT,
    id_vin          INTEGER NOT NULL UNIQUE REFERENCES vins(id_vin) ON DELETE CASCADE,
    quantite        INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0)
)`,

  `CREATE TABLE mouvements_stock (
    id_mouv             INTEGER PRIMARY KEY AUTOINCREMENT,
    id_vin              INTEGER NOT NULL REFERENCES vins(id_vin) ON DELETE CASCADE,
    type_mouvement      TEXT NOT NULL CHECK (type_mouvement IN ('entrée', 'sortie')),
    quantite_mouvement  INTEGER NOT NULL CHECK (quantite_mouvement > 0),
    date_mouvement      TEXT NOT NULL
)`,

  `CREATE TABLE cepages (id_cepage INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL UNIQUE, type TEXT)`,

  `CREATE TRIGGER trg_vin_init_stock
AFTER INSERT ON vins
BEGIN
    INSERT INTO stock (id_vin, quantite) VALUES (NEW.id_vin, 0);
END`,

  `CREATE TRIGGER trg_mouv_maj_stock
AFTER INSERT ON mouvements_stock
BEGIN
    UPDATE stock
    SET quantite = quantite + CASE NEW.type_mouvement
                                  WHEN 'entrée' THEN NEW.quantite_mouvement
                                  ELSE -NEW.quantite_mouvement
                              END
    WHERE id_vin = NEW.id_vin;
END`,
]

/** Tables sans lesquelles un fichier importé n'est pas une cave. */
export const TABLES_REQUISES = ['vins', 'vignerons', 'avis', 'stock', 'mouvements_stock'] as const

/** Colonnes que l'appli ajoute elle-même si une ancienne base ne les a pas. */
export const COLONNES_AJOUTEES: readonly [string, string, string][] = [
  ['vins', 'cuvee', 'TEXT'],
  ['vins', 'cru', 'TEXT'],
  ['vins', 'prix', 'REAL'],
  ['vignerons', 'ville', 'TEXT'],
  ['vignerons', 'mail', 'TEXT'],
]

/** Cépages pré-remplis dans une base neuve : [nom, type]. */
export const CEPAGES_INITIAUX: readonly [string, string][] = Object.entries(CEPAGES_DEFAUT).flatMap(
  ([type, noms]) => noms.map((nom): [string, string] => [nom, type]),
)
