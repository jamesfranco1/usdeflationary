# UNITED STATES DEFLATIONARY COIN — Website

Static read-only viewer for the on-chain claim/buy/burn loop powering a USDC-paired pump.fun coin. 8-bit pixel terminal aesthetic. No build step, no bundler, no framework.

## What it shows

- **TOTAL USDC BURNED** — sum of every cycle's claimed-and-burned USDC.
- **CYCLES** — total runs + successful runs.
- **TOKENS BURNED** — raw tokens removed from supply forever.
- **LAST CYCLE** — time of the most recent run + current loop status.
- **RECENT BURNS** — per-cycle log with `CLAIM` / `BUY` / `BURN` legs, amounts, and Solscan links on each signature.
- **BUY ON PUMP →** — direct link to the pump.fun trade page.

## How it works (data flow)

```
   ┌────────────────────────┐         poll every 8s
   │  Operator's machine    │  ◄──────────────────────────  Browser visitor
   │  (Electron loop)       │                                  │
   │                        │  GET /history.json                │
   │  every 30s:            │  → { entries, totals }            │
   │   claim USDC fees      │                                   ▼
   │   buy back the chart   │                          renders feed + totals
   │   burn bought tokens   │
   │   write history.json   │
   │  + serve over HTTP     │
   └────────────────────────┘
```

The page polls a JSON feed served by the off-chain operator's Electron app. If the feed is unreachable it falls back to a single Helius RPC `getAccountInfo` call to confirm the mint exists, and shows `FEED OFFLINE`.

## Files

| File         | Role                                                  |
| ------------ | ----------------------------------------------------- |
| `index.html` | Page markup                                           |
| `styles.css` | 8-bit pixel theme + responsive breakpoint at 720px    |
| `app.js`     | Polling + rendering                                   |
| `config.js`  | **Deploy-time config** — edit before publishing       |
| `vercel.json`| Cache headers + security headers for Vercel hosting   |

## Configure (one file)

Edit `config.js`:

```js
window.USDEF_CONFIG = {
    mint:    'YourUsdcQuotedPumpMint',           // the coin this site tracks
    feedUrl: 'https://your-tunnel.example.com',  // operator's public JSON feed
    rpcUrl:  'https://rpc.helius.xyz/?api-key=...',
    pumpUrlPattern:     'https://pump.fun/coin/{mint}',
    solscanSigPattern:  'https://solscan.io/tx/{sig}',
    solscanAddrPattern: 'https://solscan.io/account/{addr}',
    pollMs:  8000
};
```

`config.js` is served with `Cache-Control: no-store` so changes apply on the next page load.

## Deploy

### Vercel (recommended)

1. Push this repo to GitHub.
2. Import it on [vercel.com/new](https://vercel.com/new).
3. **Build & Output Settings**: leave everything default. There is no build command. The framework preset can stay as **Other**.
4. Deploy.

That's it — no environment variables needed. Configuration lives in `config.js` and ships with the static bundle.

### Anywhere else

Drop the folder on any static host:

- **Cloudflare Pages** — connect the repo, no build command, output dir `.`
- **GitHub Pages** — push to a `gh-pages` branch
- **Netlify** — drag-and-drop the folder
- **Locally** — `npx serve` or `python -m http.server 8080`

## Exposing the operator feed

The Electron app side (separate repo) serves the JSON feed on a configurable port. To make it reachable from the public website, tunnel it:

```bash
# Cloudflare Tunnel (free, recommended)
cloudflared tunnel --url http://localhost:7891
# → paste the generated https://*.trycloudflare.com URL into config.js
```

```bash
# Or ngrok
ngrok http 7891
```

The feed endpoints serve `Access-Control-Allow-Origin: *`, so the browser can fetch them from any origin.

## Endpoints the site expects

```
GET /totals
{
  "wallet":     "Creator wallet pubkey",
  "mint":       "Tracked mint pubkey",
  "active":     true,
  "inFlight":   false,
  "lastResult": { ... last cycle },
  "totals":     { totalClaimedUsdcRaw, totalBurnedRaw, totalCycles, successfulCycles },
  "serverTime": 1747834800000
}

GET /history.json
{
  "wallet":     "...",
  "mint":       "...",
  "entries":    [ /* last 200 cycles, most recent first */ ],
  "totals":     { ... },
  "serverTime": 1747834800000
}
```

Each `entries[i]` has:

```jsonc
{
  "success":         true,
  "skipped":         false,
  "at":              1747834800000,
  "cycleMs":         4123,
  "claimedRaw":      "12450000",
  "boughtUsdcRaw":   "12450000",
  "burnedRaw":       "8201453123456",
  "claimSignature":  "...",
  "buySignature":    "...",
  "burnSignature":   "..."
}
```

Skipped cycles use `{ success: true, skipped: true, reason: "no-fees" | "below-minimum" | "claim-landed-empty" }`. Errors use `{ success: false, error: "..." }`.

## License

UNLICENSED — All rights reserved.
