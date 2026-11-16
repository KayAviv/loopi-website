# DEPLOY.md — putting the LOOPI website live at www.kay-group.net

The site in this folder is a **plain static site** (no build step): `index.html`
(Kay Group company homepage — "Kay Group · Building Apps For You", with the
house apps as the portfolio), `loopi.html` (the LOOPI product landing page),
`apps.html` (the detailed Building Apps For You services page), `order.html`
(the studio order form), `founding.html` (the Founding Members sales page for
the house apps — the one page that carries prices, via Stripe payment links),
`app/` (the LOOPI web app, pre-configured to talk to
the production API at `https://loopi-api-0szz.onrender.com`), plus
`styles.css`, `assets/`, `robots.txt`, `sitemap.xml` and `favicon.ico`.

All canonical / Open Graph URLs in the pages already point at
`https://www.kay-group.net/`, so no edits are needed at deploy time — the one
remaining job is wiring the domain to a static host.

---

## ⚠️ THE ONE STEP THAT NEEDS KAY

**Add one DNS record at the registrar where kay-group.net is registered**
(GoDaddy, per Kay Group's accounts):

- If you deploy on **Render** (route A, recommended — same platform as the apps):
  - In Render's custom-domain screen you'll be shown a target hostname
    (something like `your-site.onrender.com`).
  - At the registrar add: **Type `CNAME`, Name `www`, Value = that target
    hostname**, TTL default.
  - Kay already has a Render account (cfiraviv89@gmail.com) and has offered the
    access for this — whoever deploys should get the exact target value from
    Render first, then the record takes ~2 minutes to add.
- The apex (`kay-group.net` without `www`) can be pointed later with an
  ALIAS/ANAME record (Render supports this) or a registrar redirect to
  `https://www.kay-group.net/`. The `www` host is the canonical one either way.

Everything below is doable by Muse/agent once that record exists (or in
parallel, up to the DNS step).

---

## Route A — Render Static Site from GitHub (recommended)

1. Push this folder to a GitHub repo (e.g. `KayAviv/loopi-website`), root of the
   repo = this folder's contents.
2. Render dashboard → **New → Static Site** → connect the repo.
   - Build command: `bash decode.sh` (the repo stores binary files — images,
     the woff2 font, demo clips — as base64 `*.b64` sidecars; this script
     decodes them back into place and is the site's only build step)
   - Publish directory: `.` (repo root)
3. Once it's live on its `*.onrender.com` URL, open **Settings → Custom
   Domains → Add `www.kay-group.net`**. Render shows the CNAME target.
4. **→ Kay's step:** add the CNAME record above at the registrar.
5. Render auto-issues the HTTPS certificate once DNS resolves (usually a few
   minutes). Verify `https://www.kay-group.net/` loads with a valid cert.
6. Optional redirect rule (Render → Redirects/Rewrites): add a rewrite so
   `/apps` also serves `/apps.html` if clean URLs are wanted. Not required —
   all internal links already use `/apps.html`.

## Route B — attach to the existing kay-group.net hosting

If kay-group.net already has hosting with spare capacity (e.g. the registrar's
hosting or an existing static host), simply upload the contents of this folder
to the web root of the `www` subdomain (or point the `www` DNS record at that
host). Requirements of any host:

- Serves `index.html` at `/` and at `/app/` (directory index).
- Serves `.mp4` and `.js`/`.css` with normal static MIME types.
- HTTPS enabled (the web app calls the API over HTTPS; browsers will block
  mixed content otherwise).
- No SPA fallback needed — every page is a real file.

Note: the app under `/app/` is ~16 MB (includes the demo clip library). Any
static host handles this fine.

---

## After it's live — Google Search Console

Goal: get "LOOPI app" searches to surface this site on page one.

1. Go to **search.google.com/search-console** (sign in with a Kay Google
   account — cfir@kay-group.net or cfiraviv33@gmail.com).
2. **Add property → Domain** → enter `kay-group.net`. Google gives a TXT
   record to add at the registrar (same place as Kay's CNAME step — batch
   them together if possible). Alternatively add a **URL-prefix** property for
   `https://www.kay-group.net/` and verify via the HTML-file or meta-tag
   method (drop the verification file/tag into this folder and redeploy).
3. Once verified: **Sitemaps → enter `sitemap.xml` → Submit.**
4. **URL Inspection → `https://www.kay-group.net/` → Request Indexing.**
   Repeat for `/apps.html`.
5. Expect first indexing within a few days. Ranking for "LOOPI app" improves
   as the App Store listing, this site, and social profiles cross-link — the
   App Store link and web-app link on this page are already in place, and the
   same URL should be added to the LOOPI social bios where possible.

## Also submit to Bing Webmaster Tools (5 minutes, optional)

bing.com/webmasters → import from Google Search Console → submit the same
sitemap. Bing also powers DuckDuckGo/Yahoo results.

---

## Updating the site later

- **Company/studio pages:** edit `index.html` / `loopi.html` / `apps.html` /
  `order.html` / `styles.css`, re-push, Render redeploys automatically.
- **Web app (`/app/`):** it's a snapshot of `~/workspace/nocta/app/` with
  `CONFIG.apiBase` flipped to the production API (same sed the iOS staging
  uses). When the app ships new features, re-copy `nocta/app/` over `app/`,
  re-apply the one-line flip:
  `sed -i "s|var CONFIG = { apiBase: '' };|var CONFIG = { apiBase: 'https://loopi-api-0szz.onrender.com' };|" app/app.js`
  and redeploy. Never serve the app with `apiBase: ''` from this site — media
  would 404 (that's exactly the bug this flip prevents).
