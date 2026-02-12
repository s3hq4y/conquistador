const Movement = {
    tileKey(t) { return `${t.q},${t.r}`; },
    computeReachableInfo(game, unit) {
        if (!unit || unit.moves <= 0) return { tiles: [], dist: {}, prev: {} };
        const fuelPerAP = Units.getFuelReqPerAP(unit);
        const fuelBudgetAP = fuelPerAP > 0 ? Math.floor((game.res.fuel || 0) / fuelPerAP) : Infinity;
        if (unit.isAir && unit.teleportAirbase) {
            const tiles = game.grid.filter(t => t.owner === unit.owner && t.building === 'airbase' && !(t.q === unit.q && t.r === unit.r));
            const dist = {}; const prev = {};
            tiles.forEach(t => { dist[this.tileKey(t)] = 1; prev[this.tileKey(t)] = { q: unit.q, r: unit.r }; });
            return { tiles, dist, prev };
        }
        const startTile = game.grid.find(t => t.q === unit.q && t.r === unit.r);
        if (!startTile) return { tiles: [], dist: {}, prev: {} };
        const isLandUnit = !!unit && !unit.isAir && !unit.isNaval;
        const canAirlift = isLandUnit && startTile.building === 'airbase' && Array.isArray(game.researchedTechs) && game.researchedTechs.includes('air_transport');
        if (canAirlift) {
            const range = (REGIMENT_TYPES.TRANSPORT_PLANE && typeof REGIMENT_TYPES.TRANSPORT_PLANE.attack_range === 'number') ? REGIMENT_TYPES.TRANSPORT_PLANE.attack_range : 12;
            const dist = {}; const prev = {};
            const tiles = game.grid.filter(t => {
                const occ = (game.units || []).find(u => u.q === t.q && u.r === t.r);
                if (occ && !(occ.q === unit.q && occ.r === unit.r)) return false;
                const terr = t.terrain;
                if (terr === 'BARRIER_MOUNTAIN') return false;
                if (terr === 'SHALLOW_SEA' || terr === 'DEEP_SEA') return false;
                const owner = t.owner;
                if (owner && owner !== 'Neutral' && owner !== unit.owner) {
                    const interceptors = Units.findFighterInterceptors(game, owner, t);
                    if (Array.isArray(interceptors) && interceptors.length > 0) return false;
                }
                const d = game.getDistance(unit, t);
                if (typeof d !== 'number') return false;
                if (d <= 0 || d > range) return false;
                return true;
            });
            tiles.forEach(t => { dist[this.tileKey(t)] = 1; prev[this.tileKey(t)] = { q: unit.q, r: unit.r }; });
            const alsoAirbases = game.grid.filter(t => t.owner === unit.owner && t.building === 'airbase' && !(t.q === unit.q && t.r === unit.r));
            alsoAirbases.forEach(t => {
                const k = this.tileKey(t);
                if (!(k in dist)) { dist[k] = 1; prev[k] = { q: unit.q, r: unit.r }; tiles.push(t); }
            });
            return { tiles, dist, prev };
        }
        const dist = {}; const prev = {}; const visited = new Set();
        const allTiles = game.grid.slice();
        dist[this.tileKey(startTile)] = 0;
        while (true) {
            let current = null; let currentKey = null; let currentDist = Infinity;
            for (let i = 0; i < allTiles.length; i++) {
                const t = allTiles[i]; const k = this.tileKey(t);
                if (visited.has(k)) continue;
                const d = typeof dist[k] === 'number' ? dist[k] : Infinity;
                if (d < currentDist) { currentDist = d; current = t; currentKey = k; }
            }
            if (!current || currentDist > unit.moves || currentDist > fuelBudgetAP) break;
            visited.add(currentKey);
            const neighbors = VHUtils.getNeighbors(game, current.q, current.r);
            neighbors.forEach(n => {
                const occ = game.units.find(u => u.q === n.q && u.r === n.r);
                if (occ && !(occ.q === unit.q && occ.r === unit.r)) {
                    const canEmbark = Units.canEmbarkOnCarrier(game, unit, occ);
                    if (!canEmbark) return;
                }
                const stepCost = this.getStepCost(game, unit, current, n);
                const alt = currentDist + stepCost;
                const nk = this.tileKey(n);
                const nd = typeof dist[nk] === 'number' ? dist[nk] : Infinity;
                if (alt < nd && alt <= unit.moves && alt <= fuelBudgetAP) { dist[nk] = alt; prev[nk] = { q: current.q, r: current.r }; }
            });
        }
        const tiles = Object.keys(dist).filter(k => dist[k] > 0 && dist[k] <= unit.moves && dist[k] <= fuelBudgetAP).map(k => {
            const [qStr, rStr] = k.split(','); const q = parseInt(qStr, 10); const r = parseInt(rStr, 10);
            return game.grid.find(t => t.q === q && t.r === r);
        }).filter(t => t);
        return { tiles, dist, prev };
    },
    computeReachableTiles(game, unit) { const info = this.computeReachableInfo(game, unit); return info.tiles; },
    canMoveTo(game, unit, hex) {
        if (!unit || unit.moves <= 0) return false;
        const fuelPerAP = Units.getFuelReqPerAP(unit);
        const fuelBudgetAP = fuelPerAP > 0 ? Math.floor((game.res.fuel || 0) / fuelPerAP) : Infinity;
        const occupied = game.units.find(u => u.q === hex.q && u.r === hex.r);
        if (occupied && !(occupied.q === unit.q && occupied.r === unit.r)) {
            const canEmbark = Units.canEmbarkOnCarrier(game, unit, occupied);
            if (!canEmbark) return false;
            return true;
        }
        const key = `${hex.q},${hex.r}`;
        const distMap = game.movementDist || {};
        const d = distMap[key];
        if (typeof d === 'number' && d > 0 && d <= unit.moves && d <= fuelBudgetAP) return true;
        const info = this.computeReachableInfo(game, unit);
        return info.tiles.some(t => t && t.q === hex.q && t.r === hex.r);
    },
    moveTo(game, unit, hex) {
        const targetTile = game.grid.find(t => t.q === hex.q && t.r === hex.r);
        if (!unit || !targetTile) return;
        if (unit.navalRole === 'carrier') {
            const wing = unit.airUnitId ? (game.units || []).find(u => u.id === unit.airUnitId) : null;
            if (wing && wing.q === unit.q && wing.r === unit.r) {
                const keys = Units.getMainKeys(wing);
                unit.airComp = (keys || []).slice();
                unit.airWingMoves = Math.max(0, wing.moves || 0);
                unit.airWingHasAttacked = !!wing.hasAttacked;
                unit.airUnitId = null;
                Units.removeById(game, wing.id);
            }
        }
        let prev = game.movementPrev;
        if (!prev) { const info = this.computeReachableInfo(game, unit); prev = info.prev; game.movementPrev = prev; game.movementDist = info.dist; }
        const occupant = game.units.find(u => u.q === targetTile.q && u.r === targetTile.r);
        const buildPath = () => {
            const path = [];
            const startKey = this.tileKey(game.grid.find(t => t.q === unit.q && t.r === unit.r));
            let k = this.tileKey(targetTile);
            if (k === startKey) return path;
            while (prev && prev[k]) { const p = prev[k]; path.unshift({ q: parseInt(k.split(',')[0], 10), r: parseInt(k.split(',')[1], 10) }); const pk = `${p.q},${p.r}`; if (pk === startKey) break; k = pk; }
            return path;
        };
        const path = buildPath();
        const steps = path.length ? path : [{ q: targetTile.q, r: targetTile.r }];
        const costs = (() => {
            const arr = [];
            let from = game.grid.find(t => t.q === unit.q && t.r === unit.r);
            for (let i = 0; i < steps.length; i++) {
                const s = steps[i];
                const to = game.grid.find(t => t.q === s.q && t.r === s.r);
                arr.push(this.getStepCost(game, unit, from, to));
                from = to;
            }
            return arr;
        })();
        const sumCost = costs.reduce((a, b) => a + b, 0);
        const fuelPerAP = Units.getFuelReqPerAP(unit);
        const fuelBudgetAP = fuelPerAP > 0 ? Math.floor((game.res.fuel || 0) / fuelPerAP) : Infinity;
        if (sumCost <= 0 || unit.moves < costs[0] || sumCost > fuelBudgetAP) return;
        const anim = {
            unitId: unit.id,
            from: { q: unit.q, r: unit.r },
            path: steps,
            costs,
            stepIndex: 0,
            t: 0,
            duration: 220
        };
        game.animations.push(anim);
    },
    isSeaTerrain(terr) { return terr === 'SHALLOW_SEA' || terr === 'DEEP_SEA'; },
    getMoveCost(game, unit, toHex) {
        const fromTile = game.grid.find(t => t.q === unit.q && t.r === unit.r);
        const toTile = game.grid.find(t => t.q === toHex.q && t.r === toHex.r);
        return this.getStepCost(game, unit, fromTile, toTile);
    },
    getStepCost(game, unit, fromTile, toTile) {
        if (unit && unit.isAir && unit.teleportAirbase) return 1;
        const keys = Array.isArray(unit.comp) ? (unit.comp || []).filter(k => k) : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        let moveFixed = null;
        keys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            const mod = reg && reg.modifiers;
            if (mod && typeof mod.moveCostFixed === 'number') moveFixed = mod.moveCostFixed;
        });
        if (typeof moveFixed === 'number') return moveFixed;
        const toTerr = toTile?.terrain;
        const fromTerr = fromTile?.terrain;
        const toOwner = toTile?.owner;
        const uOwner = unit?.owner;
        if (toOwner && uOwner && toOwner !== uOwner && toOwner !== 'Neutral') {
            const war = (typeof Diplomacy !== 'undefined' && typeof Diplomacy.isAtWarWith === 'function') ? Diplomacy.isAtWarWith(game, toOwner) : !!((game.atWarWith || {})[toOwner]);
            const access = (typeof Diplomacy !== 'undefined' && typeof Diplomacy.hasMilitaryAccess === 'function') ? Diplomacy.hasMilitaryAccess(game, uOwner, toOwner) : false;
            if (!war && !access) return 1e9;
        }
        if (toTerr === 'BARRIER_MOUNTAIN') return 1e9;
        const isNaval = !!(unit && unit.isNaval);
        const isLandUnit = !unit?.isAir && !isNaval;
        if (isNaval) {
            if (!this.isSeaTerrain(toTerr)) return 1e9;
            return 1;
        }
        if (isLandUnit && this.isSeaTerrain(toTerr)) {
            if (!this.isSeaTerrain(fromTerr)) {
                return Math.max(1, unit.moves || 0);
            }
            return 1;
        }
        if (isLandUnit && !this.isSeaTerrain(toTerr) && this.isSeaTerrain(fromTerr)) {
            return Math.max(1, unit.moves || 0);
        }
        if (toTerr === 'PLAINS') return 2;
        if (toTerr === 'FOREST') return 3;
        if (toTerr === 'MOUNTAIN') return 4;
        if (toTerr === 'DESERT') return 3;
        return 2;
    }
};
