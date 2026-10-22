# bus — Improvement Plan

## 1. What this project is

"ST Tracker" (`package.json:2`, `bus-arrival-tracker`) is a two-part project:

1. **A Node/Express backend** (`src/server.js`, 679 lines) that serves a small JSON API over public Sound Transit **GTFS-RT** protobuf feeds and the OneBusAway Puget Sound arrivals API.
2. **A Capacitor mobile app + PWA** (`public/` web assets wrapped by `android/` and `ios/` scaffolding) that shows Link 1 Line / 2 Line arrivals, does GPS-based nearest-station detection, reads ORCA transit cards over NFC, and schedules arrival notifications.

It is deployed as a single Docker container (`Dockerfile`, `compose.yaml`) to a LAN host by a Gitea workflow (`.gitea/workflows/deploy.yml`).

Note: the project is *not* a "data-bus" — it is a transit arrival tracker.

## 2. Current state

| Metric | Value |
|---|---|
| Tracked files | 92 |
| Hand-written code | ~2,300 LOC (`src/server.js` 679, `public/app.js` 1,099, `public/capacitor-bridge.js` 306, `public/sw.js` 91) |
| Runtime deps | 13 (`package.json:20-34`), ~250 packages resolved in `package-lock.json` |
| Container base | `node:20-alpine` (`Dockerfile:1`) |
| Last commit | `a31d542` "Validate transit API query parameters" |

**Already done well**

- GTFS-RT decoding is cached for 3 minutes (`src/server.js:328`, `src/server.js:369`) precisely to avoid OneBusAway 429 rate limits — commit `b1ad00e` documents that reasoning.
- The arrivals endpoint validates `line` and `direction` against allowlists before touching any data (`src/server.js:442-454`).
- Duplicate arrivals are de-duplicated by trip with a preference for real-time over scheduled (`src/server.js:562-576`).
- The Docker image creates a non-root user before installing (`Dockerfile:6`, `Dockerfile:26`), and the healthcheck hits a real endpoint (`Dockerfile:22-23`).
- Android declares all six required permissions and marks GPS/NFC as `required="false"` (`android/app/src/main/AndroidManifest.xml:60-71`).

## 3. Findings

### F1 — The production container installs the entire Capacitor mobile toolchain (P0)

`package.json:21-29` lists **ten** Capacitor packages — `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/geolocation`, `@capacitor/haptics`, `@capacitor/push-notifications`, `@capacitor/splash-screen`, `@capacitor/status-bar` — under `"dependencies"`, not `"devDependencies"`.

`Dockerfile:12` runs `npm ci --omit=dev`, so `--omit=dev` removes only `typescript` (`package.json:39`). The container therefore installs `@capacitor/cli` and the Android/iOS platform packages, which are *build-time* tools for a mobile app that is compiled separately on a developer machine — the Node server at `src/server.js:676` never touches them.

**Estimate (unverified, no `node_modules` present):** `node:20-alpine` is ~135 MB uncompressed; the Capacitor CLI/Android/iOS tree plus its transitive deps plausibly adds 150–300 MB. The server actually needs only `express`, `node-fetch`, and `gtfs-realtime-bindings` (3 of 13). Moving the 10 Capacitor packages to `devDependencies` should cut the image by roughly half to two-thirds **with no functional change to the server**.

### F2 — `public/capacitor-bridge.js` (306 lines) is never loaded (P0)

`public/index.html:80` contains exactly one script tag: `<script src="app.js?v=20260120b"></script>`. A repo-wide grep for `capacitor-bridge` across `*.html`, `*.js`, `*.json`, `*.ts`, `*.md`, `*.yml` returns **zero** references.

Everything in that file is therefore dead in both builds:
- the native geolocation override that replaces `navigator.geolocation` with the Capacitor plugin (`public/capacitor-bridge.js:27-78`),
- the native NFC path (`public/capacitor-bridge.js:81-146`),
- push-notification registration and haptics (`public/capacitor-bridge.js:212-269`).

