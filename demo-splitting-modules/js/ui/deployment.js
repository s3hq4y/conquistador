//注意：本文件包含对已废弃字段 cost_money/cost_ind 的兼容回退，后续将移除
const DeploymentUI = {
    open(game) {
        this.isAir = !!(game.selectedTile && /airbase/i.test(String(game.selectedTile.building || '')));
        this.isNaval = !!(game.selectedTile && /naval/i.test(String(game.selectedTile.building || '')));
        this.isCarrierAir = false;
        this.carrierUnitId = null;
        this.capacityLimit = null;
        game.modalTemplate = this.isAir ? { support: [], main: Array(9).fill(null) } : { support: Array(5).fill(null), main: Array(25).fill(null) };
        this.listTab = this.isAir ? 'air' : (this.isNaval ? 'naval' : 'infantry');
        const modal = document.getElementById('deployment-modal');
        modal.classList.remove('hidden');
        this.renderList(game);
        this.refresh(game);
    },
    openForCarrier(game, unit) {
        this.isAir = true;
        this.isNaval = false;
        this.isCarrierAir = true;
        this.carrierUnitId = unit?.id || null;
        const cap = Math.max(1, Math.floor(unit?.planeCapacity || 0));
        this.capacityLimit = cap;
        game.modalTemplate = { support: [], main: Array(cap).fill(null) };
        this.listTab = 'air';
        const modal = document.getElementById('deployment-modal');
        modal.classList.remove('hidden');
        this.renderList(game);
        this.refresh(game);
    },
    close(game) {
        const modal = document.getElementById('deployment-modal');
        modal.classList.add('hidden');
    },
    getOrgDims(game) {
        if (this.isAir) {
            if (this.isCarrierAir && typeof this.capacityLimit === 'number') {
                const cap = Math.max(1, this.capacityLimit || 1);
                return { rows: 1, cols: cap };
            }
            return { rows: 3, cols: 3 };
        }
        const l1 = this.isNaval ? game.researchedTechs.includes('naval_org_1') : game.researchedTechs.includes('doctrine_org_1');
        const l2 = this.isNaval ? game.researchedTechs.includes('naval_org_2') : game.researchedTechs.includes('doctrine_org_2');
        const l3 = this.isNaval ? game.researchedTechs.includes('naval_org_3') : game.researchedTechs.includes('doctrine_org_3');
        const l4 = this.isNaval ? game.researchedTechs.includes('naval_org_4') : game.researchedTechs.includes('doctrine_org_4');
        if (l4) return { rows: 5, cols: 5 };
        if (l3) return { rows: 5, cols: 4 };
        if (l2) return { rows: 4, cols: 4 };
        if (l1) return { rows: 4, cols: 3 };
        return { rows: 3, cols: 3 };
    },
    getSavedTemplates() {
        try {
            const raw = localStorage.getItem('vh_saved_templates');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    },
    setSavedTemplates(arr) {
        try { localStorage.setItem('vh_saved_templates', JSON.stringify(arr || [])); } catch (e) {}
    },
    saveCurrentTemplate(game, name) {
        if (!name) return;
        const saved = this.getSavedTemplates();
        const tpl = {
            name,
            isAir: !!this.isAir,
            support: (game.modalTemplate.support || []).slice(),
            main: (game.modalTemplate.main || []).slice()
        };
        const idx = saved.findIndex(t => t.name === name && !!t.isAir === !!tpl.isAir);
        if (idx >= 0) saved[idx] = tpl; else saved.push(tpl);
        this.setSavedTemplates(saved);
    },
    applyTemplate(game, tpl) {
        if (!tpl) return;
        const isAirMatch = !!tpl.isAir === !!this.isAir;
        if (!isAirMatch) return;
        const sup = Array.isArray(tpl.support) ? tpl.support.slice() : [];
        const main = Array.isArray(tpl.main) ? tpl.main.slice() : [];
        if (this.isAir) {
            game.modalTemplate.support = [];
            game.modalTemplate.main = Array(9).fill(null).map((_, i) => main[i] || null);
        } else {
            const dims = this.getOrgDims(game);
            const mainLimit = dims.rows * dims.cols;
            const filteredMain = Array(25).fill(null);
            let engineerPlaced = false;
            for (let i = 0; i < Math.min(main.length, filteredMain.length); i++) {
                const k = main[i];
                if (!k) continue;
                const isEngineer = ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY'].includes(k);
                if (isEngineer) continue;
                if (i < mainLimit) filteredMain[i] = k;
            }
            const filteredSupport = Array(5).fill(null);
            for (let i = 0; i < Math.min(sup.length, filteredSupport.length); i++) {
                const k = sup[i];
                if (!k) continue;
                const isEngineer = ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY'].includes(k);
                if (isEngineer) {
                    if (engineerPlaced) continue;
                    engineerPlaced = true;
                }
                filteredSupport[i] = k;
            }
            if (!engineerPlaced) {
                const firstEngInMain = main.find(k => ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY'].includes(k));
                if (firstEngInMain) {
                    const idx = filteredSupport.findIndex(v => v === null);
                    if (idx !== -1) { filteredSupport[idx] = firstEngInMain; engineerPlaced = true; }
                }
            }
            game.modalTemplate.support = filteredSupport;
            game.modalTemplate.main = filteredMain;
        }
        this.refresh(game);
    },
    deleteTemplate(name, isAir) {
        const saved = this.getSavedTemplates();
        const next = saved.filter(t => !(t.name === name && !!t.isAir === !!isAir));
        this.setSavedTemplates(next);
    },
    renderTemplateControls(game) {
        const confirmBtn = document.getElementById('m-confirm-recruit');
        const actionsParent = confirmBtn ? confirmBtn.parentElement : null;
        if (!actionsParent || !confirmBtn) return;
        let box = document.getElementById('m-template-controls');
        if (box) box.remove();
        box = document.createElement('div');
        box.id = 'm-template-controls';
        box.className = "mt-3 mb-2 space-y-2";
        const row1 = document.createElement('div');
        row1.className = "flex gap-2";
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '模板名称';
        nameInput.className = "flex-1 px-2 py-1 rounded bg-white/5 text-[10px] text-white border border-white/10";
        const saveBtn = document.createElement('button');
        saveBtn.className = "px-3 py-1 rounded bg-green-700 hover:bg-green-600 text-[10px] font-bold text-white";
        saveBtn.innerText = "保存编制";
        saveBtn.onclick = (e) => { e.stopPropagation(); const n = nameInput.value.trim(); if (!n) return; this.saveCurrentTemplate(game, n); this.renderTemplateControls(game); };
        row1.appendChild(nameInput); row1.appendChild(saveBtn);
        const row2 = document.createElement('div');
        row2.className = "flex gap-2 items-center";
        const select = document.createElement('select');
        select.className = "flex-1 px-2 py-1 rounded bg-white/5 text-[10px] text-white border border-white/10";
        const saved = this.getSavedTemplates().filter(t => !!t.isAir === !!this.isAir);
        saved.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.innerText = t.name;
            select.appendChild(opt);
        });
        const applyBtn = document.createElement('button');
        applyBtn.className = "px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-bold text-white";
        applyBtn.innerText = "套用模板";
        applyBtn.onclick = (e) => {
            e.stopPropagation();
            const name = select.value;
            const tpl = this.getSavedTemplates().find(t => t.name === name && !!t.isAir === !!this.isAir);
            if (tpl) this.applyTemplate(game, tpl);
        };
        const delBtn = document.createElement('button');
        delBtn.className = "px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-[10px] font-bold text-white";
        delBtn.innerText = "删除";
        delBtn.onclick = (e) => { e.stopPropagation(); const name = select.value; if (!name) return; this.deleteTemplate(name, !!this.isAir); this.renderTemplateControls(game); };
        row2.appendChild(select); row2.appendChild(applyBtn); row2.appendChild(delBtn);
        box.appendChild(row1); box.appendChild(row2);
        actionsParent.insertBefore(box, confirmBtn);
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
    renderList(game) {
        const regCont = document.getElementById('modal-regiment-list');
        if (!regCont) return;
        regCont.innerHTML = '';
        if (!this.isAir) {
            const tabs = this.isNaval
                ? [{ key: 'naval', label: '海军' }]
                : [
                    { key: 'infantry', label: '步兵' },
                    { key: 'artillery', label: '火炮' },
                    { key: 'sp_art', label: '机动火炮' },
                    { key: 'armor', label: '装甲部队' },
                    { key: 'support_company', label: '支援连' }
                ];
            const tabBar = document.createElement('div');
            tabBar.className = "flex gap-2 mb-2";
            tabs.forEach(t => {
                const b = document.createElement('button');
                const active = this.listTab === t.key;
                b.className = `px-3 py-1 rounded text-xs font-bold ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`;
                b.innerText = t.label;
                b.onclick = () => { this.listTab = t.key; this.renderList(game); };
                tabBar.appendChild(b);
            });
            regCont.appendChild(tabBar);
        }
        let items = [];
        let headerName = '';
        if (this.isAir) {
            headerName = (REGIMENT_CATEGORIES.air && REGIMENT_CATEGORIES.air.name) || '空军类';
            items = [];
            items.push('FIGHTER');
            items.push('CAS');
            if (game.researchedTechs.includes('air_heavy_fighter')) items.push('HEAVY_FIGHTER');
            if (game.researchedTechs.includes('air_strategic_bomber')) items.push('STRATEGIC_BOMBER');
        } else if (this.listTab === 'infantry') {
            headerName = (REGIMENT_CATEGORIES.infantry && REGIMENT_CATEGORIES.infantry.name) || '步兵类';
            items = [...(REGIMENT_CATEGORIES.infantry?.items || [])];
            if (game.researchedTechs.includes('infanty_1')) items.push('MOTORIZED');
            if (game.researchedTechs.includes('infanty_2')) items.push('MECHANIZED');
            if (game.researchedTechs.includes('infanty_3')) items.push('ARMORED_INFANTRY');
            if (game.researchedTechs.includes('infanty_4')) items.push('SPECIAL_FORCES');
        } else if (this.listTab === 'artillery') {
            headerName = '火炮类';
            items.push('ARTILLERY');
            if (game.researchedTechs.includes('artillery_howitz')) items.push('HOWITZER');
            if (game.researchedTechs.includes('artillery_at')) items.push('AT_GUN');
            if (game.researchedTechs.includes('artillery_aa')) items.push('AA_GUN');
            if (game.researchedTechs.includes('artillery_rocket')) items.push('ROCKET_ARTILLERY');
        } else if (this.listTab === 'sp_art') {
            headerName = '机动火炮';
            if (game.researchedTechs.includes('artillery_howitz') && game.researchedTechs.includes('sp_art_1')) items.push('MOTORIZED_HOWITZER');
            if (game.researchedTechs.includes('artillery_howitz') && game.researchedTechs.includes('sp_art_2')) items.push('SP_HOWITZER');
            if (game.researchedTechs.includes('artillery_at') && game.researchedTechs.includes('sp_art_1')) items.push('MOTORIZED_AT_GUN');
            if (game.researchedTechs.includes('artillery_at') && game.researchedTechs.includes('sp_art_2')) items.push('SP_AT_GUN');
            if (game.researchedTechs.includes('artillery_aa') && game.researchedTechs.includes('sp_art_1')) items.push('MOTORIZED_AA_GUN');
            if (game.researchedTechs.includes('artillery_aa') && game.researchedTechs.includes('sp_art_2')) items.push('SP_AA_GUN');
            if (game.researchedTechs.includes('artillery_rocket') && game.researchedTechs.includes('sp_art_1')) items.push('MOTORIZED_ROCKET_ARTILLERY');
            if (game.researchedTechs.includes('artillery_rocket') && game.researchedTechs.includes('sp_art_2')) items.push('SP_ROCKET_ARTILLERY');
        } else if (this.listTab === 'armor') {
            headerName = (REGIMENT_CATEGORIES.armor && REGIMENT_CATEGORIES.armor.name) || '装甲类';
            items = [...(REGIMENT_CATEGORIES.armor?.items || [])];
            if (game.researchedTechs.includes('armor_1')) items.push('TANK_MEDIUM');
            if (game.researchedTechs.includes('armor_2')) items.push('TANK_HEAVY');
            if (game.researchedTechs.includes('armor_3')) items.push('TANK_MBT');
            if (game.researchedTechs.includes('armor_4')) items.push('TANK_SUPER');
        } else if (this.listTab === 'support_company') {
            headerName = (REGIMENT_CATEGORIES.support_company && REGIMENT_CATEGORIES.support_company.name) || '支援连类';
            if (game.researchedTechs.includes('eng_company_1')) items.push('ENGINEER_COMPANY');
            if (game.researchedTechs.includes('eng_company_2')) items.push('ASSAULT_ENGINEER_COMPANY');
            if (game.researchedTechs.includes('eng_company_3')) items.push('ARMORED_ENGINEER_COMPANY');
            if (game.researchedTechs.includes('aux_hospital')) items.push('FIELD_HOSPITAL');
            if (game.researchedTechs.includes('aux_recon')) items.push('RECON_COMPANY');
            if (game.researchedTechs.includes('aux_maintenance')) items.push('MAINTENANCE_COMPANY');
            if (game.researchedTechs.includes('aux_logistics')) items.push('LOGISTICS_COMPANY');
        } else if (this.listTab === 'naval') {
            headerName = (REGIMENT_CATEGORIES.naval && REGIMENT_CATEGORIES.naval.name) || '海军类';
            items = [...(REGIMENT_CATEGORIES.naval?.items || [])];
            if (game.researchedTechs.includes('naval_destroyer')) items.push('DESTROYER');
            if (game.researchedTechs.includes('naval_aa_destroyer')) items.push('AA_DESTROYER');
            if (game.researchedTechs.includes('naval_missile_destroyer')) items.push('MISSILE_DESTROYER');
            if (game.researchedTechs.includes('naval_cruiser_1')) items.push('L_CRUISER');
            if (game.researchedTechs.includes('naval_cruiser_2')) items.push('H_CRUISER');
            if (game.researchedTechs.includes('naval_cruiser_3')) items.push('M_CRUISER');
            if (game.researchedTechs.includes('naval_capital_1')) items.push('BATTLESHIP');
            if (game.researchedTechs.includes('naval_capital_2')) items.push('LIGHT_CARRIER');
            if (game.researchedTechs.includes('naval_capital_3')) items.push('CARRIER');
        }
        if (headerName) {
            const header = document.createElement('div');
            header.className = "text-[11px] font-black text-white uppercase mb-2 mt-2";
            header.innerText = headerName;
            regCont.appendChild(header);
        }
        items.forEach((typeKey) => {
            const reg = REGIMENT_TYPES[typeKey];
            if (!reg) return;
            if (this.isAir && !reg.is_air) return;
            if (!this.isAir && reg.is_air) return;
            if (!this.isNaval && reg.is_naval) return;
            const btn = document.createElement('div');
            btn.className = "flex items-center justify-between glass-card p-3 cursor-pointer hover:bg-white/10 mb-2 transition";
            const iconHTML = Units.composeRegIcon(typeKey, "relative w-7 h-7 flex items-center justify-center", "text-xl", "text-[10px]");
            const itemCost = reg.cost && typeof reg.cost === 'object' ? reg.cost : { money: reg.cost_money || 0, industry: reg.cost_ind || 0 };
            btn.innerHTML = `<div class="flex items-center gap-3">${iconHTML}<div><div class="text-[10px] font-bold">${reg.name}</div></div></div><div class="text-[9px] text-yellow-500 font-mono">${this.formatCostSafe(itemCost)}</div>`;
            btn.onclick = () => this.add(game, typeKey);
            regCont.appendChild(btn);
        });
    },
    add(game, key) {
        if (!this.isNaval && REGIMENT_TYPES[key]?.is_naval) return;
        if (this.isNaval && !REGIMENT_TYPES[key]?.is_naval) return;
        const isSupportCompany = ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY','FIELD_HOSPITAL','RECON_COMPANY','MAINTENANCE_COMPANY','LOGISTICS_COMPANY'].includes(key);
        const isEngineer = ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY'].includes(key);
        const area = this.isAir ? 'main' : (isSupportCompany ? 'support' : 'main');
        if (area === 'support') {
            if (isEngineer) {
                const exist = (game.modalTemplate.support || []).some(k => ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY'].includes(k));
                if (exist) return;
            }
        }
        const arr = game.modalTemplate[area];
        if (area === 'main' && isSupportCompany) return;
        const dims = this.getOrgDims(game);
        const limit = area === 'support' ? arr.length : (this.isAir ? arr.length : dims.rows * dims.cols);
        const emptyIdx = arr.findIndex((v, i) => i < limit && v === null);
        if (emptyIdx !== -1) { arr[emptyIdx] = key; this.refresh(game); }
    },
    remove(game, area, idx) {
        const arr = game.modalTemplate[area];
        arr[idx] = null;
        this.refresh(game);
    },
    refresh(game) {
        const grid = document.getElementById('modal-grid');
        grid.innerHTML = '';
        this.renderTemplateControls(game);
        const wrap = document.createElement('div');
        wrap.className = "flex items-start gap-4 w-full max-w-lg";
        const supCol = this.isAir ? null : document.createElement('div');
        if (supCol) supCol.className = "grid grid-cols-1 gap-3";
        const sep = this.isAir ? null : document.createElement('div');
        if (sep) { sep.style.borderLeft = '1px dashed rgba(255,255,255,0.25)'; sep.style.height = '100%'; sep.style.margin = '0 6px'; }
        const mainGrid = document.createElement('div');
        const dims = this.getOrgDims(game);
        mainGrid.className = this.isAir ? "grid grid-cols-3 gap-3" : "grid grid-cols-5 gap-3";
        const unlockedRows = dims.rows;
        let soft = 0, hard = 0, br = 0, def = 0, hp = 0, costMoney = 0, costInd = 0;
        const costObj = {};
        let armorSum = 0, armorCount = 0, movesMin = null;
        let hasAA = false, hasAir = false, hasNaval = false, attackRangeMax = 0, teleportAirbase = false;
        let modBreakPct = 0, modHpMaxPct = 0, modArmorDelta = 0, modMoveCostFixed = null, modMovesPct = 0;
        let supSoftSum = 0, supHardSum = 0;
        if (!this.isAir) {
            game.modalTemplate.support.forEach((type, i) => {
                const slot = document.createElement('div');
                slot.className = `regiment-slot rounded-xl flex items中心 justify-center text-3xl cursor-pointer ${type ? 'filled' : ''}`;
                slot.style.width = '52px'; slot.style.height = '52px';
                if (type) {
                    const reg = REGIMENT_TYPES[type];
                    slot.innerHTML = Units.composeRegIcon(type, "relative w-full h-full flex items-center justify-center", "text-2xl", "text-[10px]");
                    soft += reg.soft; hard += reg.hard; br += reg.break; def += reg.def; hp += reg.hp;
                    if (reg.cost && typeof reg.cost === 'object') {
                        Object.entries(reg.cost).forEach(([k, v]) => { costObj[k] = (costObj[k] || 0) + (v || 0); });
                    } else {
                        costMoney += reg.cost_money; costInd += reg.cost_ind;
                        costObj.money = (costObj.money || 0) + (reg.cost_money || 0);
                        costObj.industry = (costObj.industry || 0) + (reg.cost_ind || 0);
                    }
                    armorSum += (typeof reg.armor === 'number') ? reg.armor : 0;
                    armorCount++;
                    if (typeof reg.moves === 'number') { movesMin = movesMin === null ? reg.moves : Math.min(movesMin, reg.moves); }
                    if ((REGIMENT_CLASSES && REGIMENT_CLASSES.anti_air || []).includes(type)) hasAA = true;
                    if (reg.is_air) { hasAir = true; teleportAirbase = teleportAirbase || !!reg.teleport_airbase; }
                    if (reg.is_naval) { hasNaval = true; }
                    if (typeof reg.attack_range === 'number') attackRangeMax = Math.max(attackRangeMax, reg.attack_range || 0);
                    const mod = reg.modifiers;
                    if (mod && typeof mod.breakPct === 'number') modBreakPct += mod.breakPct;
                    if (mod && typeof mod.hpMaxPct === 'number') modHpMaxPct += mod.hpMaxPct;
                    if (mod && typeof mod.armorDelta === 'number') modArmorDelta += mod.armorDelta;
                    if (mod && typeof mod.movesPct === 'number') modMovesPct += mod.movesPct;
                    if (mod && typeof mod.moveCostFixed === 'number') modMoveCostFixed = mod.moveCostFixed;
                    const isArt = (type === 'ARTILLERY') || (typeof type === 'string' && (type.includes('HOWITZER') || type.includes('ROCKET_ARTILLERY')));
                    const isAT = typeof type === 'string' && type.includes('AT_GUN');
                    const isAA = (REGIMENT_CLASSES && Array.isArray(REGIMENT_CLASSES.anti_air)) ? REGIMENT_CLASSES.anti_air.includes(type) : false;
                    if (isArt || isAT || isAA) { supSoftSum += (reg.soft || 0); supHardSum += (reg.hard || 0); }
                } else { slot.innerText = '+'; }
                slot.onclick = () => this.remove(game, 'support', i);
                if (supCol) supCol.appendChild(slot);
            });
        }
        game.modalTemplate.main.forEach((type, i) => {
            const slot = document.createElement('div');
            slot.className = `regiment-slot rounded-xl flex items-center justify-center text-3xl cursor-pointer ${type ? 'filled' : ''}`;
            slot.style.width = '64px'; slot.style.height = '56px';
            const row = Math.floor(i / (this.isAir ? 3 : 5));
            const col = i % (this.isAir ? 3 : 5);
            const locked = this.isAir ? (row >= unlockedRows) : (row >= unlockedRows || col >= dims.cols);
            if (!this.isAir && locked) {
                slot.className = "regiment-slot rounded-xl flex items-center justify-center text-3xl opacity-40";
                slot.innerText = '—';
                slot.onclick = () => {};
            } else if (type) {
                const reg = REGIMENT_TYPES[type];
                slot.innerHTML = Units.composeRegIcon(type, "relative w-full h-full flex items-center justify-center", "text-3xl", "text-[10px]");
                soft += reg.soft; hard += reg.hard; br += reg.break; def += reg.def; hp += reg.hp;
                if (reg.cost && typeof reg.cost === 'object') {
                    Object.entries(reg.cost).forEach(([k, v]) => { costObj[k] = (costObj[k] || 0) + (v || 0); });
                } else {
                    costMoney += reg.cost_money; costInd += reg.cost_ind;
                    costObj.money = (costObj.money || 0) + (reg.cost_money || 0);
                    costObj.industry = (costObj.industry || 0) + (reg.cost_ind || 0);
                }
                armorSum += (typeof reg.armor === 'number') ? reg.armor : 0;
                armorCount++;
                if (typeof reg.moves === 'number') { movesMin = movesMin === null ? reg.moves : Math.min(movesMin, reg.moves); }
                if ((REGIMENT_CLASSES && REGIMENT_CLASSES.anti_air || []).includes(type)) hasAA = true;
                if (reg.is_air) { hasAir = true; teleportAirbase = teleportAirbase || !!reg.teleport_airbase; }
                if (reg.is_naval) { hasNaval = true; }
                if (typeof reg.attack_range === 'number') { attackRangeMax = Math.max(attackRangeMax, reg.attack_range || 0); }
                const isArt = (type === 'ARTILLERY') || (typeof type === 'string' && (type.includes('HOWITZER') || type.includes('ROCKET_ARTILLERY')));
                const isAT = typeof type === 'string' && type.includes('AT_GUN');
                const isAA = (REGIMENT_CLASSES && Array.isArray(REGIMENT_CLASSES.anti_air)) ? REGIMENT_CLASSES.anti_air.includes(type) : false;
                if (isArt || isAT || isAA) { supSoftSum += (reg.soft || 0); supHardSum += (reg.hard || 0); }
                slot.onclick = () => this.remove(game, 'main', i);
            } else { slot.innerText = '+'; slot.onclick = () => this.remove(game, 'main', i); }
            mainGrid.appendChild(slot);
        });
        if (supCol && sep) { wrap.appendChild(supCol); wrap.appendChild(sep); }
        wrap.appendChild(mainGrid); grid.appendChild(wrap);
        let armorAvg = armorCount > 0 ? +(armorSum / armorCount).toFixed(2) : 0;
        if (modArmorDelta) armorAvg = +(armorAvg * (1 + modArmorDelta)).toFixed(2);
        let movesDisplay = movesMin === null ? 0 : movesMin;
        if (modMovesPct) {
            const md = Math.round(movesDisplay * (1 + modMovesPct));
            movesDisplay = Math.max(0, md);
        }
        if (typeof modMoveCostFixed === 'number') {
            // Display remains AP value; move cost fixed is applied during movement
        }
        if (modBreakPct) br = Math.round(br * (1 + modBreakPct));
        if (modHpMaxPct) {
            const hpAdj = Math.round(hp * (1 + modHpMaxPct));
            hp = Math.max(1, hpAdj);
        }
        let navalRole = null;
        const allKeysForRole = [].concat((game.modalTemplate.support || []).filter(k => k), (game.modalTemplate.main || []).filter(k => k));
        allKeysForRole.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            const role = reg?.naval_role || null;
            if (!role) return;
            if (role === 'carrier') navalRole = 'carrier';
            else if (role === 'submarine' && navalRole !== 'carrier') navalRole = 'submarine';
            else if (!navalRole && (role === 'capital' || role === 'destroyer' || role === 'cruiser' || role === 'frigate')) navalRole = role;
        });
        let planeCapacity = 0;
        const allKeysForCapacity = [].concat((game.modalTemplate.support || []).filter(k => k), (game.modalTemplate.main || []).filter(k => k));
        allKeysForCapacity.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            const cap = Math.max(0, Math.floor(reg?.plane_capacity || 0));
            planeCapacity += cap;
        });
        game.lastStats = { soft, hard, break: br, def, hp, moves: movesDisplay, armor: armorAvg, money: costMoney, industry: costInd, aa: hasAA, isAir: hasAir, isNaval: hasNaval, navalRole, attackRange: attackRangeMax, teleportAirbase, planeCapacity, comp: { support: (game.modalTemplate.support || []).filter(t => t), main: game.modalTemplate.main.filter(t => t) } };
        let fuelReqPerAP = 0;
        const allKeys = [].concat((game.modalTemplate.support || []).filter(k => k), (game.modalTemplate.main || []).filter(k => k));
        allKeys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            if (reg && typeof reg.fuel_req === 'number') fuelReqPerAP += Math.max(0, reg.fuel_req || 0);
        });
        const curSupSoft = Math.round(supSoftSum);
        const curSupHard = Math.round(supHardSum);
        const maxSupSoft = Math.round(supSoftSum);
        const maxSupHard = Math.round(supHardSum);
        document.getElementById('m-soft').innerText = `${curSupSoft}/${Math.round(soft)} (${maxSupSoft}/${Math.round(soft)})`;
        document.getElementById('m-hard').innerText = `${curSupHard}/${Math.round(hard)} (${maxSupHard}/${Math.round(hard)})`;
        document.getElementById('m-hp').innerText = hp;
        document.getElementById('m-break').innerText = br;
        document.getElementById('m-def').innerText = def;
        document.getElementById('m-moves').innerText = movesDisplay;
        document.getElementById('m-armor').innerText = `${Math.round(armorAvg * 100)}%`;
        const fuelEl = document.getElementById('m-fuel-req');
        if (fuelEl) fuelEl.innerText = fuelReqPerAP > 0 ? `${fuelReqPerAP}` : `0`;
        const fullCost = {};
        if (costMoney || costInd) { fullCost.money = costMoney; fullCost.industry = costInd; }
        const costData = Object.keys(costObj).length ? costObj : fullCost;
        const parts = [];
        const iconMoney = (typeof YIELD_ICONS === 'object' && YIELD_ICONS.money) ? YIELD_ICONS.money : '💰';
        const iconIndustry = (typeof YIELD_ICONS === 'object' && YIELD_ICONS.industry) ? YIELD_ICONS.industry : '🔨';
        const iconPop = (typeof YIELD_ICONS === 'object' && YIELD_ICONS.pop) ? YIELD_ICONS.pop : '👥';
        const m = Math.max(0, Math.floor(costData.money || 0));
        const i = Math.max(0, Math.floor(costData.industry || 0));
        const p = Math.max(0, Math.floor(costData.pop || 0));
        if (m > 0) parts.push(`${iconMoney} ${m}`);
        if (i > 0) parts.push(`${iconIndustry} ${i}`);
        if (p > 0) parts.push(`${iconPop} ${p}`);
        const combined = parts.length ? `${parts.join(' / ')}` : `无`;
        const combinedEl = document.getElementById('m-cost-combined');
        if (combinedEl) combinedEl.innerText = combined;
        const maintTotal = (() => {
            const keys = [].concat((game.modalTemplate.support || []).filter(k => k), (game.modalTemplate.main || []).filter(k => k));
            let sum = 0;
            keys.forEach(k => {
                const reg = REGIMENT_TYPES[k];
                const c = reg && typeof reg.maint_cost === 'number' ? reg.maint_cost : 1;
                sum += Math.max(0, c || 0);
            });
            return Math.ceil(sum);
        })();
        const maintRowId = 'm-maint-row';
        const maintValId = 'm-maint';
        let maintValEl = document.getElementById(maintValId);
        if (!maintValEl) {
            const row = document.createElement('div');
            row.id = maintRowId;
            row.className = "flex justify-between";
            const lab = document.createElement('span');
            lab.innerText = "维护成本/回合";
            maintValEl = document.createElement('span');
            maintValEl.id = maintValId;
            maintValEl.className = "font-mono";
            maintValEl.innerText = String(maintTotal);
            row.appendChild(lab); row.appendChild(maintValEl);
            const card = combinedEl ? combinedEl.parentElement?.parentElement : null;
            if (card) card.appendChild(row);
        } else {
            maintValEl.innerText = String(maintTotal);
        }
        const btn = document.getElementById('m-confirm-recruit');
        game.lastCost = costObj;
        if (this.isCarrierAir) {
            const carrier = (game.units || []).find(u => u.id === this.carrierUnitId);
            const hasExisting = !!carrier?.airUnitId || ((carrier?.airComp || []).filter(k => k).length > 0);
            btn.disabled = hp <= 0 || !Economy.canAfford(game, costObj, {}) || hasExisting;
        } else {
            const occ = Units.findAt(game, game.selectedTile.q, game.selectedTile.r);
            const tile = game.selectedTile;
            const districtKey = tile && typeof tile.districtKey === 'string' ? tile.districtKey : '';
            const popCost = Math.max(0, Math.floor((costObj.pop || 0)));
            const isConscript = !!tile && (tile.building === 'barracks' || tile.building === 'airbase' || tile.building === 'naval_base');
            let conscriptionOk = true;
            if (isConscript && popCost > 0) {
                const limit = (typeof game.getConscriptionLimit === 'function') ? game.getConscriptionLimit(districtKey) : Math.floor(Math.max(0, Math.floor(game.res.pop || 0)) * 0.05);
                conscriptionOk = popCost <= limit;
            }
            btn.disabled = hp <= 0 || !Economy.canAfford(game, costObj, { districtKey }) || !!occ || !conscriptionOk;
        }
    },
    confirm(game) {
        const s = game.lastStats;
        const costObj = game.lastCost || { money: s.money, industry: s.industry };
        if (this.isCarrierAir) {
            const carrier = (game.units || []).find(u => u.id === this.carrierUnitId);
            if (!carrier) return;
            const hasExisting = !!carrier.airUnitId || ((carrier.airComp || []).filter(k => k).length > 0);
            if (hasExisting) return;
            const ok = Economy.applyCost(game, costObj, { ownerKey: game.currentOwnerKey });
            if (!ok) return;
            const keys = Array.isArray(game.modalTemplate.main) ? game.modalTemplate.main.filter(k => k) : [];
            const cap = Math.max(1, Math.floor(this.capacityLimit || 1));
            carrier.airComp = keys.slice(0, cap);
            game.updateResourceUI();
            this.close(game);
            UIPanels.showUnit(game, carrier);
        } else {
            const occ = Units.findAt(game, game.selectedTile.q, game.selectedTile.r);
            if (occ) return;
            const tile = game.selectedTile;
            const districtKey = tile && typeof tile.districtKey === 'string' ? tile.districtKey : '';
            const popCost = Math.max(0, Math.floor((costObj.pop || 0)));
            const isConscript = !!tile && (tile.building === 'barracks' || tile.building === 'airbase' || tile.building === 'naval_base');
            if (isConscript && popCost > 0) {
                const limit = (typeof game.getConscriptionLimit === 'function') ? game.getConscriptionLimit(districtKey) : Math.floor(Math.max(0, Math.floor(game.res.pop || 0)) * 0.05);
                if (popCost > limit) return;
            }
            const ok = Economy.applyCost(game, costObj, { districtKey, ownerKey: game.currentOwnerKey });
            if (!ok) return;
            Units.createDivision(game, s, game.selectedTile.q, game.selectedTile.r, game.currentOwnerKey);
            game.updateResourceUI(); this.close(game);
        }
    }
};
