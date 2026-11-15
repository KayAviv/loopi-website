# ORDERS.md — how studio orders from this website work

The studio order form lives at **`/order.html`** (linked from every
"Start your app" button on `apps.html`). This site is a static host —
it has no backend — so the form posts to the LOOPI API, which acts as
the studio's order inbox.

## The flow

1. Visitor fills in `/order.html` and clicks **Send my order**.
2. The page POSTs JSON to
   `https://loopi-api-0szz.onrender.com/v1/studio/orders`
   (route + storage live in `~/workspace/nocta`: `src/app.js`,
   `src/store.js`, `src/store-pg.js`).
3. The API validates the fields (name, a real-looking email, app
   type, description), then stores the order **durably**:
   - Production: the `studio_orders` table in the `loopi-db`
     Postgres (PgStore write-through mirror — same database as the
     app itself, so orders survive restarts and redeploys).
   - The record: `{ id (ord_…), name, email, phone, appType, pkg
     (starter|standard|premium|mini-game|not-sure), description,
     timeline, notes, status: "new", createdAt }`.
4. Spam defences: 10 submissions/hour/IP rate limit, and a hidden
   honeypot field (`website`) — bots that fill it get a fake success
   and nothing is stored.
5. If the POST fails for any reason (e.g. the free-tier API is
   asleep and errors), the page offers a one-click **mailto**
   fallback that sends the identical order to cfir@kay-group.net —
   no order is ever silently lost.

## How Kay / Muse read the orders

```bash
curl -s https://loopi-api-0szz.onrender.com/v1/admin/studio-orders \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

- Returns `{ orders: [...newest first], count, generatedAt }`.
- The ADMIN_TOKEN value lives in `~/workspace/user/loopi-admin.md`
  (chmod 600) — never paste it into this repo, a web page, or chat.
- Same gate as `/v1/admin/stats`: token unset on the server → 503
  `ADMIN_NOT_CONFIGURED`; wrong token → 401.
- New orders arrive with `status: "new"`. There is deliberately no
  status-editing endpoint yet — Kay works an order by replying to the
  client's email with the written quote (the studio's model: pricing
  is negotiated in the quote, never posted on the site).

## Pricing rule (owner, 2026-11-15)

No prices and no hourly rate anywhere on this website — packages are
described by name and contents only (Starter / Standard / Premium /
Branded Mini-Game). Pricing is provided per-client in the written
quote after the order is reviewed.
