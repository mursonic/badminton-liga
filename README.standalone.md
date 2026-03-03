# ATSV Badminton Liga – Installationsanleitung (Standalone)

Diese Anleitung beschreibt die Installation der App auf einem eigenen Linux-Webserver **ohne externe Datenbankabhängigkeiten**. Die App verwendet **SQLite** als lokale Datenbankdatei.

---

## Voraussetzungen

| Komponente | Mindestversion |
|---|---|
| Node.js | 22.x |
| pnpm | 10.x |
| Linux (Ubuntu 22.04 empfohlen) | – |

```bash
# Node.js 22 installieren (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm installieren
npm install -g pnpm
```

---

## Installation

### 1. Quellcode auf den Server übertragen

```bash
# Option A: Git (empfohlen)
git clone <dein-repository-url> /opt/atsv-badminton
cd /opt/atsv-badminton

# Option B: ZIP-Archiv hochladen und entpacken
unzip atsv-badminton.zip -d /opt/atsv-badminton
cd /opt/atsv-badminton
```

### 2. Abhängigkeiten installieren

```bash
pnpm install
```

### 3. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
nano .env
```

Inhalt der `.env`-Datei:

```env
# Pflichtfeld: Geheimschlüssel für JWT-Session-Tokens (beliebige lange Zeichenkette)
JWT_SECRET=dein-geheimer-schluessel-mindestens-32-zeichen

# Optional: Pfad zur SQLite-Datenbankdatei (Standard: ./data/liga.db)
DATABASE_URL=file:./data/liga.db
```

> **Wichtig:** `JWT_SECRET` muss ein langer, zufälliger String sein. Generiere ihn z.B. mit:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4. Datenbank initialisieren

```bash
# Datenbankverzeichnis anlegen
mkdir -p data

# Tabellen erstellen
pnpm db:push
```

### 5. App bauen

```bash
pnpm build
```

### 6. App starten

```bash
pnpm start
```

Die App läuft jetzt auf Port **3000**. Beim ersten Aufruf wirst du aufgefordert, ein Admin-Konto anzulegen.

---

## Dauerhafter Betrieb mit systemd

Damit die App nach einem Neustart automatisch startet:

```bash
sudo nano /etc/systemd/system/atsv-badminton.service
```

```ini
[Unit]
Description=ATSV Badminton Liga
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/atsv-badminton
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/atsv-badminton/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable atsv-badminton
sudo systemctl start atsv-badminton
sudo systemctl status atsv-badminton
```

---

## Reverse Proxy mit nginx (empfohlen)

Damit die App unter Port 80/443 erreichbar ist:

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/atsv-badminton
```

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

```bash
sudo ln -s /etc/nginx/sites-available/atsv-badminton /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS mit Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d deine-domain.de
```

---

## Backup

Die gesamte Datenbank liegt in einer einzigen Datei:

```bash
# Backup erstellen
cp /opt/atsv-badminton/data/liga.db /backup/liga-$(date +%Y%m%d).db

# Automatisches tägliches Backup (crontab)
0 2 * * * cp /opt/atsv-badminton/data/liga.db /backup/liga-$(date +\%Y\%m\%d).db
```

---

## Erster Start – Admin-Konto anlegen

Beim ersten Aufruf der App erscheint eine **Setup-Seite**, auf der du Benutzername und Passwort für den Administrator festlegst. Danach ist die Einrichtung abgeschlossen.

---

## Updates

```bash
cd /opt/atsv-badminton
git pull                    # Neuesten Code laden
pnpm install                # Abhängigkeiten aktualisieren
pnpm db:push                # Datenbankschema aktualisieren
pnpm build                  # App neu bauen
sudo systemctl restart atsv-badminton
```
