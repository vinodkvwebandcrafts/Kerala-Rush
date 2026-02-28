/* ═══════════════════════════════════════════════════
   CollisionSystem — AABB collision detection
   ═══════════════════════════════════════════════════ */

export class CollisionSystem {
    static aabbOverlap(a, b) {
        return a.minX < b.maxX && a.maxX > b.minX &&
            a.minZ < b.maxZ && a.maxZ > b.minZ;
    }

    static checkPlayerObstacles(player, obstacles, callbacks) {
        if (player.state !== 'RIDING') return;

        const pBounds = player.getBounds();
        for (const obs of obstacles) {
            if (!obs.active) continue;
            const oBounds = obs.getBounds();
            if (CollisionSystem.aabbOverlap(pBounds, oBounds)) {
                obs.active = false;
                callbacks.onObstacleHit(obs);
            }
        }
    }

    static checkPlayerTraffic(player, traffic, callbacks) {
        if (player.state !== 'RIDING') return;

        const pBounds = player.getBounds();
        for (const tv of traffic) {
            if (!tv.active) continue;
            const tBounds = tv.getBounds();
            if (CollisionSystem.aabbOverlap(pBounds, tBounds)) {
                tv.active = false;
                callbacks.onVehicleHit(tv);
            }
        }
    }

    static checkBotObstacles(bots, obstacles) {
        for (const bot of bots) {
            if (bot.state !== 'RIDING') continue;
            const bBounds = bot.getBounds();
            for (const obs of obstacles) {
                if (!obs.active) continue;
                if (CollisionSystem.aabbOverlap(bBounds, obs.getBounds())) {
                    bot.applyObstacleHit();
                }
            }
        }
    }

    static checkBikeVsBike(player, bots, callbacks) {
        if (player.state !== 'RIDING') return;

        const pBounds = player.getBounds();
        for (const bot of bots) {
            if (bot.state !== 'RIDING') continue;
            const bBounds = bot.getBounds();
            if (CollisionSystem.aabbOverlap(pBounds, bBounds)) {
                const side = player.x < bot.x ? 'right' : 'left';
                callbacks.onSideCollision(bot, side);
            }
        }
    }
}
