# Tischtennis Liga – TODO

## Datenbank & Backend
- [x] Schema: Tabellen für players, seasons, matches, match_sets
- [x] Schema-Migration durchführen (pnpm db:push)
- [x] DB-Helpers: Spieler CRUD, Saison CRUD, Match CRUD
- [x] tRPC Router: players (list, create, update, delete)
- [x] tRPC Router: seasons (list, create, current)
- [x] tRPC Router: matches (list, create, delete, getById)
- [x] tRPC Router: rankings (playerRanking, pairRanking)
- [x] tRPC Router: stats (topPlayers, topPairs, allTime)

## Frontend – Layout & Design
- [x] Design-System: Farben, Typografie, CSS-Variablen (elegant, dunkel)
- [x] DashboardLayout mit Sidebar-Navigation anpassen
- [x] App.tsx: Routen für alle Seiten registrieren

## Frontend – Admin-Interface
- [x] Seite: Spielerverwaltung (Liste, Hinzufügen, Bearbeiten, Löschen)
- [x] Seite: Saisonverwaltung (Jahres-Saisons anlegen/wechseln)
- [x] Seite: Spielerfassung (Einzel, Doppel, Mixed mit Sätzen)

## Frontend – Öffentliche Ansichten
- [x] Seite: Einzelrangliste (Punkte + Torverhältnis, nach Saison filterbar)
- [x] Seite: Paarungsrangliste (Doppel/Mixed, nach Saison filterbar)
- [x] Seite: Spielübersicht (alle Spiele, Filter nach Saison & Modus)
- [x] Seite: Statistiken (erfolgreichste Spieler & Paarungen über Zeit)
- [x] Seite: Dashboard/Home (Übersicht aktuelle Saison)

## Tests & Deployment
- [x] Vitest: Tests für Rankings-Berechnung
- [x] Vitest: Tests für Match-Erstellung
- [x] Checkpoint speichern

## Bugfixes
- [x] seasons.active Query gibt undefined zurück (muss null sein) → React Query Fehler auf /matches/new
- [x] App-Namen auf "ATSV Badminton Liga" ändern (alle UI-Texte, Titel, Konfiguration)
- [x] Saisons bearbeiten: Name ändern und Saison löschen