The app therefore relies on the browser's own `navigator.geolocation` (`public/app.js:386-411`) and Web NFC (`public/app.js:921-928`) even inside the native WebView, where `@capacitor/geolocation` and the NFC permission in `android/app/src/main/AndroidManifest.xml:70` are already granted but unused.

A second, independent bug sits behind it: `public/capacitor-bridge.js:83-108` waits for Cordova's `deviceready` event and reads a **global** `nfc` object. Capacitor has no `deviceready` and does not create a global `nfc`; and `android/capacitor.settings.gradle` registers only the six official Capacitor plugins — `phonegap-nfc` (`package.json:33`) is not among them. So even if the file were included, the native NFC branch would not fire.

### F3 — Unescaped third-party data injected into `innerHTML` (P1)

`public/app.js:521-533` builds arrival cards by string concatenation:

```
html += '<div class="arrival-card ' + countdownClass + '" data-tripid="' + arrival.tripId + '" data-arrival="' + arrival.arrivalTime + '" data-headsign="' + headsign + '">';
html += '<h3>' + headsign + '</h3>';
```

`headsign` is `arrival.tripHeadsign` (`public/app.js:502`), and `arrival.tripHeadsign` / `arrival.routeShortName` / `arrival.tripId` are copied verbatim out of the OneBusAway JSON response at `src/server.js:541-542`. That OBA fallback path is not exotic — it is taken whenever GTFS-RT yields no arrivals (`src/server.js:535`), which is routine off-peak.

`renderAlerts` has the same shape (`public/app.js:553-555`) over `alert.headerText` / `alert.descriptionText` from the GTFS-RT service-alert feed. A hostile or compromised upstream response therefore becomes live markup in the tracker page. `public/app.js:589` also concatenates `error.message` into `innerHTML`.

The server never re-encodes these fields. The fix is local: build DOM nodes and set `textContent` (the pattern `crypto-ap-exception-pack` already uses at `crypto-ap-exception-pack/docs/app.mjs:52-83`).

### F4 — The health endpoint reports "ok" even when the upstream feeds are dead (P1)

`src/server.js:672-674` returns `{ status: 'ok', timestamp: Date.now() }` unconditionally. `Dockerfile:22-23` and `compose.yaml:14` both use that endpoint as the container healthcheck.

Meanwhile `src/server.js:14` defaults `OBA_API_KEY` to the literal string `'TEST'` when the `.env` file (gitignored, `compose.yaml:11-12`) is missing. If that file is absent in production, every OBA call is made with a bad key, `getArrivalsFromOBA` swallows the failure and returns `null` (`src/server.js:396-399`), and the container still reports healthy. A green orchestrator and a completely broken arrivals page are indistinguishable.

### F5 — Notification icons point at a file that does not exist (P2)

`public/app.js:872` uses `icon: '/icon-192.png'` and `public/sw.js:83-84` uses `icon: '/icon-192.png'`, `badge: '/icon-192.png'`. `public/` contains only `icon-192.svg` and `icon-512.svg` — there is no `.png`. Every arrival notification therefore 404s its icon. (`public/index.html:12` and `public/manifest.json:11-30` correctly use the `.svg` files, so the PWA install icon works; only the notification path is broken.)

### F6 — The service worker cache grows without bound (P2)

`public/sw.js:43-56` is network-first and writes every successful same-origin GET into the cache. `public/index.html:80` loads the app with a version query string (`app.js?v=20260120b`). `cache.put(event.request, ...)` keys on the full request URL, so each manual version bump creates a *new* cache entry for the same file. The `activate` handler (`public/sw.js:24-34`) only deletes caches with a different `CACHE_NAME`, never stale entries inside the current one. The `CACHE_NAME` is hardcoded (`public/sw.js:2`, `st-tracker-v4`) and must be bumped by hand.

