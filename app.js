let currentTimeframe = 'daily';
let chartInstances = {};

function formatEUR(val) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(val);
}

function formatSignedEUR(val) {
    const formatted = formatEUR(Math.abs(val));
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
}

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

function aggregateWalletPeriods(wallet, tf) {
    const map = {};

    (wallet.dailyPnL || []).forEach(item => {
        const key = getPeriodKey(item.date, tf);
        if (!map[key]) map[key] = { pnl: 0, deposit: 0 };
        map[key].pnl += Number(item.pnl);
    });

    (wallet.deposits || []).forEach(item => {
        const key = getPeriodKey(item.date, tf);
        if (!map[key]) map[key] = { pnl: 0, deposit: 0 };
        map[key].deposit += Number(item.amount);
    });

    const sortedKeys = Object.keys(map).sort();
    let runningCapital = Number(wallet.initialCapital);

    return sortedKeys.map(k => {
        const periodPnL = map[k].pnl;
        const periodDeposit = map[k].deposit;
        runningCapital += periodPnL + periodDeposit;
        return {
            key: k,
            label: formatPeriodLabel(k, tf),
            pnl: Number(periodPnL.toFixed(2)),
            deposit: Number(periodDeposit.toFixed(2)),
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

function renderAll() {
    const container = document.getElementById('wallets-container');
    const names = Object.keys(WALLETS_CONFIG);

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

    container.innerHTML = names.map(name => {
        const w = WALLETS_CONFIG[name];
        const periods = aggregateWalletPeriods(w, currentTimeframe);

        const totalPnL = (w.dailyPnL || []).reduce((s, d) => s + Number(d.pnl), 0);
        const totalDeposits = (w.deposits || []).reduce((s, d) => s + Number(d.amount), 0);
        const totalInvested = Number(w.initialCapital) + totalDeposits;
        const currentCapital = totalInvested + totalPnL;
        const roi = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

        // Progression vers l'objectif
        const target = Number(w.targetCapital || 0);
        const rawProgress = target > 0 ? (currentCapital / target) * 100 : 0;
        const clampedProgress = Math.max(0, Math.min(100, rawProgress));
        const remaining = target - currentCapital;

        const latest = periods.length > 0 ? periods[periods.length - 1] : null;
        const latestPnL = latest ? latest.pnl : 0;
        const latestDate = latest ? latest.label : '—';

        const wins = (w.dailyPnL || []).filter(d => Number(d.pnl) > 0).length;
        const losses = (w.dailyPnL || []).filter(d => Number(d.pnl) < 0).length;
        const wr = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;

        const reversedPeriods = [...periods].reverse();

        return `
        <section class="bg-surface border ${w.borderClass} rounded-xl p-5 flex flex-col space-y-4">
            <!-- Header Trader -->
            <div class="flex items-center justify-between border-b border-border pb-4">
                <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full ${w.dotClass}"></span>
                    <h2 class="text-lg font-bold text-white tracking-tight">${name}</h2>
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
                    <div class="text-xl font-bold text-white mono">${formatEUR(currentCapital)}</div>
                    <div class="text-[11px] text-slate-500 mono mt-0.5">
                        ${totalDeposits > 0 ? `Déposé : ${formatEUR(totalInvested)}` : `Départ : ${formatEUR(w.initialCapital)}`}
                    </div>
                </div>

                <div class="bg-bg border border-border rounded-lg p-3.5">
                    <div class="text-[11px] text-slate-400 mb-1">Bénéfice / Perte Net</div>
                    <div class="text-xl font-bold mono ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}">${formatSignedEUR(totalPnL)}</div>
                    <div class="text-[11px] mono mt-0.5 ${roi >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}">
                        ${roi >= 0 ? '+' : ''}${roi.toFixed(2)}% ROI
                    </div>
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
                    ${reversedPeriods.length === 0
                        ? `<div class="text-xs text-slate-500 text-center py-4">Aucune donnée</div>`
                        : reversedPeriods.map(p => `
                            <div class="flex items-center justify-between bg-bg border border-border/80 rounded px-3 py-2 text-xs mono">
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-400">${p.label}</span>
                                    ${p.deposit > 0 ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">+${p.deposit.toFixed(0)}€ dép.</span>` : ''}
                                </div>
                                <div class="flex items-center gap-3">
                                    ${p.pnl !== 0 || p.deposit === 0 ? `
                                        <span class="${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold">
                                            ${formatSignedEUR(p.pnl)}
                                        </span>
                                    ` : ''}
                                    <span class="text-slate-300 text-[11px] ${p.pnl !== 0 || p.deposit === 0 ? 'border-l border-border pl-3' : ''}">
                                        ${formatEUR(p.capitalAfter)}
                                    </span>
                                </div>
                            </div>
                        `).join('')
                    }
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

        const canvas = document.getElementById(`chart-${name}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (chartInstances[name]) {
            chartInstances[name].destroy();
        }

        chartInstances[name] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `Capital ${name}`,
                    data: dataPoints,
                    borderColor: w.accentHex,
                    backgroundColor: w.accentBg,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: w.accentHex,
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
    });
}

renderAll();