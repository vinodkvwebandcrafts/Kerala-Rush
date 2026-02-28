/* ═══════════════════════════════════════════════════
   GameStateManager — Finite State Machine
   ═══════════════════════════════════════════════════ */

export class GameStateManager {
    constructor() {
        this.state = 'LOADING';
        this.listeners = {};
        this.selections = {
            playerName: 'Rider_' + Math.floor(Math.random() * 9999),
            character: 'male',
            map: 'koratty',
            difficulty: 'medium',
            bike: 'rat',
        };
        this.sportsUnlocked = false;
        this._loadUnlockState();
    }

    get currentState() {
        return this.state;
    }

    transition(newState) {
        const oldState = this.state;
        this.state = newState;
        this._emit('stateChange', { from: oldState, to: newState });
        this._emit(newState, { from: oldState });
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    _emit(event, data) {
        (this.listeners[event] || []).forEach(cb => cb(data));
    }

    setSelection(key, value) {
        this.selections[key] = value;
    }

    getSelection(key) {
        return this.selections[key];
    }

    unlockSportsBike() {
        this.sportsUnlocked = true;
        try {
            localStorage.setItem('rf_sports_unlocked', 'true');
        } catch (e) { /* no-op */ }
    }

    _loadUnlockState() {
        try {
            this.sportsUnlocked = localStorage.getItem('rf_sports_unlocked') === 'true';
        } catch (e) { /* no-op */ }
    }
}
