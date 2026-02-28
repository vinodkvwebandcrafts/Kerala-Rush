/* ═══════════════════════════════════════════════════
   CombatSystem — Melee attack resolution
   ═══════════════════════════════════════════════════ */

import { GAME_CONFIG } from '../config.js';

export class CombatSystem {
    static checkPlayerAttacks(player, bots, callbacks) {
        if (!player.isAttacking) return;

        const range = GAME_CONFIG.COMBAT.ATTACK_RANGE;
        for (const bot of bots) {
            if (bot.state === 'STUNNED') continue;
            const dz = Math.abs(player.z - bot.z);
            const dx = Math.abs(player.x - bot.x);

            // Check if bot is on the correct side
            const isLeftSide = bot.x < player.x;
            if (player.attackSide === 'left' && !isLeftSide) continue;
            if (player.attackSide === 'right' && isLeftSide) continue;

            if (dz < range && dx < range) {
                bot.applyHit(player.attackSide);
                callbacks.onPlayerHitBot(bot);
                return; // only hit one bot per attack
            }
        }
    }

    static checkBotAttacks(bots, player, callbacks) {
        if (player.state !== 'RIDING') return;

        for (const bot of bots) {
            if (!bot.isAttacking) continue;

            const dz = Math.abs(bot.z - player.z);
            const dx = Math.abs(bot.x - player.x);
            const range = GAME_CONFIG.COMBAT.ATTACK_RANGE;

            if (dz < range && dx < range) {
                player.applyHit(bot.attackSide === 'left' ? 'right' : 'left');
                callbacks.onBotHitPlayer(bot);
            }
        }
    }
}
