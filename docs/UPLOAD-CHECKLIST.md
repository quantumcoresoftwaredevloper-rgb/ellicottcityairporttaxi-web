# Upload checklist — do these in order

Written for someone doing this for the first time. Tick each box.

**Your two files:**

| What | Where it is on your Mac | Size |
|---|---|---|
| Website | `PROJECTS/QCS/ellicot-web/client/dist-interserver.zip` | 7.4 MB |
| Backend | `PROJECTS/QCS/ellicot-web/server/server-upload.tar.gz` | 112 KB |

---

## Part 1 — Upload the website (you can do this right now)

Do this in your browser. No technical knowledge needed.

1. Open your cPanel -> **File Manager**.
   Your link is `https://webhosting3008.is.cc:2083` -- sign in, then click
   **File Manager**.

2. Double-click the **`public_html`** folder to open it.

3. Click **Settings** (top-right) and tick **"Show hidden files"**.
   You need this, or a file starting with a dot will not appear.

4. Click **Upload**, then **Browse**, and choose:
   `PROJECTS/QCS/ellicot-web/client/dist-interserver.zip`
   Wait for the upload to finish (it is 7.4 MB).

5. Go back to `public_html`. You will see `dist-interserver.zip`.
   **Right-click it -> Extract.**

6. In the extract dialog, make sure it extracts **directly into `public_html`**
   (not into a new `dist-interserver` sub-folder).

### Check Part 1 worked

In `public_html` you should now see, in the same view:

- `index.html`  <- a FILE
- `.htaccess`   <- also a file (hidden, so only visible with step 3)
- `assets`      <- a folder
- `images`      <- a folder

> **If `index.html` is missing, you extracted one level too deep.** Open the
> folder it created, select everything inside, and use **Move** to move it up
> into `public_html`.

> **About `.htaccess`:** cPanel will not let you *upload* a file whose name
> starts with a dot. That is not a problem here -- `.htaccess` is already inside
> the zip, so extracting the zip places it for you. You only need "Show hidden
> files" (step 3) to *see* it and confirm it arrived.

**Your website is now live** at your domain -- the design, images and phone number
all work. What does **not** work yet is sign-in and booking, because the
backend is not on the server. That is Part 2.

---

## Part 2 — Upload the backend (needs SSH)

### First: check which kind of hosting you have

In cPanel, search for **"Setup Node.js App"**.

- **Found it** -> you can run the backend here. Continue below.
- **Not found** -> you are on shared hosting, which cannot run a database. Tell
  me and we will change the plan.

### 2a. Connect to the server

If you have a **VPS**, you need root SSH access -- the cPanel file manager alone
cannot do this part. In cPanel look for **"Terminal"** or **"SSH Access"**;
otherwise use an SSH app (Termius on your phone, or Terminal on your Mac).

### 2b. Upload the backend file

Using the same File Manager, go **up one level** from `public_html` (to the home
folder). Upload `PROJECTS/QCS/ellicot-web/server/server-upload.tar.gz` there.

### 2c. Set up the server

If you have Terminal open, paste these one at a time:

```bash
mkdir -p ~/ellicott && cd ~/ellicott
tar -xzf ~/server-upload.tar.gz && cd server
npm install --omit=dev
```

### 2d. Tell the app the secret settings

```bash
cp .env.example .env
nano .env
```

In `nano`, find these four lines and change them:

```
NODE_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017/ellicottaxi
JWT_ACCESS_SECRET=PASTE_A_RANDOM_SECRET_HERE
CLIENT_ORIGIN=https://ellicottcityairporttaxi.com
```

To make a random secret, open a **second** terminal and run:

```bash
openssl rand -hex 32
```

Copy what it prints and paste it after `JWT_ACCESS_SECRET=`.

**Save** in nano with `Ctrl + O` then `Enter`. **Exit** with `Ctrl + X`.

> The app will refuse to start until `JWT_ACCESS_SECRET` is at least 32
> characters. That is intentional -- it is a security check, not an error.

### 2e. Install the database (VPS only, one time)

```bash
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

Then load the starter data:

```bash
npm run seed
```

### 2f. Start the backend and keep it running

```bash
npm install -g pm2
pm2 start app.js --name ellicott-api
pm2 save
```

---

## Part 3 — Connect the website to the backend

This is the step that makes sign-in work.

The website calls `/api` on your own domain. So all you need is for something to
answer `/api` and forward it to the backend.

**If you are on a VPS with cPanel**, open `.htaccess` in `public_html` and add
these three lines **at the very top**, immediately after the `RewriteEngine On`
line and **above** the `# --- SPA history fallback ---` section:

```apache
# Send API calls to the backend BEFORE the SPA fallback sees them.
# Placement matters: any rule added below the SPA section never runs, because
# that section already rewrites everything unknown to /index.html. If you get
# this wrong, sign-in silently receives HTML instead of JSON.
RewriteRule ^api/(.*)$ http://127.0.0.1:5001/api/$1 [P,L]
```

Save the file. **Ask me to do this step for you** if you are unsure -- a wrong
`.htaccess` can take the whole site down.

**Check it worked.** In your browser, open this exact address:

```
https://ellicottcityairporttaxi.com/api/health
```

You should see a small JSON reply. If you see the website's HTML page instead,
the rule is in the wrong place.

---

## Part 4 — Test it

In your browser, on your real domain:

| Test | Should show |
|---|---|
| Open your domain | The homepage with the blue design and world map |
| Click **Fleet** in the menu | Nine cars **with photos and descriptions** |
| **Refresh** on that Fleet page | Still there (proves the `.htaccess`) |
| Click **Sign in** | Login box |
| Try to sign in | Works |
| Open **Contact** | Phone shows `410-365-5556` |

---

## If something breaks

| What you see | What it means | Fix |
|---|---|---|
| Blank white page | Files extracted one level too deep | Move everything up into `public_html` |
| Home works, other pages 404 | `.htaccess` missing or hidden files off | Re-upload it; turn on "Show hidden files" |
| No logos or pictures | `images`/`assets` folders missing | They must sit next to `index.html` |
| Home works, Sign in fails | Backend not running | `pm2 list` in Terminal -- check it says `online` |
| "Refusing to start" message | Secret too short | Redo 2d with a 32+ character secret |
| Page loads but data is missing | `/api` not connected | Part 3 was not done |

---

## One thing to remember

You are uploading the **website** from your Mac's zip file, but the **backend**
runs on the server permanently. Any future change you make on your Mac has to be
rebuilt and re-uploaded, or the live site keeps showing the old version.