### F7 — The PWA shortcuts do nothing (P2)

`public/manifest.json:37` and `:43` declare shortcuts with `"?line=2_line"` / `"?line=1_line"`. `public/app.js` never reads `location.search` or `URLSearchParams` — the line is hardcoded to `currentLine = '2_line'` at `public/app.js:2`. Both shortcuts launch the app on the 2 Line.

### F8 — Station data is duplicated across two files (P2)

The 35 stations with coordinates, names, and OBA stop IDs appear twice: `src/server.js:25-293` (server) and `public/app.js:34-85` (client). The server already exposes exactly this data at `/api/lines` (`src/server.js:457-466`) and `/api/stations` (`src/server.js:469-485`) — but the client never calls either, and both endpoints are therefore dead code as well as the duplication. The stop IDs (`40_N23-T1` etc.) exist only on the server, so the client cannot reproduce the server's query even if it wanted to.

## 4. Rust performance plan

**Verdict: Rust is justified for the server, and only for the server. The mobile/PWA client should not touch Rust.**

### R1 — Replace the Express server with a Rust binary (recommended, P1)

This is the strongest Rust case across the four projects, and it is about **binary size and cold start**, not throughput.

| | Node today | Rust (estimate) |
|---|---|---|
| Runtime + deps in image | ~135 MB base + 250 npm packages, plausibly 300–500 MB total (F1) | 8–15 MB static binary, `gcr.io/distroless/static` base, ~12–25 MB total image |
| Cold start | ~80–150 ms (Node boot + express + module graph) | ~2–5 ms |
| Resident memory (idle) | ~40–60 MB RSS | ~3–8 MB RSS |

**Candidates and crates**

- `src/server.js:457-674` — the five route handlers. Crates: `axum` 0.8 (routing), `tower-http` (`SetRequestHeaderLayer` for the security headers, `TraceLayer` off by default), `tokio` (runtime).
- `src/server.js:348-375` — `fetchGtfsRt`. Crates: `reqwest` 0.12 with `rustls` (no OpenSSL → smaller image) and `bytes`.
- `src/server.js:403-440` — `parseTripUpdates`. Crate: `prost` + the `gtfs-realtime` `.proto` compiled with `prost-build` in a `build.rs`. The existing `gtfs-realtime-bindings` package is protobufjs-based and produces a large JS object graph; `prost` decodes to plain structs.
- `src/server.js:378-400` — OBA JSON fallback. Crate: `serde` + `serde_json`.
- `src/server.js:25-321` — the station tables become a `static STATIONS: LazyLock<[Station; 35]>`; this also removes the duplication in F8 for free if the client is served a generated `/api/stations` payload.

**Boundary:** none — this is a full replacement of one process, not an FFI shim. The HTTP contract (`/api/lines`, `/api/stations`, `/api/arrivals/:stationId`, `/api/alerts`, `/api/docs`, `/health`) is already small and version-free, so the client at `public/app.js:570` and `public/app.js:597` needs no change.

**Expected win (estimates, not measured):**

- *Decode + index*: the Sound Transit `tripupdates.pb` is on the order of 1–5 MB. protobufjs decode + full entity walk is plausibly 20–60 ms; `prost` decode to structs plus a prebuilt `HashMap<&str, Vec<Arrival>>` index is plausibly 3–8 ms — a **~5–10x** win on that function. Because `src/server.js:369` caches the feed for 3 minutes and `src/server.js:591` caches the final response, this path runs a handful of times per minute, so the **absolute** saving is milliseconds. The win that matters is building the stop→arrivals index **once per feed fetch** instead of re-walking every entity on every request — `parseTripUpdates` currently scans every `stopTimeUpdate` of every entity (`src/server.js:414-417`) for each uncached request.
- *Image size*: ~300–500 MB → ~12–25 MB, a **~15–25x** reduction. This is the real prize and it lands squarely on the stated goal of "smaller container image".
- *Cold start*: ~80–150 ms → ~2–5 ms.

