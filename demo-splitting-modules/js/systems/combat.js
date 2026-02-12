const Combat = {
    resolveCombat(game, attacker, defender) {
        const effA = Units.computeEffective(attacker);
        const effD = Units.computeEffective(defender);
        const defenderIsAir = Units.isAir(defender);
        if (attacker.isAir && Units.hasAntiAir(defender) && !defenderIsAir) {
            effA.soft *= 0.6;
            effA.hard *= 0.6;
        }
        let attackSoft = effA.soft;
        let attackHard = effA.hard;
        let defenseDef = effD.def;
        const tile = game.grid.find(t => t.q === defender.q && t.r === defender.r);
        const attTile = game.grid.find(t => t.q === attacker.q && t.r === attacker.r);
        const terr = tile ? tile.terrain : null;
        const airVsAir = Units.isAir(attacker) && defenderIsAir;
        if (terr === 'FOREST') {
            defenseDef *= 1.1;
            if (attacker.isAir && !airVsAir) { attackSoft *= 0.8; attackHard *= 0.8; }
        } else if (terr === 'MOUNTAIN') {
            defenseDef *= 1.2;
            attackSoft *= 0.9; attackHard *= 0.9;
        }
        let effABreak = effA.break;
        const isSea = (h) => h === 'SHALLOW_SEA' || h === 'DEEP_SEA';
        const attackerOnSea = attTile && isSea(attTile.terrain);
        const defenderOnLand = tile && !isSea(tile.terrain);
        const attackerIsLand = !attacker.isAir && !Units.isNaval(attacker);
        const defenderIsLand = !defenderIsAir && !Units.isNaval(defender);
        if (attackerIsLand && defenderIsLand && attackerOnSea && defenderOnLand) {
            const keysA = Array.isArray(attacker.comp) ? attacker.comp : [].concat(attacker.comp?.support || [], attacker.comp?.main || []);
            const hasSF = keysA.some(k => k === 'SPECIAL_FORCES');
            const hasTech = Array.isArray(game.researchedTechs) && game.researchedTechs.includes('infantry_sf_amphib');
            const supMods = Units.getSupportModifiers(attacker);
            const baseMult = 0.25;
            let bonus = 0;
            if (hasSF && hasTech) bonus += 0.45;
            if (typeof supMods.amphibPenaltyReduce === 'number') bonus += supMods.amphibPenaltyReduce;
            const mult = Math.min(1, baseMult + bonus);
            attackSoft *= mult;
            attackHard *= mult;
            effABreak *= mult;
        }
        if (attackerIsLand && defenderIsLand) {
            const adjacent = game.getDistance(attacker, defender) === 1;
            if (adjacent && typeof game.isRiverBetween === 'function') {
                const isAcrossRiver = game.isRiverBetween(attTile, tile);
                if (isAcrossRiver) {
                    const keysA = Array.isArray(attacker.comp) ? attacker.comp : [].concat(attacker.comp?.support || [], attacker.comp?.main || []);
                    const hasSF = keysA.some(k => k === 'SPECIAL_FORCES');
                    const hasTech = Array.isArray(game.researchedTechs) && game.researchedTechs.includes('infantry_sf_river');
                    const supMods = Units.getSupportModifiers(attacker);
                    const baseMult = 0.5;
                    let bonus = 0;
                    if (hasSF && hasTech) bonus += 0.25;
                    if (typeof supMods.riverPenaltyReduce === 'number') bonus += supMods.riverPenaltyReduce;
                    const mult = Math.min(1, baseMult + bonus);
                    attackSoft *= mult;
                    attackHard *= mult;
                    effABreak *= mult;
                }
            }
        }
        if (airVsAir) {
            const aAir = Units.computeEffectiveAirToAir(attacker);
            attackSoft = aAir.soft;
            attackHard = aAir.hard;
        } else if (Units.isAir(attacker) && !defenderIsAir) {
            const aG = Units.computeEffectiveAirAgainstGround(attacker);
            attackSoft = aG.soft;
            attackHard = aG.hard;
        }
        const keys = Array.isArray(attacker.comp) ? (attacker.comp || []).filter(k => k) : [].concat(attacker.comp?.support || [], attacker.comp?.main || []);
        let supSoft = 0, supHard = 0;
        keys.forEach(k => {
            if (typeof k !== 'string') return;
            const isArt = (k === 'ARTILLERY') || k.includes('HOWITZER') || k.includes('ROCKET_ARTILLERY');
            const isAT = k.includes('AT_GUN');
            const isAA = (REGIMENT_CLASSES && Array.isArray(REGIMENT_CLASSES.anti_air)) ? REGIMENT_CLASSES.anti_air.includes(k) : false;
            if (!(isArt || isAT || isAA)) return;
            const reg = REGIMENT_TYPES[k];
            supSoft += (reg?.soft || 0);
            supHard += (reg?.hard || 0);
        });
        if (supSoft > 0 || supHard > 0) {
            const r = Units.getHpRatio(attacker);
            const atkMult = Units.getAttackMultiplier(r);
            const supAttack = Math.max(0, (supSoft + supHard) * atkMult);
            defenseDef = Math.max(0, defenseDef - supAttack);
        }
        const defMods = Units.getSupportModifiers(defender);
        if (!airVsAir) {
            if (defMods.enemySoftPct) attackSoft = Math.max(0, attackSoft * (1 + defMods.enemySoftPct));
            if (defMods.enemyHardPct) attackHard = Math.max(0, attackHard * (1 + defMods.enemyHardPct));
        } else {
            // 空战中也适用减攻效果
            if (defMods.enemySoftPct) attackSoft = Math.max(0, attackSoft * (1 + defMods.enemySoftPct));
            if (defMods.enemyHardPct) attackHard = Math.max(0, attackHard * (1 + defMods.enemyHardPct));
        }
        const distAD = game.getDistance(attacker, defender);
        if (attacker.isNaval && distAD > 1) {
            const r = Units.getHpRatio(attacker);
            const atkMult = Units.getAttackMultiplier(r);
            let softSum = 0, hardSum = 0;
            const keys = Array.isArray(attacker.comp) ? attacker.comp : [].concat(attacker.comp?.support || [], attacker.comp?.main || []);
            keys.forEach(k => {
                const reg = REGIMENT_TYPES[k];
                const range = reg?.attack_range || 0;
                if (range >= distAD) {
                    softSum += (reg?.soft || 0);
                    hardSum += (reg?.hard || 0);
                }
            });
            attackSoft = softSum * atkMult;
            attackHard = hardSum * atkMult;
        }
        const armorD = effD.armor;
        const attackCount = Math.floor(Math.max(0, armorD * attackHard + (1 - armorD) * attackSoft));
        const defenseCount = Math.floor(Math.max(0, defenseDef));
        let damageToDefender = 0;
        const defended = Math.min(attackCount, defenseCount);
        for (let i = 0; i < defended; i++) {
            damageToDefender += Math.random() < 0.5 ? 0 : 1;
        }
        if (attackCount > defenseCount) {
            damageToDefender += (attackCount - defenseCount);
        }
        let damageToAttacker = 0;
        const defenderRange = defender.attackRange || 0;
        const canCounterByRange = defenderRange <= 0 ? (distAD === 1) : (distAD <= defenderRange);
        const allowCounterBase = (!attacker.isAir || Units.hasAntiAir(defender) || defenderIsAir);
        if ((defender.hp || 0) - damageToDefender > 0 && allowCounterBase && canCounterByRange) {
            const armorA = effA.armor;
            let sourceD = effD;
            if (attacker.isAir && defenderIsAir) {
                sourceD = Units.computeEffectiveAirToAir(defender);
            } else if (attacker.isAir && Units.hasAntiAir(defender)) {
                sourceD = Units.computeEffectiveAA(defender);
            }
            const attMods = Units.getSupportModifiers(attacker);
            if (attMods.enemySoftPct) sourceD.soft = Math.max(0, sourceD.soft * (1 + attMods.enemySoftPct));
            if (attMods.enemyHardPct) sourceD.hard = Math.max(0, sourceD.hard * (1 + attMods.enemyHardPct));
            const counterAttack = Math.floor(Math.max(0, armorA * sourceD.hard + (1 - armorA) * sourceD.soft));
            const attackerDefense = Math.floor(Math.max(0, effABreak));
            const defendedA = Math.min(counterAttack, attackerDefense);
            for (let i = 0; i < defendedA; i++) {
                damageToAttacker += Math.random() < 0.5 ? 0 : 1;
            }
            if (counterAttack > attackerDefense) {
                damageToAttacker += (counterAttack - attackerDefense);
            }
        }
        return { damageToDefender, damageToAttacker };
    }
};
