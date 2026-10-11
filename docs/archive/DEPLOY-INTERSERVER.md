# Deploying to Interserver

Your domain `ellicottcityairporttaxi.com` is on Interserver. This app is three
separate pieces, and Interserver treats them very differently:

| Piece | What it is | Where it can run |
|-------|-----------|-------------------|
| **Client** | React + Vite SPA — static files after a build | Interserver shared hosting ✅ |
| **API** | Express + Socket.io, needs a long-lived Node process | Shared hosting ⚠️ / VPS ✅ / Render ✅ |
| **Database** | MongoDB | **MongoDB Atlas** — shared hosting has no MongoDB |

Read [Decision](#decision) first; it determines which steps below you need.

---

## Decision

Your shared plan **can** run the whole stack, because the app degrades
gracefully without WebSockets — `RideTracking.jsx` polls the REST API every 2s
(and falls back to 15s), driver requests poll every 8s, and chat polls every 5s.
So if Socket.io drops, the app still works, just less instantly.

But there are real costs to the single-hosting path:

- **No root/SSH** → no PM2, no reverse proxy, no self-managed MongoDB.
- **Node apps get recycled** on shared hosting, which interrupts live tracking.
- **WebSockets through Passenger are unreliable** — this is the weak link for a
  taxi app whose core feature is live driver location.
- **MongoDB must be Atlas** (a separate free account), or a managed provider.

### Options

| Option | Cost | Live tracking | Effort | Notes |
|--------|------|----------------|--------|-------|
| **A. Client on Interserver + API on Render** | Free tier | ✅ Reliable | Lowest | Domain stays on Interserver. `VITE_API_URL` points at Render. **Recommended.** |
| **B. Everything on an Interserver VPS** | ~$10–20/mo | ✅ Reliable | High | One box, root, PM2 + Nginx + Atlas. Full control, you maintain it. |
| **C. Everything on shared hosting** | Cheapest | ⚠️ Degraded | Medium | Works, but live tracking will stutter. Only for low traffic. |

If you want the shortest path to a working live site, take **Option A**. The
client deploys to Interserver (where your domain already is), and the API runs
on Render's free tier with WebSockets that actually work.

---

## Option A — client on Interserver, API on Render

### 1. Deploy the API to Render

The repo has a ready blueprint:

- Render → **New** → **Blueprint** → pick this repo
- It reads `render.yaml` automatically
- Fill in the secrets it asks for:
  - `MONGO_URI` — a MongoDB **Atlas** connection string. Database name must stay
    `ellicottaxi`.
  - `JWT_ACCESS_SECRET` — generate with `openssl rand -hex 32`
  - `CLIENT_ORIGIN` — `https://ellicottcityairporttaxi.com`

Everything else is optional; the app boots without Stripe/Google/SMTP/Twilio
and those features simply degrade.

Wait for the deploy, then confirm `https://<service>.onrender.com/api/health`
returns `{"status":"ok"}`.

### 2. Build the client with the API URL

`VITE_API_URL` is inlined **at build time** — it cannot be changed on the
server afterwards.

```bash
cd client
./scripts/build-interserver.sh https://<service>.onrender.com
```

This writes `client/dist-interserver.zip`. The script refuses a missing,
malformed, or trailing-slash URL, and warns if the URL did not make it into the
bundle.

### 3. Upload to Interserver

1. cPanel → **File Manager** → `public_html`
2. Upload `dist-interserver.zip`, then **Extract** it
3. Verify `public_html/index.html` and `public_html/.htaccess` both exist

> `.htaccess` is already built into the zip. cPanel's File Manager hides
> dotfiles — if you extract and cannot see it, use "Settings → Show Hidden
> Files" in the top-right of File Manager.

### 4. HTTPS

- cPanel → **Security** → **SSL/TLS Status** → run Let's Encrypt for the domain
- cPanel → **Domains** → turn **Force HTTPS Redirect** on
- The `.htaccess` ships with the HTTPS-redirect block **commented out** on
  purpose. Uncomment it only after the certificate is live, or you will lock
  yourself out.

---

## Option B — everything on an Interserver VPS

Buy a VPS, then on the box:

```bash
# Node 20+ and MongoDB (or point MONGO_URI at Atlas instead)
git clone <your-repo> /opt/ellicott
cd /opt/ellicott

# API
cd server
npm ci --omit=dev
cat > .env <<'EOF'
NODE_ENV=production
PORT=3001
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<openssl rand -hex 32>
CLIENT_ORIGIN=https://ellicottcityairporttaxi.com
TRUST_PROXY=true
EXPOSE_DEV_TOKENS=false
EOF
```

Run it under systemd (not PM2 — no need for a process manager on a box you own):

```ini
# /etc/systemd/system/ellicott-api.service
[Unit]
Description=Ellicott Taxi API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/ellicott/server
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
User=www-data
EnvironmentFile=/opt/ellicott/server/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ellicott-api
```

Nginx terminates TLS and proxies `/api` and `/socket.io` to the app — the
WebSocket upgrade headers are required or Socket.io will fall back to polling:

```nginx
server {
  listen 443 ssl http2;
  server_name ellicottcityairporttaxi.com;

  ssl_certificate     /etc/letsencrypt/live/ellicottcityairporttaxi.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ellicottcityairporttaxi.com/privkey.pem;

  root /var/www/ellicott;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;   # SPA history fallback
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /socket.io/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # required for WebSockets
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 600s;
  }
}
```

Build the client against the **same** origin (the API is proxied under `/api`,
so the client needs no absolute URL):

```bash
cd client && ./scripts/build-interserver.sh https://ellicottcityairporttaxi.com
sudo rsync -a --delete dist/ /var/www/ellicott/
```

Then point DNS: an `A` record for `@` and `CNAME www` to the VPS IP.

> On Option B, `CLIENT_ORIGIN` is the same host, so CORS is same-origin and
> needs no special allowance.

---

## Option C — everything on shared hosting

The client steps are identical to Option A. For the API, use
cPanel → **Setup Node.js App**:

- Application root: `server`
- Application URL: `api.ellicottcityairporttaxi.com`
- Application startup file: `app.js` (see below — Passenger looks for this name)
- Mode: Production

Passenger needs a small `server/app.js` shim, because it requires a literal
`app.js` filename and a fixed listen port:

```js
// server/app.js  — Passenger entry point (ignored when running `npm start`)
import './src/index.js';
```

Add the same variables as the Render blueprint. Expect live tracking to be
intermittent; the REST polling fallback keeps the app usable.

---

## After any deploy

1. Confirm `https://ellicottcityairporttaxi.com` loads
2. Hard-refresh once — the old bundle is cached for a year, and `index.html`
   is what points at the new one
3. Sign in, book a test ride, and watch the driver marker move
4. Check the API logs on the host for `Server running on ...`

## Gotchas

- **`VITE_API_URL` is build-time only.** Changing the API host requires a
  rebuild + re-upload, not just a server restart.
- **Don't enable Force HTTPS before the certificate exists** — you will lock
  yourself out. The `.htaccess` block ships commented out for this reason.
- **Never set `EXPOSE_DEV_TOKENS=true` in production.** It returns live
  password-reset links and the SMS fallback code in API responses. The server
  refuses to boot if it is `true`.
- **The database name must stay `ellicottaxi`.** Pointing a second app at the
  same database previously leaked admin access across projects.
- **cPanel hides dotfiles in File Manager** — use "Show Hidden Files" to verify
  `.htaccess` actually uploaded.