**Cost:** a `rust-toolchain.toml`, a `Cargo.toml` with ~6 crates, a `Dockerfile` multi-stage build (`rust:1-alpine` builder → `distroless/static` runtime), and a rewrite of 679 lines. The static station data and the JSON shape carry over directly. This is roughly 2–4 days of work, and it should come *after* F1 and F2, which are free.

**A cheaper alternative that captures most of the size win first:** keep Node, but move the 10 Capacitor packages to `devDependencies` (F1) and switch to a `node:20-alpine` → `node:20-slim`-with-no-dev or a `distroless/nodejs` base. That alone may cut the image by 50–70% at near-zero risk and effort. Do that first, then decide whether Rust is still worth it.

### R2 — What Rust should NOT touch

- **`public/app.js` (the PWA/Capacitor client).** The only numeric hot path is the Haversine nearest-station scan (`public/app.js:190-218`) over 35 stations, called on each GPS fix (`public/app.js:320`). 35 `Math.sin`/`Math.cos` pairs is on the order of a microsecond. A Rust→WASM module would add a ~50–150 KB blob, a build step, and a `WebAssembly.instantiate` call to save a microsecond. **Not worth it.**
- **The `docker compose` / Gitea deploy pipeline** — I/O orchestration, already fine.
- **The Android/iOS native projects** — Gradle/Xcode output is not something a Rust port changes.

### R3 — The one WASM candidate, and why to reject it

The only genuine CPU hotspot on the client is the countdown re-render loop (`public/app.js:618-638`, 1 Hz over 10 cards) and the Haversine scan above. Both are far below the threshold where a language change pays. **Recommendation: no WASM in the client.** If the team later wants a WASM module, the natural target would be the Haversine + station-index lookup, and the honest expected win is *under 1 ms per GPS fix* against a 1-second refresh cadence. Reject.

## 5. Prioritized recommendations

| Priority | Change | Impact | Effort | Files touched |
|---|---|---|---|---|
| P0 | Move the 10 Capacitor packages to `devDependencies` so `npm ci --omit=dev` stops installing the mobile toolchain | Image cut ~50–70% (est. 300–500 MB → ~120–200 MB); zero server behavior change | 10 min | `package.json` |
| P0 | Either include `capacitor-bridge.js` in `public/index.html` **and** rewrite its Cordova-era `deviceready`/global-`nfc` path to Capacitor's API, or delete the file and drop `phonegap-nfc` | 306 lines of currently-dead code either starts working or stops shipping; removes a broken permission dependency | 2–4 h | `public/index.html`, `public/capacitor-bridge.js`, `package.json`, `android/capacitor.settings.gradle` |
| P1 | Replace `innerHTML` string building with DOM nodes + `textContent` for arrivals, alerts, and the error path | Closes an HTML-injection vector fed by the OneBusAway JSON response | 2–3 h | `public/app.js:521-533`, `public/app.js:553-555`, `public/app.js:589` |
| P1 | Make `/health` verify the upstream feeds and expose degraded state; fail loudly when `OBA_API_KEY` is the `'TEST'` default | Turns a silently-broken deployment into a visible one | 1–2 h | `src/server.js:14`, `src/server.js:672-674` |
| P1 | Port the server to Rust (axum + reqwest + prost + serde) with a distroless multi-stage Dockerfile | ~15–25x smaller image (est.), ~2–5 ms cold start (est.), ~5–10x faster feed decode (est.) | 2–4 d | `src/server.js`, `Dockerfile`, `compose.yaml`, new `Cargo.toml`/`build.rs` |
| P2 | Serve the station table from one place — generate `/api/stations` from the Rust/Node source and have `public/app.js` fetch it | Removes 35-station duplication across two files; removes dead `/api/lines` and `/api/stations` endpoints | 3–4 h | `src/server.js:25-321`, `public/app.js:19-87` |
| P2 | Add `icon-192.png` / `icon-512.png`, or switch notification icons to the existing `.svg` | Fixes 404ing notification icons on every arrival reminder | 15 min | `public/app.js:872`, `public/sw.js:83-84` |
| P2 | Read `?line=` in the client so the PWA shortcuts work | Two declared shortcuts become functional | 30 min | `public/app.js:2`, `public/app.js:726` |
| P2 | Bound the service-worker cache: derive `CACHE_NAME` from a build stamp and delete stale entries inside the current cache | Stops unbounded cache growth across manual version bumps | 1 h | `public/sw.js:2`, `public/sw.js:24-34`, `public/sw.js:43-56` |
| P2 | Prune the deploy workflow: bump `appleboy/ssh-action` off `v1.0.0`, switch from a password to an SSH key, drop `--no-cache` | Removes a stale-action risk and a needless full rebuild each push | 30 min | `.gitea/workflows/deploy.yml` |

