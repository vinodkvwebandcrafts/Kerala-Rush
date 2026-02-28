/* ═══════════════════════════════════════════════════
   BotBike — AI-controlled bike entity
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';
import { clamp, lerp, randomRange } from '../utils/math.js';

const BOT_COLORS = [0x3355ff, 0xff9900, 0x9933ff];

export class BotBike {
    constructor(index, type, trackGen, difficultyConfig, assets) {
        this.index = index;
        this.type = type;         // 'aggressive' | 'defensive' | 'balanced'
        this.track = trackGen;
        this.difficulty = difficultyConfig;
        this.assets = assets;

        // Position
        this.x = 0;
        this.z = 0;
        this.y = 0;
        this.speed = 0;
        this.lateralSpeed = 0;

        // State
        this.state = 'RIDING';
        this.stateTimer = 0;
        this.attackCooldown = randomRange(1, 3);
        this.attackSide = null;
        this.attackTimer = 0;
        this.targetLane = randomRange(-3, 3);
        this.laneChangeTimer = randomRange(2, 5);
        this.overtaken = false;
        this.finishTime = 0;

        // Target speed varies by type
        this.baseMaxSpeed = this._getMaxSpeed();
        this.currentMaxSpeed = this.baseMaxSpeed;

        // Build mesh
        this.mesh = this._buildMesh(index);

        // Hitbox
        this.hitboxHW = 0.5;
        this.hitboxHD = 1.0;
    }

    _getMaxSpeed() {
        const base = GAME_CONFIG.BIKES.rat.maxSpeed;
        const mult = this.difficulty.botSpeedMultiplier;
        const typeBonus = {
            aggressive: 0.95,
            defensive: 1.0,
            balanced: 0.97,
        };
        return base * mult * (typeBonus[this.type] || 1.0);
    }

    _buildMesh(index) {
        const group = new THREE.Group();
        const color = BOT_COLORS[index % BOT_COLORS.length];

        // ── Procedural Mesh ──
        // Body
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 2.0);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        group.add(body);

        // Seat
        const seatGeo = new THREE.BoxGeometry(0.5, 0.2, 0.8);
        const seatMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(0, 0.95, -0.2);
        group.add(seat);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 8);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const fw = new THREE.Mesh(wheelGeo, wheelMat);
        fw.rotation.z = Math.PI / 2;
        fw.position.set(0, 0.35, 0.9);
        group.add(fw);
        const rw = new THREE.Mesh(wheelGeo, wheelMat);
        rw.rotation.z = Math.PI / 2;
        rw.position.set(0, 0.35, -0.8);
        group.add(rw);

        // Rider
        const rider = this._buildRider(color);
        rider.position.set(0, 1.0, -0.1);
        group.add(rider);
        this.riderMesh = rider;

        // Headlight
        const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const headlight = new THREE.Mesh(lightGeo, lightMat);
        headlight.position.set(0, 0.7, 1.1);
        group.add(headlight);

        return group;
    }
    _buildRider(color) {
        const group = new THREE.Group();
        // Torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.7, 0.4),
            new THREE.MeshLambertMaterial({ color })
        );
        torso.position.y = 0.5;
        group.add(torso);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0x333333 })
        );
        head.position.y = 1.1;
        group.add(head);

        // Arms
        for (const side of [-1, 1]) {
            const arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.5, 0.15),
                new THREE.MeshLambertMaterial({ color: 0xc68642 })
            );
            arm.position.set(side * 0.35, 0.55, 0.15);
            arm.rotation.x = -0.4;
            arm.name = side === -1 ? 'leftArm' : 'rightArm';
            group.add(arm);
        }

        return group;
    }

    update(dt, playerZ, playerX) {
        if (this.state === 'STUNNED') {
            this.stateTimer -= dt;
            this.speed *= 0.95;
            if (this.stateTimer <= 0) {
                this.state = 'RIDING';
            }
            this._updateMesh();
            return;
        }

        // ── AI Speed Control ──
        // Rubber-banding: bots slow down slightly if too far ahead, speed up if behind
        const distToPlayer = this.z - playerZ;
        let targetSpeed = this.currentMaxSpeed;

        if (distToPlayer > 50) {
            targetSpeed *= 0.85; // slow down if way ahead
        } else if (distToPlayer < -30) {
            targetSpeed *= 1.1;  // speed up if behind
        }

        this.speed = lerp(this.speed, targetSpeed, dt * 2);
        this.speed = clamp(this.speed, 0, this.currentMaxSpeed * 1.1);

        // ── Lane Following ──
        this.laneChangeTimer -= dt;
        if (this.laneChangeTimer <= 0) {
            this.targetLane = randomRange(-3, 3);
            this.laneChangeTimer = randomRange(2, 6);
        }

        const roadCenter = this.track.getCenterXAtZ(this.z);
        const targetX = roadCenter + this.targetLane;
        const dx = targetX - this.x;
        this.lateralSpeed = clamp(dx * 2, -5, 5);

        this.x += this.lateralSpeed * dt;
        this.z += this.speed * dt * 0.5;

        // Clamp to road
        const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2 - 0.5;
        this.x = clamp(this.x, roadCenter - halfRoad, roadCenter + halfRoad);

        // ── Combat AI ──
        this.attackCooldown -= dt;
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackSide = null;
            }
        }

        if (this.attackCooldown <= 0 && this.type !== 'defensive') {
            // Check if player is nearby
            const dz = Math.abs(this.z - playerZ);
            const dxPlayer = Math.abs(this.x - playerX);
            if (dz < 3 && dxPlayer < 3) {
                const aggMod = this.difficulty.botAggressionMultiplier;
                const attackChance = this.type === 'aggressive' ? 0.02 * aggMod : 0.008 * aggMod;
                if (Math.random() < attackChance) {
                    this.attackSide = playerX < this.x ? 'left' : 'right';
                    this.attackTimer = 0.3;
                    this.attackCooldown = randomRange(2, 4) / aggMod;
                }
            }
        }

        // Lean animation
        const lean = -this.lateralSpeed * 0.04;
        this.mesh.rotation.z = lerp(this.mesh.rotation.z, lean, 0.1);

        this._updateMesh();
    }

    applyHit(fromSide) {
        this.state = 'STUNNED';
        this.stateTimer = GAME_CONFIG.COMBAT.STUN_DURATION;
        this.speed *= 0.6;
        this.lateralSpeed += fromSide === 'left' ? 3 : -3;
    }

    applyObstacleHit() {
        this.speed *= GAME_CONFIG.COLLISION.OBSTACLE_SPEED_RESET;
        this.state = 'STUNNED';
        this.stateTimer = 0.6;
    }

    _updateMesh() {
        this.mesh.position.set(this.x, this.y, -this.z);
    }

    getBounds() {
        return {
            minX: this.x - this.hitboxHW,
            maxX: this.x + this.hitboxHW,
            minZ: this.z - this.hitboxHD,
            maxZ: this.z + this.hitboxHD,
        };
    }

    get isAttacking() {
        return this.attackSide !== null && this.attackTimer > 0;
    }

    get finished() {
        return this.z >= GAME_CONFIG.TRACK_LENGTH;
    }
}
