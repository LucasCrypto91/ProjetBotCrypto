let currentTimeframe = 'daily';
let chartInstances = {};

function formatEUR(val) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(val);
}

function formatUSD(val) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
}

function formatSignedEUR(val) {
    const formatted = formatEUR(Math.abs(val));
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
}

// =========================================================================
// PRIX TEMPS RÉEL (BTC, ETH, SOL EN USD) + FEAR & GREED INDEX
// =========================================================================
function updateTickerUI(symbol, price, change24h) {
    const priceEl = document.getElementById(`price-${symbol}`);
    const changeEl = document.getElementById(`change-${symbol}`);
    if (!priceEl || !changeEl) return;

    priceEl.textContent = formatUSD(price);
    const isPos = change24h >= 0;
    changeEl.textContent = `${isPos ? '+' : ''}${change24h.toFixed(2)}%`;
    changeEl.className = `text-[11px] px-1.5 py-0.2 rounded font-medium ${
        isPos
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/15 text-red-400 border border-red-500/20'
    }`;
}

async function fetchCryptoPrices() {
    try {
        const symbols = encodeURIComponent('["BTCUSDT","ETHUSDT","SOLUSDT"]');
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`);
        if (!res.ok) throw new Error('Binance API error');
        const data = await res.json();

        const map = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL' };
        data.forEach(item => {
            const sym = map[item.symbol];
            if (sym) {
                updateTickerUI(sym, parseFloat(item.lastPrice), parseFloat(item.priceChangePercent));
            }
        });

        const upd = document.getElementById('ticker-updated');
        if (upd) {
            const now = new Date();
            upd.textContent = `USD • ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    } catch (e) {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
            const data = await res.json();
            if (data.bitcoin) updateTickerUI('BTC', data.bitcoin.usd, data.bitcoin.usd_24h_change);
            if (data.ethereum) updateTickerUI('ETH', data.ethereum.usd, data.ethereum.usd_24h_change);
            if (data.solana) updateTickerUI('SOL', data.solana.usd, data.solana.usd_24h_change);
        } catch (err) {
            console.warn('Impossible de récupérer les prix crypto en direct', err);
        }
    }
}

async function fetchFearAndGreed() {
    try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await res.json();
        if (data && data.data && data.data[0]) {
            const val = parseInt(data.data[0].value, 10);
            const label = data.data[0].value_classification;
            const el = document.getElementById('fng-value');
            if (el) {
                el.textContent = `${val}/100 (${label})`;
                el.className = val >= 60 ? 'text-emerald-400' : val <= 35 ? 'text-red-400' : 'text-amber-400';
            }
        }
    } catch (e) {
        // Ignorer si indisponible
    }
}

// =========================================================================
// CALCULS DES PÉRIODES & STATISTIQUES (DÉPÔTS + RETRAITS + PNL)
// =========================================================================
function getISOWeekKey(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
}

function getMonthKey(dateStr) {
    return dateStr.substring(0, 7);
}

function getPeriodKey(dateStr, tf) {
    if (tf === 'weekly') return getISOWeekKey(dateStr);
    if (tf === 'monthly') return getMonthKey(dateStr);
    return dateStr;
}