## 6. Risks and caveats

- **The container image sizes in this report are estimates.** `node_modules` is not installed in this checkout, so I could not measure the real installed size. Measure `docker images` before and after moving the Capacitor packages before treating the numbers as fact.
- **The Rust port is a rewrite, not an optimization.** It removes the npm dependency tree entirely, but every one of the 13 runtime dependencies must be re-expressed as a crate or dropped. The `gtfs-realtime-bindings` → `prost` change also alters the decoded object shape, so `parseTripUpdates` and `parseAlerts` need re-testing.
- **Do F1 before R1.** F1 buys most of the size win for an hour of work. If F1 brings the image down enough, the Rust port's remaining justification is mainly cold start and RSS — and you should re-evaluate.
- **The P0 on `capacitor-bridge.js` is a fork in the road.** Including it means writing new Capacitor-plugin code for NFC and geolocation (and testing on a real device). Deleting it means the app keeps using browser geolocation/Web NFC inside the native shell, which works today but leaves `@capacitor/geolocation` and the NFC manifest permission unused. Pick one deliberately; do not leave 306 lines of misleading dead code in the tree.
- **The upstream feeds are third-party.** The OBA API and Sound Transit S3 buckets can change shape or go down without notice. `src/server.js:14`'s silent `'TEST'` fallback is a symptom of treating upstream as always-present; the health-check fix in P1 is what surfaces it.
- **`node-fetch` (`src/server.js:2`) is redundant** on Node 18+ (`package.json:36` requires `>=18`), which has a global `fetch`. It is one more package in the image for no benefit — trivial to drop, bundled into the P0 row.

## 7. Suggested sequencing

1. **Day 1 (no risk, no rewrite):** F1 (move Capacitor packages to devDependencies, drop `node-fetch`), then rebuild the image and record the real before/after size. Add the `.png` icons (P2). These two changes are independent and reversible.
2. **Day 1 (security):** the `innerHTML` fix (P1). It is localized to three functions in `public/app.js` and needs no backend change.
3. **Day 2 (observability):** the `/health` upstream check and the `OBA_API_KEY` guard (P1). Now a broken deployment is visible.
4. **Day 2 (dead code):** decide include-vs-delete for `capacitor-bridge.js` (P0). Deleting is the cheaper option and unblocks dropping `phonegap-nfc`.
5. **Days 3–4 (port):** Rust server. Write `Cargo.toml` with `axum`/`reqwest`/`prost`/`serde`, port the five routes and the station table, add the multi-stage `Dockerfile`, and — critically — write a contract test that hits the *old* and *new* servers and compares JSON responses byte-for-byte for the synthetic station fixtures. That test is what makes the port safe.
6. **After the port:** the station-table de-duplication (P2) falls out for free, because the Rust binary becomes the single source of truth and serves `/api/stations` to the client.
7. **Backlog:** PWA shortcut query-param (P2), service-worker cache bounding (P2), deploy-workflow hygiene (P2).
