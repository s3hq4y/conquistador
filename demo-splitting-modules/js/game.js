class StrategyGame {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.zoom = 55;
        this.offset = { x: this.width/2, y: this.height/2 };
        this.selectedTile = null;
        this.selectedUnit = null;
        this.reachableTiles = [];
        this.modalTemplate = { support: Array(5).fill(null), main: Array(25).fill(null) };
        this.activeTechId = null;
        this.researchProgress = {};
        this.pendingBuildTile = null;
        this.techTab = 'development';
        this.techSubtab = 'natural';
        this.res = { money: 99999, food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0, fuel: 0, industry: 99999, pop: 0, science: 0, civilization: 0, social_surplus: 0 };
        this.deltas = { money: 0, food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0, fuel: 0, industry: 0, pop: 0, science: 0, civilization: 0, social_surplus: 0 };
        this.researchedTechs = [];
        this.grid = [];
        this.units = [];
        this.combatPopups = [];
        this.combatPopupConfig = { fontScale: 0.65, riseSpeed: 0.5, ttl: 120, colorDefender: '#ef4444', colorAttacker: '#f59e0b', offsetYScale: 0.2 };
        this.selectedEnemy = null;
        this.currentOwnerKey = 'Player';
        this.ownerStates = {};
        this.turn = 1;
        this.cheatPlace = null;
        this.animations = [];
        this._lastTick = null;
        this.secondaryBarHidden = false;
        this.buildPowerMax = 25;
        this.buildQueue = [];
        this.marketAdjust = { supply: { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0 }, demand: { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0 } };
        this.taxRates = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0 };
        this.cheatInstantBuild = false;
        this.buildContinuous = false;
        this.buildStripPage = 0;
        this.buildStripPerPage = 10;
        this.buildClipWidth = 120;
        this.cityDistricts = {};
        this.districtPopulation = {};
        this.populationGrowthBase = 0.02;
        this.conscriptionPct = 0.05;
        this.tilePanelMinimized = false;
        this.cityEditMode = null;
        this.borders = new Map();
        this.borderPick = null;
        this.cornerPicks = [];
        this.debugCorner = null;
        this.rivers = new Map();
        this.lastRiverCorner = null;
        this.socialSurplusByClassTotal = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        this.privateBuildQueue = [];
        this.satPenaltyByClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        this.surplusTaxRate = 0;
        this.surplusTaxRatePerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        this.headTaxPerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        this.lastClassPopTotals = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        this.diplomacyPowerMax = this.getDiplomacyPowerMaxBase();
        this.diplomacyPowerLeft = this.diplomacyPowerMax;
        this.initMap();
        this.initUI();
        if (typeof Diplomacy !== 'undefined' && typeof Diplomacy.initRelations === 'function') Diplomacy.initRelations(this);
        this.updateDeltas();
        this.startLoop();
        window.addEventListener('resize', () => {
            this.width = window.innerWidth; this.height = window.innerHeight;
            this.canvas.width = this.width; this.canvas.height = this.height;
            if (this.selectedUnit) UIPanels.showUnit(this, this.selectedUnit);
        });
        this.techByOwner = { [this.currentOwnerKey]: { researchedTechs: this.researchedTechs, researchProgress: this.researchProgress, activeTechId: this.activeTechId } };
        this.buildQueueByOwner = { [this.currentOwnerKey]: this.buildQueue };
        this.privateBuildQueueByOwner = { [this.currentOwnerKey]: this.privateBuildQueue };
    }
    findTilesSharingCornerPair(p0, p1) {
        if (!p0 || !p1) return [];
        const tol = Math.max(1, this.zoom * 0.06);
        const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
        const matches = [];
        (this.grid || []).forEach(t => {
            const pos = this.hexToPixel(t.q, t.r);
            const pts = Renderer.getHexPoints(pos.x, pos.y, this.zoom);
            const hasP0 = pts.some(pp => near(pp, p0));
            const hasP1 = pts.some(pp => near(pp, p1));
            if (hasP0 && hasP1) matches.push(t);
        });
        return matches;
    }
    normalizeEdgeKey(a, b) {
        const ak = `${a.q},${a.r}`;
        const bk = `${b.q},${b.r}`;
        const k1 = ak < bk ? ak : bk;
        const k2 = ak < bk ? bk : ak;
        return `${k1}|${k2}`;
    }
    addRiverEdgeBetweenTiles(a, b, style) {
        if (!a || !b) return false;
        if (this.getDistance(a, b) !== 1) return false;
        const isSea = (t) => t && (t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA');
        const aSea = isSea(a), bSea = isSea(b);
        if ((aSea && !bSea) || (!aSea && bSea)) return false;
        const key = this.normalizeEdgeKey(a, b);
        this.rivers.set(key, {
            a: { q: a.q, r: a.r },
            b: { q: b.q, r: b.r },
            color: (style && style.color) || (TERRAINS && TERRAINS.SHALLOW_SEA ? TERRAINS.SHALLOW_SEA.color : '#1e3a5f'),
            width: (style && style.width) || 8,
            type: 'river',
            estuary: !!(style && style.estuary)
        });
        return true;
    }
    addRiverSegmentByCorners(cPrev, cCurr) {
        const tiles = this.findTilesSharingCornerPair(cPrev, cCurr);
        if (tiles.length < 2) return false;
        // 通常会匹配到 2 个相邻地块，共享该边
        const a = tiles[0], b = tiles[1];
        const ok = this.addRiverEdgeBetweenTiles(a, b);
        if (ok) { /* no estuary edges along land-sea border */ }
        return ok;
    }
    findNearestSeaPath(start, maxSteps) {
        const isSea = (t) => t && (t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA');
        const startTile = this.grid.find(tt => tt.q === start.q && tt.r === start.r);
        if (!startTile) return [];
        const visited = new Set([`${startTile.q},${startTile.r}`]);
        const queue = [{ t: startTile, path: [startTile] }];
        const limit = Math.max(1, maxSteps || 3);
        while (queue.length) {
            const cur = queue.shift();
            const last = cur.t;
            if (isSea(last)) return cur.path;
            if (cur.path.length > limit) continue;
            const ns = this.getNeighbors(last.q, last.r);
            ns.forEach(n => {
                const k = `${n.q},${n.r}`;
                if (visited.has(k)) return;
                visited.add(k);
                queue.push({ t: n, path: cur.path.concat([n]) });
            });
        }
        return [];
    }
    isRiverBetween(a, b) {
        if (!a || !b) return false;
        const key = this.normalizeEdgeKey(a, b);
        return this.rivers.has(key);
    }
    initMap() { MapGen.generate(this, 10); }
    initUI() {
        this.updateResourceUI();
        document.getElementById('end-turn').onclick = () => this.nextTurn();
        Camera.attach(this);
        Input.attach(this);
        DeploymentUI.renderList(this);
        this.applySecondaryBarPref();
        
    }
    getDiplomacyPowerMaxBase() { return 3; }
    openCheatModal() { Cheater.open(this); }
    closeCheatModal() { Cheater.close(); }
    renderCheatForm() { Cheater.render(this); }
    addEnemyUnitFromCheat() { Cheater.addEnemy(this); }
    applyCheatValues() { Cheater.apply(this); }
    //部队编制
    renderRegimentList() { DeploymentUI.renderList(this); }
    findTechById(id) {
        for (const [catKey, category] of Object.entries(TECH_TREE)) {
            const found = category.steps.find(s => s.id === id);
            if (found) return found;
        }
        return null;
    }
    updateDeltas() {
        Economy.computeDeltas(this);
        const baseCap = 25;
        let bonusCap = 0;
        const market = this.market || { supply: {}, demand: {} };
        (this.grid || []).forEach(t => {
            if (t.owner !== this.currentOwnerKey || !t.building) return;
            const b = BUILDINGS[t.building];
            const baseBonus = Math.max(0, Math.floor((b && b.build_power_cap_bonus) || 0));
            if (baseBonus <= 0) return;
            const reqRes = Object.entries(b.yields || {}).filter(([rk, rv]) => ['food','metal','precious','consumer','energy','oil'].includes(rk) && (rv || 0) < 0).map(([rk]) => rk);
            let gTotal = 1;
            if (reqRes.length > 0) {
                const gs = reqRes.map(rk => {
                    const sup = Math.max(0, Math.floor((market.supply || {})[rk] || 0));
                    const dem = Math.max(0, Math.floor((market.demand || {})[rk] || 0));
                    const R = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
                    if (!isFinite(R)) return 1;
                    if (R >= 0.75) return 1;
                    const g = Math.max(0.25, Math.min(1, R + 0.25));
                    return g;
                });
                gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
            }
            bonusCap += baseBonus * gTotal;
        });
        this.buildPowerMax = Math.max(0, Math.floor(baseCap + bonusCap));
        this.syncPopulation();
        this.deltas.pop = this.computePopulationGrowthDelta();
        this.updateOwnerSnapshots();
        this.updateResourceUI();
    }
    updateResourceUI() { UIResources.update(this); }
    initOwnerStates() {
        const owners = new Set((this.grid || []).map(t => t.owner).filter(o => o && o !== 'Neutral'));
        owners.forEach(o => {
            if (!this.ownerStates[o]) {
                this.ownerStates[o] = {
                    res: { money: 0, food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0, fuel: 0, industry: 0, pop: 0, science: 0, civilization: 0, social_surplus: 0 },
                    deltas: { money: 0, food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0, fuel: 0, industry: 0, pop: 0, science: 0, civilization: 0, social_surplus: 0 },
                    market: { supply: {}, demand: {}, prices: {}, opCost: 0, taxIncomeTotal: 0, militaryCost: 0, socialSecurityCost: 0 },
                    diplomacyPowerMax: 3,
                    diplomacyPowerLeft: 3,
                    buildPowerMax: 25
                };
            }
        });
    }
    updateOwnerSnapshots() {
        this.initOwnerStates();
        const owners = Object.keys(this.ownerStates || {});
        owners.forEach(o => {
            if (o === this.currentOwnerKey) {
                this.ownerStates[o].res = { ...this.res };
                this.ownerStates[o].deltas = { ...this.deltas };
                this.ownerStates[o].market = { ...(this.market || {}) };
                this.ownerStates[o].diplomacyPowerMax = Math.max(0, Math.floor(this.diplomacyPowerMax || 0));
                this.ownerStates[o].diplomacyPowerLeft = Math.max(0, Math.floor(this.diplomacyPowerLeft || 0));
                this.ownerStates[o].buildPowerMax = Math.max(0, Math.floor(this.buildPowerMax || 0));
                return;
            }
            if (typeof Economy !== 'undefined' && typeof Economy.computeSnapshotForOwner === 'function') {
                this.ensureOwnerCitiesInitialized(o);
                const snap = Economy.computeSnapshotForOwner(this, o);
                this.ownerStates[o].deltas = { ...snap.deltas };
                this.ownerStates[o].market = { ...snap.market };
                this.ownerStates[o].buildPowerMax = Math.max(0, Math.floor(snap.buildPowerMax || 0));
                const prevRes = this.ownerStates[o].res || {};
                const pop = this.computeOwnerPopulation(o);
                this.ownerStates[o].res = { ...prevRes, pop };
                this.ownerStates[o].res.science = Math.max(0, Math.floor((snap.deltas || {}).science || 0));
                this.ownerStates[o].res.civilization = Math.max(0, Math.floor((snap.deltas || {}).civilization || 0));
            }
        });
    }
    toggleTilePanelMinimize() {
        this.tilePanelMinimized = !this.tilePanelMinimized;
        UIPanels.updateTilePanel(this);
    }
    toggleSecondaryBar() {
        const el = document.getElementById('secondary-bar');
        if (!el) return;
        this.secondaryBarHidden = !this.secondaryBarHidden;
        el.classList.toggle('hidden', this.secondaryBarHidden);
        const leftWrap = document.getElementById('left-panel-wrap');
        if (leftWrap) {
            leftWrap.classList.toggle('top-28', !this.secondaryBarHidden);
            leftWrap.classList.toggle('top-16', this.secondaryBarHidden);
        }
        try { localStorage.setItem('vh_secondary_bar_hidden', this.secondaryBarHidden ? '1' : '0'); } catch (e) {}
    }
    applySecondaryBarPref() {
        let hidden = false;
        try { hidden = localStorage.getItem('vh_secondary_bar_hidden') === '1'; } catch (e) { hidden = false; }
        this.secondaryBarHidden = hidden;
        const el = document.getElementById('secondary-bar');
        if (el) el.classList.toggle('hidden', this.secondaryBarHidden);
        const leftWrap = document.getElementById('left-panel-wrap');
        if (leftWrap) {
            leftWrap.classList.toggle('top-28', !this.secondaryBarHidden);
            leftWrap.classList.toggle('top-16', this.secondaryBarHidden);
        }
    }
    handleClick(e) {
        const hex = this.pixelToHex(e.clientX, e.clientY);
        const tile = this.grid.find(t => t.q === hex.q && t.r === hex.r);
        if (!tile) return;
        if (e.ctrlKey) {
            const exists = this.cornerPicks.some(t => t && t.q === tile.q && t.r === tile.r);
            if (!exists) {
                if (this.cornerPicks.length >= 3) this.cornerPicks = [];
                this.cornerPicks.push({ q: tile.q, r: tile.r });
            }
            if (this.cornerPicks.length === 3) {
                const a = this.cornerPicks[0], b = this.cornerPicks[1], c = this.cornerPicks[2];
                const da = this.getDistance(a, b);
                const db = this.getDistance(b, c);
                const dc = this.getDistance(a, c);
                if (da === 1 && db === 1 && dc === 1) {
                    const ap = this.hexToPixel(a.q, a.r);
                    const bp = this.hexToPixel(b.q, b.r);
                    const cp = this.hexToPixel(c.q, c.r);
                    const ptsA = Renderer.getHexPoints(ap.x, ap.y, this.zoom);
                    const ptsB = Renderer.getHexPoints(bp.x, bp.y, this.zoom);
                    const ptsC = Renderer.getHexPoints(cp.x, cp.y, this.zoom);
                    const tol = Math.max(1, this.zoom * 0.02);
                    const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) <= tol;
                    let common = null;
                    for (let i = 0; i < 6 && !common; i++) {
                        const pa = ptsA[i];
                        const inB = ptsB.find(pb => near(pa, pb));
                        const inC = ptsC.find(pc => near(pa, pc));
                        if (inB && inC) common = { x: pa.x, y: pa.y };
                    }
                    if (common) {
                        const centers = [
                            { q: a.q, r: a.r, x: ap.x, y: ap.y },
                            { q: b.q, r: b.r, x: bp.x, y: bp.y },
                            { q: c.q, r: c.r, x: cp.x, y: cp.y }
                        ];
                        const ups = centers.filter(ct => ct.y < common.y - 1e-6).sort((p1, p2) => p1.x - p2.x);
                        const downs = centers.filter(ct => ct.y >= common.y - 1e-6).sort((p1, p2) => p1.x - p2.x);
                        const up = ups.length === 1 ? ups[0] : null;
                        const leftUp = ups.length >= 2 ? ups[0] : null;
                        const rightUp = ups.length >= 2 ? ups[1] : null;
                        const down = downs.length === 1 ? downs[0] : null;
                        const leftDown = downs.length >= 2 ? downs[0] : null;
                        const rightDown = downs.length >= 2 ? downs[1] : null;
                        this.debugCorner = {
                            x: common.x,
                            y: common.y,
                            up: up ? { q: up.q, r: up.r } : null,
                            leftUp: leftUp ? { q: leftUp.q, r: leftUp.r } : null,
                            rightUp: rightUp ? { q: rightUp.q, r: rightUp.r } : null,
                            down: down ? { q: down.q, r: down.r } : null,
                            leftDown: leftDown ? { q: leftDown.q, r: leftDown.r } : null,
                            rightDown: rightDown ? { q: rightDown.q, r: rightDown.r } : null
                        };
                        if (this.lastRiverCorner) {
                            this.addRiverSegmentByCorners(this.lastRiverCorner, this.debugCorner);
                        }
                        this.lastRiverCorner = { x: common.x, y: common.y };
                    } else {
                        this.debugCorner = null;
                    }
                } else {
                    this.debugCorner = null;
                }
            }
            return;
        }
        if (this.carrierLaunch) {
            const targetUnit = Units.findAt(this, hex.q, hex.r);
            const carrier = this.units.find(u => u.id === this.carrierLaunch.unitId);
            if (carrier && targetUnit && targetUnit.owner !== this.currentOwnerKey) {
                const wingIdx = Math.max(0, Math.floor(this.carrierLaunch.wingIndex || 0));
                const wing = (carrier.airWing || [])[wingIdx];
                const reg = wing ? REGIMENT_TYPES[wing.type] : null;
                const range = reg ? (reg.attack_range || 0) : 0;
                const dist = this.getDistance(carrier, targetUnit);
                if (reg && dist <= range) {
                    const attacker = { owner: this.currentOwnerKey, q: carrier.q, r: carrier.r, isAir: true, attackRange: range, comp: [wing.type], hp: wing.hp, maxHp: wing.maxHp, moves: 1, maxMoves: 1, teleportAirbase: false };
                    const result = Combat.resolveCombat(this, attacker, targetUnit);
                    const cfg = this.combatPopupConfig || {};
                    const dp = this.hexToPixel(targetUnit.q, targetUnit.r);
                    if (result.damageToDefender > 0) {
                        this.combatPopups.push({ text: `-${result.damageToDefender}`, x: dp.x, y: dp.y - this.zoom * (cfg.offsetYScale || 0.2), color: cfg.colorDefender || '#ef4444', ttl: cfg.ttl || 60, maxTtl: cfg.ttl || 60 });
                    }
                    targetUnit.hp = Math.max(0, (targetUnit.hp || 0) - result.damageToDefender);
                    if ((targetUnit.hp || 0) <= 0) { Units.removeById(this, targetUnit.id); this.deselectEnemy(); }
                    const ap = this.hexToPixel(carrier.q, carrier.r);
                    if (result.damageToAttacker > 0) {
                        this.combatPopups.push({ text: `-${result.damageToAttacker}`, x: ap.x, y: ap.y - this.zoom * (cfg.offsetYScale || 0.2), color: cfg.colorAttacker || '#f59e0b', ttl: cfg.ttl || 60, maxTtl: cfg.ttl || 60 });
                    }
                    wing.hp = Math.max(0, (wing.hp || 0) - result.damageToAttacker);
                    if ((wing.hp || 0) <= 0) {
                        carrier.airWing.splice(wingIdx, 1);
                    }
                    this.carrierLaunch = null;
                    this.updateTilePanel();
                    return;
                }
            }
            this.carrierLaunch = null;
        }
        if (e.shiftKey) {
            // Shift + 连点两格：用于快速添加/移除“共享边”边界（调试/编辑工具）。
            // 第一点击选起点，第二次点击相邻格则 toggleBorder。
            if (this.borderPick && !(this.borderPick.q === tile.q && this.borderPick.r === tile.r)) {
                this.toggleBorder(this.borderPick, tile);
                this.borderPick = null;
            } else {
                this.borderPick = tile;
            }
            return;
        }
            if (this.cityEditMode) { this.tryToggleDistrictTile(tile); return; }
            if (this.buildContinuous && this.pendingBuildType) {
            if (tile.owner === this.currentOwnerKey && !tile.building) {
                const type = this.pendingBuildType;
                const b = BUILDINGS[type];
                const okHere = typeof BuildingsUI !== 'undefined' ? BuildingsUI.canBuildHere(this, type, tile) : true;
                if (okHere) {
                    if (this.cheatInstantBuild) {
                        tile.building = type;
                        const bb = BUILDINGS[type] || {};
                        const mKeys = ['food','metal','precious','consumer','energy','oil'];
                        const isMarket = Object.keys(bb.yields || {}).some(k => mKeys.includes(k));
                        if (isMarket) tile.marketOwnership = 'state';
                        if (type === 'city') this.initCityDistrict(tile);
                        this.updateDeltas();
                        this.updateResourceUI();
                        this.updateTilePanel();
                    } else {
                        const req = typeof BuildingsUI !== 'undefined' ? BuildingsUI.computeRequirement(b) : 10;
                        this.enqueueBuild(tile, type, req);
                        this.updateResourceUI();
                    }
                }
            }
            this.selectedTile = tile;
            this.updateTilePanel();
            return;
        }
        if (this.cheatPlace && this.cheatPlace.active && this.cheatPlace.type === 'enemy') {
            const qEl = document.getElementById('cheat-enemy-q');
            const rEl = document.getElementById('cheat-enemy-r');
            if (qEl) qEl.value = String(hex.q);
            if (rEl) rEl.value = String(hex.r);
            const tag = document.getElementById('cheat-picked-coords');
            if (tag) tag.innerText = `[${hex.q}, ${hex.r}]`;
            this.cheatPlace.active = false;
            return;
        }
        const targetUnit = Units.findAt(this, hex.q, hex.r);
        const sel = this.selectedUnit;
        if (targetUnit && targetUnit.owner === this.currentOwnerKey) {
            if (sel && Units.canEmbarkOnCarrier(this, sel, targetUnit) && Movement.canMoveTo(this, sel, hex)) {
                const ok = Units.embarkAirToCarrier(this, sel, targetUnit);
                if (ok) {
                    this.selectUnit(targetUnit);
                    this.selectedTile = tile;
                    this.updateTilePanel();
                    return;
                }
            }
            this.deselectEnemy();
            this.selectUnit(targetUnit);
            this.selectedTile = tile;
            this.updateTilePanel();
            return;
        }
        if (sel && sel.owner === this.currentOwnerKey) {
            const isAdjacent = this.getDistance(sel, hex) === 1;
            if (targetUnit && targetUnit.owner !== this.currentOwnerKey) {
                const dist = this.getDistance(sel, hex);
                const inRange = sel && (sel.attackRange > 0) && dist <= sel.attackRange && Units.canUnitAttack(this, sel, targetUnit, dist);
                if ((isAdjacent || inRange) && sel.moves > 0) {
                    if (sel.isAir && !Units.isAir(targetUnit)) {
                        const interceptors = Units.findFighterInterceptors(this, targetUnit.owner, targetUnit);
                        if (interceptors && interceptors.length > 0) {
                            const interceptor = interceptors[0];
                            CombatUI.resolve(this, interceptor, sel, { consumeAP: false });
                            const attackerAlive = Units.exists(this, sel.id);
                            if (!attackerAlive) { this.deselectUnit(); return; }
                        }
                    }
                    this.resolveCombat(sel, targetUnit);
                    const stillExists = Units.exists(this, sel.id);
                    if (stillExists) this.selectUnit(sel); else this.deselectUnit();
                } else {
                    this.selectEnemy(targetUnit);
                }
                this.selectedTile = tile;
                this.updateTilePanel();
                return;
            }
            if (!targetUnit && Movement.canMoveTo(this, sel, hex)) {
                Movement.moveTo(this, sel, hex);
                this.selectUnit(sel);
                return;
            }
        }
        if (targetUnit && targetUnit.owner !== this.currentOwnerKey) {
            this.selectEnemy(targetUnit);
            this.selectedTile = tile;
            this.updateTilePanel();
            return;
        }
        this.selectedTile = tile;
        this.updateTilePanel();
        this.deselectUnit();
        this.deselectEnemy();
    }
    toggleBorder(tileA, tileB, style) {
        if (!tileA || !tileB) return false;
        if (this.getDistance(tileA, tileB) !== 1) return false;
        // key 规范化：无论点击顺序如何，都映射到同一条“无向边”，避免重复存储。
        const aKey = `${tileA.q},${tileA.r}`;
        const bKey = `${tileB.q},${tileB.r}`;
        const k1 = aKey < bKey ? aKey : bKey;
        const k2 = aKey < bKey ? bKey : aKey;
        const key = `${k1}|${k2}`;
        if (this.borders.has(key)) {
            this.borders.delete(key);
            return true;
        }
        const s = style || {};
        this.borders.set(key, {
            a: { q: tileA.q, r: tileA.r },
            b: { q: tileB.q, r: tileB.r },
            color: typeof s.color === 'string' ? s.color : '#eab308',
            width: typeof s.width === 'number' ? s.width : 4
        });
        return true;
    }
    updateTilePanel() { UIPanels.updateTilePanel(this); this.updateDemolishButton(); }
    openBuildModal(type) { BuildingsUI.open(this, type); }
    closeBuildModal() { BuildingsUI.close(this); }
    confirmBuild() { BuildingsUI.confirm(this); }
    toggleBuildStrip() {
        const strip = document.getElementById('build-strip');
        if (!strip) return;
        const willOpen = strip.classList.contains('hidden');
        strip.classList.toggle('hidden', !willOpen);
        const demolish = document.getElementById('demolish-launcher');
        if (demolish) demolish.classList.toggle('hidden', !willOpen);
        if (!willOpen) {
            this.buildContinuous = false;
            this.pendingBuildType = null;
            this.closeBuildModal();
        }
        if (willOpen && typeof BuildingsUI !== 'undefined' && typeof BuildingsUI.renderStrip === 'function') {
            this.buildStripPage = 0;
            BuildingsUI.renderStrip(this);
        }
        this.updateDemolishButton();
    }
    updateDemolishButton() {
        const btn = document.getElementById('demolish-launcher');
        if (!btn) return;
        const t = this.selectedTile;
        const isPlayer = !!t && t.owner === this.currentOwnerKey;
        const hasBuilding = !!t && !!t.building;
        const hasPendingCity = !!t && typeof this.hasPendingCity === 'function' && this.hasPendingCity(t);
        const isPrivate = !!t && t.marketOwnership === 'private';
        let ok = isPlayer && (hasBuilding || hasPendingCity);
        if (isPrivate && hasBuilding && t.building !== 'city') ok = false;
        btn.disabled = !ok;
        btn.title = !isPlayer ? "仅可拆除当前视角所属建筑" : (!hasBuilding && hasPendingCity ? "取消建造城市" : (hasBuilding ? ((isPrivate && t.building !== 'city') ? "私有建筑需先国有化后才能拆除" : "拆除建筑") : "请选择可拆除的地块"));
        btn.classList.toggle('opacity-40', !ok);
        btn.classList.toggle('cursor-not-allowed', !ok);
    }
    demolishSelectedBuilding() {
        const tile = this.selectedTile;
        if (!tile || tile.owner !== this.currentOwnerKey) return;
        if (!tile.building) {
            if (typeof this.hasPendingCity === 'function' && this.hasPendingCity(tile)) {
                const idx = (this.buildQueue || []).findIndex(it => it && it.type === 'city' && it.q === tile.q && it.r === tile.r);
                if (idx !== -1) this.removeBuildQueue(idx);
                this.updateDeltas();
                this.updateTilePanel();
                this.updateResourceUI();
            }
            return;
        }
        if (tile.building === 'city') {
            const ok1 = confirm("确认拆除城市？这将清除辖区范围与辖区内所有建筑。");
            if (!ok1) return;
            const ok2 = confirm("再次确认：拆除城市不可撤销，继续？");
            if (!ok2) return;
            this.demolishCity(tile);
            return;
        }
        if (tile.marketOwnership === 'private') {
            alert("该建筑为私有资产，需先国有化才能拆除。");
            return;
        }
        tile.building = null;
        this.updateDeltas();
        this.updateTilePanel();
        this.updateResourceUI();
    }
    demolishCity(cityTile) {
        if (!cityTile || cityTile.owner !== this.currentOwnerKey || cityTile.building !== 'city') return;
        const key = this.getCityKey(cityTile);
        const tiles = typeof this.getDistrictTiles === 'function' ? this.getDistrictTiles(cityTile) : [];
        const coords = new Set(tiles.map(t => `${t.q},${t.r}`));
        coords.add(`${cityTile.q},${cityTile.r}`);
        (this.grid || []).forEach(t => {
            if (!t) return;
            const k = `${t.q},${t.r}`;
            if (!coords.has(k)) return;
            t.building = null;
            if (t.districtKey === key) t.districtKey = null;
        });
        if (Array.isArray(this.buildQueue)) {
            this.buildQueue = this.buildQueue.filter(it => it && !coords.has(`${it.q},${it.r}`));
        }
        if (this.cityDistricts) delete this.cityDistricts[key];
        if (this.districtPopulation) delete this.districtPopulation[key];
        if (this.cityEditMode === key) this.cityEditMode = null;
        this.syncPopulation();
        this.updateDeltas();
        this.updateTilePanel();
        this.updateResourceUI();
    }
    selectBuildType(type) {
        this.pendingBuildType = type;
        this.buildContinuous = true;
        this.openBuildModal(type);
    }
    prevBuildStripPage() {
        this.buildStripPage = Math.max(0, (this.buildStripPage || 0) - 1);
        if (typeof BuildingsUI !== 'undefined' && typeof BuildingsUI.renderStrip === 'function') BuildingsUI.renderStrip(this);
    }
    nextBuildStripPage() {
        this.buildStripPage = (this.buildStripPage || 0) + 1;
        if (typeof BuildingsUI !== 'undefined' && typeof BuildingsUI.renderStrip === 'function') BuildingsUI.renderStrip(this);
    }
    getTileKey(t) { return t ? `${t.q},${t.r}` : ''; }
    getCityKey(tile) { return `${tile.q},${tile.r}`; }
    setCityDistrict(cityTile, tilesArr) {
        if (!cityTile) return;
        const key = this.getCityKey(cityTile);
        const prev = this.cityDistricts[key] || [];
        prev.forEach(k => {
            const [q, r] = k.split(',').map(n => parseInt(n, 10));
            const t = this.grid.find(tt => tt.q === q && tt.r === r);
            if (t && t.districtKey === key) t.districtKey = null;
        });
        const newSet = [];
        (tilesArr || []).forEach(t => {
            if (!t) return;
            if (t.districtKey && t.districtKey !== key) return;
            newSet.push(this.getTileKey(t));
            t.districtKey = key;
        });
        this.cityDistricts[key] = newSet;
        this.updateDistrictPopulationCaps(key);
    }
    setCityDistrictForOwner(cityTile, tilesArr) {
        if (!cityTile) return;
        const key = this.getCityKey(cityTile);
        const prev = this.cityDistricts[key] || [];
        prev.forEach(k => {
            const [q, r] = k.split(',').map(n => parseInt(n, 10));
            const t = this.grid.find(tt => tt.q === q && tt.r === r);
            if (t && t.districtKey === key) t.districtKey = null;
        });
        const newSet = [];
        (tilesArr || []).forEach(t => {
            if (!t) return;
            if (t.districtKey && t.districtKey !== key) return;
            newSet.push(this.getTileKey(t));
            t.districtKey = key;
        });
        this.cityDistricts[key] = newSet;
    }
    computeDefaultDistrictTiles(center, radius, districtKey) {
        const key = districtKey || this.getCityKey(center);
        const eligible = new Set();
        (this.grid || []).forEach(t => {
            if (!t) return;
            if (this.getDistance(center, t) > radius) return;
            if (t.districtKey && t.districtKey !== key) return;
            eligible.add(this.getTileKey(t));
        });
        const start = this.getTileKey(center);
        const visited = new Set();
        const queue = [];
        if (eligible.has(start)) { visited.add(start); queue.push(start); }
        while (queue.length) {
            const k = queue.shift();
            const [q, r] = String(k).split(',').map(n => parseInt(n, 10));
            const ns = this.getNeighbors(q, r);
            ns.forEach(n => {
                const nk = this.getTileKey(n);
                if (!eligible.has(nk) || visited.has(nk)) return;
                visited.add(nk);
                queue.push(nk);
            });
        }
        const tiles = [];
        visited.forEach(k => {
            const [q, r] = String(k).split(',').map(n => parseInt(n, 10));
            const t = this.grid.find(tt => tt.q === q && tt.r === r);
            if (t) tiles.push(t);
        });
        tiles.sort((a, b) => this.getDistance(center, a) - this.getDistance(center, b));
        return tiles.slice(0, 25);
    }
    computeDefaultDistrictTilesForOwner(center, radius, districtKey, ownerKey) {
        const key = districtKey || this.getCityKey(center);
        const eligible = new Set();
        (this.grid || []).forEach(t => {
            if (!t) return;
            if (this.getDistance(center, t) > radius) return;
            if (t.districtKey && t.districtKey !== key) return;
            if (ownerKey && t.owner !== ownerKey) return;
            eligible.add(this.getTileKey(t));
        });
        const start = this.getTileKey(center);
        const visited = new Set();
        const queue = [];
        if (eligible.has(start)) { visited.add(start); queue.push(start); }
        while (queue.length) {
            const k = queue.shift();
            const [q, r] = String(k).split(',').map(n => parseInt(n, 10));
            const ns = this.getNeighbors(q, r);
            ns.forEach(n => {
                const nk = this.getTileKey(n);
                if (!eligible.has(nk) || visited.has(nk)) return;
                visited.add(nk);
                queue.push(nk);
            });
        }
        const tiles = [];
        visited.forEach(k => {
            const [q, r] = String(k).split(',').map(n => parseInt(n, 10));
            const t = this.grid.find(tt => tt.q === q && tt.r === r);
            if (t) tiles.push(t);
        });
        tiles.sort((a, b) => this.getDistance(center, a) - this.getDistance(center, b));
        return tiles.slice(0, 25);
    }
    ensureOwnerCitiesInitialized(ownerKey) {
        if (!ownerKey) return;
        const cities = (this.grid || []).filter(t => t && t.owner === ownerKey && t.building === 'city');
        cities.forEach(city => {
            const key = this.getCityKey(city);
            const hasDistrict = Array.isArray((this.cityDistricts || {})[key]) && (this.cityDistricts[key] || []).length > 0;
            if (!hasDistrict) {
                const tiles = this.computeDefaultDistrictTilesForOwner(city, 2, key, ownerKey);
                this.setCityDistrict(city, tiles);
            }
            if (!this.districtPopulation) this.districtPopulation = {};
            const obj = this.districtPopulation[key];
            if (!(obj && obj.initialized)) {
                this.initDistrictPopulation(key);
            } else {
                this.updateDistrictPopulationCaps(key);
            }
        });
        this.syncPopulation();
        this.deltas.pop = this.computePopulationGrowthDelta();
    }
    computeOwnerPopulation(ownerKey) {
        if (!ownerKey) return 0;
        let total = 0;
        Object.keys(this.cityDistricts || {}).forEach(key => {
            const [q, r] = String(key).split(',').map(n => parseInt(n, 10));
            const cityTile = (this.grid || []).find(t => t && t.q === q && t.r === r);
            if (!cityTile || cityTile.owner !== ownerKey) return;
            const obj = (this.districtPopulation || {})[key];
            total += Math.max(0, Math.floor(obj && typeof obj.pop === 'number' ? obj.pop : 0));
        });
        return total;
    }
    initCityDistrict(cityTile) {
        if (!cityTile || cityTile.owner !== this.currentOwnerKey) return;
        const center = cityTile;
        const key = this.getCityKey(center);
        const existing = this.cityDistricts ? this.cityDistricts[key] : null;
        if (Array.isArray(existing) && existing.length > 0) {
            let tiles = existing.map(k => {
                const [q, r] = String(k).split(',').map(n => parseInt(n, 10));
                return this.grid.find(tt => tt.q === q && tt.r === r);
            }).filter(t => t && t.owner === this.currentOwnerKey && (!t.districtKey || t.districtKey === key));
            if (!tiles.some(t => t.q === center.q && t.r === center.r)) tiles.push(center);
            if (tiles.length > 25) {
                tiles.sort((a, b) => this.getDistance(center, a) - this.getDistance(center, b));
                tiles = tiles.slice(0, 25);
            }
            this.setCityDistrict(center, tiles);
        } else {
            const limited = this.computeDefaultDistrictTiles(center, 2, key);
            this.setCityDistrict(center, limited);
        }
        this.initDistrictPopulation(key);
        this.updateTilePanel();
        this.updateResourceUI();
        UIPolitics.render(this);
    }
    getDistrictTiles(cityTile) {
        const key = this.getCityKey(cityTile);
        const arr = (this.cityDistricts[key] || []);
        return arr.map(k => {
            const [q, r] = k.split(',').map(n => parseInt(n, 10));
            return this.grid.find(tt => tt.q === q && tt.r === r);
        }).filter(t => t);
    }
    toggleCityEdit(tile) {
        if (!tile || tile.owner !== this.currentOwnerKey || (tile.building !== 'city' && !this.hasPendingCity(tile))) { this.cityEditMode = null; return; }
        const key = this.getCityKey(tile);
        this.cityEditMode = (this.cityEditMode === key) ? null : key;
        this.updateTilePanel();
    }
    hasPendingCity(tile) {
        if (!tile) return false;
        return !!(this.buildQueue || []).find(it => it && it.type === 'city' && it.q === tile.q && it.r === tile.r);
    }
    clearCityDistrictPlan(cityKey) {
        if (!cityKey) return;
        const prev = this.cityDistricts ? this.cityDistricts[cityKey] : null;
        if (Array.isArray(prev)) {
            prev.forEach(k => {
                const [q, r] = String(k).split(',').map(n => parseInt(n, 10));
                const t = this.grid.find(tt => tt.q === q && tt.r === r);
                if (t && t.districtKey === cityKey) t.districtKey = null;
            });
        }
        if (this.cityDistricts) delete this.cityDistricts[cityKey];
        if (this.districtPopulation) delete this.districtPopulation[cityKey];
        if (this.cityEditMode === cityKey) this.cityEditMode = null;
        this.syncPopulation();
        this.deltas.pop = this.computePopulationGrowthDelta();
    }
    isInCurrentDistrict(t) {
        if (!t || !this.cityEditMode) return false;
        return t.districtKey === this.cityEditMode;
    }
    tryToggleDistrictTile(tile) {
        if (!this.cityEditMode || !tile || tile.owner !== this.currentOwnerKey) return;
        const [ekQ, ekR] = String(this.cityEditMode).split(',').map(n => parseInt(n, 10));
        if (tile.q === ekQ && tile.r === ekR) {
            this.cityEditMode = null;
            this.updateTilePanel();
            return;
        }
        if (tile.districtKey && tile.districtKey !== this.cityEditMode) return;
        const parts = this.cityEditMode.split(','); const cq = parseInt(parts[0], 10), cr = parseInt(parts[1], 10);
        const cityTile = this.grid.find(tt => tt.q === cq && tt.r === cr);
        if (!cityTile) return;
        const builtCity = cityTile && cityTile.building === 'city';
        const current = this.getDistrictTiles(cityTile);
        const exists = current.some(t => t.q === tile.q && t.r === tile.r);
        if (builtCity && exists) return;
        let next = exists ? current.filter(t => !(t.q === tile.q && t.r === tile.r)) : [...current, tile];
        next = next.filter(t => t.owner === this.currentOwnerKey);
        if (!next.some(t => t.q === cityTile.q && t.r === cityTile.r)) next.push(cityTile);
        if (next.length > 25) return;
        const bfs = () => {
            const keyMap = new Set(next.map(t => this.getTileKey(t)));
            const visited = new Set();
            const queue = [this.getTileKey(cityTile)];
            visited.add(queue[0]);
            while (queue.length) {
                const k = queue.shift();
                const [q, r] = k.split(',').map(n => parseInt(n, 10));
                const t = this.grid.find(tt => tt.q === q && tt.r === r);
                const ns = this.getNeighbors(q, r);
                ns.forEach(n => {
                    const nk = this.getTileKey(n);
                    if (keyMap.has(nk) && !visited.has(nk)) { visited.add(nk); queue.push(nk); }
                });
            }
            return visited.size === keyMap.size;
        };
        if (!bfs()) return;
        this.setCityDistrict(cityTile, next);
        this.updateDistrictPopulationCaps(this.getCityKey(cityTile));
        this.updateResourceUI();
        this.updateTilePanel();
    }
    getDistrictPopulation(districtKey) {
        if (!districtKey) return 0;
        const obj = this.districtPopulation ? this.districtPopulation[districtKey] : null;
        return Math.max(0, Math.floor(obj && typeof obj.pop === 'number' ? obj.pop : 0));
    }
    adjustDistrictPopulation(districtKey, delta) {
        if (!districtKey || typeof delta !== 'number' || !isFinite(delta)) return false;
        const obj = this.districtPopulation[districtKey];
        if (!obj) return false;
        const next = Math.max(0, Math.floor((obj.pop || 0) + delta));
        obj.pop = next;
        if (typeof obj.popMax === 'number') obj.pop = Math.min(obj.pop, Math.max(0, Math.floor(obj.popMax || 0)));
        this.syncPopulation();
        this.deltas.pop = this.computePopulationGrowthDelta();
        return true;
    }
    syncPopulation() {
        let total = 0;
        Object.values(this.districtPopulation || {}).forEach(v => { total += Math.max(0, Math.floor(v && typeof v.pop === 'number' ? v.pop : 0)); });
        this.res.pop = total;
    }
    getDistrictPlainsCount(districtKey) {
        const keys = (this.cityDistricts && this.cityDistricts[districtKey]) ? this.cityDistricts[districtKey] : [];
        let count = 0;
        (keys || []).forEach(k => {
            const [q, r] = String(k).split(',').map(n => parseInt(n, 10));
            const t = this.grid.find(tt => tt.q === q && tt.r === r);
            if (t && t.terrain === 'PLAINS') count++;
        });
        return count;
    }
    computeResourceEfficiencyMultiplier(reqRes) {
        const market = this.market || { supply: {}, demand: {} };
        const list = Array.isArray(reqRes) ? reqRes.filter(k => k) : [];
        if (list.length <= 0) return 1;
        const gs = list.map(rk => {
            const sup = Math.max(0, Math.floor((market.supply || {})[rk] || 0));
            const dem = Math.max(0, Math.floor((market.demand || {})[rk] || 0));
            const R = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
            if (!isFinite(R)) return 1;
            if (R >= 0.75) return 1;
            const g = Math.max(0.25, Math.min(1, R + 0.25));
            return g;
        });
        return gs.reduce((a, b) => a + b, 0) / gs.length;
    }
    getDistrictGrowthMultiplier(districtKey) {
        if (!districtKey) return 1;
        const [q, r] = String(districtKey).split(',').map(n => parseInt(n, 10));
        const cityTile = (this.grid || []).find(t => t && t.q === q && t.r === r);
        if (!cityTile || cityTile.building !== 'city') return 0;
        const b = BUILDINGS && BUILDINGS.city ? BUILDINGS.city : null;
        const yields = b && b.yields && typeof b.yields === 'object' ? b.yields : {};
        const marketKeys = ['food','metal','precious','consumer','energy','oil'];
        const reqRes = Object.entries(yields).filter(([res, val]) => marketKeys.includes(res) && (val || 0) < 0).map(([res]) => res);
        return this.computeResourceEfficiencyMultiplier(reqRes);
    }
    initDistrictPopulation(districtKey) {
        if (!districtKey) return;
        if (!this.districtPopulation) this.districtPopulation = {};
        if (!this.districtPopulation[districtKey]) this.districtPopulation[districtKey] = { pop: 0, popMax: 0, growthRate: this.populationGrowthBase, initialized: false };
        const obj = this.districtPopulation[districtKey];
        if (obj.initialized) return;
        const plains = this.getDistrictPlainsCount(districtKey);
        obj.pop = Math.max(0, Math.floor(plains * 1000));
        obj.popMax = Math.max(0, Math.floor(plains * 5000));
        obj.growthRate = (typeof obj.growthRate === 'number') ? obj.growthRate : this.populationGrowthBase;
        obj.initialized = true;
        const initialSurplus = Math.max(0, Math.floor(obj.pop / 10));
        this.res.social_surplus = Math.max(0, (this.res.social_surplus || 0) + initialSurplus);
        if (!this.socialSurplusByClassTotal) this.socialSurplusByClassTotal = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const dist = (typeof this.getDistrictClassDistribution === 'function') ? this.getDistrictClassDistribution(districtKey) : null;
        if (dist) {
            const w = POP_CLASS_SURPLUS_WEIGHTS || { elite: 3, expert: 2, labor: 1, subsistence: 0.5 };
            const e = Math.max(0, Math.floor(dist.elite || 0));
            const x = Math.max(0, Math.floor(dist.expert || 0));
            const l = Math.max(0, Math.floor(dist.labor || 0));
            const s = Math.max(0, Math.floor(dist.subsistence || 0));
            const wE = e * (w.elite || 0);
            const wX = x * (w.expert || 0);
            const wL = l * (w.labor || 0);
            const wS = s * (w.subsistence || 0);
            const sumW = wE + wX + wL + wS;
            let add = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
            if (sumW > 0) {
                const shares = { elite: wE / sumW, expert: wX / sumW, labor: wL / sumW, subsistence: wS / sumW };
                add.elite = Math.floor(initialSurplus * shares.elite);
                add.expert = Math.floor(initialSurplus * shares.expert);
                add.labor = Math.floor(initialSurplus * shares.labor);
                add.subsistence = Math.floor(initialSurplus * shares.subsistence);
                const assigned = add.elite + add.expert + add.labor + add.subsistence;
                let rem = Math.max(0, initialSurplus - assigned);
                const order = [
                    { k: 'elite', v: shares.elite },
                    { k: 'expert', v: shares.expert },
                    { k: 'labor', v: shares.labor },
                    { k: 'subsistence', v: shares.subsistence }
                ].sort((a, b) => b.v - a.v);
                for (let i = 0; i < order.length && rem > 0; i++) { add[order[i].k] += 1; rem--; }
            }
            this.socialSurplusByClassTotal.elite = Math.max(0, Math.floor((this.socialSurplusByClassTotal.elite || 0) + add.elite));
            this.socialSurplusByClassTotal.expert = Math.max(0, Math.floor((this.socialSurplusByClassTotal.expert || 0) + add.expert));
            this.socialSurplusByClassTotal.labor = Math.max(0, Math.floor((this.socialSurplusByClassTotal.labor || 0) + add.labor));
            this.socialSurplusByClassTotal.subsistence = Math.max(0, Math.floor((this.socialSurplusByClassTotal.subsistence || 0) + add.subsistence));
        }
        this.syncPopulation();
    }
    updateDistrictPopulationCaps(districtKey) {
        if (!districtKey) return;
        if (!this.districtPopulation) this.districtPopulation = {};
        if (!this.districtPopulation[districtKey]) this.districtPopulation[districtKey] = { pop: 0, popMax: 0, growthRate: this.populationGrowthBase, initialized: false };
        const obj = this.districtPopulation[districtKey];
        const plains = this.getDistrictPlainsCount(districtKey);
        obj.popMax = Math.max(0, Math.floor(plains * 5000));
        obj.pop = Math.max(0, Math.min(Math.floor(obj.pop || 0), obj.popMax));
        this.syncPopulation();
    }
    computePopulationGrowthDelta() {
        let total = 0;
        Object.entries(this.districtPopulation || {}).forEach(([dk, obj]) => {
            if (!obj || !obj.initialized) return;
            const cur = Math.max(0, Math.floor(obj.pop || 0));
            const max = Math.max(0, Math.floor(obj.popMax || 0));
            let rate = (typeof obj.growthRate === 'number') ? obj.growthRate : this.populationGrowthBase;
            rate += Math.max(0, this.healthGrowthBonus || 0);
            rate -= Math.max(0, this.conscriptionGrowthPenalty || 0);
            const g = this.getDistrictGrowthMultiplier(dk);
            const incRaw = Math.floor(cur * (rate || 0) * Math.max(0, g || 0));
            const incUpper = Math.max(0, max - cur);
            const incLower = -cur;
            const inc = Math.max(incLower, Math.min(incRaw, incUpper));
            total += inc;
        });
        return total;
    }
    applyPopulationGrowth() {
        Object.entries(this.districtPopulation || {}).forEach(([dk, obj]) => {
            if (!obj || !obj.initialized) return;
            const cur = Math.max(0, Math.floor(obj.pop || 0));
            const max = Math.max(0, Math.floor(obj.popMax || 0));
            let rate = (typeof obj.growthRate === 'number') ? obj.growthRate : this.populationGrowthBase;
            rate += Math.max(0, this.healthGrowthBonus || 0);
            rate -= Math.max(0, this.conscriptionGrowthPenalty || 0);
            const g = this.getDistrictGrowthMultiplier(dk);
            const incRaw = Math.floor(cur * (rate || 0) * Math.max(0, g || 0));
            const incUpper = Math.max(0, max - cur);
            const incLower = -cur;
            const inc = Math.max(incLower, Math.min(incRaw, incUpper));
            obj.pop = Math.max(0, Math.min(max, cur + inc));
        });
        this.syncPopulation();
        this.deltas.pop = this.computePopulationGrowthDelta();
    }
    getConscriptionLimit(districtKey) {
        const base = Math.max(0, Math.floor(this.getDistrictPopulation(districtKey)));
        const pct = typeof this.conscriptionPct === 'number' ? this.conscriptionPct : 0.05;
        return Math.max(0, Math.floor(base * Math.max(0, pct)));
    }
    getDistrictClassDistribution(districtKey) {
        if (!districtKey) return { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const obj = this.districtPopulation ? this.districtPopulation[districtKey] : null;
        const total = Math.max(0, Math.floor(obj && typeof obj.pop === 'number' ? obj.pop : 0));
        const [q, r] = String(districtKey).split(',').map(n => parseInt(n, 10));
        const center = (this.grid || []).find(t => t && t.q === q && t.r === r);
        if (!center) return { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const tiles = this.getDistrictTiles(center).concat([center]);
        const counts = {};
        let emptyCount = 0;
        tiles.forEach(t => {
            if (!t || !t.building) return;
            if (t.building === 'city') return;
            counts[t.building] = (counts[t.building] || 0) + 1;
        });
        tiles.forEach(t => { if (t && !t.building) emptyCount++; });
        const classes = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        POP_CLASS_KEYS.forEach(cls => {
            const map = (POP_CLASS_WEIGHTS || {})[cls] || {};
            let w = 0;
            Object.entries(map).forEach(([bKey, weight]) => { w += (counts[bKey] || 0) * (weight || 0); });
            classes[cls] = w;
        });
        classes.subsistence += Math.max(0, emptyCount) * 4;
        const sumW = Object.values(classes).reduce((a, b) => a + b, 0);
        const weightedSum = classes.elite + classes.expert + classes.labor;
        let shares = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        if (sumW > 0) {
            shares = {
                elite: classes.elite / sumW,
                expert: classes.expert / sumW,
                labor: classes.labor / sumW,
                subsistence: classes.subsistence / sumW
            };
        } else {
            const base = POP_CLASS_BASELINE || { elite: 0.05, expert: 0.15, labor: 0.5, subsistence: 0.3 };
            shares = { elite: base.elite, expert: base.expert, labor: base.labor, subsistence: base.subsistence };
        }
        const raw = {
            elite: Math.floor(total * shares.elite),
            expert: Math.floor(total * shares.expert),
            labor: Math.floor(total * shares.labor),
            subsistence: Math.floor(total * shares.subsistence)
        };
        const assigned = raw.elite + raw.expert + raw.labor + raw.subsistence;
        let rem = Math.max(0, total - assigned);
        const frac = [
            { k: 'elite', v: shares.elite - Math.floor(shares.elite) },
            { k: 'expert', v: shares.expert - Math.floor(shares.expert) },
            { k: 'labor', v: shares.labor - Math.floor(shares.labor) },
            { k: 'subsistence', v: shares.subsistence - Math.floor(shares.subsistence) }
        ].sort((a, b) => b.v - a.v);
        for (let i = 0; i < frac.length && rem > 0; i++) { raw[frac[i].k] += 1; rem--; }
        const minElite = Math.max(1, Math.floor(total * 0.01));
        if (raw.elite < minElite) {
            let delta = minElite - raw.elite;
            const take = (k) => {
                if (delta <= 0) return;
                const can = Math.max(0, raw[k]);
                const used = Math.min(delta, can);
                raw[k] -= used; delta -= used;
            };
            take('subsistence'); take('labor'); take('expert');
            raw.elite = minElite;
        }
        if (weightedSum === 0 && classes.subsistence > 0) {
            const minExpert = Math.max(0, Math.floor(total * 0.05));
            const minLabor = Math.max(0, Math.floor(total * 0.10));
            if (raw.expert < minExpert) {
                let d = minExpert - raw.expert;
                const t1 = Math.min(d, Math.max(0, raw.subsistence)); raw.subsistence -= t1; d -= t1;
                const t2 = Math.min(d, Math.max(0, raw.labor)); raw.labor -= t2; d -= t2;
                const t3 = Math.min(d, Math.max(0, raw.elite - minElite)); raw.elite -= t3; d -= t3;
                raw.expert = minExpert;
            }
            if (raw.labor < minLabor) {
                let d = minLabor - raw.labor;
                const t1 = Math.min(d, Math.max(0, raw.subsistence)); raw.subsistence -= t1; d -= t1;
                const t2 = Math.min(d, Math.max(0, raw.expert - minExpert)); raw.expert -= t2; d -= t2;
                const t3 = Math.min(d, Math.max(0, raw.elite - minElite)); raw.elite -= t3; d -= t3;
                raw.labor = minLabor;
            }
            if (raw.labor <= raw.expert) {
                if (raw.subsistence > 0) { raw.subsistence -= 1; raw.labor += 1; }
                else if (raw.expert > 0) { raw.expert -= 1; raw.labor += 1; }
            }
        }
        if (this.educationLaw === 'public_school') {
            const shift = Math.max(0, Math.floor(raw.subsistence * 0.05));
            const toLabor = Math.floor(shift * 0.6);
            const toExpert = Math.max(0, shift - toLabor);
            raw.subsistence = Math.max(0, raw.subsistence - shift);
            raw.labor = Math.max(0, raw.labor + toLabor);
            raw.expert = Math.max(0, raw.expert + toExpert);
        }
        if (this.govStructure === 'committee_republic') {
            raw.labor = Math.max(0, Math.floor(raw.labor + raw.elite + raw.expert));
            raw.elite = 0;
            raw.expert = 0;
        }
        return raw;
    }
    openTechModal() {
        UITech.open(this);
        const chipMask = document.getElementById('science-chip-mask');
        if (chipMask) chipMask.classList.remove('hidden');
    }
    closeTechModal() {
        UITech.close(this);
        const chipMask = document.getElementById('science-chip-mask');
        if (chipMask) chipMask.classList.add('hidden');
    }
    setTechTab(tab) { UITech.setTab(this, tab); }
    updateTechTabsUI() { UITech.updateTabsUI(this); }
    renderTechTree() { UITech.renderTree(this); }
    openTechDetail(id) { UITech.openDetail(this, id); }
    closeTechDetail() { UITech.closeDetail(); }
    confirmResearch(id) { UITech.confirmResearch(this, id); }
    openPoliticsModal() {
        UIPolitics.open(this);
        const chipMask = document.getElementById('civilization-chip-mask');
        if (chipMask) chipMask.classList.remove('hidden');
    }
    closePoliticsModal() {
        UIPolitics.close(this);
        const chipMask = document.getElementById('civilization-chip-mask');
        if (chipMask) chipMask.classList.add('hidden');
    }
    openDeploymentModal() { DeploymentUI.open(this); }
    closeDeploymentModal() { DeploymentUI.close(this); }
    addToTemplate(key) { DeploymentUI.add(this, key); }
    removeFromTemplate(idx) { DeploymentUI.remove(this, idx); }
    refreshModalUI() { DeploymentUI.refresh(this); }
    confirmRecruit() { DeploymentUI.confirm(this); }
    selectUnit(unit) { Selection.selectUnit(this, unit); }
    deselectUnit() { Selection.deselectUnit(this); }
    toggleBuildQueuePanel() {
        const panel = document.getElementById('build-queue-panel');
        const chipMask = document.getElementById('bp-chip-mask');
        if (!panel) return;
        const willOpen = panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !willOpen);
        if (chipMask) chipMask.classList.toggle('hidden', !willOpen);
        this.updateTilePanel();
    }
    toggleMarketPanel() {
        const wrap = document.getElementById('market-wrap');
        const panel = document.getElementById('market-panel');
        const surplus = document.getElementById('surplus-panel');
        const chipMask = document.getElementById('money-chip-mask');
        if (!wrap) return;
        const willOpen = wrap.classList.contains('hidden');
        wrap.classList.toggle('hidden', !willOpen);
        if (panel) panel.classList.remove('hidden');
        if (surplus) surplus.classList.remove('hidden');
        if (chipMask) chipMask.classList.toggle('hidden', !willOpen);
        this.updateResourceUI();
    }
    openTaxModal() {
        const modal = document.getElementById('tax-modal');
        const form = document.getElementById('tax-form');
        if (!modal || !form) return;
        form.innerHTML = '';
        const keys = ['food','metal','precious','consumer','energy','oil'];
        keys.forEach(k => {
            const row = document.createElement('div');
            row.className = "flex items-center justify-between glass-card p-3";
            const rateLabel = document.createElement('span');
            rateLabel.className = "w-10 text-right text-[10px] font-mono text-gray-300";
            rateLabel.innerText = `${Math.round(Math.max(0, Math.min(1, (this.taxRates || {})[k] || 0)) * 100)}%`;
            const icon = document.createElement('span');
            icon.className = "text-lg leading-none";
            icon.innerHTML = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[k]) ? YIELD_ICONS[k] : '';
            const input = document.createElement('input');
            input.type = "range"; input.min = "0"; input.max = "100"; input.step = "1";
            input.className = "w-40";
            input.value = Math.round(Math.max(0, Math.min(1, (this.taxRates || {})[k] || 0)) * 100);
            input.id = `tax-input-${k}`;
            input.oninput = (e) => { rateLabel.innerText = `${Math.max(0, Math.min(100, Math.floor(Number(e.target.value) || 0)))}%`; };
            row.appendChild(rateLabel); row.appendChild(icon); row.appendChild(input);
            form.appendChild(row);
        });
        modal.classList.remove('hidden');
    }
    closeTaxModal() {
        const modal = document.getElementById('tax-modal');
        if (modal) modal.classList.add('hidden');
    }
    confirmTaxRates() {
        const keys = ['food','metal','precious','consumer','energy','oil'];
        if (!this.taxRates) this.taxRates = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        keys.forEach(k => {
            const el = document.getElementById(`tax-input-${k}`);
            const v = Math.max(0, Math.min(100, Math.floor(Number(el?.value) || 0)));
            this.taxRates[k] = v / 100;
        });
        this.updateDeltas();
        this.updateResourceUI();
        this.closeTaxModal();
    }
    nextTurn() {
        this.turn++;
        this.diplomacyPowerLeft = Math.max(0, Math.floor(this.diplomacyPowerMax || 0));
        this.updateDeltas();
        const baseInc = Math.max(0, Math.floor(this.deltas.money || 0));
        const mkt = this.market || {};
        const consTax = Math.max(0, Math.floor(mkt.taxIncomeTotal || 0));
        const st = mkt.surplusTaxes || {};
        const propTax = Math.max(0, Math.floor(st.proportionTotal || 0));
        const headTax = Math.max(0, Math.floor(st.headTotal || 0));
        const basicIncome = Math.max(0, Math.floor(baseInc - consTax - propTax - headTax));
        const mintAmt = Math.max(0, Math.floor(this.mintingAmount || 0));
        const pctMint = basicIncome > 0 ? (mintAmt / basicIncome) : 0;
        const impactPct = Math.max(-0.02, Math.min(0.10, -0.02 + 0.12 * Math.pow(pctMint, 2)));
        if (impactPct !== 0) {
            const cur = Math.max(1, Number(this.inflationFactor || 1));
            const next = Math.min(12, Math.max(1, cur + impactPct));
            this.inflationFactor = next;
            this.updateDeltas();
            this.updateResourceUI();
        }
        this.prevSurplusByClassTotal = {
            elite: Math.max(0, Math.floor((this.socialSurplusByClassTotal?.elite || 0))),
            expert: Math.max(0, Math.floor((this.socialSurplusByClassTotal?.expert || 0))),
            labor: Math.max(0, Math.floor((this.socialSurplusByClassTotal?.labor || 0))),
            subsistence: Math.max(0, Math.floor((this.socialSurplusByClassTotal?.subsistence || 0)))
        };
        Economy.applyTurnIncome(this);
        this.applyPopulationGrowth();
        this.privateSurplusDeltaByClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        this.processPrivateInvestment();
        (this.units || []).forEach(u => {
            const mods = Units.getSupportModifiers(u);
            if (mods && mods.endTurnHealFromMoves) {
                const max = (u.maxHp || u.hp || 1);
                const healPct = Math.max(0, u.moves || 0);
                const heal = Math.floor(max * (healPct / 100));
                if (heal > 0) u.hp = Math.max(0, Math.min(max, (u.hp || 0) + heal));
            }
        });
        Units.refreshForTurn(this);
        Research.processTurn(this);
        if (typeof Diplomacy !== 'undefined' && typeof Diplomacy.processTurn === 'function') Diplomacy.processTurn(this);
        let maxBP = Math.max(0, Math.floor(this.buildPowerMax || 0));
        let privateRemaining = Math.min(Math.floor(maxBP * this.getPrivateReserveCap()), maxBP);
        for (let i = 0; i < (this.privateBuildQueue || []).length && privateRemaining > 0; i++) {
            const it = this.privateBuildQueue[i];
            if (!it) continue;
            const tile = this.grid.find(t => t.q === it.q && t.r === it.r);
            if (!tile || tile.owner !== this.currentOwnerKey || tile.building) continue;
            const need = Math.max(0, (it.requirement || 0) - (it.progress || 0));
            if (need <= 0) continue;
            const alloc = Math.min(privateRemaining, 15, need);
            it.progress = (it.progress || 0) + alloc;
            privateRemaining -= alloc;
            if (it.progress >= it.requirement) {
                tile.building = it.type;
                tile.marketOwnership = 'private';
                tile.investorClass = it.investorClass || null;
                tile.privateLossAccum = 0;
                this.privateBuildQueue.splice(i, 1);
                i--;
                this.updateDeltas();
            }
        }
        let remainingBP = Math.max(0, maxBP - privateRemaining);
        for (let i = 0; i < (this.buildQueue || []).length && remainingBP > 0; i++) {
            const it = this.buildQueue[i];
            if (!it) continue;
            const tile = this.grid.find(t => t.q === it.q && t.r === it.r);
            if (!tile || tile.owner !== this.currentOwnerKey || tile.building) continue;
            const need = Math.max(0, (it.requirement || 0) - (it.progress || 0));
            if (need <= 0) continue;
            const alloc = Math.min(remainingBP, 15, need);
            it.progress = (it.progress || 0) + alloc;
            remainingBP -= alloc;
            if (it.progress >= it.requirement) {
                tile.building = it.type;
                const bb = BUILDINGS[it.type] || {};
                const mKeys = ['food','metal','precious','consumer','energy','oil'];
                const isMarket = Object.keys(bb.yields || {}).some(k => mKeys.includes(k));
                if (isMarket) tile.marketOwnership = 'state';
                this.buildQueue.splice(i, 1);
                i--;
                if (tile.building === 'city') this.initCityDistrict(tile);
                this.updateDeltas();
            }
        }
        this.updatePrivateProfitAndDemolish();
        this.decaySatisfactionPenalty();
        this.updateResourceUI();
        this.renderTechTree();
        if (this.selectedTile) this.updateTilePanel();
        if (this.selectedUnit) this.selectUnit(this.selectedUnit);
    }
    processPrivateInvestment() {
        const maxBP0 = Math.max(0, Math.floor(this.buildPowerMax || 0));
        let pRem0 = Math.min(Math.floor(maxBP0 * this.getPrivateReserveCap()), maxBP0);
        for (let i = 0; i < (this.privateBuildQueue || []).length && pRem0 > 0; i++) {
            const it0 = this.privateBuildQueue[i];
            if (!it0) continue;
            const need0 = Math.max(0, (it0.requirement || 0) - (it0.progress || 0));
            if (need0 <= 0) continue;
            const alloc0 = Math.min(pRem0, 15, need0);
            pRem0 -= alloc0;
        }
        if (pRem0 <= 0) return;
        const classes = ['elite','expert','labor'];
        const marketKeys = ['food','metal','precious','consumer','energy','oil'];
        const entries = Object.entries(BUILDINGS).filter(([k, b]) => Object.keys(b.yields || {}).some(r => marketKeys.includes(r)));
        const prices = (this.market || {}).prices || {};
        const market = this.market || { supply: {}, demand: {} };
        const scoreType = (cls, k, b, req) => {
            const wMap = POP_CLASS_WEIGHTS || {};
            const wCls = wMap[cls] || {};
            const pref = Math.max(0, Math.floor(wCls[k] || 0));
            const mul = typeof Research.getMultiplier === 'function' ? Research.getMultiplier(this, k) : 1;
            const marketKeys = ['food','metal','precious','consumer','energy','oil'];
            const reqRes = Object.entries(b.yields || {}).filter(([rk, rv]) => marketKeys.includes(rk) && (rv || 0) < 0).map(([rk]) => rk);
            let gTotal = 1;
            if (reqRes.length > 0) {
                const gs = reqRes.map(rk => {
                    const sup = Math.max(0, Math.floor((market.supply || {})[rk] || 0));
                    const dem = Math.max(0, Math.floor((market.demand || {})[rk] || 0));
                    const R = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
                    if (!isFinite(R)) return 1;
                    if (R >= 0.75) return 1;
                    const g = Math.max(0.25, Math.min(1, R + 0.25));
                    return g;
                });
                gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
            }
            let rev = 0;
            Object.entries(b.yields || {}).forEach(([res, val]) => {
                const base = (val || 0) * mul;
                if (res === 'energy' && k === 'renewable_power') {
                    const hasDesertOrSea = this.grid.some(t => t.building === 'renewable_power' && (t.terrain === 'DESERT' || t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA'));
                    const bonus = (base > 0 && hasDesertOrSea) ? Math.max(0, b.energy_desert_bonus || 0) : 0;
                    rev += Math.max(0, (base + bonus) * gTotal) * Math.max(0, (prices.energy || 0));
                } else if (marketKeys.includes(res)) {
                    const p = Math.max(0, (prices[res] || 0));
                    rev += Math.max(0, base * gTotal) * p;
                    rev -= Math.max(0, -base * gTotal) * p;
                }
            });
            if (rev <= 0) return -Infinity;
            const ratio = rev / Math.max(1, req);
            const weighted = ratio * (pref > 0 ? (1 + pref * 0.1) : 1);
            return Math.floor(weighted * 100);
        };
        const hasEligibleTileFor = (type) => {
            const keys = Object.keys(this.cityDistricts || {});
            if (keys.length <= 0) return false;
            for (let i = 0; i < keys.length; i++) {
                const tiles = (this.cityDistricts[keys[i]] || []).map(k => { const [q, r] = String(k).split(',').map(n => parseInt(n, 10)); return this.grid.find(t => t.q === q && t.r === r); }).filter(t => t && t.owner === this.currentOwnerKey && !t.building);
                for (let j = 0; j < tiles.length; j++) {
                    if (BuildingsUI.canBuildHere(this, type, tiles[j])) return true;
                }
            }
            return false;
        };
        const isQueued = (q, r) => {
            if (Array.isArray(this.buildQueue) && this.buildQueue.some(it => it.q === q && it.r === r)) return true;
            if (Array.isArray(this.privateBuildQueue) && this.privateBuildQueue.some(it => it.q === q && it.r === r)) return true;
            return false;
        };
        const pickDistrictTile = () => {
            const keys = Object.keys(this.cityDistricts || {});
            if (keys.length <= 0) return null;
            const weights = keys.map(k => Math.max(1, this.getDistrictPopulation(k)));
            const sum = weights.reduce((a, b) => a + b, 0);
            const r = Math.floor(Math.random() * sum);
            let acc = 0; let picked = keys[0];
            for (let i = 0; i < keys.length; i++) { acc += weights[i]; if (r < acc) { picked = keys[i]; break; } }
            const tiles = (this.cityDistricts[picked] || []).map(k => { const [q, r] = String(k).split(',').map(n => parseInt(n, 10)); return this.grid.find(t => t.q === q && t.r === r); }).filter(t => t && t.owner === this.currentOwnerKey && !t.building && !isQueued(t.q, t.r));
            if (!tiles.length) return null;
            return tiles[Math.floor(Math.random() * tiles.length)];
        };
        classes.forEach(cls => {
            const budget = Math.max(0, Math.floor((this.socialSurplusByClassTotal?.[cls] || 0)));
            let best = null;
            entries.forEach(([k, b]) => {
                const req = typeof BuildingsUI !== 'undefined' ? BuildingsUI.computeRequirement(b) : 10;
                const need = Math.max(10, Math.floor(req * 10 * 0.5));
                if (budget < need) return;
                if (!hasEligibleTileFor(k)) return;
                const s = scoreType(cls, k, b, req);
                if (!isFinite(s)) return;
                if (!best || s > best.score) best = { key: k, b, req, score: s };
            });
            if (!best) return;
            const tile = pickDistrictTile();
            if (!tile) return;
            if (!BuildingsUI.canBuildHere(this, best.key, tile)) return;
            const need = Math.max(10, Math.floor(best.req * 10 * 0.5));
            this.socialSurplusByClassTotal[cls] = Math.max(0, Math.floor(this.socialSurplusByClassTotal[cls] - need));
            const dupIdx = (this.privateBuildQueue || []).findIndex(it => it.q === tile.q && it.r === tile.r);
            if (dupIdx === -1) this.privateBuildQueue.push({ q: tile.q, r: tile.r, type: best.key, progress: 0, requirement: best.req, investorClass: cls });
        });
    }
    updatePrivateProfitAndDemolish() {
        const marketKeys = ['food','metal','precious','consumer','energy','oil'];
        const prices = (this.market || {}).prices || {};
        (this.grid || []).forEach(t => {
            if (!t || t.owner !== this.currentOwnerKey || !t.building) return;
            if (t.marketOwnership !== 'private') return;
            const b = BUILDINGS[t.building];
            const mul = typeof Research.getMultiplier === 'function' ? Research.getMultiplier(this, t.building) : 1;
            let profit = 0;
            Object.entries(b.yields || {}).forEach(([res, val]) => {
                const base = (val || 0) * mul;
                if (marketKeys.includes(res)) {
                    const p = Math.max(0, (prices[res] || 0));
                    profit += Math.max(0, base) * p;
                    profit -= Math.max(0, -base) * p;
                }
            });
            const pInt = Math.floor(profit);
            if (t.investorClass) {
                const k = t.investorClass;
                if (pInt > 0) {
                    this.socialSurplusByClassTotal[k] = Math.max(0, Math.floor((this.socialSurplusByClassTotal[k] || 0) + pInt));
                    this.privateSurplusDeltaByClass[k] = Math.max(0, Math.floor((this.privateSurplusDeltaByClass[k] || 0) + pInt));
                } else if (pInt < 0) {
                    const dec = Math.abs(pInt);
                    this.socialSurplusByClassTotal[k] = Math.max(0, Math.floor((this.socialSurplusByClassTotal[k] || 0) - dec));
                    this.privateSurplusDeltaByClass[k] = Math.floor((this.privateSurplusDeltaByClass[k] || 0) + (0 - dec));
                }
            }
            if (profit < 0) {
                t.privateLossAccum = Math.max(0, Math.floor((t.privateLossAccum || 0) + Math.abs(profit)));
            } else {
                t.privateLossAccum = Math.max(0, Math.floor((t.privateLossAccum || 0) - Math.min(Math.abs(profit), t.privateLossAccum || 0)));
            }
            const L = Math.max(0, Math.floor(t.privateLossAccum || 0));
            let remove = false;
            if (L > 400) remove = true;
            else if (L > 200) remove = Math.random() < 0.5;
            else if (L > 100) remove = Math.random() < 0.2;
            if (remove) {
                t.building = null;
                t.marketOwnership = null;
                t.investorClass = null;
                t.privateLossAccum = 0;
                this.updateDeltas();
            }
        });
    }
    decaySatisfactionPenalty() {
        ['elite','expert','labor','subsistence'].forEach(k => {
            const v = Math.floor((this.satPenaltyByClass?.[k] || 0) * 0.8);
            this.satPenaltyByClass[k] = (Math.abs(v) < 1) ? 0 : v;
        });
    }
    nationalizeSelectedBuilding() {
        const tile = this.selectedTile;
        if (!tile || tile.owner !== this.currentOwnerKey || !tile.building) return false;
        if (tile.marketOwnership !== 'private') return false;
        if (this.economySystem === 'laissez_faire') return false;
        const b = BUILDINGS[tile.building];
        const req = typeof BuildingsUI !== 'undefined' ? BuildingsUI.computeRequirement(b) : 10;
        const mul = (this.economySystem === 'planned') ? 10 : 50;
        const need = Math.max(10, Math.floor(req * mul * 0.5));
        if (Math.max(0, Math.floor(this.res.money || 0)) < need) return false;
        this.res.money = Math.max(0, Math.floor((this.res.money || 0) - need));
        tile.marketOwnership = 'state';
        if (tile.investorClass) {
            const k = tile.investorClass;
            this.satPenaltyByClass[k] = Math.floor((this.satPenaltyByClass[k] || 0) - 20);
        }
        this.updateResourceUI();
        this.updateTilePanel();
        return true;
    }
    getPrivateReserveCap() {
        const sys = this.economySystem || 'intervention';
        if (sys === 'traditionalism') return 0.25;
        if (sys === 'intervention') return 0.5;
        if (sys === 'laissez_faire') return 0.75;
        if (sys === 'cooperative') return 0.75;
        return 0.25;
    }
    computeReservedBuildPower() {
        let maxBP = Math.max(0, Math.floor(this.buildPowerMax || 0));
        let pRem = Math.min(Math.floor(maxBP * this.getPrivateReserveCap()), maxBP);
        let reservedPrivate = 0;
        for (let i = 0; i < (this.privateBuildQueue || []).length && pRem > 0; i++) {
            const it = this.privateBuildQueue[i];
            if (!it) continue;
            const need = Math.max(0, (it.requirement || 0) - (it.progress || 0));
            if (need <= 0) continue;
            const alloc = Math.min(pRem, 15, need);
            reservedPrivate += alloc;
            pRem -= alloc;
        }
        let remaining = Math.max(0, maxBP - reservedPrivate);
        let reserved = reservedPrivate;
        for (let i = 0; i < (this.buildQueue || []).length && remaining > 0; i++) {
            const it = this.buildQueue[i];
            if (!it) continue;
            const need = Math.max(0, (it.requirement || 0) - (it.progress || 0));
            if (need <= 0) continue;
            const alloc = Math.min(remaining, 15, need);
            reserved += alloc;
            remaining -= alloc;
        }
        return reserved;
    }
    hexToPixel(q, r) { return VHUtils.hexToPixel(this, q, r); }
    pixelToHex(x, y) { return VHUtils.pixelToHex(this, x, y); }
    getDistance(a, b) { return VHUtils.getDistance(a, b); }
    getNeighbors(q, r) { return VHUtils.getNeighbors(this, q, r); }
    handleHover(e) { UITooltip.update(this, e); }
    selectEnemy(unit) { Selection.selectEnemy(this, unit); }
    deselectEnemy() { Selection.deselectEnemy(this); }
    resolveCombat(attacker, defender) {
        CombatUI.resolve(this, attacker, defender);
    }
    drawHex(x, y, r, color, isSelected, isReachable, isAttackable) { Renderer.drawHex(this, x, y, r, color, isSelected, isReachable, isAttackable); }
    render() { Renderer.render(this); }
    startLoop() { const tick = () => { Renderer.render(this); requestAnimationFrame(tick); }; tick(); }
    enqueueBuild(tile, type, req) {
        if (!tile || tile.owner !== this.currentOwnerKey || tile.building) return false;
        if (Array.isArray(this.privateBuildQueue) && this.privateBuildQueue.some(it => it.q === tile.q && it.r === tile.r)) return false;
        const existIdx = (this.buildQueue || []).findIndex(b => b.q === tile.q && b.r === tile.r);
        if (existIdx !== -1) return true;
        const requirement = Math.max(1, Math.floor(req || 1));
        this.buildQueue.push({ q: tile.q, r: tile.r, type, progress: 0, requirement });
        if (type === 'city') {
            const key = this.getCityKey(tile);
            if (!Array.isArray((this.cityDistricts || {})[key]) || (this.cityDistricts[key] || []).length === 0) {
                const limited = this.computeDefaultDistrictTiles(tile, 2, key);
                this.setCityDistrict(tile, limited);
            }
            this.cityEditMode = key;
            this.selectedTile = tile;
        }
        this.updateTilePanel();
        return true;
    }
    moveBuildQueueUp(idx) {
        if (idx <= 0 || idx >= (this.buildQueue || []).length) return;
        const t = this.buildQueue[idx]; this.buildQueue[idx] = this.buildQueue[idx-1]; this.buildQueue[idx-1] = t;
        this.updateTilePanel();
    }
    moveBuildQueueDown(idx) {
        if (idx < 0 || idx >= (this.buildQueue || []).length - 1) return;
        const t = this.buildQueue[idx]; this.buildQueue[idx] = this.buildQueue[idx+1]; this.buildQueue[idx+1] = t;
        this.updateTilePanel();
    }
    removeBuildQueue(idx) {
        if (idx < 0 || idx >= (this.buildQueue || []).length) return;
        const it = this.buildQueue[idx];
        this.buildQueue.splice(idx, 1);
        if (it && it.type === 'city') {
            const key = `${it.q},${it.r}`;
            this.clearCityDistrictPlan(key);
        }
        this.updateTilePanel();
    }
}
