// =========================================================================
// 0. PORTEFEUILLE GLOBAL INDIVIDUEL (TRADING + PROJET DCA)
// =========================================================================
const GLOBAL_GOALS_CONFIG = {
    Lucas: {
        targetCapital: 100000,
        targetNote: 'Objectif fin d\'année 2027 (Trading + DCA)',
        accentHex: '#f59e0b',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400'
    },
    Raphael: {
        targetCapital: 100000,
        targetNote: 'Objectif fin d\'année 2027 (Trading + DCA)',
        accentHex: '#3b82f6',
        badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dotClass: 'bg-blue-400'
    },
    Matteo: {
        targetCapital: 100000,
        targetNote: 'Objectif fin d\'année 2027 (Trading + DCA)',
        accentHex: '#10b981',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400'
    }
};

// =========================================================================
// 1. WALLETS TRADING PRINCIPAUX
// =========================================================================
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
        deposits: [
            { date: '2026-11-12', amount: 5000.00 },
            { date: '2026-11-17', amount: 50000.00 },
            { date: '2026-11-18', amount: 10350.00 }
        ],
        // Exemple pour ajouter un retrait : { date: '2026-11-20', amount: 2000.00 }
        withdrawals: [],
        dailyPnL: [
            { date: '2026-10-28', pnl: 1310.20 },
            { date: '2026-11-03', pnl: 4220.41 },
            { date: '2026-11-10', pnl: 2340.54 },
            { date: '2026-11-16', pnl: 4510.32 },
            { date: '2026-11-17', pnl: 14613.29 },
            { date: '2026-11-18', pnl: -1613.29 },
            { date: '2026-11-19', pnl: 709.98 },
            { date: '2026-11-20', pnl: 830.42 },
            { date: '2026-11-21', pnl: 490.88 },
            { date: '2026-11-22', pnl: 829.91 }
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
        withdrawals: [],
        dailyPnL: [
            { date: '2026-11-13', pnl: 17.32 },
            { date: '2026-11-14', pnl: 18.58 },
            { date: '2026-11-15', pnl: 32.52 },
            { date: '2026-11-16', pnl: 44.13 },
            { date: '2026-11-17', pnl: 97.32 },
            { date: '2026-11-18', pnl: -32.53 },
            { date: '2026-11-19', pnl: 46.38 },
            { date: '2026-11-20', pnl: 31.23 },
            { date: '2026-11-21', pnl: 23.83 },
            { date: '2026-11-22', pnl: 30.91 }
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
        withdrawals: [
            { date: '2026-11-20', amount: 27.00 }
        ],
        dailyPnL: [
            { date: '2026-11-13', pnl: 17.32 },
            { date: '2026-11-14', pnl: 18.58 },
            { date: '2026-11-15', pnl: 32.52 },
            { date: '2026-11-16', pnl: 44.13 },
            { date: '2026-11-17', pnl: 51.33 },
            { date: '2026-11-18', pnl: -31.33 },
            { date: '2026-11-19', pnl: 43.91 },
            { date: '2026-11-20', pnl: 29.11 },
            { date: '2026-11-21', pnl: 22.54 },
            { date: '2026-11-22', pnl: 28.99 }
        ]
    }
};

// =========================================================================
// 2. WALLETS PROJET DCA (+60% / MOIS ATTENDU + DÉPÔT 1K / 2 SEMAINES)
// =========================================================================
const DCA_WALLETS_CONFIG = {
    Lucas: {
        status: 'ACTIF',
        initialCapital: 10000,
        pendingAmount: 0,
        targetCapital: 100000,
        targetNote: 'Objectif fin d\'année 2027',
        nextDeposit: 'Dépôt de 1 000 € toutes les 2 semaines',
        biweeklyDeposit: 1000,
        monthlyRate: 0.60,
        forecastMonths: 6,
        accentHex: '#f59e0b',
        accentBg: 'rgba(245, 158, 11, 0.10)',
        dotClass: 'bg-amber-400',
        deposits: [],
        withdrawals: [],
        dailyPnL: [
            { date: '2026-11-19', pnl: 0.00 }
        ]
    },
    Raphael: {
        status: 'EN ATTENTE',
        statusText: 'En attente de 1 000 €',
        initialCapital: 0,
        pendingAmount: 1000,
        targetCapital: 100000,
        targetNote: 'Objectif fin d\'année 2027',
        nextDeposit: 'Dépôt de 1 000 € toutes les 2 semaines',
        biweeklyDeposit: 1000,
        monthlyRate: 0.60,
        forecastMonths: 6,
        accentHex: '#3b82f6',
        accentBg: 'rgba(59, 130, 246, 0.10)',
        dotClass: 'bg-blue-400',
        deposits: [],
        withdrawals: [],
        dailyPnL: []
    },
    Matteo: {
        status: 'EN ATTENTE',
        statusText: 'En attente de 1 000 €',
        initialCapital: 0,
        pendingAmount: 1000,
        targetCapital: 100000,
        targetNote: 'Objectif fin d\'année 2027',
        nextDeposit: 'Dépôt de 1 000 € toutes les 2 semaines',
        biweeklyDeposit: 1000,
        monthlyRate: 0.60,
        forecastMonths: 6,
        accentHex: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.10)',
        dotClass: 'bg-emerald-400',
        deposits: [],
        withdrawals: [],
        dailyPnL: []
    }
};