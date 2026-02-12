const Units = {
    createDivision(game, stats, q, r, owner, name) {
        const unit = {
            id: Date.now(),
            owner: owner || game.currentOwnerKey,
            q, r,
            soft: stats.soft || 0,
            hard: stats.hard || 0,
            break: stats.break || 0,
            def: stats.def || 0,
            armor: stats.armor || 0,
            hp: stats.hp || 0,
            maxHp: stats.hp || 0,
            moves: 0,
            maxMoves: stats.moves || 0,
            maxMovesDefault: stats.moves || 0,
            hasAttacked: false,
            name: name || `第 ${game.units.length + 1} 师`,
            comp: stats.comp || [],
            isAir: !!stats.isAir,
            isNaval: !!stats.isNaval,
            attackRange: stats.attackRange || 0,
            teleportAirbase: !!stats.teleportAirbase,
            aa: !!stats.aa,
            navalRole: stats.navalRole || null,
            planeCapacity: stats.planeCapacity || 0,
            airComp: []
        };
        game.units.push(unit);
        return unit;
    },
    isNaval(unit) {
        if (unit && unit.isNaval) return true;
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        return keys.some(k => REGIMENT_TYPES[k]?.is_naval);
    },
    removeById(game, id) {
        game.units = game.units.filter(u => u.id !== id);
    },
    findAt(game, q, r) {
        return game.units.find(u => u.q === q && u.r === r);
    },
    exists(game, id) {
        return !!game.units.find(u => u.id === id);
    },
    hasCarrier(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        return keys.some(k => {
            const reg = REGIMENT_TYPES[k];
            return reg && reg.is_naval && reg.naval_role === 'carrier';
        });
    },
    refreshForTurn(game) {
        game.units.forEach(u => {
            const tile = game.grid.find(t => t.q === u.q && t.r === u.r);
            const terr = tile?.terrain;
            const inSea = terr === 'SHALLOW_SEA' || terr === 'DEEP_SEA';
            if (!u.isAir && !u.isNaval && inSea) {
                u.maxMoves = 6;
                u.moves = 6;
            } else {
                u.maxMoves = u.maxMovesDefault || u.maxMoves;
                u.moves = u.maxMoves;
            }
            u.hasAttacked = false;
            if (u.navalRole === 'carrier') {
                const keys = (u.airComp || []).filter(k => k);
                if (keys.length && !u.airUnitId) {
                    let mv = null;
                    keys.forEach(k => {
                        const reg = REGIMENT_TYPES[k];
                        if (reg && typeof reg.moves === 'number') { mv = mv === null ? reg.moves : Math.min(mv, reg.moves); }
                    });
                    u.airWingMoves = mv === null ? 1 : mv;
                    u.airWingHasAttacked = false;
                } else if (!keys.length) {
                    u.airWingMoves = null;
                    u.airWingHasAttacked = false;
                }
            }
        });
    },
    getHpRatio(unit) {
        if (!unit) return 0;
        const max = unit.maxHp || unit.hp || 1;
        return Math.max(0, Math.min(1, (unit.hp || 0) / max));
    },
    getAttackMultiplier(ratio) {
        return 0.2 + 0.8 * ratio;
    },
    getDefenseMultiplier(ratio) {
        return 0.5 + 0.5 * ratio;
    },
    getBreakMultiplier(ratio) {
        return ratio;
    },
    computeEffective(unit) {
        if (!unit) return { soft: 0, hard: 0, break: 0, def: 0, armor: 0 };
        const r = this.getHpRatio(unit);
        const atk = this.getAttackMultiplier(r);
        const def = this.getDefenseMultiplier(r);
        const br = this.getBreakMultiplier(r);
        return {
            soft: (unit.soft || 0) * atk,
            hard: (unit.hard || 0) * atk,
            break: (unit.break || 0) * br,
            def: (unit.def || 0) * def,
            armor: unit.armor || 0
        };
    },
    computeEffectiveAA(unit) {
        if (!unit) return { soft: 0, hard: 0 };
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        const aaSet = new Set((REGIMENT_CLASSES && REGIMENT_CLASSES.anti_air) || []);
        let soft = 0, hard = 0;
        keys.forEach(k => {
            if (aaSet.has(k)) {
                const reg = REGIMENT_TYPES[k];
                soft += (reg?.soft || 0);
                hard += (reg?.hard || 0);
            }
        });
        const r = this.getHpRatio(unit);
        const atk = this.getAttackMultiplier(r);
        return { soft: soft * atk, hard: hard * atk };
    },
    hasAntiAir(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        const aaSet = new Set((REGIMENT_CLASSES && REGIMENT_CLASSES.anti_air) || []);
        return keys.some(k => aaSet.has(k));
    },
    getSupportModifiers(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        const mods = { enemySoftPct: 0, enemyHardPct: 0, movesPct: 0, hpMaxPct: 0, armorDelta: 0, moveCostFixed: null, endTurnHealFromMoves: false, riverPenaltyReduce: 0, amphibPenaltyReduce: 0 };
        keys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            const m = reg && reg.modifiers;
            if (!m) return;
            if (typeof m.enemySoftPct === 'number') mods.enemySoftPct += m.enemySoftPct;
            if (typeof m.enemyHardPct === 'number') mods.enemyHardPct += m.enemyHardPct;
            if (typeof m.movesPct === 'number') mods.movesPct += m.movesPct;
            if (typeof m.hpMaxPct === 'number') mods.hpMaxPct += m.hpMaxPct;
            if (typeof m.armorDelta === 'number') mods.armorDelta += m.armorDelta;
            if (typeof m.moveCostFixed === 'number') mods.moveCostFixed = m.moveCostFixed;
            if (m.endTurnHealFromMoves) mods.endTurnHealFromMoves = true;
            if (typeof m.riverPenaltyReduce === 'number') mods.riverPenaltyReduce += m.riverPenaltyReduce;
            if (typeof m.amphibPenaltyReduce === 'number') mods.amphibPenaltyReduce += m.amphibPenaltyReduce;
        });
        return mods;
    },
    hasFighter(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        return keys.some(k => {
            const reg = REGIMENT_TYPES[k];
            return reg && reg.is_air && reg.air_role === 'fighter';
        });
    },
    hasNonFighterAir(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        return keys.some(k => {
            const reg = REGIMENT_TYPES[k];
            return reg && reg.is_air && reg.air_role !== 'fighter';
        });
    },
    isAir(unit) {
        if (unit && unit.isAir) return true;
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        return keys.some(k => REGIMENT_TYPES[k]?.is_air);
    },
    computeEffectiveAirToAir(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        let soft = 0, hard = 0;
        keys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            if (reg && reg.is_air && reg.air_role === 'fighter') {
                soft += (reg.soft || 0);
                hard += (reg.hard || 0);
            }
        });
        const r = this.getHpRatio(unit);
        const atk = this.getAttackMultiplier(r);
        return { soft: soft * atk, hard: hard * atk };
    },
    computeEffectiveAirAgainstGround(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        let soft = 0, hard = 0;
        keys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            if (reg && reg.is_air && reg.air_role !== 'fighter') {
                soft += (reg.soft || 0);
                hard += (reg.hard || 0);
            }
        });
        const r = this.getHpRatio(unit);
        const atk = this.getAttackMultiplier(r);
        return { soft: soft * atk, hard: hard * atk };
    },
    canAirAttackUnit(attacker, target) {
        const isTargetAir = this.isAir(target);
        if (isTargetAir) return this.hasFighter(attacker);
        return this.hasNonFighterAir(attacker);
    },
    findFighterInterceptors(game, owner, target) {
        const tile = (target && typeof target.q === 'number' && typeof target.r === 'number') ? target : null;
        return (game.units || []).filter(u => {
            if (u.owner !== owner) return false;
            if (!this.isAir(u)) return false;
            if (!this.hasFighter(u)) return false;
            const range = this.getAirRange(u);
            if (!tile || range <= 0) return false;
            const dist = game.getDistance(u, tile);
            return dist <= range;
        });
    },
    getAirRange(unit) {
        let range = (unit && unit.attackRange) || 0;
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        keys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            if (reg && reg.is_air && typeof reg.attack_range === 'number') {
                range = Math.max(range, reg.attack_range);
            }
        });
        return range;
    },
    canUnitAttack(game, attacker, target, dist) {
        if (!attacker || !target) return false;
        if (attacker.isAir) return this.canAirAttackUnit(attacker, target);
        if (attacker.isNaval) {
            const tTile = game.grid.find(t => t.q === target.q && t.r === target.r);
            const terr = tTile?.terrain;
            if (attacker.navalRole === 'submarine') {
                return terr === 'SHALLOW_SEA' || terr === 'DEEP_SEA';
            }
            if (attacker.navalRole === 'carrier') {
                return false;
            }
            return true;
        }
        return true;
    },
    getMainKeys(unit) {
        if (Array.isArray(unit.comp)) return (unit.comp || []).filter(k => k);
        return (unit.comp?.main || []).filter(k => k);
    },
    getPrimaryRegimentIcon(unit) {
        const keys = this.getMainKeys(unit);
        for (let i = 0; i < keys.length; i++) {
            const reg = REGIMENT_TYPES[keys[i]];
            if (reg && reg.icon) return reg.icon;
        }
        return unit.isAir ? '✈️' : '🪖';
    },
    getMainCount(unit) {
        return this.getMainKeys(unit).length;
    },
    toRoman(n) {
        const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
        const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
        let num = Math.max(1, Math.floor(n));
        let out = '';
        for (let i = 0; i < vals.length; i++) {
            while (num >= vals[i]) { out += syms[i]; num -= vals[i]; }
        }
        return out || 'I';
    },
    getArmorIcon(unit) {
        if (unit.isAir) return '✈️';
        if (unit.isNaval || this.isNaval(unit)) {
            if (this.hasCarrier(unit)) return '🔱';
            return (BUILDINGS && BUILDINGS.naval_base && BUILDINGS.naval_base.icon) ? BUILDINGS.naval_base.icon : '⚓';
        }
        const a = unit.armor || 0;
        if (a < 0.25) return '🪖';
        if (a < 0.5) return '🚙';
        return '🛡️';
    },
    canEmbarkOnCarrier(game, airUnit, carrier) {
        if (!airUnit || !carrier) return false;
        if (airUnit.owner !== carrier.owner) return false;
        if (!this.isAir(airUnit)) return false;
        if (!(carrier.isNaval || this.isNaval(carrier))) return false;
        if (carrier.navalRole !== 'carrier') return false;
        const exist = carrier.airUnitId ? (game.units || []).find(u => u.id === carrier.airUnitId) : null;
        const onboard = !!(exist && exist.q === carrier.q && exist.r === carrier.r);
        const hasExisting = onboard || ((carrier.airComp || []).length > 0);
        if (hasExisting) return false;
        const mainKeys = this.getMainKeys(airUnit);
        const size = Math.max(0, (mainKeys || []).length);
        const cap = Math.max(0, Math.floor(carrier.planeCapacity || 0));
        return size > 0 && size <= cap;
    },
    embarkAirToCarrier(game, airUnit, carrier) {
        if (!this.canEmbarkOnCarrier(game, airUnit, carrier)) return false;
        const mainKeys = this.getMainKeys(airUnit);
        carrier.airComp = mainKeys.slice();
        carrier.airUnitId = null;
        carrier.airWingMoves = 0;
        carrier.airWingHasAttacked = !!airUnit.hasAttacked;
        this.removeById(game, airUnit.id);
        return true;
    },
    getTankMainCount(unit) {
        const keys = this.getMainKeys(unit);
        return keys.filter(k => typeof k === 'string' && k.startsWith('TANK_')).length;
    },
    getInfantryMainCount(unit) {
        const keys = this.getMainKeys(unit);
        const infSet = new Set(['INFANTRY','MOTORIZED','MECHANIZED','ARMORED_INFANTRY','SPECIAL_FORCES']);
        return keys.filter(k => infSet.has(k)).length;
    },
    getSubBadgeText(unit) {
        const mainCount = this.getMainCount(unit);
        if (mainCount <= 0) return '0';
        if (unit.isAir) return this.toRoman(mainCount);
        if (unit.isNaval || this.isNaval(unit)) return this.toRoman(mainCount);
        const tankCount = this.getTankMainCount(unit);
        const ratio = tankCount / mainCount;
        if (ratio >= 0.3) return this.toRoman(Math.max(1, tankCount));
        const infCount = this.getInfantryMainCount(unit);
        return String(Math.max(0, infCount));
    },
    //面向“编制类型键”
    composeRegIcon(key, containerCls, mainCls, subCls) {
        const reg = REGIMENT_TYPES[key];
        if (!reg) return '';
        const base = reg.icon || '';
        const sub = reg.icon_sub || '';
        let rem = null;
        if (typeof mainCls === 'string') {
            if (mainCls.includes('text-xl')) rem = '1.25rem';
            else if (mainCls.includes('text-2xl')) rem = '1.5rem';
            else if (mainCls.includes('text-3xl')) rem = '1.875rem';
            else if (mainCls.includes('text-4xl')) rem = '2.25rem';
        }
        const contStyle = rem ? `style="font-size:${rem}"` : '';
        const mainStyle = `style="font-size:1em;line-height:1"`;
        const subStyle = `style="position:absolute;left:50%;top:50%;transform:translate(0.28em,0.28em);font-size:0.55em;line-height:1"`;
        const subHtml = sub ? `<span class="${subCls}" ${subStyle}>${sub}</span>` : '';
        return `<div class="${containerCls}" ${contStyle}><span class="${mainCls}" ${mainStyle}>${base}</span>${subHtml}</div>`;
    },
    //面向“任意字符组合”的场景
    composeIcon(mainChar, subText, containerCls, mainRem, subRatio, offsetEm) {
        const rem = typeof mainRem === 'number' ? `${mainRem}rem` : (typeof mainRem === 'string' ? mainRem : '1.5rem');
        const sr = typeof subRatio === 'number' ? subRatio : 0.6;
        const off = typeof offsetEm === 'number' ? offsetEm : 0.28;
        const contStyle = `style="font-size:${rem}"`;
        const mainStyle = `style="font-size:1em;line-height:1"`;
        const subStyle = subText ? `style="position:absolute;left:50%;top:50%;transform:translate(${off}em,${off}em);font-size:${sr}em;line-height:1"` : '';
        const subHtml = subText ? `<span ${subStyle} class="bg-black/60 px-1 rounded">${subText}</span>` : '';
        return `<div class="${containerCls}" ${contStyle}><span ${mainStyle}>${mainChar}</span>${subHtml}</div>`;
    },
    getFuelReqPerAP(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        let req = 0;
        keys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            if (reg && typeof reg.fuel_req === 'number') req += Math.max(0, reg.fuel_req || 0);
        });
        return req;
    }
};
