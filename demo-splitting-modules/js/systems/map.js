const MapGen = {
    pickTerrain() {
        const probs = MAP_CONFIG.terrainProbabilities || {};
        let entries = Object.entries(probs);
        if (MAP_CONFIG.seaPatchEnabled) {
            entries = entries.filter(([k]) => k !== 'SHALLOW_SEA' && k !== 'DEEP_SEA');
        }
        if (MAP_CONFIG.desertPatchEnabled) {
            entries = entries.filter(([k]) => k !== 'DESERT');
        }
        if (!entries.length) return Object.keys(TERRAINS)[0];
        const sum = entries.reduce((acc, [, p]) => acc + p, 0);
        const rnd = Math.random() * sum;
        let acc = 0;
        for (const [key, p] of entries) {
            acc += p;
            if (rnd <= acc) return key;
        }
        return entries[entries.length - 1][0];
    },
    generate(game, radius) {
        const rad = typeof radius === 'number' ? radius : MAP_CONFIG.radius;
        game.grid = [];
        for (let q = -rad; q <= rad; q++) {
            let r1 = Math.max(-rad, -q - rad);
            let r2 = Math.min(rad, -q + rad);
            for (let r = r1; r <= r2; r++) {
                const terrain = this.pickTerrain();
                let owner = this.pickOwner(q);
                const tile = { q, r, terrain, owner, building: null };
                if (terrain === 'MOUNTAIN') {
                    const prob = typeof MAP_CONFIG.preciousDepositProb === 'number' ? MAP_CONFIG.preciousDepositProb : 0.2;
                    tile.preciousDeposit = Math.random() < prob;
                }
                if (terrain === 'DESERT') {
                    const p = typeof MAP_CONFIG.oilDepositProbDesert === 'number' ? MAP_CONFIG.oilDepositProbDesert : 0.3;
                    tile.oilDeposit = Math.random() < p;
                } else if (terrain === 'PLAINS') {
                    const p = typeof MAP_CONFIG.oilDepositProbPlains === 'number' ? MAP_CONFIG.oilDepositProbPlains : 0.05;
                    tile.oilDeposit = Math.random() < p;
                }
                game.grid.push(tile);
            }
        }
        if (MAP_CONFIG.desertPatchEnabled) this.generateDesertPatches(game);
        if (MAP_CONFIG.seaPatchEnabled) this.generateSeaPatches(game);
        this.generateRivers(game);
        this.generateStartingAssets(game);
    }
    ,
    pickOwner(q) {
        const bands = Array.isArray(MAP_CONFIG.ownerBands) ? MAP_CONFIG.ownerBands : null;
        if (bands && bands.length > 0) {
            for (let i = 0; i < bands.length; i++) {
                const b = bands[i];
                if (!b) continue;
                const qMin = typeof b.qMin === 'number' ? b.qMin : -Infinity;
                const qMax = typeof b.qMax === 'number' ? b.qMax : Infinity;
                if (q >= qMin && q <= qMax) return b.owner || 'Neutral';
            }
            return 'Neutral';
        }
        return (q < MAP_CONFIG.playerQMax) ? 'Player' : (q > MAP_CONFIG.enemyQMin ? 'Enemy' : 'Neutral');
    },
    generateDesertPatches(game) {
        const cfg = MAP_CONFIG.desertPatch || {};
        const seeds = Math.max(0, cfg.seedCount || 2);
        const sizeMin = Math.max(1, cfg.minSize || 12);
        const sizeMax = Math.max(sizeMin, cfg.maxSize || 24);
        const tiles = game.grid.filter(t => t.terrain !== 'BARRIER_MOUNTAIN');
        const pick = () => tiles[Math.floor(Math.random() * tiles.length)];
        for (let i = 0; i < seeds; i++) {
            const target = sizeMin + Math.floor(Math.random() * (sizeMax - sizeMin + 1));
            const seed = pick();
            if (!seed) break;
            const inPatch = new Map();
            const seedKey = `${seed.q},${seed.r}`;
            inPatch.set(seedKey, seed);
            let frontier = [seed];
            while (inPatch.size < target && frontier.length) {
                const cur = frontier[Math.floor(Math.random() * frontier.length)];
                const ns = VHUtils.getNeighbors(game, cur.q, cur.r);
                const candidates = ns.filter(n => !inPatch.has(`${n.q},${n.r}`) && n.terrain !== 'BARRIER_MOUNTAIN');
                if (!candidates.length) {
                    frontier = frontier.filter(t => !(t.q === cur.q && t.r === cur.r));
                    continue;
                }
                const nxt = candidates[Math.floor(Math.random() * candidates.length)];
                inPatch.set(`${nxt.q},${nxt.r}`, nxt);
                frontier.push(nxt);
            }
            const patchTiles = Array.from(inPatch.values());
            const pOil = typeof MAP_CONFIG.oilDepositProbDesert === 'number' ? MAP_CONFIG.oilDepositProbDesert : 0.35;
            patchTiles.forEach(t => { t.terrain = 'DESERT'; t.preciousDeposit = false; t.oilDeposit = Math.random() < pOil; });
        }
    }
    ,
    generateRivers(game) {
        const isSea = (t) => t && (t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA');
        const isLand = (t) => t && !isSea(t) && t.terrain !== 'BARRIER_MOUNTAIN';
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        const near = (a, b, tol) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
        const tol = Math.max(1, game.zoom * 0.02);
        const getCornerTiles = (p) => {
            const res = [];
            (game.grid || []).forEach(t => {
                const pos = game.hexToPixel(t.q, t.r);
                const pts = Renderer.getHexPoints(pos.x, pos.y, game.zoom);
                if (pts.some(pp => near(pp, p, tol))) res.push(t);
            });
            return res;
        };
        const getAdjacentCorners = (p) => {
            const tri = getCornerTiles(p);
            const set = [];
            tri.forEach(t => {
                const pos = game.hexToPixel(t.q, t.r);
                const pts = Renderer.getHexPoints(pos.x, pos.y, game.zoom);
                const idx = pts.findIndex(pp => near(pp, p, tol));
                if (idx !== -1) {
                    const a = pts[(idx + 5) % 6];
                    const b = pts[(idx + 1) % 6];
                    [a, b].forEach(q => {
                        if (!set.some(s => near(s, q, tol))) set.push({ x: q.x, y: q.y });
                    });
                }
            });
            const unique = [];
            set.forEach(q => { if (!unique.some(s => near(s, q, tol))) unique.push(q); });
            return unique;
        };
        const pickStartCorner = (landTile) => {
            if (!landTile) return null;
            const ns = VHUtils.getNeighbors(game, landTile.q, landTile.r);
            for (let i = 0; i < ns.length; i++) {
                const n = ns[i];
                if (!isSea(n)) continue;
                const pos = game.hexToPixel(landTile.q, landTile.r);
                const pts = Renderer.getHexPoints(pos.x, pos.y, game.zoom);
                const dq = n.q - landTile.q, dr = n.r - landTile.r;
                const dirIndex = dirs.findIndex(d => d[0] === dq && d[1] === dr);
                const edgeIndex = Renderer.dirIndexToEdgeIndex(dirIndex);
                if (edgeIndex < 0) continue;
                const p0 = pts[edgeIndex];
                const p1 = pts[(edgeIndex + 1) % 6];
                const cand = [p0, p1];
                for (let k = 0; k < cand.length; k++) {
                    const tri = getCornerTiles(cand[k]);
                    if (tri.some(isSea)) return { x: cand[k].x, y: cand[k].y };
                }
            }
            return null;
        };
        const extendFromCorner = (startCorner, steps) => {
            if (!startCorner) return [];
            let cur = { x: startCorner.x, y: startCorner.y };
            const path = [{ x: cur.x, y: cur.y }];
            for (let s = 0; s < steps; s++) {
                const nextCornersAll = getAdjacentCorners(cur);
                const nextCorners = nextCornersAll.filter(c => {
                    const tri = getCornerTiles(c);
                    return tri.length >= 3 && tri.slice(0, 3).every(isLand);
                });
                if (!nextCorners.length) break;
                const scoreCorner = (c) => {
                    const tri = getCornerTiles(c).slice(0, 3);
                    let minSeaDist = Infinity;
                    (game.grid || []).forEach(t => {
                        if (!isSea(t)) return;
                        tri.forEach(tt => {
                            const d = VHUtils.getDistance(t, tt);
                            if (d < minSeaDist) minSeaDist = d;
                        });
                    });
                    return minSeaDist;
                };
                nextCorners.sort((a, b) => scoreCorner(b) - scoreCorner(a));
                let advanced = false;
                for (let i = 0; i < nextCorners.length; i++) {
                    const nxtTry = nextCorners[i];
                    const ok = game.addRiverSegmentByCorners(cur, nxtTry);
                    if (ok) { cur = nxtTry; path.push({ x: cur.x, y: cur.y }); advanced = true; break; }
                }
                if (!advanced) {
                    for (let j = 0; j < nextCornersAll.length; j++) {
                        const nxtTry2 = nextCornersAll[j];
                        const tri2 = getCornerTiles(nxtTry2);
                        if (!(tri2.length >= 3 && tri2.slice(0, 3).every(isLand))) continue;
                        const ok2 = game.addRiverSegmentByCorners(cur, nxtTry2);
                        if (ok2) { cur = nxtTry2; path.push({ x: cur.x, y: cur.y }); advanced = true; break; }
                    }
                }
                if (!advanced) break;
            }
            return path;
        };
        const addTributariesForPath = (path) => {
            if (!Array.isArray(path) || path.length < 3) return;
            const maxBranches = Math.min(3, Math.floor(path.length / 6));
            let created = 0;
            const pickIndices = () => {
                const idxs = new Set();
                while (idxs.size < maxBranches) {
                    const i = 1 + Math.floor(Math.random() * (path.length - 2));
                    idxs.add(i);
                    if (path.length <= 4) break;
                }
                return Array.from(idxs);
            };
            const indices = pickIndices();
            indices.forEach(idx => {
                if (created >= maxBranches) return;
                const cur = { x: path[idx].x, y: path[idx].y };
                const prev = path[idx - 1];
                const next = path[idx + 1];
                const adj = getAdjacentCorners(cur).filter(c => {
                    const tri = getCornerTiles(c);
                    return tri.length >= 3 && tri.slice(0, 3).every(isLand);
                });
                const cand = adj.filter(c => {
                    const isPrev = prev && near(c, prev, tol);
                    const isNext = next && near(c, next, tol);
                    return !isPrev && !isNext;
                });
                if (!cand.length) return;
                const scoreCorner = (c) => {
                    const tri = getCornerTiles(c).slice(0, 3);
                    let minSeaDist = Infinity;
                    (game.grid || []).forEach(t => {
                        if (!isSea(t)) return;
                        tri.forEach(tt => {
                            const d = VHUtils.getDistance(t, tt);
                            if (d < minSeaDist) minSeaDist = d;
                        });
                    });
                    return minSeaDist;
                };
                cand.sort((a, b) => scoreCorner(b) - scoreCorner(a));
                let branchCur = { x: cur.x, y: cur.y };
                let last = { x: cur.x, y: cur.y };
                const steps = 4 + Math.floor(Math.random() * 5);
                for (let s = 0; s < steps; s++) {
                    const nextAll = getAdjacentCorners(branchCur).filter(c => {
                        const tri = getCornerTiles(c);
                        return tri.length >= 3 && tri.slice(0, 3).every(isLand);
                    });
                    const filtered = nextAll.filter(nc => !near(nc, last, tol) && !near(nc, cur, tol));
                    if (!filtered.length) break;
                    filtered.sort((a, b) => scoreCorner(b) - scoreCorner(a));
                    let advanced = false;
                    for (let i = 0; i < filtered.length; i++) {
                        const tryNext = filtered[i];
                        const ok = game.addRiverSegmentByCorners(branchCur, tryNext);
                        if (ok) { last = { x: branchCur.x, y: branchCur.y }; branchCur = tryNext; advanced = true; break; }
                    }
                    if (!advanced) break;
                }
                created++;
            });
        };
        const coastalLandTiles = (game.grid || []).filter(t => isLand(t) && VHUtils.getNeighbors(game, t.q, t.r).some(n => isSea(n)));
        let seeds = [];
        if (coastalLandTiles.length > 0) {
            const posList = coastalLandTiles.map(t => {
                const p = game.hexToPixel(t.q, t.r);
                return { t, x: p.x, y: p.y };
            });
            const cx = posList.reduce((a, b) => a + b.x, 0) / posList.length;
            const cy = posList.reduce((a, b) => a + b.y, 0) / posList.length;
            const withAngle = posList.map(it => ({ t: it.t, ang: Math.atan2(it.y - cy, it.x - cx) }));
            withAngle.sort((a, b) => a.ang - b.ang);
            const cnt = Math.min(3, withAngle.length);
            for (let i = 0; i < cnt; i++) {
                const idx = Math.floor(withAngle.length * (i + 0.5) / cnt);
                seeds.push(withAngle[idx].t);
            }
        }
        seeds.forEach(seed => {
            const sc = pickStartCorner(seed);
            if (!sc) return;
            const nextCornersAll = getAdjacentCorners(sc);
            const hasValid = nextCornersAll.some(c => {
                const tri = getCornerTiles(c);
                return tri.length >= 3 && tri.slice(0, 3).every(isLand);
            });
            if (!hasValid) return;
            const path = extendFromCorner(sc, 20);
            addTributariesForPath(path);
        });
    }
    ,
    generateStartingAssets(game) {
        const placeForOwner = (ownerKey) => {
            const land = (t) => t && t.owner === ownerKey && t.terrain !== 'SHALLOW_SEA' && t.terrain !== 'DEEP_SEA' && t.terrain !== 'BARRIER_MOUNTAIN';
            const nearSort = (arr) => arr.slice().sort((a, b) => (Math.abs(a.q) + Math.abs(a.r)) - (Math.abs(b.q) + Math.abs(b.r)));
            const tilesAll = nearSort(game.grid.filter(t => t && t.owner === ownerKey));
            const cityTile = tilesAll.find(land) || tilesAll[0] || null;
            if (!cityTile) return;
            cityTile.building = 'city';
            cityTile.marketOwnership = 'state';
            if (ownerKey === 'Player' && typeof game.initCityDistrict === 'function') game.initCityDistrict(cityTile);
            if (ownerKey !== 'Player' && typeof game.computeDefaultDistrictTilesForOwner === 'function' && typeof game.setCityDistrictForOwner === 'function') {
                const dKey = game.getCityKey(cityTile);
                const tiles = game.computeDefaultDistrictTilesForOwner(cityTile, 2, dKey, ownerKey);
                game.setCityDistrictForOwner(cityTile, tiles);
            }
            const key = game.getCityKey(cityTile);
            const inDistrict = (t) => !!key && t && t.districtKey === key;
            const free = (t) => t && !t.building;
            const isSea = (t) => t && (t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA');
            const isLand = (t) => t && !isSea(t) && t.terrain !== 'BARRIER_MOUNTAIN';
            const pick = (preds) => {
                const list1 = nearSort(game.grid.filter(t => preds.every(p => p(t))));
                return list1[0] || null;
            };
            let mineTile = pick([free, (t) => t.terrain === 'MOUNTAIN', (t) => inDistrict(t)]);
            if (mineTile) { mineTile.building = 'mine'; mineTile.marketOwnership = 'state'; }
            else {
                const districtTiles = (game.getDistrictTiles && key) ? game.getDistrictTiles(cityTile).concat([cityTile]) : [];
                const cand = nearSort(districtTiles.filter(t => free(t) && isLand(t)))[0] || null;
                if (cand) { cand.terrain = 'MOUNTAIN'; cand.building = 'mine'; cand.marketOwnership = 'state'; }
            }
            let farmTile = pick([free, (t) => t.terrain === 'PLAINS', (t) => inDistrict(t)]);
            if (farmTile) { farmTile.building = 'farm'; farmTile.marketOwnership = 'state'; }
            else {
                const districtTiles2 = (game.getDistrictTiles && key) ? game.getDistrictTiles(cityTile).concat([cityTile]) : [];
                const cand2 = nearSort(districtTiles2.filter(t => free(t) && isLand(t)))[0] || null;
                if (cand2) { cand2.terrain = 'PLAINS'; cand2.building = 'farm'; cand2.marketOwnership = 'state'; }
            }
            const renSea = (t) => t && (t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA');
            const renTile = pick([free, (t) => t.terrain === 'DESERT', (t) => inDistrict(t)]) || pick([free, renSea, (t) => inDistrict(t)]) || pick([free, (t) => inDistrict(t)]);
            if (renTile) { renTile.building = 'renewable_power'; renTile.marketOwnership = 'state'; }
            const civTile = pick([free, isLand, (t) => inDistrict(t)]);
            if (civTile) { civTile.building = 'civilian_factory'; civTile.marketOwnership = 'state'; }
        };
        const owners = new Set((game.grid || []).map(t => t.owner).filter(o => o && o !== 'Neutral'));
        owners.forEach(o => placeForOwner(o));
        this.restrictOwnershipToDistricts(game);
    }
    ,
    restrictOwnershipToDistricts(game) {
        const tileMap = new Map((game.grid || []).map(t => [`${t.q},${t.r}`, t]));
        (game.grid || []).forEach(t => {
            if (!t) return;
            const dk = t.districtKey;
            if (!dk) { t.owner = 'Neutral'; return; }
            const parts = String(dk).split(',');
            const cq = parseInt(parts[0], 10), cr = parseInt(parts[1], 10);
            const center = tileMap.get(`${cq},${cr}`);
            const owner = center ? center.owner : 'Neutral';
            t.owner = owner || 'Neutral';
        });
    }
    ,
    generateSeaPatches(game) {
        const cfg = MAP_CONFIG.seaPatch || {};
        const seeds = Math.max(0, cfg.seedCount || 2);
        const sizeMin = Math.max(1, cfg.minSize || 18);
        const sizeMax = Math.max(sizeMin, cfg.maxSize || 36);
        const shallowWidth = Math.max(1, cfg.shallowWidth || 1);
        const tiles = game.grid.slice();
        const pick = () => tiles[Math.floor(Math.random() * tiles.length)];
        for (let i = 0; i < seeds; i++) {
            const target = sizeMin + Math.floor(Math.random() * (sizeMax - sizeMin + 1));
            const seed = pick();
            if (!seed) break;
            const inPatch = new Map();
            const seedKey = `${seed.q},${seed.r}`;
            inPatch.set(seedKey, seed);
            let frontier = [seed];
            while (inPatch.size < target && frontier.length) {
                const cur = frontier[Math.floor(Math.random() * frontier.length)];
                const ns = VHUtils.getNeighbors(game, cur.q, cur.r);
                const candidates = ns.filter(n => !inPatch.has(`${n.q},${n.r}`));
                if (!candidates.length) {
                    frontier = frontier.filter(t => !(t.q === cur.q && t.r === cur.r));
                    continue;
                }
                const nxt = candidates[Math.floor(Math.random() * candidates.length)];
                inPatch.set(`${nxt.q},${nxt.r}`, nxt);
                frontier.push(nxt);
            }
            const patchTiles = Array.from(inPatch.values());
            const pOil = typeof MAP_CONFIG.oilDepositProbDeepSea === 'number' ? MAP_CONFIG.oilDepositProbDeepSea : 0.1;
            patchTiles.forEach(t => { t.terrain = 'DEEP_SEA'; t.preciousDeposit = false; t.oilDeposit = Math.random() < pOil; });
            const borderKeys = new Set();
            patchTiles.forEach(t => {
                const ns = VHUtils.getNeighbors(game, t.q, t.r);
                ns.forEach(n => { if (!inPatch.has(`${n.q},${n.r}`)) borderKeys.add(`${t.q},${t.r}`); });
            });
            Array.from(borderKeys).forEach(k => {
                const [q, r] = k.split(',').map(s => parseInt(s, 10));
                const t = game.grid.find(tt => tt.q === q && tt.r === r);
                if (t) t.terrain = 'SHALLOW_SEA';
            });
            if (shallowWidth > 1) {
                let wave = Array.from(borderKeys).map(k => {
                    const [q, r] = k.split(',').map(s => parseInt(s, 10));
                    return game.grid.find(tt => tt.q === q && tt.r === r);
                }).filter(x => x);
                for (let w = 1; w < shallowWidth; w++) {
                    const nextRing = new Set();
                    wave.forEach(t => {
                        const ns = VHUtils.getNeighbors(game, t.q, t.r);
                        ns.forEach(n => {
                            const nk = `${n.q},${n.r}`;
                            if (inPatch.has(nk) && n.terrain === 'DEEP_SEA') nextRing.add(nk);
                        });
                    });
                    if (!nextRing.size) break;
                    Array.from(nextRing).forEach(k2 => {
                        const [q2, r2] = k2.split(',').map(s => parseInt(s, 10));
                        const tt = game.grid.find(t0 => t0.q === q2 && t0.r === r2);
                        if (tt) tt.terrain = 'SHALLOW_SEA';
                    });
                    wave = Array.from(nextRing).map(k3 => {
                        const [q3, r3] = k3.split(',').map(s => parseInt(s, 10));
                        return game.grid.find(t0 => t0.q === q3 && t0.r === r3);
                    }).filter(x => x);
                }
            }
        }
    }
};
