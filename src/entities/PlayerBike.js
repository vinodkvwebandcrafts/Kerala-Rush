/* ═══════════════════════════════════════════════════
   PlayerBike — Player-controlled bike entity
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';
import { clamp, lerp } from '../utils/math.js';

export class PlayerBike {
    constructor(bikeType, charType, trackGen, assets) {
        this.config = GAME_CONFIG.BIKES[bikeType];
        this.charType = charType;
        this.track = trackGen;
        this.assets = assets;

        // Position & movement
        this.x = 0;            // lateral position
        this.z = 0;            // distance along track
        this.y = 0;            // vertical (for jumps/falls)
        this.speed = 0;        // current speed (km/h conceptual)
        this.lateralSpeed = 0; // sideways movement

        // State
        this.state = 'RIDING';   // RIDING, STUNNED, FALLEN, RECOVERING
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.attackSide = null;  // 'left' | 'right' | null
        this.attackTimer = 0;

        // 3D representation
        this.mesh = this._buildMesh(bikeType);
        this.mesh.position.set(0, 0, 0);

        // Bounding box for collision (half-extents)
        this.hitboxHW = 0.5;  // half width
        this.hitboxHD = 1.0;  // half depth
    }

    _buildMesh(type) {
        const group = new THREE.Group();

        // ── Procedural Mesh ──
        // Bike body
        const bodyColor = type === 'sports' ? 0xff3333 : 0x666666;
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 2.0);
        const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        group.add(body);

        // Seat
        const seatGeo = new THREE.BoxGeometry(0.5, 0.2, 0.8);
        const seatMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(0, 0.95, -0.2);
        group.add(seat);

        // Front wheel
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 12);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.position.set(0, 0.35, 0.9);
        group.add(frontWheel);

        // Rear wheel
        const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
        rearWheel.rotation.z = Math.PI / 2;
        rearWheel.position.set(0, 0.35, -0.8);
        group.add(rearWheel);

        // Handlebars
        const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(0, 1.0, 0.7);
        group.add(handle);

        // Rider (simple shapes)
        const riderGroup = this._buildRider();
        riderGroup.position.set(0, 1.0, -0.1);
        group.add(riderGroup);
        this.riderMesh = riderGroup;

        // Headlight
        const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const headlight = new THREE.Mesh(lightGeo, lightMat);
        headlight.position.set(0, 0.7, 1.1);
        group.add(headlight);

        return group;
    }

    _buildRider() {
        const group = new THREE.Group();
        const skinColor = 0xc68642;

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.4);
        const torsoMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 0.5;
        group.add(torso);

        // Head with helmet
        const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.1;
        group.add(head);

        // Arms
        for (const side of [-1, 1]) {
            const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
            const armMat = new THREE.MeshLambertMaterial({ color: skinColor });
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(side * 0.35, 0.55, 0.15);
            arm.rotation.x = -0.4;
            arm.name = side === -1 ? 'leftArm' : 'rightArm';
            group.add(arm);
        }

        return group;
    }

    update(dt, input, difficulty) {
        if (this.state === 'STUNNED') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'RIDING';
            }
            this.speed *= 0.95;
            this._updateMeshPosition();
            return;
        }

        if (this.state === 'FALLEN') {
            this.stateTimer -= dt;
            this.speed = 0;
            if (this.stateTimer <= 0) {
                this.state = 'RECOVERING';
                this.stateTimer = 0.5;
            }
            this._updateMeshPosition();
            return;
        }

        if (this.state === 'RECOVERING') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'RIDING';
                this.mesh.rotation.z = 0;
                this.mesh.rotation.x = 0;
            }
            this._updateMeshPosition();
            return;
        }

        // ── Acceleration / Braking ──
        const maxSpeed = this.config.maxSpeed;
        if (input.accelerate) {
            this.speed += this.config.acceleration * dt * 60;
        } else {
            this.speed *= 0.995; // coast deceleration
        }

        if (input.brake) {
            this.speed -= this.config.braking * dt * 60;
        }

        this.speed = clamp(this.speed, 0, maxSpeed);

        // ── Steering ──
        const handling = this.config.handling;
        if (input.left) {
            this.lateralSpeed -= handling * dt * 60 * 0.15;
        }
        if (input.right) {
            this.lateralSpeed += handling * dt * 60 * 0.15;
        }

        // Lateral friction
        this.lateralSpeed *= GAME_CONFIG.PHYSICS.LATERAL_FRICTION;
        this.lateralSpeed = clamp(this.lateralSpeed, -GAME_CONFIG.PHYSICS.MAX_LATERAL_SPEED, GAME_CONFIG.PHYSICS.MAX_LATERAL_SPEED);

        // Follow road curve
        const centerX = this.track.getCenterXAtZ(this.z);
        const roadPull = (centerX - this.x) * 0.01 * (this.speed / maxSpeed);

        this.x += (this.lateralSpeed + roadPull) * dt * 60;
        this.z += this.speed * dt * 0.5; // scale speed to world units

        // Clamp to road bounds
        const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2 - 0.5;
        const roadCenter = this.track.getCenterXAtZ(this.z);
        this.x = clamp(this.x, roadCenter - halfRoad, roadCenter + halfRoad);

        // ── Combat Cooldown ──
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackSide = null;
                // Reset arm position
                this._resetArms();
            }
        }

        // ── Lean Animation ──
        const targetLean = -this.lateralSpeed * 0.08;
        this.mesh.rotation.z = lerp(this.mesh.rotation.z, targetLean, 0.1);

        this._updateMeshPosition();
    }

    attack(side) {
        if (this.attackCooldown > 0 || this.state !== 'RIDING') return false;

        this.attackSide = side;
        this.attackTimer = 0.3;
        this.attackCooldown = GAME_CONFIG.COMBAT.ATTACK_COOLDOWN;

        // Animate arm
        const armName = side === 'left' ? 'leftArm' : 'rightArm';
        const arm = this.riderMesh.getObjectByName(armName);
        if (arm) {
            arm.rotation.x = -1.2;
            arm.rotation.z = side === 'left' ? -0.8 : 0.8;
        }

        return true;
    }

    _resetArms() {
        ['leftArm', 'rightArm'].forEach(name => {
            const arm = this.riderMesh.getObjectByName(name);
            if (arm) {
                arm.rotation.x = -0.4;
                arm.rotation.z = 0;
            }
        });
    }

    applyHit(fromSide) {
        this.state = 'STUNNED';
        this.stateTimer = GAME_CONFIG.COMBAT.STUN_DURATION;
        this.speed *= 0.7;
        this.lateralSpeed += fromSide === 'left' ? GAME_CONFIG.COMBAT.KNOCKBACK_FORCE : -GAME_CONFIG.COMBAT.KNOCKBACK_FORCE;
    }

    applyObstacleHit() {
        this.speed *= GAME_CONFIG.COLLISION.OBSTACLE_SPEED_RESET;
        this.state = 'STUNNED';
        this.stateTimer = 0.8;
        this.mesh.rotation.x = 0.1;
    }

    applyVehicleHit() {
        this.speed *= 0.2;
        this.state = 'STUNNED';
        this.stateTimer = GAME_CONFIG.COLLISION.VEHICLE_STUN_TIME;
        this.lateralSpeed = (Math.random() - 0.5) * 4;
    }

    _updateMeshPosition() {
        this.mesh.position.set(this.x, this.y, -this.z);
    }

    // Get world-space bounding box
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

    get worldZ() {
        return -this.z;
    }
}
