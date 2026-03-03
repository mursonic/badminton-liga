# 🏸 ATSV Badminton Liga

Eine moderne Web-App zur Verwaltung einer Badminton-Vereinsliga. Spielergebnisse erfassen, Ranglisten auswerten, Statistiken einsehen – alles in einem eleganten, dunklen Design.

> **Vibecoded in Hamburg with ♥ using [Manus](https://manus.im/invitation/LLRJFW1UPCDV)**

---

## Screenshots

### Dashboard (öffentliche Ansicht)
![Dashboard](https://d2xsxph8kpxj0f.cloudfront.net/310519663195374720/h7akdMQBXfjVMZA72Nx9AF/screenshot_dashboard_7d4f2a1c.png)

### Einzelrangliste mit Podium
![Einzelrangliste](https://d2xsxph8kpxj0f.cloudfront.net/310519663195374720/h7akdMQBXfjVMZA72Nx9AF/screenshot_ranking_9b6b4e99.png)

### Admin-Ansicht: Spiel erfassen
![Spiel erfassen](https://d2xsxph8kpxj0f.cloudfront.net/310519663195374720/h7akdMQBXfjVMZA72Nx9AF/screenshot_new_match_52b4f487.png)

### Admin-Dashboard (eingeloggt)
![Admin-Ansicht](https://d2xsxph8kpxj0f.cloudfront.net/310519663195374720/h7akdMQBXfjVMZA72Nx9AF/screenshot_admin_c4e50c2c.png)

---

## Was kann die App?

Die **ATSV Badminton Liga** ist eine vollständige Liga-Verwaltungssoftware für Badminton-Vereine. Sie richtet sich an Vereinsadmins, die Spielergebnisse digital erfassen und auswerten möchten, sowie an alle Vereinsmitglieder, die jederzeit den aktuellen Tabellenstand einsehen wollen – ohne sich einloggen zu müssen.

### Öffentliche Funktionen (kein Login erforderlich)

| Bereich | Beschreibung |
|---|---|
| **Dashboard** | Übersicht der aktiven Saison: Spieleranzahl, gespielte Spiele, Top-Spieler und letzte Ergebnisse |
| **Einzelrangliste** | Punktetabelle aller Spieler mit Podium (Gold/Silber/Bronze), Siege/Niederlagen und Ratio |
| **Paarungsrangliste** | Rangliste aller Doppel- und Mixed-Paarungen |
| **Alle Spiele** | Chronologische Übersicht aller Spiele mit Satzständen, filterbar nach Saison und Spielmodus |
| **Statistiken** | Langzeit-Auswertungen: erfolgreichste Spieler und Paarungen über alle Saisons |

### Admin-Funktionen (Login erforderlich)

| Bereich | Beschreibung |
|---|---|
| **Spiel erfassen** | Einzel, Doppel oder Mixed eintragen – mit beliebig vielen Sätzen und Satzständen |
| **Spiel bearbeiten** | Nachträgliche Korrektur von Spielständen |
| **Spielerverwaltung** | Spieler anlegen, bearbeiten (Name, Geschlecht) und löschen |
| **Saisonverwaltung** | Jahres-Saisons erstellen, umbenennen und löschen |
| **Passwort ändern** | Admin-Passwort sicher aktualisieren |

### Punktesystem

Das Punktesystem folgt dem klassischen Liga-Modell:

- **3 Punkte** für einen Sieg
- **1 Punkt** für eine Niederlage
- **Ratio** (Punkte erzielt / Punkte kassiert) als Tiebreaker

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4 |
| **Backend** | Node.js, Express, tRPC 11 |
| **Datenbank** | MySQL (via Drizzle ORM) |
| **Auth** | JWT-basiertes Passwort-Login (bcrypt) |
| **Design** | Dunkles Theme, Playfair Display / Inter, Gold-Akzente |

---

## Installation (Self-Hosting)

### Voraussetzungen

- Node.js ≥ 18
- pnpm (`npm install -g pnpm`)
- MySQL-Datenbank (lokal oder remote)

### 1. Repository klonen

```bash
git clone https://github.com/mursonic/badminton-liga.git
cd badminton-liga
```

### 2. Abhängigkeiten installieren

```bash
pnpm install
```

### 3. Umgebungsvariablen konfigurieren

Erstelle eine `.env`-Datei im Projektverzeichnis:

```env
DATABASE_URL=mysql://user:password@localhost:3306/badminton_liga
JWT_SECRET=dein-geheimer-schluessel-hier
```

### 4. Datenbank migrieren

```bash
pnpm db:push
```

Dieser Befehl erstellt alle benötigten Tabellen in der MySQL-Datenbank.

### 5. Admin-Benutzer anlegen

Nach der Migration einmalig den ersten Admin-User in der Datenbank anlegen:

```bash
# Mit MySQL-Client verbinden und ausführen:
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2b$10$...');  # bcrypt-Hash deines Passworts
```

Alternativ: Die App im Entwicklungsmodus starten – beim ersten Start wird automatisch ein Admin-User mit `admin/admin` angelegt, den du anschließend über die Oberfläche ändern kannst.

### 6. App starten

**Entwicklungsmodus:**
```bash
pnpm dev
```

**Produktionsmodus:**
```bash
pnpm build
pnpm start
```

Die App ist dann unter `http://localhost:3000` erreichbar.

---

## Deployment mit nginx (Produktiv-Server)

Beispielkonfiguration für nginx als Reverse Proxy:

```nginx
server {
    listen 80;
    server_name deine-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Für HTTPS empfiehlt sich [Certbot](https://certbot.eff.org/) mit Let's Encrypt.

### Systemd-Service (Auto-Start)

Erstelle `/etc/systemd/system/badminton-liga.service`:

```ini
[Unit]
Description=ATSV Badminton Liga
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/badminton-liga
ExecStart=/usr/bin/node dist/server/_core/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable badminton-liga
sudo systemctl start badminton-liga
```

---

## Erster Login

Nach dem Start die App im Browser öffnen und auf **„Admin-Anmeldung"** klicken:

- **Benutzername:** `admin`
- **Passwort:** `admin`

> ⚠️ **Wichtig:** Das Passwort unbedingt nach dem ersten Login unter *Verwaltung → Passwort ändern* auf ein sicheres Passwort setzen!

---

## Lizenz

MIT License – frei verwendbar und anpassbar.

---

## Credits

Vibecoded in Hamburg with ♥ using **[Manus](https://manus.im/invitation/LLRJFW1UPCDV)** – dem autonomen KI-Agenten, der diese App von Grund auf entwickelt hat.
