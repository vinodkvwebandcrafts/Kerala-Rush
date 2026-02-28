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
        this.propData = []; // Store metadata for lazy rendering
        this.activeProps = new Map(); // Store currently active meshes keyed by id
        this.trackLength = GAME_CONFIG.TRACK_LENGTH;
        this.segmentLength = GAME_CONFIG.SEGMENT_LENGTH;
        this.roadWidth = GAME_CONFIG.ROAD_WIDTH;
        this.totalSegments = Math.floor(this.trackLength / this.segmentLength);
        this.meshGroup = new THREE.Group();
    }

    generate() {
        this._buildSegments();
        this._buildRoadMesh();
        this._buildGroundMesh();
        this._buildProps();
        return this.meshGroup;
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
        const darkColor = new THREE.Color(this.mapConfig.roadColor);
        const lightColor = new THREE.Color(this.mapConfig.roadColor).offsetHSL(0, 0, 0.05);

        for (let i = 0; i < this.segments.length - 1; i++) {
            const seg = this.segments[i];
            const nextSeg = this.segments[i + 1];
            const color = i % 2 === 0 ? darkColor : lightColor;

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

            // Lane markings (center dashed line)
            if (i % 3 === 0) {
                const lineGeo = new THREE.PlaneGeometry(0.15, this.segmentLength * 0.5);
                const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.6, transparent: true });
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(
                    (seg.xOffset + nextSeg.xOffset) / 2,
                    0.01,
                    -(seg.z + nextSeg.z) / 2
                );
                roadGroup.add(line);
            }

            // Road edges (white line on both sides)
            if (i % 2 === 0) {
                for (const side of [-1, 1]) {
                    const edgeGeo = new THREE.PlaneGeometry(0.12, this.segmentLength);
                    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
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
        let propId = 0;

        // Trees along the road
        for (let i = 5; i < this.segments.length; i += 8) {
            const seg = this.segments[i];
            for (const side of [-1, 1]) {
                const x = seg.xOffset + side * (this.roadWidth / 2 + randomRange(3, 8));
                this.propData.push({
                    id: propId++,
                    type: 'tree',
                    x: x,
                    z: seg.z,
                    scale: randomRange(0.8, 1.3)
                });
            }
        }

        // Small buildings / shops along some segments
        const buildingColors = [0xd4a574, 0xc4956a, 0xb0845a, 0xe8c090];
        for (let i = 10; i < this.segments.length; i += 20) {
            const seg = this.segments[i];
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = seg.xOffset + side * (this.roadWidth / 2 + randomRange(8, 14));
            const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
            this.propData.push({
                id: propId++,
                type: 'building',
                x: x,
                z: seg.z,
                color: color
            });
        }
    }

    update(playerZ) {
        const renderDistBehind = 150;
        const renderDistAhead = GAME_CONFIG.RENDER_DISTANCE * GAME_CONFIG.SEGMENT_LENGTH; // e.g., 60 * 20 = 1200

        for (const prop of this.propData) {
            const inRange = prop.z > playerZ - renderDistBehind && prop.z < playerZ + renderDistAhead;

            if (inRange && !this.activeProps.has(prop.id)) {
                // Spawn prop
                const mesh = this._spawnProp(prop);
                this.meshGroup.add(mesh);
                this.activeProps.set(prop.id, mesh);
            } else if (!inRange && this.activeProps.has(prop.id)) {
                // Despawn prop
                const mesh = this.activeProps.get(prop.id);
                this.meshGroup.remove(mesh);
                this.activeProps.delete(prop.id);
            }
        }
    }

    _spawnProp(prop) {
        if (prop.type === 'tree') {
            const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
            const glbModel = this.assets ? this.assets.getModel('tree_elm') : null;

            const tree = this._createTree(trunkMat, treeMat, glbModel, prop.scale);
            tree.position.set(prop.x, 0, -prop.z);
            return tree;
        } else if (prop.type === 'building') {
            const building = this._createBuilding(prop.color);
            building.position.set(prop.x, 0, -prop.z);
            return building;
        }
    }

    _createTree(trunkMat, leafMat, glbModel, scale) {
        if (glbModel) {
            const clone = glbModel.clone();
            clone.scale.setScalar(scale);
            return clone;
        }

        const group = new THREE.Group();
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 5, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2.5;
        group.add(trunk);

        // Leaves (coconut palm style - several elongated ovals)
        for (let i = 0; i < 7; i++) {
            const leafGeo = new THREE.SphereGeometry(1.2, 5, 4);
            leafGeo.scale(1, 0.3, 0.5);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
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