function formatPeriodLabel(key, tf) {
    if (tf === 'monthly') {
        const [y, m] = key.split('-');
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${months[parseInt(m, 10) - 1]} ${y}`;
    }
    return key;
}

function getWalletTotals(wallet) {
    if (!wallet) {
        return { initial: 0, deposits: 0, withdrawals: 0, invested: 0, netCapitalBase: 0, pnl: 0, current: 0, roi: 0, bestDay: 0, maxDrawdown: 0 };
    }
    const initial = Number(wallet.initialCapital || 0);
    const deposits = (wallet.deposits || []).reduce((s, d) => s + Number(d.amount), 0);
    const withdrawals = (wallet.withdrawals || []).reduce((s, w) => s + Number(w.amount), 0);
    const entries = wallet.dailyPnL || [];
    const pnl = entries.reduce((s, d) => s + Number(d.pnl), 0);

    const invested = initial + deposits;
    const netCapitalBase = invested - withdrawals;
    const current = Math.max(0, netCapitalBase + pnl);
    const roi = invested > 0 ? (pnl / invested) * 100 : 0;

    let bestDay = 0;
    let peak = 0;
    let cumPnL = 0;
    let maxDrawdown = 0;

    [...entries].sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
        const v = Number(e.pnl);
        if (v > bestDay) bestDay = v;
        cumPnL += v;
        if (cumPnL > peak) peak = cumPnL;
        const dd = peak - cumPnL;
        if (dd > maxDrawdown) maxDrawdown = dd;
    });

    return { initial, deposits, withdrawals, invested, netCapitalBase, pnl, current, roi, bestDay, maxDrawdown };
}

function aggregateWalletPeriods(wallet, tf) {
    const map = {};

    (wallet.dailyPnL || []).forEach(item => {
        const key = getPeriodKey(item.date, tf);
        if (!map[key]) map[key] = { pnl: 0, deposit: 0, withdrawal: 0 };
        map[key].pnl += Number(item.pnl);
    });

    (wallet.deposits || []).forEach(item => {
        const key = getPeriodKey(item.date, tf);
        if (!map[key]) map[key] = { pnl: 0, deposit: 0, withdrawal: 0 };
        map[key].deposit += Number(item.amount);
    });

    (wallet.withdrawals || []).forEach(item => {
        const key = getPeriodKey(item.date, tf);
        if (!map[key]) map[key] = { pnl: 0, deposit: 0, withdrawal: 0 };
        map[key].withdrawal += Number(item.amount);
    });

    const sortedKeys = Object.keys(map).sort();
    let runningCapital = Number(wallet.initialCapital || 0);

    return sortedKeys.map(k => {
        const periodPnL = map[k].pnl;
        const periodDeposit = map[k].deposit;
        const periodWithdrawal = map[k].withdrawal;
        runningCapital += periodPnL + periodDeposit - periodWithdrawal;
        return {
            key: k,
            label: formatPeriodLabel(k, tf),
            pnl: Number(periodPnL.toFixed(2)),
            deposit: Number(periodDeposit.toFixed(2)),
            withdrawal: Number(periodWithdrawal.toFixed(2)),
            capitalAfter: Number(runningCapital.toFixed(2))
        };
    });
}

function setTimeframe(tf) {
    currentTimeframe = tf;
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.className = 'tf-btn px-3 py-1.5 rounded-md text-slate-400 hover:text-white transition';
    });
    document.getElementById(`tf-${tf}`).className = 'tf-btn px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium transition';
    renderAll();
}

function createLineChart(canvasId, labels, dataPoints, borderColor, bgColor, isDashed = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: dataPoints,
                borderColor: borderColor,
                backgroundColor: bgColor,
                borderWidth: 2,
                borderDash: isDashed ? [5, 5] : [],
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: borderColor,
                fill: true,
                tension: 0.25
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#11151c',
                    borderColor: '#1f2633',
                    borderWidth: 1,
                    titleColor: '#94a3b8',
                    bodyColor: '#f8fafc',
                    bodyFont: { family: 'JetBrains Mono', size: 11 },
                    callbacks: {
                        label: (context) => ` ${formatEUR(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(31, 38, 51, 0.4)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'JetBrains Mono', size: 10 },
                        maxRotation: 0
                    }
                },
                y: {
                    grid: { color: 'rgba(31, 38, 51, 0.4)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'JetBrains Mono', size: 10 },
                        callback: (v) => v.toLocaleString('fr-FR') + ' €'
                    }
                }
            }
        }
    });
}

