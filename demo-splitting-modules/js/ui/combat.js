const CombatUI = {
    resolve(game, attacker, defender, opts) {
        const options = opts || {};
        const result = Combat.resolveCombat(game, attacker, defender);
        if (result.damageToDefender > 0) {
            const cfg = game.combatPopupConfig || {};
            const dp = game.hexToPixel(defender.q, defender.r);
            game.combatPopups.push({
                text: `-${result.damageToDefender}`,
                x: dp.x,
                y: dp.y - game.zoom * (cfg.offsetYScale || 0.2),
                color: cfg.colorDefender || '#ef4444',
                ttl: cfg.ttl || 60,
                maxTtl: cfg.ttl || 60
            });
        }
        defender.hp = Math.max(0, defender.hp - result.damageToDefender);
        if (options.consumeAP !== false) {
            attacker.moves = 0;
            attacker.hasAttacked = true;
        }
        if (defender.hp <= 0) {
            Units.removeById(game, defender.id);
            game.deselectEnemy();
        } else {
            if (result.damageToAttacker > 0) {
                const cfg = game.combatPopupConfig || {};
                const ap = game.hexToPixel(attacker.q, attacker.r);
                game.combatPopups.push({
                    text: `-${result.damageToAttacker}`,
                    x: ap.x,
                    y: ap.y - game.zoom * (cfg.offsetYScale || 0.2),
                    color: cfg.colorAttacker || '#f59e0b',
                    ttl: cfg.ttl || 60,
                    maxTtl: cfg.ttl || 60
                });
            }
            attacker.hp = Math.max(0, attacker.hp - result.damageToAttacker);
            if (attacker.hp <= 0) {
                Units.removeById(game, attacker.id);
                game.deselectUnit();
            }
        }
    }
};
