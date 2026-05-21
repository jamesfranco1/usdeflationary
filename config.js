// United States Deflationary Coin — website configuration.
// Edit these values before deploying. No build step required.
window.USDEF_CONFIG = {
    // Mint of the USDC-paired pump.fun coin this site tracks.
    mint: '447CFbmBkZKKGckSm2GP4brkSYqxV7j9Dfy5Z2GBUsDc',

    // Public feed URL from the Electron app (set USDEF_PUBLIC_PORT in .env).
    // For local testing: 'http://localhost:7891'
    // For production: expose this via a reverse proxy (ngrok, Cloudflare Tunnel, etc.)
    // and put the public URL here.
    feedUrl: 'http://localhost:7891',

    // Helius RPC for on-chain reads (free tier supports browser CORS).
    // Get one at https://helius.dev. Used to read live creator-vault balance
    // and verify mint info if the Electron feed is unreachable.
    rpcUrl: '',

    // pump.fun URL pattern — visitors click "BUY ON PUMP" to land on the trade page.
    pumpUrlPattern: 'https://pump.fun/coin/{mint}',

    // Solscan URL patterns for the signature/address links.
    solscanSigPattern: 'https://solscan.io/tx/{sig}',
    solscanAddrPattern: 'https://solscan.io/account/{addr}',

    // How often the website polls the Electron feed (ms).
    pollMs: 8000
};
