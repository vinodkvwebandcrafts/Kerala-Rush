/* ═══════════════════════════════════════════════════
   SpawnSystem — Manages obstacle & traffic spawning
   ═══════════════════════════════════════════════════ */

import { Obstacle } from '../entities/Obstacle.js';
import { TrafficVehicle } from '../entities/TrafficVehicle.js';
import { GAME_CONFIG } from '../config.js';
import { randomRange, randomInt } from '../utils/math.js';

export class SpawnSystem {
    constructor(scene, trackGen, mapConfig, difficultyConfig, assets) {
        this.scene = scene;
        this.track = trackGen;
        this.mapConfig = mapConfig;
        this.difficulty = difficultyConfig;
        this.assets = assets;
        this.obstacles = [];
        this.traffic = [];
        this.lastObstacleZ = 100;
        this.lastTrafficZ = 80;
        this.cowCount = 0;
    }

    update(playerZ) {
        // Spawn obstacles ahead of the player
        const spawnAhead = 200;
        const despawnBehind = 50;

        while (this.lastObstacleZ < playerZ + spawnAhead) {
            const spawnChance = this.mapConfig.obstacleDensity * this.difficulty.obstacleSpawnRate;
            if (Math.random() < spawnChance * 0.15) {
                this._spawnObstacle(this.lastObstacleZ);
            }
            this.lastObstacleZ += randomRange(15, 30);
        }

        // Spawn traffic
        while (this.lastTrafficZ < playerZ + spawnAhead) {
            const trafficChance = this.mapConfig.trafficDensity * this.difficulty.trafficDensity;
            if (Math.random() < trafficChance * 0.12) {
                this._spawnTraffic(this.lastTrafficZ);
            }
            this.lastTrafficZ += randomRange(20, 40);
        }

        // Update traffic
        const dt = 1 / 60; // approximate
        for (const tv of this.traffic) {
            tv.update(dt);
        }

        // Despawn behind player
        this._cleanupBehind(playerZ, despawnBehind);
    }

    _spawnObstacle(z) {
        const types = ['cow', 'cow', 'pothole', 'pothole', 'roadblock'];
        const type = types[randomInt(0, types.length - 1)];
        const roadCenter = this.track.getCenterXAtZ(z);
        const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2 - 1.5;
        const x = roadCenter + randomRange(-halfRoad, halfRoad);

        const obs = new Obstacle(type, x, z, this.assets);
        this.obstacles.push(obs);
        this.scene.add(obs.mesh);

        if (type === 'cow') this.cowCount++;
    }

    _spawnTraffic(z) {
        const isOncoming = Math.random() > 0.4;
        const direction = isOncoming ? -1 : 1;
        const type = Math.random() > 0.5 ? 'auto' : 'car';
        const roadCenter = this.track.getCenterXAtZ(z);
        const side = isOncoming ? -1 : 1;
        const x = roadCenter + side * randomRange(1, GAME_CONFIG.ROAD_WIDTH / 2 - 1);

        const tv = new TrafficVehicle(type, x, z, direction, this.assets);
        this.traffic.push(tv);
        this.scene.add(tv.mesh);
    }

    _cleanupBehind(playerZ, distance) {
        // Remove obstacles behind player
        this.obstacles = this.obstacles.filter(obs => {
            if (obs.z < playerZ - distance) {
                this.scene.remove(obs.mesh);
                return false;
            }
            return true;
        });

        // Remove traffic behind or too far ahead
        this.traffic = this.traffic.filter(tv => {
            if (tv.z < playerZ - distance || tv.z > playerZ + 300) {
                this.scene.remove(tv.mesh);
                return false;
            }
            return true;
        });
    }

    getActiveObstacles() {
        return this.obstacles;
    }

    getActiveTraffic() {
        return this.traffic;
    }
}
