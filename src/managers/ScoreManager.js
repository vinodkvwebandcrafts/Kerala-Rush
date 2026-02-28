/* ═══════════════════════════════════════════════════
   ScoreManager — Scoring, Combos, & Achievements
   ═══════════════════════════════════════════════════ */

import { GAME_CONFIG } from '../config.js';

export class ScoreManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.baseScore = 0;
        this.overtakes = 0;
        this.hits = 0;
        this.knockdowns = 0;
        this.crashes = 0;
        this.hitByBot = 0;
        this.cowsDodged = 0;
        this.cleanRideTimer = 0;
        this.cleanRideBonuses = 0;
        this.comboChain = 0;
        this.comboMultiplier = 1;
        this.placement = 4;
        this.raceTime = 0;
        this.achievementsUnlocked = [];
    }

    addOvertake() {
        this.overtakes++;
        this._chainAction();
    }

    addHit() {
        this.hits++;
        this._chainAction();
    }

    addKnockdown() {
        this.knockdowns++;
        this._chainAction();
    }

    addCrash() {
        this.crashes++;
        this.comboChain = 0;
        this.comboMultiplier = 1;
    }

    addHitByBot() {
        this.hitByBot++;
        this.comboChain = 0;
        this.comboMultiplier = 1;
    }

    addCowDodge() {
        this.cowsDodged++;
    }

    updateCleanRide(dt) {
        this.cleanRideTimer += dt;
        const S = GAME_CONFIG.SCORING;
        if (this.cleanRideTimer >= S.CLEAN_RIDE_THRESHOLD) {
            this.cleanRideBonuses++;
            this.cleanRideTimer = 0;
        }
    }

    resetCleanRide() {
        this.cleanRideTimer = 0;
    }

    setPlacement(pos) {
        this.placement = pos;
    }

    _chainAction() {
        this.comboChain++;
        this.comboMultiplier = Math.min(
            1 + Math.floor(this.comboChain / 3),
            GAME_CONFIG.SCORING.MAX_COMBO_MULTIPLIER
        );
    }

    computeTotal() {
        const S = GAME_CONFIG.SCORING;
        const placementPts = [S.FIRST_PLACE, S.SECOND_PLACE, S.THIRD_PLACE, S.FOURTH_PLACE][this.placement - 1] || 0;
        const overtakePts = this.overtakes * S.OVERTAKE;
        const hitPts = this.hits * S.SUCCESSFUL_HIT;
        const knockPts = this.knockdowns * S.KNOCKDOWN;
        const cleanPts = this.cleanRideBonuses * S.CLEAN_RIDE_BONUS;
        const crashPts = this.crashes * S.CRASH_PENALTY;
        const hitByBotPts = this.hitByBot * S.HIT_BY_BOT_PENALTY;

        return Math.max(0, placementPts + overtakePts + hitPts + knockPts + cleanPts + crashPts + hitByBotPts);
    }

    getBreakdown() {
        const S = GAME_CONFIG.SCORING;
        const placementPts = [S.FIRST_PLACE, S.SECOND_PLACE, S.THIRD_PLACE, S.FOURTH_PLACE][this.placement - 1] || 0;
        return [
            { label: `🏁 ${this._placementText()} Place`, value: placementPts },
            { label: `🔄 Overtakes (${this.overtakes})`, value: this.overtakes * S.OVERTAKE },
            { label: `🥊 Hits (${this.hits})`, value: this.hits * S.SUCCESSFUL_HIT },
            { label: `💥 Knockdowns (${this.knockdowns})`, value: this.knockdowns * S.KNOCKDOWN },
            { label: `✨ Clean Riding`, value: this.cleanRideBonuses * S.CLEAN_RIDE_BONUS },
            { label: `💢 Crashes (${this.crashes})`, value: this.crashes * S.CRASH_PENALTY },
            { label: `🤕 Hit by Bot (${this.hitByBot})`, value: this.hitByBot * S.HIT_BY_BOT_PENALTY },
            { label: 'TOTAL', value: this.computeTotal() },
        ];
    }

    _placementText() {
        return ['1st', '2nd', '3rd', '4th'][this.placement - 1] || '4th';
    }

    checkAchievements() {
        const A = GAME_CONFIG.ACHIEVEMENTS;
        const unlocked = [];

        if (this.cowsDodged >= A.COW_DODGER.threshold && !this._has(A.COW_DODGER.id)) {
            unlocked.push(A.COW_DODGER);
        }
        if (this.hits >= A.STREET_FIGHTER.threshold && !this._has(A.STREET_FIGHTER.id)) {
            unlocked.push(A.STREET_FIGHTER);
        }
        if (this.crashes === 0 && !this._has(A.SPEED_DEMON.id)) {
            unlocked.push(A.SPEED_DEMON);
        }
        if (this.hits >= A.FIRST_BLOOD.threshold && !this._has(A.FIRST_BLOOD.id)) {
            unlocked.push(A.FIRST_BLOOD);
        }
        if (this.placement === 1 && !this._has(A.WINNER.id)) {
            unlocked.push(A.WINNER);
        }

        unlocked.forEach(a => this.achievementsUnlocked.push(a));
        return unlocked;
    }

    _has(id) {
        return this.achievementsUnlocked.some(a => a.id === id);
    }

    // ── Leaderboard persistence ──
    saveToLeaderboard(playerName, map) {
        try {
            const data = JSON.parse(localStorage.getItem('rf_leaderboard') || '[]');
            data.push({
                player: playerName,
                score: this.computeTotal(),
                time: this.raceTime,
                placement: this.placement,
                map: map,
                date: Date.now(),
            });
            // Keep top 50
            data.sort((a, b) => b.score - a.score);
            localStorage.setItem('rf_leaderboard', JSON.stringify(data.slice(0, 50)));
        } catch (e) { /* no-op */ }
    }

    static getLeaderboard(mapFilter = 'all') {
        try {
            let data = JSON.parse(localStorage.getItem('rf_leaderboard') || '[]');
            if (mapFilter !== 'all') {
                data = data.filter(d => d.map === mapFilter);
            }
            return data.sort((a, b) => b.score - a.score);
        } catch (e) {
            return [];
        }
    }
}
