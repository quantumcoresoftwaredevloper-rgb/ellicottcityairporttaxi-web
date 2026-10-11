# Interserver support ticket — paste everything below into the ticket body

---

## SUBJECT

`ellicottcityairporttaxi.com` — every static file returns HTTP 500 with an empty body; requests are being diverted into a crashing PHP handler

---

## 1. SUMMARY

The domain `ellicottcityairporttaxi.com` returns **HTTP 500 with a completely empty response body (0 bytes)** for every static file I place in the document root. Only two pre-existing files on the same account serve correctly.

The site was **already returning 500 before I made any changes**, so this is not something my deployment introduced.

My working theory is that **PHP is failing on this account**: the failing responses carry `X-Powered-By: PHP/8.1.34`, while the two working files do not — so the failing requests are reaching PHP, and PHP is dying with errors suppressed (`display_errors` is off, hence the empty body). The two files that work are being served directly by LiteSpeed without PHP ever being invoked.

I need help confirming that and getting the vhost serving static files normally.

---

## 2. EVIDENCE

### Files that serve correctly (served directly by LiteSpeed — no `x-powered-by`)

```
GET /robots.txt                      -> 200   content-type: text/plain
GET /googlebffcbf76070b0706.html     -> 200   content-type: text/html
```

Both include `Last-Modified`, `Content-Length` and `Accept-Ranges` — normal static responses.

### Files that exist on disk but return 500 (routed into PHP, which crashes)

```
GET /                                -> 500   x-powered-by: PHP/8.1.34
GET /index.html                      -> 500   x-powered-by: PHP/8.1.34
GET /sw.js                           -> 500   x-powered-by: PHP/8.1.34
GET /logo.png                        -> 500   x-powered-by: PHP/8.1.34
GET /assets/index-BwbYas9M.css       -> 500   x-powered-by: PHP/8.1.34
GET /images/logo-full.png            -> 500   x-powered-by: PHP/8.1.34
GET /ellicott-website.zip            -> 500   x-powered-by: PHP/8.1.34
```

### Full response headers for a failing request

```
HTTP/1.1 500 Internal Server Error
X-Powered-By: PHP/8.1.34
Content-Type: text/html; charset=UTF-8
Server: LiteSpeed
alt-svc: h3=":443"; ma=2592000, h3-29=":443"; ma=2592000
```

Note what is **absent** from a failing response compared with a working one:
no `Last-Modified`, no `Content-Length`, no `Accept-Ranges`. The request never
reaches LiteSpeed's static file handler at all.

The response body is **0 bytes** in every case.

---

## 3. WHAT I HAVE ALREADY RULED OUT

I want to save you time re-testing these:

- **Not `.htaccess`.** I renamed `public_html/.htaccess` away entirely and the 500 persisted unchanged. I then replaced it with a minimal `.htaccess` containing only an SPA fallback. Same result.
- **Not file ownership.** Verified from the shell: `stat -c '%U %G %a %n' /home/hightech/public_html/index.html` returns `hightech hightech 644` — correctly owned by the account user.
- **Not disk space.** `df -h /home/hightech` shows 9.9 TB total, 8.7 TB used, **702 GB available**. (93% is the shared filesystem as a whole, not this account.)
- **Not the account as a whole.** The other roughly 40 domains on `/home/hightech` serve normally, so the account, disk and the LiteSpeed installation are broadly healthy. Only this domain is affected.
- **Not a browser, DNS or HTTP-version issue.** Reproducible with `curl` over both HTTP/1.1 and HTTP/2, on the apex and on `www`, and from multiple networks.
- **Not a caching artefact.** Cache-busting query strings (`/index.html?x=1`) return the identical 500, so the response is not being served from LiteSpeed's cache.
- **Not file permissions.** Files are `0644`, folders `0755`. The two working files are `0555`/`0755`, but both sets are world-readable.
- **`quota` is not installed** on this account, so there is no per-account quota to be at.

---

## 4. ENVIRONMENT

- cPanel user: `/home/hightech`
- Document root: `/home/hightech/public_html`
- Web server: **LiteSpeed**
- PHP: **8.1.34**
- Domain: `ellicottcityairporttaxi.com`, SSL active (Let's Encrypt)
- Shared account hosting approximately 40 domains; only this one is affected
- The document root still contains artefacts from a previous WordPress install on this same domain (a `wp-admin` and `wp-content` directory), which I am happy to remove once the 500 is resolved

---

## 5. WHAT I SUSPECT, IN PRIORITY ORDER

1. **PHP is broken for this account.** The single strongest signal is that every 500 carries `X-Powered-By: PHP/8.1.34` and every 200 does not. If a trivial `php -r 'echo 2+2;'` fails, that confirms it — a corrupted extension, a broken `php.ini`, or a LiteSpeed/PHP handler mismatch would all produce exactly this silent-failure pattern.
2. **A stale or orphaned handler/rewrite rule on this vhost**, left over from the previous WordPress install on the same domain, routing static requests into PHP.
3. **A `.htaccess` in the parent directory** `/home/hightech/` that applies to `public_html` and triggers the PHP fallback. I have not yet been able to read that file.
4. **A LiteSpeed handler cache** that needs purging after files were replaced in the document root.

---

## 6. WHAT WOULD HELP MOST

1. **The actual error behind the 500.** Please check the LiteSpeed error log, and if necessary temporarily enable `display_errors` for this domain so a failing request reports why. With `display_errors` off the body is empty and I have nothing to work from.
2. **Confirmation that PHP executes at all** on this account — e.g. the output of `php -r 'echo "ok";'` and `php -m`.
3. **Confirmation of the vhost handler configuration** for `ellicottcityairporttaxi.com` — specifically whether anything maps static extensions to the PHP handler.
4. **A LiteSpeed handler-cache purge** for this vhost, if relevant.

---

## 7. FOLLOW-UP I WILL NEED

Once static files serve, I need to deploy:

- a **static React SPA** (already built and verified), and
- an **Express + Socket.io Node.js API**.

Please confirm whether a **Node.js selector is available** on this account, and if so which versions. If it is not available, please advise whether Node can be installed on this plan — the live driver-tracking feature depends on WebSockets, which need a long-running Node process rather than shared-hosting PHP.

---

## 8. DIAGNOSTIC OUTPUT I CAN PROVIDE

On request I can supply the full output of any of the following:

```
curl -sI http://localhost/ -H 'Host: ellicottcityairporttaxi.com'
ls -la /home/hightech/public_html | head -40
cat /home/hightech/public_html/.htaccess
ls -la /home/hightech/.htaccess
cat /home/hightech/.htaccess
```

Thank you for your time — I appreciate the help.

---
---
