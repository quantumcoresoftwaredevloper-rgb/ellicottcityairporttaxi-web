# Deployment — Interserver VPS (self-hosted)

**This is the single source of truth for deploying this app.** The older
`DEPLOY-INTERSERVER.md`, `INTERSERVER_DEPLOYMENT_GUIDE.md` and
`INTERSERVER_SIMPLE_GUIDE.md` disagreed with each other and with the current
decision; they are archived in `docs/archive/` and should not be followed.

---

## The decision

Everything runs on **one Interserver VPS**. No Vercel, no Render, no MongoDB
Atlas. The client, the API and the database are all on that box.

Consequence you own: **backups are now your job.** There is no point-in-time
restore and no managed failover. See [Backups](#backups) — this is the single
most important part of running this yourself.

---

## Specification

**Ubuntu 24.04 LTS · 4 slices · $12/mo · 2 cores · 8 GB RAM · 160 GB SSD**

| Slice count | $/mo | RAM | Verdict |
|---|---|---|---|
| 2 | $6 | 4 GB | **No** — `npm ci` OOMs, no headroom |
| **4** | **$12** | **8 GB** | **Recommended for production** |
| 6 | $18 | 12 GB | Comfortable |
| 8 | $24 | 16 GB | Add this if you also run CI/staging; where managed support starts |

Interserver adds slices without a reinstall, so start at 4.

**Why 24.04 and not 25.04:**

- **25.04 is End of Life** (17 Jan 2026). It was a 9-month interim release, never
  LTS, and has had no security patches for months.
- **MongoDB Server only supports Ubuntu 22.04 LTS and 24.04 LTS.** Their policy:
  *"If you upgrade the host operating system to a version not listed above after
  installing MongoDB, the resulting configuration is unsupported."* Ubuntu 26.04
  LTS exists and is newer, but MongoDB does not support it yet.

**Why RAM is the constraint, not CPU.** Storage and CPU are idle for this app —
ride creation is *outbound* HTTP (2× geocode + OSRM routing), so it is I/O wait,
not compute. Measured document sizes: Ride = 3.2 KB, User = 1.0 KB, so five years
of data is roughly 300 MB against a 160 GB disk.

What competes for RAM is MongoDB's WiredTiger cache (defaults to **50% of
RAM − 1 GB**, i.e. 3.5 GB on an 8 GB box) versus the Node heap. You must cap
both, or Mongo starves Node. That is step 6 below.

**Versions:** MongoDB **8.0** (8.0 over 9.0 — 9.0 is newer but 8.0 is the
battle-tested major for a first production deploy), Node **20 or 22 LTS**.

---

## 1. Build the upload artifacts

Do this from a clean checkout on your machine.

```bash
# gates — all must pass before you ship
cd server && npm test && cd ..
cd client && npm test && npm run check:catalog && npm run check:contrast && cd ..

# client (static files) -> client/dist-interserver.zip
cd client && ./scripts/build-interserver.sh --same-origin && cd ..

# API (source + prod deps, no tests, no secrets) -> server/server-upload.tar.gz
cd server && ./scripts/package-server.sh && cd ..
```

`--same-origin` leaves `VITE_API_URL` empty so the client calls `/api` on its own
domain and Nginx proxies it to Node. One origin means **no CORS configuration at
all**, and it sidesteps the `VITE_API_URL` trap that currently leaves the Vercel
deploy unable to log in.

If your API must live on its own subdomain instead, build with an explicit
origin — that is the one case where `CLIENT_ORIGIN` and CORS apply:

```bash
./scripts/build-interserver.sh https://api.ellicottcityairporttaxi.com
```

**`VITE_API_URL` is inlined at build time.** Changing the API host means
rebuilding and re-uploading. It cannot be set on the server.

---

## 2. Upload via the cPanel file manager

