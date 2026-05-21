// United States Deflationary Coin — website live data + rendering.
// Polls the Electron app's public feed (set USDEF_PUBLIC_PORT in usdeflationary/.env)
// or falls back to a Helius RPC read for on-chain stats.

(function () {
    'use strict';

    const cfg = window.USDEF_CONFIG || {};
    const $ = (id) => document.getElementById(id);

    // ===== UTILS =====
    function escapeHtml(s) {
        return (s || '').toString().replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }
    function shortAddr(s, head = 4, tail = 4) {
        if (!s) return '';
        if (s.length <= head + tail + 3) return s;
        return s.slice(0, head) + '...' + s.slice(-tail);
    }
    function shortSig(s) {
        if (!s) return '';
        return s.slice(0, 8) + '...';
    }
    function rawToUsdc(rawString) {
        const r = BigInt(rawString || '0');
        const intPart = r / 1_000_000n;
        const frac = r % 1_000_000n;
        const fracStr = frac.toString().padStart(6, '0').slice(0, 2);
        const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return '$' + intStr + '.' + fracStr;
    }
    function formatTokenRaw(rawString, decimals = 6) {
        const r = BigInt(rawString || '0');
        if (r === 0n) return '0';
        const divisor = 10n ** BigInt(decimals);
        const intPart = r / divisor;
        const frac = r % divisor;
        if (frac === 0n) return intPart.toLocaleString('en-US');
        const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 4);
        return intPart.toLocaleString('en-US') + (fracStr ? '.' + fracStr : '');
    }
    function timeFmt(ts) {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
    }
    function patternFill(p, k, v) {
        if (!p) return '#';
        return p.replace(new RegExp('\\{' + k + '\\}', 'g'), encodeURIComponent(v));
    }

    // ===== TAB SWITCH =====
    function switchTab(name) {
        document.querySelectorAll('.tab').forEach(t => {
            if (!t.dataset.pane) return;
            t.classList.toggle('active', t.dataset.pane === name);
        });
        document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
    }
    window.switchTab = switchTab;

    // ===== COPY MINT =====
    function copyMint() {
        const v = cfg.mint || '';
        if (!v) return;
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(v).then(() => {
                const old = $('mintValue').textContent;
                $('mintValue').textContent = 'COPIED!';
                setTimeout(() => { $('mintValue').textContent = old; }, 900);
            }).catch(() => {});
        }
    }
    window.copyMint = copyMint;

    // ===== LIVE BADGE =====
    function setLive(state, label) {
        const dot = $('statusDot');
        dot.classList.remove('active', 'flight', 'error');
        if (state === 'live')   dot.classList.add('active');
        if (state === 'flight') dot.classList.add('flight');
        if (state === 'error')  dot.classList.add('error');
        $('liveText').textContent = (label || 'OFFLINE').toUpperCase();
    }

    // ===== MINT ROW =====
    function renderMint() {
        if (!cfg.mint) {
            $('mintRow').style.display = 'none';
            return;
        }
        $('mintRow').style.display = '';
        $('mintValue').textContent = cfg.mint;
        $('solscanMintLink').href = patternFill(cfg.solscanAddrPattern, 'addr', cfg.mint);
        $('buyPumpBtn').href = patternFill(cfg.pumpUrlPattern, 'mint', cfg.mint);
    }

    // ===== TOTALS =====
    function renderTotals(totals) {
        if (!totals) return;
        $('totalClaimed').textContent = rawToUsdc(totals.totalClaimedUsdcRaw);
        $('totalClaimedRaw').textContent = (totals.totalClaimedUsdcRaw || '0') + ' USDC RAW';
        $('totalCycles').textContent = String(totals.totalCycles || 0);
        $('totalSuccessful').textContent = (totals.successfulCycles || 0) + ' SUCCESSFUL';
        $('totalBurned').textContent = formatTokenRaw(totals.totalBurnedRaw);
    }

    // ===== FEED ENTRY =====
    function renderEntry(entry) {
        const wrap = document.createElement('div');
        wrap.className = 'entry'
            + (entry.skipped ? ' skipped' : '')
            + (entry.success === false ? ' error' : '');

        const time = document.createElement('div');
        time.className = 'entry-time';
        time.textContent = timeFmt(entry.at);

        const body = document.createElement('div');
        body.className = 'entry-body';

        if (entry.success === false) {
            body.innerHTML = `<div class="entry-leg" style="color:var(--danger);"><span class="tag">ERROR</span><span class="amt">${escapeHtml(entry.error || 'UNKNOWN')}</span></div>`;
        } else if (entry.skipped) {
            body.innerHTML = `<div class="entry-leg" style="color:var(--dim-2);"><span class="tag">SKIP</span><span class="amt">${escapeHtml((entry.reason || 'UNKNOWN').toUpperCase())}</span></div>`;
        } else {
            const claimLink = entry.claimSignature ? `<a class="sig" target="_blank" rel="noopener" href="${escapeHtml(patternFill(cfg.solscanSigPattern, 'sig', entry.claimSignature))}">${shortSig(entry.claimSignature)}</a>` : '';
            const buyLink   = entry.buySignature   ? `<a class="sig" target="_blank" rel="noopener" href="${escapeHtml(patternFill(cfg.solscanSigPattern, 'sig', entry.buySignature))}">${shortSig(entry.buySignature)}</a>`   : '';
            const burnLink  = entry.burnSignature  ? `<a class="sig" target="_blank" rel="noopener" href="${escapeHtml(patternFill(cfg.solscanSigPattern, 'sig', entry.burnSignature))}">${shortSig(entry.burnSignature)}</a>`  : '<span class="sig">NO BURN</span>';
            const legs = [
                `<div class="entry-leg claim"><span class="tag">CLAIM</span><span class="amt">${rawToUsdc(entry.claimedRaw)}</span>${claimLink}</div>`,
                `<div class="entry-leg buy"><span class="tag">BUY  </span><span class="amt">${rawToUsdc(entry.boughtUsdcRaw)}</span>${buyLink}</div>`,
                `<div class="entry-leg burn"><span class="tag">BURN </span><span class="amt">${formatTokenRaw(entry.burnedRaw)}</span>${burnLink}</div>`
            ];
            body.innerHTML = legs.join('');
        }

        const status = document.createElement('div');
        status.className = 'entry-status';
        status.textContent = entry.cycleMs ? entry.cycleMs + 'MS' : '';

        wrap.appendChild(time);
        wrap.appendChild(body);
        wrap.appendChild(status);
        return wrap;
    }

    function renderFeed(entries) {
        const feed = $('feed');
        if (!entries || entries.length === 0) {
            feed.innerHTML = '<div class="empty">&gt; NO CYCLES YET. THE LOOP IS WARMING UP.</div>';
            return;
        }
        feed.innerHTML = '';
        for (const entry of entries) feed.appendChild(renderEntry(entry));
    }

    // ===== STATE APPLY =====
    let _lastEntryAt = 0;

    function applyState(payload) {
        if (!payload) return;

        if (payload.wallet) {
            $('footerWallet').textContent = 'CREATOR: ' + shortAddr(payload.wallet, 6, 6);
        }

        if (payload.inFlight)      setLive('flight', 'CYCLING');
        else if (payload.active)   setLive('live', 'LIVE');
        else                       setLive('live', 'IDLE');

        renderTotals(payload.totals);

        if (payload.lastResult?.at) {
            $('lastTickValue').textContent = timeFmt(payload.lastResult.at);
            $('lastTickInfo').textContent  = 'LAST: ' + timeFmt(payload.lastResult.at);
            $('lastTickStatus').textContent = payload.inFlight
                ? 'RUNNING'
                : payload.active
                    ? 'CYCLING'
                    : 'PAUSED';
        }

        if (Array.isArray(payload.entries)) {
            renderFeed(payload.entries);
            if (payload.entries[0]?.at && payload.entries[0].at > _lastEntryAt) {
                _lastEntryAt = payload.entries[0].at;
            }
        }
    }

    // ===== FETCH FROM ELECTRON FEED =====
    async function fetchFeed() {
        if (!cfg.feedUrl) {
            setLive('error', 'NO FEED URL');
            return null;
        }
        try {
            const url = cfg.feedUrl.replace(/\/+$/, '') + '/history.json';
            const r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return await r.json();
        } catch (e) {
            console.warn('[USDeflationary] Feed fetch failed:', e.message);
            return null;
        }
    }

    // ===== HELIUS RPC FALLBACK (read-only on-chain stats) =====
    async function rpcCall(method, params) {
        if (!cfg.rpcUrl) return null;
        try {
            const r = await fetch(cfg.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
            });
            const j = await r.json();
            return j.result;
        } catch (e) {
            console.warn('[USDeflationary] RPC error:', e.message);
            return null;
        }
    }

    async function fetchOnChain() {
        if (!cfg.mint || !cfg.rpcUrl) return null;
        // Sole fallback purpose: confirm the mint resolves so the live badge can
        // show "LIVE" even when the Electron feed is offline. We do not derive
        // history from RPC (would require fetching tx logs — out of scope).
        const acct = await rpcCall('getAccountInfo', [cfg.mint, { encoding: 'base64' }]);
        if (acct?.value) return { ok: true };
        return null;
    }

    // ===== POLL LOOP =====
    async function tick() {
        const feedData = await fetchFeed();
        if (feedData) {
            applyState(feedData);
            return;
        }
        // Feed unreachable — try RPC for liveness check at least.
        const rpcOk = await fetchOnChain();
        if (rpcOk) setLive('error', 'FEED OFFLINE');
        else       setLive('error', 'OFFLINE');
    }

    // ===== INIT =====
    function init() {
        renderMint();
        if (!cfg.mint) {
            setLive('error', 'NOT CONFIGURED');
            $('feed').innerHTML = '<div class="empty">&gt; SET MINT IN config.js TO BEGIN.</div>';
            return;
        }
        tick();
        setInterval(tick, Math.max(2000, Number(cfg.pollMs || 8000)));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
