/* ═══════════════════════════════════════════════════
   InputManager — Keyboard Polling
   ═══════════════════════════════════════════════════ */

export class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this._prevKeys = {};

        this._onKeyDown = (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
        };
        this._onKeyUp = (e) => {
            this.keys[e.code] = false;
            e.preventDefault();
        };
    }

    enable() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    disable() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this.keys = {};
        this.justPressed = {};
        this._prevKeys = {};
    }

    update() {
        // Compute justPressed: true only on the frame the key was first pressed
        for (const code in this.keys) {
            this.justPressed[code] = this.keys[code] && !this._prevKeys[code];
        }
        this._prevKeys = { ...this.keys };
    }

    isDown(code) {
        return !!this.keys[code];
    }

    wasPressed(code) {
        return !!this.justPressed[code];
    }

    // Convenience getters for game controls
    get accelerate() { return this.isDown('ArrowUp') || this.isDown('KeyW'); }
    get brake() { return this.isDown('ArrowDown') || this.isDown('KeyS'); }
    get left() { return this.isDown('ArrowLeft') || this.isDown('KeyA'); }
    get right() { return this.isDown('ArrowRight') || this.isDown('KeyD'); }
    get attackLeft() { return this.wasPressed('KeyJ'); }
    get attackRight() { return this.wasPressed('KeyK'); }
}
