Hi Binil,

Thank you — that listing answered it completely.

No, this is not meant to be a WordPress site. WordPress was previously installed
on this domain and has been compromised. I am replacing the entire document root
with a static React build.

**You are looking in the correct place.** The document root for this domain is
`/home/hightech/ellicottcityairporttaxi.com/`, not `/home/hightech/public_html/`.
I had originally uploaded to `public_html/`, which this domain never serves —
that is why you could not see the files, and why the domain was still serving the
old broken `index.php` and returning HTTP 500.

Could you please confirm the document root configured for this domain in cPanel
(Domains → ellicottcityairporttaxi.com → Document Root)?

---

## 1. I have attached the site build

I have attached **`ellicott-website.zip`** (7.5 MB). It is a complete static
React single-page application — `index.html`, an `assets/` folder, an `images/`
folder, `sw.js`, `.htaccess` and `robots.txt`.

Please extract it into:

```
/home/hightech/ellicottcityairporttaxi.com/
```

replacing the existing contents. I have attempted this myself via cPanel File
Manager, but the account home directory is not writable from the browser upload
and the file cannot be placed where it needs to go.

---

## 2. Files that must be removed first

These are the compromised WordPress install and malware, and none of them belong
to my project:

```
index.php
admin.php
wp-hold-mail.php
asax.php
G762Hi0oUfh7Odefault.php
supyffqkrnyxagxcjucnCdefault.php
llogit376igyzFM.php
xjcd3eeax1flvFM.php
wp-admin/     (directory)
wp-content/   (directory)
```

The randomly-named PHP files use a pattern consistent with a **China Chopper
webshell**, a well-known backdoor commonly installed through cPanel File Manager
and PHP-FPM argument-injection exploits.

### Please also treat this as a security incident

The same files also appear in the account home directory:

```
/home/hightech/asax.php
/home/hightech/llogit376igyzFM.php
/home/hightech/xjcd3eeax1flvFM.php
```

along with `get-pip.py` and `quantum.zip`, which suggests an attacker had
elevated access rather than a single compromised website.

**This account hosts approximately 40 domains.** I would really appreciate it if
you could check the other sites on this account for the same files and backdoors,
and advise whether my cPanel credentials should be considered compromised and
rotated.

---

## 3. Files that must be preserved

Please do not remove these:

```
/home/hightech/ellicottcityairporttaxi.com/robots.txt
/home/hightech/ellicottcityairporttaxi.com/googlebffcbf76070b0706.html
/home/hightech/ellicottcityairporttaxi.com/.well-known/
```

The `.well-known` directory is required for the SSL certificate to renew, and
`googlebffcbf76070b0706.html` is my Google Search Console verification file.

---

## 4. Once the site is live — two questions for the API

I also need to run an **Express + Socket.io Node.js API** on this account for
driver tracking, authentication and payments.

1. Does this account have a **Node.js selector** (cPanel → *Setup Node.js App*)?
   If so, which versions are available, and can both Node 20 and 22 be selected?
   My application requires **Node.js 20 or higher**.

2. Is **MongoDB** available on this account? Shared hosting usually does not
   provide it, and if it is not available, what do you recommend?

Please also let me know whether WebSocket connections are supported reliably on
this plan, since live driver location updates depend on them.

---

Thank you very much for your help — the document root detail was exactly what I
was missing.

Kind regards,
Elliott City Airport Taxi
