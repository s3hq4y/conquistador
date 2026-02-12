const UIPanels = {
    renderBuildingIcon(type, sizeClass) {
        const sz = sizeClass || 'w-6 h-6';
        if (type === 'industry') {
            return `<span class="inline-flex items-center justify-center ${sz}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-full h-full text-green-500"><rect x="3" y="11" width="18" height="8" rx="2" fill="currentColor"></rect><rect x="6" y="7" width="4" height="4" fill="currentColor"></rect><rect x="12" y="5" width="3" height="6" fill="currentColor"></rect><rect x="17" y="8" width="2" height="3" fill="currentColor"></rect><rect x="5" y="14" width="3" height="3" fill="#121214"></rect><rect x="10" y="14" width="3" height="3" fill="#121214"></rect><rect x="15" y="14" width="3" height="3" fill="#121214"></rect></svg></span>`;
        }
        const b = BUILDINGS[type];
        return `<span class="inline-flex items-center justify-center ${sz}"><span class="text-[12px] leading-none">${b?.icon || '🏢'}</span></span>`;
    },
    showUnit(game, unit) {
        const panel = document.getElementById('unit-action-panel');
        panel.style.transform = 'translate(-50%, 0)';
        const existedCarrierFloating = document.getElementById('carrier-section');
        if (existedCarrierFloating) existedCarrierFloating.remove();
        document.getElementById('unit-hp').innerText = `${Math.floor(unit.hp)}/${Math.floor(unit.maxHp || unit.hp)}`;
        document.getElementById('unit-ap').innerText = `${unit.moves}/${unit.maxMoves}`;
        const effA = Units.computeEffective(unit);
        const softEffA = Math.round(effA.soft);
        const hardEffA = Math.round(effA.hard);
        const breakEffA = Math.round(effA.break);
        const defEffA = Math.round(effA.def);
        const sSoft = document.getElementById('unit-soft');
        const sHard = document.getElementById('unit-hard');
        const sBreak = document.getElementById('unit-break');
        const sDef = document.getElementById('unit-def');
        const maxUnit = { ...unit, hp: unit.maxHp || unit.hp };
        const effMaxA = Units.computeEffective(maxUnit);
        const keysA = Array.isArray(unit.comp) ? (unit.comp || []).filter(k => k) : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        let supSoftA = 0, supHardA = 0;
        keysA.forEach(k => {
            if (typeof k !== 'string') return;
            const isArt = (k === 'ARTILLERY') || k.includes('HOWITZER') || k.includes('ROCKET_ARTILLERY');
            const isAT = k.includes('AT_GUN');
            const isAA = (REGIMENT_CLASSES && Array.isArray(REGIMENT_CLASSES.anti_air)) ? REGIMENT_CLASSES.anti_air.includes(k) : false;
            if (!(isArt || isAT || isAA)) return;
            const reg = REGIMENT_TYPES[k];
            supSoftA += (reg?.soft || 0);
            supHardA += (reg?.hard || 0);
        });
        const atkMultA = Units.getAttackMultiplier(Units.getHpRatio(unit));
        const atkMultMaxA = Units.getAttackMultiplier(Units.getHpRatio(maxUnit));
        const curSupSoftA = Math.round(supSoftA * atkMultA);
        const curSupHardA = Math.round(supHardA * atkMultA);
        const maxSupSoftA = Math.round(supSoftA * atkMultMaxA);
        const maxSupHardA = Math.round(supHardA * atkMultMaxA);
        if (sSoft) sSoft.innerText = `${curSupSoftA}/${Math.round(softEffA)} (${maxSupSoftA}/${Math.round(effMaxA.soft)})`;
        if (sHard) sHard.innerText = `${curSupHardA}/${Math.round(hardEffA)} (${maxSupHardA}/${Math.round(effMaxA.hard)})`;
        if (sBreak) sBreak.innerText = `${Math.round(breakEffA)} (${Math.round(effMaxA.break)})`;
        if (sDef) sDef.innerText = `${Math.round(defEffA)} (${Math.round(effMaxA.def)})`;
        document.getElementById('unit-armor').innerText = `${Math.round((unit.armor || 0) * 100)}%`;
        const aaEl = document.getElementById('unit-aa');
        if (aaEl) aaEl.innerText = Units.hasAntiAir(unit) ? '是' : '否';
        const fuelLabel = document.getElementById('unit-fuel-req');
        if (fuelLabel) {
            const v = Units.getFuelReqPerAP(unit);
            fuelLabel.innerText = v > 0 ? `${v}` : `0`;
        }
        const iconBox = document.getElementById('unit-icon-box');
        if (iconBox) {
            const mainIcon = Units.getArmorIcon(unit);
            const subTxt = Units.getSubBadgeText(unit);
            iconBox.innerHTML = Units.composeIcon(mainIcon, subTxt, "relative w-12 h-12 flex items-center justify-center", 1.5, 0.6, 0.28);
        }
        const nameEl = document.getElementById('unit-name');
        if (nameEl) nameEl.innerText = unit.name || '战略集团';
        const btn = document.getElementById('unit-comp-btn');
        if (btn) btn.onclick = (e) => { e.stopPropagation(); UIPanels.openComp(game, unit); };
        const panelWidthMax = Math.min(window.innerWidth - 40, 650);
        document.getElementById('unit-action-panel').style.minWidth = `${panelWidthMax}px`;
        const gridBox = document.querySelector('#unit-action-panel .grid');
        if (gridBox) {
            const tight = panelWidthMax < 700;
            gridBox.style.columnGap = tight ? '8px' : '16px';
            gridBox.style.rowGap = tight ? '4px' : '8px';
        }
        if (unit.navalRole === 'carrier') {
            const section = document.createElement('div');
            section.id = 'carrier-section';
            section.className = "absolute bottom-6 right-6 ui-panel rounded-xl p-3 z-30";
            const actions = document.createElement('div');
            actions.className = "mt-2 flex items-center gap-2 justify-end";
            const recruitBtn = document.createElement('button');
            recruitBtn.className = "px-3 py-1 rounded text-[10px] font-bold bg-blue-700 hover:bg-blue-600 text-white";
            recruitBtn.innerText = "招募";
            const controlBtn = document.createElement('button');
            controlBtn.className = "px-3 py-1 rounded text-[10px] font-bold bg-yellow-600 hover:bg-yellow-500 text-white";
            controlBtn.innerText = "操控";
            const existWingUnit = unit.airUnitId ? (game.units || []).find(u => u.id === unit.airUnitId) : null;
            const wingOnboard = !!(existWingUnit && existWingUnit.q === unit.q && existWingUnit.r === unit.r);
            const hasExistingWing = wingOnboard || ((unit.airComp || []).filter(k => k).length > 0);
            if (hasExistingWing) {
                recruitBtn.disabled = true;
                recruitBtn.classList.add('opacity-50');
            } else {
                recruitBtn.onclick = (e) => {
                    e.stopPropagation();
                    DeploymentUI.openForCarrier(game, unit);
                };
            }
            controlBtn.onclick = (e) => {
                e.stopPropagation();
                const keys = (unit.airComp || []).filter(k => k);
                if (!keys.length) return;
                if (unit.airUnitId) {
                    const exist = (game.units || []).find(u => u.id === unit.airUnitId);
                    if (exist && exist.q === unit.q && exist.r === unit.r) { game.selectUnit(exist); return; }
                    let soft = 0, hard = 0, br = 0, def = 0, hp = 0;
                    let armorSum = 0, armorCount = 0, movesMin = null, attackRangeMax = 0;
                    let teleportAirbase = false;
                    const compArr2 = keys.slice();
                    compArr2.forEach(type => {
                        const reg = REGIMENT_TYPES[type];
                        if (!reg) return;
                        soft += (reg.soft || 0);
                        hard += (reg.hard || 0);
                        br += (reg.break || 0);
                        def += (reg.def || 0);
                        hp += (reg.hp || 0);
                        if (typeof reg.armor === 'number') { armorSum += reg.armor; armorCount++; }
                        if (typeof reg.moves === 'number') { movesMin = movesMin === null ? reg.moves : Math.min(movesMin, reg.moves); }
                        if (typeof reg.attack_range === 'number') attackRangeMax = Math.max(attackRangeMax, reg.attack_range || 0);
                        teleportAirbase = teleportAirbase || !!reg.teleport_airbase;
                    });
                    const armorAvg2 = armorCount > 0 ? Math.max(0, Math.min(1, armorSum / armorCount)) : 0;
                    const stats2 = {
                        soft, hard, break: br, def, hp,
                        moves: movesMin === null ? 1 : movesMin,
                        armor: armorAvg2,
                        isAir: true,
                        attackRange: attackRangeMax,
                        teleportAirbase,
                        comp: compArr2
                    };
                    const wing2 = Units.createDivision(game, stats2, unit.q, unit.r, game.currentOwnerKey, '舰载机');
                    unit.airComp = [];
                    unit.airUnitId = wing2.id;
                    const stored2 = (typeof unit.airWingMoves === 'number') ? unit.airWingMoves : (stats2.moves || 0);
                    wing2.moves = Math.max(0, stored2);
                    if (typeof unit.airWingHasAttacked === 'boolean') wing2.hasAttacked = unit.airWingHasAttacked;
                    game.selectUnit(wing2);
                    return;
                }
                let soft = 0, hard = 0, br = 0, def = 0, hp = 0;
                let armorSum = 0, armorCount = 0, movesMin = null, attackRangeMax = 0;
                let teleportAirbase = false;
                const compArr = keys.slice();
                compArr.forEach(type => {
                    const reg = REGIMENT_TYPES[type];
                    if (!reg) return;
                    soft += (reg.soft || 0);
                    hard += (reg.hard || 0);
                    br += (reg.break || 0);
                    def += (reg.def || 0);
                    hp += (reg.hp || 0);
                    if (typeof reg.armor === 'number') { armorSum += reg.armor; armorCount++; }
                    if (typeof reg.moves === 'number') { movesMin = movesMin === null ? reg.moves : Math.min(movesMin, reg.moves); }
                    if (typeof reg.attack_range === 'number') attackRangeMax = Math.max(attackRangeMax, reg.attack_range || 0);
                    teleportAirbase = teleportAirbase || !!reg.teleport_airbase;
                });
                const armorAvg = armorCount > 0 ? Math.max(0, Math.min(1, armorSum / armorCount)) : 0;
                const stats = {
                    soft, hard, break: br, def, hp,
                    moves: movesMin === null ? 1 : movesMin,
                    armor: armorAvg,
                    isAir: true,
                    attackRange: attackRangeMax,
                    teleportAirbase,
                    comp: compArr
                };
                const wing = Units.createDivision(game, stats, unit.q, unit.r, game.currentOwnerKey, '舰载机');
                unit.airComp = [];
                unit.airUnitId = wing.id;
                const stored = (typeof unit.airWingMoves === 'number') ? unit.airWingMoves : (stats.moves || 0);
                wing.moves = Math.max(0, stored);
                if (typeof unit.airWingHasAttacked === 'boolean') wing.hasAttacked = unit.airWingHasAttacked;
                game.selectUnit(wing);
            };
            actions.appendChild(recruitBtn);
            actions.appendChild(controlBtn);
            section.appendChild(actions);
            document.body.appendChild(section);
        }
    },
    hideUnit() {
        document.getElementById('unit-action-panel').style.transform = 'translate(-50%, 150%)';
        const existedCarrierFloating = document.getElementById('carrier-section');
        if (existedCarrierFloating) existedCarrierFloating.remove();
    },
    showEnemy(game, unit) {
        const panel = document.getElementById('enemy-info-panel');
        panel.style.transform = 'translate(-50%, 0)';
        document.getElementById('enemy-name').innerText = unit.name || '敌方单位';
        document.getElementById('enemy-hp').innerText = `${Math.floor(unit.hp)}/${Math.floor(unit.maxHp || unit.hp)}`;
        document.getElementById('enemy-ap').innerText = `${unit.moves}/${unit.maxMoves}`;
        const effD = Units.computeEffective(unit);
        const softEffD = Math.round(effD.soft);
        const hardEffD = Math.round(effD.hard);
        const breakEffD = Math.round(effD.break);
        const defEffD = Math.round(effD.def);
        const maxEnemy = { ...unit, hp: unit.maxHp || unit.hp };
        const effMaxD = Units.computeEffective(maxEnemy);
        const eSoft = document.getElementById('enemy-soft');
        const eHard = document.getElementById('enemy-hard');
        const eBreak = document.getElementById('enemy-break');
        const eDef = document.getElementById('enemy-def');
        const eArmor = document.getElementById('enemy-armor');
        const keysD = Array.isArray(unit.comp) ? (unit.comp || []).filter(k => k) : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        let supSoftD = 0, supHardD = 0;
        keysD.forEach(k => {
            if (typeof k !== 'string') return;
            const isArt = (k === 'ARTILLERY') || k.includes('HOWITZER') || k.includes('ROCKET_ARTILLERY');
            const isAT = k.includes('AT_GUN');
            const isAA = (REGIMENT_CLASSES && Array.isArray(REGIMENT_CLASSES.anti_air)) ? REGIMENT_CLASSES.anti_air.includes(k) : false;
            if (!(isArt || isAT || isAA)) return;
            const reg = REGIMENT_TYPES[k];
            supSoftD += (reg?.soft || 0);
            supHardD += (reg?.hard || 0);
        });
        const atkMultD = Units.getAttackMultiplier(Units.getHpRatio(unit));
        const atkMultMaxD = Units.getAttackMultiplier(Units.getHpRatio({ ...unit, hp: unit.maxHp || unit.hp }));
        const curSupSoftD = Math.round(supSoftD * atkMultD);
        const curSupHardD = Math.round(supHardD * atkMultD);
        const maxSupSoftD = Math.round(supSoftD * atkMultMaxD);
        const maxSupHardD = Math.round(supHardD * atkMultMaxD);
        if (eSoft) eSoft.innerText = `${curSupSoftD}/${softEffD} (${maxSupSoftD}/${Math.round(effMaxD.soft)})`;
        if (eHard) eHard.innerText = `${curSupHardD}/${hardEffD} (${maxSupHardD}/${Math.round(effMaxD.hard)})`;
        if (eBreak) eBreak.innerText = `${breakEffD} (${Math.round(effMaxD.break)})`;
        if (eDef) eDef.innerText = `${defEffD} (${Math.round(effMaxD.def)})`;
        if (eArmor) eArmor.innerText = `${Math.round((unit.armor || 0) * 100)}%`;
        const aaEl = document.getElementById('enemy-aa');
        if (aaEl) aaEl.innerText = Units.hasAntiAir(unit) ? '是' : '否';
        const iconBox = document.getElementById('enemy-icon-box');
        if (iconBox) {
            const mainIcon = Units.getArmorIcon(unit);
            const subTxt = Units.getSubBadgeText(unit);
            iconBox.innerHTML = Units.composeIcon(mainIcon, subTxt, "relative w-12 h-12 flex items-center justify-center", 1.5, 0.6, 0.28);
        }
        const btn = document.getElementById('enemy-comp-btn');
        if (btn) btn.onclick = (e) => { e.stopPropagation(); UIPanels.openComp(game, unit); };
    },
    hideEnemy() {
        const panel = document.getElementById('enemy-info-panel');
        if (panel) panel.style.transform = 'translate(-50%, 150%)';
    },
    openComp(game, unit) {
        const modal = document.getElementById('comp-modal');
        const content = document.getElementById('comp-content');
        const title = document.getElementById('comp-title');
        if (!modal || !content || !title) return;
        title.innerText = (unit.name || '单位') + ' · 编制';
        content.innerHTML = '';
        const isArrayComp = Array.isArray(unit.comp);
        if ((isArrayComp && unit.comp.length === 0) || (!isArrayComp && (!unit.comp || ((unit.comp.main || []).length === 0 && (unit.comp.support || []).length === 0)))) {
            const hint = document.createElement('div');
            hint.className = "text-[11px] text-gray-400";
            hint.innerText = "无编制信息";
            content.appendChild(hint);
        } else {
            if (isArrayComp) {
                const grid = document.createElement('div');
                grid.className = "grid grid-cols-3 gap-3";
                unit.comp.forEach(key => {
                    const reg = REGIMENT_TYPES[key];
                    if (!reg) return;
                    const card = document.createElement('div');
                    card.className = "glass-card p-3 flex items-center justify-between";
                    const iconHTML = Units.composeRegIcon(key, "relative w-7 h-7 flex items-center justify-center", "text-xl", "text-[10px]");
                    card.innerHTML = `<div class="flex items-center gap-2">${iconHTML}<span class="text-[10px] font-bold">${reg.name}</span></div>`;
                    grid.appendChild(card);
                });
                content.appendChild(grid);
            } else {
                const wrap = document.createElement('div');
                wrap.className = "flex items-start gap-4";
                const supCol = document.createElement('div');
                supCol.className = "grid grid-cols-1 gap-3";
                const sep = document.createElement('div');
                sep.style.borderLeft = '1px dashed rgba(255,255,255,0.25)';
                sep.style.height = '100%';
                sep.style.margin = '0 6px';
                const mainGrid = document.createElement('div');
                mainGrid.className = "grid grid-cols-5 gap-3";
                (unit.comp.support || []).forEach(key => {
                    const reg = REGIMENT_TYPES[key];
                    if (!reg) return;
                    const slot = document.createElement('div');
                    slot.className = "regiment-slot rounded-xl flex items-center justify-center text-2xl";
                    slot.style.width = '52px'; slot.style.height = '52px';
                    slot.innerHTML = Units.composeRegIcon(key, "relative w-full h-full flex items-center justify-center", "text-xl", "text-[10px]");
                    supCol.appendChild(slot);
                });
                (unit.comp.main || []).forEach(key => {
                    const reg = REGIMENT_TYPES[key];
                    if (!reg) return;
                    const slot = document.createElement('div');
                    slot.className = "regiment-slot rounded-xl flex items-center justify-center text-2xl";
                    slot.style.width = '64px'; slot.style.height = '56px';
                    slot.innerHTML = Units.composeRegIcon(key, "relative w-full h-full flex items-center justify-center", "text-3xl", "text-[10px]");
                    mainGrid.appendChild(slot);
                });
                wrap.appendChild(supCol); wrap.appendChild(sep); wrap.appendChild(mainGrid);
                content.appendChild(wrap);
            }
        }
        modal.classList.remove('hidden');
    },
    hideComp() {
        const modal = document.getElementById('comp-modal');
        if (modal) modal.classList.add('hidden');
    },
    formatCostSafe(cost) {
        const E = (typeof Economy !== 'undefined') ? Economy : null;
        if (E && typeof E.formatCost === 'function') return E.formatCost(cost);
        const c = (typeof cost === 'number') ? { money: cost } : (cost || {});
        const parts = [];
        const order = ['money','industry','pop','food','metal','precious'];
        order.forEach(k => {
            const v = c[k];
            if (!v || v <= 0) return;
            const icon = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[k]) ? YIELD_ICONS[k] : k;
            parts.push(k === 'money' ? `$${v}` : `${icon} ${v}`);
        });
        Object.entries(c).forEach(([k, v]) => {
            if (order.includes(k)) return;
            if (!v || v <= 0) return;
            const icon = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[k]) ? YIELD_ICONS[k] : k;
            parts.push(k === 'money' ? `$${v}` : `${icon} ${v}`);
        });
        return parts.join(' / ');
    },
    updateTilePanel(game) {
        const panel = document.getElementById('tile-panel');
        const leftWrap = document.getElementById('left-panel-wrap');
        const ensureMinBtn = () => {
            if (!panel) return;
            let btn = document.getElementById('tile-panel-min-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'tile-panel-min-btn';
                btn.className = "absolute top-2 right-2 w-7 h-7 rounded-full glass-card text-[12px] flex items-center justify-center";
                btn.innerText = '🗕';
                btn.title = '缩小';
                btn.onclick = (e) => { e.stopPropagation(); if (game && typeof game.toggleTilePanelMinimize === 'function') game.toggleTilePanelMinimize(); };
                panel.appendChild(btn);
                panel.style.position = 'relative';
            }
        };
        const ensureMinChip = () => {
            if (!leftWrap) return;
            let chip = document.getElementById('tile-panel-min-chip');
            if (!chip) {
                chip = document.createElement('button');
                chip.id = 'tile-panel-min-chip';
                chip.className = "absolute top-0 left-0 w-8 h-8 rounded-full glass-card text-[12px] flex items-center justify-center";
                chip.innerText = '🗗';
                chip.title = '展开地块信息';
                chip.onclick = (e) => { e.stopPropagation(); if (game) { game.tilePanelMinimized = false; UIPanels.updateTilePanel(game); } };
                leftWrap.appendChild(chip);
                leftWrap.style.position = 'absolute';
            }
        };
        const removeMinChip = () => {
            const chip = document.getElementById('tile-panel-min-chip');
            if (chip) chip.remove();
        };
        if (!game.selectedTile) { panel.classList.add('hidden'); removeMinChip(); return; }
        if (game.tilePanelMinimized) {
            panel.classList.add('hidden');
            ensureMinChip();
            return;
        } else {
            removeMinChip();
        }
        panel.classList.remove('hidden');
        ensureMinBtn();
        document.getElementById('tile-name').innerText = `地块 [${game.selectedTile.q}, ${game.selectedTile.r}]`;
        document.getElementById('tile-type-label').innerText = `地形: ${TERRAINS[game.selectedTile.terrain].name}`;
        const hintEl = document.getElementById('tile-terrain-hint');
        if (hintEl) {
            const key = game.selectedTile.terrain;
            let hint = '';
            if (key === 'PLAINS') hint = '平原：无修正';
            else if (key === 'FOREST') hint = '森林：守方抵抗 +10%，空军对守方伤害 -20%';
            else if (key === 'MOUNTAIN') hint = '山地：守方抵抗 +20%，攻方进攻 -10%';
            else if (key === 'DESERT') hint = '沙漠：无修正';
            else if (key === 'BARRIER_MOUNTAIN') hint = '屏障山脉：不可通行、不可建造（以线条出现）';
            else if (key === 'SHALLOW_SEA') hint = '浅海：陆军入海当回合耗尽AP；在海域AP=6，每格 -1AP';
            else if (key === 'DEEP_SEA') hint = '深海：陆军入海当回合耗尽AP；在海域AP=6，每格 -1AP';
            hintEl.innerText = hint;
            const resEl = document.getElementById('tile-resource-hint');
            if (resEl) {
                const parts = [];
                if (game.selectedTile.preciousDeposit) parts.push(YIELD_ICONS.precious || '💎');
                if (game.selectedTile.oilDeposit) parts.push(YIELD_ICONS.oil || '🛢️');
                resEl.innerText = `资源：${parts.length ? parts.join(' ') : '无'}`;
            }
        }
        const tag = document.getElementById('tile-owner-tag');
        tag.innerText = game.selectedTile.owner === game.currentOwnerKey ? '己方' : (game.selectedTile.owner === 'Enemy' ? '敌方' : '中立');
        tag.classList.remove('border');
        tag.classList.remove('rounded-full');
        tag.style.display = 'inline';
        tag.style.alignItems = '';
        tag.style.justifyContent = '';
        tag.style.minWidth = '';
        tag.style.height = '';
        tag.style.borderRadius = '';
        const isPlayer = game.selectedTile.owner === game.currentOwnerKey;
        if (typeof UIDiplomacy !== 'undefined') UIDiplomacy.updateLauncher(game);
        const status = document.getElementById('building-status');
        status.innerHTML = '';
        status.style.flexWrap = 'nowrap';
        status.style.width = '100%';
        const existedCtrl = document.getElementById('district-ctrl-wrap');
        if (existedCtrl) existedCtrl.remove();
        const existedPopClip = document.getElementById('district-pop-clip');
        if (existedPopClip) existedPopClip.remove();
        const existedClassClip = document.getElementById('district-class-clip');
        if (existedClassClip) existedClassClip.remove();
        const existedNat = document.getElementById('nationalize-wrap');
        if (existedNat) existedNat.remove();
        if (game.selectedTile.building) {
            const b = BUILDINGS[game.selectedTile.building];
            status.classList.remove('items-center');
            status.classList.add('items-start');
            const wrap = document.createElement('div');
            wrap.className = "flex items-start gap-4 w-full";
            const leftCol = document.createElement('div');
            leftCol.className = "flex-1 min-w-0";
            const header = document.createElement('div');
            header.className = "flex flex-col items-start gap-2";
            const icon = document.createElement('div');
            icon.className = "text-3xl";
            icon.innerHTML = UIPanels.renderBuildingIcon(game.selectedTile.building, "w-8 h-8");
            const infoWrap = document.createElement('div');
            const nameEl = document.createElement('div');
            nameEl.className = "text-sm font-bold text-white";
            nameEl.innerText = b.name;
            const mKeys = ['food','metal','precious','consumer','energy','oil'];
            const isMarket = Object.keys(b.yields || {}).some(k => mKeys.includes(k));
            if (isMarket) {
                const own = game.selectedTile.marketOwnership === 'state' ? '国有' : '私有';
                const tag = document.createElement('span');
                tag.className = (own === '国有') ? "ml-2 px-2 py-0.5 rounded-lg bg-blue-600/30 text-blue-200 text-[10px]" : "ml-2 px-2 py-0.5 rounded-lg bg-gray-600/30 text-gray-300 text-[10px]";
                tag.innerText = own;
                nameEl.appendChild(tag);
            }
            const subEl = document.createElement('div');
            subEl.className = "text-[10px] text-blue-400 font-bold uppercase tracking-tight";
            subEl.innerText = "设施详情";
            infoWrap.appendChild(nameEl);
            infoWrap.appendChild(subEl);
            header.appendChild(icon);
            header.appendChild(infoWrap);
            const descEl = document.createElement('p');
            descEl.className = "text-[11px] text-gray-400 mt-2 leading-relaxed";
            descEl.innerText = b.desc;
            leftCol.appendChild(header);
            leftCol.appendChild(descEl);
            const rightCol = document.createElement('div');
            rightCol.className = "flex-1 min-w-0";
            const yieldsBox = document.createElement('div');
            yieldsBox.className = "w-full";
            const secLabel = document.createElement('label');
            secLabel.className = "text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block";
            secLabel.innerText = "产出预览";
            yieldsBox.appendChild(secLabel);
            const list = document.createElement('div');
            list.className = "space-y-1 w-full";
            const multiplier = Research.getMultiplier(game, game.selectedTile.building);
            const market = game.market || { supply: {}, demand: {} };
            const marketKeys = ['food','metal','precious','consumer','energy','oil'];
            const reqRes = Object.entries(b.yields).filter(([res, v]) => marketKeys.includes(res) && (v || 0) < 0).map(([res]) => res);
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
            const toInt = (v) => {
                const n = Number(v) || 0;
                if (n >= 0) return Math.floor(n);
                return -Math.floor(Math.abs(n));
            };
            const fmtSigned = (n) => `${n > 0 ? '+' : ''}${n}`;
            Object.entries(b.yields).forEach(([res, val]) => {
                const raw = (val || 0);
                if (!raw) return;
                if (game.selectedTile.building === 'city' && res === 'money') {
                    const baseRate = Math.max(0, (game.populationGrowthBase || 0) + Math.max(0, game.healthGrowthBonus || 0) - Math.max(0, game.conscriptionGrowthPenalty || 0));
                    const effRate = Math.max(0, baseRate * Math.max(0, gTotal || 0));
                    const basePct = (baseRate * 100).toFixed(1);
                    const effPct = (effRate * 100).toFixed(1);
                    const row = document.createElement('div');
                    row.className = `flex items-center text-[10px] w-full text-green-400`;
                    const icon = (typeof YIELD_ICONS === 'object' && YIELD_ICONS.pop) ? YIELD_ICONS.pop : '👥';
                    const right = `+${effPct}%`;
                    row.innerHTML = `<span class="mr-2">${icon}</span><span class="ml-auto whitespace-nowrap text-right font-mono">${right}</span>`;
                    list.appendChild(row);
                }
                if (res === 'civilization' || res === 'science') {
                    const mul = multiplier;
                    const mid1 = raw > 0 ? (raw * mul) : raw;
                    let bonus = 0;
                    if (res === 'civilization') {
                        const gov = game.govStructure || '';
                        const speech = game.speechLaw || 'press_censorship';
                        if (gov === 'monarchy') bonus += 1.0;
                        else if (gov === 'presidential_republic') bonus += 0.5;
                        if (speech === 'illegal_dissent') bonus += 1.0;
                        else if (speech === 'press_censorship') bonus += 0.25;
                    } else {
                        const edu = game.educationLaw || 'none';
                        const speech = game.speechLaw || 'press_censorship';
                        if (edu === 'private_school' || edu === 'public_school') bonus += 0.25;
                        if (speech === 'free_speech') bonus += 0.15;
                    }
                    const mid2 = mid1 * (1 + bonus);
                    const final = mid2 * Math.max(0, gTotal || 0);
                    const toInt = (v) => { const n = Number(v) || 0; return n >= 0 ? Math.floor(n) : -Math.floor(Math.abs(n)); };
                    const fmtSigned = (n) => `${n > 0 ? '+' : ''}${n}`;
                    const r1 = toInt(mid1);
                    const r2 = toInt(mid2);
                    const rv = toInt(final);
                    const row = document.createElement('div');
                    row.className = `flex items-center text-[10px] w-full ${rv > 0 ? 'text-green-400' : (rv < 0 ? 'text-red-400' : 'text-gray-300')}`;
                    const icon = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[res]) ? YIELD_ICONS[res] : res;
                    const right = `${fmtSigned(r1)} → ${fmtSigned(r2)} → ${fmtSigned(rv)}`;
                    row.innerHTML = `<span class="mr-2">${icon}</span><span class="ml-auto whitespace-nowrap text-right font-mono">${right}</span>`;
                    list.appendChild(row);
                    return;
                }
                let effBase = raw;
                if (effBase > 0) effBase *= multiplier;
                if (game.selectedTile.building === 'renewable_power' && res === 'energy') {
                    const base = raw;
                    const terr = game.selectedTile.terrain;
                    const seaTerr = terr === 'SHALLOW_SEA' || terr === 'DEEP_SEA';
                    const bonus = (terr === 'DESERT' || seaTerr) ? Math.max(0, b.energy_desert_bonus || 0) : 0;
                    const capRef = BUILDINGS[b.energy_cap_ref || ''] || null;
                    const capMul = capRef ? Research.getMultiplier(game, b.energy_cap_ref) : 1;
                    const capVal = capRef && capRef.yields ? Math.max(0, (capRef.yields.energy || 0) * capMul) : Infinity;
                    effBase = Math.min((base + bonus) * multiplier, capVal);
                }
                if (res === 'civilization') {
                    const gov = game.govStructure || '';
                    const speech = game.speechLaw || 'press_censorship';
                    let civBonus = 0;
                    if (gov === 'monarchy') civBonus += 1.0;
                    else if (gov === 'presidential_republic') civBonus += 0.5;
                    if (speech === 'illegal_dissent') civBonus += 1.0;
                    else if (speech === 'press_censorship') civBonus += 0.25;
                    effBase *= (1 + civBonus);
                }
                if (res === 'science') {
                    const edu = game.educationLaw || 'none';
                    const speech = game.speechLaw || 'press_censorship';
                    let sciBonus = 0;
                    if (edu === 'private_school' || edu === 'public_school') sciBonus += 0.25;
                    if (speech === 'free_speech') sciBonus += 0.15;
                    effBase *= (1 + sciBonus);
                }
                const baseInt = toInt(effBase);
                let effFinal = (marketKeys.includes(res) && raw < 0) ? effBase : (effBase * gTotal);
                if (game.selectedTile.building === 'barracks' && res === 'food' && game.conscriptionLaw === 'mass_conscription') {
                    effFinal = effFinal - 10;
                }
                const effVal = toInt(effFinal);
                const row = document.createElement('div');
                row.className = `flex items-center text-[10px] w-full ${effVal > 0 ? 'text-green-400' : (effVal < 0 ? 'text-red-400' : 'text-gray-300')}`;
                const icon = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[res]) ? YIELD_ICONS[res] : res;
                const right = effVal !== baseInt ? `${fmtSigned(baseInt)} → ${fmtSigned(effVal)}` : `${fmtSigned(effVal)}`;
                row.innerHTML = `<span class="mr-2">${icon}</span><span class="ml-auto whitespace-nowrap text-right font-mono">${right}</span>`;
                list.appendChild(row);
            });
            const multTag = document.createElement('div');
            multTag.className = "flex items-center text-[9px] text-cyan-400 mt-1 w-full";
            multTag.innerHTML = `<span class="flex-1 text-left">科研乘数</span><span class="ml-auto font-mono text-right">${Math.round(multiplier * 100)}%</span>`;
            const resEffTag = document.createElement('div');
            resEffTag.className = "flex items-center text-[9px] text-blue-400 mt-0.5 w-full";
            resEffTag.innerHTML = `<span class="flex-1 text-left">资源效能乘数</span><span class="ml-auto font-mono text-right">${(Math.round(gTotal * 100) / 100).toFixed(2)}</span>`;
            yieldsBox.appendChild(list);
            yieldsBox.appendChild(multTag);
            yieldsBox.appendChild(resEffTag);
            rightCol.appendChild(yieldsBox);
            wrap.appendChild(leftCol);
            wrap.appendChild(rightCol);
            status.appendChild(wrap);
            const isCityBuilt = game.selectedTile.building === 'city';
            const isCityPending = !isCityBuilt && (typeof game.hasPendingCity === 'function') && game.hasPendingCity(game.selectedTile);
            if (isPlayer && (isCityBuilt || isCityPending)) {
                const dk = `${game.selectedTile.q},${game.selectedTile.r}`;
                const popVal = (typeof game.getDistrictPopulation === 'function') ? Math.max(0, Math.floor(game.getDistrictPopulation(dk))) : 0;
                const popClip = document.createElement('div');
                popClip.id = 'district-pop-clip';
                popClip.className = "mt-2 w-full glass-card p-3 flex items-center";
                const label = document.createElement('span');
                label.className = "text-[10px] text-gray-300";
                label.innerText = "辖区人口";
                const valEl = document.createElement('span');
                valEl.className = "ml-auto font-mono text-[10px] text-cyan-400";
                valEl.innerText = String(popVal);
                popClip.appendChild(label); popClip.appendChild(valEl);
                status.parentElement.appendChild(popClip);
                const dist = typeof game.getDistrictClassDistribution === 'function' ? game.getDistrictClassDistribution(dk) : { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                const classClip = document.createElement('div');
                classClip.id = 'district-class-clip';
                classClip.className = "mt-2 w-full glass-card p-3";
                const row1 = document.createElement('div');
                row1.className = "flex items-center text-[10px]";
                row1.innerHTML = `<span class="text-gray-300">精英</span><span class="ml-auto font-mono text-cyan-400">${Math.max(0, Math.floor(dist.elite || 0))}</span>`;
                const row2 = document.createElement('div');
                row2.className = "flex items-center text-[10px] mt-1";
                row2.innerHTML = `<span class="text-gray-300">专家</span><span class="ml-auto font-mono text-cyan-400">${Math.max(0, Math.floor(dist.expert || 0))}</span>`;
                const row3 = document.createElement('div');
                row3.className = "flex items-center text-[10px] mt-1";
                row3.innerHTML = `<span class="text-gray-300">劳工</span><span class="ml-auto font-mono text-cyan-400">${Math.max(0, Math.floor(dist.labor || 0))}</span>`;
                const row4 = document.createElement('div');
                row4.className = "flex items-center text-[10px] mt-1";
                row4.innerHTML = `<span class="text-gray-300">自给农</span><span class="ml-auto font-mono text-cyan-400">${Math.max(0, Math.floor(dist.subsistence || 0))}</span>`;
                classClip.appendChild(row1); classClip.appendChild(row2); classClip.appendChild(row3); classClip.appendChild(row4);
                status.parentElement.appendChild(classClip);
                const oldCtrl = document.getElementById('district-ctrl-wrap');
                if (oldCtrl) oldCtrl.remove();
                const ctrlWrap = document.createElement('div');
                ctrlWrap.id = 'district-ctrl-wrap';
                ctrlWrap.className = "mt-2 w-full flex items-center gap-2";
                const btn = document.createElement('button');
                btn.className = "px-3 py-2 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300";
                const editing = game.cityEditMode && game.cityEditMode === `${game.selectedTile.q},${game.selectedTile.r}`;
                const idleLabel = isCityPending ? "修改预设辖区" : "扩张辖区";
                btn.innerText = editing ? "结束修改辖区" : idleLabel;
                btn.onclick = (e) => { e.stopPropagation(); game.toggleCityEdit(game.selectedTile); };
                const countTag = document.createElement('span');
                countTag.className = "ml-auto text-[10px] font-mono text-cyan-400";
                const tiles = typeof game.getDistrictTiles === 'function' ? game.getDistrictTiles(game.selectedTile) : [];
                countTag.innerText = `辖区规模: ${tiles.length}/25`;
                ctrlWrap.appendChild(btn);
                ctrlWrap.appendChild(countTag);
                status.parentElement.appendChild(ctrlWrap);
            }
            const unitHere = game.selectedUnit && game.selectedUnit.q === game.selectedTile.q && game.selectedUnit.r === game.selectedTile.r ? game.selectedUnit : null;
            const oldRefill = document.getElementById('refill-wrap');
            if (oldRefill) oldRefill.remove();
            if (unitHere && Economy.canRefill(game, unitHere)) {
                const refillWrap = document.createElement('div');
                refillWrap.id = 'refill-wrap';
                refillWrap.className = "mt-2";
                refillWrap.style.width = '100%';
                const costObj = Economy.computeRefillCost(unitHere);
                const label = Economy.formatCost(costObj);
                const btn = document.createElement('button');
                btn.className = "px-3 py-2 rounded text-[10px] font-bold bg-green-700 hover:bg-green-600 text-white";
                btn.innerText = `补充HP（${label || '无需'}）`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const ok = Economy.applyRefill(game, unitHere);
                    if (!ok) return;
                    game.updateResourceUI();
                    UIPanels.showUnit(game, unitHere);
                    UIPanels.updateTilePanel(game);
                };
                refillWrap.appendChild(btn);
                status.parentElement.appendChild(refillWrap);
            }
            const oldNat = document.getElementById('nationalize-wrap');
            if (oldNat) oldNat.remove();
            const isMarketOwnPrivate = isPlayer && Object.keys(b.yields || {}).some(k => mKeys.includes(k)) && game.selectedTile.marketOwnership === 'private';
            if (isMarketOwnPrivate) {
                const natWrap = document.createElement('div');
                natWrap.id = 'nationalize-wrap';
                natWrap.className = "mt-2";
                natWrap.style.width = '100%';
                const reqNat = BuildingsUI.computeRequirement(b);
                const mul = (game.economySystem === 'planned') ? 10 : 50;
                const costNat = Math.max(10, Math.floor(reqNat * mul * 0.5));
                const natBtn = document.createElement('button');
                natBtn.className = "px-3 py-2 rounded text-[10px] font-bold bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40 disabled:hover:bg-blue-700";
                natBtn.innerText = `国有化（成本：${costNat}）`;
                const banned = game.economySystem === 'laissez_faire';
                natBtn.disabled = banned || (Math.max(0, Math.floor(game.res.money || 0)) < costNat);
                natBtn.title = banned ? "自由放任禁用国有化" : (natBtn.disabled ? "资金不足" : "");
                natBtn.onclick = (e) => { e.stopPropagation(); game.nationalizeSelectedBuilding(); };
                natWrap.appendChild(natBtn);
                const clsTag = document.createElement('span');
                clsTag.className = "ml-2 text-[10px] font-mono text-cyan-400";
                const inv = game.selectedTile.investorClass;
                const invLabel = inv === 'elite' ? '精英' : (inv === 'expert' ? '专家' : (inv === 'labor' ? '劳工' : '未知'));
                clsTag.innerText = `所有者：${invLabel}`;
                natWrap.appendChild(clsTag);
                status.parentElement.appendChild(natWrap);
            }
            const bld = game.selectedTile.building;
            document.getElementById('military-section').classList.toggle('hidden', !isPlayer || (bld !== 'barracks' && bld !== 'airbase' && bld !== 'naval_base'));
        } else {
            const hint = document.createElement('div');
            hint.className = "text-[10px] text-gray-400";
            hint.innerText = "未建设设施";
            status.appendChild(hint);
            document.getElementById('military-section').classList.add('hidden');
            const t = game.selectedTile;
            const pendPlayer = (game.buildQueue || []).find(it => it.q === t.q && it.r === t.r);
            if (pendPlayer) {
                const b = BUILDINGS[pendPlayer.type];
                const row = document.createElement('div');
                row.className = "glass-card p-3 mt-2 flex items-center gap-3 w-full";
                const icon = document.createElement('div');
                icon.className = "text-xl";
                icon.innerHTML = UIPanels.renderBuildingIcon(pendPlayer.type, "w-6 h-6");
                const info = document.createElement('div');
                info.className = "flex-1";
                const req = Math.max(0, Math.floor(pendPlayer.requirement || 0));
                const prog = Math.max(0, Math.floor(pendPlayer.progress || 0));
                const barWrap = document.createElement('div');
                barWrap.className = "w-full h-2 bg-white/10 rounded overflow-hidden mt-1";
                const bar = document.createElement('div');
                bar.className = "h-full bg-cyan-600";
                bar.style.width = `${Math.max(0, Math.min(100, req === 0 ? 0 : (prog / req) * 100))}%`;
                barWrap.appendChild(bar);
                info.innerHTML = `<div class="text-[11px] font-bold">${b?.name || pendPlayer.type} · 建设中</div><div class="text-[10px] text-gray-400 font-mono">${prog}/${req}</div>`;
                info.appendChild(barWrap);
                row.appendChild(icon); row.appendChild(info);
                status.appendChild(row);
            }
            const pendPrivate = (game.privateBuildQueue || []).find(it => it.q === t.q && it.r === t.r);
            if (pendPrivate) {
                const b = BUILDINGS[pendPrivate.type];
                const row = document.createElement('div');
                row.className = "glass-card p-3 mt-2 flex items-center gap-3 w-full";
                const icon = document.createElement('div');
                icon.className = "text-xl";
                icon.innerHTML = UIPanels.renderBuildingIcon(pendPrivate.type, "w-6 h-6");
                const info = document.createElement('div');
                info.className = "flex-1";
                const req = Math.max(0, Math.floor(pendPrivate.requirement || 0));
                const prog = Math.max(0, Math.floor(pendPrivate.progress || 0));
                const barWrap = document.createElement('div');
                barWrap.className = "w-full h-2 bg-white/10 rounded overflow-hidden mt-1";
                const bar = document.createElement('div');
                bar.className = "h-full bg-emerald-600";
                bar.style.width = `${Math.max(0, Math.min(100, req === 0 ? 0 : (prog / req) * 100))}%`;
                barWrap.appendChild(bar);
                const invLabel = pendPrivate.investorClass === 'elite' ? '精英' : (pendPrivate.investorClass === 'expert' ? '专家' : (pendPrivate.investorClass === 'labor' ? '劳工' : '未知'));
                info.innerHTML = `<div class="text-[11px] font-bold">${b?.name || pendPrivate.type} · 私有建设中 · ${invLabel}</div><div class="text-[10px] text-gray-400 font-mono">${prog}/${req}</div>`;
                info.appendChild(barWrap);
                row.appendChild(icon); row.appendChild(info);
                status.appendChild(row);
            }
        }
        const leftEl = document.getElementById('bp-left');
        const reserved = (typeof game.computeReservedBuildPower === 'function') ? game.computeReservedBuildPower() : 0;
        if (leftEl) leftEl.innerText = Math.max(0, Math.floor((game.buildPowerMax || 0) - reserved));
        const empty = document.getElementById('build-queue-empty');
        const list = document.getElementById('build-queue-list');
        if (empty) empty.classList.toggle('hidden', (game.buildQueue || []).length > 0);
        if (list) {
            list.innerHTML = '';
            (game.buildQueue || []).forEach((it, idx) => {
                const b = BUILDINGS[it.type];
                const row = document.createElement('div');
                row.className = "glass-card p-3 flex items-center gap-3";
                const icon = document.createElement('div');
                icon.className = "text-xl";
                icon.innerHTML = UIPanels.renderBuildingIcon(it.type, "w-6 h-6");
                const info = document.createElement('div');
                info.className = "flex-1";
                const req = Math.max(0, Math.floor(it.requirement || 0));
                const prog = Math.max(0, Math.floor(it.progress || 0));
                const barWrap = document.createElement('div');
                barWrap.className = "w-full h-2 bg-white/10 rounded overflow-hidden mt-1";
                const bar = document.createElement('div');
                bar.className = "h-full bg-cyan-600";
                bar.style.width = `${Math.max(0, Math.min(100, req === 0 ? 0 : (prog / req) * 100))}%`;
                barWrap.appendChild(bar);
                info.innerHTML = `<div class="text-[11px] font-bold">${b?.name || it.type} · [${it.q}, ${it.r}]</div><div class="text-[10px] text-gray-400 font-mono">${prog}/${req}</div>`;
                info.appendChild(barWrap);
                const controls = document.createElement('div');
                controls.className = "flex items-center gap-2";
                const up = document.createElement('button');
                up.className = "px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px]";
                up.innerText = "上移";
                up.disabled = idx === 0;
                up.onclick = (e) => { e.stopPropagation(); game.moveBuildQueueUp(idx); };
                const down = document.createElement('button');
                down.className = "px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px]";
                down.innerText = "下移";
                down.disabled = idx >= (game.buildQueue || []).length - 1;
                down.onclick = (e) => { e.stopPropagation(); game.moveBuildQueueDown(idx); };
                const del = document.createElement('button');
                del.className = "px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-[10px] text-white";
                del.innerText = "移除";
                del.onclick = (e) => { e.stopPropagation(); game.removeBuildQueue(idx); };
                controls.appendChild(up); controls.appendChild(down); controls.appendChild(del);
                row.appendChild(icon); row.appendChild(info); row.appendChild(controls);
                list.appendChild(row);
            });
        }
        const pEmpty = document.getElementById('private-build-queue-empty');
        const pList = document.getElementById('private-build-queue-list');
        if (pEmpty) pEmpty.classList.toggle('hidden', (game.privateBuildQueue || []).length > 0);
        if (pList) {
            pList.innerHTML = '';
            (game.privateBuildQueue || []).forEach((it) => {
                const b = BUILDINGS[it.type];
                const row = document.createElement('div');
                row.className = "glass-card p-3 flex items-center gap-3";
                const icon = document.createElement('div');
                icon.className = "text-xl";
                icon.innerHTML = UIPanels.renderBuildingIcon(it.type, "w-6 h-6");
                const info = document.createElement('div');
                info.className = "flex-1";
                const req = Math.max(0, Math.floor(it.requirement || 0));
                const prog = Math.max(0, Math.floor(it.progress || 0));
                const barWrap = document.createElement('div');
                barWrap.className = "w-full h-2 bg-white/10 rounded overflow-hidden mt-1";
                const bar = document.createElement('div');
                bar.className = "h-full bg-emerald-600";
                bar.style.width = `${Math.max(0, Math.min(100, req === 0 ? 0 : (prog / req) * 100))}%`;
                barWrap.appendChild(bar);
                const invLabel = it.investorClass === 'elite' ? '精英' : (it.investorClass === 'expert' ? '专家' : (it.investorClass === 'labor' ? '劳工' : '未知'));
                info.innerHTML = `<div class="text-[11px] font-bold">${b?.name || it.type} · [${it.q}, ${it.r}] · ${invLabel}</div><div class="text-[10px] text-gray-400 font-mono">${prog}/${req}</div>`;
                info.appendChild(barWrap);
                row.appendChild(icon); row.appendChild(info);
                pList.appendChild(row);
            });
        }
    }
};