Your control panel is at `https://webhosting3008.is.cc:2083` (the
`/cpsess…/frontend/jupiter/filemanager/` path is cPanel's File Manager).

1. Open **File Manager → `public_html`**
2. **Upload →** `client/dist-interserver.zip`
3. **Select the zip → Extract** → extract into `public_html`, overwriting
4. Confirm all three of these landed:
   - `public_html/index.html`
   - `public_html/.htaccess`  ← the SPA fallback; without it every deep link 404s
   - `public_html/assets/` and `public_html/images/`

Do **not** extract the zip into a nested folder. If cPanel creates
`public_html/dist-interserver/`, move its contents up one level.

---

## 3. Prepare the OS

Over SSH as root:

```bash
apt update && apt upgrade -y
apt install -y nginx git curl ufw fail2ban unattended-upgrades mongosh

# Node 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

timedatectl set-timezone America/New_York
```

## 4. Firewall and SSH hardening

```bash
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
systemctl enable --now fail2ban unattended-upgrades
```

Then **disable password login** once your key works — do not lock yourself out:

```
# /etc/ssh/sshd_config.d/99-hardening.conf
PasswordAuthentication no
PermitRootLogin prohibit-password
```

```bash
sshd -t && systemctl reload ssh
```

> The root password previously pasted in chat should be **rotated now**.

## 5. MongoDB

Install MongoDB 8.0 for Noble (24.04) from MongoDB's own repo, then:

```bash
systemctl enable --now mongod
```

**Bound the cache.** This is the line that stops Mongo eating the box:

```yaml
# /etc/mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      wiredTigerCacheSizeGB: 2      # NOT the 3.5 GB default on an 8 GB box
systemLog:
  destination: file
  path: /var/log/mongod/mongod.log
```

Create the database and a dedicated user — do **not** run the app as root:

```javascript
db.createUser({ user: "ellicott", pwd: "<strong password>", roles: [{ role: "readWrite", db: "ellicottaxi" }] })
```

`MONGO_URI=mongodb://ellicott:<password>@127.0.0.1:27017/ellicottaxi`

## 6. The API

```bash
mkdir -p /opt/ellicot && cd /opt/ellicot
tar -xzf server-upload.tar.gz && cd server
npm ci --omit=dev
cp .env.example .env && chmod 600 .env && nano .env
```

The values `assertEnv()` requires (it **refuses to boot** without them):

```ini
NODE_ENV=production
MONGO_URI=mongodb://ellicott:<password>@127.0.0.1:27017/ellicottaxi
JWT_ACCESS_SECRET=<openssl rand -hex 32>      # 32+ chars, not a placeholder
CLIENT_ORIGIN=https://ellicottcityairporttaxi.com   # ONE origin, no comma
TRUST_PROXY=true
```

`CLIENT_ORIGIN` is also the base URL for verification and reset-password emails,
so it must stay a single origin. Extra frontends go in `CORS_ORIGINS`, comma
separated.

Optional keys: `REDIS_URL`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID/SECRET`,
`FACEBOOK_APP_ID/SECRET`, `SMTP_*`, `TWILIO_*`, `VAPID_*`.

**PM2 with the Node heap bounded:**

```bash
npm i -g pm2
pm2 start app.js --name ellicott-api --max-old-space-size=1024
pm2 save && pm2 startup
```

`app.js` is the Passenger/Cpanel entry shim that imports `src/index.js`; on a VPS
PM2 can run either.

## 7. Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name ellicottcityairporttaxi.com www.ellicottcityairporttaxi.com;
    ssl_certificate     /etc/letsencrypt/live/ellicottcityairporttaxi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ellicottcityairporttaxi.com/privkey.pem;

    root /var/www/html;
    index index.html;

    # the SPA — the client calls /api on this same origin
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io — live driver location
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;     # long-lived driver connections
    }

    client_max_body_size 5M;         # avatar + verification uploads
}
```

`X-Forwarded-For` is required because `TRUST_PROXY=true`; without it every
request appears to come from the proxy and the rate limiter treats all users as
one IP.

Get the certificate with `certbot --nginx -d ellicottcityairporttaxi.com`, then
force the HTTP→HTTPS redirect.

---

## 8. Seed (optional, first run)

```bash
cd /opt/ellicot/server && npm run seed
```

Seeded drivers are created `verificationStatus: 'verified'` and can go online
immediately. `server/tests/seed.test.js` asserts exactly this — do not remove
the field without running that test.

---

## Verify before you call it done

```bash
curl -s http://127.0.0.1:5001/api/health
curl -s https://ellicottcityairporttaxi.com/api/health      # through Nginx
curl -s https://ellicottcityairporttaxi.com/api/fleet | head -c 200
```

Then, in a browser:

| Check | Expected |
|---|---|
| `/` and `/fleet` load | photos, taglines, feature lists all present |
| `/fleet` deep link | reloads directly — proves `.htaccess` |
| Sign in, book a ride | works end to end |
| Driver goes online | allowed (seeded drivers are verified) |
| Two browsers, one booking | live driver marker moves |
| Phone number | `410-365-5556` everywhere, no parentheses |

---

## Backups

Non-negotiable now that the database lives on the box you also rent.

`/usr/local/bin/backup-mongo.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DEST=/var/backups/ellicott
STAMP=$(date +%F-%H%M)
mkdir -p "$DEST"
mongodump --uri="mongodb://ellicott:<password>@127.0.0.1:27017/ellicottaxi" \
  --archive="$DEST/ellicottaxi-$STAMP.gz" --gzip
# ship OFFSITE — a backup on the same box is not a backup
rclone copy "$DEST/ellicottaxi-$STAMP.gz" remote:ellicott-backups/
find "$DEST" -name 'ellicottaxi-*.gz' -mtime +14 -delete
```

```bash
chmod +x /usr/local/bin/backup-mongo.sh
# crontab -e
17 3 * * * /usr/local/bin/backup-mongo.sh >> /var/log/ellicott-backup.log 2>&1
```

**Restore drill** (do this once, before you need it):

```bash
mongorestore --uri="mongodb://ellicott:<password>@127.0.0.1:27017/ellicottaxi" \
  --archive=/var/backups/ellicott/ellicottaxi-YYYY-MM-DD-HHMM.gz --gzip --drop
```

Also back up `/opt/ellicot/server/.env` and the Nginx site config.

---

## Scaling

**Socket.io has no Redis adapter**, so you are running a **single Node process**.
You cannot add a second Node worker or a second box without first adding the
Redis adapter *and* sticky sessions. Your growth path is vertical: add slices.

Rough trigger points:

| Signal | Action |
|---|---|
| Node RSS consistently > 1.5 GB | 6 slices (12 GB) |
| Mongo working set > cache | raise `wiredTigerCacheSizeGB`, then add a slice |
| CPU saturated on ride create | add the Redis adapter, then scale horizontally |
| `pm2` restarts often | check for OOM: `journalctl -u mongod` |

---

## Rollback

```bash
cd /opt/ellicot/server
cp dist-interserver.zip /tmp/          # keep the previous one before uploading
# cPanel: re-upload the old zip and extract over public_html
pm2 restart ellicott-api
# if the database is implicated, restore from the most recent dump
```

---

## Common problems

| Symptom | Cause |
|---|---|
| Every deep link 404s | `.htaccess` missing, or extracted into a subfolder |
| Marketing pages fine, login fails | `VITE_API_URL` empty **and** no `/api` proxy in Nginx |
| "MONGO_URI still points at localhost in production" | `assertEnv()` doing its job — use the real URI |
| Rate limiter blocks everyone | `X-Forwarded-For` not set alongside `TRUST_PROXY=true` |
| Live tracking stutters | `/socket.io/` missing `Upgrade`/`Connection` headers |
| App crashes after a few hours | Mongo cache + Node heap fighting; cap both |
| `npm ci` killed | 8 GB is the floor; nothing else will fit the install |