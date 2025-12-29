// StopTheSlop - Stats Manager
// Persistent scan history tracking with time-based filtering

const ScanStatsManager = {
    STORAGE_KEY: 'scanHistory',

    /**
     * Record a completed scan.
     * @param {object} entry - { score: number, platform: string }
     */
    async recordScan(entry) {
        try {
            const history = await this.getHistory();
            history.push({
                timestamp: Date.now(),
                score: entry.score,
                platform: entry.platform || 'unknown',
                aiDetected: (entry.score >= 0.5) // true if score >= 50%
            });

            // Keep max 10,000 entries to avoid storage bloat
            if (history.length > 10000) {
                history.splice(0, history.length - 10000);
            }

            await chrome.storage.local.set({ [this.STORAGE_KEY]: history });
        } catch (error) {
            console.error('StopTheSlop: Error recording scan:', error);
        }
    },

    /**
     * Get the full scan history array.
     * @returns {Array}
     */
    async getHistory() {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEY);
            return result[this.STORAGE_KEY] || [];
        } catch (error) {
            console.error('StopTheSlop: Error reading scan history:', error);
            return [];
        }
    },

    /**
     * Get stats filtered by time range.
     * @param {'day'|'week'|'month'|'all'} range
     * @param {number} aiThreshold - Threshold to count as AI detected (default 0.5)
     * @returns {object}
     */
    async getStats(range = 'all', aiThreshold = 0.5) {
        const history = await this.getHistory();
        const now = new Date();
        let cutoff = 0;

        switch (range) {
            case 'day':
                // Use calendar day (start of today local time)
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                cutoff = today.getTime();
                break;
            case 'week':
                cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
                break;
            case 'month':
                cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
                break;
            case 'all':
            default:
                cutoff = 0;
                break;
        }

        const filtered = history.filter(entry => entry.timestamp >= cutoff);
        const scanned = filtered.length;

        // Recalculate AI detected based on current threshold if possible
        const aiDetected = filtered.filter(entry => {
            // Use stored score if available, fallback to recorded flag
            const score = (entry.score !== undefined) ? entry.score : (entry.aiDetected ? 1.0 : 0.0);
            return score >= aiThreshold;
        }).length;

        const platforms = {};
        filtered.forEach(entry => {
            const p = (entry.platform || 'unknown').toLowerCase();
            platforms[p] = (platforms[p] || 0) + 1;
        });

        return { scanned, aiDetected, platforms };
    },

    /**
     * Get stats for all time ranges at once.
     * @param {number} aiThreshold - Threshold to count as AI detected
     * @returns {object}
     */
    async getAllRangeStats(aiThreshold = 0.5) {
        const history = await this.getHistory();
        const now = new Date();

        // Calendar day (start of today local time)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const cutoffs = {
            day: today.getTime(),
            week: now.getTime() - 7 * 24 * 60 * 60 * 1000,
            month: now.getTime() - 30 * 24 * 60 * 60 * 1000,
            all: 0
        };

        const result = {};

        for (const [range, cutoff] of Object.entries(cutoffs)) {
            const filtered = history.filter(entry => entry.timestamp >= cutoff);
            const scanned = filtered.length;

            // Recalculate AI detections based on the current threshold
            const aiDetected = filtered.filter(entry => {
                const score = (entry.score !== undefined) ? entry.score : (entry.aiDetected ? 1.0 : 0.0);
                return score >= aiThreshold;
            }).length;

            // Count scans by platform
            const platforms = {};
            filtered.forEach(entry => {
                const p = (entry.platform || 'unknown').toLowerCase();
                platforms[p] = (platforms[p] || 0) + 1;
            });

            result[range] = { scanned, aiDetected, platforms };
        }

        return result;
    },

    /**
     * Clear all scan history.
     */
    async clearHistory() {
        try {
            await chrome.storage.local.remove(this.STORAGE_KEY);
        } catch (error) {
            console.error('StopTheSlop: Error clearing scan history:', error);
        }
    }
};

// Expose as global
const statsGlobalScope = typeof globalThis !== 'undefined' ? globalThis :
    typeof window !== 'undefined' ? window :
        typeof self !== 'undefined' ? self : {};

statsGlobalScope.ScanStatsManager = ScanStatsManager;

// Also export for ES6 modules (background Service Worker)
if (typeof exports !== 'undefined') {
    exports.ScanStatsManager = ScanStatsManager;
}
