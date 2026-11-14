# LOOPI — app shell (web-core client)

Plain HTML/CSS/JS single-page app. No build step, no frameworks — the
same pattern as the Hivebound / GoalJar clients. It talks to the LOOPI
backend (`~/workspace/nocta/`, see its README for the REST contract).

## Run it

Serve this folder with any static server, e.g.:

```bash
cd ~/workspace/nocta/app && python3 -m http.server 8080
# open http://localhost:8080
```

Start the API (`cd ~/workspace/nocta && node index.js`, port 8472) and
point the client at it by setting `CONFIG.apiBase` at the top of
`app.js` to `'http://localhost:8472'` (default `''` = same origin,
which is what production uses when the API serves/proxies the shell).

Without the API, choose **"Browse the demo first"** — every screen is
viewable with clearly-labelled, on-device demo content.

## What's real vs demo

- **Real when signed in:** register/login, onboarding interests
  (PATCH /v1/me), feed, likes, comments, rooms (incl. private-room
  password join), messages, shared-video messages, credits + ledger,
  packs, AI generation (with the server's honest 503 not-configured /
  402 insufficient-credits states), live room creation, live join
  info (opening a real live room requests POST /v1/live/:id/token and
  stores {url, token, identity, role}; configured servers light up
  the "Ready to connect" chip), and tips (the ✦ buttons POST real
  credits to /v1/live/:id/tip and show the server's result — demo
  streams explain plainly that nothing was charged).
- **Creator levels, real when signed in:** the "How Levels Work"
  explainer renders from `GET /v1/creator-levels` (levels, XP awards,
  streak rule, milestones, badges — generated server-side from
  `src/config.js`, so it can never drift; the local mirror is only
  the demo fallback). The profile level card shows the live upload
  streak (🔥) and next-badge progress from `/v1/me`; earned badges
  render as chips on the profile and next to author names in the
  feed; generation responses apply their `xpAward` summary with
  level-up / new-badge toasts.
- **Honest stubs, labelled in the UI:** credit purchase (the server
  grants via its billing stub and says so), the live VIDEO itself
  (the LiveKit player SDK ships with the native app wrapper — this
  shell stores the connection info and shows the ready state, but
  renders no broadcast), cloud upload
  (file is validated ≤ 20 s and previewed on-device; R2 upload is the
  next step).
- **Demo-only:** seeded creators/videos/rooms/live cards and the
  floating-bubble demo conversation, all tagged "demo".

## Games hub

A **Games** tab in the tab bar opens the hub: game cards gated by
creator level (the same table as `src/config.js`), a demo
leaderboard, and a free **game-coins** balance (on-device demo
balance, earned by playing — a separate currency that never converts
into credits or cash).

- **Penalty Kicks (Level 1) — playable, swipe edition.** Best-of-5
  shootout, then sudden death. There are no zone buttons any more:
  you **swipe across the goal mouth** to shoot — the release point
  is your aim, the flick throws the ball a touch past your
  fingertip, and power is a risk dial (soft swipes place it, full
  power can sky it over or drag it wide, worst near the frame; a
  power meter runs while you swipe). The keeper bot still reads the
  centroid of your previous targets about a third of the time. When
  the bot shoots, you **swipe to dive**: the swipe lands your keeper
  and your reaction time sets his reach — late dives cover less
  goal, and never swiping leaves him home with half reach. Pointer
  events throughout, so a mouse click-drag is the same flick.
  Mathematical elimination ends matches early, correctly.
- **FoodNinja (Level 2) — playable.** LOOPI's own swipe-slicing
  game (original name, art and twists — every item is drawn from
  canvas shapes at runtime): burgers, pizza, sushi, donuts and
  melon slices arc up from the bottom; swipe through them to slice
  (blade trail, halves that split and tumble). Twists: **Combo
  Platter** (3+ sliced in one swipe: +15, then +5 each), **Golden
  Snack** (rare, 50 pts), **FEVER** (fill the combo meter for 5 s
  of double points) and the **Rotten Egg** hazard (−30, and a life
  against the AI; online it gums your blade for a beat). Two modes
  in `foodninja.js`: **vs AI** — a 60-second match against a bot
  slicer on Easy / Normal / Hard with 3 lives; **1v1 online** —
  timed rooms over the same WebSocket as Pong Clash: the server
  deals both players the **same seeded item stream** and relays
  scores (`src/gamerooms.js`, `game:'food'`), so the duel is won
  on slicing alone. Accepting a 🍔 challenge card drops you into
  an online room, same as pong.
- **Volley Duel (Level 1) — placeholder.** Rules + "in build" screen;
  nothing is faked.