function renderPeriodHistoryRows(reversedPeriods, emptyText) {
    if (reversedPeriods.length === 0) {
        return `<div class="text-xs text-slate-500 text-center py-4">${emptyText}</div>`;
    }

    return reversedPeriods.map(p => {
        const hasCashFlowOnly = p.pnl === 0 && (p.deposit > 0 || p.withdrawal > 0);
        return `
        <div class="flex items-center justify-between bg-bg border border-border/80 rounded px-3 py-2 text-xs mono gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-slate-400">${p.label}</span>
                ${p.deposit > 0 ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">+${p.deposit.toFixed(0)}€ dép.</span>` : ''}
                ${p.withdrawal > 0 ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">-${p.withdrawal.toFixed(0)}€ ret.</span>` : ''}
            </div>
            <div class="flex items-center gap-3 shrink-0">
                ${!hasCashFlowOnly ? `
                    <span class="${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold">
                        ${formatSignedEUR(p.pnl)}
                    </span>
                ` : ''}
                <span class="text-slate-300 text-[11px] ${!hasCashFlowOnly ? 'border-l border-border pl-3' : ''}">
                    ${formatEUR(p.capitalAfter)}
                </span>
            </div>
        </div>
        `;
    }).join('');
}

// =========================================================================
// SECTION 0 : PORTEFEUILLE TOTAL PAR PERSONNE (TRADING + DCA)
// =========================================================================
function renderGlobalIndividualWallets() {
    const container = document.getElementById('global-wallets-container');
    if (!container) return;
    const names = Object.keys(WALLETS_CONFIG);

    let grandTeamTotal = 0;

    container.innerHTML = names.map(name => {
        const g = (typeof GLOBAL_GOALS_CONFIG !== 'undefined' && GLOBAL_GOALS_CONFIG[name]) || {
            targetCapital: 100000,
            targetNote: 'Objectif fin d\'année 2027',
            accentHex: '#3b82f6',
            badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            dotClass: 'bg-blue-400'
        };

        const tradingStats = getWalletTotals(WALLETS_CONFIG[name]);
        const dcaWallet = (typeof DCA_WALLETS_CONFIG !== 'undefined') ? DCA_WALLETS_CONFIG[name] : null;
        const dcaStats = getWalletTotals(dcaWallet);

        const combinedCapital = tradingStats.current + dcaStats.current;
        grandTeamTotal += combinedCapital;

        const combinedInvested = tradingStats.invested + dcaStats.invested;
        const combinedWithdrawals = tradingStats.withdrawals + dcaStats.withdrawals;
        const combinedPnL = tradingStats.pnl + dcaStats.pnl;
        const combinedROI = combinedInvested > 0 ? (combinedPnL / combinedInvested) * 100 : 0;

        const target = Number(g.targetCapital || 100000);
        const rawProgress = target > 0 ? (combinedCapital / target) * 100 : 0;
        const clampedProgress = Math.max(0, Math.min(100, rawProgress));
        const remaining = target - combinedCapital;

        return `
        <section class="bg-surface border border-border rounded-xl p-5 flex flex-col space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-3.5">
                <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full ${g.dotClass}"></span>
                    <h3 class="text-lg font-bold text-white tracking-tight">${name}</h3>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${g.badgeClass}">TOTAL CUMULÉ</span>
                </div>
                <span class="text-xs font-mono text-slate-400">2 WALLETS</span>
            </div>

            <!-- Capital Total Cumulé & PnL Global -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-bg border border-border rounded-lg p-3.5">
                    <div class="text-[11px] text-slate-400 mb-1">Capital Total</div>
                    <div class="text-xl font-bold text-white mono">${formatEUR(combinedCapital)}</div>
                    <div class="text-[11px] text-slate-500 mono mt-0.5">
                        Déposé : ${formatEUR(combinedInvested)}
                        ${combinedWithdrawals > 0 ? `<span class="text-orange-400/90"> • Retiré : ${formatEUR(combinedWithdrawals)}</span>` : ''}
                    </div>
                </div>

                <div class="bg-bg border border-border rounded-lg p-3.5">
                    <div class="text-[11px] text-slate-400 mb-1">Bénéfice / Perte Total</div>
                    <div class="text-xl font-bold mono ${combinedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}">${formatSignedEUR(combinedPnL)}</div>
                    <div class="text-[11px] mono mt-0.5 ${combinedROI >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}">
                        ${combinedROI >= 0 ? '+' : ''}${combinedROI.toFixed(2)}% ROI
                    </div>
                </div>
            </div>

            <!-- Répartition Trading vs DCA -->
            <div class="bg-bg/80 border border-border rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs mono">
                <div>
                    <span class="text-slate-400">Trading :</span>
                    <strong class="text-slate-200">${formatEUR(tradingStats.current)}</strong>
                </div>
                <div class="border-l border-border pl-3">
                    <span class="text-slate-400">DCA :</span>
                    <strong class="text-purple-300">${dcaWallet && dcaWallet.status === 'EN ATTENTE' ? 'En attente 1k' : formatEUR(dcaStats.current)}</strong>
                </div>
            </div>

            <!-- Barre Objectif Global 100k fin d'année 2027 -->
            <div class="bg-bg border border-border rounded-lg p-3.5 space-y-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <svg class="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <span>Objectif : <strong class="text-white mono">${formatEUR(target)}</strong></span>
                    </div>
                    <span class="text-xs font-bold mono" style="color: ${g.accentHex}">${rawProgress.toFixed(1)}%</span>
                </div>

                <div class="w-full h-2 bg-surface rounded-full overflow-hidden border border-border/60">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${clampedProgress}%; background-color: ${g.accentHex};"></div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span class="truncate pr-2">${g.targetNote || ''}</span>
                    <span class="mono shrink-0">
                        ${remaining > 0 ? `Reste ${formatEUR(remaining)}` : 'Objectif atteint'}
                    </span>
                </div>
            </div>
        </section>
        `;
    }).join('');

    const headerTotalEl = document.getElementById('header-team-total');
    if (headerTotalEl) {
        headerTotalEl.innerHTML = `<span class="text-slate-400">Cumul Équipe :</span><strong class="text-white">${formatEUR(grandTeamTotal)}</strong>`;
    }
}

// =========================================================================
// SECTION 1 : WALLETS TRADING
// =========================================================================
function renderTradingWallets(periodLabels, recapTitles) {
    const container = document.getElementById('wallets-container');
    const names = Object.keys(WALLETS_CONFIG);

    container.innerHTML = names.map(name => {
        const w = WALLETS_CONFIG[name];
        const periods = aggregateWalletPeriods(w, currentTimeframe);
        const stats = getWalletTotals(w);

        const target = Number(w.targetCapital || 0);
        const rawProgress = target > 0 ? (stats.current / target) * 100 : 0;
        const clampedProgress = Math.max(0, Math.min(100, rawProgress));
        const remaining = target - stats.current;

        const latest = periods.length > 0 ? periods[periods.length - 1] : null;
        const latestPnL = latest ? latest.pnl : 0;
        const latestDate = latest ? latest.label : '—';

        const wins = (w.dailyPnL || []).filter(d => Number(d.pnl) > 0).length;
        const losses = (w.dailyPnL || []).filter(d => Number(d.pnl) < 0).length;
        const wr = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;

        const reversedPeriods = [...periods].reverse();

        return `
        <section class="bg-surface border ${w.borderClass} rounded-xl p-5 flex flex-col space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-4">
                <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full ${w.dotClass}"></span>
                    <h3 class="text-lg font-bold text-white tracking-tight">${name}</h3>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${w.badgeClass}">TRADER</span>
                </div>
                <span class="text-xs font-mono text-slate-400">WR ${wr.toFixed(0)}%</span>
            </div>

            <!-- Case Objectif -->
            <div class="bg-bg border border-border rounded-lg p-3.5 space-y-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <svg class="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <span>Objectif : <strong class="text-white mono">${formatEUR(target)}</strong></span>
                    </div>
                    <span class="text-xs font-bold mono" style="color: ${w.accentHex}">${rawProgress.toFixed(1)}%</span>
                </div>

                <div class="w-full h-2 bg-surface rounded-full overflow-hidden border border-border/60">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${clampedProgress}%; background-color: ${w.accentHex};"></div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span class="truncate pr-2">${w.targetNote || ''}</span>
                    <span class="mono shrink-0">
                        ${remaining > 0 ? `Reste ${formatEUR(remaining)}` : 'Objectif atteint'}
                    </span>
                </div>
            </div>

            <!-- Encart Prochain Dépôt -->
            <div class="bg-bg border border-border rounded-lg px-3.5 py-2.5 flex items-center gap-2.5">
                <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="text-xs text-slate-300 font-medium">${w.nextDeposit}</span>
            </div>

            <!-- KPIs du Wallet -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-bg border border-border rounded-lg p-3.5">
                    <div class="text-[11px] text-slate-400 mb-1">Capital Wallet</div>
                    <div class="text-xl font-bold text-white mono">${formatEUR(stats.current)}</div>
                    <div class="text-[11px] text-slate-500 mono mt-0.5">
                        ${stats.deposits > 0 ? `Déposé : ${formatEUR(stats.invested)}` : `Départ : ${formatEUR(stats.initial)}`}
                    </div>
                    ${stats.withdrawals > 0 ? `<div class="text-[11px] text-orange-400/90 mono mt-0.5">Retiré : -${formatEUR(stats.withdrawals)}</div>` : ''}
                </div>

                <div class="bg-bg border border-border rounded-lg p-3.5">
                    <div class="text-[11px] text-slate-400 mb-1">Bénéfice / Perte Net</div>
                    <div class="text-xl font-bold mono ${stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">${formatSignedEUR(stats.pnl)}</div>
                    <div class="text-[11px] mono mt-0.5 ${stats.roi >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}">
                        ${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(2)}% ROI
                    </div>
                </div>
            </div>

            <!-- Métriques Risque : Meilleure journée & Max Drawdown -->
            <div class="grid grid-cols-2 gap-3 text-[11px] mono">
                <div class="bg-bg/70 border border-border rounded-lg px-3 py-2 flex items-center justify-between">
                    <span class="text-slate-400">Record :</span>
                    <strong class="text-emerald-400">${formatSignedEUR(stats.bestDay)}</strong>
                </div>
                <div class="bg-bg/70 border border-border rounded-lg px-3 py-2 flex items-center justify-between">
                    <span class="text-slate-400">Max DD :</span>
                    <strong class="${stats.maxDrawdown > 0 ? 'text-red-400' : 'text-slate-300'}">-${formatEUR(stats.maxDrawdown)}</strong>
                </div>
            </div>

            <!-- Dernière Période -->
            <div class="bg-bg/70 border border-border rounded-lg px-3.5 py-2.5 flex items-center justify-between">
                <div>
                    <div class="text-[11px] text-slate-400">${periodLabels[currentTimeframe]}</div>
                    <div class="text-[11px] text-slate-500 mono">${latestDate}</div>
                </div>
                <div class="text-base font-bold mono ${latestPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                    ${formatSignedEUR(latestPnL)}
                </div>
            </div>

            <!-- Graphique Individuel -->
            <div>
                <div class="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                    <span>Évolution du Capital</span>
                    <span class="mono uppercase text-slate-500">${currentTimeframe}</span>
                </div>
                <div class="h-48 w-full bg-bg border border-border rounded-lg p-2.5">
                    <canvas id="chart-${name}"></canvas>
                </div>
            </div>

            <!-- Récapitulatif Chiffré par Période -->
            <div class="flex-1 flex flex-col">
                <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span class="font-medium text-slate-300">${recapTitles[currentTimeframe]}</span>
                    <span class="font-mono text-[11px] text-slate-500">${periods.length} entrées</span>
                </div>
                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    ${renderPeriodHistoryRows(reversedPeriods, 'Aucune donnée')}
                </div>
            </div>
        </section>
        `;
    }).join('');

    names.forEach(name => {
        const w = WALLETS_CONFIG[name];
        const periods = aggregateWalletPeriods(w, currentTimeframe);
        const labels = ['Départ', ...periods.map(p => p.label)];
        const dataPoints = [Number(w.initialCapital), ...periods.map(p => p.capitalAfter)];
        createLineChart(`chart-${name}`, labels, dataPoints, w.accentHex, w.accentBg, false);
    });
}

// =========================================================================
// SECTION 2 : PROJET DCA (+60% / MOIS + 1K / 2 SEMAINES + OBJECTIF 100K 2027)
// =========================================================================
function computeDCAForecast(w, currentCapital) {
    const rate = Number(w.monthlyRate || 0.60);
    const monthsCount = Number(w.forecastMonths || 6);
    const monthlyAddedDeposit = Number(w.biweeklyDeposit || 0) * 2;

    let simCap = currentCapital > 0 ? currentCapital : Number(w.pendingAmount || w.initialCapital || 0);
    const startCap = simCap;

    const steps = [];
    for (let m = 1; m <= monthsCount; m++) {
        simCap = (simCap + monthlyAddedDeposit) * (1 + rate);
        steps.push({
            label: `Mois +${m}`,
            capital: Number(simCap.toFixed(2))
        });
    }

    return { startCap, steps, monthlyAddedDeposit };
}

function renderDCAWallets(periodLabels, recapTitles) {
    if (typeof DCA_WALLETS_CONFIG === 'undefined') return;
    const container = document.getElementById('dca-container');
    const names = Object.keys(DCA_WALLETS_CONFIG);

    container.innerHTML = names.map(name => {
        const w = DCA_WALLETS_CONFIG[name];
        const isPending = w.status === 'EN ATTENTE';
        const periods = aggregateWalletPeriods(w, currentTimeframe);
        const stats = getWalletTotals(w);

        const target = Number(w.targetCapital || 100000);
        const rawProgress = target > 0 ? (stats.current / target) * 100 : 0;
        const clampedProgress = Math.max(0, Math.min(100, rawProgress));
        const remaining = target - stats.current;

        const latest = periods.length > 0 ? periods[periods.length - 1] : null;
        const latestPnL = latest ? latest.pnl : 0;
        const latestDate = latest ? latest.label : '—';

        const rate = Number(w.monthlyRate || 0.60);
        const monthsCount = Number(w.forecastMonths || 6);
        const { steps: forecastSteps, monthlyAddedDeposit } = computeDCAForecast(w, stats.current);
        const projectedEnd = forecastSteps.length > 0 ? forecastSteps[forecastSteps.length - 1].capital : 0;

        const reversedPeriods = [...periods].reverse();

        return `
        <section class="bg-surface border border-border rounded-xl p-5 flex flex-col space-y-4">
            <!-- Header Projet DCA -->
            <div class="flex items-center justify-between border-b border-border pb-4">
                <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full ${w.dotClass}"></span>
                    <h3 class="text-lg font-bold text-white tracking-tight">${name}</h3>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/30">PROJET DCA</span>
                </div>
                ${isPending
                    ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">EN ATTENTE</span>`
                    : `<span class="text-xs font-mono text-purple-400">+${(rate * 100).toFixed(0)}%/mois</span>`
                }
            </div>

            <!-- Case Objectif 100k fin d'année 2027 -->
            <div class="bg-bg border border-border rounded-lg p-3.5 space-y-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <svg class="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <span>Objectif : <strong class="text-white mono">${formatEUR(target)}</strong></span>
                    </div>
                    <span class="text-xs font-bold mono" style="color: ${w.accentHex}">${rawProgress.toFixed(1)}%</span>
                </div>

                <div class="w-full h-2 bg-surface rounded-full overflow-hidden border border-border/60">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${clampedProgress}%; background-color: ${w.accentHex};"></div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span class="truncate pr-2">${w.targetNote || ''}</span>
                    <span class="mono shrink-0">
                        ${remaining > 0 ? `Reste ${formatEUR(remaining)}` : 'Objectif atteint'}
                    </span>
                </div>
            </div>

            <!-- Encart Prochain Dépôt DCA -->
            <div class="bg-bg border border-border rounded-lg px-3.5 py-2.5 flex items-center gap-2.5">
                <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="text-xs text-slate-300 font-medium">${w.nextDeposit}</span>
            </div>

            <!-- KPIs Wallet DCA -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-bg border border-border rounded-lg p-3.5">
                    <div class="text-[11px] text-slate-400 mb-1">Capital DCA Actuel</div>
                    ${isPending
                        ? `<div class="text-base font-bold text-amber-400 mono py-0.5">${w.statusText || 'En attente de 1 000 €'}</div>
                           <div class="text-[11px] text-slate-500 mono mt-0.5">Actuel : 0,00 €</div>`
                        : `<div class="text-xl font-bold text-white mono">${formatEUR(stats.current)}</div>
                           <div class="text-[11px] text-slate-500 mono mt-0.5">Déposé : ${formatEUR(stats.invested)}</div>
                           ${stats.withdrawals > 0 ? `<div class="text-[11px] text-orange-400/90 mono mt-0.5">Retiré : -${formatEUR(stats.withdrawals)}</div>` : ''}`
                    }
                </div>

                <div class="bg-bg border border-border rounded-lg p-3.5">
                    <div class="text-[11px] text-slate-400 mb-1">Bénéfice / Perte DCA</div>
                    <div class="text-xl font-bold mono ${stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">${formatSignedEUR(stats.pnl)}</div>
                    <div class="text-[11px] mono mt-0.5 ${stats.roi >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}">
                        ${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(2)}% ROI
                    </div>
                </div>
            </div>

            <!-- Dernière Période DCA -->
            <div class="bg-bg/70 border border-border rounded-lg px-3.5 py-2.5 flex items-center justify-between">
                <div>
                    <div class="text-[11px] text-slate-400">${periodLabels[currentTimeframe]}</div>
                    <div class="text-[11px] text-slate-500 mono">${isPending ? 'En attente démarrage' : latestDate}</div>
                </div>
                <div class="text-base font-bold mono ${latestPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                    ${formatSignedEUR(latestPnL)}
                </div>
            </div>

            <!-- Graphe 1 : Évolution Réelle DCA -->
            <div>
                <div class="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                    <span>Évolution Réelle DCA</span>
                    <span class="mono uppercase text-slate-500">${currentTimeframe}</span>
                </div>
                <div class="h-44 w-full bg-bg border border-border rounded-lg p-2.5">
                    <canvas id="dca-chart-${name}"></canvas>
                </div>
            </div>

            <!-- Graphe 2 : Prévision Attendue (+60% / mois + 1k/2sem) -->
            <div class="bg-bg/60 border border-purple-500/25 rounded-lg p-3.5 space-y-3">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-xs font-semibold text-white">Prévision Attendue (+${(rate * 100).toFixed(0)}%/mois)</div>
                        <div class="text-[11px] text-slate-400">
                            ${isPending ? 'Base 1 000 € + ' : 'Actuel + '}${formatEUR(monthlyAddedDeposit)}/mois
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] text-slate-400 uppercase">Cible M+${monthsCount}</div>
                        <div class="text-sm font-bold text-purple-400 mono">${formatEUR(projectedEnd)}</div>
                    </div>
                </div>

                <div class="h-40 w-full bg-surface border border-border rounded-lg p-2">
                    <canvas id="dca-forecast-${name}"></canvas>
                </div>

                <!-- Détail mois par mois de la prévision -->
                <div class="grid grid-cols-2 gap-1.5 pt-1">
                    ${forecastSteps.map(f => `
                        <div class="flex items-center justify-between bg-surface border border-border/70 rounded px-2.5 py-1.5 text-[11px] mono">
                            <span class="text-slate-400">${f.label}</span>
                            <span class="text-purple-300 font-semibold">${formatEUR(f.capital)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Récapitulatif Chiffré DCA -->
            <div class="flex-1 flex flex-col">
                <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span class="font-medium text-slate-300">${recapTitles[currentTimeframe]}</span>
                    <span class="font-mono text-[11px] text-slate-500">${periods.length} entrées</span>
                </div>
                <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    ${renderPeriodHistoryRows(reversedPeriods, isPending ? 'En attente du dépôt initial de 1 000 €' : 'Aucune donnée')}
                </div>
            </div>
        </section>
        `;
    }).join('');

    names.forEach(name => {
        const w = DCA_WALLETS_CONFIG[name];
        const periods = aggregateWalletPeriods(w, currentTimeframe);
        const stats = getWalletTotals(w);

        const realLabels = ['Départ', ...periods.map(p => p.label)];
        const realData = [Number(w.initialCapital || 0), ...periods.map(p => p.capitalAfter)];
        createLineChart(`dca-chart-${name}`, realLabels, realData, w.accentHex, w.accentBg, false);

        const { startCap, steps } = computeDCAForecast(w, stats.current);
        const forecastLabels = [w.status === 'EN ATTENTE' ? 'Dépôt 1k' : 'Actuel', ...steps.map(s => s.label)];
        const forecastData = [Number(startCap.toFixed(2)), ...steps.map(s => s.capital)];

        createLineChart(
            `dca-forecast-${name}`,
            forecastLabels,
            forecastData,
            '#a855f7',
            'rgba(168, 85, 247, 0.12)',
            true
        );
    });
}

function renderAll() {
    const periodLabels = {
        daily: 'Bénéfice du jour',
        weekly: 'Bénéfice semaine',
        monthly: 'Bénéfice du mois'
    };

    const recapTitles = {
        daily: 'Historique Daily',
        weekly: 'Historique Weekly',
        monthly: 'Historique Monthly'
    };

    renderGlobalIndividualWallets();
    renderTradingWallets(periodLabels, recapTitles);
    renderDCAWallets(periodLabels, recapTitles);
}

renderAll();
fetchCryptoPrices();
fetchFearAndGreed();
setInterval(fetchCryptoPrices, 10000);