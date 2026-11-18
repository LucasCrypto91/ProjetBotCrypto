const WALLETS_CONFIG = {
    Lucas: {
        role: 'TRADER',
        initialCapital: 5000,
        targetCapital: 100000,
        nextDeposit: '...',
        accentHex: '#f59e0b',
        accentBg: 'rgba(245, 158, 11, 0.10)',
        borderClass: 'border-border',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400',
        // Ajoute tes dépôts ici (ajoute au capital sans fausser le PnL de trading)
        deposits: [
            { date: '2026-11-12', amount: 5000.00 },
            { date: '2026-11-17', amount: 50000.00 },
            { date: '2026-11-18', amount: 10350.00 }

        ],
        // Ajoute tes gains/pertes de trading ici
        dailyPnL: [
            { date: '2026-10-28', pnl: 1310.20 },
            { date: '2026-11-03', pnl: 4220.41 },
            { date: '2026-11-10', pnl: 2340.54 },
            { date: '2026-11-16', pnl: 4510.32 },
            { date: '2026-11-17', pnl: 14613.29 },
            { date: '2026-11-18', pnl: -1613.29 }
        ]
    },
    Raphael: {
        role: 'TRADER',
        initialCapital: 1100,
        targetCapital: 10000,
        targetNote: 'Objectif 10k fin d\'année',
        nextDeposit: 'Prochain dépôt : +500 € le 01/12',
        accentHex: '#3b82f6',
        accentBg: 'rgba(59, 130, 246, 0.10)',
        borderClass: 'border-border',
        badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dotClass: 'bg-blue-400',
        deposits: [
            { date: '2026-11-16', amount: 550.00 },
            { date: '2026-11-17', amount: 575.00 }
        ],
        dailyPnL: [
            { date: '2026-11-13', pnl: 17.32 },
            { date: '2026-11-14', pnl: 18.58 },
            { date: '2026-11-15', pnl: 32.52 },
            { date: '2026-11-16', pnl: 44.13 },
            { date: '2026-11-17', pnl: 97.32 },
            { date: '2026-11-18', pnl: 32.53 }
        ]
    },
    Matteo: {
        role: 'TRADER',
        initialCapital: 1100,
        targetCapital: 10000,
        targetNote: 'Objectif 10k fin d\'année',
        nextDeposit: 'Prochain dépôt : +500 € le 01/12',
        accentHex: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.10)',
        borderClass: 'border-border',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
        deposits: [
            { date: '2026-11-16', amount: 550.00 },
            { date: '2026-11-18', amount: 575.00 }
        ],
        dailyPnL: [
            { date: '2026-11-13', pnl: 17.32 },
            { date: '2026-11-14', pnl: 18.58 },
            { date: '2026-11-15', pnl: 32.52 },
            { date: '2026-11-16', pnl: 44.13 },
            { date: '2026-11-17', pnl: 51.33 },
            { date: '2026-11-18', pnl: 31.33 }
        ]
    }
};
