/* ═══════════════════════════════════════════════════
   Obstacle — Static road obstacles (cows, potholes, roadblocks)
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';

export class Obstacle {
    constructor(type, x, z, assets) {
        this.type = type; // 'cow', 'pothole', 'roadblock'
        this.x = x;
        this.z = z;
        this.assets = assets;
        this.active = true;
        this.mesh = this._buildMesh(type);
        this.mesh.position.set(x, 0, -z);

        // Hitbox half-extents
        this.hitboxHW = type === 'pothole' ? 0.8 : 1.0;
        this.hitboxHD = type === 'pothole' ? 0.5 : 1.0;
    }

    _buildMesh(type) {
        const group = new THREE.Group();

        switch (type) {
            case 'cow': {
                let modelLoaded = false;
                if (this.assets) {
                    const cowModel = this.assets.getModel('cow');
                    if (cowModel) {
                        modelLoaded = true;
                        // Determine scale based on testing, but let's assume 0.5 for now
                        cowModel.scale.setScalar(0.5);

                        // Lying down rotation (same as old logic)
                        if (Math.random() > 0.5) {
                            cowModel.rotation.y = Math.random() * Math.PI;
                        }

                        group.add(cowModel);
                    }
                }

                if (!modelLoaded) {
                    // Body
                    const body = new THREE.Mesh(
                        new THREE.BoxGeometry(1.2, 1.0, 2.0),
                        new THREE.MeshLambertMaterial({ color: 0xd4a574 })
                    );
                    body.position.y = 0.8;
                    group.add(body);

                    // Head
                    const head = new THREE.Mesh(
                        new THREE.BoxGeometry(0.6, 0.6, 0.7),
                        new THREE.MeshLambertMaterial({ color: 0xc49464 })
                    );
                    head.position.set(0, 1.0, 1.2);
                    group.add(head);

                    // Legs
                    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
                    const legMat = new THREE.MeshLambertMaterial({ color: 0xb88454 });
                    for (const [lx, lz] of [[-0.4, 0.6], [0.4, 0.6], [-0.4, -0.6], [0.4, -0.6]]) {
                        const leg = new THREE.Mesh(legGeo, legMat);
                        leg.position.set(lx, 0.3, lz);
                        group.add(leg);
                    }

                    // Spots (dark patches)
                    const spotGeo = new THREE.BoxGeometry(0.5, 0.02, 0.6);
                    const spotMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
                    const spot = new THREE.Mesh(spotGeo, spotMat);
                    spot.position.set(0.2, 1.31, 0);
                    group.add(spot);

                    // Lying down rotation
                    if (Math.random() > 0.5) {
                        group.rotation.y = Math.random() * Math.PI;
                    }
                }
                break;
            }

            case 'pothole': {
                const hole = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.8, 0.8, 0.1, 12),
                    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
                );
                hole.position.y = 0.01;
                group.add(hole);

                // Cracked edges
                const edgeGeo = new THREE.RingGeometry(0.7, 1.0, 12);
                const edgeMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide });
                const edge = new THREE.Mesh(edgeGeo, edgeMat);
                edge.rotation.x = -Math.PI / 2;
                edge.position.y = 0.02;
                group.add(edge);
                break;
            }

            case 'roadblock': {
                // Barrier
                const barrier = new THREE.Mesh(
                    new THREE.BoxGeometry(3, 0.8, 0.3),
                    new THREE.MeshLambertMaterial({ color: 0xff6600 })
                );
                barrier.position.y = 0.5;
                group.add(barrier);

                // Stripes
                for (let i = 0; i < 3; i++) {
                    const stripe = new THREE.Mesh(
                        new THREE.BoxGeometry(0.6, 0.78, 0.32),
                        new THREE.MeshLambertMaterial({ color: 0xffffff })
                    );
                    stripe.position.set(-1 + i * 1, 0.5, 0);
                    group.add(stripe);
                }

                // Posts
                for (const px of [-1.3, 1.3]) {
                    const post = new THREE.Mesh(
                        new THREE.BoxGeometry(0.15, 1.0, 0.15),
                        new THREE.MeshLambertMaterial({ color: 0x888888 })
                    );
                    post.position.set(px, 0.5, 0);
                    group.add(post);
                }
                break;
            }
        }

        return group;
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
