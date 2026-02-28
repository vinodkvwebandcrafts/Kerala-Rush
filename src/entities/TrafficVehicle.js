/* ═══════════════════════════════════════════════════
   TrafficVehicle — Moving traffic (cars, autos)
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { clamp, randomRange } from '../utils/math.js';

export class TrafficVehicle {
    constructor(type, x, z, direction, assets) {
        this.type = type;           // 'car', 'auto'
        this.x = x;
        this.z = z;
        this.direction = direction; // 1 = same dir, -1 = oncoming
        this.assets = assets;
        this.speed = type === 'auto' ? randomRange(40, 70) : randomRange(60, 100);
        this.swerveTimer = 0;
        this.swerveDir = 0;
        this.active = true;

        this.mesh = this._buildMesh(type, direction);
        this.mesh.position.set(x, 0, -z);

        this.hitboxHW = type === 'auto' ? 0.7 : 0.9;
        this.hitboxHD = type === 'auto' ? 1.0 : 1.5;
    }

    _buildMesh(type, direction) {
        const group = new THREE.Group();

        if (type === 'auto') {
            // Auto-rickshaw body
            const bodyGeo = new THREE.BoxGeometry(1.2, 1.3, 1.8);
            const bodyMat = new THREE.MeshLambertMaterial({ color: 0x33aa33 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.8;
            group.add(body);

            // Canopy
            const canopyGeo = new THREE.BoxGeometry(1.3, 0.1, 1.9);
            const canopyMat = new THREE.MeshLambertMaterial({ color: 0x228822 });
            const canopy = new THREE.Mesh(canopyGeo, canopyMat);
            canopy.position.y = 1.5;
            group.add(canopy);

            // Front wheel (single)
            const fwGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8);
            const fwMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
            const fw = new THREE.Mesh(fwGeo, fwMat);
            fw.rotation.z = Math.PI / 2;
            fw.position.set(0, 0.25, 0.9);
            group.add(fw);

            // Rear wheels
            for (const sx of [-0.6, 0.6]) {
                const rw = new THREE.Mesh(fwGeo, fwMat);
                rw.rotation.z = Math.PI / 2;
                rw.position.set(sx, 0.25, -0.7);
                group.add(rw);
            }

            // Headlight
            const lightGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const lightMat = new THREE.MeshBasicMaterial({
                color: direction === -1 ? 0xffff88 : 0xff3300
            });
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(0, 0.9, direction === -1 ? -1.0 : 1.0);
            group.add(light);

        } else {
            // Car
            const bodyGeo = new THREE.BoxGeometry(1.8, 1.0, 3.5);
            const carColors = [0x4444cc, 0xcc4444, 0xcccc44, 0x44cccc, 0xffffff];
            const color = carColors[Math.floor(Math.random() * carColors.length)];
            const bodyMat = new THREE.MeshLambertMaterial({ color });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.7;
            group.add(body);

            // Cabin
            const cabinGeo = new THREE.BoxGeometry(1.6, 0.7, 1.8);
            const cabinMat = new THREE.MeshLambertMaterial({ color: 0x87ceeb, opacity: 0.6, transparent: true });
            const cabin = new THREE.Mesh(cabinGeo, cabinMat);
            cabin.position.set(0, 1.3, -0.3);
            group.add(cabin);

            // Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8);
            const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
            for (const [wx, wz] of [[-0.85, 1.0], [0.85, 1.0], [-0.85, -1.0], [0.85, -1.0]]) {
                const w = new THREE.Mesh(wheelGeo, wheelMat);
                w.rotation.z = Math.PI / 2;
                w.position.set(wx, 0.3, wz);
                group.add(w);
            }

            // Headlights
            for (const lx of [-0.6, 0.6]) {
                const hl = new THREE.Mesh(
                    new THREE.SphereGeometry(0.12, 6, 6),
                    new THREE.MeshBasicMaterial({
                        color: direction === -1 ? 0xffff88 : 0xff2200
                    })
                );
                hl.position.set(lx, 0.6, direction === -1 ? -1.8 : 1.8);
                group.add(hl);
            }
        }

        // Face the direction
        if (direction === -1) {
            group.rotation.y = Math.PI;
        }

        return group;
    }

    update(dt) {
        // Move along the track
        this.z += this.speed * this.direction * dt * 0.5;

        // Auto-rickshaw random swerve
        if (this.type === 'auto') {
            this.swerveTimer -= dt;
            if (this.swerveTimer <= 0) {
                this.swerveDir = randomRange(-1, 1) * 2;
                this.swerveTimer = randomRange(1, 3);
            }
            this.x += this.swerveDir * dt;
        }

        this.mesh.position.set(this.x, 0, -this.z);
    }

    getBounds() {
        return {
            minX: this.x - this.hitboxHW,
            maxX: this.x + this.hitboxHW,
            minZ: this.z - this.hitboxHD,
            maxZ: this.z + this.hitboxHD,
        };
    }
}
