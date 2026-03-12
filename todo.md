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

## SQLite-Umbau (Standalone-Version)
- [x] SQLite-Abhängigkeiten installieren (@libsql/client)
- [x] Drizzle-Schema auf SQLite umstellen
- [x] Eigenes Passwort-Login implementieren (bcrypt + JWT, kein Manus OAuth)
- [x] DB-Helpers auf SQLite anpassen
- [x] Router: Auth-Prozeduren ersetzen
- [x] Frontend: Login-Seite bauen
- [x] Frontend: Auth-Hook anpassen
- [x] Installationsanleitung (README) erstellen

## Öffentliche Ansichten (kein Login erforderlich)
- [x] Backend: Ranglisten, Matches, Statistiken, Spieler, Saisons als publicProcedure freigeben
- [x] Frontend: DashboardLayout zeigt Navigation auch ohne Login
- [x] Frontend: Login nur für Admin-Seiten (Spieler verwalten, Saisons, Spiel erfassen)
- [x] Frontend: Login-Button in der Sidebar sichtbar wenn nicht eingeloggt
- [x] Frontend: Admin-Menüpunkte nur für eingeloggte Admins anzeigen

## Bugfixes Runde 2
- [x] Admin: Passwort ändern (neue Seite/Dialog in Einstellungen)
- [x] Spielstand bearbeiten (Sätze korrigieren nach Erfassung)
- [x] Geschlecht-Feld bei Spielern wieder einbauen
- [x] Medaillen-Farben korrigieren (Gold #FFD700, Silber #C0C0C0, Bronze #CD7F32)
- [x] Dashboard: "Spiele" → "Gewonnene Spiele"
- [x] Logo: Schwerter → Badmintonschläger (SVG)
- [x] Einzelrangliste Podium: Gold (Platz 1) und Silber (Platz 2) Farben vertauscht

## MySQL-Rückumstellung (Daten-Persistenz auf Manus)
- [x] Schema auf MySQL (mysql-core) umstellen
- [x] db.ts auf mysql2/drizzle umstellen, initDb entfernen
- [x] Auth: bcrypt-Login bleibt, aber MySQL statt SQLite
- [x] drizzle.config.ts auf MySQL zurückstellen
- [x] pnpm db:push Migration ausführen (manuelle SQL-Migration)
- [x] Tests anpassen und grün (8/8)
- [x] match_sets SQL-Fehler: setNumber-Spaltenname war falsch (set_number statt setNumber)
- [x] Spiele eintragen schlägt fehl (matches.create Fehler) - behoben: Admin-User fehlte, DB-Spalten nullable gemacht, insertId-Mapping korrigiert
- [x] Podium-Treppchen: Gold (Mitte) höchste Karte, Silber zweithöchst, Bronze am niedrigsten
- [x] Footer einbauen: "Vibecoded in Hamburg with <3. Tool: Manus. GitHub." mit Ref-Link und GitHub-Repo
- [x] GitHub README.md erstellen: Feature-Beschreibung, Screenshots, Installationsanleitung, Manus-Ref-Link

## Konsistenz-Prüfung
- [x] DB-Bereinigung: Veraltete Spalten aus matches entfernen (matchType, team1Player1Id, winner etc.)
- [x] DB-Bereinigung: Veraltete Spalten aus match_sets entfernen (team1Score, team2Score)
- [x] DB: match_sets.matchId -> match_id umbenennen (snake_case Konsistenz)
- [x] DB: matches.seasonId -> season_id umbenennen (snake_case Konsistenz)
- [x] Code: deletePlayer ohne Cascade auf matches absichern (Fehlermeldung bei Spieler mit Spielen)

## Neue Features (Runde 3)
- [x] Spieler-Detailseite: Profil, Spielhistorie, Statistiken, Head-to-Head
- [x] Backend: getPlayerDetail-Endpunkt (Matches, Wins, Losses, Ratio, Gegner)
- [x] Saison-Abschluss: Saison als "abgeschlossen" markieren (editierbar/wiederöffenbar)
- [x] Backend: seasons.close / seasons.reopen Prozeduren
- [x] Badminton-Validierung beim Spiel erfassen: gültige Satzergebnisse (21/30 Punkte, Einstand, Satzanzahl)
- [x] Responsive Ranglisten-Tabellen: mobile Ansicht für Einzelrangliste und Paarungsrangliste

## Neue Features (Runde 4)
- [x] Dashboard Home: Top-3-Paarungen-Widget neben Top-Spieler-Liste

## Neue Features (Runde 5)
- [x] Spiel-Bearbeitungsfunktion: Spiele aus der Spielliste heraus bearbeiten (Ergebnis, Spieler, Modus)
- [x] Spieler-Detailseite: Doppel- und Mixed-Spiele anzeigen (Tabs oder Abschnitte)
- [x] Paarungsrangliste: Medaillen für die Top-3 wie auf der Einzelspieler-Seite
