/* ═══════════════════════════════════════════════════
   TrackGenerator — Procedural Road Builder
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';
import { lerp, randomRange } from '../utils/math.js';

export class TrackGenerator {
    constructor(mapConfig, assets) {
        this.mapConfig = mapConfig;
        this.assets = assets;
        this.segments = [];
        this.trackLength = GAME_CONFIG.TRACK_LENGTH;
        this.segmentLength = GAME_CONFIG.SEGMENT_LENGTH;
        this.roadWidth = GAME_CONFIG.ROAD_WIDTH;
        this.totalSegments = Math.floor(this.trackLength / this.segmentLength);
        this.meshGroup = new THREE.Group();

        // ── Cached materials (created once, shared by all props) ──
        this.treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
        this.trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
        this.glbTreeModel = null; // cached GLB reference (not a clone)

        // ── Prop pool ──
        this.props = []; // { mesh, z } — all props pre-created, toggled via .visible
    }

    generate() {
        this._buildSegments();
        this._buildRoadMesh();
        this._buildGroundMesh();
        this._buildStartFinishLines();
        this._buildProps();
        return this.meshGroup;
    }

    _buildStartFinishLines() {
        const hw = this.roadWidth / 2;
        const checkerSize = 1.0;
        const numCheckers = Math.ceil(this.roadWidth / checkerSize);

        // Helper to create a checkered line banner
        const createCheckerLine = (z, label) => {
            const group = new THREE.Group();

            // Checkered pattern (2 rows)
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < numCheckers; col++) {
                    const isWhite = (row + col) % 2 === 0;
                    const geo = new THREE.PlaneGeometry(checkerSize, checkerSize);
                    const mat = new THREE.MeshBasicMaterial({
                        color: isWhite ? 0xffffff : 0x111111,
                    });
                    const tile = new THREE.Mesh(geo, mat);
                    tile.rotation.x = -Math.PI / 2;
                    tile.position.set(
                        -hw + col * checkerSize + checkerSize / 2,
                        0.02,
                        -z - row * checkerSize
                    );
                    group.add(tile);
                }
            }

            // Vertical banner poles + banner
            for (const side of [-1, 1]) {
                // Pole
                const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 6);
                const poleMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
                const pole = new THREE.Mesh(poleGeo, poleMat);
                pole.position.set(side * (hw + 0.5), 2.5, -z);
                group.add(pole);
            }

            // Banner across the top
            const bannerGeo = new THREE.PlaneGeometry(this.roadWidth + 1, 1.2);
            const bannerColor = label === 'START' ? 0x22cc44 : 0xcc2222;
            const bannerMat = new THREE.MeshBasicMaterial({
                color: bannerColor,
                side: THREE.DoubleSide,
            });
            const banner = new THREE.Mesh(bannerGeo, bannerMat);
            banner.position.set(0, 4.5, -z);
            group.add(banner);

            return group;
        };

        // Start line at Z = 0
        const startLine = createCheckerLine(0, 'START');
        this.meshGroup.add(startLine);

        // Finish line at track end
        const finishLine = createCheckerLine(this.trackLength, 'FINISH');
        this.meshGroup.add(finishLine);
    }

    _buildSegments() {
        let currentCurve = 0;
        const curveIntensity = this.mapConfig.curveIntensity;

        for (let i = 0; i < this.totalSegments; i++) {
            // Periodic curve changes
            if (i % 15 === 0) {
                currentCurve = randomRange(-curveIntensity, curveIntensity) * 0.03;
            }

            this.segments.push({
                index: i,
                z: i * this.segmentLength,
                curve: currentCurve,
                xOffset: 0, // computed below
                hasObstacle: false,
                obstacleType: null,
                obstacleX: 0,
            });
        }

        // Compute cumulative x offsets from curves
        let x = 0;
        for (let i = 0; i < this.segments.length; i++) {
            x += this.segments[i].curve * this.segmentLength;
            this.segments[i].xOffset = x;
        }
    }

    _buildRoadMesh() {
        // Create a long flat plane per road segment with alternating colors
        const roadGroup = new THREE.Group();
        const roadColor = new THREE.Color(this.mapConfig.roadColor);

        for (let i = 0; i < this.segments.length - 1; i++) {
            const seg = this.segments[i];
            const nextSeg = this.segments[i + 1];
            const color = roadColor;

            const geometry = new THREE.BufferGeometry();
            const hw = this.roadWidth / 2;

            const vertices = new Float32Array([
                seg.xOffset - hw, 0, -seg.z,
                seg.xOffset + hw, 0, -seg.z,
                nextSeg.xOffset + hw, 0, -nextSeg.z,
                seg.xOffset - hw, 0, -seg.z,
                nextSeg.xOffset + hw, 0, -nextSeg.z,
                nextSeg.xOffset - hw, 0, -nextSeg.z,
            ]);

            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.computeVertexNormals();

            const material = new THREE.MeshLambertMaterial({ color });
            const mesh = new THREE.Mesh(geometry, material);
            roadGroup.add(mesh);

            // Lane markings (center dashed white line — shorter dashes)
            if (i % 4 === 0) {
                const lineGeo = new THREE.PlaneGeometry(0.3, this.segmentLength * 0.3);
                const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(
                    (seg.xOffset + nextSeg.xOffset) / 2,
                    0.01,
                    -(seg.z + nextSeg.z) / 2
                );
                roadGroup.add(line);
            }

            // Road edges (continuous solid yellow)
            for (const side of [-1, 1]) {
                const edgeGeo = new THREE.PlaneGeometry(0.25, this.segmentLength);
                const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
                const edge = new THREE.Mesh(edgeGeo, edgeMat);
                edge.rotation.x = -Math.PI / 2;
                edge.position.set(
                    (seg.xOffset + nextSeg.xOffset) / 2 + side * hw,
                    0.01,
                    -(seg.z + nextSeg.z) / 2
                );
                roadGroup.add(edge);
            }
        }

        this.meshGroup.add(roadGroup);
    }

    _buildGroundMesh() {
        const groundGeo = new THREE.PlaneGeometry(500, this.trackLength + 200);
        const groundMat = new THREE.MeshLambertMaterial({ color: this.mapConfig.groundColor });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.05, -this.trackLength / 2);
        this.meshGroup.add(ground);
    }

    _buildProps() {
        // Trees disabled for now per user request
        // Cache the GLB tree model once (get the original, we'll clone from this)
        // if (this.assets) {
        //     const model = this.assets.getModel('tree_elm');
        //     if (model) this.glbTreeModel = model;
        // }

        // Pre-create ALL tree meshes (hidden). Toggling .visible is nearly free.
        // for (let i = 5; i < this.segments.length; i += 8) {
        //     const seg = this.segments[i];
        //     for (const side of [-1, 1]) {
        //         const x = seg.xOffset + side * (this.roadWidth / 2 + randomRange(3, 8));
        //         const scale = randomRange(0.8, 1.3);
        //         const tree = this._createTree(scale);
        //         tree.position.set(x, 0, -seg.z);
        //         tree.visible = false; // start hidden
        //         this.meshGroup.add(tree);
        //         this.props.push({ mesh: tree, z: seg.z });
        //     }
        // }

        // Pre-create ALL buildings (hidden)
        const buildingColors = [0xd4a574, 0xc4956a, 0xb0845a, 0xe8c090];
        for (let i = 10; i < this.segments.length; i += 20) {
            const seg = this.segments[i];
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = seg.xOffset + side * (this.roadWidth / 2 + randomRange(8, 14));
            const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
            const building = this._createBuilding(color);
            building.position.set(x, 0, -seg.z);
            building.visible = false;
            this.meshGroup.add(building);
            this.props.push({ mesh: building, z: seg.z });
        }
    }

    update(playerZ) {
        // Use fog-matched distances — no point rendering what the fog hides
        const renderDistBehind = 100;
        const renderDistAhead = this.mapConfig.fogFar || 400;

        for (const prop of this.props) {
            const inRange = prop.z > playerZ - renderDistBehind && prop.z < playerZ + renderDistAhead;
            prop.mesh.visible = inRange;
        }
    }

    _createTree(scale) {
        if (this.glbTreeModel) {
            const clone = this.glbTreeModel.clone();
            clone.scale.setScalar(scale);
            return clone;
        }

        const group = new THREE.Group();
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 5, 6);
        const trunk = new THREE.Mesh(trunkGeo, this.trunkMat);
        trunk.position.y = 2.5;
        group.add(trunk);

        // Leaves (coconut palm style - several elongated ovals)
        for (let i = 0; i < 7; i++) {
            const leafGeo = new THREE.SphereGeometry(1.2, 5, 4);
            leafGeo.scale(1, 0.3, 0.5);
            const leaf = new THREE.Mesh(leafGeo, this.treeMat);
            const angle = (i / 7) * Math.PI * 2;
            leaf.position.set(Math.cos(angle) * 0.8, 5 + Math.random() * 0.5, Math.sin(angle) * 0.8);
            leaf.rotation.z = Math.cos(angle) * 0.5;
            leaf.rotation.x = Math.sin(angle) * 0.5;
            group.add(leaf);
        }

        group.scale.setScalar(scale);
        return group;
    }

    _createBuilding(color) {
        const group = new THREE.Group();
        const w = randomRange(3, 6);
        const h = randomRange(2, 4);
        const d = randomRange(3, 5);
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = h / 2;
        group.add(mesh);

        // Roof
        const roofGeo = new THREE.BoxGeometry(w + 0.5, 0.2, d + 0.5);
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = h + 0.1;
        group.add(roof);

        return group;
    }

    // Get the road centerX at a given Z distance along the track
    getCenterXAtZ(z) {
        const segIndex = Math.floor(z / this.segmentLength);
        if (segIndex < 0) return 0;
        if (segIndex >= this.segments.length - 1) return this.segments[this.segments.length - 1].xOffset;

        const seg = this.segments[segIndex];
        const nextSeg = this.segments[segIndex + 1];
        const t = (z - seg.z) / this.segmentLength;
        return lerp(seg.xOffset, nextSeg.xOffset, t);
    }

    getSegmentAt(z) {
        const idx = Math.floor(z / this.segmentLength);
        if (idx < 0) return this.segments[0];
        if (idx >= this.segments.length) return this.segments[this.segments.length - 1];
        return this.segments[idx];
    }
}