- **Ping Pong / Pong Clash (Level 3) — playable, upgraded.** Neon
  table with ball trails, particles, screen shake and score popups.
  **Extras:** power-up orbs spawn mid-rally and apply to whoever last
  touched the ball — ⇔ big paddle (8 s), 🐢 slow ball (5 s),
  ✨ multi-ball (a second ball, up to 10 s), 🛡️ shield (one free
  save). A paddle that's moving when it strikes puts **spin**
  (curve) on the ball. Two ways to play, one renderer
  (`games-online.js`, shared arcade theme in `games.css`):
  - **Bot match** — local engine, first to 7; the bot speeds up
    every time you score (the original difficulty curve).
  - **Online 1v1** — real-time rooms over a hand-rolled WebSocket
    (`src/gamerooms.js`, server-authoritative physics, session-token
    auth): **Create room** gives a 4-letter code to send a friend,
    **Join room** takes a code, **Quick match** pairs you with a
    waiting player or a server-side bot fills the seat after 20 s.
    Accepting a 🏓 challenge card lands here with a room already
    created — send the code back and your friend joins. Online play
    needs a signed-in account (the demo browse has no server token);
    wins pay the same game coins as bot matches.
- **Poker (Level 4) — placeholder.** Rules screen that states the
  free-coins-only rule: game coins are earned, never bought, and can
  never become credits or cash.
- **Challenges:** every card (and both playable games' result
  screens) can post a challenge card into a chat thread via the
  existing message flow. Challenges currently ride the local demo
  message layer and are labelled "demo" on the card; Accept opens
  the game (level gate still applies). For pong and FoodNinja,
  Accept also spins up a real online room (above) — only the card
  itself is demo.

- **Group-chat games — playable.** Inside a GROUP chat, the 🎮
  button (or Join on a session card) opens a FoodNinja session for
  the whole chat: up to 8 players, one shared seed, a live
  standings strip over the slicing, and a final 1..N standings card
  posted back into the chat — just for fun, **no prizes** (group
  mode never awards coins, credits or XP). `group-games.js` owns
  the session socket, lobby and results overlay; the slicing runs
  in FoodNinja's `group` mode. Late joiners spectate from the
  overlay. Demo chats simulate the whole flow with labelled demo
  bots over a shortened 20 s match. The session + results chat
  cards are **generic** — the game resolves through `GS_GAME_IDS`
  in `app.js` — so a Penalty Shootout group session plugs in later
  with a registry entry and a server session type, no new card
  code. Covered by `test/groupgames.test.js` from the repo root.

Penalty Kicks and the hub wear the same polish pass (`games.css`):
stadium crowd-dots and floodlight glow, a netted goal mouth with a
grass pitch, animated ball-in on every shot, shine-sweep game cards,
and floating art on the Volley/Poker "in build" screens (still
honestly labelled "in build").

Locked cards show the required level and an XP progress bar. Wins
pay game coins (win +30, loss +5) into the demo balance.

## Language

There is **no language toggle in the main UI** (Kay's design rule):
Profile → Settings → Language offers English / 中文, persisted
on-device (`nocta.lang`), applied app-wide — tabs, feed, create,
chat, live, the games hub and all four games, auth, onboarding and
the creator-levels explainer all render from the string tables
(`STRINGS` in `app.js`, plus a small per-game `TXT` table in
`games-online.js` / `foodninja.js`). Server API errors are mapped
from their machine codes (`INSUFFICIENT_CREDITS`,
`GENERATION_NOT_CONFIGURED`, `BILLING_NOT_CONFIGURED`,
`LIVE_NOT_CONFIGURED`, …) to localized strings by `localizedError()`
in `app.js`, so users never see a raw code.

### Editions — the one packaging step

The same shell ships in two editions. The ONLY difference is the
first-run default language, set by one clearly-marked constant near
the top of `app.js`:

```js
var DEFAULT_LANG = 'en';   // global edition
var DEFAULT_LANG = 'zh';   // China edition — flip this one line
```

- **Global edition:** `DEFAULT_LANG = 'en'` (as committed).
- **China edition:** change that one line to `'zh'` before packaging.
  (Optionally also set `<html lang="zh-CN">` in `index.html`; the app
  sets `document.documentElement.lang` itself at runtime anyway.)

`DEFAULT_LANG` only decides what a **first-run** user sees. The
moment someone picks a language in Profile → Settings, their choice
is saved on-device and always wins over the edition default, in both
editions.

The smoke test guards all of this: EN/ZH key parity for every string
table, `DEFAULT_LANG` present, the language radios existing only
inside the Settings panel, and the main error codes localized in
both languages.

## Test

```bash
node smoke-test.js   # files load, app.js compiles, all ids resolve
```

Games logic is covered headlessly from the repo root (`npm test`):
`test/pk-swipe.test.js` drives the penalty swipe mapping and a
full simulated shootout through a stubbed DOM, and
`test/foodrooms.test.js` covers the FoodNinja spawn stream, the
server score-relay engine and a two-client food room.
