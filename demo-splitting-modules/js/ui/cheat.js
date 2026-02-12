const Cheater = {
    activeTab: 'resources',
    open(game) {
        document.getElementById('cheat-modal').classList.remove('hidden');
        this.activeTab = 'resources';
        this.defaultCoords = game.selectedTile ? { q: game.selectedTile.q, r: game.selectedTile.r } : null;
        this.render(game);
        const btn = document.getElementById('cheat-confirm');
        if (btn) btn.onclick = () => this.apply(game);
    },
    close() { document.getElementById('cheat-modal').classList.add('hidden'); },
    render(game) {
        const cont = document.getElementById('cheat-form');
        if (!cont) return;
        cont.innerHTML = '';
        const head = document.createElement('div');
        head.className = "mb-3 flex items-center justify-between";
        const perspectiveWrap = document.createElement('div');
        perspectiveWrap.className = "flex items-center gap-2";
        const lab = document.createElement('span');
        lab.className = "text-[11px] text-gray-300";
        lab.innerText = "视角";
        const dd = document.createElement('select');
        dd.className = "bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white";
        const owners = Object.keys(game.ownerStates || {});
        owners.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o;
            opt.innerText = o;
            dd.appendChild(opt);
        });
        dd.value = game.currentOwnerKey;
        dd.onchange = () => {
            const prev = game.currentOwnerKey;
            if (!game.techByOwner) game.techByOwner = {};
            if (!game.techByOwner[prev]) game.techByOwner[prev] = { researchedTechs: [], researchProgress: {}, activeTechId: null };
            game.techByOwner[prev].activeTechId = game.activeTechId;
            const owner = dd.value;
            game.currentOwnerKey = owner;
            if (!game.techByOwner[owner]) game.techByOwner[owner] = { researchedTechs: [], researchProgress: {}, activeTechId: null };
            game.researchedTechs = game.techByOwner[owner].researchedTechs;
            game.researchProgress = game.techByOwner[owner].researchProgress;
            game.activeTechId = game.techByOwner[owner].activeTechId || null;
            if (!game.buildQueueByOwner) game.buildQueueByOwner = {};
            if (!game.privateBuildQueueByOwner) game.privateBuildQueueByOwner = {};
            if (!game.buildQueueByOwner[owner]) game.buildQueueByOwner[owner] = [];
            if (!game.privateBuildQueueByOwner[owner]) game.privateBuildQueueByOwner[owner] = [];
            game.buildQueue = game.buildQueueByOwner[owner];
            game.privateBuildQueue = game.privateBuildQueueByOwner[owner];
            if (typeof game.ensureOwnerCitiesInitialized === 'function') game.ensureOwnerCitiesInitialized(owner);
            game.updateDeltas();
            this.render(game);
        };
        perspectiveWrap.appendChild(lab);
        perspectiveWrap.appendChild(dd);
        head.appendChild(perspectiveWrap);
        cont.appendChild(head);
        const tabs = document.createElement('div');
        tabs.className = "flex gap-2 mb-3";
        const formatCostSafe = (cost) => {
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
        };
        const mkTab = (key, label) => {
            const b = document.createElement('button');
            const active = this.activeTab === key;
            b.className = `px-3 py-1 rounded text-xs font-bold ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`;
            b.innerText = label;
            b.onclick = () => { this.activeTab = key; this.render(game); };
            return b;
        };
        tabs.appendChild(mkTab('resources','资源'));
        tabs.appendChild(mkTab('enemy','敌军'));
        tabs.appendChild(mkTab('tech','科技'));
        cont.appendChild(tabs);
        if (this.activeTab === 'resources') {
            const normalKeys = ['money','industry','pop','science','civilization'];
            normalKeys.forEach(k => {
                const row = document.createElement('div');
                row.className = "flex items-center justify-between gap-3";
                row.innerHTML = `<div class="text-[11px] font-bold text-gray-300 uppercase">${k}</div>
                    <input id="cheat-${k}-input" type="number" class="w-36 bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-white" value="${game.res[k]}">`;
                cont.appendChild(row);
            });
            const instantRow = document.createElement('div');
            instantRow.className = "flex items-center justify-between gap-3";
            const instantLabel = document.createElement('div');
            instantLabel.className = "text-[11px] font-bold text-gray-300 uppercase";
            instantLabel.innerText = "立刻建造";
            const instantWrap = document.createElement('div');
            instantWrap.className = "flex items-center gap-2";
            const instantChk = document.createElement('input');
            instantChk.type = "checkbox";
            instantChk.id = "cheat-instant-build";
            instantChk.className = "w-4 h-4 accent-blue-500";
            instantChk.checked = !!game.cheatInstantBuild;
            instantWrap.appendChild(instantChk);
            instantRow.appendChild(instantLabel);
            instantRow.appendChild(instantWrap);
            cont.appendChild(instantRow);
            const market = game.market || { supply:{}, demand:{} };
            const mk = ['food','metal','precious','consumer','energy'];
            mk.forEach(k => {
                const sup = Math.floor(((game.marketAdjust || {}).supply || {})[k] || 0);
                const dem = Math.floor(((game.marketAdjust || {}).demand || {})[k] || 0);
                const row = document.createElement('div');
                row.className = "flex items-center justify-between gap-3";
                const left = document.createElement('div');
                left.className = "text-[11px] font-bold text-gray-300 uppercase";
                left.innerText = k;
                const right = document.createElement('div');
                right.className = "flex items-center gap-2";
                const supInput = document.createElement('input');
                supInput.id = `cheat-${k}-supply`;
                supInput.type = "number";
                supInput.className = "w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-white";
                supInput.value = String(sup);
                const demInput = document.createElement('input');
                demInput.id = `cheat-${k}-demand`;
                demInput.type = "number";
                demInput.className = "w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-white";
                demInput.value = String(dem);
                const lab1 = document.createElement('span');
                lab1.className = "text-[10px] text-gray-400";
                lab1.innerText = "供给";
                const lab2 = document.createElement('span');
                lab2.className = "text-[10px] text-gray-400";
                lab2.innerText = "需求";
                right.appendChild(lab1); right.appendChild(supInput); right.appendChild(lab2); right.appendChild(demInput);
                row.appendChild(left); row.appendChild(right);
                cont.appendChild(row);
            });
        }
        if (this.activeTab === 'enemy') {
            const title = document.createElement('div');
            title.className = "text-[11px] font-black text-white uppercase mb-2";
            title.innerText = "编制并部署敌军单位";
            cont.appendChild(title);
            if (!this.enemyTemplate) this.enemyTemplate = { support: Array(5).fill(null), main: Array(25).fill(null) };
            if (!this.enemyTarget) this.enemyTarget = 'main';
            const toggle = document.createElement('div');
            toggle.className = "mb-3 flex gap-2";
            const bMain = document.createElement('button');
            const bSup = document.createElement('button');
            bMain.className = `px-3 py-1 rounded text-xs font-bold ${this.enemyTarget === 'main' ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`;
            bSup.className = `px-3 py-1 rounded text-xs font-bold ${this.enemyTarget === 'support' ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`;
            bMain.innerText = "添加到主力";
            bSup.innerText = "添加到支援";
            bMain.onclick = () => { this.enemyTarget = 'main'; this.render(game); };
            bSup.onclick = () => { this.enemyTarget = 'support'; this.render(game); };
            toggle.appendChild(bMain); toggle.appendChild(bSup);
            cont.appendChild(toggle);
            const wrap = document.createElement('div');
            wrap.className = "flex items-start gap-3 mb-3";
            const supCol = document.createElement('div');
            supCol.className = "grid grid-cols-1 gap-2";
            const mainGrid = document.createElement('div');
            mainGrid.className = "grid grid-cols-5 gap-2";
            this.enemyTemplate.support.forEach((type, i) => {
                const slot = document.createElement('div');
                slot.className = `regiment-slot rounded-xl flex items-center justify-center text-2xl cursor-pointer ${type ? 'filled' : ''}`;
                slot.style.minHeight = '42px';
                if (type) { slot.innerHTML = Units.composeRegIcon(type, "relative w-full h-full flex items-center justify-center", "text-xl", "text-[10px]"); } else { slot.innerText = '+'; }
                slot.onclick = () => { this.removeEnemyReg('support', i); this.render(game); };
                supCol.appendChild(slot);
            });
            this.enemyTemplate.main.forEach((type, i) => {
                const slot = document.createElement('div');
                slot.className = `regiment-slot rounded-xl flex items-center justify-center text-2xl cursor-pointer ${type ? 'filled' : ''}`;
                slot.style.minHeight = '42px';
                if (type) { slot.innerHTML = Units.composeRegIcon(type, "relative w-full h-full flex items-center justify-center", "text-3xl", "text-[10px]"); } else { slot.innerText = '+'; }
                slot.onclick = () => { this.removeEnemyReg('main', i); this.render(game); };
                mainGrid.appendChild(slot);
            });
            wrap.appendChild(supCol); wrap.appendChild(mainGrid);
            cont.appendChild(wrap);
            const pickRow = document.createElement('div');
            pickRow.className = "flex items-center justify-between gap-3";
            const ddWrap = document.createElement('div');
            ddWrap.className = "relative flex-1";
            const ddBtn = document.createElement('button');
            ddBtn.className = "w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-white flex justify-between items-center";
            ddBtn.innerHTML = `<span>${this.enemySelectedType ? `${REGIMENT_TYPES[this.enemySelectedType].name} (${this.enemySelectedType})` : '请选择编制'}</span><span>▾</span>`;
            const ddList = document.createElement('div');
            ddList.className = "absolute left-0 right-0 mt-1 bg-black/90 border border-white/10 rounded max-h-48 overflow-auto z-50";
            ddList.style.display = "none";
            const groups = { infantry: [], armor: [], support: [], support_company: [], air: [] };
            Object.keys(REGIMENT_TYPES).forEach(k => {
                if (k === 'ARTILLERY' || k.includes('HOWITZER') || k.includes('AT_GUN') || k.includes('AA_GUN') || k.includes('ROCKET_ARTILLERY')) groups.support.push(k);
                else if (k.includes('ENGINEER') || ['FIELD_HOSPITAL','RECON_COMPANY','MAINTENANCE_COMPANY','LOGISTICS_COMPANY'].includes(k)) groups.support_company.push(k);
                else if (k === 'TANK_LIGHT' || k.startsWith('TANK_')) groups.armor.push(k);
                else if (REGIMENT_TYPES[k]?.is_air) groups.air.push(k);
                else groups.infantry.push(k);
            });
            const nameMap = {
                infantry: (REGIMENT_CATEGORIES && REGIMENT_CATEGORIES.infantry && REGIMENT_CATEGORIES.infantry.name) || '步兵类',
                armor: (REGIMENT_CATEGORIES && REGIMENT_CATEGORIES.armor && REGIMENT_CATEGORIES.armor.name) || '装甲类',
                support: (REGIMENT_CATEGORIES && REGIMENT_CATEGORIES.support && REGIMENT_CATEGORIES.support.name) || '支援类',
                support_company: (REGIMENT_CATEGORIES && REGIMENT_CATEGORIES.support_company && REGIMENT_CATEGORIES.support_company.name) || '支援连类',
                air: (REGIMENT_CATEGORIES && REGIMENT_CATEGORIES.air && REGIMENT_CATEGORIES.air.name) || '空军类'
            };
            ['infantry','armor','support','support_company','air'].forEach(cat => {
                const head = document.createElement('div');
                head.className = "px-3 py-2 text-[10px] text-gray-400";
                head.innerText = nameMap[cat];
                ddList.appendChild(head);
                groups[cat].forEach(k => {
                    const item = document.createElement('button');
                    item.className = "w-full text-left px-3 py-2 text-[11px] text-white hover:bg-white/10";
                    item.innerText = `${REGIMENT_TYPES[k].name} (${k})`;
                    item.onclick = () => { this.enemySelectedType = k; ddList.style.display = "none"; this.render(game); };
                    ddList.appendChild(item);
                });
            });
            ddBtn.onclick = () => { ddList.style.display = ddList.style.display === "none" ? "block" : "none"; };
            ddWrap.appendChild(ddBtn);
            ddWrap.appendChild(ddList);
            const addBtn = document.createElement('button');
            addBtn.className = "px-3 py-2 rounded text-xs font-bold bg-white/5 hover:bg-white/10";
            addBtn.innerText = "添加到当前区域";
            addBtn.onclick = () => { if (this.enemySelectedType) { this.addEnemyReg(this.enemySelectedType, game); this.render(game); } };
            pickRow.appendChild(ddWrap);
            pickRow.appendChild(addBtn);
            cont.appendChild(pickRow);
            const stats = this.computeEnemyStats();
            const statsBox = document.createElement('div');
            statsBox.className = "glass-card p-3 text-[10px] grid grid-cols-2 gap-2";
            const costLabel = formatCostSafe(stats.cost || { money: stats.money, industry: stats.industry });
            statsBox.innerHTML = `
                <div>软攻: <span>${stats.soft}</span></div>
                <div>硬攻: <span>${stats.hard}</span></div>
                <div>HP: <span>${stats.hp}</span></div>
                <div>突破: <span>${stats.break}</span></div>
                <div>抵抗: <span>${stats.def}</span></div>
                <div>AP: <span>${stats.moves}</span></div>
                <div>装甲: <span>${Math.round((stats.armor || 0) * 100)}%</span></div>
                <div>防空: <span>${stats.aa ? '是' : '否'}</span></div>
                <div>成本: <span class="text-yellow-500">${costLabel}</span></div>
            `;
            cont.appendChild(statsBox);
            const coordRow = document.createElement('div');
            coordRow.className = "flex items-center justify-between gap-3";
            coordRow.innerHTML = `<div class="text-[11px] font-bold text-gray-300 uppercase">位置</div>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] text-gray-400">选中: <span id="cheat-picked-coords">未选择</span></span>
                    <button class="px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10" id="cheat-pick-map">地图点选</button>
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-[11px] text-gray-300">Q</label>
                    <input id="cheat-enemy-q" type="number" class="w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-white" value="0">
                    <label class="text-[11px] text-gray-300">R</label>
                    <input id="cheat-enemy-r" type="number" class="w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-white" value="0">
                </div>`;
            cont.appendChild(coordRow);
            const qEl = document.getElementById('cheat-enemy-q');
            const rEl = document.getElementById('cheat-enemy-r');
            const picked = document.getElementById('cheat-picked-coords');
            if (this.defaultCoords && qEl && rEl) {
                qEl.value = String(this.defaultCoords.q);
                rEl.value = String(this.defaultCoords.r);
                if (picked) picked.innerText = `[${this.defaultCoords.q}, ${this.defaultCoords.r}]`;
            }
            const deployBtn = document.createElement('button');
            deployBtn.className = "mt-2 w-full bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-bold transition";
            deployBtn.innerText = "部署敌军单位";
            deployBtn.onclick = () => this.addEnemyCompiled(game);
            cont.appendChild(deployBtn);
            const pickBtn = document.getElementById('cheat-pick-map');
            if (pickBtn) pickBtn.onclick = () => { game.cheatPlace = { active: true, type: 'enemy' }; };
            const enemyBuildRow = document.createElement('div');
            enemyBuildRow.className = "mt-3 flex items-center justify-between gap-3";
            const enemyBuildLabel = document.createElement('div');
            enemyBuildLabel.className = "text-[11px] font-bold text-gray-300 uppercase";
            enemyBuildLabel.innerText = "敌方设施";
            const enemyBuildWrap = document.createElement('div');
            enemyBuildWrap.className = "flex items-center gap-2";
            const buildBtn = document.createElement('button');
            buildBtn.className = "px-3 py-2 rounded text-xs font-bold bg-white/5 hover:bg-white/10";
            buildBtn.innerText = "在坐标建设空军基地";
            buildBtn.onclick = () => this.buildEnemyAirbase(game);
            enemyBuildWrap.appendChild(buildBtn);
            enemyBuildRow.appendChild(enemyBuildLabel);
            enemyBuildRow.appendChild(enemyBuildWrap);
            cont.appendChild(enemyBuildRow);
        }
        if (this.activeTab === 'tech') {
            const techTitle = document.createElement('div');
            techTitle.className = "text-[11px] font-black text-white uppercase mb-2";
            techTitle.innerText = "科技解锁";
            cont.appendChild(techTitle);
            const techRow = document.createElement('div');
            techRow.className = "flex items-center justify-between gap-3";
            const techWrap = document.createElement('div');
            techWrap.className = "relative flex-1";
            const techBtn = document.createElement('button');
            techBtn.className = "w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-white flex justify-between items-center";
            const currentTechLabel = this.selectedTechId ? (() => {
                let label = this.selectedTechId;
                Object.entries(TECH_TREE).forEach(([catKey, category]) => {
                    category.steps.forEach(step => { if (step.id === this.selectedTechId) label = `${category.name} · ${step.name} (${step.id})`; });
                });
                return label;
            })() : '请选择科技';
            techBtn.innerHTML = `<span>${currentTechLabel}</span><span>▾</span>`;
            const techList = document.createElement('div');
            techList.className = "absolute left-0 right-0 mt-1 bg-black/90 border border-white/10 rounded max-h-48 overflow-auto z-50";
            techList.style.display = "none";
            Object.entries(TECH_TREE).forEach(([catKey, category]) => {
                const head = document.createElement('div');
                head.className = "px-3 py-2 text-[10px] text-gray-400";
                head.innerText = category.name;
                techList.appendChild(head);
                category.steps.forEach(step => {
                    const item = document.createElement('button');
                    item.className = "w-full text-left px-3 py-2 text-[11px] text-white hover:bg-white/10";
                    item.innerText = `${category.name} · ${step.name} (${step.id})`;
                    item.onclick = () => { this.selectedTechId = step.id; techList.style.display = "none"; this.render(game); };
                    techList.appendChild(item);
                });
            });
            techBtn.onclick = () => { techList.style.display = techList.style.display === "none" ? "block" : "none"; };
            techWrap.appendChild(techBtn);
            techWrap.appendChild(techList);
            const techLabel = document.createElement('div');
            techLabel.className = "text-[11px] font-bold text-gray-300 uppercase";
            techLabel.innerText = "科技";
            techRow.appendChild(techLabel);
            techRow.appendChild(techWrap);
            cont.appendChild(techRow);
            const unlockBtn2 = document.createElement('button');
            unlockBtn2.id = "cheat-unlock-tech";
            unlockBtn2.className = "mt-2 w-full bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-xs font-bold transition";
            unlockBtn2.innerText = "解锁所选科技";
            unlockBtn2.onclick = () => this.unlockTech(game);
            cont.appendChild(unlockBtn2);
            const unlockAllBtn2 = document.createElement('button');
            unlockAllBtn2.id = "cheat-unlock-all";
            unlockAllBtn2.className = "mt-2 w-full bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded text-xs font-bold transition";
            unlockAllBtn2.innerText = "解锁全部科技";
            unlockAllBtn2.onclick = () => this.unlockAll(game);
            cont.appendChild(unlockAllBtn2);
        }
    },
    apply(game) {
        const normalKeys = ['money','industry','pop','science','civilization'];
        normalKeys.forEach(k => {
            const el = document.getElementById(`cheat-${k}-input`);
            if (!el) return;
            const v = parseFloat(el.value);
            if (!Number.isNaN(v)) game.res[k] = v;
        });
        const instantEl = document.getElementById('cheat-instant-build');
        if (instantEl) game.cheatInstantBuild = !!instantEl.checked;
        if (!game.marketAdjust) game.marketAdjust = { supply: { food:0, metal:0, precious:0, consumer:0, energy:0 }, demand: { food:0, metal:0, precious:0, consumer:0, energy:0 } };
        ['food','metal','precious','consumer','energy'].forEach(k => {
            const sEl = document.getElementById(`cheat-${k}-supply`);
            const dEl = document.getElementById(`cheat-${k}-demand`);
            const sv = parseFloat(sEl?.value || '0');
            const dv = parseFloat(dEl?.value || '0');
            game.marketAdjust.supply[k] = Number.isNaN(sv) ? 0 : sv;
            game.marketAdjust.demand[k] = Number.isNaN(dv) ? 0 : dv;
        });
        game.updateDeltas();
        this.close();
    },
    unlockTech(game) {
        const id = this.selectedTechId || document.getElementById('cheat-tech-id')?.value;
        if (!id) return;
        if (!game.researchedTechs.includes(id)) game.researchedTechs.push(id);
        if (game.researchProgress[id]) delete game.researchProgress[id];
        if (game.activeTechId === id) game.activeTechId = null;
        game.updateDeltas();
        game.renderTechTree();
        DeploymentUI.renderList(game);
    },
    unlockAll(game) {
        Object.values(TECH_TREE).forEach(category => {
            category.steps.forEach(s => {
                if (!game.researchedTechs.includes(s.id)) game.researchedTechs.push(s.id);
                if (game.researchProgress[s.id]) delete game.researchProgress[s.id];
            });
        });
        game.activeTechId = null;
        game.updateDeltas();
        game.renderTechTree();
        DeploymentUI.renderList(game);
    },
    addEnemyReg(key, game) {
        if (!this.enemyTemplate) this.enemyTemplate = { support: Array(5).fill(null), main: Array(25).fill(null) };
        const area = this.enemyTarget || 'main';
        const isSupportCompany = ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY','FIELD_HOSPITAL','RECON_COMPANY','MAINTENANCE_COMPANY','LOGISTICS_COMPANY'].includes(key);
        const isEngineer = ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY'].includes(key);
        if (area === 'main' && isSupportCompany) return;
        const arr = this.enemyTemplate[area];
        const limit = area === 'main' ? 25 : arr.length;
        if (area === 'support' && isEngineer) {
            const exist = (this.enemyTemplate.support || []).some(k => ['ENGINEER_COMPANY','ASSAULT_ENGINEER_COMPANY','ARMORED_ENGINEER_COMPANY'].includes(k));
            if (exist) return;
        }
        const idx = arr.findIndex((v, i) => i < limit && v === null);
        if (idx !== -1) arr[idx] = key;
    },
    removeEnemyReg(area, idx) {
        if (!this.enemyTemplate) this.enemyTemplate = { support: Array(5).fill(null), main: Array(25).fill(null) };
        this.enemyTemplate[area][idx] = null;
    },
    computeEnemyStats() {
        let soft = 0, hard = 0, br = 0, def = 0, hp = 0, costMoney = 0, costInd = 0;
        const costObj = {};
        let armorSum = 0, armorCount = 0, movesMin = null;
        let hasAA = false;
        let hasAir = false, attackRangeMax = 0, teleportAirbase = false;
        let modBreakPct = 0, modHpMaxPct = 0, modArmorDelta = 0, modMoveCostFixed = null;
        ['support','main'].forEach(area => {
            (this.enemyTemplate[area] || []).forEach(type => {
                if (!type) return;
                const reg = REGIMENT_TYPES[type];
                if (!reg) return;
                soft += reg.soft || 0; hard += reg.hard || 0; br += reg.break || 0; def += reg.def || 0; hp += reg.hp || 0;
                if (reg.cost && typeof reg.cost === 'object') {
                    Object.entries(reg.cost).forEach(([k, v]) => { costObj[k] = (costObj[k] || 0) + (v || 0); });
                } else {
                    costMoney += reg.cost_money || 0; costInd += reg.cost_ind || 0;
                    costObj.money = (costObj.money || 0) + (reg.cost_money || 0);
                    costObj.industry = (costObj.industry || 0) + (reg.cost_ind || 0);
                }
                armorSum += (typeof reg.armor === 'number') ? reg.armor : 0;
                armorCount++;
                if (typeof reg.moves === 'number') { movesMin = movesMin === null ? reg.moves : Math.min(movesMin, reg.moves); }
                if ((REGIMENT_CLASSES && REGIMENT_CLASSES.anti_air || []).includes(type)) hasAA = true;
                if (reg.is_air) { hasAir = true; attackRangeMax = Math.max(attackRangeMax, reg.attack_range || 0); teleportAirbase = teleportAirbase || !!reg.teleport_airbase; }
                const mod = reg.modifiers;
                if (mod && typeof mod.breakPct === 'number') modBreakPct += mod.breakPct;
                if (mod && typeof mod.hpMaxPct === 'number') modHpMaxPct += mod.hpMaxPct;
                if (mod && typeof mod.armorDelta === 'number') modArmorDelta += mod.armorDelta;
                if (mod && typeof mod.moveCostFixed === 'number') modMoveCostFixed = mod.moveCostFixed;
            });
        });
        let armorAvg = armorCount > 0 ? +(armorSum / armorCount).toFixed(2) : 0;
        if (modArmorDelta) armorAvg = +(armorAvg * (1 + modArmorDelta)).toFixed(2);
        const movesDisplay = movesMin === null ? 0 : movesMin;
        if (modBreakPct) br = Math.round(br * (1 + modBreakPct));
        if (modHpMaxPct) {
            const hpAdj = Math.round(hp * (1 + modHpMaxPct));
            hp = Math.max(1, hpAdj);
        }
        this.lastEnemyStats = { soft, hard, break: br, def, hp, moves: movesDisplay, armor: armorAvg, money: costMoney, industry: costInd, cost: costObj, aa: hasAA, isAir: hasAir, attackRange: attackRangeMax, teleportAirbase, comp: { support: (this.enemyTemplate.support || []).filter(t => t), main: (this.enemyTemplate.main || []).filter(t => t) } };
        return this.lastEnemyStats;
    },
    addEnemyCompiled(game) {
        const s = this.computeEnemyStats();
        const qVal = parseInt(document.getElementById('cheat-enemy-q')?.value || '0', 10);
        const rVal = parseInt(document.getElementById('cheat-enemy-r')?.value || '0', 10);
        const tile = game.grid.find(t => t.q === qVal && t.r === rVal);
        if (!tile) return;
        const occupied = Units.findAt(game, qVal, rVal);
        if (occupied) return;
        Units.createDivision(game, s, qVal, rVal, 'Enemy', '敌军编制');
    },
    addEnemy(game) {
        const typeKey = document.getElementById('cheat-enemy-type')?.value;
        const qVal = parseInt(document.getElementById('cheat-enemy-q')?.value || '0', 10);
        const rVal = parseInt(document.getElementById('cheat-enemy-r')?.value || '0', 10);
        const reg = REGIMENT_TYPES[typeKey];
        if (!reg) return;
        const tile = game.grid.find(t => t.q === qVal && t.r === rVal);
        if (!tile) return;
        const occupied = Units.findAt(game, qVal, rVal);
        if (occupied) return;
        Units.createDivision(game, {
            soft: reg.soft || 0,
            hard: reg.hard || 0,
            break: reg.break || 0,
            def: reg.def || 0,
            armor: reg.armor || 0,
            hp: reg.hp,
            moves: reg.moves || 0,
            isAir: !!reg.is_air,
            attackRange: reg.attack_range || 0,
            teleportAirbase: !!reg.teleport_airbase,
            aa: !!reg.aa,
            comp: [typeKey]
        }, qVal, rVal, 'Enemy', reg.name);
    },
    buildEnemyAirbase(game) {
        const qVal = parseInt(document.getElementById('cheat-enemy-q')?.value || '0', 10);
        const rVal = parseInt(document.getElementById('cheat-enemy-r')?.value || '0', 10);
        const tile = game.grid.find(t => t.q === qVal && t.r === rVal);
        if (!tile) return;
        tile.owner = 'Enemy';
        tile.building = 'airbase';
    }
};
