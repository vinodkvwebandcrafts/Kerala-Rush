/* ═══════════════════════════════════════════════════
   RaceScene — Race orchestration
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';
import { TrackGenerator } from '../tracks/TrackGenerator.js';
import { PlayerBike } from '../entities/PlayerBike.js';
import { BotBike } from '../entities/BotBike.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';

export class RaceScene {
    constructor(renderer, gameState, input, sound, scoreManager, assets) {
        this.renderer = renderer;
        this.gameState = gameState;
        this.input = input;
        this.sound = sound;
        this.score = scoreManager;
        this.assets = assets;

        this.scene = null;
        this.camera = null;
        this.player = null;
        this.bots = [];
        this.track = null;
        this.spawnSystem = null;

        this.raceTimer = 0;
        this.isRunning = false;
        this.finishOrder = [];
        this.prevPositions = []; // for overtake detection
        this.sideCollisionCooldown = 0;
        this.screenShakeIntensity = 0;
    }

    init() {
        const mapKey = this.gameState.getSelection('map');
        const bikeKey = this.gameState.getSelection('bike');
        const diffKey = this.gameState.getSelection('difficulty');
        const charKey = this.gameState.getSelection('character'); // 'male' or 'female'

        const mapConfig = GAME_CONFIG.MAPS[mapKey];
        const diffConfig = GAME_CONFIG.DIFFICULTY[diffKey];

        // ── Scene Setup ──
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(mapConfig.skyColor);
        this.scene.fog = new THREE.Fog(mapConfig.fogColor, mapConfig.fogNear, mapConfig.fogFar);

        // ── Lighting (boosted for GLB model visibility) ──
        const ambient = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 1.5);
        directional.position.set(50, 100, 50);
        directional.castShadow = false;
        this.scene.add(directional);

        // Hemisphere light for natural sky/ground illumination
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(hemiLight);

        // Warm fill light from behind
        const fillLight = new THREE.DirectionalLight(0xffa500, 0.4);
        fillLight.position.set(-30, 50, -20);
        this.scene.add(fillLight);

        // ── Camera ──
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        // ── Track ──
        this.track = new TrackGenerator(mapConfig, this.assets);
        const trackMesh = this.track.generate();
        this.scene.add(trackMesh);

        // ── Player ──
        this.player = new PlayerBike(bikeKey, charKey, this.track, this.assets);
        this.player.x = this.track.getCenterXAtZ(0);
        this.scene.add(this.player.mesh);

        // ── Bots ──
        this.bots = [];
        const botTypes = GAME_CONFIG.BOTS.TYPES;
        const botCount = GAME_CONFIG.BOTS.COUNT;
        for (let i = 0; i < botCount; i++) {
            const type = botTypes[i % botTypes.length];
            const bot = new BotBike(i, type, this.track, diffConfig, this.assets);
            // Stagger starting positions
            bot.z = (i + 1) * GAME_CONFIG.BOTS.SPAWN_OFFSET;
            bot.x = this.track.getCenterXAtZ(bot.z) + (i - 1) * 2;
            this.bots.push(bot);
            this.scene.add(bot.mesh);
        }

        // ── Spawn System ──
        this.spawnSystem = new SpawnSystem(this.scene, this.track, mapConfig, diffConfig, this.assets);

        // ── Score ──
        this.score.reset();
        this.raceTimer = 0;
        this.finishOrder = [];
        this.isRunning = false;
        this.sideCollisionCooldown = 0;
        this.screenShakeIntensity = 0;

        // Init overtake tracker
        this.prevPositions = this._computePositions();
    }

    startRace() {
        this.isRunning = true;
    }

    update(dt) {
        if (!this.isRunning) return;

        this.raceTimer += dt;
        this.score.raceTime = this.raceTimer;

        // ── Input → Player ──
        if (this.input.attackLeft) {
            if (this.player.attack('left')) {
                this.sound.playPunch();
            }
        }
        if (this.input.attackRight) {
            if (this.player.attack('right')) {
                this.sound.playPunch();
            }
        }

        // ── Update Entities ──
        this.player.update(dt, this.input, null);
        this.sound.playEngine(this.player.speed, GAME_CONFIG.BIKES[this.gameState.getSelection('bike')].maxSpeed);

        for (const bot of this.bots) {
            if (!bot.finished) {
                bot.update(dt, this.player.z, this.player.x);
            }
        }

        // ── Spawn System & Track ──
        this.spawnSystem.update(this.player.z);
        this.track.update(this.player.z);

        // ── Collisions ──
        const obstacles = this.spawnSystem.getActiveObstacles();
        const traffic = this.spawnSystem.getActiveTraffic();

        CollisionSystem.checkPlayerObstacles(this.player, obstacles, {
            onObstacleHit: (obs) => {
                this.player.applyObstacleHit();
                this.score.addCrash();
                this.score.resetCleanRide();
                this.sound.playObstacleCrash();
                this.screenShakeIntensity = 1.0;
                this._flashScreen();
            }
        });

        CollisionSystem.checkPlayerTraffic(this.player, traffic, {
            onVehicleHit: (tv) => {
                this.player.applyVehicleHit();
                this.score.addCrash();
                this.score.resetCleanRide();
                this.sound.playObstacleCrash();
                this.screenShakeIntensity = 1.5;
                this._flashScreen();
            }
        });

        CollisionSystem.checkBotObstacles(this.bots, obstacles);

        this.sideCollisionCooldown -= dt;
        if (this.sideCollisionCooldown <= 0) {
            CollisionSystem.checkBikeVsBike(this.player, this.bots, {
                onSideCollision: (bot, side) => {
                    this.screenShakeIntensity = 0.5;
                    this.player.lateralSpeed += side === 'left' ? -2 : 2;
                    this.sideCollisionCooldown = 0.5;
                }
            });
        }

        // ── Combat ──
        CombatSystem.checkPlayerAttacks(this.player, this.bots, {
            onPlayerHitBot: (bot) => {
                this.score.addHit();
                this.sound.playPunch();
                if (bot.state === 'STUNNED') {
                    this.score.addKnockdown();
                }
            }
        });

        CombatSystem.checkBotAttacks(this.bots, this.player, {
            onBotHitPlayer: (bot) => {
                this.score.addHitByBot();
                this.score.resetCleanRide();
                this.sound.playBotCrash();
                this.screenShakeIntensity = 0.8;
                this._flashScreen();
            }
        });

        // ── Clean Ride ──
        if (this.player.state === 'RIDING') {
            this.score.updateCleanRide(dt);
        }

        // ── Overtake Detection ──
        const currentPositions = this._computePositions();
        const playerIdx = currentPositions.indexOf('player');
        const prevPlayerIdx = this.prevPositions.indexOf('player');
        if (playerIdx < prevPlayerIdx) {
            this.score.addOvertake();
            this.sound.playOvertake();
        }
        this.prevPositions = currentPositions;
        this.score.setPlacement(playerIdx + 1);

        // ── Screen Shake Decay ──
        this.screenShakeIntensity *= 0.9;
        if (this.screenShakeIntensity < 0.01) this.screenShakeIntensity = 0;

        // ── Camera Follow ──
        this._updateCamera(dt);

        // ── Check Finish ──
        this._checkFinish();

        // ── Cow Dodge Tracking ──
        // If cow passed by without collision, count as dodge
        for (const obs of obstacles) {
            if (obs.type === 'cow' && obs.active && obs.z < this.player.z - 5) {
                this.score.addCowDodge();
                obs.active = false; // mark so we don't double count
            }
        }
    }

    render() {
        if (!this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }

    _updateCamera(dt) {
        // Third-person chase camera
        const targetX = this.player.x;
        const targetZ = this.player.worldZ + 4;
        const targetY = 2.5;

        const lookAtX = this.player.x;
        const lookAtZ = this.player.worldZ - 6;
        const lookAtY = 1.5;

        // Smooth follow
        this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;

        // Screen shake
        if (this.screenShakeIntensity > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.screenShakeIntensity * 1.5;
            this.camera.position.y += (Math.random() - 0.5) * this.screenShakeIntensity * 0.8;
            this.camera.position.z += (Math.random() - 0.5) * this.screenShakeIntensity * 0.3;
        }

        this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
    }

    _computePositions() {
        const riders = [
            { id: 'player', z: this.player.z },
            ...this.bots.map((b, i) => ({ id: `bot_${i}`, z: b.z }))
        ];
        riders.sort((a, b) => b.z - a.z);
        return riders.map(r => r.id);
    }

    _checkFinish() {
        // Check bots
        for (const bot of this.bots) {
            if (bot.finished && !this.finishOrder.includes(bot)) {
                this.finishOrder.push(bot);
                bot.finishTime = this.raceTimer;
            }
        }

        // Check player
        if (this.player.finished && !this.finishOrder.includes('player')) {
            this.finishOrder.push('player');
            const placement = this.finishOrder.indexOf('player') + 1;
            this.score.setPlacement(placement);
            this.isRunning = false;
            this.sound.stopEngine();

            // Fire finished event
            this.gameState.transition('FINISHED');
        }

        // If all bots finished and player hasn't, DQ scenario — give last place and end
        if (this.finishOrder.length >= GAME_CONFIG.BOTS.COUNT && !this.player.finished) {
            // Player is last — wait for player or timeout
            if (this.raceTimer > 180) { // 3 minute timeout
                this.score.setPlacement(4);
                this.isRunning = false;
                this.sound.stopEngine();
                this.gameState.transition('FINISHED');
            }
        }
    }

    _flashScreen() {
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.classList.add('flash-red');
            setTimeout(() => canvas.classList.remove('flash-red'), 200);
        }
    }

    // ── HUD Data Getters ──
    getSpeed() {
        return Math.floor(this.player.speed);
    }

    getPosition() {
        return this.score.placement;
    }

    getComboMultiplier() {
        return this.score.comboMultiplier;
    }

    getScore() {
        return this.score.computeTotal();
    }

    getRaceTime() {
        return this.raceTimer;
    }

    getMinimapData() {
        const data = {
            player: { x: this.player.x, z: this.player.z },
            bots: this.bots.map(b => ({ x: b.x, z: b.z })),
            trackLength: GAME_CONFIG.TRACK_LENGTH,
        };
        return data;
    }

    resize(width, height) {
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    dispose() {
        // Clean up
        if (this.scene) {
            this.scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
        }
        this.scene = null;
        this.camera = null;
    }
}
